// ==UserScript==
// @name         Torn Revives Off Nag
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Pester if revives are on.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    // Try to see if enlisted, if not, don't nag?

    const nagSeconds = 10;
    var doNag = false;

    function startNagging() {
        if (confirm("Revives are on! Please turn off!")) {
            if (location.href.indexOf('hospitalview') < 0) {
                window.location.href = "https://www.torn.com/hospitalview.php?from=nag";
                return;
            }
        }
        if (location.href.indexOf('hospitalview') > -1) {
            setColorRed();
        }
        setTimeout(doUserQuery, nagSeconds * 1000);
    }

    function setColorRed() {
        $(".revive-availability-btn").css("color", "var(--revive-availability-btn-everyone-red)");
        setTimeout(setColorGreen, 500);
    }

    function setColorGreen() {
        $(".revive-availability-btn").css("color", "var(--revive-availability-btn-everyone-green)");
        if ($("#revive-availability").text() != "Nobody")
            setTimeout(setColorRed, 500);
        else
            $(".revive-availability-btn").css("color", "var(--revive-availability-btn-everyone-red)");
    }

    function userQueryCb(responseText, ID, param) {
        let jsonResp;
        try {
           jsonResp = JSON.parse(responseText);
        }
        catch (err) {
            return log("[userQueryCb] error, invalid JSON");
        }

        if (!jsonResp) return handleError(responseText);
        if(jsonResp.revivable > 0) callOnContentComplete(startNagging);
    }

    function doUserQuery(retry) {
        if (retry != true && location.href.indexOf('hospitalview') > -1) {
            let urlParams = new URLSearchParams(window.location.search);
            let from = urlParams.get('from');
            log("from: ", from);
            if (from == 'nag') return setTimeout(doUserQuery, 10000, true);
        }
        xedx_TornUserQuery(null, "profile", userQueryCb);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    doUserQuery();

})();