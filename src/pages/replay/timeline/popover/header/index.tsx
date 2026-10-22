import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { TimelineText } from "@/hooks/useTimelineText";
import {
    campGlyph,
    entryGlyph,
    fightGlyph,
    tickGlyph,
} from "@/utils/timeline/glyphs";
import type { Glyph } from "@/utils/timeline/map-events";
import { type MarkerView, fightKind } from "@/utils/timeline/markers";
import type { Marker } from "@/utils/timeline/types";
import { GlyphIcon } from "../../glyphs";
import { sideClasses } from "../../side";
import { HeaderText } from "./header-text";

import styles from "./styles.module.css";

function headerGlyph(marker: Marker, view: MarkerView): Glyph | null {
    const { kills, deaths, structure, camp, group, map } = view;
    if (kills) return fightGlyph(deaths);
    if (structure) return structure.keep ? "keep" : "castle";
    if (camp) {
        return marker.shape === "boss" ? "crown" : campGlyph(camp.campType);
    }
    if (group) return tickGlyph(marker.entries);
    if (map) return entryGlyph(map);
    return null;
}

interface HeaderProps {
    marker: Marker;
    view: MarkerView;
    text: TimelineText;
}

function Title({ marker, view, text }: HeaderProps) {
    const t = useTranslations("replay.timeline");

    const { deaths, score, end, structure, camp, map, race } = view;
    const { summon, duel, altar, knight } = view;
    const timeRange =
        end > marker.time
            ? t("fightRange", {
                  start: text.at(marker.time),
                  end: text.at(end),
                  seconds: Math.round(end - marker.time),
              })
            : text.at(marker.time);

    if (view.kills) {
        const winner =
            score[0] > score[1] ? "ally" : score[0] < score[1] ? "enemy" : null;
        return (
            <HeaderText
                title={t("fightKind", { kind: fightKind(deaths) })}
                tag={t("fightResult", {
                    result: winner ?? "none",
                    ally: score[0],
                    enemy: score[1],
                })}
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
                tag={t("campResult", { side: camp.side ?? "none" })}
                tagClassName={classNames(sideClasses(camp.side))}
                meta={text.at(marker.time)}
            />
        );
    }
    if (view.group) {
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
                        ? t("campResult", { side: marker.side })
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
                          label: map.spec?.label(map.event.data) ?? "punisher",
                          name: text.entryText(map),
                      })
                    : map
                      ? text.entryText(map)
                      : text.markerText(marker)
            }
            tag={
                map?.held
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
                      : map?.held
                        ? t("range", {
                              start: text.at(map.held[0]),
                              end: text.at(map.held[1]),
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

export function Header({ marker, view, text }: HeaderProps) {
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
            <Title marker={marker} view={view} text={text} />
        </header>
    );
}
