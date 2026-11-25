import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { profileCareerQuery } from "@/api/queries";
import { CareerTiles, Motes, TimePanel } from "@/components";
import { Chip, ErrorMessage, Typography, WinRate, rollingChunks } from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";
import { ROLE_ICONS } from "@/utils/role-icons";
import { Avatar } from "./avatar";
import { ProfileHeaderSkeleton } from "./skeleton";

import styles from "./styles.module.css";

// Purple twice as often as orange, like the logo.
const MOTE_COLORS = ["--accent", "--accent", "--color-brand-orange"];

const win = (chunks: ReactNode) => <span className={styles.win}>{chunks}</span>;

const loss = (chunks: ReactNode) => (
    <span className={styles.loss}>{chunks}</span>
);

export function ProfileHeader() {
    const t = useTranslations("profile.header");
    const career = useTranslations("career");
    const roles = useTranslations("roles");
    const { data, error } = useQuery(profileCareerQuery);

    if (error) return <ErrorMessage error={error} />;
    if (!data) return <ProfileHeaderSkeleton />;
    if (!data.name) return null;

    const rate = winRate(data.wins, data.losses);

    return (
        <header className={styles.root}>
            <Motes colors={MOTE_COLORS} className={styles.motes} />
            <div className={styles.identity}>
                <div className={styles.player}>
                    <Avatar name={data.name} level={data.accountLevel} />
                    <div className={styles.titles}>
                        {data.mainRole && (
                            <Chip
                                size="sm"
                                icon={ROLE_ICONS[data.mainRole]}
                                uppercase
                                className={styles.role}
                            >
                                {t("roleMain", { role: roles(data.mainRole) })}
                            </Chip>
                        )}
                        <Typography size="xl2" display className={styles.name}>
                            {data.name}
                        </Typography>
                    </div>
                </div>
                {rate !== null && (
                    <div className={styles.result}>
                        <Typography as="p" display className={styles.rate}>
                            <WinRate
                                rate={rate}
                                judged={isJudged(data.wins, data.losses)}
                            />
                        </Typography>
                        <Typography as="p" mono className={styles.record}>
                            {career.rich("record", {
                                wins: data.wins,
                                losses: data.losses,
                                num: rollingChunks,
                                win,
                                loss,
                            })}
                        </Typography>
                    </div>
                )}
            </div>
            <div className={styles.body}>
                <TimePanel totals={data} mvps={data.mvps} />
                <CareerTiles
                    totals={data}
                    healing="team"
                    className={styles.tiles}
                />
            </div>
        </header>
    );
}
