import { useVirtualizer } from "@tanstack/react-virtual";
import {
    type UIEvent,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
} from "react";
import { useTranslations } from "use-intl";

import { Page, ReplayListHeader, ReplayRow } from "@/components";
import { useReplays } from "@/hooks/useReplays";
import { Button, Card, CardBody, CardHeader, ErrorMessage } from "@/ui";

import styles from "./styles.module.css";

const ROW_HEIGHT = 64;
const LOAD_AHEAD = 15;

let savedOffset = 0;

export function Replays() {
    const t = useTranslations("replays");
    const scroller = useRef<HTMLDivElement>(null);
    const {
        data,
        error,
        isFetching,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        refetch,
        dataUpdatedAt,
    } = useReplays();

    const replays = useMemo(
        () => data?.pages.flatMap((page) => page.replays) ?? [],
        [data],
    );
    const total = data?.pages[0]?.total ?? 0;
    const now = useMemo(() => new Date(dataUpdatedAt), [dataUpdatedAt]);

    const virtualizer = useVirtualizer({
        count: total,
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

    return (
        <Page fill>
            <Card className={styles.card}>
                <CardHeader
                    title={t("title")}
                    subtitle={t("count", { count: total })}
                    action={
                        <Button
                            variant="secondary"
                            onClick={onRefresh}
                            disabled={isFetching && !isFetchingNextPage}
                        >
                            {t("refresh")}
                        </Button>
                    }
                    divided
                />
                {error && (
                    <ErrorMessage error={error} className={styles.error} />
                )}
                <ReplayListHeader wide />
                <CardBody ref={scroller} onScroll={onScroll}>
                    <div
                        ref={virtualizer.containerRef}
                        className={styles.track}
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
