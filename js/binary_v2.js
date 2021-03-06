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
define(["three", "./extras/helpers/MD2Character"], function(THREE) {

	// Protocol revision
	var REV = 2;

	/**
	 * Factories for different entity types
	 * 
	 * These functions must return a new instance of the specified class
	 * type with the default values populated.
	 */
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

	/**
	 * Initializers of different class types
	 * 
	 * These functions must initialize the specified instance,
	 * by applying the propeties to the appropriate values, according
	 * to the individual class format.
	 */
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

		/**
		 * Constructor with width/height/depth
		 */
		'WidthHeightDepth': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.properties.width,
							  instance.properties.height,
							  instance.properties.depth,
							  instance.properties.widthSegments,
							  instance.properties.heightSegments,
							  instance.properties.depthSegments
				);
		},

		/**
		 * Constructor with width/height
		 */
		'WidthHeightDepth': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.properties.width,
							  instance.properties.height,
							  instance.properties.widthSegments,
							  instance.properties.heightSegments
				);
		},

		/**
		 * Radius segments theta
		 */
		'RadiusSegmentsTheta': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.properties.radius,
							  instance.properties.segments,
							  instance.properties.thetaStart,
							  instance.properties.thetaLength
				);
		},

		/**
		 * Radius segments theta
		 */
		'CylinderGeometry': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.parameters.radiusTop,
							  instance.parameters.radiusBottom,
							  instance.parameters.height,
							  instance.parameters.radialSegments,
							  instance.parameters.heightSegments,
							  instance.parameters.openEnded,
							  instance.parameters.thetaStart,
							  instance.parameters.thetaLength
				);
		},

		/**
		 * Radius/Detail
		 */
		'RadiusDetail': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.parameters.radius,
							  instance.parameters.detail
				);
		},

		/**
		 * Lathe Geometry
		 */
		'LatheGeometry': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.parameters.points,
							  instance.parameters.segments,
							  instance.parameters.phiStart,
							  instance.parameters.phiLength
				);
		},

		/**
		 * Lathe Geometry
		 */
		'SphereGeometry': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.parameters.radius,
							  instance.parameters.widthSegments,
							  instance.parameters.heightSegments,
							  instance.parameters.phiStart,
							  instance.parameters.phiLength,
							  instance.parameters.thetaStart,
							  instance.parameters.thetaLength
				);
		},

		/**
		 * Polyhedron Geometry
		 */
		'PolyhedronGeometry': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.parameters.vertices,
							  instance.parameters.indices,
							  instance.parameters.radius,
							  instance.parameters.detail
				);
		},

		/**
		 * Rihg Geometry
		 */
		'RingGeometry': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.parameters.innerRadius,
							  instance.parameters.outerRadius,
							  instance.parameters.thetaSegments,
							  instance.parameters.phiSegments,
							  instance.parameters.thetaStart,
							  instance.parameters.thetaLength
				);
		},

		/**
		 * Torus Geometry
		 */
		'TorusGeometry': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.parameters.radius,
							  instance.parameters.tube,
							  instance.parameters.radialSegments,
							  instance.parameters.tubularSegments,
							  instance.parameters.arc
				);
		},

		/**
		 * Torus Knot Geometry
		 */
		'TorusKnot': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.parameters.radius,
							  instance.parameters.tube,
							  instance.parameters.radialSegments,
							  instance.parameters.tubularSegments,
							  instance.parameters.p,
							  instance.parameters.q,
							  instance.parameters.heightScale
				);
		},

		/**
		 * Tube Geometry
		 */
		'TubeGeometry': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.parameters.path,
							  instance.parameters.segments,
							  instance.parameters.radius,
							  instance.parameters.radialSegments,
							  instance.parameters.closed,
							  instance.parameters.taper
				);
		},

		/**
		 * Cameras need to update projection matrix
		 */
		'Camera': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.updateProjectionMatrix();
		},

		/**
		 * CubeCamera needs a custom constructor
		 */
		'CubeCamera': function( instance, properties, values ) {
			INIT.Default(instance, properties, values);
			instance.constructor.call(
					instance, instance.near,
							  instance.far,
							  instance.cubeResolution
				);
		},

	};

	/**
	 * Compactable entities
	 *
	 * The first 16 entities occupy 1 byte less, therefore for optimisation
	 * purposes try to move the most frequently used entities to the top.
	 */
	var ENTITIES = [

		[THREE.Vector2, 								FACTORY.Default, 				INIT.Default ],
		[THREE.Vector3, 								FACTORY.Default, 				INIT.Default ],
		[THREE.Vector4, 								FACTORY.Default, 				INIT.Default ],
		[THREE.Face3, 									FACTORY.Default, 				INIT.Default ],
		[THREE.Color, 									FACTORY.Default, 				INIT.Default ],
		[THREE.Quaternion,								FACTORY.Default, 				INIT.Default ],
		[THREE.Euler,									FACTORY.Default, 				INIT.Default ],
		[THREE.Box2,									FACTORY.Default, 				INIT.Default ],
		[THREE.Box3,									FACTORY.Default, 				INIT.Default ],
		[THREE.Sphere, 									FACTORY.Default, 				INIT.Default ],
		[THREE.Matrix3, 								FACTORY.Default, 				INIT.Default ],
		[THREE.Matrix4, 								FACTORY.Default, 				INIT.Default ],
		[THREE.BufferAttribute, 						FACTORY.Default, 				INIT.Default ],
		[], // Reserved
		[], // Reserved
		[], // Reserved

		[THREE.AnimationClip, 							FACTORY.Unconstructed,			INIT.AnimationClip ],
		[THREE.VectorKeyframeTrack, 					FACTORY.Unconstructed,			INIT.KeyframeTrack ],
		[THREE.QuaternionKeyframeTrack, 				FACTORY.Unconstructed,			INIT.KeyframeTrack ],
		[THREE.NumberKeyframeTrack, 					FACTORY.Unconstructed,			INIT.KeyframeTrack ],
		[THREE.BooleanKeyframeTrack, 					FACTORY.Unconstructed,			INIT.KeyframeTrack ],
		[THREE.StringKeyframeTrack, 					FACTORY.Unconstructed,			INIT.KeyframeTrack ],

		[THREE.BoxGeometry, 							FACTORY.Unconstructed,			INIT.WidthHeightDepth ],
		[THREE.CircleBufferGeometry, 					FACTORY.Unconstructed,			INIT.RadiusSegmentsTheta ],
		[THREE.CircleGeometry, 							FACTORY.Unconstructed,			INIT.RadiusSegmentsTheta ],
		[THREE.CylinderGeometry, 						FACTORY.Unconstructed,			INIT.CylinderGeometry ],
		[THREE.DodecahedronGeometry, 					FACTORY.Unconstructed,			INIT.RadiusDetail ],
		[THREE.IcosahedronGeometry, 					FACTORY.Unconstructed,			INIT.RadiusDetail ],
		[THREE.LatheGeometry, 							FACTORY.Unconstructed,			INIT.LatheGeometry ],
		[THREE.OctahedronGeometry, 						FACTORY.Unconstructed,			INIT.RadiusDetail ],
		[THREE.ParametricGeometry, 						FACTORY.Unconstructed,			INIT.WidthHeight ],
		[THREE.PlaneBufferGeometry, 					FACTORY.Unconstructed,			INIT.WidthHeightDepth ],
		[THREE.PlaneGeometry, 							FACTORY.Unconstructed,			INIT.WidthHeightDepth ],
		[THREE.PolyhedronGeometry, 						FACTORY.Unconstructed,			INIT.PolyhedronGeometry ],
		[THREE.RingGeometry, 							FACTORY.Unconstructed,			INIT.RingGeometry ],
		[THREE.SphereBufferGeometry, 					FACTORY.Unconstructed,			INIT.SphereGeometry ],
		[THREE.SphereGeometry, 							FACTORY.Unconstructed,			INIT.SphereGeometry ],
		[THREE.TetrahedronGeometry, 					FACTORY.Unconstructed,			INIT.RadiusDetail ],
		[THREE.TorusGeometry, 							FACTORY.Unconstructed,			INIT.TorusGeometry ],
		[THREE.TorusKnotGeometry, 						FACTORY.Unconstructed,			INIT.TorusKnot ],
		[THREE.TubeGeometry, 							FACTORY.Unconstructed,			INIT.TubeGeometry ],

		[THREE.BufferGeometry, 							FACTORY.Default, 				INIT.Default ],
		[THREE.Geometry, 								FACTORY.Default, 				INIT.Default ],

		[THREE.Mesh, 									FACTORY.Default, 				INIT.Mesh ],
		[THREE.AmbientLight,							FACTORY.Default,				INIT.Default ],
		[THREE.DirectionalLight,						FACTORY.Default,				INIT.Default ],
		[THREE.HemisphereLight,							FACTORY.Default,				INIT.Default ],
		[THREE.PointLight,								FACTORY.Default,				INIT.Default ],
		[THREE.SpotLight,								FACTORY.Default,				INIT.Default ],
		[THREE.Scene,									FACTORY.Default,				INIT.Object3D ],
		[THREE.Object3D, 								FACTORY.Default, 				INIT.Object3D ],

		[THREE.Fog, 									FACTORY.Default, 				INIT.Object3D ],
		[THREE.FogExp2, 								FACTORY.Default, 				INIT.Object3D ],

		[THREE.MeshBasicMaterial, 						FACTORY.Default, 				INIT.Default ],
		[THREE.MeshPhongMaterial, 						FACTORY.Default, 				INIT.Default ],
		[THREE.MeshLambertMaterial, 					FACTORY.Default, 				INIT.Default ],
		[THREE.MeshDepthMaterial, 						FACTORY.Default, 				INIT.Default ],
		[THREE.MeshNormalMaterial, 						FACTORY.Default, 				INIT.Default ],
		[THREE.MultiMaterial, 							FACTORY.Default,				INIT.Default ],
		[THREE.PointsMaterial, 							FACTORY.Default,				INIT.Default ],
		[THREE.SpriteMaterial, 							FACTORY.Default,				INIT.Default ],
		[THREE.LineBasicMaterial, 						FACTORY.Default,				INIT.Default ],
		[THREE.Material, 								FACTORY.Default, 				INIT.Default ],

		[THREE.PerspectiveCamera,						FACTORY.Default,				INIT.Camera],
		[THREE.OrthographicCamera,						FACTORY.Default,				INIT.Camera],
		[THREE.CubeCamera,								FACTORY.Unconstructed,			INIT.CubeCamera],

		[THREE.CompressedTexture, 						FACTORY.Default, 				INIT.Texture ],
		[THREE.CubeTexture, 							FACTORY.Default, 				INIT.Texture ],
		[THREE.Texture, 								FACTORY.Default, 				INIT.Texture ],

		[(typeof Image == 'undefined' ? null : Image),	FACTORY.Default,				INIT.ImageElement],

		// Special types

		[THREE.MD2Character, 							FACTORY.Default, 				INIT.Default ],

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
			'mipmaps', 'flipY', 'mapping', 'wrapS', 'wrapT', 'magFilter', 'minFilter',
			'anisotropy', 'format', 'type', 'offset', 'repeat', 'unpackAlignment'
		],

	};

	/**
	 * Property index for every entity type
	 *
	 * HINT: For optimal compression, bulk as many as possible numerical parameters close
	 *       to each other. Continous numbers are be easily optimised.
	 */
	var PROPERTIES = [

		// THREE.Vector2
		[ 'x', 'y' ],
		// THREE.Vector3
		[ 'x', 'y', 'z' ],
		// THREE.Vector4
		[ 'x', 'y', 'z', 'w' ],
		// THREE.Face3
		[ 'a', 'b', 'c', 'materialIndex', 'normal', 'color', 'vertexNormals', 'vertexColors' ],
		// THREE.Color
		[ 'r', 'g', 'b' ],
		// THREE.Quaternion
		[ '_x', '_y', '_z', '_w' ],
		// THREE.Euler
		[ '_x', '_y', '_z', '_order' ],
		// THREE.Box2
		[ 'min', 'max' ],
		// THREE.Box3
		[ 'min', 'max' ],
		// THREE.Sphere
		[ 'center', 'radius' ],
		// THREE.Matrix3
		[ 'elements' ],
		// THREE.Matrix4
		[ 'elements' ],
		// THREE.BufferAttribute
		[ 'array', 'itemSize', 'dynamic', 'updateRange' ],
		// Reserved
		[],
		// Reserved
		[],
		// Reserved
		[],

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

		// THREE.BoxGeometry
		[ 'parameters' ],
		// THREE.CircleBufferGeometry
		[ 'parameters' ],
		// THREE.CircleGeometry
		[ 'parameters' ],
		// THREE.CylinderGeometry
		[ 'parameters' ],
		// THREE.DodecahedronGeometry
		[ 'parameters' ],
		// THREE.IcosahedronGeometry
		[ 'parameters' ],
		// THREE.LatheGeometry
		[ 'parameters' ],
		// THREE.OctahedronGeometry
		[ 'parameters' ],
		// THREE.ParametricGeometry
		[ 'parameters' ],
		// THREE.PlaneBufferGeometry
		[ 'parameters' ],
		// THREE.PlaneGeometry
		[ 'parameters' ],
		// THREE.PolyhedronGeometry
		[ 'parameters' ],
		// THREE.RingGeometry
		[ 'parameters' ],
		// THREE.SphereBufferGeometry
		[ 'parameters' ],
		// THREE.SphereGeometry
		[ 'parameters' ],
		// THREE.TetrahedronGeometry
		[ 'parameters' ],
		// THREE.TorusGeometry
		[ 'parameters' ],
		// THREE.TorusKnotGeometry
		[ 'parameters' ],
		// THREE.TubeGeometry
		[ 'parameters' ],

		// THREE.BufferGeometry
		[ 'attributes', 'index' ],
		// THREE.Geometry
		[ 'vertices', 'faces', 'faceVertexUvs', 'morphTargets', 'morphNormals', 'morphColors', 'animations', 'boundingSphere' ],

		// THREE.Mesh
		PROPERTYSET.Object3D.concat([
			'geometry', 'material'
		]),
		// THREE.AmbientLight
		PROPERTYSET.Object3D.concat([
			'color'
		]),
		// THREE.DirectionalLight
		PROPERTYSET.Object3D.concat([
			'color', 'intensity'
		]),
		// THREE.HemisphereLight
		PROPERTYSET.Object3D.concat([
			'color', 'groundColor', 'intensity'
		]),
		// THREE.PointLight
		PROPERTYSET.Object3D.concat([
			'color', 'intensity', 'distance', 'decay'
		]),
		// THREE.SpotLight
		PROPERTYSET.Object3D.concat([
			'color', 'intensity', 'distance', 'decay', 'angle', 'exponent'
		]),
		// THREE.Scene
		PROPERTYSET.Object3D.concat([
			'fog', 'overrideMaterial'
		]),
		// THREE.Object3D
		PROPERTYSET.Object3D,

		// THREE.Fog
		[ 'color', 'near', 'far' ],
		// THREE.FogExp2
		[ 'color', 'density' ],

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
		// THREE.MeshDepthMaterial
		[
			'opacity', 'blending', 'depthTest', 'depthWrite', 'wireframe', 'wireframeLinewidth'
		],
		// THREE.MeshNormalMaterial
		[
			'opacity', 'blending', 'depthTest', 'depthWrite', 'wireframe', 'wireframeLinewidth'
		],
		// THREE.MultiMaterial
		[
			'materials', 'visible',
		],
		// THREE.PointsMaterial
		[
			'color', 'opacity', 'map', 'side', 'sizeAttenuation', 'blending', 'depthTest', 'depthWrite', 'vertexColors', 'fog'
		],
		// THREE.SpriteMaterial
		[
			'color', 'opacity', 'map', 'blending', 'depthTest', 'depthWrite', 'uvOffset', 'uvScale', 'fog'
		],
		// THREE.LineBasicMaterial
		[
			'color', 'opacity', 'blending', 'depthTest', 'depthWrite', 'linewidth', 'linecap', 'linejoin', 'vertexColors', 'fog'
		],
		// THREE.Material
		PROPERTYSET.Material,

		// THREE.PerspectiveCamera
		[
			'fov', 'aspect', 'near', 'far'
		],
		// THREE.OrthographicCamera
		[
			'left', 'right', 'top', 'bottom', 'near', 'far'
		],
		// THREE.CubeCamera
		[
			'near', 'far', 'cubeResolution'
		],

		// THREE.CompressedTexture
		PROPERTYSET.Texture.concat([
			'image'
		]),
		// THREE.CubeTexture,
		PROPERTYSET.Texture.concat([
			'images'
		]),
		// THREE.Texture
		PROPERTYSET.Texture.concat([
			'image'
		]),

		// Image
		[ 'src' ],

		// THREE.MD2Character
		[
			'scale', 'animationFPS', 'root', 'meshBody', 'meshWeapon', 'weapons', 'activeAnimation'
		]

	];

	/**
	 * Protocol opcodes
	 */
	var OP = {
		EXTENDED: 		0xFF, 	// Extended opcode (Future use)
		DICT: 			0xFE, 	// Begin a DICT primitive (untyped js object)
		EXPORT: 		0xFC, 	// Tag the next primitive as a named export
		IMPORT: 		0xFD, 	// Refer to the primitive with the specified name
		UNDEFINED: 		0xF8, 	// An UNDEFINED primitive
		NULL: 			0xF9, 	// A NULL primitive
		FALSE: 			0xFA, 	// A boolean FALSE primitive
		TRUE: 			0xFB, 	// A boolean TRUE primitive
		PAD_ALIGN: 		0xF0, 	// Bit-alignment padding (used before typed arrays)
		STRING: 		0xE0, 	// A length-prefixed string (8-32 bit length)
		ARRAY_EMPTY: 	0xE3, 	// An empty array
		ARRAY_ANY: 		0xE8, 	// An array of primitives (8-32 bit length)
		REF_24: 		0xE7, 	// A reference to a local entity (24-bit lookup index)
		NUMBER_N: 		0xE8, 	// Continuous N number primitives
		ENTITY_4: 		0xC0, 	// Begin an entity (4-bit ID)
		ENTITY_12: 		0xD0, 	// Begin an entity (12-bit ID)
		NUMBER_1: 		0x98, 	// A single number of specified type
		ARRAY_ZERO: 	0xB8,	// A TypedArray only with zeros (faster than ARRAY_REP)
		ARRAY_NUM: 		0x80, 	// A TypedArray of numbers (8-32 bit length)
		ARRAY_REP: 		0xA0, 	// An array of repeated values (8-32 bit length)
		ARRAY_DWS: 		0x00, 	// A downscaled TypedArray of numbers (8-32 bit length)
		ARRAY_DIFF: 	0x40, 	// A Difference-Encoded TypedArray of numbers (8-32 bit length)
	}

	/**
	 * Numerical types in the binary protocol
	 */
	var NUMTYPE = {
		INT8 	: 0x00,		UINT8 	: 0x01,	// Integers 8-bit
		INT16 	: 0x02,		UINT16 	: 0x03, // Integers 16-bit
		INT32   : 0x04,		UINT32  : 0x05, // Integers 32-bit
		FLOAT32 : 0x06,		FLOAT64 : 0x07, // Float of 32 and 64 bit
	};

	/**
	 * LEN constants
	 */
	var LEN = {
		U8: 0,
		U16: 1,
		U32: 2
	};

	/**
	 * THREE Bundles Binary decoder
	 */
	var BinaryDecoder = function() {

		this.offset = 0;
		this.database = { };

		// Bundles pending to be loaded
		this.pendingBundleParsers = [ ];

	};

	/**
	 * Expose tables and opcodes
	 */
	BinaryDecoder.OP = OP;
	BinaryDecoder.REV = REV;
	BinaryDecoder.ENTITIES = ENTITIES;
	BinaryDecoder.PROPERTIES = PROPERTIES;
	BinaryDecoder.NUMTYPE = NUMTYPE;
	BinaryDecoder.LEN = LEN;

	/**
	 * Set an external database to use
	 */
	BinaryDecoder.prototype.setDatabase = function( database ) {
		this.database = database;
	}

	/**
	 * Load a binary stream
	 */
	BinaryDecoder.prototype.load = function( url, callback ) {

		// Request binary bundle
		var req = new XMLHttpRequest(),
			scope = this;

		// Place request
		req.open('GET', url);
		req.responseType = "arraybuffer";
		req.send();

		// Load bundle header and keep a callback
		// for the remainging loading operations
		var pendingBundle = {
			'callback': function() { },
			'status': 'loading',
			'meta': {},
		};

		// Keep this pending action
		this.pendingBundleParsers.push( pendingBundle );

		// Wait until the bundle is loaded
		req.onreadystatechange = function () {
			if (req.readyState !== 4) return;

			// The callback to trigger when we are ready to load
			pendingBundle['callback'] = (function(buffer, database) {

				var dataview = new DataView(buffer),
					offset = 0,	prevOp = 0, currOp = 0, dataEnd = 0,
					compactBuf = [], crossRef = [],
					viewUint8 = new Uint8Array(buffer),
					viewInt8 = new Int8Array(buffer),
					keyIndex = [ ], meta = { },
					tmpHi = 0, tmpLo = 0;

				// Check for compressed file
				if ((viewUint8[0] == 0x1f) && (viewUint8[1] == 0x8b)) {
					throw {
						'name' 		: 'ServerError',
						'message'	: 'It seems the server did not add Content-Encoding: gzip header and the bundle arrived compressed!',
						toString 	: function(){return this.name + ": " + this.message;}
					};
				}

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

				function getDiffEncodedArray( length, type, dt ) {

					// Allocate a data array and get first value according to type
					var data, is_float = false;
					switch (type) {
						case NUMTYPE.INT8:
							data = new Int8Array(length);
							data[0] = viewInt8[offset++];
							break;
						case NUMTYPE.UINT8:
							data = new Uint8Array(length);
							data[0] = viewUint8[offset++];
							break;
						case NUMTYPE.INT16:
							data = new Int16Array(length);
							data[0] = dataview.getInt16( (offset+=2)-2, true );
							break;
						case NUMTYPE.UINT16:
							data = new Uint16Array(length);
							data[0] = dataview.getUint16( (offset+=2)-2, true );
							break;
						case NUMTYPE.INT32:
							data = new Int32Array(length);
							data[0] = dataview.getInt32( (offset+=4)-4, true );
							break;
						case NUMTYPE.UINT32:
							data = new Uint32Array(length);
							data[0] = dataview.getUint32( (offset+=4)-4, true );
							break;
						case NUMTYPE.FLOAT32:
							data = new Float32Array(length);
							data[0] = dataview.getFloat32( (offset+=4)-4, true );
							is_float = true;
							break;
						case NUMTYPE.FLOAT64:
							data = new Float64Array(length);
							data[0] = dataview.getFloat64( (offset+=8)-8, true );
							is_float = true;
							break;
						default:
							throw {
								'name' 		: 'TypeError',
								'message'	: 'The specified numeric type (#' + type + ') at offset '+offset+' is not known',
								toString 	: function(){return this.name + ": " + this.message;}
							};
					}

					// Select input array
					var input;
					switch (dt) {
						case 0:
							if (type == NUMTYPE.FLOAT64) {
								input = new Float32Array( buffer, offset )
								offset += (length - 1) * 4;
							} else {
								input = viewInt8.slice(offset);
								offset += (length - 1);
							}
							break;
						case 1:
							input = new Int16Array( buffer, offset )
							offset += (length - 1) * 2;
							break;

						default:
							throw {
								'name' 		: 'TypeError',
								'message'	: 'The specified downscale type (#' + dt + ') at offset '+offset+' is not known',
								toString 	: function(){return this.name + ": " + this.message;}
							};
					}

					// Build array
					var lastValue = data[0], value = lastValue;
					for (var i=1; i<length; i++) {
						lastValue = data[i] = lastValue + (input[i-1] / (is_float ? meta['precision'] : 1.0));
					}

					// Return aray
					return data;

				}

				function getFilledArray( length, type, value ) {
					var result;
					// Construct array
					if (type == NUMTYPE.INT8) {
						result = new Int8Array( length );
					} else if (type == NUMTYPE.UINT8) {
						result = new Uint8Array( length );
					} else if (type == NUMTYPE.INT16) {
						result = new Int16Array( length );
					} else if (type == NUMTYPE.UINT16) {
						result = new Uint16Array( length );
					} else if (type == NUMTYPE.INT32) {
						result = new Int32Array( length );
					} else if (type == NUMTYPE.UINT32) {
						result = new Uint32Array( length );
					} else if (type == NUMTYPE.FLOAT32) {
						result = new Float32Array( length );
					} else if (type == NUMTYPE.FLOAT64) {
						result = new Float64Array( length );
					}
					// Default to 0, otherwise fill
					if (value !== undefined)
						result.fill( value );
					// Return result
					return result;
				}

				function getNumberArray( length, type, encoded_as ) {
					var ofs = offset;
					if ((type == encoded_as) || (encoded_as === undefined)) {

						// Case were we don't need type conversion
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

					} else {

						// Case were we DO need type conversion
						var input;
						if (encoded_as == NUMTYPE.INT8) {
							offset += length;
							input = new Int8Array( buffer, ofs, length );
						} else if (encoded_as == NUMTYPE.UINT8) {
							offset += length;
							input = new Uint8Array( buffer, ofs, length );
						} else if (encoded_as == NUMTYPE.INT16) {
							offset += length * 2;
							input = new Int16Array( buffer, ofs, length );
						} else if (encoded_as == NUMTYPE.UINT16) {
							offset += length * 2;
							input = new Uint16Array( buffer, ofs, length );
						} else if (encoded_as == NUMTYPE.INT32) {
							offset += length * 4;
							input = new Int32Array( buffer, ofs, length );
						} else if (encoded_as == NUMTYPE.UINT32) {
							offset += length * 4;
							input = new Uint32Array( buffer, ofs, length );
						} else if (encoded_as == NUMTYPE.FLOAT32) {
							offset += length * 4;
							input = new Float32Array( buffer, ofs, length );
						} else if (encoded_as == NUMTYPE.FLOAT64) {
							offset += length * 8;
							input = new Float64Array( buffer, ofs, length );
						}
						// Create output
						var output;
						if (type == NUMTYPE.INT8) {
							output = new Int8Array( length );
						} else if (type == NUMTYPE.UINT8) {
							output = new Uint8Array( length );
						} else if (type == NUMTYPE.INT16) {
							output = new Int16Array( length );
						} else if (type == NUMTYPE.UINT16) {
							output = new Uint16Array( length );
						} else if (type == NUMTYPE.INT32) {
							output = new Int32Array( length );
						} else if (type == NUMTYPE.UINT32) {
							output = new Uint32Array( length );
						} else if (type == NUMTYPE.FLOAT32) {
							output = new Float32Array( length );
						} else if (type == NUMTYPE.FLOAT64) {
							output = new Float64Array( length );
						}
						// Convert
						for (var i=0;i<length;i++) output[i] = input[i];
					}

				}

				function getEntity( eid ) {
					// Try to instantiate entity
					if (eid >= ENTITIES.length)
						throw {
							'name' 		: 'EntityError',
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

				function applyDT( type, dt ) {
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

				function getLen( len ) {
					if (len == LEN.U8) {
						return viewUint8[offset++];
					} else if (len == LEN.U16) {
						return dataview.getUint16( (offset+=2)-2, true );
					} else if (len == LEN.U32) {
						return dataview.getUint32( (offset+=4)-4, true );
					}
				}

				function getPrimitive( valid_opcodes ) {

					// If we have a compacted buffer, drain it
					if (compactBuf.length > 0) 
						return compactBuf.shift();

					console.log("Prim at",offset);

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
						//  Single-byte options
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

						case OP.ARRAY_EMPTY:
							result = [ ];
							break;

						case OP.DICT:
							result = getDict( viewUint8[offset++] );
							break;

						case OP.REF_24:
							tmpHi = viewUint8[offset++] << 16;
							tmpLo = dataview.getUint16( (offset+=2)-2, true )
							result = crossRef[ tmpHi | tmpLo ];
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

							var b10 = (op & 0x03), 		// Bits 1:0
								b20 = (op & 0x07),		// Bits 2:0
								b30 = (op & 0x0F), 		// Bits 3:0
								b43 = (op & 0x18) >> 3, // Bits 4:3
								 b5 = (op & 0x20) >> 4, // Bit  5
								len = 0;

							if ((op & 0xFC) == 0xE0) { /* STRING */
								result = getString( getLen( b10 ) );
								break;

							} else if ((op & 0xFC) == 0xE8) { /* ARRAY_PRIM */
								result = getArray( getLen( b10 ) );
								break;

							} else if ((op & 0xF8) == 0xE8) { /* NUMBER_N */
								// Get length
								len = viewUint8[offset++];
								// Populate compact num buffer
								compactBuf = [];
								for (var i=0; i<len; i++)
									compactBuf.push( getNum( b20 ) );
								// Pop firt
								result = compactBuf.shift();
								break;

							} else if ((op & 0xF0) == 0xC0) { /* ENTITY_4 */
								result = getEntity( b30 );
								break;

							} else if ((op & 0xF0) == 0xD0) { /* ENTITY_12 */
								result = getEntity( (b30 << 8) | viewUint8[offset++] );
								break;

							} else if ((op & 0xF8) == 0x98) { /* NUMBER_1 (Priority over ARRAY_NUM) */
								result = getNum( b20 );
								break;

							} else if ((op & 0xE0) == 0x80) { /* ARRAY_NUM */
								result = getNumberArray( getLen( b43 ), b30 );
								break;

							} else if ((op & 0xE0) == 0xA0) { /* ARRAY_REP */
								len = getLen( b43 );
								result = getFilledArray( len, b30, getNum(b30) );
								break;

							} else if ((op & 0xC0) == 0x00) { /* ARRAY_DWS */
								result = getNumberArray( getLen( b43 ), b30, applyDT( b30, b5) );
								break;

							} else if ((op & 0xC0) == 0x40) { /* ARRAY_DIFF */
								result = getDiffEncodedArray( getLen(b43), b30, b5 );
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

				// Get Primitive-0 that contains the bundle metadata and
				// also keep them in the pending bundle stack
				meta = pendingBundle.meta = getPrimitive();
				if (meta['name'] == undefined) {
					console.error("This doesn't look like a valid 3BD archive");
					return;
				}

				// Return a post-processing function that will load
				// the remaining entities
				return function() {

					// Started loading
					console.time( 'BinaryBundle' );

					// Read all primitives from file
					while (offset < dataEnd) 
						getPrimitive();

					// Finished loading
					console.timeEnd( 'BinaryBundle' );


				};


			})( req.response, scope.database );

			// Trigger callback
			if (callback) callback();

		}
	}

	/**
	 * Parse all loaded bundles
	 */
	BinaryDecoder.prototype.parse = function( callback ) {

		// TODO: Solve dependencies first

		// Parse modules in loading order
		for (var i=0; i<this.pendingBundleParsers.length; i++) {
			this.pendingBundleParsers[i].callback();
		}

		// Release all pending functions that contain
		// their own buffer stack.
		this.pendingBundleParsers = [];

		// Fire callback
		if (callback) callback( this.database );


	}


	/**
	 * Return binary encoder
	 */
	return BinaryDecoder;

});