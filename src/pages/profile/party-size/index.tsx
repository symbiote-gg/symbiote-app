import classNames from "classnames";
import { Circle, UserRoundGroup } from "lucide-react";
import { useTranslations } from "use-intl";

import type { PartySize as Party, ScoreScope } from "@/api/stats";
import { usePartySizes } from "@/hooks/usePartySizes";
import {
    Card,
    CardHeader,
    Eyebrow,
    Meter,
    Skeleton,
    Typography,
    WinRate,
} from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

const MAX_PARTY = 5;

export interface PartySizeProps {
    scope: ScoreScope;
}

export function PartySize({ scope }: PartySizeProps) {
    const t = useTranslations("profile.partySize");
    const { data: parties, error } = usePartySizes(scope);

    const header = (
        <CardHeader
            size="sm"
            icon={UserRoundGroup}
            title={t("title")}
            subtitle={t("subtitle")}
        />
    );

    if (error) return null;

    if (!parties) {
        return (
            <Card>
                {header}
                <ul className={styles.tiles}>
                    {Array.from({ length: MAX_PARTY }, (_, i) => (
                        <li key={i} className={styles.tile}>
                            <Eyebrow>
                                <Skeleton className={styles.labelBar} />
                            </Eyebrow>
                            <Typography display className={styles.rate}>
                                <Skeleton className={styles.rateBar} />
                            </Typography>
                            <Meter value={0} neutral className={styles.meter} />
                        </li>
                    ))}
                </ul>
            </Card>
        );
    }

    if (parties.every((party) => party.games === 0)) return null;

    return (
        <Card>
            {header}
            <ul className={styles.tiles}>
                {parties.map((party) => (
                    <PartyTile key={party.size} party={party} />
                ))}
            </ul>
        </Card>
    );
}

interface PartyTileProps {
    party: Party;
}

function PartyTile({ party }: PartyTileProps) {
    const t = useTranslations("profile.partySize");

    const rate = winRate(party.wins, party.losses);
    const judged = isJudged(party.wins, party.losses);
    const few = !judged && styles.few;

    return (
        <li className={styles.tile}>
            <div className={styles.head}>
                <Eyebrow truncate>{t(`sizes.${party.size}`)}</Eyebrow>
                <span className={styles.dots} aria-hidden>
                    {Array.from({ length: party.size }, (_, i) => (
                        <Circle key={i} />
                    ))}
                </span>
            </div>
            <div className={classNames(styles.figures, few)}>
                <Typography as="span" display className={styles.rate}>
                    <WinRate rate={rate} judged={judged} />
                </Typography>
                <Typography as="span" size="sm" variant="secondary" noWrap>
                    {t("games", { count: party.games })}
                </Typography>
            </div>
            <Meter
                value={rate ?? 0}
                neutral={!judged}
                className={classNames(styles.meter, few)}
            />
        </li>
    );
}
