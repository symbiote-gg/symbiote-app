import { PORTRAIT_VARIANTS, variantFile } from "./image-variants";

export type PortraitSize = keyof typeof PORTRAIT_VARIANTS;

export const portraitSrc = (portrait: string, size: PortraitSize) =>
    `/game/heroportraits/${variantFile(portrait, PORTRAIT_VARIANTS[size])}`;
