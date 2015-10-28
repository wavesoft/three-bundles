
/**
 * A geometry! plugin for loading THREE Geometries
 */
define(["three", "three-bundles/utils", "three-bundles/parsers"], function(THREE, Utils, Parsers) {

    // Return definition
    return {

		load: function (name, req, onload, config) {

			// Calculate URL from name
			var parts = name.split("/"),
				moduleName = parts.shift(),
				filePath = parts.join("/"),
				url = moduleName + "/geometry/" + filePath;

			// Handle files according to format
			if (Utils.matchesExt(name, "json")) {

				// Load geometry contents as text
				req(["text!"+url], function( geometryJSON ) {

					// Parse JSON
					var json = JSON.parse( geometryJSON );

					// faces,metadata,
					if ((json.metadata == undefined) || ((json.metadata.type == undefined) && (json.metadata.vertices == undefined) && (json.metadata.faces == undefined))) {
						onload.error("Invalid geometry file format");
						return;
					}

					// Load either geometry or buffered geometry
					// (If type is missing assume geometry)
					if ((json.metadata.type == "Geometry") || (json.metadata.type == undefined)) {

						// Use common parsers to parse the geometry
						onload(Parsers.parseGeometry(json));

					} else if (json.metadata.type == "BufferGeometry") {

						// Use common parsers to parse the geometry
						onload(Parsers.parseBufferGeometry(json));

					} else {
						onload.error("Unsupported geometry type '"+json.metadata.type+"'");
						return;
					}

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
