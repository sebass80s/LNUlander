//------------------------------------------------------------------------------
// Namespace
//------------------------------------------------------------------------------

/**
 * Defines the application namespace and its data, scene and system packages.
 * 
 * @namespace lnulander
 */
var lnulander = function() {

    //--------------------------------------------------------------------------
    // Public static scope
    //--------------------------------------------------------------------------
    
    /**
     * Collects the packages exposed by the application namespace.
     *
     * @type {Object}
     * @private
     */
    var m_this = {};

    //--------------------------------------------------------------------------
    // Package structure
    //--------------------------------------------------------------------------
    
    /**
     * Contains application data and resource registration classes.
     *
     * @namespace data
     * @memberof lnulander
     * @since 1.0
     */
    m_this.data = {};
    
    /**
     * Contains scenes that define the application's views and game logic.
     *
     * @namespace scene
     * @memberof lnulander
     * @since 1.0
     */
    m_this.scene = {};

    /** Core gameplay model, independent of rendering. */
    m_this.model = {};

    /**
     * Contains the entry point and other application-level classes.
     *
     * @namespace system
     * @memberof lnulander
     * @since 1.0
     */
    m_this.system = {};
    
    //--------------------------------------------------------------------------
    // Return public scope object
    //--------------------------------------------------------------------------

    /**
     * Exposes the assembled application namespace.
     */
    return m_this;
}();

//------------------------------------------------------------------------------
// Public static methods
//------------------------------------------------------------------------------

/**
 * Creates and starts the application, then returns its entry point instance.
 *
 * @param {Function} [callback] Called when application startup is complete.
 * @returns {lnulander.system.Main} The application instance being started.
 *
 * @ignore
 */
lnulander.bootstrap = function(callback) {
    var app = new lnulander.system.Main();
        app.start(callback);
        
    return app;
};
