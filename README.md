# LNU Lander

Retro 2D landing game built with [Rune SDK](https://github.com/VectorPanic/rune-sdk). The landing goal is **H-husets tak** at Linnéuniversitetet, Växjö.

Version **0.2.0** uses the approved pixel-art concept image of the H building. The background is derived from that image with the stationary craft removed; the movable bright-yellow spacecraft and its flag are isolated from the same image. This is a stylized game representation, not an architectural survey.

## Play

Control the spacecraft in low gravity. Land inside the **marked H rooftop landing pad** slowly enough to survive. Fuel is limited.

- **Up / Space / W**: thrust upward
- **Left / Right** or **A / D**: horizontal steering
- **R**: restart after landing or crashing

## Download a working browser build

Open the latest **Browser playtest** workflow under GitHub Actions. Download the `LNU-Lander-Web` artifact and unzip it. Double-click `index.html` to play locally. No Terminal or macOS app installation is required.

## Development and checks

```bash
npm install
npm run check
npm run build
npm run web:package
npm run web:verify
npm test
```

`npm test` launches Rune's debug Electron build; `npm run check` runs the unit tests and syntax checks.

The **macOS playtest build** workflow captures a renderer screenshot and checks a pixel in the H-house facade to prove that the approved image loaded in Rune. It still creates unsigned Electron packages: a successful CI build does **not** mean macOS Gatekeeper will permit installation. Prefer the browser artifact until Apple notarization is configured.

## Source layout

- `asset/h-house.webp`: reduced pixel-art background from the approved mockup
- `asset/lander.png`: yellow lander including the flag, extracted from the mockup
- `asset/flame.png`: standalone engine exhaust
- `src/model/Landing.js`: deterministic physics and H-rooftop collision
- `src/scene/Game.js`: Rune display objects, controls and telemetry
- `src/system/Main.js`: Rune application configuration
- `lib/rune.js`: Rune SDK pinned to upstream commit `15dfb1b6d8e8dba42325f47f54766b44c12ba649`

Code follows the project's Rune Tools layout and ES5 source style. No official university affiliation is claimed.
