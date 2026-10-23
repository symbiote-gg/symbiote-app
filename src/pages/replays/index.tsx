import { useVirtualizer } from "@tanstack/react-virtual";
import { type UIEvent, useEffect, useLayoutEffect, useRef } from "react";
import { useTranslations } from "use-intl";

import { Page, ReplayListHeader, ReplayRow } from "@/components";
import { useReplays } from "@/hooks/useReplays";
import { Button, Card, CardBody, CardHeader } from "@/ui";

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

    const replays = data?.pages.flatMap((page) => page.replays) ?? [];
    const total = data?.pages[0]?.total ?? 0;
    const now = new Date(dataUpdatedAt);

    const virtualizer = useVirtualizer({
        count: total,
        getScrollElement: () => scroller.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 8,
        initialOffset: () => savedOffset,
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
                {error && <p className={styles.error}>{String(error)}</p>}
                <ReplayListHeader wide />
                <CardBody ref={scroller} onScroll={onScroll}>
                    <div
                        className={styles.track}
                        style={{ height: virtualizer.getTotalSize() }}
                    >
                        {items.map((item) => {
                            const replay = replays[item.index];
                            return (
                                <div
                                    key={item.key}
                                    className={styles.slot}
                                    style={{
                                        height: item.size,
                                        transform: `translateY(${item.start}px)`,
                                    }}
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
