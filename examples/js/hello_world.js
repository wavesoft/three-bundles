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

	// Load bundle
	require(["bundle!hello.bundle"], function(Bundle) {

		// Realign camera
		Viewport.camera.position.z = 2000;

		// Add bundle on scene
		Viewport.scene.add( Bundle );

	});

});