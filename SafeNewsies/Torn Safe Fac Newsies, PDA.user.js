// ==UserScript==
// @name         Torn Safe Fac Newsies, PDA
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Try to prevent sending newsies accidentally
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
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
    const newsieRootId = "react-root-faction-newsletter";
    const newsieRootSel = "#" + newsieRootId;
    const loggingEnabled = true;
    var cancelHookInstall = false;

    log("Script loaded...");

    // ==================================

    function pushStateChanged(e) {
        log("Push state change detected...");
        setTimeout(installBtnHooks, 250);
    }

    const bindEventListener = function (type) {
        const historyEvent = history[type];
        return function () {
            const newEvent = historyEvent.apply(this, arguments);
            const e = new Event(type);
            e.arguments = arguments;
            window.dispatchEvent(e);
            return newEvent;
        };
    };

    // =====================================

    function log(...data) {
        if (loggingEnabled) {
            console.log(GM_info.script.name + ': ', ...data);
        }
    }

    var retries = 0;
    function handlePageLoad() {
        log("handlePageLoad...");
        // Make sure we're on the newsletter page...
        let thisHref = window.location.href;
        cancelHookInstall = false;

        if (thisHref.indexOf("newsletter") < 0) {
            return log("Torn Safe Fac Newsies: Wrong page, not writing a newsletter: ", thisHref);
        }

        // Have to wait for entire page to complete.
        if ($(newsieRootSel).length == 0) {
            if (retries++ > 20) return log("Torn Safe Fac Newsies: too many retries, giving up.");
            return setTimeout(handlePageLoad, 250);
        }

        retries = 0;
        let funkySel = "div[class^='editorRoot_'] > div[class^='toolbarWrapper_'] > div[class^='actionButtonsWrapper_'] > button";
        //let sendBtn = document.querySelector(funkySel);
        //if (!sendBtn) {
        let sendBtn = $(funkySel);
        if ($(sendBtn).length == 0) {
            if (retries++ > 20) return log("Torn Safe Fac Newsies: too many retries, giving up.");
            return setTimeout(handlePageLoad, 250);
        }

        // Passed all tests, install hooks
        installBtnHooks();

        
    }

    var hookRetries = 0;
    function installBtnHooks() {
        let funkySel = "div[class^='editorRoot_'] > div[class^='toolbarWrapper_'] > div[class^='actionButtonsWrapper_'] > button";
        let sendBtn = $(funkySel);

        if ($(sendBtn).length == 0) {
            //if (hookRetries++ > 20) return;
            if (cancelHookInstall) {
                cancelHookInstall = false;
                return;
            }
            setTimeout(installBtnHooks, 250);
            return;
        }

        hookRetries = 0;

        if ($(sendBtn).attr("xdata") == "yes") {
            log("Hook already installed!");
            $(sendBtn).css("border", "1px solid blue");
            return;
        }

        $(sendBtn).on('click', interceptSend);
        $(sendBtn).attr("xdata", "yes");

        // Indicate with border color change we are safe
        $(sendBtn).css("border", "1px solid green");
    }

    function hashChangeHandler() {
        log("hashChangeHandler ", window.location.href);
        handlePageLoad();
    }

    function installHashChangeHandler(callback) {
        window.addEventListener('hashchange', function() {
        log('The hash has changed! new hash: ' + location.hash);
        callback();}, false);
    }

    function interceptSend(event) {
        console.log("Torn Safe Fac Newsies: intercepting send");
        if (confirm("Are you sure?")) {
            log("Torn Safe Fac Newsies: Sending!");
            setTimeout(installBtnHooks, 250);
            return true; // Left for JQuery handling...
        } else {
            log("Torn Safe Fac Newsies: Not Sending!!!");
            event.preventDefault();
            event.stopPropagation();
        }

        return false;
    }

    // This is start of script execution - begin on page load complete, and page change handlers

    if (document.readyState == 'complete') {
        handlePageLoad();
    } else {
        document.addEventListener('readystatechange',
            event => {if (document.readyState == 'complete') handlePageLoad();});
    }

    // Monitor push state
    history.pushState = bindEventListener("pushState");
    window.addEventListener("pushState", function (e) {
        pushStateChanged(e);  // Could directly call addHideBannerBtn() instead
    });

    // And handle page changes
    installHashChangeHandler(hashChangeHandler);

})();