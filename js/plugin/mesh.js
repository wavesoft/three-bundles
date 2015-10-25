
/**
 * A mesh! plugin for loading THREE Meshes
 */
define(["three", "three-bundles/utils", "three-bundles/parsers"], function(THREE, Utils, Parsers) {

	// Return definition
	return {

		load: function (name, req, onload, config) {

			// Calculate URL from name
			var parts = name.split("/"),
				moduleName = parts.shift(),
				filePath = parts.join("/"),
				url = moduleName + "/mesh/" + filePath;

			// Handle files according to format
			if (Utils.matchesExt(name, "json")) {

				// Load mesh contents as text
				req(["text!"+url], function( objectJSON ) {

					// Parse JSON
					var json = JSON.parse( objectJSON );

					// Load the dependant geometry and material
					req([ Utils.expandModuleURL(json.geometry, moduleName),
						  Utils.expandModuleURL(json.material, moduleName)
						], function(geometry, material) {

						// Create mesh
						onload(new THREE.Mesh( geometry, material ));

					}, function( error ) {

						// Pass-through error
						onload.error(error);

					});

				}, function( error ) {

					// Pass-through error
					onload.error(error);

				});

			} else if (Utils.matchesExt(name, "obj")) {



			} else {

				// We don't know how to handle this
				onload.error("Unknown material format");

			}

		}
	};

});