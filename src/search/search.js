/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*jslint nomen: true*/
/*global browser, chrome, X2JS, btoa, decryptString, checkBrowser, BrowserAdapter*/

var connectionData, scores, options, deviceName, actualBrowser, actualBrowserName;
options = [];


/*
* Return the authentification part for any xml request (use to decrypt the password)
*/
function getXMLLogin() {
    "use strict";
    return btoa(connectionData.username + ":" + decryptString(connectionData.key, connectionData.password));
}

/*
* Retrieve get parameter value in url
* @param name The name of the parameter
* @return A string with the value
*/
function getParameterByName(name) {
    "use strict";
    var url, regex, results;
    url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    results = regex.exec(url);

    if (!results) { return null; }
    if (!results[2]) { return ''; }
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/*
* Get the info of the device, with the selected scores and options
* @param deviceName The name of the device to search
*/
function getDeviceInfo(deviceName) {
    "use strict";
    // Generate the select part of the query
    var scoreToGet, startScoreString, deviceInfosToGet, i, devicesWhereClause, query, url, xhttp;
    startScoreString = '#"score:';
    scoreToGet = "";
    scores.forEach(function (data) {
        if (data.indexOf(startScoreString) === -1) { data = startScoreString + data + '"'; }
        data = " " + data;
        scoreToGet += data;
    });

    deviceInfosToGet = "";
    for (i = 0; i < options.length; i += 1) {
        deviceInfosToGet += ' \"' + options[i] + '\"';
    }

    // Create where clause, use to get the data of all the device at once
    devicesWhereClause = '(where device(eq name (string "' + deviceName + '")))';

    // Create the query
    query = '(select (name ' + deviceInfosToGet + ' ' + scoreToGet + ') (from device ' + devicesWhereClause + ') (order_by name asc))';
    // Create a simple query
    url = "https://" + connectionData.engineHostname + "/2/query" + "?format=xml&hr=true&query=" + encodeURIComponent(query);

    // Send request to engine, use to know if the user can access the Web API
    xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            if (this.responseText !== null && this.responseText !== "[]") {
                var x2js, jsonObj, header, rawDevices, devicesGet, keys, j, key, keyValue;
                x2js = new X2JS();
                jsonObj = x2js.xml_str2json(this.responseText);
                header = jsonObj.table.header;
                rawDevices = jsonObj.table.body.r;
                devicesGet = [{}];

                keys = Object.keys(header);
                try {
                    for (j = 0; j < keys.length; j += 1) {
                        key = keys[j];
                        keyValue = header[key].__text;
                        devicesGet[0][keyValue] = rawDevices[key];
                    }

                    actualBrowser.runtime.sendMessage({data: JSON.stringify(devicesGet), subject: "askDevicePopup"});

                } catch (e) {
                    document.getElementById("dataPopup").innerHTML = '<div align="center">No device found</div>';
                }
            }
        } else if (this.readyState === 4 && this.status !== 200) {
            alert("Error while connection to engine");
        }
    };

    xhttp.open("GET", url);
    xhttp.setRequestHeader("Authorization", "Basic " + getXMLLogin());
    xhttp.onerror = function () {
        alert("Error while accessing to engine");
    };

    xhttp.send();
}

/*
* Main function
*/
function main() {
    "use strict";
    deviceName = getParameterByName("search");
    document.getElementById("deviceName").innerHTML = deviceName;

    if (deviceName !== "" && deviceName !== null && deviceName !== undefined) {
        actualBrowser.runtime.sendMessage({subject: "askDeviceInfo"});
    }
}

window.onload = function () {
    "use strict";
    actualBrowserName = checkBrowser();
    actualBrowser = new BrowserAdapter(actualBrowserName);
    // Check if the page receive a message
    actualBrowser.runtime.onMessage.addListener(
        function (request, sender) {
            // Make sure the message come from the plugin
            var extensionId, deviceInfo, links, displayNode, j, data, img, src;
            if (actualBrowser === "Firefox") { extensionId = sender.extensionId; } else { extensionId = sender.id; }

            if (actualBrowser.runtime.id === extensionId) {
                if (request.subject === "getDeviceInfo") {
                    scores = JSON.parse(request.scores);
                    options = JSON.parse(request.options);

                    connectionData = actualBrowser.extension.getBackgroundPage().connectionData;
                    getDeviceInfo(deviceName);
                } else if (request.subject === "devicesPopup") {
                    try {
                        data = JSON.parse(request.data);
                        if (data[0][0] === deviceName) {
                            deviceInfo = JSON.parse(request.data)[0][1];
                            displayNode = document.createElement('div');
                            displayNode.innerHTML = deviceInfo;
                            displayNode = displayNode.childNodes[0];
                            document.getElementById("dataPopup").innerHTML = "";
                            document.getElementById("dataPopup").appendChild(displayNode);

                            links = document.getElementById("dataPopup").querySelector(".tabLinks");
                            for (j = 0; j < links.children.length; j += 1) {
                                links.children[j].onclick = null;
                                links.children[j].addEventListener("click", function (e) {
                                    var tempName, k, tabcontent, tablinks, device, element;
                                    tempName = this.innerHTML.replace(new RegExp(/ /, 'g'), '_').replace(new RegExp(/\:/, 'g'), '').toLowerCase();
                                    device = e.target.parentNode.parentNode.id;
                                    device = device.replace(new RegExp(/\./, 'g'), '\\.');
                                    element = document.querySelector(".dataPopupTab#" + device);
                                    tabcontent = document.getElementsByClassName("dataPopupTabContent");
                                    for (k = 0; k < tabcontent.length; k += 1) {
                                        tabcontent[k].style.display = "none";
                                    }
                                    tablinks = document.getElementsByClassName("dataPopupTablinks");
                                    for (k = 0; k < tablinks.length; k += 1) {
                                        tablinks[k].className = tablinks[k].className.replace(" active", "");
                                    }
                                    element.querySelector("#" + tempName).style.display = "table";
                                    this.className += " active";
                                }, false);
                            }
                            img = document.createElement("img");
                            document.getElementById("dataPopup").appendChild(img);
                            try {
                                src = chrome.runtime.getURL('img/logo.png');
                            } catch (e) {
                                src = browser.runtime.getURL('img/logo.png');
                            }
                            img.src = src;
                            img.height = "13";
                            img.id = "logo";

                            document.getElementById("dataPopup").querySelector("#defaultOpen").click();
                        }
                    } catch (ignore) { }

                }
            }
        }
    );

    main();
};
