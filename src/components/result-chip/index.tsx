import classNames from "classnames";
import { useTranslations } from "use-intl";

import { Chip } from "@/ui";

import styles from "./styles.module.css";

export interface ResultChipProps {
    win: boolean | null;
    className?: string;
}

export function ResultChip({ win, className }: ResultChipProps) {
    const t = useTranslations("result");
    const result = win === null ? "unknown" : win ? "win" : "loss";

    return (
        <Chip
            size="sm"
            tone={result === "unknown" ? "neutral" : result}
            uppercase
            className={classNames(className, styles.root)}
        >
            {t(result)}
        </Chip>
    );
}
