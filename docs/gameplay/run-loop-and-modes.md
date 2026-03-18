# Run Loop and Modes

## Purpose

Define the top-level structure of a run: what each mode is responsible for, how players progress, and when the run ends.

## What It Does

- Establishes the playable lifecycle from pre-run to victory/defeat.
- Splits player intent into phase-specific behavior (building, fighting, upgrading, transitioning).
- Controls pacing by gating wave starts, upgrade picks, and biome transitions.

## How It Works

- `menu`: initial state before a run starts.
- `build`: placement/sell planning phase; can start a wave.
- `wave`: active combat simulation with spawning, movement, damage, and defense execution.
- `upgrade`: post-wave draft phase; player selects one of three upgrades.
- `between-biomes`: transition checkpoint after a biome is completed.
- `victory` / `game-over`: terminal states after full completion or core destruction.
- Entering a new run resets run-scoped state while preserving persistent save values.
- During active waves, combat view can flip between `build` and `wave` to support tactical placement and direct fighting in the same encounter window.

## Key Rules

- Wave start is valid only when not already in an active wave and not in upgrade choice lock.
- Upgrade mode blocks new wave starts until one upgrade is selected.
- Build/combat view toggling is only allowed while a wave is active.
- Run ends in defeat if core health reaches zero.
- Run ends in victory after clearing the final biome sequence.

## Dependencies

- Runtime orchestration: [GameApp](../../src/game/GameApp.ts)
- Wave pacing and completion logic: [WaveDirector](../../src/game/systems/WaveDirector.ts)
- Mode gating helpers: [gameplayRules](../../src/game/systems/gameplayRules.ts)
- Related specs:
  - [Enemies, Waves, and Bosses](./enemies-waves-and-bosses.md)
  - [Upgrades and Synergies](./upgrades-and-synergies.md)
  - [Meta Progression and Save](./meta-progression-and-save.md)

## Tuning Notes

- Fixed simulation timestep and capped frame delta stabilize behavior across frame rates.
- Wave clear delay provides a readability pause before mode transition.
- Starting resources, core health, and wave count per biome define baseline run length and pressure.
