
/**
 * A scene! plugin for loading THREE Scenes
 */
define(["three", "three-bundles/utils", "three-bundles/parsers"], function(THREE, Utils, Parsers) {

    // Return definition
    return {

	    load: function (name, req, onload, config) {

	    	// Require THREE.js runtime
	    	req(["three"], function(THREE) {

	    	});

	    }
	};

});