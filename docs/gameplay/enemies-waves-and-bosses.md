# Enemies, Waves, and Bosses

## Purpose

Describe hostile encounter structure: enemy archetypes, wave spawning, boss escalation, and core pressure patterns.

## What It Does

- Converts biome wave templates into live spawn queues.
- Defines enemy roles and movement behavior across lanes.
- Escalates difficulty through elite cadence and boss checkpoints.
- Delivers run stakes by threatening the bastion core.

## How It Works

- Wave spawning:
  - Wave templates define enemy groups, counts, intervals, lane IDs, and optional bosses.
  - Start of wave builds a queue and tracks estimated remaining enemies.
  - Group entries spawn over time until exhausted.
  - Bosses spawn after group completion when configured.
- Enemy roles:
  - `grunt`: baseline pressure unit.
  - `hound`: fast lane progress and occasional surge behavior.
  - `brute`: high-health frontline.
  - `witch`: local aura support to nearby enemies.
  - `wisp`: flying threat that follows flying paths.
  - `juggernaut`: heavy threat with extra punishment on contact/death events.
  - `boss`: phase-based milestone enemy.
- Movement and pathing:
  - Enemies advance lane points by nearest next waypoint progression.
  - Speed is influenced by statuses and support aura effects.
- Boss pacing:
  - Boss phase thresholds add encounter spikes such as reinforcement summons and tower pressure pulses.
- Wave completion:
  - Queue exhaustion plus no living enemies triggers a short clear delay, then transition to upgrade.

## Key Rules

- Escaped enemies damage the core and are not rewarded as kills.
- Elite and boss tags increase target priority and reward implications.
- Wave cannot be completed until both queue and current enemies are fully resolved.
- End-of-wave always routes into upgrade choice before next wave progression.

## Dependencies

- Wave queue lifecycle: [WaveDirector](../../src/game/systems/WaveDirector.ts)
- Enemy creation and behavior updates: [GameApp](../../src/game/GameApp.ts)
- Enemy stat templates and scaling: [archetypes](../../src/game/data/archetypes.ts)
- Biome wave template data: [biomes](../../src/game/data/biomes.ts)
- Related specs:
  - [Run Loop and Modes](./run-loop-and-modes.md)
  - [Status Effects and Hazards](./status-effects-and-hazards.md)
  - [Economy and Rewards](./economy-and-rewards.md)

## Tuning Notes

- Primary pacing knobs are spawn interval, group count, elite frequency, and boss placement.
- Health/gold scaling functions shape long-run pressure and economy cadence.
- Clear delay should be long enough for readability and short enough to keep run momentum.
