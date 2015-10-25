define(function() {

    /**
     * Update mapping to three-bundles
     */
	requirejs.config({
		map: {
			'*': {
				// Three Bundles 
				'bundle'	 : 'three-bundles/plugin/bundle',
				'material'	 : 'three-bundles/plugin/material',
				'mesh'		 : 'three-bundles/plugin/mesh',
				'object'	 : 'three-bundles/plugin/object',
				'geometry'	 : 'three-bundles/plugin/geometry',
				'scene'		 : 'three-bundles/plugin/scene',
				'shader'	 : 'three-bundles/plugin/shader',
				'sound'		 : 'three-bundles/plugin/texture',
				'texture'	 : 'three-bundles/plugin/texture',
			}
		}
	});

});