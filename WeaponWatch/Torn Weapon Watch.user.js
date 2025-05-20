// ==UserScript==
// @name         Torn Weapon Watch
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Lets you know when a weapon with particular bonus is for sale.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
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
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    const bonusList = [
        "Any", "Double", "Yellow", "Orange", "Red", "Achilles", "Assassinate", "Backstab", "Berserk", "Bleed",
        "Blindfire", "Blindside", "Bloodlust", "Burn", "Comeback", "Conserve", "Cripple", "Crusher", "Cupid",
        "Deadeye", "Deadly", "Demoralize", "Disarm", "Double-edged", "Double Tap", "Emasculate", "Empower",
        "Eviscerate", "Execute", "Expose", "Finale", "Focus", "Freeze", "Frenzy", "Fury", "Grace", "Hazardous",
        "Home run", "Irradiate", "Lacerate", "Motivation", "Paralyze", "Parry", "Penetrate", "Plunder", "Poison",
        "Powerful", "Proficience", "Puncture", "Quicken", "Rage", "Revitalize", "Roshambo", "Shock", "Sleep", "Slow",
        "Smash", "Smurf", "Specialist", "Spray", "Storage", "Stricken", "Stun", "Suppress", "Sure Shot", "Throttle",
        "Toxin", "Warlord", "Weaken", "Wind-up", "Wither"
        ];

    var weaponWatchRunning = false;

    const isBuy = function () {return location.hash.indexOf("market") > -1;}
    const isSell = function () {return location.hash.indexOf("addListing") > -1;}
    const isView = function () {return location.hash.indexOf("viewListing") > -1;}

    var weaponListsValid = false;
    var weapons = { primaries: [], secondaries: [], melees: [] };
    const weaponTypes = ["Primary", "Secondary", "Melee"];

    getWeaponLists();

    function getWeaponLists() {
        var inAjax = false;

        function processLookupResult(jsonObj, status, xhr) {
            debug("[processLookupResult] status: ", status);
            if (status != 'success') {
                console.error("Failed ajax result: ", jsonObj, xhr);
                return;
            }
            let items = jsonObj.items;
            items.forEach( item => {
                let cat = item.details.category;
                let entry = {id: item.id, name: item.name};
                switch (cat) {
                    case "Primary":
                        weapons.primaries.push(entry); break;
                    case "Secondary":
                        weapons.secondaries.push(entry); break;
                    case "Melee":
                        weapons.melees.push(entry); break;
                }
            });

            weaponListsValid = weapons.primaries.length > 0 &&
                weapons.secondaries.length > 0 &&
                weapons.melees.length > 0;

            debug("Weapons: ", weaponListsValid, weapons);
        }

        function doWeaponListLookup() {
            if (inAjax == true) return;
            inAjax = true;

            setTimeout(() => {inAjax = false;}, 500);
            let comment = GM_info.script.name.replace('Torn', '');
            let url = 'https://api.torn.com/v2/torn/items?cat=Weapon&key=' + api_key + '&comment=' + comment;

            $.ajax({
                url: url,
                type: 'GET',
                success: function (response, status, xhr) {
                    processLookupResult(response, status, xhr);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.error("Error in ajax lookup: ", textStatus);
                    console.error("Error thrown: ", errorThrown);
                }
            });
        }

        for (let idx=0; idx<weaponTypes.length; idx++) {
            let type = weaponTypes[idx];
            switch (type) {
                case "Primary":
                    weapons.primaries = JSON.parse(GM_getValue("weapons.primaries", JSON.stringify([])));
                    log("Primaries: ", weapons.primaries);
                    if (!weapons.primaries || !weapons.primaries.length)
                        return doWeaponListLookup();
                    break;
                case "Secondary":
                    weapons.secondaries = JSON.parse(GM_getValue("weapons.secondaries", JSON.stringify([])));
                    log("Secondaries: ", weapons.secondaries);
                    if (!weapons.secondaries || !weapons.secondaries.length)
                        return doWeaponListLookup();
                    break;
                case "Melee":
                    weapons.melees = JSON.parse(GM_getValue("weapons.melees", JSON.stringify([])));
                    log("Melees: ", weapons.melees);
                    if (!weapons.melees || !weapons.melees.length)
                        return doWeaponListLookup();
                    break;
                default:
                    log("Unknwon type: ", type);
                    break;
            }
        }
        weaponListsValid = true;
    }

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    var inAnimate = false;
    const resetAnimate = function () {inAnimate = false;}

    function handleMainBtnClick(e, forceResize) {
        let classy = $("#weapon-watch-wrap").hasClass('xwwhidden');
        if (inAnimate == true) return;
        inAnimate = true;
        let closing = true;
        if (classy || forceResize) {
            closing = false;
            $("#weapon-watch-wrap").removeClass('xwwhidden');
        } else {
            $("#weapon-watch-wrap").addClass('xwwhidden');
        }

        let height = $("#weapon-watch-wrap").height();

        let count = $("#xw-watches li").length;
        let size = (count * 24 + 60);

        let newWrapHeight = (closing == false) ? (size + "px") : "0px";
        let newSpanHeight = (closing == false) ? "24px" : "0px";
        let newInputHeight = (closing == false) ? "14px" : "0px";
        let newHdrHeight = (closing == false) ? "34px" : "0px";
        let newHdrDivHeight = (closing == false) ? "100%" : "0px";
        let op = (closing == false) ? 1 : 0;

        debug("[animate] changing height to ", newWrapHeight);

        debug("animate: ", newWrapHeight, " | ", newSpanHeight, " | ", op);

        $("#weapon-watch-wrap").animate({
            height: newWrapHeight,
            opacity: op
        }, 500, function () {
            debug("Set #weapon-watch-wrap to: ", $("#weapon-watch-wrap").height());
            inAnimate = false;
        });

        // TBD: check all these!! no longer exist?
        $("#xwwshdr").animate({height: newHdrHeight, opacity: op}, 500);
        $("#xwwshdr > div").animate({height: newHdrDivHeight, opacity: op}, 500);
        $(".xww-opts-nh").animate({height: newSpanHeight}, 500);
        $(".numInput-nh").animate({height: newInputHeight}, 500);
        $("#xprices > li").animate({height: newSpanHeight}, 500);

        return false;
    }

    // ============== Select lists ====================

    function fillWeapsList(optSelect, optList) {
        $(optSelect).empty();
        optList.forEach(entry => {
            let opt = `<option value="${entry.id}">${entry.name}</option>`;
            $(optSelect).append(opt);
        });
    }

    // TEMP implementation - only add bonuses supported by the weapon selected
    // For now just add all bonuses
    function fillBonusList(optSelect, weapId) {
        $(optSelect).empty();
        bonusList.forEach(bonus => {
            let opt = `<option value="${weapId}">${bonus}</option>`;
            $(optSelect).append(opt);
        });
    }

    function handleCatChange(e) {
        let selected = $(this).val();

        let optList = weapons.primaries;
        let optSelect = $(this).parent().find(".weap-name");

        log("handleCatChange, this: ", $(this));
        log("handleCatChange, next: ", $(this).next());
        log("handleCatChange, sel: ", $(optSelect));
        if (selected == 'Secondary') optList = weapons.secondaries;
        if (selected == 'Melee') optList = weapons.melees;

        fillWeapsList($(optSelect), optList);

        $(optSelect).prop('disabled', false);
    }
    function handleNameChange(e) {
        let itemId = $(this).val();
        let li = $(this).closest("li");
        $(li).attr("id", itemId);           // This needs to be changed from "temp-id" so we can add more...

        let b1 = $(this).next();
        let b2 = $(b1).next();
        log("handleNameChange: ", $(this), $(this).next(), $(b1), $(b2));

        fillBonusList($(this).parent().find(".weap-bonus1"), "temp-val");
        fillBonusList($(this).parent().find(".weap-bonus2"), "temp-val");

        $(this).parent().find(".weap-bonus1").prop('disabled', false);
        $(this).parent().find(".weap-bonus2").prop('disabled', false);
    }

    function handleBonus1Change(e) {

    }

    function handleBonus2Change(e) {

    }


    function addWeaponWatch(e) {
        // If not from a click, but manually called, e will be null.
        // So don't force a resize. Otherwise, do.
        log("[addWeaponWatch]");
        const tempId = "temp-id";    // must be replaced later

        if ($(`#${tempId}`).length > 0) return log("ERROR: [addWeaponWatch] last key not finalized");

        let li = getAddWatchLi(tempId);

        $("#xw-watches").append(li);

        /*
        let hNow = $("#weapon-watch-wrap").height();
        let newH = parseInt(hNow) + parseInt($(`#${tempId}`).height()) + 'px';
        log("[addWeaponWatch] changing height: ", hNow, newH);
        $("#weapon-watch-wrap").css('height', newH);
        */

        $(".weap-cat").on('change', handleCatChange);
        $(".weap-name").on('change', handleNameChange);
        $(".weap-bonus1").on('change', handleBonus1Change);
        $(".weap-bonus2").on('change', handleBonus2Change);

        log("Try to trigger: ", $(`#${tempId} .weap-cat`));
        $(`#${tempId} .weap-cat`).trigger('change');

        if (e) { // handleMainBtnClick(e, forceResize)
            handleMainBtnClick(null, true);
        }

        function getAddWatchLi(itemId) {
            let li = `<li id="${itemId}">
                          <span class="watch0" style="display: none; margin-right: 15px;">
                              <span style="align-content: center; display: flex; flex-wrap: wrap;">Disable:</span>
                              <input type="checkbox" class="xma-disable-cb xma-opts-nh" data-id="${itemId}" name="xma-disable">
                          </span>

                          <!-- div class="xwatch-item" style="display: none;">
                              <img src="/images/items/${itemId}/small.png">
                          </div -->

                          <select name="weap-cat" class="weap-cat">
                              <option value="Primary">Primary</option>
                              <option value="Secondary">Secondary</option>
                              <option value="Melee">Melee</option>
                          </select>

                          <select name="weap-name" class="weap-name" disabled>
                              <option value="default">-- name --</option>
                          </select>

                          <select name="weap-bonus1" class="weap-bonus1" disabled>
                              <option value="default">-- any --</option>
                          </select>

                          <select name="weap-bonus2" class="weap-bonus2" disabled>
                              <option value="default">-- any --</option>
                          </select>

                          <div class="watch-parent watch4" style="position: absolute; left: 93%; display:none;">
                              <span class="x-round-btn x-watch-remove" style="width: 20px;">X</span>
                          </div>
                      </li>`;

            return li;
        }
    }

    function buildOptsDiv() {
        // Add a new div which has a list options beneath the opt button,
        // and fill. Will start hidden and expand on btn click.
        let page = 'unknown';
        if (location.hash.indexOf("market/view") > -1) page = 'buy';
        else if (location.hash.indexOf("addListing") > -1) page = 'sell';
        else return log("not on buy or sell! ", location.hash);

        if (!$("#x-weapon-watch-btn").length > 0) return;
        if ($("#weapon-watch-wrap").length > 0) $("#weapon-watch-wrap").remove();

        let outerWrap = "<div id='xww-outer-opts' class='xww-outer'></div>";

        let optsDiv = `<div id='weapon-watch-wrap' class='xwwhidden xww-locked' style='height: 0px; opacity: 0;'>
                          <div id="xweapon-watch-opts">
                              <div class="xwwshdr2" style="flex-direction: row; height: 34px; opacity: 1;">
                                  <span class="w-disable-all" style="margin-left: 15px;">
                                      <!-- span style="align-content: center; display: flex; flex-wrap: wrap;">Disable:</span -->
                                      <input id='x-disable-all' type="checkbox" class="xww-disable-cb xww-opts-nh" name="xww-all-disable">
                                      <span>Disable all</span>
                                  </span>
                                  <div class="xwwstitle xww-inner-hdr" style=''>Weapon Watch Items</div>
                                  <span class="xrt-btn btn">
                                      <span>Add New</span>
                                      <input id="xww-add-watch" type="submit" class="xedx-torn-btn-raw" style="padding: 0px 10px 0px 10px;" value="+">
                                  </span>
                              </div>
                              <div id='xweapon-watch' class='x-outer-scroll-wrap'><ul id='xw-watches' class='xinner-list'></ul></div>
                          </div>
                      </div>`;

        $("#x-weapon-watch-btn").css({"flex-direction": "column",
                                "position": "relative",
                                "padding": "0px",
                                "background": "var(--btn-background"});
        $("#x-weapon-watch-btn > span").css("padding",  "0px 10px 0px 10px");
        $("#weapon-watch-wrap").css("padding-bottom", "10px");

        let target = $("[class^='marketWrapper_'] [class^='itemListWrapper_'] [class^='itemsHeader_']")[0];
        $(target).before(outerWrap);
        $("#xww-outer-opts").append($(optsDiv));

        $("#xww-add-watch").on('click', addWeaponWatch);

        // Only do this if there aren't any saved watches...
        addWeaponWatch();

        //$("#x-disable-all").change(disableWatchList);
        //displayHtmlToolTip($("#x-disable-all"), "Check to disable all", "tooltip4");

        //restoreWatchList();
    }

    const getMainBtnDiv = function () {return `<div id="x-weapon-watch-btn"><span>Weapon Watch</span></div>`;}

    function installUi(retries = 0) {
        let page = 'unknown';
        if (location.hash.indexOf("market/view") > -1) page = 'buy';
        else if (location.hash.indexOf("addListing") > -1) page = 'sell';
        else if (location.hash.indexOf("viewListing") > -1) page = 'view';
        else return log("not on a known page. ", location.hash);

        debug("[installUI]: ", page, "|", $("#x-weapon-watch-btn").length);

        if (page == "view") {
            //doViewPageInstall();
            //processViewPage();
            return;
        }

        if ($("#x-weapon-watch-btn").length == 0) {
            if (page == 'buy') {
                let wrapper = $("[class^='searchWrapper_']");
                if (!$(wrapper).length) {
                    if (retries++ < 20) return setTimeout(installUi, 250, retries);
                    return log("[installUi] Too many retries!");
                }

                $(wrapper).after(getMainBtnDiv());
            }

            if (page == 'sell') {
                let target = $("[class^='addListingWrapper_'] [class^='itemsHeader_']");
                debug("On sell: ", $(target));
                if ($(target).length = 0) return log("Couldn't find sell target");
                $(target).css("flex-direction", "row");
                $(target).append(getMainBtnDiv());
            }
        }

        if ($("#x-weapon-watch-btn").length > 0) {
            buildOptsDiv();

            $("#weapon-watch-wrap").next().css("margin-top", "-10px");
            $(".xww-opts-nh").css("height", "0px");
            $(".numInput-nh").css("height", "0px");

            $("#x-weapon-watch-btn").on('click.xedx', handleMainBtnClick);
        }

    }

    // ========================== The watcher, does API calls ============================

    /*
    function startWeaponWatch() {
        if (checkCloudFlare()) return log("Won't run while challenge active!");
        log("startWeaponWatch, running: ", weaponWatchRunning);
        if (weaponWatchRunning == true) return;

        setInterval(resetPriceChecks, 60000);

        if (logOptions) logMarketWatchOpts();

        var doNotShowAgain = false;
        var canShowAfterMinutes = 10;

        weaponWatchRunning = true;
        refreshWatchList();

        function refreshWatchList() {
            if (GM_getValue("watchListDisabled", false) == true) {
                if (logWatchList == true) log("watchlist disabled");
                setTimeout(refreshWatchList, 10000);
                return;
            }
            if (logWatchList == true) log("refreshWatchList");
            let delay = mwBetweenCallDelay * 1000;
            let keys = Object.keys(watchList);

            if (logWatchList == true) log("Refreshing ", keys.length, " watched items");

            for (let idx=0; idx < keys.length; idx++) {
                let itemId = keys[idx];
                let item = watchList[itemId];
                if (item.disabled == true) continue;
                //findLowPriceOnMarket(itemId, null, processMwResult);
                delay = (mwBetweenCallDelay * 1000) * (idx + 1);
                setTimeout(findLowPriceOnMarket, delay, itemId, null, processMwResult);
                //schedulePriceLookup(delay, itemId);
            }
            setTimeout(refreshWatchList, (mwItemCheckInterval * 1000) + delay);
        }


        var lookupTasks = [];
        var lookupsInProgress = 0;
        const maxLookups = 5;
        const lookupInterval = 3; // time between, seconds....


        // Process ajax result, similar to low price finder
        var lookupsPaused = false;
        function resetLookups() {lookupsPaused = false;}

        function processMwResult(jsonObj, status, xhr) {
            if (jsonObj.error) {
                console.error("Error: code ", jsonObj.error.code, jsonObj.error.error);
                if (jsonObj.error.code == 5) {
                    if (lookupsPaused == false) {
                        lookupsPaused = true;
                        setTimeout(resetLookups, 60000);
                    }
                }
                return;
            }
            if (logWatchList == true) {
                log("processMwResult");
                log("isNotifyOpen? ", isNotifyOpen());
            }
            let listings, item, cheapest, name, itemId;
            let market = jsonObj.itemmarket;
            if (market) item = market.item;
            if (item) {
                name = item.name;
                itemId = item.id;
            }
            if (!watchList[itemId]) return log("ERROR: no item found for id ", itemId, " item: ", item);

            if (market) listings = market.listings;
            if (listings) cheapest = listings[0];

            if (logWatchList == true) {
                log("processMwResult: ", name, " id: ", itemId, " cheapest: ", cheapest.price);
            }
            if (cheapest && itemId) {
                let price = cheapest.price;
                watchList[itemId].currLow = price;
                let limit = watchList[itemId].limit;
                let priceStr = asCurrency(price);

                if (logWatchList == true) log("processMwResult: ", price, "|", limit, "|", doNotShowAgain, "|", (price <= limit));
                if (logWatchList == true) log("isNotifyOpen? ", isNotifyOpen());

                if (price <= limit) {
                    //if (doNotShowAgain == false)
                    //debugger;
                    doBrowserNotify(item, price); //name, price, itemId);
                }
            }
        }

        const resetShowAgain = function() {doNotShowAgain = false;}

        function doBrowserNotify(item, cost) {
            if (logWatchList == true) log("doBrowserNotify, isNotifyOpen: ", isNotifyOpen(), " do not show:", doNotShowAgain);

            if (isNotifyOpen() == true) {
                if (logWatchList == true) log("doBrowserNotify: not showing, is open");
                return; // || doNotShowAgain == true) return;
            }

            let now = new Date().getTime();
            let diff = (now - item.lastNotify) / 1000;
            if (diff < mwNotifyTimeBetweenSecs) {
                if (logWatchList == true) log("doBrowserNotify: not showing, diff: ", diff, " time between: ", mwNotifyTimeBetweenSecs);
                return;
            }

            setNotifyOpen();

            item.lastNotify = now;
            saveWatchList();

            let msgText = "The price of " + item.name + " is available " +
                "at under " + cost + "!\n\nClick to go to market...";

            let smMsgText = item.name + " available now for " + asCurrency(cost);
            if (xedxDevMode == true)
                smMsgText = item.name + ": " + asCurrency(cost) + " [" + pageId + "-" + title + "]";

            // For now just show once. Make an option later

            //doNotShowAgain = true;
            //if (canShowAfterMinutes > 0) {
            //    let afterMs = canShowAfterMinutes * 60 * 1000;
            //    setTimeout(resetShowAgain, afterMs);
            //}


            let opts = {
                title: 'Item Market Alert',
                text: smMsgText, //msgText,
                tag: item.id,      // Prevent multiple msgs if it sneaks by my checks.
                image: 'https://imgur.com/QgEtwu3.png',
                //timeout: item.timeout ? item.timeout * 1000 : mwNotifyTimeSecs * 1000,
                onclick: (context) => {
                    setTimeout(notifyReset, mwItemCheckInterval*1000); // ??? not needed???
                    handleNotifyClick(context);
                }, ondone: () => {
                    setTimeout(notifyReset, mwItemCheckInterval*1000);
                }
            };

            opts.timeout = mwNotifyTimeSecs * 1000;


            GM_notification ( opts );

            // This is supposed to keep multiple tabs from opening...
            // maybe multiple windows causes this to happen?
            //const notifyReset = function(){logt("handleNotifyClick: notifyReset"); GM_setValue("inNotify", false);}

            function handleNotifyClick(context) {
                //let inNotify = GM_getValue("inNotify", false);
                //if (logWatchList == true) log("handleNotifyClick: ", inNotify, "|", context );

                //if (inNotify == true) return;
                //if (logWatchList == true) log("handleNotifyClick: inNotify is false!");
                //GM_setValue("inNotify", true);
                //setTimeout(notifyReset, 5000);

                let id = context ? context.tag : pageId;
                let url = "https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID=" + id + "&impw=1";
                if (logWatchList == true) log("handleNotifyClick: opening tab");
                window.open(url, '_blank').focus();
            }
        }
    }
    */

    // ========= Entry points, once executing - called once the page has loaded ===========

    function handlePageLoad(retries=0) {
        installUi();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {

        // Options styles, 'xww' == xedx weapon watch
        GM_addStyle(`
            .weap-cat { width: 90px; }
            .weap-name { width: 195px; }
            .weap-bonus1 { width: 110px; }
            .weap-bonus2 { width: 110px; margin-right: 20px; }

            .xww-inner-hdr {
                justify-content: center;
                display: flex;

                height: 100%;
                align-content: center;
                flex-wrap: wrap;
            }
            #xwwshdr, .xwwshdr2 {
                align-items: center;
                background: var(--default-panel-gradient);
                border-bottom: var(--item-market-border-dark);
                border-top: var(--item-market-border-light);
                border-top-left-radius: 5px;
                border-top-right-radius: 5px;
                border: 1px solid black;
                box-sizing: border-box;
                color: #666;
                color: var(--item-market-category-title-color);
                display: flex;
                font-weight: 700;
                min-height: 34px;
            }
            .xwwstitle {
                flex: 1;
                padding: 0 10px;
            }
            #xweapon-watch-opts {
                display: flex;
                flex-direction: column;
                width: 100%;
            }
            .xwatchsp {
                display: flex;
                flex-wrap: wrap;
                align-content: center;
            }
            .xwatchsp > input {
                width: 100%;
            }
            #xw-watches > li {
                position: relative;
                border-radius: 5px;
                background: #222;
                padding: 2px 0px 2px 10px;
                width: 100%;
            }
            #xww-outer-opts {
                display: flex;
                flex-direction: column;
                width: 100%;
            }
            .x-outer-scroll-wrap {
                position: relative;
                overflow: scroll;
                display: flex;
                flex-direction: column;
                top: 0;
                cursor: grab;
                max-height: 202px;
                padding-top: 10px;
                padding-bottom: 10px;
                margin-bottom: 16px;
            }

            div.x-outer-scroll-wrap::-webkit-scrollbar {
                -webkit-appearance: none;
                width: 7px;
                height: 0px;
            }

            div.x-outer-scroll-wrap::-webkit-scrollbar-thumb {
                border-radius: 4px;
                background-color: rgba(200, 200, 200, .5);
                box-shadow: 0 0 1px rgba(255, 255, 255, .5);
            }
            .xinner-list {
                display: flex;
                flex-direction: column;
            }

            .xinner-list input {
                outline: none;
                border: none;
                background: transparent;
                color: white;
            }
            .xinner-list input:hover  {
                background: white;
                color: black;
            }
            .xinner-list input:focus  {

            }
            .xinner-list > li {
                display: flex;
                flex-flow: row wrap;
                padding-left: 10px;
                align-content: center;
                justify-content: space-around;
            }
            .xinner-list > li > span {
                font-size: 10pt;
                padding: 5px 0px 5px 0px;
            }

            .w20p {width: 20%;}
            .w25p {width: 25%;}
            .w30p {width: 30%;}
            .w35p {width: 35%;}
            .w40p {width: 40%;}
            .w45p {width: 45%;}
            .w50p {width: 50%;}
            .w60p {width: 60%;}
            .w70p {width: 70%;}
            .w80p {width: 80%;}

            #weapon-watch-wrap {
                width: 100%;
                display: flex;
                flex-direction: row;
                /*height: auto;*/
            }
            .xww-locked {
               max-height: 250px;
               top: 0;
               position: sticky;
            }
            #weapon-watch-wrap label {
                align-content: center;
            }

            /*
            .xww-opts-inner-div {
                display: flex;
                flex-direction: column;
            }
            .xww-opts-inner-div-sell {
                position: relative;
                display: flex;
                flex-direction: column;
                top: 0;
                overflow-y: scroll;
                cursor: grab;
                max-height: 202px;
                /*width: 40%;*/
                padding-top: 10px;
                padding-bottom: 10px;
                margin-bottom: 16px;
            }
            .xww-opts-inner-div-sell > span {
                margin-left: 10px;
            }
            .xww-opts-inner-div > span {
                display: flex;
            }
            */

            .xww-opts-nh {
                display: inline-flex;
                flex-flow: row wrap;
                margin-left: 5px;
                align-items: center;
                font-size: 10pt;
            }
            #x-weapon-watch-btn {
                background: var(--default-panel-gradient);
                border-top: var(--item-market-border-light);
                border-radius: var(--item-market-border-radius);
                box-shadow: var(--item-market-shadow);
                height: 24px;
                padding: 2px;
                display: flex;
                justify-content: center;
                align-content: center;
                cursor: pointer;
                flex-wrap: wrap;
            }

            /*
            .xsell-hlp-btn {
                 margin-right: 20px;
                 flex-direction: column;
                 margin-right: 20px;
                 position: relative;
                 padding: 0px;
                 background: var(--btn-background);
            }

            #x-weapon-watch-btn .xsell-span {
                padding: 0px 10px 0px 10px;
            }
            */

            #x-weapon-watch-btn:hover {filter: brightness(140%);}

            /*
            #QbCb {
                margin: -3px 0px 0px 10px;
                z-index: 9999999;
            }
            */
        `);

    }

})();