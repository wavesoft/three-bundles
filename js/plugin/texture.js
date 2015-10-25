
/**
 * A texture! plugin for loading THREE Textures
 */
define(["three", "three-bundles/utils", "three-bundles/parsers"], function(THREE, Utils, Parsers) {

    // Return definition
    return {

		load: function (name, req, onload, config) {

			// Calculate URL from name
			var parts = name.split("/"),
				moduleName = parts.shift(),
				filePath = parts.join("/"),
				url = req.toUrl(moduleName + "/texture/" + filePath);

			// Handle files according to format
			if (Utils.matchesExt(name, ["jpg", "jpeg", "png", "bmp", "gif"])) {

				// Require THREE.js runtime
				req(["three"], function(THREE) {

					// Get defaults for cross-origin
					var crossOrigin = config.crossOrigin || false;

					// Prepare an image loader
					var loader = new THREE.ImageLoader();
					loader.setCrossOrigin( crossOrigin );
					loader.load( url, function ( image ) {

						// Create texture
						var texture = new THREE.Texture( image );
						texture.needsUpdate = true;

						// We are now loaded
						onload( texture );

					}, function() { /* Progress */ }, function(error) {

						// There is an error
						onload.error(Error("Unable to load texture " + name));

					});

				}, function(error) {

					// Pass-through error
					onload.error(error);

				});

			} else if (Utils.matchesExt(name, "dds")) {

				// We don't know how to handle this
				onload.error("Compressed texture not yet supported");

			} else {

				// We don't know how to handle this
				onload.error("Unknown texture format");

			}

		}
		
	};

});
