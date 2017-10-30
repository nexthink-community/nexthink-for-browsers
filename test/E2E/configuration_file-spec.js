/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*jslint nomen: true*/
/*global describe, it, expect, browser, protractor, $, $$, element, by*/

describe('Nexthink Plugin - Extension', function () {
    "use strict";

    var EC, baseURL, configPath, configData;
    EC = protractor.ExpectedConditions;
    baseURL = browser.params.pluginURL + browser.params.extensionID + "/";
    configPath = __dirname + "\\data\\testConfig.json";
    configData = require(configPath);

    browser.ignoreSynchronization = true;

    it('should load configuration file', function () {
        var condition, configFileMessage;
        configData = require(configPath);
        baseURL = browser.params.pluginURL + browser.params.extensionID + "/";

        browser.get(baseURL + 'options.html');

        condition = EC.visibilityOf($('#loadConfigFile'));
        browser.wait(condition, 5000);

        element(by.id('localConfigFile')).sendKeys(configPath);

        condition = EC.visibilityOf($('#configFileMessage'));
        browser.wait(condition, 10000);
        configFileMessage = element(by.id('configFileMessage'));
        expect(element(by.id('scoreFileMessage')).getText()).toEqual('Score file loaded');
        expect(configFileMessage.getText()).toEqual('Config file loaded');
    });

    it('option should load engine configuration correctly', function () {
        browser.refresh();
        expect(element(by.id('engineHostname')).getAttribute('value')).toEqual(configData.engineHostname);
        expect(element(by.id('username')).getAttribute('value')).toEqual(configData.username);
    });

    it('option should load finder configuration correctly', function () {
        browser.refresh();
        if (configData.finderPort === "443") {
            expect(element(by.id('finderHostname')).getAttribute('value')).toEqual(configData.finderHost);
        } else {
            expect(element(by.id('finderHostname')).getAttribute('value')).toEqual(configData.finderHost + ":" + configData.finderPort);
        }
    });

    it('option should load score configuration correctly', function () {
        browser.refresh();

        var grid = $$('#deviceScoreList tbody tr');
        grid.getText().then(function (text) {
            var deviceScoreList, i;
            deviceScoreList = [];
            for (i = 0; i < text.length; i += 1) {
                if (text[i] !== "") { deviceScoreList.push(text[i]); }
            }
            expect(deviceScoreList).toEqual(Object.keys(configData.scoreTreeList));
        });
    });

    it('option should load device option configuration correctly', function () {
        browser.refresh();
        var condition, deviceOptionNumber, lastOption, grid;

        deviceOptionNumber = configData.deviceOptions.length;
        lastOption = configData.deviceOptions[deviceOptionNumber - 1].replace(/_/gi, " ");
        lastOption = lastOption.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
        condition = EC.textToBePresentInElement($('#deviceInfoList'), lastOption);
        browser.wait(condition, 5000);
        grid = $$('#deviceInfoList tbody tr');
        grid.getText().then(function (text) {
            var deviceOptionsList, i;
            deviceOptionsList = [];
            for (i = 0; i < text.length; i += 1) {
                if (text[i] !== "") { deviceOptionsList.push(text[i].toLowerCase().replace(new RegExp(/ /, 'g'), '_')); }
            }
            expect(deviceOptionsList).toEqual(configData.deviceOptions);
        });
    });

});
