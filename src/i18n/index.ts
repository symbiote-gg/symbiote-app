import en from "./messages/en.json";

export const messages = { en } satisfies Record<string, typeof en>;

export type Locale = keyof typeof messages;

export const locale: Locale =
    (Object.keys(messages) as Locale[]).find((l) =>
        navigator.language.startsWith(l),
    ) ?? "en";

export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
