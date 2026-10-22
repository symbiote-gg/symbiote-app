export type Stat =
    | "heroDamage"
    | "siegeDamage"
    | "damageTaken"
    | "healing"
    | "selfHealing"
    | "xp"
    | "upvotes";

export const STATS: {
    stat: Stat;
    label:
        | "heroDamage"
        | "siegeDamage"
        | "damageTaken"
        | "healing"
        | "selfHealing"
        | "xpContribution"
        | "upvotes";
    wide?: boolean;
    plain?: boolean;
}[] = [
    { stat: "siegeDamage", label: "siegeDamage", wide: true },
    { stat: "heroDamage", label: "heroDamage" },
    { stat: "damageTaken", label: "damageTaken", wide: true },
    { stat: "healing", label: "healing", wide: true },
    { stat: "selfHealing", label: "selfHealing", wide: true },
    { stat: "xp", label: "xpContribution", wide: true },
    { stat: "upvotes", label: "upvotes", wide: true, plain: true },
];
