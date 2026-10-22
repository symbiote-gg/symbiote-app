import type {
    Objective,
    TimelineCamp,
    TimelineDeath,
    TimelineStructure,
} from "@/api/replays";
import type { Filter } from "./filters";
import type { Glyph, MapEventSpec, ObjectiveLabel } from "./map-events";

export type Side = "ally" | "enemy" | null;

export type DeathEntry = TimelineDeath & { type: "death"; side: Side };
export type StructureEntry = TimelineStructure & {
    type: "structure";
    side: Side;
};
export type CampEntry = TimelineCamp & { type: "camp"; side: Side };
export type MapEntry = {
    type: "map";
    time: number;
    side: Side;
    objective: Objective;
    spec: MapEventSpec | null;
};

export type Entry = DeathEntry | StructureEntry | CampEntry | MapEntry;

interface MarkerBase {
    id: string;
    time: number;
    side: Side;
    filter: Filter;
    entries: Entry[];
}

export type TickMarker = MarkerBase & {
    shape: "dot" | "camp" | "ring";
    merged: boolean;
};
export type SpawnMarker = MarkerBase & { shape: "spawn"; glyph: Glyph };
export type FightMarker = MarkerBase & {
    shape: "fight";
    end: number;
    score: [number, number];
    participants: number;
};
export type KillMarker = MarkerBase & { shape: "kill" };
export type StructureMarker = MarkerBase & { shape: "boss" | "fort" | "keep" };
export type ObjectiveMarker = MarkerBase & {
    shape: "objective";
    kind: string;
    glyph: Glyph;
    label: ObjectiveLabel | null;
    count: number;
};

export type Marker =
    | TickMarker
    | SpawnMarker
    | KillMarker
    | FightMarker
    | StructureMarker
    | ObjectiveMarker;
export type BandMarker =
    KillMarker | FightMarker | StructureMarker | ObjectiveMarker;
