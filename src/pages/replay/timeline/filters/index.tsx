import { UserRound } from "lucide-react";
import type { MouseEvent } from "react";
import { useTranslations } from "use-intl";

import { ChipButton, ChipDivider, ChipGroup } from "@/ui";
import { FILTERS, FILTER_GLYPHS, type Filter } from "@/utils/timeline/filters";
import { GlyphIcon } from "../glyphs";

interface FiltersProps {
    hidden: Set<Filter>;
    disabled: Set<Filter>;
    counts: Record<Filter, number>;
    me: boolean;
    meCount: number;
    onToggle: (filter: Filter) => void;
    onToggleMe: () => void;
}

export function Filters({
    hidden,
    disabled,
    counts,
    me,
    meCount,
    onToggle,
    onToggleMe,
}: FiltersProps) {
    const t = useTranslations("replay.timeline.filter");

    const onClick = (e: MouseEvent<HTMLButtonElement>) =>
        onToggle(e.currentTarget.value as Filter);

    return (
        <ChipGroup label={t("label")}>
            <ChipButton
                icon={<UserRound />}
                count={meCount}
                pressed={me}
                accent="primary"
                onClick={onToggleMe}
            >
                {t("me")}
            </ChipButton>
            <ChipDivider />
            {FILTERS.map((filter) => {
                const off = disabled.has(filter);
                return (
                    <ChipButton
                        key={filter}
                        icon={<GlyphIcon glyph={FILTER_GLYPHS[filter]} />}
                        count={off ? undefined : counts[filter]}
                        pressed={!off && !hidden.has(filter)}
                        disabled={off}
                        value={filter}
                        onClick={onClick}
                    >
                        {t(filter)}
                    </ChipButton>
                );
            })}
        </ChipGroup>
    );
}
