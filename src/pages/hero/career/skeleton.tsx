import {
    Castle,
    CircleDot,
    Handshake,
    HeartPlus,
    Shield,
    Star,
    Swords,
    Target,
    Tent,
    Tombstone,
} from "lucide-react";
import { useTranslations } from "use-intl";

import type { ScoreScope } from "@/api/stats";
import { BackLink, TimePanelSkeleton } from "@/components";
import { ScopeSelect } from "@/pages/profile/scope-select";
import { Skeleton, StatTile, Typography } from "@/ui";

import styles from "./styles.module.css";

const TILES = [
    { key: "kills", icon: Swords },
    { key: "assists", icon: Handshake },
    { key: "deaths", icon: Tombstone },
    { key: "heroDamage", icon: Target },
    { key: "siegeDamage", icon: Castle },
    { key: "healing", icon: HeartPlus },
    { key: "damageTaken", icon: Shield },
    { key: "xp", icon: Star },
    { key: "globes", icon: CircleDot },
    { key: "camps", icon: Tent },
] as const;

export interface CareerSkeletonProps {
    scope: ScoreScope;
    onScopeChange: (scope: ScoreScope) => void;
}

export function CareerSkeleton({ scope, onScopeChange }: CareerSkeletonProps) {
    const t = useTranslations("hero");
    const career = useTranslations("career");

    return (
        <header className={styles.root}>
            <div className={styles.top}>
                <BackLink
                    href="/heroes"
                    label={t("back")}
                    className={styles.tool}
                />
                <ScopeSelect scope={scope} onChange={onScopeChange} />
            </div>
            <div className={styles.identity}>
                <div className={styles.hero}>
                    <Skeleton className={styles.portraitBar} />
                    <div className={styles.titles}>
                        <Skeleton className={styles.roleBar} />
                        <Typography size="xl2" display className={styles.name}>
                            <Skeleton className={styles.nameBar} />
                        </Typography>
                    </div>
                </div>
                <div className={styles.result}>
                    <Typography as="p" display className={styles.rate}>
                        <Skeleton className={styles.rateBar} />
                    </Typography>
                    <Typography as="p" mono className={styles.record}>
                        <Skeleton className={styles.recordBar} />
                    </Typography>
                </div>
                <ScoreSkeleton />
            </div>
            <div className={styles.body}>
                <TimePanelSkeleton />
                <div className={styles.tiles}>
                    {TILES.map(({ key, icon }) => (
                        <StatTile
                            key={key}
                            variant="panel"
                            icon={icon}
                            label={career(key)}
                            value={<Skeleton />}
                            detail={<Skeleton className={styles.detailBar} />}
                        />
                    ))}
                </div>
            </div>
        </header>
    );
}

export function ScoreSkeleton() {
    return (
        <div className={styles.score}>
            <Typography as="p" display className={styles.value}>
                <Skeleton className={styles.scoreBar} />
            </Typography>
            <div className={styles.meta}>
                <Skeleton className={styles.chipBar} />
                <Skeleton className={styles.poolBar} />
            </div>
        </div>
    );
}
