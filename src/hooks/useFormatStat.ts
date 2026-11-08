import { useFormatter } from "use-intl";

type Value = number | null | undefined;

interface CompactOptions {
    /** Always shows one decimal, so averages line up. */
    fixed?: boolean;
}

export function useFormatStat() {
    const format = useFormatter();

    const compact = (value: Value, { fixed }: CompactOptions = {}) =>
        value == null
            ? "-"
            : format.number(value, {
                  notation: "compact",
                  minimumFractionDigits: fixed ? 1 : undefined,
                  maximumFractionDigits: 1,
              });

    // Three digits, so 2.45M and 39.1M carry the same precision.
    const total = (value: Value) => {
        if (value == null) return "-";
        if (Math.abs(value) < 1000) return format.number(value);

        return format.number(value, {
            notation: "compact",
            minimumSignificantDigits: 3,
            maximumSignificantDigits: 3,
        });
    };

    const percent = (value: Value) =>
        value == null
            ? "-"
            : format.number(value, {
                  style: "percent",
                  maximumFractionDigits: 0,
              });

    const winPercent = (value: Value) =>
        value == null
            ? "-"
            : format.number(value, {
                  style: "percent",
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
              });

    const kda = (value: Value) =>
        value == null
            ? "-"
            : format.number(value, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
              });

    return { compact, total, percent, winPercent, kda };
}
