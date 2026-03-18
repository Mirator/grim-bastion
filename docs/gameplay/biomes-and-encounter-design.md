# Biomes and Encounter Design

## Purpose

Capture how each biome defines spatial challenges, lane topology, hazard pressure, and wave identity.

## What It Does

- Provides structured progression from simpler to more complex encounter layouts.
- Changes tactical planning through lane count, build node distribution, and hazard placement.
- Gives each biome a distinct combat rhythm and strategic emphasis.

## How It Works

- Biome composition:
  - Lanes define ground/flying path routes.
  - Build nodes define legal defense positions and tower/trap permissions.
  - Hazards add ambient lane pressure.
  - Wave templates define spawn groups, cadences, and boss timing.
- Biome sequence:
  - `Ruined Gate`: single-lane onboarding with early pressure fundamentals.
  - `Frozen Pass`: split-lane pressure and stronger control-space decisions.
  - `Blight Marsh`: multi-lane chaos with heavier mixed-threat pacing.
- Transition behavior:
  - Completing final wave in a biome grants transition rewards.
  - Node set syncs to the next biome's layout before new wave planning.

## Key Rules

- Biome data is authoritative for lane paths, node placement, and hazards.
- Flying enemies follow biome flying paths rather than ground paths.
- Node permissions can force strategic variety (tower-only or trap-only placements).
- Biome completion is wave-template driven, not time driven.

## Dependencies

- Biome source data: [biomes](../../src/game/data/biomes.ts)
- Wave transition and node sync flow: [WaveDirector](../../src/game/systems/WaveDirector.ts)
- Runtime usage of biome lanes/nodes/hazards: [GameApp](../../src/game/GameApp.ts)
- Visual feedback hooks: [Renderer3D](../../src/game/render/Renderer3D.ts)
- Related specs:
  - [Enemies, Waves, and Bosses](./enemies-waves-and-bosses.md)
  - [Defenses, Towers, and Traps](./defenses-towers-and-traps.md)
  - [Status Effects and Hazards](./status-effects-and-hazards.md)

## Tuning Notes

- Lane count and path overlap are the strongest knobs for cognitive load and required rotation speed.
- Node density influences whether runs favor concentrated kill-zones or distributed safety nets.
- Hazard intensity should shape behavior, not fully solve or invalidate lane defense choices.
