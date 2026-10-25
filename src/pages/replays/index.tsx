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

export function Replays() {
    const t = useTranslations("replays");
    const scroller = useRef<HTMLDivElement>(null);
    const [filters, setFilters] = useState(savedFilters);
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
    } = useReplays(query);
    const importing = useIngestProgress() !== null;

    const replays = useMemo(
        () => data?.pages.flatMap((page) => page.replays) ?? [],
        [data],
    );
    const total = data?.pages[0]?.total ?? 0;
    const now = useMemo(() => new Date(dataUpdatedAt), [dataUpdatedAt]);

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

    const onFiltersChange = (next: FilterState) => {
        savedFilters = next;
        savedOffset = 0;
        if (scroller.current) scroller.current.scrollTop = 0;
        setFilters(next);
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
                <ReplayListHeader wide />
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
