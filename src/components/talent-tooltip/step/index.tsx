import classNames from "classnames";
import { CircleQuestionMark, Gift } from "lucide-react";

import { Typography } from "@/ui";
import type { GameTextStep } from "@/utils/game-text";
import { GameText } from "../../game-text";
import { Tiers } from "./tiers";

import styles from "./styles.module.css";

export interface StepProps {
    step: GameTextStep;
}

export function Step({ step }: StepProps) {
    const reward = step.kind === "reward";
    const Icon = reward ? Gift : CircleQuestionMark;

    return (
        <section
            className={classNames(
                styles.root,
                reward ? styles.reward : styles.quest,
            )}
        >
            <div className={styles.label}>
                <Icon className={styles.icon} />
                <Typography
                    size="xs"
                    weight="semibold"
                    uppercase
                    noWrap
                    className={styles.labelText}
                >
                    {step.label}
                </Typography>
            </div>
            {reward && step.items.length > 1 ? (
                <Tiers items={step.items} />
            ) : (
                step.items.map((item, index) => (
                    <Typography key={index} size="sm" variant="secondary">
                        <GameText nodes={item} />
                    </Typography>
                ))
            )}
            {step.notes.map((note, index) => (
                <Typography key={index} size="xs" variant="tertiary">
                    <GameText nodes={note} />
                </Typography>
            ))}
        </section>
    );
}
