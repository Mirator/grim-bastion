# Defenses, Towers, and Traps

## Purpose

Explain how the player's automated defense layer is built, operated, and adapted during a run.

## What It Does

- Lets players convert gold into persistent lane control through towers and traps.
- Supports different defense jobs: single-target pressure, crowd control, area burst, and support.
- Enables tactical pivots through selling and rebuilding.

## How It Works

- Placement:
  - Towers and traps both use freeform placement at reticle ground position.
  - Placement is valid only when gold is sufficient, position is outside core buffer, spacing from existing defenses is respected, and map obstacles are avoided.
  - Towers are rejected if placement would fully block enemy ground routes to core.
  - Traps do not act as path blockers and are exempt from route-block checks.
  - Build preview state exposes validity, block reason, and nearest sell target.
- Tower behavior:
  - Towers attack on cooldown once a valid target is found in range.
  - Target scoring favors lane progress and higher-priority threats (elite/boss pressure).
  - Tower families:
    - `ballista`: focused projectile damage.
    - `frost-obelisk`: sustained slow/freeze setup.
    - `bombard`: area splash and combo opener.
    - `arc-tower`: chain pressure in dense waves.
    - `shrine`: support aura that buffs nearby towers.
- Trap behavior:
  - Traps trigger from enemy proximity and then enter cooldown.
  - `spike-trap`: burst hit.
  - `push-trap`: path setback plus control.
  - `flame-trap`: creates burn zone pressure.
- Selling:
  - Selling targets the nearest defense within reticle sell radius.
  - Selling returns part of base cost.
  - Economy upgrades can improve refund value.

## Key Rules

- Build/sell actions are mode-gated to `build`.
- Gold affordability is checked before placement.
- No-build radius around core prevents defense clipping/stacking on the objective.
- Minimum spacing rule prevents defense overlap.
- Shrine behavior is non-attacking support; value comes from cluster amplification.
- Trap triggers generally ignore flying enemies to preserve enemy-role contrast.

## Dependencies

- Placement, targeting, and defense updates: [GameApp](../../src/game/GameApp.ts)
- Placement helper rules: [buildPlacement](../../src/game/systems/buildPlacement.ts)
- Tower/trap costs and baseline stats: [archetypes](../../src/game/data/archetypes.ts)
- Lane data for lane assignment on placed defenses: [biomes](../../src/game/data/biomes.ts)
- Related specs:
  - [Input and Targeting](./input-and-targeting.md)
  - [Enemies, Waves, and Bosses](./enemies-waves-and-bosses.md)
  - [Economy and Rewards](./economy-and-rewards.md)
  - [Upgrades and Synergies](./upgrades-and-synergies.md)

## Tuning Notes

- Placement economy hinges on base cost, refund factors, and upgrade-driven discounts.
- Freeform placement feel is controlled by spacing radius, sell radius, and core-buffer radius.
- Target scoring and tower range are core knobs for late-wave reliability.
- Shrine aura radius and buff scaling strongly shape "cluster" vs "spread" defense metas.
