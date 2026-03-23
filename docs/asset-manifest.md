# Asset Manifest

This project is primarily procedural/runtime-generated for gameplay visuals and SFX.

## Visual Assets

- Tower, enemy, trap, hero, and environment meshes are generated at runtime from Three.js primitives.
- No external model packs are currently bundled in the repository.
- UI currently imports an external web font at runtime:
  - `Chakra Petch` via Google Fonts (`fonts.googleapis.com` -> `fonts.gstatic.com`).
  - The font file is not vendored in this repo.

## Audio Assets

- Sound effects are generated at runtime as procedural WAV buffers and played through Howler.
- No external audio packs are bundled in the repository.

## License Policy

- Any non-procedural external assets (models, textures, audio, fonts) must be recorded in `docs/CREDITS.md`.
- For gameplay art/audio content, prefer CC0/Public Domain sources unless explicitly approved otherwise.
- Runtime third-party web assets (such as hosted fonts) must include source URL and license notes in credits.
