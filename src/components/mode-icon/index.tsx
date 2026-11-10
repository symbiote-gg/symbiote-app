import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { Mode } from "@/api/replays";
import { MODE_ICONS } from "@/utils/mode-icons";

import styles from "./style.module.css";

export interface ModeIconProps {
    mode: Mode;
    className?: string;
}

export function ModeIcon({ mode, className }: ModeIconProps) {
    const Icon = MODE_ICONS[mode];

    return <Icon className={classNames(styles.root, className)} />;
}

export interface ModeLabelProps {
    mode: Mode;
    iconClassName?: string;
}

export function ModeLabel({ mode, iconClassName }: ModeLabelProps) {
    const t = useTranslations("modes");

    return (
        <>
            <ModeIcon mode={mode} className={iconClassName} />
            {t(mode)}
        </>
    );
}
