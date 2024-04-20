// ==UserScript==
// @name         Torn Hotkeys
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add hotkey support to Torn pages
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    function handlePageLoad() {
        // Can check for any required DIV here and setTimeout() if not available,
        // or trigger any required API calls...
    }

    /*
    // Trap key presses. Need some sort of combo catching, but may not go to Chrome!
    // Also, can't trap reg keys, otherwise would trap when typing in chat, for example.
    function KeyPressUp(e) {
        log("Trapped key up, code: ", e.keyCode);

        // .metaKey is command on mac, ctrlKey is control
        //if (evtobj.key === "x" && evtobj.shiftKey && evtobj.altKey) {
        if (evtobj.key === "x" && evtobj.metaKey) {
            log("KeyPressUp trapped Cmd-x!");
        }


        switch (e.keyCode) {
            default:
                break;
        }
    }
    */

    function KeyPressDown(e) {
        let evtobj = window.event ? event : e;

        /*
        let trapped = false;
        if (evtobj.shiftKey && evtobj.metaKey) {
            switch (evtobj.key) {
                case "x":
                case "h":
                    trapped = true;
                    break;
            }

            if (trapped)
                log("Trapped key: ", evtobj.key);
        }
        */

        // Cmd-Shift-h ==> Goes to Home page
        if (evtobj.key === "h" && evtobj.shiftKey && evtobj.metaKey) {
            log("KeyPressDown trapped Cmd-Shift-h!");

            window.location.href = "https://www.torn.com/index.php";
            e.preventDefault();  // NM, this prevents going to Google...
        }

        // Crimes:
        // https://www.torn.com/loader.php?sid=crimes#/

        //e.preventDefault()
    }


    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    //versionCheck();

    // Never process on attack page
    // https://www.torn.com/loader.php?sid=attack&user2ID=4
    let currURL = window.location.href;
    log("curr href: ", currURL);

    if (currURL.indexOf("loader.php?sid=attack") > 0) {
        log("On attack, ignoring page!");
    }
    else { // for now, just return when script done...

        // Trap key events
        document.addEventListener('keydown', KeyPressDown, false);
    }

    //callOnContentLoaded(handlePageLoad);

})();