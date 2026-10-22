# Contributing

## Setup

You need Node.js, pnpm and a Rust toolchain
([Tauri prerequisites](https://tauri.app/start/prerequisites/)).

```sh
pnpm install
pnpm tauri dev
```

`pnpm dev` and `pnpm build` run `pnpm assets` first, so hero data and portraits
are downloaded automatically. Run `pnpm assets` once by hand before using
`cargo` or rust-analyzer directly: the Rust build embeds
`src-tauri/data/heroes.json` and fails if it's missing.

By default, the app looks for replays in `../replays/Accounts`, as configured in
`config.toml`. To test it, create the following folder structure and add some
replays to it:

```
replays/Accounts/dev/2-Hero-1-0000000/Replays/Multiplayer
```

`2-Hero-1-0000000` follows the naming of the folder the game creates, which
encodes the player's region and ID.

## Commits

`pnpm install` sets up git hooks with husky. Before each commit they run
`pnpm lint` (Prettier check; fix with `pnpm format`) and check the message
against [Conventional Commits](https://www.conventionalcommits.org/), e.g.
`feat: show talent builds` or `fix(ingester): skip corrupt replays`.

Pushes to `main` and pull requests run the [`qa`](.github/workflows/qa.yml)
workflow: Prettier, `tsc`, `cargo fmt`, `cargo clippy` and `cargo test`.

## Releasing

Releases are built for Windows by the [`publish`](.github/workflows/publish.yml)
workflow, run by hand.

1. Bump `version` in [`package.json`](package.json). The app reads its version
   from there, so there's no need to touch `src-tauri/tauri.conf.json` or
   `src-tauri/Cargo.toml`.

2. Commit and push, e.g. `v0.2.0`.

3. On GitHub, open Actions, select `publish` and click Run workflow on `main`.
   It builds the app and creates a draft release `v<version>` with the
   installers attached.

4. Check the draft and publish it. GitHub creates the `v<version>` tag on the
   built commit at that point; run `git fetch --tags` to get it locally.

## Updating the hero data pins

Hero data and images come from the pins in
[`scripts/asset-pins.json`](scripts/asset-pins.json). Update them after a game
patch, or when heroes-data2 adds a hero.

`heroesData` lists game versions, oldest first. The script merges them: newer
versions win, and older ones keep the heroes, talents and awards since removed
from the game, so older replays still show them. The first entry pins the
archived [heroes-data](https://github.com/HeroesToolChest/heroes-data) repo by
commit; later ones pin
[heroes-data2](https://github.com/HeroesToolChest/heroes-data2) releases.

1. Find the newest heroes-data2 release. Use a live build, not one ending in
   `_ptr`:

   ```sh
   curl -s "https://api.github.com/repos/HeroesToolChest/heroes-data2/releases" | grep '"tag_name"'
   ```

2. Hash its archive, e.g. for `v2.57.0.98348`:

   ```sh
   curl -sL https://github.com/HeroesToolChest/heroes-data2/releases/download/v2.57.0.98348/heroes-data-no-maps-2.57.0.98348.tar.gz | sha256sum
   ```

3. In `scripts/asset-pins.json`:
   - add a `heroesData` entry at the end with the `repo`, the `version` (the tag
     without its `v`), the `locale` and the `sha256`. Keep the previous last
     entry if older replays may use talents the new version removed, otherwise
     replace it;
   - set `heroesImages.commit` to the latest commit of heroes-images:

     ```sh
     git ls-remote https://github.com/HeroesToolChest/heroes-images HEAD
     ```

4. Fetch the assets:

   ```sh
   pnpm assets
   ```

   A pin change clears `public/game/` and downloads everything again. The script
   stops if:
   - a pinned file is missing, or a release archive doesn't match its `sha256`;
   - more than 3 images of a kind are missing upstream;
   - a hero has a role it doesn't know. In that case, add the role to `ROLES` in
     [`scripts/assets/facts.mjs`](scripts/assets/facts.mjs), to the `HeroRole`
     enum in [`src-tauri/src/db/heroes.rs`](src-tauri/src/db/heroes.rs) and to
     the `HeroRole` type in [`src/api/replays.ts`](src/api/replays.ts), then add
     a `roles.*` translation in
     [`src/i18n/messages/en.json`](src/i18n/messages/en.json).

5. Check the result: run `pnpm tauri dev` and make sure the replay list shows
   portraits. The app re-seeds the `heroes` table at every start, so existing
   installs pick up the new data after an update.

6. Commit only `scripts/asset-pins.json` and any code changes, never the
   downloaded files.
