"use strict";
/**
 * Package Binary Loader
 */
define(["three"], function(THREE) {

	// Entity Type
	var ENTITIES = [
		
		[THREE.Vector2, 			function(values) { } ],
		[THREE.Vector3, 			function(values) { } ],
		[THREE.Face3, 				function(values) { } ],
		[THREE.Color, 				function(values) { } ],
		[THREE.Quaternion,			function(values) { } ],
		[THREE.Euler,				function(values) { } ],

		[THREE.Matrix3, 			function(values) { } ],
		[THREE.Matrix4, 			function(values) { } ],

		[THREE.Geometry, 			function(values) { } ],
		[THREE.BufferGeometry, 		function(values) { } ],
		[THREE.BufferAttribute, 	function(values) { } ],

		[THREE.Sphere, 				function(values) { } ],

		[THREE.Mesh, 				function(values) { } ],
		[THREE.Object3D, 			function(values) { } ],

		[THREE.MeshBasicMaterial, 	function(values) { } ],
		[THREE.MeshPhongMaterial, 	function(values) { } ],
		[THREE.MeshLambertMaterial, function(values) { } ],
		[THREE.Material, 			function(values) { } ],

		[THREE.CompressedTexture, 	function(values) { return [ ['needsUpdate', true] ]; } ],
		[THREE.Texture, 			function(values) { return [ ['needsUpdate', true] ]; } ],

		[(typeof Image == 'undefined' ? null : Image), function( values ) {

			// Expand binary buffer to base-64 data URI
			var ctype = (String.fromCharCode( values[0][0] ) + 
					     String.fromCharCode( values[0][1] ) + 
					     String.fromCharCode( values[0][2] ) + 
					     String.fromCharCode( values[0][3] )).trim(),
				payload = values[0].slice(4);

			// Create data URI
			values[0] = 'data:image/' + ctype + ';base64,' + btoa(String.fromCharCode.apply(null, payload));

		}],

	];

	// Property index for every entity type
	var PROPERTIES = [

		// THREE.Vector2
		[ 'x', 'y' ],
		// THREE.Vector3
		[ 'x', 'y', 'z' ],
		// THREE.Face3
		[ 'a', 'b', 'c', 'materialIndex', 'normal', 'color', 'vertexNormals', 'vertexColors' ],
		// THREE.Color
		[ 'r', 'g', 'b' ],
		// THREE.Quaternion
		[ '_x', '_y', '_z', '_w' ],
		// THREE.Euler
		[ '_x', '_y', '_z', '_order' ],

		// THREE.Matrix3
		[ 'elements' ],
		// THREE.Matrix4
		[ 'elements' ],

		// THREE.Geometry
		[ 'vertices', 'faces', 'faceVertexUvs', 'morphTargets', 'morphNormals', 'morphColors', 'boundingSphere' ],
		// THREE.BufferGeometry
		[ 'attributes' ],
		// THREE.BufferAttribute
		[ 'array', 'itemSize', 'dynamic', 'updateRange' ],

		// THREE.Sphere
		[ 'center', 'radius' ],

		// THREE.Mesh
		[
			// Basic
			'children', 'up', 'matrix', 'matrixWorld', 'visible', 'castShadow', 'receiveShadow', 'frustumCulled', 'renderOrder',
			// Mesh
			'geometry', 'material'
		],
		// THREE.Object3D
		[
			'children', 'up', 'matrix', 'matrixWorld', 'visible', 'castShadow', 'receiveShadow', 'frustumCulled', 'renderOrder'
		],

		// THREE.MeshBasicMaterial
		[ 
			// Basic
			'side', 'opacity', 'blending', 'blendSrc', 'blendDst', 'blendEquation', 'depthFunc',
			'polygonOffsetFactor', 'polygonOffsetUnits', 'alphaTest', 'overdraw',
			'transparent', 'depthTest', 'depthWrite', 'colorWrite', 'polygonOffset', 'visible',
			// MeshBasicMaterial
			'color', 'map', 'aoMap', 'aoMapIntensity', 'specularMap', 'alphaMap', 'envMap',
			'combine', 'reflectivity', 'refractionRatio', 'fog', 'shading', 'wireframe',
			'wireframeLinewidth', 'wireframeLinecap', 'wireframeLinejoin',
			'vertexColors', 'skinning', 'morphTargets'
		],
		// THREE.MeshPhongMaterial
		[ 
			// Basic
			'side', 'opacity', 'blending', 'blendSrc', 'blendDst', 'blendEquation', 'depthFunc',
			'polygonOffsetFactor', 'polygonOffsetUnits', 'alphaTest', 'overdraw',
			'transparent', 'depthTest', 'depthWrite', 'colorWrite', 'polygonOffset', 'visible',
			// MeshBasicMaterial
			'color', 'emissive', 'specular', 'shininess', 
			'metal', 'map', 'lightMap', 'lightMapIntensity',
			'aoMap', 'aoMapIntensity', 'emissiveMap', 
			'bumpMap', 'bumpScale', 'normalMap', 'normalScale',
			'displacementMap', 'displacementScale', 'displacementBias',
			'specularMap', 'alphaMap', 'envMap', 'combine', 'reflectivity',
			'refractionRatio', 'fog', 'shading', 
			'wireframe', 'wireframeLinewidth', 'vertexColors',
			'skinning', 'morphTargets', 'morphNormals'
		],
		// THREE.MeshLambertMaterial
		[ 
			// Basic
			'side', 'opacity', 'blending', 'blendSrc', 'blendDst', 'blendEquation', 'depthFunc',
			'polygonOffsetFactor', 'polygonOffsetUnits', 'alphaTest', 'overdraw',
			'transparent', 'depthTest', 'depthWrite', 'colorWrite', 'polygonOffset', 'visible',
			// MeshBasicMaterial
			'color', 'emissive', 'map', 'specularMap', 'alphaMap', 'envMap', 
			'combine', 'reflectivity', 'fog', 
			'wireframe', 'wireframeLinewidth', 'vertexColors',
			'skinning', 'morphTargets', 'morphNormals'
		],
		// THREE.Material
		[ 
			'side', 'opacity', 'blending', 'blendSrc', 'blendDst', 'blendEquation', 'depthFunc',
			'polygonOffsetFactor', 'polygonOffsetUnits', 'alphaTest', 'overdraw',
			'transparent', 'depthTest', 'depthWrite', 'colorWrite', 'polygonOffset', 'visible'
		],

		// THREE.CompressedTexture
		[ 'image', 'mipmaps', 'flipY', 'mapping', 'wrapS', 'wrapT', 'magFilter', 'minFilter',
		  'anisotropy', 'format', 'type', 'offset', 'repeat', 'unpackAlignment' ],
		// THREE.Texture
		[ 'image', 'mipmaps', 'flipY', 'mapping', 'wrapS', 'wrapT', 'magFilter', 'minFilter',
		  'anisotropy', 'format', 'type', 'offset', 'repeat', 'unpackAlignment' ],

		// Image
		[ 'src' ],

	];

	// Opcodes
	var OP = {
		DICT: 		 0xFD,	// A plain dictionary
		UNDEFINED: 	 0xF8,	// Undefined primitive
		NULL: 		 0xF9,	// NULL Primitive
		FALSE: 		 0xFA,	// False primitive
		TRUE: 		 0xFB,	// True primitive
		PAD_ALIGN: 	 0xF0,	// Padding characters for alignment
		STRING_8: 	 0xE0,	// A string with 8-bit index
		STRING_16: 	 0xE1,	// A string with 16-bit index
		STRING_32: 	 0xE2,	// A string with 32-bit index
		ARRAY_X_8:	 0xE3,	// An element array with 8-bit index
		ARRAY_X_16:	 0xE4,	// An element array with 16-bit index
		ARRAY_X_32:	 0xE5,	// An element array with 32-bit index
		ARRAY_EMPTY: 0xE6, 	// An empty array
		REF_16: 	 0xE7, 	// A reference to a previous entity
		STRING_3:	 0xE8,	// A string with 4-bit embedded index
		NUMBER_1: 	 0xC0,	// A single number
		ARRAY_8: 	 0xC8,	// A numeric array with 8-bit index
		ARRAY_16: 	 0xD0,	// A numeric array with 16-bit index
		ARRAY_32: 	 0xD8,	// A numeric array with 32-bit index
		ENTITY_5: 	 0x80,	// An entity with 5-bit embedded eid
		ENTITY_13: 	 0xA0,	// An entity with 13-bit eid
		NUMBER_N: 	 0x00, 	// Consecutive, up to 16 numbers of same type
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

			console.time( 'BinaryBundle' );

			var buffer = req.response,
				dataview = new DataView(buffer),
				offset = 0,	prevOp = 0, currOp = 0,
				compactBuf = [], crossRef = [],
				viewUint8 = new Uint8Array(buffer),
				viewInt8 = new Int8Array(buffer),
				keyIndex = [ ];

			function getNum(type) {
				if (type == NUMTYPE.INT8) {
					return viewInt8[offset++];
				} else if (type == NUMTYPE.UINT8) {
					return viewUint8[offset++];
				} else if (type == NUMTYPE.INT16) {
					return dataview.getInt16( (offset+=2)-2, true );
				} else if (type == NUMTYPE.UINT16) {
					return dataview.getUint16( (offset+=2)-2, true );
				} else if (type == NUMTYPE.INT32) {
					return dataview.getInt32( (offset+=4)-4, true );
				} else if (type == NUMTYPE.UINT32) {
					return dataview.getUint32( (offset+=4)-4, true );
				} else if (type == NUMTYPE.FLOAT32) {
					return dataview.getFloat32( (offset+=4)-4, true );
				} else if (type == NUMTYPE.FLOAT64) {
					return dataview.getFloat64( (offset+=8)-8, true );
				}
			}

			function getString( length ) {
				var str = "";
				for (var i=0; i<length; i++)
					str += String.fromCharCode( viewUint8[offset++] );
				return str;
			}

			function getArray( length ) {
				var array = new Array( length );
				for (var i=0; i<length; i++)
					array[i] = getPrimitive();
				return array;
			}

			function getNumberArray( length, type ) {
				var ofs = offset;
				if (type == NUMTYPE.INT8) {
					offset += length;
					return new Int8Array( buffer, ofs, length );
				} else if (type == NUMTYPE.UINT8) {
					offset += length;
					return new Uint8Array( buffer, ofs, length );
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
				var instance = new ENTITIES[eid][0]();

				// Keep in cross-reference
				crossRef.push( instance );

				// Get an array that contains the values
				// for the properties in the property table
				var values = getPrimitive(),
					moreValues = [];

				// Run configurator
				moreValues = ENTITIES[eid][1]( values );

				// Iterate over properties
				var props = PROPERTIES[eid];
				for (var i=0; i<props.length; i++) {
					instance[props[i]] = values[i];
				}

				// Iterate over additional properties created
				// by the configurator
				if (moreValues)
					for (var i=0; i<moreValues.length; i++) {
						instance[moreValues[i][0]] = moreValues[i][1];
					}

				// Return entity
				return instance;
			}

			function getDict( size ) {
				// Create a dict
				var dict = { };
				for (var i=0; i<size; i++) {
					var k = keyIndex[dataview.getUint16( (offset+=2)-2, true )];
					var v = getPrimitive();
					dict[k] = v;
				}
				return dict;
			}

			function getPrimitive( valid_opcodes ) {

				// If we have a compacted buffer, drain it
				if (compactBuf.length > 0) 
					return compactBuf.shift();

				// Get next opcode
				var op = viewUint8[offset++];

				// Skip PAD_ALIGN opcodes
				if ((op & 0xF8) == 0xF0) {
					offset += (op & 0x07) - 1;
					op = viewUint8[offset++];
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
						return getString( viewUint8[offset++] );

					case OP.STRING_16:
						return getString( dataview.getUint16( (offset+=2)-2, true ) );

					case OP.STRING_32:
						return getString( dataview.getUint32( (offset+=4)-4, true ) );

					// -----------------------
					//  Arrays
					// -----------------------

					case OP.ARRAY_EMPTY:
						return [ ];

					case OP.ARRAY_X_8:
						return getArray( viewUint8[offset++] );

					case OP.ARRAY_X_16:
						return getArray( dataview.getUint16( (offset+=2)-2, true ) );

					case OP.ARRAY_X_32:
						return getArray( dataview.getUint32( (offset+=4)-4, true ) );

					// -----------------------
					//  Dictionary
					// -----------------------

					case OP.DICT:
						return getDict( viewUint8[offset++] );

					// -----------------------
					//  Cross-reference
					// -----------------------

					case OP.REF_16:
						return crossRef[ dataview.getUint16( (offset+=2)-2, true ) ];

					// -----------------------
					//  Comlpex Opcodes
					// -----------------------

					default:

						var b20 = (op & 0x7),		// Bits 3:0
							b40 = (op & 0x1F), 		// Bits 4:0
							b64 = (op & 0x78) >> 3; // Bits 6:3

						if ((op & 0xF8) == 0xE8) { /* STRING_3 */
							return getString( b20 );

						} else if ((op & 0xF8) == 0xC0) { /* NUMBER_1 */
							return getNum( b20 );

						} else if ((op & 0xF8) == 0xC8) { /* ARRAY_8 */
							return getNumberArray( viewUint8[offset++], b20 );

						} else if ((op & 0xF8) == 0xD0) { /* ARRAY_16 */
							return getNumberArray( dataview.getUint16( (offset+=2)-2, true ), b20 );

						} else if ((op & 0xF8) == 0xD8) { /* ARRAY_32 */
							return getNumberArray( dataview.getUint32( (offset+=4)-4, true ), b20 );

						} else if ((op & 0xE0) == 0x80) { /* ENTITY_5 */
							return getEntity( b40 );

						} else if ((op & 0xE0) == 0xA0) { /* ENTITY_13 */
							return getEntity( (b40 << 8) + viewUint8[offset++] );

						} else if ((op & 0x80) == 0x00) { /* NUMBER_N */

							// Populate compact num buffer
							compactBuf = [];
							for (var i=0; i<b64; i++)
								compactBuf.push( getNum( b20 ) );

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

			// Populate key index
			var indexSize = dataview.getUint16( viewUint8.length - 2, true );
			offset = viewUint8.length - indexSize;
			while (true) {
				keyIndex.push( getPrimitive() );
				// Check if we reached the end
				if ((offset + 2 >= viewUint8.length) || ((viewUint8[offset] & 0xF8) == 0xF0))
					break;
			} 
			offset = 0;

			// Fire callback with first object 
			var obj = getPrimitive();
			console.timeEnd( 'BinaryBundle' );

			callback( obj );

		}
	}


	/**
	 * Return binary encoder
	 */
	return BinaryDecoder;

});