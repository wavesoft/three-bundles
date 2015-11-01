/**
 * Configure Require.JS
 */
requirejs.config({

	// Load all modules from 'js/'
	'baseUrl': 'js',

	/**
     * (1) Add three-bundles as a package
	 */
	'packages': [
		{
            'name'      : 'three-bundles',
            'location'  : '../../js'
		}
	],

    /**
     * (2) Configure three-bundles
     */
    threeBundles: {

        /**
         * Specify the base Url (relative to requireJS' `baseUrl`),
         * that threeBundles will use for loading the bundles.
         *
         * If missing, it will default to requireJS' `baseUrl`
         */
        'baseUrl': '../bundles'

    },

	/**
	 * (3) Configure paths to THREE.js and TEXT! plugin
	 */
	paths: {

		// Use THREE from CDN
		'three': '//cdn.rawgit.com/mrdoob/three.js/master/build/three.min',

		// Use Require.js TEXT plugin from CDN
		'text': '//cdn.rawgit.com/requirejs/text/master/text'

	}

});

/**
 * Example entry point
 */
define(["three", "three-bundles", "common/viewport"], function(THREE, THREEBundles, Viewport) {

	// Load dependencies from three-bundles
	require(["three-bundles/binary"], function(BinaryDecoder) {

		////////////////////////////////////////////////////////
		// Load Regular Bundle
		////////////////////////////////////////////////////////

		var bundleTime = Date.now();

		require(["bundle!hello.bundle"], function(Bundle) {

			// Calculate bundle loading time
			bundleTime = Date.now() - bundleTime;
			document.getElementById('label-left-text').innerText = "Loaded in " + bundleTime + " ms";

			// Get ben from bundle
			var ben = Bundle.ben;
			ben.scale.set( 700,700,700 );
			ben.position.set(-200,-200,0)
			Viewport.scene.add( ben );

			// Get monster from bundle
			var monster = Bundle.monster;
			monster.scale.set( 0.15, 0.15, 0.15);
			monster.position.set( -400, -200, -200 );
			monster.rotation.y = -Math.PI/2;
			Viewport.scene.add( monster );

			// Add animation to the monster
			var mixer = new THREE.AnimationMixer( monster );
			mixer.addAction( new THREE.AnimationAction( monster.geometry.animations[0] ).warpToDuration( 1 ) );
			Viewport.addAnimationFunction( mixer.update.bind(mixer) );

		});

		////////////////////////////////////////////////////////
		// Load Binary Bundle
		////////////////////////////////////////////////////////

		// Load ben from binary buffer
		var decoder = new BinaryDecoder();

		var binaryBundleTime = Date.now();

		var pendingBundles = 2,
			loadCallback = function() {

				// Parse all bundles
				decoder.parse();

				// Calculate binary bundle loading time
				binaryBundleTime = Date.now() - binaryBundleTime;
				document.getElementById('label-right-text').innerText = "Loaded in " + binaryBundleTime + " ms";

				// Get ben from database
				var ben = decoder.database['meshes/mesh/ben'];
				ben.scale.set( 700,700,700 );
				ben.position.set(200,-200,0)
				Viewport.scene.add( ben );
				
				// Get monster from database
				var monster = decoder.database['meshes/mesh/monster'];
				monster.scale.set( 0.15, 0.15, 0.15);
				monster.position.set( 400, -200, -200 );
				monster.rotation.y = -Math.PI/2;
				Viewport.scene.add( monster );

				// Add monster animation
				var mixer = new THREE.AnimationMixer( monster );
				mixer.addAction( new THREE.AnimationAction( monster.geometry.animations[0] ).warpToDuration( 1 ) );
				Viewport.addAnimationFunction( mixer.update.bind(mixer) );

			};

		// Load demo bundle
		decoder.load("bundles/materials.3bd.gz", function(bundle) {
			if (--pendingBundles == 0) loadCallback();
		});
		decoder.load("bundles/meshes.3bd.gz", function(bundle) {
			if (--pendingBundles == 0) loadCallback();
		});

	});

});