//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates the application's entry point with its initial configuration.
 *
 * @constructor
 * @extends rune.system.Application
 * 
 * @class
 * @classdesc
 * 
 * Configures the initial scene, resources, input devices and game loop.
 */
lnulander.system.Main = function() {

    //--------------------------------------------------------------------------
    // Super call
    //--------------------------------------------------------------------------
    
    /**
     * Initializes the base Application class with this project's settings.
     */
    rune.system.Application.call(this, {
        developer: "se.lnulander",
        app: "lnulander",
        build: "0.1.0",
        scene: lnulander.scene.Game,
        resources: lnulander.data.Requests,
        useGamepads:false,
        useKeyboard:true,
        framerate: 30,
        screenResolutionX: 400,
        screenResolutionY: 225,
        debug: false
    });
};

//------------------------------------------------------------------------------
// Inheritance
//------------------------------------------------------------------------------

lnulander.system.Main.prototype = Object.create(rune.system.Application.prototype);
lnulander.system.Main.prototype.constructor = lnulander.system.Main;
