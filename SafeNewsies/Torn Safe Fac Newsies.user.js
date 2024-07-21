// ==UserScript==
// @name         Torn Safe Fac Newsies
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Try to prevent sending newsies accidentally
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';
    const newsieRootSel = "#react-root-faction-newsletter";

    var retries = 0;
    function handlePageLoad() {
        // Make sure we're on the newsletter page...
        let thisHref = window.location.href;
        if (thisHref.indexOf("newsletter") < 0) {
            return log("Wrong page, not writing a newsletter: ", thisHref);
        }

        // Have to wait for entire page to complete.
        if ($(newsieRootSel).length == 0) {
            if (retries++ > 20) return log("too many retries, giving up.");
            debug("page not complete - retrying.");
            return setTimeout(handlePageLoad, 250);
        }

        retries = 0;
        let funkySel = "div[class^='editorRoot_'] > div[class^='toolbarWrapper_'] > div[class^='actionButtonsWrapper_'] > button";
        let sendBtn = $(funkySel);
        if ($(sendBtn).length == 0) {
            if (retries++ > 20) return log("too many retries, giving up.");
            debug("page not complete - retrying.");
            return setTimeout(handlePageLoad, 250);
        }

        $(sendBtn).on('click', interceptSend);

        // Indicate with border color change we are safe
        $(sendBtn).css("border", "1px solid green");
    }

    function interceptSend(event) {
        log("interceptSend: target: ", event.target);

        if (confirm("Are you sure?")) {
            log("Sending!");
            return true;
        } else {
            log("Not Sending!!!");
        }

        return false;
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    callOnContentComplete(handlePageLoad);

})();