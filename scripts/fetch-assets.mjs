// Fetches hero, talent, award and map facts and images from pinned HeroesToolChest
// data versions and images commit, and the minimap renders, at build time. Assets
// are never committed: outputs live in gitignored folders.
import { rm } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

import { ACCENT_OVERRIDES } from "./assets/accents.mjs";
import {
    ASSETS_DIR,
    DATA_DIR,
    IMAGE,
    MANIFEST,
    MINIMAPS,
    PINS,
    SOURCES,
} from "./assets/config.mjs";
import {
    accentColor,
    downloadImages,
    webp,
    writeVariants,
} from "./assets/images.mjs";
import { exists, hashTree, readJson, writeJson } from "./assets/io.mjs";
import { MINIMAPS_DIR, fetchMinimaps } from "./assets/minimaps.mjs";
import { loadFacts } from "./assets/sources/index.mjs";

// The heroes-images category, fact field and maximum size of each kind of
// image. Map loading screens and hero banners are art shown large, so they keep
// a much larger size. Portraits and banners are shown up to or above their
// native size, so they're never downscaled and are stored losslessly.
const IMAGES = [
    {
        kind: "heroes",
        category: "heroportraits",
        key: "portrait",
        size: [128, 128],
        lossless: true,
        // WebKit blurs large downscales, so the sizes HeroPortrait shows are
        // made here instead. Keep in sync with VARIANTS in src/utils/portraits.ts.
        variants: [24, 32, 40, 48, 96],
    },
    {
        kind: "heroes",
        category: "heroportraits",
        key: "banner",
        size: [680, 248],
        lossless: true,
    },
    {
        kind: "talents",
        category: "abilitytalents",
        key: "icon",
        size: [64, 64],
        // A few older talents use hero UI art that heroes-images keeps with the portraits.
        fallback: "heroportraits",
    },
    { kind: "awards", category: "matchawards", key: "icon", size: [64, 64] },
    {
        kind: "maps",
        category: "loadingscreens",
        key: "loading_screen",
        size: [1920, 1080],
        // The hero page's map cards. Keep in sync with its Maps card.
        variants: [[420, 164]],
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
                IMAGES.map(({ category, key, size, lossless, variants }) => [
                    `${category}/${key}`,
                    lossless || variants ? { size, lossless, variants } : size,
                ]),
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
    for (const {
        kind,
        category,
        key,
        size,
        lossless,
        variants,
        fallback,
    } of IMAGES) {
        const [width, height] = size;
        const { hashes, missing } = await downloadImages(
            PINS.heroesImages,
            category,
            facts[kind].map((fact) => fact[key]),
            { width, height, lossless, fallback },
        );
        Object.assign(files, hashes);

        // Point facts at the WebP files, or at nothing when missing upstream.
        for (const fact of facts[kind]) {
            if (fact[key] === null) continue;
            fact[key] = missing.includes(fact[key]) ? null : webp(fact[key]);
        }

        if (variants) {
            Object.assign(
                files,
                await writeVariants(
                    category,
                    facts[kind].map((fact) => fact[key]),
                    variants,
                ),
            );
        }

        summary.push(
            `${facts[kind].length} ${kind} (${Object.keys(hashes).length} ${category})`,
        );
        if (missing.length) {
            console.log(`missing ${category}: ${missing.join(", ")}`);
        }
    }

    for (const hero of facts.heroes) {
        hero.accent =
            ACCENT_OVERRIDES[hero.id] ??
            (hero.banner
                ? await accentColor(
                      join(ASSETS_DIR, "heroportraits", hero.banner),
                  )
                : null);
    }

    const heroIds = new Set(facts.heroes.map((hero) => hero.id));
    const unknown = Object.keys(ACCENT_OVERRIDES).filter(
        (id) => !heroIds.has(id),
    );
    if (unknown.length) {
        throw new Error(`accent overrides for unknown heroes: ${unknown}`);
    }

    const minimaps = await fetchMinimaps(PINS.minimaps);
    Object.assign(files, minimaps.hashes);
    summary.push(`${minimaps.count} minimaps`);

    for (const kind of new Set(IMAGES.map(({ kind }) => kind))) {
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
