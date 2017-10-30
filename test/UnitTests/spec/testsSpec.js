/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*global describe, it, expect*/

describe("Unit Tests", function () {
    "use strict";
    var deviceOptions, deviceData, devices, finderOptions, functions, scoreTreeList, unsortedDevices;
    functions = require('../../../src/background/background-functions.js');

    finderOptions = {
        showFinderLink: true,
        finderHost: "192.168.1.1",
        finderPort: "42"
    };

    devices = [ { name: "ABC" }, { name: "XYZ" } ];
    unsortedDevices = [ { name: "XYZ" }, { name: "ABC" } ];

    deviceData = {name: "DeviceName", "score:Score Root/Score Name": "5", "score:Score Root/Score Name/payload": "255", "score:Score Root/Score Root": "4"};
    scoreTreeList = {
        "Score Root": {
            scores: [{
                children: [{ scoreName: "Score Name" }],
                scoreName: "Test"
            }],
            thresholds: {
                bad: {color: "yellow", from: "6"},
                critical: {color: "red", from: "0"},
                good: {color: "green", from: "8"}
            }
        }
    };
    deviceOptions = ["name"];

    describe("for background-functions.js", function () {
        it("should get Finder Link", function () {
            var expectedResult = "nxt://Show-NxSource?Name=CHDB001&Host=192.168.1.1&Port=42";
            expect(functions.createFinderLink("CHDB001", finderOptions)).toEqual(expectedResult);
        });

        it("should sort devices", function () { expect(functions.sortDevicesList(unsortedDevices)).toEqual(devices); });

        it("should set thresholds color correctly", function () {
            var score, thresholds, payloadCell, scoreCell, result, expectedPayloadCell, expectedScoreCell;
            score = 5;
            thresholds = scoreTreeList["Score Root"].thresholds;
            expectedScoreCell = '<td style="color: rgb(0, 0, 0); background-color: rgb(245, 184, 180);">5</td>';
            expectedPayloadCell = '<td style="color: rgb(0, 0, 0); background-color: rgb(245, 184, 180);">255</td>';

            payloadCell = document.createElement('td');
            payloadCell.innerHTML = "255";
            scoreCell = document.createElement('td');
            scoreCell.innerHTML = "5";

            result = functions.setScoreColor(thresholds, score, scoreCell, payloadCell);

            expect(result[0].outerHTML).toEqual(expectedScoreCell);
            expect(result[1].outerHTML).toEqual(expectedPayloadCell);
        });

        it("should create tab button correctly", function () {
            var expectedButton, button;
            expectedButton = '<button class="dataPopupTablinks device_name" onclick="OpenDataPopupTab(event, \'device_name\', document)" id="defaultOpen">Device Name</button>';
            button = functions.createTabButton("Device Name", true).outerHTML;

            expect(button).toEqual(expectedButton);
        });

        it("should create score tabs correctly", function () {
            var result, expectedTable;
            expectedTable = '<table id="score_root" align="center" class="score dataPopupTabContent"><tbody><tr><td>Overall score</td><td style=""></td><td style="">-</td></tr><tr id="Test"><td id="root" colspan="3">Test</td></tr><tr><td>Score Name</td><td style="color: rgb(0, 0, 0); background-color: rgb(245, 184, 180);">5</td><td style="color: rgb(0, 0, 0); background-color: rgb(245, 184, 180);">255</td></tr></tbody></table>';

            result = functions.createScoresTabAndButtons(scoreTreeList, deviceData)[0]["Score Root"].outerHTML;
            expect(result).toEqual(expectedTable);
        });

        it("should create properties tab correctly", function () {
            var result, expectedTable;
            expectedTable = '<table class="dataPopupTabContent" id="properties"><tbody><tr><td>name</td><td>DeviceName</td></tr></tbody></table>';

            result = functions.createPropertiesTab(deviceData, deviceOptions).outerHTML;
            expect(result).toEqual(expectedTable);
        });

        it("should create score tab buttons correctly", function () {
            var result, expectedButtonList;
            expectedButtonList = '<div class="tabLinks"><button class="dataPopupTablinks score_root scoreIndicatorunset" onclick="OpenDataPopupTab(event, \'score_root\', document)">Score Root</button></div>';

            result = functions.createScoresTabAndButtons(scoreTreeList, deviceData)[1].outerHTML;
            expect(result).toEqual(expectedButtonList);
        });

        it("should create device tab", function () {
            var expectedTabHTML, result;
            expectedTabHTML = '<div class="dataPopupTab" id="DeviceName"><div class="tabLinks"><button class="dataPopupTablinks properties" onclick="OpenDataPopupTab(event, \'properties\', document)" id="defaultOpen">Properties</button><button class="dataPopupTablinks score_root scoreIndicatorunset" onclick="OpenDataPopupTab(event, \'score_root\', document)">Score Root</button></div><table class="dataPopupTabContent" id="properties"><tbody><tr><td>name</td><td>DeviceName</td></tr></tbody></table><table id="score_root" align="center" class="score dataPopupTabContent"><tbody><tr><td>Overall score</td><td style=""></td><td style="">-</td></tr><tr id="Test"><td id="root" colspan="3">Test</td></tr><tr><td>Score Name</td><td style="color: rgb(0, 0, 0); background-color: rgb(245, 184, 180);">5</td><td style="color: rgb(0, 0, 0); background-color: rgb(245, 184, 180);">255</td></tr></tbody></table><div class="link"><a href="nxt://Show-NxSource?Name=DeviceName&amp;Host=192.168.1.1&amp;Port=42" id="link">Open in Nexthink Finder</a></div></div>';

            result = functions.createPopupTab(deviceData, scoreTreeList, deviceOptions, finderOptions)[1];
            expect(result).toEqual(expectedTabHTML);
        });

        describe("URL checking", function () {
            it("should authorize URL", function () {
                expect(functions.isUrlAuthorized("https://www.nexthink.com", ["nexthink.com"])).toEqual(true);
            });

            it("should not authorize URL", function () {
                expect(functions.isUrlAuthorized("https://www.nexthink.com", ["foo.bar"])).toEqual(false);
            });

            it("should refuse URL", function () {
                expect(functions.isUrlRefused("chrome://extensions/")).toEqual(true);
            });

            it("should not refuse URL", function () {
                expect(functions.isUrlRefused("https://www.nexthink.com")).toEqual(false);
            });
        });
    });
});
