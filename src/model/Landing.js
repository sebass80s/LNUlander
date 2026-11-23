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

// Campus tree sprite is rendered at (640, 952), 280 x 373 pixels.
// A smaller foreground obstacle keeps H-huset and the pad readable.
// Crown circles and solid trunk are aligned with the visible tree image.
lnulander.model.Landing.TREE_CROWNS = [
    {x: 770, y: 1040, radius: 78},
    {x: 705, y: 1105, radius: 72},
    {x: 828, y: 1110, radius: 68},
    {x: 790, y: 1180, radius: 52}
];
lnulander.model.Landing.TREE_TRUNK = {left: 760, right: 792, top: 1140, bottom: 1325};

/**
 * Test the visible hull (slightly inset from transparent sprite margins)
 * against the tree's foliage and trunk. Keeps gameplay frame-independent.
 */
lnulander.model.Landing.overlapsTree = function(x, y) {
    var C = lnulander.model.Landing;
    var left = x + 24;
    var right = x + C.WIDTH - 24;
    var top = y + 20;
    var bottom = y + C.HEIGHT - 14;
    var trunk = C.TREE_TRUNK;
    if (left < trunk.right && right > trunk.left &&
        top < trunk.bottom && bottom > trunk.top) return true;

    for (var i = 0; i < C.TREE_CROWNS.length; i++) {
        var crown = C.TREE_CROWNS[i];
        // Closest point on the hull box to this circular foliage cluster.
        var px = Math.max(left, Math.min(crown.x, right));
        var py = Math.max(top, Math.min(crown.y, bottom));
        var dx = px - crown.x;
        var dy = py - crown.y;
        if (dx * dx + dy * dy < crown.radius * crown.radius) return true;
    }
    return false;
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
    if (this.x < 0 || this.x + C.WIDTH > C.WORLD_WIDTH) {
        this.status = "crashed";
        this.crashReason = "boundary";
    } else if (C.overlapsTree(this.x, this.y)) {
        this.status = "crashed";
        this.crashReason = "tree";
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
