import type { TimelineEvent } from "@/api/replays";
import { BAND_Y } from "./constants";
import {
    MAP_EVENTS,
    type MapEventData,
    specGlyph,
    unknownTeam,
} from "./map-events";
import type {
    BandMarker,
    CampEntry,
    DeathEntry,
    Entry,
    Lane,
    Marker,
    ObjectiveMarker,
    Side,
} from "./types";

export const LONG_GAME = 35 * 60;
const TEAM_FIGHT_DEATHS = 3;
const GANK_KILLERS = 3;

/** Gank when a lone hero dies to several killers, else pick; more deaths go by count. */
export function fightKind(deaths: DeathEntry[]) {
    if (deaths.length >= TEAM_FIGHT_DEATHS) return "teamFight";
    if (deaths.length === 2) return "skirmish";
    const [death] = deaths;
    return death.alone === true && death.killers.length >= GANK_KILLERS
        ? "gank"
        : "pick";
}

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

export function buildMarkers(
    events: TimelineEvent[],
    duration: number,
    allyTeam: number,
): Marker[] {
    const other = (team: number | null) => (team === null ? null : 1 - team);

    const markers: Marker[] = [];
    const deaths: DeathEntry[] = [];
    const objectives: ObjectiveMarker[] = [];
    const captures = new Map<number, number>();

    events.forEach((event, index) => {
        if (event.time < 0) return;
        const { data, time } = event;
        const id = `${event.kind}-${index}`;

        switch (event.kind) {
            case "team_level":
                return;
            case "death":
                deaths.push({
                    type: "death",
                    time,
                    side: sideOf(other(event.team), allyTeam),
                    victim: data.victim as number,
                    killers: data.killers as number[],
                    killingBlow: data.killing_blow as number | null,
                    alone: (data.alone as boolean | null | undefined) ?? null,
                });
                return;
            case "camp_capture": {
                const campId = data.camp_id as number;
                const nth = (captures.get(campId) ?? 0) + 1;

                captures.set(campId, nth);

                const campType = data.camp_type as string | null;
                const entry: Entry = {
                    type: "camp",
                    time,
                    side: sideOf(event.team, allyTeam),
                    team: event.team,
                    campType,
                    nth,
                };
                const base = {
                    id,
                    time,
                    side: entry.side,
                    filter: "camps" as const,
                    entries: [entry],
                };

                markers.push(
                    campType === "Boss Camp"
                        ? { ...base, shape: "boss" }
                        : { ...base, shape: "camp", merged: false },
                );

                return;
            }
            case "structure_death": {
                const keep = data.unit_type === "TownTownHallL3";
                const side = sideOf(other(event.team), allyTeam);

                markers.push({
                    id,
                    time,
                    side,
                    filter: "structures",
                    shape: keep ? "keep" : "fort",
                    entries: [
                        {
                            type: "structure",
                            time,
                            side,
                            keep,
                            lane: data.lane as Lane | null,
                            killers: data.killers as number[],
                            killingBlow: data.killing_blow as number | null,
                        },
                    ],
                });

                return;
            }
        }

        const spec = MAP_EVENTS[event.kind] ?? null;
        if (
            spec?.role === "ignore" ||
            (spec?.when && !spec.when(event, events))
        ) {
            return;
        }

        const mapData = data as MapEventData;
        const team = spec
            ? (spec.team?.(mapData, event.team) ?? event.team)
            : unknownTeam(event);
        const side = spec?.role === "spawn" ? null : sideOf(team, allyTeam);
        const entry: Entry = {
            type: "map",
            time,
            side,
            event,
            spec,
            held: spec?.held?.(event, events) ?? null,
            race: spec?.race?.(mapData, event, events) ?? null,
            knight: spec?.knight?.(mapData, event, events) ?? null,
        };
        const base = {
            id,
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
                glyph: specGlyph(spec, mapData),
            });
        } else {
            objectives.push({
                ...base,
                shape: "objective",
                kind: event.kind,
                glyph: spec ? specGlyph(spec, mapData) : "flag",
                label: spec?.label(mapData) ?? null,
                count: 1,
            });
        }
    });

    return [
        ...markers,
        ...groupFights(deaths, duration),
        ...mergeObjectives(objectives),
    ].sort((a, b) => a.time - b.time);
}

function groupFights(deaths: DeathEntry[], duration: number): Marker[] {
    const window = duration > LONG_GAME ? 15 : 12;
    const groups: DeathEntry[][] = [];

    for (const death of deaths) {
        const last = groups[groups.length - 1];
        if (last && death.time - last[last.length - 1].time <= window) {
            last.push(death);
        } else {
            groups.push([death]);
        }
    }

    return groups.map((group): Marker => {
        const [first] = group;
        const base = {
            id: `death-${first.time}`,
            time: first.time,
            filter: "fights" as const,
            entries: group,
        };

        if (group.length === 1) {
            return { ...base, side: first.side, shape: "kill" };
        }

        const ally = group.filter((d) => d.side === "ally").length;
        const enemy = group.filter((d) => d.side === "enemy").length;

        return {
            ...base,
            id: `fight-${first.time}`,
            shape: "fight",
            side: ally === enemy ? null : ally > enemy ? "ally" : "enemy",
            end: group[group.length - 1].time,
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

export function sideOf(team: number | null, allyTeam: number): Side {
    return team === null ? null : team === allyTeam ? "ally" : "enemy";
}

export function markerView(marker: Marker) {
    const deaths = marker.entries.filter(
        (entry): entry is DeathEntry => entry.type === "death",
    );
    const kills = deaths.length > 0 && deaths.length === marker.entries.length;
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
    const race = map?.race ?? null;
    const summon = map?.spec?.summon?.(map.event.data, map.event) ?? null;
    const duel = map?.spec?.duel?.(map.event.data, map.event) ?? null;
    const altar = map?.spec?.altar?.(map.event.data, map.event) ?? null;
    const knight = map?.knight ?? null;
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
        kills,
        structure,
        camp,
        map,
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
