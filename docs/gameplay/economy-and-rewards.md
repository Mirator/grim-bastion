# Economy and Rewards

## Purpose

Document the resource loops that fund defense growth, ability usage, and long-term progression value.

## What It Does

- Governs short-run spending and recovery decisions.
- Rewards successful defense and wave completion.
- Connects tactical performance with persistent progression currency.

## How It Works

- Resource channels:
  - `gold`: primary build currency for towers and traps.
  - `mana`: ability fuel with passive regeneration and cap.
  - `essence`: progression value carried between runs.
- Gold income:
  - Enemy kill bounties, wave-clear bonuses, biome-clear grants, and upgrade-driven bonuses.
  - Additional bonuses can trigger on elite kills, multi-kills, or boss outcomes.
- Spending sinks:
  - Placement costs for towers and traps.
  - Rebuild opportunity cost when repositioning via sell/refund.
- Mana flow:
  - Passive regeneration baseline.
  - Conditional generation from specific economy upgrades (for example, trap trigger rewards).
- Essence flow:
  - Earned through kills, waves, and biome progress, with optional bonus effects.
  - Finalized into persistent save progression at run end.
- Scaling:
  - Wave progression influences health and gold scaling to maintain pressure and reward growth.

## Key Rules

- Enemy rewards are tied to killed outcomes, not escaped outcomes.
- Cost multipliers can reduce placement costs but should preserve minimum meaningful spending decisions.
- Mana is clamped to its cap and cannot accumulate indefinitely.
- Sell value is partial, preserving commitment tension while still enabling strategic pivots.

## Dependencies

- Reward granting and spend logic: [GameApp](../../src/game/GameApp.ts)
- Enemy bounty and build cost templates: [archetypes](../../src/game/data/archetypes.ts)
- Economy and reward upgrade definitions: [upgrades data](../../src/game/data/upgrades.ts)
- Reward eligibility helpers: [gameplayRules](../../src/game/systems/gameplayRules.ts)
- Related specs:
  - [Defenses, Towers, and Traps](./defenses-towers-and-traps.md)
  - [Enemies, Waves, and Bosses](./enemies-waves-and-bosses.md)
  - [Meta Progression and Save](./meta-progression-and-save.md)

## Tuning Notes

- Gold baseline controls early board stability; over-generosity reduces strategic tradeoffs.
- Mana regen and mana-on-trigger effects define active-ability uptime and should be balanced against cooldowns.
- Essence gains shape account progression speed and should track intended run length and completion rates.
