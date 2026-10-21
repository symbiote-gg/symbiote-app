import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, posix } from "node:path";
import { Parser } from "tar";

export const sha256 = (data) => createHash("sha256").update(data).digest("hex");

export const rawGithub = ({ repo, commit }, path) =>
    `https://raw.githubusercontent.com/${repo}/${commit}/${path}`;

export async function fetchOk(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res;
}

export async function exists(path) {
    return stat(path).then(
        () => true,
        () => false,
    );
}

export async function readJson(path) {
    return JSON.parse(await readFile(path, "utf8"));
}

export async function writeJson(path, value) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(value, null, 2) + "\n");
}

// Matches on file name only: release archives nest files under CI runner paths.
export async function untarJson(archive, names) {
    const files = new Map();
    await new Promise((resolve, reject) => {
        const parser = new Parser({
            filter: (path) => names.includes(posix.basename(path)),
            onReadEntry: (entry) => {
                const chunks = [];
                entry.on("data", (chunk) => chunks.push(chunk));
                entry.on("end", () =>
                    files.set(
                        posix.basename(entry.path),
                        Buffer.concat(chunks),
                    ),
                );
            },
        });
        parser.on("end", resolve);
        parser.on("error", reject);
        parser.end(archive);
    });

    const absent = names.filter((name) => !files.has(name));
    if (absent.length) throw new Error(`missing in archive: ${absent}`);

    return names.map((name) => JSON.parse(files.get(name)));
}
