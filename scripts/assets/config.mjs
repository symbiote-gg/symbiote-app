import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const PINS = JSON.parse(
    await readFile(join(ROOT, "scripts/asset-pins.json"), "utf8"),
);
export const ASSETS_DIR = join(ROOT, "public/game");
export const MANIFEST = join(ASSETS_DIR, "manifest.json");
export const DATA_DIR = join(ROOT, "src-tauri/data");

export const IMAGE = { format: "webp", quality: 85 };
// Tolerate a few missing upstream files per category, but not a broken pin.
export const MAX_MISSING = 3;
export const CONCURRENCY = 16;
