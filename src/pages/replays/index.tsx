import { useVirtualizer } from "@tanstack/react-virtual";
import classNames from "classnames";
import { Clapperboard } from "lucide-react";
import {
    type UIEvent,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslations } from "use-intl";

import { DEFAULT_REPLAY_SORT, type ReplaySort } from "@/api/replays";
import { Page, ReplayListHeader, ReplayRow } from "@/components";
import { useIngestProgress } from "@/hooks/useIngestProgress";
import { useReplays } from "@/hooks/useReplays";
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
    toReplayFilters,
} from "./filters/state";

import styles from "./styles.module.css";

const ROW_HEIGHT = 64;
const LOAD_AHEAD = 15;

let savedOffset = 0;
let savedFilters = NO_FILTERS;
let savedSort = DEFAULT_REPLAY_SORT;

export function Replays() {
    const t = useTranslations("replays");
    const scroller = useRef<HTMLDivElement>(null);
    const [filters, setFilters] = useState(savedFilters);
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
        dataUpdatedAt,
        isPlaceholderData,
    } = useReplays(query, sort);
    const importing = useIngestProgress() !== null;

    const replays = useMemo(
        () => data?.pages.flatMap((page) => page.replays) ?? [],
        [data],
    );
    const total = data?.pages[0]?.total ?? 0;
    // Zero while the previous list stands in for one that hasn't loaded yet.
    const now = useMemo(
        () => new Date(dataUpdatedAt || Date.now()),
        [dataUpdatedAt],
    );

    const virtualizer = useVirtualizer({
        count: hasNextPage ? total : replays.length,
        getScrollElement: () => scroller.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 4,
        initialOffset: () => savedOffset,
        useFlushSync: false,
        directDomUpdates: true,
    });
    const items = virtualizer.getVirtualItems();
    const lastIndex = items[items.length - 1]?.index ?? 0;

    useLayoutEffect(() => {
        if (scroller.current) scroller.current.scrollTop = savedOffset;
    }, []);

    useEffect(() => {
        if (
            lastIndex >= replays.length - LOAD_AHEAD &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            fetchNextPage();
        }
    }, [lastIndex, replays.length, hasNextPage, isFetchingNextPage]);

    const onRefresh = () => refetch();

    const onScroll = (e: UIEvent<HTMLDivElement>) => {
        savedOffset = e.currentTarget.scrollTop;
    };

    const scrollToTop = () => {
        savedOffset = 0;
        if (scroller.current) scroller.current.scrollTop = 0;
    };

    const onFiltersChange = (next: FilterState) => {
        savedFilters = next;
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
                                importing || (isFetching && !isFetchingNextPage)
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
                <CardBody ref={scroller} onScroll={onScroll}>
                    {noMatches && (
                        <div className={styles.empty}>
                            <EmptyState>{t("filters.empty")}</EmptyState>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onClearFilters}
                            >
                                {t("filters.clear")}
                            </Button>
                        </div>
                    )}
                    <div
                        ref={virtualizer.containerRef}
                        className={classNames(styles.track, {
                            [styles.stale]: isPlaceholderData,
                        })}
                    >
                        {items.map((item) => {
                            const replay = replays[item.index];
                            return (
                                <div
                                    key={item.key}
                                    ref={virtualizer.measureElement}
                                    data-index={item.index}
                                    className={styles.slot}
                                    style={{ height: item.size }}
                                >
                                    {replay ? (
                                        <ReplayRow
                                            replay={replay}
                                            now={now}
                                            wide
                                        />
                                    ) : (
                                        <div
                                            className={styles.skeleton}
                                            aria-hidden
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardBody>
            </Card>
        </Page>
    );
}
