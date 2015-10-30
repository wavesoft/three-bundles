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
		INT8 	: 0x00, UINT8 	: 0x01,	// Integers 8-bit
		INT16 	: 0x02, UINT16 	: 0x03, // Integers 16-bit
		INT32   : 0x04, UINT32  : 0x05, // Integers 32-bit
		FLOAT32 : 0x06, FLOAT64 : 0x07, // Float of 32 and 64 bit
		INT24   : 0x08, UINT24  : 0x09, // Integers 24-bit
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
		UNDEFINED: 	0xF8,	// Undefined primitive
		NULL: 		0xF9,	// NULL Primitive
		FALSE: 		0xFA,	// False primitive
		TRUE: 		0xFB,	// True primitive
		PAD_ALIGN: 	0xF0,	// Padding characters for alignment
		STRING_8: 	0xE0,	// A string with 8-bit index
		STRING_16: 	0xE1,	// A string with 16-bit index
		STRING_32: 	0xE2,	// A string with 32-bit index
		STRING_4:	0xE8,	// A string with 4-bit embedded index
		ARRAY_X_8:	0xE3,	// An element array with 8-bit index
		ARRAY_X_16:	0xE4,	// An element array with 16-bit index
		ARRAY_X_32:	0xE5,	// An element array with 32-bit index
		ARRAY_EMPTY:0xE6, 	// An empty array
		NUMBER_1: 	0xC0,	// A single number
		ARRAY_8: 	0xC8,	// A numeric array with 8-bit index
		ARRAY_16: 	0xD0,	// A numeric array with 16-bit index
		ARRAY_32: 	0xD8,	// A numeric array with 32-bit index
		ENTITY_5: 	0x80,	// An entity with 5-bit embedded eid
		ENTITY_13: 	0xA0,	// An entity with 13-bit eid
		NUMBER_N: 	0x00, 	// Consecutive, up to 16 numbers of same type
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
	 * Write a 24-bit unsigned number
	 */
	BinaryEncoder.prototype.writeUint24 = function( d ) {
		this.writeUint8((d & 0xff0000) >> 16);
		this.writeUint16(d & 0xffff);
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

		if (v instanceof Array) {
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
	BinaryEncoder.prototype.writeAlign = function( length ) {

		// Calculate pad size
		var padSize = this.offset % length;
		if (padSize == 0) return;

		// Write opcode + write pad characters
		this.writeUint8( OP.PAD_ALIGN + padSize );
		for (var i=1; i<padSize; i++)
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
			this.writeUint8( OP.UNDEFINED );

		} else if (v === null) {

			// Store null
			this.writeUint8( OP.NULL );

		} else if (typeof(v) == "boolean") {

			// Store boolean
			this.writeUint8( OP.FALSE + (v ? 1 : 0) );

		} else if (typeof(v) == "string") {

			if (v.length < 16) {
				// Up to 16 characters, the length can fit in header
				this.writeUint8( OP.STRING_4 + v.length );
				this.writeString( v );
			} else if (v.length < 256) {
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
			var tn = this.getNumType(v);
			this.writeNum( v, tn );

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
			this.writeUint8( OP.ARRAY_EMPTY );
			return;
		}

		// Get array type
		var arrayType = this.getNumArrayType( srcArray );

		// If we don't have a numeric array, store entities one by one
		if (arrayType == undefined) {

			// Write ARRAY_X header
			if (srcArray.length < 256) {
				this.writeUint8( OP.ARRAY_X_8 + arrayType );
				this.writeUint8( srcArray.length );
			} else if (srcArray.length < 65536) {
				this.writeUint8( OP.ARRAY_X_16 + arrayType );
				this.writeUint16( srcArray.length );
			} else {
				this.writeUint8( OP.ARRAY_X_32 + arrayType );
				this.writeUint32( srcArray.length );
			}

			// Write primitives
			for (var i=0; i<srcArray.length; i++) {

				// Check if we can compact the following  up to 16 numerical values
				var canCompact = false;
				for (var j=15; j>0; j--) {
					if (i+j >= srcArray.length) continue;

					// Check if the current slice is numeric
					var slice = srcArray.slice(i,i+j),
						sliceType = this.getNumArrayType( slice );
					if (sliceType !== undefined) {

						console.log("COMPACT:", slice);

						// Write opcode
						this.writeUint8(
								OP.NUMBER_N +	// We have N consecutive numbers
								(j << 3) +		// N=j
								sliceType		// Consecutive numbers type
							);

						// Write values
						this.writeNum( slice, sliceType );

						// We used compact
						canCompact = true;
						i += j;
						break;
					}
				}

				// If we didn't use compacted format, write primitive
				if (!canCompact)
					this.writePrimitive( srcArray[i] );

			}

		} else {

			// Write array header
			// console.log("ARR: ", _TYPENAME[arrayType])

			// Write padding
			if (arrayType <= NUMTYPE.UINT8) {
				// 8-bit padding
			} else if (arrayType <= NUMTYPE.UINT16) {
				// 16-bit padding
				this.writeAlign(2);
			} else if (arrayType <= NUMTYPE.FLOAT32) {
				// 32-bit padding
				this.writeAlign(4);
			} else if (arrayType <= NUMTYPE.FLOAT64) {
				// 64-bit padding
				this.writeAlign(8);
			}

			// Write header
			if (srcArray.length < 256) {
				this.writeUint8( OP.ARRAY_8 + arrayType );
				this.writeUint8( srcArray.length );
			} else if (srcArray.length < 65536) {
				this.writeUint8( OP.ARRAY_16 + arrayType );
				this.writeUint16( srcArray.length );
			} else {
				this.writeUint8( OP.ARRAY_32 + arrayType );
				this.writeUint32( srcArray.length );
			}

			// Write array
			this.writeNum( srcArray, arrayType );

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
		if (eid < 32) {
			this.writeUint8( OP.ENTITY_5 + eid );
		} else {
			this.writeUint8( OP.ENTITY_5 + ((eid & 0x1F00) >> 8) );
			this.writeUint8( eid & 0xFFFF );
		}

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