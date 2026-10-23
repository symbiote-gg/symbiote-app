import { Typography } from "../typography";

import styles from "./styles.module.css";

export function EmptyState({ children }: { children: string }) {
    return (
        <Typography variant="tertiary" className={styles.root}>
            {children}
        </Typography>
    );
}
