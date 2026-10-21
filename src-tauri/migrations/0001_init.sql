CREATE TABLE "heroes" (
	"id" VARCHAR NOT NULL,
	"name" VARCHAR NOT NULL,
	"role" VARCHAR,
	"portrait" VARCHAR,
	PRIMARY KEY("id")
);

CREATE TABLE "talents" (
	"hero_id" VARCHAR NOT NULL,
	"id" VARCHAR NOT NULL,
	"tier" INTEGER NOT NULL,
	"name" VARCHAR NOT NULL,
	"icon" VARCHAR,
	PRIMARY KEY("hero_id", "id"),
	FOREIGN KEY ("hero_id") REFERENCES "heroes"("id")
	ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE "awards" (
	"id" VARCHAR NOT NULL,
	"name" VARCHAR NOT NULL,
	"description" VARCHAR,
	"icon" VARCHAR,
	PRIMARY KEY("id")
);

CREATE TABLE "maps" (
	"id" VARCHAR NOT NULL,
	"name" VARCHAR NOT NULL,
	"loading_screen" VARCHAR,
	PRIMARY KEY("id")
);

CREATE TABLE "players" (
	"id" VARCHAR NOT NULL,
	"name" VARCHAR NOT NULL,
	PRIMARY KEY("id")
);

CREATE TABLE "replays" (
	"id" INTEGER NOT NULL,
	"hash" VARCHAR NOT NULL UNIQUE,
	"path" VARCHAR NOT NULL,
	"game_id" VARCHAR NOT NULL,
	"ingest_date" INTEGER NOT NULL DEFAULT (unixepoch()),
	"timestamp" INTEGER NOT NULL,
	"mode" VARCHAR NOT NULL,
	"map" VARCHAR NOT NULL,
	"owner_hero_id" VARCHAR NOT NULL,
	"owner_player_id" VARCHAR NOT NULL,
	"owner_win" BOOLEAN,
	"duration" INTEGER NOT NULL,
	"game_loops" INTEGER NOT NULL,
	"gates_open_loop" INTEGER NOT NULL DEFAULT 0,
	"is_new" BOOLEAN NOT NULL DEFAULT 0,
	PRIMARY KEY("id"),
	FOREIGN KEY ("owner_hero_id") REFERENCES "heroes"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION,
	FOREIGN KEY ("owner_player_id") REFERENCES "players"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE INDEX "replays_timestamp_id_idx" ON "replays" ("timestamp" DESC, "id" DESC);

CREATE INDEX "replays_owner_hero_id_idx" ON "replays" ("owner_hero_id");

CREATE UNIQUE INDEX "replays_game_id_owner_player_id_idx" ON "replays" ("game_id", "owner_player_id");

CREATE TABLE "superseded_replays" (
	"hash" VARCHAR NOT NULL,
	"path" VARCHAR NOT NULL,
	"replay_id" INTEGER NOT NULL,
	PRIMARY KEY("hash"),
	FOREIGN KEY ("replay_id") REFERENCES "replays"("id")
	ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE INDEX "superseded_replays_replay_id_idx" ON "superseded_replays" ("replay_id");

CREATE TABLE "replays_players" (
	"replay_id" INTEGER NOT NULL,
	"player_id" VARCHAR NOT NULL,
	"slot" INTEGER NOT NULL,
	"team" INTEGER NOT NULL,
	"hero_id" VARCHAR NOT NULL,
	"time_dead_secs" REAL,
	"upvotes" INTEGER NOT NULL DEFAULT 0,
	"xp" TEXT,
	"score" TEXT NOT NULL DEFAULT '{}',
	PRIMARY KEY("replay_id", "player_id"),
	FOREIGN KEY ("replay_id") REFERENCES "replays"("id")
	ON UPDATE NO ACTION ON DELETE CASCADE,
	FOREIGN KEY ("player_id") REFERENCES "players"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION,
	FOREIGN KEY ("hero_id") REFERENCES "heroes"("id")
	ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT "replays_players_unique_0" UNIQUE ("replay_id", "slot")
);

CREATE INDEX "replays_players_player_id_idx" ON "replays_players" ("player_id");

CREATE INDEX "replays_players_hero_damage_idx" ON "replays_players" ("replay_id", "team", COALESCE(json_extract("score", '$.HeroDamage'), 0));

CREATE TABLE "replays_players_talents" (
	"replay_id" INTEGER NOT NULL,
	"player_id" VARCHAR NOT NULL,
	"tier" INTEGER NOT NULL,
	"talent_id" VARCHAR NOT NULL,
	"gameloop" INTEGER NOT NULL,
	PRIMARY KEY("replay_id", "player_id", "tier"),
	FOREIGN KEY ("replay_id", "player_id") REFERENCES "replays_players"("replay_id", "player_id")
	ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE INDEX "replays_players_talents_talent_id_idx" ON "replays_players_talents" ("talent_id");

CREATE TABLE "replays_players_awards" (
	"replay_id" INTEGER NOT NULL,
	"player_id" VARCHAR NOT NULL,
	"award" VARCHAR NOT NULL,
	PRIMARY KEY("replay_id", "player_id", "award"),
	FOREIGN KEY ("replay_id", "player_id") REFERENCES "replays_players"("replay_id", "player_id")
	ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE INDEX "replays_players_awards_award_idx" ON "replays_players_awards" ("award");

CREATE TABLE "events" (
	"id" INTEGER NOT NULL,
	"replay_id" INTEGER NOT NULL,
	"kind" VARCHAR NOT NULL,
	"gameloop" INTEGER NOT NULL,
	"team" INTEGER,
	"data" TEXT NOT NULL,
	PRIMARY KEY("id"),
	FOREIGN KEY ("replay_id") REFERENCES "replays"("id")
	ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE INDEX "events_replay_id_gameloop_idx" ON "events" ("replay_id", "gameloop");
