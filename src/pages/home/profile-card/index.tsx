import { useTranslations } from "use-intl";

import type { ProfileSummary } from "@/api/stats";
import { WinStrip } from "@/components";
import {
    ButtonLink,
    Card,
    CardHeader,
    EmptyState,
    StatTile,
    Typography,
} from "@/ui";

import styles from "./styles.module.css";

const RECENT_GAMES = 20;

export interface ProfileCardProps {
    profile: ProfileSummary;
}

export function ProfileCard({ profile }: ProfileCardProps) {
    const t = useTranslations("home.profile");
    const roles = useTranslations("roles");
    const recent = [...profile.recent].reverse();
    const recentWins = recent.filter((win) => win === true).length;
    const recentLosses = recent.filter((win) => win === false).length;
    const decided = profile.wins + profile.losses;

    return (
        <Card className={styles.root}>
            <CardHeader
                title={t("title")}
                subtitle={t("subtitle")}
                action={
                    <ButtonLink href="/profile" variant="secondary">
                        {t("cta")}
                    </ButtonLink>
                }
            />
            {profile.games === 0 ? (
                <EmptyState>{t("empty")}</EmptyState>
            ) : (
                <div className={styles.body}>
                    <div className={styles.recent}>
                        <div className={styles.recentLabels}>
                            <Typography
                                size="xs"
                                variant="tertiary"
                                className={styles.eyebrow}
                            >
                                {t("last", { count: recent.length })}
                            </Typography>
                            <Typography size="xs" variant="tertiary" mono>
                                {recentWins}-{recentLosses}
                            </Typography>
                        </div>
                        <WinStrip results={recent} slots={RECENT_GAMES} />
                    </div>
                    <div className={styles.stats}>
                        <StatTile
                            label={t("winRate")}
                            value={
                                decided === 0
                                    ? "-"
                                    : `${Math.round((profile.wins / decided) * 100)}%`
                            }
                        />
                        <StatTile
                            label={t("mainRole")}
                            value={
                                profile.mainRole ? roles(profile.mainRole) : "-"
                            }
                        />
                        <StatTile
                            label={t("mvps")}
                            value={profile.mvps}
                            accent="mvp"
                        />
                    </div>
                    <Typography size="sm">
                        {t.rich("topDamage", {
                            pct: Math.round(
                                (profile.topDamageGames / profile.games) * 100,
                            ),
                            b: (chunks) => <strong>{chunks}</strong>,
                        })}
                    </Typography>
                </div>
            )}
        </Card>
    );
}
