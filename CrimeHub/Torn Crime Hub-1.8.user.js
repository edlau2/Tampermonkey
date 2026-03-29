// ==UserScript==
// @name         Torn Crime Hub
// @namespace    http://tampermonkey.net/
// @version      1.8
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
                      'cracking': 16373016, 'forgery': 16388086, 'scamming': 16418415, 'arson': 16510947, 'pickpocketing': 16358739 };

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
            debug("[help link clicked] inHandler: ", inHelpHandler, " title: ", title);
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
    let canCollectCount = 0;
    let installedCount = 0;

    function doCardSkimming(retries=0) {
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
            #xchc {
               /* display: flex;
                flex-flow: row wrap;
                justify-content: space-between; */
            }
            #xchc > span {
                margin-right: 5px;
            }
        `);

        if ($("#xchc").length == 0) {
            let target = $(`div[class*='currentCrime'] > div[class*='titleBar'] > div[class*='title']`);
            if (!$(target).length) {
                if (retries++ < 20) return setTimeout(doCardSkimming, 250, retries);
                log("[doCardSkimming] timed out");
            }

            if ($(target).length > 0 && $("#xchc").length == 0) {
                const countsDiv = `<div id="xchc"><span>Can collect: </span><span id='canGet'></span>
                                   <span>Total: </span><span id='xtotal'></span>
                                   <span>Installed: </span><span id="installed"></span></div>`;
                $(target).after(countsDiv);
            }
        }

        disableSellSkimmedCards();
        getCountAndTotals();

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
                $($(sellBtn)[0]).addClass('disabled');
            }
        }

        function getCountAndTotals() {
            debug("[getCountAndTotals]");
            let nodes = $("button [class*='statusCards']");
            canCollectCount = 0;
            installedCount = $(nodes).length;
            for (let idx=0; idx<$(nodes).length; idx++) {
                let node = $(nodes)[idx];
                let tmp = parseInt($(node).text());
                canCollectCount = canCollectCount + tmp;
            }
            debug("[getCountAndTotals] canCollectCount: ", canCollectCount, " installedCount: ", installedCount);

            $("#canGet").text(numberWithCommas(canCollectCount));
            $("#installed").text(installedCount);

            let collected = parseInt($("[class*='positionReference'] > span[class*='count']").text().replaceAll(',', ''));
            let toSell = numberWithCommas(+collected + +canCollectCount)
            $("#xtotal").text(toSell);
            setTimeout(getCountAndTotals, 2000);
        }
    }

    function getReqForBootleggingMerit(title) {
        let list = $(`#crime-stats-panel [class^='scroller_'] > ul[class^='ul_']:nth-child(2) > li > button > span:nth-child(3)`);
        debug(`[${title}] list: `, $(list));
        //$(list).css("border", "1px solid green");
        let qty = 0, req = 0, tot = 0;

        for (let idx=1; idx<$(list).length; idx++) {
            let node = $($(list)[idx]);
            if ($(node).closest("li").attr("id") == "xedx-tot") break;

            let txt = $($(list)[idx]).text();
            let qty = 0;
            if (txt) {
                txt = txt.replaceAll(',', '');
                qty = parseInt(txt);
                if (qty < 10000) {
                    req = 10000 - qty;
                    $(node).css("color", "red");
                } else {
                    $(node).css("color", "green");
                }
                tot = tot + req;
                debug("txt: ", txt, " qty: ", qty, " req: ", req, " tot: ", tot);
            }
        }

        if (tot > 0) {
            if (!$("#xedx-tot").length) {
                let li = $($(list)[$(list).length - 1]).closest('li');
                let cl = $(li).clone();
                debug(`[${title}] li: `, $(li), ` Clone: `, $(cl));
                $(cl).attr("id", "xedx-tot");
                $($(cl).find('button')[0]).attr('aria-label', `total required: ${tot}`);
                $($(cl).find('button > span:nth-child(1)')[0]).text(`Total left for Merit`);
                $($(cl).find('button > span:nth-child(3)')[0]).text(numberWithCommas(tot));
                $($(cl).find('button > span:nth-child(3)')[0]).css("color", "var(--crimes-statsPanel-statisticValue-color)");
                debug(`[${title}] Clone: `, $(cl));

                $(li).parent().append($(cl));
            } else {
                let currVal = parseInt($("#xedx-tot button > span:nth-child(3)").text().replaceAll(',',''));
                if (+tot != +currVal) {
                    $("#xedx-tot button > span:nth-child(3)").addClass("flash-text");
                    setTimeout( () => {
                        $("#xedx-tot button > span:nth-child(3)").removeClass("flash-text");
                        $($("#xedx-tot button > span:nth-child(3)")[0]).css("color", "var(--crimes-statsPanel-statisticValue-color)");
                    }, 2000);
                } else {
                    $($("#xedx-tot button > span:nth-child(3)")[0]).css("color", "var(--crimes-statsPanel-statisticValue-color)");
                }

                $("#xedx-tot button > span:nth-child(3)").text(numberWithCommas(tot));
            }

            setTimeout(getReqForBootleggingMerit, 5000, title);
        }
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
        let title = $($(titleDiv)[0]).text().toLowerCase().replaceAll(' ', '');
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
            case 'bootlegging': {
                debug(`[${title}]`);
                GM_addStyle(`
                    .flash-text {
                      animation: blink 0.5s linear infinite;
                    }

                    @keyframes blink {
                      0% { color: inherit; }
                      50% { color: green; }
                      100% { color: inherit; }
                    }
                `);
                getReqForBootleggingMerit(title);

                // Add observer to UL to re-calc on node changes
                break;

            }
            case 'graffiti':
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

        installHelpLink(titleDiv, title);

        // let link = `https://www.torn.com/forums.php#/p=threads&f=61&t=${helpIds[title]}`;
        // $(titleDiv).on('click', function () {
        //     debug("[help link clicked] link: ", link);
        //     openInNewTab(link);
        // });
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