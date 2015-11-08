define(function() {

    /**
     * Update mapping to three-bundles
     */
	requirejs.config({

		// Three-Bundles plugins
		map: {
			'*': {
				// Three Bundles 
				'bundle'	 : 'three-bundles/plugin/bundle',
				'material'	 : 'three-bundles/plugin/material',
				'mesh'		 : 'three-bundles/plugin/mesh',
				'geometry'	 : 'three-bundles/plugin/geometry',
				'scene'		 : 'three-bundles/plugin/scene',
				'shader'	 : 'three-bundles/plugin/shader',
				'texture'	 : 'three-bundles/plugin/texture',
			}
		},

		// THREEjs loader shims
	    shim: {
	    	'three-bundles/extras/loaders/THREE/AWDLoader' 		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/BabylonLoader'	: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/BinaryLoader'	: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/ColladaLoader'	: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/DDSLoader' 		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/MD2Loader' 		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/MTLLoader' 		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/OBJLoader' 		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/OBJMTLLoader'	: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/PDBLoader'		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/PLYLoader'		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/PVRLoader'		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/RGBELoader'		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/STLLoader'		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/SVGLoader'		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/TGALoader'		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/UTF8Loader'		: [ 'three',
	    		'three-bundles/extras/loaders/THREE/MTLLoader'
	    	],
	    	'three-bundles/extras/loaders/THREE/VRMLLoader'		: [ 'three' ],
	    	'three-bundles/extras/loaders/THREE/VTKLoader'		: [ 'three' ],
	    }
	});
	
	/**
	 * Return the bundle database
	 */
	return {

		/**
		 * The cross-bundle database used for import/export of references
		 * @property {object}
		 */
		'database': { }

	};

});