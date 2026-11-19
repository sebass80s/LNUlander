/**
 * LNU Lander's deterministic, frame-based flight model.
 * One tick corresponds to one Rune update at the configured 30 fps.
 * No DOM or Rune dependencies, so gameplay rules can be unit tested.
 *
 * @constructor
 */
lnulander.model.Landing = function() {
    this.reset();
};

lnulander.model.Landing.WIDTH = 14;
lnulander.model.Landing.HEIGHT = 14;
lnulander.model.Landing.ROOF_Y = 163;
lnulander.model.Landing.PAD_LEFT = 150;
lnulander.model.Landing.PAD_RIGHT = 250;
lnulander.model.Landing.SCREEN_WIDTH = 400;

/** Restores the beginning of a flight. */
lnulander.model.Landing.prototype.reset = function() {
    this.x = 193;
    this.y = 20;
    this.vx = 0;
    this.vy = 0;
    this.fuel = 420;
    this.status = "flying";
    this.thrusting = false;
};

/**
 * Advances the model by one fixed 30 fps simulation tick.
 * @param {{up: boolean, left: boolean, right: boolean}} controls
 */
lnulander.model.Landing.prototype.tick = function(controls) {
    var width = lnulander.model.Landing.WIDTH;
    var height = lnulander.model.Landing.HEIGHT;
    if (this.status !== "flying") {
        this.thrusting = false;
        return;
    }

    this.thrusting = Boolean(controls.up && this.fuel > 0);
    this.vy += 0.035;

    if (this.thrusting) {
        this.vy -= 0.105;
        this.fuel -= 1;
    }
    if (controls.left && this.fuel >= 0.25) {
        this.vx -= 0.027;
        this.fuel -= 0.25;
    }
    if (controls.right && this.fuel >= 0.25) {
        this.vx += 0.027;
        this.fuel -= 0.25;
    }
    this.fuel = Math.max(0, this.fuel);
    this.vx *= 0.993;
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x + width > lnulander.model.Landing.SCREEN_WIDTH ||
        this.y + height > 225) {
        this.status = "crashed";
        this.thrusting = false;
        return;
    }
    if (this.y < 0) {
        this.y = 0;
        this.vy = Math.max(0, this.vy);
    }
    if (this.y + height >= lnulander.model.Landing.ROOF_Y) {
        this.y = lnulander.model.Landing.ROOF_Y - height;
        if (this.x >= lnulander.model.Landing.PAD_LEFT &&
            this.x + width <= lnulander.model.Landing.PAD_RIGHT &&
            Math.abs(this.vx) <= 0.55 && this.vy >= 0 && this.vy <= 0.8) {
            this.status = "landed";
        } else {
            this.status = "crashed";
        }
        this.thrusting = false;
    }
};
