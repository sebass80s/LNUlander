# LNU Lander

An unofficial retro-inspired 2D landing game set above a **stylized, fictionalized rooftop** at Linnéuniversitetet's Växjö campus. Made with [Rune SDK](https://github.com/VectorPanic/rune-sdk).

> Prototype 0.1.0: the roof is a placeholder, **not** an accurate depiction of a specific campus building. No official LNU assets are included.

## Play

Control a tiny lander with gravity, limited fuel, and horizontal drift. Touch down **inside the green roof pad** with low vertical and horizontal velocity.

- **Up / Space:** main thrust
- **Left / Right** or **A / D:** horizontal steering
- **R:** restart

## Development

Requires Node.js 22+ and npm.

```bash
npm install
npm test             # Rune debug build in Electron
npm run check        # ES5 syntax + pure physics unit tests
npm run build        # compiled Rune distribution
npm start            # compiled release in Electron
```

The project is created from the official [Rune Tools](https://github.com/VectorPanic/rune-tools) templates. The Rune SDK distribution is checked into `lib/rune.js` at upstream commit [`15dfb1b6d8e8dba42325f47f54766b44c12ba649`](https://github.com/VectorPanic/rune-sdk/commit/15dfb1b6d8e8dba42325f47f54766b44c12ba649); it is **not** updated from the floating upstream `main` branch during builds.

If you add a sprite or scene using Rune Tools, also register the resulting file in `bin-debug/index.html`, `scripts/shell/build.sh`, and any new namespace in `src/scope/Manifest.js`.

## Builds without a local terminal

The GitHub Actions **Rune CI** workflow runs syntax checks, unit tests and the official Closure Compiler build. The **macOS playtest build** workflow packages unsigned Electron apps for Apple Silicon and Intel Macs, attached as downloadable workflow artifacts.

Unsigned apps may trigger macOS Gatekeeper. The game is not notarized or distributed via the App Store.

## Architecture

- `src/model/Landing.js`: deterministic simulation at 30 fps
- `src/scene/Game.js`: Rune scene, stage, artboards, text and keyboard
- `src/system/Main.js`: Rune application configuration
- `tests/`: Node.js unit tests, independent of Electron
- `lib/rune.js`: pinned upstream Rune SDK distribution
- `scripts/shell/`: Rune Tools' ES5 Closure Compiler scripts

No official affiliation with Linnéuniversitetet is claimed. 
