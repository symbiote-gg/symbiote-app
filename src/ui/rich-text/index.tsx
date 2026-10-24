import type { ReactNode } from "react";

import styles from "./styles.module.css";

export const richStrong = (chunks: ReactNode) => <strong>{chunks}</strong>;

export const richCode = (chunks: ReactNode) => (
    <code className={styles.code}>{chunks}</code>
);

export const richMono = (chunks: ReactNode) => (
    <strong className={styles.mono}>{chunks}</strong>
);
