# Run Loop and Modes

## Purpose

Define the top-level structure of a run, including mode transitions, start controls, and wave/biome progression rules.

## What It Does

- Establishes the playable lifecycle from pre-run to victory/defeat.
- Splits player intent into phase-specific behavior (planning, fighting, upgrading, transitioning).
- Encodes strict input responsibilities for run start, wave start, and view toggling.
- Applies wave-clear and biome-clear transitions with post-upgrade routing.

## How It Works

- Modes:
  - `menu`: initial state before run start.
  - `build`: freeform placement/sell planning.
  - `wave`: active combat/spawn simulation.
  - `upgrade`: post-wave draft selection state.
  - `between-biomes`: biome transition checkpoint.
  - `victory` / `game-over`: terminal states.
- Run start controls:
  - `Start` on the menu overlay triggers run-start only.
  - `Restart Run` on terminal overlays triggers run-start only.
- Wave start controls:
  - `N` emits wave-start only.
  - `Start Wave` UI button triggers wave-start only.
  - Wave start does nothing from terminal modes (`menu`, `game-over`, `victory`).
- Combat view toggling:
  - `B` and `Toggle Build` UI button toggle only where combat view toggling is allowed.
  - Allowed modes for toggling: `build`, `wave`, `between-biomes`.
- Wave start behavior:
  - Wave start is blocked while `wave.active` is true and while in `upgrade`.
  - From `between-biomes`, wave start first sets mode to `build`, then starts the next wave.
- Wave completion flow:
  - Queue exhaustion + no living enemies for 1.25s triggers wave finish.
  - Wave clear grants rewards and rolls 3 upgrade choices.
  - Player selects one upgrade in `upgrade`, then transition resolves:
    - normal wave -> `build`
    - biome-final wave (non-final biome) -> `between-biomes`
    - final biome completion -> `victory`

## Key Rules

- `canToggleCombatView` only allows toggling in `build`, `wave`, and `between-biomes`.
- `upgrade` mode blocks wave start until one upgrade is picked.
- Biome and run completion transitions are deferred until after upgrade selection.
- Defeat occurs when core health reaches 0.
- Victory occurs after final-wave upgrade pick resolves final completion.

## Dependencies

- Runtime orchestration and mode/input integration: [GameApp](../../src/game/GameApp.ts)
- Wave lifecycle and biome progression: [WaveDirector](../../src/game/systems/WaveDirector.ts)
- Mode toggle helpers: [gameplayRules](../../src/game/systems/gameplayRules.ts)
- Related specs:
  - [Enemies, Waves, and Bosses](./enemies-waves-and-bosses.md)
  - [Upgrades and Synergies](./upgrades-and-synergies.md)
  - [Meta Progression and Save](./meta-progression-and-save.md)

## Tuning Notes

- Fixed-timestep simulation (`1/60`) and capped frame delta (`1/20`) keep run pacing stable.
- Wave clear delay (`1.25s`) controls readability between combat and transitions.
- Starting resources, wave rewards, and biome rewards shape run length and pressure ramp.
