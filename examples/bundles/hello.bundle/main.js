/**
 * That's the bundles entry point
 */
define(["three", "mesh!./monster.json"], function(THREE, monster) {

	// Create an object to contain the meshes
	var container = new THREE.Object3D();

	// Plase the man model in the container
	monster.scale.set( 0.5, 0.5, 0.5 );
	monster.position.set( -300, 0, 0 );
	container.add( monster );

	// Return the container object
	return container;

});
