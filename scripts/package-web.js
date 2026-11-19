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
    html.replace(reference, "./lnulander.js")
);
fs.copyFileSync(path.join(root, "bin", "style.css"), path.join(site, "style.css"));
fs.copyFileSync(path.join(root, "dist", "lnulander.js"), path.join(site, "lnulander.js"));
fs.writeFileSync(path.join(site, ".nojekyll"), "");
console.log("Web playtest packaged in site/");
