# Grim Bastion

Low-poly 3D roguelite tower-defense + action prototype built with Three.js + TypeScript.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build and tests

```bash
npm run build
npm test
```

## Controls

- `WASD` / arrow keys move hero (camera-relative)
- Mouse look (pointer lock when available), center crosshair aim
- `LMB`: attack outside `build`; place selected defense in `build`
- `RMB`: sell nearest defense in `build`
- `Q` / `E`: cast current loadout abilities
- `Shift`: dash
- `Space`: jump
- `R`: cycle weapon
- `L`: switch loadout preset
- `1-8`: select build slot in `build`; in `upgrade`, `1/2/3` pick upgrade card
- `[` / `]` and mouse wheel: cycle build selection in `build`
- `Enter`: start run (`menu`/`game-over`/`victory`)
- `N`: start wave in run-eligible modes (`build`, `wave`, `between-biomes`)
- `B`: toggle `build`/`wave` view in run-eligible modes (`between-biomes` routes to `build`)
- `F`: toggle fullscreen (`Esc` exits fullscreen)

## Automation hooks

- `window.render_game_to_text(): string`
- `window.advanceTime(ms: number): void`

## Notes

- Gameplay visuals/audio are procedural by default.
- UI currently imports `Chakra Petch` from Google Fonts at runtime.
- See [Asset Manifest](./docs/asset-manifest.md) and [Credits](./docs/CREDITS.md) for asset/license tracking.
