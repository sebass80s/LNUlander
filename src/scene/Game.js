/**
 * LNU Lander gameplay, exact original visual direction from the approved art.
 * Assets consist of the generated picture with the parked ship removed,
 * plus the isolated yellow flag-carrying lander sprite and exhaust.
 *
 * @constructor @extends rune.scene.Scene
 */
lnulander.scene.Game = function() {
    this.m_flight = null;
    this.m_ship = null;
    this.m_flame = null;
    this.m_fuelSegments = [];
    this.m_velocity = null;
    this.m_message = null;
    rune.scene.Scene.call(this);
};
lnulander.scene.Game.prototype = Object.create(rune.scene.Scene.prototype);
lnulander.scene.Game.prototype.constructor = lnulander.scene.Game;

/** @override */
lnulander.scene.Game.prototype.init = function() {
    rune.scene.Scene.prototype.init.call(this);
    this.m_flight = new lnulander.model.Landing();
    this.m_background = new rune.display.Graphic(0, 0, 418, 235, document.getElementById("lnu-h-house"));
    this.stage.addChild(this.m_background);
    this.m_flame = new rune.display.Graphic(0, 0, 16, 22, document.getElementById("lnu-exhaust"));
    this.m_flame.visible = false;
    this.stage.addChild(this.m_flame);
    this.m_ship = new rune.display.Graphic(this.m_flight.x, this.m_flight.y, 52, 52,
        document.getElementById("lnu-lander"));
    this.stage.addChild(this.m_ship);
    this.m_initHud();
};

/** @override */
lnulander.scene.Game.prototype.update = function(step) {
    rune.scene.Scene.prototype.update.call(this, step);
    if (this.keyboard.justPressed("R")) this.m_flight.reset();
    this.m_flight.tick({
        up: this.keyboard.pressed("UP") || this.keyboard.pressed("SPACE") || this.keyboard.pressed("W"),
        left: this.keyboard.pressed("LEFT") || this.keyboard.pressed("A"),
        right: this.keyboard.pressed("RIGHT") || this.keyboard.pressed("D")
    });
    this.m_ship.x = Math.round(this.m_flight.x);
    this.m_ship.y = Math.round(this.m_flight.y);
    this.m_flame.x = this.m_ship.x + 18;
    this.m_flame.y = this.m_ship.y + 50;
    this.m_flame.visible = this.m_flight.thrusting;

    var segments = Math.round(this.m_fuelSegments.length * (this.m_flight.fuel / 350));
    for (var i = 0; i < this.m_fuelSegments.length; i++) {
        this.m_fuelSegments[i].visible = i < segments;
    }
    this.m_velocity.text = Math.abs(this.m_flight.vy).toFixed(1);
    if (this.m_flight.status === "landed") {
        this.m_message.text = "LANDED! PRESS R";
        this.m_message.visible = true;
    } else if (this.m_flight.status === "crashed") {
        this.m_message.text = "CRASH! PRESS R";
        this.m_message.visible = true;
    } else {
        this.m_message.visible = false;
    }
};

/** @private */
lnulander.scene.Game.prototype.m_initHud = function() {
    var i;
    // Small fuel segments painted over the mockup's static sample fuel bar.
    var fuelBack = new rune.display.Artboard(285, 8, 42, 9);
    fuelBack.backgroundColor = "#0a1930";
    this.stage.addChild(fuelBack);
    for (i = 0; i < 10; i++) {
        var seg = new rune.display.Artboard(287 + i * 4, 9, 3, 7);
        seg.backgroundColor = "#FFFF00";
        this.stage.addChild(seg);
        this.m_fuelSegments.push(seg);
    }
    // Update the sample velocity text from the background with the actual value.
    var speedBack = new rune.display.Artboard(376, 7, 30, 11);
    speedBack.backgroundColor = "#0a1424";
    this.stage.addChild(speedBack);
    this.m_velocity = new rune.text.BitmapField("0.0", rune.text.BitmapFormat.FONT_SMALL);
    this.m_velocity.autoSize = true;
    this.m_velocity.x = 379;
    this.m_velocity.y = 7;
    this.stage.addChild(this.m_velocity);

    this.m_message = new rune.text.BitmapField("", rune.text.BitmapFormat.FONT_SMALL);
    this.m_message.autoSize = true;
    this.m_message.x = 171;
    this.m_message.y = 58;
    this.m_message.visible = false;
    this.stage.addChild(this.m_message);
};

/** @override */
lnulander.scene.Game.prototype.dispose = function() {
    rune.scene.Scene.prototype.dispose.call(this);
    this.m_flight = null;
    this.m_ship = null;
    this.m_flame = null;
    this.m_background = null;
    this.m_fuelSegments = [];
    this.m_velocity = null;
    this.m_message = null;
};
