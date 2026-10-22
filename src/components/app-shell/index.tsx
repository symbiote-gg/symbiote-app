import classNames from "classnames";
import { type ReactNode, useEffect, useRef } from "react";
import { useTranslations } from "use-intl";
import { Link, useLocation } from "wouter";

import { SymbioteLogo } from "@/assets";
import { IngestProgress } from "../ingest-progress";

import styles from "./styles.module.css";

const NAV = [
    { key: "home", href: "/" },
    { key: "replays", href: "/replays" },
    { key: "profile", href: "/profile" },
    { key: "heroes", href: "/heroes" },
] as const;

const isActive = (location: string, href: string) =>
    href === "/"
        ? location === "/"
        : location === href || location.startsWith(`${href}/`);

export function AppShell({ children }: { children: ReactNode }) {
    const t = useTranslations("nav");
    const [location] = useLocation();
    const main = useRef<HTMLElement>(null);

    useEffect(() => {
        main.current?.scrollTo({ top: 0 });
    }, [location]);

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <Link href="/" className={styles.brand}>
                    <SymbioteLogo className={styles.logo} />
                    <span className={styles.wordmark}>
                        Symbiote<span className={styles.suffix}>GG</span>
                    </span>
                </Link>
                <nav className={styles.nav}>
                    {NAV.map(({ key, href }) => (
                        <Link
                            key={key}
                            href={href}
                            className={classNames(styles.link, {
                                [styles.active]: isActive(location, href),
                            })}
                        >
                            {t(key)}
                        </Link>
                    ))}
                </nav>
                <div className={styles.end}>
                    <IngestProgress />
                    <Link
                        href="/about"
                        className={classNames(styles.link, {
                            [styles.active]: location === "/about",
                        })}
                    >
                        {t("about")}
                    </Link>
                </div>
            </header>
            <main ref={main} className={styles.content}>
                {children}
            </main>
        </div>
    );
}
