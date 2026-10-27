import classNames from "classnames";
import {
    Castle,
    Crosshair,
    HatGlasses,
    Hourglass,
    type LucideIcon,
    ShieldAlert,
    Skull,
    Swords,
    Timer,
    Tombstone,
    UserRoundCheck,
    UserRoundMinus,
    UserRoundX,
} from "lucide-react";
import { useTranslations } from "use-intl";

import { Eyebrow, Typography } from "@/ui";
import { formatDuration } from "@/utils/dates";
import type { Standout, StandoutId } from "@/utils/timeline/standouts";

import styles from "./styles.module.css";

const ICONS: Record<StandoutId, LucideIcon> = {
    aloneDeaths: UserRoundX,
    pickDeaths: Crosshair,
    firstDead: Skull,
    stayedInLost: Timer,
    deathsPunished: Tombstone,
    timeDead: Hourglass,
    fightRecord: Swords,
    missedFights: UserRoundMinus,
    allFights: UserRoundCheck,
    stolenCamps: HatGlasses,
    unansweredEngages: ShieldAlert,
    lanePressure: Castle,
};

interface TileProps {
    standout: Standout;
    shown: boolean;
    onShow: (id: StandoutId) => void;
}

export function Tile({ standout, shown, onShow }: TileProps) {
    const t = useTranslations("replay.standouts");
    const { id, tone, figure, params, highlight, variant } = standout;
    const Icon = ICONS[id];

    const onClick = () => onShow(id);

    const figureText = () => {
        if (figure.unit === "duration") return formatDuration(figure.value);
        if (figure.unit === "seconds")
            return t("seconds", { value: Math.round(figure.value) });
        if (figure.total !== null)
            return t("figure", { count: figure.value, total: figure.total });
        return figure.value;
    };

    const content = (
        <>
            <span className={styles.iconBox}>
                <Icon className={styles.icon} aria-hidden />
            </span>
            <div className={styles.text}>
                <Eyebrow>{t(`label.${id}`)}</Eyebrow>
                <div className={styles.figure}>
                    <Typography display className={styles.value}>
                        {figureText()}
                    </Typography>
                    <Typography size="sm" variant="tertiary">
                        {t(`unit.${id}`, params)}
                    </Typography>
                </div>
                <Typography size="sm" variant="secondary">
                    {t(id, { ...params, variant: variant ?? "none" })}
                </Typography>
            </div>
        </>
    );

    return (
        <li
            className={classNames(styles.tile, { [styles.active]: shown })}
            data-tone={tone}
        >
            {highlight ? (
                <button
                    type="button"
                    className={classNames(styles.body, styles.clickable)}
                    aria-pressed={shown}
                    onClick={onClick}
                >
                    {content}
                </button>
            ) : (
                <div className={styles.body}>{content}</div>
            )}
        </li>
    );
}
