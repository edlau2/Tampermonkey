// ==UserScript==
// @name         Torn Burglary New Items Helper
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  An OC 2.0 Friendly Burglary Helper
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
/*eslint no-loop-func: 0*/

/*
https://github.com/edlau2/Tampermonkey/raw/refs/heads/master/BurglaryHelper/Torn%20Burglary%20New%20Items%20Helper.user.js
*/

(function() {
    'use strict';

    const autoHideBanner = true;
    const alwaysHide = true;
    const hideCrackingBanner = true;

    const observerTargetSel = "#react-root > div > div.crime-root.burglary-root > div > [class^='currentCrime_'] > [class^='virtualList__']";
    //const observerTargetSel = "[class*='currentCrime_'] [class^='crimeOptionWrapper_'] div[class*='crimeOptionSection__']";
    var observerTarget;

    const crimeSelector =
          `[class*='currentCrime_'] [class^='crimeOptionWrapper_']
          div[class*='crimeOptionSection__'][class*='flexGrow_']:not('.xbc'):not('.xskip')`;

    const specialTargets = {
        'lake': "Net",
        'foundry': "Zip Ties",
        'fertilizer': "Zip Ties, Hand Drill",
        'cottage': "Lockpicks, Zip Ties",
        'beach': "Net",
        'mobile': "Dog Treats, Hand Drill",
        'suburban': "Dog Treats, Hand Drill",
        'scout': "",
        'tool': "Lockpicks, Hand Drill",
        'cabin': "Lockpicks",
        'cleaning': "Lockpicks",
        'farm': "Hand Drill, C4",
        'truckyard': "Dog Treats",
        'funeral': "Scalpel",
        'dentist': "Scalpel, Hand Drill",
        'printing': "Scalpel",
        'storage': "Card Programmer, C4",
        'post': "Card Programmer",
        'facility': "",
        'market': "Card Programmer, Lockpicks",
        'ship': "Hand Drill, C4",
        'factory': "C4",
  };

    function isBurglary() {if (location.hash && location.hash.indexOf("burglary") > -1) return true;}
    function isCracking() {return (location.hash && location.hash.indexOf("cracking") > -1) ? true : false;}
    function isCrimeType(crime) {if (location.hash && location.hash.indexOf(crime) > -1) return true;}

    function hashChangeHandler() {
        log("hashChangeHandler");
        if (intTimer) clearInterval(intTimer);
        intTimer = null;
        handlePageLoad();
    }

    function pushStateChanged(e) {
        log("pushStateChanged");
        if (intTimer) clearInterval(intTimer);
        intTimer = null;
        handlePageLoad();
    }

    function getSpecial(text) {
        let keys = Object.keys(specialTargets);
        for (let idx=0; idx<keys.length; idx++) {
            if (text.indexOf(keys[idx]) > -1) {
                return specialTargets[keys[idx]];
            }
        }
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
        if (!$(bannerArea).length) {
            setTimeout(hideBanner, 1000, forceHide);
            return false;
        }

        if (alwaysHide) {
            $(bannerArea).css("display", "none");
            bannerHidden = true;
            return true;
        }

        if (forceHide && $(bannerArea).length == 0) {
            return setTimeout(hideBanner, 1000, true);
        }

        if (bannerHeight == 0 && $(bannerArea).css("height") > 0) {
            bannerHeight = $(bannerArea).css("height");
        }

        if (forceHide) $(bannerArea).addClass("xshow");
        handleBannerBtn(bannerArea, bannerHeight);

        return true;
    }

    function doClickYes(yesBtn, randClass, retries=0) {
        let sel = "." + randClass;
        let testBtn = $(sel);
        if ($(testBtn).length) {
        }

        $(yesBtn).click();

        testBtn = $(sel);
        if ($(testBtn).length) {
            if (retries++ < 100) return setTimeout(doClickYes, 50, yesBtn, randClass, retries);
        }
    }

    function randomStr() {
        let r = (Math.random() + 1).toString(36).substring(7);
        debug("random: ", r);

        return r;
    }

    function goFindYesBtn(node, retries = 0) {
        let yesBtn = $(node).find("[aria-label='Yes, abandon']");
        if (!$(yesBtn).length) {
            if (retries++ < 60) return setTimeout(goFindYesBtn, 50, node, retries);
            return log("too many retries, no btn...");
        }
        $(yesBtn).css("border", "2px solid red");

        let randClass = randomStr();
        $(yesBtn).addClass(randClass);
        doClickYes(yesBtn, randClass);
    }

    GM_addStyle(".xbc {border: 1px solid red;} .xskip {border: 1px solid green;}");
    function addAbandonHandlers() {
        let list = $(crimeSelector);
        for (let idx=0; idx < $(list).length; idx++) {
            let element = $(list)[idx];
            let text  = $(element).text();
            if (text) {
                text = text.toLowerCase();
            } else {
                continue;
            }

            if ($(element).hasClass("xskip") || text.indexOf('scout') > -1) continue;

            let special = getSpecial(text);
            if (special && special.length > 0) {
                let newText = "(" + special +")";
                let abWrap = $(element).find("[class^='abandon']");
                let spSpan = `<span style="padding-left: 5px;">${newText}</span>`;
                $(abWrap).before(spSpan);
                $(element).addClass("xskip");
                continue;
            }

            if (!$(element).hasClass("xbc")) {
                $(element).addClass("xbc");
                $(element).on("contextmenu", function(e) {
                    let target = e.currentTarget;
                    e.preventDefault(); 
                    let copt = $(target).closest(".crime-option");
                    let btn = $(copt).prev();
                    let abandonBtn = $(target).find("[class*='closeButton_']")[0];
                    $(abandonBtn).click();
                    goFindYesBtn(btn);
                    return false;
                });
            }

            return false;
        };

    }

    var intTimer;
    function handlePageLoad() {
        if (intTimer) clearInterval(intTimer);
        intTimer = null;

        if ((isCrimeType('forgery') || isCracking()) && hideCrackingBanner == true) {
            if (hideBanner() == true) {
                $("[class^='bannerArea_']").css("display", "none");
                return;
            }
        }

        if (!isBurglary()) {
            return log("Not on burglary or cracking, going home: ", location.hash);
        }

        let list = $(crimeSelector);

        if (!$(list).length) {
            if (!intTimer) intTimer = setInterval(handlePageLoad, 2000);
            return;
        }

        if (autoHideBanner == true && bannerHidden == false) hideBanner();

        if (isBurglary()) {
            addAbandonHandlers();
            if (intTimer) clearInterval(intTimer);
            intTimer = setInterval(addAbandonHandlers, 500);
        }
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