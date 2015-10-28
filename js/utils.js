define(function() {

	/**
	 * Utility Namespace
	 */
	var Utils = { };

	/**
	 * Expand a relative module URL to full module URL
	 *
	 * This function will look for a './' string and replace
	 * it with the name of the current module.
	 *
	 * @param {string} url - The url to format
	 * @param {string} moduleName - The current module name
	 */
	Utils.expandModuleURL = function(url, moduleName) {

		// Expand relative URL
		if (url.indexOf("!./") > 0) {
			var parts = url.split("!./");
			url = parts[0] + "!" + moduleName + "/" + parts[1];
		}

		// Return URL
		return url;
		
	}

	/**
	 * Helper to prepare requirements array
	 *
	 * This function will iterate over the given object and will look
	 * for the values of the properties specified in the depProperties array.
	 * If a property looks like a bundle resource, it will schedule it for download.
	 *
	 * This function returns a smart array, with all the bundle URLs that needs
	 * to be downloaded. The array object exposes additional methods that can be
	 * called when the resources are loaded, passing the arguments of the requre()
	 * callback handler:
	 *
	 * - asObject( arguments ) 		: Creates an object with the property name as key 
	 * - asValueObject( arguments ) : Creates an object with the property value as key 
	 *
	 * @param {object} object - The object to check additional reuirements on
	 * @param {string} moduleName - The name of this module for relative dependency resolution
	 * @param {array} depProperties - The properties to check and collect for additional dependencies
	 */
	Utils.additionalRequirements = function( object, moduleName, depProperties ) {
		var requirements = [],
			property_index = [],
			value_index = [];

		// Iterate over the object properties
		for (var i=0; i<depProperties.length; i++) {
			if (object[depProperties[i]] == undefined) continue;

			// Collect dependency URL
			requirements.push(Utils.expandModuleURL( object[depProperties[i]], moduleName ));

			// Create lookup indices
			property_index.push(depProperties[i]);
			value_index.push(object[depProperties[i]]);

		}

		/**
		 * Return an object with all the resolved objects, using their
		 * property name as key.
		 *
		 * @param {array} args - An array with resolved dependency object instances
		 */
		requirements.asObject = function( args ) {
			var ans = { };
			for (var i=0; i<property_index.length; i++) {
				ans[property_index[i]] = args[i];
			}
			return ans;
		}

		/**
		 * Return an object with all the resolved objects, using their
		 * property value as key.
		 *
		 * @param {array} args - An array with resolved dependency object instances
		 */
		requirements.asValueObject = function( args ) {
			var ans = { };
			for (var i=0; i<property_index.length; i++) {
				ans[value_index[i]] = args[i];
			}
			return ans;
		}

		// Return requirements array
		return requirements;

	}

	/**
	 * Check if that's a matching extension(s)
	 *
	 * @param {string} path - The path to test
	 * @param {string|array} ext - The extension to test against
	 * @returns {bool} Returns true if the extension matches
	 */
	Utils.matchesExt = function(path, ext) {
		// Isolate extesion
		var pathExt = path.split(".").pop().toLowerCase();
		// Match
		if (typeof(ext) !== "string") {
			// Check array
			for (var i=0; i<ext.length; i++)
				if (String(ext[i]).toLowerCase() == pathExt)
					return true;
			// Nothing match? Return False
			return false;
		} else {
			// Check string
			return String(ext).toLowerCase() == pathExt;
		}
	}

	// Return utilities
	return Utils;

});