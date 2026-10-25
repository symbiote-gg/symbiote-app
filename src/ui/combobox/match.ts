const fold = (text: string) =>
    text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();

export function matches(label: string, query: string) {
    return fold(label).includes(fold(query.trim()));
}
