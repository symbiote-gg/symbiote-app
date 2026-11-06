import { useTranslations } from "use-intl";

import type { Race as RaceData } from "@/api/replays";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Typography } from "@/ui";
import type { Glyph } from "@/utils/timeline/map-events";
import { sideOf } from "@/utils/timeline/markers";
import type { Side } from "@/utils/timeline/types";
import { Panel } from "../parts/panel";
import { TeamBar } from "../parts/team-bar";

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
    const { compact } = useFormatStat();

    const scale = unit === "percent" ? 100 : Math.max(...teamValues, 1);
    const ranked = [0, 1].sort((a, b) => teamValues[b] - teamValues[a]);
    const teams = topTeam === null ? ranked : [topTeam, 1 - topTeam];
    const valueText = (value: number) =>
        unit === "percent" ? t("detail.percent", { value }) : compact(value);

    return (
        <Panel side={side}>
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
        </Panel>
    );
}
