CREATE TABLE "heroes" (
	"id" INTEGER NOT NULL,
	"slug" TEXT NOT NULL UNIQUE CHECK (length("slug") BETWEEN 1 AND 32),
	"name" TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 32),
	"role" TEXT CHECK ("role" IN ('tank', 'bruiser', 'healer', 'support', 'melee_assassin', 'ranged_assassin')),
	"portrait" TEXT CHECK (length("portrait") BETWEEN 1 AND 128),
	PRIMARY KEY("id")
) STRICT;

CREATE TABLE "talents" (
	"id" INTEGER NOT NULL,
	"hero_id" INTEGER NOT NULL,
	"slug" TEXT NOT NULL CHECK (length("slug") BETWEEN 1 AND 96),
	"tier" INTEGER NOT NULL CHECK ("tier" BETWEEN 1 AND 7),
	"name" TEXT CHECK (length("name") BETWEEN 1 AND 64),
	"description" TEXT CHECK (length("description") BETWEEN 1 AND 2048),
	"icon" TEXT CHECK (length("icon") BETWEEN 1 AND 128),
	PRIMARY KEY("id"),
	FOREIGN KEY ("hero_id") REFERENCES "heroes"("id")
	ON UPDATE NO ACTION ON DELETE CASCADE,
	CONSTRAINT "talents_unique_0" UNIQUE ("hero_id", "slug")
) STRICT;

CREATE TABLE "awards" (
	"id" TEXT NOT NULL CHECK (length("id") BETWEEN 1 AND 64),
	"name" TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 32),
	"description" TEXT CHECK (length("description") BETWEEN 1 AND 128),
	"icon" TEXT CHECK (length("icon") BETWEEN 1 AND 128),
	PRIMARY KEY("id")
) STRICT, WITHOUT ROWID;

CREATE TABLE "maps" (
	"id" TEXT NOT NULL CHECK (length("id") BETWEEN 1 AND 64),
	"name" TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 64),
	"loading_screen" TEXT CHECK (length("loading_screen") BETWEEN 1 AND 128),
	PRIMARY KEY("id")
) STRICT, WITHOUT ROWID;

CREATE TABLE "players" (
	"id" INTEGER NOT NULL,
	"toon" TEXT NOT NULL UNIQUE CHECK (length("toon") BETWEEN 1 AND 32),
	"name" TEXT NOT NULL CHECK (length("name") BETWEEN 1 AND 32),
	"account_level" INTEGER CHECK ("account_level" > 0),
	PRIMARY KEY("id")
) STRICT;

CREATE TABLE "parties" (
	"id" INTEGER NOT NULL,
	"members" TEXT NOT NULL UNIQUE CHECK (length("members") BETWEEN 3 AND 128 AND "members" NOT GLOB '*[^0-9,]*'),
	PRIMARY KEY("id")
) STRICT;

CREATE TABLE "parties_players" (
	"party_id" INTEGER NOT NULL,
	"player_id" INTEGER NOT NULL,
	PRIMARY KEY("party_id", "player_id"),
	FOREIGN KEY ("party_id") REFERENCES "parties"("id")
	ON UPDATE NO ACTION ON DELETE CASCADE,
	FOREIGN KEY ("player_id") REFERENCES "players"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION
) STRICT, WITHOUT ROWID;

CREATE INDEX "parties_players_player_id_idx" ON "parties_players" ("player_id");

CREATE TABLE "replays" (
	"id" INTEGER NOT NULL,
	"hash" TEXT NOT NULL UNIQUE CHECK (length("hash") = 64 AND "hash" NOT GLOB '*[^0-9a-f]*'),
	"path" TEXT NOT NULL CHECK (length("path") BETWEEN 1 AND 4096),
	"game_id" TEXT NOT NULL CHECK (length("game_id") = 64 AND "game_id" NOT GLOB '*[^0-9a-f]*'),
	"ingest_date" INTEGER NOT NULL DEFAULT (unixepoch()),
	"ingest_version" INTEGER NOT NULL DEFAULT 0 CHECK ("ingest_version" >= 0),
	"timestamp" INTEGER NOT NULL CHECK ("timestamp" > 0),
	"mode" TEXT NOT NULL CHECK ("mode" IN ('quick_match', 'versus_ai', 'brawl', 'unranked_draft',
		'hero_league', 'team_league', 'storm_league', 'aram', 'custom', 'unknown')),
	"map" TEXT NOT NULL CHECK (length("map") BETWEEN 1 AND 64),
	"owner_hero_id" INTEGER NOT NULL,
	"owner_player_id" INTEGER NOT NULL,
	"owner_party_id" INTEGER,
	"owner_win" INTEGER CHECK ("owner_win" IN (0, 1)),
	"duration" INTEGER NOT NULL CHECK ("duration" > 0),
	"game_loops" INTEGER NOT NULL CHECK ("game_loops" > 0),
	"gates_open_loop" INTEGER NOT NULL DEFAULT 0 CHECK ("gates_open_loop" >= 0),
	"is_new" INTEGER NOT NULL DEFAULT 0 CHECK ("is_new" IN (0, 1)),
	PRIMARY KEY("id"),
	FOREIGN KEY ("owner_hero_id") REFERENCES "heroes"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION,
	FOREIGN KEY ("owner_player_id") REFERENCES "players"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION,
	FOREIGN KEY ("owner_party_id") REFERENCES "parties"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION
) STRICT;

CREATE INDEX "replays_timestamp_id_idx" ON "replays" ("timestamp" DESC, "id" DESC);

CREATE INDEX "replays_owner_hero_id_idx" ON "replays" ("owner_hero_id");

CREATE INDEX "replays_owner_party_id_idx" ON "replays" ("owner_party_id");

CREATE UNIQUE INDEX "replays_game_id_owner_player_id_idx" ON "replays" ("game_id", "owner_player_id");

CREATE TABLE "superseded_replays" (
	"hash" TEXT NOT NULL CHECK (length("hash") = 64 AND "hash" NOT GLOB '*[^0-9a-f]*'),
	"path" TEXT NOT NULL CHECK (length("path") BETWEEN 1 AND 4096),
	"replay_id" INTEGER NOT NULL,
	PRIMARY KEY("hash"),
	FOREIGN KEY ("replay_id") REFERENCES "replays"("id")
	ON UPDATE NO ACTION ON DELETE CASCADE
) STRICT, WITHOUT ROWID;

CREATE INDEX "superseded_replays_replay_id_idx" ON "superseded_replays" ("replay_id");

CREATE TABLE "replays_players" (
	"replay_id" INTEGER NOT NULL,
	"player_id" INTEGER NOT NULL,
	"slot" INTEGER NOT NULL CHECK ("slot" BETWEEN 1 AND 10),
	"team" INTEGER NOT NULL CHECK ("team" IN (0, 1)),
	"hero_id" INTEGER NOT NULL,
	"time_dead_secs" REAL CHECK ("time_dead_secs" >= 0),
	"time_on_fire_secs" REAL CHECK ("time_on_fire_secs" >= 0),
	"upvotes" INTEGER NOT NULL DEFAULT 0 CHECK ("upvotes" >= 0),
	"party" INTEGER CHECK ("party" BETWEEN 1 AND 5),
	"xp" BLOB CHECK ("xp" IS NULL OR json_valid("xp", 8)),
	"score" BLOB NOT NULL CHECK (json_valid("score", 8)),
	PRIMARY KEY("replay_id", "player_id"),
	FOREIGN KEY ("replay_id") REFERENCES "replays"("id")
	ON UPDATE NO ACTION ON DELETE CASCADE,
	FOREIGN KEY ("player_id") REFERENCES "players"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION,
	FOREIGN KEY ("hero_id") REFERENCES "heroes"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT "replays_players_unique_0" UNIQUE ("replay_id", "slot")
) STRICT;

CREATE INDEX "replays_players_player_id_idx" ON "replays_players" ("player_id");

CREATE INDEX "replays_players_hero_damage_idx" ON "replays_players" ("replay_id", "team", COALESCE(json_extract("score", '$.HeroDamage'), 0));

CREATE TABLE "replays_players_talents" (
	"replay_id" INTEGER NOT NULL,
	"player_id" INTEGER NOT NULL,
	"tier" INTEGER NOT NULL CHECK ("tier" BETWEEN 1 AND 7),
	"talent_id" INTEGER NOT NULL,
	"gameloop" INTEGER NOT NULL CHECK ("gameloop" >= 0),
	PRIMARY KEY("replay_id", "player_id", "tier"),
	FOREIGN KEY ("replay_id", "player_id") REFERENCES "replays_players"("replay_id", "player_id")
	ON UPDATE NO ACTION ON DELETE CASCADE,
	FOREIGN KEY ("talent_id") REFERENCES "talents"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION
) STRICT, WITHOUT ROWID;

CREATE INDEX "replays_players_talents_talent_id_idx" ON "replays_players_talents" ("talent_id");

CREATE TABLE "replays_players_awards" (
	"replay_id" INTEGER NOT NULL,
	"player_id" INTEGER NOT NULL,
	"award" TEXT NOT NULL CHECK (length("award") BETWEEN 1 AND 64),
	PRIMARY KEY("replay_id", "player_id", "award"),
	FOREIGN KEY ("replay_id", "player_id") REFERENCES "replays_players"("replay_id", "player_id")
	ON UPDATE NO ACTION ON DELETE CASCADE
) STRICT, WITHOUT ROWID;

CREATE INDEX "replays_players_awards_award_idx" ON "replays_players_awards" ("award");

CREATE TABLE "event_kinds" (
	"id" INTEGER NOT NULL,
	"name" TEXT NOT NULL UNIQUE CHECK (length("name") BETWEEN 1 AND 64),
	PRIMARY KEY("id")
) STRICT;

CREATE TABLE "events" (
	"id" INTEGER NOT NULL,
	"replay_id" INTEGER NOT NULL,
	"kind_id" INTEGER NOT NULL,
	"gameloop" INTEGER NOT NULL CHECK ("gameloop" >= 0),
	"team" INTEGER CHECK ("team" IN (0, 1)),
	"data" BLOB NOT NULL CHECK (json_valid("data", 8)),
	PRIMARY KEY("id"),
	FOREIGN KEY ("replay_id") REFERENCES "replays"("id")
	ON UPDATE NO ACTION ON DELETE CASCADE,
	FOREIGN KEY ("kind_id") REFERENCES "event_kinds"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION
) STRICT;

CREATE INDEX "events_replay_id_gameloop_idx" ON "events" ("replay_id", "gameloop");

CREATE TABLE "seeds" (
	"source" TEXT NOT NULL CHECK ("source" IN ('heroes', 'talents', 'awards', 'maps')),
	"hash" TEXT NOT NULL CHECK (length("hash") = 64 AND "hash" NOT GLOB '*[^0-9a-f]*'),
	PRIMARY KEY("source")
) STRICT, WITHOUT ROWID;

CREATE TABLE "settings" (
	"id" INTEGER NOT NULL CHECK ("id" = 1),
	"event_retention_years" INTEGER CHECK ("event_retention_years" IN (1, 2, 5)),
	PRIMARY KEY("id")
) STRICT;

INSERT INTO "settings" ("id", "event_retention_years") VALUES (1, 5);
