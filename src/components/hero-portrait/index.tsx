import classNames from "classnames";

import { useImageFallback } from "@/hooks/useImageFallback";

import styles from "./styles.module.css";

export interface HeroPortraitProps {
    name: string;
    portrait: string | null;
    size?: "xs" | "sm" | "md" | "lg";
    className?: string;
}

export function HeroPortrait({
    name,
    portrait,
    size = "sm",
    className,
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
            src={`/game/heroportraits/${portrait}`}
            alt={name}
            decoding="async"
            className={classes}
            onError={onError}
        />
    );
}
