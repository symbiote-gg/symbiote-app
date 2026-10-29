import classNames from "classnames";
import { Crosshair, Hexagon } from "lucide-react";
import { useTranslations } from "use-intl";

import type { Altar as AltarData } from "@/api/replays";
import { Tooltip, Typography } from "@/ui";
import { sideOf } from "@/utils/timeline/markers";
import { sideClasses } from "../../../../side";
import { GlyphIcon } from "../../../glyphs";
import { Footer } from "../../parts/footer";

import styles from "./styles.module.css";

const TOWNS = 6;

interface AltarProps {
    altar: AltarData;
    allyTeam: number;
}

export function Altar({ altar: { winner, towns }, allyTeam }: AltarProps) {
    const t = useTranslations("replay.timeline");

    const side = sideOf(winner, allyTeam);

    return (
        <>
            <div className={classNames(styles.altar, sideClasses(side))}>
                <span className={styles.team}>
                    <GlyphIcon glyph="temple" className={styles.icon} />
                </span>
                <Crosshair className={styles.crosshair} aria-hidden />
                <Tooltip content={t("altarCore")}>
                    <span
                        className={classNames(
                            styles.team,
                            sideClasses(sideOf(1 - winner, allyTeam)),
                        )}
                        aria-label={t("altarCore")}
                    >
                        <Hexagon className={styles.icon} aria-hidden />
                    </span>
                </Tooltip>
            </div>
            <Footer side={side}>
                <span className={styles.towns}>
                    <Typography size="xs" variant="tertiary">
                        {t("altarTowns")}
                    </Typography>
                    <span className={styles.townPips}>
                        {Array.from({ length: TOWNS }, (_, index) => (
                            <span
                                key={index}
                                className={classNames(styles.townPip, {
                                    [styles.townPipOn]: index < towns,
                                })}
                            />
                        ))}
                    </span>
                </span>
                <Typography size="xs" mono>
                    {t("altarHits", { hits: towns + 1 })}
                </Typography>
            </Footer>
        </>
    );
}
