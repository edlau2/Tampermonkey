// ==UserScript==
// @name         Torn Burglary New Items Helper PDA
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  An OC 2.0 Friendly Burglary Helper
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=crimes*
// @match        https://www.torn.com/page.php?sid=crimes*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint no-loop-func: 0*/

(function() {
    'use strict';

    const autoHideBanner = true;
    const alwaysHide = true;
    const hideCrackingBanner = true;

    var intTimer;

    const crimeSelector =
          `[class*='currentCrime_'] [class^='crimeOptionWrapper_']
          div[class*='crimeOptionSection__'][class*='flexGrow_']:not('.xbc'):not('.xskip')`;

    const specialTargets = {
        'lake': "Net, Diesel",
        'foundry': "Zip Ties, Magnesium Shavings, Fire Extinguisher",
        "brewery": "Fire Extinguisher",
        'fertilizer': "Zip Ties, Hand Drill, Fire Extinguisher",
        'cottage': "Lockpicks, Zip Ties",
        'beach': "Net",
        'mobile': "Dog Treats, Hand Drill, Blowtorch",
        'suburban': "Dog Treats, Hand Drill",
        'scout': "",
        'tool': "Lockpicks, Hand Drill, Blowtorch",
        'cabin': "Lockpicks",
        'cleaning': "Lockpicks",
        'farm': "Hand Drill, C4, Blowtorch, Methane",
        'truckyard': "Dog Treats, Diesel",
        'funeral': "Scalpel",
        'dentist': "Scalpel, Hand Drill",
        'printing': "Scalpel",
        'paper': "Fire Extinguisher",
        'storage': "Card Programmer, C4",
        'post': "Card Programmer",
        'facility': "",
        'market': "Card Programmer, Lockpicks, Bonded Latex",
        'ship': "Hand Drill, C4, Thermite, Fire Extinguisher",
        'factory': "C4, Hydrogen, Fire Extinguisher",
        'dock': "Kerosene",
    };

    function isBurglary() {if (window.location.href.indexOf("burglary") > -1) return true;}
    function isCracking() {return (window.location.href.indexOf("cracking") > -1) ? true : false;}
    function isCrimeType(crime) {if (window.location.href.indexOf(crime) > -1) return true;}

    function hashChangeHandler() {
        //console.log("hashChangeHandler");
        if (intTimer) clearInterval(intTimer);
        intTimer = null;
        handlePageLoad();
    }

    function pushStateChanged(e) {
        //console.log("pushStateChanged");
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
        elInAnimation = true;
        $(element).animate({
            height: size,
        }, 1200, function() {
            elementHideShow(element);
            elInAnimation = false;
        });
    }

    function handleBannerBtn(element, maxHeight) {
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
        return (Math.random() + 1).toString(36).substring(7);
    }

    function goFindYesBtn(node, retries = 0) {
        let yesBtn = $(node).find("[aria-label='Yes, abandon']");
        if (!$(yesBtn).length) {
            if (retries++ < 60) return setTimeout(goFindYesBtn, 50, node, retries);
            return console.log("too many retries, no btn...");
        }
        $(yesBtn).css("border", "2px solid red");

        let randClass = randomStr();
        $(yesBtn).addClass(randClass);
        doClickYes(yesBtn, randClass);
    }

    GM_addStyle(`.xbc {border: 1px solid red;}
                 .xskip {border: 1px solid green;}
                 .bblue {border: 2px solid blue !important;}
                 .bbyellow {outline: 1px solid #ffff00a8;
                            outline-offset: -4px;}`);

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
            debug("Special for ", text, " is: ", special);
            if (special && special.length > 0) {
                let newText = "(" + special +")";
                let abWrap = $(element).find("[class^='abandon']");
                let spSpan = `<span style="padding-left: 5px;">${newText}</span>`;
                $(abWrap).before(spSpan);
                $(element).addClass("xskip");
                if (special.indexOf("xtinguisher") > -1)
                    $(element).addClass("bblue");
                if (special.indexOf("Blowtorch") > -1)
                    $(element).addClass('bbyellow');;
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

    $(window).on("unload", function() {
        clearInterval(intTimer);
        $("div").removeClass("xbc");
    });

    function handlePageLoad() {
        if (intTimer) clearInterval(intTimer);
        intTimer = null;

        if ((isCrimeType('forgery') || isCracking()) && hideCrackingBanner == true) {
            if (hideBanner() == true) {
                $("[class^='bannerArea_']").css("display", "none");
                return;
            }
        }

        if (!isBurglary() && !$(".burglary-root").length) {
            let test = $(".burglary-root");
            let len = $(".burglary-root").length;

            //console.log("Not on burglary or cracking, going home? href: ", window.location.href, " root: ", length);
        } else {
            //console.log("On burglary! ", window.location.href, " root: ", length);
        }

        let list = $(crimeSelector);
        if (!$(list).length) {
            if (!intTimer) intTimer = setInterval(handlePageLoad, 2000);
            return;
        }

        if (autoHideBanner == true && bannerHidden == false) hideBanner();

        //if (isBurglary()) {
            addAbandonHandlers();
            if (intTimer) clearInterval(intTimer);
            intTimer = setInterval(addAbandonHandlers, 500);
        //}
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    window.addEventListener('hashchange', function() {
        hashChangeHandler();}, false);

    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoad);
    } else {
        handlePageLoad();
    }


})();