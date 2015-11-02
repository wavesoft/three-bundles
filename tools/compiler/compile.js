var colors = require("colors"),
	hideWarn = false;
console.warn = function() { if (hideWarn) return; console.log.apply(console, ["WARN:".yellow].concat(Array.prototype.slice.call(arguments)) ); };
console.error = function() { console.log.apply(console, ["ERROR:".red].concat(Array.prototype.slice.call(arguments)) ); };

// Validate command-line


// Configure
requirejs.config({

	// Load all modules from 'js/'
	'baseUrl': 'js',

	// Bundles package
	'packages': [
		{
            'name'      : 'three-bundles',
            'location'  : '../../../js'
		}
	],

	// Configure threeBundles
    threeBundles: {
        'baseUrl': '../../../examples/bundles'
    },

    // Load required modules
    deps: [
    	// 1) Fake browser DOM Environment
    	"expose-dom",
    	// 2) Load THREE.js
    	"three", 
    	// 3) Expose THREE to global scope (for shims to work)
    	"expose-three",
    	// 4) Overwrite THREE.XHRLoader with file-based equivalent 
    	"extras/FileXHRLoader",
    	// 5) Load three-bundles
    	"three-bundles",
    ],

    // Paths
	paths: {
		'three' : 'lib/three-0.73.0.min',
		'text' 	: 'lib/text-2.0.14'
	}

});

console.log("INFO:".green, "Initializing compiler");

// Compiler entry point
requirejs(["require", "three", "binary_encoder"], function(require, THREE, BinaryEncoder) {

	// Load bundle
	console.log("INFO:".green, "Loading bundle");
	hideWarn = true;

	require(["bundle!hello.bundle"], function(Bundle) {

		console.log("INFO:".green, "Encoding objects");
		hideWarn = false;

		function encodeMaterials( mesh, encoder, db ) {
			hideWarn = true;

			var meshes = [], geometries = [], materials = [], textures = [];
			function encodeObject3D( object ) {

				// Collect meshes
				if (object instanceof THREE.Mesh) {
					meshes.push( object );
				}

				// Collect geometries
				if (object.geometry !== undefined)
					geometries.push( object.geometry );

				// Collect materials
				if (object.material !== undefined) {

					// Collect materials
					var mat = object.material;
					materials.push( mat );

					// Collect textures
					for (var k in mat) {
						if ((mat[k] instanceof THREE.Texture) ||
							(mat[k] instanceof THREE.CompressedTexture)) {

							// If this texture has no name assign materian name
							if (!mat[k].name && mat.name) {
								mat[k].name = mat.name + "_" + k;
							}

							// Store texture
							textures.push( mat[k] );

						}
					}
				}

			}

			// Tranverse object
			object.traverse( encodeObject3D );

			// Encode textures
			for (var i=0; i<textures.length; i++) {
				encoder.encode( textures[i], 'texture/' + (textures[i].name || textures[i].uuid) );
			}

			// Then materials
			for (var i=0; i<materials.length; i++) {
				encoder.encode( materials[i], 'material/' + (materials[i].name || materials[i].uuid) );
			}

			hideWarn = false;
		}

		// Extract all textures
		var db = { };

		var object = Bundle.RESOURCES.mesh['utf8']['ben_dds.utf8_js'];
		object.traverse( function( node ) {
			node.castShadow = true;
			node.receiveShadow = true;
		} );

		// // First encode all materials
		var encoder = new BinaryEncoder( 'materials.3bd' );
		encoder.setDatabase(db);
		encodeMaterials( object, encoder, db );
		encodeMaterials( Bundle.RESOURCES.mesh['monster.json'], encoder, db );
		encoder.close();

		// Then encode the scene
		var encoder = new BinaryEncoder( 'meshes.3bd' );
		encoder.setDatabase(db);
		encoder.encode( object, 'mesh/ben' );
		encoder.encode( Bundle.RESOURCES.mesh['monster.json'], 'mesh/monster' );
		encoder.close();

	});
	
});