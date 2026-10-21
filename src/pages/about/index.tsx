import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";

import { Page } from "@/components";
import { BLIZZARD_NOTICES, DISCLAIMER, IMAGES_CREDIT } from "@/legal";
import { Typography } from "@/ui";

import styles from "./styles.module.css";

export function About() {
    const t = useTranslations("about");
    const [version, setVersion] = useState("");

    useEffect(() => {
        getVersion().then(setVersion);
    }, []);

    return (
        <Page width="reading">
            <div className={styles.main}>
                <Typography size="xl2" weight="semibold" display uppercase>
                    {t("title")}
                </Typography>
                {version && (
                    <Typography variant="secondary">
                        {t("version", { version })}
                    </Typography>
                )}
                <section className={styles.section}>
                    <Typography size="lg" weight="semibold">
                        {t("blizzard")}
                    </Typography>
                    <Typography size="sm">{DISCLAIMER}</Typography>
                    {BLIZZARD_NOTICES.map((notice) => (
                        <Typography key={notice} size="sm" variant="secondary">
                            {notice}
                        </Typography>
                    ))}
                    <Typography size="sm" variant="secondary">
                        {IMAGES_CREDIT}
                    </Typography>
                </section>
            </div>
        </Page>
    );
}
