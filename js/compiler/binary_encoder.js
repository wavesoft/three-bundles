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

	/**
	 * THREE Bundles Binary encoder
	 */
	var BinaryEncoder = function( filename ) {
		this.pad = true;
		this.offset = 0;
		this.stream = fs.createWriteStream( filename );
	};

	/**
	 * Close the stream
	 */
	BinaryEncoder.prototype.close = function() {
		this.stream.end();
	}

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
	 * Write a 16-bit number
	 */
	BinaryEncoder.prototype.writeInt16 = function( d ) {
		// Require 16-bit alignment
		if (this.pad) {
			if ((this.offset % 2) != 0)
				this.writeUint8( OP.PAD_ALIGN )
		}
		this.offset += 2;
		this.stream.write( pack.pack('>h', [d]) );
	}

	/**
	 * Write a 16-bit unsigned number
	 */
	BinaryEncoder.prototype.writeUint16 = function( d ) {
		// Require 16-bit alignment
		if (this.pad) {
			if ((this.offset % 2) != 0)
				this.writeUint8( OP.PAD_ALIGN )
		}
		this.offset += 2;
		this.stream.write( pack.pack('>H', [d]) );
	}

	/**
	 * Write a 32-bit signed number
	 */
	BinaryEncoder.prototype.writeInt32 = function( d ) {
		// Require 32-bit alignment
		if (this.pad) {
			if ((this.offset % 4) != 0)
				this.writeUint8( OP.PAD_ALIGN + (this.offset % 4) )
		}
		this.offset += 4;
		this.stream.write( pack.pack('>i', [d]) );
	}

	/**
	 * Write a 32-bit unsigned number
	 */
	BinaryEncoder.prototype.writeUint32 = function( d ) {
		// Require 32-bit alignment
		if (this.pad) {
			if ((this.offset % 4) != 0)
				this.writeUint8( OP.PAD_ALIGN + (this.offset % 4) )
		}
		this.offset += 4;
		this.stream.write( pack.pack('>I', [d]) );
	}

	/**
	 * Write a 32-bit float number
	 */
	BinaryEncoder.prototype.writeFloat32 = function( d ) {
		// Require 32-bit alignment
		if (this.pad) {
			if ((this.offset % 4) != 0)
				this.writeUint8( OP.PAD_ALIGN + (this.offset % 4) )
		}
		this.offset += 4;
		this.stream.write( pack.pack('>f', [d]) );
	}

	/**
	 * Write an 64-bit float number
	 */
	BinaryEncoder.prototype.writeFloat64 = function( d ) {
		// Require 64-bit alignment
		if (this.pad) {
			if ((this.offset % 8) != 0)
				this.writeUint8( OP.PAD_ALIGN + (this.offset % 8) )
		}
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

	/**
	 * Encode array of elements
	 */
	BinaryEncoder.prototype.writeEncodedArray = function( srcArray ) {

		// Analyze array
		var is_numeric = true,
			is_int16 = true, is_float32 = true;
		for (var i=0; i<srcArray.length; i++) {
			var n = srcArray[j];

			// Optimisations works only on numeric arrays
			if (typeof(n) !== "number") {
				is_numeric = false;
				break;
			}

			// Check numeric range
			if (is_int16) {
				if (n % 1 != 1) {
					is_int16 = false; // Not integer
				} else if (Math.abs(n) >= 32768) {
					is_int16 = false; // Bigger than signed 16-bit
				}
			}
			if (is_float32) {
				if (Math.abs(n) >= 3.40282e+38) {
					is_float32 = false; // Bigger than signed 32-bit
				}
			}
		}

		// Check if we are going to write it as numeric array
		if (is_numeric) {

			// We have numbers that fit in INT16
			if (is_int16) {

				// Write elements as 16-bit signed integers
				if (srcArray.length < 255) {
					this.writeUint8( OP.PROP_INT16_ARRAY_8 );
					this.writeUint8( srcArray.length );
				} else if (srcArray.length < 65536) {
					this.writeUint8( OP.PROP_INT16_ARRAY_16 );
					this.writeUint16( srcArray.length );
				} else {
					this.writeUint8( OP.PROP_INT16_ARRAY_32 );
					this.writeUint32( srcArray.length );
				}

				// Write int16 segments
				for (var j=0; j<srcArray.length; j++) {
					this.writeInt16( srcArray[j] );
				}

			// We have numbers that fit in FLOAT32
			} else if (is_float32) {

				// Write elements as 32-bit floats
				if (srcArray.length < 255) {
					this.writeUint8( OP.PROP_FLOAT32_ARRAY_8 );
					this.writeUint8( srcArray.length );
				} else if (srcArray.length < 65536) {
					this.writeUint8( OP.PROP_FLOAT32_ARRAY_16 );
					this.writeUint16( srcArray.length );
				} else {
					this.writeUint8( OP.PROP_FLOAT32_ARRAY_32 );
					this.writeUint32( srcArray.length );
				}

				// Write int16 segments
				for (var j=0; j<srcArray.length; j++) {
					this.writeFloat32( srcArray[j] );
				}

			} else {

				// Write elements as 64-bit floats
				if (srcArray.length < 255) {
					this.writeUint8( OP.PROP_FLOAT64_ARRAY_8 );
					this.writeUint8( srcArray.length );
				} else if (srcArray.length < 65536) {
					this.writeUint8( OP.PROP_FLOAT64_ARRAY_16 );
					this.writeUint16( srcArray.length );
				} else {
					this.writeUint8( OP.PROP_FLOAT64_ARRAY_32 );
					this.writeUint32( srcArray.length );
				}

				// Write int16 segments
				for (var j=0; j<srcArray.length; j++) {
					this.writeFloat64( srcArray[j] );
				}

			}

		} else {

			// Otheriwse we have an array of native elements
			if (srcArray.length < 255) {
				this.writeUint8( OP.PROP_NATIVE_ARRAY_8 );
				this.writeUint8( srcArray.length );
			} else if (srcArray.length < 65536) {
				this.writeUint8( OP.PROP_NATIVE_ARRAY_16 );
				this.writeUint16( srcArray.length );
			} else {
				this.writeUint8( OP.PROP_NATIVE_ARRAY_32 );
				this.writeUint32( srcArray.length );
			}

			// Write elements
			for (var i=0; i<srcArray.length; i++) {
				var v = srcArray[i];

				// Check native types
				if (typeof(v) == "undefined") {

					// Store undefined
					this.writeUint8( OP.PROP_NATIVE_UNDEFINED );

				} else if (v === null) {

					// Store null
					this.writeUint8( OP.PROP_NATIVE_NULL );

				} else if (typeof(v) == "boolean") {

					// Store boolean flag
					if (v) {
						this.writeUint8( OP.PROP_NATIVE_BOOL_TRUE );
					} else {
						this.writeUint8( OP.PROP_NATIVE_BOOL_FALSE );
					}

				} else if (typeof(v) == "string") {

					// Length-prefixed string
					if (v.length < 255) {
						this.writeUint8( OP.PROP_NATIVE_STRING_8 );
						this.writeUint8( v.length );
						this.writeString( v );
					} else if (v.length < 65536) {
						this.writeUint8( OP.PROP_NATIVE_STRING_16 );
						this.writeUint16( v.length );
						this.writeString( v );
					} else {
						this.writeUint8( OP.PROP_NATIVE_STRING_32 );
						this.writeUint32( v.length );
						this.writeString( v );
					}

				} else if (typeof(v) == "number") {

					// Pick appropriate type according to size
					var v = v;
					if (v % 1 == 0) { // Integer
						if (Math.abs(v) < 128) {
							this.writeUint8( OP.PROP_NATIVE_NUMBER_I8 );
							this.writeInt8( v );
						} else if (Math.abs(v) < 32768) {
							this.writeUint8( OP.PROP_NATIVE_NUMBER_I16 );
							this.writeInt16( v );
						} else if (Math.abs(v) < 2147483648) {
							this.writeUint8( OP.PROP_NATIVE_NUMBER_I32 );
							this.writeInt32( v );
						} else {
							this.writeUint8( OP.PROP_NATIVE_NUMBER_F64 );
							this.writeFloat64( v );
						}
					} else { // Float
						if (Math.abs(v) < 3.40282e+38) {
							this.writeUint8( OP.PROP_NATIVE_NUMBER_F32 );
							this.writeFloat32( v );
						} else {
							this.writeUint8( OP.PROP_NATIVE_NUMBER_F64 );
							this.writeFloat64( v );
						}
					}

				} else if (v instanceof Array) {

					// Encode array
					this.writeEncodedArray( v );

				} else {

					// Encode object in the this
					this.writeEncodedObject( v );				

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
		if (eid < 255) {
			this.writeUint8( OP.PROP_ENTITY_8 );
			this.writeUint8( eid );
		} else {
			this.writeUint8( OP.PROP_ENTITY_16 );
			this.writeUint16( eid );			
		}

		// Write down property table
		console.log("@"+this.offset," eid=" + eid, ":", propertyTable);
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