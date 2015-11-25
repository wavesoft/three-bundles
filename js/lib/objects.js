"use strict";
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
define(["three", "three-bundles/extras/helpers/MD2Character"], function(THREE) {

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

		// THREE.MD2Character
		[
			'scale', 'animationFPS', 'root', 'meshBody', 'meshWeapon', 'weapons', 'activeAnimation'
		]

	];

	/**
	 * Return entities and properties
	 */
	return {
		'ID' 		: 0x0004,
		'ENTITIES' 	: ENTITIES,
		'PROPERTIES': PROPERTIES,
	};

});
