import { getVersion } from "@tauri-apps/api/app";
import { Code, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";

import { SymbioteLogo, SymbioteWordmark } from "@/assets";
import { Page } from "@/components";
import {
    APP_LICENSE,
    APP_LICENSE_URL,
    BLIZZARD_NOTICES,
    DISCLAIMER,
    IMAGES_CREDIT,
    ISSUES_URL,
    REPO_URL,
} from "@/legal";
import { Typography } from "@/ui";
import { ExternalLink } from "./external-link";
import { Licenses } from "./licenses";

import styles from "./styles.module.css";

export function About() {
    const t = useTranslations("about");
    const [version, setVersion] = useState("");

    useEffect(() => {
        getVersion().then(setVersion);
    }, []);

    return (
        <Page fill>
            <div className={styles.top}>
                <header className={styles.hero}>
                    <SymbioteLogo className={styles.logo} />
                    <div className={styles.identity}>
                        <SymbioteWordmark className={styles.wordmark} />
                        <Typography variant="secondary">
                            {t("tagline")}
                        </Typography>
                        <div className={styles.actions}>
                            <ExternalLink href={REPO_URL} variant="primary">
                                <Code size={16} />
                                {t("source")}
                            </ExternalLink>
                            <ExternalLink href={ISSUES_URL} variant="secondary">
                                <TriangleAlert size={16} />
                                {t("issues")}
                            </ExternalLink>
                        </div>
                    </div>
                </header>
                <dl className={styles.meta}>
                    <div className={styles.metaRow}>
                        <dt className={styles.label}>{t("meta.version")}</dt>
                        <dd className={styles.version}>
                            {version && t("meta.versionValue", { version })}
                        </dd>
                    </div>
                    <div className={styles.metaRow}>
                        <dt className={styles.label}>{t("meta.license")}</dt>
                        <dd className={styles.metaValue}>
                            <ExternalLink href={APP_LICENSE_URL}>
                                {APP_LICENSE}
                            </ExternalLink>
                        </dd>
                    </div>
                </dl>
            </div>
            <Licenses />
            <footer className={styles.footer}>
                <p className={styles.label}>{t("footer")}</p>
                <div className={styles.notices}>
                    <Typography size="sm" variant="secondary">
                        {DISCLAIMER}
                    </Typography>
                    <Typography size="xs" variant="secondary">
                        {BLIZZARD_NOTICES.join(" ")}
                    </Typography>
                    <Typography size="xs" variant="secondary">
                        {IMAGES_CREDIT}
                    </Typography>
                </div>
            </footer>
        </Page>
    );
}
