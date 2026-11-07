import classNames from "classnames";
import { CircleQuestionMark, Gem, Gift } from "lucide-react";

import { Typography } from "@/ui";
import type { GameTextStep } from "@/utils/game-text";
import { GameText } from "../../../game-text";
import { Tiers } from "./tiers";

import styles from "./styles.module.css";

const ICONS = {
    quest: CircleQuestionMark,
    reward: Gift,
    mythic: Gem,
};

export interface StepProps {
    step: GameTextStep;
}

export function Step({ step }: StepProps) {
    const Icon = ICONS[step.kind];

    return (
        <section className={classNames(styles.root, styles[step.kind])}>
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
            {step.kind !== "quest" && step.items.length > 1 ? (
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
