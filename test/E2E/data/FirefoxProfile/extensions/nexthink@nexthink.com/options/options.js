window.onload = function (){
//document.addEventListener('DOMContentLoaded', function() {

    var savedRoot;
    var savedScores;
    var savedPayloads;
    var savedWhitelistedURL;
    var savedScoreTreeList = {};
    var actualBrowser;

    /*
    * Add the device info to table
    * @param deviceInfo The device info to add in the table
    */
    function AddDeviceInfoToTable(deviceInfo){
        var deviceInfoTable = document.getElementById('deviceInfoList').getElementsByTagName('tbody')[0];
        var deviceInfoRow = deviceInfoTable.insertRow(deviceInfoTable.rows.length);
        var deviceInfoNameCell = deviceInfoRow.insertCell(0);
        var deviceInfoButtonCell = deviceInfoRow.insertCell(1);
        deviceInfoNameCell.appendChild(document.createTextNode(deviceInfo.replace(new RegExp(/_/, 'g'), ' ')));

        var removeButton = document.createElement("button");
        removeButton.innerHTML = "Remove";
        removeButton.id = "removeDeviceInfo";
        removeButton.setAttribute("property", deviceInfo);
        removeButton.className += "btn btn-xs btn-danger";

        // Create remove button and also the event
        removeButton.addEventListener ("click", function() {
            BrowserAdapter(actualBrowser).storage.local.get("deviceOptions", function(data){
                var deviceOptions = data["deviceOptions"];
                deviceOptions.splice(deviceOptions.indexOf(deviceInfo), 1)
                if (deviceOptions.length==0)
                    document.getElementById("deviceInfoList").style.display = "none";
                BrowserAdapter(actualBrowser).storage.local.set({"deviceOptions": deviceOptions});
                BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(deviceOptions), subject:"deviceOptions"}, function() {});
                savedScores = deviceOptions;
            });
            this.parentNode.parentNode.remove();
        });

        deviceInfoButtonCell.appendChild(removeButton);

        document.getElementById("deviceInfoList").style.display = "inline-table";
        SortTable(document.getElementById("deviceInfoList").tBodies[0]);
    }

    /*
    * Add the device infos to table, if it's not already save
    * @param deviceInfos The array of deviceInfo to save
    */
    function AddDeviceInfo(deviceInfos){
        document.getElementById("deviceInfoMessage").innerHTML = "";
        for (var i = 0; i < deviceInfos.length; i++) {
            deviceInfo = deviceInfos[i].split("\n");
            deviceInfoList = [];
            deviceInfo.forEach(function(info){
                var tempInfo = info.replace(/[\n\r\t]+/g, ' ');
                if(tempInfo.length!=0 && tempInfo.replace(' ','').length!=0)
                    deviceInfoList.push(tempInfo);
            });

            deviceInfoList.forEach(function(deviceInfo){
                CheckIfDeviceInfoExist(deviceInfo);
            });
        }
    }

    /*
    * Add the selected url to the whitelist table
    * @param whitelistedUrl THe url string to add
    */
    function AddToTableWhitelist(whitelistedUrl){
        if(whitelistedUrl!=null && whitelistedUrl!=""){
            whitelistedUrl = whitelistedUrl.replace("https://","").replace("http://","");
            if(whitelistedUrl.length!=0){
                var whitelistTable = document.getElementById('whitelistItems').getElementsByTagName('tbody')[0];
                var whitelistRow = whitelistTable.insertRow(whitelistTable.rows.length);
                var whitelistNameCell = whitelistRow.insertCell(0);
                var whitelistButtonCell = whitelistRow.insertCell(1);
                var whitelistName = document.createTextNode(whitelistedUrl);
                whitelistNameCell.appendChild(whitelistName);

                var removeButton = document.createElement("button");
                removeButton.innerHTML = "Remove";
                removeButton.id = "removeFromWhitelist";
                removeButton.setAttribute("url", whitelistedUrl);
                removeButton.className += " btn btn-xs btn-danger";

                // Create remove button and also the event
                removeButton.addEventListener ("click", function() {
                    BrowserAdapter(actualBrowser).storage.local.get("whitelist", function(data){
                        var whitelist = data["whitelist"];
                        whitelist.splice(whitelist.indexOf(whitelistedUrl), 1)
                        BrowserAdapter(actualBrowser).storage.local.set({"whitelist": whitelist});
                        BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(whitelist), subject:"whitelist"}, function() {});
                        savedWhitelistedURL = whitelist;
                    });
                    this.parentNode.parentNode.remove();
                });

                whitelistButtonCell.appendChild(removeButton);

                document.getElementById('whitelistURL').focus();
            }
        }
    }

    /*
    * Add the selected string to whitelist, if not present in the actual list
    * @param whitelistedUrl The url string to add
    */
    function AddURLToWhitelist(whitelistedUrl){
        if(!savedWhitelistedURL.includes(whitelistedUrl)){
            savedWhitelistedURL.push(whitelistedUrl);
            BrowserAdapter(actualBrowser).storage.local.set({"whitelist": savedWhitelistedURL.sort()});
            BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(savedWhitelistedURL), subject:"whitelist"}, function() {});
            AddToTableWhitelist(whitelistedUrl);
        }
    }

    /*
    * Check if the device info exist in Engine databse
    * @param deviceInfo The device info to check
    */
    function CheckIfDeviceInfoExist(deviceInfo){
        document.getElementById("deviceInfo").value="";
        // Get the connection information
        connectionData = BrowserAdapter(actualBrowser).extension.getBackgroundPage().connectionData;

        var mainURL = "https://" + connectionData["engineHostname"] + "/2/query";
        var log = [connectionData["username"], DecryptString(connectionData["key"], connectionData["password"])]
        CheckIfDevicePropertiesExist(mainURL, log, deviceInfo, "").then(function (response) {
            var xhttpData = response;
            if(xhttpData.status == 200){
                // First check if the score has been already saved
                if(!savedDeviceOptions.includes(deviceInfo)){
                    savedDeviceOptions.push(deviceInfo);
                    savedDeviceOptions.sort();
                    BrowserAdapter(actualBrowser).storage.local.set({"deviceOptions": savedDeviceOptions});
                    BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(savedDeviceOptions), subject:"deviceOptions"}, function() {});
                    AddDeviceInfoToTable(deviceInfo);
                }
                else {
                    var message = "<b>" + deviceInfo + "</b> device info already saved.</br>";
                    document.getElementById("deviceInfoMessage").innerHTML+= message;
                }
            }
            else if (xhttpData.status == 400) {
                var message = "<b>" + deviceInfo + "</b> device info does not exist in Engine.</br>";
                document.getElementById("deviceInfoMessage").innerHTML+= message;
            }
        });
    }

    /*
    * Check if the score exist in Engine databse
    * @param scoreName The score to check
    * @param payload If the score is a payload
    */
    function CheckIfScoreExist(scoreName, payload){
        /*Check if the score has the starting string for a Web API v2 query*/
        var startScoreString = '#"score:';
        var scoreQueryName = scoreName;
        var lastName = scoreName.substring(scoreName.lastIndexOf("/")+1);
        var scoreRoot = scoreName.split('/')[0];

        if(!payload){
            CheckIfScoreExist(scoreName+"/payload", true)
        }

        if(scoreQueryName.indexOf(startScoreString)===-1)
            scoreQueryName = startScoreString + scoreQueryName + '"';

        // Get the connection information
        connectionData = BrowserAdapter(actualBrowser).extension.getBackgroundPage().connectionData;
        var log = [connectionData["username"], DecryptString(connectionData["key"], connectionData["password"])]
        var mainURL = "https://" + connectionData["engineHostname"] + "/2/query";
        CheckIfDeviceScoreExist(mainURL, log , scoreQueryName, "").then(function (response) {
            var xhttpData = response;
            if(xhttpData.status == 200){
                if(payload==false){
                    if(!savedScores.includes(scoreName)){
                        savedScores.push(scoreName);
                        savedScores.sort();
                        BrowserAdapter(actualBrowser).storage.local.set({"scores": savedScores});
                        BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(savedScores), subject:"scores"}, function() {});
                    }
                }
                else{
                    if(!savedPayloads.includes(scoreName) && payload==true){
                        savedPayloads.push(scoreName);
                        savedPayloads.sort();

                        BrowserAdapter(actualBrowser).storage.local.set({"payloads": savedPayloads});
                        BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(savedPayloads), subject:"payload"}, function() {});
                    }
                }
            }
        });
    }

    /*
    * Use to create a config file
    */
    function CreateConfigFile(){
        // Add the desired data name to the list
        var dataToGet = [];
        if(document.getElementById("saveEngineHost").checked)
            dataToGet.push("engineHostname");

        if(document.getElementById("saveEngineLogin").checked)
            dataToGet.push("username");

        if(document.getElementById("saveFinderHost").checked)
            dataToGet.push("finderHost", "finderPort", "showFinderLink");

        if(document.getElementById("saveScores").checked)
            dataToGet.push("scoreTreeList");

        if(document.getElementById("saveWhitelist").checked)
            dataToGet.push("whitelist");

        if(document.getElementById("saveDeviceInfos").checked)
            dataToGet.push("deviceOptions");

        if(document.getElementById("savePluginOptions").checked)
            dataToGet.push("underline", "italic", "bold", "reloadWhenLogout");

        if (dataToGet.length!=0) {
            BrowserAdapter(actualBrowser).storage.local.get(dataToGet, function(data){
                currentDate = new Date();
                currentDateString = currentDate.getDate() + "-"
                    + (currentDate.getMonth()+1)  + "-"
                    + currentDate.getFullYear() + "_"
                    + currentDate.getHours() + "-"
                    + currentDate.getMinutes() + "-"
                    + currentDate.getSeconds();

                // Create the file element
                content = JSON.stringify(data);
                filename = "NexthinkPlugin-ConfigFile-" + currentDateString + ".json";
                var element = document.createElement('a');
                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
                element.setAttribute('download', filename);

                // Insert the file content in the page, click to activcate the download, then remove it from the page
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
                document.getElementById("saveConfigMessage").innerHTML = "Configuration file created.";
            });
        }
        else
            document.getElementById("saveConfigMessage").innerHTML = "Please select at least one option.";
    }

    /*
    * Display score tree correctly
    * @param thresholds The json thresholds of the score
    * @param scoreRoot The score root
    */
    function DisplayScore(scoreRoot, thresholds){
        scoreDiv = document.createElement("DIV")
        scoreDiv.id = scoreRoot

        titleDiv = document.createElement("DIV")
        titleDiv.setAttribute("data-toggle", "collapse");
        titleDiv.setAttribute("href", "#"+scoreRoot.replace(new RegExp(/ /, 'g'), ''));
        titleDiv.setAttribute("aria-expanded", "true");
        titleDiv.id = scoreRoot.replace(new RegExp(/ /, 'g'), '') + "_collapse";

        titleHeader = document.createElement("H5")
        titleHeader.innerHTML = scoreRoot
        titleHeader.style.display = "inline-block"
        titleHeader.classList = "headerNoTopSpace"
        titleDiv.appendChild(titleHeader)

        var removeButton = document.createElement("button");
        removeButton.innerHTML = "Remove";
        removeButton.id = "removeScore";
        removeButton.style.float = "right"
        removeButton.className = "btn btn-xs btn-danger";

        removeButton.addEventListener ("click", function() {
            scoreID = this.parentNode.parentNode.id
            delete savedScoreTreeList[scoreID];
            for (var i = savedPayloads.length-1; i>=0; i--) { if(savedPayloads[i].startsWith(scoreID+"/"))savedPayloads.splice(i ,1); }
            for (var i = savedScores.length-1; i>=0; i--) { if(savedScores[i].startsWith(scoreID+"/"))savedScores.splice(i ,1); }
            BrowserAdapter(actualBrowser).storage.local.set({"scoreTreeList": savedScoreTreeList});
            BrowserAdapter(actualBrowser).storage.local.set({"scores": savedScores});
            BrowserAdapter(actualBrowser).storage.local.set({"payloads": savedPayloads});

            BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(savedPayloads), subject:"payload"}, function() {});
            BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(savedScores), subject:"scores"}, function() {});
            BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(savedScoreTreeList), subject:"scoreTreeList"}, function() {});
            this.parentNode.parentNode.remove();
        });

        titleDiv.appendChild(removeButton)

        scoreDiv.appendChild(titleDiv);
        dataDiv = document.createElement("DIV")
        dataDiv.id = scoreRoot.replace(new RegExp(/ /, 'g'), '');
        dataDiv.classList = "panel-collapse collapse"

        scoreDiv.appendChild(dataDiv);
        document.getElementById("scores").appendChild(scoreDiv);

        var thresholdsTable = document.createElement("TABLE")
        thresholdsTable.align = "center"
        thresholdsTable.id = "thresholds"
        var thresholdsLabelRow = thresholdsTable.insertRow(0);
        var thresholdsValueRow = thresholdsTable.insertRow(1);

        var keys = Object.keys(savedScoreTreeList[scoreRoot]["thresholds"]);
        for(var i=0;i<keys.length;i++){
            var key = keys[i];
            thresholdsLabelCell = thresholdsLabelRow.insertCell(i);
            thresholdsValueCell = thresholdsValueRow.insertCell(i);
            thresholdsLabelCell.innerHTML = key
            thresholdsValueCell.innerHTML = savedScoreTreeList[scoreRoot]["thresholds"][key].from
            thresholdsLabelCell.style.backgroundColor = savedScoreTreeList[scoreRoot]["thresholds"][key].color
            thresholdsValueCell.style.backgroundColor = savedScoreTreeList[scoreRoot]["thresholds"][key].color
        }

        dataDiv.appendChild(thresholdsTable)

        scoreTable = document.createElement("TABLE")
        scoreTable.id = "score"
        scoreTable.align = "center"
        scoreTable.classList = "score"
        dataDiv.appendChild(scoreTable);

        for (var i = 0; i < savedScoreTreeList[scoreRoot]["scores"].length; i++) {
            DisplayScoreTable(scoreTable, savedScoreTreeList[scoreRoot]["scores"][i], scoreRoot)
        }
    }

    /*
    * Display score contents until there is no more child score
    * @param element The DOM element where the data will be add
    * @param data The current data
    * @param scoreRoot The score root
    */
    function DisplayScoreTable(element, data, scoreRoot){
        var name = data.scoreName
        var scoreRow = element.insertRow(element.rows.length);
        scoreRow.id = name

        var scoreNameCell = scoreRow.insertCell(0);
        var scoreHideCell = scoreRow.insertCell(1);
        scoreHideCell.classList = "hideButton";

        // Create hide button and also the event
        var removeButton = document.createElement("button");
        removeButton.innerHTML = "Hide";
        removeButton.id = "removeScore";
        removeButton.className += " btn btn-xs btn-warning";
        removeButton.style.width = "65px"

        //scoreHideCell.appendChild(removeButton)

        if(data.children){
            scoreNameCell.id = "root";
            var scoreDataRow = scoreRow.insertCell(2);
            var scoreDataTable = document.createElement("TABLE")
            scoreDataTable.id = "data_" + name
            scoreDataRow.appendChild(scoreDataTable);

            if(Array.isArray(data.children)){
                for (var i = 0; i < data.children.length; i++) {
                    DisplayScoreTable(scoreDataTable, data.children[i], scoreRoot)
                }
            }
            else{ DisplayScoreTable(scoreDataTable, data.children, scoreRoot) }
        }
        else { CheckIfScoreExist(scoreRoot + "/" + name, false); }

        scoreNameCell.appendChild(document.createTextNode(name));
    }

    /*
    * Read XML object and save containing score in the local storage
    * @param xml The xml object
    */
    function GetScoresFileData(xml){
        xml = xml.getElementsByTagName("ScoreDef")[0]
        var scoreRoot = xml.getAttribute("Name");
        savedScoreTreeList[scoreRoot] = {};
        savedScoreTreeList[scoreRoot]["scores"] = [];

        var thresholdsRAW = xml.getElementsByTagName("Thresholds")[0].getElementsByTagName("Threshold");
        var thresholds = {}
        for (var i = 0; i < thresholdsRAW.length; i++) {
            thresholdColor = thresholdsRAW[i].getAttribute("Color");
            thresholdLabel = thresholdsRAW[i].getElementsByTagName("Keyword")[0].getAttribute("Label");
            thresholdFrom = thresholdsRAW[i].getElementsByTagName("Keyword")[0].getAttribute("From");

            threshold = {color:thresholdColor, from:thresholdFrom};
            thresholds[thresholdLabel] = threshold;
        }
        savedScoreTreeList[scoreRoot]["thresholds"] = thresholds;
        xml = xml.getElementsByTagName("CompositeScore")[0];
        GetScores(xml, true, scoreRoot);
        CheckIfScoreExist(scoreRoot+"/"+scoreRoot, false);
        DisplayScore(scoreRoot, thresholds);
        BrowserAdapter(actualBrowser).storage.local.set({"scoreTreeList": savedScoreTreeList});
        BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(savedScoreTreeList), subject:"scoreTreeList"}, function() {});

    }

    /*
    * Navigate through the xml object to get score data.
    * @param scoreXML The XML object
    * @param root Boolean indicate if the current score is a root one
    * @param scoreRoot The score root/name
    * @return finalData The score data in json
    */
    function GetScores(scoreXML, root, scoreRoot){
        var nodes = scoreXML.getElementsByTagName("CompositeScore");
        var nodes = Array.prototype.slice.call(nodes);
        var compositeScores = nodes.filter(function(v, i){
            return v.parentElement === scoreXML;
        });

        var finalData = [];

        for (var i = 0; i < compositeScores.length; i++) {
            var scoreName = compositeScores[i].getAttribute("Name");
            var children = GetScores(compositeScores[i], false);
            var tempChildren = []
            var tempNodes = compositeScores[i].getElementsByTagName("LeafScore")
            var tempNodes = Array.prototype.slice.call(tempNodes);

            var leafScores = tempNodes.filter(function(v, k){
                return v.parentElement === compositeScores[i];
            });

            for (var j = 0; j < leafScores.length; j++) {
                var tempScoreName = leafScores[j].getAttribute("Name");
                tempChildren.push({scoreName:tempScoreName})
            }
            tempChildren.sort()

            if(tempChildren.length!=0){
                if(children.length!=0){
                    var temp = children[0]
                    tempChildren.push({scoreName:temp.scoreName, children:temp.children})
                }
            }

            if(root){
                var tempArray = children.concat(tempChildren)
                var keys = []
                for (var l = 0; l < tempArray.length; l++) { keys.push(tempArray[l].scoreName) }
                keys = keys.filter( function( item, index, inputArray ) {
                       return inputArray.indexOf(item) == index;
                });
                var finalChildren = []
                for (var l = 0; l < keys.length; l++) {
                    key = keys[l]
                    for (var k = 0; k < tempArray.length; k++) {
                        if(tempArray[k].scoreName == key){
                            finalChildren.push(tempArray[k]);
                            break;
                        }
                    }
                }

                savedScoreTreeList[scoreRoot]["scores"].push({scoreName:scoreName, children:finalChildren});
            }
            else {
                if(tempChildren.length!=0){
                    finalData.push({scoreName:scoreName, children:tempChildren});
                }
                else {
                    finalData.push({scoreName:scoreName, children:children});
                }
            }

        }

        return finalData
    }

    /*
    * Load the wanted score fie from input
    */
    function LoadScoreFile(){
        var file = document.getElementById("scoreFile").files[0];
        try {
            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function(e) {
                try {
                    var data = ( new window.DOMParser() ).parseFromString(reader.result, "text/xml");
                    GetScoresFileData(data);
                } catch (e) { console.log(e); }
            }
        } catch (e) { console.log(e); }
    }

    /*
    * Use to load the config from file input
    */
    function LoadConfigFile(){
        var file = document.getElementById("localConfigFile").files[0];
        if(file==null){
            document.getElementById("loadConfigMessage").innerHTML = "Please select a file";
            return;
        }

        try {
            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function(e) {
                try {
                    var jsonData = JSON.parse(reader.result);
                    document.getElementById("loadConfigMessage").innerHTML = "File readed";
                    ReadConfigFile(jsonData);
                } catch (e) {
                    console.log(e);
                    document.getElementById("loadConfigMessage").innerHTML = "Please select a valid JSON file";
                }
            }
        } catch (e) {
            document.getElementById("loadConfigMessage").innerHTML = "Error during reading.";
        }
    }

    /*
    Call by the click event of "#addToWhitelist" button and get the value of the input
    */
    function ManualAddWhitelist(){
        AddURLToWhitelist(document.getElementById('whitelistURL').value);
    }

    /*
    * Read the content of the config file
    * @param jsonData The json object get from the file
    */
    function ReadConfigFile(jsonData){
        var overwriteConfig = document.getElementById("overwriteConfig").checked;
        var importOnlyScores = document.getElementById("importOnlyScores").checked;

        // Use to know if the user does not want to import score only
        if(!importOnlyScores){
            // Check if the finder data are present and valid (not empty or null)
            if(jsonData["finderHost"]!="" && jsonData["finderHost"]!=null){
                if(jsonData["finderPort"]!="" && jsonData["finderPort"]!=null){
                    var finderHostname = jsonData["finderHost"] + ":" + jsonData["finderPort"];
                    var localFinderHostname = document.getElementById("finderHostname").value.trim();
                    var showFinderLink = jsonData["showFinderLink"];
                    if(overwriteConfig || localFinderHostname==null || localFinderHostname==""){
                        document.getElementById("finderHostname").value = finderHostname;
                        if (showFinderLink!=null)
                            document.getElementById("showFinderLink").checked = showFinderLink;
                        SaveFinderOptions();
                    }
                }
            }
            // Check if Engine login data are present and valid (not empty or null)
            if(jsonData["engineHostname"]!=null && jsonData["engineHostname"]!=""){
                var engineHostname = document.getElementById("engineHostname").value;
                if(overwriteConfig || engineHostname==null || engineHostname=="")
                    document.getElementById("engineHostname").value = jsonData["engineHostname"];
                var username = document.getElementById("username").value;
                if(overwriteConfig || username==null || username==""){
                    if(jsonData["username"]!=null && jsonData["username"]!="")
                        document.getElementById("username").value = jsonData["username"];
                    else
                        document.getElementById("loginMessage").innerHTML = "Please enter a username";
                }
                SaveLogin();
            }

            // Check if the whitelist is present and valid (not empty or null)
            if(jsonData["whitelist"]!=null && jsonData["whitelist"]!=""){
                var whitelistedUrlsToAdd = [];
                if(overwriteConfig){
                    RemoveAllWhitelistUrl();
                    whitelistedUrlsToAdd = jsonData["whitelist"];
                }
                else {
                    for (var i = 0; i < jsonData["whitelist"].length; i++) {
                        if(!savedWhitelistedURL.includes(jsonData["whitelist"][i]))
                            whitelistedUrlsToAdd.push(jsonData["whitelist"][i]);
                    }
                    whitelistedUrlsToAdd.sort();
                }

                for (var i = 0; i < whitelistedUrlsToAdd.length; i++)
                    AddURLToWhitelist(whitelistedUrlsToAdd[i]);
            }

            // Check if device infos present and valid
            if(jsonData["deviceOptions"]!=null && jsonData["deviceOptions"]!=""){
                var deviceOptionsToAdd = [];
                if(overwriteConfig){
                    RemoveAllDeviceInfo();
                    deviceOptionsToAdd = jsonData["deviceOptions"];
                }
                else {
                    for (var i = 0; i < jsonData["deviceOptions"].length; i++) {
                        if(!savedDeviceOptions.includes(jsonData["deviceOptions"][i]))
                            deviceOptionsToAdd.push(jsonData["deviceOptions"][i]);
                    }
                    deviceOptionsToAdd.sort();
                }

                for (var i = 0; i < deviceOptionsToAdd.length; i++)
                    AddDeviceInfo([deviceOptionsToAdd[i]]);
            }

            // Check device found style
            ["bold", "italic", "underline", "reloadWhenLogout"].forEach(function(entry){
                if(jsonData[entry]!=null){
                    if (overwriteConfig)
                        document.getElementById(entry).checked = jsonData[entry];
                    else if (!document.getElementById(entry).checked)
                        document.getElementById(entry).checked = jsonData[entry];
                }
            });
            SavePluginOptions();

        }

        if(jsonData["scoreTreeList"]!=null && jsonData["scoreTreeList"]!=""){
            savedScoreTreeList = jsonData["scoreTreeList"];
            BrowserAdapter(actualBrowser).storage.local.set({"scoreTreeList": savedScoreTreeList});
            BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(savedScoreTreeList), subject:"scoreTreeList"}, function() {});
            var keys = Object.keys(savedScoreTreeList);
            for (var i = 0; i < keys.length; i++) {
                DisplayScore(keys[i], savedScoreTreeList[keys[i]]["thresholds"])
            }
        }

        document.getElementById("loadConfigMessage").innerHTML = "Config file loaded";
    }

    /*
    * Remove all the url from the whitelist and clear the table tbody
    */
    function RemoveAllWhitelistUrl(){
        document.getElementById('whitelistItems').getElementsByTagName('tbody')[0].innerHTML = "";
        savedWhitelistedURL = [];
        BrowserAdapter(actualBrowser).storage.local.set({"whitelist": savedWhitelistedURL});
        BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(savedWhitelistedURL), subject:"whitelist"}, function() {});
    }

    /*
    * Use to remove all the score at once
    */
    function RemoveAllScores(){
        var emptyArray = [];
        savedScores = [];
        savedPayloads = [];
        savedRoot = [];
        BrowserAdapter(actualBrowser).storage.local.set({"scores": emptyArray});
        BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(emptyArray), subject:"scores"}, function() {});
        BrowserAdapter(actualBrowser).storage.local.set({"payloads": emptyArray});
        BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(emptyArray), subject:"payload"}, function() {});
        document.getElementById('scoreList').getElementsByTagName('tbody')[0].innerHTML = "";
        document.getElementById("scoreList").style.display = "none";
        document.getElementById("scoreMessage").innerHTML = "";
    }

    /*
    * Use to remove all the device info at once
    */
    function RemoveAllDeviceInfo(){
        var deviceOptions = [];
        savedDeviceOptions = deviceOptions;
        BrowserAdapter(actualBrowser).storage.local.set({"deviceOptions": deviceOptions});
        BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(deviceOptions), subject:"deviceOptions"}, function() {});
        document.getElementById('deviceInfoList').getElementsByTagName('tbody')[0].innerHTML = "";
        document.getElementById("deviceInfoList").style.display = "none";
        document.getElementById("deviceInfoMessage").innerHTML = "";
    }

    /*
    * Save the finder options in local storage
    */
    function SaveFinderOptions(){
        document.getElementById("finderMessage").innerHTML = "";

        var values = {
            "finderHostname": document.getElementById("finderHostname").value,
            "showFinderLink": document.getElementById("showFinderLink").checked
        }

        // Check if inputs are in the correct format
        if(values["finderHostname"]=="" || values["finderHostname"]==null){
            document.getElementById("finderMessage").innerHTML
                = "Please enter a hostname";
            return;
        }

        var finderInfo = values["finderHostname"].split(':');
        if (finderInfo.length==2) {
            finderHost = finderInfo[0];
            finderPort = finderInfo[1];
        }
        else {
            finderHost = values["finderHostname"];
            finderPort = "443";
        }

        document.getElementById("finderMessage").innerHTML = "Options saved.";

        BrowserAdapter(actualBrowser).storage.local.set(
            {
                "finderHost": finderHost,
                "finderPort": finderPort,
                "showFinderLink": values["showFinderLink"]
            }
            , function(){});

        BrowserAdapter(actualBrowser).runtime.sendMessage({data: values, subject:"finderOptions"}, function() {});
    }

    /*
    * Save data in local storage
    */
    function SaveLogin(){
        document.getElementById("loginMessage").innerHTML = "";
        var values = {
            "engineHostname":document.getElementById("engineHostname").value.replace('https://',''),
            "username": document.getElementById("username").value
        }

        // Check if inputs are in the correct format
        if(values["engineHostname"]==null || values["engineHostname"]==""){
            document.getElementById("loginMessage").innerHTML
                = "Please enter a hostname";
            return;
        }
        if(values["username"]==null || values["username"]==""){
            document.getElementById("loginMessage").innerHTML
                = "Please enter a username";
            return;
        }
        document.getElementById("loginMessage").innerHTML = "Options saved.";

        BrowserAdapter(actualBrowser).storage.local.set(
            {
                "engineHostname": values["engineHostname"],
                "username": values["username"]
            }
        , function(){});
    }

    /*
    * Save the plugin options in the local storage
    */
    function SavePluginOptions(){
        var pluginOptions = {
            "bold": document.getElementById("bold").checked,
            "underline": document.getElementById("underline").checked,
            "italic": document.getElementById("italic").checked,
            "reloadWhenLogout": document.getElementById("reloadWhenLogout").checked
        };

        BrowserAdapter(actualBrowser).storage.local.set(
            pluginOptions
        , function(){});

        document.getElementById("pluginOptionsMessage").innerHTML = "Options saved."
        BrowserAdapter(actualBrowser).runtime.sendMessage({data: pluginOptions, subject:"pluginOptions"}, function() {});
    }

    /*
    * Sort all the tr in the element
    * @param table The element where to sort the tr (can be table or tbody for example)
    */
    function SortTable(table) {
      var table, rows, switching, i, x, y, shouldSwitch;
      switching = true;

      while (switching) {
        switching = false;
        rows = table.getElementsByTagName("TR");
        for (i = 0; i < (rows.length - 1); i++) {
          shouldSwitch = false;
          x = rows[i].getElementsByTagName("TD")[0];
          y = rows[i + 1].getElementsByTagName("TD")[0];
          if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
            shouldSwitch= true;
            break;
          }
        }
        if (shouldSwitch) {
          rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
          switching = true;
        }
      }
    }

    /*
    * The main function to execute when the DOM is loaded
    */
    function Main(){
        actualBrowser = CheckBrowser();

        // Set all the button events
        document.getElementById('saveLogin').addEventListener('click', SaveLogin, false);
        document.getElementById('saveFinderOptions').addEventListener('click', SaveFinderOptions, false);
        document.getElementById('createConfigFile').addEventListener('click', CreateConfigFile, false);
        document.getElementById('loadConfigFile').addEventListener('click', LoadConfigFile, false);
        document.getElementById('addWhitelistURL').addEventListener('click', ManualAddWhitelist, false);
        document.getElementById('removeAllSites').addEventListener('click', RemoveAllWhitelistUrl, false);
        document.getElementById('saveOptions').addEventListener('click', SavePluginOptions, false);
        document.getElementById('addDeviceInfo').addEventListener('click', function(){ AddDeviceInfo([document.getElementById("deviceInfo").value]); }, false);
        document.getElementById('removeAllDeviceInfo').addEventListener('click', RemoveAllDeviceInfo, false);

        document.getElementById('loadScoreFile').addEventListener('click', LoadScoreFile, false);
        // Load and display saved data
        dataToGet = ["engineHostname", "username"];
        dataToGet.forEach(function(entry){
            BrowserAdapter(actualBrowser).storage.local.get([entry], function(data){
                if(data[entry]!=null && data[entry]!="")
                    document.getElementById(entry).value = data[entry];
            });
        });

        BrowserAdapter(actualBrowser).storage.local.get(["finderHost", "finderPort"], function(data){
            if(data["finderPort"]!=null && data["finderPort"]!="")
                if (data["finderPort"]=="443")
                    document.getElementById("finderHostname").value = data["finderHost"];
                else
                    document.getElementById("finderHostname").value = (data["finderHost"]+":"+data["finderPort"]);
        });

        dataToGet = ["showFinderLink", "bold", "underline", "italic", "reloadWhenLogout"];
        dataToGet.forEach(function(entry){
            BrowserAdapter(actualBrowser).storage.local.get([entry], function(data){
                if(data[entry]!=null && data[entry]!="")
                    document.getElementById(entry).checked = data[entry];
            });
        });

        savedScores = BrowserAdapter(actualBrowser).extension.getBackgroundPage().scoreList;
        savedPayloads = BrowserAdapter(actualBrowser).extension.getBackgroundPage().payloadList;
        savedWhitelistedURL = BrowserAdapter(actualBrowser).extension.getBackgroundPage().whitelist;
        savedDeviceOptions = BrowserAdapter(actualBrowser).extension.getBackgroundPage().deviceOptions;
        savedScoreTreeList = BrowserAdapter(actualBrowser).extension.getBackgroundPage().scoreTreeList;

        if (savedScores==null) { savedScores = []; }
        if (savedPayloads==null ) { savedPayloads = [];}
        if (savedWhitelistedURL==null) { savedWhitelistedURL = []; }
        if (savedDeviceOptions==null) { savedDeviceOptions = []; }
        if (savedScoreTreeList==null) { savedScoreTreeList = {}; }

        savedRoot = [];
        for (var i = 0; i < savedScores.length; i++) {
            var scoreRoot = savedScores[i].split("/")[0];
            var scoreRootPayload = scoreRoot+"/"+scoreRoot
            if(!savedRoot.includes(scoreRootPayload)){
                savedRoot.push(scoreRootPayload);
                if(!savedScores.includes(scoreRootPayload))
                    savedScores.push(scoreRootPayload);
            }
        }

        var keys = Object.keys(savedScoreTreeList);
        for (var i = 0; i < keys.length; i++) {
            DisplayScore(keys[i], savedScoreTreeList[keys[i]]["thresholds"])
        }

        if(savedScores!=BrowserAdapter(actualBrowser).extension.getBackgroundPage().scoreList){
            BrowserAdapter(actualBrowser).storage.local.set({"scores": savedScores});
            BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(savedScores), subject:"scores"}, function() {});
        }

        if(savedWhitelistedURL.length!=0)
            savedWhitelistedURL.forEach(function(data){ AddToTableWhitelist(data); });

        if(savedDeviceOptions.length!=0)
            savedDeviceOptions.forEach(function(data){ AddDeviceInfoToTable(data); });
        else
            document.getElementById("deviceInfoList").style.display = "none";
    }

    Main();
//});
}
