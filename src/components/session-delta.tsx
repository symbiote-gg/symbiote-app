import { useFormatter } from "use-intl";

import { Chip } from "@/ui";

export interface SessionDeltaProps {
    value: number;
    unit: "percent" | "points";
}

export function SessionDelta({ value, unit }: SessionDeltaProps) {
    const format = useFormatter();

    const label =
        unit === "percent"
            ? format.number(value, {
                  style: "percent",
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                  signDisplay: "exceptZero",
              })
            : format.number(value, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                  signDisplay: "exceptZero",
              });

    return (
        <Chip size="sm" tone={value > 0 ? "win" : "loss"}>
            {label}
        </Chip>
    );
}
