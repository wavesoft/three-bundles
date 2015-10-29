/**
 * Package Binary Loader
 */
define(["three", "fs", "bufferpack", "../binary"], function(THREE, fs, pack, Binary) {

	/**
	 * Import entity and property tables, along with opcodes from binary.js
	 */
	var ENTITIES = Binary.ENTITIES,
		PROPERTIES = Binary.PROPERTIES,
		OP = Binary.OP;

	var NUMTYPE = {
		INT8 	: 0x00, 
		UINT8 	: 0x01,
		INT16 	: 0x02, 
		UINT16 	: 0x03, 
		INT32   : 0x04, 
		UINT32  : 0x05, 
		FLOAT32 : 0x06,
		FLOAT64 : 0x07,

		INT24   : 0x08,
		UINT24  : 0x09
	};

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

	var OP = {
		BOOLEAN 	: 0x02,		// 0 0 0 0  0 0 1 X = Boolean flag
		STRING_03   : 0x04,		// 0 0 0 0  0 1 X X = String size (0 to 3)
		NULL 		: 0x08, 	// 0 0 0 0  1 0 0 0 = Null Value
		UNDEFINED	: 0x09, 	// 0 0 0 0  1 0 0 1 = Undefined Value
		ARRAY_N_ENT	: 0x0A, 	// 0 0 0 0  1 0 1 0 = An array with N entities
		STRING_N	: 0x0B, 	// 0 0 0 0  1 0 1 1 = Undefined Value
		ENTITY		: 0x0C, 	// 0 0 0 0  1 1 0 0 = Entity
		ARRAY_EMPTY : 0x0D, 	// 0 0 0 0  1 0 0 1 = Empty Array
		ARRAY_1		: 0x40, 	// 0 1 0 0  0 X X X = An array with type XXX and 1 element in opcode header
		ARRAY_2		: 0x48, 	// 0 1 0 0  1 X X X = An array with type XXX and 2 elements in opcode header
		ARRAY_3		: 0x50, 	// 0 1 0 1  0 X X X = An array with type XXX and 3 elements in opcode header
		ARRAY_N 	: 0x58, 	// 0 1 0 1  1 X X X = An array with type XXX and N elements
		NUMBER 		: 0x60, 	// 0 1 1 0  0 X X X = An array with type XXX and N elements
	}

	/**
	 * THREE Bundles Binary encoder
	 */
	var BinaryEncoder = function( filename ) {
		this.offset = 0;
		this.stream = fs.createWriteStream( filename );
	};

	/**
	 * Close the stream
	 */
	BinaryEncoder.prototype.close = function() {
		this.stream.end();
	}

	////////////////////////////////////////////////////////////
	// Low-level stream writing
	////////////////////////////////////////////////////////////

	/**
	 * Write an unsigned byte (used for opcodes)
	 */
	BinaryEncoder.prototype.writeUint8 = function( d ) {
		this.offset += 1;
		this.stream.write( pack.pack('>B', [d]) );
	}

	/**
	 * Write a signed byte (used for small values)
	 */
	BinaryEncoder.prototype.writeInt8 = function( d ) {
		this.offset += 1;
		this.stream.write( pack.pack('>b', [d]) );
	}

	/**
	 * Write a 16-bit unsigned number
	 */
	BinaryEncoder.prototype.writeUint16 = function( d ) {
		this.offset += 2;
		this.stream.write( pack.pack('>H', [d]) );
	}

	/**
	 * Write a 16-bit number
	 */
	BinaryEncoder.prototype.writeInt16 = function( d ) {
		this.offset += 2;
		this.stream.write( pack.pack('>h', [d]) );
	}

	/**
	 * Write a 32-bit unsigned number
	 */
	BinaryEncoder.prototype.writeUint32 = function( d ) {
		this.offset += 4;
		this.stream.write( pack.pack('>I', [d]) );
	}

	/**
	 * Write a 32-bit signed number
	 */
	BinaryEncoder.prototype.writeInt32 = function( d ) {
		this.offset += 4;
		this.stream.write( pack.pack('>i', [d]) );
	}

	/**
	 * Write a 32-bit float number
	 */
	BinaryEncoder.prototype.writeFloat32 = function( d ) {
		this.offset += 4;
		this.stream.write( pack.pack('>f', [d]) );
	}

	/**
	 * Write an 64-bit float number
	 */
	BinaryEncoder.prototype.writeFloat64 = function( d ) {
		this.offset += 8;
		this.stream.write( pack.pack('>d', [d]) );
	}

	/**
	 * Write a string stream
	 */
	BinaryEncoder.prototype.writeString = function( d ) {
		this.offset += d.length;
		this.stream.write( pack.pack('>s', [d]) );
	}

	////////////////////////////////////////////////////////////
	// 32-bit aligned opcode helpers
	////////////////////////////////////////////////////////////

	/**
	 * Write only an opcode
	 */
	BinaryEncoder.prototype.writeO = function( a ) {
		this.writeUint8(a);
		this.writeUint8(0);
		this.writeUint8(0);
		this.writeUint8(0);
	}

	/**
	 * Write an opcode + up to 3 unsigned bytes
	 */
	BinaryEncoder.prototype.writeO_U8 = function( a,b,c,d ) {
		this.writeUint8(a);
		this.writeUint8(b || 0);
		this.writeUint8(c || 0);
		this.writeUint8(d || 0);
	}

	/**
	 * Write an opcode + up to 3 signed bytes
	 */
	BinaryEncoder.prototype.writeO_S8 = function( a,b,c,d ) {
		this.writeUint8(a);
		this.writeInt8(b || 0);
		this.writeInt8(c || 0);
		this.writeInt8(d || 0);
	}

	/**
	 * Write an opcode + 1 unsigned short
	 */
	BinaryEncoder.prototype.writeO_U16 = function( a,b ) {
		this.writeUint8(a);
		this.writeInt8(0);
		this.writeUint16(b || 0);
	}

	/**
	 * Write an opcode + 1 signed short
	 */
	BinaryEncoder.prototype.writeO_S16 = function( a,b ) {
		this.writeUint8(a);
		this.writeInt8(0);
		this.writeInt16(b || 0);
	}

	/**
	 * Write an opcode + 1 unsigned 24-bit number
	 */
	BinaryEncoder.prototype.writeO_U24 = function( a,b ) {
		this.writeUint8(a);
		this.writeUint8((b & 0xff0000) >> 16);
		this.writeUint16(b & 0xffff);
	}

	/**
	 * Write an opcode + 1 signed 24-bit number
	 */
	BinaryEncoder.prototype.writeO_S24 = function( a,b ) {
		this.writeUint8(a);

		// Get 24-bits and apply 2's complement if negative
		var num = b & 0xffffff;
		if (b < 0) num = ((~(-b) & 0xffffff) + 1) & 0xffffff;

		this.writeUint8((num & 0xff0000) >> 16);
		this.writeUint16(num & 0xffff);
	}

	/**
	 * Write required padding in order to align on 32-bit
	 */
	BinaryEncoder.prototype.writeAlignPad = function( length ) {
		var pad = this.offset % length;
		for (var i=0; i<pad; i++)
			this.writeUint8(0);
	}

	////////////////////////////////////////////////////////////
	// Helper functions
	////////////////////////////////////////////////////////////

	/**
	 * Get minimum type to fit this number
	 */
	BinaryEncoder.prototype.getNumType = function( v, include_24 ) {

		// First, check for integers
		if (v % 1 == 1) {

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
	 * Get minimum type to fit this numeric array
	 */
	BinaryEncoder.prototype.getNumArrayType = function( v ) {

		// Get bounds
		var min = v[0], max = v[0], is_float = false;
		for (var i=0; i<v.length; i++) {
			var n = v[i];
			// Make sure we have only numbers
			if (typeof(n) !== "number") return undefined;
			// Update bounds
			if (n > max) max = n;
			if (n < min) min = n;
			// Check for float
			if (!is_float && (n % 1 != 0)) is_float=true;
		}

		// Check if we have to use floats
		if (is_float) {

			// Check bounds if it doesn't fit in FLOAT32
			if (Math.abs(n) >= 3.40282e+38) {
				return NUMTYPE.FLOAT64;
			} else {
				return NUMTYPE.FLOAT32;
			}

		} else {

			// Check for signed or unsigned
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
					return NUMTYPE.INT8;
				} else if (max < 65536) {
					return NUMTYPE.INT16;
				} else {
					return NUMTYPE.INT32;
				}

			}

		}

	}

	/**
	 * Write a primitive
	 */
	BinaryEncoder.prototype.writePrimitive = function( v ) {

		// Check native types
		if (typeof(v) == "undefined") {

			// Store undefined
			this.writeO( OP.UNDEFINED );

		} else if (v === null) {

			// Store null
			this.writeO( OP.NULL );

		} else if (typeof(v) == "boolean") {

			// Store boolean
			this.writeO( OP.BOOLEAN + (v ? 1 : 0) );

		} else if (typeof(v) == "number") {

			// Store a single number
			var tn = this.getNumType(v, true);
			console.log("NUM: ", _TYPENAME[tn])

			// Write small numbers in the same frame
			if (tn == NUMTYPE.INT8) {
				this.writeO_S8( OP.NUMBER + tn, v );
			} else if (tn == NUMTYPE.UINT8) {
				this.writeO_U8( OP.NUMBER + tn, v );
			} else if (tn == NUMTYPE.INT16) {
				this.writeO_S16( OP.NUMBER + tn, v );
			} else if (tn == NUMTYPE.UINT16) {
				this.writeO_U16( OP.NUMBER + tn, v );
			} else if (tn == NUMTYPE.INT24) {
				this.writeO_S24( OP.NUMBER + tn, v );
			} else if (tn == NUMTYPE.UINT24) {
				this.writeO_U24( OP.NUMBER + tn, v );
			} else if (tn == NUMTYPE.INT32) {
				this.writeO( OP.NUMBER + tn);
				this.writeInt32(v);
			} else if (tn == NUMTYPE.UINT32) {
				this.writeO( OP.NUMBER + tn);
				this.writeUint32(v);
			} else if (tn == NUMTYPE.FLOAT32) {
				this.writeO( OP.NUMBER + tn);
				this.writeFloat32(v);
			}

		} else if (typeof(v) == "string") {

			// Up to 3 characters, the string can fit in the header
			if (v.length == 0) {
				this.writeO_U8( OP.STRING_03 + 0 );
			} else if (v.length == 1) {
				this.writeO_U8( OP.STRING_03 + 1, v.charCodeAt(0) );
			} else if (v.length == 2) {
				this.writeO_U8( OP.STRING_03 + 2, v.charCodeAt(0),
										  		  v.charCodeAt(1) );
			} else if (v.length == 3) {
				this.writeO_U8( OP.STRING_03 + 3, v.charCodeAt(0),
										  		  v.charCodeAt(1),
										  		  v.charCodeAt(2) );
			} else {
				// From 4 characters and more, store it's payload separately
				this.writeO_U24( OP.STRING_N, v.length );
				this.writeString( v );

				// Align to 32-bit
				this.writeAlignPad(4);
			}

		} else if (v instanceof Array) {

			// Encode array
			this.writeEncodedArray( v );

		} else {

			// Encode object in the this
			this.writeEncodedObject( v );				

		}

	}

	/**
	 * Iterate over array and write using specified function
	 */
	BinaryEncoder.prototype.iterateAndWrite = function( array, writeFn ) {
		for (var i=0; i<array.length; i++)
			writeFn.call(this, array[i] );
	}

	/**
	 * Encode array of elements
	 */
	BinaryEncoder.prototype.writeEncodedArray = function( srcArray ) {

		// If array is empty, write empty array header
		if (srcArray.length == 0) {
			// Write ARRAY_EMPTY header
			this.writeO_U24( OP.ARRAY_EMPTY );
			return;
		}

		// Get array type
		var arrayType = this.getNumArrayType( srcArray );

		// If we don't have a numeric array, store entities one by one
		if (arrayType == undefined) {
			console.log("ARR: *ENT*")

			// Write ARRAY_N_ENT header
			this.writeO_U24( OP.ARRAY_N_ENT, srcArray.length );

			// Write primitives
			for (var i=0; i<srcArray.length; i++)
				this.writePrimitive( srcArray[i] );

		} else {
			console.log("ARR: ", _TYPENAME[arrayType])

			// 64-bit array floats require alignment first
			if (arrayType == NUMTYPE.FLOAT64) {

				// Align to 64-bit
				this.writeAlignPad(8);

				// Write ARRAY_N header
				this.writeO_U24( OP.ARRAY_N + arrayType, srcArray.length );
				this.iterateAndWrite( srcArray, this.writeFloat64 );

			} else {

				// Some cases can be compacted to a single opcode frame
				if ((arrayType == NUMTYPE.UINT8) && (srcArray.length == 1)) {
					this.writeO_U8( OP.ARRAY_1 + arrayType, 
						srcArray[0] );
				} else if ((arrayType == NUMTYPE.INT8) && (srcArray.length == 1)) {
					this.writeO_S8( OP.ARRAY_1 + arrayType, 
						srcArray[0] );
				} else if ((arrayType == NUMTYPE.UINT8) && (srcArray.length == 2)) {
					this.writeO_U8( OP.ARRAY_1 + arrayType, 
						srcArray[0], srcArray[1] );
				} else if ((arrayType == NUMTYPE.INT8) && (srcArray.length == 2)) {
					this.writeO_S8( OP.ARRAY_1 + arrayType, 
						srcArray[0], srcArray[1] );
				} else if ((arrayType == NUMTYPE.UINT8) && (srcArray.length == 3)) {
					this.writeO_U8( OP.ARRAY_1 + arrayType, 
						srcArray[0], srcArray[1], srcArray[2] );
				} else if ((arrayType == NUMTYPE.INT8) && (srcArray.length == 3)) {
					this.writeO_S8( OP.ARRAY_1 + arrayType, 
						srcArray[0], srcArray[1], srcArray[2] );

				} else if ((arrayType == NUMTYPE.UINT16) && (srcArray.length == 1)) {
					this.writeO_U16( OP.ARRAY_1 + arrayType, 
						srcArray[0] );
				} else if ((arrayType == NUMTYPE.INT16) && (srcArray.length == 1)) {
					this.writeO_S16( OP.ARRAY_1 + arrayType, 
						srcArray[0] );

				} else {

					// Write array header
					this.writeO_U24( OP.ARRAY_N + arrayType, srcArray.length );

					// Write values
					if (arrayType == NUMTYPE.UINT8) {
						this.iterateAndWrite( srcArray, this.writeUint8 );
					} else if (arrayType == NUMTYPE.INT8) {
						this.iterateAndWrite( srcArray, this.writeInt8 );
					} else if (arrayType == NUMTYPE.UINT16) {
						this.iterateAndWrite( srcArray, this.writeUint16 );
					} else if (arrayType == NUMTYPE.INT16) {
						this.iterateAndWrite( srcArray, this.writeInt16 );
					} else if (arrayType == NUMTYPE.UINT32) {
						this.iterateAndWrite( srcArray, this.writeUint32 );
					} else if (arrayType == NUMTYPE.INT32) {
						this.iterateAndWrite( srcArray, this.writeInt32 );
					} else if (arrayType == NUMTYPE.FLOAT32) {
						this.iterateAndWrite( srcArray, this.writeFloat32 );
					}

					// Align padding to 32-bit
					this.writeAlignPad(4);

				}

			}

		}

	}

	/**
	 * Encode a particular object to a binary stream
	 */
	BinaryEncoder.prototype.writeEncodedObject = function( object ) {

		// Get the entity type of this object
		var eid = -1;
		for (var i=0; i<ENTITIES.length; i++)
			if (object instanceof ENTITIES[i])
				{ eid = i; break; }

		// If no such entity exists, raise exception
		if (eid < 0)
			throw {
				'name' 		: 'EncodingError',
				'message'	: 'The specified object is not of known entity type',
				toString 	: function(){return this.name + ": " + this.message;}
			};

		// Prepare property table
		var propertyTable = new Array( PROPERTIES[eid].length );

		// Iterate over object's properties
		for (var k in object) {
			// Skip unknown properties
			var pid = PROPERTIES[eid].indexOf(k);
			if (pid == -1) continue;
			// Encode properties
			propertyTable[pid] = object[k];
		}

		// Start entity
		this.writeO_U24( OP.ENTITY, eid );

		// Write down property table
		//console.log("@"+this.offset," eid=" + eid, ":", propertyTable);
		this.writeEncodedArray( propertyTable );

	}

	/**
	 * Encode a particular object to a binary stream
	 */
	BinaryEncoder.prototype.encode = function( object ) {

		// Encode object
		this.writeEncodedObject( object );

		// Write end of stream
		this.writeUint8( OP.END_OF_STREAM );

	}

	/**
	 * Return binary encoder
	 */
	return BinaryEncoder;

});