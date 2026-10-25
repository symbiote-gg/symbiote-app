import { useTranslations } from "use-intl";

import type { TalentPick } from "@/api/replays";
import { Chip, Typography } from "@/ui";
import { GameIcon } from "../../game-icon";

import styles from "./styles.module.css";

const STORM_LEVEL = 20;

export interface HeaderProps {
    talent: TalentPick;
    level: number;
    quest: boolean;
}

export function Header({ talent, level, quest }: HeaderProps) {
    const t = useTranslations("talent");

    const name = talent.name ?? talent.slug;

    return (
        <header className={styles.header}>
            <GameIcon
                category="abilitytalents"
                icon={talent.icon}
                label={name}
                className={styles.icon}
            />
            <div className={styles.headerText}>
                <Typography
                    size="base"
                    weight="semibold"
                    truncate
                    className={styles.title}
                >
                    {name}
                </Typography>
                <div className={styles.badges}>
                    <Chip size="sm" uppercase>
                        {t("level", { level })}
                    </Chip>
                    {level === STORM_LEVEL ? (
                        <Chip size="sm" tone="primary" uppercase>
                            {t("storm")}
                        </Chip>
                    ) : (
                        quest && (
                            <Chip size="sm" tone="quest" uppercase>
                                {t("quest")}
                            </Chip>
                        )
                    )}
                </div>
            </div>
        </header>
    );
}
