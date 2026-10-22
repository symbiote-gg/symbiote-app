import type { Timeline } from "@/api/replays";
import { BAND_Y } from "./constants";
import { MAP_EVENTS, specGlyph, specLabel } from "./map-events";
import type {
    BandMarker,
    CampEntry,
    DeathEntry,
    Entry,
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
    timeline: Timeline,
    duration: number,
    allyTeam: number,
): Marker[] {
    const other = (team: number | null) => (team === null ? null : 1 - team);

    const markers: Marker[] = [];
    const objectives: ObjectiveMarker[] = [];

    const deaths = timeline.deaths.map((death): DeathEntry => ({
        ...death,
        type: "death",
        side: sideOf(other(death.team), allyTeam),
    }));

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
