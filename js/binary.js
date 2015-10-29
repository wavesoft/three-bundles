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

		// Native primitives
		PROP_NATIVE_NULL		: 0x01,
		PROP_NATIVE_UNDEFINED	: 0x02,
		PROP_NATIVE_BOOL_TRUE	: 0x03,
		PROP_NATIVE_BOOL_FALSE	: 0x04,

		// Numbers
		PROP_NATIVE_NUMBER_I8	: 0x10, // + 1 B
		PROP_NATIVE_NUMBER_I16	: 0x11, // + 2 B
		PROP_NATIVE_NUMBER_F32	: 0x12, // + 4 B
		PROP_NATIVE_NUMBER_F64	: 0x13, // + 8 B
		PROP_NATIVE_NUMBER_I32	: 0x14, // + 4 B

		// Strings
		PROP_NATIVE_STRING_8	: 0x20, // + 1 B (size)
		PROP_NATIVE_STRING_16	: 0x21, // + 2 B (size)
		PROP_NATIVE_STRING_32	: 0x22, // + 4 B (size)

		// Arrays
		PROP_NATIVE_ARRAY_8		: 0x30, // + 1 B
		PROP_NATIVE_ARRAY_16	: 0x31, // + 2 B
		PROP_NATIVE_ARRAY_32	: 0x32, // + 4 B
		PROP_INT16_ARRAY_8		: 0x33, // + 1 B
		PROP_INT16_ARRAY_16		: 0x34, // + 1 B
		PROP_INT16_ARRAY_32		: 0x35, // + 1 B
		PROP_FLOAT32_ARRAY_8	: 0x36, // + 1 B
		PROP_FLOAT32_ARRAY_16	: 0x37, // + 1 B
		PROP_FLOAT32_ARRAY_32	: 0x38, // + 1 B
		PROP_FLOAT64_ARRAY_8	: 0x39, // + 1 B
		PROP_FLOAT64_ARRAY_16	: 0x3a, // + 1 B
		PROP_FLOAT64_ARRAY_32	: 0x3b, // + 1 B

		// Entities
		PROP_ENTITY_8 			: 0x40, // + 1 B
		PROP_ENTITY_16			: 0x41, // + 2 B

		// Special opcodes
		END_OF_STREAM 			: 0xe0,
		PAD_ALIGN				: 0xf7,

	}

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
				offset = 0,
				prevOp = 0, currOp = 0;

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
				if (type == 0) {
					offset += length * 2;
					return new Int16Array( buffer, offset, length );
				} else if (type == 1) {
					offset += length * 4;
					return new Float32Array( buffer, offset, length );
				} else if (Type == 2) {
					offset += length * 8;
					return new Float64Array( buffer, offset, length );
				}
			}

			function getEntity( eid ) {
				// Try to instantiate entity
				if (eid >= ENTITIES.length)
					throw {
						'name' 		: 'OpcodeError',
						'message'	: 'The specified entity id (#' + eid + ') is not known',
						toString 	: function(){return this.name + ": " + this.message;}
					};

				// Instantiate entry
				var instance = new ENTITIES[eid]();

				// Get an array that contains the values
				// for the properties in the property table
				var values = getObject([
						OP.PROP_NATIVE_ARRAY_8,
						OP.PROP_NATIVE_ARRAY_16,
						OP.PROP_NATIVE_ARRAY_32,
						OP.PROP_INT16_ARRAY_8,
						OP.PROP_INT16_ARRAY_16,
						OP.PROP_INT16_ARRAY_32,
						OP.PROP_FLOAT32_ARRAY_8,
						OP.PROP_FLOAT32_ARRAY_16,
						OP.PROP_FLOAT32_ARRAY_32,
						OP.PROP_FLOAT64_ARRAY_8,
						OP.PROP_FLOAT64_ARRAY_16,
						OP.PROP_FLOAT64_ARRAY_3
					]);

				// Iterate over properties
				var props = PROPERTIES[eid];
				for (var i=0; i<props.length; i++) {
					instance[props[i]] = values[i];
				}

				// Return entity
				return instance;
			}

			function getObject( valid_opcodes ) {
				var op = getUint8();

				// Keep previous opcode for debugging
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

				// Handle opcode
				switch (op) {

					// -----------------------
					//  Native primitives
					// -----------------------

					case OP.PROP_NATIVE_NULL:
						return null;

					case OP.PROP_NATIVE_UNDEFINED:
						return undefined;

					case OP.PROP_NATIVE_BOOL_TRUE:
						return true;

					case OP.PROP_NATIVE_BOOL_FALSE:
						return true;

					// -----------------------
					//  Numbers
					// -----------------------

					case OP.PROP_NATIVE_NUMBER_I8:
						return Number( getInt8() );

					case OP.PROP_NATIVE_NUMBER_I16:
						return Number( getInt16() );

					case OP.PROP_NATIVE_NUMBER_F32:
						return Number( getFloat32() );

					case OP.PROP_NATIVE_NUMBER_F64:
						return Number( getFloat64() );

					case OP.PROP_NATIVE_NUMBER_I32:
						return Number( getInt32() );

					// -----------------------
					//  Strings
					// -----------------------

					case OP.PROP_NATIVE_STRING_8:
						return getString( getUint8() );

					case OP.PROP_NATIVE_STRING_16:
						return getString( getUint16() );

					case OP.PROP_NATIVE_STRING_32:
						return getString( getUint32() );

					// -----------------------
					//  Entities
					// -----------------------

					case OP.PROP_ENTITY_8:
						return getEntity( getUint8() );

					case OP.PROP_ENTITY_16:
						return getEntity( getUint16() );

					// -----------------------
					//  Arrays
					// -----------------------

					case OP.PROP_NATIVE_ARRAY_8:
						return getArray( getUint8() );

					case OP.PROP_NATIVE_ARRAY_16:
						return getArray( getUint16() );

					case OP.PROP_NATIVE_ARRAY_32:
						return getArray( getUint32() );


					case OP.PROP_INT16_ARRAY_8:
						return getNumberArray( getUint8(), 0 );

					case OP.PROP_INT16_ARRAY_16:
						return getNumberArray( getUint16(), 0 );

					case OP.PROP_INT16_ARRAY_32:
						return getNumberArray( getUint32(), 0 );

					case OP.PROP_FLOAT32_ARRAY_8:
						return getNumberArray( getUint8(), 1 );

					case OP.PROP_FLOAT32_ARRAY_16:
						return getNumberArray( getUint16(), 1 );

					case OP.PROP_FLOAT32_ARRAY_32:
						return getNumberArray( getUint32(), 1 );

					case OP.PROP_FLOAT64_ARRAY_8:
						return getNumberArray( getUint8(), 2 );

					case OP.PROP_FLOAT64_ARRAY_16:
						return getNumberArray( getUint16(), 2 );

					case OP.PROP_FLOAT64_ARRAY_32:
						return getNumberArray( getUint32(), 2 );


					// -----------------------
					//  Alignment bytes
					// -----------------------

					case OP.PAD_ALIGN: 		offset += 1; break;
					case OP.PAD_ALIGN+1: 	offset += 2; break;
					case OP.PAD_ALIGN+2: 	offset += 3; break;
					case OP.PAD_ALIGN+3: 	offset += 4; break;
					case OP.PAD_ALIGN+4: 	offset += 5; break;
					case OP.PAD_ALIGN+5: 	offset += 6; break;
					case OP.PAD_ALIGN+6: 	offset += 7; break;

					// -----------------------
					//  Unknown opcodes
					// -----------------------

					default:
						throw {
							'name' 		: 'OpcodeError',
							'message'	: 'Unknown opcode 0x' + op.toString(16) + ' at offset ' + offset + '. Last opcode was 0x' + prevOp.toString(16),
							toString 	: function(){return this.name + ": " + this.message;}
						};

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