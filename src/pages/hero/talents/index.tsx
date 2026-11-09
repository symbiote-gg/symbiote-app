import { GitFork } from "lucide-react";
import type { CSSProperties } from "react";
import { useTranslations } from "use-intl";

import type { TalentRecord } from "@/api/heroes";
import { Card, CardHeader } from "@/ui";
import { MIN_JUDGED_GAMES } from "@/utils/hero-stats";
import { TierColumn } from "./tier";
import { buildTiers } from "./tiers";

import styles from "./styles.module.css";

export interface TalentsProps {
    talents: TalentRecord[];
}

export function Talents({ talents }: TalentsProps) {
    const t = useTranslations("hero.talents");

    const tiers = buildTiers(talents);
    const track = { "--tiers": tiers.length } as CSSProperties;

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={GitFork}
                title={t("title")}
                subtitle={t("subtitle", { games: MIN_JUDGED_GAMES })}
            />
            <div className={styles.body}>
                <ol className={styles.track} style={track}>
                    {tiers.map((tier) => (
                        <TierColumn key={tier.level} tier={tier} />
                    ))}
                </ol>
            </div>
        </Card>
    );
}
