/*
 * @author ioannis charalampidis / http://github.com/wavesoft
 */

THREE.MD2CharacterLoader = function () {
};

THREE.MD2CharacterLoader.prototype = {
	constructor: THREE.MD2CharacterLoader,

	/**
	 * Load an MD2 Character with the config provided
	 */
	load: function(config, onload, onprogress, onerror) {

		var character = new THREE.MD2Character();

		character.onLoadComplete = function() {
			if (onload) onload( character );
		};

		character.loadParts( config );

	}

};