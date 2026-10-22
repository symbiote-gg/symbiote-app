import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "use-intl";

import { useIngestProgress } from "@/hooks/useIngestProgress";
import { Popover } from "@/ui";

import styles from "./styles.module.css";

const RADIUS = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CLOSE_DELAY = 150;

function Ring({ ratio }: { ratio: number }) {
    return (
        <svg viewBox="0 0 18 18" className={styles.ring} aria-hidden>
            <circle cx="9" cy="9" r={RADIUS} className={styles.ringTrack} />
            <circle
                cx="9"
                cy="9"
                r={RADIUS}
                className={styles.ringArc}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
            />
        </svg>
    );
}

const strong = (chunks: ReactNode) => (
    <span className={styles.done}>{chunks}</span>
);

export function IngestProgress() {
    const t = useTranslations("ingest");
    const phase = useIngestProgress();
    const panelId = useId();
    const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const closeTimer = useRef<number>(undefined);

    const shown = open && !!phase;

    useEffect(() => () => window.clearTimeout(closeTimer.current), []);

    if (!phase) return null;

    const { kind, done, total } = phase;
    const label = t(kind);
    const ratio = done / total;

    const onEnter = () => {
        window.clearTimeout(closeTimer.current);
        setOpen(true);
    };
    const onLeave = () => {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(
            () => setOpen(false),
            CLOSE_DELAY,
        );
    };

    return (
        <>
            <button
                ref={setAnchor}
                type="button"
                aria-expanded={shown}
                aria-controls={shown ? panelId : undefined}
                className={styles.pill}
                onPointerEnter={onEnter}
                onPointerLeave={onLeave}
                onFocus={onEnter}
                onBlur={onLeave}
            >
                <Ring ratio={ratio} />
                <span>{label}</span>
                <span className={styles.percent}>
                    {Math.floor(ratio * 100)}%
                </span>
            </button>
            {shown && (
                <Popover
                    anchor={anchor}
                    placement="bottom-start"
                    id={panelId}
                    role="dialog"
                    aria-label={label}
                    className={styles.panel}
                    onPointerEnter={onEnter}
                    onPointerLeave={onLeave}
                >
                    <span className={styles.title}>{label}</span>
                    <p className={styles.description}>
                        {t(`${kind}Description`)}
                    </p>
                    <span
                        role="progressbar"
                        aria-label={label}
                        aria-valuemin={0}
                        aria-valuemax={total}
                        aria-valuenow={done}
                        className={styles.track}
                    >
                        <span
                            className={styles.fill}
                            style={{ width: `${ratio * 100}%` }}
                        />
                    </span>
                    <span className={styles.count}>
                        {t.rich("count", { done, total, b: strong })}
                    </span>
                </Popover>
            )}
        </>
    );
}
