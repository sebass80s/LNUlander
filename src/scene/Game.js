/**
 * The first playable LNU Lander vertical slice.
 * Temporary pixel-art campus roof until the actual building is selected.
 *
 * @constructor
 * @extends rune.scene.Scene
 */
lnulander.scene.Game = function() {
    this.m_flight = null;
    this.m_ship = null;
    this.m_flame = null;
    this.m_hud = null;
    this.m_statusText = null;
    rune.scene.Scene.call(this);
};

lnulander.scene.Game.prototype = Object.create(rune.scene.Scene.prototype);
lnulander.scene.Game.prototype.constructor = lnulander.scene.Game;

/** @override */
lnulander.scene.Game.prototype.init = function() {
    rune.scene.Scene.prototype.init.call(this);
    this.m_flight = new lnulander.model.Landing();
    this.m_drawCampus();
    this.m_drawLander();
    this.m_drawInterface();
};

/** @override */
lnulander.scene.Game.prototype.update = function(step) {
    rune.scene.Scene.prototype.update.call(this, step);

    if (this.keyboard.justPressed("R")) {
        this.m_flight.reset();
    }
    this.m_flight.tick({
        up: this.keyboard.pressed("UP") || this.keyboard.pressed("SPACE"),
        left: this.keyboard.pressed("LEFT") || this.keyboard.pressed("A"),
        right: this.keyboard.pressed("RIGHT") || this.keyboard.pressed("D")
    });

    this.m_ship.x = Math.round(this.m_flight.x);
    this.m_ship.y = Math.round(this.m_flight.y);
    this.m_flame.x = this.m_ship.x + 5;
    this.m_flame.y = this.m_ship.y + 14;
    this.m_flame.visible = this.m_flight.thrusting;

    this.m_hud.text = "FUEL " + Math.ceil(this.m_flight.fuel) +
        "  V " + this.m_flight.vy.toFixed(2) +
        "  H " + this.m_flight.vx.toFixed(2);

    if (this.m_flight.status === "landed") {
        this.m_statusText.text = "LANDED! PRESS R TO FLY AGAIN";
    } else if (this.m_flight.status === "crashed") {
        this.m_statusText.text = "CRASH! PRESS R TO RETRY";
    } else {
        this.m_statusText.text = "SOFT LANDING ON THE GREEN PAD";
    }
};

/** Adds a static colored rectangle to the Rune display list. */
lnulander.scene.Game.prototype.m_rect = function(x, y, w, h, color) {
    var rect = new rune.display.Artboard(x, y, w, h);
    rect.backgroundColor = color;
    this.stage.addChild(rect);
    return rect;
};

/** Draws a stylized, fictionalized campus rooftop as an initial placeholder. */
lnulander.scene.Game.prototype.m_drawCampus = function() {
    var sky = new rune.display.Artboard(0, 0, 400, 225);
    var stars = [[12, 20], [35, 63], [67, 28], [93, 48], [117, 13],
        [159, 39], [189, 66], [216, 17], [248, 57], [277, 25],
        [308, 43], [352, 23], [382, 55], [369, 94]];
    var i, x, y;
    sky.backgroundColor = "#081322";
    for (i = 0; i < stars.length; i++) {
        sky.graphics.drawRectFill(stars[i][0], stars[i][1], 2, 2, "#96b8cd");
    }
    this.stage.addChild(sky);

    this.m_rect(0, 184, 400, 41, "#0f1d2a");
    this.m_rect(0, 172, 58, 53, "#243448");
    this.m_rect(342, 169, 58, 56, "#243448");
    this.m_rect(60, 163, 280, 62, "#364d5e");
    this.m_rect(58, 160, 284, 4, "#98a9b7");
    this.m_rect(150, 158, 100, 5, "#69efbf");
    this.m_rect(140, 159, 10, 4, "#ed747b");
    this.m_rect(250, 159, 10, 4, "#ed747b");

    for (i = 0; i < 9; i++) {
        x = 75 + i * 28;
        for (y = 177; y < 216; y += 18) {
            this.m_rect(x, y, 17, 10, i % 3 === 0 ? "#a3cfe1" : "#709bad");
            this.m_rect(x + 1, y + 7, 15, 2, "#455e6e");
        }
    }
    this.m_rect(181, 174, 39, 3, "#1d2e3b");
    this.m_rect(186, 171, 3, 6, "#f8ce76");
    this.m_rect(212, 171, 3, 6, "#f8ce76");
};

/** Draws a simple 14x14 raster lander and a separate thrust flame. */
lnulander.scene.Game.prototype.m_drawLander = function() {
    this.m_flame = new rune.display.Artboard(0, 0, 4, 7);
    this.m_flame.graphics.drawRectFill(0, 0, 4, 4, "#f2b85d");
    this.m_flame.graphics.drawRectFill(1, 4, 2, 3, "#ee7751");
    this.m_flame.visible = false;
    this.stage.addChild(this.m_flame);

    this.m_ship = new rune.display.Artboard(193, 20, 14, 14);
    this.m_ship.graphics.drawRectFill(5, 0, 4, 3, "#edf5eb");
    this.m_ship.graphics.drawRectFill(3, 3, 8, 7, "#c7d8e1");
    this.m_ship.graphics.drawRectFill(5, 4, 4, 3, "#5899c2");
    this.m_ship.graphics.drawRectFill(1, 8, 3, 2, "#e3c477");
    this.m_ship.graphics.drawRectFill(10, 8, 3, 2, "#e3c477");
    this.m_ship.graphics.drawRectFill(3, 10, 2, 3, "#dce5ea");
    this.m_ship.graphics.drawRectFill(9, 10, 2, 3, "#dce5ea");
    this.m_ship.graphics.drawRectFill(1, 13, 4, 1, "#e3c477");
    this.m_ship.graphics.drawRectFill(9, 13, 4, 1, "#e3c477");
    this.stage.addChild(this.m_ship);
};

/** Adds keyboard instructions and flight telemetry using Rune's bitmap text. */
lnulander.scene.Game.prototype.m_drawInterface = function() {
    var title = new rune.text.BitmapField("LNU LANDER", rune.text.BitmapFormat.FONT_MEDIUM);
    title.autoSize = true;
    title.x = 133;
    title.y = 7;
    this.stage.addChild(title);

    this.m_hud = new rune.text.BitmapField("", rune.text.BitmapFormat.FONT_SMALL);
    this.m_hud.autoSize = true;
    this.m_hud.x = 8;
    this.m_hud.y = 29;
    this.stage.addChild(this.m_hud);

    this.m_statusText = new rune.text.BitmapField("", rune.text.BitmapFormat.FONT_SMALL);
    this.m_statusText.autoSize = true;
    this.m_statusText.x = 88;
    this.m_statusText.y = 49;
    this.stage.addChild(this.m_statusText);

    var controls = new rune.text.BitmapField(
        "UP / SPACE THRUST    LEFT / RIGHT STEER    R RESET",
        rune.text.BitmapFormat.FONT_SMALL);
    controls.autoSize = true;
    controls.x = 13;
    controls.y = 211;
    this.stage.addChild(controls);
};

/** @override */
lnulander.scene.Game.prototype.dispose = function() {
    rune.scene.Scene.prototype.dispose.call(this);
    this.m_flight = null;
    this.m_ship = null;
    this.m_flame = null;
    this.m_hud = null;
    this.m_statusText = null;
};
