/**
 * H-huset in original-detail artwork. Rune's CameraViewport is responsible
 * for viewing and smoothly zooming into the world. HUD is camera-local.
 * @constructor @extends rune.scene.Scene
 */
lnulander.scene.Game = function() {
    this.m_flight = null;
    this.m_camera = null;
    this.m_background = null;
    this.m_ship = null;
    this.m_flame = null;
    this.m_fuelSegments = [];
    this.m_velocity = null;
    this.m_altitude = null;
    this.m_message = null;
    rune.scene.Scene.call(this);
};
lnulander.scene.Game.prototype = Object.create(rune.scene.Scene.prototype);
lnulander.scene.Game.prototype.constructor = lnulander.scene.Game;

/** @override */
lnulander.scene.Game.prototype.init = function() {
    rune.scene.Scene.prototype.init.call(this);
    this.m_flight = new lnulander.model.Landing();
    var C = lnulander.model.Landing;

    // Fill the extended camera margins at high altitude with sky instead of black.
    var skyMat = new rune.display.Artboard(-1700, -1500, 5100, 4500);
    skyMat.backgroundColor = "#139af6";
    this.stage.addChild(skyMat);

    // A single high-resolution world, never a pre-upscaled 418x235 thumbnail.
    this.m_background = new rune.display.Graphic(0, 0, C.WORLD_WIDTH, C.WORLD_HEIGHT,
        document.getElementById("lnu-h-house"));
    this.stage.addChild(this.m_background);

    this.m_flame = new rune.display.Graphic(0, 0, 37, 55,
        document.getElementById("lnu-exhaust"));
    this.m_flame.visible = false;
    this.stage.addChild(this.m_flame);

    this.m_ship = new rune.display.Graphic(this.m_flight.x, this.m_flight.y,
        C.WIDTH, C.HEIGHT, document.getElementById("lnu-lander"));
    this.stage.addChild(this.m_ship);

    this.m_camera = this.cameras.getCameraAt(0);
    this.m_camera.bounderies = new rune.geom.Rectangle(0, 0, C.WORLD_WIDTH, C.WORLD_HEIGHT);
    this.m_camera.targets.add(this.m_ship);
    this.m_camera.lag.x = 0.13;
    this.m_camera.lag.y = 0.11;
    // World pixels become downsampled while far away; small enlargements
    // during the approach use smooth interpolation to avoid shimmering.
    this.m_camera.canvas.smoothing = true;
    this.m_camera.viewport.zoomTo(lnulander.model.Landing.WIDE_ZOOM);
    this.m_initHud();
};

/** @override */
lnulander.scene.Game.prototype.update = function(step) {
    rune.scene.Scene.prototype.update.call(this);
    if (this.keyboard.justPressed("R")) {
        this.m_flight.reset();
        this.m_camera.viewport.zoomTo(lnulander.model.Landing.WIDE_ZOOM);
    }
    this.m_flight.tick({
        up: this.keyboard.pressed("UP") || this.keyboard.pressed("SPACE") ||
            this.keyboard.pressed("W"),
        left: this.keyboard.pressed("LEFT") || this.keyboard.pressed("A"),
        right: this.keyboard.pressed("RIGHT") || this.keyboard.pressed("D")
    });

    this.m_ship.x = Math.round(this.m_flight.x);
    this.m_ship.y = Math.round(this.m_flight.y);
    this.m_flame.x = this.m_ship.x + 81;
    this.m_flame.y = this.m_ship.y + 184;
    this.m_flame.visible = this.m_flight.thrusting;

    // Bidirectional, altitude-driven zoom: descending approaches the ground
    // and zooms in; climbing back up automatically zooms out.
    var zoom = lnulander.model.Landing.advanceCameraZoom(
        this.m_camera.viewport.zoom, this.m_flight.y);
    this.m_camera.viewport.zoomTo(zoom);

    var percent = this.m_flight.fuel / lnulander.model.Landing.INITIAL_FUEL;
    var segments = Math.ceil(this.m_fuelSegments.length * percent);
    for (var i = 0; i < this.m_fuelSegments.length; i++) {
        this.m_fuelSegments[i].visible = i < segments;
    }
    this.m_velocity.text = "V-SPEED " + this.m_flight.vy.toFixed(1);
    var altitude = Math.max(0, Math.round(lnulander.model.Landing.PAD_Y -
        (this.m_flight.y + lnulander.model.Landing.HEIGHT)));
    this.m_altitude.text = "ALT " + altitude;

    if (this.m_flight.status === "landed") {
        this.m_message.text = "SUCCESS! PRESS R TO FLY AGAIN";
        this.m_message.visible = true;
    } else if (this.m_flight.status === "crashed") {
        this.m_message.text = "CRASH! PRESS R TO RETRY";
        this.m_message.visible = true;
    } else {
        this.m_message.visible = false;
    }
};

/** Fixed HUD objects belong to the camera, not the zooming world stage. */
lnulander.scene.Game.prototype.m_panel = function(x, y, w, h, color) {
    var bg = new rune.display.Artboard(x, y, w, h);
    bg.backgroundColor = color;
    this.m_camera.addChild(bg);
    return bg;
};

/** Small text rendered crisply at native screen resolution. */
lnulander.scene.Game.prototype.m_text = function(text, x, y, scale) {
    var field = new rune.text.BitmapField(text, rune.text.BitmapFormat.FONT_MEDIUM);
    field.autoSize = true;
    field.x = x;
    field.y = y;
    field.scaleX = scale;
    field.scaleY = scale;
    this.m_camera.addChild(field);
    return field;
};

lnulander.scene.Game.prototype.m_initHud = function() {
    this.m_panel(18, 18, 332, 54, "#07152c");
    this.m_panel(23, 23, 322, 44, "#162c4b");
    this.m_text("LNU LANDER", 34, 30, 3);
    this.m_panel(780, 18, 482, 54, "#07152c");
    this.m_panel(786, 24, 470, 42, "#142b49");
    this.m_text("FUEL", 798, 37, 2);
    this.m_panel(880, 32, 168, 26, "#070e22");
    for (var i = 0; i < 12; i++) {
        var seg = this.m_panel(885 + i * 13, 37, 10, 16, "#ffff00");
        this.m_fuelSegments.push(seg);
    }
    this.m_velocity = this.m_text("V-SPEED 0.0", 1071, 35, 2);
    this.m_altitude = this.m_text("ALT 0", 800, 81, 2);

    this.m_panel(18, 671, 706, 31, "#07152c");
    this.m_text("UP/SPACE THRUST  A/D STEER  R RESTART", 28, 679, 2);
    this.m_message = this.m_text("", 374, 340, 3);
    this.m_message.visible = false;
};

/** @override */
lnulander.scene.Game.prototype.dispose = function() {
    rune.scene.Scene.prototype.dispose.call(this);
    this.m_flight = null;
    this.m_camera = null;
    this.m_background = null;
    this.m_ship = null;
    this.m_flame = null;
    this.m_fuelSegments = [];
    this.m_velocity = null;
    this.m_altitude = null;
    this.m_message = null;
};
