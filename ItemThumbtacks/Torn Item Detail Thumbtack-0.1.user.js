// ==UserScript==
// @name         Torn Item Detail Thumbtack
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  This script allows you to keep multiple item descriptions open at once
// @author       xedx [2100735]
// @match        https://www.torn.com/item.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.5.js
// @grant        GM_addStyle
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

    const options = {attributes: false, childList: true, characterData: false, subtree: false};

    var listObserver;    // Mutation observer for item UL
    var target;

    const thumbtack = `<button type="button" class='x-item-btn x-item-btn-off'>T</button>`;

    function thumbtackClose(e) {
        let root = $(this).closest("li");
        $(root).remove();
    }

    function handleThumbtack(e) {
        $(this).toggleClass("x-item-btn-off x-item-btn-on");

        let root = $(this).closest("li");
        $(root).toggleClass("show-item-info xedx-item-info");

        if (!$(this).hasClass("xcbf")) {
            let closeBtn = $(this).next();
            $(closeBtn).on('click', thumbtackClose);
            $(this).addClass("xcbf")
        }
    }

    function processNewNode(element, retries=0) {
        let closeBtn = $($(element)[0]).find(" > div > button");
        if ($(closeBtn).length == 0) {
            if (retries++ < 5) return setTimeout(processNewNode, 250, element, retries);
            return;
        }

        if ($(closeBtn).length > 0) {
            let newBtn = $(thumbtack);
            $(closeBtn).before(newBtn);
            $(newBtn).on('click', handleThumbtack);
        }

    }

    function observerCallback(mutationsList, observer) {
        let filtered = mutationsList.filter((mutation) => mutation.addedNodes.length > 0);

        for (let added of filtered) {
            let element = added.addedNodes[0];
            if ($(element).hasClass("show-item-info")) {
                setTimeout(processNewNode, 250, element);
            }
        }
    }

    function observerOff() {
        if (listObserver) listObserver.disconnect();
    }

    function observerOn() {
        if (listObserver) listObserver.observe($(target)[0], options);
    }

    function installObserver(retries=0) {
        target = $("ul.current-cont")[0];
        if ($(target).length == 0) {
            if (retries++ < 10) return setTimeout(installObserver, 250, retries);
            return;
        }
        log("All: ", $("ul.current-cont"));
        log("Target: ", $(target));
        listObserver = new MutationObserver(observerCallback);
        observerOn();
    }

    function handleMenuClick(e) {
        log("handleMenuClick: ", $(this));
        let targetId = $(this).attr("aria-controls");
        let sel = "#" + targetId;
        log("New target: ", $(sel));
        observerOff();
        target = $(sel);
        observerOn();
    }

    function addStyles() {

        GM_addStyle(`
            .xedx-item-info {
                padding: 0;
                border: none;
                float: none;
                cursor: default;
                clear: both;
                width: 100%;
            }
            .x-item-btn {
                position: absolute;
                right: 34px;
                top: 7px;
                width: 14px;
                height: 14px;
                border-radius: 14px;
                cursor: pointer;
            }
            .x-item-btn-off {
                background-image: radial-gradient(rgba(230, 230, 230, 0.9) 0%, rgba(6, 6, 6, 0.8) 100%);
            }
            .x-item-btn-on {
                width: 16px;
                height: 16px;
                border-radius: 16px;
                background-image: radial-gradient(rgba(255, 255, 255, 0.9) 0%, rgba(0, 180, 0, 0.4) 100%);
            }
        `);
    }

    function handlePageLoad() {
        addStyles();
        $("#categoriesList").children().on('click', handleMenuClick); //function () {setTimeout(installObserver, 250);});
        installObserver();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    callOnContentLoaded(handlePageLoad);

})();