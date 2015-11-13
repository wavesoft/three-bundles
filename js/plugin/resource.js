
/**
 * A bundle! plugin for loading AudioExpo bundles
 *
 * We are using Require.js plugin mechanism in order to benefit from
 * it's powerul dependency solving mechanism.
 *
 */
define([], function() {

	// Return definition
	return {

		/**
		 * Return a resource from it's reference in the database
		 */
		load: function (name, req, onload, config) {
			if (this.__db[name] === undefined) {
				onload.error("Resource",name,"was not defined!");
			} else {
				onload(this.__db[name]);
			}
		},

		/**
		 * The shared database
		 */
		__db: { }

	};

});