import classNames from "classnames";
import { useTranslations } from "use-intl";

import { Typography } from "@/ui";

import styles from "./styles.module.css";

export interface ResultChipProps {
    win: boolean | null;
    size?: "sm" | "lg";
    className?: string;
}

export function ResultChip({ win, size = "sm", className }: ResultChipProps) {
    const t = useTranslations("result");
    const result = win === null ? "unknown" : win ? "win" : "loss";

    return (
        <span
            className={classNames(
                className,
                styles.root,
                styles[size],
                styles[result],
            )}
        >
            <Typography
                size={size === "lg" ? "xl2" : "xs"}
                weight="semibold"
                display={size === "lg"}
                uppercase
                className={styles.label}
            >
                {t(result)}
            </Typography>
        </span>
    );
}
