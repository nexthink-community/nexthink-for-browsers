/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*jshint esversion:6*/
/*jshint strict:false*/
/*global FileReader, BrowserAdapter, checkBrowser, checkIfDevicePropertiesExist*/
/*global checkIfDeviceScoreExist, decryptString, getGoodEncryptionKey, encryptString*/

"use strict";

var savedScores, savedPayloads, savedWhitelistedURL, savedScoreTreeList, savedDeviceOptions, actualBrowser, actualBrowserName, connectionData, strings;
strings = {
    badHostname: "Cannot access hostname",
    canNotLoadFile: "Cannot load file",
    configurationFileCreated: "Config file created",
    configurationFileLoaded: "Config file loaded",
    credentialsSaved: "Credentials saved",
    devicePropertyAlreadySaved: "device info already saved",
    devicePropertyNotExist: "does not exist",
    enterHostname: "Please enter a hostname",
    enterPassword: "Please enter a password",
    enterUsername: "Please enter a username",
    errorWhileReading: "Error while reading file",
    invalidCredentials: "Invalid credentials",
    invalidCertificate: "Check if your browser can access API: ",
    notConnected: "Error: not connected to the API",
    scoreFileLoaded: "Score file loaded",
    selectFile: "Please select a file",
    selectValideJSONFile: "Please select a valid JSON file",
    selectValidScoreFile: "Please select a valid score file",
    tryConnection: "Connection...",
    validCredentials: "Connected"
};

/*
* Use to change the color of the selected row.
* Remove selected state of all rows in table before.
*/
function changeRowColor() {
    var i, parent, tagname;
    tagname = "TBODY";
    parent  = this.parentNode;

    while (parent.tagName !== "HTML") {
        if (parent.tagName === tagname) {
            break;
        }
        parent = parent.parentNode;
    }

    for (i = 0; i < parent.children.length; i += 1) { parent.children[i].className = ""; }
    this.className = "selected";
}

/*
* Set empty row to table
*/
function setEmptyRows(tableID) {
    var table, emptyRow;
    table = document.getElementById(tableID).getElementsByTagName('tbody')[0];
    table.querySelectorAll("#empty").forEach(function (element) { element.remove(); });
    if (table.rows.length < 3) {
        do {
            emptyRow = table.insertRow(table.rows.length);
            emptyRow.id = "empty";
            emptyRow.insertCell(0);
        } while (table.rows.length !== 3);
    }
}

/*
* Add the device info to table
* @param deviceInfo The device info to add in the table
*/
function addDeviceInfoToTable(deviceInfo, index) {
    var deviceInfoTable, deviceInfoRow, deviceInfoNameCell, selected = true;

    deviceInfoTable = document.getElementById('deviceInfoList').getElementsByTagName('tbody')[0];
    if (index === undefined || index === null) {
        index = deviceInfoTable.rows.length;
        selected = false;
    }
    deviceInfoRow = deviceInfoTable.insertRow(index);
    if (selected) { deviceInfoRow.classList = "selected"; }
    deviceInfoNameCell = deviceInfoRow.insertCell(0);
    deviceInfoNameCell.setAttribute("value", deviceInfo);
    deviceInfoNameCell.appendChild(document.createTextNode(deviceInfo.replace(new RegExp(/_/, 'g'), ' ')));
    deviceInfoRow.addEventListener('click', changeRowColor, false);
    setEmptyRows("deviceInfoList");
    document.getElementById("deviceInfoList").style.display = "inline-table";
}

/*
* Show score in table
* @param scoreRoot The score root
* @param index position in row list
*/
function addDeviceScoreToTable(scoreRoot, index) {
    var deviceScoreTable, deviceScoreRow, deviceScoreNameCell, selected = true;

    deviceScoreTable = document.getElementById('deviceScoreList').getElementsByTagName('tbody')[0];
    if (index === undefined || index === null) {
        index = deviceScoreTable.rows.length;
        selected = false;
    }
    deviceScoreRow = deviceScoreTable.insertRow(index);
    if (selected) { deviceScoreRow.classList = "selected"; }
    deviceScoreNameCell = deviceScoreRow.insertCell(0);
    deviceScoreNameCell.setAttribute("value", scoreRoot);
    deviceScoreNameCell.appendChild(document.createTextNode(scoreRoot.replace(new RegExp(/_/, 'g'), ' ')));
    deviceScoreRow.addEventListener('click', changeRowColor, false);

    setEmptyRows("deviceScoreList");
    document.getElementById("deviceScoreList").style.display = "inline-table";
}

/*
* Use to move the selected device property up in the list.
*/
function upDeviceInfo() {
    var deviceProperty, element;
    element = document.querySelector("#deviceInfoList .selected td");
    if (element !== null && element !== undefined) {
        deviceProperty = element.getAttribute("value");
        element = element.parentElement;
        if (element.rowIndex !== 0) {
            if (savedDeviceOptions.includes(deviceProperty)) {
                savedDeviceOptions.splice(savedDeviceOptions.indexOf(deviceProperty), 1);
                savedDeviceOptions.splice(element.rowIndex - 1, 0, deviceProperty);
            }

            addDeviceInfoToTable(deviceProperty, element.rowIndex - 1);
            element.remove();
            setEmptyRows("deviceInfoList");
        }
    }
}

/*
* Use to move the selected device property down in the list.
*/
function downDeviceInfo() {
    var deviceProperty, element;
    element = document.querySelector("#deviceInfoList .selected td");
    if (element !== null && element !== undefined) {
        deviceProperty = element.getAttribute("value");
        element = element.parentElement;
        if (element.rowIndex !== element.parentElement.rows.length - 1) {
            if (savedDeviceOptions.includes(deviceProperty)) {
                savedDeviceOptions.splice(savedDeviceOptions.indexOf(deviceProperty), 1);
                savedDeviceOptions.splice(element.rowIndex + 1, 0, deviceProperty);
            }

            addDeviceInfoToTable(deviceProperty, element.rowIndex + 2);
            element.remove();
            setEmptyRows("deviceInfoList");
        }
    }
}

/*
* Use to remove the selected device property from the list.
*/
function removeDeviceInfo() {
    var deviceProperty, element;
    element = document.querySelector("#deviceInfoList .selected td");
    if (element !== null && element !== undefined) {
        deviceProperty = element.getAttribute("value");
        savedDeviceOptions.splice(savedDeviceOptions.indexOf(deviceProperty), 1);
        actualBrowser.storage.local.set({"deviceOptions": savedDeviceOptions});
        actualBrowser.runtime.sendMessage({data: JSON.stringify(savedDeviceOptions), subject: "deviceOptions"});
        element.parentElement.remove();
        setEmptyRows("deviceInfoList");
    }
}

/*
* Use to move the selected device score up in the list.
*/
function upDeviceScore() {
    var deviceScore, element, keys, scoreTreeList, i;
    scoreTreeList = {};

    element = document.querySelector("#deviceScoreList .selected td");
    if (element !== null && element !== undefined) {

        deviceScore = element.getAttribute("value");
        element = element.parentElement;
        if (element.rowIndex !== 0) {
            keys = Object.keys(savedScoreTreeList);
            if (keys[element.rowIndex] === deviceScore) {
                keys.splice(element.rowIndex, 1);
                keys.splice(element.rowIndex - 1, 0, deviceScore);
                for (i = 0; i < keys.length; i += 1) { scoreTreeList[keys[i]] = savedScoreTreeList[keys[i]]; }
                savedScoreTreeList = scoreTreeList;
                actualBrowser.storage.local.set({"scoreTreeList": savedScoreTreeList});
                actualBrowser.runtime.sendMessage({data: JSON.stringify(savedScoreTreeList), subject: "scoreTreeList"});

                addDeviceScoreToTable(deviceScore, element.rowIndex - 1);
                element.remove();
                setEmptyRows("deviceScoreList");
            }
        }
    }
}

/*
* Use to move the selected device score down in the list.
*/
function downDeviceScore() {
    var deviceScore, element, keys, scoreTreeList, i;
    scoreTreeList = {};

    element = document.querySelector("#deviceScoreList .selected td");
    if (element !== null && element !== undefined) {

        deviceScore = element.getAttribute("value");
        element = element.parentElement;
        if (element.rowIndex !== element.parentElement.rows.length - 1) {
            keys = Object.keys(savedScoreTreeList);
            if (keys[element.rowIndex] === deviceScore) {
                keys.splice(element.rowIndex, 1);
                keys.splice(element.rowIndex + 1, 0, deviceScore);
                for (i = 0; i < keys.length; i += 1) { scoreTreeList[keys[i]] = savedScoreTreeList[keys[i]]; }
                savedScoreTreeList = scoreTreeList;
                actualBrowser.storage.local.set({"scoreTreeList": savedScoreTreeList});
                actualBrowser.runtime.sendMessage({data: JSON.stringify(savedScoreTreeList), subject: "scoreTreeList"});

                addDeviceScoreToTable(deviceScore, element.rowIndex + 2);
                element.remove();
                setEmptyRows("deviceScoreList");
            }
        }
    }
}

/*
* Use to remove the selected device score from the list.
*/
function removeDeviceScore() {
    var deviceScore, element, j;
    element = document.querySelector("#deviceScoreList .selected td");
    if (element !== null && element !== undefined) {
        deviceScore = element.getAttribute("value");

        delete savedScoreTreeList[deviceScore];
        for (j = savedPayloads.length - 1; j >= 0; j -= 1) { if (savedPayloads[j].startsWith(deviceScore + "/")) { savedPayloads.splice(j, 1); } }
        for (j = savedScores.length - 1; j >= 0; j -= 1) { if (savedScores[j].startsWith(deviceScore + "/")) { savedScores.splice(j, 1); } }
        actualBrowser.storage.local.set({"scoreTreeList": savedScoreTreeList});
        actualBrowser.storage.local.set({"scores": savedScores});
        actualBrowser.storage.local.set({"payloads": savedPayloads});

        actualBrowser.runtime.sendMessage({data: JSON.stringify(savedPayloads), subject: "payload"});
        actualBrowser.runtime.sendMessage({data: JSON.stringify(savedScores), subject: "scores"});
        actualBrowser.runtime.sendMessage({data: JSON.stringify(savedScoreTreeList), subject: "scoreTreeList"});
        element.parentElement.remove();
        setEmptyRows("deviceScoreList");
    }
}

/*
* Check if the device info exist in Engine databse
* @param deviceInfo The device info to check
*/
function checkIfDeviceInfoExist(deviceInfo) {
    // Get the connection information
    connectionData = actualBrowser.extension.getBackgroundPage().connectionData;

    var mainURL, log;
    deviceInfo = deviceInfo.replace(/ /g, "_").toLowerCase();

    mainURL = "https://" + connectionData.engineHostname + "/2/query";
    log = [connectionData.username, decryptString(connectionData.key, connectionData.password)];
    checkIfDevicePropertiesExist(mainURL, log, deviceInfo, "").then(function (xhttpData) {
        var message;
        if (xhttpData.status === 200) {
            // First check if the score has been already saved
            if (!savedDeviceOptions.includes(deviceInfo)) {
                savedDeviceOptions.push(deviceInfo);
                actualBrowser.storage.local.set({"deviceOptions": savedDeviceOptions});
                actualBrowser.runtime.sendMessage({data: JSON.stringify(savedDeviceOptions), subject: "deviceOptions"});
                addDeviceInfoToTable(deviceInfo);
                document.getElementById("deviceInfo").value = "";
            } else {
                document.getElementById("deviceInfo").value = "";
                message = "<span><b>" + deviceInfo + "</b> " + strings.devicePropertyAlreadySaved + "</br><span>";
                document.getElementById("deviceInfoMessage").innerHTML += message;
            }
        } else {
            message = "<span>The property <b>" + deviceInfo + "</b> " + strings.devicePropertyNotExist + "</span>";
            document.getElementById("deviceInfoMessage").innerHTML += message;
        }
    });
}

/*
* Add the device infos to table, if it's not already save
* @param deviceInfos The array of deviceInfo to save
*/
function addDeviceInfo(deviceInfos) {
    var i, j, deviceInfo, deviceInfoList, tempInfo;
    if (actualBrowser.extension.getBackgroundPage().connected) {
        document.getElementById("deviceInfoMessage").innerHTML = "";

        for (i = 0; i < deviceInfos.length; i += 1) {
            deviceInfo = deviceInfos[i].split("\n");
            deviceInfoList = [];
            for (j = 0; j < deviceInfo.length; j += 1) {
                tempInfo = deviceInfo[j].replace(/[\n\r\t]+/g, ' ');
                if (tempInfo.length !== 0 && tempInfo.replace(' ', '').length !== 0) { deviceInfoList.push(tempInfo); }
            }

            for (j = 0; j < deviceInfoList.length; j += 1) { checkIfDeviceInfoExist(deviceInfo[j]); }
        }
    } else {
        document.getElementById("deviceInfoMessage").innerHTML = "<span>" + strings.notConnected + "<span>";
    }
}

/*
* Check if the score exist in Engine databse
* @param scoreName The score to check
* @param payload If the score is a payload
*/
function checkIfScoreExist(scoreName, payload) {
    var startScoreString, scoreQueryName, log, mainURL;

    /*Check if the score has the starting string for a Web API v2 query*/
    startScoreString = '#"score:';
    scoreQueryName = scoreName;

    if (!payload) { checkIfScoreExist(scoreName + "/payload", true); }

    if (scoreQueryName.indexOf(startScoreString) === -1) { scoreQueryName = startScoreString + scoreQueryName + '"'; }

    // Get the connection information
    connectionData = actualBrowser.extension.getBackgroundPage().connectionData;
    log = [connectionData.username, decryptString(connectionData.key, connectionData.password)];
    mainURL = "https://" + connectionData.engineHostname + "/2/query";
    checkIfDeviceScoreExist(mainURL, log, scoreQueryName, "").then(function (xhttpData) {
        if (xhttpData.status === 200) {
            if (payload === false) {
                if (!savedScores.includes(scoreName)) {
                    savedScores.push(scoreName);
                    savedScores.sort();
                    actualBrowser.storage.local.set({"scores": savedScores});
                    actualBrowser.runtime.sendMessage({data: JSON.stringify(savedScores), subject: "scores"});
                }
            } else {
                if (!savedPayloads.includes(scoreName) && payload === true) {
                    savedPayloads.push(scoreName);
                    savedPayloads.sort();

                    actualBrowser.storage.local.set({"payloads": savedPayloads});
                    actualBrowser.runtime.sendMessage({data: JSON.stringify(savedPayloads), subject: "payload"});
                }
            }
        }
    });
}

/*
* Use to create a config file
*/
function createConfigFile() {
    // Add the desired data name to the list
    var dataToGet = [
        "engineHostname", "finderHost", "finderPort", "showFinderLink",
        "scoreTreeList", "whitelist", "deviceOptions", "underline", "italic", "bold"
    ];

    if (dataToGet.length !== 0) {
        actualBrowser.storage.local.get(dataToGet, function (data) {
            var currentDate, currentDateString, content, filename, element;

            currentDate = new Date();
            currentDateString = currentDate.getDate() + "-" + (currentDate.getMonth() + 1) + "-" + currentDate.getFullYear() + "_" + currentDate.getHours() + "-" + currentDate.getMinutes() + "-" + currentDate.getSeconds();

            // Create the file element
            content = JSON.stringify(data);
            filename = "NexthinkPlugin-ConfigFile-" + currentDateString + ".json";
            element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
            element.setAttribute('download', filename);

            // Insert the file content in the page, click to activcate the download, then remove it from the page
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            document.getElementById("configFileMessage").innerHTML = strings.configurationFileCreated;
        });
    }
}

/*
* Navigate through the xml object to get score data.
* @param scoreXML The XML object
* @param root Boolean indicate if the current score is a root one
* @param scoreRoot The score root/name
* @return finalData The score data in json
*/
function getScores(scoreXML, root, scoreRoot) {
    var filterFunction, nodes, compositeScores, i, j, l, k, m, scoreName, children = [], temp, tempNodes, leafScores, tempArray, keys, finalChildren, finalData = [], tempChildren = [];
    nodes = Array.prototype.slice.call(scoreXML.getElementsByTagName("CompositeScore"));
    compositeScores = nodes.filter(function (v) {
        return v.parentElement === scoreXML;
    });

    for (i = 0; i < compositeScores.length; i += 1) {
        tempChildren = [];
        scoreName = compositeScores[i].getAttribute("Name");
        children = getScores(compositeScores[i], false, scoreRoot);
        tempNodes = Array.prototype.slice.call(compositeScores[i].getElementsByTagName("LeafScore"));

        leafScores = tempNodes.filter((v) => v.parentElement === compositeScores[i]);

        for (j = 0; j < leafScores.length; j += 1) { tempChildren.push({scoreName: leafScores[j].getAttribute("Name")}); }
        tempChildren.sort();

        if (tempChildren.length !== 0 && children.length !== 0) {
            temp = children[0];
            tempChildren.push({scoreName: temp.scoreName, children: temp.children});
        }

        for (j = 0; j < tempChildren.length; j += 1) { checkIfScoreExist(scoreRoot + "/" + tempChildren[j].scoreName, false); }

        if (root) {
            tempArray = children.concat(tempChildren);
            keys = [];
            for (l = 0; l < tempArray.length; l += 1) { keys.push(tempArray[l].scoreName); }
            keys = keys.filter((item, index, inputArray)  => inputArray.indexOf(item) === index);
            finalChildren = [];
            for (m = 0; m < keys.length; m += 1) {
                for (k = 0; k < tempArray.length; k += 1) {
                    if (tempArray[k].scoreName === keys[m]) {
                        finalChildren.push(tempArray[k]);
                        break;
                    }
                }
            }
            savedScoreTreeList[scoreRoot].scores.push({scoreName: scoreName, children: finalChildren});
        } else {
            if (tempChildren.length !== 0) { finalData.push({scoreName: scoreName, children: tempChildren}); } else { finalData.push({scoreName: scoreName, children: children}); }
        }
    }

    return finalData;
}

/*
* Read XML object and save containing score in the local storage
* @param xml The xml object
*/
function getScoresFileData(xml) {
    var scoreRoot, thresholdsRAW, thresholds, i, thresholdColor, thresholdLabel, thresholdFrom;
    xml = xml.getElementsByTagName("ScoreDef")[0];
    scoreRoot = xml.getAttribute("Name");
    if (!Object.keys(savedScoreTreeList).includes(scoreRoot)) {
        thresholdsRAW = xml.getElementsByTagName("Thresholds")[0].getElementsByTagName("Threshold");
        thresholds = {};
        for (i = 0; i < thresholdsRAW.length; i += 1) {
            thresholdColor = thresholdsRAW[i].getAttribute("Color");
            thresholdLabel = thresholdsRAW[i].getElementsByTagName("Keyword")[0].getAttribute("Label");
            thresholdFrom = thresholdsRAW[i].getElementsByTagName("Keyword")[0].getAttribute("From");
            thresholds[thresholdLabel] = {color: thresholdColor, from: thresholdFrom};
        }

        xml = xml.getElementsByTagName("CompositeScore")[0];
        savedScoreTreeList[scoreRoot] = {};
        savedScoreTreeList[scoreRoot].scores = [];
        savedScoreTreeList[scoreRoot].overall = scoreRoot + "/" + xml.getAttribute("Name");
        savedScoreTreeList[scoreRoot].thresholds = thresholds;

        getScores(xml, true, scoreRoot);
        checkIfScoreExist(savedScoreTreeList[scoreRoot].overall, false);
        addDeviceScoreToTable(scoreRoot);
        actualBrowser.storage.local.set({"scoreTreeList": savedScoreTreeList}, function () {
            actualBrowser.runtime.sendMessage({data: JSON.stringify(savedScoreTreeList), subject: "scoreTreeList"}, function () {
                document.getElementById('scoreFileMessage').innerHTML = strings.scoreFileLoaded;
                document.getElementById('scoreFileMessage').classList = "";
            });
        });
    }
}

/*
* Load the wanted score file from input
*/
function loadScoreFile() {
    var file, reader, fileElement;
    fileElement = document.getElementById("scoreFile");
    if (actualBrowser.extension.getBackgroundPage().connected) {
        if (fileElement.files.length === 0) {
            fileElement.click();
        } else {
            document.getElementById('scoreFileMessage').innerHTML = "";
            document.getElementById('scoreFileMessage').classList = "";
            file = fileElement.files[0];
            try {
                reader = new FileReader();
                reader.readAsText(file);
                reader.onload = function () {
                    var data = (new window.DOMParser()).parseFromString(reader.result, "text/xml");
                    try {
                        getScoresFileData(data);
                    } catch (e) {
                        document.getElementById('scoreFileMessage').innerHTML = strings.selectValidScoreFile;
                        document.getElementById('scoreFileMessage').classList = "errorMessage";
                    }
                };
            } catch (e) {
                document.getElementById('scoreFileMessage').innerHTML = strings.canNotLoadFile;
                document.getElementById('scoreFileMessage').classList = "errorMessage";
            }

            fileElement.value = "";
        }
    } else {
        document.getElementById('scoreFileMessage').innerHTML = strings.notConnected;
        document.getElementById('scoreFileMessage').classList = "errorMessage";
    }
}

/*
* Save the finder options in local storage
*/
function saveFinderOptions() {
    var values, finderInfo, finderHost, finderPort;

    document.getElementById("finderMessage").innerHTML = "";

    values = {
        "finderHostname": document.getElementById("finderHostname").value,
        "showFinderLink": true
    };

    finderInfo = values.finderHostname.split(':');
    if (finderInfo.length === 2) {
        finderHost = finderInfo[0];
        finderPort = finderInfo[1];
    } else {
        finderHost = values.finderHostname;
        finderPort = "443";
    }

    actualBrowser.storage.local.set(
        {
            "finderHost": finderHost,
            "finderPort": finderPort,
            "showFinderLink": values.showFinderLink
        }
    );

    actualBrowser.runtime.sendMessage({data: values, subject: "finderOptions"});
}

/*
 * Use to save password (encrypted) to local storage
 * @param key The AES key
 * @param pass The encrypted password
 */
function savePassword(key, pass) {
    var d, newMonth;
    d = new Date();

    newMonth = d.getMonth() + 3;
    if (newMonth > 12) {
        newMonth -= 12;
        d.setYear(d.getYear() + 1);
    }
    d.setMonth(newMonth);
    actualBrowser.storage.local.set({
        "key": JSON.stringify(key)
    });
    actualBrowser.storage.local.set({
        "password": pass
    });
}

/*
* Save data in local storage
*/
function saveLogin() {
    var encryptedPass, values, key, password, message;

    connectionData = actualBrowser.extension.getBackgroundPage().connectionData;
    document.getElementById("loginMessage").innerHTML = "";
    password = document.getElementById("password").value;

    // Check if inputs are in the correct format
    values = {
        "engineHostname": document.getElementById("engineHostname").value.replace('https://', ''),
        "username": document.getElementById("username").value
    };

    // Check if inputs are not null
    if (values.engineHostname === null || values.engineHostname === undefined || values.engineHostname === "") {
        document.getElementById("loginMessage").innerHTML = strings.enterHostname;
        document.getElementById("loginMessage").classList = "errorMessage";
        return;
    }
    if (values.username === null || values.username === undefined || values.username === "") {
        document.getElementById("loginMessage").innerHTML = strings.enterUsername;
        document.getElementById("loginMessage").classList = "errorMessage";
        return;
    }

    if (password === null || password === undefined || password === "") {
        document.getElementById("loginMessage").innerHTML = strings.enterPassword;
        document.getElementById("loginMessage").classList = "errorMessage";
        return;
    }

    try {
        connectionData = undefined;
        if (connectionData === undefined || connectionData === null || connectionData.engineHostname !== values.engineHostname || connectionData.username !== values.username || decryptString(connectionData.key, connectionData.password) !== password) {
            key = getGoodEncryptionKey(password);
            encryptedPass = encryptString(key, password);
            savePassword(key, encryptString(key, password));

            actualBrowser.runtime.sendMessage({data: JSON.stringify([]), subject: "deviceOptions"});

            message = {
                "engineHostname": values.engineHostname,
                "username": values.username,
                "password": encryptedPass,
                "key": key
            };
            //connectionData = message;
            actualBrowser.runtime.sendMessage({ data: message, subject: "connected" });
            document.getElementById("loginMessage").innerHTML = strings.tryConnection;
            document.getElementById("loginMessage").classList = "";

            document.getElementById("signIn").setAttribute("disabled", true);

            document.getElementById("username").setAttribute("disabled", true);
            document.getElementById("password").setAttribute("disabled", true);
        }
    } catch (e) { console.log(e); }

}

/*
* Use to remove all the device info at once
*/
function removeAllDeviceInfo() {
    savedDeviceOptions = [];
    actualBrowser.storage.local.set({"deviceOptions": []});
    actualBrowser.runtime.sendMessage({data: JSON.stringify([]), subject: "deviceOptions"});
    document.getElementById('deviceInfoList').getElementsByTagName('tbody')[0].innerHTML = "";
    document.getElementById("deviceInfoList").style.display = "none";
    document.getElementById("deviceInfoMessage").innerHTML = "";
}

/*
* Remove all the url from the whitelist and clear the table tbody
*/
function removeAllWhitelistUrl() {
    savedWhitelistedURL = [];
    actualBrowser.storage.local.set({"whitelist": savedWhitelistedURL});
    actualBrowser.runtime.sendMessage({data: JSON.stringify(savedWhitelistedURL), subject: "whitelist"});
}

/*
* Get the scores list from a score tree list
* @param root The score root
* @param treeList The score tree list where to get scores
*/
function getScoreList(root, treeList) {
    var i, tempScores;
    tempScores = [];
    for (i = 0; i < treeList.length; i += 1) {
        tempScores.push(root + "/" + treeList[i].scoreName);
        if (treeList[i].children) { tempScores = tempScores.concat(getScoreList(root, treeList[i].children)); }
    }
    return tempScores;
}

/*
* Read the content of the config file
* @param jsonData The json object get from the file
*/
function readConfigFile(jsonData) {
    var i, j, finderHostname, engineHostname, deviceOptionsToAdd, keys, tempScores;
    // Check if the finder data are present and valid (not empty or null)
    if (jsonData.finderHost !== "" && jsonData.finderHost !== null && jsonData.finderHost !== undefined) {
        if (jsonData.finderPort !== "" && jsonData.finderPort !== null && jsonData.finderPort !== undefined) {
            finderHostname = jsonData.finderHost + ":" + jsonData.finderPort;
            document.getElementById("finderHostname").value = finderHostname.trim();
            saveFinderOptions();
        }
    }
    // Check if Engine login data are present and valid (not empty or null)
    if (jsonData.engineHostname !== null && jsonData.engineHostname !== undefined && jsonData.engineHostname !== "") {
        engineHostname = document.getElementById("engineHostname").value;
        if (engineHostname === null || engineHostname === "") {
            document.getElementById("engineHostname").value = jsonData.engineHostname;
            actualBrowser.storage.local.set({ "engineHostname": jsonData.engineHostname });
        }
    }

    // Check if the whitelist is present and valid (not empty or null)
    if (jsonData.whitelist !== undefined && jsonData.whitelist !== null && jsonData.whitelist !== "") {
        for (i = 0; i < jsonData.whitelist.length; i += 1) {
            if (!savedWhitelistedURL.includes(jsonData.whitelist[i])) { savedWhitelistedURL.push(jsonData.whitelist[i]); }
        }
        savedWhitelistedURL.sort();
        actualBrowser.storage.local.set({"whitelist": savedWhitelistedURL});
        actualBrowser.runtime.sendMessage({data: JSON.stringify(savedWhitelistedURL), subject: "whitelist"});
    }

    // Check if device infos present and valid
    if (jsonData.deviceOptions !== undefined && jsonData.deviceOptions !== null && jsonData.deviceOptions !== "") {
        deviceOptionsToAdd = [];
        for (i = 0; i < jsonData.deviceOptions.length; i += 1) {
            if (!savedDeviceOptions.includes(jsonData.deviceOptions[i])) { deviceOptionsToAdd.push(jsonData.deviceOptions[i]); }
        }

        for (i = 0; i < deviceOptionsToAdd.length; i += 1) { addDeviceInfo([deviceOptionsToAdd[i]]); }
    }

    if (jsonData.scoreTreeList !== undefined && jsonData.scoreTreeList !== null && jsonData.scoreTreeList !== "") {
        keys = Object.keys(jsonData.scoreTreeList);
        for (i = 0; i < keys.length; i += 1) {
            if (!Object.keys(savedScoreTreeList).includes(keys[i])) {
                savedScoreTreeList[keys[i]] = jsonData.scoreTreeList[keys[i]];
                tempScores = getScoreList(keys[i], jsonData.scoreTreeList[keys[i]].scores);
                for (j = 0; j < tempScores.length; j += 1) { checkIfScoreExist(tempScores[j], false); }
                checkIfScoreExist(jsonData.scoreTreeList[keys[i]].overall, false);
                addDeviceScoreToTable(keys[i]);
            }
        }
        actualBrowser.storage.local.set({"scoreTreeList": savedScoreTreeList});
        actualBrowser.runtime.sendMessage({data: JSON.stringify(savedScoreTreeList), subject: "scoreTreeList"});
        document.getElementById('scoreFileMessage').innerHTML = strings.scoreFileLoaded;
    }

    document.getElementById("configFileMessage").innerHTML = strings.configurationFileLoaded;
}

/*
* Use to load the config from file input
*/
function loadConfigFile() {
    var file, reader, jsonData;

    if (document.getElementById("localConfigFile").files.length === 0) {
        document.getElementById('localConfigFile').click();
    } else {
        file = document.getElementById("localConfigFile").files[0];
        if (file === null || file === undefined) {
            document.getElementById("configFileMessage").innerHTML = strings.selectFile;
            return;
        }

        try {
            reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function () {
                try {
                    jsonData = JSON.parse(reader.result);
                    readConfigFile(jsonData);
                } catch (e) { document.getElementById("configFileMessage").innerHTML = strings.selectValideJSONFile; }
            };
        } catch (e) { document.getElementById("configFileMessage").innerHTML = strings.errorWhileReading; }

        document.getElementById('localConfigFile').value = "";
    }
}

/*
*
*/
function logout() {
    actualBrowser.runtime.sendMessage({subject: "logout"});
    document.getElementById("loginMessage").innerHTML = "";
    document.getElementById("signIn").style.display = "block";
    document.getElementById("signOut").style.display = "none";
    document.getElementById("username").removeAttribute("disabled");
    document.getElementById("password").removeAttribute("disabled");

    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
}

/*
* The main function to execute when the DOM is loaded
*/
function main() {
    var dataToGet, i, keys;

    actualBrowserName = checkBrowser();
    actualBrowser = new BrowserAdapter(actualBrowserName);
    // Set all the button events
    document.getElementById('signIn').addEventListener('click', saveLogin, false);
    document.getElementById('signOut').addEventListener('click', logout, false);
    document.getElementById('createConfigFile').addEventListener('click', createConfigFile, false);
    document.getElementById('loadConfigFile').addEventListener('click', loadConfigFile, false);
    document.getElementById('addDeviceInfo').addEventListener('click', function () { addDeviceInfo([document.getElementById("deviceInfo").value]); }, false);
    document.getElementById('loadScoreFile').addEventListener('click', loadScoreFile, false);
    document.getElementById('deleteProperty').addEventListener('click', removeDeviceInfo, false);
    document.getElementById('upProperty').addEventListener('click', upDeviceInfo, false);
    document.getElementById('downProperty').addEventListener('click', downDeviceInfo, false);

    document.getElementById('deleteScore').addEventListener('click', removeDeviceScore, false);
    document.getElementById('upScore').addEventListener('click', upDeviceScore, false);
    document.getElementById('downScore').addEventListener('click', downDeviceScore, false);

    document.getElementById('finderHostname').addEventListener('blur', saveFinderOptions, false);
    document.getElementById('engineHostname').addEventListener('input', function () {
        if (actualBrowser.extension.getBackgroundPage().connected) {
            if (this.value === connectionData.engineHostname) {
                document.getElementById("signIn").style.display = "none";
            } else {
                document.getElementById("signIn").style.display = "block";
            }
        }
    }, false);
    document.getElementById('scoreFile').addEventListener('change', loadScoreFile, false);
    document.getElementById('localConfigFile').addEventListener('change', loadConfigFile, false);

    document.getElementsByTagName('body')[0].addEventListener('keypress', function (e) {
        if (e.keyCode === 13 && e.target.nodeName === "INPUT") {
            switch (e.target.id) {
            case "deviceInfo":
                addDeviceInfo([document.getElementById("deviceInfo").value]);
                break;
            case "password":
                saveLogin();
                break;
            default:
                break;
            }
        }
    }, false);

    // Load and display saved data
    actualBrowser.storage.local.get(["engineHostname"], function (data) {
        if (data.engineHostname !== undefined && data.engineHostname !== null && data.engineHostname !== "") { document.getElementById("engineHostname").value = data.engineHostname; }
    });

    if (actualBrowser.extension.getBackgroundPage().connected) {
        connectionData = actualBrowser.extension.getBackgroundPage().connectionData;
        dataToGet = ["password", "key", "username"];
        actualBrowser.storage.local.get(dataToGet, function (data) {
            try {
                document.getElementById("password").value = decryptString(data.key, data.password);
                document.getElementById("username").value = data.username;
            } catch (ignore) { }
        });
    }

    actualBrowser.storage.local.get(["finderHost", "finderPort"], function (data) {
        if (data.finderPort !== undefined && data.finderPort !== null && data.finderPort !== "") {
            if (data.finderPort === "443") {
                document.getElementById("finderHostname").value = data.finderHost;
            } else {
                document.getElementById("finderHostname").value = (data.finderHost + ":" + data.finderPort);
            }
        }
    });

    savedScores = actualBrowser.extension.getBackgroundPage().scoreList;
    savedPayloads = actualBrowser.extension.getBackgroundPage().payloadList;
    savedWhitelistedURL = actualBrowser.extension.getBackgroundPage().whitelist;
    savedDeviceOptions = actualBrowser.extension.getBackgroundPage().deviceOptions;
    savedScoreTreeList = actualBrowser.extension.getBackgroundPage().scoreTreeList;

    if (savedScores === null || savedScores === undefined) { savedScores = []; }
    if (savedPayloads === null || savedPayloads === undefined) { savedPayloads = []; }
    if (savedWhitelistedURL === null || savedWhitelistedURL === undefined) { savedWhitelistedURL = []; }
    if (savedDeviceOptions === null || savedDeviceOptions === undefined) { savedDeviceOptions = []; }
    if (savedScoreTreeList === null || savedScoreTreeList === undefined) { savedScoreTreeList = {}; }

    keys = Object.keys(savedScoreTreeList);
    for (i = 0; i < keys.length; i += 1) { addDeviceScoreToTable(keys[i]); }
    setEmptyRows("deviceScoreList");

    if (savedScores !== actualBrowser.extension.getBackgroundPage().scoreList) {
        actualBrowser.storage.local.set({"scores": savedScores});
        actualBrowser.runtime.sendMessage({data: JSON.stringify(savedScores), subject: "scores"});
    }

    if (savedDeviceOptions.length !== 0) { savedDeviceOptions.forEach(function (data) { addDeviceInfoToTable(data); }); }
    if (actualBrowser.extension.getBackgroundPage().connected) {
        document.getElementById("signIn").style.display = "none";
        document.getElementById("username").setAttribute("disabled", true);
        document.getElementById("password").setAttribute("disabled", true);
    } else {
        document.getElementById("signOut").style.display = "none";
    }

    actualBrowser.runtime.onMessage.addListener(
        function (request, sender) {
            var extensionId, link;
            // Make sure the sender is the plugin him-self
            if (actualBrowserName === "Firefox") {
                extensionId = sender.extensionId;
            } else {
                extensionId = sender.id;
            }

            if (actualBrowser.runtime.id === extensionId) {
                if (request.subject === "credentialsState") {
                    if (request.data) {
                        document.getElementById("loginMessage").innerHTML = strings.validCredentials;
                        document.getElementById("signIn").style.display = "none";
                        document.getElementById("signOut").style.display = "block";
                        document.getElementById("signIn").removeAttribute("disabled");
                        document.getElementById("username").setAttribute("disabled", true);
                        document.getElementById("password").setAttribute("disabled", true);
                        connectionData = actualBrowser.extension.getBackgroundPage().connectionData;
                    } else {
                        if (request.certError) {
                            link = "https://" + actualBrowser.extension.getBackgroundPage().connectionData.engineHostname;
                            link = '<a href="' + link + '">Click here</a>';
                            document.getElementById("loginMessage").innerHTML = strings.invalidCertificate + link;
                        } else if (request.notfound) {
                            document.getElementById("loginMessage").innerHTML = strings.badHostname;
                        } else {
                            document.getElementById("loginMessage").innerHTML = strings.invalidCredentials;
                        }
                        actualBrowser.extension.getBackgroundPage().connected = false;
                        actualBrowser.storage.local.remove(["username", "password", "key"]);
                        document.getElementById("loginMessage").classList = "errorMessage";
                        document.getElementById("signOut").style.display = "none";
                        document.getElementById("signIn").style.display = "block";
                        document.getElementById("signIn").removeAttribute("disabled");
                        document.getElementById("username").removeAttribute("disabled");
                        document.getElementById("password").removeAttribute("disabled");
                        document.getElementById("password").value = "";
                        document.getElementById("password").focus();
                    }
                }
            }
        }
    );
}

window.onload = function () {
    savedScoreTreeList = {};

    main();
};
