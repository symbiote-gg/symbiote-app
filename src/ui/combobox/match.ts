const fold = (char: string) =>
    char
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .charAt(0) || char;

export function findMatch(
    label: string,
    query: string,
): [number, number] | null {
    const needle = Array.from(query.trim()).map(fold).join("");
    if (!needle) return [0, 0];

    const index = Array.from(label).map(fold).join("").indexOf(needle);
    return index === -1 ? null : [index, index + Array.from(needle).length];
}
