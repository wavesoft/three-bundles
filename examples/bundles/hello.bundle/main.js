/**
 * That's the bundles entry point
 */
define(["three", "mesh!./monster.json", "mesh!./utf8/ben_dds.utf8_js"], function(THREE, monster, ben) {

	// Return monster and ben
	return {
		'monster': monster,
		'ben': ben
	};

});
