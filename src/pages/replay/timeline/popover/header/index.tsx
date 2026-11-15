import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { FightKind } from "@/api/replays";
import type { TimelineText } from "@/hooks/useTimelineText";
import { Chip, sideClasses } from "@/ui";
import {
    campGlyph,
    entryGlyph,
    fightGlyph,
    tickGlyph,
} from "@/utils/timeline/glyphs";
import { type LevelCurve, levelAt } from "@/utils/timeline/levels";
import { type Glyph, specLabel } from "@/utils/timeline/map-events";
import type { MarkerView } from "@/utils/timeline/markers";
import type {
    CampEntry,
    Marker,
    Side,
    StructureEntry,
} from "@/utils/timeline/types";
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

type Translate = ReturnType<typeof useTranslations<"replay.timeline">>;

interface HeaderProps {
    marker: Marker;
    view: MarkerView;
    curves: [LevelCurve, LevelCurve];
    text: TimelineText;
}

const timeRange = (
    t: Translate,
    text: TimelineText,
    start: number,
    end: number,
) =>
    end > start
        ? t("fightRange", {
              start: text.at(start),
              end: text.at(end),
              seconds: Math.round(end - start),
          })
        : text.at(start);

function FightTitle({
    marker,
    view,
    curves,
    text,
    fight,
}: HeaderProps & { fight: FightKind }) {
    const t = useTranslations("replay.timeline");

    const { score, end } = view;
    const winner =
        score[0] > score[1] ? "ally" : score[0] < score[1] ? "enemy" : null;

    const levels = (
        <span className={styles.levels}>
            {(["ally", "enemy"] as const).map((side, team) => (
                <Chip
                    key={side}
                    size="sm"
                    tone="side"
                    className={classNames(sideClasses(side))}
                >
                    {t("fightLevel", {
                        level: Math.floor(levelAt(curves[team], marker.time)),
                    })}
                </Chip>
            ))}
        </span>
    );

    return (
        <HeaderText
            title={t("fightKind", { kind: fight })}
            tag={t("fightResult", {
                result: winner ?? "none",
                ally: score[0],
                enemy: score[1],
            })}
            tagClassName={classNames(sideClasses(winner))}
            meta={timeRange(t, text, marker.time, end)}
            metaEnd={levels}
        />
    );
}

interface StructureTitleProps {
    structure: StructureEntry;
    time: number;
    text: TimelineText;
}

function StructureTitle({ structure, time, text }: StructureTitleProps) {
    const t = useTranslations("replay.timeline");

    return (
        <HeaderText
            title={t("structureTitle", { keep: String(structure.keep) })}
            tag={t("structureResult", { side: structure.side ?? "none" })}
            tagClassName={classNames(sideClasses(structure.side))}
            meta={text.at(time)}
            metaEnd={structure.lane && t("lane", { lane: structure.lane })}
        />
    );
}

interface CampTitleProps {
    camp: CampEntry;
    time: number;
    text: TimelineText;
}

function CampTitle({ camp, time, text }: CampTitleProps) {
    const t = useTranslations("replay.timeline");

    return (
        <HeaderText
            title={camp.campType ?? t("campTitle")}
            tag={t(camp.stolen ? "campStolen" : "campResult", {
                side: camp.side ?? "none",
            })}
            tagClassName={classNames(sideClasses(camp.side))}
            meta={text.at(time)}
        />
    );
}

function GroupTitle({ marker, view, text }: HeaderProps) {
    const t = useTranslations("replay.timeline");

    const allStolen =
        view.camps &&
        marker.entries.every((entry) => entry.type === "camp" && entry.stolen);

    const tag =
        marker.side &&
        (view.camps
            ? t(allStolen ? "campStolen" : "campResult", { side: marker.side })
            : t(`side.${marker.side}`));

    return (
        <HeaderText
            title={
                view.camps
                    ? t("campGroup", { count: marker.entries.length })
                    : text.markerText(marker)
            }
            tag={tag}
            tagClassName={classNames(sideClasses(marker.side))}
            meta={timeRange(t, text, marker.time, view.end)}
        />
    );
}

function objectiveTitle(
    t: Translate,
    { map, summon }: MarkerView,
    marker: Marker,
    text: TimelineText,
) {
    if (!map) return text.markerText(marker);
    if (!summon) return text.entryText(map);

    return t("summonTitle", {
        label: map.spec
            ? specLabel(map.spec, map.objective.variant)
            : "punisher",
        name: text.entryText(map),
    });
}

function objectiveTag(
    t: Translate,
    { held, altar, duel, race }: MarkerView,
    side: Side,
) {
    const won = side ?? "none";

    if (held) return t("heldResult", { side: won });
    if (altar) return t("altarResult", { side: won });
    if (duel) return t("duelResult", { side: won });
    if (race) {
        const tied = race.teamValues[0] === race.teamValues[1];
        return t("raceResult", { kind: race.kind, side: tied ? "none" : won });
    }

    return side && t(`side.${side}`);
}

function objectiveMeta(
    t: Translate,
    { duel, summon, held, knight }: MarkerView,
    time: number,
    text: TimelineText,
) {
    if (duel) {
        return t("duelRange", {
            start: text.at(duel.range[0]),
            end: text.at(duel.range[1]),
            length: text.at(duel.range[1] - duel.range[0]),
        });
    }

    const range = (start: number, end: number) =>
        t("range", { start: text.at(start), end: text.at(end) });

    if (summon) return range(summon.range[0], summon.range[1]);
    if (held) return range(held[0], held[1]);
    if (knight?.range[1] != null)
        return range(knight.range[0], knight.range[1]);

    return text.at(time);
}

function ObjectiveTitle({ marker, view, text }: HeaderProps) {
    const t = useTranslations("replay.timeline");

    return (
        <HeaderText
            title={objectiveTitle(t, view, marker, text)}
            tag={objectiveTag(t, view, marker.side)}
            tagClassName={classNames(sideClasses(marker.side))}
            meta={objectiveMeta(t, view, marker.time, text)}
        />
    );
}

function Title(props: HeaderProps) {
    const { marker, view, text } = props;
    const { fight, structure, camp, group } = view;

    if (fight) return <FightTitle {...props} fight={fight} />;
    if (structure) {
        return (
            <StructureTitle
                structure={structure}
                time={marker.time}
                text={text}
            />
        );
    }
    if (camp) return <CampTitle camp={camp} time={marker.time} text={text} />;
    if (group) return <GroupTitle {...props} />;

    return <ObjectiveTitle {...props} />;
}

export function Header({ marker, view, curves, text }: HeaderProps) {
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
            <Title marker={marker} view={view} curves={curves} text={text} />
        </header>
    );
}
