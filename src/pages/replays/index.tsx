import { Clapperboard } from "lucide-react";
import {
    type UIEvent,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslations } from "use-intl";

import { DEFAULT_REPLAY_SORT, type ReplaySort } from "@/api/replays";
import { Page, ReplayListHeader } from "@/components";
import { useIngesting } from "@/hooks/useIngestProgress";
import { useReplays } from "@/hooks/useReplays";
import { Button, Card, CardHeader, EmptyState, ErrorMessage } from "@/ui";
import { Filters } from "./filters";
import {
    type FilterState,
    NO_FILTERS,
    isFiltered,
    saved,
    toReplayFilters,
} from "./filters/state";
import { List } from "./list";

import styles from "./styles.module.css";

let savedSort = DEFAULT_REPLAY_SORT;

export function Replays() {
    const t = useTranslations("replays");
    const scroller = useRef<HTMLDivElement>(null);
    const [filters, setFilters] = useState(saved.filters);
    const [sort, setSort] = useState(savedSort);
    const query = useMemo(() => toReplayFilters(filters), [filters]);
    const {
        data,
        error,
        isFetching,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        refetch,
        isPlaceholderData,
    } = useReplays(query, sort);
    const ingesting = useIngesting();

    const replays = useMemo(
        () => data?.pages.flatMap((page) => page.replays) ?? [],
        [data],
    );
    const total = data?.pages[0]?.total ?? 0;

    useLayoutEffect(() => {
        if (scroller.current) scroller.current.scrollTop = saved.offset;
    }, []);

    const onRefresh = () => refetch();

    const onScroll = (e: UIEvent<HTMLDivElement>) => {
        saved.offset = e.currentTarget.scrollTop;
    };

    const scrollToTop = () => {
        saved.offset = 0;
        if (scroller.current) scroller.current.scrollTop = 0;
    };

    const onFiltersChange = (next: FilterState) => {
        saved.filters = next;
        scrollToTop();
        setFilters(next);
    };

    const onSortChange = (next: ReplaySort) => {
        savedSort = next;
        scrollToTop();
        setSort(next);
    };

    const onClearFilters = () => onFiltersChange(NO_FILTERS);

    const noMatches =
        !!data && !isPlaceholderData && total === 0 && isFiltered(filters);

    return (
        <Page fill>
            <Card className={styles.card}>
                <CardHeader
                    icon={Clapperboard}
                    title={t("title")}
                    subtitle={t("count", { count: total })}
                    action={
                        <Button
                            variant="secondary"
                            onClick={onRefresh}
                            disabled={
                                ingesting || (isFetching && !isFetchingNextPage)
                            }
                        >
                            {t("refresh")}
                        </Button>
                    }
                    divided
                />
                <Filters value={filters} onChange={onFiltersChange} />
                {error && (
                    <ErrorMessage error={error} className={styles.error} />
                )}
                <ReplayListHeader
                    wide
                    sort={sort}
                    onSortChange={onSortChange}
                />
                <List
                    ref={scroller}
                    replays={replays}
                    total={total}
                    stale={isPlaceholderData}
                    initialOffset={saved.offset}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    fetchNextPage={fetchNextPage}
                    onScroll={onScroll}
                >
                    {noMatches && (
                        <EmptyState
                            action={
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={onClearFilters}
                                >
                                    {t("filters.clear")}
                                </Button>
                            }
                        >
                            {t("filters.empty")}
                        </EmptyState>
                    )}
                </List>
            </Card>
        </Page>
    );
}
