// The sizes scripts/fetch-assets.mjs pre-renders each image at, as WebKit blurs
// large downscales. Node imports this file as is, so it sticks to erasable
// syntax and relative imports.

export const PORTRAIT_VARIANTS = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 96,
} as const;

// The art's drawn size in each box, after the badge's or frame's inset.
export const AWARD_VARIANTS = {
    pill: 20,
    md: { badge: 40, mvp: 36 },
    lg: { badge: 44, mvp: 40 },
} as const;

export const MAP_CARD_VARIANT = [420, 164] as const;

export type Variant = number | readonly [number, number];

export const variantFile = (name: string, size: Variant) =>
    name.replace(
        /\.webp$/,
        `@${typeof size === "number" ? size : size.join("x")}.webp`,
    );
