
/**
 * A object! plugin for loading THREE Objects
 */
define(["three", "three-bundles/utils", "three-bundles/parsers"], function(THREE, Utils, Parsers) {

    // Return definition
    return {

	    load: function (name, req, onload, config) {

			// Calculate URL from name
			var parts = name.split("/"),
				moduleName = parts.shift(),
				filePath = parts.join("/"),
				url = moduleName + "/object/" + filePath;

			// Require THREE.js runtime, and load shader contents as text
			req(["three", "text!"+url], function( THREE, objectJSON ) {

				// Parse JSON & Create Object
				var json = JSON.parse( objectJSON ),
					object = new THREE.Object3D();

				// Collect requirements
				

				// Collect meshes
				if (json.meshes) {
					for (var i=0; i<json.meshes.length; i++) {

					}
				}


	    	}, function( error ) {

				// Pass-through error
	    		onload.error(error);

	    	});

	    }
	};

});