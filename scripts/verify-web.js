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
console.log("Web bundle contains the Rune runtime, game and required files");
