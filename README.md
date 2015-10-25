# THREE Bundles
![THREE Bundles Logo](https://github.com/wavesoft/three-bundles/raw/master/doc/icon.png "THREE Bundles")

THREE Bundles is a set of Require.js plugins that help you bundle and ship THREE.js resources.

## Installing 

You can include THREE Bundles to your project as Require.js package:

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
