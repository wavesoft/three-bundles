/**
 * Package Binary Loader
 */
define(["three", "fs", "bufferpack", "../binary_v3"], function(THREE, fs, pack, Binary) {

	/**
	 * Import entity and property tables, along with opcodes from binary.js
	 */
	var ENTITIES = Binary.ENTITIES,
		PROPERTIES = Binary.PROPERTIES,
		OP = Binary.OP,
		NUMTYPE = Binary.NUMTYPE;

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

	/**
	 * THREE Bundles Binary encoder
	 */
	var BinaryEncoder = function( filename ) {
		this.offset = 0;

		this.logWrite = true;
		this.logPrimitive = true;
		this.logArray = true;
		this.logRef = true;
		this.logEntity = true;

		this.encodedReferences = [ ];
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
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 1;
		this.stream.write( pack.pack('>B', [d]) );
	}

	/**
	 * Write a signed byte (used for small values)
	 */
	BinaryEncoder.prototype.writeInt8 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 1;
		this.stream.write( pack.pack('>b', [d]) );
	}

	/**
	 * Write a 16-bit unsigned number
	 */
	BinaryEncoder.prototype.writeUint16 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 2;
		this.stream.write( pack.pack('>H', [d]) );
	}

	/**
	 * Write a 16-bit number
	 */
	BinaryEncoder.prototype.writeInt16 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 2;
		this.stream.write( pack.pack('>h', [d]) );
	}

	/**
	 * Write a 24-bit unsigned number
	 */
	BinaryEncoder.prototype.writeUint24 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.writeUint8((d & 0xff0000) >> 16);
		this.writeUint16(d & 0xffff);
	}

	/**
	 * Write a 32-bit unsigned number
	 */
	BinaryEncoder.prototype.writeUint32 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 4;
		this.stream.write( pack.pack('>I', [d]) );
	}

	/**
	 * Write a 32-bit signed number
	 */
	BinaryEncoder.prototype.writeInt32 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 4;
		this.stream.write( pack.pack('>i', [d]) );
	}

	/**
	 * Write a 32-bit float number
	 */
	BinaryEncoder.prototype.writeFloat32 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 4;
		this.stream.write( pack.pack('>f', [d]) );
	}

	/**
	 * Write an 64-bit float number
	 */
	BinaryEncoder.prototype.writeFloat64 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 8;
		this.stream.write( pack.pack('>d', [d]) );
	}

	/**
	 * Write a string stream
	 */
	BinaryEncoder.prototype.writeString = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
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
	BinaryEncoder.prototype.writeAlign = function( length, pad ) {

		// Default pad size
		if (!pad) pad = 0;

		// Calculate pad size
		var padSize = length - ((this.offset + pad) % length);
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
			if (this.logPrimitive) console.log("PRM @"+this.offset+", prim=undefined");
			this.writeUint8( OP.UNDEFINED );

		} else if (v === null) {

			// Store null
			if (this.logPrimitive) console.log("PRM @"+this.offset+", prim=null");
			this.writeUint8( OP.NULL );

		} else if (typeof(v) == "boolean") {

			// Store boolean
			if (this.logPrimitive) console.log("PRM @"+this.offset+", prim=false");
			this.writeUint8( OP.FALSE + (v ? 1 : 0) );

		} else if (typeof(v) == "string") {

			if (this.logPrimitive) console.log("PRM @"+this.offset+", prim=string");
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
			if (this.logPrimitive) console.log("PRM @"+this.offset+", prim=number");
			var tn = this.getNumType(v);
			this.writeNum( v, tn );

		} else if (v instanceof Array) {

			// Encode array
			if (this.logPrimitive) console.log("PRM @"+this.offset+", prim=array");
			this.writeEncodedArray( v );

		} else {

			// Encode object in the this
			if (this.logPrimitive) console.log("PRM @"+this.offset+", prim=object");
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
			if (this.logArray) console.log(" [] @"+this.offset+": empty");
			this.writeUint8( OP.ARRAY_EMPTY );
			return;
		}

		// Get array type
		var arrayType = this.getNumArrayType( srcArray );

		// If we don't have a numeric array, store entities one by one
		if (arrayType == undefined) {

			// Write ARRAY_X header
			if (srcArray.length < 256) {
				if (this.logArray) console.log(" [] @"+this.offset+": x8, len=", srcArray.length);
				this.writeUint8( OP.ARRAY_X_8 );
				this.writeUint8( srcArray.length );
			} else if (srcArray.length < 65536) {
				if (this.logArray) console.log(" [] @"+this.offset+": x16, len=", srcArray.length);
				this.writeUint8( OP.ARRAY_X_16 );
				this.writeUint16( srcArray.length );
			} else {
				if (this.logArray) console.log(" [] @"+this.offset+": x32, len=", srcArray.length);
				this.writeUint8( OP.ARRAY_X_32 );
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

						// Write opcode
						if (this.logArray) console.log(" >< @"+this.offset+": compact, len=", j);
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

			// Write header
			if (srcArray.length < 256) {

				// Add alignment with 2-byte long header
				if (arrayType <= NUMTYPE.UINT8) {
				} else if (arrayType <= NUMTYPE.UINT16) {
					if (this.logArray) console.log(" <> @"+this.offset+": align=2, pad=2");
					this.writeAlign(2, 2);
				} else if (arrayType <= NUMTYPE.FLOAT32) {
					if (this.logArray) console.log(" <> @"+this.offset+": align=4, pad=2");
					this.writeAlign(4, 2);
				} else  {
					if (this.logArray) console.log(" <> @"+this.offset+": align=8, pad=2");
					this.writeAlign(8, 2);
				}

				// Write header
				if (this.logArray) console.log(" [] @"+this.offset+": n8, type=", _TYPENAME[arrayType],", len=", srcArray.length);
				this.writeUint8( OP.ARRAY_8 + arrayType );
				this.writeUint8( srcArray.length );

			} else if (srcArray.length < 65536) {

				// Add alignment with 3-byte long header
				if (arrayType <= NUMTYPE.UINT8) {
				} else if (arrayType <= NUMTYPE.UINT16) {
					if (this.logArray) console.log(" <> @"+this.offset+": align=2, pad=3");
					this.writeAlign(2, 3);
				} else if (arrayType <= NUMTYPE.FLOAT32) {
					if (this.logArray) console.log(" <> @"+this.offset+": align=4, pad=3");
					this.writeAlign(4, 3);
				} else  {
					if (this.logArray) console.log(" <> @"+this.offset+": align=8, pad=3");
					this.writeAlign(8, 3);
				}

				// Write header
				if (this.logArray) console.log(" [] @"+this.offset+": n16, type=", _TYPENAME[arrayType],", len=", srcArray.length);
				this.writeUint8( OP.ARRAY_16 + arrayType );
				this.writeUint16( srcArray.length );

			} else {

				// Add alignment with 5-byte long header
				if (arrayType <= NUMTYPE.UINT8) {
				} else if (arrayType <= NUMTYPE.UINT16) {
					if (this.logArray) console.log(" <> @"+this.offset+": align=2, pad=5");
					this.writeAlign(2, 5);
				} else if (arrayType <= NUMTYPE.FLOAT32) {
					if (this.logArray) console.log(" <> @"+this.offset+": align=4, pad=5");
					this.writeAlign(4, 5);
				} else  {
					if (this.logArray) console.log(" <> @"+this.offset+": align=8, pad=5");
					this.writeAlign(8, 5);
				}

				// Write header
				if (this.logArray) console.log(" [] @"+this.offset+": n32, type=", _TYPENAME[arrayType],", len=", srcArray.length);
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

		// Handle byref cross-references
		var refID = this.encodedReferences.indexOf(object);
		if ((refID >= 0) && (refID < 65536)) {
			// Write reference
			if (this.logRef) console.log("PTR @"+this.offset+": ref=",refID);
			this.writeUint8( OP.REF_16 );
			this.writeUint16( refID );
			return
		}

		// Get the entity ID of this object
		var eid = -1;
		for (var i=0; i<ENTITIES.length; i++)
			if (object instanceof ENTITIES[i])
				{ eid = i; break; }

		// Handle ByVal cross-references
		for (var i=0; i<this.encodedReferences.length; i++) {
			if (this.encodedReferences[i] instanceof ENTITIES[eid]) {

				// Check if properties match
				var propmatch = true;
				for (var j=0; j<PROPERTIES[eid].length; j++) {
					if (this.encodedReferences[i][PROPERTIES[eid][j]] != object[PROPERTIES[eid][j]]) {
						propmatch = false;
						break;
					}
				}

				// If all properties match, we found a reference
				if (propmatch) {
					if (this.logRef) console.log("CPY @"+this.offset+": ref=",i);
					this.writeUint8( OP.REF_16 );
					this.writeUint16( i );
					return;
				}
			}
		}

		// Keep object in cross-referencing database
		this.encodedReferences.push(object);

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
			this.writeUint8( OP.ENTITY_13 + ((eid & 0x1F00) >> 8) );
			this.writeUint8( eid & 0xFFFF );
		}

		// Write down property table
		if (this.logEntity) console.log("ENT @"+this.offset," eid=" + eid);//, ":", propertyTable);
		this.writeEncodedArray( propertyTable );

	}

	/**
	 * Encode a particular object to a binary stream
	 */
	BinaryEncoder.prototype.encode = function( object ) {

		// Encode object
		this.writeEncodedObject( object );

	}

	/**
	 * Return binary encoder
	 */
	return BinaryEncoder;

});