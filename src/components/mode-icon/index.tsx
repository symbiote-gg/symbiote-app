import classNames from "classnames";
import {
    Bot,
    CircleQuestionMark,
    CloudLightning,
    Dices,
    ListChecks,
    type LucideIcon,
    PartyPopper,
    SlidersHorizontal,
    Zap,
} from "lucide-react";

import type { Mode } from "@/api/replays";

import styles from "./style.module.css";

const ICONS: Partial<Record<Mode, LucideIcon>> = {
    quick_match: Zap,
    versus_ai: Bot,
    brawl: PartyPopper,
    unranked_draft: ListChecks,
    storm_league: CloudLightning,
    aram: Dices,
    custom: SlidersHorizontal,
};

export interface ModeIconProps {
    mode: Mode;
    className?: string;
}

export function ModeIcon({ mode, className }: ModeIconProps) {
    const Icon = ICONS[mode] ?? CircleQuestionMark;

    return <Icon className={classNames(styles.root, className)} />;
}
