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

test("the existing painted left tree obstructs the approach", () => {
    const L = makeLander(), ship = new L();
    assert.equal(ship.x, 85);
    assert.equal(L.overlapsTree(ship.x, ship.y), false);
    assert.ok(L.TREE_CROWNS.every(c => c.x + c.rx < 430));
    assert.ok(L.TREE_CROWNS.every(c => c.y >= 530));
});

test("falling into the tree crown causes a real crash", () => {
    const L = makeLander(), ship = new L();
    ship.x = 150; ship.y = 660; ship.vx = 0; ship.vy = 2;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status, "crashed");
    assert.equal(ship.crashReason, "tree");
});

test("the painted trunk also causes a crash", () => {
    const L = makeLander(), ship = new L();
    ship.x = 25; ship.y = 1020; ship.vx = 0; ship.vy = 1;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status, "crashed");
    assert.equal(ship.crashReason, "tree");
});

test("the tree can be avoided with early steering", () => {
    const L = makeLander(), ship = new L();
    assert.equal(L.overlapsTree(85,80), false);
    assert.equal(L.overlapsTree(500,760), false);
    assert.equal(L.overlapsTree(955,L.PAD_Y-L.HEIGHT), false);
    ship.x = 520; ship.y = 700;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status, "flying");
});

test("retry resets safely above the tree", () => {
    const L = makeLander(), ship = new L();
    ship.x = 150; ship.y = 660;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.crashReason, "tree");
    ship.reset();
    assert.equal(ship.crashReason, "");
    assert.equal(ship.status, "flying");
    assert.equal(L.overlapsTree(ship.x,ship.y),false);
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

test("v0.5.2: left painted tree collision does not block the runway", () => {
    const L = makeLander();
    assert.ok(L.TREE_CROWNS.every(c => c.x < 400));
    assert.equal(L.TREE_TRUNK.left, 65);
    assert.equal(L.TREE_TRUNK.right, 110);
    assert.equal(L.overlapsTree(630, 950), false);
    assert.equal(L.overlapsTree(970,L.PAD_Y-L.HEIGHT), false);
});

test("all foreground trees in the painted H-house landscape have hitboxes", () => {
    const L = makeLander();
    assert.equal(L.TREES.length, 3);
    const ids = Array.from(L.TREES, tree => tree.id);
    assert.deepEqual(ids, ["left-oak", "right-oak", "right-sapling"]);
    for (const tree of L.TREES) {
        assert.ok(tree.crowns.length >= 2);
        assert.ok(tree.trunks.length >= 1);
        assert.ok(tree.crowns.every(c => c.rx > 0 && c.ry > 0));
        assert.ok(tree.trunks.every(r => r.left < r.right && r.top < r.bottom));
    }
});

test("large right-hand tree crown is solid and registers the right tree", () => {
    const L = makeLander(), ship = new L();
    ship.x = 1450;
    ship.y = 655;
    ship.vx = 0; ship.vy = 1;
    ship.tick({up:false, left:false, right:false});
    assert.equal(ship.status, "crashed");
    assert.equal(ship.crashReason, "tree");
    assert.equal(ship.collisionTree, "right-oak");
});

test("large right-hand tree trunk is solid", () => {
    const L = makeLander();
    const oak = L.TREES.find(tree => tree.id === "right-oak");
    assert.equal(L.overlapsTreeShape(oak, 1520, 1120), true);
});

test("small right-hand tree has separate canopy and trunk hitboxes", () => {
    const L = makeLander();
    const sapling = L.TREES.find(tree => tree.id === "right-sapling");
    assert.equal(L.overlapsTreeShape(sapling, 1470, 1010), true);
    assert.equal(L.overlapsTreeShape(sapling, 1415, 1000), true);
    assert.equal(L.overlapsTreeShape(sapling, 1150, 1050), false);
});

test("steering clear of all trees permits a safe landing on the pad", () => {
    const L = makeLander(), ship = new L();
    for (let x = 900; x <= 995; x += 19) {
        assert.equal(L.treeHitAt(x, L.PAD_Y - L.HEIGHT), null);
    }
    ship.x = 945;
    ship.y = L.PAD_Y - L.HEIGHT;
    ship.vx = 0; ship.vy = 0.4;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status, "landed");
});

test("reset removes tree identity, preventing stale crash messages", () => {
    const L = makeLander(), ship = new L();
    ship.x = 1450;
    ship.y = 655;
    ship.vx = 0; ship.vy = 1;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.collisionTree, "right-oak");
    ship.reset();
    assert.equal(ship.collisionTree, "");
    assert.equal(ship.status, "flying");
});

test("all tree hitboxes are unaffected by Rune camera zoom", () => {
    const L = makeLander();
    const touching = [ [150,660], [1450,655] ];
    for (const [x,y] of touching) {
        const before = L.treeHitAt(x,y);
        assert.ok(before);
        assert.equal(L.zoomForAltitude(100), L.WIDE_ZOOM);
        assert.equal(L.treeHitAt(x,y), before);
        assert.ok(L.zoomForAltitude(1100) > L.WIDE_ZOOM);
        assert.equal(L.treeHitAt(x,y), before);
    }
});

test("ship hitbox follows the solid fuselage and feet, not its transparent rectangle", () => {
    const L = makeLander();
    assert.ok(L.HULL_PARTS.length >= 3);
    assert.ok(L.HULL_PARTS.every(p => p.rx > 0 && p.ry > 0));
    assert.ok(L.HULL_PARTS.every(p => p.x - p.rx >= 0 && p.y - p.ry >= 0));
    assert.ok(L.HULL_PARTS.every(p => p.x + p.rx <= L.WIDTH && p.y + p.ry <= L.HEIGHT));
});

test("empty sky beside the right tree no longer causes an invisible collision", () => {
    const L = makeLander();
    for (const pos of [[1280,530],[1300,600],[1160,560],[1350,510]]) {
        assert.equal(L.treeHitAt(pos[0],pos[1]),null,
            "unexpected tree contact for clear-air craft at " + pos);
    }
});

test("visible contact with right tree and left tree still causes a crash", () => {
    const L = makeLander();
    assert.equal(L.treeHitAt(1450,655),"right-oak");
    assert.equal(L.treeHitAt(150,660),"left-oak");
});

test("flag height alone does not make empty-space tree contact", () => {
    const L = makeLander();
    const oak = L.TREES.find(tree => tree.id === "right-oak");
    assert.equal(L.overlapsTreeShape(oak,1320,490),false);
});

test("visible hull contacts tree trunk while near misses do not", () => {
    const L = makeLander();
    const oak = L.TREES.find(tree => tree.id === "right-oak");
    assert.equal(L.m_ellipseHitsRect({x:1590,y:1150,rx:35,ry:40},oak.trunks[0]),true);
    assert.equal(L.m_ellipseHitsRect({x:1400,y:1150,rx:35,ry:40},oak.trunks[0]),false);
});

test("left world edge at high altitude no longer causes an invisible crash", () => {
    const L = makeLander(), ship = new L();
    ship.x = 0.1;
    ship.y = L.PAD_Y - L.HEIGHT - 870;
    ship.vx = -3.5;
    ship.vy = 0.2;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.x, 0);
    assert.equal(ship.vx, 0);
    assert.equal(ship.status, "flying");
    assert.equal(ship.crashReason, "");
    assert.equal(L.treeHitAt(ship.x, ship.y), null);
});

test("holding left at the invisible edge does not repeatedly crash", () => {
    const L = makeLander(), ship = new L();
    ship.x = 0;
    ship.y = 174;
    for (let i = 0; i < 40; i++) {
        ship.tick({up:false,left:true,right:false});
        assert.equal(ship.status, "flying", "crashed on tick " + i);
        assert.equal(ship.x, 0);
        assert.equal(ship.vx, 0);
    }
    assert.ok(ship.fuel < L.INITIAL_FUEL);
});

test("ship can steer right away from the world edge and resume flying", () => {
    const L = makeLander(), ship = new L();
    ship.x = 0;
    ship.y = 174;
    ship.vx = -2;
    ship.tick({up:false,left:false,right:true});
    assert.equal(ship.status, "flying");
    assert.equal(ship.x, 0);
    ship.tick({up:false,left:false,right:true});
    assert.ok(ship.x > 0);
    assert.ok(ship.vx > 0);
});

test("right world edge also stops rather than exploding in visible sky", () => {
    const L = makeLander(), ship = new L();
    ship.x = L.WORLD_WIDTH - L.WIDTH - 0.2;
    ship.y = 85;
    ship.vx = 3.5;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.x, L.WORLD_WIDTH - L.WIDTH);
    assert.equal(ship.vx, 0);
    assert.equal(ship.status, "flying");
});

test("actual tree contact remains lethal after edge correction", () => {
    const L = makeLander(), ship = new L();
    ship.x = 1450;
    ship.y = 655;
    ship.vx = 0;
    ship.vy = 1;
    ship.tick({up:false,left:false,right:false});
    assert.equal(ship.status, "crashed");
    assert.equal(ship.crashReason, "tree");
});
