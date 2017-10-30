/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node: true*/
/*jslint nomen: true*/
/*global btoa, X2JS*/
/*global BrowserAdapter, checkBrowser, decryptString, getDevicesList, getDeviceData*/
/*global createPopupTab, createFinderLink, sortDevicesList, setContextMenu*/
/*global isUrlAuthorized, isUrlRefused*/
"use strict";

var strings, connectionData, scoreList, whitelist, payloadList, q, mainURL, finderOptions, deviceFoundStyle, actualBrowser, actualBrowserName, deviceOptions, tabLis, availableDevices, scoreTreeList, connected, className, refusedUrls, scriptsToAdd, imported;

var deviceOptions = [];
var tabList = [];
var availableDevices = [];
var scoreTreeList = {};
var connected = false;
var className = "BOX985334b4-a808-4abc-b4e3-f34b83a747fe"; // Use this to prevent class name conflicts
var scriptsToAdd = ["../src/aes.js", "../src/jsaes.js", "../src/browserAdapter.js", "../src/xml2json.min.js", "../src/nexthink.js"];
var strings = {
    connected: "Connected to ",
    notConnected: "Could not connect to ",
    logout: "Disconnected"
};

/*
* Scan the selected tab for device name
* @param tabID The id of the tab to scan
* @param insertMutation Boolean to incate if the mutation scipt must be insert (only 1 time per url to prevent performance issue)
*/
function scanPage(tabID, insertMutation) {
    actualBrowser.tabs.get(tabID, function (tab) {
        try {
            if (isUrlAuthorized(tab.url, whitelist)) {
                actualBrowser.tabs.executeScript(tabID, { file: 'background/getContent.js' });
                if (insertMutation) { actualBrowser.tabs.executeScript(tabID, { file: 'background/mutation.js' }); }
            }
        } catch (ignore) { }
    });
}

/*
* Set the icon state
* @param enabled Indicates the state of the icon (disabled/enabled)
*/
function setBrowserActionIcon(enabled, tabId) {
    var iconPath;
    if (enabled) {
        iconPath = "../img/icon_48.png";
    } else {
        iconPath = "../img/icon_disabled_48.png";
    }
    if (tabId) {
        actualBrowser.browserAction.setIcon({ path: iconPath, tabId: tabId });
    } else {
        actualBrowser.browserAction.setIcon({ path: iconPath });
    }
}

function setBrowserActionText(text, tabId) {
    actualBrowser.browserAction.setBadgeBackgroundColor({color: "#7D9BC1"});
    if (tabId) {
        actualBrowser.browserAction.setBadgeText({ text: text, tabId: tabId });
    } else {
        actualBrowser.browserAction.setBadgeText({ text: text });
    }
}

function saveWhitelist(whitelistedUrl) {
    actualBrowser.storage.local.get("whitelist", function (data) {
        if (data.whitelist !== whitelist) {
            actualBrowser.storage.local.set({"whitelist": whitelist.sort()});
        }
    });

    actualBrowser.tabs.query({ },
        function (tabsArray) {
            var j, tabUrl;
            for (j = 0; j < tabsArray.length; j += 1) {
                tabUrl  = tabsArray[j].url.split("//")[1].split("/")[0].split(":")[0].replace("www.", "");
                if (tabUrl.indexOf(whitelistedUrl) === 0) {
                    setBrowserActionText("", tabsArray[j].id);
                    setBrowserActionIcon(false, tabsArray[j].id);
                }
            }
        }
        );
}

/*
* Add the selected url to the whitelist and save it.
* @param whitelistedUrl
*/
function addToWhitelist() {
    actualBrowser.tabs.query({ active: true, windowId: actualBrowser.windows.WINDOW_ID_CURRENT },
        function (tabsArray) {
            var tab, filePath, whitelistedUrl;
            tab = tabsArray[0];
            if (tab.url.indexOf("file:///") !== -1) {
                filePath = tab.url.split("///")[1];
                whitelistedUrl = filePath.substring(0, filePath.lastIndexOf("/"));
            } else { whitelistedUrl = tab.url.split("//")[1].split("/")[0].split(":")[0].replace("www.", ""); }

            if (whitelistedUrl.length !== 0) {
                setContextMenu(true);
                setBrowserActionText("", tab.id);
                setBrowserActionIcon(true, tab.id);
                scanPage(tab.id, true);

                if (!whitelist.includes(whitelistedUrl)) {
                    whitelist.push(whitelistedUrl);
                    whitelist = whitelist.sort();
                }

                saveWhitelist(whitelistedUrl);
            }
        }
        );
}

/*
 * Remove the current tab url from the whitelist
 */
function removeFromWhitelist() {
    actualBrowser.tabs.query({
        active: true,
        windowId: actualBrowser.windows.WINDOW_ID_CURRENT
    },
        function (tabsArray) {
            var tab, filePath, whitelistedUrl, whitelistedUrlIndex;
            tab = tabsArray[0];
            if (tab.url.indexOf("file:///") !== -1) {
                filePath = tab.url.split("///")[1];
                whitelistedUrl = filePath.substring(0, filePath.lastIndexOf("/"));
            } else {
                whitelistedUrl = tab.url.split("//")[1].split("/")[0].split(":")[0].replace("www.", "");
            }

            whitelistedUrlIndex = whitelist.indexOf(whitelistedUrl);
            if (whitelistedUrlIndex !== -1) {
                whitelist.splice(whitelistedUrlIndex, 1);
                setContextMenu(false);
                setBrowserActionText("", tab.id);
                setBrowserActionIcon(false, tab.id);

                saveWhitelist(whitelistedUrl);
            }
        }
        );
}

/*
* Set the context menu used when clicking on the browser action icon
* @param inWhitelist Indicates if the url is in whitelist or not, can be undefined
*/
function setContextMenu(inWhitelist) {
    actualBrowser.contextMenus.removeAll();
    if (!connected) {
        actualBrowser.contextMenus.create({
            title: "Sign in",
            contexts: ["browser_action"],
            onclick: function () { actualBrowser.tabs.create({url: actualBrowser.extension.getURL("options.html")}); }
        });
    } else {
        if (inWhitelist !== undefined) {
            if (inWhitelist) {
                actualBrowser.contextMenus.create({
                    type: "checkbox",
                    checked: true,
                    title: "Enable on this site",
                    contexts: ["browser_action"],
                    onclick: function () { removeFromWhitelist(); }
                });
            } else {
                actualBrowser.contextMenus.create({
                    type: "checkbox",
                    checked: false,
                    title: "Enable on this site",
                    contexts: ["browser_action"],
                    onclick: function () { addToWhitelist(); }
                });
            }
        }
    }

    actualBrowser.contextMenus.create({
        title: "Open Nexthink Finder",
        contexts: ["browser_action"],
        onclick: function () {
            actualBrowser.tabs.update({url: "nxt://New-NxFinder"});
        }
    });

    if (actualBrowserName !== "Chrome") {
        actualBrowser.contextMenus.create({
            title: "Options",
            contexts: ["browser_action"],
            onclick: function () { actualBrowser.tabs.create({url: actualBrowser.extension.getURL("options.html")}); }
        });
    }
}

/*
* Create the popup for all the devices found
* @param devicesData An array of array with the device and their data, [deviceName,[data]]
* @param sendToPopup Boolean indicates if the created popup have to be send to popup or to the tab
* @param tabID The id of the tab where the devices are
*/
function setDevicesPopup(devicesData, sendToPopup, tabID) {
    var deviceTables, i, styles;
    try { devicesData = JSON.parse(devicesData); } catch (ignore) {}

     // Convert JSON string to JSON object
    deviceTables = [];
    for (i = 0; i < devicesData.length; i += 1) {
        deviceTables.push(createPopupTab(devicesData[i], scoreTreeList, deviceOptions, finderOptions));
    }

    if (sendToPopup) {
        actualBrowser.runtime.sendMessage({data: JSON.stringify(deviceTables), subject: "devicesPopup"});
    }

    styles = "";
    try { if (deviceFoundStyle.bold) { styles += " bold"; } } catch (ignore) {}
    try { if (deviceFoundStyle.underline) { styles += " underline"; } } catch (ignore) {}
    try { if (deviceFoundStyle.italic) { styles += " italic"; } } catch (ignore) {}

    if (tabID !== null && tabID !== undefined) {
        try {
            actualBrowser.tabs.executeScript(tabID,
                {
                    code: "var finderLink=" + finderOptions.showFinderLink + " ;var className=`" + className + "`; var deviceTables=" + JSON.stringify(deviceTables) + "; var styles=`" + styles + "`;"
                }, function () {
                    actualBrowser.tabs.executeScript(tabID, {file: "inject/box.js"}, function () { actualBrowser.tabs.executeScript(tabID, {file: "background/insert.js"}); });
                });
        } catch (ignore) {}
    }

}

/*
* Add the devices data to the tabList.
* @param devices All the devices with their data
* @param tabID The id of the tab where the devices are
* @param deviceName Contains the array of device name, use only when the data need to be simply add
*/
function addDevicesToList(devices, tabID, deviceName) {
    var foundTab = false, i = 0, j = 0, actualDevice, indexOfDevice;

    for (i = 0; i < tabList.length; i += 1) {
        if (tabList[i].tabID === tabID) {
            foundTab = true;
            for (j = tabList[i].devices.length - 1; j >= 0; j -= 1) {
                actualDevice = tabList[i].devices[j].name;
                indexOfDevice = deviceName.indexOf(actualDevice);
                if (indexOfDevice !== -1) { tabList[i].devices.splice(j, 1); }
            }
            tabList[i].devices = sortDevicesList(tabList[i].devices.concat(devices));
            break;
        }
    }
    if (!foundTab) { tabList.push({"tabID": tabID, devices: devices}); }

    // Set the badge text with the number of devices for this tab
    actualBrowser.tabs.query({ active: true, windowId: actualBrowser.windows.WINDOW_ID_CURRENT },
        function (tabsArray) {
            var tab;
            tab = tabsArray[0];
            if (tab.id === tabID) {
                setBrowserActionText(String(tabList[i].devices.length), tab.id);
                setContextMenu(true);
            }
        }
        );
}

/*
* Add the devices data to the tabList.
*/
function checkConnectionWithEngine() {
    setContextMenu();
    if (connectionData !== null && connectionData !== undefined) {
        // Create a simple query
        mainURL = "https://" + connectionData.engineHostname + "/2/query";
        var parameters = "format=json", log = [connectionData.username, decryptString(connectionData.key, connectionData.password)];

        getDevicesList(mainURL, log, parameters).then(function (xhttpData) {
            if (xhttpData.status === 200) {
                var jsonDeviceList = JSON.parse(xhttpData.responseText), i = 0;

                for (i = 0; i < jsonDeviceList.length; i += 1) { availableDevices.push(jsonDeviceList[i].name); }

                actualBrowser.storage.local.get("scores", function (data) {
                    if (data.scores !== null && data.scores !== undefined) { scoreList = data.scores; } else { scoreList = []; }
                });

                actualBrowser.storage.local.get("payloads", function (data) {
                    if (data.payloads !== null && data.payloads !== undefined) { payloadList = data.payloads; } else { payloadList = []; }
                });

                actualBrowser.storage.local.get("whitelist", function (data) {
                    if (data.whitelist !== null && data.whitelist !== undefined) { whitelist = data.whitelist; } else { whitelist = []; }
                });

                actualBrowser.storage.local.get("scoreTreeList", function (data) {
                    if (data.scoreTreeList !== null && data.scoreTreeList !== undefined) { scoreTreeList = data.scoreTreeList; } else { scoreTreeList = {}; }
                });

                connected = true;
                actualBrowser.notifications.create(
                    "NXTP_Connect",
                    {
                        type: "basic",
                        title: "Nexthink Plugin",
                        message: strings.connected + connectionData.engineHostname,
                        iconUrl: "img/icon_128.png"
                    }
                );
                setContextMenu();
                actualBrowser.runtime.sendMessage({data: true, subject: "credentialsState"});

            } else {
                setContextMenu();
                actualBrowser.runtime.sendMessage({data: false, subject: "credentialsState"});
                actualBrowser.notifications.create(
                    "NXTP_Connect_Error",
                    {
                        type: "basic",
                        title: "Nexthink Plugin",
                        message: strings.notConnected + connectionData.engineHostname,
                        iconUrl: "img/icon_128.png"
                    }
                );
            }
        });
    } else {
        actualBrowser.storage.local.get(["engineHostname", "username", "password", "key"], function (data) {
            var dataComplete = true, keys = Object.keys(data);
            if (keys.length === 1 && keys.includes("engineHostname")) {
                dataComplete = false;
            }
            if (keys.length === 0) {
                dataComplete = false;
            } else {
                keys.forEach(function (entry) {
                    if (data[entry] === null || data[entry] === "" || data[entry] === undefined) { dataComplete = false; }
                });
            }
            if (dataComplete) {
                data.key = JSON.parse(data.key[0]);
                connectionData = data;
                checkConnectionWithEngine();
            }
        });
        tabList = [];
    }

    finderOptions = {};

    ["showFinderLink", "finderHost", "finderPort"].forEach(function (entry) {
        actualBrowser.storage.local.get([entry], function (data) {
            finderOptions[entry] = data[entry];
        });
    });

    deviceFoundStyle = {bold: false, underline: true, italic: false};
    ["bold", "underline", "italic"].forEach(function (entry) {
        actualBrowser.storage.local.get([entry], function (data) {
            if (data[entry] !== null && data[entry] !== "" && data[entry] !== undefined) { deviceFoundStyle[entry] = data[entry]; }
        });
    });

    actualBrowser.storage.local.get("deviceOptions", function (data) {
        if (data.deviceOptions !== null && data.deviceOptions !== "" && data.deviceOptions !== undefined) { deviceOptions = data.deviceOptions; }
    });
}

/*
* Get the data of all the specified devices
* @param devices The devices name to get data
* @param tabID The id of the tab where the devices are
* @param fullPage Boolean to indicate if the content is about the whole page or just mutation
*/
function getDevicesData(devices, tabID, fullPage) {
    var finalScoreList, log;
    finalScoreList = scoreList.concat(payloadList);

    log = [connectionData.username, decryptString(connectionData.key, connectionData.password)];
    getDeviceData(mainURL, log, devices, deviceOptions, finalScoreList, "format=xml&hr=true").then(function (xhttpData) {
        if (xhttpData.status === 200) {
            var devicesGet, header, j, jsonObj, k, key, keys, keyValue, nbDevices, rawDevices, x2js;

            x2js = new X2JS();
            jsonObj = x2js.xml_str2json(xhttpData.responseText);
            header = jsonObj.table.header;
            rawDevices = jsonObj.table.body.r;
            devicesGet = [];
            nbDevices = 0;

            if (rawDevices.length !== null && rawDevices.length !== undefined) {
                nbDevices = rawDevices.length;
                for (j = 0; j < rawDevices.length; j += 1) { devicesGet.push({}); }
            } else {
                nbDevices = 1;
                devicesGet.push({});
            }

            keys = Object.keys(header);
            for (j = 0; j < keys.length; j += 1) {
                key = keys[j];
                keyValue = header[key].__text;
                for (k = 0; k < nbDevices; k += 1) {
                    if (rawDevices.length) { devicesGet[k][keyValue] = rawDevices[k][key]; } else { devicesGet[k][keyValue] = rawDevices[key]; }
                }
            }
            setDevicesPopup(JSON.stringify(devicesGet), fullPage, tabID);
            addDevicesToList(devicesGet, tabID, devices);
        }
    });
}

/*
* Log out from Engine, also erase temporary connection data
*/
function logout() {
    actualBrowser.storage.local.get("reloadWhenlogout", function (data) {
        var i;
        if (data.reloadWhenlogout) {
            for (i = 0; i < tabList.length; i += 1) { actualBrowser.tabs.reload(tabList[i].tabID); }
        }
        tabList = [];
    });
    actualBrowser.storage.local.remove(["username", "password", "key"]);
    connected = false;
    connectionData = {};
    mainURL = null;
    actualBrowser.notifications.create(
        "NXTP_Connect_Error",
        {
            type: "basic",
            title: "Nexthink Plugin",
            message: strings.logout,
            iconUrl: "img/icon_128.png"
        }
    );
    setContextMenu();
    setBrowserActionIcon(false);
    setBrowserActionText("");
}

/*
* First check all the word in the page and see if they can be a hostname (regex)
* and then try to find them in Engine database.
* @param content Contain the tab html (innerText)
* @param tabID Contain the id of the tab where the content come
* @param fullPage Boolean to indicate if the content is about the whole page or just mutation
*/
function readContent(content, tabID, fullPage) {
    try {
        actualBrowser.tabs.query({ active: true, windowId: actualBrowser.windows.WINDOW_ID_CURRENT },
            function (tabsArray) {
                var tab, regex, devices;
                devices = [];
                tab = tabsArray[0];

                if (tab !== null && tab !== undefined) {
                    if (isUrlAuthorized(tab.url, whitelist)) {
                        regex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$/;

                        content.forEach(function (content) {
                            if (regex.test(content.trim()) && availableDevices.includes(content.trim())) { devices.push(content.trim()); }
                        });

                        devices = devices.filter(function (el, i, arr) { return arr.indexOf(el) === i; });

                        if (devices.length !== 0) {
                            getDevicesData(devices, tabID, fullPage);
                        } else if (fullPage) {
                            // Set the badge text with the number of devices for this tab
                            if (tab.id === tabID) { actualBrowser.runtime.sendMessage({data: JSON.stringify([]), subject: "devicesPopup"}); }
                        }
                    }
                }
            }
            );
    } catch (ignore) {}

}

/*
* Open a new tab with the device information (same as saved)
* @param deviceName The device to search
*/
function searchDevice(deviceName) {
    if (connected) {
        var tempURL = actualBrowser.extension.getURL("search/search.html") + "?search=" + encodeURIComponent(deviceName);
        actualBrowser.tabs.create({url: tempURL});
    } else { alert("You must be connected to Engine before searching a device."); }
}

/*
* Define the different listener (onMessage, tabs.onActivated, etc.)
*/
function setListener() {
    actualBrowser.browserAction.onClicked.addListener(function () {
        actualBrowser.tabs.query({ active: true, windowId: actualBrowser.windows.WINDOW_ID_CURRENT },
            function (tabsArray) {
                if (!connected) {
                    if (tabsArray[0].url !== actualBrowser.extension.getURL("options.html")) {
                        actualBrowser.tabs.create({url: actualBrowser.extension.getURL("options.html")});
                    }
                } else {
                    if (!isUrlRefused(tabsArray[0].url)) {
                        if (isUrlAuthorized(tabsArray[0].url, whitelist)) {
                            removeFromWhitelist();
                        } else {
                            addToWhitelist();
                        }
                    }
                }
            }
            );

    });

    // Called when the user clicks on the browser action.
    actualBrowser.tabs.onActivated.addListener(function (tab) {
        actualBrowser.tabs.query({ active: true, windowId: actualBrowser.windows.WINDOW_ID_CURRENT },
            function (tabsArray) {
                tab = tabsArray[0];
                setBrowserActionText("", tab.id);
                // Check if the plugin is connected and the actual url is allowed
                if (connected) {
                    if (isUrlRefused(tab.url)) {
                        setBrowserActionText("", tab.id);
                        setBrowserActionIcon(false, tab.id);
                        setContextMenu();
                    } else {
                        if (isUrlAuthorized(tab.url, whitelist)) {
                            setBrowserActionIcon(true, tab.id);
                            var addTab, i, numberOfDevice, tabData;
                            addTab = true;
                            for (i = 0; i < tabList.length; i += 1) {
                                if (tabList[i].tabID === tab.id) {
                                    // Set the number of device in the badge text
                                    addTab = false;
                                    numberOfDevice = tabList[i].devices.length;
                                    if (numberOfDevice !== 0) {
                                        setBrowserActionText(String(numberOfDevice), tab.id);
                                    }
                                    break;
                                }
                            }

                            // If the tab not already exist
                            if (addTab) {
                                tabData = {"tabID": tab.id, devices: []};
                                tabList.push(tabData);
                                scanPage(tab.id, true);
                            }

                            setContextMenu(true);
                        } else {
                            // Set the plugin badge color to red, use to indicate to user that the site is not in the whitelist
                            setBrowserActionText("", tab.id);
                            setBrowserActionIcon(false, tab.id);
                            setContextMenu(false);
                        }
                    }
                } else {
                    setBrowserActionText("", tab.id);
                    setBrowserActionIcon(false, tab.id);
                }
            }
            );
    });

    // Event call when a tab is updated
    actualBrowser.tabs.onUpdated.addListener(function (updatedTabID, changeInfo) {
        // Start processing only if the page update is complete and if the plugin is connected to Engine
        if (updatedTabID !== null && connected && changeInfo.status === "complete") {
            actualBrowser.tabs.get(updatedTabID, function (updatedTab) {
                var i;

                if (isUrlAuthorized(updatedTab.url, whitelist)) {
                    // Check in the tab list if the tab exist and remove the devices list if it's the case
                    for (i = 0; i < tabList.length; i += 1) {
                        if (tabList[i].tabID === updatedTabID) {
                            tabList[i].devices = [];
                            break;
                        }
                    }

                    // Remove the badge text only if the updated tab is the same as the actual one
                    actualBrowser.tabs.query({ active: true, windowId: actualBrowser.windows.WINDOW_ID_CURRENT },
                        function (tabsArray) {
                            var tab = tabsArray[0];
                            if (tab.id === updatedTabID) {
                                setBrowserActionText("", tab.id);
                                setBrowserActionIcon(true, tab.id);
                                if (isUrlRefused(tab.url)) { setContextMenu(); } else {
                                    setContextMenu(true);
                                }
                            }
                        }
                        );

                    // Inject the script to get the content of the page
                    scanPage(updatedTabID, true);
                } else {
                    actualBrowser.tabs.query({ active: true, windowId: actualBrowser.windows.WINDOW_ID_CURRENT },
                        function (tabsArray) {
                            var tab = tabsArray[0];
                            if (tab.id === updatedTabID) {
                                setBrowserActionText("", tab.id);
                                setBrowserActionIcon(false, tab.id);
                                if (isUrlRefused(tab.url)) { setContextMenu(); } else {
                                    setContextMenu(false);
                                }
                            }
                        }
                        );
                }
            });
        }
    });

    // Event call when a tab is removed
    actualBrowser.tabs.onRemoved.addListener(function (closedTabID) {
        // If the plugin is connected it will remove the tab information he has
        var i;
        if (connected) {
            for (i = 0; i < tabList.length; i += 1) {
                if (tabList[i].tabID === closedTabID) {
                    tabList.splice(i, 1);
                    break;
                }
            }
        }
    });

    // Event call when the plugin have a message
    actualBrowser.runtime.onMessage.addListener(
        function (request, sender) {
            var extensionId, i;
            // Make sure the sender is the plugin him-self
            if (actualBrowser === "Firefox") {
                extensionId = sender.extensionId;
            } else {
                extensionId = sender.id;
            }

            if (actualBrowser.runtime.id === extensionId) {
                switch (request.subject) {

                case "askDeviceInfo":
                    actualBrowser.runtime.sendMessage(
                        {
                            scores: JSON.stringify(scoreList.concat(payloadList)),
                            options: JSON.stringify(deviceOptions),
                            subject: "getDeviceInfo"
                        }
                    );
                    break;

                case "askDevicePopup":
                    setDevicesPopup(request.data, true);
                    break;

                case "connection":
                    connectionData = request.data;
                    connected = true;
                    mainURL = "https://" + connectionData.engineHostname + "/2/query";
                    break;

                case "connected":
                    connectionData = request.data;
                    connected = true;
                    mainURL = "https://" + connectionData.engineHostname + "/2/query";
                    checkConnectionWithEngine();
                    break;

                case "content":
                    readContent(request.data, sender.tab.id, request.fullPage);
                    break;

                case "deviceList":
                    availableDevices = request.data;
                    break;

                case "devicesPopup":
                    actualBrowser.tabs.query({ active: true, windowId: actualBrowser.windows.WINDOW_ID_CURRENT },
                        function (tabsArray) {
                            var tab, j;
                            tab = tabsArray[0];
                            for (j = 0; j < tabList.length; j += 1) {
                                if (tabList[j].tabID === tab.id) {
                                    setDevicesPopup(tabList[j].devices, true);
                                    break;
                                }
                            }
                        }
                        );
                    break;

                case "deviceOptions":
                    deviceOptions = JSON.parse(request.data);
                    break;

                case "finderOptions":
                    finderOptions = request.data;
                    break;

                case "logout":
                    logout();
                    break;

                case "payload":
                    payloadList = JSON.parse(request.data);
                    break;

                case "pluginOptions":
                    deviceFoundStyle = request.data;
                    break;

                case "rescan":
                    actualBrowser.tabs.query({ active: true, windowId: actualBrowser.windows.WINDOW_ID_CURRENT },
                        function (tabsArray) {
                            var tab, j;
                            tab = tabsArray[0];
                            for (j = 0; j < tabList.length; j += 1) {
                                if (tabList[j].tabID === request.data) {
                                    tabList[j].devices = [];
                                    break;
                                }
                            }
                            if (tab.id === request.data) { setBrowserActionText("", tab.id); }
                            scanPage(request.data, false);
                        }
                        );
                    break;

                case "searchDevice":
                    searchDevice(request.data);
                    break;

                case "scores":
                    scoreList = JSON.parse(request.data);
                    for (i = 0; i < tabList.length; i += 1) { scanPage(tabList[i].tabID, false); }
                    break;

                case "scoreTreeList":
                    scoreTreeList = JSON.parse(request.data);
                    break;

                case "whitelist":
                    whitelist = JSON.parse(request.data);
                    break;

                default:
                    break;
                }
            }
        }
    );

    actualBrowser.omnibox.onInputEntered.addListener(function (text) { searchDevice(text); });
}

actualBrowserName = checkBrowser();
actualBrowser = new BrowserAdapter(actualBrowserName);
setListener();
checkConnectionWithEngine();
