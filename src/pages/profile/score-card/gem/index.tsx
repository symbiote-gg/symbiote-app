import classNames from "classnames";
import { type SVGProps, useId } from "react";

import { Sheen } from "../sheen";
import { sheenFill } from "../sheen/fill";

import styles from "./styles.module.css";

// A hexagon, point up, as the ring's gem, and the same at about half size as
// its facet.
export const GEM = "8,1 14.06,4.5 14.06,11.5 8,15 1.94,11.5 1.94,4.5";
export const FACET = "8,4.15 11.33,6.08 11.33,9.93 8,11.85 4.67,9.93 4.67,6.08";

/** The gem as an icon, shaded in `--rank`, or the current colour without one. */
export function GemIcon({
    className,
    style,
    ...rest
}: SVGProps<SVGSVGElement>) {
    const id = useId();

    return (
        <svg
            viewBox="0 0 16 16"
            className={classNames(styles.root, className)}
            style={{ ...sheenFill(id), ...style }}
            {...rest}
        >
            <defs>
                <Sheen id={id} />
            </defs>
            <polygon points={GEM} />
            <polygon points={FACET} className={styles.facet} />
        </svg>
    );
}
