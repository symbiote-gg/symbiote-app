import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "use-intl";

import type { ThirdPartyPackage } from "@/api/licenses";
import { Typography } from "@/ui";
import { ExternalLink } from "../external-link";

import styles from "./styles.module.css";

export interface PackageEntryProps {
    pkg: ThirdPartyPackage;
    texts: string[];
}

export function PackageEntry({ pkg, texts }: PackageEntryProps) {
    const t = useTranslations("about.licenses");
    const [open, setOpen] = useState(false);

    const onToggle = () => {
        setOpen((value) => !value);
    };

    return (
        <div className={styles.root}>
            <button
                type="button"
                aria-expanded={open}
                className={styles.summary}
                onClick={onToggle}
            >
                <Typography size="sm" weight="semibold" truncate>
                    {pkg.name}
                </Typography>
                <Typography size="xs" variant="tertiary" mono truncate>
                    {pkg.version}
                </Typography>
                <Typography size="sm" truncate>
                    {pkg.license}
                </Typography>
                <ChevronDown size={14} className={styles.chevron} />
            </button>
            {open && (
                <div className={styles.body}>
                    <div>
                        <ExternalLink href={pkg.url} variant="chip">
                            {t("source")}
                            <ArrowUpRight size={12} />
                        </ExternalLink>
                    </div>
                    {pkg.texts.length === 0 && (
                        <Typography size="xs" variant="tertiary">
                            {t("noText")}
                        </Typography>
                    )}
                    {pkg.texts.map((id) => (
                        <pre key={id} className={styles.text}>
                            {texts[id]}
                        </pre>
                    ))}
                </div>
            )}
        </div>
    );
}
