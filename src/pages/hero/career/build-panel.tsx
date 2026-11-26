import { Check, Copy, Shuffle } from "lucide-react";
import {
    type CSSProperties,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { RandomBuild } from "@/api/heroes";
import { TalentBuild } from "@/components";
import { type Tween, tween } from "@/hooks/useAppear";
import { useCardFlip } from "@/hooks/useCardFlip";
import { useCopyText } from "@/hooks/useCopyText";
import { Button, ButtonLink, Typography } from "@/ui";
import { EASE_SETTLE_CURVE } from "@/utils/motion";
import { buildCode } from "@/utils/talents";

import styles from "./styles.module.css";

const FADE_MS = 150;

export interface BuildPanelProps {
    hero: string;
    accent: string | null;
    build: RandomBuild;
    /** When the build was drawn, null while a reroll is pending. */
    drawn: number | null;
    /** The draw already dealt face up, shown at once when the panel opens again. */
    revealed: number | null;
    onRevealed: (drawn: number) => void;
    onReroll: () => void;
}

export function BuildPanel({
    hero,
    accent,
    build,
    drawn,
    revealed,
    onRevealed,
    onReroll,
}: BuildPanelProps) {
    const t = useTranslations("hero.randomBuild");
    const format = useFormatter();
    const [copied, copy] = useCopyText();
    const talents = useRef<HTMLDivElement>(null);
    const fade = useRef<Tween>(undefined);
    // The build on show, which a new draw replaces only once the cards are face down.
    const [held, setHeld] = useState(build);
    const shown = useRef(held);

    const onSwap = () => setHeld(build);

    const { faceUp, busy, reduced } = useCardFlip(
        drawn,
        revealed,
        onRevealed,
        onSwap,
        talents,
    );

    const code = buildCode(hero, held.talents);
    const accentStyle = accent
        ? ({ "--accent": accent } as CSSProperties)
        : undefined;

    useEffect(() => () => fade.current?.cancel(), []);

    useLayoutEffect(() => {
        if (held === shown.current) return;

        shown.current = held;

        // Without motion the cards don't flip, so the new ones fade in instead.
        const el = talents.current;
        if (!reduced || !el) return;

        // Before the new tween sets its first frame, which the old one's reset would undo.
        fade.current?.cancel();
        fade.current = tween(
            el,
            ["opacity"],
            FADE_MS,
            0,
            EASE_SETTLE_CURVE,
            (progress) => {
                el.style.opacity = String(progress);
            },
        );
        fade.current.play();
    }, [held, reduced]);

    const onCopy = () => {
        if (code !== null) copy(code);
    };

    return (
        <>
            <div className={styles.buildSource}>
                <Typography as="p" weight="semibold">
                    {t("wonBy", { player: held.playerName })}
                </Typography>
                <Typography as="p" size="sm" variant="tertiary">
                    {t("meta", {
                        map: held.map,
                        date: format.dateTime(new Date(held.timestamp), {
                            dateStyle: "medium",
                        }),
                    })}
                </Typography>
            </div>
            <div
                ref={talents}
                className={styles.buildTalents}
                style={accentStyle}
            >
                <TalentBuild talents={held.talents} faceUp={faceUp} />
            </div>
            <div className={styles.buildActions}>
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={onReroll}
                >
                    <Shuffle />
                    {t("reroll")}
                </Button>
                <ButtonLink
                    href={`/replays/${held.replayId}`}
                    variant="secondary"
                    size="sm"
                    arrow={false}
                >
                    {t("openReplay")}
                </ButtonLink>
                {code !== null && (
                    <Button
                        size="sm"
                        className={styles.buildCopy}
                        onClick={onCopy}
                    >
                        {copied ? <Check /> : <Copy />}
                        <span className={styles.copyLabels}>
                            <span aria-hidden={copied} data-shown={!copied}>
                                {t("copy")}
                            </span>
                            <span aria-hidden={!copied} data-shown={copied}>
                                {t("copied")}
                            </span>
                        </span>
                    </Button>
                )}
            </div>
        </>
    );
}
