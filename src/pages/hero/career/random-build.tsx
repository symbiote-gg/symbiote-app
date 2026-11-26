import { useQuery } from "@tanstack/react-query";
import { Dice5 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslations } from "use-intl";

import type { BuildKey } from "@/api/heroes";
import { randomBuildQuery } from "@/api/queries";
import { Button, Dropdown } from "@/ui";
import { BuildPanel } from "./build-panel";

import styles from "./styles.module.css";

// Rolls count up across mounts, so coming back to a hero draws again instead of
// reading the last build from the cache.
let rolls = 0;
const nextRoll = () => ++rolls;

const lastShown = new Map<number, BuildKey>();

export interface RandomBuildProps {
    heroId: number;
    hero: string;
    accent: string | null;
    className?: string;
}

export function RandomBuild({
    heroId,
    hero,
    accent,
    className,
}: RandomBuildProps) {
    const t = useTranslations("hero.randomBuild");
    const id = useId();
    const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const [roll, setRoll] = useState(nextRoll);
    const [revealed, setRevealed] = useState<number | null>(null);
    const [exclude, setExclude] = useState(() => lastShown.get(heroId) ?? null);
    const {
        data: build,
        isPlaceholderData,
        dataUpdatedAt,
    } = useQuery(randomBuildQuery(heroId, roll, exclude));

    useEffect(() => {
        if (build) {
            lastShown.set(heroId, {
                gameId: build.gameId,
                playerId: build.playerId,
            });
        }
    }, [heroId, build]);

    if (!build) return null;

    const onToggleOpen = () => setOpen((value) => !value);

    const onClose = () => setOpen(false);

    const onReroll = () => {
        setExclude({ gameId: build.gameId, playerId: build.playerId });
        setRoll(nextRoll());
    };

    return (
        <>
            <Button
                ref={setAnchor}
                variant="secondary"
                size="sm"
                aria-expanded={open}
                aria-controls={id}
                className={className}
                onClick={onToggleOpen}
            >
                <Dice5 />
                {t("trigger")}
            </Button>
            <Dropdown
                open={open}
                anchor={anchor}
                id={id}
                aria-label={t("label")}
                className={styles.buildPanel}
                onClose={onClose}
            >
                <BuildPanel
                    hero={hero}
                    accent={accent}
                    build={build}
                    drawn={isPlaceholderData ? null : dataUpdatedAt}
                    revealed={revealed}
                    onRevealed={setRevealed}
                    onReroll={onReroll}
                />
            </Dropdown>
        </>
    );
}
