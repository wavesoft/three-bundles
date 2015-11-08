
/**
 * A mesh! plugin for loading THREE Meshes
 */
define(["three", "three-bundles/utils", "three-bundles/parsers", 
		"three-bundles/extras/loaders/OBJLoader", 
		"three-bundles/extras/loaders/ColladaLoader", 
		"three-bundles/extras/loaders/UTF8Loader",
		"three-bundles/extras/loaders/MTLLoader"
		], function(THREE, Utils, Parsers) {

	THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );

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

			} else if (Utils.matchesExt(name, "utf8_js")) {

				// Get defaults for cross-origin
				var crossOrigin = config.crossOrigin || false;

				var loader = new THREE.UTF8Loader();
				loader.load( req.toUrl(url), function ( object ) {
					onload( object );
				});

			} else if (Utils.matchesExt(name, "obj")) {

				// Get defaults for cross-origin
				var crossOrigin = config.crossOrigin || false;

				// Prepare an image loader
				var loader = new THREE.OBJLoader();
				loader.setCrossOrigin( crossOrigin );
				loader.load( req.toUrl(url), function ( mesh ) {

					// // Dynamically load materials using material name as the lookup key
					// var matNames = [];
					// for (var i=0; i<mesh.children.length; i++) {
					// 	matNames.push( Utils.expandModuleURL("material!" + mesh.children[i].material.name, moduleName) );
					// }

					// // Load materials
					// req(matNames, function(/* Materials */) {

					// 	// Assign materials
					// 	for (var i=0; i<matNames.length; i++) {
					// 		mesh.children[i].material = arguments[i];
					// 	}

						// We are now loaded
						onload( mesh );

					// });

				}, function() { /* Progress */ }, function(error) {

					// There is an error
					onload.error(Error("Unable to load OBJ mesh " + name));

				});

			} else if (Utils.matchesExt(name, "dae")) {

				// Get defaults for cross-origin
				var crossOrigin = config.crossOrigin || false;

				// Prepare an image loader
				var loader = new THREE.ColladaLoader();
				loader.setCrossOrigin( crossOrigin );
				loader.load( req.toUrl(url), function ( mesh ) {

					// We are now loaded
					onload( mesh );

				}, function() { /* Progress */ }, function(error) {

					// There is an error
					onload.error(Error("Unable to load Collada mesh " + name));

				});

			} else {

				// We don't know how to handle this
				onload.error("Unknown material format");

			}

		}
	};

});