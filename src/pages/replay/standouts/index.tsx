import { SearchAlert } from "lucide-react";
import { useTranslations } from "use-intl";

import type { StandoutsResult } from "@/api/replays";
import { Card, CardHeader } from "@/ui";
import type { StandoutId } from "@/utils/timeline/standouts";
import { Tile } from "./tile";

import styles from "./styles.module.css";

interface StandoutsProps {
    result: StandoutsResult;
    shown: StandoutId | null;
    onShow: (id: StandoutId) => void;
}

export function Standouts({ result, shown, onShow }: StandoutsProps) {
    const t = useTranslations("replay.standouts");

    if (result.items.length === 0) return null;

    return (
        <Card className={styles.standouts}>
            <CardHeader icon={SearchAlert} size="sm" title={t("title")} />
            <ul className={styles.tiles}>
                {result.items.map((item) => (
                    <Tile
                        key={item.id}
                        standout={item}
                        shown={item.id === shown}
                        onShow={onShow}
                    />
                ))}
            </ul>
        </Card>
    );
}
