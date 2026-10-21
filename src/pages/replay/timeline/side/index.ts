import type { Side } from "@/utils/timeline/types";

import styles from "./styles.module.css";

export function sideClasses(side: Side) {
    return {
        [styles.ally]: side === "ally",
        [styles.enemy]: side === "enemy",
    };
}

/** Like `sideClasses`, but null gets the neutral colour instead of inheriting one. */
export const sideClass = (side: Side) => (side ? styles[side] : styles.neutral);
