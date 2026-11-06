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

    const percent = (value: Value) =>
        value == null
            ? "-"
            : format.number(value, {
                  style: "percent",
                  maximumFractionDigits: 0,
              });

    const kda = (value: Value) =>
        value == null
            ? "-"
            : format.number(value, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
              });

    return { compact, percent, kda };
}
