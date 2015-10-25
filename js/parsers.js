/**
 * Various parsers imported from THREE
 */
define(["three"], function(THREE) {

	/**
	 * Expose just the parsers
	 */
	return {

		/**
		 * Function to parse OBJ Contents to Object3D
		 */
		'parseOBJ': THREE.OBJLoader.prototype.parse,

		/**
		 * Function to parse a buffered geometry to a Geometry object
		 */
		'parseBufferGeometry': THREE.BufferGeometryLoader.prototype.parse,

		/**
		 * Function to parse geometry to a Geometry object
		 */
		'parseGeometry': function(json) {
			return THREE.JSONLoader.prototype.parse(json, "").geometry;
		},

		/**
		 * Function to parse material definition to create a Material object
		 */
		'parseMaterial': function(json, textureLookup) {

			// Use the material loader to create the material
			// We are overriding 'this' scope to provide an
			// alternative function to laod textures, through
			// our bundle mechanism.
			return THREE.MaterialLoader.prototype.parse.call({
				'getTexture': function( name ) {
					return textureLookup[name];
				}
			}, json);
		}


	};

});