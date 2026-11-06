// The pixel sizes fetch-assets makes of each portrait, as WebKit blurs large
// downscales.
const VARIANTS = { xs: 24, sm: 32, md: 40, lg: 48, xl: 96 } as const;

export type PortraitSize = keyof typeof VARIANTS;

export const portraitSrc = (portrait: string, size: PortraitSize) =>
    `/game/heroportraits/${portrait.replace(/\.webp$/, `@${VARIANTS[size]}.webp`)}`;
