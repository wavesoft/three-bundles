
// Setup environment
var colors = require("colors"), hideWarn = false;
console.warn = function() { if (hideWarn) return; console.log.apply(console, ["WARN:".yellow].concat(Array.prototype.slice.call(arguments)) ); };
console.error = function() { console.log.apply(console, ["ERROR:".red].concat(Array.prototype.slice.call(arguments)) ); };

// Prepare fake DOM environment
require('./js/expose-dom.js');
require('./js/expose-three.js');
