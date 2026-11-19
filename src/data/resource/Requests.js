//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates the application's resource request collection.
 * 
 * @constructor
 * @extends rune.resource.Requests
 * 
 * @class
 * @classdesc
 * 
 * Registers application resources as file references or Base64 data URIs.
 * Rune-tools compile generates the resource entries in this class.
 */
lnulander.data.Requests = function() {

    //--------------------------------------------------------------------------
    // Super call
    //--------------------------------------------------------------------------
    
    /**
     * Initializes the base Requests class.
     */
    rune.resource.Requests.call(this);
};

//------------------------------------------------------------------------------
// Inheritance
//------------------------------------------------------------------------------

lnulander.data.Requests.prototype = Object.create(rune.resource.Requests.prototype);
lnulander.data.Requests.prototype.constructor = lnulander.data.Requests;

//------------------------------------------------------------------------------
// Override protected prototype methods
//------------------------------------------------------------------------------

/**
 * Initializes the base request collection and registers application resources.
 *
 * @override
 * @protected
 * @returns {undefined}
 */
lnulander.data.Requests.prototype.m_construct = function() {
    rune.resource.Requests.prototype.m_construct.call(this);
    
};
