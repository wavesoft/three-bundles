"use strict";
/**
 * THREE Bundles - Binary Decoder
 * Copyright (C) 2015 Ioannis Charalampidis <ioannis.charalampidis@cern.ch>
 * 
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @author Ioannis Charalampidis / https://github.com/wavesoft
 */
define(["three-bundles/lib/objects"], function(ObjectTable) {

	var PBUND_LOADING = 0,
		PBUND_LOADED = 1,
		PBUND_ERROR = 2;

	/**
	 * Numerical types
	 */
	var NUMTYPE = {
		UINT8: 	 0, INT8:    1,
		UINT16:  2, INT16:   3,
		UINT32:  4, INT32:   5,
		FLOAT32: 6, FLOAT64: 7
	}

	/**
	 * Downscaling numtype conversion table
	 */
	var NUMTYPE_DOWNSCALE = {
		// Source conversion type (actual)
		FROM: [
			NUMTYPE.UINT16,
			NUMTYPE.INT16,
			NUMTYPE.UINT32,
			NUMTYPE.INT32,
			NUMTYPE.UINT32,
			NUMTYPE.INT32,
			NUMTYPE.FLOAT32,
			NUMTYPE.FLOAT32,
		],
		// Destination conversion type (for downscaling)
		TO_DWS: [
			NUMTYPE.UINT8,
			NUMTYPE.INT8,
			NUMTYPE.UINT8,
			NUMTYPE.INT8,
			NUMTYPE.UINT16,
			NUMTYPE.INT16,
			NUMTYPE.INT8,
			NUMTYPE.INT16,
		],
		// Destination conversion type (for delta encoding)
		TO_DELTA: [
			NUMTYPE.INT8,
			NUMTYPE.INT8,
			NUMTYPE.INT8,
			NUMTYPE.INT8,
			NUMTYPE.INT16,
			NUMTYPE.INT16,
			NUMTYPE.INT8,
			NUMTYPE.INT16,
		]
	};

	/**
	 * Numerical type classes
	 */
	var NUMTYPE_CLASS = [
		Uint8Array,
		Int8Array,
		Uint16Array,
		Int16Array,
		Uint32Array,
		Int32Array,
		Float32Array,
		Float64Array
	];

	/**
	 * Numerical downscale classes
	 */
	var NUMTYPE_DOWNSCALE_DWS_CLASS = [
		Uint8Array,
		Int8Array,
		Uint8Array,
		Int8Array,
		Uint16Array,
		Int16Array,
		Int8Array,
		Int16Array
	];

	/**
	 * Numerical delta encoded classes
	 */
	var NUMTYPE_DOWNSCALE_DELTA_CLASS = [
		Int8Array,
		Int8Array,
		Int8Array,
		Int8Array,
		Int16Array,
		Int16Array,
		Int8Array,
		Int16Array
	];

	/**
	 * Delta encoding scale factor
	 */
	var DELTASCALE = {
		S_001 : 1, 	// Divide by 100 the value
		S_1	  : 2, 	// Keep value as-is
		S_R   : 3, 	// Multiply by 127 on 8-bit and by 32768 on 16-bit
		S_R00 : 4,  // Multiply by 12700 on 8-bit and by 3276800 on 16-bit
	};

	/**
	 * Simple primitive translation
	 */
	var PRIM_SIMPLE = [ undefined, null, false, true ],
		PRIM_SIMPLE_EX = [ NaN, /* Reserved */ ];

	//////////////////////////////////////////////////////////////////
	// Decoding Functions
	//////////////////////////////////////////////////////////////////

	/**
	 * Get the scale factor for the specified float-based delta encoding
	 * using the NUMTYPE_DOWNSCALE and DELTASCALE provided.
	 * 
	 * @param {int} t - The NUMTYPE_DOWNSCALE used in the encoding
	 * @param {int} scale - The DELTASCALE used in the encoding
	 * @return {float} - Return the scale factor
	 */
	function getFloatDeltaScale(t, scale) {
		if (scale == DELTASCALE.S_1)
			return 1.0;
		else if (scale == DELTASCALE.S_001)
			return 0.01;
		else {
			var multiplier = 1.0;
			if (scale == DELTASCALE.S_R00) multiplier = 100.0;
			// Check for INT8 target
			if ( ((t >= 0) && (t <= 3)) || (t == 6) ) {
				return multiplier * 127;
			} else {
				return multiplier * 32768;
			}
		}
	}

	/**
	 * Read a buffer from the bundle
	 */
	function decodeBuffer( bundle, len, buf_type ) {
	}

	/**
	 * Read an object from the bundle
	 */
	function decodeObject( bundle, database, ot, eid_hi ) {
		
	}

	/**
	 * Decode delta-encoded float array
	 */
	function decodeDeltaArrayFloat( bundle, value_0, values, scale ) {
		var ans = new Float32Array[ values.length + 1 ],
			v = value_0;
		ans[0] = v;
		for (var i=0, llen=values.length; i<llen; i++) {
			v += values[i] / scale;
			ans[i+1] = v;
		}
	}

	/**
	 * Decode delta-encoded float array
	 */
	function decodeDeltaArrayInt( bundle, value_0, values, array_class ) {
		var ans = new array_class[ values.length + 1 ],
			v = value_0;
		ans[0] = v;
		for (var i=0, llen=values.length; i<llen; i++) {
			v += values[i];
			ans[i+1] = v;
		}
	}

	/**
	 * Decode primitive array
	 */
	function decodePrimitiveArray( bundle, database, length ) {
		var i=0, ans = [], flag=255, len;

		// Collect primitives
		while (arr.length<length) {
			var op = bundle.readTypedNum[ NUMTYPE.UINT8 ]();
			if ((op & 0x7C) == 0x78) { // Flag
				flag = op & 0x03;
				switch (flag) {
					case 0: // REPEAT
						len = bundle.readTypedNum[ NUMTYPE.UINT8 ](); // Flag_LEN
						break;
					case 1: // NUMERIC
						break;
					default:
						throw {
							'name' 		: 'AssertError',
							'message'	: 'Unknown primitive array flag #'+flag+'!',
							toString 	: function(){return this.name + ": " + this.message;}
						}
				}
			} else { // Primitive
				var prim = decodePrimitive( bundle, database );
				if (flag == 255) {
					// Apply flags to primitive
					switch (flag) {
						case 0: // REPEAT (Repeat primitive)
							for (var i=0; i<len; i++) ans.push(prim);
							break;
						case 1: // NUMERIC (Merge numeric values from primitive)
							ans = ans.concat( Array.prototype.slice.call(prim) );
							break;
					}
				} else {
					// Reset flag
					flag = 255;
					// Keep primitive
					ans.push(prim);
				}
			}
		}

		// Return array
		return ans;

	}

	/**
	 * Read an array from the bundle
	 */
	function decodeArray( bundle, database, op ) {
		var ln3 = (((op & 0x8) >> 3) == 0) ? NUMTYPE.INT16 : NUMTYPE.INT32, 
			ln0 = ((op & 0x1) == 0) ? NUMTYPE.INT16 : NUMTYPE.INT32,
			scl = (op & 0x30) >> 4,
			typ = (op & 0x7);

		if ((op & 0x40) == 0x00) { // Delta-Encoded
			var l = bundle.readTypedNum[ ln3 ](),
				v0 = bundle.readTypedNum[ NUMTYPE_DOWNSCALE.FROM[typ] ](),
				vArr = bundle.readTypedArray[ NUMTYPE_DOWNSCALE.TO_DELTA[typ] ]( l );

			if (typ < 6) {
				// Return delta-decoded integer array
				return decodeDeltaArrayInt(bundle,
					v0,
					vArr,
					NUMTYPE_CLASS[ NUMTYPE_DOWNSCALE.FROM[typ] ] );
			} else {
				// Return delta-decoded float array
				return decodeDeltaArrayFloat(bundle,
					v0,
					vArr,
					getFloatDeltaScale(typ, scl) );
			}


		} else if ((op & 0x70) == 0x40) { // Raw
			var l = bundle.readTypedNum[ ln3 ](),

			// Return raw array
			return bundle.readTypedArray[ typ ]( l );

		} else if ((op & 0x70) == 0x50) { // Repeated
			var l = bundle.readTypedNum[ ln3 ](),
				v0 = bundle.readTypedNum[ typ ](),
				arr = new NUMTYPE_CLASS[ typ ]( l );

			// Repeat value
			for (var i=0; i<l; i++) arr[i]=v0;
			return arr;

		} else if ((op & 0x70) == 0x60) { // Downscaled
			var l = bundle.readTypedNum[ ln3 ](),
				v0 = bundle.readTypedNum[ NUMTYPE_DOWNSCALE.FROM[typ] ](),
				vArr = bundle.readTypedArray[ NUMTYPE_DOWNSCALE.TO_DWS[typ] ]( l ),
				nArr = new NUMTYPE_CLASS[ NUMTYPE_DOWNSCALE.FROM[typ] ]( l );

			// Type-cast array
			for (var i=0; i<l; i++) nArr[i]=vArr[i];
			return nArr;

		} else if ((op & 0x78) == 0x70) { // Short
			var l = bundle.readTypedNum[ NUMTYPE.UINT8 ](),
				vArr = bundle.readTypedArray[ typ ]( l );

			// Return short array
			return vArr;

		} else if ((op & 0x7C) == 0x78) { // Flag
			// This operator is used ONLY as indicator when parsing a primitive array
			throw {
				'name' 		: 'AssertError',
				'message'	: 'Encountered FLAG operator outside a primitive array!',
				toString 	: function(){return this.name + ": " + this.message;}
			}

		} else if ((op & 0x7E) == 0x7C) { // Primitive
			var l = bundle.readTypedNum[ ln0 ]();

			// Return decoded primitive array
			return decodePrimitiveArray( bundle, database, l );

		} else if ((op & 0x7F) == 0x7E) { // Empty

			// Return empty array
			return [];

		} else if ((op & 0x7F) == 0x7F) { // Extended
			// Currently unused
		}
	}

	/**
	 * Read a primitive from the bundle
	 */
	function decodePrimitive( bundle, database ) {
		var op = bundle.readTypedNum[ NUMTYPE.UINT8 ]();
		if ((op & 0x80) == 0x00) { // Array
			return decodeArray(bundle, database,
				(op & 0x7F) );

		} else if ((op & 0xC0) == 0x80) { // Object
			return decodeObject(bundle, database,
				(op & 0x30) >> 4,
				(op & 0x0F) );

		} else if ((op & 0xE0) == 0xC0) { // Buffer
			return decodeBuffer(bundle,
				(op & 0x18) >> 3,
				(op & 0x07) );

		} else if ((op & 0xF0) == 0xE0) { // I-Ref
			var id = ((op & 0x0F) << 4) | bundle.readTypedNum[ NUMTYPE.UINT8 ]();
			return bundle.iref_table[id];

		} else if ((op & 0xF8) == 0xF0) { // Number
			return bundle.readTypedNum[ op & 0x07 ]();

		} else if ((op & 0xFC) == 0xF8) { // Simple
			return PRIM_SIMPLE[ op & 0x03 ];

		} else if ((op & 0xFE) == 0xFC) { // Simple_EX
			return PRIM_SIMPLE_EX[ op & 0x02 ];

		} else if ((op & 0xFF) == 0xFE) { // Import
			var name = bundle.readStringLT();
			if (database[name] == undefined) throw {
				'name' 		: 'ImportError',
				'message'	: 'Cannot import undefined external reference '+name+'!',
				toString 	: function(){return this.name + ": " + this.message;}
			};
			return database[name];

		} else if ((op & 0xFF) == 0xFF) { // Extended
			// Currently unused
		}
	}

	/**
	 * Pare the entire bundle
	 */
	function parseBundle( bundle, database, onsuccess, onerror ) {

	}

	//////////////////////////////////////////////////////////////////
	// Binary Bundle Representation
	//////////////////////////////////////////////////////////////////

	/**
	 * Representation of the binary bundle from buffer
	 */
	var BinaryBundle = function( buffer ) {

		// Setup views to the buffer
		this.u8  = new Uint8Array(buffer);
		this.s8  = new Int8Array(buffer);
		this.u16 = new Uint16Array(buffer);
		this.s16 = new Int16Array(buffer);
		this.u32 = new Uint32Array(buffer);
		this.s32 = new Int32Array(buffer);
		this.f32 = new Float32Array(buffer);
		this.f64 = new Float64Array(buffer);

		// Read header
		var header_size = 24;
		this.magic  	= this.u16[0];
		this.reserved  	= this.u16[1];
		this.max64  	= this.u32[1];
		this.max32 		= this.u32[2];
		this.max16 		= this.u32[3];
		this.max8  		= this.u32[4];

		// Setup indices
		this.i64 = header_size;
		this.i32 = this.i64 + this.max64;
		this.i16 = this.i32 + this.max32;
		this.i8  = this.i16 + this.max16;

		// Element ID lookup table
		this.eid_table = [];

		// Signature lookup table
		this.signature_table = [];

		// String lookup table
		this.string_table = [];

		// Populate string lookup table
		var str = "";
		for (var i=this.i8+this.max8, llen=buffer.byteLength; i<llen; i++) {
			var c = this.u8[i];
			if (c == 0) {
				this.string_table.push(str);
				str = "";
				// Break if we reached the end of the table (two consecutive zeros)
				if (this.u8[i+1] == 0) break;
			} else {
				str += String.fromCharCode(c);
			}
		}

		// Create fast numerical read functions
		var scope = this;
		this.readTypedNum = [
			function() { return scope.u8[scope.i8++]; },
			function() { return scope.s8[scope.i8++]; },
			function() { var v = scope.i16; scope.i16+=2; return scope.u16[v] },
			function() { var v = scope.i16; scope.i16+=2; return scope.s16[v] },
			function() { var v = scope.i32; scope.i32+=4; return scope.u32[v] },
			function() { var v = scope.i32; scope.i32+=4; return scope.s32[v] },
			function() { var v = scope.i32; scope.i32+=4; return scope.f32[v] },
			function() { var v = scope.i64; scope.i64+=8; return scope.f64[v] },
		];

		// Create fast typed array read function
		this.readTypedArray = [
			function (l) { var o = scope.i8,  l = l;     scope.i8  += l; return new Uint8Array(buffer, o, l); },
			function (l) { var o = scope.i8,  l = l;     scope.i8  += l; return new Int8Array(buffer, o, l); },
			function (l) { var o = scope.i16, l = l * 2; scope.i16 += l; return new Uint16Array(buffer, o, l); },
			function (l) { var o = scope.i16, l = l * 2; scope.i16 += l; return new Int16Array(buffer, o, l); },
			function (l) { var o = scope.i32, l = l * 4; scope.i32 += l; return new Uint32Array(buffer, o, l); },
			function (l) { var o = scope.i32, l = l * 4; scope.i32 += l; return new Int32Array(buffer, o, l); },
			function (l) { var o = scope.i32, l = l * 4; scope.i32 += l; return new Float32Array(buffer, o, l); },
			function (l) { var o = scope.i64, l = l * 8; scope.i64 += l; return new Float64Array(buffer, o, l); },
		];

	}

	/**
	 * Read a 16-bit string lookup table ID and translate to it's string
	 */
	BinaryBundle.prototype.readStringLT = function() {
		var id = this.readTypedNum[ NUMTYPE.UINT16 ]();
		if (id >= this.string_table.length) throw {
			'name' 		: 'RangeError',
			'message'	: 'String ID is outside than the string lookup table!',
			toString 	: function(){return this.name + ": " + this.message;}
		}
		return this.string_table[id];
	}

	//////////////////////////////////////////////////////////////////
	// Binary Loader
	//////////////////////////////////////////////////////////////////

	/**
	 * Binary bundle loader
	 */
	var BinaryLoader = function() {

		this.dbObjects = [];
		this.database = {};

		// Collection of parsers pending
		this.pendingBundleParsers = [];

	};

	/**
	 * 
	 */
	BinaryLoader.prototype = {

		'constructor': BinaryLoader,

		/**
		 * Load the specified bundle from URL and call the onsuccess callback.
		 * If an error occures, call the onerror callback.
		 *
		 * @param {string} url - The URL to load
		 * @param {function} onsuccess - The callback to fire when the bundle is loaded
		 * @param {function} onerror - The callback to fire an error occures
		 */
		'load': function( url, onsuccess, onerror ) {

			// Request binary bundle
			var req = new XMLHttpRequest(),
				scope = this;

			// Place request
			req.open('GET', url);
			req.responseType = "arraybuffer";
			req.send();

			// Load bundle header and keep a callback
			// for the remainging loading operations
			var pendingBundle = {
				'callback': function() { },
				'status': PBUND_LOADING,
				'meta': {},
			};

			// Keep this pending action
			this.pendingBundleParsers.push( pendingBundle );

			// Wait until the bundle is loaded
			req.onreadystatechange = function () {
				if (req.readyState !== 4) return;
				try {

					// Setup the parser callback
					pendingBundle.callback = parseBundle.bind( {}, new BinaryBundle( req.response ) );

					// Update bundle status
					pendingBundle.status = PBUND_LOADED;

				} catch (e) {

					// Update bundle status
					pendingBundle.status = PBUND_ERROR;
					// Fire error callback
					if (onerror) onerror("Error parsing bundle "+url+": "+e.toString());

				}
			}

		},

		/**
		 * Parse the stack of bundles currently loaded
		 */
		'parse': function( onsuccess, onerror ) {

			// Parse everything
			for (var i=0; i<this.pendingBundleParsers.length; i++) {

				// Parse into the database
				this.pendingBundleParsers[i].callback( this.database );

			}

			// Release parser scope
			this.pendingBundleParsers = [];

		}

	};

	// Return the binary loader
	return BinaryLoader;

});