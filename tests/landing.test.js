"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function createFlight() {
    const context = vm.createContext({});
    const root = path.resolve(__dirname, "..");
    for (const relativePath of ["src/scope/Manifest.js", "src/model/Landing.js"]) {
        vm.runInContext(fs.readFileSync(path.join(root, relativePath), "utf8"),
            context, { filename: relativePath });
    }
    return new context.lnulander.model.Landing();
}

test("gravity causes the lander to fall", () => {
    const ship = createFlight();
    const start = ship.y;
    ship.tick({ up: false, left: false, right: false });
    assert.ok(ship.y > start);
    assert.equal(ship.status, "flying");
});

test("upward thrust consumes fuel and slows descent", () => {
    const ship = createFlight();
    ship.tick({ up: true, left: false, right: false });
    assert.ok(ship.vy < 0);
    assert.equal(ship.fuel, 349);
    assert.equal(ship.thrusting, true);
});

test("lateral controls alter horizontal velocity", () => {
    const ship = createFlight();
    ship.tick({ up: false, left: true, right: false });
    assert.ok(ship.vx < 0);
    ship.tick({ up: false, left: false, right: true });
    assert.ok(ship.vx > -0.05);
});

test("safe, centered touchdown wins", () => {
    const ship = createFlight();
    ship.x = 242;
    ship.y = 41;
    ship.vy = 0.25;
    ship.tick({ up: false, left: false, right: false });
    assert.equal(ship.status, "landed");
    assert.equal(ship.y, 41);
});

test("touching the roof outside the pad crashes", () => {
    const ship = createFlight();
    ship.x = 80;
    ship.y = 51;
    ship.vy = 0.25;
    ship.tick({ up: false, left: false, right: false });
    assert.equal(ship.status, "crashed");
});

test("excessive touchdown speed crashes", () => {
    const ship = createFlight();
    ship.x = 242;
    ship.y = 41;
    ship.vy = 1.5;
    ship.tick({ up: false, left: false, right: false });
    assert.equal(ship.status, "crashed");
});

test("reset restores the initial flight", () => {
    const ship = createFlight();
    ship.status = "crashed";
    ship.fuel = 0;
    ship.reset();
    assert.equal(ship.status, "flying");
    assert.equal(ship.fuel, 350);
    assert.equal(ship.y, 4);
});

test("fuel cannot become negative", () => {
    const ship = createFlight();
    ship.fuel = 0.1;
    ship.tick({ up: true, left: true, right: true });
    assert.ok(ship.fuel >= 0);
    assert.equal(ship.thrusting, false);
});


test("H-house pad boundaries require the whole craft to be above the pad", () => {
    const ship = createFlight();
    ship.x = 265;
    ship.y = 41;
    ship.vy = 0.3;
    ship.tick({ up: false, left: false, right: false });
    assert.equal(ship.status, "crashed");
});


test("partially overlapping the raised H pad causes a crash on its edge", () => {
    const ship = createFlight();
    ship.x = 205;
    ship.y = 41;
    ship.vy = 0.2;
    ship.tick({up: false, left: false, right: false});
    assert.equal(ship.status, "crashed");
});
