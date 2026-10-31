import { UserRound } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "use-intl";

import { WinStrip } from "@/components";
import { useProfileSummary } from "@/hooks/useProfileSummary";
import {
    ButtonLink,
    Card,
    CardHeader,
    EmptyState,
    ErrorMessage,
    Eyebrow,
    StatTile,
    Typography,
    richStrong,
} from "@/ui";

import styles from "./styles.module.css";

const RECENT_GAMES = 20;

export function ProfileCard() {
    const t = useTranslations("home.profile");
    const roles = useTranslations("roles");
    const { data, error } = useProfileSummary();

    const profile = useMemo(() => {
        if (!data) return null;

        const recent = [...data.recent].reverse();

        return {
            recent,
            recentWins: recent.filter((win) => win === true).length,
            recentLosses: recent.filter((win) => win === false).length,
            decided: data.wins + data.losses,
            mainRole: data.mainRole,
            mvps: data.mvps,
            topDamageGames: data.topDamageGames,
            games: data.games,
        };
    }, [data]);

    return (
        <Card className={styles.root}>
            <CardHeader
                icon={UserRound}
                size="sm"
                title={t("title")}
                subtitle={t("subtitle")}
                action={
                    <ButtonLink href="/profile" variant="secondary">
                        {t("cta")}
                    </ButtonLink>
                }
            />
            {error && <ErrorMessage error={error} />}
            {!profile ? (
                <EmptyState>{t("empty")}</EmptyState>
            ) : (
                <div className={styles.body}>
                    <div className={styles.recent}>
                        <div className={styles.recentLabels}>
                            <Eyebrow>
                                {t("last", { count: profile.recent.length })}
                            </Eyebrow>
                            <Typography size="xs" variant="tertiary" mono>
                                {profile.recentWins}-{profile.recentLosses}
                            </Typography>
                        </div>
                        <WinStrip
                            results={profile.recent}
                            slots={RECENT_GAMES}
                        />
                    </div>
                    <div className={styles.stats}>
                        <StatTile
                            label={t("winRate")}
                            value={
                                profile.decided === 0
                                    ? "-"
                                    : `${Math.round((profile.recentWins / profile.decided) * 100)}%`
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
                            b: richStrong,
                        })}
                    </Typography>
                </div>
            )}
        </Card>
    );
}
