"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function makeLander() {
    const sandbox = vm.createContext({});
    for (const f of ["src/scope/Manifest.js", "src/model/Landing.js"]) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, "..", f), "utf8"),
            sandbox, {filename: f});
    }
    return sandbox.lnulander.model.Landing;
}

test("native scene is dramatically larger than the old 418x235 prototype", () => {
    const L = makeLander();
    assert.equal(L.WORLD_WIDTH, 1720);
    assert.equal(L.WORLD_HEIGHT, 1500);
});

test("gravity creates a descending velocity and craft stays airborne initially", () => {
    const ship = new (makeLander())();
    ship.tick({up:false, left:false, right:false});
    assert.ok(ship.vy>0);
    assert.equal(ship.status, "flying");
});

test("thrust brakes the fall and consumes fuel", () => {
    const ship = new (makeLander())();
    ship.tick({up:true, left:false, right:false});
    assert.ok(ship.vy<0);
    assert.equal(ship.fuel, makeLander().INITIAL_FUEL-1);
});

test("steering works and no input changes the sign of acceleration", () => {
    const ship = new (makeLander())();
    ship.tick({up:false,left:true,right:false});
    assert.ok(ship.vx<0);
    ship.tick({up:false,left:false,right:true});
    assert.ok(ship.vx>-0.092);
});

test("slow touchdown fully inside the grass H-pad wins", () => {
    const L=makeLander(), ship=new L();
    ship.x=925;
    ship.y=L.PAD_Y-L.HEIGHT;
    ship.vy=0.6;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status,"landed");
    assert.equal(ship.y,L.PAD_Y-L.HEIGHT);
});

test("crashes if part of the craft clips outside the pad", () => {
    const L=makeLander(), ship=new L();
    ship.x=L.PAD_RIGHT-L.WIDTH+4;
    ship.y=L.PAD_Y-L.HEIGHT;
    ship.vy=0.4;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status,"crashed");
});

test("crashes from excessive landing velocity", () => {
    const L=makeLander(), ship=new L();
    ship.x=925;
    ship.y=L.PAD_Y-L.HEIGHT;
    ship.vy=5;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status,"crashed");
});

test("missed pad reaches grass and crashes", () => {
    const L=makeLander(), ship=new L();
    ship.x=200;
    ship.y=L.GROUND_Y-L.HEIGHT;
    ship.vy=0.5;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status,"crashed");
});

test("fuel never becomes negative and cannot fire without one full unit", () => {
    const ship = new (makeLander())();
    ship.fuel=0.2;
    ship.tick({up:true,left:true,right:true});
    assert.equal(ship.thrusting,false);
    assert.ok(ship.fuel>=0);
});

test("restart restores full fuel and initial altitude", () => {
    const ship=new (makeLander())();
    ship.status="crashed";
    ship.fuel=0;
    ship.reset();
    assert.equal(ship.status,"flying");
    assert.equal(ship.y,155);
    assert.equal(ship.fuel,560);
});

test("Rune camera zoom increases smoothly as craft approaches grass", () => {
    const L=makeLander();
    const low=L.zoomForAltitude(160);
    const middle=L.zoomForAltitude(660);
    const close=L.zoomForAltitude(1050);
    assert.equal(low,L.WIDE_ZOOM);
    assert.ok(middle>low);
    assert.ok(close>middle);
    assert.ok(close<=1.431);
});

test("zoom stays inside Rune SDK viewport range at extreme altitudes", () => {
    const L=makeLander();
    for (const y of [-999,0,100,10000]) {
        const z=L.zoomForAltitude(y);
        assert.ok(z>=0.25 && z<=4);
    }
});

test("climbing away from the landing pad reverses the camera zoom", () => {
    const L = makeLander();
    const ground = L.PAD_Y - L.HEIGHT;
    let zoom = L.WIDE_ZOOM;

    // Move toward the landing pad, allowing the actual camera easing to settle.
    for (let i = 0; i < 100; i++) {
        zoom = L.advanceCameraZoom(zoom, ground);
    }
    assert.ok(zoom > 1.42, "close to ground should zoom in");

    // Thrusting upwards reduces world y. The camera should zoom OUT again.
    const afterClimbing = L.advanceCameraZoom(zoom, 350);
    assert.ok(afterClimbing < zoom, "zoom must decrease as altitude increases");

    zoom = afterClimbing;
    for (let i = 0; i < 160; i++) {
        zoom = L.advanceCameraZoom(zoom, 100);
    }
    assert.ok(Math.abs(zoom - L.WIDE_ZOOM) < 0.001,
        "zoom should smoothly return to the original wide view");
});

test("camera zoom reverses repeatedly without hysteresis or jumping", () => {
    const L = makeLander();
    let zoom = L.zoomForAltitude(130);
    let last = zoom;
    // Descend and follow: zoom increases monotonically and is bounded.
    for (let y = 150; y <= 1000; y += 20) {
        zoom = L.advanceCameraZoom(zoom, y);
        assert.ok(zoom >= last - 1e-9);
        assert.ok(zoom <= 1.43);
        last = zoom;
    }
    // Reverse the direction: camera zoom responds to rising altitude.
    let startedZoomingOut = false;
    for (let y = 1000; y >= 100; y -= 20) {
        const next = L.advanceCameraZoom(zoom, y);
        if (next < zoom) startedZoomingOut = true;
        assert.ok(next >= L.WIDE_ZOOM && next <= L.CLOSE_ZOOM);
        zoom = next;
    }
    assert.equal(startedZoomingOut, true);
});

test("world at maximum height uses widest camera framing", () => {
    const L = makeLander();
    assert.equal(L.WIDE_ZOOM, 720 / L.WORLD_HEIGHT);
    assert.equal(L.zoomForAltitude(0), L.WIDE_ZOOM);
    assert.equal(L.zoomForAltitude(155), L.WIDE_ZOOM);
    assert.ok(1280 / L.WIDE_ZOOM > L.WORLD_WIDTH);
});
test("camera smoothly returns to its widest limit after ascent", () => {
    const L = makeLander();
    let zoom = L.CLOSE_ZOOM;
    for (let i = 0; i < 200; i++) {
        const next = L.advanceCameraZoom(zoom, 0);
        assert.ok(next <= zoom + 1e-12);
        assert.ok(next >= L.WIDE_ZOOM);
        zoom = next;
    }
    assert.equal(zoom, L.WIDE_ZOOM);
});
