import type { TimelineEvent } from "@/api/replays";
import type { Filter } from "./filters";
import type {
    Glyph,
    Knight,
    MapEventSpec,
    ObjectiveLabel,
    Race,
} from "./map-events";

export type Side = "ally" | "enemy" | null;
export type Lane = "top" | "middle" | "bottom";

export type DeathEntry = {
    type: "death";
    time: number;
    side: Side;
    victim: number;
    killers: number[];
    /** Null when no hero landed it: minions, structures, mercenaries. */
    killingBlow: number | null;
};

export type StructureEntry = {
    type: "structure";
    time: number;
    side: Side;
    keep: boolean;
    /** Null on maps without distinct lanes. */
    lane: Lane | null;
    killers: number[];
    /** Null when no hero landed it: minions, mercenaries. */
    killingBlow: number | null;
};

export type CampEntry = {
    type: "camp";
    time: number;
    side: Side;
    team: number | null;
    campType: string | null;
    nth: number;
};

export type Entry =
    | DeathEntry
    | StructureEntry
    | CampEntry
    | {
          type: "map";
          time: number;
          side: Side;
          event: TimelineEvent;
          spec: MapEventSpec | null;
          held: [number, number] | null;
          race: Race | null;
          knight: Knight | null;
      };

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
