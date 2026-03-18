# Upgrades and Synergies

## Purpose

Specify how wave-based drafting modifies run power, creates build identities, and drives replayability.

## What It Does

- Presents a limited set of upgrade choices after each cleared wave.
- Buckets upgrades into role groups (`tower`, `hero`, `economy`, `wild`).
- Uses rarity-weighted random selection while preventing duplicates in a run.
- Supports both linear scaling and build-defining synergy pivots.

## How It Works

- Draft flow:
  - Entering upgrade mode generates a set of compatible choices.
  - Player selects one upgrade via UI click or hotkey.
  - Chosen upgrade applies immediate state mutation and is marked owned.
  - Mode exits back to build planning after selection.
- Category intent:
  - Tower: strengthens automated defense throughput and utility.
  - Hero: reinforces active intervention, ability loops, and survivability.
  - Economy: improves income, costs, and resource conversion.
  - Wild: rare, high-impact rule changers that redefine build behavior.
- Synergy architecture:
  - Some upgrades adjust base multipliers directly.
  - Some set ownership flags that unlock conditional combat behavior in other systems.

## Key Rules

- Upgrade IDs are unique; duplicates are blocked within a run.
- Draft choice count is fixed by upgrade phase configuration.
- Compatibility and ownership checks run before random pick weighting.
- Wild upgrades are intentionally low-weight and high-impact.

## Dependencies

- Upgrade choice and application flow: [UpgradeSystem](../../src/game/systems/UpgradeSystem.ts)
- Upgrade definitions and pool construction: [upgrades data](../../src/game/data/upgrades.ts)
- Mode integration and pick handling: [GameApp](../../src/game/GameApp.ts)
- Related specs:
  - [Run Loop and Modes](./run-loop-and-modes.md)
  - [Defenses, Towers, and Traps](./defenses-towers-and-traps.md)
  - [Economy and Rewards](./economy-and-rewards.md)
  - [Hero Combat and Loadouts](./hero-combat-and-loadouts.md)

## Tuning Notes

- Weight values are the primary control for draft frequency and meta variety.
- Build-defining upgrades should remain sparse enough to feel special but frequent enough to enable strategic pivots.
- Multiplicative interactions across tower, hero, and economy modifiers require periodic balance review as new content is added.
