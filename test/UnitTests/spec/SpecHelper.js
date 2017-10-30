var jsdom = require("jsdom");
var { JSDOM } = jsdom;
var { window } = new JSDOM(`<!DOCTYPE html>`);

global.window = window;
global.document = window.document;
