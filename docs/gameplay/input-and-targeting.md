# Input and Targeting

## Purpose

Describe how player input is captured, translated into game actions, and resolved into valid world targets.

## What It Does

- Samples keyboard and mouse input each frame.
- Splits continuous controls (movement, held fire) from transient controls (mode toggles, upgrade picks).
- Converts screen pointer coordinates into grounded world-space reticle coordinates.
- Selects nearby build nodes for placement/sell interactions.

## How It Works

- Movement uses directional axes from `WASD`/arrow keys.
- Primary and secondary mouse buttons map to context-sensitive actions:
  - In `build`, primary places and secondary sells.
  - Outside `build`, primary drives hero attacks.
- Action keys trigger mode and utility controls:
  - `B` toggles build/combat view during active waves.
  - `N` starts wave (or run from menu path).
  - `1`/`2`/`3` confirm upgrade choices during upgrade phase.
  - `R`, `L`, and `F` handle weapon cycle, loadout switch, and fullscreen.
- Mouse position is normalized to NDC and raycast to arena ground.
- Reticle frame keeps one shared world target for both placement selection and ability targeting.
- Build node selection snaps to the nearest node within a small snap radius.

## Key Rules

- Pointer lock is optional and improves relative aiming without being required.
- Transient actions are consumed once per sample to avoid accidental repeated toggles.
- Build interactions require `build` mode and a valid selected node.
- Input is cleared on browser blur to prevent stuck movement/fire states.

## Dependencies

- Input capture: [InputController](../../src/game/systems/InputController.ts)
- Reticle snap/select: [reticleFrame](../../src/game/systems/reticleFrame.ts)
- Screen-to-ground projection: [Renderer3D](../../src/game/render/Renderer3D.ts)
- Mode/action integration: [GameApp](../../src/game/GameApp.ts)
- Related specs:
  - [Run Loop and Modes](./run-loop-and-modes.md)
  - [Hero Combat and Loadouts](./hero-combat-and-loadouts.md)
  - [Defenses, Towers, and Traps](./defenses-towers-and-traps.md)

## Tuning Notes

- Node snap radius controls build UX precision vs forgiveness.
- Pointer lock behavior can be tuned for desktop feel without changing core targeting logic.
- Context gating (for example, build-only placement) is the primary safeguard against unintended actions.
