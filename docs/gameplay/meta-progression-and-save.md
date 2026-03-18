# Meta Progression and Save

## Purpose

Define persistent data behavior across runs, including how progress is stored, sanitized, and updated.

## What It Does

- Persists account-level state between sessions.
- Protects runtime from malformed or outdated save payloads.
- Records run outcomes for long-term progression tracking.

## How It Works

- Save model:
  - Versioned save format with metadata, settings, and run history.
  - Stored in browser local storage.
- Default initialization:
  - If no valid save exists, defaults are created and stored.
- Migration/sanitization:
  - Incoming payloads are validated and clamped.
  - Unknown or invalid values are replaced with safe defaults.
  - History entries are filtered to valid run result records.
- Run finalization:
  - On run end, persistent essence and unlocked upgrade IDs are updated.
  - Run history receives result, biome reached, waves cleared, and essence gained.
  - History length is bounded to a fixed cap.

## Key Rules

- Save version mismatch falls back to default save model.
- Settings and progression values are bounded to safe ranges.
- Progression updates only occur on terminal run outcomes (`victory` or `defeat`).
- Migration is defensive: invalid data must never break runtime state construction.

## Dependencies

- Save lifecycle and migration: [SaveSystem](../../src/game/systems/SaveSystem.ts)
- Run-end progression updates: [GameApp](../../src/game/GameApp.ts)
- Shared save and state types: [types](../../src/game/types.ts)
- Related specs:
  - [Run Loop and Modes](./run-loop-and-modes.md)
  - [Economy and Rewards](./economy-and-rewards.md)
  - [Upgrades and Synergies](./upgrades-and-synergies.md)

## Tuning Notes

- Difficulty unlock pacing should match expected player mastery progression.
- Run history cap should balance analytics value and storage overhead.
- Any future save version should include explicit migration steps to preserve backwards compatibility.
