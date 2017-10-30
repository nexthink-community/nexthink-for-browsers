var connectionData, scoreList, whitelist, payloadList;
var className = "BOX985334b4-a808-4abc-b4e3-f34b83a747fe"; // Use this to prevent class name conflicts

var connected = false;
var mainURL, finderOptions, deviceFoundStyle;
var deviceOptions = [];
var tabList = [];
var availableDevices = [];
var scoreTreeList = {};
var actualBrowser;
var refusedUrls = ["chrome://", "chrome-extension://", "chrome-devtools://" , "chrome.google.com/webstore", "moz-extension://"];

/*
* Add the devices data to the tabList.
* @param devices All the devices with their data
* @param tabID The id of the tab where the devices are
* @param deviceName Contains the array of device name, use only when the data need to be simply add
*/
function AddDevicesToList(devices, tabID, deviceName){
    var foundTab = false;

    for(var i=0 ; i<tabList.length ; i++){
        if(tabList[i]["tabID"]===tabID){
            foundTab = true;
            for (var j = tabList[i]["devices"].length-1 ; j>=0 ; j--) {
                var actualDevice = tabList[i]["devices"][j]["name"];
                var indexOfDevice = deviceName.indexOf(actualDevice);
                if(indexOfDevice!=-1)
                    tabList[i]["devices"].splice(j, 1);
            }
            tabList[i]["devices"] = SortDevicesList(tabList[i]["devices"].concat(devices));
            break;
        }
    }
    if(!foundTab)
        tabList.push({"tabID":tabID, devices:devices});

    // Set the badge text with the number of devices for this tab
    BrowserAdapter(actualBrowser).tabs.query({ active: true, windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT },
        function(tabsArray) {
            tab = tabsArray[0];
            if(tab.id==tabID){
                BrowserAdapter(actualBrowser).browserAction.setBadgeText({text: String(tabList[i]["devices"].length)});
                BrowserAdapter(actualBrowser).browserAction.setBadgeBackgroundColor({color: "#7D9BC1"});
            }
        }
    );
}

/*
* Add the selected url to the whitelist and save it.
* @param whitelistedUrl
*/
function AddToWhitelist(whitelistedUrl){
    if(!whitelist.includes(whitelistedUrl)){
        whitelist.push(whitelistedUrl);
        whitelist = whitelist.sort();
    }

    BrowserAdapter(actualBrowser).storage.local.get("whitelist", function(data){
        if (data["whitelist"]!=whitelist) {
            BrowserAdapter(actualBrowser).storage.local.set(
                {"whitelist": whitelist.sort()}
            );
        }
    });

}

/*
* Add the devices data to the tabList.
*/
function CheckConnectionWithEngine(){
    if(connectionData!=null){
        // Create a simple query
        var query = "(select (name) (from device) (order_by name asc))";
        mainURL = "https://" + connectionData["engineHostname"] + "/2/query";
        var url = mainURL + "?format=json&query=" + query;
        var parameters = "format=json";
        var log = [connectionData["username"], DecryptString(connectionData["key"], connectionData["password"])]
        GetDevicesList(mainURL, log, parameters).then(function (response) {
            xhttpData = response;
            if(xhttpData.status == 200){
                jsonDeviceList = JSON.parse(xhttpData.responseText);

                for(var i=0 ; i<jsonDeviceList.length ; i++)
                    availableDevices.push(jsonDeviceList[i]["name"]);

                BrowserAdapter(actualBrowser).storage.local.get("scores", function(data){
                    if(data["scores"]!=null)
                        var scores = data["scores"];
                    else
                        var scores = [];

                    scoreList = scores;
                });

                BrowserAdapter(actualBrowser).storage.local.get("payloads", function(data){
                    if(data["payloads"]!=null)
                        var payloads = data["payloads"];
                    else
                        var payloads = [];

                    payloadList = payloads;
                });

                BrowserAdapter(actualBrowser).storage.local.get("whitelist", function(data){
                    if(data["whitelist"]!=null)
                        var tempWhitelist = data["whitelist"];
                    else
                        var tempWhitelist = [];
                    whitelist = tempWhitelist;
                });

                BrowserAdapter(actualBrowser).storage.local.get("scoreTreeList", function(data){
                    if(data["scoreTreeList"]!=null)
                        var tempscoreTreeList = data["scoreTreeList"];
                    else
                        var tempscoreTreeList = {};
                    scoreTreeList = tempscoreTreeList;
                });

                connected=true;
                connectedMessage = "The plugin is now connected to Engine ("+connectionData["engineHostname"] + " as: " + connectionData["username"] + ")";
                BrowserAdapter(actualBrowser).notifications.create(
                    "NXTP_Connect",
                    {
                        type: "basic",
                        title: "Nexthink Plugin",
                        message: connectedMessage,
                        iconUrl: "img/icon_16.png"
                    },
                    function(){}
                );

            }
            else{
                BrowserAdapter(actualBrowser).notifications.create(
                    "NXTP_Connect_Error",
                    {
                        type: "basic",
                        title: "Nexthink Plugin",
                        message: "Error while accessing to engine",
                        iconUrl: "img/icon_16.png"
                    },
                    function(){}
                );
                BrowserAdapter(actualBrowser).tabs.create({url: BrowserAdapter(actualBrowser).extension.getURL("popup/popup.html")})
            }
        });
    }
    else {
        connectionKeys = ["engineHostname","username","password","key"];
        BrowserAdapter(actualBrowser).storage.local.get(connectionKeys, function(data){
            dataComplete = true;
            connectionKeys.forEach(function(entry){
                if (data[entry]==null || data[entry]=="")
                    dataComplete = false;
            });
            if (dataComplete) {

                data["key"] = JSON.parse(data["key"][0]);
                connectionData = data;
                CheckConnectionWithEngine();
            }

        });
        tabList=[];
    }

    finderOptions = {};

    ["showFinderLink", "finderHost", "finderPort"].forEach(function(entry){
        BrowserAdapter(actualBrowser).storage.local.get([entry], function(data){
            finderOptions[entry] = data[entry];
        });
    });

    deviceFoundStyle = {bold: false, underline: true, italic: false};
    ["bold", "underline", "italic"].forEach(function(entry){
        BrowserAdapter(actualBrowser).storage.local.get([entry], function(data){
            if(data[entry]!=null && data[entry]!="")
                deviceFoundStyle[entry] = data[entry];
        });
    });

    BrowserAdapter(actualBrowser).storage.local.get("deviceOptions", function(data){
        if(data["deviceOptions"]!=null && data["deviceOptions"]!="")
            deviceOptions = data["deviceOptions"];
    });
}

/*
* Create the link to open the Finder for a specific element
* @param deviceName The device to found in the Finder
* @return The url to open the Finder with the specified info
*/
function CreateFinderLink(deviceName){
    var finderBaseUrl = "nxt://Show-NxSource?Name=";
    if(/^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/.test(finderOptions["finderPort"]))
        var finderPort = "&Port=".concat(finderOptions["finderPort"]);
    else
        var finderPort = "";
    if(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(finderOptions["finderHost"]))
        var finderHost = "&Host=".concat(finderOptions["finderHost"]);
    else
        var finderHost = "";
    return finderBaseUrl.concat(deviceName).concat(finderHost).concat(finderPort);
}

/*
* Get the data of all the specified devices
* @param devices The devices name to get data
* @param tabID The id of the tab where the devices are
* @param fullPage Boolean to indicate if the content is about the whole page or just mutation
*/
function GetDevicesData(devices, tabID, fullPage){
    // Generate the select part of the query
    var startScoreString = '#"score:';
    var scoreToGet = "";
    var finalScoreList = scoreList.concat(payloadList);

    finalScoreList.forEach(function(data){
        if(data){
            if(data.indexOf(startScoreString)===-1)
                data = startScoreString + data + '"'
            var data = " " + data;
            scoreToGet += data;
        }
    });

    var deviceInfoToGet = "";
    for (var i = 0; i < deviceOptions.length; i++) {
        deviceInfoToGet += ' \"'+deviceOptions[i]+'\"';
    }

    // Create where clause, use to get the data of all the device at once
    var devicesWhereClause = "";
    devices.forEach(function(data){
        devicesWhereClause += '(where device(eq name (string "'+data+'")))';
    });

    // Create the query
    var query = '(select (name '+deviceInfoToGet+' '+scoreToGet+') (from device '+devicesWhereClause+') (order_by name asc))';
    // Create the XMLHttpRequest
    var xhttp = new XMLHttpRequest();
    var queryURL = mainURL + "?format=xml&hr=true&query=" + encodeURIComponent(query);

    //function GetDeviceData(mainURL, devices, deviceProperties=[], scores=[] , parameters="")
    var log = [connectionData["username"], DecryptString(connectionData["key"], connectionData["password"])]
    GetDeviceData(mainURL, log, devices, deviceOptions, finalScoreList, "format=xml&hr=true").then(function (response) {
        var xhttpData = response;
        if(xhttpData.status == 200){
            var x2js = new X2JS();
            var jsonObj = x2js.xml_str2json(xhttpData.responseText);
            var header = jsonObj.table.header;
            var rawDevices = jsonObj.table.body.r;
            var devicesGet = [];
            var nbDevices = 0
            if(rawDevices.length!=null){
                nbDevices=rawDevices.length
                for (var i = 0; i < rawDevices.length; i++) { devicesGet.push({}); }
            }
            else{
                nbDevices=1;
                devicesGet.push({});
            }

            var keys = Object.keys(header);
            for(var i=0;i<keys.length;i++){
                var key = keys[i];
                var keyValue = header[key]["__text"];
                for (var j = 0; j < nbDevices; j++) {
                    if(rawDevices.length){
                        devicesGet[j][keyValue] = rawDevices[j][key];
                    }else{
                        devicesGet[j][keyValue] = rawDevices[key];
                    }
                }
            }

            SetDevicesPopup(JSON.stringify(devicesGet), fullPage, tabID);
            AddDevicesToList(devicesGet, tabID, devices);
        }
    });
}

/*
* Return the authentification part for any xml request (use to decrypt the password)
*/
function GetXMLLogin(){
    return btoa(connectionData["username"] + ":" + DecryptString(connectionData["key"], connectionData["password"]));
}

/*
* Check if the plugin can access to the url
* @param The url to Check
* @return Boolean if url is valid
*/
function IsUrlAuthorized(url){
    // Test specific url first
    try {
        if (url==null)
            return false;
        for (var i = 0; i < refusedUrls.length; i++) {
            if(url.indexOf(refusedUrls[i])!==-1)
                return false;
        }

        if (url.indexOf("file:///")!=-1) {
            var filePath = url.split("///")[1];
            url = filePath.substring(0, filePath.lastIndexOf("/"));
        }
        else
            url = url.split("//")[1].split("/")[0].split(":")[0].replace("www.","");

        if (whitelist!=null) {
            for (var i = 0; i < whitelist.length; i++) {
                if(url==whitelist[i])
                    return true;
            }
        }

        return false;
    } catch (e) {
        return false;
    }

}

/*
* Log out from Engine, also erase temporary connection data
*/
function Logout(){
    BrowserAdapter(actualBrowser).storage.local.get("reloadWhenLogout", function(data){
        if (data["reloadWhenLogout"]) {
            for (var i = 0; i < tabList.length; i++) {
                BrowserAdapter(actualBrowser).tabs.reload(tabList[i]["tabID"]);
            }
        }
        tabList = [];
    });

    connectionData = scoreList = whitelist = connected = mainURL = null;
}

/*
* First check all the word in the page and see if they can be a hostname (regex)
* and then try to find them in Engine database.
* @param content Contain the tab html (innerText)
* @param tabID Contain the id of the tab where the content come
* @param fullPage Boolean to indicate if the content is about the whole page or just mutation
*/
function ReadContent(content, tabID, fullPage){
    try {
        BrowserAdapter(actualBrowser).tabs.query({ active: true, windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT },
            function(tabsArray) {
                tab = tabsArray[0];
                if(tab!=null){
                    if(IsUrlAuthorized(tab.url)){
                        content = content[0];
                        regex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$/;
                        var devices = [];

                        content.forEach(function(content){
                            if(regex.test(content.trim()))
                                if(availableDevices.includes(content.trim()))
                                    devices.push(content.trim());
                        });
                        devices = devices.filter(function (el, i, arr) {
                            return arr.indexOf(el) === i;
                        });
                        if(devices.length!=0)
                            GetDevicesData(devices, tabID, fullPage);
                        else if(fullPage){
                            // Set the badge text with the number of devices for this tab
                            if(tab.id==tabID)
                                BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify([]), subject:"devicesPopup"}, function() {});

                        }
                    }
                }
            }
        );
    } catch (e) { }

}

/*
* Scan the selected tab for device name
* @param tabID The id of the tab to scan
* @param insertMutation Boolean to incate if the mutation scipt must be insert (only 1 time per url to prevent performance issue)
*/
function ScanPage(tabID, insertMutation){
    BrowserAdapter(actualBrowser).tabs.get(tabID, function(tab){
        try {
            if(IsUrlAuthorized(tab.url)){
                BrowserAdapter(actualBrowser).tabs.executeScript(tabID, { file: 'background/getContent.js' });
                if(insertMutation)
                    BrowserAdapter(actualBrowser).tabs.executeScript(tabID, { file: 'background/mutation.js' });
            }
        } catch (e) { console.log(e); }
    });
}

/*
* Create the popup for all the devices found
* @param devicesData An array of array with the device and their data, [deviceName,[data]]
* @param sendToPopup Boolean indicates if the created popup have to be send to popup or to the tab
* @param tabID The id of the tab where the devices are
*/
function SetDevicesPopup(devicesData, sendToPopup, tabID){

    /*
    * Create the button who will open the tab
    * @param name The name of the tab to open
    * @param defaultOpen Indicate if the tab related to button will be show when showing tab
    * @return DOM button
    */
    function CreateTabButton(name, defaultOpen){
        var button = document.createElement('button');
        var deviceName = name.replace(new RegExp(/ /, 'g'), '_').replace(new RegExp(/\:/, 'g'), '').toLowerCase()

        var buttonEvent = '<button class="dataPopupTablinks '+deviceName+'"';
        buttonEvent += 'onclick="OpenDataPopupTab(event, \''+deviceName+'\', document)"';

        if(defaultOpen)
            buttonEvent+=' id="defaultOpen">';
        else
            buttonEvent+='>';

        buttonEvent+= name + "</button>";
        button.innerHTML = buttonEvent;

        button = button.childNodes[0];

        return button;
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
    function DisplayScoreTable(element, data, scoreRoot, deviceData, title, thresholds){
        var name = data.scoreName
        var scoreRow = element.insertRow(element.rows.length);
        scoreRow.id = name

        var scoreNameCell = scoreRow.insertCell(0);

        if(data.children){
            scoreNameCell.id = "root";
            scoreNameCell.setAttribute("colspan", "3");

            if(Array.isArray(data.children)){
                if(title!="")
                    var tempTitle = title + " - " + name
                else
                    var tempTitle = name
                scoreNameCell.appendChild(document.createTextNode(tempTitle));

                for (var i = 0; i < data.children.length; i++) {
                    DisplayScoreTable(element, data.children[i], scoreRoot, deviceData, tempTitle, thresholds)
                }
            }
            else{
                DisplayScoreTable(element, data.children, scoreRoot, deviceData, "", thresholds)
                scoreNameCell.appendChild(document.createTextNode(name));
            }
        }
        else {
            var scoreValue = deviceData["score:"+scoreRoot+"/"+name]

            var scoreValueCell = scoreRow.insertCell(1);
            if(!scoreValue || scoreValue=="-")
                scoreValueCell.innerHTML = "-"
            else
                scoreValueCell.innerHTML = parseInt(scoreValue);
            var scorePayloadCell = scoreRow.insertCell(2);
            scorePayloadCell.innerHTML = deviceData["score:"+scoreRoot+"/"+name+"/payload"];

            if(devicePropValue!="-"){
                tempReturnValue = SetScoreColor(thresholds, parseInt(scoreValue), scoreValueCell, scorePayloadCell)
                scoreValueCell = tempReturnValue[0]
                scorePayloadCell = tempReturnValue[1]
            }

            scoreNameCell.appendChild(document.createTextNode(name));
        }
    }

    /*
    * Set the color of the cells depending of the score value and thresholds
    * @param thresholds The thresholds json
    * @param score The score payload
    * @param scoreValueCell The DOM cell containing the score value
    * @param scorePayloadCell The DOM cell containing the score payload
    * @return Array containing altered [scoreValueCell, scorePayloadCell, color]
    */
    function SetScoreColor(thresholds, score, scoreValueCell, scorePayloadCell){
        try {
            good = {color:"#ADE0C6", from:8};
            bad = {color:"#FEE1B1", from:6};
            critical = {color:"#F5B8B4", from:0};

            good.from = thresholds["good"].from;
            bad.from = thresholds["bad"].from;
            critical.from = thresholds["critical"].from;
        } catch (e) {}

        score = parseFloat(score);

        try {
            scoreValueCell.style.color = "#000000";
            scorePayloadCell.style.color = "#000000";
        } catch (e) { }

        color = "";

        if(score>=0 && score<bad.from){
            try {
                color = critical.color
                scoreValueCell.style.backgroundColor = critical.color;
                scorePayloadCell.style.backgroundColor = critical.color;
            } catch (e) { }
        }else if (score>=bad.from && score<good.from){
            try {
                color = bad.color
                scoreValueCell.style.backgroundColor = bad.color;
                scorePayloadCell.style.backgroundColor = bad.color;
            } catch (e) { }
        }else if (score>=good.from && score<=10){
            try {
                color = good.color
                scoreValueCell.style.backgroundColor = good.color;
                scorePayloadCell.style.backgroundColor = good.color;
            } catch (e) { }
        }else{
            try {
                scoreValueCell.style.color = "";
                scorePayloadCell.style.color = "";
            } catch (e) { }
        }

        return [scoreValueCell, scorePayloadCell, color]
    }

    try {
        devicesData = JSON.parse(devicesData);
    } catch (e) {}

     // Convert JSON string to JSON object
    var deviceTables = [];
    for (var i = 0; i < devicesData.length; i++){

        var deviceName = "";
        var actualRoot = "";

        var dataDiv = document.createElement('div');
        dataDiv.className = "dataPopupTab";

        var dataDivLinks = document.createElement('div');
        dataDivLinks.className = "tabLinks";

        var leftArrow = document.createElement('span');
        leftArrow.id = "leftArrow";

        var rightArrow = document.createElement('span');
        rightArrow.id = "rightArrow";

        var deviceInfoDataDiv = document.createElement('table');
        deviceInfoDataDiv.className = "dataPopupTabContent";
        deviceInfoDataDiv.id = "properties";

        var deviceInfoButton = CreateTabButton("Properties", true);

        var finderLinkDiv = document.createElement('div');
        var finderLink = document.createElement('a');

        var scoreTables = {};
        var tempScoreTables = {};

        for(var prop in devicesData[i]) {
            var devicePropValue = devicesData[i][prop];

            // Save the device name
            if(prop=="name"){
                if(finderOptions["showFinderLink"]!=null && finderOptions["showFinderLink"]!="" && finderOptions["showFinderLink"]){
                    finderLinkDiv.className = "link";
                    finderLink.href = CreateFinderLink(devicePropValue);
                    finderLink.id = "link";
                    finderLink.textContent = "Open in Finder";
                    finderLinkDiv.appendChild(finderLink);
                }
                deviceName = devicePropValue;
                dataDiv.id = deviceName;
            }

            if(prop.indexOf("score:")==-1){
                var deviceInfoRow = deviceInfoDataDiv.insertRow(deviceInfoDataDiv.rows.length);
                var deviceInfoNameCell = deviceInfoRow.insertCell(0);
                var deviceInfoDataCell = deviceInfoRow.insertCell(1);
                if(prop=="name" && deviceOptions.length!=0){
                    deviceInfoNameCell.innerHTML = "";
                    deviceInfoDataCell.innerHTML = "";
                }
                else{
                    deviceInfoNameCell.innerHTML = prop.replace(new RegExp(/_/, 'g'), ' ');
                    deviceInfoDataCell.innerHTML = devicePropValue;
                }
            }
        }

        var keys = Object.keys(scoreTreeList);

        for (var j = 0; j < keys.length; j++) {
            var scoreRoot = keys[j]
            var temp = scoreTreeList[scoreRoot];
            dataDivLinks.appendChild(CreateTabButton(scoreRoot, false));

            scoreTable = document.createElement("TABLE")
            scoreTable.id = scoreRoot.replace(new RegExp(/ /, 'g'), '_').replace(new RegExp(/\:/, 'g'), '').toLowerCase();
            scoreTable.align = "center";
            scoreTable.classList = "score dataPopupTabContent";

            var scoreInfoRow = scoreTable.insertRow(0);
            var scoreNameCell = scoreInfoRow.insertCell(0);
            var scoreValueCell = scoreInfoRow.insertCell(1);
            scoreNameCell.id = "root";
            scoreNameCell.innerHTML = "Overall score";
            var overallScoreValue = devicesData[i]["score:"+scoreRoot+"/"+scoreRoot];
            if (overallScoreValue=="-")
                scoreValueCell.innerHTML = "-";
            else
                scoreValueCell.innerHTML = parseFloat(overallScoreValue).toFixed(2);

            scoreValueCell.setAttribute("colspan", "3");
            var color = SetScoreColor(temp["thresholds"], overallScoreValue, scoreValueCell)[2]

            var tempName = scoreRoot.replace(new RegExp(/ /, 'g'), '_').replace(new RegExp(/\:/, 'g'), '').toLowerCase()
            try {
                dataDivLinks.querySelector("."+tempName).style.cssText = "border-bottom:" + color + " solid 2px !important";
            } catch (e) { console.log(e); }

            for (var k = 0; k < temp["scores"].length; k++) {
                DisplayScoreTable(scoreTable, temp["scores"][k], scoreRoot, devicesData[i], "", temp["thresholds"])
            }

            tempScoreTables[scoreRoot] = scoreTable;
        }

        dataDiv.appendChild(dataDivLinks);

        if (deviceInfoDataDiv.rows.length!=0){
            dataDiv.appendChild(deviceInfoDataDiv);
            dataDivLinks.insertBefore(deviceInfoButton, dataDivLinks.children[0]);
            dataDivLinks.insertBefore(leftArrow, dataDivLinks.children[0]);
            dataDivLinks.appendChild(rightArrow);
        }

        for (var prop in tempScoreTables) {
            dataDiv.appendChild(tempScoreTables[prop]);
        }

        if(finderLink.href!="" && finderLink.href!=null)
            dataDiv.appendChild(finderLinkDiv);

        //console.log(scoreTables);
        deviceTables.push([deviceName, dataDiv.outerHTML]);
    }

    if(sendToPopup){
        BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(deviceTables), subject:"devicesPopup"}, function() {});
    }

    var styles = "";
    try {
        if(deviceFoundStyle["bold"])
            styles+=" bold";
    } catch (e) { }

    try {
        if(deviceFoundStyle["underline"])
            styles+=" underline"
    } catch (e) { }

    try {
        if(deviceFoundStyle["italic"])
            styles+=" italic"
    } catch (e) { }

    if (tabID!=null) {
        try {
            BrowserAdapter(actualBrowser).tabs.executeScript(tabID,
                {
                    code: "var finderLink="+finderOptions["showFinderLink"]+" ;var className=\`"+className+"\`; var deviceTables="+ JSON.stringify(deviceTables) + "; var styles=\`"+styles+"\`;"
                }
                , function()
                {
                    BrowserAdapter(actualBrowser).tabs.executeScript(tabID, {file: "inject/box.js"}, function()
                        {
                            BrowserAdapter(actualBrowser).tabs.executeScript(tabID, {file: "background/insert.js"});
                        }
                    );
                }
            );
        } catch (e) { console.log(e); }

    }

}

/*
* Sort a list of devices by their name (asc)
* @param devicesList The list of device to sort
* @return The sorted device list
*/
function SortDevicesList(devicesList){
    return devicesList.sort(function(a, b) {
        var x = a["name"]; var y = b["name"];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

/*
* Open a new tab with the device information (same as saved)
* @param deviceName The device to search
*/
function SearchDevice(deviceName){
    if (connected){
        var tempURL = BrowserAdapter(actualBrowser).extension.getURL("search/search.html") + "?search=" + encodeURIComponent(deviceName);
        BrowserAdapter(actualBrowser).tabs.create({url: tempURL});
    }
    else
        alert("You must be connected to Engine before searching a device.");

}

/*
* Define the different listener (onMessage, tabs.onActivated, etc.)
*/
function SetListener(){
    // Called when the user clicks on the browser action.
    BrowserAdapter(actualBrowser).tabs.onActivated.addListener(function(tab) {
        BrowserAdapter(actualBrowser).tabs.query({ active: true, windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT },
            function(tabsArray) {
                tab = tabsArray[0];
                BrowserAdapter(actualBrowser).browserAction.setBadgeText({text: ''});
                // Check if the plugin is connected and the actual url is allowed
                if(connected){
                    if(IsUrlAuthorized(tab.url)){
                        try {
                            var addTab = true;
                            for(var i=0 ; i<tabList.length ; i++){
                                if(tabList[i]["tabID"]===tab.id){
                                    // Set the number of device in the badge text
                                    addTab = false;
                                    var numberOfDevice = tabList[i]["devices"].length;
                                    if(numberOfDevice!=0){
                                        BrowserAdapter(actualBrowser).browserAction.setBadgeText({text: String(numberOfDevice)});
                                        BrowserAdapter(actualBrowser).browserAction.setBadgeBackgroundColor({color: "#7D9BC1"});
                                    }
                                    break;
                                }
                            }

                            // If the tab not already exist
                            if(addTab){
                                var tabData = {"tabID":tab.id, devices:[]};
                                tabList.push(tabData);
                                ScanPage(tab.id, true);
                            }

                        } catch (e) {
                            console.log(e);
                        }
                    }
                    else{
                        // Set the plugin badge color to red, use to indicate to user that the site is in the whitelist
                        BrowserAdapter(actualBrowser).browserAction.setBadgeText({text: " "});
                        BrowserAdapter(actualBrowser).browserAction.setBadgeBackgroundColor({color: "#F5B8B4"});
                    }
                }
            }
        );
    });

    // Event call when a tab is updated
    BrowserAdapter(actualBrowser).tabs.onUpdated.addListener(function(updatedTabID, changeInfo){
        // Start processing only if the page update is complete and if the plugin is connected to Engine
        if(updatedTabID!=null && connected && changeInfo["status"]=="complete"){

            BrowserAdapter(actualBrowser).tabs.get(updatedTabID, function(updatedTab){
                if(IsUrlAuthorized(updatedTab.url)){
                    // Check in the tab list if the tab exist and remove the devices list if it's the case
                    for(var i=0 ; i<tabList.length ; i++){
                        if(tabList[i]["tabID"]===updatedTabID){
                            tabList[i]["devices"] = [];
                            break;
                        }
                    }

                    // Remove the badge text only if the updated tab is the same as the actual one
                    BrowserAdapter(actualBrowser).tabs.query({ active: true, windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT },
                        function(tabsArray) {
                            tab = tabsArray[0];
                            if(tab.id==updatedTabID)
                                BrowserAdapter(actualBrowser).browserAction.setBadgeText({text: ""});
                        }
                    );

                    // Inject the script to get the content of the page
                    ScanPage(updatedTabID, true);
                }
                else {
                    BrowserAdapter(actualBrowser).tabs.query({ active: true, windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT },
                        function(tabsArray) {
                            tab = tabsArray[0];
                            if(tab.id==updatedTabID){
                                BrowserAdapter(actualBrowser).browserAction.setBadgeText({text: " "});
                                BrowserAdapter(actualBrowser).browserAction.setBadgeBackgroundColor({color: "#F5B8B4"});
                            }
                        }
                    );
                }
            });
        }
    });

    // Event call when a tab is removed
    BrowserAdapter(actualBrowser).tabs.onRemoved.addListener(function(closedTabID, removeInfo){
        // If the plugin is connected it will remove the tab information he has
        if(connected){
            for(var i=0 ; i<tabList.length ; i++){
                if(tabList[i]["tabID"]===closedTabID){
                    tabList.splice(i, 1);
                    break;
                }
            }
        }
    });

    // Event call when the plugin have a message
    BrowserAdapter(actualBrowser).runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            // Make sure the sender is the plugin him-self
            if (actualBrowser=="Firefox")
                extensionId = sender.extensionId;
            else
                extensionId = sender.id;

            if(BrowserAdapter(actualBrowser).runtime.id===extensionId){
                switch (request["subject"]) {

                    case "addToWhitelist":
                        AddToWhitelist(request["data"]);
                        break;

                    case "askDeviceInfo":
                        BrowserAdapter(actualBrowser).runtime.sendMessage(
                            {
                                scores:JSON.stringify(scoreList.concat(payloadList)),
                                options:JSON.stringify(deviceOptions),
                                subject:"getDeviceInfo"
                            }, function() {});
                        break;

                    case "askDevicePopup":
                        SetDevicesPopup(request["data"], true);
                        break;

                    case "connection":
                        connectionData = request["data"];
                        connected = true;
                        mainURL = "https://" + connectionData["engineHostname"] + "/2/query";
                        break;

                    case "content":
                        ReadContent([request["data"]], sender["tab"].id, request["fullPage"]);
                        break;

                    case "deviceList":
                        availableDevices = request["data"];
                        break;

                    case "devicesPopup":
                        BrowserAdapter(actualBrowser).tabs.query({ active: true, windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT },
                            function(tabsArray) {
                                tab = tabsArray[0];
                                for (var i = 0; i < tabList.length; i++) {
                                    if(tabList[i]["tabID"]===tab.id){
                                        SetDevicesPopup(tabList[i]["devices"], true);
                                        break;
                                    }
                                }
                            }
                        );
                        break;

                    case "deviceOptions":
                        deviceOptions = JSON.parse(request["data"]);
                        break;

                    case "finderOptions":
                        finderOptions = request["data"];
                        break;

                    case "logout":
                        Logout();
                        break;

                    case "payload":
                        payloadList = JSON.parse(request["data"]);
                        break;

                    case "pluginOptions":
                        deviceFoundStyle = request["data"];
                        break;

                    case "rescan":
                        BrowserAdapter(actualBrowser).tabs.query({ active: true, windowId: BrowserAdapter(actualBrowser).windows.WINDOW_ID_CURRENT },
                            function(tabsArray) {
                                tab = tabsArray[0];
                                for (var i = 0; i < tabList.length; i++) {
                                    if(tabList[i]["tabID"]===request["data"]){
                                        tabList[i]["devices"]=[];
                                        break;
                                    }
                                }
                                if(tab.id===request["data"])
                                    BrowserAdapter(actualBrowser).browserAction.setBadgeText({text: ""});
                                ScanPage(request["data"], false);
                            }
                        );
                        break;

                    case "searchDevice":
                        SearchDevice(request["data"]);
                        break;

                    case "scores":
                        scoreList = JSON.parse(request["data"]);
                        for (var i = 0; i < tabList.length; i++) {
                            tabID = tabList[i]["tabID"];
                            ScanPage(tabID, false);
                        }
                        break;

                    case "scoreTreeList":
                        scoreTreeList = JSON.parse(request["data"]);
                        break;
                    case "whitelist":
                        whitelist = JSON.parse(request["data"]);
                        break;

                    default:
                        break;
                }
            }
        }
    );

    BrowserAdapter(actualBrowser).omnibox.onInputEntered.addListener( function(text) {SearchDevice(text);} );

}

var scriptsToAdd = ["../src/aes.js", "../src/jsaes.js", "../src/browserAdapter.js", "../src/xml2json.min.js", "../src/nexthink.js"];
for (var i = 0; i < scriptsToAdd.length; i++) {
    var imported = document.createElement('script');
    imported.src = scriptsToAdd[i];
    document.head.appendChild(imported);
}

window.onload = function (){
    actualBrowser = CheckBrowser();
    SetListener();
    CheckConnectionWithEngine();
}
