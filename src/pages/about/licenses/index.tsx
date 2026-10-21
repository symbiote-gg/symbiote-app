import { Search } from "lucide-react";
import {
    type ChangeEvent,
    useDeferredValue,
    useEffect,
    useRef,
    useState,
} from "react";
import { useTranslations } from "use-intl";

import type { ThirdPartyPackage } from "@/api/licenses";
import { useThirdPartyLicenses } from "@/hooks/useThirdPartyLicenses";
import { APP_LICENSE, APP_LICENSE_URL } from "@/legal";
import { Typography } from "@/ui";
import { ExternalLink } from "../external-link";
import { PackageEntry } from "../package-entry";

import styles from "./styles.module.css";

const PREVIEW_COUNT = 10;

const matches = (pkg: ThirdPartyPackage, query: string) =>
    pkg.name.toLowerCase().includes(query) ||
    pkg.license.toLowerCase().includes(query);

export function Licenses() {
    const t = useTranslations("about.licenses");
    const { data, error } = useThirdPartyLicenses();
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState(false);
    const deferredQuery = useDeferredValue(query.trim().toLowerCase());
    const list = useRef<HTMLDivElement>(null);

    const packages =
        data?.packages.filter((p) => matches(p, deferredQuery)) ?? [];
    const visible = expanded ? packages : packages.slice(0, PREVIEW_COUNT);

    useEffect(() => {
        list.current?.scrollTo({ top: 0 });
    }, [deferredQuery]);

    const onQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    };

    const onShowAll = () => {
        setExpanded(true);
    };

    return (
        <section className={styles.root}>
            <div className={styles.intro}>
                <Typography display weight="semibold" className={styles.title}>
                    {t("title")}
                </Typography>
                <Typography size="sm" variant="secondary">
                    {t.rich("app", {
                        license: APP_LICENSE,
                        count: data?.packages.length ?? 0,
                        link: (chunks) => (
                            <ExternalLink href={APP_LICENSE_URL}>
                                {chunks}
                            </ExternalLink>
                        ),
                    })}
                </Typography>
                {error && (
                    <Typography size="sm" variant="secondary">
                        {t("unavailable")}
                    </Typography>
                )}
                {data && (
                    <label className={styles.search}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            type="search"
                            value={query}
                            placeholder={t("search")}
                            className={styles.input}
                            onChange={onQueryChange}
                        />
                    </label>
                )}
            </div>
            {data && (
                <div className={styles.table}>
                    <div className={styles.head}>
                        <span>{t("columns.package")}</span>
                        <span>{t("columns.version")}</span>
                        <span>{t("columns.license")}</span>
                    </div>
                    <div ref={list} className={styles.list}>
                        {visible.map((pkg) => (
                            <PackageEntry
                                key={`${pkg.name}@${pkg.version}`}
                                pkg={pkg}
                                texts={data.texts}
                            />
                        ))}
                        {packages.length === 0 && (
                            <Typography
                                size="sm"
                                variant="secondary"
                                className={styles.empty}
                            >
                                {t("noMatches")}
                            </Typography>
                        )}
                    </div>
                    {visible.length < packages.length && (
                        <Typography
                            size="xs"
                            variant="secondary"
                            className={styles.footer}
                        >
                            {t("showing", {
                                shown: visible.length,
                                total: packages.length,
                            })}{" "}
                            <button
                                type="button"
                                className={styles.showAll}
                                onClick={onShowAll}
                            >
                                {t("showAll")}
                            </button>
                        </Typography>
                    )}
                </div>
            )}
        </section>
    );
}
