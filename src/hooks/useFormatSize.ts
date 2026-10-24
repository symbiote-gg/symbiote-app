import { useFormatter } from "use-intl";

export function useFormatSize() {
    const format = useFormatter();

    return (bytes: number) => {
        if (bytes >= 1e9) {
            return format.number(bytes / 1e9, {
                style: "unit",
                unit: "gigabyte",
                maximumFractionDigits: 1,
            });
        }
        if (bytes >= 1e6) {
            return format.number(bytes / 1e6, {
                style: "unit",
                unit: "megabyte",
                maximumFractionDigits: 0,
            });
        }
        return format.number(bytes / 1e3, {
            style: "unit",
            unit: "kilobyte",
            maximumFractionDigits: 0,
        });
    };
}
