import classNames from "classnames";
import type { ReactNode } from "react";

import type { Glyph } from "@/utils/timeline/map-events";
import type { Side } from "@/utils/timeline/types";
import { GlyphIcon } from "../../../glyphs";
import { sideClasses } from "../../../side";
import { Gauge, GaugeBadge, GaugeValue } from "../gauge";

import styles from "./styles.module.css";

interface TeamBarProps {
    glyph: Glyph;
    side: Side;
    trail: boolean;
    percent?: number;
    value: ReactNode;
}

export function TeamBar({ glyph, side, trail, percent, value }: TeamBarProps) {
    return (
        <div className={classNames(styles.row, sideClasses(side))}>
            <GaugeBadge>
                <GlyphIcon glyph={glyph} />
            </GaugeBadge>
            <Gauge percent={percent} faded={trail} />
            <GaugeValue>{value}</GaugeValue>
        </div>
    );
}
