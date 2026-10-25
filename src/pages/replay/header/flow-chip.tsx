import {
    ChevronDown,
    ChevronUp,
    ChevronsDown,
    ChevronsUp,
    type LucideIcon,
    Scale,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import { useTranslations } from "use-intl";

import type { GameFlow } from "@/api/replays";
import { Chip, type ChipSize, type ChipTone, Tooltip } from "@/ui";

type OwnerFlow =
    | "stomp"
    | "stomped"
    | "comeback"
    | "leadLost"
    | "close"
    | "controlled"
    | "outpaced";

const ICONS: Record<OwnerFlow, LucideIcon> = {
    stomp: ChevronsUp,
    stomped: ChevronsDown,
    comeback: TrendingUp,
    leadLost: TrendingDown,
    close: Scale,
    controlled: ChevronUp,
    outpaced: ChevronDown,
};

const TONES: Record<OwnerFlow, ChipTone> = {
    stomp: "win",
    stomped: "loss",
    comeback: "win",
    leadLost: "loss",
    close: "warn",
    controlled: "win",
    outpaced: "loss",
};

/** Flows are the winner's, so a loss reads them from the other side. */
const toOwnerFlow = (flow: GameFlow, ownerWin: boolean): OwnerFlow => {
    switch (flow) {
        case "stomp":
            return ownerWin ? "stomp" : "stomped";
        case "comeback":
            return ownerWin ? "comeback" : "leadLost";
        case "close":
            return "close";
        case "controlled":
            return ownerWin ? "controlled" : "outpaced";
    }
};

export interface FlowChipProps {
    flow: GameFlow;
    ownerWin: boolean;
    size?: ChipSize;
    className?: string;
}

export function FlowChip({
    flow,
    ownerWin,
    size = "sm",
    className,
}: FlowChipProps) {
    const t = useTranslations("replay");
    const ownerFlow = toOwnerFlow(flow, ownerWin);
    const label = t("flow", { flow: ownerFlow });

    return (
        <Tooltip
            content={label}
            description={t("flowDescription", { flow: ownerFlow })}
            className={className}
        >
            <Chip
                size={size}
                icon={ICONS[ownerFlow]}
                tone={TONES[ownerFlow]}
                uppercase
            >
                {label}
            </Chip>
        </Tooltip>
    );
}
