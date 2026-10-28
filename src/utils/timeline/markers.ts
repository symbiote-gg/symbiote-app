import type { Timeline, TimelineFight } from "@/api/replays";
import { BAND_Y } from "./constants";
import { MAP_EVENTS, specGlyph, specLabel } from "./map-events";
import type {
    BandMarker,
    CampEntry,
    DeathEntry,
    Entry,
    KillMarker,
    Marker,
    ObjectiveMarker,
    Side,
} from "./types";

export const LONG_GAME = 35 * 60;

const OBJECTIVE_MERGE = 15;

export const isBandMarker = (marker: Marker): marker is BandMarker =>
    marker.shape in BAND_Y;

/** Only deaths and structures record which players were in on them. */
export const involves = (marker: Marker, slot: number) =>
    marker.entries.some((entry) =>
        entry.type === "death"
            ? entry.victim === slot ||
              entry.killingBlow === slot ||
              entry.killers.includes(slot)
            : entry.type === "structure" &&
              (entry.killingBlow === slot || entry.killers.includes(slot)),
    );

export function buildMarkers(timeline: Timeline, allyTeam: number): Marker[] {
    const other = (team: number | null) => (team === null ? null : 1 - team);

    const markers: Marker[] = [];
    const objectives: ObjectiveMarker[] = [];

    const deaths = deathEntries(timeline, allyTeam);

    timeline.camps.forEach((camp, index) => {
        const entry: CampEntry = {
            ...camp,
            type: "camp",
            side: sideOf(camp.team, allyTeam),
        };
        const base = {
            id: `camp-${index}`,
            time: camp.time,
            side: entry.side,
            filter: "camps" as const,
            entries: [entry],
        };

        markers.push(
            camp.campType === "Boss Camp"
                ? { ...base, shape: "boss" }
                : { ...base, shape: "camp", merged: false },
        );
    });

    timeline.structures.forEach((structure, index) => {
        const side = sideOf(other(structure.team), allyTeam);

        markers.push({
            id: `structure-${index}`,
            time: structure.time,
            side,
            filter: "structures",
            shape: structure.keep ? "keep" : "fort",
            entries: [{ ...structure, type: "structure", side }],
        });
    });

    timeline.objectives.forEach((objective, index) => {
        const { kind, time, variant } = objective;
        const spec = MAP_EVENTS[kind] ?? null;
        const side =
            spec?.role === "spawn" ? null : sideOf(objective.team, allyTeam);
        const entry: Entry = { type: "map", time, side, objective, spec };
        const base = {
            id: `objective-${index}`,
            time,
            side,
            filter: "objectives" as const,
            entries: [entry],
        };

        if (spec?.role === "tick") {
            markers.push({ ...base, shape: "ring", merged: false });
        } else if (spec?.role === "spawn") {
            markers.push({
                ...base,
                shape: "spawn",
                glyph: specGlyph(spec, variant),
            });
        } else {
            objectives.push({
                ...base,
                shape: "objective",
                kind,
                glyph: spec ? specGlyph(spec, variant) : "flag",
                label: spec ? specLabel(spec, variant) : null,
                count: 1,
            });
        }
    });

    return [
        ...markers,
        ...fightMarkers(timeline.fights, deaths),
        ...mergeObjectives(objectives),
    ].sort((a, b) => a.time - b.time);
}

export const killerOf = (death: DeathEntry) =>
    death.killingBlow ?? death.killers[0] ?? null;

/**
 * Each death on its own, as the timeline shows a lone kill, with the kind of the
 * fight it was in. By death index.
 */
export function deathMarkers(timeline: Timeline, allyTeam: number) {
    const deaths = deathEntries(timeline, allyTeam);

    return new Map(
        timeline.fights.flatMap((fight) =>
            fight.deaths.map((index): [number, KillMarker] => {
                const entry = deaths[index];
                return [
                    index,
                    {
                        id: `death-${index}`,
                        time: entry.time,
                        side: entry.side,
                        filter: "fights",
                        shape: "kill",
                        kind: fight.kind,
                        entries: [entry],
                    },
                ];
            }),
        ),
    );
}

function fightMarkers(fights: TimelineFight[], deaths: DeathEntry[]) {
    return fights.map((fight): Marker => {
        const group = fight.deaths.map((index) => deaths[index]);
        const [first] = group;
        const base = {
            // By death index: fights split by distance can share a start time.
            id: `death-${fight.deaths[0]}`,
            time: first.time,
            filter: "fights" as const,
            kind: fight.kind,
            entries: group,
        };

        if (group.length === 1) {
            return { ...base, side: first.side, shape: "kill" };
        }

        const ally = group.filter((d) => d.side === "ally").length;
        const enemy = group.filter((d) => d.side === "enemy").length;

        return {
            ...base,
            id: `fight-${fight.deaths[0]}`,
            shape: "fight",
            side: ally === enemy ? null : ally > enemy ? "ally" : "enemy",
            end: fight.end,
            score: [ally, enemy],
            participants: new Set(
                group.flatMap((d) => [d.victim, ...d.killers]),
            ).size,
        };
    });
}

function mergeObjectives(objectives: ObjectiveMarker[]) {
    const merged: ObjectiveMarker[] = [];
    const open = new Map<string, ObjectiveMarker>();

    for (const objective of objectives) {
        const key = `${objective.kind}:${objective.side}`;
        const current = open.get(key);
        const last = current?.entries[current.entries.length - 1];

        if (current && last && objective.time - last.time <= OBJECTIVE_MERGE) {
            current.count += 1;
            current.entries.push(...objective.entries);
            continue;
        }

        const copy = { ...objective, entries: [...objective.entries] };
        open.set(key, copy);
        merged.push(copy);
    }

    return merged;
}

export const deathEntries = (timeline: Timeline, allyTeam: number) =>
    timeline.deaths.map((death): DeathEntry => ({
        ...death,
        type: "death",
        side: sideOf(death.team === null ? null : 1 - death.team, allyTeam),
    }));

export function sideOf(team: number | null, allyTeam: number): Side {
    return team === null ? null : team === allyTeam ? "ally" : "enemy";
}

export function markerView(marker: Marker) {
    const deaths = marker.entries.filter(
        (entry): entry is DeathEntry => entry.type === "death",
    );
    const fight =
        marker.shape === "kill" || marker.shape === "fight"
            ? marker.kind
            : null;
    const kills = fight !== null;
    const structure =
        marker.entries.length === 1 && marker.entries[0].type === "structure"
            ? marker.entries[0]
            : null;
    const camp: CampEntry | null =
        marker.entries.length === 1 && marker.entries[0].type === "camp"
            ? marker.entries[0]
            : null;
    const map =
        marker.entries.length === 1 && marker.entries[0].type === "map"
            ? marker.entries[0]
            : null;
    const held = map?.objective.held ?? null;
    const race = map?.objective.race ?? null;
    const summon = map?.objective.summon ?? null;
    const duel = map?.objective.duel ?? null;
    const altar = map?.objective.altar ?? null;
    const knight = map?.objective.knight ?? null;
    const group = marker.entries.length > 1 && !kills;
    const camps = marker.entries.every((entry) => entry.type === "camp");
    const offsets = deaths.length > 1;
    const score = [
        deaths.filter((death) => death.side === "ally").length,
        deaths.filter((death) => death.side === "enemy").length,
    ];
    const end = Math.max(
        marker.time,
        ...marker.entries.map((entry) => entry.time),
    );

    return {
        deaths,
        fight,
        kills,
        structure,
        camp,
        map,
        held,
        race,
        summon,
        duel,
        altar,
        knight,
        group,
        camps,
        offsets,
        score,
        end,
    };
}

export type MarkerView = ReturnType<typeof markerView>;
