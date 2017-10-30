var connectionData, scores, options = [];
var deviceName;
var actualBrowser;

/*
* Retrieve get parameter value in url
* @param name The name of the parameter
* @return A string with the value
*/
function GetParameterByName(name) {
    url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/*
* Get the info of the device, with the selected scores and options
* @param deviceName The name of the device to search
*/
function GetDeviceInfo(deviceName){

    // Generate the select part of the query
    var startScoreString = '#"score:';
    var scoreToGet = "";
    scores.forEach(function(data){
        if(data.indexOf(startScoreString)===-1)
            data = startScoreString + data + '"'
        var data = " " + data;
        scoreToGet += data;
    });

    var deviceInfosToGet = "";
    for (var i = 0; i < options.length; i++) {
        deviceInfosToGet += ' \"'+options[i]+'\"';
    }

    // Create where clause, use to get the data of all the device at once
    var devicesWhereClause = '(where device(eq name (string "'+deviceName+'")))';

    // Create the query
    var query = '(select (name '+deviceInfosToGet+' '+scoreToGet+') (from device '+devicesWhereClause+') (order_by name asc))';
    // Create a simple query
    mainURL = "https://" + connectionData["engineHostname"] + "/2/query";
    var url = mainURL + "?format=xml&hr=true&query=" + encodeURIComponent(query);

    // Send request to engine, use to know if the user can access the Web API
    var xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200){
            if (this.responseText!=null && this.responseText!="[]") {
                console.log(this.responseText);
                var x2js = new X2JS();
                var jsonObj = x2js.xml_str2json(this.responseText);
                var header = jsonObj.table.header;
                var rawDevices = jsonObj.table.body.r;
                var devicesGet = [{}]

                var keys = Object.keys(header);
                try {
                    for(var i=0;i<keys.length;i++){
                        var key = keys[i];
                        var keyValue = header[key]["__text"]
                            devicesGet[0][keyValue] = rawDevices[key];
                    }

                    BrowserAdapter(actualBrowser).runtime.sendMessage({data: JSON.stringify(devicesGet), subject:"askDevicePopup"}, function() {});

                } catch (e) {
                    document.getElementById("dataPopup").innerHTML='<div align="center">No device found</div>';
                }
            }
        }
        else if (this.readyState == 4 && this.status != 200)
        {
            alert("Error while connection to engine");
        }
    };

    xhttp.open("GET", url);
    xhttp.setRequestHeader("Authorization", "Basic " + GetXMLLogin());
    xhttp.onerror = function() {
        alert("Error while accessing to engine");
    };

    xhttp.send();
}

/*
* Return the authentification part for any xml request (use to decrypt the password)
*/
function GetXMLLogin(){
    return btoa(connectionData["username"] + ":" + DecryptString(connectionData["key"], connectionData["password"]));
}

/*
* Main function
*/
function main(){
    deviceName = GetParameterByName("search");
    document.getElementById("deviceName").innerHTML=deviceName;

    if(deviceName!="" && deviceName!=null){
        BrowserAdapter(actualBrowser).runtime.sendMessage({subject:"askDeviceInfo"}, function() {});
    }
}

window.onload = function (){
//document.addEventListener('DOMContentLoaded', function() {
    actualBrowser = CheckBrowser();
    // Check if the page receive a message
    BrowserAdapter(actualBrowser).runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            // Make sure the message come from the plugin
            if (actualBrowser=="Firefox")
                extensionId = sender.extensionId;
            else
                extensionId = sender.id;

            if(BrowserAdapter(actualBrowser).runtime.id===extensionId){
                if(request["subject"]=="getDeviceInfo"){
                    scores = JSON.parse(request["scores"]);
                    options = JSON.parse(request["options"]);

                    connectionData = BrowserAdapter(actualBrowser).extension.getBackgroundPage().connectionData;
                    GetDeviceInfo(deviceName);
                }
                else if (request["subject"]=="devicesPopup") {
                    try {
                        data = JSON.parse(request["data"]);
                        if(data[0][0]==deviceName){
                            var deviceInfo = JSON.parse(request["data"])[0][1];
                            var displayNode = document.createElement('div');
                            displayNode.innerHTML = deviceInfo;
                            displayNode = displayNode.childNodes[0];
                            document.getElementById("dataPopup").innerHTML="";
                            document.getElementById("dataPopup").appendChild(displayNode);

                            var links = document.getElementById("dataPopup").querySelector(".tabLinks");
                            for (var j = 0; j < links.children.length; j++) {
                                links.children[j].onclick = null;
                                var name = links.children[j].innerHTML;
                                links.children[j].addEventListener("click", function(e){
                                    var name = this.innerHTML.replace(new RegExp(/ /, 'g'), '_').replace(new RegExp(/\:/, 'g'), '').toLowerCase();
                                    var i, tabcontent, tablinks;
                                    var device = e["target"].parentNode.parentNode.id;
                                    device = device.replace(new RegExp(/\./, 'g'), '\\.');
                                    var element = document.querySelector(".dataPopupTab#"+device);
                                    tabcontent = document.getElementsByClassName("dataPopupTabContent");
                                    for (i = 0; i < tabcontent.length; i++) {
                                        tabcontent[i].style.display = "none";
                                    }
                                    tablinks = document.getElementsByClassName("dataPopupTablinks");
                                    for (i = 0; i < tablinks.length; i++) {
                                        tablinks[i].className = tablinks[i].className.replace(" active", "");
                                    }
                                    element.querySelector("#"+name).style.display = "table";
                                    this.className += " active";
                                }, false);
                            }
                            var img = document.createElement("img");
                            document.getElementById("dataPopup").appendChild(img);
                            try {
                                var src = chrome.runtime.getURL('img/logo.png');
                            } catch (e) {
                                var src = browser.runtime.getURL('img/logo.png');
                            }
                            img.src = src;
                            img.height = "13";
                            img.id = "logo"

                            document.getElementById("dataPopup").querySelector("#defaultOpen").click();
                        }
                    } catch (e) { }

                }
            }
        }
    );

    main();
}
