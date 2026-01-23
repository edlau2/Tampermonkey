// ==UserScript==
// @name         Torn Crime Hub
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  This script makes you skill easier to read
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php*
// @exclude      https://www.torn.com/recaptcha.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
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
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", true);    // Extra debug logging

    logScriptStart();

    log("href: ", location.href);
    if (location.href.indexOf('?sid=crimes#/') == -1)
        return log("Wrong page!");


    // ================= Install links to crime help ===================


    const helpIds = { 'searchforcash': 16343473, 'cardskimming': 16350490, 'graffiti': 16344567, 'bootlegging': 16341811,
                      'shoplifting': 16346491, 'burglary': 16353303, 'hustling': 16363421, 'disposal': 16367936,
                      'cracking': 16373016, 'forgery': 16388086, 'scamming': 16418415, 'arson': 16510947 };

    //var linksLocked = false;
    function installHelpLink(node, title) {
        $(node).css("cursor", "pointer");
        let link = `https://www.torn.com/forums.php#/p=threads&f=61&t=${helpIds[title]}`;
        $(node).off('click');
        $(node).on('click', handleHelpClick);

        let inHelpHandler = false;
        const resetHelpFlag = function() { inHelpHandler = false; }
        function handleHelpClick(e) {
            e.stopPropagation();
            e.preventDefault();
            debug("[help link clicked]: ", inHelpHandler, title);
            if (inHelpHandler == true) return;
            inHelpHandler = true;
            setTimeout(resetHelpFlag, 2000);
            //openInNewTab(link);
            window.open(link, '_blank').focus();
        }
    }

    // ================= Make the skill stars bigger ====================
    //
    // Hard to read on my laptop, so make the skill value in the 'stars' bigger

    // Make the level indicators, in the stars, larger
    const starScale = GM_getValue("starScale", 2.0);
    GM_setValue("starScale", starScale);
    GM_addStyle(`
        [class*="levelStarWrapper_"], [class*="starWrap_"] {
            scale: ${starScale};
        }
    `);

    // ================== Card skimming specific ========================

    let cardsCount = 0;
    let prevCards = 0;

    function doCardSkimming() {
            // const hdrTxt = $(".crimes-app h4").text();
            // setTimeout(updateSkimmerCount, 2000);          // doesn't work

            GM_addStyle(`
                div.crime-root.cardskimming-root > div > div[class*='currentCrime_'] > div[class*='virtualList_'] > div:nth-child(2) {
                    pointer-events: none;
                    filter: brightness(0.3);
                }

                div.crime-root.cardskimming-root > div > div[class*='currentCrime_'] > div[class*='virtualList_'] > div:nth-child(2) .crime-option {
                    height: 61px;
                }

                div.crime-root.cardskimming-root > div > div[class*='currentCrime_'] > div[class*='virtualList_'] > div:nth-child(2) [class*='commitButtonSection_'] {
                    display: none !important;
                }
            `);

            disableSellSkimmedCards();

            function disableSellSkimmedCards() {
                // Disable the 'sell' button unless over 10k
                let sellBtn =  $(`#react-root > div > div.crime-root.cardskimming-root > div > div[class*='currentCrime_'] > div[class*='virtualList_'] > div[class*='lastOfGroup_']
                    div[class*='commitButtonSection_'] > button`);
                if (!$(sellBtn).length > 0) {
                        return setTimeout(disableSellSkimmedCards, 1000);
                }
                cardsCount = parseInt($("[class*='crimeOptionSection_'] > [class*='positionReference_'] > [class*='count_']").text());
                if (cardsCount != prevCards) {
                    debug("Card details: ", cardsCount, " was: ", prevCards);
                }
                prevCards = cardsCount;
                if (cardsCount < 10001 && !$(sellBtn).hasClass('disabled')) {
                    debug("Disable sell, count: ", cardsCount, " was: ", prevCards);
                    $(sellBtn).addClass('disabled');
                }
            }

            // function updateSkimmerCount() {
            //     // Count doesn't work correctly...get via fetch intercept?
            //     $(".crimes-app h4").text(hdrTxt + " " + $("[class*='virtualList_'] > div.virtual-item").length);
            //     setTimeout(updateSkimmerCount, 1000);
            //     disableSellSkimmedCards();
            // }
    }

    // ================= Main entry point ===============================
    //
    // Add link to forum help. Do any crime specific changes.
    // These are mostly my personal preferences...
    //
    // Card Skimming - disable the sell button until 10,000
    // I accidentally clicked at around 7,000 - 10k is a merit
    //

    function handlePageLoad(retries=0) {

        let titleDiv = $("#react-root > div > div.crime-root div[class*='currentCrime_'] div[class*='title_']");
        if (!$(titleDiv).length) {
            if (retries++ < 25) return setTimeout(handlePageLoad, 250, retries);
            return("[handlePageLoad] timed out.");
        }
        let title = $(titleDiv).text().toLowerCase().replaceAll(' ', '');
        debug("[handlePageLoad] title: ", title, " div: ", $(titleDiv));
        if (!title) return debug("[handlePageLoad] Error, no title");


        // FF Scouter adds a div that messes with this page - fix it.
        $("#ff-scouter-run-once").attr("style", "display: none;s");
        let ff = $("#ff-scouter-run-once").detach();
        $("body").after(ff);

        switch (title) {
            case 'searchforcash': {
                debug(`[${title}]`);
                break;
            }
            case 'cardskimming': {
                debug(`[${title}]`);
                doCardSkimming();
                break;
            }
            case 'graffiti':
            case 'bootlegging':
            case 'shoplifting':
            case 'burglary':
            case 'hustling':
            case 'disposal':
            case 'cracking':
            case 'forgery':
            case 'scamming':
            case 'arson': {
                debug(`[${title}]`);
                break;
            }

            default: {
                return debug("[handlePageLoad] no help for ", title);
            }
        }

        $(titleDiv).css("cursor", "pointer");
        let link = `https://www.torn.com/forums.php#/p=threads&f=61&t=${helpIds[title]}`;
        $(titleDiv).on('click', function () {
            debug("[help link clicked] link: ", link);
            openInNewTab(link);
        });
    }

    
    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        // callOnContentLoaded(handlePageLoad);
        setTimeout(handlePageLoad, 250);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        // callOnContentLoaded(handlePageLoad);
        setTimeout(handlePageLoad, 250);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////


    //logScriptStart();

    //addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);
    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {

    }

})();