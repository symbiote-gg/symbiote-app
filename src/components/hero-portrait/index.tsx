import classNames from "classnames";

import { useImageFallback } from "@/hooks/useImageFallback";

import styles from "./styles.module.css";

// The pixel sizes fetch-assets makes of each portrait, as WebKit blurs large
// downscales. The largest size shows the stored file unscaled.
const VARIANTS = { xs: 24, sm: 32, md: 40, lg: 48 } as const;

export interface HeroPortraitProps {
    name: string;
    portrait: string | null;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
    decoding?: "sync" | "async";
}

export function HeroPortrait({
    name,
    portrait,
    size = "sm",
    className,
    decoding = "async",
}: HeroPortraitProps) {
    const [failed, onError] = useImageFallback();

    const classes = classNames(className, styles.root, styles[size]);

    if (!portrait || failed) {
        return (
            <span className={classNames(classes, styles.fallback)}>
                {name.slice(0, 2)}
            </span>
        );
    }

    return (
        <img
            src={`/game/heroportraits/${size === "xl" ? portrait : portrait.replace(/\.webp$/, `@${VARIANTS[size]}.webp`)}`}
            alt={name}
            decoding={decoding}
            className={classes}
            onError={onError}
        />
    );
}
