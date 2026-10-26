# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add button to open a replay in Heroes of the Storm.
- Add game flow to replay header, telling what kind of game the player
  experienced.
- Add owner kills and deaths card to replay page.
- Show kills with no killing blow on record (e.g. on Leoric) in the kill log,
  and count them even when they can't be told apart from tower kills.
- Add icons to cards headers.
- Add filters to replays list.
- Add replays folder card to `settings` page.
- Add `settings` page with replays events retention configuration.
- Add total team kills header to scoreboard.
- Add upvotes to the players scoreboard.
- Show team heroes in the replays wide list.
- Add the Symbiote wordmark to the app shell and about page.
- Add a show in folder button to the replay detail header.
- Add first blood, first fort and first to 10 milestones to the replay detail
  header.
- Add kill participation and time dead to the replay detail header stats.
- Show team levels and game duration in the scoreboard team kills header.
- Add a talent popover with the seeded talent descriptions.
- Show premade parties in the scoreboard with a badge on the hero portraits.
- Store the players account level and the owner premade party.
- Add icons to the navbar links, showing about and settings as icon buttons with
  tooltips.
- Purge the timeline events of replays older than the retention period, showing
  a notice in the replay detail.
- Add time on fire to the replay detail header stats.

### Changed

- Bump frontend dependencies.
- Adjust the players scoreboard columns order.
- Improve the replays list rendering performance.
- Use a trophy icon for the Storm League mode.
- Redesign the replay detail header, showing a role based stat in place of siege
  damage.
- Show the full played date in the replay detail header.
- Use a button for the back to replays link.
- Add a small size to buttons and a shared link style.
- Replace the MVP gold ring on hero portraits with a team color ring in the
  scoreboard, replays list and replay detail header.
- Improve the talent popover for quest talents, showing each reward step.
- Optimize the database storage, use strict table types and improve the queries
  performance.
- Make the scoreboard less noisy, moving upvotes next to the player name and
  making the table scroll horizontally.
- Hide secondary scoreboard columns and show award pills as icons only on
  smaller screens.
- Use "Your team" and "Enemy team" consistently for the team labels.
- Bump `hots-replay-parser` to 0.3.0, replays are re-parsed automatically.
- Color the scoreboard team kills count with the team colors.
- Color the scoreboard upvotes based on the amount.
- Use a dedicated color for quest talents.
- Parse fewer replays at once during a bulk ingest, keeping the CPU usage low.
- Clarify the duel range label in the timeline popover.

### Fixed

- Optimize the replays list query.
- Set the background color on the root layout.
- Avoid a negative infinity team level when no XP samples are available.
- Show zero stats as `0` instead of `-` in the scoreboard.
- Fix the third party licenses loading in the about page.
- Fix styles and components consistency across pages.

## [0.2.0] - 2026-10-22

### Added

- Add a progress bar when ingesting or refreshing replays.
- Add an ingest version to replays, so they are refreshed automatically when the
  ingest logic changes.
- Add self heal and damage taken to the scoreboard.
- Show the owner player at the top of the scoreboard, replacing the `you` tag.

### Changed

- Move most of the timeline logic from the frontend to the backend.
- Make the timeline chart and markers bigger.
- Improve the timeline marker popover placement.
- Improve the team level marker.
- Skip data seeding when the content hasn't changed.
- Skip fetching assets and licenses when the content is up to date.
- Enable Vite warmup and set the window background color.

### Fixed

- Fix ganks identification and use a different marker icon for them.
- Drop duplicated data in the score JSON.
- Fix the timeline cursor overlay issue.
- Fix the timeline bands y position and add a gap to the track axis to avoid
  lines overlapping.
- Remove the lifetime from the objective marker.
- Remove the award chip from the replay detail header.

## [0.1.3] - 2026-10-21

### Added

- Remove fetch for `licenses.json` that was causing a load error for the
  licenses in the `about` page.

## [0.1.2] - 2026-10-21

### Added

- Fix failing `notices` script on CI.

## [0.1.1] - 2026-10-21

### Added

- Add licenses list and more details to the `about` page.
- Update README.md file.

## [0.1.0] - 2026-10-21

### Added

- First release.
