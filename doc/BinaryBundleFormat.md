
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

## Entities

The following entities are currently supported in the current format:

## Opcodes

The following table contains all the opcodes used in the file format.

<img src="//raw.githubusercontent.com/wavesoft/three-bundles/master/doc/opcodes.jpg" />
