import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { TimelineText } from "@/hooks/useTimelineText";
import {
    campGlyph,
    entryGlyph,
    fightGlyph,
    tickGlyph,
} from "@/utils/timeline/glyphs";
import { type Glyph, specLabel } from "@/utils/timeline/map-events";
import type { MarkerView } from "@/utils/timeline/markers";
import type { Marker } from "@/utils/timeline/types";
import { sideClasses } from "../../../side";
import { GlyphIcon } from "../../glyphs";
import { HeaderText } from "./header-text";

import styles from "./styles.module.css";

function headerGlyph(marker: Marker, view: MarkerView): Glyph | null {
    const { fight, structure, camp, group, map } = view;
    if (fight) return fightGlyph(fight);
    if (structure) return structure.keep ? "keep" : "castle";
    if (camp) {
        return marker.shape === "boss"
            ? "crown"
            : campGlyph(camp.campType, camp.stolen);
    }
    if (group) return tickGlyph(marker.entries);
    if (map) return entryGlyph(map);
    return null;
}

interface HeaderProps {
    marker: Marker;
    view: MarkerView;
    text: TimelineText;
    /** Off for one death out of a fight, whose score isn't the fight's. */
    result?: boolean;
}

function Title({ marker, view, text, result = true }: HeaderProps) {
    const t = useTranslations("replay.timeline");

    const { fight, score, end, structure, camp, map, race } = view;
    const { held, summon, duel, altar, knight } = view;
    const timeRange =
        end > marker.time
            ? t("fightRange", {
                  start: text.at(marker.time),
                  end: text.at(end),
                  seconds: Math.round(end - marker.time),
              })
            : text.at(marker.time);

    if (fight) {
        const winner =
            score[0] > score[1] ? "ally" : score[0] < score[1] ? "enemy" : null;
        return (
            <HeaderText
                title={t("fightKind", { kind: fight })}
                tag={
                    result &&
                    t("fightResult", {
                        result: winner ?? "none",
                        ally: score[0],
                        enemy: score[1],
                    })
                }
                tagClassName={classNames(sideClasses(winner))}
                meta={timeRange}
            />
        );
    }
    if (structure) {
        return (
            <HeaderText
                title={t("structureTitle", { keep: String(structure.keep) })}
                tag={t("structureResult", { side: structure.side ?? "none" })}
                tagClassName={classNames(sideClasses(structure.side))}
                meta={text.at(marker.time)}
                metaEnd={structure.lane && t("lane", { lane: structure.lane })}
            />
        );
    }
    if (camp) {
        return (
            <HeaderText
                title={camp.campType ?? t("campTitle")}
                tag={t(camp.stolen ? "campStolen" : "campResult", {
                    side: camp.side ?? "none",
                })}
                tagClassName={classNames(sideClasses(camp.side))}
                meta={text.at(marker.time)}
            />
        );
    }
    if (view.group) {
        const allStolen =
            view.camps &&
            marker.entries.every(
                (entry) => entry.type === "camp" && entry.stolen,
            );
        return (
            <HeaderText
                title={
                    view.camps
                        ? t("campGroup", { count: marker.entries.length })
                        : text.markerText(marker)
                }
                tag={
                    marker.side &&
                    (view.camps
                        ? t(allStolen ? "campStolen" : "campResult", {
                              side: marker.side,
                          })
                        : t(`side.${marker.side}`))
                }
                tagClassName={classNames(sideClasses(marker.side))}
                meta={timeRange}
            />
        );
    }

    return (
        <HeaderText
            title={
                map && summon
                    ? t("summonTitle", {
                          label: map.spec
                              ? specLabel(map.spec, map.objective.variant)
                              : "punisher",
                          name: text.entryText(map),
                      })
                    : map
                      ? text.entryText(map)
                      : text.markerText(marker)
            }
            tag={
                held
                    ? t("heldResult", { side: marker.side ?? "none" })
                    : altar
                      ? t("altarResult", { side: marker.side ?? "none" })
                      : duel
                        ? t("duelResult", { side: marker.side ?? "none" })
                        : race
                          ? t("raceResult", {
                                kind: race.kind,
                                side:
                                    race.teamValues[0] === race.teamValues[1]
                                        ? "none"
                                        : (marker.side ?? "none"),
                            })
                          : marker.side && t(`side.${marker.side}`)
            }
            tagClassName={classNames(sideClasses(marker.side))}
            meta={
                duel
                    ? t("duelRange", {
                          start: text.at(duel.range[0]),
                          end: text.at(duel.range[1]),
                          length: text.at(duel.range[1] - duel.range[0]),
                      })
                    : summon
                      ? t("range", {
                            start: text.at(summon.range[0]),
                            end: text.at(summon.range[1]),
                        })
                      : held
                        ? t("range", {
                              start: text.at(held[0]),
                              end: text.at(held[1]),
                          })
                        : knight?.range[1] != null
                          ? t("range", {
                                start: text.at(knight.range[0]),
                                end: text.at(knight.range[1]),
                            })
                          : text.at(marker.time)
            }
        />
    );
}

export function Header({ marker, view, text, result }: HeaderProps) {
    const glyph = headerGlyph(marker, view);

    return (
        <header className={styles.header}>
            {glyph && (
                <GlyphIcon
                    glyph={glyph}
                    className={classNames(
                        styles.icon,
                        sideClasses(marker.side),
                    )}
                />
            )}
            <Title marker={marker} view={view} text={text} result={result} />
        </header>
    );
}
