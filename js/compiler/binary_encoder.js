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
define(["three", "fs", "bufferpack", "util", "mock-browser", "../binary"], function(THREE, fs, pack, util, MockBrowser, Binary) {

	/**
	 * Import entity and property tables, along with opcodes from binary.js
	 */
	var ENTITIES = Binary.ENTITIES,
		PROPERTIES = Binary.PROPERTIES,
		NUMTYPE = Binary.NUMTYPE,
		OP = Binary.OP;

	// Override fake DOM
	var mock = new MockBrowser.mocks.MockBrowser();
	ENTITIES[26][0] = mock.getDocument().createElement('img').constructor;
	ENTITIES[26][3] = function( values ) {

		var fname = values[0];
		console.log("Loading",fname);

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

	/**
	 * THREE Bundles Binary encoder
	 */
	var BinaryEncoder = function( filename, bundleName ) {
		this.offset = 0;

		// Debug logging
		this.logWrite = false;
		this.logPrimitive = false;
		this.logArray = false;
		this.logRef = false;
		this.logAlign = false;
		this.logEntity = false;
		this.logCompact = false;
		this.logTag = true;

		// Get bundle name from filename if not provided
		if (bundleName == undefined) {
			// Strip extension 
			var ext = filename.split(".").pop();
			bundleName = filename.substr(0,filename.length-ext.length-1);
		}
		this.bundleName = bundleName;

		// Cross-reference lookup table
		this.encodedReferences = [ ];
		this.useCrossRef = 2;
		this.useCompact = true;

		// Cross-reference across bundles throguh database of tags
		this.database = { };
		this.dbObjects = [ ];
		this.dbTags = [ ];

		// Differential encoding
		this.useDiffEnc = true;
		this.diffEncPrecision = 10000;

		// Dictionary key lokup
		this.keyDictIndex = [ ];

		// Open write stream
		this.stream = fs.createWriteStream( filename );

		// Write metadata
		this.writePrimitive({
			'name': bundleName
		});

	};

	/**
	 * Close the stream
	 */
	BinaryEncoder.prototype.close = function() {
		// Write key index
		this.writeKeyIndex();
		// Finalize stream
		this.stream.end();
	}

	/**
	 * Define an external database of tagged objects to use
	 * for cross-referencing external entities.
	 */
	BinaryEncoder.prototype.setDatabase = function( db, prefix ) {
		if (!prefix) prefix="";

		// Import into a easy-to-process format
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
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 1;
		this.stream.write( pack.pack('<B', [d]) );
	}

	/**
	 * Write a signed byte (used for small values)
	 */
	BinaryEncoder.prototype.writeInt8 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 1;
		this.stream.write( pack.pack('<b', [d]) );
	}

	/**
	 * Write a 16-bit unsigned number
	 */
	BinaryEncoder.prototype.writeUint16 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 2;
		this.stream.write( pack.pack('<H', [d]) );
	}

	/**
	 * Write a 16-bit number
	 */
	BinaryEncoder.prototype.writeInt16 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 2;
		this.stream.write( pack.pack('<h', [d]) );
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
		this.stream.write( pack.pack('<I', [d]) );
	}

	/**
	 * Write a 32-bit signed number
	 */
	BinaryEncoder.prototype.writeInt32 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 4;
		this.stream.write( pack.pack('<i', [d]) );
	}

	/**
	 * Write a 32-bit float number
	 */
	BinaryEncoder.prototype.writeFloat32 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 4;
		this.stream.write( pack.pack('<f', [d]) );
	}

	/**
	 * Write an 64-bit float number
	 */
	BinaryEncoder.prototype.writeFloat64 = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += 8;
		this.stream.write( pack.pack('<d', [d]) );
	}

	/**
	 * Write a string stream
	 */
	BinaryEncoder.prototype.writeString = function( d ) {
		if (this.logWrite) console.log("    #"+this.offset+"=",d);
		this.offset += d.length;
		this.stream.write( d );
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
		var padSize = length - ((this.offset + pad) % length);
		if (padSize == 0) return;
		if (this.logAlign) console.log("ALN @"+this.offset+": length=",length,", pad=", pad, ", effective=",padSize);

		// Write opcode + write pad characters
		this.writeUint8( OP.PAD_ALIGN | padSize );
		for (var i=1; i<padSize; i++)
			this.writeUint8(0);

	}

	////////////////////////////////////////////////////////////
	// Helper functions
	////////////////////////////////////////////////////////////

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
	BinaryEncoder.prototype.getNumArrayType = function( v, strictFloat ) {

		// Typed arrays are simple, unless we are 
		// analysing for difference encoding
		if (!this.useDiffEnc) {
			if (v instanceof Uint8Array) {
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
			} else if (v instanceof Float32Array) {
				return NUMTYPE.FLOAT32;
			} else if (v instanceof Float64Array) {
				return NUMTYPE.FLOAT64;
			}
		}

		// Get bounds
		var min = v[0], max = v[0], is_float = false, all_float = true, maxDiff = 0, prev = undefined;
		for (var i=0; i<v.length; i++) {
			var n = v[i], d=0;
			// Make sure we have only numbers
			if (typeof(n) !== "number") return undefined;
			// Update bounds
			if (n > max) max = n;
			if (n < min) min = n;
			// Check for float
			if (n % 1 != 0) {
				if (!is_float) is_float=true;
			} else {
				if ((n != 0.0) && all_float) all_float=false;
			}
			// Calculate maximum difference
			if (prev == undefined) {
				prev = n;
			} else {
				d = Math.abs(n - prev);
				if (d > maxDiff) maxDiff = d;
			}
		}

		// If we are strict on the float types,
		// return undefined if a mismatch is found
		if (strictFloat && is_float && !all_float)
			return undefined;

		// Check if we have to use floats
		var type = 0;
		if (is_float) {

			// Check bounds if it doesn't fit in FLOAT32
			if (Math.abs(n) >= 3.40282e+38) {
				type = NUMTYPE.FLOAT64;
			} else {
				type = NUMTYPE.FLOAT32;
			}

			// If we have a 16-bit or 32-bit integer,
			// check if we can further optimise it
			// using differential encoding with fixed precision
			if (this.useDiffEnc) {
				if ((maxDiff * this.diffEncPrecision) < 128) {
					// We can encode using 8-bit differential
					console.log("!!! Can Diff-Encode type="+_TYPENAME[type]+", to=INT8, len="+v.length);
					type |= NUMTYPE.DIFF8;
				} else if ((maxDiff * this.diffEncPrecision) < 32768) {
					// We can encode using 16-bit differential
					console.log("!!! Can Diff-Encode type="+_TYPENAME[type]+", to=INT16, len="+v.length);
					type |= NUMTYPE.DIFF16;
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

			// If we have a 16-bit or 32-bit integer,
			// check if we can further optimise it
			// using differential encoding
			if (this.useDiffEnc) {
				if ((type >= NUMTYPE.INT16) && (maxDiff < 128)) {
					// We can encode using 8-bit differential
					console.log("!!! Can Diff-Encode type="+_TYPENAME[type]+", to=INT8, len="+v.length);
					type |= NUMTYPE.DIFF8;
				} else if ((type >= NUMTYPE.INT32) && (maxDiff < 32768)) {
					// We can encode using 16-bit differential
					console.log("!!! Can Diff-Encode type="+_TYPENAME[type]+", to=INT16, len="+v.length);
					type |= NUMTYPE.DIFF16;
				}
			}

		}

		return type;
	}

	/**
	 * Write a primitive
	 */
	BinaryEncoder.prototype.writePrimitive = function( v, tag ) {

		// Check for external references
		var dbRef = this.dbObjects.indexOf(v);
		if (dbRef >= 0) {
			if (this.logTag) console.log("TAG @"+this.offset+": import="+this.dbTags[dbRef]);
			this.writeUint8( OP.IMPORT );
			this.writeUint16( this.getKeyIndex(this.dbTags[dbRef]) );
			return;
		}

		// If we have a tag, tag this primitive first
		if (tag) {
			if (this.logTag) console.log("TAG @"+this.offset+": export="+tag);
			this.writeUint8( OP.EXPORT );
			this.writeUint16( this.getKeyIndex(tag) );

			// Update database
			this.database[this.bundleName+'/'+tag] = v;
		}

		// Check native types
		if (typeof(v) == "undefined") {

			// Store undefined
			if (this.logPrimitive) console.log("PRM @"+this.offset+": prim=undefined");
			this.writeUint8( OP.UNDEFINED );

		} else if (v === null) {

			// Store null
			if (this.logPrimitive) console.log("PRM @"+this.offset+": prim=null");
			this.writeUint8( OP.NULL );

		} else if (typeof(v) == "boolean") {

			// Store boolean
			if (this.logPrimitive) console.log("PRM @"+this.offset+": prim=false");
			this.writeUint8( OP.FALSE + (v ? 1 : 0) );

		} else if (typeof(v) == "string") {

			if (this.logPrimitive) console.log("PRM @"+this.offset+": prim=string");
			if (v.length < 8) {
				// Up to 16 characters, the length can fit in header
				this.writeUint8( OP.STRING_3 | v.length );
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
			if (this.logPrimitive) console.log("PRM @"+this.offset+": prim=number");
			var tn = this.getNumType(v);
			this.writeUint8( OP.NUMBER_1 | tn );
			this.writeNum( v, tn );

		} else if ((v instanceof Array) || (v instanceof Uint8Array) || (v instanceof Int8Array) ||
			(v instanceof Uint16Array) || (v instanceof Int16Array) ||
			(v instanceof Uint32Array) || (v instanceof Int32Array) ||
			(v instanceof Float32Array) || (v instanceof Float64Array)) {

			// Encode array
			if (this.logPrimitive) console.log("PRM @"+this.offset+": prim=array");
			this.writeEncodedArray( v );

		} else if (v.constructor === ({}).constructor) {

			// Encode dictionary
			if (this.logPrimitive) console.log("PRM @"+this.offset+": prim=dict");
			this.writeEncodedDict( v );				

		} else {

			// Encode object in the this
			if (this.logPrimitive) console.log("PRM @"+this.offset+": prim=object");
			this.writeEncodedEntity( v );				

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
				if (this.useCompact) {
					for (var j=15; j>1; j--) {
						if (i+j >= srcArray.length) continue;

						// Check if the current slice is numeric
						var slice = srcArray.slice(i,i+j),
							sliceType = this.getNumArrayType( slice, false );
						if (sliceType !== undefined) {

							// Write opcode
							if (this.logCompact) console.log(" >< @"+this.offset+": compact, len=", j,", type=", _TYPENAME[sliceType], ", values=",slice);
							this.writeUint8(
									OP.NUMBER_N |	// We have N consecutive numbers
									(j << 3)    |	// N=j
									sliceType		// Consecutive numbers type
								);

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
				this.writeUint8( OP.ARRAY_8 | arrayType );
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
				this.writeUint8( OP.ARRAY_16 | arrayType );
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
				this.writeUint8( OP.ARRAY_32 | arrayType );
				this.writeUint32( srcArray.length );

			}

			// Write array
			this.writeNum( srcArray, arrayType );

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
				if (this.logRef) console.log("PTR @"+this.offset+": ref=",refID);
				this.writeUint8( OP.REF_16 );
				this.writeUint16( refID );
				return
			}
		}

		// Get the entity ID of this object
		var eid = -1;
		for (var i=0; i<ENTITIES.length; i++)
			if (object instanceof ENTITIES[i][0])
				{ eid = i; break; }

		// If no such entity exists, raise exception
		if (eid < 0) {
			throw {
				'name' 		: 'EncodingError',
				'message'	: 'The specified object is not of known entity type',
				toString 	: function(){return this.name + ": " + this.message;}
			};
		}

		// Handle ByVal cross-references
		if (this.useCrossRef > 1) {
			for (var i=0; i<this.encodedReferences.length; i++) {
				if (this.encodedReferences[i] instanceof ENTITIES[eid][0]) {

					// Check if properties match
					var propmatch = true;
					for (var j=0; j<PROPERTIES[eid].length; j++) {
						if (this.encodedReferences[i][PROPERTIES[eid][j]] !== object[PROPERTIES[eid][j]]) {
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
		}

		// Keep object in cross-referencing database
		if (this.useCrossRef > 0) {
			if (this.encodedReferences.length < 65536) {
				this.encodedReferences.push(object);
				if (this.encodedReferences.length == 65536)
					console.error("References table is full");
			}
		}

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

		// Post-process entities
		if (ENTITIES[eid].length > 3)
			ENTITIES[eid][3]( propertyTable );

		// Start entity
		if (eid < 32) {
			this.writeUint8( OP.ENTITY_5 | eid );
		} else {
			this.writeUint8( OP.ENTITY_13 | ((eid & 0x1F00) >> 8) );
			this.writeUint8( eid & 0xFFFF );
		}

		// Write down property table
		if (this.logEntity) console.log("ENT @"+this.offset," eid=" + eid);
		this.writeEncodedArray( propertyTable );

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