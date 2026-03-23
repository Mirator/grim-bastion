# Upgrades and Synergies

## Purpose

Describe the implemented upgrade draft system, pool composition, weighting model, and cross-system synergy hooks.

## What It Does

- Provides 3 weighted choices during upgrade phases.
- Uses category buckets (`tower`, `hero`, `economy`, `wild`) with rarity-weighted entries.
- Prevents duplicate picks in a run.
- Applies both direct stat modifiers and flag-based behavior unlocks.
- Uses soft build-aware weighting to improve draft relevance.

## How It Works

- Pool construction:
  - Upgrade pool is generated from `createUpgradePool()`.
  - Current pool size is fixed at exactly `72` entries (enforced by runtime assertion).
- Choice roll:
  - `rollChoices` filters to compatible, not-yet-owned upgrades.
  - Compatibility blocks duplicates via `ownedUpgradeIds`.
  - Each candidate receives an effective weight from base weight + affinity profile.
  - Picks are weighted random with uniqueness per roll.
  - Default choice count is `3`.
- Affinity profile inputs:
  - Placed tower/trap composition.
  - Current weapon and loadout abilities.
  - Owned upgrade tags and categories.
  - Resource-pressure hints (low gold/mana, low hero health).
- Affinity scoring behavior:
  - Candidate tags are compared to profile tags for positive bias.
  - Category-level affinity contributes a smaller bonus.
  - Wild upgrades have a lower max affinity multiplier cap to preserve rarity identity.
  - No hard category quotas are enforced.
- Pick apply flow:
  - `applyChoice` runs upgrade `apply(state)` then adds upgrade ID to `ownedUpgradeIds` and clears available choices.
  - Effects can be immediate numeric mutations (multipliers/resources/stats) or ownership flags consumed elsewhere.
- Transition behavior:
  - Wave-clear hook rolls upgrade choices every wave, including biome-final waves.
  - Biome/run transitions are resolved after a successful upgrade pick.

## Key Rules

- Upgrade IDs are unique and only applied once per run.
- Draft UI interaction is mode-gated (`upgrade` only).
- Weighted randomness still favors common/uncommon entries overall.
- Wild upgrades are boosted less aggressively than non-wild categories.
- Many synergies are implemented as boolean flags checked in `GameApp` and `StatusSystem`.

## Dependencies

- Pool generation and definitions: [upgrades data](../../src/game/data/upgrades.ts)
- Roll/apply logic and affinity weighting: [UpgradeSystem](../../src/game/systems/UpgradeSystem.ts)
- Runtime consumption of upgrade flags/modifiers: [GameApp](../../src/game/GameApp.ts)
- Status-linked upgrade effects: [StatusSystem](../../src/game/systems/StatusSystem.ts)
- Related specs:
  - [Run Loop and Modes](./run-loop-and-modes.md)
  - [Defenses, Towers, and Traps](./defenses-towers-and-traps.md)
  - [Economy and Rewards](./economy-and-rewards.md)
  - [Hero Combat and Loadouts](./hero-combat-and-loadouts.md)

## Tuning Notes

- Weight values remain the primary control for baseline pick frequency.
- Affinity contributions should stay soft so drafts feel guided, not deterministic.
- Wild cap and rarity weights should be tuned together if wild frequency drifts.
