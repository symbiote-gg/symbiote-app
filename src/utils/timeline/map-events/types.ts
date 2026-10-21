import type { TimelineEvent } from "@/api/replays";
import type en from "@/i18n/messages/en.json";

export type Glyph =
    | "arcane"
    | "bolt"
    | "bug"
    | "cart"
    | "castle"
    | "coins"
    | "crosshair"
    | "crown"
    | "fire"
    | "fist"
    | "flag"
    | "frost"
    | "gem"
    | "golem"
    | "keep"
    | "knight"
    | "layers"
    | "mech"
    | "nuke"
    | "orb"
    | "raven"
    | "ship"
    | "skull"
    | "sprout"
    | "star"
    | "swarm"
    | "swords"
    | "tent"
    | "temple";

export type ObjectiveLabel = keyof typeof en.replay.timeline.objective;
export type DetailKey = keyof typeof en.replay.timeline.detail;

export interface MapEventData {
    ints?: Record<string, number>;
    strings?: Record<string, string>;
    fixed?: Record<string, number>;
}

export type Detail =
    | { key: DetailKey; team: number | null }
    | { key: DetailKey; value: number; unit?: "percent" | "seconds" }
    | { key: DetailKey; score: [number, number] }
    | { key: DetailKey; text: string };

/** Both teams' progress towards one objective, drawn as two bars. */
export interface Race {
    kind:
        | "capture"
        | "curse"
        | "gems"
        | "golem"
        | "shrine"
        | "ship"
        | "temple"
        | "wave";
    teamValues: [number, number];
    unit?: "percent";
    topTeam?: number;
}

/** A summoned unit's life, spawn to death, and the damage it did. */
export interface Summon {
    range: [number, number];
    siege: number;
    heroes: number;
}

/** An immortal fight: who won and how much of their immortal survived. */
export interface Duel {
    range: [number, number];
    winner: number;
    power: number;
}

/** An altar capture: the firing team and the towns adding shots to its core. */
export interface Altar {
    winner: number;
    towns: number;
}

/** A Dragon Knight's ride: its pilot and what they took down while it lived. */
export interface Knight {
    /** End is null while the knight outlived the game. */
    range: [number, number | null];
    pilot: number;
    takedowns: number;
    structures: number;
}

export interface MapEventSpec {
    role: "objective" | "tick" | "spawn" | "ignore";
    glyph: Glyph;
    /** Per-event glyph; filters keep the static one. */
    glyphFor?: (data: MapEventData) => Glyph;
    label: (data: MapEventData) => ObjectiveLabel;
    /** The team that gained, 0/1; defaults to the event's team. */
    team?: (data: MapEventData, team: number | null) => number | null;
    when?: (event: TimelineEvent, events: TimelineEvent[]) => boolean;
    details?: (data: MapEventData, event: TimelineEvent) => Detail[];
    race?: (
        data: MapEventData,
        event: TimelineEvent,
        events: TimelineEvent[],
    ) => Race | null;
    lifetime?: (
        event: TimelineEvent,
        events: TimelineEvent[],
    ) => [number, number] | null;
    /** A state's start and end, shown in the popover, not on the track. */
    held?: (
        event: TimelineEvent,
        events: TimelineEvent[],
    ) => [number, number] | null;
    summon?: (data: MapEventData, event: TimelineEvent) => Summon | null;
    duel?: (data: MapEventData, event: TimelineEvent) => Duel | null;
    altar?: (data: MapEventData, event: TimelineEvent) => Altar | null;
    knight?: (
        data: MapEventData,
        event: TimelineEvent,
        events: TimelineEvent[],
    ) => Knight | null;
}
