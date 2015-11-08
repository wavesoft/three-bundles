var colors = require("colors"), hideWarn = false;
console.warn = function() { if (hideWarn) return; console.log.apply(console, ["WARN:".yellow].concat(Array.prototype.slice.call(arguments)) ); };
console.error = function() { console.log.apply(console, ["ERROR:".red].concat(Array.prototype.slice.call(arguments)) ); };
console.info = function() { console.log.apply(console, ["INFO:".green].concat(Array.prototype.slice.call(arguments)) ); };

// Validate command-line
opt = require('node-getopt').create([
  ['m' , 'materials=BUNDLE'    , 'Separate materials in a different bundle'],
  ['g' , 'geometries=BUNDLE'   , 'Separate geometries in a different bundle'],
  ['t' , 'textures=BUNDLE'     , 'Separate textures in a different bundle'],
  ['o' , 'out=BUNDLE'	  	   , 'Specify the name of the bundle'],
  ['b' , 'bundle-dir=DIR'  	   , 'Specify bundle base directory'],
  ['L' , 'load=BUNDLE+'  	   , 'Load the specified bundle before compiling'],
  ['h' , 'help'                , 'Display this help'],
  ['v' , 'version'             , 'Show version']
])
.setHelp(
  "Usage: node r.js compile.js [OPTION] BUNDLE [BUNDLE ...]\n" +
  "Compile one or more bundles to a binary format.\n" +
  "\n" +
  "[[OPTIONS]]\n" +
  "\n" +
  "Installation: npm install three-bundles\n" +
  "Respository:  https://github.com/wavesoft/three-bundles"
)
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

// Validate arguments
if (opt.argv.length < 2) {
	console.error("Please specify at least one or module to compile!");
	process.exit(1);
}

// If we have no output file, guess one
if (!opt.options['out']) {
	var outName = opt.argv[opt.argv.length-1].split("."); outName.pop();
	opt.options['out'] = outName.join(".") + ".3bd";
}

// Configure
var requirejs = require("requirejs");
requirejs.config({

	// Bundles package
	'packages': [
		{
            'name'      : 'three-bundles',
            'location'  : '../../js'
		}
	],

	// Configure threeBundles
    threeBundles: {
        'baseUrl': opt.options['bundle-dir'] || '.'
    },

    // Load required modules
    deps: [
    	// 1) Fake browser DOM Environment
    	"js/expose-dom",
    	// 2) Load THREE.js
    	"three", 
    	// 3) Expose THREE to global scope (for shims to work)
    	"js/expose-three",
    	// 4) Overwrite THREE.XHRLoader with file-based equivalent 
    	"js/extras/FileXHRLoader",
    	// 5) Load three-bundles
    	"three-bundles",
    ],

    // Paths
	paths: {
		'three' : 'js/lib/three-0.73.0.min',
		'text' 	: 'js/lib/text-2.0.14'
	}

});

console.log("INFO:".green, "Initializing compiler");

// Compiler entry point
hideWarn = true;
requirejs(["require", "three", "js/binary_encoder", "three-bundles"], function(require, THREE, BinaryEncoder, ThreeBundles) {
	hideWarn = false;

	// Bundle writing sequence
	var preloadCounter = 0,
		currentObjectName = null,
		bundleMaterials = [],
		bundleGeometries = [],
		bundleTextures = [],
		bundleMeshes = [],
		bundleObjects = [],
		bundleOthers = [],
		writeBundle = function() {

			// Check if we have to separate textures
			if (opt.options['textures']) {
				var encoder = new BinaryEncoder( opt.options['textures'] );
				encoder.setDatabase( ThreeBundles.database );
				for (var i=0; i<bundleTextures.length; i++) {
					encoder.encode( bundleTextures[i][0], bundleTextures[i][1] );
				}
				encoder.close();
			} else {
				// Move textures to materials
				bundleMaterials = bundleTextures.concat( bundleMaterials );
			}

			// Check if we have to separate materials
			if (opt.options['materials']) {
				var encoder = new BinaryEncoder( opt.options['materials'] );
				encoder.setDatabase( ThreeBundles.database );
				for (var i=0; i<bundleMaterials.length; i++) {
					encoder.encode( bundleMaterials[i][0], bundleMaterials[i][1] );
				}
				encoder.close();
			} else {
				// Move materials to others
				bundleOthers = bundleMaterials.concat( bundleOthers );
			}

			// Check if we have to separate geometries
			if (opt.options['geometries']) {
				var encoder = new BinaryEncoder( opt.options['geometries'] );
				encoder.setDatabase( ThreeBundles.database );
				for (var i=0; i<bundleGeometries.length; i++) {
					encoder.encode( bundleGeometries[i][0], bundleGeometries[i][1] );
				}
				for (var i=0; i<bundleMeshes.length; i++) {
					encoder.encode( bundleMeshes[i][0], bundleMeshes[i][1] );
				}
				encoder.close();
			} else {
				// Move geometries to others
				bundleOthers = bundleGeometries.concat( bundleOthers );
				bundleOthers = bundleMeshes.concat( bundleOthers );
			}

			// Encode everything else in the bundle
			var encoder = new BinaryEncoder( opt.options['out'] );
			encoder.setDatabase( ThreeBundles.database );
			for (var i=0; i<bundleObjects.length; i++) {
				encoder.encode( bundleObjects[i][0], bundleObjects[i][1] );
			}
			for (var i=0; i<bundleOthers.length; i++) {
				encoder.encode( bundleOthers[i][0], bundleOthers[i][1] );
			}
			encoder.close();

			// Warn for compression
			console.log("NOTE:".cyan, "It's a good idea to gz-compress the resulting bundles");

		};

	// Encode an Object3D
	var encodeObject3D = function( object, key ) {

		// Collect meshes (works only when traversing)
		if (object instanceof THREE.Mesh) {
			if (opt.options['geometries']) {
				bundleMeshes.push( [object, currentObjectName+":mesh/"+(object.name || object.uuid)] );
			}
		}

		// Collect geometries if requested
		if ((object.geometry !== undefined) && (opt.options['geometries']))
			if (bundleGeometries.name)
				bundleGeometries.push( [ object.geometry, currentObjectName+"::geometry/"+(bundleGeometries.name || bundleGeometries.uuid) ] );

		// Collect materials if requested
		if (object.material !== undefined) {

			// Collect materials
			var mat = object.material;
			if (opt.options['materials']) {
				bundleMaterials.push( [ mat, currentObjectName+":material/"+(mat.name || mat.uuid)] );
			}

			// Collect textures
			hideWarn = true;
			for (var k in mat) {
				if ((mat[k] instanceof THREE.Texture) ||
					(mat[k] instanceof THREE.CompressedTexture)) {

					// If this texture has no name assign materian name
					if (!mat[k].name && mat.name) {
						mat[k].name = mat.name + "_" + k;
					}

					// Store texture
					bundleTextures.push( [ mat[k], currentObjectName+":texture/"+(mat[k].name || mat[k].uuid) ] );

				}
			}
			hideWarn = false;

		}

	}

	// Encode the specified object under the given key
	var encodeObject = function( object, key ) {

		// [A] Separate textures
		if  ((object instanceof THREE.CubeTexture) ||
			 (object instanceof THREE.CompressedTexture) ||
			 (object instanceof THREE.Texture))
		{
			// Collect texture
			bundleTextures.push( [object, key] );
		}

		// [B] Separate materials
		else if (object instanceof THREE.Material)
		{
			// Collect material
			bundleMaterials.push( [object, key] );
		}

		// [C] Separate geometry
		else if ((object instanceof THREE.BufferGeometry) ||
			 	 (object instanceof THREE.Geometry))
		{
			// Collect geometries
			bundleGeometries.push( [object, key] );
		}

		// [D] Separate Object3D objects
		else if (object instanceof THREE.Object3D)
		{
			// Encode children
			currentObjectName = key;
			object.traverse( encodeObject3D );
			// Keep object
			bundleObjects.push( [object, key] );
		}

		// [E] Encode everything else
		else {
			bundleOthers.push( [object, key] );
		}

	}

	// Bundle loading sequence
	var bundlesToLoad = [],
		loadNextBundle = function() {

			// If we ran out of bundles to load, write them down
			if (bundlesToLoad.length == 0) {
				writeBundle();
				return;
			};

			// Get next bundle to load
			var bundle = bundlesToLoad.shift();
			console.log("INFO:".green, "Loading bundle", ((opt.options['bundle-dir'] || '.')+'/'+bundle).magenta);

			// Load bundle
			hideWarn = true;
			require(["bundle!"+bundle], function( bundle ) {
				hideWarn = false;

				// Start encoding objects if we passed the pre-loading phase
				if (--preloadCounter <= 0) {
					for (var k in bundle) {
						if (!bundle.hasOwnProperty(k)) continue;
						encodeObject( bundle[k], k );
					}
				}

				// Load next
				loadNextBundle();

			});

		};

	// Collect the bundles to preload
	if (opt.load) {
		for (var i=0; i<opt.load.length; i++) {
			preloadCounter++;
			bundlesToLoad.push( opt.load[i] );
		}
	}

	// Load bundles to process
	for (var i=1; i<opt.argv.length; i++) {
		bundlesToLoad.push( opt.argv[i] );
	}

	// Start loading
	loadNextBundle();

});