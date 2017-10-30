# Nexthink Chrome Plugin
## Description
This is a Chrome plugin that allows users to connect to a Nexthink Engine and then gather data from it.
Once connected, the plugin retrieves the names of all devices stored in the Engine.
If the URL is in the whitelist the plugin will next search for device names in the current tab.
Subsequently, the user can display a floating box with the device data by hovering the mouse over the device name in the page.

## Functionality
 - Display floating data box
 - Automatically scan when the page changes
 - Open the Nexthink Finder (for a specified device or not)
 - Connect to a Nexthink Engine via the Web API v2
 - Import/export configuration
 - Customise the fields and scores to display
 - Field validation prior to attempting to retrieve data
 - Whitelist to control on which sites the plugin will be functional
 - Works on both Chrome and Firefox
 

## Installation
### Firefox: 
Store page: tbc

For debugging/development, go to `about:debugging` and select `Load Temporary Add-on`. 
Select `manifest.json` found in `src/`.

### Chrome: 
Store page: https://chrome.google.com/webstore/detail/gjbpidcnakeejldikpkilidigkakhdme

For debugging/development, go to chrome://extensions/ and check `Developer mode`.
Next, click `Load unpacked extension...` and navigate to the location of the `src/` folder.

## Run Protractor tests
### Prepare environment
If Protractor is not installed on your computer, open a command prompt and run the command: `npm install -g protractor`
Note: you must have Node.js installed

Before starting Firefox tests, you must also install the Node modules "q" and "selenium-webdriver".
Use the following command to do so: `npm install q selenium-webdriver --save-dev`

Note: Firefox Developer Edition must be use for testing in Firefox

To make sure the tests run correctly, make sure that the test data are correct.
In the 'test_position.html' file, replace the CHDB0** device name by one present in your Nexthink Engine.
Note: only one device name is necessary.

`testConfig.json` must contain at least the following items:
 - deviceOptions
 - engineHostname
 - finderHost
 - finderPort
 - scoreTreeList
 - username
 - whitelist
> The `whitelist` item must contain the STATIC path to `test/E2E/data`


### Run the tests
Run the following commands to start the Selenium Server:
`webdriver-manager update`
`webdriver-manager start`

Next, open a new command prompt and navigate to the 'test/E2E' folder.
To run the Firefox tests: `protractor conf_Firefox.js`
To run the Chrome tests: `protractor conf_Chrome.js`

### Test with iFrames
In the 'popup.js' file, to use the last part, a web server is needed.
If you do not have one, leave the `testURL` parameter empty in the `.conf` files.
If you have one, copy the files `test.css`, `test_position.html` and `test_frame.html` to your website directory and set the `testURL` parameter with your URL in a way to access the `test_position.html` file.

## Run unit tests
If Jasmine is not installed on your computer, open a command prompt and run the command: `npm install -g jasmine`
Note: you must have Node.js installed

The Node package `jsdom` must be install in the `test/UnitTests` folder.
`npm install jsdom --save-dev`

Navigate in the 'test/UnitTests' folder and then use the `jasmine` command.

## Code notes
### Code for cross-browser capability
In order for the plugin to function on both Chrome and Firefox,
you must use the `src/browserAdapter.js` file.
Once it is loaded, use this function:
```javascript
actualBrowser = CheckBrowser();
```
to get the current browser identity. This will ensure that the right API is used.
After that, instead of using a browser specific API, use the following:
```javascript
BrowserAdapter(actualBrowser)
```

Do not forget to take into consideration API compatibility.
For more information, go to the link below:
https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Chrome_incompatibilities

### Data storage
The connection information is only saved locally. This mean that it is not saved on the user account if he has one, e.g. Firefox Sync or Google Account.
The data can only be accessed through a page from the extension itself and through content scripts.
However, the storage area is not encrypted. This is why the password is encrypted before being saved.
