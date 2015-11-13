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
define(["three", "fs", "colors"], function(THREE, fs, colors) {

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
            console.info("Loading".gray,url.gray);

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