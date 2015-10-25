(function() {

	//
	// Test for various audio formats
	//
	var audio  = document.createElement("audio");
	if (typeof audio.canPlayType === "function") {
		if (audio.canPlayType("audio/ogg;codecs=vorbis") !== "") {
			this.audioSuffix = ".ogg";
		}
	}

	/**
	 * A sound! plugin for loading Sound objects
	 */
	define({

	    load: function (name, req, onload, config) {

	    	// Require WebAudio-X runtime
	    	req(["webaudiox"], function(WebAudiox) {

	    	});

	    }

	});

})();
