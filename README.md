# THREE Bundles

<img src="https://github.com/wavesoft/three-bundles/raw/master/doc/icon.png" style="float: left;" alt="THREE Bundles" />

THREE Bundles is a set of Require.js plugins that help you bundle and ship THREE.js resources.

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

You should then load the `three-bundles` package later in your project in order to activate the bundles functionality.

## Usage

THREE Bundles provide the following plug-ins, that you can use to load THREE.js objects:

<table>
    <tr>
        <th>Plugin Name</th>
        <th>Extension</th>
        <th>THREE.js Object</th>
    <tr/>
    <tr>
        <td>texture!</td>
        <td>.jpg, .gif, .png, .bmp</td>
        <td><code>THREE.Texture</code></td>
    </tr>
    <tr>
        <td>material!</td>
        <td>.json</td>
        <td><code>THREE.Material</code></td>
    </tr>
    <tr>
        <td>geometry!</td>
        <td>.json</td>
        <td><code>THREE.BufferGeometry</code></td>
    </tr>
    <tr>
        <td rowspan="2">mesh!</td>
        <td>.json</td>
        <td><code>THREE.Mesh</code></td>
    </tr>
    <tr>
        <td>.obj</td>
        <td><code>THREE.Mesh</code></td>
    </tr>
</table>
