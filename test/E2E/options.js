/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*jslint nomen: true*/
/*global describe, it, expect, browser, protractor, $, $$, element, by*/

describe('Nexthink Plugin - Extension', function () {
    "use strict";

    var EC, baseURL, configPath, configData, testDirectory, scoreTreeListKeys;
    EC = protractor.ExpectedConditions;

    baseURL = browser.params.pluginURL + browser.params.extensionID + "/";
    configPath = __dirname + "\\data\\testConfig.json";
    configData = require(configPath);
    testDirectory = __dirname.replace("\\.protractor_test", "") + "\\test";
    testDirectory = testDirectory.replace(/\\/g, "/");
    scoreTreeListKeys = Object.keys(configData.scoreTreeList);

    browser.ignoreSynchronization = true;

    it('option should have three empty property rows', function () {
        browser.refresh();

        var grid = $$('#deviceInfoList tbody tr');
        grid.getText().then(function (text) { expect(text).toEqual(["", "", ""]); });
    });

    it('option should remove all scores', function () {
        browser.refresh();

        var grid = $$('#deviceScoreList tbody tr');
        grid.getText().then(function (text) { expect(text).toEqual(["", "", ""]); });
    });

    it('option should create configuration file', function () {
        baseURL = browser.params.pluginURL + browser.params.extensionID + "/";
        browser.get(baseURL + 'options.html');

        browser.refresh();

        var condition = EC.visibilityOf($('#createConfigFile'));
        browser.wait(condition, 5000);

        element(by.id('createConfigFile')).click();
        condition = EC.visibilityOf($('#configFileMessage'));
        browser.wait(condition, 5000);

        expect($('#configFileMessage').getText()).toEqual("Config file created");
    });

    it('option should add device properties correctly', function () {
        browser.refresh();

        var condition = EC.visibilityOf($('#addDeviceInfo'));
        browser.wait(condition, 5000);

        element(by.id('deviceInfo')).sendKeys("name");
        element(by.id('addDeviceInfo')).click();

        condition = EC.textToBePresentInElement($('#deviceInfoList tbody'), "Name");
        browser.wait(condition, 10000);
    });

    it('option should remove device properties correctly', function () {
        browser.refresh();

        var condition = EC.visibilityOf($('#addDeviceInfo'));
        browser.wait(condition, 5000);

        $('#deviceInfoList td[value="name"]').click();
        $('#deleteProperty').click();

        condition = EC.stalenessOf($('#deviceInfoList td[value="name"]'));
        browser.wait(condition, 10000);
    });

    it('option should add multiple device properties correctly', function () {
        browser.refresh();
        var condition, i, lastOption, grid;
        condition = EC.visibilityOf($('#addDeviceInfo'));
        browser.wait(condition, 5000);

        for (i = 0; i < configData.deviceOptions.length; i += 1) {
            element(by.id('deviceInfo')).sendKeys(configData.deviceOptions[i]);
            element(by.id('addDeviceInfo')).click();
            condition = EC.visibilityOf($('#deviceInfoList td[value="' + configData.deviceOptions[i] + '"]'));
            browser.wait(condition, 10000);
        }

        lastOption = configData.deviceOptions[configData.deviceOptions.length - 1].replace(/_/gi, " ");
        lastOption = lastOption.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
        condition = EC.textToBePresentInElement($('#deviceInfoList'), lastOption);
        browser.wait(condition, 5000);
        grid = $$('#deviceInfoList tbody tr');
        grid.getText().then(function (text) {
            var deviceOptionsList, j;
            deviceOptionsList = [];
            for (j = 0; j < text.length; j += 1) {
                if (text[j] !== "") { deviceOptionsList.push(text[j].toLowerCase().replace(new RegExp(/ /, 'g'), '_')); }
            }
            expect(deviceOptionsList).toEqual(configData.deviceOptions);
        });
    });

    it('option should move device property up correctly', function () {
        browser.refresh();
        var condition, deviceProperty, grid;

        condition = EC.visibilityOf($('#upProperty'));
        browser.wait(condition, 5000);

        deviceProperty = configData.deviceOptions[configData.deviceOptions.length - 1];

        $('#deviceInfoList td[value="' + deviceProperty + '"]').click();
        $('#upProperty').click();
        browser.refresh();

        grid = $$('#deviceInfoList tbody tr');
        grid.getText().then(function (text) {
            var deviceOptionsList, i, expectedDeviceOptions;
            expectedDeviceOptions = configData.deviceOptions;
            deviceOptionsList = [];
            for (i = 0; i < text.length; i += 1) {
                if (text[i] !== "") { deviceOptionsList.push(text[i].toLowerCase().replace(new RegExp(/ /, 'g'), '_')); }
            }
            expectedDeviceOptions.push(expectedDeviceOptions[expectedDeviceOptions.length - 2]);
            expectedDeviceOptions.splice(expectedDeviceOptions.length - 3, 1);
            expect(deviceOptionsList).toEqual(expectedDeviceOptions);
        });
    });

    it('option should move device property down correctly', function () {
        browser.refresh();
        var condition, deviceProperty, grid;
        condition = EC.visibilityOf($('#downProperty'));
        browser.wait(condition, 5000);

        deviceProperty = configData.deviceOptions[0];

        $('#deviceInfoList td[value="' + deviceProperty + '"]').click();
        $('#downProperty').click();
        browser.refresh();

        grid = $$('#deviceInfoList tbody tr');
        grid.getText().then(function (text) {
            var deviceOptionsList, i, expectedDeviceOptions;
            expectedDeviceOptions = configData.deviceOptions;
            deviceOptionsList = [];
            for (i = 0; i < text.length; i += 1) {
                if (text[i] !== "") { deviceOptionsList.push(text[i].toLowerCase().replace(new RegExp(/ /, 'g'), '_')); }
            }
            expectedDeviceOptions.splice(2, 0, expectedDeviceOptions[0]);
            expectedDeviceOptions.splice(0, 1);
            expect(deviceOptionsList).toEqual(expectedDeviceOptions);
        });
    });

    it('option should set device properties order correctly', function () {
        configData.deviceOptions.splice(2, 0, configData.deviceOptions[0]);
        configData.deviceOptions.splice(0, 1);
        configData.deviceOptions.push(configData.deviceOptions[configData.deviceOptions.length - 2]);
        configData.deviceOptions.splice(configData.deviceOptions.length - 3, 1);
    });

    it('should load configuration file', function () {
        browser.refresh();
        var condition, configFileMessage;

        condition = EC.visibilityOf($('#loadConfigFile'));
        browser.wait(condition, 5000);

        element(by.id('localConfigFile')).sendKeys(configPath);

        condition = EC.visibilityOf($('#configFileMessage'));
        browser.wait(condition, 10000);
        configFileMessage = element(by.id('configFileMessage'));

        expect(element(by.id('scoreFileMessage')).getText()).toEqual('Score file loaded');
        expect(configFileMessage.getText()).toEqual('Config file loaded');
    });

    it('option should move device score up correctly', function () {
        browser.refresh();

        var condition, deviceScore, grid;
        condition = EC.visibilityOf($('#upScore'));
        browser.wait(condition, 5000);

        deviceScore = scoreTreeListKeys[scoreTreeListKeys.length - 1];

        $('#deviceScoreList td[value="' + deviceScore + '"]').click();
        $('#upScore').click();
        browser.refresh();

        grid = $$('#deviceScoreList tbody tr');
        grid.getText().then(function (text) {
            var expectedDeviceScores, deviceScoreList, i;
            deviceScoreList = [];
            expectedDeviceScores = scoreTreeListKeys;
            for (i = 0; i < text.length; i += 1) {
                if (text[i] !== "") { deviceScoreList.push(text[i]); }
            }
            expectedDeviceScores.push(expectedDeviceScores[expectedDeviceScores.length - 2]);
            expectedDeviceScores.splice(expectedDeviceScores.length - 3, 1);
            expect(deviceScoreList).toEqual(expectedDeviceScores);
        });
    });

    it('option should move device score down correctly', function () {
        browser.refresh();

        var condition, deviceScore, grid;
        condition = EC.visibilityOf($('#downScore'));
        browser.wait(condition, 5000);

        deviceScore = scoreTreeListKeys[0];

        $('#deviceScoreList td[value="' + deviceScore + '"]').click();
        $('#downScore').click();
        browser.refresh();

        grid = $$('#deviceScoreList tbody tr');
        grid.getText().then(function (text) {
            var expectedDeviceScores, deviceScoreList, i;
            deviceScoreList = [];
            expectedDeviceScores = scoreTreeListKeys;
            for (i = 0; i < text.length; i += 1) {
                if (text[i] !== "") { deviceScoreList.push(text[i]); }
            }
            expectedDeviceScores.splice(2, 0, expectedDeviceScores[0]);
            expectedDeviceScores.splice(0, 1);
            expect(deviceScoreList).toEqual(expectedDeviceScores);
        });
    });

    it('option should remove all device properties', function () {
        browser.refresh();

        var condition, grid;
        condition = EC.visibilityOf($('#deleteProperty'));
        browser.wait(condition, 5000);

        grid = $$('#deviceInfoList tbody tr');
        grid.getText().then(function (text) {
            var i, deviceProperty, deviceInfoList;
            deviceInfoList = [];
            for (i = 0; i < text.length; i += 1) {
                if (text[i] !== "") { deviceInfoList.push(text[i]); }
            }
            for (i = 0; i < deviceInfoList.length; i += 1) {
                deviceProperty = deviceInfoList[i].toLowerCase().replace(new RegExp(/ /, 'g'), '_');
                $('#deviceInfoList td[value="' + deviceProperty + '"]').click();
                $('#deleteProperty').click();
                condition = EC.stalenessOf($('#deviceInfoList td[value="' + deviceProperty + '"]'));
                browser.wait(condition, 10000);
            }
        });
    });

    it('option should remove all scores', function () {
        browser.refresh();

        var condition, grid;
        condition = EC.visibilityOf($('#deleteScore'));
        browser.wait(condition, 5000);

        grid = $$('#deviceScoreList tbody tr');
        grid.getText().then(function (text) {
            var i, deviceScoreList;
            deviceScoreList = [];
            for (i = 0; i < text.length; i += 1) {
                if (text[i] !== "") { deviceScoreList.push(text[i]); }
            }
            for (i = 0; i < deviceScoreList.length; i += 1) {
                $('#deviceScoreList td[value="' + deviceScoreList[i] + '"]').click();
                $('#deleteScore').click();
                condition = EC.stalenessOf($('#deviceScoreList td[value="' + deviceScoreList[i] + '"]'));
                browser.wait(condition, 10000);
            }
        });
    });

});
