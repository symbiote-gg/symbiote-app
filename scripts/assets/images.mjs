// Images are downscaled and re-encoded to WebP to keep the bundle small; the
// artwork is otherwise unaltered.
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

import { ASSETS_DIR, CONCURRENCY, IMAGE, MAX_MISSING } from "./config.mjs";
import { exists, rawGithub, sha256 } from "./io.mjs";

export const webp = (name) => name.replace(/\.[^.]+$/, ".webp");

// Names come from upstream data and become local paths: no separators or
// leading dot, so they can't point outside the category folder. Other names
// count as missing.
const SAFE_NAME = /^[\w'-][\w'.-]*\.(png|jpe?g)$/i;

export async function downloadImages(pin, category, names, { width, height }) {
    const unique = [...new Set(names.filter(Boolean))];
    const queue = unique.filter((name) => SAFE_NAME.test(name));
    const missing = unique.filter((name) => !SAFE_NAME.test(name));

    const dir = join(ASSETS_DIR, category);
    await mkdir(dir, { recursive: true });

    const hashes = {};

    async function worker() {
        for (let name; (name = queue.shift()) !== undefined;) {
            const target = join(dir, webp(name));
            if (!(await exists(target))) {
                const res = await fetch(
                    rawGithub(pin, `heroesimages/${category}/${name}`),
                );
                if (!res.ok) {
                    missing.push(name);
                    continue;
                }

                await sharp(Buffer.from(await res.arrayBuffer()))
                    .resize(width, height, {
                        fit: "inside",
                        withoutEnlargement: true,
                    })
                    .webp({ quality: IMAGE.quality })
                    .toFile(target);
            }

            hashes[`${category}/${webp(name)}`] = sha256(
                await readFile(target),
            );
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    if (missing.length > MAX_MISSING) {
        throw new Error(`too many missing ${category}: ${missing.join(", ")}`);
    }

    return { hashes, missing: missing.sort() };
}
