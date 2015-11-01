
# Binary Bundle Format

The binary bundle is a compacted representation of javascript objects, specially optimised for minimising the space THREE.js objects occupy. In addition, it offers a symbol import/export functionality for sharing resources among different bundles.

The data int he file are organised in primitives, each one being one of the following:

* `undefined`
* `null`
* Boolean
* Number
* String
* Array
* TypedArray
* Plain Object
* THREE.js Object (called _Entity_)

In oder to optimise for performance, we are using length-prefixed notation when needed, and to optimise for size, the compiler de-duplicates similar entities.

## Entities

The following entities are currently supported by the file format:

| EID | Object Type                   |
|-----|-------------------------------|
| 0   | THREE.Vector2                 |
| 1   | THREE.Vector3                 |
| 2   | THREE.Face3                   |
| 3   | THREE.Color                   |
| 4   | THREE.Quaternion              |
| 5   | THREE.Euler                   |
| 6   | THREE.Matrix3                 |
| 7   | THREE.Matrix4                 |
| 8   | THREE.Geometry                |
| 9   | THREE.BufferGeometry          |
| 10  | THREE.BufferAttribute         |
| 11  | THREE.AnimationClip           |
| 12  | THREE.VectorKeyframeTrack     |
| 13  | THREE.QuaternionKeyframeTrack |
| 14  | THREE.NumberKeyframeTrack     |
| 15  | THREE.BooleanKeyframeTrack    |
| 16  | THREE.StringKeyframeTrack     |
| 17  | THREE.Sphere                  |
| 18  | THREE.Mesh                    |
| 19  | THREE.Object3D                |
| 20  | THREE.MeshBasicMaterial       |
| 21  | THREE.MeshPhongMaterial       |
| 22  | THREE.MeshLambertMaterial     |
| 23  | THREE.Material                |
| 24  | THREE.CompressedTexture       |
| 25  | THREE.Texture                 |
| 26  | ImageElement (DOM Element)    |

## Opcodes

The following table contains all the opcodes used in the file format.

<img src="https://raw.githubusercontent.com/wavesoft/three-bundles/master/doc/opcodes.jpg" />
