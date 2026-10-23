import { useTranslations } from "use-intl";

import type { TalentPick } from "@/api/replays";
import { Typography } from "@/ui";
import { GameIcon } from "../../game-icon";
import { Badge } from "./badge";

import styles from "./styles.module.css";

const STORM_LEVEL = 20;

export interface HeaderProps {
    talent: TalentPick;
    level: number;
    quest: boolean;
}

export function Header({ talent, level, quest }: HeaderProps) {
    const t = useTranslations("talent");

    const name = talent.name ?? talent.talentId;

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
                    <Badge variant="level">{t("level", { level })}</Badge>
                    {level === STORM_LEVEL ? (
                        <Badge variant="storm">{t("storm")}</Badge>
                    ) : (
                        quest && <Badge variant="quest">{t("quest")}</Badge>
                    )}
                </div>
            </div>
        </header>
    );
}
