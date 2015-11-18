"use strict";
/**
 * THREE Bundles - Binary Encoder
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
define(["three", "binary-search-tree", "fs", "util", "mock-browser", "colors", "three-bundles/binary"], function(THREE, bst, fs, util, MockBrowser, colors, Binary) {

	/*

	Known Limitations

	* A TypedArray cannot have more than 4,294,967,296 items 
	* There cannot be more than 65,536 string literals in the bundle (dictionary keys, import/export labels)
	* 

	*/

	/**
	 * Import entity and property tables, along with opcodes from binary.js
	 */
	var ENTITIES = Binary.ENTITIES,
		PROPERTIES = Binary.PROPERTIES,
		NUMTYPE = Binary.NUMTYPE,
		REV = Binary.REV,
		OP = Binary.OP,
		LEN = Binary.LEN;

	/**
	 * Numerical types
	 */
	var NUMTYPE = {
		UINT8: 	 0, INT8:    1,
		UINT16:  2, INT16:   3,
		UINT32:  4, INT32:   5,
		FLOAT32: 6, FLOAT64: 7,
		//
		UNKNOWN: 8,
	};

	/**
	 * Downscaling numtype conversion table from/to
	 *
	 *  FROM	TO_DWS	TO_DELTA
	 *  ------- ------- --------
	 *  UINT16	UINT8	INT8
	 *  INT16	INT8	INT8
	 *  UINT32	UINT8	INT8
	 *  INT32	INT8	INT8
	 *  UINT32	UINT16	INT16
	 *  INT32	INT16	INT16
	 *  FLOAT32	INT8	INT8
	 *  FLOAT32	INT16	INT16
	 *
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
		TO_DWS: [
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
	 * Delta encoding scale factor
	 */
	var DELTASCALE = {
		S_001 : 1, 	// Divide by 100 the value
		S_1	  : 2, 	// Keep value as-is
		S_R   : 3, 	// Multiply by 127 on 8-bit and by 32768 on 16-bit
		S_R00 : 4,  // Multiply by 12700 on 8-bit and by 3276800 on 16-bit
	};

	/**
	 * Control Op-Codes
	 */
	var CTRL_OP = {
		EXPORT	: 0xFE, 	// External Export
	};

	/**
	 * Primitive Op-Codes
	 */
	var PRIM_OP = {
		ARRAY: 	0x00,		// Array
		OBJECT: 0xC0,		// An object
		BUFFER: 0xE0,		// A buffer
		REF: 	0xF0,		// An internal reference
		NUMBER: 0xF8,		// Number
		SIMPLE: 0xFC,		// Simple
		IMPORT:	0xFE, 		// Import from an extenral dependency
	};

	/**
	 * Array Op-Codes
	 */
	var ARR_OP = {
		DELTA:		0x00,	// Delta-Encoded TypedArray
		RAW:		0x40,	// RAW Typed Array
		REPEATED:	0x50,	// Repeated TypedArray
		DOWNSCALED:	0x60,	// Downscaled TypedArray
		SHORT:		0x70,	// Short TypedArray (0-255)
		PRIMITIVE:	0x7C,	// Primitive Array
		EMPTY:		0x7E,	// Empty Array
		REPEAT:		0x7F,	// Repeat Indicator (2-257)
	};


	/**
	 * String representation of numerical type for debug messages
	 */
	var _NUMTYPE = [
		'INT8',
		'UINT8',
		'INT16',
		'UINT16',
		'INT32',
		'UINT32',
		'FLOAT32',
		'FLOAT64',
		'UNKNOWN'
	];
	var _NUMTYPE_DOWNSCALE_DWS = [
		'UINT16 -> UINT8',
		'INT16 -> INT8',
		'UINT32 -> UINT8',
		'INT32 -> INT8',
		'UINT32 -> UINT16',
		'INT32 -> INT16',
		'FLOAT32 -> INT8',
		'FLOAT32 -> INT16'
	];
	var _NUMTYPE_DOWNSCALE_DELTA = [
		'UINT16 -> INT8',
		'INT16 -> INT8',
		'UINT32 -> INT8',
		'INT32 -> INT8',
		'UINT32 -> INT16',
		'INT32 -> INT16',
		'FLOAT32 -> INT8',
		'FLOAT32 -> INT16'
	];

	/**
	 * Pack accelerators
	 */
	var packBuffer = new ArrayBuffer(8),
		packViewU8 = new Uint8Array(packBuffer),
		packViewI8 = new Int8Array(packBuffer),
		packViewU16 = new Uint16Array(packBuffer),
		packViewI16 = new Int16Array(packBuffer),
		packViewU32 = new Uint32Array(packBuffer),
		packViewI32 = new Int32Array(packBuffer),
		packViewF32 = new Float32Array(packBuffer),
		packViewF64 = new Float64Array(packBuffer),
		pack1b = function( num, signed ) {
			var n = new Buffer(1);
			if (signed) packViewI8[0] = num;
			else packViewU8[0] = num;
			n[0] = packViewU8[0];
			return n;
		},
		pack2b = function( num, signed ) {
			var n = new Buffer(2);
			if (signed) packViewI16[0] = num;
			else packViewU16[0] = num;
			for (var i=0; i<2; i++) n[i]=packViewU8[i];
			return n;
		},
		pack4b = function( num, signed ) {
			var n = new Buffer(4);
			if (signed) packViewI32[0] = num;
			else packViewU32[0] = num;
			for (var i=0; i<4; i++) n[i]=packViewU8[i];
			return n;
		},
		pack4f = function( num ) {
			var n = new Buffer(4);
			packViewF32[0] = num;
			for (var i=0; i<4; i++) n[i]=packViewU8[i];
			return n;
		},
		pack8f = function( num ) {
			var n = new Buffer(8);
			packViewF64[0] = num;
			for (var i=0; i<8; i++) n[i]=packViewU8[i];
			return n;
		},
		packTypedArray = function( arr ) {
			return new Buffer(arr.buffer);
		},

	//////////////////////////////////////////////////////////////////
	// Binary Stream
	//////////////////////////////////////////////////////////////////

	/**
	 * Binary Stream
	 */
	var BinaryStream = function( filename, alignSize ) {

		// Local properties
		this.offset = 0;
		this.blockSize = 1024 * 16;

		// Private properties
		this.__writeChunks = [];
		this.__syncOffset = 0;
		this.__fd = null;
		this.__alignSize = 0;

		// Initialize
		this.__alignSize = alignSize || 8;
		this.__fd = fs.openSync( filename, 'w+' );
		console.log("open=",filename,",fd=",this.__fd);
	}

	/**
	 * Prototype constructor
	 */
	BinaryStream.prototype = {

		'constructor': BinaryStream,

		/**
		 * Finalise and close stream
		 */
		'close': function() {
			// Close
			fs.closeSync( this.__fd );
		},

		/**
		 * Finalize the stream
		 */
		'finalize': function() {
			// Write alignment padding
			var alignOffset = this.offset % this.__alignSize;
			if (alignOffset > 0) 
				this.write( new Buffer(new Uint8Array( this.__alignSize - alignOffset )) );
			// Synchronize
			this.__sync( true );
		},

		/**
		 * Write a number using the compile function
		 */
		'write': function( buffer ) {
			this.__writeChunks.push( buffer );
			console.log("fd=",this.__fd,", buffer=",buffer,", offset=",this.offset);
			this.offset += buffer.length;
			this.__sync();
		},

		/**
		 * Merge that stream with the current stream
		 */
		'merge': function( otherStream ) {
			var BLOCK_SIZE = this.blockSize,
				buffer = new Buffer( BLOCK_SIZE ),
				offset = 0, readBytes = 0;

			// Sync
			this.__sync( true );

			// Start iterating
			while (offset < otherStream.offset) {

				// Pick size of bytes to read
				readBytes = Math.min( BLOCK_SIZE, otherStream.offset - offset );

				// Read and write
				fs.readSync( otherStream.__fd, buffer, 0, readBytes, offset );
				console.log("<< fd=",otherStream.__fd,", len=",readBytes,", buffer=",buffer,", offset=",offset);
				console.log(">> fd=",this.__fd,", len=",readBytes,", buffer=",buffer,", offset=",this.offset);
				fs.writeSync( this.__fd, buffer, 0, readBytes, this.offset );

				// Forward offsets
				offset += readBytes;
				this.offset += readBytes;
				this.__syncOffset += readBytes;

			}

		},

		/**
		 * Synchronize write chunks to the file
		 */
		'__sync': function( flush ) {
			var BLOCK_SIZE = this.blockSize;
			console.log("| fd=",this.__fd,",pend=",this.__writeChunks);

			// Write chunks
			while (true) {
				// Proceeed only with enough data
				var dataLength = this.offset - this.__syncOffset;
				if (dataLength < BLOCK_SIZE) break;
			
				// Concat buffers
				var buf = Buffer.concat( this.__writeChunks );

				// Put buffer tail back so we always flush up to BLOCK_SIZE bytes
				this.__writeChunks = [];
				if (dataLength > BLOCK_SIZE) this.__writeChunks.push(buf.slice(BLOCK_SIZE));

				// Write buffer
				console.log("| fd=",this.__fd,",buf=",buf,",sz=",BLOCK_SIZE,",ofs=",this.__syncOffset);
				fs.writeSync( this.__fd, buf, 0, BLOCK_SIZE, this.__syncOffset );

				// Check if done
				this.__syncOffset += BLOCK_SIZE;
				if (this.__syncOffset >= this.offset) break;
			}

			// Flush remaining bytes if requested
			if (flush && (this.offset > this.__syncOffset)) {
				var buf = Buffer.concat( this.__writeChunks );
				this.__writeChunks = [];

				console.log("| fd=",this.__fd,",buf=",buf,",sz=",buf.length,",ofs=",this.__syncOffset);
				fs.writeSync( this.__fd, buf, 0, buf.length, this.__syncOffset );
				this.__syncOffset += buf.length;
			}

		},

	}

	//////////////////////////////////////////////////////////////////
	// Analysis and Encoding helper functions
	//////////////////////////////////////////////////////////////////

	/**
	 * Select an encoder according to bit size
	 */
	function pickStream(encoder, t) {
		switch (t) {
			case NUMTYPE.UINT8:
			case NUMTYPE.INT8:
				return encoder.stream8;
			case NUMTYPE.UINT16:
			case NUMTYPE.INT16:
				return encoder.stream16;
			case NUMTYPE.UINT32:
			case NUMTYPE.INT32:
			case NUMTYPE.FLOAT32:
				return encoder.stream32;
			case NUMTYPE.FLOAT64:
				return encoder.stream64;
		}
	}

	/**
	 * Return the array size in bytes of the specified type
	 */
	function sizeOfType(t) {
		switch (t) {
			case NUMTYPE.UINT8:
			case NUMTYPE.INT8:
				return 1;
			case NUMTYPE.UINT16:
			case NUMTYPE.INT16:
				return 2;
			case NUMTYPE.UINT32:
			case NUMTYPE.INT32:
			case NUMTYPE.FLOAT32:
				return 4;
			case NUMTYPE.FLOAT64:
				return 8;
		}
		return 0;
	}

	/**
	 * Get the numerical type of a typed array
	 */
	function getTypedArrayType( v ) {
		if (v instanceof Float32Array) {
			return NUMTYPE.FLOAT32;
		} else if (v instanceof Float64Array) {
			return NUMTYPE.FLOAT64;
		} else if (v instanceof Uint8Array) {
			return NUMTYPE.UINT8;
		} else if (v instanceof Int8Array) {
			return NUMTYPE.INT8;
		} else if (v instanceof Uint16Array) {
			return NUMTYPE.UINT16;
		} else if (v instanceof Int16Array) {
			return NUMTYPE.INT16;
		} else if (v instanceof Uint32Array) {
			return NUMTYPE.UINT32;
		} else if (v instanceof Int32Array) {
			return NUMTYPE.INT32;
		} else  {
			return NUMTYPE.UNKNOWN;
		}
	}

	/**
	 * Get the smallest possible numeric type fits this number
	 *
	 * @param {number} - The number to test
	 * @return {NUMTYPE} - The numerical type to rerutn
	 */
	function getNumType( v ) {
		if (v % 1 !== 0) {
			// Check for Float32 or Float64
			if (Math.abs(v) < 3.40282e+38) {
				return NUMTYPE.FLOAT32;
			} else {
				return NUMTYPE.FLOAT64;
			}
		} else {
			// Check for signed or unsigned
			if (v < 0) {
				if (v >= -128) {
					return NUMTYPE.INT8;
				} else if (v >= -32768) {
					return NUMTYPE.INT16;
				} else {
					return NUMTYPE.INT32;
				}
			} else {
				if (v < 256) {
					return NUMTYPE.UINT8;
				} else if (v < 65536) {
					return NUMTYPE.UINT16;
				} else {
					return NUMTYPE.UINT32;
				}
			}
		}
	}

	/**
	 * Pick a matching downscaling type
	 */
	function downscaleType( fromType, toType ) {
		// Lookup conversion on the downscale table
		for (var i=0; i<NUMTYPE_DOWNSCALE.FROM.length; i++) {
			if ( (NUMTYPE_DOWNSCALE.FROM[i] == fromType) && 
				 (NUMTYPE_DOWNSCALE.TO_DWS[i] == toType) )
				return i;
		}
		// Nothing found
		return undefined;
	}

	/**
	 * Pick a matching delta encoding downlscale type
	 */
	function deltaEncType( fromType, toType ) {
		// Lookup conversion on the downscale table
		for (var i=0; i<NUMTYPE_DOWNSCALE.FROM.length; i++) {
			if ( (NUMTYPE_DOWNSCALE.FROM[i] == fromType) && 
				 (NUMTYPE_DOWNSCALE.TO_DELTA[i] == toType) )
				return i;
		}
		// Nothing found
		return undefined;
	}

	/**
	 * Calculate the possibility to use delta encoding to downscale
	 * the array if we have the specified maximum delta
	 */
	function analyzeDeltaBounds( deltaMax, precisionOverSize ) {
		if (deltaMax < 0.01) {
			// A small enough value to fit in a higher grade numeric
			if (precisionOverSize) {
				return [ DELTASCALE.S_R00, NUMTYPE.INT16 ];
			} else {
				return [ DELTASCALE.S_R00, NUMTYPE.INT8 ];
			}
		} else if (deltaMax <= 1) {
			// A value between 0 and 1 
			if (precisionOverSize) {
				return [ DELTASCALE.S_R, NUMTYPE.INT16 ];
			} else {
				return [ DELTASCALE.S_R, NUMTYPE.INT8 ];
			}
		} else if (deltaMax <= 127) {
			// A value between 0 and INT8 bounds
			return [ DELTASCALE.S_1, NUMTYPE.INT8 ];
		} else if ((deltaMax <= 12700) && !precisionOverSize) {
			// A value between 0 and INT8 bounds scaled down by factor 100  (loosing in precision)
			return [ DELTASCALE.S_001, NUMTYPE.INT8 ];
		} else if (deltaMax <= 32767) {
			// A value between 0 and INT16 bounds
			return [ DELTASCALE.S_1, NUMTYPE.INT16 ];
		} else if ((deltaMax <= 3276700) && !precisionOverSize) {
			// A value between 0 and INT16 bounds scaled down by factor 100 (loosing in precision)
			return [ DELTASCALE.S_001, NUMTYPE.INT16 ];
		} else {
			// We can not fit in delta encoding
			return undefined;
		}
	}

	/**
	 * Analyze numeric array and return the smallest numerical type
	 * that will fit the specified array
	 *
	 * Returns an array with three elements:
	 * [
	 *   NUMARR, 	// What kind of numeric encoding is recommended
	 *   TYPE, 		// What kind of underlaying numeric type to use (or downscaled type if appiable)
	 *  (SCALE), 	// When downscaling float with delta encoding, this holds the scale used
	 * ]
	 *
	 * @param {array} - The array to analyze
	 */
	function analyzeNumArray( array, allowMixFloats, precisionOverSize ) {
		var min = array[0], max = array[0], // Bounds
			is_integer = false,	is_float = false, // Types
			is_repeated = true, rep_v = array[0], // Same values
			last_v = array[0], min_delta = null, max_delta = null; // Deltas

		// Iterate over array entries
		for (var i=0; i<array.length; i++) {
			var n = array[i], d=0;
			// Update bounds
			if (n > max) max = n;
			if (n < min) min = n;
			// Update delta
			if (i>0) {
				d = last_v - n;
				if (d > max_delta) max_delta = d;
				if (d < min_delta) min_delta = d;
				last_v = n;
			}
			// Same values
			if (is_repeated && (n != rep_v)) is_repeated = false;
			// Skip zeros from type detection
			if (n == 0) continue;
			// Check for float
			if (n % 1 === 0) {
				// Mark integer fields
				if (!is_integer) is_integer=true;
				// Do not mix integers and floats (unless that's zero)
				if (is_float && !allowMixFloats)
					return undefined;
			} else {
				// Float
				if (!is_float) is_float=true;
				// Do not mix integers and floats (unless that's zero)
				if (is_integer && !allowMixFloats)
					return undefined;
			}
		}

		// If neither integer or float, it's zero (just a fallback case)
		if (!is_integer && !is_float) {
			return [ ARR_OP.REPEATED, NUMTYPE.UINT8 ];
		}

		// If same value repeated, that's a repeated array
		if (is_repeated) {
			return [ ARR_OP.REPEATED, getNumType(rep_v) ];
		}

		// Pick a numerical type according to bounds
		var type = null;
		if (is_float) {
			// Check Float bounds
			if (Math.max( Math.abs(max), Math.abs(min) ) >= 3.40282e+38) {
				type = NUMTYPE.FLOAT64;
			} else {
				type = NUMTYPE.FLOAT32;
			}
		} else {
			if (min < 0) {
				// Check signed bounds
				if ((min >= -128) && (max <= 127)) {
					type = NUMTYPE.INT8;
				} else if ((min >= -32768) && (max <= 32767)) {
					type = NUMTYPE.INT16;
				} else {
					type = NUMTYPE.INT32;
				}
			} else {
				// Check unsigned bounds
				if (max < 256) {
					type = NUMTYPE.UINT8;
				} else if (max < 65536) {
					type = NUMTYPE.UINT16;
				} else {
					type = NUMTYPE.UINT32;
				}
			}
		}

		// Get original type (if typed array) of the array
		var originalType = getTypedArrayType( array );
		if (originalType == NUMTYPE.UNKNOWN) originalType = type;

		// If length is small enough, use short array representation
		if (array.length < 256) {
			var originalSize = sizeOfType( originalType ) * array.length,
				downscaleSize = sizeOfType( type ) * array.length + 2;

			// If we do not have a downscaling of better type
			if (downscaleSize >= originalSize)
				return [ ARR_OP.SHORT, originalType ]; 

		}

		// Check if we can apply delta encoding with better type than the current
		var delta = analyzeDeltaBounds( max_delta, precisionOverSize );
		if ((delta !== undefined) && (delta[1] < originalType)) {

			// Find a matching delta encoding type
			var delta_type = deltaEncType( originalType, delta[1] );
			if (delta_type == undefined) {
				console.warn("Consider protocol revision: No compact type match for delta from="+_NUMTYPE[originalType]+", to="+_NUMTYPE[delta[1]]);
			} else {
				// Return delta encoding
				return [ ARR_OP.DELTA, delta_type, delta[0] ];
			}

		}

		// Check for downscaling
		if (originalType != type) {
			if (type < originalType) {

				// Find a matching downscale type
				var dws_type = downscaleType( originalType, type );
				if (dws_type == undefined) {
					console.warn("Consider protocol revision: No compact type match for downscaling from="+_NUMTYPE[originalType]+", to="+_NUMTYPE[type]);
				} else {
					// We are downscaling
					return [ ARR_OP.DOWNSCALED, dws_type ];
				}

			} else {
				// Assert - We are upscaling?!!! Something's wrong!
				throw {
					'name' 		: 'LogicError',
					'message'	: 'A type was upscaled instead of downscaled! This should never happen!',
					toString 	: function(){return this.name + ": " + this.message;}
				};
			}
		} 

		// Nothing else works? Keep it as a raw array
		return [ ARR_OP.RAW, type ];

	}

	/**
	 * Encode an integer array with delta encoding
	 *
	 * @param {array} - Source Array
	 * @param {Class} - The class of the underlaying numeric array (ex. Uint8Array)
	 *
	 * @return {array} - An array with the initial value and the delta-encoded payload
	 */
	function deltaEncodeIntegers( array, arrayClass ) {
		var delta = new arrayClass( array.length - 1 ), l = array[0];
		for (var i=1; i<array.length; i++) {
			var v = array[i]; delta[i-1] = l - v; l = v;
		}
		return [array[0], delta];
	}

	/**
	 * Encode a float array with delta encoding
	 *
	 * @param {array} - Source Array
	 * @param {Class} - The class of the underlaying numeric array (ex. Uint8Array)
	 * @param {float} - Difference scale
	 *
	 * @return {array} - An array with the initial value and the delta-encoded payload
	 */
	function deltaEncodeFloats( array, arrayClass, scale ) {
		var delta = new arrayClass( array.length - 1 ), l = array[0];
		for (var i=1; i<array.length; i++) {
			var v = array[i]; delta[i-1] = ((l - v) * scale) | 0; l = v;
		}
		return [array[0], delta];
	}

	//////////////////////////////////////////////////////////////////
	// Encoding function
	//////////////////////////////////////////////////////////////////

	/**
	 * Write a numerical array header + length
	 */
	function encodeNumArrayHeader( encoder, array, op ) {
		// Write header
		if (op == ARR_OP.SHORT) { // 8-bit length prefix
			encoder.stream8.write( pack1b( op ) );
			encoder.stream8.write( pack1b( array.length, false ) );
		} else if (array.length < 65536) { // 16-bit length prefix
			encoder.stream8.write( pack1b( op ) );
			encoder.stream16.write( pack2b( array.length, false ) );
		} else if (array.length < 4294967296) { // 32-bit length prefix
			encoder.stream8.write( pack1b( op | 0x08 ) );
			encoder.stream32.write( pack4b( array.length, false ) );
		} else {
			throw {
				'name' 		: 'RangeError',
				'message'	: 'Array length does not fit in 32-bits!',
				toString 	: function(){return this.name + ": " + this.message;}
			};
		}
	}

	/**
	 * Encode the specified array
	 */
	function encodeArray( encoder, data ) {

		// Check for empty array
		if (array.length == 0) {
			encoder.stream8.write( pack1b( ARR_OP.EMPTY ) );
			return;
		}

		// Check for numerical array
		if ((data instanceof Uint8Array) || (data instanceof Int8Array) ||
			(data instanceof Uint16Array) || (data instanceof Int16Array) ||
			(data instanceof Uint32Array) || (data instanceof Int32Array) ||
			(data instanceof Float32Array) || (data instanceof Float64Array) ||
			((data instanceof Array) && (data.every(function(v){ return typeof v === 'number'; }))) ) {

			// Run analysis on the numbers
			var numAnalysis = analyzeNumArray( data, /* optimisation flags -> */ false, false );
			if (numAnalysis !== undefined) {

				// Write header
				encodeNumArrayHeader( encoder, data, numAnalysis[0] );

				// Delta and downscaling encoding is a special case
				if ()

			} else {
				// Assert - Detected numerical array but analysis failed, why?
				throw {
					'name' 		: 'LogicError',
					'message'	: 'Could not perform numerical analysis on a numerical array!',
					toString 	: function(){return this.name + ": " + this.message;}
				};
			}

		}

		// Encode according to description
		encoder.stream8.write( pack1b( ARR_OP.PRIMITIVE ) );

	}

	/**
	 * Encode the specified primitive
	 */
	function encodePrimitive( encoder, data ) {

	}


	//////////////////////////////////////////////////////////////////
	// Binary Encoder
	//////////////////////////////////////////////////////////////////

	/**
	 * THREE Bundles Binary encoder
	 *
	 * @param {string} filename - The output filename
	 * @param {string} bundleName - The name of the bundle (if missing) it will be the filename without the extension
	 * @param {object} metadata - An object with additional metadata to include in the bundle header
	 */
	var BinaryEncoder = function( filename, bundleName, metadata ) {

		// Open parallel streams in order to avoid memory exhaustion.
		// The final file is assembled from these chunks
		this.filename = filename;
		this.stream64 = new BinaryStream( filename + '_b64.tmp', 8 );
		this.stream32 = new BinaryStream( filename + '_b32.tmp', 4 );
		this.stream16 = new BinaryStream( filename + '_b16.tmp', 2 );
		this.stream8  = new BinaryStream( filename + '_b8.tmp', 1 );
		this.stringLookup = [];

		// Database properties
		this.dbTags = [];
		this.dbObjects = [];
		this.database = {};

	}

	/**
	 * Prototype constructor
	 */
	BinaryEncoder.prototype = {

		'constructor': BinaryEncoder,

		/**
		 * Fuse parallel streams and close
		 */
		'close': function() {

			// Finalize individual streams
			this.stream64.finalize();
			this.stream32.finalize();
			this.stream16.finalize();
			this.stream8.finalize();

			// Open final stream
			var finalStream = new BinaryStream( this.filename, 8 );
			finalStream.write( pack2b( 0x4233 ) ); // Magic
			finalStream.write( pack2b( 0x0000 ) ); // Reserved
			finalStream.write( pack4b( this.stream64.offset ) );     // 64-bit buffer lenght
			finalStream.write( pack4b( this.stream32.offset ) );     // 32-bit buffer lenght
			finalStream.write( pack4b( this.stream16.offset ) );     // 16-bit buffer length
			finalStream.write( pack4b( this.stream8.offset ) );      // 8-bit buffer length
			finalStream.write( pack4b( this.stringLookup.length ) ); // String lookup table length

			// Merge individual streams
			finalStream.merge( this.stream64 );
			finalStream.merge( this.stream32 );
			finalStream.merge( this.stream16 );
			finalStream.merge( this.stream8 );

			// Write down null-terminated string lookup table in the end
			for (var i=0; i<this.stringLookup.length; i++) {
				finalStream.write( new Buffer( stringLookup[i] ) );
				finalStream.write( new Buffer( [0] ) );
			}

			// Close
			finalStream.finalize();
			finalStream.close();

		},

		/**
		 * Define an external database of tagged objects to use
		 * for cross-referencing external entities.
		 */
		'setDatabase': function( db, prefix ) {
			if (!prefix) prefix="";
			// Import into an easy-to-process format
			var keys = Object.keys(db);
			for (var i=0; i<keys.length; i++) {
				var k = keys[i];
				if (!db.hasOwnProperty(k)) continue;
				this.dbTags.push( prefix+k );
				this.dbObjects.push( db[k] );
			}
			// Keep reference of database
			this.database = db;
		},

		/**
		 * Encode entity
		 */
		'encode': function( entity, name ) {

			this.stream64.write( pack8f(0x0102030405060708) );
			this.stream32.write( pack4b(0xAABBCCDD) );
			this.stream16.write( pack2b(0x1122) );
			this.stream8.write( pack1b(0x33) );
			this.stream8.write( pack1b(0x44) );

		},

	};


	/**
	 * Return binary encoder
	 */
	return BinaryEncoder;

});