import { Typography } from "@/ui";
import type { GameTextNode } from "@/utils/game-text";
import { GameText } from "../../../game-text";

import styles from "./styles.module.css";

export interface TiersProps {
    items: GameTextNode[][];
}

export function Tiers({ items }: TiersProps) {
    return (
        <ol className={styles.root}>
            {items.map((item, index) => (
                <li key={index} className={styles.tier}>
                    <Typography size="sm" variant="secondary">
                        <GameText nodes={item} />
                    </Typography>
                </li>
            ))}
        </ol>
    );
}
