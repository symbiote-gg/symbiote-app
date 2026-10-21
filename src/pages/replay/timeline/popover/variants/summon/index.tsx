import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { TimelineText } from "@/hooks/useTimelineText";
import type { Summon as SummonData } from "@/utils/timeline/map-events";
import type { Side } from "@/utils/timeline/types";
import { sideClasses } from "../../../side";
import { Footer, FooterImpact } from "../../parts/footer";
import { LifeBar } from "../../parts/life-bar";
import { Stat } from "../../parts/stat";

import styles from "./styles.module.css";

const SOLID_SIEGE = 5000;
const BIG_SIEGE = 15000;
const LOW_HERO_DAMAGE = 1000;

interface SummonProps {
    summon: SummonData;
    side: Side;
    text: TimelineText;
}

export function Summon({
    summon: {
        range: [spawn, death],
        siege,
        heroes,
    },
    side,
    text,
}: SummonProps) {
    const t = useTranslations("replay.timeline");

    const seconds = Math.round(death - spawn);
    const impact =
        siege > BIG_SIEGE ? "big" : siege >= SOLID_SIEGE ? "solid" : "low";

    return (
        <>
            <div className={classNames(styles.summon, sideClasses(side))}>
                <LifeBar
                    seconds={seconds}
                    start={t("summonSpawn", { time: text.at(spawn) })}
                    end={t("summonDied", { time: text.at(death) })}
                />
                <div className={styles.stats}>
                    <Stat label={t("summonSiege")} value={siege} />
                    <Stat
                        label={t("summonHeroes")}
                        value={heroes}
                        muted={heroes < LOW_HERO_DAMAGE}
                    />
                </div>
            </div>
            <Footer side={side}>
                <FooterImpact strong={impact === "big"}>
                    {t("summonImpact", { impact })}
                </FooterImpact>
            </Footer>
        </>
    );
}
