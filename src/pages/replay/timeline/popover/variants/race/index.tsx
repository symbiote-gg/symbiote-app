import classNames from "classnames";
import { useFormatter, useTranslations } from "use-intl";

import type { Race as RaceData } from "@/api/replays";
import { Typography } from "@/ui";
import type { Glyph } from "@/utils/timeline/map-events";
import { sideOf } from "@/utils/timeline/markers";
import type { Side } from "@/utils/timeline/types";
import { sideClasses } from "../../../../side";
import { TeamBar } from "../../parts/team-bar";

import styles from "./styles.module.css";

const RACE_GLYPHS: Record<RaceData["kind"], Glyph> = {
    gems: "gem",
    golem: "golem",
    shrine: "crosshair",
    capture: "flag",
    curse: "raven",
    wave: "swarm",
    ship: "coins",
    temple: "bolt",
};

interface RaceProps {
    race: RaceData;
    side: Side;
    allyTeam: number;
}

export function Race({
    race: { kind, teamValues, unit, topTeam },
    side,
    allyTeam,
}: RaceProps) {
    const t = useTranslations("replay.timeline");
    const format = useFormatter();

    const scale = unit === "percent" ? 100 : Math.max(...teamValues, 1);
    const ranked = [0, 1].sort((a, b) => teamValues[b] - teamValues[a]);
    const teams = topTeam === null ? ranked : [topTeam, 1 - topTeam];
    const valueText = (value: number) =>
        unit === "percent"
            ? t("detail.percent", { value })
            : format.number(value, {
                  notation: "compact",
                  maximumFractionDigits: 1,
              });

    return (
        <div className={classNames(styles.race, sideClasses(side))}>
            {teams.map((team, index) => (
                <TeamBar
                    key={team}
                    glyph={RACE_GLYPHS[kind]}
                    side={sideOf(team, allyTeam)}
                    trail={index > 0}
                    percent={Math.min(teamValues[team] / scale, 1) * 100}
                    value={
                        <Typography size="xs" weight="semibold" mono>
                            {valueText(teamValues[team])}
                        </Typography>
                    }
                />
            ))}
        </div>
    );
}
