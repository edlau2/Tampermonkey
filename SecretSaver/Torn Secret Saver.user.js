// ==UserScript==
// @name         Torn Secret Saver
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Detects when your 'secret' changes.
// @author       xedx [2100735]
// @include      https://www.torn.com/index*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';
 
    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    function timenow() {
        return new Date().toLocaleString();
    }

    const savedSecret = GM_getValue('secret'); //"64ae61cdf04d3ba3d3b3b2ddc5e853d099f89a53b3ea2f8228674a730ea40263";
    var secret = $('script[secret]').attr("secret");
    if (savedSecret == undefined || !savedSecret) {
        GM_setValue('secret' + secret);
        GM_setValue('nowTimestamp', timenow());
    }
    if (secret != savedSecret && savedSecret) {
        GM_setValue('secret', secret);
        GM_setValue('oldTimestamp', GM_getValue('nowTimestamp'));
        GM_setValue('nowTimestamp', timenow());
        alert(GM_info.script.name + ' Secret has changed!\n' +
              'Old: ' + savedSecret + '\n' +
              'New: ' + secret);
    }

})();
