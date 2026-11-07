import type { GameTextStep } from "@/utils/game-text";
import { Step } from "./step";

import styles from "./styles.module.css";

export interface StepsProps {
    steps: GameTextStep[];
}

export function Steps({ steps }: StepsProps) {
    return (
        <div className={styles.root}>
            {steps.map((step, index) => (
                <Step key={index} step={step} />
            ))}
        </div>
    );
}
