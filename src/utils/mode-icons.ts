import {
    Bot,
    CircleQuestionMark,
    Dices,
    ListChecks,
    type LucideIcon,
    PartyPopper,
    SlidersHorizontal,
    Trophy,
    Zap,
} from "lucide-react";

import type { Mode } from "@/api/replays";

export const MODE_ICONS: Record<Mode, LucideIcon> = {
    quick_match: Zap,
    versus_ai: Bot,
    brawl: PartyPopper,
    unranked_draft: ListChecks,
    hero_league: CircleQuestionMark,
    team_league: CircleQuestionMark,
    storm_league: Trophy,
    aram: Dices,
    custom: SlidersHorizontal,
    unknown: CircleQuestionMark,
};
