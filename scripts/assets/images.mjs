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

export async function downloadImages(
    pin,
    category,
    names,
    { width, height, lossless = false },
) {
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
                    .webp(lossless ? { lossless } : { quality: IMAGE.quality })
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

// `name@24.webp` and so on for each of `sizes`, downscaled from the stored WebP
// with Lanczos and kept lossless. A number makes a square, a `[width, height]`
// pair makes `name@48x32.webp`. A light sharpen brings back the detail a large
// downscale softens.
export async function writeVariants(category, names, sizes) {
    const dir = join(ASSETS_DIR, category);
    const hashes = {};

    for (const name of new Set(names.filter(Boolean))) {
        for (const size of sizes) {
            const [width, height] = Array.isArray(size) ? size : [size, size];
            const suffix = Array.isArray(size) ? `${width}x${height}` : size;
            const variant = name.replace(/\.webp$/, `@${suffix}.webp`);
            const target = join(dir, variant);
            if (!(await exists(target))) {
                await sharp(join(dir, name))
                    .resize(width, height, {
                        fit: "cover",
                        kernel: "lanczos3",
                    })
                    .sharpen({ sigma: IMAGE.variantSharpen })
                    .webp({ lossless: true })
                    .toFile(target);
            }
            hashes[`${category}/${variant}`] = sha256(await readFile(target));
        }
    }

    return hashes;
}

const HUE_BINS = 12;
const MIN_SATURATION = 0.35;
const WARM_HUES = [10, 50];
const WARM_WEIGHT = 0.3;
// The accent sits on the dark app surface, as text and fills: keep it colorful
// and light enough to read there.
const ACCENT_SATURATION = [0.35, 0.8];
const ACCENT_LIGHTNESS = [0.62, 0.75];

const clamp = (value, [low, high]) => Math.min(high, Math.max(low, value));

function toHsl(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return [0, 0, l];

    const s = d / (1 - Math.abs(2 * l - 1));
    const h =
        max === r
            ? ((g - b) / d + 6) % 6
            : max === g
              ? (b - r) / d + 2
              : (r - g) / d + 4;
    return [h * 60, s, l];
}

function toHex(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const channel = (n) => {
        const k = (n + h / 30) % 12;
        const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(value * 255)
            .toString(16)
            .padStart(2, "0");
    };
    return `#${channel(0)}${channel(8)}${channel(4)}`;
}

// The image's most present vivid hue, as a `#rrggbb` accent, or null when the
// image is mostly grey. Transparent pixels don't count.
export async function accentColor(file) {
    const { data, info } = await sharp(file)
        .ensureAlpha()
        .resize(96, 96, { fit: "inside" })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const bins = Array.from({ length: HUE_BINS }, () => ({
        weight: 0,
        r: 0,
        g: 0,
        b: 0,
    }));
    for (let i = 0; i < data.length; i += info.channels) {
        if (data[i + 3] < 128) continue;

        const [r, g, b] = [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
        const [h, s, l] = toHsl(r, g, b);
        if (s < MIN_SATURATION || l < 0.1 || l > 0.9) continue;

        // Vivid pixels count most. Skin, gold and bronze fill most banners, so
        // they count less, letting a hero's own color through.
        const warm = h >= WARM_HUES[0] && h < WARM_HUES[1];
        const weight = s ** 2 * (warm ? WARM_WEIGHT : 1);
        const bin = bins[Math.floor(h / (360 / HUE_BINS)) % HUE_BINS];
        bin.weight += weight;
        bin.r += r * weight;
        bin.g += g * weight;
        bin.b += b * weight;
    }

    const top = bins.reduce((best, bin) =>
        bin.weight > best.weight ? bin : best,
    );
    if (top.weight === 0) return null;

    const [h, s, l] = toHsl(
        top.r / top.weight,
        top.g / top.weight,
        top.b / top.weight,
    );
    return toHex(h, clamp(s, ACCENT_SATURATION), clamp(l, ACCENT_LIGHTNESS));
}
