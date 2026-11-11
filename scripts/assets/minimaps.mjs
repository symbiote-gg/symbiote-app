// The battleground minimaps and the map units each one covers, from a pinned repo
// with a minimaps.json index next to the files, in the pin's path folder. While
// calibrating, MINIMAPS_DIR reads them from a local folder instead. A minimap is
// an .svg traced from the map's own minimap image.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

import { MINIMAPS } from "./config.mjs";
import { fetchOk, rawGithub, writeJson } from "./io.mjs";

export const MINIMAPS_DIR = process.env.MINIMAPS_DIR ?? null;

const MAP_ID = /^[a-z0-9_]+$/;
// Names become paths and URLs: no separators or leading dot.
const SAFE_NAME = /^[\w'-][\w'.-]*\.svg$/i;
const VIEW_BOX = /viewBox="0 0 ([\d.]+) ([\d.]+)"/;
const PATHS = ["ground"];
const OPTIONAL_PATHS = ["jungle", "walls", "bright"];

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

// The paths go in the index, not in a file: the app draws them itself.
function vector(file, data) {
    const svg = data.toString("utf8");
    const box = svg.match(VIEW_BOX);
    if (!box) throw new Error(`no viewBox in ${file}`);

    const pathOf = (id) =>
        svg.match(new RegExp(`<path id="${id}"[^>]* d="([^"]+)"`))?.[1];

    const paths = {};
    for (const id of PATHS) {
        paths[id] = pathOf(id);
        if (!paths[id]) throw new Error(`no #${id} path in ${file}`);
    }
    for (const id of OPTIONAL_PATHS) {
        if (pathOf(id)) paths[id] = pathOf(id);
    }

    return { width: Number(box[1]), height: Number(box[2]), paths };
}

// Writes the index, with each minimap's paths in it, to the generated sources. A
// null pin and no MINIMAPS_DIR write an empty index.
export async function fetchMinimaps(pin) {
    if (!pin && !MINIMAPS_DIR) {
        await writeJson(MINIMAPS, {});
        return { count: 0 };
    }

    const remote = (name) =>
        rawGithub(pin, pin.path ? `${pin.path}/${name}` : name);
    const read = MINIMAPS_DIR
        ? (name) => readFile(join(MINIMAPS_DIR, name))
        : async (name) =>
              Buffer.from(await (await fetchOk(remote(name))).arrayBuffer());

    const index = JSON.parse(await read("minimaps.json"));
    validate(index);

    const vectors = {};
    const files = [
        ...new Set(Object.values(index).flatMap((l) => l.map((x) => x.file))),
    ];

    for (const file of files) {
        vectors[file] = vector(file, await read(file));
    }

    const output = Object.fromEntries(
        Object.entries(index).map(([map, layers]) => [
            map,
            layers.map(({ file, view }) => ({ ...vectors[file], view })),
        ]),
    );

    await writeJson(MINIMAPS, output);
    return { count: Object.keys(output).length };
}
