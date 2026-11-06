import { useTranslations } from "use-intl";

import type { Duel as DuelData } from "@/api/replays";
import { Typography } from "@/ui";
import { sideOf } from "@/utils/timeline/markers";
import type { Side } from "@/utils/timeline/types";
import { Footer, FooterImpact } from "../parts/footer";
import { Panel } from "../parts/panel";
import { TeamBar } from "../parts/team-bar";

const SOLID_PUSH_POWER = 40;
const STRONG_PUSH_POWER = 70;

interface DuelProps {
    duel: DuelData;
    side: Side;
    allyTeam: number;
}

export function Duel({ duel: { winner, power }, side, allyTeam }: DuelProps) {
    const t = useTranslations("replay.timeline");

    const push =
        power >= STRONG_PUSH_POWER
            ? "strong"
            : power >= SOLID_PUSH_POWER
              ? "solid"
              : "weak";

    return (
        <>
            <Panel side={side}>
                {[winner, 1 - winner].map((team, index) => (
                    <TeamBar
                        key={team}
                        glyph="fist"
                        side={sideOf(team, allyTeam)}
                        trail={index > 0}
                        percent={index === 0 ? Math.min(power, 100) : undefined}
                        value={
                            <Typography
                                size="xs"
                                weight="semibold"
                                variant={index === 0 ? "primary" : "tertiary"}
                                mono
                            >
                                {index === 0
                                    ? t("detail.percent", { value: power })
                                    : t("duelDead")}
                            </Typography>
                        }
                    />
                ))}
            </Panel>
            <Footer side={side}>
                <FooterImpact strong={push === "strong"}>
                    {t("duelPush", { push })}
                </FooterImpact>
                <Typography size="xs" mono>
                    {t("duelPower", { value: power })}
                </Typography>
            </Footer>
        </>
    );
}
