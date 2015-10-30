"use strict";
/**
 * Package Binary Loader
 */
define(["three"], function(THREE) {

	// Entity Type
	var ENTITIES = [
		THREE.Vector2,
		THREE.Vector3,
		THREE.Face3,
		THREE.Color,
		THREE.Geometry,
		THREE.Sphere,
	];

	// Property index for every entity type
	var PROPERTIES = [
		// THREE.Vector2
		[ 'x', 'y' ],
		// THREE.Vector3
		[ 'x', 'y', 'z' ],
		// THREE.Face3
		[ 'a', 'b', 'c', 'color', 'materialIndex', 'normal', 'vertexColors', 'vertexNormals' ],
		// THREE.Color
		[ 'r', 'g', 'b' ],
		// THREE.Geometry
		[ 'vertices', 'faces', 'faceVertexUvs', 'boundingSphere' ],
		// THREE.Sphere
		[ 'center', 'radius' ],
	];

	// Opcodes
	var OP = {
		UNDEFINED: 	0xF8,	// Undefined primitive
		NULL: 		0xF9,	// NULL Primitive
		FALSE: 		0xFA,	// False primitive
		TRUE: 		0xFB,	// True primitive
		PAD_ALIGN: 	0xF0,	// Padding characters for alignment
		STRING_8: 	0xE0,	// A string with 8-bit index
		STRING_16: 	0xE1,	// A string with 16-bit index
		STRING_32: 	0xE2,	// A string with 32-bit index
		ARRAY_X_8:	0xE3,	// An element array with 8-bit index
		ARRAY_X_16:	0xE4,	// An element array with 16-bit index
		ARRAY_X_32:	0xE5,	// An element array with 32-bit index
		ARRAY_EMPTY:0xE6, 	// An empty array
		REF_16: 	0xE7, 	// A reference to a previous entity
		STRING_4:	0xE8,	// A string with 4-bit embedded index
		NUMBER_1: 	0xC0,	// A single number
		ARRAY_8: 	0xC8,	// A numeric array with 8-bit index
		ARRAY_16: 	0xD0,	// A numeric array with 16-bit index
		ARRAY_32: 	0xD8,	// A numeric array with 32-bit index
		ENTITY_5: 	0x80,	// An entity with 5-bit embedded eid
		ENTITY_13: 	0xA0,	// An entity with 13-bit eid
		NUMBER_N: 	0x00, 	// Consecutive, up to 16 numbers of same type
	}

	// Number types
	var NUMTYPE = {
		INT8 	: 0x00, UINT8 	: 0x01,	// Integers 8-bit
		INT16 	: 0x02, UINT16 	: 0x03, // Integers 16-bit
		INT32   : 0x04, UINT32  : 0x05, // Integers 32-bit
		FLOAT32 : 0x06, FLOAT64 : 0x07, // Float of 32 and 64 bit
		INT24   : 0x08, UINT24  : 0x09, // Integers 24-bit
	};

	/**
	 * THREE Bundles Binary decoder
	 */
	var BinaryDecoder = function() {
		this.offset = 0;
	};

	/**
	 * Expose tables and opcodes
	 */
	BinaryDecoder.ENTITIES = ENTITIES;
	BinaryDecoder.PROPERTIES = PROPERTIES;
	BinaryDecoder.OP = OP;
	BinaryDecoder.NUMTYPE = NUMTYPE;

	/**
	 * Load a binary stream
	 */
	BinaryDecoder.prototype.load = function( url, callback ) {

		var req = new XMLHttpRequest();
		req.open('GET', url);
		req.responseType = "arraybuffer";
		req.send();

		req.onreadystatechange = function () {
			if (req.readyState !== 4) return;

			var buffer = req.response,
				dataview = new DataView(buffer),
				offset = 0,	prevOp = 0, currOp = 0,
				compactBuf = [], crossRef = [];

			function getUint8() {
				offset += 1;
				return dataview.getUint8(offset-1);
			}
			function getInt8() {
				offset += 1;
				return dataview.getInt8(offset-1);
			}
			function getInt16() {
				offset += 2;
				return dataview.getInt16(offset-2);
			}
			function getUint16() {
				offset += 2;
				return dataview.getUint16(offset-2);
			}
			function getInt32() {
				offset += 4;
				return dataview.getInt32(offset-4);
			}
			function getUint32() {
				offset += 4;
				return dataview.getUint32(offset-4);
			}
			function getFloat32() {
				offset += 4;
				return dataview.getFloat32(offset-4);
			}
			function getFloat64() {
				offset += 8;
				return dataview.getFloat64(offset-8);
			}
			function getNum(type) {
				if (type == NUMTYPE.INT8) {
					return getInt8();
				} else if (type == NUMTYPE.UINT8) {
					return getUint8();
				} else if (type == NUMTYPE.INT16) {
					return getInt16();
				} else if (type == NUMTYPE.UINT16) {
					return getUint16();
				} else if (type == NUMTYPE.INT32) {
					return getInt32();
				} else if (type == NUMTYPE.UINT32) {
					return getUint32();
				} else if (type == NUMTYPE.FLOAT32) {
					return getFloat32();
				} else if (type == NUMTYPE.FLOAT64) {
					return getFloat64();
				}
			}

			function getString( length ) {
				var str = "";
				for (var i=0; i<length; i++)
					str += String.fromCharCode( getUint8() );
				return str;
			}

			function getArray( length ) {
				var array = new Array( length );
				for (var i=0; i<length; i++)
					array[i] = getObject();
				return array;
			}

			function getNumberArray( length, type ) {
				var ofs = offset;
				if (type == NUMTYPE.INT8) {
					return new Int8Array( buffer, ofs, length );
				} else if (type == NUMTYPE.UINT8) {
					return new UInt8Array( buffer, ofs, length );

				} else if (type == NUMTYPE.INT16) {
					offset += length * 2;
					return new Int16Array( buffer, ofs, length );
				} else if (type == NUMTYPE.UINT16) {
					offset += length * 2;
					return new UInt16Array( buffer, ofs, length );

				} else if (type == NUMTYPE.INT32) {
					offset += length * 4;
					return new Int32Array( buffer, ofs, length );
				} else if (type == NUMTYPE.UINT32) {
					offset += length * 4;
					return new UInt32Array( buffer, ofs, length );

				} else if (type == NUMTYPE.FLOAT32) {
					offset += length * 4;
					return new Float32Array( buffer, ofs, length );
				} else if (type == NUMTYPE.FLOAT64) {
					offset += length * 8;
					return new Float64Array( buffer, ofs, length );

				}
			}

			function getEntity( eid ) {
				// Try to instantiate entity
				if (eid >= ENTITIES.length)
					throw {
						'name' 		: 'OpcodeError',
						'message'	: 'The specified entity id (#' + eid + ') at offset '+offset+' is not known',
						toString 	: function(){return this.name + ": " + this.message;}
					};

				// Instantiate entry
				var instance = new ENTITIES[eid]();

				// Keep in cross-reference
				crossRef.push( instance );

				// Get an array that contains the values
				// for the properties in the property table
				var values = getObject();

				// Iterate over properties
				var props = PROPERTIES[eid];
				for (var i=0; i<props.length; i++) {
					instance[props[i]] = values[i];
				}

				// Return entity
				return instance;
			}

			function getObject( valid_opcodes ) {

				// If we have a compacted buffer, drain it
				if (compactBuf.length > 0) 
					return compactBuf.shift();

				// Get next opcode
				var op = getUint8();

				// Skip alignment opcodes
				if ((op & 0xF8) == 0xF0) {
					offset += (op & 0x07) - 1;
					op = getUint8();
				}

				// Keep last opcode for debug messages
				prevOp = currOp;
				currOp = op;

				// If we have a requirement of valid opcodes, check now
				if (valid_opcodes !== undefined) {
					if (valid_opcodes.indexOf(op) == -1)
						throw {
							'name' 		: 'OpcodeError',
							'message'	: 'Unexpected opcode 0x' + op.toString(16) + ' at offset ' + offset,
							toString 	: function(){return this.name + ": " + this.message;}
						};
				}

				// Handle simple opcodes
				switch (op) {

					// -----------------------
					//  Native primitives
					// -----------------------

					case OP.UNDEFINED:
						return undefined;

					case OP.NULL:
						return null;

					case OP.FALSE:
						return false;

					case OP.TRUE:
						return true;

					// -----------------------
					//  Strings
					// -----------------------

					case OP.STRING_8:
						return getString( getUint8() );

					case OP.STRING_16:
						return getString( getUint16() );

					case OP.STRING_32:
						return getString( getUint32() );

					// -----------------------
					//  Arrays
					// -----------------------

					case OP.ARRAY_EMPTY:
						return [ ];

					case OP.ARRAY_X_8:
						return getArray( getUint8() );

					case OP.ARRAY_X_16:
						return getArray( getUint16() );

					case OP.ARRAY_X_32:
						return getArray( getUint32() );

					// -----------------------
					//  Cross-reference
					// -----------------------

					case OP.REF_16:
						return crossRef[ getUint16() ];

					// -----------------------
					//  Comlpex Opcodes
					// -----------------------

					default:

						var b30 = (op & 0x7),		// Bits 3:0
							b40 = (op & 0x1F), 		// Bits 4:0
							b64 = (op & 0x78) >> 3; // Bits 6:3

						if ((op & 0xF8) == 0xE8) { /* STRING_4 */
							return getString( b30 );

						} else if ((op & 0xF8) == 0xC0) { /* NUMBER_1 */
							return getNum( b30 );

						} else if ((op & 0xF8) == 0xC8) { /* ARRAY_8 */
							return getNumberArray( getUint8(), b30 );

						} else if ((op & 0xF8) == 0xD0) { /* ARRAY_16 */
							return getNumberArray( getUint16(), b30 );

						} else if ((op & 0xF8) == 0xD8) { /* ARRAY_32 */
							return getNumberArray( getUint32(), b30 );

						} else if ((op & 0xE0) == 0x80) { /* ENTITY_5 */
							console.log("@"+offset+": eid=",b40);
							return getEntity( b40 );

						} else if ((op & 0xE0) == 0xA0) { /* ENTITY_13 */
							console.log("@"+offset+": eid=",(b40 << 8) + getUint8());
							return getEntity( (b40 << 8) + getUint8() );

						} else if ((op & 0x80) == 0x00) { /* NUMBER_N */

							// Populate compact buffer
							compactBuf = [];
							for (var i=0; i<b64; i++)
								compactBuf.push( getNum( b30 ) );

							// Pop firt
							return compactBuf.shift();

						} else {

							throw {
								'name' 		: 'OpcodeError',
								'message'	: 'Unknown opcode 0x' + op.toString(16) + ' at offset ' + offset + '. Last opcode was 0x' + prevOp.toString(16),
								toString 	: function(){return this.name + ": " + this.message;}
							};

						}

				}

			}

			// Fire callback with first object 
			callback( getObject() )

		}
	}


	/**
	 * Return binary encoder
	 */
	return BinaryDecoder;

});