
// Fake 'self', 'document' and 'window'
var MockBrowser = require('mock-browser').mocks.MockBrowser;
var mock = new MockBrowser();

// Expose globals
global.document = mock.getDocument(),
global.self = MockBrowser.createWindow(),
global.window = self;

// Fake 'XMLHttpRequest' (shall not be used)
global.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

console.log("INFO:".green, "Creating fake DOM environment");
