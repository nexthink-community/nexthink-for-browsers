/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*jslint nomen: true*/
/*global browser, chrome, DOMParser, MutationObserver*/

var config, observer, target, className;
target = document;
className = "BOX985334b4-a808-4abc-b4e3-f34b83a747fe";

// Send added text to background to search content when a element is edited/added
observer = new MutationObserver(function (mutations) {
    "use strict";
    var textToSend = "", toSend;
    mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
            if (mutation.target !== "head" && mutation.target !== "style") {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeName !== "SCRIPT") {
                        var tempText, parser, dom;
                        tempText = "";
                        try {
                            if (!node.classList.contains(className)) { tempText = (node.innerText + " "); }
                        } catch (e) {
                            try {
                                if (!node.classList.contains(className)) { tempText = (node.wholeText + " "); }
                            } catch (ignore) { }
                        }
                        parser = new DOMParser();
                        dom = parser.parseFromString(tempText, 'text/html');
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
        if (toSend.length === 1 && toSend[0] === "") { return; }
        try {
            chrome.runtime.sendMessage({data: toSend, subject: "content", fullPage: false});
        } catch (e) {
            browser.runtime.sendMessage({data: toSend, subject: "content", fullPage: false});
        }
    } catch (ignore) { }
});

config = { attributes: true, childList: true, characterData: true, subtree: true };
observer.observe(target, config);
