import classNames from "classnames";

import { useImageFallback } from "@/hooks/useImageFallback";
import { type PortraitSize, portraitSrc } from "@/utils/portraits";

import styles from "./styles.module.css";

export interface HeroPortraitProps {
    name: string;
    portrait: string | null;
    size?: PortraitSize;
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
            src={portraitSrc(portrait, size)}
            alt={name}
            decoding={decoding}
            className={classes}
            onError={onError}
        />
    );
}
