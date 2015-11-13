"use strict";
var colors = require("colors"), hideWarn = false;
console.warn = function() { if (hideWarn) return; console.log.apply(console, ["WARN:".yellow].concat(Array.prototype.slice.call(arguments)) ); };
console.error = function() { console.log.apply(console, ["ERROR:".red].concat(Array.prototype.slice.call(arguments)) ); };
console.info = function() { console.log.apply(console, ["INFO:".green].concat(Array.prototype.slice.call(arguments)) ); };

// Validate command-line
var opt = require('node-getopt').create([
  ['m' , 'materials=BUNDLE'    , 'Separate materials in a different bundle'],
  ['g' , 'geometries=BUNDLE'   , 'Separate geometries in a different bundle'],
  ['t' , 'textures=BUNDLE'     , 'Separate textures in a different bundle'],
  ['o' , 'out=BUNDLE'	  	   , 'Specify the name of the bundle'],
  ['O' , 'optimise=LEVEL+'     , 'Specify optimisation level'],
  ['b' , 'bundle-dir=DIR'  	   , 'Specify bundle base directory'],
  ['L' , 'load=BUNDLE+'  	   , 'Load the specified bundle before compiling'],
  [''  , 'log=FLAGS' 	 	   , 'Enable logging (see flags below)'],
  ['h' , 'help'                , 'Display this help'],
  ['v' , 'version'             , 'Show version'],
])
.setHelp(
  "Usage: node r.js compile.js [OPTION] BUNDLE [BUNDLE ...]\n" +
  "Compile one or more bundles to a binary format.\n" +
  "\n" +
  "[[OPTIONS]]\n" +
  "\n" +
  "Optimisation options:\n" +
  "\n" +
  "  -O0                      Disable all optimisations (Safest)\n" +
  "                            - Perserve TypedArrays as-is\n" +
  "  -O1                      Very safe optimisations\n" +
  "                            - ByRef De-Duplication\n" +
  "                            - Compact consecutive opcodes\n" +
  "  -O2                      Safe optimisations (Default)\n" +
  "                            - ByVal De-Duplication\n" +
  "                            - Integer differential encoding\n" +
  "  -O3                      Unsafe optimisations (Smallest)\n" +
  "                            - Float differential encoding\n" +
  "\n" +
  "Logging Flags:\n" +
  "\n" +
  "  t                        Log import/export tag opcodes\n" +
  "  p                        Log primitive opcodes\n" +
  "  c                        Log compacting opcodes\n" +
  "  e                        Log entity opcodes\n" +
  "  l                        Log alignment opcodes\n" +
  "  r                        Log internal cross-reference opcodes\n" +
  "  d                        Log differential encoding array opcodes\n" +
  "  a                        Log array optices\n" +
  "  w                        Log low-level byte writes\n" +
  "  -                        Log everything\n" +
  "\n" +
  "Installation: npm install three-bundles\n" +
  "Respository:  https://github.com/wavesoft/three-bundles"
)
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

// Validate arguments
if (opt.argv.length < 1) {
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

	// Apply optimisation flags to encode
	var applyFlags = function(encoder) {
			var level = 2, logTags = "";
			if (opt.options['optimise'] !== undefined)
				level = parseInt(opt.options['optimise']);
			if (opt.options['log'] !== undefined)
				logTags = opt.options['log'];

			// Handle errors
			if (level > 3) {
				console.error("Unknown optimisation level", level,"specified. Using 2 instead");
				level = 2;
			}

			// Apply optimisation flags
			if (level == 0) {
				console.info("Disabling optimisations [-O0]");
				encoder.useCrossRef = 0;
				encoder.useCompact = false;
				encoder.usePerservingOfTypes = true;
				encoder.useDiffEnc = 0;
			} else if (level == 1) {
				console.info("Using safe optimisations [-O1]");
				encoder.useCrossRef = 1;
				encoder.useCompact = true;
				encoder.usePerservingOfTypes = false;
				encoder.useDiffEnc = 0;
			} else if (level == 2) {
				console.info("Using default optimisations [-O2]");
				encoder.useCrossRef = 2;
				encoder.useCompact = true;
				encoder.usePerservingOfTypes = false;
				encoder.useDiffEnc = 1;
			} else if (level == 3) {
				console.info("Using full optimisations [-O3]");
				encoder.useCrossRef = 2;
				encoder.useCompact = true;
				encoder.usePerservingOfTypes = false;
				encoder.useDiffEnc = 2;
			}

			// Apply logging flags
			for (var i=0; i<logTags.length; i++) {
				var t = logTags[i];
				if ((t == "-") || (t == "t"))
					encoder.logTag = true;
				if ((t == "-") || (t == "p"))
					encoder.logPrimitive = true;
				if ((t == "-") || (t == "c"))
					encoder.logCompact = true;
				if ((t == "-") || (t == "e"))
					encoder.logEntity = true;
				if ((t == "-") || (t == "l"))
					encoder.logAlign = true;
				if ((t == "-") || (t == "r"))
					encoder.logRef = true;
				if ((t == "-") || (t == "d"))
					encoder.logDiffEnc = true;
				if ((t == "-") || (t == "a"))
					encoder.logArray = true;
				if ((t == "-") || (t == "w"))
					encoder.logWrite = true;
			}

		};

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
				applyFlags(encoder);
				encoder.setDatabase( ThreeBundles.database );
				for (var i=0; i<bundleTextures.length; i++) {
					console.info("Encoding".gray,bundleTextures[i][1].cyan.dim);
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
				applyFlags(encoder);
				encoder.setDatabase( ThreeBundles.database );
				for (var i=0; i<bundleMaterials.length; i++) {
					console.info("Encoding".gray,bundleMaterials[i][1].cyan.dim);
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
				applyFlags(encoder);
				encoder.setDatabase( ThreeBundles.database );
				for (var i=0; i<bundleGeometries.length; i++) {
					console.info("Encoding".gray,bundleGeometries[i][1].cyan.dim);
					encoder.encode( bundleGeometries[i][0], bundleGeometries[i][1] );
				}
				for (var i=0; i<bundleMeshes.length; i++) {
					console.info("Encoding".gray,bundleMeshes[i][1].cyan.dim);
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
			applyFlags(encoder);
			encoder.setDatabase( ThreeBundles.database );
			for (var i=0; i<bundleObjects.length; i++) {
				console.info("Encoding".gray,bundleObjects[i][1].cyan.dim);
				encoder.encode( bundleObjects[i][0], bundleObjects[i][1] );
			}
			for (var i=0; i<bundleOthers.length; i++) {
				console.info("Encoding".gray,bundleOthers[i][1].cyan.dim);
				encoder.encode( bundleOthers[i][0], bundleOthers[i][1] );
			}
			encoder.close();

			// Warn for compression
			console.log("NOTE:".cyan, "We are relying on a gzip compression of the result!");

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
	for (var i=0; i<opt.argv.length; i++) {
		bundlesToLoad.push( opt.argv[i] );
	}

	// Start loading
	loadNextBundle();

});