import { ArrowUpRight, ChevronDown } from "lucide-react";
import { type SyntheticEvent, useState } from "react";
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

    const onToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
        setOpen(event.currentTarget.open);
    };

    return (
        <details className={styles.root} onToggle={onToggle}>
            <summary className={styles.summary}>
                <Typography size="sm" weight="semibold" truncate>
                    {pkg.name}
                </Typography>
                <Typography size="xs" variant="secondary" mono truncate>
                    {pkg.version}
                </Typography>
                <Typography size="sm" truncate>
                    {pkg.license}
                </Typography>
                <ChevronDown size={14} className={styles.chevron} />
            </summary>
            {open && (
                <div className={styles.body}>
                    <div>
                        <ExternalLink href={pkg.url} variant="chip">
                            {t("source")}
                            <ArrowUpRight size={12} />
                        </ExternalLink>
                    </div>
                    {pkg.texts.length === 0 && (
                        <Typography size="xs" variant="secondary">
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
        </details>
    );
}
