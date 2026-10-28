// Fetches hero, talent, award and map facts and images from pinned HeroesToolChest
// data versions and images commit, and the minimap renders, at build time. Assets
// are never committed: outputs live in gitignored folders.
import { rm } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

import {
    ASSETS_DIR,
    DATA_DIR,
    IMAGE,
    MANIFEST,
    MINIMAPS,
    PINS,
    SOURCES,
} from "./assets/config.mjs";
import { downloadImages, webp } from "./assets/images.mjs";
import { exists, hashTree, readJson, writeJson } from "./assets/io.mjs";
import { MINIMAPS_DIR, fetchMinimaps } from "./assets/minimaps.mjs";
import { loadFacts } from "./assets/sources/index.mjs";

// The heroes-images category, fact field and maximum size of each kind of
// image. Map loading screens are banner art, so they keep a much larger size.
const IMAGES = [
    {
        kind: "heroes",
        category: "heroportraits",
        key: "portrait",
        size: [64, 64],
    },
    {
        kind: "talents",
        category: "abilitytalents",
        key: "icon",
        size: [64, 64],
    },
    { kind: "awards", category: "matchawards", key: "icon", size: [64, 64] },
    {
        kind: "maps",
        category: "loadingscreens",
        key: "loading_screen",
        size: [1920, 1080],
    },
];

// Pins fully determine upstream content, so outputs only go stale when the pins
// or this script change, or when an output was deleted.
async function isUpToDate(pins, source) {
    if (MINIMAPS_DIR || !(await exists(MANIFEST))) return false;

    const manifest = await readJson(MANIFEST);
    // minimaps from a local folder may have changed since
    if (manifest.localMinimaps) return false;
    if (JSON.stringify(manifest.pins) !== JSON.stringify(pins)) return false;
    if (manifest.source !== source) return false;

    const outputs = [
        ...IMAGES.map(({ kind }) => join(DATA_DIR, `${kind}.json`)),
        MINIMAPS,
        ...Object.keys(manifest.files).map((file) => join(ASSETS_DIR, file)),
    ];
    for (const output of outputs) {
        if (!(await exists(output))) return false;
    }

    return true;
}

// Any pin change invalidates the downloaded images.
async function clearStaleAssets(pins) {
    const previous = (await exists(MANIFEST)) ? await readJson(MANIFEST) : null;
    if (JSON.stringify(previous?.pins) !== JSON.stringify(pins)) {
        await rm(ASSETS_DIR, { recursive: true, force: true });
    }
}

async function main() {
    const pins = {
        heroesData: PINS.heroesData.map((pin) => pin.version),
        heroesImages: PINS.heroesImages.commit,
        minimaps: PINS.minimaps?.commit ?? null,
        image: {
            ...IMAGE,
            sizes: Object.fromEntries(
                IMAGES.map(({ category, size }) => [category, size]),
            ),
        },
    };
    const source = await hashTree(SOURCES);
    if (!process.argv.includes("--force") && (await isUpToDate(pins, source))) {
        console.log("assets: up to date");
        return;
    }
    await clearStaleAssets(pins);

    const facts = await loadFacts(PINS.heroesData);

    const files = {};
    const summary = [];
    for (const { kind, category, key, size } of IMAGES) {
        const [width, height] = size;
        const { hashes, missing } = await downloadImages(
            PINS.heroesImages,
            category,
            facts[kind].map((fact) => fact[key]),
            { width, height },
        );
        Object.assign(files, hashes);

        // Point facts at the WebP files, or at nothing when missing upstream.
        for (const fact of facts[kind]) {
            if (fact[key] === null) continue;
            fact[key] = missing.includes(fact[key]) ? null : webp(fact[key]);
        }

        summary.push(
            `${facts[kind].length} ${kind} (${Object.keys(hashes).length} ${category})`,
        );
        if (missing.length) {
            console.log(`missing ${category}: ${missing.join(", ")}`);
        }
    }

    const minimaps = await fetchMinimaps(PINS.minimaps);
    Object.assign(files, minimaps.hashes);
    summary.push(`${minimaps.count} minimaps`);

    for (const { kind } of IMAGES) {
        await writeJson(join(DATA_DIR, `${kind}.json`), facts[kind]);
    }
    await writeJson(MANIFEST, {
        pins,
        source,
        localMinimaps: Boolean(MINIMAPS_DIR),
        files: Object.fromEntries(Object.entries(files).sort()),
    });

    console.log(`assets: ${summary.join(", ")}`);
}

await main();
