import { SearchX, ShieldUser } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";

import { Page } from "@/components";
import { useAppearGate } from "@/hooks/useAppearGate";
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
    const appear = useAppearGate(!!data && !isPlaceholderData, {
        resetKey: filters,
        duringIngest: true,
    });

    const onFiltersChange = (next: FilterState) => {
        saved.filters = next;
        setFilters(next);
    };

    const onClearFilters = () =>
        onFiltersChange({ ...NO_FILTERS, sort: filters.sort });

    const empty = !!data && !isPlaceholderData && heroes.length === 0;
    const noMatches = empty && isFiltered(filters);

    return (
        <Page fill>
            <Card className={styles.card}>
                <CardHeader
                    icon={ShieldUser}
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
                {empty && !error && noMatches && (
                    <EmptyState
                        icon={SearchX}
                        title={t("noMatches.title")}
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
                        {t("noMatches.body")}
                    </EmptyState>
                )}
                {empty && !error && !noMatches && (
                    <EmptyState icon={ShieldUser} title={t("empty.title")}>
                        {t("empty.body")}
                    </EmptyState>
                )}
                {!empty && (
                    <CardBody className={styles.body}>
                        <ul
                            className={styles.grid}
                            aria-busy={isPlaceholderData}
                        >
                            {heroes.map((hero) => (
                                <li key={hero.heroId}>
                                    <HeroCard hero={hero} appear={appear} />
                                </li>
                            ))}
                        </ul>
                    </CardBody>
                )}
            </Card>
        </Page>
    );
}
