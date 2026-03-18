# Status Effects and Hazards

## Purpose

Define non-direct-damage control systems that shape combat pacing, combos, and lane manipulation.

## What It Does

- Applies timed status stacks to enemies from towers, traps, hero actions, and hazard zones.
- Controls movement and survivability through slow/freeze/shock interactions.
- Enables combo identities such as burn+freeze fracture and shock death chains.

## How It Works

- Core statuses:
  - `burn`: damage over time.
  - `poison`: damage over time with possible spread synergies.
  - `shock`: vulnerability/combo enabler for lightning effects.
  - `slow`: movement reduction.
  - `freeze`: hard stop condition through direct application or buildup threshold.
- Status lifecycle:
  - Existing stack merge rules preserve stronger intensity and longer duration for matching source/type pairs.
  - Expired statuses are removed during update passes.
- Freeze model:
  - Repeated cold sources increase freeze buildup.
  - Crossing threshold converts buildup into a timed freeze state.
- Hazard model:
  - Biome hazard zones can apply slow, damage-over-time, or freeze buildup pressure.
  - Hazards are environmental pressure, not player-owned defenses.
- Synergy layer:
  - Upgrade ownership can alter stack behavior, spread mechanics, and bonus damage triggers.

## Key Rules

- Freeze overrides movement and takes precedence over normal movement multipliers.
- Movement multipliers are clamped to prevent invalid speed results.
- Status tick damage can trigger kills and therefore downstream reward/combo logic.
- Hazard effects apply only while enemies remain inside radius.

## Dependencies

- Status logic and death-side effects: [StatusSystem](../../src/game/systems/StatusSystem.ts)
- Status movement and helper rules: [gameplayRules](../../src/game/systems/gameplayRules.ts)
- Hazard application timing: [GameApp](../../src/game/GameApp.ts)
- Biome hazard definitions: [biomes](../../src/game/data/biomes.ts)
- Related specs:
  - [Defenses, Towers, and Traps](./defenses-towers-and-traps.md)
  - [Hero Combat and Loadouts](./hero-combat-and-loadouts.md)
  - [Upgrades and Synergies](./upgrades-and-synergies.md)

## Tuning Notes

- Status balance is mainly controlled by intensity, duration, and conversion thresholds.
- Hazard radius and DPS values determine lane identity without replacing tower value.
- Combo-heavy upgrades should be tuned around reliability windows, not permanent uptime.
