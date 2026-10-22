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
    | "ghost"
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

export interface MapEventSpec {
    role: "objective" | "tick" | "spawn";
    glyph: Glyph;
    label: ObjectiveLabel;
    /** Per-variant glyph and label; filters keep the static glyph. */
    variants?: Record<string, { glyph: Glyph; label: ObjectiveLabel }>;
}
