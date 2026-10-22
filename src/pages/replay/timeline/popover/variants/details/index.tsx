import classNames from "classnames";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { Typography } from "@/ui";
import { sideOf } from "@/utils/timeline/markers";
import type { Entry, Side } from "@/utils/timeline/types";
import { sideClasses } from "../../../side";

import styles from "./styles.module.css";

export interface DetailItem {
    key: string | number;
    label: string;
    value: ReactNode;
}

export function useDetailItems(
    entry: Entry | null,
    allyTeam: number,
): DetailItem[] {
    const t = useTranslations("replay.timeline");

    const teamName = (team: number | null) =>
        t("team", { side: sideOf(team, allyTeam) ?? "none" });

    if (!entry) return [];
    switch (entry.type) {
        case "death":
        case "structure":
            return [];
        case "camp":
            return [
                {
                    key: "camp",
                    label: t("detail.camp"),
                    value: entry.campType ?? "?",
                },
                {
                    key: "team",
                    label: t("detail.capturer"),
                    value: teamName(entry.team),
                },
                {
                    key: "nth",
                    label: t("detail.capture"),
                    value: t("detail.nth", { nth: entry.nth }),
                },
            ];
        case "map":
            return Object.entries({
                ...entry.objective.raw?.ints,
                ...entry.objective.raw?.strings,
            }).map(([key, value]) => ({ key, label: key, value }));
    }
}

interface DetailRowProps {
    label: string;
    value: ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
    return (
        <div className={styles.row}>
            <Typography size="xs" variant="secondary">
                {label}
            </Typography>
            {typeof value === "string" || typeof value === "number" ? (
                <Typography size="xs" mono>
                    {value}
                </Typography>
            ) : (
                value
            )}
        </div>
    );
}

interface DetailsProps {
    items: DetailItem[];
    side: Side;
}

export function Details({ items, side }: DetailsProps) {
    return (
        <div className={classNames(styles.details, sideClasses(side))}>
            {items.map((item) => (
                <DetailRow
                    key={item.key}
                    label={item.label}
                    value={item.value}
                />
            ))}
        </div>
    );
}
