"use strict";
/**
 * Assemble the compiled Rune game for direct browser play.
 * Uses the existing Rune SDK build without introducing another engine.
 */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const site = path.join(root, "site");

const html = fs.readFileSync(path.join(root, "bin", "index.html"), "utf8");
const reference = "../dist/lnulander.js";
if (!html.includes(reference)) {
    throw new Error("The Rune Tools HTML bundle reference unexpectedly changed");
}
if (!fs.existsSync(path.join(root, "dist", "lnulander.js"))) {
    throw new Error("Build the Rune application first: npm run build");
}

fs.mkdirSync(site, { recursive: true });
fs.writeFileSync(
    path.join(site, "index.html"),
    html.replace(reference, "./lnulander.js").replace(/\.\.\/asset\//g, "./art/")
);
fs.copyFileSync(path.join(root, "bin", "style.css"), path.join(site, "style.css"));
fs.copyFileSync(path.join(root, "dist", "lnulander.js"), path.join(site, "lnulander.js"));
fs.mkdirSync(path.join(site, "art"), { recursive: true });
for (const asset of ["grass-world.webp", "grass-lander.png", "grass-flame.png"]) {
    fs.copyFileSync(path.join(root, "asset", asset), path.join(site, "art", asset));
}
// A clearly named, clickable launcher alongside the standard index.html.
// Both are complete game entrypoints with the same Rune bundle and assets.
fs.copyFileSync(path.join(site, "index.html"),
    path.join(site, "SPELA-LNU-LANDER.html"));
fs.writeFileSync(path.join(site, "LAS-MIG.txt"),
    "LNU LANDER 0.5.2\n\n" +
    "Dubbelklicka pa SPELA-LNU-LANDER.html for att spela.\n" +
    "Styr med A/D eller vanster/hoger piltangent.\n" +
    "Uppat eller mellanslag ger raketkraft. R startar om.\n" +
    "Landa langsamt pa den gula delen av paden och undvik tradet.\n");
fs.writeFileSync(path.join(site, ".nojekyll"), "");
console.log("Web playtest packaged in site/");
