import { Trophy } from "lucide-react";
import { useTranslations } from "use-intl";

import { Select } from "@/ui";

type Result = "wins" | "defeats";

const toResult = (win: boolean | null): Result | null =>
    win === null ? null : win ? "wins" : "defeats";

const toWin = (result: Result | null) =>
    result === null ? null : result === "wins";

export interface ResultFilterProps {
    value: boolean | null;
    onChange: (value: boolean | null) => void;
}

export function ResultFilter({ value, onChange }: ResultFilterProps) {
    const t = useTranslations("filters.result");

    const onSelect = (result: Result | null) => onChange(toWin(result));

    const options = (["wins", "defeats"] as const).map((result) => ({
        value: result,
        label: t(result),
    }));

    return (
        <Select
            icon={<Trophy />}
            label={t("label")}
            options={options}
            value={toResult(value)}
            emptyLabel={t("all")}
            clearLabel={t("clear")}
            onChange={onSelect}
        />
    );
}
