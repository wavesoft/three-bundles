
/**
 * A shader! plugin for loading THREE Shaders
 */
define(["three", "three-bundles/utils", "three-bundles/parsers"], function(THREE, Utils, Parsers) {

    // Return definition
    return {

		load: function (name, req, onload, config) {

			// Calculate URL from name
			var parts = name.split("/"),
				moduleName = parts.shift(),
				filePath = parts.join("/"),
				url = moduleName + "/shader/" + filePath;

			// Require THREE.js runtime, and load shader contents as text
			req(["three", "text!"+url], function( THREE, shaderText ) {

				// Callback with shader text text
				onload(shaderText);

	    	}, function( error ) {

				// Pass-through error
	    		onload.error(error);

	    	});

	    }
	};

});