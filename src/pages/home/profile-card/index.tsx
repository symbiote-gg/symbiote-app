import { Crown, Percent, UserRound } from "lucide-react";
import { type ReactNode, useMemo } from "react";
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
    WinRate,
} from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";
import { ROLE_ICONS } from "@/utils/role-icons";

import styles from "./styles.module.css";

const RECENT_GAMES = 20;

const win = (chunks: ReactNode) => <span className={styles.win}>{chunks}</span>;

const loss = (chunks: ReactNode) => (
    <span className={styles.loss}>{chunks}</span>
);

export function ProfileCard() {
    const t = useTranslations("home.profile");
    const roles = useTranslations("roles");
    const { data, error } = useProfileSummary();

    const profile = useMemo(() => {
        if (!data) return null;

        const recent = [...data.recent].reverse();

        return {
            recent,
            recentWins: recent.filter((result) => result === true).length,
            recentLosses: recent.filter((result) => result === false).length,
            rate: winRate(data.wins, data.losses),
            judged: isJudged(data.wins, data.losses),
            mainRole: data.mainRole,
            mvps: data.mvps,
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
                            <Typography size="xs" mono>
                                {t.rich("record", {
                                    wins: profile.recentWins,
                                    losses: profile.recentLosses,
                                    win,
                                    loss,
                                })}
                            </Typography>
                        </div>
                        <WinStrip
                            results={profile.recent}
                            slots={RECENT_GAMES}
                        />
                    </div>
                    <div className={styles.stats}>
                        <StatTile
                            variant="panel"
                            icon={
                                profile.mainRole
                                    ? ROLE_ICONS[profile.mainRole]
                                    : undefined
                            }
                            label={t("mainRole")}
                            value={
                                profile.mainRole ? roles(profile.mainRole) : "-"
                            }
                            className={styles.wide}
                        />
                        <StatTile
                            variant="panel"
                            icon={Percent}
                            label={t("winRate")}
                            value={
                                <WinRate
                                    rate={profile.rate}
                                    judged={profile.judged}
                                />
                            }
                        />
                        <StatTile
                            variant="panel"
                            icon={Crown}
                            label={t("mvps")}
                            value={profile.mvps}
                            accent="mvp"
                        />
                    </div>
                </div>
            )}
        </Card>
    );
}
