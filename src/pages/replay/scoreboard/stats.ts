export type Stat = "heroDamage" | "siegeDamage" | "healing" | "xp";

export const STATS: {
    stat: Stat;
    label: "heroDamage" | "siegeDamage" | "healing" | "xpContribution";
    wide?: boolean;
}[] = [
    { stat: "heroDamage", label: "heroDamage" },
    { stat: "siegeDamage", label: "siegeDamage", wide: true },
    { stat: "healing", label: "healing", wide: true },
    { stat: "xp", label: "xpContribution", wide: true },
];
