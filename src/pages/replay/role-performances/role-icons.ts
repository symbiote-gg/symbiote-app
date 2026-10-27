import {
    Cross,
    HandFist,
    LocateFixed,
    type LucideIcon,
    ShieldHalf,
    Sword,
    createLucideIcon,
} from "lucide-react";

import type { HeroRole } from "@/api/replays";

const Trident = createLucideIcon("trident", [
    ["path", { d: "M12 4v18", key: "shaft" }],
    ["path", { d: "M9 7l3-3 3 3", key: "tip" }],
    ["path", { d: "M5 6V9a7 7 0 0 0 14 0V6", key: "prongs" }],
    ["path", { d: "M3 8l2-2 2 2", key: "left" }],
    ["path", { d: "M17 8l2-2 2 2", key: "right" }],
]);

export const ROLE_ICONS: Record<HeroRole, LucideIcon> = {
    tank: ShieldHalf,
    bruiser: HandFist,
    healer: Cross,
    support: LocateFixed,
    melee_assassin: Sword,
    ranged_assassin: Trident,
};
