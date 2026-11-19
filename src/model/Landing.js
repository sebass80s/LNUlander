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
lnulander.model.Landing.PAD_LEFT = 810;
lnulander.model.Landing.PAD_RIGHT = 1230;
lnulander.model.Landing.PAD_Y = 1242;
lnulander.model.Landing.GROUND_Y = 1325;
lnulander.model.Landing.MAX_VERTICAL_SPEED = 1.8;
lnulander.model.Landing.MAX_HORIZONTAL_SPEED = 1.4;
lnulander.model.Landing.INITIAL_FUEL = 560;

/** Desired Rune CameraViewport.zoom based on altitude above the grass. */
lnulander.model.Landing.zoomForAltitude = function(y) {
    var start = 180;
    var finish = lnulander.model.Landing.PAD_Y - lnulander.model.Landing.HEIGHT - 70;
    var t = Math.max(0, Math.min(1, (y - start) / (finish - start)));
    // Smoothstep avoids a sudden change when zooming begins or ends.
    t = t * t * (3 - 2 * t);
    return 0.75 + 0.68 * t;
};

lnulander.model.Landing.prototype.reset = function() {
    this.x = 830;
    this.y = 155;
    this.vx = 0;
    this.vy = 0;
    this.fuel = lnulander.model.Landing.INITIAL_FUEL;
    this.status = "flying";
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
    } else {
        var intersectsPad = this.x < C.PAD_RIGHT && this.x + C.WIDTH > C.PAD_LEFT;
        if (intersectsPad && this.y + C.HEIGHT >= C.PAD_Y) {
            this.y = C.PAD_Y - C.HEIGHT;
            this.status = this.x >= C.PAD_LEFT &&
                this.x + C.WIDTH <= C.PAD_RIGHT &&
                this.vy >= 0 && this.vy <= C.MAX_VERTICAL_SPEED &&
                Math.abs(this.vx) <= C.MAX_HORIZONTAL_SPEED ? "landed" : "crashed";
        } else if (this.y + C.HEIGHT >= C.GROUND_Y) {
            this.y = C.GROUND_Y - C.HEIGHT;
            this.status = "crashed";
        }
    }
    if (this.status !== "flying") {
        this.thrusting = false;
    }
};
