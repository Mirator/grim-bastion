# Economy and Rewards

## Purpose

Document the implemented gold/mana/essence loops, reward sources, and spend/refund behavior.

## What It Does

- Funds defense placement and active-ability usage.
- Rewards kill performance, wave clears, and biome clears.
- Persists run-earned progression value through essence.

## How It Works

- Resource channels:
  - `gold`: build/sell economy.
  - `mana`: active-ability resource (capped at 100).
  - `essence`: meta progression currency persisted at run end.
- Starting values (new run state):
  - `gold`: 360
  - `mana`: 60
  - `essence`: loaded from save meta, then increased during run.
- Gold income:
  - Kill reward on `killed` enemies only:
    - `bountyGold * economyGoldMultiplier * waveGoldScale(globalWave)`.
  - Upgrade-dependent bonuses:
    - Elite bonus (`economy-gold-elite` / `economy-gold-flow-2`).
    - Combo dividend every 5 kills (`economy-combo-dividend`).
    - Boss bounty bonus (`economy-boss-bounty`).
  - Wave clear bonus: +70 (or +90 with `economy-wave-bonus`).
  - Biome clear bonus: +110.
- Mana flow:
  - Passive regen: `2.1/s`, multiplied by `1.6` if `economy-mana-regen` is owned.
  - Trap-trigger gain from `economy-trap-mana` (`economyManaOnTrapTrigger` modifier).
  - Boss bounty bonus can grant mana.
- Essence flow:
  - Kill essence: normal +1, elite +3, boss +20.
  - Wave clear +5; biome clear +15.
  - `economy-essence-bonus` adds extra on elite/boss kills.
- Spending and refunds:
  - Build costs come from archetype base costs modified by `towerCostMultiplier` / `trapCostMultiplier`.
  - Sell refunds use tower refund factors or trap 0.7 baseline, with optional `economy-sell-refund` multiplier.
  - `runStats.goldSpent` tracks placement spending.
- Run finalization:
  - End-of-run computes essence gained relative to saved essence baseline.
  - Save patch adds gained essence, appends run history, and persists unlocked upgrade IDs.

## Key Rules

- Escaped enemies do not grant gold/essence rewards.
- Mana is clamped to `[0, 100]`.
- Reward hooks run on wave clear, including biome-final clears before transition override.
- Cost and refund behavior is deterministic from archetypes + owned upgrade modifiers.

## Dependencies

- Reward granting, spend/refund, run-finalization: [GameApp](../../src/game/GameApp.ts)
- Archetype costs and scaling helpers: [archetypes](../../src/game/data/archetypes.ts)
- Upgrade definitions modifying economy fields: [upgrades data](../../src/game/data/upgrades.ts)
- Save persistence and migration: [SaveSystem](../../src/game/systems/SaveSystem.ts)
- Related specs:
  - [Defenses, Towers, and Traps](./defenses-towers-and-traps.md)
  - [Enemies, Waves, and Bosses](./enemies-waves-and-bosses.md)
  - [Meta Progression and Save](./meta-progression-and-save.md)

## Tuning Notes

- Gold pace is primarily driven by bounty scaling and wave/biome bonuses.
- Mana economy is controlled by baseline regen plus trap-trigger and boss-bounty injections.
- Essence pacing directly controls long-term unlock speed.
