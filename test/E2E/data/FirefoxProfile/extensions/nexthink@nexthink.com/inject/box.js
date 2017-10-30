var timeOut;

/*
* Use to display the popup near the device name with the right data
* @param e The event object
*/
function (e, actualDocument) {
    if(!actualDocument){ actualDocument=document }
    if(e["target"].value && e["target"].value!=""){
        var deviceName = e["target"].value;
    }else {
        var deviceName = e["target"].id;
    }

    var el, x, y;
    var deviceID = "#" + deviceName.replace(new RegExp(/\./, 'g'), '\\.');

    el = actualDocument.getElementById('dataPopup');
    if(el.className.indexOf("noLink") >= 0)
        el.className = deviceName + " noLink";
    else
        el.className = deviceName;
    for (var i = 0; i < el.children.length; i++) {
        el.children[i].style.display="none";
    }

    el.querySelector(deviceID).querySelector("#defaultOpen").click();
    el.style.display = "block";

    try{
        el.querySelector(deviceID).style.display="table";
        el.onmouseleave = function() {
            this.setAttribute("data-hover", false);
            Timeout(actualDocument);
        };
        el.onmouseover = function(){
            this.setAttribute("data-hover", true);
            clearTimeout(timeOut);
        };
    } catch (e) { console.log(e); }

    var tar = e["target"];
    var viewportOffset = tar.getBoundingClientRect();

    // Remove all bubble pointer classes
    var availableOrientation = ["Center", "Left", "Right"];
    for (var i = 0; i < availableOrientation.length; i++) {
        el.classList.remove("up"+availableOrientation[i]);
        el.classList.remove("down"+availableOrientation[i]);
    }

    var pointerClass = "";
    x = viewportOffset.left + viewportOffset.width/2 - el.offsetWidth/2 - window.scrollX;
    y = viewportOffset.top - el.offsetHeight - 10 - window.scrollY;

    if(y<0){
        y = viewportOffset.top + viewportOffset.height + 13 + window.scrollY;
        pointerClass += "up";
    }
    else
        pointerClass += "down";

    if(x<0){
        x = viewportOffset.left + window.scrollX;
        pointerClass += "Left";
    }
    else if(viewportOffset.left+el.offsetWidth>window.innerWidth){
        x = viewportOffset.right - el.offsetWidth + window.scrollX;
        pointerClass.substring(0,4);
        pointerClass += "Right"
    }
    else
        pointerClass += "Center";

    el.classList.add(pointerClass);

    el.style.left = x + "px";
    el.style.top = y + "px";

    el.style.position = "absolute";
    el.style.zIndex = "99999";
    el.setAttribute("data-hover", true);
}

/*
* Set the popup timeOut use when the mouse is not hover the popup
*/
function Timeout(actualDocument){
    if(!actualDocument){ actualDocument=document; }
    timeOut = setTimeout(function() {
        var element = actualDocument.getElementById('dataPopup');
        try {
            if(element.attributes["data-hover"].value=="false"){
                var rect = element.getBoundingClientRect();
                element.style.display="none";
                var deviceID = "#" + element.className.replace(new RegExp(/\./, 'g'), '\\.');
                element.querySelector(deviceID).style.display="none";
                element.className = "";
                el.setAttribute("data-hover", false);
            }
        } catch (e) {}
    }, 500);
}

/*
* Use to know if the popup need to be hide
* @param e The event object
*/
function CheckIfNeedToShowPopup(e, actualDocument){
    if(!actualDocument){ actualDocument=document; }
    try {
        if(e["relatedTarget"].id!="dataPopup"){
            actualDocument.getElementById('dataPopup').setAttribute("data-hover", false);
            Timeout(actualDocument);
        }
    } catch (e) { }

}

/*
* Hide other popup tabs and show the choosen one
* @param evt The event object
* @param tabName The name of the tab to show
*/
function OpenDataPopupTab(evt, tabName, actualDocument) {
    if(!actualDocument){actualDocument=document}
    var i, tabcontent, tablinks;
    var device = evt["target"].parentNode.parentNode.parentNode.classList[0];
    device = device.replace(new RegExp(/\./, 'g'), '\\.');
    var element = actualDocument.querySelector(".dataPopupTab#"+device);
    tabcontent = actualDocument.getElementsByClassName("dataPopupTabContent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = actualDocument.getElementsByClassName("dataPopupTablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    element.querySelector("#"+tabName).style.display = "table";
    evt.currentTarget.className += " active";
}
