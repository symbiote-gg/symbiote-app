<br />

<p align="center">
    <img src=".github/static/logo.svg" alt="SymbioteGG logo" width="30%" />
</p>

<br />

<p align="center">
  Dig into your Heroes of the Storm replays.
</p>

<br />

<p align="center">
    <img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License: GPL v3">
    <img src="https://github.com/symbiote-gg/symbiote-app/actions/workflows/qa.yml/badge.svg" alt="QA">
</p>

# SymbioteGG

Analyze your Heroes of the Storm replays in depth, by looking at what actually
happened in each game: who did the damage, healing and soaking on both teams,
which talents everyone picked, and how the match swung over time. Over many
games, it shows which heroes and roles you win with, and your overall trending.

Run `SymbioteGG` while you play to get instant feedback on your games. It finds
the default replay folder on its own, and every match you finish shows up as
soon as the replay is saved, so you can check what went right or wrong before
you queue again.

Everything happens **on your machine**. Nothing gets uploaded and there's no
account to create.

## What it does

- **Match history** - every replay with mode, K/A/D, hero damage, length and
  result at a glance, with new games flagged as they land.
- **Game breakdown** - both teams side by side: hero and siege damage, healing,
  XP, the talents picked at each level, and a timeline of the match.
- **Profile** - win rate, main role, MVPs and your recent form across all
  heroes.
- **Heroes** - win rate and games played for every hero you've touched.
- **Zero setup** - it automatically read replays from the default folder and
  picks up new replays while it runs. Finish a game and it's there.
- **Old replays still work** - heroes, talents and awards since removed from the
  game are kept, so older games still show up right.
- **Stays on your machine** - replays are decoded locally by
  [replay-parser](https://github.com/symbiote-gg/replay-parser). No account, no
  uploads.
- **Free** - `SymbioteGG` is free and will stay free.

## Where to get it

- **Windows installers**: built and attached to all
  [releases](https://github.com/symbiote-gg/symbiote-app/releases) on this
  repository

Windows is the only packaged platform for now.

## Contributing

If you'd like to file a bug, suggest a feature, or contribute code, see
**[CONTRIBUTING.md](CONTRIBUTING.md)** for setup instructions, the commit rules,
the release process and how to update the hero data.

Hero data and images are downloaded at build time from pinned HeroesToolChest
versions (see [`scripts/asset-pins.json`](scripts/asset-pins.json)). Blizzard
content is never committed to this repository.

## Credits

Replays are decoded using
[replay-parser](https://github.com/symbiote-gg/replay-parser), a Rust port of
Blizzard's [heroprotocol](https://github.com/Blizzard/heroprotocol) and
[mpyq](https://github.com/eagleflo/mpyq). Hero data comes from
[heroes-data](https://github.com/HeroesToolChest/heroes-data) and
[heroes-data2](https://github.com/HeroesToolChest/heroes-data2), images from
[heroes-images](https://github.com/HeroesToolChest/heroes-images).

## Blizzard content

`SymbioteGG` is a fan-made project and is not affiliated with, endorsed by, or
officially connected to Blizzard Entertainment or Heroes of the Storm. Hero
names, map names, artwork, icons and other game assets are the property of
Blizzard Entertainment. This project's [GPL-3.0 license](LICENSE) covers its
source code only and grants no rights in anything belonging to Blizzard
Entertainment.

Heroes of the Storm™ ©2014 Blizzard Entertainment, Inc. All rights reserved.
Heroes of the Storm is a trademark of Blizzard Entertainment, Inc.

Blizzard Entertainment is a trademark or registered trademark of Blizzard
Entertainment, Inc. in the U.S. and/or other countries. All rights reserved.

Images sourced from
[HeroesToolChest/heroes-images](https://github.com/HeroesToolChest/heroes-images);
© Blizzard Entertainment. Hero data from
[HeroesToolChest/heroes-data](https://github.com/HeroesToolChest/heroes-data).
The licences of those repositories don't cover Blizzard's images or text, and
neither does this project's licence.

Images are downscaled and re-encoded to WebP to keep the app small; the artwork
is otherwise unaltered. `SymbioteGG` is and will stay free.

## License

`SymbioteGG` is licensed under the
[GNU General Public License v3.0 or later](LICENSE). See `LICENSE` for the full
text. It covers the source code only - see [Blizzard content](#blizzard-content)
for the game assets.
