
if (define) {
	// Exposing THREE to global space (fixes Require.js shims errors)
	require(['three'], function(THREE) {
		global.THREE = THREE;
	});
} else {
	// When used without require
	global.THREE = require('./lib/three-0.73.0.min.js');
}
