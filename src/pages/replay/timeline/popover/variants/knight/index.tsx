import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { Knight as KnightData } from "@/api/replays";
import { TeamPortrait } from "@/components";
import type { TimelineText } from "@/hooks/useTimelineText";
import { Typography } from "@/ui";
import { type Roster, heroName } from "@/utils/timeline/roster";
import type { Side } from "@/utils/timeline/types";
import { sideClasses } from "../../../../side";
import { Footer } from "../../parts/footer";
import { LifeBar } from "../../parts/life-bar";
import { Stat } from "../../parts/stat";

import styles from "./styles.module.css";

interface KnightProps {
    knight: KnightData;
    side: Side;
    roster: Roster;
    text: TimelineText;
}

export function Knight({
    knight: {
        range: [start, end],
        pilot,
        takedowns,
        structures,
    },
    side,
    roster,
    text,
}: KnightProps) {
    const t = useTranslations("replay.timeline");

    return (
        <>
            <div className={classNames(styles.knight, sideClasses(side))}>
                {end !== null && (
                    <LifeBar
                        seconds={Math.round(end - start)}
                        start={t("knightActivated", { time: text.at(start) })}
                        end={t("summonDied", { time: text.at(end) })}
                    />
                )}
                <div className={styles.stats}>
                    <Stat
                        label={t("knightTakedowns")}
                        value={takedowns}
                        muted={takedowns === 0}
                    />
                    <Stat
                        label={t("knightStructures")}
                        value={structures}
                        muted={structures === 0}
                    />
                </div>
            </div>
            <Footer side={side}>
                <span className={styles.pilot}>
                    <TeamPortrait slot={pilot} size="xs" roster={roster} />
                    <Typography size="xs" variant="tertiary">
                        {t("knightPilot", { hero: heroName(roster, pilot) })}
                    </Typography>
                </span>
                {end === null && (
                    <Typography size="xs" variant="tertiary">
                        {t("knightAlive")}
                    </Typography>
                )}
            </Footer>
        </>
    );
}
