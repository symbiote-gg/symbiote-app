export type Stat =
    | "heroDamage"
    | "siegeDamage"
    | "damageTaken"
    | "healing"
    | "selfHealing"
    | "xp";

export const STATS: {
    stat: Stat;
    label:
        | "heroDamage"
        | "siegeDamage"
        | "damageTaken"
        | "healing"
        | "selfHealing"
        | "xpContribution";
    secondary?: boolean;
}[] = [
    { stat: "siegeDamage", label: "siegeDamage" },
    { stat: "heroDamage", label: "heroDamage" },
    { stat: "damageTaken", label: "damageTaken", secondary: true },
    { stat: "healing", label: "healing" },
    { stat: "selfHealing", label: "selfHealing" },
    { stat: "xp", label: "xpContribution" },
];
