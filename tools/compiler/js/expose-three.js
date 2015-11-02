
define(["three"], function(THREE) {
	// Exposing THREE to global space (fixes Require.js shims errors)
	global.THREE = THREE;
})