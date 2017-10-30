/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*jslint nomen: true*/
/*global browser, chrome*/

/*
* Read the content of the current frame (also check the inputs value)
* @param The current frame
* @return
*/
function getFrameContent(frame) {
    "use strict";
    var inputValues, inputElements, j;
    inputValues = "";
    try {
        inputElements = frame.contentWindow.document.body.getElementsByTagName("input");
        for (j = 0; j < inputElements.length; j += 1) { inputValues += (" " + inputElements[j].value); }
        return frame.contentWindow.document.body.innerText + inputValues;
    } catch (e) {
        console.log(e);
        return "";
    }
}

var framesList, iFramesList, toSend, inputValues, inputElements, j;

framesList = document.getElementsByTagName("frame");
iFramesList = document.getElementsByTagName("iframe");
toSend = document.body.innerText;
inputValues = "";

try {
    inputElements = document.body.getElementsByTagName("input");
    for (j = 0; j < inputElements.length; j += 1) { inputValues += (" " + inputElements[j].value); }
    toSend += inputValues;
} catch (ignore) { }

for (j = 0; j < framesList.length; j += 1) { toSend += getFrameContent(framesList[j]); }
for (j = 0; j < iFramesList.length; j += 1) { toSend += getFrameContent(iFramesList[j]); }

toSend = toSend.replace(/[\n\r\t]+/g, ' ').split(" ").filter(function (el, i, arr) {
    "use strict";
    return arr.indexOf(el) === i;
});

// Send the message
try {
    chrome.runtime.sendMessage({data: toSend, subject: "content", fullPage: true});
} catch (e) {
    browser.runtime.sendMessage({data: toSend, subject: "content", fullPage: true});
}
