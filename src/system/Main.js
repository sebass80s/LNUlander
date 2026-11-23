/** Rune SDK application, at a full 1280x720 render resolution. */
lnulander.system.Main = function() {
    rune.system.Application.call(this, {
        developer: "se.lnulander",
        app: "lnulander",
        build: "0.5.2",
        scene: lnulander.scene.Game,
        resources: lnulander.data.Requests,
        useGamepads: false,
        useKeyboard: true,
        framerate: 30,
        screenResolutionX: 1280,
        screenResolutionY: 720,
        splashScreen: false,
        debug: false
    });
};
lnulander.system.Main.prototype = Object.create(rune.system.Application.prototype);
lnulander.system.Main.prototype.constructor = lnulander.system.Main;
