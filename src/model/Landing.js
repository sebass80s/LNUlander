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

// Built-in painted tree at the LEFT edge of the existing H-house backdrop.
// No separately drawn sprite: these circles approximate its visible foliage.
lnulander.model.Landing.TREE_CROWNS = [
    {x: 80, y: 695, radius: 170},
    {x: 205, y: 780, radius: 165},
    {x: 100, y: 925, radius: 150},
    {x: 290, y: 920, radius: 117}
];
lnulander.model.Landing.TREE_TRUNK = {
    left: 65, right: 110, top: 930, bottom: 1255
};

/**
 * Each tree visible on the playable foreground grass has a separate physical
 * shape. Background-only treetops BEHIND the H-house are not obstacles, since
 * a collision there would occur against apparently empty sky/building.
 *
 * These positions use world coordinates, matching the 1720x1500 backdrop.
 * Circles describe crowns; rectangles describe the solid woody trunks.
 */
lnulander.model.Landing.TREES = [
    {
        id: "left-oak",
        crowns: lnulander.model.Landing.TREE_CROWNS,
        trunks: [lnulander.model.Landing.TREE_TRUNK]
    },
    {
        id: "right-oak",
        crowns: [
            {x: 1605, y: 745, radius: 149},
            {x: 1487, y: 850, radius: 137},
            {x: 1682, y: 875, radius: 137},
            {x: 1580, y: 974, radius: 100}
        ],
        trunks: [
            {left: 1574, right: 1635, top: 938, bottom: 1230}
        ]
    },
    {
        id: "right-sapling",
        crowns: [
            {x: 1536, y: 1055, radius: 47},
            {x: 1562, y: 1104, radius: 41}
        ],
        trunks: [
            {left: 1542, right: 1560, top: 1100, bottom: 1190}
        ]
    }
];

/**
 * Checks the visible lander hull against ONE tree, without using camera zoom.
 * AABB-versus-circle contacts are conservative around the leafy silhouette.
 */
lnulander.model.Landing.overlapsTreeShape = function(tree, x, y) {
    var C = lnulander.model.Landing;
    var left = x + 24;
    var right = x + C.WIDTH - 24;
    var top = y + 20;
    var bottom = y + C.HEIGHT - 14;
    var i, rect, crown, px, py, dx, dy;

    for (i = 0; i < tree.trunks.length; i++) {
        rect = tree.trunks[i];
        if (left < rect.right && right > rect.left &&
            top < rect.bottom && bottom > rect.top) return true;
    }

    for (i = 0; i < tree.crowns.length; i++) {
        crown = tree.crowns[i];
        px = Math.max(left, Math.min(crown.x, right));
        py = Math.max(top, Math.min(crown.y, bottom));
        dx = px - crown.x;
        dy = py - crown.y;
        if (dx * dx + dy * dy < crown.radius * crown.radius) return true;
    }
    return false;
};

/** Returns the ID of the tree hit by the ship or null when the way is clear. */
lnulander.model.Landing.treeHitAt = function(x, y) {
    var C = lnulander.model.Landing;
    for (var i = 0; i < C.TREES.length; i++) {
        if (C.overlapsTreeShape(C.TREES[i], x, y)) return C.TREES[i].id;
    }
    return null;
};

/** Previous public API retained for existing gameplay and unit tests. */
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
