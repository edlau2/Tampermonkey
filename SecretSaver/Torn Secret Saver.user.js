// ==UserScript==
// @name         Torn Secret Saver
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Detects and warns when your 'secret' changes.
// @author       xedx [2100735]
// @include      https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    const savedSecret = GM_getValue('secret');

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();
    getSecret();

    function timenow() {
        return new Date().toLocaleString();
    }

    // The timeout is required so the doc window has time to regain focus.
    function updateClipboard(newClip) {
        setTimeout(function() {navigator.clipboard.writeText(newClip).then(function() {
            alert('Your new secret has been saved to the clipboard!');
        }, function(e) {
            alert('Error: ', e);
        })}, 1000);
    }

    function getSecret() {
        let secret = $('script[secret]').attr("secret");
        if (secret == undefined) return setTimeout(getSecret, 250);
        let msg = 'Secrets: \n\n' +
                  'Saved : ' + savedSecret + '\n' +
                  'Secret: ' + secret;
        log(msg);
        if (savedSecret == undefined || !savedSecret) {
            log('Saving current secret: ', secret);
            GM_setValue('secret',  secret);
            GM_setValue('nowTimestamp', timenow());
        }
        if (secret != savedSecret && savedSecret) {
            GM_setValue('secret', secret);
            GM_setValue('oldTimestamp', GM_getValue('nowTimestamp'));
            GM_setValue('nowTimestamp', timenow());
            let text = GM_info.script.name + ' Secret has changed!\n' +
                  'Old: ' + savedSecret + '\n' +
                  'New: ' + secret + '\n\nSave to the clipboard?';
            if (confirm(text)) updateClipboard(secret);
        }
    }

})();
