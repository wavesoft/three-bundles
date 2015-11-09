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

	/**
	 * Import BinarySearchTree
	 */
	var BinarySearchTree = bst.BinarySearchTree,
		objectBstComparison = function(a,b) {
			for (var i=0; i<a.length; i++) {
				if (a[i] < b[i]) return -1;
				if (a[i] > b[i]) return 1;
				if (a[i] !== b[i]) return 1;
			  /*if (a[i] == b[i]) continue;*/
			}
			return 0;
		},
		objectBstEquals = function(a,b) {
			for (var i=0; i<a.length; i++) {
				if (a[i] !== b[i]) return false;
			}
			return true;
		};

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
		};

	/**
	 * Import entity and property tables, along with opcodes from binary.js
	 */
	var ENTITIES = Binary.ENTITIES,
		PROPERTIES = Binary.PROPERTIES,
		NUMTYPE = Binary.NUMTYPE,
		REV = Binary.REV,
		OP = Binary.OP;

	/**
	 * LEN constants
	 */
	var LEN = {
		U8: 0,
		U16: 1,
		U32: 2
	};

	/**
	 * THREE.js will create an <img /> element when loading textures, 
	 * therefore we are replacing the Image element from the binary entity
	 * description with the one we faked using MockBrowser....
	 */
	var mock = new MockBrowser.mocks.MockBrowser();
	ENTITIES[69][0] = mock.getDocument().createElement('img').constructor;

	/**
	 * Custom function to embed image payload when compiling the image element
	 */
	ENTITIES[69][3] = function( values, object ) {

		var fname = values[0];
		console.log("INFO:".green, "Embedding",fname.magenta);

		var buf = fs.readFileSync( values[0] ),
			ext = values[0].split(".").pop().toLowerCase(),
			contentType = "";

		// Expand 'jpg' to jpeg
		if (ext == "jpg") ext = "jpeg";

		// Prepend image type
		if (ext.length < 4)
			ext += Array(5 - ext.length).join(' ');

		// Include type as prefix
		buf = Buffer.concat([ new Buffer(ext), buf ]);

		// Convert buffer to Uint8Array
        var ab = new ArrayBuffer( buf.length );
        var view = new Uint8Array(ab);
        for (var i = 0; i < buf.length; ++i) {
            view[i] = buf[i];
        }

		// Replace url
		values[0] = view;

	};

	/**
	 * CubeCamera needs a special way for extracting properties
	 */
	ENTITIES[65][3] = function( values, object ) {
		values[0] = object.cameraPX.near;
		values[1] = object.cameraPX.far;
		values[2] = object.cameraPX.renderTarget.width;
	}

	/**
	 * String representation of every type
	 */
	var _TYPENAME = [
		'INT8', 
		'UINT8',
		'INT16',
		'UINT16',
		'INT32',
		'UINT32',
		'FLOAT32',
		'FLOAT64',
		'INT24',
		'UINT24'
	];
	var _ENCTYPENAME = [
		'DIFF8',
		'DIFF16'
	];

	/**
	 * THREE Bundles Binary encoder
	 *
	 * @param {string} filename - The output filename
	 * @param {string} bundleName - The name of the bundle (if missing) it will be the filename without the extension
	 * @param {object} metadata - An object with additional metadata to include in the bundle header
	 */
	var BinaryEncoder = function( filename, bundleName, metadata ) {

		/**
		 * Enable cross-referencing to objects in the same bundle
		 *
		 * This effectively de-duplicates simmilar objects and therefore
		 * it's a good idea to keep it on.
		 *
		 * 0 = Disable cross-referencing
		 * 1 = Enable cross-referecing only ByRef
		 * 2 = Enable cross-referencing by ByRef and ByVal
		 *
		 * @property {int}
		 */
		this.useCrossRef = 2;

		/**
		 * Enable compacting of consecutive numbers
		 * 
		 * If TRUE will optimise cases were multiple numbers are encountered
		 * when encoding an object. In that case instead of having multiple
		 * number opcodes there is one array instead, thus reducing their size.
		 *
		 * If unsure, keep it to TRUE
		 *
		 * @property {boolean}
		 */
		this.useCompact = true;

		/**
		 * Be strict when analyzing arrays
		 *
		 * If TRUE float and integer values will never mix on the same array
		 * when trying to optimise it. If false, this might break some javascript 
		 * code if due to rounding errors when an integer gets converted to float.
		 *
		 * If unsure, keep it to TRUE. 
		 *
		 * @property {boolean}
		 */
		this.useStrictFloat = true;

		/**
		 * Perserve the typed array types
		 *
		 * If TRUE and the encoder encounters a TypedArray, it will
		 * not try to further optimise it, but it will perseve it's type.
		 *
		 * This can increase the file size 
		 *
		 * @property {boolean}
		 */
		this.usePerservingOfTypes = false;

		/**
		 * Enable differential encoding algorithm.
		 *
		 * This algoritm tries to compress higher-grade arrays
		 * to lower-grade arrays by keeping the difference between
		 * the values, which is likely to be smaller than the
		 * value itself.
		 *
		 * 0 = Disable differential encoding
		 * 1 = Enable differentla encoding only for Integers
		 * 2 = Enable differentla encoding for Integers and Floats
		 *
		 * @property {int}
		 */
		this.useDiffEnc = 2;

		/**
		 * Percision (or better multiplication scale) for float-to-int conversion
		 * when downgrading a Float32/Float32 to Int8 or Int16.
		 *
		 * If you are using many normalized floats (0.0 - 1.0), a value
		 * of 10,000 is usually good.
		 *
		 * @param {int}
		 */
		this.diffEncPrecision = 10000;

		/**
		 * Thresshold in number of elements after which differential encoding is applied.
		 *
		 * This is useful since differential encoding isn't going to compress much if
		 * the array is already too small. Therefore for performance reasons the default
		 * value is 16.
		 *
		 * @param {int}
		 */
		this.diffEncElmThreshold = 16;

		/**
		 * Enable entity property vectorisation on arrays
		 *
		 * When this is enabled and multiple entities of the same type are found in an 
		 * array, the compiler will attempt to compact them by adding one entity prefix
		 * and multiple arrays for their properties.
		 *
		 * @param {boolean}
		 */
		this.useEntityVectors = false;

		// Debug logging flags
		this.logWrite 		= false;
		this.logPrimitive 	= false;
		this.logArray 		= false;
		this.logRef 		= false;
		this.logAlign 		= false;
		this.logEntity		= false;
		this.logCompact 	= false;
		this.logDiffEnc 	= false;
		this.logTag			= false;

		// Get bundle name from filename if not provided
		if (bundleName == undefined) {
			// Strip extension 
			var ext = filename.split(".").pop();
			bundleName = filename.substr(0,filename.length-ext.length-1);
		}
		this.bundleName = bundleName;

		// Writing file offset
		this.offset = 0;

		// REF object references
		this.encodedReferences = [ ];
		this.encodedByValBST = new Array( ENTITIES.length );

		// Cross-reference across bundles throguh database of tags
		this.database = { };
		this.dbObjects = [ ];
		this.dbTags = [ ];

		// Write buffer for fixing javascript synchronisation
		this.writeBuf = [];
		this.writeActive = false;

		// Dictionary key lokup
		this.keyDictIndex = [ ];

		// Open write stream
		console.log("INFO:".green, "Creating bundle", filename.cyan);
		this.fd = fs.openSync( filename, 'w' );
		this.writeBuffer = [];
		this.writeOffset = 0;

		// Prepare metadata
		var meta = metadata || { };
		meta['name'] = bundleName;
		meta['rev'] = REV;
		meta['precision'] = this.diffEncPrecision;

		// Write bundle header
		this.writePrimitive( meta );

	};

	/**
	 * Close the stream
	 */
	BinaryEncoder.prototype.close = function() {
		// Write key index
		this.writeKeyIndex();
		// Flush
		this.writeSync( true );
		// Finalize stream
		fs.closeSync( this.fd );
	}

	/**
	 * Define an external database of tagged objects to use
	 * for cross-referencing external entities.
	 */
	BinaryEncoder.prototype.setDatabase = function( db, prefix ) {
		if (!prefix) prefix="";

		// Import into an easy-to-process format
		for (var k in db) {
			if (!db.hasOwnProperty(k)) continue;
			this.dbTags.push( prefix+k );
			this.dbObjects.push( db[k] );
		}

		// Keep reference of database
		this.database = db;

	}

	////////////////////////////////////////////////////////////
	// Low-level stream writing
	////////////////////////////////////////////////////////////

	/**
	 * Write an unsigned byte (used for opcodes)
	 */
	BinaryEncoder.prototype.writeUint8 = function( d ) {
		if (this.logWrite) console.log("    #".blue+String(this.offset).blue.bold+":",d);
		this.offset += 1;
		this.writeBuffer.push( pack1b(d, false) );
		this.writeSync();
	}

	/**
	 * Write a signed byte (used for small values)
	 */
	BinaryEncoder.prototype.writeInt8 = function( d ) {
		if (this.logWrite) console.log("    #".blue+String(this.offset).blue.bold+":",d);
		this.offset += 1;
		this.writeBuffer.push( pack1b(d, true) );
		this.writeSync();
	}

	/**
	 * Write a 16-bit unsigned number
	 */
	BinaryEncoder.prototype.writeUint16 = function( d ) {
		if (this.logWrite) console.log("    #".blue+String(this.offset).blue.bold+":",d);
		this.offset += 2;
		this.writeBuffer.push( pack2b(d, false) );
		this.writeSync();
	}

	/**
	 * Write a 16-bit number
	 */
	BinaryEncoder.prototype.writeInt16 = function( d ) {
		if (this.logWrite) console.log("    #".blue+String(this.offset).blue.bold+":",d);
		this.offset += 2;
		this.writeBuffer.push( pack2b(d, true) );
		this.writeSync();
	}

	/**
	 * Write a 24-bit unsigned number
	 */
	BinaryEncoder.prototype.writeUint24 = function( d ) {
		if (this.logWrite) console.log("    #".blue+String(this.offset).blue.bold+":",d);
		this.writeUint8((d & 0xff0000) >> 16);
		this.writeUint16(d & 0xffff);
	}

	/**
	 * Write a 32-bit unsigned number
	 */
	BinaryEncoder.prototype.writeUint32 = function( d ) {
		if (this.logWrite) console.log("    #".blue+String(this.offset).blue.bold+":",d);
		this.offset += 4;
		this.writeBuffer.push( pack4b(d, false) );
		this.writeSync();
	}

	/**
	 * Write a 32-bit signed number
	 */
	BinaryEncoder.prototype.writeInt32 = function( d ) {
		if (this.logWrite) console.log("    #".blue+String(this.offset).blue.bold+":",d);
		this.offset += 4;
		this.writeBuffer.push( pack4b(d, true) );
		this.writeSync();
	}

	/**
	 * Write a 32-bit float number
	 */
	BinaryEncoder.prototype.writeFloat32 = function( d ) {
		if (this.logWrite) console.log("    #".blue+String(this.offset).blue.bold+":",d);
		this.offset += 4;
		this.writeBuffer.push( pack4f(d) );
		this.writeSync();
	}

	/**
	 * Write an 64-bit float number
	 */
	BinaryEncoder.prototype.writeFloat64 = function( d ) {
		if (this.logWrite) console.log("    #".blue+String(this.offset).blue.bold+":",d);
		this.offset += 8;
		this.writeBuffer.push( pack8f(d) );
		this.writeSync();
	}

	/**
	 * Write a string stream
	 */
	BinaryEncoder.prototype.writeString = function( d ) {
		if (this.logWrite) console.log("    #".blue+String(this.offset).blue.bold+":",d);
		this.offset += d.length;
		this.writeBuffer.push( new Buffer(d) );
		this.writeSync();
	}

	/**
	 * Write buffer
	 */
	BinaryEncoder.prototype.writeSync = function( flush ) {

		// Proceeed only with enough data
		if ((this.offset - this.writeOffset < 8192) && !flush) return;
	
		// Concat buffers
		var buf = Buffer.concat( this.writeBuffer );
		this.writeBuffer = [];
		this.writeOffset = this.offset;

		// Write buffer
		fs.writeSync( this.fd, buf, 0, buf.length );

	}

	////////////////////////////////////////////////////////////
	// 32-bit aligned opcode helpers
	////////////////////////////////////////////////////////////

	/**
	 * Write a number or numeric array according to indexed type
	 */
	BinaryEncoder.prototype.writeNum = function( v, type ) {

		// Lookup table for typed functions
		var typeFn = [
			this.writeInt8,    this.writeUint8,
			this.writeInt16,   this.writeUint16,
			this.writeInt32,   this.writeUint32,
			this.writeFloat32, this.writeFloat64,
		];
		
		if ((v instanceof Array) || (v instanceof Uint8Array) || (v instanceof Int8Array) ||
			(v instanceof Uint16Array) || (v instanceof Int16Array) ||
			(v instanceof Uint32Array) || (v instanceof Int32Array) ||
			(v instanceof Float32Array) || (v instanceof Float64Array)) {
			// Write array
			for (var i=0; i<v.length; i++)
				typeFn[type].call( this, v[i] );
		} else {
			// Write single value
			typeFn[type].call( this, v );
		}

	}

	/**
	 * Write padding opcode if needed to align to specified length
	 */
	BinaryEncoder.prototype.writeAlign = function( length, pad ) {

		// Default pad size
		if (!pad) pad = 0;

		// Calculate pad size
		var padSize = (length - ((this.offset + pad) % length)) % 8;
		if (padSize == 0) return;
		if (this.logAlign) console.log("ALN ".cyan+"@".blue+String(this.offset).blue.bold+": length=",length,", pad=", pad, ", effective=",padSize);

		// Write opcode + write pad characters
		this.writeUint8( OP.PAD_ALIGN | padSize );
		for (var i=1; i<padSize; i++)
			this.writeUint8(0);

	}

	/**
	 * Write padding opcode accordin to type and index length
	 */
	BinaryEncoder.prototype.writeAlignFor = function( type, len, extra ) {
		var sz=0, pad=0;

		// Get type size
		switch (type) {
			case NUMTYPE.UINT8:
			case NUMTYPE.INT8:
				sz=1; break;
			case NUMTYPE.UINT16:
			case NUMTYPE.INT16:
				sz=2; break;
			case NUMTYPE.UINT32:
			case NUMTYPE.INT32:
			case NUMTYPE.FLOAT32:
				sz=4; break;
			case NUMTYPE.FLOAT64:
				sz=8; break;
		}

		// Get pad size
		switch (len) {
			case LEN.U8:
				pad=1; break;
			case LEN.U16:
				pad=2; break;
			case LEN.U32:
				pad=4; break;
		}

		// Extra padding
		if (extra) pad+=extra;

		// Write alignment pad
		this.writeAlign( sz, pad );
	}

	////////////////////////////////////////////////////////////
	// Helper functions
	////////////////////////////////////////////////////////////

	/**
	 * Iterate over array and write using specified function
	 */
	BinaryEncoder.prototype.iterateAndWrite = function( array, writeFn ) {
		for (var i=0; i<array.length; i++)
			writeFn.call(this, array[i] );
	}

	/**
	 * Lookup and if needed update the key index
	 */
	BinaryEncoder.prototype.getKeyIndex = function( key ) {
		// Check if this key exists in index
		var idx = this.keyDictIndex.indexOf( key );

		// Allocate new key if missing
		if (idx == -1) {
			idx = this.keyDictIndex.length;
			this.keyDictIndex.push( key );
		}

		// Return idnex
		return idx;
	}

	/**
	 * Get minimum type to fit this number
	 */
	BinaryEncoder.prototype.getNumTYPE = function( v, include_24 ) {

		// First, check for integers
		if (v % 1 === 0) {

			// Check for signed or unsigned
			if (v > 0) {
				if (v < 256) {
					return NUMTYPE.UINT8;
				} else if (v < 65536) {
					return NUMTYPE.UINT16;
				} else if (include_24 && (v < 16777216)) {
					return NUMTYPE.UINT24;
				} else {
					return NUMTYPE.UINT32;
				}
			} else {
				if (v >= -128) {
					return NUMTYPE.INT8;
				} else if (v >= -32768) {
					return NUMTYPE.INT16;
				} else if (include_24 && (v >= -8388608)) {
					return NUMTYPE.INT24;
				} else {
					return NUMTYPE.INT32;
				}
			}

		// We have only 2 types for floats
		} else {

			// Check for Float32 or Float64
			if (Math.abs(v) < 3.40282e+38) {
				return NUMTYPE.FLOAT32;
			} else {
				return NUMTYPE.FLOAT64;
			}

		}

	}

	/**
	 * Get the TYPE opcode that defines the length of the array
	 */
	BinaryEncoder.prototype.getLEN = function( v ) {
		if (v.length < 256) {
			return LEN.U8;
		} else if (v.length < 65536) {
			return LEN.U16;
		} else {
			return LEN.U32;
		}
	}

	/**
	 * Apply downscaling factor
	 */
	BinaryEncoder.prototype.applyDT = function( type, dt ) {
		switch (type) {
			case NUMTYPE.INT8:
			case NUMTYPE.UINT8:
				// No downscaling appliable
				return type;

			case NUMTYPE.INT16:
			case NUMTYPE.UINT16:
				// Downscale to 8-bit no matter what dt says
				return type - 2;

			case NUMTYPE.INT32:
			case NUMTYPE.UINT32:
				// Downscale to 16 or 8-bit
				return (dt == 0) ? (type - 4) : (type - 2);

			case NUMTYPE.FLOAT32:
				// Downscale to INT8 or INT16
				return (dt == 0) ? NUMTYPE.INT8 : NUMTYPE.INT16;

			case NUMTYPE.FLOAT64:
				// Downscale to INT16 or FLOAT32
				return (dt == 0) ? NUMTYPE.FLOAT32 : NUMTYPE.INT16;
		}
	}

	/**
	 * Convert changes in array types in downscaling ('DT') bit
	 */
	BinaryEncoder.prototype.getDT = function( type_old, type_new ) {
		switch (type_old) {
			case NUMTYPE.INT8:
			case NUMTYPE.UINT8:

				switch (type_new) {
					case NUMTYPE.INT8:
					case NUMTYPE.UINT8:

						// No downscaling
						return -1;

					case NUMTYPE.INT16:
					case NUMTYPE.UINT16:
					case NUMTYPE.INT32:
					case NUMTYPE.UINT32:
					case NUMTYPE.FLOAT32:
					case NUMTYPE.FLOAT64:

						// Upscaled!!
						throw {
							'name' 		: 'LogicError',
							'message'	: 'A type was upscaled instead of downscaled! This should never happen!',
							toString 	: function(){return this.name + ": " + this.message;}
						};
				}
				break;

			case NUMTYPE.INT16:
			case NUMTYPE.UINT16:

				switch (type_new) {
					case NUMTYPE.INT8:
					case NUMTYPE.UINT8:

						// (U)INT16 -> (U)INT8
						return 0;

					case NUMTYPE.INT16:
					case NUMTYPE.UINT16:

						// No downscaling
						return -1;

					case NUMTYPE.INT32:
					case NUMTYPE.UINT32:
					case NUMTYPE.FLOAT32:
					case NUMTYPE.FLOAT64:

						// Upscaled!!
						throw {
							'name' 		: 'LogicError',
							'message'	: 'A type was upscaled instead of downscaled! This should never happen!',
							toString 	: function(){return this.name + ": " + this.message;}
						};
				}
				break;

			case NUMTYPE.INT32:
			case NUMTYPE.UINT32:

				switch (type_new) {
					case NUMTYPE.INT8:
					case NUMTYPE.UINT8:

						// (U)INT32 -> (U)INT8
						return 0;

					case NUMTYPE.INT16:
					case NUMTYPE.UINT16:

						// (U)INT32 -> (U)INT16
						return 1;

					case NUMTYPE.INT32:
					case NUMTYPE.UINT32:

						// No downscaling
						return -1;

					case NUMTYPE.FLOAT32:
					case NUMTYPE.FLOAT64:

						// Upscaled!!
						throw {
							'name' 		: 'LogicError',
							'message'	: 'A type was upscaled instead of downscaled! This should never happen!',
							toString 	: function(){return this.name + ": " + this.message;}
						};

				}
				break;

			case NUMTYPE.FLOAT32:

				switch (type_new) {
					case NUMTYPE.INT8:
					case NUMTYPE.UINT8:

						// FLOAT32 -> (U)INT8
						return 0;

					case NUMTYPE.INT16:
					case NUMTYPE.UINT16:

						// FLOAT32 -> (U)INT16
						return 1;

					case NUMTYPE.INT32:
					case NUMTYPE.UINT32:

						// Unsupported conversion
						throw {
							'name' 		: 'LogicError',
							'message'	: 'A FLOAT32 was downscaled to *INT32, which is not supported!',
							toString 	: function(){return this.name + ": " + this.message;}
						};

					case NUMTYPE.FLOAT32:

						// No downscaling
						return -1;

					case NUMTYPE.FLOAT64:

						// Upscaled!!
						throw {
							'name' 		: 'LogicError',
							'message'	: 'A type was upscaled instead of downscaled! This should never happen!',
							toString 	: function(){return this.name + ": " + this.message;}
						};
				}
				break;

			case NUMTYPE.FLOAT64:

				switch (type_new) {
					case NUMTYPE.INT8:
					case NUMTYPE.UINT8:

						// Unsupported conversion
						throw {
							'name' 		: 'LogicError',
							'message'	: 'A FLOAT32 was downscaled to *INT8, which is not supported!',
							toString 	: function(){return this.name + ": " + this.message;}
						};

					case NUMTYPE.INT16:
					case NUMTYPE.UINT16:

						// FLOAT64 -> (U)INT16
						return 1;

					case NUMTYPE.INT32:
					case NUMTYPE.UINT32:

						// Unsupported conversion
						throw {
							'name' 		: 'LogicError',
							'message'	: 'A FLOAT32 was downscaled to *INT32, which is not supported!',
							toString 	: function(){return this.name + ": " + this.message;}
						};

					case NUMTYPE.FLOAT32:

						// FLOAT64 -> FLOAT32
						return 0;

					case NUMTYPE.FLOAT64:

						// No downscaling
						return -1;

				}
				break;

		}
	}

	/**
	 * Get the underlaying typed type of the array
	 */
	BinaryEncoder.prototype.getArrayTYPE = function( v ) {
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
			return -1;
		}
	}

	/**
	 * Return the minimum numeric type that fits all values in the array
	 * (A lighter and faster version of optimiseNumArray)
	 */
	BinaryEncoder.prototype.getMinFitNumTYPE = function( v ) {
		var min = v[0], max = v[0], 			// Bounds
			is_float = false, all_float = true; // Float extremes

		for (var i=0; i<v.length; i++) {
			var n = v[i], d=0;
			// Make sure we have only numbers
			if (typeof(n) !== "number") return undefined;
			// Update bounds
			if (n > max) max = n;
			if (n < min) min = n;
			// Check for float
			if (n % 1 === 0) {
				// Integer
				if ((n != 0) && all_float) all_float=false;
			} else {
				// Float
				if (!is_float) is_float=true;
			}
		}

		// If it's float, check for float bounds
		if ((this.useStrictFloat && all_float) || (!this.useStrictFloat && is_float)) {
			if (Math.max( Math.abs(max), Math.abs(min) ) >= 3.40282e+38) {
				return NUMTYPE.FLOAT64;
			} else {
				return NUMTYPE.FLOAT32;
			}

		// If it's integer check for signed or unsigned
		} else {
			if (min < 0) {
				// Check signed bounds
				if ((min >= -128) && (max <= 127)) {
					return NUMTYPE.INT8;
				} else if ((min >= -32768) && (max <= 32767)) {
					return NUMTYPE.INT16;
				} else {
					return NUMTYPE.INT32;
				}
			} else {
				// Check unsigned bounds
				if (max < 256) {
					return NUMTYPE.UINT8;
				} else if (max < 65536) {
					return NUMTYPE.UINT16;
				} else {
					return NUMTYPE.UINT32;
				}
			}
		}

	}

	/**
	 * Optimise a numerical array type
	 */
	BinaryEncoder.prototype.optimiseNumArray = function( v ) {

		// Get original type and array length
		var originalType = this.getArrayTYPE(v),
			len = this.getLEN(v);

		// If we are using type perserving we cannot further optimise typed arrays
		if ((originalType > -1) && this.usePerservingOfTypes) {
			return {
				'type': originalType,
				'op': OP.ARRAY_NUM,
				'len': len,
				'dt': 0,
				'original': originalType,
			}
		}

		// Prepare properties
		var min = v[0], max = v[0], numerical = true,	// Bounds
			is_float = false, all_float = true, 		// Float extremes
			same_val = v[0], all_same = true, 			// Same comparison
			maxDiff = 0, prev = undefined,				// Differential encoding
			type_constr = undefined;					// Entity vectorisation

		// Iterate over entities
		for (var i=0; i<v.length; i++) {
			var n = v[i], d=0;
			// Process numbers with numerical principles
			if (numerical) {
				if (typeof(n) !== "number") {
					if ((i == 0) && (this.useEntityVectors)) {
						// We are not working with numbers, but we will check for vectorisation 
						numerical = false;
						// That's not possible when we have basic primitives
						if ((n === null) || (n === undefined) || (n instanceof Array) || 
							(n instanceof Uint8Array) || (n instanceof Int8Array) ||
							(n instanceof Uint16Array) || (n instanceof Int16Array) ||
							(n instanceof Uint32Array) || (n instanceof Int32Array) ||
							(n instanceof Float32Array) || (n instanceof Float64Array) ||
							(n.constructor === ({}).constructor) || (typeof n == "string")) {
							return undefined;
						}
						// Keep type
						type_constr = n.constructor;
					} else {
						// Mixed
						return undefined;
					}
				} else {
					// Update bounds
					if (n > max) max = n;
					if (n < min) min = n;
					// Check for float
					if (n % 1 === 0) {
						// Integer
						if ((n != 0) && all_float) all_float=false;
					} else {
						// Float
						if (!is_float) is_float=true;
					}
					// Check if the entire array has the same value
					if (all_same && (n != same_val)) all_same = false;
					// Calculate maximum difference
					if (prev == undefined) {
						prev = n;
					} else {
						d = Math.abs(n - prev);
						if (d > maxDiff) maxDiff = d;
					}
				}
			} else {
				// Check if we have many different types
				if (!(n instanceof type_constr)) {
					return undefined;
				}
			}
		}

		// Check if we have vectorisation
		if (!numerical) {
			// console.log("VEC ".cyan+"@".blue+String(this.offset).bold.blue+", len="+v.length);
			return {
				'type': -1,
				'op': OP.ENTITY_VECTOR,
				'len': len,
				'dt': 0,
				'original': -1,
			};
		}

		// If everything is same, check now
		if (all_same) {
			// console.log("[=] ".red+"@".blue+String(this.offset).blue.bold+": val=",v[0],", len=",v.length,", type=",_TYPENAME[type])

			// If all are the same and we don't have an original type, change
			// to the type of the first argument
			if (originalType < 0)
				originalType = this.getNumTYPE(v[0])

			// Zero is a faster, special case
			if (same_val == 0) {
				return {
					'type': originalType,
					'op': OP.ARRAY_ZERO,
					'len': len,
					'dt': 0,
					'original': originalType,
				}

			// Otherwise everything is the same, use repeated array encoding
			} else {
				return {
					'type': originalType,
					'op': OP.ARRAY_REP,
					'len': len,
					'dt': 0,
					'original': originalType,
				};
			}
		}

		// Check if we have to use floats
		var type = 0;
		if ((this.useStrictFloat && all_float && !(all_same && (same_val == 0))) || 
			(!this.useStrictFloat && is_float)) {

			// Check bounds if it doesn't fit in FLOAT32
			if (Math.max( Math.abs(max), Math.abs(min) ) >= 3.40282e+38) {
				type = NUMTYPE.FLOAT64;
			} else {
				type = NUMTYPE.FLOAT32;
			}

			// Replace original type if missing
			if (originalType < 0) originalType = type;

			// If we enabed differential encoding with fixed precision, check if we can 
			// further optimise it using differential encoding
			if ((this.useDiffEnc > 1) && (v.length > this.diffEncElmThreshold)) {

				if ((maxDiff * this.diffEncPrecision) < 128) {

					// ------------------------------------------
					// We can encode using 8-bit differential
					// ------------------------------------------

					if (originalType == NUMTYPE.FLOAT32) {
						// [Downscale dt=0 : FLOAT32 -> INT8]
						return {
							'type': NUMTYPE.INT8,
							'op': OP.ARRAY_DIFF,
							'len': len,
							'dt': 0,
							'original': originalType,
						}
					} else if (originalType == NUMTYPE.FLOAT64) {
						// [Downscale dt=0 : FLOAT64 -> INT16]
						return {
							'type': NUMTYPE.INT16,
							'op': OP.ARRAY_DIFF,
							'len': len,
							'dt': 1,
							'original': originalType,
						}
					} else {
						// We should NEVER reach this case
						throw {
							'name' 		: 'LogicError',
							'message'	: 'Trying to perform differential encoding with wrong or invalid types!',
							toString 	: function(){return this.name + ": " + this.message;}
						};
					}
				} else if ((maxDiff * this.diffEncPrecision) < 32768) {

					// ------------------------------------------
					// We can encode using 16-bit differential
					// ------------------------------------------

					if (originalType == NUMTYPE.FLOAT32) {
						// [Downscale dt=1 : FLOAT32 -> INT16]
						return {
							'type': NUMTYPE.INT16,
							'op': OP.ARRAY_DIFF,
							'len': len,
							'dt': 1,
							'original': originalType,
						}
					} else if (originalType == NUMTYPE.FLOAT64) {
						// [Downscale dt=1 : FLOAT64 -> INT16]
						return {
							'type': NUMTYPE.INT16,
							'op': OP.ARRAY_DIFF,
							'len': len,
							'dt': 1,
							'original': originalType,
						}
					} else {
						// We should NEVER reach this case
						throw {
							'name' 		: 'LogicError',
							'message'	: 'Trying to perform differential encoding with wrong or invalid types!',
							toString 	: function(){return this.name + ": " + this.message;}
						};
					}
				}

			} 

			// If we are not using differential encoding, check for type casting

			// Check if we did or did not perform type downscaling
			var dt = this.getDT( originalType, type );
			if (dt == -1) {
				// We did not change type -> Keep this as typed array of numbers
				return {
					'type': originalType,
					'op': OP.ARRAY_NUM,
					'len': len,
					'dt': 0,
					'original': originalType,
				}
			} else {
				// We DID change type -> Store as reduced array of numbers
				return {
					'type': type,
					'op': OP.ARRAY_DWS,
					'len': len,
					'dt': dt,
					'original': originalType,
				}
			}

		} else {

			// Check for signed or unsigned
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

			// Replace original type if missing
			if (originalType < 0) originalType = type;

			// If we enabled differential encoding for integers, check if we can 
			// further optimise it using differential encoding
			if ((this.useDiffEnc > 0) && (v.length > this.diffEncElmThreshold)) {

				if ((type >= NUMTYPE.INT16) && (maxDiff < 128)) {

					// ------------------------------------------
					// We can encode using 8-bit differential
					// ------------------------------------------

					if ((originalType == NUMTYPE.INT8) || (originalType == NUMTYPE.UINT8)) {
						// (U)INT8 -> Encoded as UINT8? Not really helping much, don't add diffenc overhead...
					} else if ((originalType == NUMTYPE.INT16) || (originalType == NUMTYPE.UINT16)) {
						// [Downscale dt=0 : (U)INT16 -> INT8]
						return {
							'type': NUMTYPE.INT8,
							'op': OP.ARRAY_DIFF,
							'len': len,
							'dt': 0,
							'original': originalType,
						}
					} else if ((originalType == NUMTYPE.INT32) || (originalType == NUMTYPE.UINT32)) {
						// [Downscale dt=0 : (U)INT32 -> INT8]
						return {
							'type': NUMTYPE.INT8,
							'op': OP.ARRAY_DIFF,
							'len': len,
							'dt': 0,
							'original': originalType,
						}
					} else if (originalType == NUMTYPE.FLOAT32) {
						// [Downscale dt=0 : FLOAT32 -> INT8]
						return {
							'type': NUMTYPE.INT8,
							'op': OP.ARRAY_DIFF,
							'len': len,
							'dt': 0,
							'original': originalType,
						}
					} else if (originalType == NUMTYPE.FLOAT64) {
						// [Downscale dt=0 : FLOAT64 -> INT16]
						return {
							'type': NUMTYPE.INT16,
							'op': OP.ARRAY_DIFF,
							'len': len,
							'dt': 0,
							'original': originalType,
						}
					}

				} else if ((type >= NUMTYPE.INT32) && (maxDiff < 32768)) {

					// ------------------------------------------
					// We can encode using 16-bit differential
					// ------------------------------------------

					if ((originalType == NUMTYPE.INT8) || (originalType == NUMTYPE.UINT8)) {
						// (U)INT8 -> Encoded as UINT16? Never reaching this...
					} else if ((originalType == NUMTYPE.INT16) || (originalType == NUMTYPE.UINT16)) {
						// (U)INT16 -> Encoded as UINT16? Not really helping much, don't add diffenc overhead...
					} else if ((originalType == NUMTYPE.INT32) || (originalType == NUMTYPE.UINT32)) {
						// [Downscale dt=0 : (U)INT32 -> INT16]
						return {
							'type': NUMTYPE.INT16,
							'op': OP.ARRAY_DIFF,
							'len': len,
							'dt': 1,
							'original': originalType,
						}
					} else if (originalType == NUMTYPE.FLOAT32) {
						// [Downscale dt=0 : FLOAT32 -> INT16]
						return {
							'type': NUMTYPE.INT16,
							'op': OP.ARRAY_DIFF,
							'len': len,
							'dt': 1,
							'original': originalType,
						}
					} else if (originalType == NUMTYPE.FLOAT64) {
						// [Downscale dt=0 : FLOAT64 -> INT16]
						return {
							'type': NUMTYPE.INT16,
							'op': OP.ARRAY_DIFF,
							'len': len,
							'dt': 0,
							'original': originalType,
						}
					}

				}

			}

			// If we are not using differential encoding, check for type casting

			// Check if we did or did not perform type downscaling
			var dt = this.getDT( originalType, type );
			if (dt == -1) {
				// We did not change type -> Keep this as typed array of numbers
				return {
					'type': originalType,
					'op': OP.ARRAY_NUM,
					'len': len,
					'dt': 0,
					'original': originalType,
				}
			} else {
				// We DID change type -> Store as reduced array of numbers
				return {
					'type': type,
					'op': OP.ARRAY_DWS,
					'len': len,
					'dt': dt,
					'original': originalType,
				}
			}

		}

	}

	////////////////////////////////////////////////////////////
	// High-level encoding functions
	////////////////////////////////////////////////////////////

	/**
	 * Write a primitive
	 */
	BinaryEncoder.prototype.writePrimitive = function( v, tag ) {

		// Check for external references
		var dbRef = this.dbObjects.indexOf(v);
		if (dbRef >= 0) {
			if (this.logTag) console.log("TAG ".cyan+"@".blue+String(this.offset).blue.bold+": import="+this.dbTags[dbRef]);
			this.writeUint8( OP.IMPORT );
			this.writeUint16( this.getKeyIndex(this.dbTags[dbRef]) );
			return;
		}

		// If we have a tag, tag this primitive first
		if (tag) {
			if (this.logTag) console.log("TAG ".cyan+"@".blue+String(this.offset).blue.bold+": export="+this.bundleName+'/'+tag);
			this.writeUint8( OP.EXPORT );
			this.writeUint16( this.getKeyIndex(tag) );

			// Update database
			this.database[this.bundleName+'/'+tag] = v;
		}

		// Check native types
		if (typeof(v) == "undefined") {

			// Store undefined
			if (this.logPrimitive) console.log("PRM ".cyan+"@".blue+String(this.offset).blue.bold+": prim=undefined");
			this.writeUint8( OP.UNDEFINED );

		} else if (v === null) {

			// Store null
			if (this.logPrimitive) console.log("PRM ".cyan+"@".blue+String(this.offset).blue.bold+": prim=null");
			this.writeUint8( OP.NULL );

		} else if (typeof(v) == "boolean") {

			// Store boolean
			if (this.logPrimitive) console.log("PRM ".cyan+"@".blue+String(this.offset).blue.bold+": prim=false");
			this.writeUint8( OP.FALSE + (v ? 1 : 0) );

		} else if (typeof(v) == "string") {

			if (this.logPrimitive) console.log("PRM ".cyan+"@".blue+String(this.offset).blue.bold+": prim=string");
			if (v.length < 256) {
				this.writeUint8( OP.STRING_8 );
				this.writeUint8( v.length );
				this.writeString( v );
			} else if (v.length < 65536) {
				this.writeUint8( OP.STRING_16 );
				this.writeUint16( v.length );
				this.writeString( v );
			} else {
				this.writeUint8( OP.STRING_32 );
				this.writeUint32( v.length );
				this.writeString( v );
			}

		} else if (typeof(v) == "number") {

			// Store a single number
			if (this.logPrimitive) console.log("PRM ".cyan+"@".blue+String(this.offset).blue.bold+": prim=number");
			var tn = this.getNumTYPE(v);
			this.writeUint8( OP.NUMBER_1 | tn );
			this.writeNum( v, tn );

		} else if ((v instanceof Array) || (v instanceof Uint8Array) || (v instanceof Int8Array) ||
			(v instanceof Uint16Array) || (v instanceof Int16Array) ||
			(v instanceof Uint32Array) || (v instanceof Int32Array) ||
			(v instanceof Float32Array) || (v instanceof Float64Array)) {

			// Encode array
			if (this.logPrimitive) console.log("PRM ".cyan+"@".blue+String(this.offset).blue.bold+": prim=array");
			this.writeEncodedArray( v );

		} else if (v.constructor === ({}).constructor) {

			// Encode dictionary
			if (this.logPrimitive) console.log("PRM ".cyan+"@".blue+String(this.offset).blue.bold+": prim=dict");
			this.writeEncodedDict( v );				

		} else {

			// Encode object in the this
			if (this.logPrimitive) console.log("PRM ".cyan+"@".blue+String(this.offset).blue.bold+": prim=object");
			this.writeEncodedEntity( v );				

		}

	}

	/**
	 * Encode a dictionary
	 */
	BinaryEncoder.prototype.writeEncodedDict = function( srcDict ) {

		// Count own properties
		var propCount = 0;
		for (var k in srcDict) {
			if (!srcDict.hasOwnProperty(k)) continue;
			propCount++;
		}

		// Write down objects
		this.writeUint8(OP.DICT);
		this.writeUint8(propCount);
		for (var k in srcDict) {
			if (!srcDict.hasOwnProperty(k)) continue;
			// Write the index of the key
			this.writeUint16(this.getKeyIndex(k));
			// Write primitive
			this.writePrimitive(srcDict[k]);
		}

	}

	/**
	 * Encode difference-encoded numerical array
	 */
	BinaryEncoder.prototype.writeDiffEncNum = function( srcArray, numType, dt ) {

		// Extract type definition
		var is_float = numType >= NUMTYPE.FLOAT32;

		// Log
		if (this.logDiffEnc)
			console.log("DIF ".cyan+"@".blue+String(this.offset).blue.bold+": len="+srcArray.length+", type="+_TYPENAME[numType]+", enctype="+_ENCTYPENAME[arrType]+", start=",srcArray[0]);

		// Write first value
		this.writeNum( srcArray[0], numType );

		// Write differential values
		var lastVal = srcArray[0], delta = 0;
		for (var i=1; i<srcArray.length; i++) {

			// Calculate delta in integer format
			delta = srcArray[i] - lastVal;
			if (is_float) {
				delta = parseInt( delta * this.diffEncPrecision );
			}

			// Log delta
			if (this.logDiffEnc && this.logWrite) console.log("    %".blue+String(this.offset).blue.bold+": delta=",delta,", real=",srcArray[i],", last=",lastVal);

			// Write delta according to difference array format
			if (srcArray == NUMTYPE.FLOAT64) { // (Special case)
				if (dt == 0) {
					this.writeFloat32( delta );
				} else if (dt == 1) {
					this.writeInt16( delta );
				}
			} else {
				if (dt == 0) {
					this.writeInt8( delta );
				} else if (dt == 1) {
					this.writeInt16( delta );
				}
			}

			// Keep value for next iteration
			lastVal = srcArray[i];
		}

	}

	/**
	 * Encode array of elements
	 */
	BinaryEncoder.prototype.writeEncodedArray = function( srcArray, writeLength ) {

		// If array is empty, write empty array header
		if (srcArray.length == 0) {
			// Write ARRAY_EMPTY header
			if (this.logArray) console.log(" [] ".cyan+"@".blue+String(this.offset).blue.bold+": empty");
			this.writeUint8( OP.ARRAY_EMPTY );
			return;
		}

		// Default is to write length
		if (writeLength === undefined) writeLength = true;

		// Get array type
		var arrayType = this.optimiseNumArray( srcArray ),
			arrayLEN = this.getLEN( srcArray );

		// If we don't have a numeric array, store entities one by one
		if (arrayType == undefined) {

			// Write array header
			if (arrayLEN == LEN.U8) {
				if (this.logArray) console.log(" [] ".cyan+"@".blue+String(this.offset).blue.bold+": x8, len=", srcArray.length,", peak=",srcArray[0]);
				this.writeUint8( OP.ARRAY_ANY | arrayLEN );
				if (writeLength) this.writeUint16( srcArray.length );
			} else if (arrayLEN == LEN.U16) {
				if (this.logArray) console.log(" [] ".cyan+"@".blue+String(this.offset).blue.bold+": x16, len=", srcArray.length,", peak=",srcArray[0]);
				this.writeUint8( OP.ARRAY_ANY | arrayLEN );
				if (writeLength) this.writeUint16( srcArray.length );
			} else {
				if (this.logArray) console.log(" [] ".cyan+"@".blue+String(this.offset).blue.bold+": x32, len=", srcArray.length,", peak=",srcArray[0]);
				this.writeUint8( OP.ARRAY_ANY | arrayLEN );
				if (writeLength) this.writeUint16( srcArray.length );
			}

			// Write primitives
			for (var i=0; i<srcArray.length; i++) {

				// Check if we can compact the following up to 255 numerical values
				var canCompact = false;
				if (this.useCompact) {
					for (var j=Math.min(srcArray.length-1-i, 255); j>1; j--) {

						// Check if the current slice is numeric
						var slice = srcArray.slice(i,i+j),
							sliceType = this.getMinFitNumTYPE( slice );
						if (sliceType !== undefined) {

							// Write opcode
							if (this.logCompact) console.log(" >< ".cyan+"@".blue+String(this.offset).blue.bold+": compact, len=", j,", type=", _TYPENAME[sliceType], ", values=",slice);
							this.writeUint8(
									OP.NUMBER_N |	// We have N consecutive numbers
									sliceType		// Consecutive numbers type
								);
							this.writeUint8( j ); 	// How many consecutive values we have

							// Write values
							this.writeNum( slice, sliceType );

							// We used compact
							canCompact = true;
							i += j-1;
							break;
						}
					}
				}

				// If we didn't use compacted format, write primitive
				if (!canCompact)
					this.writePrimitive( srcArray[i] );

			}

		} else {

			//
			// [0] Array with zero value
			//
			if (arrayType.op == OP.ARRAY_ZERO) {

				// Write zero header
				if (this.logArray) console.log("[0] ".cyan+"@".blue+String(this.offset).blue.bold+": zero, len=", srcArray.length,", type=", _TYPENAME[arrayType.type], ", value=",srcArray[0]);
				this.writeUint8( OP.ARRAY_ZERO | arrayType.type );

				// Write length according to size
				if (writeLength) {
					if (arrayLEN == LEN.U8) {
						this.writeUint8( srcArray.length );
					} else if (arrayLEN == LEN.U16) {
						this.writeUint16( srcArray.length );
					} else {
						this.writeUint32( srcArray.length );
					}
				}

			}

			//
			// [1] Repeating values in the array
			//
			else if (arrayType.op == OP.ARRAY_REP) {

				// Write repeat header
				if (this.logArray) console.log("[n] ".cyan+"@".blue+String(this.offset).blue.bold+": repeat, len=", srcArray.length,", type=", _TYPENAME[arrayType.type], ", value=",srcArray[0]);
				this.writeUint8( OP.ARRAY_REP | arrayType.type | (arrayLEN << 3) );

				// Write length according to size
				if (writeLength) {
					if (arrayLEN == LEN.U8) {
						this.writeUint8( srcArray.length );
					} else if (arrayLEN == LEN.U16) {
						this.writeUint16( srcArray.length );
					} else {
						this.writeUint32( srcArray.length );
					}
				}

				// Write value
				this.writeNum( srcArray[0], arrayType.type );

			}

			//
			// [2] Unmodified typed array entities
			//
			else if (arrayType.op == OP.ARRAY_NUM) {

				// Write alignment header
				if (writeLength) {
					this.writeAlignFor( arrayType.type, arrayLEN, 1 );
				} else {
					this.writeAlignFor( arrayType.type, LEN.U8 );
				}

				// Write repeat header
				if (this.logArray) console.log(" [] ".cyan+"@".blue+String(this.offset).blue.bold+": typed, len=", srcArray.length,", type=", _TYPENAME[arrayType.type]);
				this.writeUint8( OP.ARRAY_NUM | arrayType.type | (arrayLEN << 3) );

				// Write length according to size
				if (writeLength) {
					if (arrayLEN == LEN.U8) {
						this.writeUint8( srcArray.length );
					} else if (arrayLEN == LEN.U16) {
						this.writeUint16( srcArray.length );
					} else {
						this.writeUint32( srcArray.length );
					}
				}

				// Write array
				this.writeNum( srcArray, arrayType.type );

			}

			//
			// [3] Downscaled array type
			//
			else if (arrayType.op == OP.ARRAY_DWS) {

				// Write alignment header
				if (writeLength) {
					this.writeAlignFor( arrayType.type, arrayLEN, 1 );
				} else {
					this.writeAlignFor( arrayType.type, LEN.U8 );
				}

				// Write repeat header
				if (this.logArray) console.log("[v] ".cyan+"@".blue+String(this.offset).blue.bold+": downscaled, len=", srcArray.length,", from=",_TYPENAME[arrayType.original],", to=",_TYPENAME[arrayType.type]);
				this.writeUint8( OP.ARRAY_NUM | arrayType.original | (arrayLEN << 3) | (arrayType.dt << 5) );

				// Write length according to size
				if (writeLength) {
					if (arrayLEN == LEN.U8) {
						this.writeUint8( srcArray.length );
					} else if (arrayLEN == LEN.U16) {
						this.writeUint16( srcArray.length );
					} else {
						this.writeUint32( srcArray.length );
					}
				}

				// Write array
				this.writeNum( srcArray, arrayType.type );

			}

			//
			// [4] Difference-encoded array type
			//
			else if (arrayType.op == OP.ARRAY_DIFF) {

				// Write alignment header
				if (writeLength) {
					this.writeAlignFor( arrayType.type, arrayLEN, 1 );
				} else {
					this.writeAlignFor( arrayType.type, LEN.U8 );
				}

				// Write repeat header
				if (this.logArray) console.log("[Δ] ".cyan+"@".blue+String(this.offset).blue.bold+": diffenc, len=", srcArray.length,", from=",_TYPENAME[arrayType.original],", to=",_TYPENAME[arrayType.type]);
				this.writeUint8( OP.ARRAY_DIFF | arrayType.original | (arrayLEN << 3) | (arrayType.dt << 5) );

				// Write length according to size
				if (writeLength) {
					if (arrayLEN == LEN.U8) {
						this.writeUint8( srcArray.length );
					} else if (arrayLEN == LEN.U16) {
						this.writeUint16( srcArray.length );
					} else {
						this.writeUint32( srcArray.length );
					}
				}

				// Write array with differential encoding
				this.writeDiffEncNum( srcArray, arrayType.original, arrayType.dt );

			}

			//
			// [5] Vector of entities
			//
			else if (arrayType.op == OP.ENTITY_VECTOR) {

				// Write vector header
				if (this.logArray) console.log("{V} ".cyan+"@".blue+String(this.offset).blue.bold+": vector, len=", srcArray.length);
				this.writeUint8( OP.ENTITY_VECTOR | arrayLEN );

				// Get the entity ID of this object
				var eid = -1, object = srcArray[0];
				for (var i=0; i<ENTITIES.length; i++)
					if ((ENTITIES[i].length > 0) && (object instanceof ENTITIES[i][0]))
						{ eid = i; break; }

				// If no such entity exists, raise exception
				if (eid < 0) {
					console.log(object);
					throw {
						'name' 		: 'EncodingError',
						'message'	: 'The specified object is not of known entity type',
						toString 	: function(){return this.name + ": " + this.message;}
					};
				}

				// Write entity ID
				this.writeUint16( eid );

				// Write length according to size
				if (arrayLEN == LEN.U8) {
					this.writeUint8( srcArray.length );
				} else if (arrayLEN == LEN.U16) {
					this.writeUint16( srcArray.length );
				} else {
					this.writeUint32( srcArray.length );
				}

				// Dump all consecutive property tables
				for (var j=0; j<srcArray.length; j++) {
					var propertyTable = new Array( PROPERTIES[eid].length );
					for (var i=0; i<PROPERTIES[eid].length; i++) {
						propertyTable[i] = object[ PROPERTIES[eid][i] ];
					}
					this.writeEncodedArray( propertyTable, false );
				}

			}

			//
			// Just in case
			// 
			else {
				throw {
					'name' 		: 'LogicError',
					'message'	: 'Analysis of the array returned unexpected results (type='+arrayType.op+')!',
					toString 	: function(){return this.name + ": " + this.message;}
				}
			}

		}

	}

	/**
	 * Encode a particular object to a binary stream
	 */
	BinaryEncoder.prototype.writeEncodedEntity = function( object ) {

		// Handle byref cross-references
		if (this.useCrossRef > 0) {
			var refID = this.encodedReferences.indexOf(object);
			if (refID >= 0) {
				// Write reference
				if (this.logRef) console.log("PTR ".cyan+"@".blue+String(this.offset).blue.bold+": ref=",refID);
				this.writeUint8( OP.REF_24 );
				this.writeUint24( refID );
				return
			}
		}

		// Get the entity ID of this object
		var eid = -1;
		for (var i=0; i<ENTITIES.length; i++)
			if ((ENTITIES[i].length > 0) && (object instanceof ENTITIES[i][0]))
				{ eid = i; break; }

		// If no such entity exists, raise exception
		if (eid < 0) {
			throw {
				'name' 		: 'EncodingError',
				'message'	: 'The specified object is not of known entity type',
				toString 	: function(){return this.name + ": " + this.message;}
			};
		}

		// Create property table
		var propertyTable = new Array( PROPERTIES[eid].length );
		for (var i=0; i<PROPERTIES[eid].length; i++) {
			propertyTable[i] = object[ PROPERTIES[eid][i] ];
		}

		// Handle ByVal cross-references
		if (this.useCrossRef > 1) {

			// Check if we have a BST for this type
			if (this.encodedByValBST[eid] !== undefined) {
				var id = this.encodedByValBST[eid].search( propertyTable );
				if (id.length > 0) {
					if (this.logRef) console.log("CPY ".cyan+"@".blue+String(this.offset).blue.bold+": ref=",id[0]);
					this.writeUint8( OP.REF_24 );
					this.writeUint24( id[0] );
					return;
				}
			} else {
				// Create a new BST for this entity type
				this.encodedByValBST[eid] = new BinarySearchTree({
					compareKeys: objectBstComparison,
					checkValueEquality: objectBstEquals,
					unique: true,
				});
			}

		}

		// Keep object in cross-referencing database
		if (this.useCrossRef > 0) {
			if (this.encodedReferences.length < 16777216) {

				// Update byref table
				this.encodedReferences.push(object);

				// Update BST
				if (this.useCrossRef > 1)
					this.encodedByValBST[eid].insert( propertyTable, this.encodedReferences.length-1 );

				if (this.encodedReferences.length == 16777216)
					console.error("References table is full");
			}
		}

		// Post-process entities (if needed)
		if (ENTITIES[eid].length > 3)
			ENTITIES[eid][3]( propertyTable, object );

		// Start entity
		if (eid < 16) {
			this.writeUint8( OP.ENTITY_4 | eid );
		} else {
			this.writeUint8( OP.ENTITY_12 | ((eid & 0x0F00) >> 8) );
			this.writeUint8( eid & 0xFFFF );
		}

		// Write down property table
		if (this.logEntity) console.log("ENT ".cyan+"@".blue+String(this.offset).blue.bold,": eid=" + eid);
		this.writeEncodedArray( propertyTable, false );

	}

	/**
	 * Write key index at the end of the file
	 */
	BinaryEncoder.prototype.writeKeyIndex = function() {

		// Write string objects
		var startOffset = this.offset;
		for (var i=0; i<this.keyDictIndex.length; i++) {
			this.writePrimitive( this.keyDictIndex[i] );
		}

		// Make sure that after the length bytes, 
		// we are 64-bit padded in order
		// for Float64 view to match this.
		this.writeAlign(8, 2);

		// Write offset header
		this.writeUint16( this.offset - startOffset + 2 );

	}

	////////////////////////////////////////////////////////////
	// Public Interface
	////////////////////////////////////////////////////////////

	/**
	 * Encode a particular object to a binary stream
	 */
	BinaryEncoder.prototype.encode = function( object, name ) {

		// Encode primitive
		this.writePrimitive( object, name );

	}

	/**
	 * Return binary encoder
	 */
	return BinaryEncoder;

});