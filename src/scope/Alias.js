//------------------------------------------------------------------------------
// Global scope aliases
//------------------------------------------------------------------------------

/**
 * Exposes the application namespace on window if it is not already defined.
 */
if (typeof window !== "undefined") {
    if (typeof window.lnulander === "undefined") {
        window.lnulander = lnulander;
    }
}

/**
 * Registers the application with Rune OS when running inside its environment.
 */
if (typeof window !== "undefined" && typeof window.runeos === "object") {
    window.runeos.install(lnulander);
}
