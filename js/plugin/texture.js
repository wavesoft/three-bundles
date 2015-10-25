
/**
 * A texture! plugin for loading THREE Textures
 */
define(["three", "three-bundles/utils", "three-bundles/parsers", "three-bundles/extras/DDSLoader"], function(THREE, Utils, Parsers) {

    // Return definition
    return {

		load: function (name, req, onload, config) {

			// Calculate URL from name
			var parts = name.split("/"),
				moduleName = parts.shift(),
				filePath = parts.join("/"),
				url = moduleName + "/texture/" + filePath;

			// Handle files according to format
			if (Utils.matchesExt(name, ["jpg", "jpeg", "png", "bmp", "gif"])) {

				// Get defaults for cross-origin
				var crossOrigin = config.crossOrigin || false;

				// Prepare an image loader
				var loader = new THREE.ImageLoader();
				loader.setCrossOrigin( crossOrigin );
				loader.load( req.toUrl(url), function ( image ) {

					// Create texture
					var texture = new THREE.Texture( image );
					texture.needsUpdate = true;

					// We are now loaded
					onload( texture );

				}, function() { /* Progress */ }, function(error) {

					// There is an error
					onload.error(Error("Unable to load texture " + name));

				});

			} else if (Utils.matchesExt(name, "dds")) {

				// Get defaults for cross-origin
				var crossOrigin = config.crossOrigin || false;

				// Prepare an image loader
				var loader = new THREE.DDSLoader();
				loader.setCrossOrigin( crossOrigin );
				loader.load( req.toUrl(url), function ( texture ) {

					// We are now loaded
					onload( texture );

				}, function() { /* Progress */ }, function(error) {

					// There is an error
					onload.error(Error("Unable to load compressed texture " + name));

				});

			} else {

				// We don't know how to handle this
				onload.error("Unknown texture format");

			}

		}
		
	};

});
