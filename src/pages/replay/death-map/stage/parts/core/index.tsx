import classNames from "classnames";
import { Castle } from "lucide-react";
import { useTranslations } from "use-intl";

import { Tooltip } from "@/ui";

import styles from "./styles.module.css";

interface CoreProps {
    team: number;
    allyTeam: number;
    /** On the layer's render, as CSS percentages. */
    at: { left: string; top: string };
}

export function Core({ team, allyTeam, at }: CoreProps) {
    const t = useTranslations("replay.deathMap");

    const ally = team === allyTeam;
    const label = ally ? t("base.ally") : t("base.enemy");

    return (
        <span className={styles.root} style={at}>
            <Tooltip content={label}>
                <span
                    role="img"
                    aria-label={label}
                    className={classNames(
                        styles.badge,
                        ally ? styles.ally : styles.enemy,
                    )}
                >
                    <Castle className={styles.icon} aria-hidden />
                </span>
            </Tooltip>
        </span>
    );
}
