/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*jslint nomen: true*/
/*global describe, it, expect, browser, protractor, $, $$, element, by*/

describe('Nexthink Plugin - Extension', function () {
    "use strict";

    var EC = protractor.ExpectedConditions;
    browser.ignoreSynchronization = true;

    it('should have Extension installed', function () {
        browser.get('about:debugging');
        var data, condition;
        data = $('li[data-addon-id="nexthink@nexthink.com"] dl.addon-target-info dd.addon-target-info-content.internal-uuid span:first-child');

        condition = EC.presenceOf(data);
        browser.wait(condition, 5000);
        data.getText().then(function (text) {
            browser.params.extensionID = text;
            browser.wait(EC.presenceOf(data), 5000);
        });
    });

});
