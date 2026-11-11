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

import { BackLink } from "@/components";
import { Skeleton, StatTile, Typography } from "@/ui";
import { TimePanelSkeleton } from "./time-panel/skeleton";

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

export function CareerSkeleton() {
    const t = useTranslations("hero");

    return (
        <header className={styles.root}>
            <div className={styles.top}>
                <BackLink
                    href="/heroes"
                    label={t("back")}
                    className={styles.tool}
                />
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
            </div>
            <div className={styles.body}>
                <TimePanelSkeleton />
                <div className={styles.tiles}>
                    {TILES.map(({ key, icon }) => (
                        <StatTile
                            key={key}
                            variant="panel"
                            icon={icon}
                            label={t(`career.${key}`)}
                            value={<Skeleton />}
                            detail={<Skeleton className={styles.detailBar} />}
                        />
                    ))}
                </div>
            </div>
        </header>
    );
}
