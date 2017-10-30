var actualBrowser;

window.onload = function() {
    actualBrowser = CheckBrowser();
    connectionData = BrowserAdapter(actualBrowser).extension.getBackgroundPage().connectionData;
    whitelist = [];

    // Check if the user is plugin is connected to Engine
    if (BrowserAdapter(actualBrowser).extension.getBackgroundPage().connected)
        DisplayConnectedScreen();
    else {
        document.getElementById("addToWhitelist").style.display = "none";
        if (connectionData != null)
            AutoConnect(connectionData);
        else {
            // Try to get data from the local storage
            var loginData = ["engineHostname", "username", "password", "key"];
            BrowserAdapter(actualBrowser).storage.local.get(loginData, function(data) {
                for (var i = 0; i < loginData.length; i++) {
                    if (data[loginData[i]] == "" || data[loginData[i]] == null) {
                        break;
                    }
                }
                try {
                    data["key"] = JSON.parse(data["key"][0]);
                    connectionData = data;
                    AutoConnect(connectionData);
                } catch (e) {}
            });
        }
        GetStoredData();
    }

    // Set on press events
    document.getElementById('connection').addEventListener('click', function() {
        CheckConnectionWithEngine();
    }, false);
    document.getElementById('logout').addEventListener('click', function() {
        Logout();
    }, false);
    document.getElementById('openFinder').addEventListener('click', function() {
        OpenFinder();
    }, false);
    document.getElementById('options').addEventListener('click', function() {
        OpenOptions();
    }, false);
    document.getElementById('rescanPage').addEventListener('click', function() {
        SendRescanMessage();
    }, false);
    document.getElementById('addToWhitelist').addEventListener('click', function() {
        AddToWhitelist();
    }, false);
    document.getElementById('removeFromWhitelist').addEventListener('click', function() {
        RemoveFromWhitelist();
    }, false);
    document.getElementById('exportToCsv').addEventListener('click', function() {
        ExportToCsv();
    }, false);
    document.getElementById('searchDeviceName').addEventListener('click', function() {
        SearchDeviceName();
    }, false);

    document.addEventListener('keypress', PressEnterKey);

    // Check if the page receive a message
    BrowserAdapter(actualBrowser).runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            // Make sure the message come from the plugin
            if (actualBrowser == "Firefox")
                extensionId = sender.extensionId;
            else
                extensionId = sender.id;
            if (BrowserAdapter(actualBrowser).runtime.id === extensionId) {
                // If the device data (formatted) is the message
                if (request["subject"] == "devicesPopup") {
                    try {
                        devices = JSON.parse(request["data"]);
                        var className = BrowserAdapter(actualBrowser).extension.getBackgroundPage().className;

                        // Show the device table
                        document.getElementById("devices").style.display = 'inline-table';

                        // Check is tere is any device data to display
                        if (devices.length != 0) {
                            document.getElementById("exportToCsv").style.display = 'inline-grid';
                            if (devices.length != 1)
                                document.getElementById("devicesTitle").innerText = devices.length + ' devices: ';
                            else
                                document.getElementById("devicesTitle").innerText = 'Device:';
                            var deviceTable = document.getElementById('deviceList').getElementsByTagName('tbody')[0];
                            deviceTable.innerHTML = "";

                            // Insert every devices
                            for (var i = 0; i < devices.length; i++) {
                                var deviceRow = deviceTable.insertRow(deviceTable.rows.length);
                                var deviceNameCell = deviceRow.insertCell(0);
                                var newElement = '<span class=\"' + className + '\">' + devices[i][0] + '<span id="dataPopup">' + devices[i][1] + '</span></span>';
                                deviceNameCell.innerHTML = newElement;
                                var links = deviceNameCell.querySelector(".tabLinks");
                                for (var j = 0; j < links.children.length; j++) {
                                    links.children[j].onclick = null;
                                    var name = links.children[j].innerHTML;
                                    links.children[j].addEventListener("click", function(e) {
                                        var name = this.innerHTML.replace(new RegExp(/ /, 'g'), '_').replace(new RegExp(/\:/, 'g'), '').toLowerCase();
                                        var i, tabcontent, tablinks;
                                        var device = e["target"].parentNode.parentNode.id;
                                        device = device.replace(new RegExp(/\./, 'g'), '\\.');
                                        var element = document.querySelector(".dataPopupTab#" + device);
                                        tabcontent = document.getElementsByClassName("dataPopupTabContent");
                                        for (i = 0; i < tabcontent.length; i++) {
                                            tabcontent[i].style.display = "none";
                                        }
                                        tablinks = document.getElementsByClassName("dataPopupTablinks");
                                        for (i = 0; i < tablinks.length; i++) {
                                            tablinks[i].className = tablinks[i].className.replace(" active", "");
                                        }
                                        element.querySelector("#" + name).style.display = "table";
                                        this.className += " active";
                                    }, false);
                                }
                            }

                            // Add event on click who show/hide the data box
                            var elements = document.querySelectorAll("." + className);
                            for (var i = 0; i < elements.length; i++) {
                                var deviceDisplay = elements[i];
                                deviceDisplay.onclick = function(e) {
                                    try {

                                        var actualElementStyle = e.target.children[0].style.display;
                                        if (actualElementStyle == "block")
                                            e.target.children[0].style.display = "none";
                                        else
                                            e.target.children[0].style.display = "block";
                                        e.target.querySelector("#defaultOpen").click();
                                    } catch (e) {}
                                }
                            }

                            // Add event who open the link in the current tab (in a popup, link does not work correctly)
                            var elements = document.querySelectorAll("#link");
                            for (var i = 0; i < elements.length; i++) {
                                var link = elements[i];
                                link.addEventListener("click", function(e) {
                                    var url = e.srcElement.attributes["href"].value;
                                    BrowserAdapter(actualBrowser).tabs.query({
                                            active: true,
                                            windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT
                                        },
                                        function(tabsArray) {
                                            tab = tabsArray[0];
                                            BrowserAdapter(actualBrowser).tabs.update(tab.id, {
                                                url: url
                                            });
                                        }
                                    );
                                }, false);
                            }
                        } else {
                            // Hide the device list and tell the user there is no deivce on the current tab
                            document.getElementById("deviceList").style.display = 'none';
                            document.getElementById("devicesTitle").innerText = 'No device in this tab';
                            document.getElementById("exportToCsv").style.display = 'none';
                        }
                    } catch (e) {}
                }
            }
        }
    );

    /*
     * Allow the popup page to auto connect with previous login data
     * @param data JSON string, contain connection data (ip, port, login)
     */
    function AutoConnect(data) {
        document.getElementById("engineHostname").value = data["engineHostname"];
        document.getElementById("username").value = data["username"];
        document.getElementById("password").value = DecryptString(data["key"], data["password"]);

        CheckConnectionWithEngine();
    }

    /*
     * Add the current tab url to the whitelist
     */
    function AddToWhitelist() {
        BrowserAdapter(actualBrowser).tabs.query({
                active: true,
                windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT
            },
            function(tabsArray) {
                tab = tabsArray[0];
                // Check if the current url is a file
                if (tab.url.indexOf("file:///") != -1) {
                    var filePath = tab.url.split("///")[1];
                    var whitelistedUrl = filePath.substring(0, filePath.lastIndexOf("/"));
                } else
                    var whitelistedUrl = tab.url.split("//")[1].split("/")[0].split(":")[0].replace("www.", "");

                if (whitelistedUrl.length != 0) {
                    BrowserAdapter(actualBrowser).runtime.sendMessage({
                        data: whitelistedUrl,
                        subject: "addToWhitelist"
                    }, function() {});
                    whitelist.push(whitelistedUrl);
                    BrowserAdapter(actualBrowser).storage.local.set({
                        "whitelist": whitelist
                    });
                    BrowserAdapter(actualBrowser).runtime.sendMessage({
                        data: JSON.stringify(whitelist),
                        subject: "whitelist"
                    }, function() {});
                    document.getElementById("whitelistInfo").style.display = "none";
                    document.getElementById("addToWhitelist").style.display = "none";
                    document.getElementById("removeFromWhitelist").style.display = "block";
                    SendRescanMessage();
                    BrowserAdapter(actualBrowser).browserAction.setBadgeText({
                        text: ""
                    });
                    BrowserAdapter(actualBrowser).browserAction.setBadgeBackgroundColor({
                        color: "#7D9BC1"
                    });
                }
            }
        );
    }

    /*
     * Use to check if the credentials are correct.
     */
    function CheckConnectionWithEngine() {
        document.getElementById("connectionMessage").innerHTML = "";
        document.getElementById("engineMessage").innerHTML = "";
        document.getElementById("loginMessage").innerHTML = "Try to login.";

        engineHostname = document.getElementById("engineHostname").value;
        username = document.getElementById("username").value;
        password = document.getElementById("password").value;

        if (engineHostname == "" || engineHostname == null) {
            document.getElementById("connectionMessage").innerHTML = "Engine hostname";
            return;
        }
        if (username == "" || username == null) {
            document.getElementById("engineMessage").innerHTML = "Please specify your username";
            return;
        }
        if (password == "" || password == null) {
            document.getElementById("engineMessage").innerHTML = "Please specify your password";
            return;
        }

        // Create a simple query
        var query = "(select (name) (from device) (order_by name asc))";
        mainURL = "https://" + engineHostname + "/2/query";
        var url = mainURL + "?format=json&query=" + query;
        var log = [username, password];
        GetDevicesList(mainURL, log, "format=json").then(function(response) {
            var xhttpData = response;
            if (xhttpData.status == 200) {
                console.log(xhttpData);
                BrowserAdapter(actualBrowser).tabs.query({
                        active: true,
                        windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT
                    },
                    function(tabsArray) {
                        tab = tabsArray[0];
                        actualUrl = BrowserAdapter(actualBrowser).extension.getURL("popup/popup.html");
                        if (tab.url != actualUrl)
                            BrowserAdapter(actualBrowser).tabs.reload(tab.id);
                    }
                );

                var deviceCompleteList = [];
                jsonDeviceList = JSON.parse(xhttpData.responseText);

                for (var i = 0; i < jsonDeviceList.length; i++)
                    deviceCompleteList.push(jsonDeviceList[i]["name"]);

                var key = GetGoodEncryptionKey(password);
                var encryptedPass = EncryptString(key, password);

                var message = {
                    "engineHostname": engineHostname,
                    "username": username,
                    "password": encryptedPass,
                    "key": key
                };

                connectionData = message;

                SaveData(message);

                BrowserAdapter(actualBrowser).runtime.sendMessage({
                    data: message,
                    subject: "connection"
                }, function(response) {});
                BrowserAdapter(actualBrowser).runtime.sendMessage({
                    data: deviceCompleteList,
                    subject: "deviceList"
                }, function(response) {});

                BrowserAdapter(actualBrowser).storage.local.get("scores", function(data) {
                    if (data["scores"] != null)
                        var scores = data["scores"];
                    else
                        var scores = [];

                    BrowserAdapter(actualBrowser).runtime.sendMessage({
                        data: JSON.stringify(scores),
                        subject: "scores"
                    }, function(response) {});
                });

                BrowserAdapter(actualBrowser).storage.local.get("whitelist", function(data) {
                    if (data["whitelist"] != null)
                        var whitelist = data["whitelist"];
                    else
                        var whitelist = [];

                    BrowserAdapter(actualBrowser).runtime.sendMessage({
                        data: JSON.stringify(whitelist),
                        subject: "whitelist"
                    }, function(response) {});
                });

                BrowserAdapter(actualBrowser).storage.local.get("scoreTreeList", function(data){
                    if(data["scoreTreeList"]!=null)
                        var tempscoreTreeList = data["scoreTreeList"];
                    else
                        var tempscoreTreeList = {};

                    BrowserAdapter(actualBrowser).runtime.sendMessage({
                        data: JSON.stringify(tempscoreTreeList),
                        subject: "scoreTreeList"
                    }, function(response) {});
                });

                BrowserAdapter(actualBrowser).storage.local.get("payloads", function(data){
                    if(data["payloads"]!=null)
                        var payloads = data["payloads"];
                    else
                        var payloads = [];

                    BrowserAdapter(actualBrowser).runtime.sendMessage({
                        data: JSON.stringify(payloads),
                        subject: "payload"
                    }, function(response) {});
                });

                if (document.getElementById("savePassword").checked)
                    SavePassword(key, encryptedPass);

                DisplayConnectedScreen();
            } else {
                if(this.responseText){ document.getElementById("loginMessage").innerHTML = "Error: " + this.responseText; }
                else { document.getElementById("loginMessage").innerHTML = "Error when loggin"; }
                BrowserAdapter(actualBrowser).notifications.create(
                    "NXTP_Connect_Error",
                    {
                        type: "basic",
                        title: "Nexthink Plugin",
                        message: "Error while connecting to engine",
                        iconUrl: "../img/icon_16.png"
                    },
                    function(){}
                );
            }
        });
    }

    /*
     * Set the elements in the page for connected user
     */
    function DisplayConnectedScreen() {
        var connectionInfo = 'Connected to:</br>' + connectionData["engineHostname"] + " as: " + connectionData["username"];
        try {
            tempScoreList = BrowserAdapter(actualBrowser).extension.getBackgroundPage().scoreList;
            tempDeviceProperties = BrowserAdapter(actualBrowser).extension.getBackgroundPage().deviceOptions;
            if (tempScoreList.length == 0 && tempDeviceProperties.length == 0)
                document.getElementById("noScores").style.display = 'block';
        } catch (e) {}

        document.getElementById("info").innerHTML = connectionInfo;

        document.getElementById("info").style.display = 'block';
        document.getElementById("logout").style.display = 'inline-block';
        document.getElementById("apiConnection").style.display = 'none';
        document.getElementById("password").value = "";

        // Check if actual tab has device
        tabList = BrowserAdapter(actualBrowser).extension.getBackgroundPage().tabList;
        whitelist = BrowserAdapter(actualBrowser).extension.getBackgroundPage().whitelist;

        BrowserAdapter(actualBrowser).tabs.query({
                active: true,
                windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT
            },
            function(tabsArray) {
                tab = tabsArray[0];
                if (tab != null) {
                    try {
                        if (tab.url.indexOf("file:///") != -1) {
                            var filePath = tab.url.split("///")[1];
                            url = filePath.substring(0, filePath.lastIndexOf("/"));
                        } else
                            url = tab.url.split("//")[1].split("/")[0].split(":")[0].replace("www.", "");

                        if (whitelist.length != 0 && !whitelist.includes(url)) {
                            document.getElementById("whitelistInfo").innerHTML = "This url is not in whitelist";
                            document.getElementById("whitelistInfo").style.display = "block";
                            if (CheckIFUrlIsInBlacklist(tab.url)) {
                                document.getElementById("addToWhitelist").style.display = "none";
                                document.getElementById("removeFromWhitelist").style.display = "none";
                            } else {
                                document.getElementById("addToWhitelist").style.display = "block";
                                document.getElementById("removeFromWhitelist").style.display = "none";
                            }
                            return true;
                        }
                        else if (whitelist.length == 0 && !CheckIFUrlIsInBlacklist(tab.url)) {
                            document.getElementById("whitelistInfo").innerHTML = "";
                            document.getElementById("whitelistInfo").style.display = "none";
                            document.getElementById("addToWhitelist").style.display = "block";
                            document.getElementById("removeFromWhitelist").style.display = "none";
                        }
                        else if(!CheckIFUrlIsInBlacklist(tab.url)) {
                            document.getElementById("whitelistInfo").innerHTML = "";
                            document.getElementById("whitelistInfo").style.display = "none";
                            document.getElementById("addToWhitelist").style.display = "none";
                            document.getElementById("removeFromWhitelist").style.display = "block";
                        }
                        else{
                            document.getElementById("whitelistInfo").innerHTML = "";
                            document.getElementById("whitelistInfo").style.display = "none";
                            document.getElementById("addToWhitelist").style.display = "none";
                            document.getElementById("removeFromWhitelist").style.display = "none";
                        }
                    } catch (e) {}



                    // Send message to background for getting the data boxes from the selected devices
                    for (var i = 0; i < tabList.length; i++) {
                        if (tabList[i]["tabID"] === tab.id) {
                            BrowserAdapter(actualBrowser).runtime.sendMessage({
                                data: tabList[i]["devices"],
                                subject: "devicesPopup"
                            }, function() {});
                            return;
                        }
                    }
                }
            }
        );
    }

    /*
     * Check if url is in fix blackList
     */
    function CheckIFUrlIsInBlacklist(url) {
        refusedUrls = BrowserAdapter(actualBrowser).extension.getBackgroundPage().refusedUrls;
        for (var i = 0; i < refusedUrls.length; i++) {
            if (url.indexOf(refusedUrls[i]) !== -1)
                return true;
        }
        return false;
    }

    /*
     * Export the devices list of the current tab to a CSV file
     * The name of the created file start with the url and the actual date/time
     */
    function ExportToCsv() {
        BrowserAdapter(actualBrowser).tabs.query({
                active: true,
                windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT
            },
            function(tabsArray) {
                tab = tabsArray[0];
                if (tab != null) {
                    for (var i = 0; i < tabList.length; i++) {
                        if (tabList[i]["tabID"] === tab.id) {
                            var devices = tabList[i]["devices"];

                            // Create the base of the file (filetype and header)
                            var csvContent = 'data:text/csv;charset=utf-8,\"name\"';
                            var testDevice = devices[0];
                            for (var prop in testDevice) {
                                if (prop != "name")
                                    csvContent += (';\"' + prop + '\"');
                            }
                            csvContent += "\n";

                            // Insert each device data
                            for (var j = 0; j < devices.length; j++) {
                                var deviceName = devices[j]["name"];
                                csvContent += ('"' + deviceName + '"');
                                for (var prop in devices[j]) {
                                    if (prop != "name")
                                        csvContent += (";" + devices[j][prop]);
                                }
                                csvContent += "\n";
                            }

                            // Create the filename
                            if (tab.url.indexOf("file:///") != -1) {
                                var filePath = tab.url.split("///")[1];
                                url = filePath.substring(filePath.lastIndexOf("/") + 1);
                            } else
                                url = tab.url.split("//")[1].split("/")[0].split(":")[0].replace("www.", "");

                            currentDate = new Date();
                            currentDateString = currentDate.getDate() + "-" +
                                (currentDate.getMonth() + 1) + "-" +
                                currentDate.getFullYear() + "_" +
                                currentDate.getHours() + "-" +
                                currentDate.getMinutes() + "-" +
                                currentDate.getSeconds();

                            var fileName = url + "_-_" + currentDateString + ".csv";

                            // Download the file
                            var encodedUri = encodeURI(csvContent);
                            var link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", fileName);
                            document.body.appendChild(link); // Required for FF
                            link.click();
                            link.remove();
                            return;
                        }
                    }
                }
            }
        );
    }

    /*
     * Load and display saved data
     */
    function GetStoredData() {
        dataToGet = ["engineHostname", "username"];
        dataToGet.forEach(function(entry) {
            BrowserAdapter(actualBrowser).storage.local.get([entry], function(data) {
                element = document.getElementById(entry)
                if (data[entry] != null && data[entry] != "") {
                    element.value = data[entry];
                    element.nextElementSibling.focus();
                } else
                    element.focus();
            });
        });
    }

    /*
     * Use to erase tempory data in order to logout
     */
    function Logout() {
        //if (confirm("Are you sure you want to logout") == true) {
        BrowserAdapter(actualBrowser).runtime.sendMessage({
            subject: "logout"
        });
        document.getElementById("apiConnection").style.display = 'block';
        document.getElementById("info").style.display = 'none';
        document.getElementById("logout").style.display = 'none';
        document.getElementById("devices").style.display = 'none';
        document.getElementById("addToWhitelist").style.display = "none";
        document.getElementById("whitelistInfo").style.display = "none";
        BrowserAdapter(actualBrowser).browserAction.setBadgeText({
            text: ""
        });
        BrowserAdapter(actualBrowser).storage.local.set({
            "key": null,
            "password": null
        }, function() {
            GetStoredData();
        });
        //}
    }

    /*
     * Call when a key is pressed
     * @param e The JavaScript event object
     */
    function PressEnterKey(e) {
        // If Enter key is pressed
        if (e.keyCode == 13) {
            if (document.getElementById("apiConnection").style.display != 'none')
                CheckConnectionWithEngine();
            else if (document.getElementById("logout").style.display != 'none')
                Logout();
        }
    }

    /*
     * Open the Finder application
     */
    function OpenFinder() {
        BrowserAdapter(actualBrowser).tabs.query({
                active: true,
                windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT
            },
            function(tabsArray) {
                tab = tabsArray[0];
                var finderBaseUrl = "nxt://New-NxFinder?Host="
                var urlPort = "&Port=443";
                var finalNxtUrl = finderBaseUrl.concat(urlPort);
                BrowserAdapter(actualBrowser).tabs.update(tab.id, {
                    url: finalNxtUrl
                });
            }
        );
    }

    /*
     * Open the options page in a new tab
     */
    function OpenOptions() {
        BrowserAdapter(actualBrowser).tabs.create({
            url: BrowserAdapter(actualBrowser).extension.getURL("options/options.html")
        })
    }

    /*
     * Remove the current tab url from the whitelist
     */
    function RemoveFromWhitelist() {
        BrowserAdapter(actualBrowser).tabs.query({
                active: true,
                windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT
            },
            function(tabsArray) {
                tab = tabsArray[0];
                if (tab.url.indexOf("file:///") != -1) {
                    var filePath = tab.url.split("///")[1];
                    var whitelistedUrl = filePath.substring(0, filePath.lastIndexOf("/"));
                } else
                    var whitelistedUrl = tab.url.split("//")[1].split("/")[0].split(":")[0].replace("www.", "");

                var whitelistedUrlIndex = whitelist.indexOf(whitelistedUrl);
                if (whitelistedUrlIndex != -1) {
                    whitelist.splice(whitelistedUrlIndex, 1)
                    document.getElementById("whitelistInfo").innerHTML = "This url is whitelisted";
                    document.getElementById("whitelistInfo").style.display = "block";
                    document.getElementById("addToWhitelist").style.display = "block";
                    document.getElementById("removeFromWhitelist").style.display = "none";
                    document.getElementById("devices").style.display = 'none';
                    BrowserAdapter(actualBrowser).browserAction.setBadgeText({
                        text: " "
                    });
                    BrowserAdapter(actualBrowser).browserAction.setBadgeBackgroundColor({
                        color: "#F5B8B4"
                    });
                }
            }
        );
    }

    /*
     * Save the data in local storage and send message to background
     * @param data The data to save localy
     */
    function SaveData(data) {
        BrowserAdapter(actualBrowser).storage.local.set({
            "engineHostname": data["engineHostname"],
            "username": data["username"]
        }, function() {});
    }

    /*
     * Use to save password (encrypted) to local storage
     * @param key The AES key
     * @param pass The encrypted password
     */
    function SavePassword(key, pass) {
        var d = new Date();

        var newMonth = d.getMonth() + 3;
        if (newMonth > 12) {
            newMonth -= 12;
            d.setYear(d.getYear() + 1);
        }
        d.setMonth(newMonth);
        BrowserAdapter(actualBrowser).storage.local.set({
            "key": [JSON.stringify(key), d.toDateString()]
        });
        BrowserAdapter(actualBrowser).storage.local.set({
            "password": pass
        });
    }

    /*
    * Send message to background with device name to search
    */
    function SearchDeviceName() {
        var deviceName = document.getElementById("deviceName").value;
        BrowserAdapter(actualBrowser).runtime.sendMessage({
            data: deviceName,
            subject: "searchDevice"
        }, function() {});
        document.getElementById("deviceName").value = "";
    }

    /*
     * Send a message to the background for rescaning the page.
     */
    function SendRescanMessage() {
        BrowserAdapter(actualBrowser).tabs.query({
                active: true,
                windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT
            },
            function(tabsArray) {
                tab = tabsArray[0];
                BrowserAdapter(actualBrowser).runtime.sendMessage({
                    data: tab.id,
                    subject: "rescan"
                }, function() {});
            }
        );
    }
}
