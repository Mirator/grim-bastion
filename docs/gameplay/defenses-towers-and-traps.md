# Defenses, Towers, and Traps

## Purpose

Document implemented defense-layer behavior: freeform placement, tower/trap execution, and selling/refund logic.

## What It Does

- Converts gold into persistent lane control with towers and traps.
- Uses freeform reticle-ground placement instead of fixed node-only placement.
- Supports tactical rebuilding through sell/refund.
- Integrates navigation safety checks to prevent full lane lockouts by tower placement.

## How It Works

- Placement:
  - Placement point comes from reticle ground projection.
  - Validation checks: gold affordability, core build buffer, obstacle overlap, defense overlap.
  - Towers additionally run route-block validation (`wouldTowerPlacementBlockPaths`) against current ground spawns.
  - Traps do not block navigation and skip the path-block validation.
  - Placed defenses are tagged to nearest lane by polyline distance.
- Build roster (hotkey order):
  - Towers: `ballista`, `frost-obelisk`, `bombard`, `arc-tower`, `shrine`.
  - Traps: `spike-trap`, `push-trap`, `flame-trap`.
- Tower behavior:
  - Towers attack on cooldown if a target is found in range (except `shrine`).
  - Target scoring prioritizes path progress and high-threat tags.
  - `shrine` does not attack; it buffs nearby towers through aura logic.
  - Optional effects are controlled by owned upgrades (double-shot, expanded blast, lane echo, etc.).
- Trap behavior:
  - Traps only trigger from non-flying enemies.
  - `spike-trap`: direct burst damage.
  - `push-trap`: path-progress setback + slow.
  - `flame-trap`: burn application + temporary burn zone.
- Selling:
  - Sell target is nearest tower/trap within sell radius.
  - Tower refund = `baseCost * tower sellRefundFactor` (plus `economy-sell-refund` multiplier if owned).
  - Trap refund = `baseCost * 0.7` (plus `economy-sell-refund` multiplier if owned).
  - Selling towers refreshes navigation blockers immediately.

## Key Rules

- Build/sell actions are input-gated to `build` mode.
- Tower placement can be blocked by route safety checks; trap placement cannot.
- Core no-build and min-spacing checks apply to both towers and traps.
- Shrine value is support buffing, not direct attacks.
- Tower health is reduced by certain enemy/boss events but currently not destroyed by those effects (damage clamps at minimum 1 in those paths).

## Dependencies

- Placement, tower/trap update loops, selling: [GameApp](../../src/game/GameApp.ts)
- Placement validation and sell targeting helpers: [buildPlacement](../../src/game/systems/buildPlacement.ts)
- Path-block and blocker state: [navigationGrid](../../src/game/systems/navigationGrid.ts)
- Tower/trap costs and stats: [archetypes](../../src/game/data/archetypes.ts)
- Related specs:
  - [Input and Targeting](./input-and-targeting.md)
  - [Enemies, Waves, and Bosses](./enemies-waves-and-bosses.md)
  - [Economy and Rewards](./economy-and-rewards.md)
  - [Upgrades and Synergies](./upgrades-and-synergies.md)

## Tuning Notes

- Placement feel is controlled by spacing, core buffer, obstacle clearance, and sell radius.
- Tower throughput is shaped by target scoring, range multipliers, and attack cadence multipliers.
- Trap value is mostly defined by trigger radius/cooldown and non-flying gating.
