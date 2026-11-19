import { Trophy } from "lucide-react";
import { useTranslations } from "use-intl";

import { BestTilesSkeleton } from "@/components";
import { Card, CardHeader, Skeleton } from "@/ui";

import styles from "./styles.module.css";

const TILES = 6;

export function BestsSkeleton() {
    const t = useTranslations("hero.bests");

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={Trophy}
                title={t("title")}
                subtitle={<Skeleton className={styles.subtitleBar} />}
            />
            <BestTilesSkeleton count={TILES} />
        </Card>
    );
}
