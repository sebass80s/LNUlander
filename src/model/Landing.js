/**
 * Deterministic simulation in full-resolution world pixels at 30 ticks / sec.
 * Independent of Rune rendering/camera so zoom cannot alter gameplay physics.
 */
lnulander.model.Landing = function() {
    this.reset();
};
lnulander.model.Landing.WORLD_WIDTH = 1720;
lnulander.model.Landing.WORLD_HEIGHT = 1500;
lnulander.model.Landing.WIDTH = 190;
lnulander.model.Landing.HEIGHT = 198;
lnulander.model.Landing.PAD_LEFT = 915;
lnulander.model.Landing.PAD_RIGHT = 1185;
lnulander.model.Landing.PAD_Y = 1242;
lnulander.model.Landing.GROUND_Y = 1325;
lnulander.model.Landing.MAX_VERTICAL_SPEED = 1.45;
lnulander.model.Landing.MAX_HORIZONTAL_SPEED = 0.95;
lnulander.model.Landing.INITIAL_FUEL = 520;

/**
 * Collision geometry in WORLD pixels, aligned to grass-world.webp.
 *
 * A previous 142x164 rectangle surrounding the lander had massive transparent
 * gaps around its flag, legs and fuselage. Testing that rectangle against
 * overlarge circular foliage volumes caused invisible collisions.
 *
 * The lander now uses a handful of small ellipses following its actual yellow
 * fuselage, cockpit and landing feet. The cosmetic flag is not solid.
 * Each crown is a tighter ellipse, not an oversized circle. The woody trunks
 * remain solid rectangles. Game rendering, zoom and art are unchanged.
 */
lnulander.model.Landing.HULL_PARTS = [
    {x: 111, y: 133, rx: 49, ry: 42}, // yellow body
    {x: 119, y: 101, rx: 33, ry: 23}, // cabin roof
    {x: 48,  y: 172, rx: 19, ry: 12}, // left landing foot
    {x: 159, y: 172, rx: 19, ry: 12}  // right landing foot
];

lnulander.model.Landing.TREE_CROWNS = [
    {x: 115, y: 650, rx: 142, ry: 107},
    {x: 225, y: 760, rx: 132, ry: 108},
    {x: 98,  y: 895, rx: 115, ry: 108},
    {x: 292, y: 925, rx: 99,  ry: 92}
];
lnulander.model.Landing.TREE_TRUNK = {
    left: 65, right: 110, top: 930, bottom: 1255
};

lnulander.model.Landing.TREES = [
    {
        id: "left-oak",
        crowns: lnulander.model.Landing.TREE_CROWNS,
        trunks: [lnulander.model.Landing.TREE_TRUNK]
    },
    {
        id: "right-oak",
        crowns: [
            {x: 1632, y: 750, rx: 117, ry: 96},
            {x: 1517, y: 856, rx: 103, ry: 96},
            {x: 1682, y: 872, rx: 100, ry: 104},
            {x: 1582, y: 964, rx: 100, ry: 86}
        ],
        trunks: [
            {left: 1574, right: 1635, top: 938, bottom: 1230}
        ]
    },
    {
        id: "right-sapling",
        crowns: [
            {x: 1536, y: 1055, rx: 38, ry: 42},
            {x: 1562, y: 1104, rx: 38, ry: 38}
        ],
        trunks: [
            {left: 1542, right: 1560, top: 1100, bottom: 1190}
        ]
    }
];

/**
 * Ellipse/ellipse proximity. Combining half axes creates an inexpensive,
 * smooth approximation of contact between the visible hull and leaf masses.
 * Unlike AABB/circle tests this respects transparent corners of the sprite.
 */
lnulander.model.Landing.m_ellipsesTouch = function(a, b) {
    var rx = a.rx + b.rx;
    var ry = a.ry + b.ry;
    var dx = (a.x - b.x) / rx;
    var dy = (a.y - b.y) / ry;
    return dx * dx + dy * dy < 1;
};

/** Circle-like body/foot ellipse versus a tree trunk rectangle. */
lnulander.model.Landing.m_ellipseHitsRect = function(part, rect) {
    var closestX = Math.max(rect.left, Math.min(part.x, rect.right));
    var closestY = Math.max(rect.top, Math.min(part.y, rect.bottom));
    var dx = (part.x - closestX) / part.rx;
    var dy = (part.y - closestY) / part.ry;
    return dx * dx + dy * dy < 1;
};

lnulander.model.Landing.overlapsTreeShape = function(tree, x, y) {
    var C = lnulander.model.Landing;
    for (var i = 0; i < C.HULL_PARTS.length; i++) {
        var original = C.HULL_PARTS[i];
        var hull = {
            x: x + original.x,
            y: y + original.y,
            rx: original.rx,
            ry: original.ry
        };
        for (var j = 0; j < tree.trunks.length; j++) {
            if (C.m_ellipseHitsRect(hull, tree.trunks[j])) return true;
        }
        for (var k = 0; k < tree.crowns.length; k++) {
            if (C.m_ellipsesTouch(hull, tree.crowns[k])) return true;
        }
    }
    return false;
};

/** Identify the obstacle hit, or null in empty air. */
lnulander.model.Landing.treeHitAt = function(x, y) {
    var C = lnulander.model.Landing;
    for (var i = 0; i < C.TREES.length; i++) {
        if (C.overlapsTreeShape(C.TREES[i], x, y)) return C.TREES[i].id;
    }
    return null;
};

/** Backwards-compatible collision predicate. */
lnulander.model.Landing.overlapsTree = function(x, y) {
    return lnulander.model.Landing.treeHitAt(x, y) !== null;
};

/** Desired Rune CameraViewport.zoom based on altitude above the grass. */
lnulander.model.Landing.WIDE_ZOOM = 0.48;
lnulander.model.Landing.CLOSE_ZOOM = 1.12;
lnulander.model.Landing.zoomForAltitude = function(y) {
    var C = lnulander.model.Landing;
    // Zoom ONLY for the last 260 world pixels above the grass. The previous
    // curve zoomed early enough to hide the landing pad from the pilot.
    // Use the ship's feet, not its top, for a meaningful ground clearance.
    var clearance = Math.max(0, C.PAD_Y - (y + C.HEIGHT));
    var t = Math.max(0, Math.min(1, (260 - clearance) / 225));
    // Smoothstep gently accelerates the final approach without sudden jumps.
    t = t * t * (3 - 2 * t);
    return lnulander.model.Landing.WIDE_ZOOM + (lnulander.model.Landing.CLOSE_ZOOM - lnulander.model.Landing.WIDE_ZOOM) * t;
};

/**
 * One camera easing step toward the desired zoom at the craft's altitude.
 * Both approach and retreat use the same rule: there is no one-way zoom latch.
 * Zoom changes never affect the simulated position or collision model.
 */
lnulander.model.Landing.advanceCameraZoom = function(currentZoom, landerY) {
    var target = lnulander.model.Landing.zoomForAltitude(landerY);
    var next = currentZoom + (target - currentZoom) * 0.055;
    // Snap tiny floating-point remnants so the camera settles completely.
    return Math.abs(target - next) < 0.0001 ? target : next;
};

lnulander.model.Landing.prototype.reset = function() {
    this.x = 85;
    this.y = 80;
    this.vx = 0.85;
    this.vy = 0;
    this.fuel = lnulander.model.Landing.INITIAL_FUEL;
    this.status = "flying";
    this.crashReason = "";
    this.collisionTree = "";
    this.thrusting = false;
};

lnulander.model.Landing.prototype.tick = function(controls) {
    var C = lnulander.model.Landing;
    if (this.status !== "flying") {
        this.thrusting = false;
        return;
    }
    var fuel = this.fuel;
    this.thrusting = Boolean(controls.up && fuel >= 1);
    this.vy += 0.038;
    if (this.thrusting) {
        this.vy -= 0.145;
        fuel -= 1;
    }
    if (controls.left && fuel >= 0.25) {
        this.vx -= 0.092;
        fuel -= 0.25;
    }
    if (controls.right && fuel >= 0.25) {
        this.vx += 0.092;
        fuel -= 0.25;
    }
    this.fuel = Math.max(0, fuel);
    this.vx = Math.max(-5, Math.min(5, this.vx * 0.99));
    this.vy = Math.min(8.0, this.vy);
    this.x += this.vx;
    this.y += this.vy;

    if (this.y < 0) {
        this.y = 0;
        this.vy = Math.max(0, this.vy);
    }
    var hitTree = C.treeHitAt(this.x, this.y);
    if (this.x < 0 || this.x + C.WIDTH > C.WORLD_WIDTH) {
        this.status = "crashed";
        this.crashReason = "boundary";
    } else if (hitTree !== null) {
        this.status = "crashed";
        this.crashReason = "tree";
        this.collisionTree = hitTree;
    } else {
        var intersectsPad = this.x < C.PAD_RIGHT && this.x + C.WIDTH > C.PAD_LEFT;
        if (intersectsPad && this.y + C.HEIGHT >= C.PAD_Y) {
            this.y = C.PAD_Y - C.HEIGHT;
            this.status = this.x >= C.PAD_LEFT &&
                this.x + C.WIDTH <= C.PAD_RIGHT &&
                this.vy >= 0 && this.vy <= C.MAX_VERTICAL_SPEED &&
                Math.abs(this.vx) <= C.MAX_HORIZONTAL_SPEED ? "landed" : "crashed";
            if (this.status === "crashed") this.crashReason = "pad";
        } else if (this.y + C.HEIGHT >= C.GROUND_Y) {
            this.y = C.GROUND_Y - C.HEIGHT;
            this.status = "crashed";
            this.crashReason = "ground";
        }
    }
    if (this.status !== "flying") {
        this.thrusting = false;
    }
};
