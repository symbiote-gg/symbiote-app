// Top-down map renders and the map units each one covers, from a pinned repo with
// a minimaps.json index next to the images, in the pin's path folder. While
// calibrating, MINIMAPS_DIR reads them from a local folder instead.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import sharp from "sharp";

import { ASSETS_DIR, MINIMAPS } from "./config.mjs";
import { fetchOk, rawGithub, sha256, writeJson } from "./io.mjs";

export const MINIMAPS_DIR = process.env.MINIMAPS_DIR ?? null;

const CATEGORY = "minimaps";
const MAP_ID = /^[a-z0-9_]+$/;
// Names become local paths: no separators or leading dot.
const SAFE_NAME = /^[\w'-][\w'.-]*\.webp$/i;

const isView = (view) =>
    Array.isArray(view) &&
    view.length === 4 &&
    view.every(Number.isFinite) &&
    view[0] !== view[2] &&
    view[1] !== view[3];

function validate(index) {
    for (const [map, layers] of Object.entries(index)) {
        if (!MAP_ID.test(map)) throw new Error(`bad minimap map id: ${map}`);
        if (!Array.isArray(layers) || !layers.length) {
            throw new Error(`no minimap layers for ${map}`);
        }

        for (const { file, view } of layers) {
            if (typeof file !== "string" || !SAFE_NAME.test(file)) {
                throw new Error(`bad minimap file for ${map}: ${file}`);
            }
            if (!isView(view)) {
                throw new Error(`bad minimap view for ${map}: ${view}`);
            }
        }
    }
}

// Writes the renders to the assets folder and the index, pointing at them, to the
// generated sources. A null pin and no MINIMAPS_DIR write an empty index.
export async function fetchMinimaps(pin) {
    const dir = join(ASSETS_DIR, CATEGORY);
    await rm(dir, { recursive: true, force: true });

    if (!pin && !MINIMAPS_DIR) {
        await writeJson(MINIMAPS, {});
        return { hashes: {}, count: 0 };
    }

    const remote = (name) =>
        rawGithub(pin, pin.path ? `${pin.path}/${name}` : name);
    const read = MINIMAPS_DIR
        ? (name) => readFile(join(MINIMAPS_DIR, name))
        : async (name) =>
              Buffer.from(await (await fetchOk(remote(name))).arrayBuffer());

    const index = JSON.parse(await read("minimaps.json"));
    validate(index);

    await mkdir(dir, { recursive: true });
    const hashes = {};
    const sizes = {};
    const files = [
        ...new Set(Object.values(index).flatMap((l) => l.map((x) => x.file))),
    ];

    for (const file of files) {
        const data = await read(file);
        await writeFile(join(dir, file), data);
        hashes[`${CATEGORY}/${file}`] = sha256(data);
        const { width, height } = await sharp(data).metadata();
        sizes[file] = { width, height };
    }

    const output = Object.fromEntries(
        Object.entries(index).map(([map, layers]) => [
            map,
            layers.map(({ file, view }) => ({
                src: `/game/${CATEGORY}/${file}`,
                ...sizes[file],
                view,
            })),
        ]),
    );

    await writeJson(MINIMAPS, output);
    return { hashes, count: Object.keys(output).length };
}
