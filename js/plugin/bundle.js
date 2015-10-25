
/**
 * A bundle! plugin for loading AudioExpo bundles
 *
 * We are using Require.js plugin mechanism in order to benefit from
 * it's powerul dependency solving mechanism.
 *
 */
define(["three", "three-bundles/utils", "three-bundles/parsers"], function(THREE, Utils, Parsers) {

    // Return definition
    return {

        load: function (name, req, onload, config) {

            // Helper function to set a property in
            // an object by path
            var setByPath = function( object, path, value ) {
                var parts = path.split("/"), target = object;
                // Find and/or create target
                for (var i=0; i<parts.length-1; i++) {
                    if (typeof(target[parts[i]]) != 'object') target[parts[i]] = { };
                    target = target[parts[i]];
                }
                // Set property
                target[parts[parts.length-1]] = value;
                // Return object
                return object;
            }

            // Define bundle as require.js package
            requirejs.config({
                'packages': [
                    {
                        'name'      : name,
                        'location'  : (config.threeBundles.baseUrl || config.baseUrl) + '/' + name
                    }
                ]
            });

            //
        	// Load bundle index
            //
            // This module should be just a JS object that specifies
            // the resources this bundle contains. Upon loading a bundle,
            // all of it's resources will be pre-cached.
            //
        	req([ name + '/index' ], 

        		// Now that we have the bundle, start loading
        		// all it's dependencies.
        		function(bundleIndex) {

        			// Helper counter to check if all resources are loaded
        			var resourcesPending = 0,
        				requirements = [],
        				callbacks = [];

        			// -------------------------
        			// Materials & Textures
        			// -------------------------

        			// Load Textures
        			if (bundleIndex['texture'])
        				for (var i=0; i<bundleIndex.texture.length; i++) {
        					requirements.push( "texture!" + name + '/' + bundleIndex.texture[i] );
        				}
        			// Load Shaders
        			if (bundleIndex['shader'])
        				for (var i=0; i<bundleIndex.shader.length; i++) {
        					requirements.push( "shader!" + name + '/' + bundleIndex.shader[i] );
        				}
        			// Load Materials
        			if (bundleIndex['material'])
        				for (var i=0; i<bundleIndex.material.length; i++) {
        					requirements.push( "material!" + name + '/' + bundleIndex.material[i] );
        				}

        			// -------------------------
        			// Meshes and Objects
        			// -------------------------

                    // Load Geometries
                    if (bundleIndex['geometry'])
                        for (var i=0; i<bundleIndex.geometry.length; i++) {
                            requirements.push( "geometry!" + name + '/' + bundleIndex.geometry[i] );
                        }
        			// Load Meshes
        			if (bundleIndex['mesh'])
        				for (var i=0; i<bundleIndex.mesh.length; i++) {
        					requirements.push( "mesh!" + name + '/' + bundleIndex.mesh[i] );
        				}
        			// Load Objects
        			if (bundleIndex['object'])
        				for (var i=0; i<bundleIndex.object.length; i++) {
        					requirements.push( "object!" + name + '/' + bundleIndex.object[i] );
        				}

        			// -------------------------
        			// Sounds
        			// -------------------------

        			// Load Sounds
        			if (bundleIndex['sound'])
        				for (var i=0; i<bundleIndex.sound.length; i++) {
        					requirements.push( "sound!" + name + '/' + bundleIndex.sound[i] );
        				}

        			// -------------------------
        			// Scenes
        			// -------------------------

        			// Load Scenes
        			if (bundleIndex['scene'])
        				for (var i=0; i<bundleIndex.scene.length; i++) {
        					requirements.push( "scene!" + name + '/' + bundleIndex.scene[i] );
        				}

        			// -------------------------
        			// Finally load other bundles
        			// -------------------------

        			// Load Bundles
        			if (bundleIndex['bundle'])
        				for (var i=0; i<bundleIndex.bundle.length; i++) {
        					requirements.push( "bundle!" + bundleIndex.bundle[i] );
        				}

        			// Now that we have compiled the stack of dependencies,
        			// place the request to load them, along with the bundle's entry point
        			requirements.push( name + '/main' );

        			// Load the rest
        			req( requirements, 

                        //
                        // Callback fired when all dependencies are resolved
                        // 
                        function(/* Variable args */) {

            				// Get the reference to the last argument, which is the
            				// bundle's entry point;
            				var bundleMain = arguments[arguments.length-1];

                            // Update bundle's resources table
                            bundleMain.RESOURCES = { };
                            for (var i=0; i<requirements.length-1; i++) {
                                var parts = requirements[i].split("!"),
                                    rType = parts[0],
                                    rName = parts[1].substr(name.length+1);

                                // Set to resources table
                                if (!bundleMain.RESOURCES[rType]) bundleMain.RESOURCES[rType] = {};
                                setByPath(bundleMain.RESOURCES[rType], rName, arguments[i]);
                            }

            				// We are now loaded
            				onload(bundleMain);
                        },

                        //
                        // A loading error occured, pass the
                        // error right through.
                        //
                        function(error) {
                            onload.error(error);
                        }

                   );

        		},

        		// A loading error occured, pass the
        		// error right through.
        		function(error) {
        			onload.error(error);
        		}
        	);

        }
    };

});
