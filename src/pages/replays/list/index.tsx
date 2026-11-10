import { useVirtualizer } from "@tanstack/react-virtual";
import classNames from "classnames";
import {
    type ReactNode,
    type RefObject,
    type UIEvent,
    useEffect,
    useRef,
} from "react";

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
    stale: boolean;
    appear: boolean;
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
    stale,
    appear,
    initialOffset,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    onScroll,
    children,
}: ListProps) {
    const known = useRef<Set<number> | null>(null);

    const virtualizer = useVirtualizer({
        count: hasNextPage ? total : replays.length,
        getItemKey: (index) => replays[index]?.id ?? `skeleton-${index}`,
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

    useEffect(() => {
        known.current = new Set(replays.map((replay) => replay.id));
    }, [replays]);

    // Rows remount as they scroll into view, so only a replay missing from the list's
    // last data animates, and only above where it ended, since pages append below.
    const arrived = (id: number, index: number) =>
        appear &&
        !!known.current &&
        index < known.current.size &&
        !known.current.has(id);

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
                                <ReplayRow
                                    replay={replay}
                                    wide
                                    appear={arrived(replay.id, item.index)}
                                />
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
