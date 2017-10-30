/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*jslint nomen: true*/
/*global describe, it, expect, browser, protractor, $, $$, element, by*/

describe('Nexthink Plugin - Extension', function () {
    "use strict";

    var EC, baseURL;
    EC = protractor.ExpectedConditions;
    baseURL = browser.params.pluginURL + browser.params.extensionID + "/";


    browser.ignoreSynchronization = true;

    it('should connect to Engine', function () {
        baseURL = browser.params.pluginURL + browser.params.extensionID + "/";
        browser.get(baseURL + 'options.html');

        element(by.id('engineHostname')).sendKeys(browser.params.engine);
        element(by.id('username')).sendKeys(browser.params.login);
        element(by.id('password')).sendKeys(browser.params.password);
        element(by.id('signIn')).click();

        var condition = EC.textToBePresentInElement($('#loginMessage'), 'Connected');
        browser.wait(condition, 10000);
    });
});
