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
    heroName: string;
    heroPortrait: string | null;
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
    kills: number | null;
    assists: number | null;
    deaths: number | null;
    heroDamage: number | null;
    siegeDamage: number | null;
    healing: number | null;
    selfHealing: number | null;
    damageTaken: number | null;
    xp: number | null;
    upvotes: number;
    talents: TalentPick[];
    awards: Award[];
};

export type Lane = "top" | "middle" | "bottom";

export type TimelineDeath = {
    time: number;
    /** The victim's team. */
    team: number | null;
    victim: number;
    killers: number[];
    /** Null when no hero landed it: minions, structures, mercenaries. */
    killingBlow: number | null;
    /** Null when unknown, e.g. replays ingested before it was tracked. */
    alone: boolean | null;
};

export type TimelineStructure = {
    time: number;
    /** The team that owned it. */
    team: number | null;
    keep: boolean;
    /** Null on maps without distinct lanes. */
    lane: Lane | null;
    killers: number[];
    /** Null when no hero landed it: minions, mercenaries. */
    killingBlow: number | null;
};

export type TimelineCamp = {
    time: number;
    team: number | null;
    campType: string | null;
    /** Which capture of this camp it is, from 1. */
    nth: number;
};

/** Both teams' progress towards one objective, drawn as two bars. */
export type Race = {
    kind:
        | "capture"
        | "curse"
        | "gems"
        | "golem"
        | "shrine"
        | "ship"
        | "temple"
        | "wave";
    teamValues: [number, number];
    unit: "percent" | null;
    /** The team listed first, else the leader. */
    topTeam: number | null;
};

/** A summoned unit's life, spawn to death, and the damage it did. */
export type Summon = {
    range: [number, number];
    siege: number;
    heroes: number;
};

/** An immortal fight: who won and how much of their immortal survived. */
export type Duel = {
    range: [number, number];
    winner: number;
    power: number;
};

/** An altar capture: the firing team and the towns adding shots to its core. */
export type Altar = {
    winner: number;
    towns: number;
};

/** A Dragon Knight's ride: its pilot and what they took down while it lived. */
export type Knight = {
    /** End is null while the knight outlived the game. */
    range: [number, number | null];
    pilot: number;
    takedowns: number;
    structures: number;
};

export type Objective = {
    time: number;
    kind: string;
    /** The team that gained from it. */
    team: number | null;
    /** Picks a glyph and label among the kind's, e.g. a punisher's type. */
    variant: string | null;
    race: Race | null;
    /** A state's start and end, shown in the popover, not on the track. */
    held: [number, number] | null;
    summon: Summon | null;
    duel: Duel | null;
    altar: Altar | null;
    knight: Knight | null;
    /** The event's own values, only for kinds no map knows. */
    raw: {
        ints: Record<string, number>;
        strings: Record<string, string>;
    } | null;
};

/** What happened over a game, from the gates opening. */
export type Timeline = {
    deaths: TimelineDeath[];
    structures: TimelineStructure[];
    camps: TimelineCamp[];
    /** Each team's level-ups as `[time, level]`, from level 1 at 0. */
    levels: [[number, number][], [number, number][]];
    objectives: Objective[];
};

/** A team's cumulative XP at one periodic sample, timed like the timeline. */
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
    timeline: Timeline;
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
