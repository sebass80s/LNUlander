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
    assert.equal(low,0.75);
    assert.ok(middle>low);
    assert.ok(close>middle);
    assert.ok(close<=1.43);
});

test("zoom stays inside Rune SDK viewport range at extreme altitudes", () => {
    const L=makeLander();
    for (const y of [-999,0,100,10000]) {
        const z=L.zoomForAltitude(y);
        assert.ok(z>=0.25 && z<=4);
    }
});
