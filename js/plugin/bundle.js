
/**
 * A bundle! plugin for loading AudioExpo bundles
 *
 * We are using Require.js plugin mechanism in order to benefit from
 * it's powerul dependency solving mechanism.
 *
 */
define(["three",
 		"three-bundles/utils",
 		"three-bundles/plugin/resource",
		"three-bundles/extras/loaders/THREE/DDSLoader"
	], function(THREE, Utils, Resources) {

	// Some widely used texture loaders
	THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );
	THREE.Loader.Handlers.add( /\.(jpg|jpeg|gif|png|bmp)$/i, new THREE.ImageLoader() );

	// Loader instance singletons
	var loaderInstances = { },
		getLoaderSingleton = function( className, classType ) {
			if (loaderInstances[className] == undefined)
				loaderInstances[className] = new classType();
			return loaderInstances[className];
		};

	// Loader handles
	var loaderHandlers = { },
		registerLoaderHandler = function( regex, className ) {
			// Make sure laoder is called only once per regex
			if (loaderHandlers[regex] != undefined) return;
			loaderHandlers[regex] = true;
			// Add handler
			THREE.Loader.Handlers.add( new RegExp(regex, 'i'), new THREE[className]() );
		};

	// Return definition
	return {

		load: function (name, req, onload, config) {

			// Calculate bundle base URL
			var baseURL = (config.threeBundles.baseUrl || config.baseUrl) + '/' + name;

			// Replace macro in various different types of arguments
			// that can pass to a loader
			var replaceMacros = function(loaderArgs) {
				if (typeof(loaderArgs) == "string") {
					// Replace string macros
					return loaderArgs
						.replace("${BUNDLE}", baseURL )
					;
				} else if (loaderArgs instanceof Array) {
					// Replace array items
					for (var i=0; i<loaderArgs.length; i++)
						loaderArgs[i] = replaceMacros(loaderArgs[i]);
					return loaderArgs;
				} else if (typeof(loaderArgs) == "object") {
					// Replace object properties
					for (var k in loaderArgs)
						if (loaderArgs.hasOwnProperty(k))
							loaderArgs[k] = replaceMacros(loaderArgs[k]);
					return loaderArgs;
				} else {
					return loaderArgs;
				}
			}

			//
			// Load bundle index
			//
			// This module should be just a JS object that specifies
			// the resources this bundle contains. Upon loading a bundle,
			// all of it's resources will be pre-cached.
			//
			req([ baseURL + '/index' ], function(index) {

				// Check if there 
				if (index.load == undefined)
					return;

				//
				// Completion loading callbacks
				//
				var bundleObjects = { },
					pendingLoading = 0,
					finalizeLoading = function() {
						// Fire callback
						onload( bundleObjects );
					};

				//
				// Load a resource using the url and the loader instance
				//
				var loadResource = function( url, alias, loaderInstance ) {

					// Load resource
					loaderInstance.load( url, function( data ) {

						// Keep object in bundle objects list
						bundleObjects[alias] = data;

						// Keep reference in the database
						Resources.__db[alias] = data;

						// Check if we are done
						if (--pendingLoading <= 0) {
							setTimeout(finalizeLoading, 0);
						}

					});
				}

				//
				// Before loading, make sure we have all the required loader 
				// handlers specified.
				//
				if (index.handlers !== undefined) {
					for (var loaderClass in index.handlers) {
						if (!index.handlers.hasOwnProperty(loaderClass)) continue;
						// Make sure we have array
						var regex = index.handlers[loaderClass];
						if (typeof regex == "string") regex=[regex];
						// Register handlers
						for (var i=0; i<regex.length; i++)
							registerLoaderHandler( regex[i], loaderClass );
					}
				}

				//
				// Iterate over the loader classes
				//
				for (var loaderClass in index.load) {
					if (!index.load.hasOwnProperty(loaderClass)) continue;

					//
					// Callback to continue loading when we have the loader
					// loaded and instantiated
					//
					var continueLoading = function( loaderClass, loaderInstance ) {
						for (var alias in index.load[loaderClass]) {
							if (!index.load[loaderClass].hasOwnProperty(alias)) continue;
							// Load individual resource
							loadResource( replaceMacros( index.load[loaderClass][alias] ), 
										  alias, loaderInstance );
						}
					};

					//
					// Count entities in the object
					//
					var countKeys = function() {
						var i=0;
						for (var alias in index.load[loaderClass]) {
							if (!index.load[loaderClass].hasOwnProperty(alias)) continue;
							i++;
						}
						return i;
					}

					// Lookup loader class details
					var parts = loaderClass.split("."),
						classNamespace = parts[0], className = parts[1];

					// Handle THREE namespace
					if (classNamespace == "THREE") {
						pendingLoading += countKeys(index.load[loaderClass]);
						if (THREE[className] !== undefined) {
							// If we already have this loader loaded, fire continue immediately
							setTimeout(
								(function(loaderClass, className) {
									return function() {
										continueLoading( loaderClass, getLoaderSingleton( className, THREE[className] ) );
									}
								})(loaderClass, className),
							0);
						} else {
							// Otherwise load this THREE loader from our extras
							req(['three-bundles/extras/loaders/THREE/' + className ], 
								(function(loaderClass, className) {
									return function() {
										continueLoading( loaderClass, getLoaderSingleton( className, THREE[className] ) );
									}
								})(loaderClass, className),
								function(error) {
									onload.error("Unable to load THREE loader class", className,":", error);
								}
							);
						}
					} else {
						// That's an unknown namespace
						onload.error("Unknown loader namespace", classNamespace);
					}
				}

			});

		}
	};

});
