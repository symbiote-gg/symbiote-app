import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Hexagon, Swords } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { recentFormQuery } from "@/api/queries";
import type { HeroRole } from "@/api/replays";
import type { ScoreScope } from "@/api/stats";
import { Card, CardHeader, EmptyState, Select } from "@/ui";
import { Radar } from "./radar";

import styles from "./styles.module.css";

export interface RecentFormProps {
    scope: ScoreScope;
}

export function RecentForm({ scope }: RecentFormProps) {
    const t = useTranslations("profile.recentForm");
    const tRoles = useTranslations("roles");
    const { data, error } = useQuery(recentFormQuery(scope));
    const [role, setRole] = useState<HeroRole | null>(null);
    const [roleScope, setRoleScope] = useState(scope);

    if (scope !== roleScope) {
        setRoleScope(scope);
        setRole(null);
    }

    if (error) return null;

    // A role the scope has too few recent games in falls back to all of them.
    const roleForm = data?.roles.find((form) => form.role === role);
    const form = roleForm ?? data?.all;
    const rated = form?.axes.some((row) => row.recent !== null);
    const weeks = (data?.windowDays ?? 0) / 7;

    const options =
        data?.roles.map((form) => ({
            value: form.role,
            label: tRoles(form.role),
        })) ?? [];

    return (
        <Card className={styles.root}>
            <CardHeader
                size="sm"
                icon={Hexagon}
                title={t("title")}
                subtitle={data && t("subtitle", { weeks })}
                action={
                    <Select
                        icon={<Swords />}
                        label={t("role.label")}
                        options={options}
                        value={roleForm ? roleForm.role : null}
                        emptyLabel={t("role.all")}
                        clearLabel={t("role.clear")}
                        disabled={options.length === 0}
                        onChange={setRole}
                    />
                }
            />
            {data && form && !rated ? (
                <EmptyState icon={CalendarClock} title={t("empty.title")}>
                    {form.recentGames >= data.minGames
                        ? t("empty.noBaseline", {
                              count: data.minBaselineGames,
                          })
                        : t("empty.body", { count: data.minGames, weeks })}
                </EmptyState>
            ) : (
                <div className={styles.body}>
                    <Radar axes={form && rated ? form.axes : null} />
                </div>
            )}
        </Card>
    );
}
