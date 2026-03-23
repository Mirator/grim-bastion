# Status Effects and Hazards

## Purpose

Define implemented status and hazard behavior that modifies enemy movement, damage intake, and combo outcomes.

## What It Does

- Applies timed status stacks from hero, towers, traps, hazards, and upgrade effects.
- Runs DoT and control logic each simulation update.
- Enables upgrade-dependent combo behavior (shock death chains, poison spread, thermal fracture, etc.).

## How It Works

- Core statuses:
  - `burn`: damage over time (`7 * intensity` per second).
  - `poison`: damage over time (`5 * intensity` per second).
  - `shock`: increases vulnerability multiplier.
  - `slow`: reduces movement speed.
  - `freeze`: hard movement stop while active.
- Status stack lifecycle:
  - Same `type + sourceId` merges by taking max intensity/duration.
  - Durations tick down each update; expired entries are removed.
- Slow/freeze resolution:
  - Slow computes per-stack multipliers (stacking mode depends on `allSlowEffectsStack`).
  - Freeze forces movement multiplier to 0.
  - Freeze buildup converts to freeze status at threshold (`>= 100`) if not already frozen.
- Damage interactions:
  - Shock increases incoming status-tick damage multiplier.
  - Splash sources against frozen targets gain bonus damage.
  - Kills from status damage trigger normal death side effects.
- Upgrade-driven status behaviors:
  - `frost-spreading-freeze`: frozen enemies pulse freeze buildup + slow to nearby enemies.
  - `wild-poison-spread`: poison DoT can spread to nearby enemies.
  - `wild-fire-and-frost`: burning frozen enemies take periodic thermal fracture damage.
  - `shockExplosionOnDeath`: shocked enemy deaths chain AoE shock damage.
- Hazard behavior (biome hazards):
  - Hazards apply effects while enemy is inside hazard radius (2D check).
  - `slowMultiplier < 1` adds slow status.
  - `dps > 0` deals hazard DoT damage.
  - `frost-field` also adds freeze buildup over time.
  - Hazard checks currently apply to any enemy in radius (including flying, via 2D position check).

## Key Rules

- Freeze has priority over other movement modifiers.
- Movement multipliers are clamped through gameplay-rule helpers.
- Status-caused kills count as `killed` outcomes and feed reward systems.
- Hazard effects are positional and cease when enemy exits radius.

## Dependencies

- Status add/update/death-side effects: [StatusSystem](../../src/game/systems/StatusSystem.ts)
- Movement/status helper rules: [gameplayRules](../../src/game/systems/gameplayRules.ts)
- Hazard application and upgrade interactions: [GameApp](../../src/game/GameApp.ts)
- Hazard definitions: [biomes](../../src/game/data/biomes.ts)
- Related specs:
  - [Defenses, Towers, and Traps](./defenses-towers-and-traps.md)
  - [Hero Combat and Loadouts](./hero-combat-and-loadouts.md)
  - [Upgrades and Synergies](./upgrades-and-synergies.md)

## Tuning Notes

- Main levers: duration, intensity, threshold values, and spread radii.
- Hazard pressure should shape lane decisions without replacing tower/hero agency.
- Combo upgrades significantly change kill-speed distributions and should be monitored together.
