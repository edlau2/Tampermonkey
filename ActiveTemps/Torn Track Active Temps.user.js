// ==UserScript==
// @name         Torn Track Active Temps
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Keep track of temps still in effect after a fight ends
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
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

/*
    I debated about @requiring JS UI, just for tooltips when *not* on the attack page.
    When loaded by TM, it is only downloaded once, and re-used unless it's version #
    changes. It could be dynamically loaded - when run on other pages - but that would
    download every time. For now it is just @require'd, not dynamic. Overhead should
    be minimal I hope.

    Used to match factions.php and loader.php, when matching all, should prob not
    run on certain pages, maybe if no sidebar? And don't need to matches..

    activeEffects": "{\"1740415991945\":{\"timeLeft\":130,\"timeNow\":1740415861945,\"endsAt\":1740415991945,\"effect\":\"effect icon smoked\",
    \"src\":\"/images/v2/attack/effect_icons/smoked.svg\",\"text\":\"130\"}}",
*/


(function() {
    'use strict';

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    const effectsListKey = "activeEffects";

    let tmp = GM_getValue(effectsListKey, null);
    var savedEffectList = tmp ? JSON.parse(tmp) : {};

    // Only do most minimal on attack page
    if (isAttackPage()) {
        logScriptStart();
        monitorTempsUsed();
        // Script won't end, a timeout will be set...
        return;
    }

    // ================= Portion that runs on attack page ==============================
    //
    // Track temp effects you get, to be used on other pages when not in a fight.
    //
    function monitorTempsUsed() {
        var effects = {};                // Local list of active effects
        setTimeout(checkEffects, 500);

        function checkEffects() {
            let activeEffects = $(`[class^='playerWindow__'] [class*='iconsContainer'] [class^='timeLeft_']`);
            let notFoundEffects = $(`[class^='playerWindow__'] [class*='iconsContainer'] [class^='timeLeft_']:not('.xfound')`);

            let nowDate = new Date();
            let now = nowDate.getTime();
            for (let idx=0; idx<activeEffects.length; idx++) {
                let effect = activeEffects[idx];
                let text = $(effect).text();
                let timeLeft = parseInt($(effect).text());

                // Ignore if already seen
                if (!$(effect).attr('data-checked')) {
                    let parent = $(effect).parent();
                    $(effect).attr('data-checked', "true");
                    $(effect).addClass('xfound');

                    let container = $(parent).find(`[class*='iconContainer']`);
                    let image = $(container).find(`[class^='iconImg_']`);
                    let timeLeftMs = Number(timeLeft) * 1000;
                    let endDate = new Date(now + timeLeftMs);
                    let endsAt = endDate.getTime();

                    if (debugLoggingEnabled == true) {
                        let diffMs = endsAt - now;
                        let diffSecs = diffMs/1000;
                        debug("now: ", now, " end: ", endsAt, " timeLeft: ", timeLeft, " diffSecs: ", diffSecs);
                        //debug("nowDate: ", smallDateStr(nowDate), " endDate: ", smallDateStr(endDate));
                    }

                    let activeEffect = {
                         timeLeft: timeLeft,
                         timeNow: now,
                         endsAt: endsAt,
                         effect: $(image).attr("alt"),
                         src: $(image).attr("src"),
                         text: text
                    };

                    // Write to storage. This triggers (eventually) the other
                    // half of the script...or should....
                    savedEffectList[endsAt] = activeEffect;
                    GM_setValue(effectsListKey, JSON.stringify(savedEffectList));
                } // end check for having att
            }  // end for loop, active effects

            let delKeys = [];
            Object.keys(savedEffectList).forEach(function(key, idx, arr){
                if (savedEffectList[key].endsAt < now) delKeys.push(key);
            });
            if (delKeys.length) {
                delKeys.forEach((key) => delete savedEffectList[key]);
                GM_setValue(effectsListKey, JSON.stringify(savedEffectList));
            }

            setTimeout(checkEffects, 1000);
        } // end check fn.
    }


    //
    // ********** This section runs only when NOT on the attack page (optionally). **********
    //
    // Lets you know if still under the effect of a temp,
    // good or bad. Only listen for changes when NOT on attack
    // page, and displays in a mini ui the time left.
    //
    var changeListener;
    var timerproc;
    var displayMode = GM_getValue("displayMode", 'normal');    // normal, minimal, ....
    var visibleNodes = 0;


    // Notified when our storage key value changes, re-read the list
    function storageChangeCallback(key, oldValue, newValue, remote) {
        if (remote)
            savedEffectList = JSON.parse(GM_getValue(effectsListKey, {}));
    }

    function startListenersTimers() {
        log("startListenersTimers");

        if (changeListener) GM_removeValueChangeListener(changeListener);
        changeListener = GM_addValueChangeListener(effectsListKey, storageChangeCallback);

        if (timerproc) clearInterval(timerproc);
        timerproc = setInterval(effectTimerProc, 1000);
    }

    // Switch display "mode"
    function updateEffectsUi() {

    }

    function checkNodeCount() {
        if (visibleNodes == 0 && displayMode == 'minimal') {
            $("#effect-span").css("display", "flex");
        } else {
            $("#effect-span").css("display", "none");
        }
    }
    // =================================================================================================================

    // Somehow broke icon display, bad html, missing src ???

    function addNewMinimalUiNode(entry, key, text, newRow) {
        const maxRowLength = 4;
        let row;
        if (!newRow) {
            let rows = $(".eff-trr");
            if (!$(rows).length) {
                log("Adding new row");
                let newRow = `<tr id="tmp-new-row" class="eff-trh"></tr>`;
                $("#eff-table").append($(newRow));
                setTimeout(addNewMinimalUiNode, 50, entry, key, text, true);
                return;
            }
            let idx = $(rows).length - 1;
            row = $(rows)[idx];
            let cells = $(row).find("td").length;
            if (cells == maxRowLength) {
                log("Adding new row");
                let newRow = `<tr id="tmp-new-row" class="eff-trh"></tr>`;
                $("#eff-table").append($(newRow));
                setTimeout(addNewMinimalUiNode, 50, entry, key, text, true);
                return;
            }
        } else {
            row = $("#tmp-new-row");
            if (!$(row).length) {
                debug("ERROR: New row not found!");
                debugger;
            } else {
                $(row).attr("id", "");
            }
        }

        if ($(row).length) {
            let newTd = `<td id="${key}">
                             <img src="${entry.src}" style=" width: 24px; height: 32px;">
                                 <span style="color: red;">${text}</span>
                             </img>
                         </td>`;

            log("Append TD: ", $(newTd));
            $(row).append(newTd);

            let sel = "#" + key;
            log("Append TD, verify: ", $(sel));
        } else {
            debug("ERROR No Row!");
            debugger;
        }

    }

    // Functions to add/remove UI elements.
    // Done as small fns so as to support
    // various styles.
    function addNewUiNode(entry, key, text) {
        log("addNewUiNode: ", displayMode, entry);
        if (displayMode == 'minimal') {
            addNewMinimalUiNode(entry, key, text);
        } else {
            let newLi = `<li class="eff-div">
                            <img src="${entry.src}"/>
                            <span id="${key}">${text}</span>
                        </li>`;

            debug("Appending new li");
            $("#eff-ul").append(newLi);
        }

        visibleNodes++;
        checkNodeCount();
    }


    function startEffectMonitor() {
        log("startEffectMonitor");

        savedEffectList = JSON.parse(GM_getValue(effectsListKey, {}));

        if (!$("#x-effects").length) {
            let tempNormalDiv = $(`
                                <div id="x-effects" class="xhide"><div id="x-effectsheader">
                                    <ul id="eff-ul">
                                        <li class="eff-div">
                                            <span id="effect-span">Active Effects:</span>
                                        </li>
                                    </ul>
                                </div></div>`);

            let tempMiniDiv = $(`
                                <div id="x-effects" class="xhide"><div id="x-effectsheader">
                                    <div  id="effect-span" class="eff-div xhide" style="border-radius: 10px 10px 10px 10px;">
                                        <span>Nothing Active!</span>
                                    </div>
                                    <table id="eff-table" style="border: 1px solid black;"><tbody>
                                        <tr class="eff-trh">
                                            <!-- th colspan="2" id="effect-th">Active Effects:</th -->
                                        </tr>
                                        <tr class="eff-trr"></tr>
                                    </tbody></table>
                                </div></div>`);

            let useNode = (displayMode == 'normal') ? tempNormalDiv : tempMiniDiv;

            $("#mainContainer").append(useNode);
            try {
                dragElement(document.getElementById("x-effects"));
            } catch (e) {
                console.error("Error in dragElement: ", e);
            }

            addStatusIcon();

            // For development, we may add dummy entries to the UI, just for testing
            // alternate UIs, for now - may make more active later.
            let addTests = (GM_getValue("devUiTests", false) == true);
            log("addTests: ", addTests, testEntriesInit);
            if (addTests == true) {
                if (testEntriesInit != true) devOnly_initTestEntries();
            }
        }

        checkNodeCount();

        // ============== Dev Test only, for testing various UI options ====================================================

        var testEntriesInit = false;
        function devOnly_initTestEntries() {
            if (testEntriesInit == true) return;
            testEntriesInit = true;

            log("devOnly_initTestEntries");

            GM_addStyle(`
                .sm-img { width: 16px; height: auto; }
                .eff-trr { display: flex; flex-flow: row wrap; background: rgba(132, 136, 132, .4); border-radius: 4px;}
            `);

            var testEntryList = [{"effect": "hardened", "src": "/images/v2/attack/effect_icons/hardened.svg", "text": "180"},
                                 {"effect": "eviscerated", "src": "/images/v2/attack/effect_icons/eviscerated.svg", "text": "298"}
                                 ];

            testEntryList.forEach(function(entry, idx) {
                let liId = `effect-${idx}`;

                addNewUiNode(entry, liId, entry.text);

                /*
                let newLi = `<li class="eff-div">
                                <img  id="${liId}" class="sm-img" src="${entry.src}"/>
                                <span>${entry.text}</span>
                            </li>`;

                log("Appending new li");
                $("#eff-ul").append(newLi);
                */

                displayHtmlToolTip($(`#${liId}`), entry.effect, "tooltip5");
            });

        }

        // From here on out, the timer proc and chage listener are triggered and run things.
        //var changeListener = GM_addValueChangeListener(effectsListKey, storageChangeCallback);
        //var timerproc = setInterval(effectTimerProc, 1000);
        startListenersTimers();

        var inClkHndlr = false;
        function resetClkFlag(){inClkHndlr = false;}
        function handIconClick(e) {
            if (inClkHndlr == true) return;
            inClkHndlr = true;
            $("#x-effects").toggleClass("xhide");

            checkNodeCount();
            setTimeout(resetClkFlag, 500);
            return false;
        }

        function addStatusIcon() {
            GM_addStyle(`.abcdefg {
                background-image: radial-gradient(circle, red 0, black 100%) !important;
                border-radius: 50%;
                filter: brightness(0.7);
            `);
            let ul = $("ul[class^='status-icons_']");
            let iconsList = $("ul[class^='status-icons_'] > li");
            let newLi = `<li class="icon99__abcdef abcdefg">
                            <a href="#" aria-label="Active Effects" tabindex="0" data-is-tooltip-opened="false"></a>
                         </li>`;
            $(ul).append(newLi);

            $(".icon99__abcdef").on('click', handIconClick);
            displayHtmlToolTip($(".icon99__abcdef"), "Show/Hide Active Temps", "tooltip5");
        }

        function addRightClickMenuOpts() {
             $("#x-effects").off("contextmenu");
                $("#x-effects").on("contextmenu", function(e) {
                    log("x-effects right click! ", e);
                    let target = e.currentTarget;
                    e.preventDefault(); // Prevent default right-click menu

                    let menuHtml = `<ul class='custom-menu'>
                                        <li data-mode="normal">Normal</li>
                                        <li data-mode="minimal">Minimal</li>
                                    </ul>`;

                    let menu = $(menuHtml);
                    $(menu).css({top: e.pageY, left: e.pageX});
                    $("body").append(menu);
                    menu.show();

                    $(".custom-menu li").click(function() {
                        displayMode = $(this).attr("data-mode");
                        updateEffectsUi();
                        menu.remove(); // Remove the menu
                    });

                    // Hide menu when clicking outside
                    $(document).on("click", function(e) {
                        if (!$(e.target).closest(".context-menu").length) {
                            menu.remove();
                        }
                    });
                });
        }
    }

    function removeUiNode(key) {
        if ($(`#${key}`).length)
            $(`#${key}`).parent().remove();
        visibleNodes--;
        checkNodeCount();
    }

    // Timer proc to update the UI indicating effects
    // you're under, deleting locally as they expire.
    function effectTimerProc() {
        let delKeys = [];
        let now = new Date().getTime();
        let keys = Object.keys(savedEffectList);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            let entry = savedEffectList[key];
            if (entry.endsAt < now) {
                entry.expired = true;
                log("Deleting expired entry: ", entry);

                removeUiNode(key);
                /*
                if ($(`#${key}`).length)
                    $(`#${key}`).parent().remove();
                */
                delKeys.push(key);
                continue;
            }

            let parts = entry.effect.split(' ');
            let txt = parts[2];
            let remainSecs = Math.round((entry.endsAt - now) / 1000);
            if (remainSecs > 400) {
                entry.expired = true;
                log("ERROR: Bad entry detected? ", entry);
                removeUiNode(key);
                /*
                if ($(`#${key}`).length)
                    $(`#${key}`).parent().remove();
                */
                delKeys.push(key);
            }
            log("entry: ", entry);

            let text = txt + ": " + remainSecs;

            // If li exists, remove or update as needed
            if ($(`#${key}`).length) {
                if (remainSecs <= 1) {
                    log("Deleting expired entry: ",  remainSecs, " entry: ", entry);
                    removeUiNode(key);
                    /*
                    $(`#${key}`).parent().remove();
                    */
                    delKeys.push(key);
                } else {
                    $(`#${key}`).text(text);
                }

                continue;
            }

            // Otherwise, add a new one.
            addNewUiNode(entry, key, text);

            // If hidden, unhide.
            if ($("#x-effect").hasClass("xhide"))
                $("#x-effect").removeClass("xhide");
        }

        if (delKeys.length) {
            delKeys.forEach((key) => delete savedEffectList[key]);
            GM_setValue(effectsListKey, JSON.stringify(savedEffectList));
        }
    }

    //     "activeEffects": "{\"1739152733470\":{\"timeLeft\":180,\"timeNow\":1739152553470,\"endsAt\":1739152733470,\"effect\":\"effect icon hardened\",\"src\":\"/images/v2/attack/effect_icons/hardened.svg\",\"text\":\"180\"},
    //                        \"1739152874186\":{\"timeLeft\":298,\"timeNow\":1739152576186,\"endsAt\":1739152874186,\"effect\":\"effect icon eviscerated\",\"src\":\"/images/v2/attack/effect_icons/eviscerated.svg\",\"text\":\"298\"}}",



    function hashChangeHandler() {
        log("Hash change! ", location.hash);
        startEffectMonitor();
    }

    function pushStateChanged(e) {
        log("push state change! ", location.href);
        startEffectMonitor();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    //if (checkCloudFlare()) return log("Won't run while challenge active!");

    versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    // This should trigger if tab loses focus, then regains it.
    $(window).on('focus', startEffectMonitor);

    callOnContentLoaded(startEffectMonitor);


    // ================== Styles, at the bottom to be out of the way ====================

    function addStyles() {
        addToolTipStyle();
        loadMiscStyles();
        GM_addStyle(`
            .eff-div {
                width: 260px;
                height:32px;
                border: 1px solid red;
                background: rgba(0, 0, 0, 0.7);
                z-index: 999999;
                display: flex;
                flex-flow: row wrap;
                align-content: center;
                justify-content: center;
            }
            .eff-div:first-child {
                border-top-left-radius: 10px;
                border-top-right-radius: 10px;
            }
            .eff-div:last-child {
                border-bottom-left-radius: 10px;
                border-bottom-right-radius: 10px;
            }

            .eff-div span {
                display: flex;
                flex-flow: row wrap;
                width: 85%;
                height: 100%;
                font-size: 14px;
                font-family: arial;
                justify-content: center;
                align-content: center;
                color: white;
            }
            #x-effects {
                position: fixed;
                z-index: 999999;
                left: 1005px;
                top: 85px;
            }
            .x-resize {
                resize: both;
                overflow: auto;
            }
            .eff-ul {
                display: flex;
                flex-direction: column;

                position: absolute;
                top: 2%;
                right: 0;
                width: 260px;
                border: 1px solid red;
                background: black;
            }
            #eff-table td {
                position: relative;
                display: flex;
                flex-flow: column wrap;
                padding: 5px;
                align-content: center;
                justify-content: center;

                border: 1px solid red;
                border-radius: 4px;
            }
        `);
    }


})();



