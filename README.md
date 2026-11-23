# LNU Lander

A Rune SDK 2D landing game featuring the **H building** of Linnéuniversitetet in Växjö.

## Version 0.3: large world and Rune camera zoom

- Land on the marked **grass landing pad in front of H-huset**.
- The world is **1720 × 1500 world pixels**, and the game canvas is rendered natively at **1280 × 720**.
- Start zoomed out at **0.75×**. As the ship descends, the built-in [Rune `CameraViewport.zoomTo`](https://github.com/VectorPanic/rune-sdk/blob/main/src/camera/CameraViewport.js) moves smoothly toward **1.43×**.
- Camera tracking and clamped world bounds keep the lander in view. The camera-local HUD stays the same readable size.
- Background pixel detail uses the **native generated 1672 × 941 reference image without upscaling**. Additional sky above it creates more flight room. A WebP asset is bundled locally.
- The detailed yellow lander and flag are extracted as a separate transparent image. Its primary yellow is RGB(255, 255, 0).
- Canvas smoothing is enabled for fractional zoom to avoid stair-step aliasing and harsh block enlargement.

The game simulates landing speed in **pixels per 30 FPS tick**. The displayed V-SPEED is a signed engine-relative number, not a claim of physical m/s.

### Controls

- **Up / Space / W**: main thrust
- **Left / Right / A / D**: steering
- **R**: start a new attempt

Touch down fully within the marked pad at low horizontal and vertical velocity.

### Browser playtest (no Terminal needed)

Open the newest **Browser playtest** action run, download artifact **LNU-Lander-Web**, extract it, and open `index.html`. Runs offline in the browser, without a Mac app installation.

### Development

```bash
npm install
npm run check
npm run build
npm run web:package
npm run web:verify
npm test
```

`npm test` opens Rune in Electron. The CI workflow runs Node unit tests, checks browser resource packaging, opens the actual compiled web game in Electron/Chromium, and saves screenshots.

We use Rune Tools' ES5-style project structure. The SDK is pinned at upstream commit `15dfb1b6d8e8dba42325f47f54766b44c12ba649`.

The **macOS playtest build** creates unsigned Electron binaries. They are not notarized and macOS Gatekeeper may block them. Prefer the verified browser version.

The stylized building depiction is unofficial and is not an accurate architectural model. The project has no official university affiliation.

## v0.5.1 game distribution

The tree is now **smaller and positioned near ground level** so it no longer obscures the university building or landing pad. Its collision hull was reduced accordingly.

The web ZIP contains the entire playable Rune SDK game, not an image preview.
Double-click `SPELA-LNU-LANDER.html` (or `index.html`) to play, with image and script assets in adjacent paths. Do not open the individual PNG assets.

## v0.5.2: integrated obstacle, no overlay

Removed the oversized/clipped foreground sprite that was hiding the university and pad. The original tree already present on the left of the approved campus image now has solid tree/foliage collision. Steer around it early. There is no additional drawn tree, and the narrowed grass landing pad and gentle Rune camera zoom are unchanged.

## v0.5.3: collisions on all foreground trees

The trees actually painted into `grass-world.webp` now all have physics geometry. This includes the existing large left tree, the large right tree, and the smaller right-side tree visible on the grass. Their canopies use multiple circle-versus-ship hull tests and their trunks use rectangles. No new art is overlaid and no extra tree is drawn. Distant treetops behind the H-house building remain background detail, since their trunks are occluded and they are not foreground obstacles. The tree-to-ship collision check is in world coordinates, independent of camera zoom.

## v0.5.4 precision collision improvement

Tree collisions use four small ellipse hitboxes over the **actual solid portions of the lander sprite**, rather than treating the whole partly transparent 190×198 rectangular sprite as solid. The decorative flag is excluded. Painted foliage uses tighter overlapping elliptical bounds, trunks remain solid, and Rune camera zoom does not alter collision calculations. The same full game is packaged as a browser ZIP.
