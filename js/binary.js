"use strict";
/**
 * THREE Bundles - Binary Decoder
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
define(["three"], function(THREE) {

	// Factories
	var FACTORY = {

		/**
		 * Default factory
		 */
		'Default': function(ClassName) {
			return new ClassName();
		},

		/**
		 * Create an object without using new constructor
		 */
		'Unconstructed': function(ClassName) {
			return Object.create(ClassName.prototype);
		},

	}

	// Initializers
	var INIT = {

		/**
		 * Default Initializer
		 */
		'Default': function( instance, properties, values ) {
			for (var i=0; i<properties.length; i++) {
				instance[properties[i]] = values[i];
			}
		},

		/**
		 * Update 'parent' property of each Object3D
		 */
		'Object3D': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			for (var i=0; i<instance.children.length; i++)
				instance.children[i].parent = instance;
		},

		/**
		 * Recalculate morph target
		 */
		'Mesh': function( instance, properties, values ) {
			INIT.Object3D( instance, properties, values );
			instance.updateMorphTargets();
		},

		/**
		 * Textures needs update
		 */
		'Texture': function(instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.needsUpdate = true;
		},

		/**
		 * Call animation clip constructor
		 */
		'AnimationClip': function(instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.name,
						 	  instance.duration,
						 	  instance.tracks
				);
		},

		/**
		 * Call keyframe constructor
		 */
		'KeyframeTrack': function(instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.name,
							  instance.keys
				);
		},

		/**
		 * Convert image payload to base-64 encoded data URI
		 */
		'ImageElement': function( instance, properties, values) {

			// Expand binary buffer to base-64 data URI
			var ctype = (String.fromCharCode( values[0][0] ) + 
					     String.fromCharCode( values[0][1] ) + 
					     String.fromCharCode( values[0][2] ) + 
					     String.fromCharCode( values[0][3] )).trim(),
				payload = values[0].slice(4);

			// Create data URI
			instance.src = 'data:image/' + ctype + ';base64,' + btoa(String.fromCharCode.apply(null, payload));

		},

	};

	/**
	 * Compactable entities
	 *
	 * The first 32 entities occupy 1 byte less, therefore for optimisation
	 * purposes try to move the most frequently used entities to the top.
	 */
	var ENTITIES = [
		
		[THREE.Vector2, 								FACTORY.Default, 				INIT.Default ],
		[THREE.Vector3, 								FACTORY.Default, 				INIT.Default ],
		[THREE.Face3, 									FACTORY.Default, 				INIT.Default ],
		[THREE.Color, 									FACTORY.Default, 				INIT.Default ],
		[THREE.Quaternion,								FACTORY.Default, 				INIT.Default ],
		[THREE.Euler,									FACTORY.Default, 				INIT.Default ],

		[THREE.Matrix3, 								FACTORY.Default, 				INIT.Default ],
		[THREE.Matrix4, 								FACTORY.Default, 				INIT.Default ],

		[THREE.Geometry, 								FACTORY.Default, 				INIT.Default ],
		[THREE.BufferGeometry, 							FACTORY.Default, 				INIT.Default ],
		[THREE.BufferAttribute, 						FACTORY.Default, 				INIT.Default ],

		[THREE.AnimationClip, 							FACTORY.Unconstructed,			INIT.AnimationClip ],
		[THREE.VectorKeyframeTrack, 					FACTORY.Unconstructed,			INIT.KeyframeTrack ],
		[THREE.QuaternionKeyframeTrack, 				FACTORY.Unconstructed,			INIT.KeyframeTrack ],
		[THREE.NumberKeyframeTrack, 					FACTORY.Unconstructed,			INIT.KeyframeTrack ],
		[THREE.BooleanKeyframeTrack, 					FACTORY.Unconstructed,			INIT.KeyframeTrack ],
		[THREE.StringKeyframeTrack, 					FACTORY.Unconstructed,			INIT.KeyframeTrack ],

		[THREE.Sphere, 									FACTORY.Default, 				INIT.Default ],

		[THREE.Mesh, 									FACTORY.Default, 				INIT.Mesh ],
		[THREE.Object3D, 								FACTORY.Default, 				INIT.Object3D ],

		[THREE.MeshBasicMaterial, 						FACTORY.Default, 				INIT.Default ],
		[THREE.MeshPhongMaterial, 						FACTORY.Default, 				INIT.Default ],
		[THREE.MeshLambertMaterial, 					FACTORY.Default, 				INIT.Default ],
		[THREE.Material, 								FACTORY.Default, 				INIT.Default ],

		[THREE.CompressedTexture, 						FACTORY.Default, 				INIT.Texture ],
		[THREE.Texture, 								FACTORY.Default, 				INIT.Texture ],
		[(typeof Image == 'undefined' ? null : Image),	FACTORY.Default,				INIT.ImageElement],

	];

	/**
	 * Reusable property sets
	 *
	 * Hint: Consequent numbers can be further optimised, so try to move
	 * numerical properties close to eachother.
	 *
	 */
	var PROPERTYSET = {

		// Object3D is a superclass of Mesh
		Object3D	: [
			'name', 'children', 'up', 'matrix', 'matrixWorld', 'visible', 'castShadow', 
			'receiveShadow', 'frustumCulled', 'renderOrder'
		],

		// Key frame track
		KeyframeTrack: [
			'name', 'keys', 'lastIndex', 'result', 'result'
		],

		// Material is superclass of many materials
		Material : [
			'side', 'opacity', 'blending', 'blendSrc', 'blendDst', 'blendEquation', 'depthFunc',
			'polygonOffsetFactor', 'polygonOffsetUnits', 'alphaTest', 'overdraw',
			'transparent', 'depthTest', 'depthWrite', 'colorWrite', 'polygonOffset', 'visible'
		],

		// Texture
		Texture: [ 
			'image', 'mipmaps', 'flipY', 'mapping', 'wrapS', 'wrapT', 'magFilter', 'minFilter',
			'anisotropy', 'format', 'type', 'offset', 'repeat', 'unpackAlignment'
		],

	};

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
		[ 'vertices', 'faces', 'faceVertexUvs', 'morphTargets', 'morphNormals', 'morphColors', 'animations', 'boundingSphere' ],
		// THREE.BufferGeometry
		[ 'attributes', 'index' ],
		// THREE.BufferAttribute
		[ 'array', 'itemSize', 'dynamic', 'updateRange' ],

		// THREE.AnimationClip
		[ 'name', 'duration', 'tracks', 'results' ],
		// THREE.VectorKeyframeTrack
		PROPERTYSET.KeyframeTrack,
		// THREE.QuaternionKeyframeTrack
		PROPERTYSET.KeyframeTrack,
		// THREE.NumberKeyframeTrack
		PROPERTYSET.KeyframeTrack,
		// THREE.BooleanKeyframeTrack
		PROPERTYSET.KeyframeTrack,
		// THREE.StringKeyframeTrack
		PROPERTYSET.KeyframeTrack,

		// THREE.Sphere
		[ 'center', 'radius' ],

		// THREE.Mesh
		PROPERTYSET.Object3D.concat([
			'geometry', 'material'
		]),
		// THREE.Object3D
		PROPERTYSET.Object3D,

		// THREE.MeshBasicMaterial
		PROPERTYSET.Material.concat([
			'color', 'map', 'aoMap', 'aoMapIntensity', 'specularMap', 'alphaMap', 'envMap',
			'combine', 'reflectivity', 'refractionRatio', 'fog', 'shading', 'wireframe',
			'wireframeLinewidth', 'wireframeLinecap', 'wireframeLinejoin',
			'vertexColors', 'skinning', 'morphTargets'
		]),
		// THREE.MeshPhongMaterial
		PROPERTYSET.Material.concat([
			'color', 'emissive', 'specular', 'shininess', 
			'metal', 'map', 'lightMap', 'lightMapIntensity',
			'aoMap', 'aoMapIntensity', 'emissiveMap', 
			'bumpMap', 'bumpScale', 'normalMap', 'normalScale',
			'displacementMap', 'displacementScale', 'displacementBias',
			'specularMap', 'alphaMap', 'envMap', 'combine', 'reflectivity',
			'refractionRatio', 'fog', 'shading', 
			'wireframe', 'wireframeLinewidth', 'vertexColors',
			'skinning', 'morphTargets', 'morphNormals'
		]),
		// THREE.MeshLambertMaterial
		PROPERTYSET.Material.concat([
			'color', 'emissive', 'map', 'specularMap', 'alphaMap', 'envMap', 
			'combine', 'reflectivity', 'fog', 
			'wireframe', 'wireframeLinewidth', 'vertexColors',
			'skinning', 'morphTargets', 'morphNormals'
		]),
		// THREE.Material
		PROPERTYSET.Material,

		// THREE.CompressedTexture
		PROPERTYSET.Texture,
		// THREE.Texture
		PROPERTYSET.Texture,

		// Image
		[ 'src' ],

	];

	/**
	 * Protocol opcodes
	 */
	var OP = {
		EXTENDED: 		0xFF,	// An extended opcode
		DICT: 			0xFE,	// A dictionary of primitives
		EXPORT: 		0xFC,	// Tag the next primitive as a named  bundle object
		IMPORT: 	 	0xFD,	// Refer to another named primitive (in this or other bundles)
		UNDEFINED: 	 	0xF8,	// Undefined primitive
		NULL: 		 	0xF9,	// NULL Primitive
		FALSE: 		 	0xFA,	// False primitive
		TRUE: 		 	0xFB,	// True primitive
		PAD_ALIGN: 	 	0xF0,	// Padding characters for alignment
		STRING_8: 	 	0xE0,	// A string with 8-bit index
		STRING_16: 	 	0xE1,	// A string with 16-bit index
		STRING_32: 	 	0xE2,	// A string with 32-bit index
		ARRAY_X_8:	 	0xE3,	// An element array with 8-bit index
		ARRAY_X_16:	 	0xE4,	// An element array with 16-bit index
		ARRAY_X_32:	 	0xE5,	// An element array with 32-bit index
		ARRAY_EMPTY: 	0xE6, 	// An empty array
		REF_16: 	 	0xE7, 	// A reference to a previous entity
		STRING_3:	 	0xE8,	// A string with 4-bit embedded index
		NUMBER_1: 	 	0xC0,	// A single number
		ARRAY_8: 	 	0xC8,	// A numeric array with 8-bit index
		ARRAY_16: 	 	0xD0,	// A numeric array with 16-bit index
		ARRAY_32: 	 	0xD8,	// A numeric array with 32-bit index
		ENTITY_5: 	 	0x80,	// An entity with 5-bit embedded eid
		ENTITY_13: 	 	0xA0,	// An entity with 13-bit eid
		NUMBER_N: 	 	0x00, 	// Consecutive, up to 16 numbers of same type
	}

	/**
	 * Numerical types in the binary protocol
	 */
	var NUMTYPE = {
		INT8 	: 0x00,		UINT8 	: 0x01,	// Integers 8-bit
		INT16 	: 0x02,		UINT16 	: 0x03, // Integers 16-bit
		INT32   : 0x04,		UINT32  : 0x05, // Integers 32-bit
		FLOAT32 : 0x06,		FLOAT64 : 0x07, // Float of 32 and 64 bit
		DIFF8 	: 0x18,		DIFF16	: 0x28, // Difference encoding
		INT24   : 0xF0,		UINT24  : 0xF1, // Integers 24-bit (internal use)
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
	BinaryDecoder.OP = OP;
	BinaryDecoder.ENTITIES = ENTITIES;
	BinaryDecoder.PROPERTIES = PROPERTIES;
	BinaryDecoder.NUMTYPE = NUMTYPE;

	/**
	 * Load a binary stream
	 */
	BinaryDecoder.prototype.load = function( url, database, callback ) {

		var req = new XMLHttpRequest();
		req.open('GET', url);
		req.responseType = "arraybuffer";
		req.send();

		req.onreadystatechange = function () {
			if (req.readyState !== 4) return;

			console.time( 'BinaryBundle' );

			var buffer = req.response,
				dataview = new DataView(buffer),
				offset = 0,	prevOp = 0, currOp = 0, dataEnd = 0,
				compactBuf = [], crossRef = [],
				viewUint8 = new Uint8Array(buffer),
				viewInt8 = new Int8Array(buffer),
				keyIndex = [ ], meta = { };

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
				// crossRef.push( array );
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
					return new Uint16Array( buffer, ofs, length );
				} else if (type == NUMTYPE.INT32) {
					offset += length * 4;
					return new Int32Array( buffer, ofs, length );
				} else if (type == NUMTYPE.UINT32) {
					offset += length * 4;
					return new Uint32Array( buffer, ofs, length );
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

				// Call entity factory
				var instance = ENTITIES[eid][1]( ENTITIES[eid][0] );

				// Keep in cross-reference
				crossRef.push( instance );

				// Get an array that contains the values
				// for the properties in the property table
				var values = getPrimitive(),
					moreValues = [];

				// Run initializer
				ENTITIES[eid][2]( instance, PROPERTIES[eid], values );

				// Return entity
				return instance;
			}

			function getDict( size ) {
				// Create a dict
				var dict = { };
				// crossRef.push( dict );
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

				// Get primitive tag, if any
				var tag = undefined;
				if (op == OP.EXPORT) {
					// Update tag name
					tag = meta['name']+'/'+keyIndex[ dataview.getUint16( (offset+=2)-2, true ) ];
					// Get next opcode
					op = viewUint8[offset++];
				}

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
				var result = undefined;
				switch (op) {

					// -----------------------
					//  Native primitives
					// -----------------------

					case OP.UNDEFINED:
						result = undefined;
						break;

					case OP.NULL:
						result = null;
						break;

					case OP.FALSE:
						result = false;
						break;

					case OP.TRUE:
						result = true;
						break;

					// -----------------------
					//  Strings
					// -----------------------

					case OP.STRING_8:
						result = getString( viewUint8[offset++] );
						break;

					case OP.STRING_16:
						result = getString( dataview.getUint16( (offset+=2)-2, true ) );
						break;

					case OP.STRING_32:
						result = getString( dataview.getUint32( (offset+=4)-4, true ) );
						break;

					// -----------------------
					//  Arrays
					// -----------------------

					case OP.ARRAY_EMPTY:
						result = [ ];
						break;

					case OP.ARRAY_X_8:
						result = getArray( viewUint8[offset++] );
						break;

					case OP.ARRAY_X_16:
						result = getArray( dataview.getUint16( (offset+=2)-2, true ) );
						break;

					case OP.ARRAY_X_32:
						result = getArray( dataview.getUint32( (offset+=4)-4, true ) );
						break;

					// -----------------------
					//  Dictionary
					// -----------------------

					case OP.DICT:
						result = getDict( viewUint8[offset++] );
						break;

					// -----------------------
					//  Cross-reference
					// -----------------------

					case OP.REF_16:
						result = crossRef[ dataview.getUint16( (offset+=2)-2, true ) ];
						break;

					case OP.IMPORT:

						// Get named tag from database
						var refTag = keyIndex[ dataview.getUint16( (offset+=2)-2, true ) ];
						result = database[ refTag ];

						// Log errors
						if (result === undefined) {
							console.warn("Could not import external tag '"+refTag+"'");
						}

						break;

					// -----------------------
					//  Comlpex Opcodes
					// -----------------------

					default:

						var b20 = (op & 0x7),		// Bits 3:0
							b40 = (op & 0x1F), 		// Bits 4:0
							b64 = (op & 0x78) >> 3; // Bits 6:3

						if ((op & 0xF8) == 0xE8) { /* STRING_3 */
							result = getString( b20 );
							break;

						} else if ((op & 0xF8) == 0xC0) { /* NUMBER_1 */
							result = getNum( b20 );
							break;

						} else if ((op & 0xF8) == 0xC8) { /* ARRAY_8 */
							result = getNumberArray( viewUint8[offset++], b20 );
							break;

						} else if ((op & 0xF8) == 0xD0) { /* ARRAY_16 */
							result = getNumberArray( dataview.getUint16( (offset+=2)-2, true ), b20 );
							break;

						} else if ((op & 0xF8) == 0xD8) { /* ARRAY_32 */
							result = getNumberArray( dataview.getUint32( (offset+=4)-4, true ), b20 );
							break;

						} else if ((op & 0xE0) == 0x80) { /* ENTITY_5 */
							result = getEntity( b40 );
							break;

						} else if ((op & 0xE0) == 0xA0) { /* ENTITY_13 */
							result = getEntity( (b40 << 8) + viewUint8[offset++] );
							break;

						} else if ((op & 0x80) == 0x00) { /* NUMBER_N */

							// Populate compact num buffer
							compactBuf = [];
							for (var i=0; i<b64; i++)
								compactBuf.push( getNum( b20 ) );

							// Pop firt
							result = compactBuf.shift();
							break;

						} else {

							throw {
								'name' 		: 'OpcodeError',
								'message'	: 'Unknown opcode 0x' + op.toString(16) + ' at offset ' + offset + '. Last opcode was 0x' + prevOp.toString(16),
								toString 	: function(){return this.name + ": " + this.message;}
							};

						}

				}

				// If we have a tag, store it in database
				if (tag) database[tag] = result;
				return result;

			}

			// Populate key index
			var indexSize = dataview.getUint16( viewUint8.length - 2, true );
			dataEnd = offset = viewUint8.length - indexSize;
			while (true) {
				keyIndex.push( getPrimitive() );
				// Check if we reached the end
				if ((offset + 2 >= viewUint8.length) || ((viewUint8[offset] & 0xF8) == 0xF0))
					break;
			} 
			offset = 0;

			// Get Primitive-0 that contains the bundle metadata
			meta = getPrimitive();
			if (meta['name'] == undefined) {
				console.error("This doesn't look like a valid 3BD archive");
				return;
			}

			// Read all primitives from file
			var primitive, all = [];
			while (offset < dataEnd)
				all.push( getPrimitive() );

			// Finished loading
			console.timeEnd( 'BinaryBundle' );
			callback( all );

		}
	}


	/**
	 * Return binary encoder
	 */
	return BinaryDecoder;

});