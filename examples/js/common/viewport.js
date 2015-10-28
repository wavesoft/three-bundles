/**
 * A reusable viewport object shared along examples
 */
define(["three"], function(THREE) {

	// Initialize properties
    var scene, camera, renderer, clock, animFn = [];
    var mouseX = 0, mouseY = 0;
    var windowHalfX = window.innerWidth / 2;
    var windowHalfY = window.innerHeight / 2;

    /**
     * Initialize the viewport
     */
    function init() {

    	// Create a scene
        scene = new THREE.Scene();

        // Create a camera
        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
        camera.position.z = 1000;

        // Create a renderer
        renderer = new THREE.WebGLRenderer();
        renderer.setSize( window.innerWidth, window.innerHeight );

        // Add some lights for shaders
        scene.add( new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 ) );
        scene.add( new THREE.AmbientLight( 0x333333 ) );

        // Create a clock
        clock = new THREE.Clock();

        // Place it on DOM
        document.body.appendChild( renderer.domElement );

    }

    /**
     * Animation loop
     */
    function animate() {

    	// Schedule next frame
        requestAnimationFrame( animate );

        // Get delta
        var delta = clock.getDelta();

        // Process animation functions
        for (var i=0; i<animFn.length; i++) {
        	animFn[i]( delta );
        }

        // Rock camera
        camera.position.x += ( mouseX*5 - camera.position.x ) * .05;
        camera.position.y += ( - mouseY*5 - camera.position.y ) * .05;

        camera.lookAt( scene.position );

        // Render
        renderer.render( scene, camera );

    }

    /**
     * Update mouse position
     */
    function onDocumentMouseMove( event ) {
        mouseX = ( event.clientX - windowHalfX ) / 2;
        mouseY = ( event.clientY - windowHalfY ) / 2;
    }

    /**
     * Resize renderer and camera aspect ratio to fit
     */
    function onWindowResize() {

        // Update window half-size
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;

    	// Update camera aspect ratio
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		// Update renderer
		renderer.setSize( window.innerWidth, window.innerHeight );

    }

    // Initialize and start animation
    init();
    animate();

    // Resize when window resizes
	window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'mousemove', onDocumentMouseMove, false );

    // Expose properties
    return {

    	'scene': scene,
    	'camera': camera,

        'addAnimationFunction': function( fn ) {
            animFn.push( fn );
        }
        
    };

})