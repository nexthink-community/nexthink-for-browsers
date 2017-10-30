/*jslint node:true*/
/*global browser, chrome*/
"use strict";

function BrowserAdapter(actualBrowser) {
    var output;

    if (actualBrowser === "Firefox") {
        output = browser;
    } else if (actualBrowser === "Chrome") {
        output = chrome;
    } else {
        output = null;
    }

    return output;
}

function checkBrowser() {
    try {
        browser.extension.getURL('background/background.js');
        return "Firefox";
    } catch (e) {
        chrome.extension.getURL('background/background.js');
        return "Chrome";
    }
}
