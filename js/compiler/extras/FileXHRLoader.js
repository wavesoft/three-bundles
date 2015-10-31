/**
 * @author Ioannis Charalampidis / https://github.com/wavesoft
 */
define(["three", "fs"], function(THREE, fs) {

    console.info("Replacing THREE.XHRLoader with local-file loader");

    THREE.XHRLoader = function ( manager ) {

        this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
        this.responseType == "default";

    };

    THREE.XHRLoader.prototype = {

        constructor: THREE.XHRLoader,

        load: function ( url, onLoad, onProgress, onError ) {

            function toArrayBuffer(buffer) {
                var ab = new ArrayBuffer(buffer.length);
                var view = new Uint8Array(ab);
                for (var i = 0; i < buffer.length; ++i) {
                    view[i] = buffer[i];
                }
                return ab;
            }

            var scope = this;

            fs.readFile(url, { }, function (err, data ) {
                if (err) {
                    console.error(err);
                    onError( err );
                } else {
                    if (scope.responseType == "arraybuffer") {
                        var barr = toArrayBuffer(data);
                        onLoad( barr );
                    } else {
                        onLoad( data.toString() );
                    }
                    scope.manager.itemEnd( url );
                }
            });

            scope.manager.itemStart( url );

        },

        setResponseType: function ( value ) {

            this.responseType = value;

        },

        setCrossOrigin: function ( value ) {
        },

        setWithCredentials: function ( value ) {
        }

    };

});