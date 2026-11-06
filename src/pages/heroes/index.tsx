import { Crown } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";

import { Page } from "@/components";
import { useHeroList } from "@/hooks/useHeroList";
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    ErrorMessage,
} from "@/ui";
import { Filters } from "./filters";
import {
    type FilterState,
    NO_FILTERS,
    isFiltered,
    pickHeroes,
    saved,
    toReplayFilters,
} from "./filters/state";
import { HeroCard } from "./hero-card";

import styles from "./styles.module.css";

export function Heroes() {
    const t = useTranslations("heroes");
    const [filters, setFilters] = useState(saved.filters);
    const query = useMemo(() => toReplayFilters(filters), [filters]);
    const { data, error, isPlaceholderData } = useHeroList(query);

    const heroes = useMemo(
        () => (data ? pickHeroes(data.heroes, filters) : []),
        [data, filters],
    );

    const onFiltersChange = (next: FilterState) => {
        saved.filters = next;
        setFilters(next);
    };

    const onClearFilters = () =>
        onFiltersChange({ ...NO_FILTERS, sort: filters.sort });

    const empty = !!data && !isPlaceholderData && heroes.length === 0;

    return (
        <Page fill>
            <Card className={styles.card}>
                <CardHeader
                    icon={Crown}
                    title={t("title")}
                    subtitle={t("played", {
                        played: data?.heroes.length ?? 0,
                        total: data?.total ?? 0,
                    })}
                    divided
                />
                <Filters value={filters} onChange={onFiltersChange} />
                {error && (
                    <ErrorMessage error={error} className={styles.error} />
                )}
                <CardBody>
                    {empty && isFiltered(filters) ? (
                        <EmptyState
                            action={
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={onClearFilters}
                                >
                                    {t("clearFilters")}
                                </Button>
                            }
                        >
                            {t("noMatches")}
                        </EmptyState>
                    ) : empty ? (
                        <EmptyState>{t("empty")}</EmptyState>
                    ) : (
                        <ul
                            className={styles.grid}
                            aria-busy={isPlaceholderData}
                        >
                            {heroes.map((hero) => (
                                <li key={hero.heroId}>
                                    <HeroCard hero={hero} />
                                </li>
                            ))}
                        </ul>
                    )}
                </CardBody>
            </Card>
        </Page>
    );
}
