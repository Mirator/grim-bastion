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

- `WASD` move hero (camera-relative)
- Mouse look (pointer lock), center crosshair aim, `LMB` attack, `RMB` sell in build mode
- `Q` / `E` cast loadout abilities
- `Shift` dash
- `Space` jump
- `R` cycle weapon
- `L` switch ability loadout preset
- `1-8` select build item, `[` / `]` cycle build selection
- `B` toggle build/combat mode
- `N` start wave
- `1/2/3` pick upgrades in upgrade phase
- `F` toggle fullscreen, `Esc` exit fullscreen

## Automation hooks

- `window.render_game_to_text(): string`
- `window.advanceTime(ms: number): void`

## Notes

- Uses procedural visuals/audio by default. See `docs/asset-manifest.md` and `docs/CREDITS.md` for asset policy.
