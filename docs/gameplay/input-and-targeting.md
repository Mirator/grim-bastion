# Input and Targeting

## Purpose

Describe how keyboard/mouse input is sampled and converted into movement, combat, build, and UI actions.

## What It Does

- Samples keyboard and mouse state every frame.
- Separates held inputs (movement/buttons) from transient one-shot actions (mode toggles, hotkeys, utility actions).
- Converts pointer to NDC and raycasts for reticle-ground/world targeting.
- Routes digit hotkeys contextually to build slots or upgrade picks.

## How It Works

- Movement:
  - `WASD` / arrow keys drive camera-relative movement axes.
- Mouse buttons:
  - `LMB` held sets `firePrimary`.
  - `RMB` held sets `fireSecondary`.
  - In `build`, `LMB` places selected defense and `RMB` sells nearest defense.
  - Outside `build`, `LMB` drives hero primary fire.
- Ability and action keys:
  - `Q` / `E`: ability 1 / ability 2 (tap or hold).
  - `Shift`: dash (transient trigger).
  - `Space`: jump (transient trigger).
  - `R`: cycle weapon.
  - `L`: switch loadout preset.
  - `F`: toggle fullscreen.
- Mode/run control keys (strict separation):
  - `N`: wave-start signal only.
  - `B`: combat-view toggle signal only.
- Run start UI:
  - Menu and terminal overlays expose the only run-start button.
- Build selection controls:
  - `1-8` map to zero-based build slots in `build`.
  - `[` / `]` cycle build selection in `build`.
  - Mouse wheel cycles build selection direction.
- Upgrade selection controls:
  - In `upgrade`, digit hotkeys map only `1-3` to choice indexes `0-2`.
- Pointer handling:
  - Pointer lock is requested on keydown/mousedown/click only while the run is interactive.
  - If pointer lock is unavailable, absolute cursor position is still sampled.
  - Browser blur clears keys/buttons/transients to avoid stuck inputs.

## Key Rules

- Build placement/sell actions are mode-gated to `build`.
- Digit hotkeys are mode-routed (`build` slots vs `upgrade` picks).
- `menu`, `game-over`, and `victory` block run interaction and pointer-lock requests.
- `N` no longer starts runs from terminal modes.
- `B` only toggles view in toggle-eligible in-run modes.
- Input transients are consumed once per sample.

## Dependencies

- Input capture and state sampling: [InputController](../../src/game/systems/InputController.ts)
- Digit/mode routing and aiming helpers: [gameplayRules](../../src/game/systems/gameplayRules.ts)
- Reticle frame construction: [reticleFrame](../../src/game/systems/reticleFrame.ts)
- Screen-to-world aim sampling: [Renderer3D](../../src/game/render/Renderer3D.ts)
- Runtime action integration: [GameApp](../../src/game/GameApp.ts)
- Related specs:
  - [Run Loop and Modes](./run-loop-and-modes.md)
  - [Hero Combat and Loadouts](./hero-combat-and-loadouts.md)
  - [Defenses, Towers, and Traps](./defenses-towers-and-traps.md)

## Tuning Notes

- Build interaction feel is mainly controlled by sell radius, spacing limits, and preview validation cadence.
- Pointer-lock sensitivity is camera-side tuning; input sampling remains stable in both lock and unlocked modes.
- Context gating (build-only placement/sell, upgrade-only 1-3 picks) prevents accidental cross-mode actions.
