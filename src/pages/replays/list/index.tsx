import { useVirtualizer } from "@tanstack/react-virtual";
import classNames from "classnames";
import { type ReactNode, type RefObject, type UIEvent, useEffect } from "react";

import type { Replay } from "@/api/replays";
import { ReplayRow } from "@/components";
import { CardBody } from "@/ui";

import styles from "./styles.module.css";

const ROW_HEIGHT = 64;
const LOAD_AHEAD = 15;

export interface ListProps {
    ref: RefObject<HTMLDivElement | null>;
    replays: Replay[];
    total: number;
    now: Date;
    stale: boolean;
    initialOffset: number;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    onScroll: (e: UIEvent<HTMLDivElement>) => void;
    children?: ReactNode;
}

export function List({
    ref,
    replays,
    total,
    now,
    stale,
    initialOffset,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    onScroll,
    children,
}: ListProps) {
    const virtualizer = useVirtualizer({
        count: hasNextPage ? total : replays.length,
        getScrollElement: () => ref.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 4,
        initialOffset: () => initialOffset,
        useFlushSync: false,
        directDomUpdates: true,
    });
    const items = virtualizer.getVirtualItems();
    const lastIndex = items[items.length - 1]?.index ?? 0;

    useEffect(() => {
        if (
            lastIndex >= replays.length - LOAD_AHEAD &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            fetchNextPage();
        }
    }, [lastIndex, replays.length, hasNextPage, isFetchingNextPage]);

    return (
        <CardBody ref={ref} onScroll={onScroll}>
            {children}
            <div
                ref={virtualizer.containerRef}
                className={classNames(styles.track, {
                    [styles.stale]: stale,
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
                                <ReplayRow replay={replay} now={now} wide />
                            ) : (
                                <div className={styles.skeleton} aria-hidden />
                            )}
                        </div>
                    );
                })}
            </div>
        </CardBody>
    );
}
