// Collects the license texts of every npm and Rust package shipped in the app,
// for the About page. Build-only dependencies are left out: they don't end up
// in the binary.
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { exists, hashTree, sha256, writeJson } from "./assets/io.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "src/generated/licenses.json");
const KEY = join(ROOT, "src/generated/licenses.key");
// The notices only change with the dependency set, the build host or this script.
const INPUTS = [
    "scripts/notices.mjs",
    "package.json",
    "pnpm-lock.yaml",
    "src-tauri/Cargo.toml",
    "src-tauri/Cargo.lock",
].map((path) => join(ROOT, path));
const LICENSE_FILE = /^(licen[cs]e|copying|notice)/i;

const run = (cmd, args, cwd = ROOT) =>
    execFileSync(cmd, args, {
        cwd,
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
        // pnpm is a .cmd shim on Windows, which only runs through a shell.
        shell: process.platform === "win32",
    });

// REUSE-style packages keep their texts in a LICENSES folder instead.
async function licenseTexts(dir) {
    const entries = (await readdir(dir, { withFileTypes: true }))
        .filter((e) => LICENSE_FILE.test(e.name))
        .sort((a, b) => a.name.localeCompare(b.name));
    const texts = [];
    for (const entry of entries) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) texts.push(...(await licenseTexts(path)));
        else texts.push((await readFile(path, "utf8")).trim());
    }
    return texts;
}

async function npmPackages() {
    const groups = JSON.parse(
        run("pnpm", ["licenses", "list", "--prod", "--json"]),
    );
    const packages = [];
    for (const entries of Object.values(groups)) {
        for (const { name, versions, paths, license, homepage } of entries) {
            for (const [i, version] of versions.entries()) {
                packages.push({
                    name,
                    version,
                    license,
                    url: homepage ?? `https://www.npmjs.com/package/${name}`,
                    texts: await licenseTexts(paths[i]),
                });
            }
        }
    }
    return packages;
}

// Walks normal dependency edges from the app crate, for the platform being
// built, so dev, build and other platforms' dependencies are skipped.
async function cargoPackages(host) {
    const cwd = join(ROOT, "src-tauri");
    const metadata = JSON.parse(
        run(
            "cargo",
            [
                "metadata",
                "--format-version",
                "1",
                "--locked",
                "--filter-platform",
                host,
            ],
            cwd,
        ),
    );

    const byId = new Map(metadata.packages.map((p) => [p.id, p]));
    const nodes = new Map(metadata.resolve.nodes.map((n) => [n.id, n]));
    const { root } = metadata.resolve;
    const seen = new Set();
    const stack = [root];
    while (stack.length) {
        const id = stack.pop();
        if (seen.has(id)) continue;
        seen.add(id);
        for (const dep of nodes.get(id).deps) {
            if (dep.dep_kinds.some((k) => k.kind === null)) stack.push(dep.pkg);
        }
    }
    seen.delete(root);

    return Promise.all(
        [...seen].map(async (id) => {
            const p = byId.get(id);
            return {
                name: p.name,
                version: p.version,
                license: p.license ?? "",
                url:
                    p.repository ??
                    p.homepage ??
                    `https://crates.io/crates/${p.name}`,
                texts: await licenseTexts(dirname(p.manifest_path)),
            };
        }),
    );
}

async function isUpToDate(key) {
    if (!(await exists(OUTPUT)) || !(await exists(KEY))) return false;
    return (await readFile(KEY, "utf8")) === key;
}

async function main() {
    const host = run("rustc", ["-vV"]).match(/^host: (.+)$/m)[1];
    const key = sha256(`${host}\n${await hashTree(INPUTS)}`);
    if (!process.argv.includes("--force") && (await isUpToDate(key))) {
        console.log("notices: up to date");
        return;
    }

    const packages = [...(await npmPackages()), ...(await cargoPackages(host))];
    packages.sort(
        (a, b) =>
            a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
    );

    // Most packages share the same Apache or MIT text, so texts are stored once.
    const texts = [];
    const index = new Map();
    const textId = (text) => {
        if (!index.has(text)) {
            index.set(text, texts.length);
            texts.push(text);
        }
        return index.get(text);
    };

    await writeJson(OUTPUT, {
        texts,
        packages: packages.map((p) => ({ ...p, texts: p.texts.map(textId) })),
    });
    await writeFile(KEY, key);

    const missing = packages.filter((p) => !p.texts.length);
    console.log(
        `notices: ${packages.length} packages, ${texts.length} texts, ${missing.length} without license files`,
    );
}

await main();
