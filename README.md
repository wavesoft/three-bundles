# THREE Bundles

<img src="https://github.com/wavesoft/three-bundles/raw/master/doc/icon.png" align="left" alt="THREE Bundles" />

THREE Bundles is a [Require.js](http://requirejs.org/) package that provides dynamic content loading for various [THREE.js](http://threejs.org/) resources. It offers a simple mechanism for addressing and loading them through Require.js as native dependencies.

In addition it suggests a way of organizing your resources in reusable `bundles` that can be quickly and optimally loaded in your scene.

## Requirements

 * __Require.js__
 * __THREE.js__ (aliased `three` in require.js)
 * __text.js__ (from https://github.com/requirejs/text)

## Installing 

You can include THREE Bundles to your Require.js project with the following configuration:

```javascript
require.config({

    /**
     * (1) Add three-bundles as a package
     */
    packages: [
        {
            'name'      : 'three-bundles',
            'location'  : 'path/to/your/three-bundles/js'
        }
    ],

    /**
     * (2) Configure three-bundles
     */
    threeBundles: {
        /**
         * Specify the base Url (relative to requireJS' `baseUrl`),
         * that threeBundles will use for loading the bundles.
         *
         * If missing, it will default to requireJS' `baseUrl`
         */
        'baseUrl': '../bundles'
    },

    /**
     * (3) (Optionally) Make sure THREE.js is accessible under the name 'three'
     */
    paths: {
        'three': 'path/to/three.js'
    }

})
```

__IMPORTANT__: You must load the `three-bundles` package later in your project in order to activate the bundles functionality.

## Usage

THREE Bundles provide a set of Require.js plug-ins for loading various THREE.js resources. You only need to add the dependency, and the appropriate object will be created for you.

```javascript
define(["mesh!path/to/mesh.json"], function(mesh) {
    ...
    // Add the mesh to your scene
    scene.add( mesh );
    ...
});
```

For more details check to the the `Reference` section below.

## Reference

According to the plugin and the filename extension, a different THREE.js object is created. The following table summarises the available modules:

<table>
    <tr>
        <th>Plugin Name</th>
        <th>Extension</th>
        <th>THREE.js Object</th>
    <tr/>
    <tr>
        <td>geometry!</td>
        <td>.json</td>
        <td>
            <code><a target="_blank" href="http://threejs.org/docs/#Reference/Core/Geometry">THREE.Geometry</a></code>
            <code><a target="_blank" href="http://threejs.org/docs/#Reference/Core/BufferGeometry">THREE.BufferGeometry</a></code>
        </td>
    </tr>
    <tr>
        <td>material!</td>
        <td>.json</td>
        <td><code><a target="_blank" href="http://threejs.org/docs/#Reference/Materials/Material">THREE.Material</a></code></td>
    </tr>
    <tr>
        <td rowspan="2">mesh!</td>
        <td>.json</td>
        <td><code><a target="_blank" href="http://threejs.org/docs/#Reference/Objects/Mesh">THREE.Mesh</a></code></td>
    </tr>
    <tr>
        <td>.obj</td>
        <td><code><a target="_blank" href="http://threejs.org/docs/#Reference/Objects/Mesh">THREE.Mesh</a></code></td>
    </tr>
    <tr>
        <td>.dae</td>
        <td><code><a target="_blank" href="http://threejs.org/docs/#Reference/Objects/Mesh">THREE.Mesh</a></code></td>
    </tr>
    <tr>
        <td>object!</td>
        <td>.json</td>
        <td><code><a target="_blank" href="http://threejs.org/docs/#Reference/Core/Object3D">THREE.Object3D</a></code></td>
    </tr>
    <tr>
        <td>shader!</td>
        <td>.shader, .txt</td>
        <td><code>string</code></td>
    </tr>
    <tr>
        <td rowspan="2">texture!</td>
        <td>.jpg, .gif, .png, .bmp</td>
        <td><code><a target="_blank" href="http://threejs.org/docs/#Reference/Textures/Texture">THREE.Texture</a></code></td>
    </tr>
    <tr>
        <td>.dds</td>
        <td><code><a target="_blank" href="http://threejs.org/docs/#Reference/Textures/CompressedTexture">THREE.CompressedTexture</a></code></td>
    </tr>
</table>
