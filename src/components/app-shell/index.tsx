import classNames from "classnames";
import {
    Clapperboard,
    Crown,
    House,
    Info,
    Settings,
    UserRound,
} from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { useTranslations } from "use-intl";
import { Link, useLocation } from "wouter";

import { SymbioteLogo, SymbioteWordmark } from "@/assets";
import { Tooltip } from "@/ui";
import { IngestProgress } from "../ingest-progress";

import styles from "./styles.module.css";

const NAV = [
    { key: "home", href: "/", Icon: House },
    { key: "replays", href: "/replays", Icon: Clapperboard },
    { key: "profile", href: "/profile", Icon: UserRound },
    { key: "heroes", href: "/heroes", Icon: Crown },
] as const;

const UTILITY = [
    { key: "about", href: "/about", Icon: Info },
    { key: "settings", href: "/settings", Icon: Settings },
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
                    <SymbioteWordmark className={styles.wordmark} />
                </Link>
                <nav className={styles.nav}>
                    {NAV.map(({ key, href, Icon }) => (
                        <Link
                            key={key}
                            href={href}
                            className={classNames(styles.link, {
                                [styles.active]: isActive(location, href),
                            })}
                        >
                            <Icon className={styles.icon} />
                            {t(key)}
                        </Link>
                    ))}
                </nav>
                <div className={styles.end}>
                    <IngestProgress />
                    {UTILITY.map(({ key, href, Icon }) => (
                        <Tooltip key={key} content={t(key)} placement="bottom">
                            <Link
                                href={href}
                                aria-label={t(key)}
                                className={classNames(
                                    styles.link,
                                    styles.iconLink,
                                    {
                                        [styles.active]: location === href,
                                    },
                                )}
                            >
                                <Icon className={styles.icon} />
                            </Link>
                        </Tooltip>
                    ))}
                </div>
            </header>
            <main ref={main} className={styles.content}>
                {children}
            </main>
        </div>
    );
}
