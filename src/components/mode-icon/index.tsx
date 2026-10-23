import classNames from "classnames";
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
import { useTranslations } from "use-intl";

import type { Mode } from "@/api/replays";

import styles from "./style.module.css";

const ICONS: Partial<Record<Mode, LucideIcon>> = {
    quick_match: Zap,
    versus_ai: Bot,
    brawl: PartyPopper,
    unranked_draft: ListChecks,
    storm_league: Trophy,
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

export interface ModeLabelProps {
    mode: Mode;
    iconClassName?: string;
}

export function ModeLabel({ mode, iconClassName }: ModeLabelProps) {
    const t = useTranslations("modes");

    return (
        <>
            <ModeIcon mode={mode} className={iconClassName} />
            {t(mode)}
        </>
    );
}
