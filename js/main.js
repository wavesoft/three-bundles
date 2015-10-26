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
				'geometry'	 : 'three-bundles/plugin/geometry',
				'scene'		 : 'three-bundles/plugin/scene',
				'shader'	 : 'three-bundles/plugin/shader',
				'texture'	 : 'three-bundles/plugin/texture',
			}
		}
	});

});