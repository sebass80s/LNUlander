"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const dir = path.resolve(__dirname, "..", "site");

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const script = fs.readFileSync(path.join(dir, "lnulander.js"), "utf8");
assert.match(html, /src="\.\/lnulander\.js"/);
assert.match(html, /lnulander\.bootstrap\(\)/);
assert.ok(script.length > 500000, "Rune SDK was not included in the compiled bundle");
assert.ok(fs.existsSync(path.join(dir, "style.css")));
assert.ok(fs.existsSync(path.join(dir, ".nojekyll")));
for (const asset of ["grass-world.webp", "grass-lander.png", "grass-flame.png"]) {
    assert.ok(fs.statSync(path.join(dir, "art", asset)).size > 100, asset + " missing or empty");
}
assert.match(html, /art\/grass-world\.webp/);
assert.match(html, /art\/grass-lander\.png/);
console.log("Web bundle contains the Rune runtime, game and required files");

const launcher = fs.readFileSync(path.join(dir, "SPELA-LNU-LANDER.html"), "utf8");
assert.equal(launcher, html, "named game launcher must match index.html");
assert.ok(fs.statSync(path.join(dir, "LAS-MIG.txt")).size > 100);
