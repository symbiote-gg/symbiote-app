export type GameTextTone = "highlight" | "muted" | "quest";

export type GameTextNode =
    | string
    | { type: "break" }
    | { type: "scaling"; percent: number }
    | { type: "span"; tone: GameTextTone; children: GameTextNode[] };

export type GameTextStepKind = "quest" | "reward";

export interface GameTextStep {
    type: "step";
    kind: GameTextStepKind;
    label: string;
    items: GameTextNode[][];
    notes: GameTextNode[][];
}

export type GameTextBlock =
    { type: "paragraph"; nodes: GameTextNode[] } | GameTextStep;

// Markup normalized at build time by `markup()` in scripts/assets/facts.mjs:
// well-formed tone runs, `<n/>` line breaks and `~~0.04~~` per-level scaling
// of the preceding number.
const TOKEN = /<(\/?)(highlight|muted|quest|n)\/?>|~~([\d.]+)~~/g;

export function parseGameText(text: string): GameTextNode[] {
    const root: GameTextNode[] = [];
    const stack = [root];
    let last = 0;

    for (const match of text.matchAll(TOKEN)) {
        const [token, closing, tag, scaling] = match;
        const children = stack[stack.length - 1];
        if (match.index > last) children.push(text.slice(last, match.index));
        last = match.index + token.length;

        if (scaling !== undefined) {
            children.push({
                type: "scaling",
                percent: Number((Number(scaling) * 100).toFixed(2)),
            });
        } else if (tag === "n") {
            children.push({ type: "break" });
        } else if (closing) {
            if (stack.length > 1) stack.pop();
        } else {
            const span: GameTextNode = {
                type: "span",
                tone: tag as GameTextTone,
                children: [],
            };
            children.push(span);
            stack.push(span.children);
        }
    }
    if (last < text.length) stack[stack.length - 1].push(text.slice(last));

    return root;
}

const isBreak = (node: GameTextNode) =>
    typeof node === "object" && node.type === "break";
const isBlank = (node: GameTextNode) =>
    isBreak(node) || (typeof node === "string" && node.trim() === "");

function trim(nodes: GameTextNode[]): GameTextNode[] {
    const result = [...nodes];
    while (result.length > 0 && isBlank(result[0])) result.shift();
    while (result.length > 0 && isBlank(result[result.length - 1])) {
        result.pop();
    }

    const first = result[0];
    if (typeof first === "string") result[0] = first.trimStart();
    const last = result[result.length - 1];
    if (typeof last === "string") result[result.length - 1] = last.trimEnd();

    return result;
}

function paragraphs(nodes: GameTextNode[]): GameTextNode[][] {
    const result: GameTextNode[][] = [];
    let current: GameTextNode[] = [];
    let breaks: GameTextNode[] = [];

    for (const node of nodes) {
        if (isBreak(node)) {
            breaks.push(node);
            continue;
        }
        if (breaks.length > 1) {
            result.push(current);
            current = [];
        } else {
            current.push(...breaks);
        }
        breaks = [];
        current.push(node);
    }
    result.push(current);

    return result.map(trim).filter((paragraph) => paragraph.length > 0);
}

const textOf = (nodes: GameTextNode[]): string =>
    nodes
        .map((node) =>
            typeof node === "string"
                ? node
                : node.type === "span"
                  ? textOf(node.children)
                  : "",
        )
        .join("");

// Quest talents list their steps as paragraphs led by a `<quest>Label:</quest>`
// run, repeating the label for each reward tier: consecutive steps with the
// same label share a block. A plain paragraph right after a step (a cap, a
// caveat) belongs to it.
export function gameTextBlocks(nodes: GameTextNode[]): GameTextBlock[] {
    const blocks: GameTextBlock[] = [];

    for (const paragraph of paragraphs(nodes)) {
        const [first, ...rest] = paragraph;
        const previous = blocks[blocks.length - 1];

        if (
            typeof first === "object" &&
            first.type === "span" &&
            first.tone === "quest"
        ) {
            const label = textOf(first.children).trim().replace(/:$/, "");
            if (
                previous?.type === "step" &&
                previous.label.toLowerCase() === label.toLowerCase()
            ) {
                previous.items.push(trim(rest));
                continue;
            }

            blocks.push({
                type: "step",
                kind: /reward/i.test(label) ? "reward" : "quest",
                label,
                items: [trim(rest)],
                notes: [],
            });
        } else if (previous?.type === "step" && typeof first === "string") {
            previous.notes.push(paragraph);
        } else {
            blocks.push({ type: "paragraph", nodes: paragraph });
        }
    }

    return blocks;
}
