# Credits and Licenses

Current gameplay assets are mostly procedural/runtime-generated and not shipped as imported art/audio files.

## External runtime assets in current build

- **Chakra Petch** (web font)
  - Usage: Imported at runtime in [`src/style.css`](../src/style.css) via Google Fonts.
  - Source URL: <https://fonts.google.com/specimen/Chakra+Petch>
  - Delivery: `https://fonts.googleapis.com/...` stylesheet that references `fonts.gstatic.com` font files.
  - Bundled in repository: No (runtime fetch only).
  - License note: Track the license listed by Google Fonts when self-hosting or shipping offline copies.

## Policy

- Record source URL, author/foundry, and license details here for every external asset dependency.
- For gameplay art/audio imports, prefer CC0/Public Domain unless an exception is approved.
