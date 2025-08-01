// ==UserScript==
// @name         Torn Burglary New Items Helper
// @namespace    http://tampermonkey.net/
// @version      1.10
// @description  An OC 2.0 Friendly Burglary Helper
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=crimes*
// @match        https://www.torn.com/page.php?sid=crimes*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
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

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    /*
    tool-tips for dropdown box?
    $(".propertyTypeSection___Hw3kk  button.toggler")   // Dropdown
    $("[class*='propertyTypeSection_']  button.toggler")

    parent div of that, has 'input' child, val() is ##
    corresponds to targets under this ul:
    $(".propertyTypeSection___Hw3kk.xskip ul.scrollarea")
    Have IDs, they are li's, ex
    option-Foundry-133
    option-Old-Factory-127
    option-Truckyard-125
    option-Farm-Storage-Unit-119
    option-Shipyard-115
    option-Dockside-Warehouse-117
    135 - fertilizer

    Maybe detect change of button? Set tooltip text based on that?

    */
    const idToPlace = { 133: "Foundry", 127: "Old Factory", 125: "Truckyard", 119: "Farm Storage", 115: "Shipyard", 117: "Dockside" };

    const autoHideBanner = GM_getValue("autoHideBanner", false);
    const alwaysHide = GM_getValue("alwaysHide", false);
    const hideCrackingBanner = GM_getValue("hideCrackingBanner", false);

    GM_setValue("autoHideBanner", autoHideBanner);
    GM_setValue("alwaysHide", alwaysHide);
    GM_setValue("hideCrackingBanner", hideCrackingBanner);

    const crimeSelector =
          `[class*='currentCrime_'] [class^='crimeOptionWrapper_']
           div[class*='crimeOptionSection__'][class*='flexGrow_']:not('.xbc'):not('.xskip'):not([class*='propertyTypeSection_'])`;

    const focusedToolTips = {
        87: "OC items: Net<br>Crime Materials: Diesel",  // lake house
        133: "OC items: Zip Ties<br>Crime Materials: Magnesium Shavings, Fire Extinguisher",    // foundry
        135: "OC items: Zip Ties, Hand Drill<br>Crime Materials: Fire Extinguisher",  // fertilizer plant
        77: "OC items: Lockpicks, Zip Ties", // cottage
        71: "OC items: Net",  // beach hut
        73: "OC items: Dog Treats, Hand Drill, Blowtorch", // mobile home
        81: "OC items: Dog Treats, Hand Drill",  // suburban
        69: "OC items: Lockpicks, Hand Drill, Blowtorch",
        83: "OC items: Lockpicks",  // cabin
        101: "OC items: Lockpicks",
        119: "OC items: Hand Drill, C4, Blowtorch<br>Crime Materials: Methane",  // farmyard
        125: "OC items: Dog Treats<br>Crime Materials: Diesel",  // truckyard
        97: "OC items: Scalpel",
        107: "OC items: Scalpel, Hand Drill",
        121: "OC items: Scalpel",
        93: "OC items: Card Programmer, C4",
        95: "OC items: Card Programmer",
        99: "OC items: Card Programmer, Lockpicks, Bonded Latex",
        115: "OC items: Hand Drill, C4<br>Crime Materials: Thermite",  // shipyard
        127: "OC items: C4<br>Crime Materials: Hydrogen",  // factory
        117: "Crime materials: Kerosene",  // docks
    };

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

    function isBurglary() {if (location.hash && location.hash.indexOf("burglary") > -1) return true;}
    function isCracking() {return (location.hash && location.hash.indexOf("cracking") > -1) ? true : false;}
    function isCrimeType(crime) {if (location.hash && location.hash.indexOf(crime) > -1) return true;}

    function hashChangeHandler() {
        log("hashChangeHandler");
        setTimeout(handlePageLoad, 250);
    }

    function pushStateChanged(e) {
        log("pushStateChanged");
        setTimeout(handlePageLoad, 250);
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
        debug("elementAnimate");
        elInAnimation = true;
        $(element).animate({
            height: size,
        }, 1200, function() {
            elementHideShow(element);
            elInAnimation = false;
        });
    }

    function handleBannerBtn(element, maxHeight) {
        debug("handleBannerBtn");
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
        debug("hideBanner: ", forceHide, alwaysHide, isBurglary, );
        bannerArea = $("[class^='currentCrime'] > [class^='bannerArea']");
        if (!$(bannerArea).length) {
            setTimeout(hideBanner, 1000, forceHide);
            return false;
        }

        if (alwaysHide && isBurglary()) {
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
            return log("too many retries, no btn...");
        }
        $(yesBtn).css("border", "2px solid red");

        let randClass = randomStr();
        $(yesBtn).addClass(randClass);
        doClickYes(yesBtn, randClass);
    }

    GM_addStyle(`.xbc {border: 1px solid red;}
                 .xskip {border: 1px solid green;}
                 .bblue {border: 2px solid blue !important;}`);
    function addAbandonHandlers() {
        if (location.href.indexOf('burglary') < 0) return;
        let list = $(crimeSelector);
        log("Found ", $(list).length, " targets");
        for (let idx=0; idx < $(list).length; idx++) {
            let element = $(list)[idx];
            let text  = $(element).text();
            debug("Looking at ", text);
            if (text) {
                text = text.toLowerCase();
            } else {
                continue;
            }

            if ($(element).hasClass("xskip") || text.indexOf('scout') > -1) {
                debug("Skipping ", $(element));
                continue;
            }

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
        };
    }

    // Observer to detect new targets, to install abandon handlers
    var observer;
    function installObserver(retries=0) {
        let target = $(".crime-root.burglary-root [class*='currentCrime_'] [class*='virtualList_']");
        if (!$(target).length) {
            if (retries++ < 20) return setTimeout(installObserver, 250, retries);
            return log("[installObserver] timed out");
        }

        const config = { childList: true, subtree: true };
        const handleAddedNodes = function(mutationsList, observer) {
            let doAdd = false;
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    doAdd = true;
                }
            }

            if (doAdd == true)
                addAbandonHandlers();
        };

    observer = new MutationObserver(handleAddedNodes);
    observer.observe($(target)[0], config);
    }

    function handlePageLoad() {
        log("[handlePageLoad]: ",  isBurglary(), isCrimeType('forgery'), isCracking());

        $("div").removeClass("xbc");

        if ((isCrimeType('forgery') || isCracking()) && hideCrackingBanner == true) {
            //if (hideBanner() == true) {
            //    $("[class^='bannerArea_']").css("display", "none");
            //}
            return;
        }

        if (!isBurglary()) {
            return log("Not on burglary, going home: ", location.hash);
        }

        let list = $(crimeSelector);
        log("[handlePageLoad] list: ", $(list), " sel: $(", crimeSelector, ")");
        if (!$(list).length) {
            setTimeout(handlePageLoad, 2000);
            return;
        }

        // 
        if (autoHideBanner == true && bannerHidden == false)
            hideBanner(true);

        if (isBurglary()) {
            addAbandonHandlers();
            installObserver();
        }
    }

    // Experimental: add tool-tips to focused scouting
    function handlePageComplete(retries = 0) {
        let dropdown = $("[class*='propertyTypeSection_']  button.toggler");
        if (!$(dropdown).length) {
            if (retries++ < 30) return setTimeout(handlePageComplete, 250, retries);
            log("handlePageComplete timed out.");
            log("Selector: $('[class*=`propertyTypeSection_`]  button.toggler') ==> ", $("[class*='propertyTypeSection_']  button.toggler"));
            return;
        }
        log("[handlePageComplete] Dropdown: ", $(dropdown));
        log("[handlePageComplete] Parent: ", $(dropdown).parent());

        let ip = $(dropdown).parent().find('input');
        log("[handlePageComplete] input: ", $(ip));
        log("[handlePageComplete] value: ", $(dropdown).parent().find('input').val());

        // Check for targets again...
        addAbandonHandlers();

        // may need observer, .change(...) didn't work
        $(ip).on('change input', function () {
            log("Input value changed to: " + $(this).val());
        });

        const ttObserver = new MutationObserver(function (mutations) {
            log("Mutation detected: ", mutations, $(ip).val());
            for (const mutation of mutations) {
                if (mutation.type === 'attributes') {
                    log("is ip? ", ($(mutation.target) == $(ip)), $(mutation.target), $(ip));
                    log("attr name: ", mutation.attributeName);
                    log("was: ", mutation.oldValue, " ip: ", $(ip).val());

                    //let newTip = "Tooltip for " + $(ip).val() + " " + idToPlace[$(ip).val()];
                    let newTip = focusedToolTips[$(ip).val()] ? focusedToolTips[$(ip).val()] : '';
                    log("new tooltip: ", newTip);
                    $(dropdown).tooltip("option", "content", newTip);
                }
            }

        });

        ttObserver.observe($(ip)[0], { attributes: true, attributeOldValue: true, subtree: true, attributeFilter: ["value"] });

        addToolTipStyle();
        //let msg = "Tooltip for " + $(ip).val() + " " + idToPlace[$(ip).val()];
        let msg = "Hover here for available finds,<br>once a location is selected.";
        displayHtmlToolTip(dropdown, msg, "tooltip4");
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
    callOnContentComplete(handlePageComplete);

})();