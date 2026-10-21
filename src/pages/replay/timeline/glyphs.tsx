import {
    Biohazard,
    Bird,
    Bone,
    Bot,
    Bug,
    Castle,
    CircleDot,
    Coins,
    Crosshair,
    Crown,
    Flag,
    Flame,
    Gem,
    HandFist,
    Landmark,
    Layers,
    type LucideIcon,
    Radiation,
    Ship,
    Skull,
    Snowflake,
    Sparkles,
    Sprout,
    Star,
    SunMoon,
    Swords,
    Tent,
    TowerControl,
    Truck,
    Zap,
} from "lucide-react";

import type { Glyph } from "@/utils/timeline/map-events";

const ICONS: Record<Glyph, LucideIcon> = {
    arcane: Sparkles,
    bolt: Zap,
    bug: Bug,
    cart: Truck,
    castle: Castle,
    coins: Coins,
    crosshair: Crosshair,
    crown: Crown,
    fire: Flame,
    flag: Flag,
    fist: HandFist,
    frost: Snowflake,
    gem: Gem,
    golem: Bone,
    keep: TowerControl,
    knight: SunMoon,
    layers: Layers,
    mech: Bot,
    nuke: Radiation,
    orb: CircleDot,
    raven: Bird,
    ship: Ship,
    skull: Skull,
    sprout: Sprout,
    star: Star,
    swarm: Biohazard,
    swords: Swords,
    tent: Tent,
    temple: Landmark,
};

interface GlyphIconProps {
    glyph: Glyph;
    className?: string;
}

export function GlyphIcon({ glyph, className }: GlyphIconProps) {
    const Icon = ICONS[glyph];
    return <Icon className={className} aria-hidden />;
}
