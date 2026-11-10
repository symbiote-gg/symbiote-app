import classNames from "classnames";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { EASE_SETTLE_CURVE, ENTER_MS } from "@/utils/motion";

import styles from "./styles.module.css";

const settle = { duration: ENTER_MS / 1000, ease: EASE_SETTLE_CURVE };
const instant = { duration: 0 };

export interface CollapseProps {
    open: boolean;
    lazy?: boolean;
    className?: string;
    children: ReactNode;
}

export function Collapse({ open, lazy, className, children }: CollapseProps) {
    const transition = useReducedMotion() ? instant : settle;
    const rootClass = classNames(styles.root, className);

    if (lazy) {
        return (
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        className={rootClass}
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={transition}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    return (
        <motion.div
            className={rootClass}
            initial={false}
            animate={{ height: open ? "auto" : 0 }}
            transition={transition}
            inert={!open}
        >
            {children}
        </motion.div>
    );
}
