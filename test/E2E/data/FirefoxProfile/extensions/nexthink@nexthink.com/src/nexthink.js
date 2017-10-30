/*
* Send the request to Engine, wait for result before continuing script execution.
* @param mainURL The basic url to access Engine
* @param log The login array with [username, password]
* @param query The query to send to NXQL Engine
* @param parameters The parameters of the query
* @return XMLHttpRequest object
*/
function StartRequest(mainURL, log, query, parameters=""){
    return new Promise(resolve => {
        var xhttp = new XMLHttpRequest();

        var url = mainURL + "?" + parameters +"&query=" +  encodeURIComponent(query);
        xhttp.timeout = 15000;
        xhttp.onload = function () {
            if (this.status === 200) { resolve(this); }
            else { resolve({status:0}); }
        };
        xhttp.open("GET", url);
        xhttp.setRequestHeader("Authorization", "Basic " + btoa(log[0]+":"+log[1]));
        xhttp.onerror = function () { resolve({status:0}); };
        xhttp.send();
    });
}

/*
* Generate the query string to send to Engine
* @param devices The array of device to put in where clause
* @param deviceProperties The array of device properties to get
* @param scores The array of score to get
* @return Query to send to Engine
*/
function GenerateQuery(devices, deviceProperties, scores){
    if(!devices){ return ""; }
    else{
        devicesWhereClause = GenerateDevicesListToGetString(devices);

        try {
            deviceInfoToGet = GenerateDevicePropertiesToGetString(deviceProperties);
        } catch (e) { deviceInfoToGet = ""; }

        try {
            scoreToGet = GenerateScoreListToGetString(scores);
        } catch (e) { scoreToGet = ""; }

        var query = '(select (name '+deviceInfoToGet+' '+scoreToGet+') (from device '+devicesWhereClause+') (order_by name asc))';
        return query;
    }
}

/*
* Get the list of device in Engine
* @param mainURL The basic url to access Engine
* @param log The login array with [username, password]
* @param parameters The parameters of the query
* @return XMLHttpRequest object
*/
async function GetDevicesList(mainURL, log, parameters){
    var query = "(select (name) (from device) (order_by name asc))";
    var xhttp = await StartRequest(mainURL, log, query, parameters);
    return xhttp;
}

/*
* Get the selected data of the selected devices
* @param mainURL The basic url to access Engine
* @param log The login array with [username, password]
* @param devices The array of device to put in where clause
* @param deviceProperties The array of device properties to get
* @param scores The array of score to get
* @param parameters The parameters of the query
* @return XMLHttpRequest object
*/
async function GetDeviceData(mainURL, log, devices, deviceProperties=[], scores=[] , parameters=""){
    var query = GenerateQuery(devices, deviceProperties, scores);
    var xhttp = await StartRequest(mainURL, log, query, parameters);
    return xhttp;
}

/*
* Check if device property exist
* @param mainURL The basic url to access Engine
* @param log The login array with [username, password]
* @param deviceProperties The device propertie to get
* @param parameters The parameters of the query
* @return XMLHttpRequest object
*/
async function CheckIfDevicePropertiesExist(mainURL, log, deviceProperties, parameters=""){
    var query = "(select ("+deviceProperties+") (from device)(limit 1))"
    var xhttp = await StartRequest(mainURL, log, query, parameters);
    return xhttp;
}

/*
* Check if device score exist
* @param mainURL The basic url to access Engine
* @param log The login array with [username, password]
* @param deviceScore The score to get
* @param parameters The parameters of the query
* @return XMLHttpRequest object
*/
async function CheckIfDeviceScoreExist(mainURL, log, deviceScore, parameters=""){
    var query = "(select ("+deviceScore+") (from device)(limit 1))"
    var xhttp = await StartRequest(mainURL, log, query, parameters);
    return xhttp;
}

/*
* Create string of score to get in good format
* @param The array of score to get
* @return String of score to quet for query
*/
function GenerateScoreListToGetString(scoreList){
    var startScoreString = '#"score:';
    var scoreToGet = "";
    scoreList.forEach(function(data){
        if(data){
            if(data.indexOf(startScoreString)===-1)
                data = startScoreString + data + '"'
            var data = " " + data;
            scoreToGet += data;
        }
    });

    return scoreToGet;
}

/*
* Create string of device properties to get in good format
* @param The array of device properties to get
* @return String of device properties to quet for query
*/
function GenerateDevicePropertiesToGetString(deviceProperties){
    var deviceInfoToGet = "";
    for (var i = 0; i < deviceProperties.length; i++) {
        deviceInfoToGet += ' \"'+deviceProperties[i]+'\"';
    }
    return deviceInfoToGet;
}

/*
* Create string of device to get in good format
* @param The array of device to get
* @return String of device to quet for query
*/
function GenerateDevicesListToGetString(devices){
    var devicesWhereClause = "";
    devices.forEach(function(data){
        devicesWhereClause += '(where device(eq name (string "'+data+'")))';
    });
    return devicesWhereClause;
}
