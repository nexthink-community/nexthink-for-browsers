/*jshint esversion:6*/
/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/

/*
* Create string of score to get in good format
* @param The array of score to get
* @return String of score to quet for query
*/

"use strict";

function generateScoreListToGetString(scoreList) {
    var startScoreString, scoreToGet;
    startScoreString = '#"score:';
    scoreToGet = "";
    scoreList.forEach(function (data) {
        if (data) {
            if (data.indexOf(startScoreString) === -1) { data = startScoreString + data + '"'; }
            data = " " + data;
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
function generateDevicePropertiesToGetString(deviceProperties) {
    var deviceInfoToGet, i;
    deviceInfoToGet = "";
    for (i = 0; i < deviceProperties.length; i += 1) {
        if (deviceProperties[i] !== "name") { deviceInfoToGet += ' \"' + deviceProperties[i] + '\"'; }
    }
    return deviceInfoToGet;
}

/*
* Create string of device to get in good format
* @param The array of device to get
* @return String of device to quet for query
*/
function generateDevicesListToGetString(devices) {
    var devicesWhereClause = "";
    devices.forEach(function (data) {
        devicesWhereClause += '(where device(eq name (string "' + data + '")))';
    });
    return devicesWhereClause;
}

/*
* Send the request to Engine, wait for result before continuing script execution.
* @param mainURL The basic url to access Engine
* @param log The login array with [username, password]
* @param query The query to send to NXQL Engine
* @param parameters The parameters of the query
* @return XMLHttpRequest object
*/
function startRequest(mainURL, log, query, parameters) {
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
function generateQuery(devices, deviceProperties, scores) {
    var devicesWhereClause, deviceInfoToGet, scoreToGet, query;
    if (!devices) {
        return "";
    } else {
        devicesWhereClause = generateDevicesListToGetString(devices);

        try {
            deviceInfoToGet = generateDevicePropertiesToGetString(deviceProperties);
        } catch (e) { deviceInfoToGet = ""; }

        try {
            scoreToGet = generateScoreListToGetString(scores);
        } catch (e) { scoreToGet = ""; }

        query = '(select (name ' + deviceInfoToGet + ' ' + scoreToGet + ') (from device ' + devicesWhereClause + ') (order_by name asc))';
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
function getDevicesList(mainURL, log, parameters) {
    var query, xhttp;
    query = "(select (name) (from device) (order_by name asc))";
    xhttp = startRequest(mainURL, log, query, parameters);
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
function getDeviceData(mainURL, log, devices, deviceProperties=[], scores=[] , parameters="") {
    var query, xhttp;
    query = generateQuery(devices, deviceProperties, scores);
    xhttp = startRequest(mainURL, log, query, parameters);
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
function checkIfDevicePropertiesExist(mainURL, log, deviceProperties, parameters="") {
    var query, xhttp;
    query = "(select (" + deviceProperties + ") (from device)(limit 1))";
    xhttp = startRequest(mainURL, log, query, parameters);
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
function checkIfDeviceScoreExist(mainURL, log, deviceScore, parameters="") {
    var query, xhttp;
    query = "(select (" + deviceScore + ") (from device)(limit 1))";
    xhttp = startRequest(mainURL, log, query, parameters);
    return xhttp;
}
