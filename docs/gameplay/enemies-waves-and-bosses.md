# Enemies, Waves, and Bosses

## Purpose

Describe enemy roles, wave queue behavior, biome pacing, and boss escalation exactly as implemented.

## What It Does

- Converts biome wave templates into timed spawn queues.
- Spawns enemy archetypes with wave scaling and optional elite flags.
- Uses dynamic ground navigation plus lane-based flying routes.
- Resolves core reaches, enemy rewards, and wave/biome transitions.

## How It Works

- Wave spawning:
  - Starting a wave builds a spawn queue from the current template groups.
  - Each queue entry tracks `remaining`, `timer`, and `spawned` count.
  - Elite cadence uses `eliteEvery`, but the first spawned unit of a group is never elite.
  - If configured, boss spawns after all groups finish and no living boss exists.
- Enemy roles (data archetypes):
  - `grunt`: baseline lane pressure.
  - `hound`: fast unit with occasional random path-progress rollback behavior.
  - `brute`: high-health frontline.
  - `witch`: grants nearby enemies speed aura via local stacking multiplier.
  - `wisp`: flying enemy using flying lane points.
  - `juggernaut`: heavy unit; also causes extra core damage on escape and tower shockwave on death.
  - `boss`: high-health milestone enemy with scripted phase events.
- Movement and pathing:
  - Ground enemies use `NavigationGrid.sampleFlowTarget` toward core with blockers from obstacles+towers+core.
  - Flying enemies move lane-point to lane-point on `flyingPoints`.
  - Lane definitions are authored to terminate at bastion core endpoint.
  - Core reach checks use `CORE_REACH_RADIUS + collisionRadius + epsilon`.
- Boss behavior:
  - Below 66% HP: phase 2, spawns 4 grunts across available lanes.
  - Below 33% HP: phase 3, immediate tower damage pulse in radius.
  - Phase 2+: periodic tower chip damage near boss.
- Wave completion:
  - Queue empty + no living enemies starts a `1.25s` clear delay.
  - On finish, run stats increment and reward hooks fire.
  - Wave always enters `upgrade` mode for a pick.
  - Biome-final and run-final transitions are queued, then resolved after the upgrade pick.

## Key Rules

- Escaped enemies damage core and are marked `escaped`; they do not grant kill rewards.
- Enemy reward processing only applies to `killed` outcomes.
- Boss and elite kills can trigger additional economy bonuses depending on owned upgrades.
- Biome progression and victory completion are deferred until post-upgrade transition resolution.

## Dependencies

- Wave queue and progression: [WaveDirector](../../src/game/systems/WaveDirector.ts)
- Spawn, movement, boss logic, reward cleanup: [GameApp](../../src/game/GameApp.ts)
- Pathfinding and route-block checks: [NavigationGrid](../../src/game/systems/navigationGrid.ts)
- Enemy archetypes and scaling helpers: [archetypes](../../src/game/data/archetypes.ts)
- Biome lane/hazard/wave data: [biomes](../../src/game/data/biomes.ts)
- Related specs:
  - [Run Loop and Modes](./run-loop-and-modes.md)
  - [Status Effects and Hazards](./status-effects-and-hazards.md)
  - [Economy and Rewards](./economy-and-rewards.md)

## Tuning Notes

- Primary pacing knobs: group counts, spawn intervals, and elite cadence.
- Difficulty scaling uses `waveHealthScale` and `waveGoldScale`, with per-biome speed bias.
- Clear-delay timing balances readability against momentum.
