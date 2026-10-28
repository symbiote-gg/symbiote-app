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
    playerId: number;
    name: string;
    slot: number;
    team: number;
    heroId: number;
    heroName: string;
    heroPortrait: string | null;
};

export type Replay = {
    id: number;
    path: string;
    timestamp: string;
    mode: Mode;
    map: string;
    mapName: string;
    mapLoadingScreen: string | null;
    ownerHeroId: number;
    ownerPlayerId: number;
    ownerSlot: number;
    ownerTeam: number;
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
    talentId: number;
    slug: string;
    gameloop: number;
    name: string | null;
    description: string | null;
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
    heroRole: HeroRole | null;
    kills: number | null;
    assists: number | null;
    deaths: number | null;
    takedowns: number | null;
    heroDamage: number | null;
    siegeDamage: number | null;
    healing: number | null;
    selfHealing: number | null;
    damageTaken: number | null;
    xp: number | null;
    /** Seconds of stuns, roots and silences on enemy heroes. */
    hardCc: number | null;
    timeDead: number | null;
    timeOnFire: number | null;
    upvotes: number;
    party: number | null;
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
    /**
     * Living teammates near the victim as it died: 0 means it died alone. Null
     * when unknown, e.g. replays ingested before it was tracked.
     */
    alliesNearby: number | null;
    /** Where, in map units. Null on replays ingested before it was tracked. */
    x: number | null;
    y: number | null;
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
    /** Captured on the other team's side of the map. */
    stolen: boolean;
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

export type FightKind = "teamFight" | "skirmish" | "gank" | "pick";

/** Deaths close enough in time to be one fight. */
export type TimelineFight = {
    start: number;
    end: number;
    /** Indices into the timeline's deaths. */
    deaths: number[];
    kind: FightKind;
};

/** The first team to reach a point of the game. */
export type Milestone = {
    kind: "firstBlood" | "firstFort" | "firstTen";
    team: number;
    time: number;
};

/** What happened over a game, from the gates opening. */
export type Timeline = {
    deaths: TimelineDeath[];
    structures: TimelineStructure[];
    camps: TimelineCamp[];
    /** Each team's level-ups as `[time, level]`, from level 1 at 0. */
    levels: [[number, number][], [number, number][]];
    objectives: Objective[];
    fights: TimelineFight[];
    milestones: Milestone[];
};

/** How a game went for its winner. */
export type GameFlow = "stomp" | "comeback" | "close" | "controlled";

export type DeathKind = FightKind | "solo" | "ai";
export type DeathRole = "kill" | "assist" | "death";

export type KillLogEntry = {
    /** Index into the timeline's deaths. */
    death: number;
    kind: DeathKind;
    role: DeathRole;
};

/**
 * Scoreboard kills no death places, e.g. on Leoric, whose deaths record no killing
 * blow, or landed by a structure yet credited to a hero.
 */
export type UnplacedKills = {
    /** The heroes they can be on. */
    victims: number[];
    count: number;
    /** Takedowns with no killing blow on record that credit the owner. */
    deaths: number[];
};

export type KillLog = {
    entries: KillLogEntry[];
    unplaced: UnplacedKills | null;
};

export type TeamSummary = {
    kills: number;
    assists: number;
    deaths: number;
    aiKills: number;
    level: number | null;
};

export type ReplayDetail = Omit<
    Replay,
    | "players"
    | "ownerKills"
    | "ownerDeaths"
    | "ownerAssists"
    | "ownerTakedowns"
    | "ownerHeroDamage"
    | "ownerHeroDamageTop"
    | "ownerAwards"
> & {
    players: ReplayPlayerDetail[];
    timeline: Timeline;
    killLog: KillLog;
    teams: [TeamSummary, TeamSummary];
    ownerKillParticipation: number | null;
    flow: GameFlow | null;
    onDisk: boolean;
    eventsExpired: boolean;
};

export type StandoutId =
    | "aloneDeaths"
    | "pickDeaths"
    | "firstDead"
    | "stayedInLost"
    | "deathsPunished"
    | "timeDead"
    | "fightRecord"
    | "missedFights"
    | "allFights"
    | "stolenCamps"
    | "unansweredEngages"
    | "lanePressure";

/** Colours the key figure: a cost, worth a look, or something done right. */
export type StandoutTone = "bad" | "watch" | "good";

/** The key figure as a number, formatted by `unit`. */
export type StandoutFigure = {
    value: number;
    /** Renders the figure as "value of total" when set. */
    total: number | null;
    unit: "count" | "seconds" | "duration";
};

/**
 * Which sentence fits the hero, e.g. a tank's fight record counts only the fights
 * that opened with it there. Null is the default sentence.
 */
export type StandoutVariant = "tank";

export type Standout = {
    id: StandoutId;
    tone: StandoutTone;
    figure: StandoutFigure;
    /** Fills the sentence and the figure's unit line. */
    params: Record<string, number>;
    variant: StandoutVariant | null;
};

export type StandoutsResult = {
    items: Standout[];
    eventsExpired: boolean;
};

export const PAGE_SIZE = 50;

export type ReplayCursor = {
    value: number | null;
    id: number;
};

export type ReplaySortColumn = "played" | "gameTime" | "heroDamage";

export type ReplaySort = {
    column: ReplaySortColumn;
    desc: boolean;
};

export const DEFAULT_REPLAY_SORT: ReplaySort = { column: "played", desc: true };

/** Empty lists and nulls don't narrow the list by that field. */
export type ReplayFilters = {
    modes: Mode[];
    maps: string[];
    heroes: number[];
    roles: HeroRole[];
    win: boolean | null;
    from: string | null;
    to: string | null;
};

export const NO_REPLAY_FILTERS: ReplayFilters = {
    modes: [],
    maps: [],
    heroes: [],
    roles: [],
    win: null,
    from: null,
    to: null,
};

export const listReplays = (
    filters: ReplayFilters,
    sort: ReplaySort,
    after: ReplayCursor | null,
    limit: number,
) => invoke<ReplayPage>("list_replays", { filters, sort, after, limit });

export const getReplay = (id: number) =>
    invoke<ReplayDetail>("get_replay", { id });

export const getStandouts = (id: number) =>
    invoke<StandoutsResult>("get_standouts", { id });

export const watchReplay = (id: number) => invoke<void>("watch_replay", { id });

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
