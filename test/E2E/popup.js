/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*jslint nomen: true*/
/*global describe, it, expect, browser, protractor, $, $$, element, by*/

describe('Nexthink Plugin - Extension', function () {
    "use strict";
    var EC, testURL, configPath, configData;
    EC = protractor.ExpectedConditions;

    testURL = "file:///" + __dirname + "\\data\\test_position.html";

    configPath = __dirname + "\\data\\testConfig.json";
    configData = require(configPath);

    browser.ignoreSynchronization = true;

    /*Normal function*/
    function getDeviceInfoDisplayedName(deviceInfoList) {
        var deviceInfo, deviceInfoDisplayedName, i;
        deviceInfoDisplayedName = [];
        for (i = 0; i < deviceInfoList.length; i += 1) {
            deviceInfo = deviceInfoList[i].replace(new RegExp(/_/, 'g'), ' ').replace(/\w\S*/g, function (txt) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
            deviceInfoDisplayedName.push(deviceInfo);
        }
        return deviceInfoDisplayedName;
    }

    function hasClass(element, cls) {
        return element.getAttribute('class').then(function (classes) {
            return classes.split(' ').indexOf(cls) !== -1;
        });
    }

    function createOverEventScript(elementLocator) {
        var script = "var elem=document.querySelector('" + elementLocator + "');";
        script += 'var clickEvent=document.createEvent("MouseEvents");';
        script += 'clickEvent.initEvent("mouseover",true,true);';
        script += 'elem.dispatchEvent(clickEvent);';
        return script;
    }

    /*E2E Test functions*/
    function shouldDisplayPopupInput() {
        browser.executeScript(createOverEventScript('input[value="CHDB020"]'));
        var condition = EC.visibilityOf($('.CHDB020#dataPopup'));
        browser.wait(condition, 5000);
    }

    function shouldDisplayPopup() {
        var condition, device;
        device = $('.BOX985334b4-a808-4abc-b4e3-f34b83a747fe#CHDB011');
        condition = EC.presenceOf(device);
        browser.wait(condition, 5000);

        if (browser.params.pluginURL.startsWith("moz-extension")) {
            browser.executeScript(createOverEventScript('.BOX985334b4-a808-4abc-b4e3-f34b83a747fe#CHDB011'));
        } else { browser.actions().mouseMove(device).perform(); }

        condition = EC.visibilityOf($('.CHDB011#dataPopup'));
        browser.wait(condition, 5000);
    }

    function shouldHaveTabButtons() {
        var condition, grid, tabButton;
        tabButton = [];

        if (configData.scoreTreeList !== undefined && configData.scoreTreeList !== null && configData.scoreTreeList.length !== 0) {
            tabButton = tabButton.concat(Object.keys(configData.scoreTreeList));
        }
        if (configData.deviceOptions !== undefined && configData.deviceOptions !== null && configData.deviceOptions.length !== 0) {
            tabButton = ["Properties"].concat(tabButton);
        }

        condition = EC.presenceOf($('.dataPopupTab#CHDB011 .tabLinks'));
        browser.wait(condition, 5000);

        grid = $$('.dataPopupTab#CHDB011 .tabLinks');
        grid.getText().then(function (text) {
            var popupButtonList = String(text).split("\n");
            expect(popupButtonList).toEqual(tabButton);
        });
    }

    function shouldHaveFinderLink() {
        var condition = EC.presenceOf($('.dataPopupTab#CHDB011 .link'));
        browser.wait(condition, 5000);
    }

    function shouldHaveDeviceInformationTab() {
        var condition, grid;
        if (configData.deviceOptions !== undefined && configData.deviceOptions !== null && configData.deviceOptions.length !== 0) {
            condition = EC.presenceOf($('.dataPopupTab#CHDB011 .dataPopupTabContent#properties'));
            browser.wait(condition, 5000);

            grid = $$('.dataPopupTab#CHDB011 .dataPopupTabContent#properties tbody tr td:first-child');
            grid.getText().then(function (text) {
                var deviceInfoDisplayedName = getDeviceInfoDisplayedName(configData.deviceOptions);
                if (text[0] === "") { text = text.slice(1); }
                expect(text).toEqual(deviceInfoDisplayedName);
            });
        }
    }

    function shouldHavePropertiesAutoSpotted() {
        var condition;
        if (configData.deviceOptions !== null && configData.deviceOptions.length !== 0) {
            condition = EC.visibilityOf($('.dataPopupTab#CHDB011 .dataPopupTabContent#properties'));
            browser.wait(condition, 5000);
        }
    }

    function shouldHaveAllScores() {
        function checkTable(root, score) {
            var scores, scoreList, j;
            scoreList = ['Overall score'];

            function getScoreTable(data, title) {

                var name, tempTitle, k, tempDirectChildren, tempChildren;
                tempDirectChildren = [];
                tempChildren = [];
                name = data.scoreName.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1); });

                if (data.children) {
                    if (Array.isArray(data.children)) {
                        for (k = data.children.length - 1; k >= 0; k -= 1) {
                            if (!data.children[k].children) {
                                tempDirectChildren.push(data.children[k].scoreName);
                            } else {
                                tempChildren.push(data.children[k]);
                            }
                        }
                        tempChildren.reverse();

                        if (title !== "") { tempTitle = title + " - " + name; } else { tempTitle = name; }
                        if(tempDirectChildren.length !== 0) { scoreList.push(tempTitle.toUpperCase()); }

                        for (k = tempDirectChildren.length - 1; k >= 0; k -= 1) { scoreList.push(tempDirectChildren[k]); }

                        for (k = 0; k < tempChildren.length; k += 1) {
                            getScoreTable(tempChildren[k], tempTitle);
                        }
                    } else {
                        getScoreTable(data.children, tempTitle);
                        scoreList.push(name);
                    }
                } else { scoreList.push(name); }
            }

            scores = configData.scoreTreeList[root].scores;
            for (j = 0; j < scores.length; j += 1) { getScoreTable(scores[j], ""); }
            expect(score).toEqual(scoreList);
        }

        var scoreTreeList, keys, k, key, condition, actualscoreRootID, grid;
        scoreTreeList = configData.scoreTreeList;
        keys = Object.keys(scoreTreeList);
        for (k = 0; k < keys.length; k += 1) {
            key = keys[k];
            actualscoreRootID = key.replace(new RegExp(/ /, 'g'), '_').replace(new RegExp(/:/, 'g'), '').toLowerCase();
            $('.dataPopupTab#CHDB011 .tabLinks .dataPopupTablinks.' + actualscoreRootID).click();
            condition = EC.visibilityOf($('.dataPopupTab#CHDB011 .dataPopupTabContent#' + actualscoreRootID));
            browser.wait(condition, 5000);

            grid = $$('.dataPopupTab#CHDB011 .dataPopupTabContent#' + actualscoreRootID + ' tbody td:first-child');
            grid.getText().then(checkTable.bind(null, key));
        }
    }

    function shouldPositionPopupPointerCorrectly() {
        var devicePointerPosition, i, deviceName, condition, popup;
        devicePointerPosition = [["CHDB011", "upLeft"], ["CHDB012", "upCenter"], ["CHDB013", "upRight"], ["CHDB014", "downLeft"], ["CHDB015", "downCenter"], ["CHDB016", "downRight"]];

        for (i = 0; i < devicePointerPosition.length; i += 1) {
            deviceName = $('.BOX985334b4-a808-4abc-b4e3-f34b83a747fe#' + devicePointerPosition[i][0]);
            condition = EC.presenceOf(deviceName);
            browser.wait(condition, 5000);

            browser.executeScript(createOverEventScript('.BOX985334b4-a808-4abc-b4e3-f34b83a747fe#' + devicePointerPosition[i][0]));
            popup = $('.' + devicePointerPosition[i][0] + '#dataPopup');
            condition = EC.visibilityOf(popup);
            browser.wait(condition, 5000);

            expect(hasClass(popup, devicePointerPosition[i][1])).toBe(true);
        }
    }

    function shouldPositionPopupPointerOfInputCorrectly() {
        var devicePointerPosition, i, condition, popup;
        devicePointerPosition = [["CHDB017", "upLeft"], ["CHDB018", "upCenter"], ["CHDB019", "upRight"], ["CHDB020", "downLeft"], ["CHDB021", "downCenter"], ["CHDB022", "downRight"]];

        for (i = 0; i < devicePointerPosition.length; i += 1) {
            browser.executeScript(createOverEventScript('input[value="' + devicePointerPosition[i][0] + '"]'));
            popup = $('.' + devicePointerPosition[i][0] + '#dataPopup');
            condition = EC.visibilityOf(popup);
            browser.wait(condition, 5000);

            expect(hasClass(popup, devicePointerPosition[i][1])).toBe(true);
        }
    }

    it('should have popup data', function () {
        browser.get(testURL);
        var condition = EC.presenceOf($('#dataPopup'));
        browser.wait(condition, 5000);
    });

    it('should display popup from input', function () { shouldDisplayPopupInput(); });
    it('should display popup', function () { shouldDisplayPopup(); });
    it('should have tab buttons', function () {shouldHaveTabButtons(); });
    it('should have Finder link', function () { shouldHaveFinderLink(); });
    it('should have device information tab', function () { shouldHaveDeviceInformationTab(); });
    it('should have properties auto-spotted', function () { shouldHavePropertiesAutoSpotted(); });
    it('should have all scores', function () { shouldHaveAllScores(); });
    it('should position popup pointer correctly', function () { shouldPositionPopupPointerCorrectly(); });
    it('should position popup pointer of input correctly', function () { shouldPositionPopupPointerOfInputCorrectly(); });

    if (browser.params.testURL) {
        it('should have popup data (iframe)', function () {
            var iframe, condition;
            browser.get(browser.params.testURL);
            iframe = $('#testFrame');
            condition = EC.presenceOf(iframe);
            browser.wait(condition, 5000);
            browser.switchTo().frame(0);
        });

        it('should have popup data (iframe)', function () {
            var condition = EC.presenceOf($('#dataPopup'));
            browser.wait(condition, 5000);
        });

        it('should display popup from input (iframe)', function () { shouldDisplayPopupInput(); });
        it('should display popup (iframe)', function () { shouldDisplayPopup(); });
        it('should have tab buttons (iframe)', function () {shouldHaveTabButtons(); });
        it('should have Finder link (iframe)', function () { shouldHaveFinderLink(); });
        it('should have device information tab (iframe)', function () { shouldHaveDeviceInformationTab(); });
        it('should have properties auto-spotted (iframe)', function () { shouldHavePropertiesAutoSpotted(); });
        it('should have all scores (iframe)', function () { shouldHaveAllScores(); });
        it('should position popup pointer correctly (iframe)', function () { shouldPositionPopupPointerCorrectly(); });
        it('should position popup pointer of input correctly (iframe)', function () { shouldPositionPopupPointerOfInputCorrectly(); });
    }

});
