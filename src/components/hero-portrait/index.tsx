import classNames from "classnames";
import { useState } from "react";

import styles from "./styles.module.css";

export interface HeroPortraitProps {
    name: string;
    portrait: string | null;
    size?: "xs" | "sm" | "md" | "lg";
    highlight?: boolean;
    className?: string;
}

export function HeroPortrait({
    name,
    portrait,
    size = "sm",
    highlight,
    className,
}: HeroPortraitProps) {
    const [failed, setFailed] = useState(false);

    const onError = () => setFailed(true);
    const classes = classNames(className, styles.root, styles[size], {
        [styles.highlight]: highlight,
    });

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
