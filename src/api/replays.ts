import { Channel, invoke } from "@tauri-apps/api/core";

export type Mode =
    | "quick_match"
    | "versus_ai"
    | "brawl"
    | "unranked_draft"
    | "hero_league"
    | "team_league"
    | "storm_league"
    | "aram"
    | "custom"
    | "unknown";

export type HeroRole =
    | "tank"
    | "bruiser"
    | "healer"
    | "support"
    | "melee_assassin"
    | "ranged_assassin";

export type ReplayPlayer = {
    playerId: string;
    name: string;
    slot: number;
    team: number;
    heroId: string;
};

export type Replay = {
    id: number;
    timestamp: string;
    mode: Mode;
    map: string;
    mapName: string;
    mapLoadingScreen: string | null;
    ownerHeroId: string;
    ownerPlayerId: string;
    heroName: string;
    heroRole: HeroRole | null;
    heroPortrait: string | null;
    ownerWin: boolean | null;
    duration: number;
    ownerKills: number | null;
    ownerDeaths: number | null;
    ownerAssists: number | null;
    ownerTakedowns: number | null;
    ownerHeroDamage: number | null;
    ownerMvp: boolean;
    ownerHeroDamageTop: boolean;
    ownerAwards: Award[];
    isNew: boolean;
    players: ReplayPlayer[];
};

export type ReplayPage = {
    replays: Replay[];
    total: number;
};

export type ReplayIngested = {
    replay: Replay;
    removed: number | null;
    /** Already stored, re-parsed in place after a INGEST_VERSION update. */
    refreshed: boolean;
    total: number;
};

export type TalentPick = {
    tier: number;
    talentId: string;
    gameloop: number;
    name: string | null;
    icon: string | null;
};

export type AwardType =
    | "mvp"
    | "0deaths"
    | "0outnumbered_deaths"
    | "clutch_healer"
    | "given_to_nonwinner"
    | "hat_trick"
    | "highest_kill_streak"
    | "most_altar_damage_done"
    | "most_coins_paid"
    | "most_curse_damage_done"
    | "most_damage_done_to_zerg"
    | "most_damage_taken"
    | "most_damage_to_minions"
    | "most_damage_to_plants"
    | "most_daredevil_escapes"
    | "most_dragon_shrines_captured"
    | "most_escapes"
    | "most_gems_turned_in"
    | "most_healing"
    | "most_hero_damage_done"
    | "most_immortal_damage"
    | "most_interrupted_cage_unlocks"
    | "most_kills"
    | "most_merc_camps_captured"
    | "most_nuke_damage_done"
    | "most_protection"
    | "most_roots"
    | "most_seeds_collected"
    | "most_siege_damage_done"
    | "most_silences"
    | "most_skulls_collected"
    | "most_stuns"
    | "most_teamfight_damage_taken"
    | "most_teamfight_healing_done"
    | "most_teamfight_hero_damage_done"
    | "most_time_in_temple"
    | "most_time_on_point"
    | "most_time_pushing"
    | "most_vengeances_performed"
    | "most_xp_contribution";

export type Award = {
    type: AwardType;
    name: string | null;
    description: string | null;
    icon: string | null;
};

export type ReplayPlayerDetail = ReplayPlayer & {
    heroName: string;
    heroPortrait: string | null;
    kills: number | null;
    assists: number | null;
    deaths: number | null;
    heroDamage: number | null;
    siegeDamage: number | null;
    healing: number | null;
    selfHealing: number | null;
    damageTaken: number | null;
    xp: number | null;
    talents: TalentPick[];
    awards: Award[];
};

export type TimelineEvent = {
    kind: string;
    time: number;
    team: number | null;
    data: Record<string, unknown>;
};

/** A team's cumulative XP at one periodic sample, timed like `TimelineEvent`. */
export type XpSample = {
    time: number;
    team: number;
    level: number;
    total: number;
};

export type ReplayDetail = Omit<
    Replay,
    | "players"
    | "ownerKills"
    | "ownerDeaths"
    | "ownerAssists"
    | "ownerTakedowns"
    | "ownerHeroDamage"
    | "ownerMvp"
    | "ownerHeroDamageTop"
    | "ownerAwards"
> & {
    players: ReplayPlayerDetail[];
    events: TimelineEvent[];
    xp: XpSample[];
};

export const PAGE_SIZE = 50;

export type ReplayCursor = Pick<Replay, "timestamp" | "id">;

export const listReplays = (after: ReplayCursor | null, limit: number) =>
    invoke<ReplayPage>("list_replays", { after, limit });

export const getReplay = (id: number) =>
    invoke<ReplayDetail>("get_replay", { id });

export const markReplayAsSeen = (id: number) =>
    invoke<void>("mark_replay_as_seen", { id });

export const countReplays = () => invoke<number>("count_replays");

export async function subscribeIngest(
    handler: (message: ReplayIngested) => void,
) {
    const channel = new Channel<ReplayIngested>(handler);
    const id = await invoke<number>("subscribe_ingest", { channel });
    return () => invoke<void>("unsubscribe_ingest", { id });
}
