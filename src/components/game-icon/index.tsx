import classNames from "classnames";

import { useImageFallback } from "@/hooks/useImageFallback";
import { variantFile } from "@/utils/image-variants";

import styles from "./styles.module.css";

export type GameIconCategory = "abilitytalents" | "matchawards";

export interface GameIconProps {
    category: GameIconCategory;
    icon: string | null;
    label: string;
    variant?: number;
    framed?: boolean;
    className?: string;
}

export function GameIcon({
    category,
    icon,
    label,
    variant,
    framed,
    className,
}: GameIconProps) {
    const [failed, onError] = useImageFallback();

    const rootClass = classNames(className, styles.root, {
        [styles.framed]: framed,
    });

    if (!icon || failed) {
        return (
            <span
                className={classNames(rootClass, styles.fallback)}
                aria-label={label}
            >
                ?
            </span>
        );
    }

    return (
        <img
            src={`/game/${category}/${variant ? variantFile(icon, variant) : icon}`}
            alt={label}
            className={rootClass}
            onError={onError}
        />
    );
}
