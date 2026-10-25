const fold = (char: string) =>
    Array.from(
        char
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase(),
    )[0] ?? char;

/** Returns where `query` matches in `label`, in code points. */
export function findMatch(
    label: string,
    query: string,
): [number, number] | null {
    const foldedQuery = Array.from(query.trim()).map(fold).join("");
    if (!foldedQuery) return [0, 0];

    const foldedLabel = Array.from(label).map(fold).join("");
    const index = foldedLabel.indexOf(foldedQuery);
    if (index === -1) return null;

    const start = Array.from(foldedLabel.slice(0, index)).length;
    return [start, start + Array.from(foldedQuery).length];
}
