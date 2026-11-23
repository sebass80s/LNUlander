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
    var initial = ship.vx;
    ship.tick({up:false,left:true,right:false});
    var leftSteered = ship.vx;
    assert.ok(leftSteered < initial, "left input must reduce lateral speed");
    ship.tick({up:false,left:false,right:true});
    assert.ok(ship.vx > leftSteered, "right input must increase lateral speed");
});

test("slow touchdown fully inside the grass H-pad wins", () => {
    const L=makeLander(), ship=new L();
    ship.x=945;
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
    assert.equal(ship.y,80);
    assert.equal(ship.x,85);
    assert.equal(ship.vx,0.85);
    assert.equal(ship.crashReason,"");
    assert.equal(ship.fuel,520);
});

test("zoom stays fully wide until the ship is truly near the grass", () => {
    const L = makeLander();
    const shipYAt260Clearance = L.PAD_Y - L.HEIGHT - 260;
    assert.equal(L.zoomForAltitude(155), L.WIDE_ZOOM);
    assert.equal(L.zoomForAltitude(550), L.WIDE_ZOOM);
    assert.equal(L.zoomForAltitude(shipYAt260Clearance), L.WIDE_ZOOM);
    assert.ok(L.zoomForAltitude(shipYAt260Clearance + 25) > L.WIDE_ZOOM);
    assert.equal(L.zoomForAltitude(L.PAD_Y - L.HEIGHT - 35), L.CLOSE_ZOOM);
});

test("landing pad remains vertically visible while the camera zooms in", () => {
    const L = makeLander();
    // At an ideal centered follow position, the pad must remain within half
    // the camera viewport height, allowing the player to aim throughout.
    for (let clearance = 0; clearance <= 260; clearance += 5) {
        const shipY = L.PAD_Y - L.HEIGHT - clearance;
        const zoom = L.zoomForAltitude(shipY);
        const padFromShipCenter = clearance + L.HEIGHT / 2;
        const cameraHalfWorldHeight = (720 / zoom) / 2;
        assert.ok(padFromShipCenter <= cameraHalfWorldHeight,
            "pad goes off-screen at clearance " + clearance);
    }
    assert.ok(L.CLOSE_ZOOM < 1.2);
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
    assert.ok(zoom > 1.11, "close to ground should zoom in");

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
        assert.ok(zoom <= L.CLOSE_ZOOM);
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

test("ascent restores full wide view after a low-level approach", () => {
    const L = makeLander();
    let zoom = L.CLOSE_ZOOM;
    for (let i = 0; i < 180; i++) zoom = L.advanceCameraZoom(zoom, 300);
    assert.equal(zoom, L.WIDE_ZOOM);
});

test("spawn is well left of the landing pad and tree forces steering", () => {
    const L=makeLander(), ship=new L();
    assert.ok(ship.x + L.WIDTH < L.PAD_LEFT);
    assert.ok(ship.x + L.WIDTH < L.TREE_CROWNS[0].x);
    assert.equal(L.overlapsTree(ship.x,ship.y),false);
});

test("a direct descent through the foliage crashes into the tree", () => {
    const L=makeLander(), ship=new L();
    ship.x=620;
    ship.y=825;
    ship.vy=2;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status,"crashed");
    assert.equal(ship.crashReason,"tree");
});

test("tree trunk is solid even below the canopy", () => {
    const L=makeLander(), ship=new L();
    ship.x=684;
    ship.y=1100;
    ship.vy=1;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status,"crashed");
    assert.equal(ship.crashReason,"tree");
});

test("flying high over the tree is safe and the landing pad remains clear", () => {
    const L=makeLander(), ship=new L();
    ship.x=700;
    ship.y=360;
    ship.vy=0.5;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status,"flying");
    assert.equal(L.overlapsTree(960,L.PAD_Y-L.HEIGHT),false);
});

test("flying to the left or right of the tree is safe", () => {
    const L=makeLander();
    assert.equal(L.overlapsTree(150,820),false);
    assert.equal(L.overlapsTree(1060,820),false);
});

test("crash reason is cleared on retry", () => {
    const L=makeLander(), ship=new L();
    ship.x=620;
    ship.y=825;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.crashReason,"tree");
    ship.reset();
    assert.equal(ship.crashReason,"");
    assert.equal(ship.status,"flying");
});

test("v0.5: narrow pad has only modest room beside the lander", () => {
    const L = makeLander();
    assert.equal(L.PAD_RIGHT - L.PAD_LEFT,270);
    assert.equal((L.PAD_RIGHT - L.PAD_LEFT) - L.WIDTH,80);
    assert.ok(L.MAX_HORIZONTAL_SPEED < 1.0);
    assert.ok(L.MAX_VERTICAL_SPEED < 1.5);
});

test("v0.5: initial side drift is present but steerable", () => {
    const L=makeLander(), ship=new L();
    assert.equal(ship.vx,0.85);
    assert.ok(ship.x + L.WIDTH < L.PAD_LEFT - 550);
    ship.tick({up:false,left:true,right:false});
    assert.ok(ship.vx < 0.85);
});

test("v0.5: landing succeeds in safe 270px strip", () => {
    const L=makeLander(), ship=new L();
    ship.x=955;
    ship.y=L.PAD_Y-L.HEIGHT;
    ship.vx=0.25;
    ship.vy=0.65;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status,"landed");
});

test("v0.5: visually marked closed pad edge is not a valid landing", () => {
    const L=makeLander(), ship=new L();
    ship.x=830;
    ship.y=L.PAD_Y-L.HEIGHT;
    ship.vx=0;
    ship.vy=0.4;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status,"crashed");
});

test("v0.5: the tree crown hits and the center of the pad is unobstructed", () => {
    const L=makeLander(), ship=new L();
    assert.equal(L.overlapsTree(640,850),true);
    assert.equal(L.overlapsTree(970,L.PAD_Y-L.HEIGHT),false);
    assert.equal(L.overlapsTree(130,850),false);
});

test("v0.5.1: obstacle geometry matches the scaled tree, clear of the pad", () => {
    const L = makeLander();
    assert.equal(L.TREE_TRUNK.left, 760);
    assert.equal(L.TREE_TRUNK.right, 792);
    assert.equal(L.TREE_TRUNK.bottom, L.GROUND_Y);
    assert.ok(L.TREE_CROWNS.every(c => c.radius <= 80));
    assert.ok(L.TREE_CROWNS.every(c => c.x + c.radius < L.PAD_LEFT));
    assert.equal(L.overlapsTree(955, L.PAD_Y - L.HEIGHT), false);
    assert.equal(L.overlapsTree(620, 825), true);
    assert.equal(L.overlapsTree(150, 825), false);
});
