import type { ReactNode } from "react";

import type { TimelineText } from "@/hooks/useTimelineText";
import type { MarkerView } from "@/utils/timeline/markers";
import type { Roster } from "@/utils/timeline/roster";
import type { Marker } from "@/utils/timeline/types";
import { Altar } from "../variants/altar";
import { type DetailItem, Details, useDetailItems } from "../variants/details";
import { Duel } from "../variants/duel";
import { Events } from "../variants/events";
import { Held } from "../variants/held";
import { Kills, StructureKill } from "../variants/kills";
import { Knight } from "../variants/knight";
import { Race } from "../variants/race";
import { Summon } from "../variants/summon";

import styles from "./styles.module.css";

interface BodyProps {
    marker: Marker;
    view: MarkerView;
    roster: Roster;
    text: TimelineText;
}

function content(
    { marker, view, roster, text }: BodyProps,
    details: DetailItem[],
): ReactNode {
    const { side } = marker;

    if (view.kills) {
        return (
            <Kills
                deaths={view.deaths}
                offsets={view.offsets}
                time={marker.time}
                roster={roster}
            />
        );
    }
    if (view.structure) {
        return <StructureKill entry={view.structure} roster={roster} />;
    }
    if (view.camp) return null;
    if (view.map?.held) {
        return <Held range={view.map.held} side={side} text={text} />;
    }
    if (view.knight) {
        return (
            <Knight
                knight={view.knight}
                side={side}
                roster={roster}
                text={text}
            />
        );
    }
    if (view.altar) {
        return <Altar altar={view.altar} allyTeam={roster.allyTeam} />;
    }
    if (view.duel) {
        return <Duel duel={view.duel} side={side} allyTeam={roster.allyTeam} />;
    }
    if (view.summon) {
        return <Summon summon={view.summon} side={side} text={text} />;
    }
    if (view.race) {
        return <Race race={view.race} side={side} allyTeam={roster.allyTeam} />;
    }
    if (marker.entries.length === 1) {
        if (details.length === 0) return null;
        return <Details items={details} side={side} />;
    }
    return <Events entries={marker.entries} time={marker.time} text={text} />;
}

export function Body(props: BodyProps) {
    const { marker, roster } = props;
    const details = useDetailItems(
        marker.entries.length === 1 ? marker.entries[0] : null,
        roster.allyTeam,
    );

    const body = content(props, details);
    if (!body) return null;

    return <div className={styles.body}>{body}</div>;
}
