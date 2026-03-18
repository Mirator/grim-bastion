# HUD and Feedback

## Purpose

Describe how gameplay-critical information is surfaced so players can make fast, informed decisions.

## What It Does

- Displays real-time combat, economy, and run progression data.
- Exposes build controls and upgrade choice interaction points.
- Provides spatial awareness through minimap and world highlights.
- Reinforces events with audio and visual cues.

## How It Works

- HUD panels:
  - Resources panel: gold, mana, essence, and core health.
  - Wave panel: biome context, wave progress, enemies remaining, and boss count.
  - Hero panel: health, weapon, ability cooldowns, and attack cadence context.
  - Mode/tips panels: current phase and run stat summaries.
- Action controls:
  - Buttons mirror key gameplay actions (start run, start wave, toggle build, switch loadout).
  - Build menu lists available tower/trap entries and costs.
- Upgrade overlay:
  - Appears only during `upgrade` mode.
  - Shows three card choices with category/rarity and synergy hints.
- Minimap:
  - Draws lane routes, hero position, enemies, towers, and bastion core anchor.
  - Shows core no-build radius and current build reticle marker during build mode.
- In-world feedback:
  - Build preview ring at reticle ground point shows valid/invalid/insufficient-gold states.
  - Core no-build radius ring is shown in build mode.
  - Reticle and camera lock behavior support aiming clarity.
  - Enemy rendering reflects status states (for example, shock/freeze readability).
- Audio feedback:
  - Distinct cues for fire, hits, deaths, elite warnings, boss moments, wave starts, and upgrade picks.

## Key Rules

- Upgrade overlay visibility is mode-gated and must not persist outside upgrade selection.
- Build selection state remains synchronized between HUD and simulation state.
- Feedback should prioritize actionable state over decorative effects.
- Audio cues should map to meaningful events and remain distinct under heavy combat load.

## Dependencies

- HUD construction and updates: [HudUI](../../src/game/ui/HudUI.ts)
- World-space feedback and camera behavior: [Renderer3D](../../src/game/render/Renderer3D.ts)
- Sound cue generation/playback: [AudioManager](../../src/game/audio/AudioManager.ts)
- Runtime event sources: [GameApp](../../src/game/GameApp.ts)
- Related specs:
  - [Input and Targeting](./input-and-targeting.md)
  - [Run Loop and Modes](./run-loop-and-modes.md)
  - [Defenses, Towers, and Traps](./defenses-towers-and-traps.md)

## Tuning Notes

- HUD density should be tuned for quick parsing during wave pressure.
- Minimap scale and symbol contrast should preserve lane readability on smaller displays.
- Audio volume and pitch variance should maintain clarity without fatiguing repetition.
