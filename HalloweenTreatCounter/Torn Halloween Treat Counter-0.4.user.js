// ==UserScript==
// @name         Torn Halloween Treat Counter
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  This script keeps track of treats, warns close to 180
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    var countInitialized = GM_getValue("countInitialized", false);  // TRUE once count set from items page
    var initWarningShown = GM_getValue("initWarningShown", false);  // TRUE if alerts shown to warn to initialize
    var countCashedIn = GM_getValue("countCashedIn", 0);            // How many treats exchanged
    var treatsTotalSoFar = GM_getValue("treatsTotalSoFar", 0);      // Total treat count (from API)
    var countWarnLimit = GM_getValue("countWarnLimit", 175);        // When to flash green, this many treats
    var lastKnownCount = GM_getValue("lastKnownCount", 0);          // Last known unexchanged count
    var profile;
    var changeListener;

    if (countInitialized == false) {
        GM_setValue("countCashedIn", countCashedIn);
        GM_setValue("treatsTotalSoFar", treatsTotalSoFar);
        GM_setValue("countWarnLimit", countWarnLimit);
        GM_setValue("lastKnownCount", lastKnownCount);
    }

     function lastKnownGoodChangeHandler(key, oldValue, newValue, remote) {
          // key is the key whose value has changed
          // oldValue is the previous value of the key
          // newValue is the new value of the key
          // remote is a boolean indicating whether the change originated from a different userscript instance
         let changed = {key: key, oldValue: oldValue, newValue: newValue, remote: remote};
         log("****** lastKnownGoodChangeHandler remote? ", remote, " old: ", oldValue, " new: ", newValue);
         log("href: ", location.href);
         if (remote == true && document.hidden) {
             //lastKnownCount = GM_getValue("lastKnownCount", lastKnownCount);
             //log("Hidden win, so updating my copy to ", lastKnownCount);
         }
    }


    function updateTreatCount(count) {
        if (countInitialized == false) {
            $("#treatcount").addClass("flash-wht")
            $("#treatcount").text("Need Initialization");
            if (initWarningShown == false) {
                alert("Please go to your Items page, Special Items,\n" +
                      "and 'use' your basket to initialize the counter.\n\n" +
                      "This message won't appear again!");
                initWarningShown = true;
                GM_setValue("initWarningShown", initWarningShown);
            }
            return;
        }
        if (!$("#treatcount").length) return log("No treatcount UI!");
        if (!count) count = treatsTotalSoFar - countCashedIn;
        if (count < 0) count = 0;
        $("#treatcount").text(count);

        lastKnownCount = count;
        GM_setValue("lastKnownCount", lastKnownCount);

        if (count >= countWarnLimit)
            $("#treatcount").addClass("flash-grn");
    }

    // =============== experimental ==================

    var allItemList = {};
    function processLoadResponse(response, status, xhr) {
        log("Process Response: ", status);
        let data = JSON.parse(response);
        let html = data.html;

        $("#xedx-fake > ul > li").remove();
        $("#xedx-fake > ul").html(html);
        let list = $("#xedx-fake > ul > li");
        log("List: ", list);
        for (let idx=0; idx < list.length; idx++) {
            let li = list[idx];
            let category = $(li).attr("data-category");
            let qty = $(li).attr("data-qty");
            let itemId = $(li).attr("data-item");

            if (parseInt(itemId) == 1011) {
                log("****** Found Basket! *****")
                log("Basket: ", $(li));
            }

            allItemList[itemId] = {qty: qty, category: category};
        }

    }

    function getItemCategory(category) {
        if (!category) category = "Special";
        log("getItemCategory: ", category);

        if (!$("#xedx-fake").length) {
            let fakeDiv = "<div id='xedx-fake' style='display: none;'><ul id='fake-ul'></ul></div>";
            $("body").after(fakeDiv);
        }

        let URL = "https://www.torn.com/item.php?rfcv=66c24f2e7a892 #quickItems";
        let postData = {step: "getCategoryList",
                        itemName: category,
                        start: 0,
                        test: true,
                        prevtotal: 0};

        $.post( URL, postData, processLoadResponse);
    }
    // ==========================================================

    function userQueryCb(responseText, ID, param) {
        profile = JSON.parse(responseText);
        if (!profile) return console.error("Error parsing API response!");

        if (profile.competition) {
            let tmp = profile.competition.treats_collected_total;
            if (!tmp) if (!profile) return console.error("No treats, not halloween?");
            treatsTotalSoFar = tmp;
            GM_setValue("treatsTotalSoFar", treatsTotalSoFar);
        }

        updateTreatCount(treatsTotalSoFar - countCashedIn);
    }

    // May change this to get better count...ones already tradedin...
    function getCurrentTreatCount() {
        xedx_TornUserQuery("", "profile", userQueryCb);
    }

    function startDoAttack() {
        doAttackPage();
    }

    function doAttackPage() {
        let treat = $(".dialog-title__halloween");
        if ($(treat).length > -1) {
            let count = parseInt($(treat).text());
            if (count) {
                log("Got count: ", count);
                lastKnownCount = GM_getValue("lastKnownCount", 0);
                log("Old count: ", lastKnownCount);
                lastKnownCount = +lastKnownCount + count;
                GM_setValue("lastKnownCount", lastKnownCount);
                log("New count: ", GM_getValue("lastKnownCount", 0));
                return;
            }
        }
        setTimeout(startDoAttack, 1000);
    }

    function doItemsPage(retries=0) {
        let treatsSpan = $("div.available-treats > div.halloween-text");
        if ($(treatsSpan).length > 0) {
            let treatCount = $(treatsSpan).text();
            if (treatCount) {
                let count = parseInt(treatCount);

                log("Got count: ", count);
                if (count || count == 0) {
                    GM_setValue("lastKnownCount", count);
                    countCashedIn = treatsTotalSoFar - count;
                    GM_setValue("countCashedIn", countCashedIn);
                    countInitialized = true;
                    GM_setValue("countInitialized", true);
                    updateTreatCount(count);
                }
            }
        } else {
            if (retries % 10 == 0) log("treats span not found");
        }

        setTimeout(doItemsPage, 2000, retries++);
    }

     function closeMainDiv(e) {
        $("#x-treats").remove();
    }

    function installUI(retries) {
        if (!$("#x-treats").length) {
            let mainDiv = getUIDiv();
            $("#mainContainer").append(mainDiv);
        }

        updateTreatCount(lastKnownCount);

        // Button handlers
        $("#x-hsp-close").on('click', closeMainDiv);
        displayHtmlToolTip($("#x-hsp-close"), "Close", "tooltip4");
        dragElement(document.getElementById("x-treats"));
        startSavingPos(1500, "x-treats", true);
    }

    function handlePageLoad() {
        //if (isAttackPage()) {
        //    return setTimeout(startDoAttack, 500);
        //}

        if (isItemPage()) {
            doItemsPage();
        }
        setInterval(getCurrentTreatCount, 10000);
        installUI();

        log("Calling getItemCategory");
        getItemCategory();

        changeListener = GM_addValueChangeListener("lastKnownCount", lastKnownGoodChangeHandler);

    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    xedx_TornUserQuery("", "profile", userQueryCb);

    addStyles();
    callOnContentLoaded(handlePageLoad);

    // UI stuff, down here to get out of the way

    function getUIDiv() {
        const treatDiv = `
            <div id="x-treats" class="x-hosp-wrap x-drag xbgb-var">
                <div id="">
                    <div id="x-treatsheader" class="grab x-treat-header title-black hospital-dark top-round">
                        <div role="heading" aria-level="5">Treat Counter</div>
                        <div class="x-treat-header">
                            <!-- span id="x-hsp-hide" class="x-rt-btn x-inner-span xml10">M</span>
                            <span id="x-hsp-refresh" class="x-rt-btn x-inner-span xml5">R</span -->
                            <span id="x-hsp-close" class="x-rt-btn x-inner-span xml5 xmr5">X</span>
                        </div>
                    </div>
                    <div id="x-treats-inner" class="x-hosp-inner-flex xresizeable-vert">
                    <!-- div id="x-hosp-inner" class="x-hosp-inner-flex" -->
                        <span id="treatcount" class="hosp-txt">0</span>
                    </div>
                </div>
            </div>
        `;

        return treatDiv;
    }

    function addStyles() {
        loadCommonMarginStyles();
        addToolTipStyle();
        addCursorMovingStyles();
        addCursorStyles();
        addTornButtonExStyles();
        //addDraggableStyles();
        addBackgroundStyles();

        GM_addStyle(`
             #x-treats {
                -ms-transform: translateX(-20%) translateY(-95%)  !important;
                -webkit-transform: translate(-20%,-95%) !important;
                transform: translate(-20%,-95%) !important;
                background: transparent;
                top: 32%;
                left: 84%;
            }
            .x-treat-header {
                /*border: 1px solid limegreen;*/
                border-radius: 5px;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
            }
            #x-treats-inner {
                border-radius: 5px;
                width: 200px;
                height: 40px;
                align-content: center;
                justify-content: center;
                display: flex;
                flex-direction: column;
                flex-wrap: wrap;
            }
            #treatcount {
                font-size: 20px;
            }

            .x-hosp-wrap-min {
                left: 0;
            }

            .x-ontoptop {
                z-index: 999998;
            }


            .flash-grn {
               animation-name: flash-green;
                animation-duration: 0.8s;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
                animation-direction: alternate;
                animation-play-state: running;
            }

            @keyframes flash-green {
                from {color: #00ff00;}
                to {color: #eeeeee;}
            }

            .flash-wht {
                animation-name: flash-white;
                animation-duration: 0.8s;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
                animation-direction: alternate;
                animation-play-state: running;
            }

            @keyframes flash-white {
                from {color: #ededed;}
                to {color: #888888;}
            }
            .x-drag {
                position: fixed;
                display: flex;
                z-index: 999998;
                overflow: scroll;
                border: 1px solid steelblue;
                border-radius: 10px;
                background: var(--default-bg-panel-color) none repeat scroll 0% 0% / auto padding-box border-box;
            }
        `);
    }



})();