// ==UserScript==
// @name         Torn Burglary New Items Helper
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=crimes*
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

    const autoHideBanner = true;
    const alwaysHide = true;

    const crimeSelector =
          "[class*='currentCrime_'] [class^='crimeOptionWrapper_'] div[class*='crimeOptionSection__'][class*='flexGrow_']:not('.xbc')";

    function isBurglary() {if (location.hash && location.hash.indexOf("burglary") > -1) return true;}

    function hashChangeHandler() {
        log("hashChangeHandler");
        handlePageLoad();
    }

    function pushStateChanged(e) {
        log("pushStateChanged");
        handlePageLoad();
    }

    function checkSkipName(text) {
        if (text.indexOf('lake') > -1) return true;
        if (text.indexOf('foundry') > -1) return true;
        if (text.indexOf('fertilizer') > -1) return true;
        if (text.indexOf('cottage') > -1) return true;
        if (text.indexOf('beach') > -1) return true;
        if (text.indexOf('mobile') > -1) return true;
        if (text.indexOf('suburban') > -1) return true;
        if (text.indexOf('scout') > -1) return true;

        if (text.indexOf('truckyard') > -1) return true;
        if (text.indexOf('dentist') > -1) return true;
        if (text.indexOf('printing') > -1) return true;
        if (text.indexOf('storage') > -1) return true;
        if (text.indexOf('facility') > -1) return true;
        if (text.indexOf('market') > -1) return true;

        return false;
    }

    var bannerArea;
    var bannerHeight;

    function elementHideShow(element) {
        let dataval = $(element).attr("data-val");
        $(element).attr("data-val", "");
        if (dataval == "none") return;

        // Check for animate-specific data-val first
        if (dataval == "hide") {
            $(element).removeClass("xshow").addClass("xhide");
            return;
        }
        if (dataval == "show") {
            $(element).removeClass("xhide").addClass("xshow");
            return;
        }

        if ($(element).hasClass("xshow")) {
            $(element).removeClass("xshow").addClass("xhide");
        } else {
            $(element).removeClass("xhide").addClass("xshow");
        }
    }

    var elInAnimation = false;
    function elementAnimate( element, size) {
        log("elementAnimate");
        elInAnimation = true;
        $(element).animate({
            height: size,
        }, 1200, function() {
            elementHideShow(element);
            elInAnimation = false;
        });
    }

    function handleBannerBtn(element, maxHeight) {
        log("handleBannerBtn");
        if (elInAnimation) return;

        if ($(element).hasClass("xshow")) {
            $(element).attr("data-val", "hide");
            elementAnimate(element, 0);
            bannerHidden = true;
        } else {
            $(element).removeClass("xhide").addClass("xshow");
            $(element).attr("data-val", "none");
            elementAnimate(element, maxHeight);
            bannerHidden = false;
        }
    }

    var bannerHidden = false;
    function hideBanner(forceHide) {
        log("hideBanner");
        bannerArea = $("[class^='currentCrime'] > [class^='bannerArea']");

        if (alwaysHide) {
            $(bannerArea).css("display", "none");
            bannerHidden = true;
            return;
        }

        if (forceHide && $(bannerArea).length == 0) return setTimeout(hideBanner, 250, true);

        if (bannerHeight == 0 && $(bannerArea).css("height") > 0) {
            bannerHeight = $(bannerArea).css("height");
        }

        if (forceHide) $(bannerArea).addClass("xshow");
        handleBannerBtn(bannerArea, bannerHeight);
    }

    function doClickYes(yesBtn, randClass, retries=0) {
        //log("doClickYes try #", retries);
        let sel = "." + randClass;
        let testBtn = $(sel);
        if ($(testBtn).length) {
            //log("found test btn: ", $(testBtn));
        }

        $(yesBtn).click();

        testBtn = $(sel);
        if ($(testBtn).length) {
            //log("found test btn: ", $(testBtn));
            if (retries++ < 20) return setTimeout(doClickYes, 250, yesBtn, randClass, retries);
        }
    }

    function randomStr() {
        let r = (Math.random() + 1).toString(36).substring(7);
        debug("random: ", r);

        return r;
    }

    function goFindYesBtn(node, retries = 0) {
        let yesBtn = $(node).find("[aria-label='Yes, abandon']");
        //log("goFindYesBtn, len: ", $(yesBtn).length, " retries: ", retries);
        if (!$(yesBtn).length) {
            if (retries++ < 30) return setTimeout(goFindYesBtn, 200, node, retries);
            return log("too many retries, no btn...");
        }

        // Check for the ones we DON'T want to abandon.....



        $(yesBtn).css("border", "2px solid red");

        let randClass = randomStr();
        $(yesBtn).addClass(randClass);
        doClickYes(yesBtn, randClass);

    }

    GM_addStyle(".xbc {border: 1px solid red;} .xskip {border: 1px solid green;}");
    function addAbandonHandlers() {
        //$(crimeSelector).each(function(index, element) {

        let list = $(crimeSelector);
        for (let idx=0; idx < $(list).length; idx++) {
            let element = $(list)[idx];
            let text  = $(element).text();
            if (text) {
                text = text.toLowerCase();
                //log("Name for element: ", text);
            } else {
                //log("No text found for ", $(element));
                continue;
            }

            if ($(element).hasClass("xskip")) continue;
            if (checkSkipName(text) == true) {
                if (text.indexOf('scout') > -1)
                    continue;
                $(element).addClass("xskip");
                continue;
            }

            if (!$(element).hasClass("xbc")) {
                //log("Adding context handler");
                $(element).addClass("xbc");
                $(element).on("contextmenu", function(e) {
                    let target = e.currentTarget;
                    e.preventDefault(); // Prevent default right-click menu

                    let copt = $(target).closest(".crime-option");
                    let btn = $(copt).prev();

                    let abandonBtn = $(target).find("[class*='closeButton_']")[0];
                    $(abandonBtn).click();

                    goFindYesBtn(btn);
                    return false;
                });
            } else {
                log("Already has class: ", $(element));
            }

            return false;
        };

    }

    var intTimer;
    function handlePageLoad() {
        if (!isBurglary()) {
            return log("Not on burglary, going home: ", location.hash);
        }
        let list = $(crimeSelector);
        //if ($(list).length) logt("list: ", $(list));
        if (!$(list).length) {
            if (!intTimer) intTimer = setInterval(handlePageLoad, 2000);
            return;
        }

        if (autoHideBanner == true && bannerHidden == false) hideBanner();

        //$(list).css('border', '1px solid green');
        addAbandonHandlers();

        if (!intTimer) intTimer = setInterval(handlePageLoad, 2000);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    //validateApiKey();
    versionCheck();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);

})();