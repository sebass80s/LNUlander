/** @constructor @extends rune.system.Application */
lnulander.system.Main = function() {
    rune.system.Application.call(this, {
        developer: "se.lnulander",
        app: "lnulander",
        build: "0.2.0",
        scene: lnulander.scene.Game,
        resources: lnulander.data.Requests,
        useGamepads: false,
        useKeyboard: true,
        framerate: 30,
        screenResolutionX: 418,
        screenResolutionY: 235,
        splashScreen: false,
        debug: false
    });
};
lnulander.system.Main.prototype = Object.create(rune.system.Application.prototype);
lnulander.system.Main.prototype.constructor = lnulander.system.Main;
