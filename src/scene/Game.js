/**
 * H-huset in original-detail artwork. Rune's CameraViewport is responsible
 * for viewing and smoothly zooming into the world. HUD is camera-local.
 * @constructor @extends rune.scene.Scene
 */
lnulander.scene.Game = function() {
    this.m_flight = null;
    this.m_camera = null;
    this.m_background = null;
    this.m_tree = null;
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

    // Mirror the outer edges of the approved landscape to fill the extra
    // horizontal camera view at 0.48x. Unlike stretching the art, reflection
    // retains native texel detail and avoids abrupt blue side columns.
    var leftExtension = new rune.display.Graphic(
        -C.WORLD_WIDTH, 0, C.WORLD_WIDTH, C.WORLD_HEIGHT,
        document.getElementById("lnu-h-house"));
    leftExtension.flippedX = true;
    this.stage.addChildAt(leftExtension, 1);
    var rightExtension = new rune.display.Graphic(
        C.WORLD_WIDTH, 0, C.WORLD_WIDTH, C.WORLD_HEIGHT,
        document.getElementById("lnu-h-house"));
    rightExtension.flippedX = true;
    this.stage.addChildAt(rightExtension, 1);

    // A tree that actually blocks the approach, drawn above the background.
    this.m_drawTree();

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
        this.m_message.text = this.m_flight.crashReason === "tree" ?
            "TREE HIT! PRESS R TO RETRY" : "CRASH! PRESS R TO RETRY";
        this.m_message.visible = true;
    } else {
        this.m_message.visible = false;
    }
};

/**
 * A solid, readable, pixel-art tree occupying the approach corridor.
 * The foliage and trunk match the collision zones in Landing.js.
 */
lnulander.scene.Game.prototype.m_drawTree = function() {
    var art = new rune.display.Artboard(470, 700, 375, 630);
    var g = art.graphics;
    var pixels = [
        [153, 299, 54, 327, "#49301e"],
        [162, 296, 35, 320, "#80522c"],
        [174, 309, 13, 298, "#b27735"],
        [124, 281, 79, 25, "#55351f"],
        [184, 266, 72, 26, "#55351f"],
        [109, 269, 90, 14, "#99632f"],
        [184, 260, 70, 14, "#a86a32"],
        // Dark stepped outline to keep the silhouette visible in flight.
        [64, 181, 231, 103, "#123b23"],
        [30, 145, 290, 114, "#17472a"],
        [75, 93, 224, 154, "#17472a"],
        [123, 50, 156, 171, "#17472a"],
        [153, 28, 112, 182, "#17472a"],
        // Several blocky overlapping green crown masses.
        [44, 160, 262, 75, "#266d33"],
        [73, 128, 233, 110, "#358b3a"],
        [103, 86, 185, 125, "#277c37"],
        [138, 57, 133, 131, "#439e40"],
        [169, 35, 72, 92, "#5bb746"],
        [62, 172, 87, 53, "#419f41"],
        [223, 146, 71, 53, "#419f41"],
        [116, 98, 62, 49, "#72c64b"],
        [204, 92, 47, 38, "#6dc344"],
        [79, 165, 59, 28, "#8cce46"],
        [255, 174, 39, 19, "#83c74d"],
        [152, 66, 49, 27, "#9bd84d"],
        [176, 157, 58, 34, "#195e30"],
        [114, 216, 67, 23, "#266e34"],
        [225, 209, 51, 24, "#1d662f"],
        [86, 195, 34, 13, "#b2df58"],
        [195, 111, 37, 13, "#a8da50"],
        [156, 86, 28, 11, "#b6e05a"],
        [242, 157, 40, 14, "#b2d851"]
    ];
    for (var i = 0; i < pixels.length; i++) {
        var p = pixels[i];
        g.drawRectFill(p[0], p[1], p[2], p[3], p[4]);
    }
    this.stage.addChild(art);
    this.m_tree = art;
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

    this.m_panel(18, 671, 770, 31, "#07152c");
    this.m_text("UP/SPACE THRUST  A/D STEER  DODGE TREE  R RESTART", 28, 679, 2);
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
