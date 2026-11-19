import { Trophy } from "lucide-react";
import { useTranslations } from "use-intl";

import type { HeroDetail } from "@/api/heroes";
import type { HeroRole } from "@/api/replays";
import { BestTiles } from "@/components";
import { useBestTiles } from "@/hooks/useBestTiles";
import { Card, CardHeader } from "@/ui";
import { MIN_TEAM_SHARE } from "@/utils/hero-stats";

/**
 * Records that grow with what the hero does. Those outside its role's lead are
 * ranked by the owner's share of the team's total.
 */
const VOLUME_SHARES = {
    heroDamage: "shareHeroDamage",
    siegeDamage: "shareSiegeDamage",
    healing: "shareHealing",
    damageTaken: "shareDamageTaken",
    xp: "shareXp",
} as const satisfies Record<string, keyof HeroDetail>;

type VolumeBest = keyof typeof VOLUME_SHARES;

const VOLUMES = Object.keys(VOLUME_SHARES) as VolumeBest[];

/**
 * The volume records that lead, by the hero's role: team shares of XP and damage
 * taken sit near an even fifth for everyone, so ranking by share picks noise.
 */
const ROLE_VOLUMES: Record<HeroRole, VolumeBest[]> = {
    tank: ["damageTaken", "heroDamage"],
    bruiser: ["damageTaken", "siegeDamage"],
    healer: ["healing", "xp"],
    support: ["heroDamage", "xp"],
    melee_assassin: ["heroDamage", "siegeDamage"],
    ranged_assassin: ["heroDamage", "siegeDamage"],
};

const DEFAULT_VOLUMES: VolumeBest[] = ["heroDamage", "siegeDamage"];

const MAX_TILES = 6;

export interface BestsProps {
    hero: HeroDetail;
}

export function Bests({ hero }: BestsProps) {
    const t = useTranslations("hero.bests");
    const { fromGame, fromStreak } = useBestTiles();
    const { bests } = hero;

    const leading = hero.role ? ROLE_VOLUMES[hero.role] : DEFAULT_VOLUMES;

    const trailing = VOLUMES.filter((key) => !leading.includes(key))
        .map((key) => ({ key, share: hero[VOLUME_SHARES[key]] ?? 0 }))
        .filter(({ share }) => share >= MIN_TEAM_SHARE)
        .sort((a, b) => b.share - a.share)
        .map(({ key }) => fromGame(key, bests[key]));

    const tiles = [
        ...leading.map((key) => fromGame(key, bests[key])),
        fromGame("takedowns", bests.takedowns),
        fromGame("fewestDeathsWin", bests.fewestDeathsWin),
        fromGame("fastestWin", bests.fastestWin),
        fromStreak(bests.winStreak),
        ...trailing,
    ]
        .filter((tile) => tile !== null)
        .slice(0, MAX_TILES);

    if (tiles.length === 0) return null;

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={Trophy}
                title={t("title")}
                subtitle={t("subtitle", { hero: hero.name })}
            />
            <BestTiles tiles={tiles} />
        </Card>
    );
}
