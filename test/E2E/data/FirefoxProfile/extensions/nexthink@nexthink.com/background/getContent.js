/*
* Read the content of the current frame (also check the inputs value)
* @param The current frame
* @return
*/
function getFrameContent(frame){
    var inputValues = "";
    try {
        var inputElements = frame.contentWindow.document.body.getElementsByTagName("input");
        for(var j=0 ; j<inputElements.length ; j++)
            inputValues+= (" " + inputElements[j].value);
        return frame.contentWindow.document.body.innerText + inputValues;
    } catch (e) {
        console.log(e);
        return "";
    }
}

var framesList = document.getElementsByTagName("frame");
var iFramesList = document.getElementsByTagName("iframe");
var toSend = document.body.innerText;
var inputValues = "";
try {
    var inputElements = document.body.getElementsByTagName("input");
    for (var j = 0; j < inputElements.length; j++)
        inputValues += (" " + inputElements[j].value);
    toSend += inputValues;
} catch (e) { }

for (var i = 0; i < framesList.length; i++)
    toSend += getFrameContent(framesList[i]);

for (var i = 0; i < iFramesList.length; i++)
    toSend += getFrameContent(iFramesList[i]);
console.log(toSend);
toSend = toSend.replace(/[\n\r\t]+/g, ' ').split(" ").filter(function (el, i, arr) {
    return arr.indexOf(el) === i;
});

// Send the message
try {
    chrome.runtime.sendMessage( {data: toSend, subject:"content", fullPage:true} );
} catch (e) {
    browser.runtime.sendMessage( {data: toSend, subject:"content", fullPage:true} );
}
