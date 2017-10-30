var target = document;
var className = "BOX985334b4-a808-4abc-b4e3-f34b83a747fe";

// Send added text to background to search content when a element is edited/added
var observer = new MutationObserver(function(mutations) {
    var textToSend = "";
    mutations.forEach(function(mutation) {
        if(mutation.type=="childList"){
            if(mutation.target!="head" && mutation.target!="style"){
                mutation.addedNodes.forEach(function(node){
                    if(node.nodeName!="SCRIPT"){
                        var tempText = "";
                        try {
                            if(!node.classList.contains(className))
                                tempText = (node.innerText + " ");
                        } catch (e) {
                            try {
                                if(!node.classList.contains(className))
                                    tempText = (node.wholeText + " ");
                            } catch (e) { }
                        } finally {}
                        var parser = new DOMParser;
                        var dom = parser.parseFromString(tempText, 'text/html');
                        textToSend += dom.body.textContent;
                    }
                });
            }
        }
    });

    try {
        toSend = textToSend.replace(/[\n\r\t,]+/g, ' ').split(" ").filter(function (el, i, arr) {
            return arr.indexOf(el) === i;
        });
        if(toSend.length==1 && toSend[0]=="")
            return;
        try {
            chrome.runtime.sendMessage({data: toSend, subject:"content", fullPage:false}, function() {});
        } catch (e) {
            browser.runtime.sendMessage({data: toSend, subject:"content", fullPage:false}, function() {});
        }
    } catch (e) {    }
});

var config = { attributes: true, childList: true, characterData: true, subtree:true };
observer.observe(target, config);
