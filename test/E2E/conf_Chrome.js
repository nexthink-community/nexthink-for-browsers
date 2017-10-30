/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*global describe, it, expect, browser*/

var helper = require('./helper.js');

exports.config = {
    params: {
        extensionID: "",
        pluginURL: "chrome-extension://",
        engine: "192.168.5.5:1671",
        login: "admin",
        password: "admin",
        frame: false,
        testURL: "http://localhost/test/"
    },
    onPrepare: function () {
        "use strict";
        browser.driver.manage().window().setSize(1280, 960);
    },
    jasmineNodeOpts: {
        realtimeFailure: true
    },
    seleniumAddress: 'http://localhost:4444/wd/hub',
    specs: ['getChromeID.js', 'connection.js', 'options.js', 'configuration_file-spec.js', 'popup.js'],
    getMultiCapabilities: helper.getChromeCapabilities
};
