import { ScanSearch } from "lucide-react";
import { useTranslations } from "use-intl";

import type { StandoutsResult } from "@/api/replays";
import { Card, CardHeader } from "@/ui";
import { Tile } from "./tile";

import styles from "./styles.module.css";

interface StandoutsProps {
    result: StandoutsResult;
}

export function Standouts({ result }: StandoutsProps) {
    const t = useTranslations("replay.standouts");

    if (result.items.length === 0) return null;

    return (
        <Card className={styles.standouts}>
            <CardHeader
                icon={ScanSearch}
                size="sm"
                title={t("title")}
                subtitle={t("subtitle")}
            />
            <ul className={styles.tiles}>
                {result.items.map((item) => (
                    <Tile key={item.id} standout={item} />
                ))}
            </ul>
        </Card>
    );
}
