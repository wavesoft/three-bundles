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

Before accessing the resources of a bundle you need first to load it. In order to load a bundle's entry point, including all the resources you should use the `bundle!path/to/bundle` plugin:

```javascript
    ...
    require(["bundle!/path/to/bundle"], function(bundle) {
        scene.add( bundle.someBundleSceneObject );
    });
    ...
```

Upon loading a bundle, it's resources can be accessed in absolute or relative path format:

 * From within the bundle: `texture!./file.jpg`
 * From another bundle: `texture!bundle.name/file.jpg`

## Reference

### Bundle Layout

Each bundle is just a folder with multiple sub-folders, one for each kind of resource. Additionaly, it nas an __entry point__ and __index__ file.

For example:

```
my.bundle
 |
 +- texture
 |   |
 |   +- tex_diffuse.jpg
 |   `- tex_normal.jpg
 +- object
 |   |
 |   `- my_object.obj
 +- main.js
 `- index.js
```

The `index.js` file enumerates all the resources in the bundle and is automatically generated using the [tools/update-index.py](https://github.com/wavesoft/three-bundles/blob/master/tools/update-index.py) script.

The `main.js` is the entry point of the bundle, which is used to deliver the core logic of the bundle. I no such logic is required, an empty placeholder can be used instead.

Upon loading a bundle, all the resources defined in the `index.js` file will be downloaded. Then, the entry point will be downloaded and returned.

### Available Plugins

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
            <code><a target="_blank" href="http://threejs.org/docs/#Reference/Core/Geometry">THREE.Geometry</a></code>,
            <code><a target="_blank" href="http://threejs.org/docs/#Reference/Core/BufferGeometry">THREE.BufferGeometry</a></code>
        </td>
    </tr>
    <tr>
        <td>material!</td>
        <td>.json</td>
        <td><code><a target="_blank" href="http://threejs.org/docs/#Reference/Materials/Material">THREE.Material</a></code></td>
    </tr>
    <tr>
        <td rowspan="3">mesh!</td>
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

### Dynamic Referencing

It is also possible to depend on other resources without explicitly requesting them through a `request` method. For example, a material can depend on one or more textures, just by putting the texture name in the appropriate `map` property. For example:

```javascript
{
    "type"  : "MeshBasicMaterial",
    "color" : 0xffffff,
    "map"   : "texture!./noise-map.png"
}
```

Specific properties of different kinds of resources will trigger this behaviour. The following table enumerates all of them:

<table>
    <tr>
        <th>Resource</th>
        <th>Properties</th>
    </tr>
    <tr>
        <td>material (<tt>.json</tt>)</td>
        <td>
            <code>map</code>,
            <code>alphaMap</code>,
            <code>bumpMap</code>,
            <code>normalMap</code>,
            <code>displacementMap</code>,
            <code>specularMap</code>,
            <code>envMap</code>,
            <code>lightMap</code>,
            <code>aoMap</code>,
            <code>vertexShader</code>,
            <code>fragmentShader</code>
        </td>
    </tr>
    <tr>
        <td>mesh (<tt>.json</tt>)</td>
        <td>
            <code>geometry</code>,
            <code>material</code>
        </td>
    </tr>
    <tr>
        <td>mesh (<tt>.obj</tt>)</td>
        <td>
            Each material <code>name</code> is assumed to be a reference to a material (without the <em>material!</em> prefix)
        </td>
    </tr>
</table>

