/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*jslint nomen: true*/
/*global describe, it, expect, browser, protractor, $, $$, element, by*/

describe('Nexthink Plugin - Extension', function () {
    "use strict";

    browser.ignoreSynchronization = true;

    it('should have Extension installed', function () {
        var pluginElements;
        browser.get('chrome://extensions/');

        element(by.id('toggle-dev-on')).click();
        pluginElements = $$('.extension-details');
        pluginElements.getText().then(function (text) {
            var i, j, plugin;
            for (i = 0; i < text.length; i += 1) {
                plugin = text[i].split("\n");
                if (plugin[0].indexOf("Nexthink Plugin") === 0) {
                    for (j = 0; j < plugin.length; j += 1) {
                        if (plugin[j].indexOf("ID:") === 0) {
                            browser.params.extensionID = plugin[j].split(" ")[1];
                        }
                    }
                }
            }

            expect(browser.params.extensionID).not.toEqual("");
        });
    });

});
