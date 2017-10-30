function BrowserAdapter(actualBrowser){
    if (actualBrowser=="Firefox"){
        return browser;
    }
    else if(actualBrowser=="Chrome"){
        return chrome;
    }
}

function CheckBrowser(){
    try {
        browser.extension.getURL('background/background.js');
        return actualBrowser = "Firefox";
    } catch (e) {
        chrome.extension.getURL('background/background.js');
        return actualBrowser = "Chrome";
    }
}
