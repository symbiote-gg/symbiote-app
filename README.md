<p align="center">
  <img src=".github/static/logo.svg" alt="SymbioteGG logo" width="128" />
</p>

# SymbioteGG

A free desktop app for browsing your own replays. Built with Tauri, React and
TypeScript.

## Development

```sh
pnpm install
pnpm tauri dev
```

`pnpm dev` and `pnpm build` first run `pnpm assets`. That step downloads hero
data and images from pinned HeroesToolChest versions (see
[`scripts/asset-pins.json`](scripts/asset-pins.json)) into `public/game/` and
`src-tauri/data/`. Both folders are gitignored. Blizzard content is never
committed to this repository.

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
