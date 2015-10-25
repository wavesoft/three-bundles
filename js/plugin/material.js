
/**
 * A material! plugin for loading THREE Materials
 */
define(["three", "three-bundles/utils", "three-bundles/parsers"], function(THREE, Utils, Parsers) {

    // Return definition
    return {

		load: function (name, req, onload, config) {

			// Calculate URL from name
			var scope = this,
				parts = name.split("/"),
				moduleName = parts.shift(),
				filePath = parts.join("/"),
				url = moduleName + "/material/" + filePath;

			// Handle files according to format
			if (Utils.matchesExt(name, "json")) {

				// Load material contents as text
				req(["text!"+url], function( materialJSON ) {

					// Parse JSON
					var json = JSON.parse( materialJSON );

					// Lookup additional requirements
					// (The following properties of the 'json' object will be loaded through a
					//  req request in order to satisfy them through the bundle system)
					var requirements = Utils.additionalRequirements( json, moduleName, [
							'map', 'alphaMap', 'bumpMap', 'normalMap', 'displacementMap', 'specularMap', 
							'envMap', 'lightMap', 'aoMap', 'vertexShader', 'fragmentShader'
						]);

					// Callback to build the material
					var loadCallback = function(/* Textures */) {

						// Return the requirements as a key/value object
						var textureLookup = requirements.asValueObject( arguments );

						// Create material using material parser
						onload( Parsers.parseMaterial(json, textureLookup) );

					}

					// If there is nothing to load, fire callback right away,
					// otherwise require first
					if (requirements.length == 0) {
						loadCallback();
					} else {
						req(requirements, loadCallback);
					}

				}, function(error) {

					// Pass-through error
					onload.error(error);

				});

			} else {

				// We don't know how to handle this
				onload.error("Unknown material format");

			}

		}

	};

});
