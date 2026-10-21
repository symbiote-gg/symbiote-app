import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { TimelineText } from "@/hooks/useTimelineText";
import { Typography } from "@/ui";
import { entryGlyph } from "@/utils/timeline/glyphs";
import type { Entry } from "@/utils/timeline/types";
import { GlyphIcon } from "../../../glyphs";
import { sideClasses } from "../../../side";

import styles from "./styles.module.css";

interface EventsProps {
    entries: Entry[];
    time: number;
    text: TimelineText;
}

export function Events({ entries, time, text }: EventsProps) {
    const t = useTranslations("replay.timeline");

    return (
        <div className={styles.events}>
            {[...entries]
                .sort((a, b) => a.time - b.time)
                .map((entry, index) => (
                    <div
                        key={index}
                        className={classNames(
                            styles.row,
                            sideClasses(entry.side),
                        )}
                    >
                        <span className={styles.offset}>
                            {t("offset", {
                                seconds: Math.round(entry.time - time),
                            })}
                        </span>
                        <span className={styles.tile}>
                            <GlyphIcon
                                glyph={entryGlyph(entry)}
                                className={styles.icon}
                            />
                        </span>
                        <Typography size="xs" weight="semibold">
                            {text.entryText(entry)}
                        </Typography>
                    </div>
                ))}
        </div>
    );
}
