# Nexthink Chrome Plugin
## Description
This is a Chrome plugin that allow the user to connect to a Nexthink Engine and then
gather data from it.
Once connected to an Engine, the plugin will retrieve all the device name from it.
Then, the plugin will search for device name in the current tab (if the URL is in the whitelist).
After that, the user can display a floating box with the device data when the mouse
is hover the device name. Or he can get a the same data from the popup.

## Functionalities
 - Allow the user to manually rescan the page
 - Automatic scan when the page change
 - Can open the Nexthink Finder (For a specified device or not)
 - Connection to a Nexthink Engine
 - Create configuration file
 - Display floating data box
 - Edit the Nexthink Finder connection information (Like IP or port)
 - Get device name when the page is edited
 - Get specified device information
 - Make sure the added scores are valid
 - Save password
 - Search for device in tab
 - Search for specific device
 - Selected the scores to show
 - Update data boxes when score list is edited
 - Use of a whitelist
 - Work on Chrome and Firefox

## Use Protractor tests
If Protractor is not installed on your computer, open a command prompt and
run the command : `npm install -g protractor`
> Note: you need to have Node.js installed

Then run the following commands to start the Selenium Server :
```
webdriver-manager update
webdriver-manager start
```

Finally open a new command prompt, and navigate to the '.tests/E2E' folder.

To run Firefox test: `protractor conf_Firefox.js`

To run Chrome test: `protractor conf_Chrome.js`
> Before starting Firefox tests, the Node modules "q" and "selenium-webdriver".
> Use the following command to do so :
> `npm install q selenium-webdriver --save-dev`

### Test with iFrames
In the 'popup.js' file, to use the last part, a web server is needed.
If you do not have one, leaves the 'testURL' param empty in the '.conf' files.
If you have one, copy the files 'test.css', 'test_position.html' and 'test_frame.html'
to your website directory and set the 'testURL' param with your URL in a way
to access the 'test_position.html' file.

## Code notes
### Code for cross-browser capability
For keeping the plugin work on both Chrome and Firefox,
you need to use the 'src/browserAdapter.js' file.
Once it is load, use this function:
```javascript
actualBrowser = CheckBrowser();
```
To get the current browser identity. (This check that the right API will be used).
After that, instead of using a browser specific API, use the following :
```javascript
BrowserAdapter(actualBrowser)
```

Do not forget to take consideration of API compatibility.
For more information, go to the link below :
https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Chrome_incompatibilities
