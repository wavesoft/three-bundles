
/**
 * A geometry! plugin for loading THREE Geometries
 */
define(["three", "three-bundles/utils", "three-bundles/parsers"], function(THREE, Utils, Parsers) {

	// Create a couple of loaders that we are going to use
	var OBJloader = new THREE.OBJLoader(),
		BUFGEOMloader = new THREE.BufferGeometryLoader();

    // Return definition
    return {

		load: function (name, req, onload, config) {

			// Calculate URL from name
			var scope = this,
				parts = name.split("/"),
				moduleName = parts.shift(),
				filePath = parts.join("/"),
				url = moduleName + "/geometry/" + filePath;

			// Handle files according to format
			if (Utils.matchesExt(name, "json")) {

				// Load geometry contents as text
				req(["text!"+url], function( geometryJSON ) {
					// Parse JSON
					var json = JSON.parse( geometryJSON );
					// Use common parsers to parse the geometry
					onload(Parsers.parseBufferGeometry(json));
				}, function(error) {
					// Pass-through error
					onload.error(error);
				});
			
			} else {

				// We don't know how to handle this
				onload.error("Unknown geometry format");

			}


		}

	}

});
