# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Bump frontend dependencies.
- Add upvotes to players scoreboard and adjust columns order.

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
