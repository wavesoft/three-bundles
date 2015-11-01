
# Binary Bundle Format

The binary bundle is a compacted representation of javascript objects, further optimised for minimising the space THREE.js objects occupy. In addition, it offers a symbol import/export functionality for sharing resources among different bundles.

The data in a `.3BD` file are organised in _Primitives_, each one being one of the following:

* `undefined`
* `null`
* Boolean
* Number
* String
* Array
* TypedArray
* Plain Object
* THREE.js Object (called _Entity_)

The object primitives are composites. Internally the use array primitives to represent the series of property names and the property values. 

## Optimisations

There are a series of optimisations used in this file format. The goal is to have the smallest file size possible that will not impact the parsing speed. This means avoiding `for` loops, using TypedArrays when possible and de-duplicating entries in the file. In addition, to further reduce the file size, the type of the TypedArray is chosen dynamically by analysing the values of the array.

### De-duplication

De-duplication works in multiple levels:

* __Similar Entities__ are de-duplicated by adding a reference opcode to the previous entity.
* __Object Keys__ are de-duplicated using a lookup table.

### Compression

Currently there are two compression algorithms (in addition to the de-duplication mentioned before):

* __Up to 16 consecutive numbers__ of similar type are compacted to a single opcode, reducing the overhead of the extra opcode before every number. This can reduce up to 7% the file size.
* __Difference encoding__ in series of numbers can also be activated if you are more interested in the file size than the loading performance. This algorithm will try to downgrade 16-bit and 32-bit arrays to 8-bit and 16-bit arrays that hold the difference between sequential numbers. This can also work on Float32 and Float64 arrays, by discarding some precision and converting them to quantised 16-bit or even 8-bit arrays. The precision number is configurable.

However the file format itself is quite sparse and easily compressible. Therefore, when the compilation process is finished, the file is further compressed with `gzip` encoding, since all modern browsers can decompress such format in the transport level.

### Image Embedding

In order to further optimise the user experience, we wanted a predictable loading time for the images. While it's true that we can benefit from parallel browser request to different images, it's not always easy to know when they are ready or when an error occurred.

Therefore we decided to include the image payloads in the bundle. __Be aware__ that every image included in the bundle increases the loading time since they need to be base64-encoded to a data URI at loading time.

However the above case can be easily solved using compressed textures. Such textures are encoded natively to the file format and benefit from the optimisations and compression. For instance, in one of our tests, 12 DDS textures totalling 2.7 Mb were compressed into a bundle of 1.7Mb.

## Opcodes

The following table contains all the opcodes used in the file format.

<img src="https://raw.githubusercontent.com/wavesoft/three-bundles/master/doc/opcodes.jpg" />

### Numerical Types

The following numerical types are supported:

| NUMTYPE | Type      |
|---------|-----------|
| 0       | INT8      |
| 1       | UINT8     |
| 2       | INT16     |
| 3       | UINT16    |
| 4       | INT32     |
| 5       | UINT32    |
| 6       | FLOAT32   |
| 7       | FLOAT64   |

### Entities

The entities are pre-defined THREE.js objects, represented with an entity ID (EID), and with known properties. Therefore they are encoded with their EID + A primitive array with the values of each property.

The following table contains all the encoded properties up to this version:

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

