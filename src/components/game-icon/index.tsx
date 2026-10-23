import classNames from "classnames";

import { useImageFallback } from "@/hooks/useImageFallback";

import styles from "./styles.module.css";

export type GameIconCategory = "abilitytalents" | "matchawards";

export interface GameIconProps {
    category: GameIconCategory;
    icon: string | null;
    label: string;
    className?: string;
}

export function GameIcon({ category, icon, label, className }: GameIconProps) {
    const [failed, onError] = useImageFallback();

    if (!icon || failed) {
        return (
            <span
                className={classNames(className, styles.root, styles.fallback)}
                aria-label={label}
            >
                ?
            </span>
        );
    }

    return (
        <img
            src={`/game/${category}/${icon}`}
            alt={label}
            className={classNames(className, styles.root)}
            onError={onError}
        />
    );
}
