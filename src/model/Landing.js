/** Frame-based LNU Lander physics. Rune display-independent. */
lnulander.model.Landing = function() { this.reset(); };
lnulander.model.Landing.WIDTH = 52;
lnulander.model.Landing.HEIGHT = 52;
lnulander.model.Landing.ROOF_Y = 103;
lnulander.model.Landing.PAD_Y = 93;
lnulander.model.Landing.PAD_LEFT = 226;
lnulander.model.Landing.PAD_RIGHT = 310;
lnulander.model.Landing.SCREEN_WIDTH = 418;
lnulander.model.Landing.SCREEN_HEIGHT = 235;

lnulander.model.Landing.prototype.reset = function() {
    this.x = 170;
    this.y = 4;
    this.vx = 0;
    this.vy = 0;
    this.fuel = 350;
    this.status = "flying";
    this.thrusting = false;
};

lnulander.model.Landing.prototype.tick = function(controls) {
    if (this.status !== "flying") { this.thrusting = false; return; }
    this.vy += 0.026;
    this.thrusting = Boolean(controls.up && this.fuel >= 1);
    if (this.thrusting) { this.vy -= 0.097; this.fuel -= 1; }
    if (controls.left && this.fuel >= 0.3) { this.vx -= 0.05; this.fuel -= 0.3; }
    if (controls.right && this.fuel >= 0.3) { this.vx += 0.05; this.fuel -= 0.3; }
    this.fuel = Math.max(0, this.fuel);
    this.vx *= 0.984;
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x + lnulander.model.Landing.WIDTH > lnulander.model.Landing.SCREEN_WIDTH ||
        this.y + lnulander.model.Landing.HEIGHT > lnulander.model.Landing.SCREEN_HEIGHT) {
        this.status = "crashed"; this.thrusting = false; return;
    }
    if (this.y < 0) { this.y = 0; this.vy = Math.max(0, this.vy); }
    var touchingPad = this.x + lnulander.model.Landing.WIDTH > lnulander.model.Landing.PAD_LEFT &&
        this.x < lnulander.model.Landing.PAD_RIGHT;
    if (touchingPad && this.y + lnulander.model.Landing.HEIGHT >= lnulander.model.Landing.PAD_Y) {
        this.y = lnulander.model.Landing.PAD_Y - lnulander.model.Landing.HEIGHT;
        this.status = this.x >= lnulander.model.Landing.PAD_LEFT &&
            this.x + lnulander.model.Landing.WIDTH <= lnulander.model.Landing.PAD_RIGHT &&
            Math.abs(this.vx) <= 0.65 && this.vy >= 0 && this.vy <= 0.75 ?
            "landed" : "crashed";
        this.thrusting = false;
    } else if (this.y + lnulander.model.Landing.HEIGHT >= lnulander.model.Landing.ROOF_Y) {
        this.y = lnulander.model.Landing.ROOF_Y - lnulander.model.Landing.HEIGHT;
        this.status = "crashed";
        this.thrusting = false;
    }
};