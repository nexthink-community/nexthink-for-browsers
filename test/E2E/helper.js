/*jslint browser:true*/
/*jslint devel:true*/
/*jslint node:true*/
/*jslint nomen: true*/
/*global describe, it, expect, browser, protractor, $, $$, element, by, deferred*/

exports.getFirefoxCapabilities = function () {

    var q, FirefoxProfile, pluginRootPath, profilePath, profile;
    q = require('q');
    FirefoxProfile = require("selenium-webdriver/firefox").Profile;

    pluginRootPath = __dirname.slice(0, __dirname.indexOf("\\test")) + "\\src";
    profilePath = __dirname + "\\data\\FirefoxProfile";
    profile = new FirefoxProfile(profilePath);

    profile.addExtension(pluginRootPath);
    profile.setAcceptUntrustedCerts(true);
    profile.setAssumeUntrustedCertIssuer(false);

    profile.setPreference("browser.xul.error_pages.expert_bad_cert", true);
    profile.setPreference("browser.ssl_override_behavior", true);
    profile.setPreference("extensions.legacy.enabled", true);
    profile.setPreference("general.warnOnAboutConfig", false);
    profile.setPreference("network.websocket.allowInsecureFromHTTPS", true);
    profile.setPreference("security.insecure_field_warning.contextual.enabled", false);
    profile.setPreference("xpinstall.signatures.required", false);

    //binary: "C://Program Files (x86)//Mozilla Firefox//firefox.exe",

    return q.resolve(capabilities = [{
        browserName: "firefox",
        marionette: true,
        "moz:firefoxOptions": {
            binary: "C://Program Files//Firefox Developer Edition//firefox.exe",
            profile: profile.encode(),
            args: ["-install-global-extension", pluginRootPath]
        }
    }]);
};

exports.getChromeCapabilities = function () {

    var pluginRootPath, downloadFolderPath;

    pluginRootPath = __dirname.slice(0, __dirname.indexOf("\\test")) + "\\src";
    downloadFolderPath = __dirname + "\\download";

    return capabilities = [{
        browserName: 'chrome',
        chromeOptions: {
            'args': ['--load-extension=' + pluginRootPath]
        }
    }];
};
