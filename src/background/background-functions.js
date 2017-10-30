/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*global btoa, X2JS*/
/*global BrowserAdapter, checkBrowser, decryptString, getDevicesList, getDeviceData*/
"use strict";

var refusedUrls = ["chrome://", "chrome-extension://", "chrome-devtools://", "chrome.google.com/webstore", "moz-extension://", "about:"];

/*
* Check if the plugin can access to the url
* @param The url to Check
* @return Boolean if url is valid
*/
function isUrlAuthorized(url, whitelist) {
    // Test specific url first

    var i, filePath;
    try {
        if (url === null || url === undefined) { return false; }
        for (i = 0; i < refusedUrls.length; i += 1) { if (url.indexOf(refusedUrls[i]) !== -1) { return false; } }

        if (url.indexOf("file:///") !== -1) {
            filePath = url.split("///")[1];
            url = filePath.substring(0, filePath.lastIndexOf("/"));
        } else { url = url.split("//")[1].split("/")[0].split(":")[0].replace("www.", ""); }

        if (whitelist !== null || whitelist === undefined) {
            for (i = 0; i < whitelist.length; i += 1) {
                if (url === whitelist[i]) { return true; }
            }
        }

        return false;
    } catch (e) { return false; }

}

/*
* Check if the url is in the fixed blacklist
* @param The url to Check
* @return Boolean if url is refused
*/
function isUrlRefused(url) {
    var i;
    for (i = 0; i < refusedUrls.length; i += 1) { if (url.indexOf(refusedUrls[i]) !== -1) { return true; } }
    return false;
}

/*
 * Create the link to open the Finder for a specific element
 * @param deviceName The device to found in the Finder
 * @return The url to open the Finder with the specified info
 */
function createFinderLink(deviceName, finderOptions) {
    var finderBaseUrl = "nxt://Show-NxSource?Name=", finderPort, finderHost;

    if (/^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/.test(finderOptions.finderPort)) {
        finderPort = "&Port=".concat(finderOptions.finderPort);
    } else {
        finderPort = "";
    }

    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(finderOptions.finderHost)) {
        finderHost = "&Host=".concat(finderOptions.finderHost);
    } else {
        finderHost = "";
    }
    return finderBaseUrl.concat(deviceName).concat(finderHost).concat(finderPort);
}

/*
* Sort a list of devices by their name (asc)
* @param devicesList The list of device to sort
* @return The sorted device list
*/
function sortDevicesList(devicesList) {
    return devicesList.sort(function (a, b) {
        var x = a.name, y = b.name;
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

/*
* Set the color of the cells depending of the score value and thresholds
* @param thresholds The thresholds json
* @param score The score payload
* @param scoreValueCell The DOM cell containing the score value
* @param scorePayloadCell The DOM cell containing the score payload
* @return Array containing altered [scoreValueCell, scorePayloadCell, color]
*/
function setScoreColor(thresholds, score, scoreValueCell, scorePayloadCell) {
    var good, bad, critical, state;

    try {
        good = {color: "#ADE0C6", from: 8};
        bad = {color: "#FEE1B1", from: 6};
        critical = {color: "#F5B8B4", from: 0};

        good.from = thresholds.good.from;
        bad.from = thresholds.bad.from;
        critical.from = thresholds.critical.from;
    } catch (ignore) {}

    score = parseFloat(score);

    try {
        scoreValueCell.style.color = "#000000";
        scorePayloadCell.style.color = "#000000";
    } catch (ignore) {}

    if (score >= 0 && score < bad.from) {
        try {
            state = "critical";
            scoreValueCell.style.backgroundColor = critical.color;
            scorePayloadCell.style.backgroundColor = critical.color;
        } catch (ignore) {}
    } else if (score >= bad.from && score < good.from) {
        try {
            state = "bad";
            scoreValueCell.style.backgroundColor = bad.color;
            scorePayloadCell.style.backgroundColor = bad.color;
        } catch (ignore) {}
    } else if (score >= good.from && score <= 10) {
        try {
            state = "good";
            scoreValueCell.style.backgroundColor = good.color;
            scorePayloadCell.style.backgroundColor = good.color;
        } catch (ignore) {}
    } else {
        try {
            scoreValueCell.style.color = "";
            scorePayloadCell.style.color = "";
        } catch (ignore) {}
    }

    return [scoreValueCell, scorePayloadCell, state];
}

/*
* Create the button who will open the tab
* @param name The name of the tab to open
* @param defaultOpen Indicate if the tab related to button will be show when showing tab
* @return DOM button
*/
function createTabButton(name, defaultOpen) {
    var button, buttonEvent, deviceName;

    button = document.createElement('button');
    deviceName = name.replace(new RegExp(/ /, 'g'), '_').replace(new RegExp(/\:/, 'g'), '').toLowerCase();

    buttonEvent = '<button class="dataPopupTablinks ' + deviceName + '"';
    buttonEvent += 'onclick="OpenDataPopupTab(event, \'' + deviceName + '\', document)"';

    if (defaultOpen) { buttonEvent += ' id="defaultOpen">'; } else { buttonEvent += '>'; }

    buttonEvent += name + "</button>";
    button.innerHTML = buttonEvent;

    button = button.childNodes[0];

    return button;
}

/*
* Create the device properties tab DOM element
* @param deviceData The json with device values
* @return DOM element with tab of device properties
*/
function createPropertiesTab(deviceData, deviceOptions) {
    var deviceInfoRow, deviceInfoNameCell, deviceInfoDataCell, deviceInfoDataDiv, i;

    deviceInfoDataDiv = document.createElement('table');
    deviceInfoDataDiv.className = "dataPopupTabContent";
    deviceInfoDataDiv.id = "properties";

    if (deviceOptions.length === 0) {
        deviceInfoRow = deviceInfoDataDiv.insertRow(deviceInfoDataDiv.rows.length);
        deviceInfoNameCell = deviceInfoRow.insertCell(0);
        deviceInfoDataCell = deviceInfoRow.insertCell(1);
        deviceInfoNameCell.innerHTML = "";
        deviceInfoDataCell.innerHTML = "";
    }
    for (i = 0; i < deviceOptions.length; i += 1) {
        if (deviceOptions[i].indexOf("score:") === -1) {
            deviceInfoRow = deviceInfoDataDiv.insertRow(deviceInfoDataDiv.rows.length);
            deviceInfoNameCell = deviceInfoRow.insertCell(0);
            deviceInfoDataCell = deviceInfoRow.insertCell(1);
            deviceInfoNameCell.innerHTML = deviceOptions[i].replace(new RegExp(/_/, 'g'), ' ');
            deviceInfoDataCell.innerHTML = deviceData[deviceOptions[i]];
        }
    }

    return deviceInfoDataDiv;
}

/*
* Navigate through score tree and display score and payload
* @param element The element where to add the content
* @param data The current data root
* @param scoreRoot The current root
* @param deviceData The json with device values
* @param title The current title
* @param thresholds The thresholds values json
*/
function displayScoreTable(element, data, scoreRoot, deviceData, title, thresholds) {
    var i, name, scoreNameCell, scorePayloadCell, scoreRow, scoreValue, scoreValueCell, tempTitle, tempReturnValue, tempDirectChildren, tempChildren;

    tempDirectChildren = [];
    tempChildren = [];
    name = data.scoreName;
    scoreRow = element.insertRow(element.rows.length);
    scoreRow.id = name;

    if (data.children) {
        if (Array.isArray(data.children)) {
            for (i = data.children.length - 1; i >= 0; i -= 1) {
                if (!data.children[i].children) {
                    tempDirectChildren.push(data.children[i].scoreName);
                } else {
                    tempChildren.push(data.children[i]);
                }
            }
            tempChildren.reverse();
            tempDirectChildren.reverse();

            if (title !== "") { tempTitle = title + " - " + name; } else { tempTitle = name; }
            if (tempDirectChildren.length !== 0) {
                scoreNameCell = scoreRow.insertCell(0);
                scoreNameCell.id = "root";
                scoreNameCell.setAttribute("colspan", "3");
                scoreNameCell.appendChild(document.createTextNode(tempTitle));
            }
            for (i = 0; i < tempDirectChildren.length; i += 1) {
                scoreRow = element.insertRow(element.rows.length);
                scoreValue = deviceData["score:" + scoreRoot + "/" + tempDirectChildren[i]];

                scoreNameCell = scoreRow.insertCell(0);
                scoreNameCell.appendChild(document.createTextNode(tempDirectChildren[i]));
                scoreValueCell = scoreRow.insertCell(1);
                if (!scoreValue || scoreValue === "-" || scoreValue === null || scoreValue === undefined) { scoreValueCell.innerHTML = "-"; } else { scoreValueCell.innerHTML = parseInt(scoreValue, 10); }

                scorePayloadCell = scoreRow.insertCell(2);
                scorePayloadCell.innerHTML = deviceData["score:" + scoreRoot + "/" + tempDirectChildren[i] + "/payload"];
                if (scoreValue !== "-") {
                    tempReturnValue = setScoreColor(thresholds, parseInt(scoreValue, 10), scoreValueCell, scorePayloadCell);
                    scoreValueCell = tempReturnValue[0];
                    scorePayloadCell = tempReturnValue[1];
                }

            }

            for (i = 0; i < tempChildren.length; i += 1) {
                displayScoreTable(element, tempChildren[i], scoreRoot, deviceData, tempTitle, thresholds);
            }
        } else {
            displayScoreTable(element, data.children, scoreRoot, deviceData, "", thresholds);
            scoreNameCell.appendChild(document.createTextNode(name));
        }
    } else {
        scoreNameCell = scoreRow.insertCell(0);

        scoreValue = deviceData["score:" + scoreRoot + "/" + name];

        scoreValueCell = scoreRow.insertCell(1);
        if (!scoreValue || scoreValue === "-" || scoreValue === null || scoreValue === undefined) { scoreValueCell.innerHTML = "-"; } else { scoreValueCell.innerHTML = parseInt(scoreValue, 10); }

        scorePayloadCell = scoreRow.insertCell(2);
        scorePayloadCell.innerHTML = deviceData["score:" + scoreRoot + "/" + name + "/payload"];
        if (scoreValue !== "-") {
            tempReturnValue = setScoreColor(thresholds, parseInt(scoreValue, 10), scoreValueCell, scorePayloadCell);
            scoreValueCell = tempReturnValue[0];
            scorePayloadCell = tempReturnValue[1];
        }

        scoreNameCell.appendChild(document.createTextNode(name));
    }

    return undefined;
}

/*
* Create the device properties tab DOM element
* @param currentScoreTreeList The json with device values
* @return array of DOM element with tab of scores and button elements for each tab
*/
function createScoresTabAndButtons(currentScoreTreeList, deviceData) {
    var scoreIndicator, dataDivLinks, keys, tempName, state, i, j, scoreRoot, temp, scoreTable, scoreInfoRow, scoreEmptyCell, scoreNameCell, scoreValueCell, overallScoreValue, scoreTables = {};
    dataDivLinks = document.createElement('div');
    dataDivLinks.className = "tabLinks";

    keys = Object.keys(currentScoreTreeList);

    for (i = 0; i < keys.length; i += 1) {
        scoreRoot = keys[i];
        temp = currentScoreTreeList[scoreRoot];

        scoreTable = document.createElement("TABLE");
        scoreTable.id = scoreRoot.replace(new RegExp(/ /, 'g'), '_').replace(new RegExp(/\:/, 'g'), '').toLowerCase();
        scoreTable.align = "center";
        scoreTable.classList = "score dataPopupTabContent";

        scoreInfoRow = scoreTable.insertRow(0);
        scoreNameCell = scoreInfoRow.insertCell(0);
        scoreEmptyCell = scoreInfoRow.insertCell(1);
        scoreValueCell = scoreInfoRow.insertCell(2);

        scoreNameCell.innerHTML = "Overall score";
        overallScoreValue = deviceData["score:" + currentScoreTreeList[scoreRoot].overall];
        if (overallScoreValue === "-" || overallScoreValue === null || overallScoreValue === undefined) { scoreValueCell.innerHTML = "-"; } else { scoreValueCell.innerHTML = parseFloat(overallScoreValue).toFixed(2); }

        for (j = 0; j < temp.scores.length; j += 1) { displayScoreTable(scoreTable, temp.scores[j], scoreRoot, deviceData, "", temp.thresholds); }

        scoreTables[scoreRoot] = scoreTable;

        dataDivLinks.appendChild(createTabButton(keys[i], false));
        tempName = keys[i].replace(new RegExp(/ /, 'g'), '_').replace(new RegExp(/\:/, 'g'), '').toLowerCase();
        state = setScoreColor(currentScoreTreeList[keys[i]].thresholds, overallScoreValue, scoreEmptyCell, scoreValueCell)[2];
        if (state === undefined) {scoreIndicator = " scoreIndicatorunset"; } else { scoreIndicator = " scoreIndicator" + state; }
        try { dataDivLinks.querySelector("." + tempName).classList += scoreIndicator; } catch (ignore) {}

    }

    return [scoreTables, dataDivLinks];
}

/*
* Create HTML element for each device
* @param deviceData The json with device values
* @return array with device name and device HTML
*/
function createPopupTab(deviceData, scoreTreeList, deviceOptions, finderOptions) {

    var data, dataDiv, dataDivLinks, deviceInfoButton, deviceInfoDataDiv, deviceName, finderLink, finderLinkDiv, keys, i, scoreTables, copy;
    deviceName = deviceData.name;

    if (!deviceOptions.includes("name")) { delete deviceData.name;  }
    dataDiv = document.createElement('div');
    dataDiv.className = "dataPopupTab";
    dataDiv.id = deviceName.replace(/\./g, "");

    deviceInfoButton = createTabButton("Properties", true);

    deviceInfoDataDiv = createPropertiesTab(deviceData, deviceOptions);
    copy = Object.assign({}, scoreTreeList);
    data = createScoresTabAndButtons(copy, deviceData);
    scoreTables = data[0];
    dataDivLinks = data[1];

    dataDiv.appendChild(dataDivLinks);

    if (deviceInfoDataDiv.rows.length !== 0) {
        dataDiv.appendChild(deviceInfoDataDiv);
        dataDivLinks.insertBefore(deviceInfoButton, dataDivLinks.children[0]);
    }

    keys = Object.keys(scoreTables);
    for (i = 0; i < keys.length; i += 1) { dataDiv.appendChild(scoreTables[keys[i]]); }

    // Save the device name
    //if (finderOptions.showFinderLink) {
    finderLinkDiv = document.createElement('div');
    finderLink = document.createElement('a');
    finderLinkDiv.className = "link";
    finderLink.href = createFinderLink(deviceName, finderOptions);
    finderLink.id = "link";
    finderLink.textContent = "Open in Nexthink Finder";
    finderLinkDiv.appendChild(finderLink);
    dataDiv.appendChild(finderLinkDiv);
    //}

    return [deviceName, dataDiv.outerHTML];
}

try {
    module.exports = {
        isUrlRefused: function (url) {
            return isUrlRefused(url);
        },
        isUrlAuthorized: function (url, whitelist) {
            return isUrlAuthorized(url, whitelist);
        },
        createFinderLink: function (deviceName, finderOptions) {
            return createFinderLink(deviceName, finderOptions);
        },
        createPopupTab: function (deviceData, scoreTreeList, deviceOptions, finderOptions) {
            return createPopupTab(deviceData, scoreTreeList, deviceOptions, finderOptions);
        },
        createPropertiesTab: function (deviceData, deviceOptions) {
            return createPropertiesTab(deviceData, deviceOptions);
        },
        createScoresTabAndButtons: function (scoreTreeList, deviceData) {
            return createScoresTabAndButtons(scoreTreeList, deviceData);
        },
        createTabButton: function (name, defaultOpen) {
            return createTabButton(name, defaultOpen);
        },
        setScoreColor: function (thresholds, score, scoreValueCell, scorePayloadCell) {
            return setScoreColor(thresholds, score, scoreValueCell, scorePayloadCell);
        },
        sortDevicesList: function (devicesList) {
            return sortDevicesList(devicesList);
        }
    };
} catch (ignore) { }
