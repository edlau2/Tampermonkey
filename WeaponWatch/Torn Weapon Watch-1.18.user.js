// ==UserScript==
// @name         Torn Weapon Watch
// @namespace    http://tampermonkey.net/
// @version      1.18
// @description  Lets you know when a weapon with particular bonus is for sale.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @exclude      https://www.torn.com/recaptcha.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const devMode = GM_getValue("devMode", false);

    const secsInMin = 60, MinInHr = 60, SecsInHr = secsInMin * MinInHr;

    const notifyIntervalSecs = GM_getValue("notifyIntervalSecs", (15 * secsInMin));
    const notifyDurationSecs = GM_getValue("notifyDurationSecs", (30));
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    GM_setValue("notifyIntervalSecs", notifyIntervalSecs);
    GM_setValue("notifyDurationSecs", notifyDurationSecs);

    // Channel for cross-script comms
    const channel = new BroadcastChannel('weapon-watch');
    channel.onmessage = handleBroadcasts;;

    const baseUrl = "https://www.torn.com/page.php?sid=ItemMarket";
    const searchHash = "#/market/view=search";

    const myId = getRandomInt(100000);
    
    const bonusIds = {
        "Bonus filter off": "0", "Any bonuses": "-2", "Double bonuses": "-1", "Yellow bonuses": "yellow", "Orange bonuses": "orange", "Red bonuses": "red",
        "Achilles": "50", "Assassinate": "72", "Bleed": "57", "Blindfire": "33", "Blindside": "51", "Comeback": "67", "Conserve": "55",
        "Cripple": "45", "Cupid": "47", "Deadeye": "63", "Deadly": "62", "Demoralize": "36", "Disarm": "86", "Eviscerate": "56", "Expose": "1",
        "Focus": "79", "Freeze": "38", "Motivation": "61", "Penetrate": "101", "Powerful": "68", "Proficience": "14","Puncture": "66",
        "Quicken": "88", "Revitalize": "41", "Slow": "44", "Smurf": "73", "Specialist": "71", "Spray": "35", "Stun": "58", "Suppress": "60",
        "Sure Shot": "78", "Throttle": "48", "Warlord": "81", "Weaken": "46", "Wither": "42", "Burn": "30", "Double-edged": "74",
        "Double Tap": "105", "Execute": "75", "Finale": "82", "Paralyze": "59", "Shock": "120", "Stricken": "20", "Wind-up": "76",
        "Backstab": "52", "Berserk": "54", "Bloodlust": "85", "Crusher": "49", "Double edged": "74", "Empower": "87", "Frenzy": "80", "Fury": "64",
        "Grace": "53", "Home run": "83", "Irradiate": "102", "Lacerate": "89", "Parry": "84", "Plunder": "21", "Rage": "65",
        "Roshambo": "43", "Smash": "104", "Toxin": "103", "Wind up": "76"
    };

    const commonEntries = ["Bonus filter off", "Any bonuses", "Double bonuses", "Yellow bonuses", "Orange bonuses", "Red bonuses"];
    var bonusByType = {
        "CL": ["Crusher","Home Run","Roshambo","Powerful","Stun","Disarm","Frenzy","Fury","Plunder","Rage","Wind-up","Slow","Motivation","Empower"],
        "HA": ["Powerful","Stun","Finale","Paralyzed","Stricken","Warlord","Cripple","Specialist"],
        "MG": ["Warlord","Smurf","Suppress","Penetrate","Puncture","Specialist","Conserve","Deadeye"],
        "PI": ["Disarm","Frenzy","Fury","Plunder","Rage","Wind-up","Slow","Penetrate","Puncture","Backstab","Irradiate","Empower","Assassinate","Deadeye","Achilles","Cupid","Wither","Weaken","Bleed","Eviscerate"],
        "PS": ["Disarm","Motivation","Specialist","Assassinate","Deadeye","Achilles","Cupid","Wither","Double Tap","Execute","Expose","Throttle","Quicken"],
        "RF": ["Powerful","Disarm","Warlord","Penetrate","Puncture","Specialist","Conserve","Assassinate","Deadeye","Achilles","Cupid","Weaken","Expose","Throttle","Focus","Sure Shot"],
        "SG": ["Powerful","Stun","Warlord","Cripple","Specialist","Achilles","Cupid","Weaken","Bleed","Eviscerate","Expose","Throttle","Blindside","Deadly"],
        "SL": ["Disarm","Frenzy","Fury","Plunder","Rage","Wind-up","Motivation","Empower","Weaken","Bleed","Eviscerate","Expose","Throttle","Quicken","Berserk","Bloodlust","Double-edged","Grace","Parry"],
        "SM": ["Powerful","Slow","Motivation","Warlord","Specialist","Conserve","Achilles","Cupid","Wither","Throttle","Quicken","Comeback","Proficience","Revitalize"],
    };

    var refreshTimer = null;
    var lastUpdate = GM_getValue("lastUpdate", 0);
    var weaponWatchRunning = false;

    // Controls when we can send a browser notification
    var notifyLock = {
        type: "lock-query",               // When received as a broadcast, a 'query' or 'response'
        locked: false,                    // Locked by this instance
        lockedFor: 0,
        remoteLocked: false,              // Locked by another
        owner:  '',                       // Will be owner ID
        page: '',
        myId: myId,
        lockTime: new Date().getTime(),   // Time locked, epoch time
        unlockTime: new Date().getTime() + notifyIntervalSecs * 1000,
    };

    const isBuy = function () {return location.hash.indexOf("market/view") > -1;}
    const isSell = function () {return location.hash.indexOf("addListing") > -1;}
    const isView = function () {return location.hash.indexOf("viewListing") > -1;}
    const pageTitle = function() { return $("title").text().split('|')[0]; }

    var weaponListsValid = false;
    var weapons = { primaries: [], secondaries: [], melees: [] };
    const weaponTypes = ["Primary", "Secondary", "Melee"];

    const isTestPage = false; //(location.href.indexOf('mission') > -1);

    function translateType(weapon_type) {
        let type = weapon_type ? weapon_type.toLowerCase() : "ERROR";
        switch (type) {
            case "clubbing": return 'CL';
            case "heavy artillery": return 'HA';
            case "machine gun": return 'MG';
            case "mechanical": return 'ME';
            case "piercing": return 'PI';
            case "pistol": return 'PS';
            case "rifle": return 'RF';
            case "shotgun": return 'SG';
            case "slashing": return 'SL';
            case "smg": return 'SM';
        }
        return "ERROR";
    }

    // =========== Build lists of weapons available ===============
    // Only needs to be done once, will be cached for re-use.
    function getWeaponLists() {
        log("[getWeaponLists]");
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
                log("process item: ", item);
                log("sub type: ", item.sub_type);
                if (cat != 'Temporary') {
                    let type = translateType(item.sub_type);
                    if (type == 'ERROR') {
                        debugger;
                    } else {
                        let entry = {id: item.id, name: item.name, type: translateType(item.sub_type)};
                        switch (cat) {
                            case "Primary":
                                weapons.primaries.push(entry); break;
                            case "Secondary":
                                weapons.secondaries.push(entry); break;
                            case "Melee":
                                weapons.melees.push(entry); break;
                        }
                    }
                }
            });

            weaponListsValid = weapons.primaries.length > 0 &&
                weapons.secondaries.length > 0 &&
                weapons.melees.length > 0;

            let keys = Object.keys(weapons);
            for (let idx=0; idx<keys.length; idx++) {
                let key = keys[idx];
                let arr = weapons[key];
                arr.sort((a, b) => {
                    if (a.name < b.name) return -1;
                    if (a.name > b.name) return 1;
                    return 0;
                });
            }

            log("Weapons: ", weaponListsValid, weapons);

            GM_setValue("weapons.primaries", JSON.stringify(weapons.primaries));
            GM_setValue("weapons.secondaries", JSON.stringify(weapons.secondaries));
            GM_setValue("weapons.melees", JSON.stringify(weapons.melees));
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

        function itemsQueryCB(responseText, ID) {
            debug("itemsQueryCB");
            let jsonResp = JSON.parse(responseText);
            if (jsonResp.error) {
                if (jsonResp.error.code == 6) return;
                return handleError(responseText);
            }

            let jsonObj = jsonResp.items;
            let itemIds = Object.keys(jsonObj);

            for (let idx=0; idx<itemIds.length; idx++) {
                let itemId = itemIds[idx];
                let item = jsonObj[itemId];
                if (!item.weapon_type) continue;

                let type = translateType(item.weapon_type);
                let entry = { id: itemId, name: item.name, type: type };
                switch (item.type) {
                    case "Primary":
                        weapons.primaries.push(entry); break;
                    case "Secondary":
                        weapons.secondaries.push(entry); break;
                    case "Melee":
                        weapons.melees.push(entry); break;
                    default:
                        continue;
                }
            };

            weaponListsValid = weapons.primaries.length > 0 &&
                weapons.secondaries.length > 0 &&
                weapons.melees.length > 0;

            let keys = Object.keys(weapons);
            for (let idx=0; idx<keys.length; idx++) {
                let key = keys[idx];
                let arr = weapons[key];
                arr.sort((a, b) => {
                    if (a.name < b.name) return -1;
                    if (a.name > b.name) return 1;
                    return 0;
                });
            }

            debug("Weapons: ", weaponListsValid, weapons);

            GM_setValue("weapons.primaries", JSON.stringify(weapons.primaries));
            GM_setValue("weapons.secondaries", JSON.stringify(weapons.secondaries));
            GM_setValue("weapons.melees", JSON.stringify(weapons.melees));
        }

        function doWeaponListLookup_v1() {
            xedx_TornTornQuery("", "items", itemsQueryCB);
        }

        debug("[getWeaponLists] looking for cached lists");
        for (let idx=0; idx<weaponTypes.length; idx++) {
            let type = weaponTypes[idx];
            switch (type) {
                case "Primary":
                    weapons.primaries = JSON.parse(GM_getValue("weapons.primaries", JSON.stringify([])));
                    debug("Primaries: ", weapons.primaries);
                    if (!weapons.primaries || !weapons.primaries.length)
                        return doWeaponListLookup();
                    break;
                case "Secondary":
                    weapons.secondaries = JSON.parse(GM_getValue("weapons.secondaries", JSON.stringify([])));
                    debug("Secondaries: ", weapons.secondaries);
                    if (!weapons.secondaries || !weapons.secondaries.length)
                        return doWeaponListLookup();
                    break;
                case "Melee":
                    weapons.melees = JSON.parse(GM_getValue("weapons.melees", JSON.stringify([])));
                    debug("Melees: ", weapons.melees);
                    if (!weapons.melees || !weapons.melees.length)
                        return doWeaponListLookup();
                    break;
                default:
                    debug("Unknown type: ", type);
                    return doWeaponListLookup();
            }
        }

        let keys = Object.keys(weapons);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            let arr = weapons[key];
            arr.sort((a, b) => {
                if (a.name < b.name) return -1;
                if (a.name > b.name) return 1;
                return 0;
            });
        }

        weaponListsValid = true;
    }

    // ==================== Page navigation =======================
    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    // ============== Opening/closing the UI ======================
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
        let size = (count * 28 + 60);

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

        if (closing == true) saveWatches();

        // TBD: check all these!! no longer exist?
        $("#xwwshdr").animate({height: newHdrHeight, opacity: op}, 500);
        $("#xwwshdr > div").animate({height: newHdrDivHeight, opacity: op}, 500);
        $(".xww-opts-nh").animate({height: newSpanHeight}, 500);
        $(".numInput-nh").animate({height: newInputHeight}, 500);
        $("#xprices > li").animate({height: newSpanHeight}, 500);

        return false;
    }

    function handleMainBtnContext(e) {
         e.preventDefault();
         e.stopPropagation();

        let allBonusIds = {};
        let objArr = [bonusListPrimary, bonusListSecondary, bonusListMelee];
        objArr.forEach(arr => {
            let keys =  Object.keys(arr);
            for (let idx=0; idx<keys.length; idx++) {
                let key = keys[idx];
                let val = arr[key];
                allBonusIds[key] = val;
            }
        });

        log("Final ID list: ", allBonusIds);

        GM_setValue("bonusListStr", JSON.stringify(allBonusIds));
        GM_setValue("bonusListRaw", allBonusIds);


        let arr2 = findUniqueElements(bonusList, Object.keys(allBonusIds));
        log("Missing: ", arr2);


        return false;
    }

    // ================== Misc helpers =============================

    function findUniqueElements(arr1, arr2) {
      return arr1.filter(element => !arr2.includes(element));
    }

    function findObjectByKeyValuePair(array, key, value) {
        return array.find(obj => obj && obj.hasOwnProperty(key) && obj[key] === value);
    }

    function findWeapEntryById(array, itemId) {
        return array.find(obj => obj && obj.hasOwnProperty('id') && obj.id === parseInt(itemId));
    }

    function tm_str(tm) {
        let dt = tm ? new Date(tm) : new Date();
        const mediumTime = new Intl.DateTimeFormat("en-GB", {
          timeStyle: "medium",
          hourCycle: "h24",
        });

        const shortDate = new Intl.DateTimeFormat("en-GB", {
          dateStyle: "short",
        });
        const formattedDate = mediumTime.format(dt) + " - " + shortDate.format(dt);
        return formattedDate;
    }

    function sm_tm_str(tm) {
        let dt = tm ? new Date(tm) : new Date();
        const mediumTime = new Intl.DateTimeFormat("en-GB", {
          timeStyle: "medium",
          hourCycle: "h24",
        });

        const formattedDate = mediumTime.format(dt);
        return formattedDate;
    }

    // Sorts in-place, arr is modified
    function sortArrayOfJson(arr, key) {
        arr.sort((a, b) => {
            if (a.key < b.key) return -1;
            if (a.key > b.key) return 1;
            return 0;
        });
    }

    function findUniqueStrings(arr1, arr2) {
        const inFirstOnly = arr1.filter(str => !arr2.includes(str));
        const inSecondOnly = arr2.filter(str => !arr1.includes(str));
        return { inFirstOnly, inSecondOnly };
    }

    // ============== Fill Select Options lists ====================

    // If the watches change, flag as 'dirty'. Will need
    // to be re-read before checking for items...
    var watchesDirty = false;

    function setWatchesDirty(dirty=true) {
        let wasDirty = watchesDirty;
        watchesDirty = dirty;
        if (dirty == false && wasDirty == true) saveWatches();
    }

    function catFromLi(li) {
         return $(li).find(".weap-cat").val();
    }

    function bonus1FromLi(li) {
        return $(li).find('.weap-bonus1 option:selected').text();
    }

    function getWeapArray(li) {
        let optList = weapons.primaries;
        let selected = $(li).find(".weap-cat").val();
        if (selected == 'Secondary') optList = weapons.secondaries;
        if (selected == 'Melee') optList = weapons.melees;

        debug("[getWeapArray] ", $(li), optList);

        return optList;
    }

    function fillWeapsList(optSelect, optList, retries=0) {
        if (!weaponListsValid || !optList.length) {
            if (retries++ < 30) return setTimeout(fillWeapsList, 250, optSelect, optList, retries);
            return log("[fillWeapsList] timed out!");
        }

        $(optSelect).empty();
        $(optSelect).append(`<option value="none">-- Select --</option>`);
        let count = 0;
        optList.forEach(entry => {
            let opt = `<option value="${entry.id}">${entry.name}</option>`;
            $(optSelect).append(opt);
            count++;
        });
    }

    function fillBonusList(optSelect, arr) {
        $(optSelect).empty();

        commonEntries.forEach(bonus => {
            let opt = `<option value="${bonus}">${bonus}</option>`;
            $(optSelect).append(opt);
        });

        arr.forEach(bonus => {
            let opt = `<option value="${bonus}">${bonus}</option>`;
            $(optSelect).append(opt);
        });
    }

    function fillBonusLists(li) {
        debug("fillBonusLists: ", $(li));
        let optList = getWeapArray(li);
        let itemId = $(li).attr("data-id");
        let uuid = $(li).attr("id");
        if (!uuid || uuid == 'none') return log("Bad ID: ", uuid, itemId);

        let entry = findWeapEntryById(optList, parseInt(itemId));
        debug("Weapon entry: ", entry);

        if (!entry) {
            return log("Error: no entry found for ID ", itemId);
        }

        let applicableBonusus = bonusByType[entry.type];
        applicableBonusus.sort();

        let b1 = $(li).find(".weap-bonus1");
        //let b2 = $(li).find(".weap-bonus2");

        fillBonusList(b1, applicableBonusus);
        //fillBonusList(b2, applicableBonusus);
    }

    function handleCatChange(e) {
        debug("[handleCatChange]: ", weaponListsValid);

        let selected = $(this).val();
        let optList = weapons.primaries;
        let optSelect = $(this).parent().find(".weap-name");
        if (selected == 'Secondary') optList = weapons.secondaries;
        if (selected == 'Melee') optList = weapons.melees;

        debug("[handleCatChange] optList: ", optList);
        fillWeapsList($(optSelect), optList);
        $(optSelect).prop('disabled', false);

        setWatchesDirty();
    }

    function handleNameChange(e) {
        let itemId = $(this).val();
        let li = $(this).closest("li");
        let uuid = $(li).attr("id");
        $(li).attr("data-id", itemId);

        addLiTooltips(uuid);

        let b1 = $(this).next();
        //let b2 = $(b1).next();
        debug("handleNameChange: ", $(this), $(this).next(), $(b1)); //, $(b2));

        fillBonusLists($(this).parent());

        $(this).parent().find(".weap-bonus1").prop('disabled', false);
        //$(this).parent().find(".weap-bonus2").prop('disabled', false);
        setWatchesDirty();
    }

    function handleBonus1Change(e) {
        setWatchesDirty();
    }

    //function handleBonus2Change(e) {
    //    setWatchesDirty();
    //}

    // ====================== UI installation/watch list handling ==================================

    function getAddWatchLi(itemId, uuid) {
        if (!uuid) uuid = new Date().getTime();
        let li = `<li id="${uuid}" data-uuid="${uuid}" data-id="${itemId}">
                       <input type="checkbox" class="xww-disable-cb xww-opts-nh" name="xww-disable">

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

                      <!-- select name="weap-bonus2" class="weap-bonus2" disabled>
                          <option value="default">-- any --</option>
                      </select -->

                      <div class="xicons">

                          <span id="item-cnt">?</span>

                          <span class="xlink-icon-svg">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10.33">
                                  <defs><style>.cls-1{opacity:0.35;}.cls-2{fill:#fff;}.cls-3{fill:#777;}</style></defs>
                                  <g id="Слой_2" data-name="Слой 2"><g id="icons">
                                          <g class="cls-1"><path class="cls-2" d="M10,5.67a2,2,0,0,1-4,0,1.61,1.61,0,0,1,0-.39A1.24,1.24,0,0,0,7.64,3.7a2.19,2.19,0,0,1,.36,0A2,2,0,0,1,10,5.67ZM8,1C3,1,0,5.37,0,5.37s3.22,5,8,5c5.16,0,8-5,8-5S13.14,1,8,1ZM8,9a3.34,3.34,0,1,1,3.33-3.33A3.33,3.33,0,0,1,8,9Z"></path></g>
                                          <path class="cls-3" d="M10,4.67a2,2,0,0,1-4,0,1.61,1.61,0,0,1,0-.39A1.24,1.24,0,0,0,7.64,2.7a2.19,2.19,0,0,1,.36,0A2,2,0,0,1,10,4.67ZM8,0C3,0,0,4.37,0,4.37s3.22,5,8,5c5.16,0,8-5,8-5S13.14,0,8,0ZM8,8a3.34,3.34,0,1,1,3.33-3.33A3.33,3.33,0,0,1,8,8Z"></path>
                                  </g></g>
                              </svg>
                          </span>

                          <span class='wai-btn-wrap'><button class="option-delete xwai-btn"></button></span>
                      </div>

                      <div class="watch-parent watch4" style="position: absolute; left: 93%; display:none;">
                          <span class="x-round-btn x-watch-remove" style="width: 20px;">X</span>
                      </div>
                  </li>`;

        setWatchesDirty();
        return li;
    }

    function isEnabled(li) {
        let cb = $(li).find(".xww-disable-cb");
        if (!$(cb).length) {
            log("Error: cb not found! ", $(li), $(cb));
            debugger;
            return false;
        }

        log("isChecked? ", $(cb).prop('checked'), " enabled? ", ($(cb).prop('checked') == false));
        return ($(cb).prop('checked') == false);
    }

    function setEnabled(li, val=true) {
        log("[setEnabled] ", $(li), val);
        let cb = $(li).find(".xww-disable-cb");
        if (!$(cb).length) {
            log("Error: cb not found! ", $(li), $(cb));
            debugger;
            return false;
        }

        let ck = (val == true) ? false : true;
        $(cb).prop('checked', ck);
        log("isChecked? ", $(li), $(cb), $(cb).prop('checked'), " enabled? ", ($(cb).prop('checked') == false));
    }

    function addLiTooltips(id) {
        // LI tooltips
        displayHtmlToolTip($(`#${id} .xwai-btn`), "Remove this watch", "tooltip4");
        displayHtmlToolTip($(`#${id} .xww-disable-cb`), "Disable this watch", "tooltip4");
        displayHtmlToolTip($(`#${id} .xlink-icon-svg`), "View matching items", "tooltip4");
    }

    function handleDisableWatch(e) {
        log("[handleDisableWatch]: ", $(this), $(this).parent());
        let li = $(this).parent();
        log("li: ", $(li));
        log("isEnabled? ", isEnabled(li));
        setWatchesDirty();
        saveWatches();
    }

    // **** REMOVE SAVED LISTS!!!!!!!!!
    function handleRemoveWatch(e) {
        log("[handleRemoveWatch]: ", $(this), $(this).closest("li"));
        let li = $(this).closest("li");
        let uuid = $(li).attr("data-uuid");

        log("li: ", $(li), " uuid: ", uuid);
        $(li).remove();

        let list = makeListKeys(uuid);
        let keys = Object.keys(list);
        log("Key list: ", list);
        for (let idx=0; idx<keys.length; idx++) {
            log("list[keys[idx]]: ", list[keys[idx]]);
            GM_deleteValue(list[keys[idx]]);
        }

        setWatchesDirty();
        saveWatches();
    }

    // Go to search page with results
    function handleViewMatches(e) {
        debug("[handleViewMatches]: ", $(this), $(this).closest("li"));
        let li = $(this).closest("li");
        let itemId = $(li).attr('data-id');
        let cat = catFromLi(li);
        let arr = getWeapArray(li);
        let uuid = $(li).attr("data-uuid");
        debug("[handleViewMatches] uuid: ", uuid, " li: ", $(li));

        // This would be entry in weapon array!
        let entry = findWeapEntryById(arr, itemId);
        if (!entry || !entry.name) {
            log("Error: entry not found! ", itemId);
            debugger;
            return;
        }

        let name = entry.name.trim();
        let bonus1 = bonus1FromLi(li);
        let bonusId = bonusIds[bonus1];
        let htmlName = entry.name.trim().replaceAll(' ', '%20');
        let bonusMod = `bonuses[0]=${bonusId}`;

        //let useBonus = entry.bonus1.trim(); //.replaceAll(' ', '%20');
        let useBonus = bonus1.trim();
        if (commonEntries.includes(bonus1)) {
            let parts = bonus1.split(' ');
            useBonus = parts[0];
           switch(useBonus) {
               case 'Yellow': bonusMod = 'rarity=1'; break;
               case 'Orange': bonusMod = 'rarity=2'; break;
               case 'Red': bonusMod = 'rarity=3'; break;
               default: log("Not handling common bonus ", bonus1, useBonus); break;
           }
        }

        log("[handleViewMatches] bonusId: ", bonusId, " useBonus: ", useBonus, " mod: ", bonusMod);

        let fromPage = pageTitle().replaceAll(' ', '%20');
        let searchStr =
            `&itemID=${itemId}&itemName=${htmlName}&itemType=${cat}` +
            `&sortField=price&sortOrder=ASC&${bonusMod}&from=tww&uuid=${uuid}&pageid=${myId}&pageTitle=${fromPage}`;
        log("Search: ", searchStr);

        let URL = baseUrl + searchHash + searchStr;
        if (confirm("Weapon Watch: Opening new tab.\nmyId: " + myId + " page: " + pageTitle() + "\n\nBreak in debugger?")) {
            debugger;
        }
        openInNewTab(URL);
    }

    function putWatchOnList(li, entry) {
        let uuid = $(li).attr("data-uuid");
        if (!uuid) uuid = (entry && entry.uuid) ? entry.uuid : (new Date().getTime());
        if (entry && !entry.uuid) entry.uuid = uuid;
        $(li).attr('data-uuid', uuid);
        $("#xw-watches").append(li);

        return $('#xw-watches li').last();
    }

    function addWeaponWatch(e) {
        debug("[addWeaponWatch]");
        const tempId = "temp-id";    // must be replaced later
        if ($(`#${tempId}`).length > 0) return log("ERROR: [addWeaponWatch] last key not finalized");

        let li = getAddWatchLi(tempId);
        //$("#xw-watches").append(li);
        li = putWatchOnList(li);

        $(li).find(".weap-cat").on('change', handleCatChange);
        $(li).find(".weap-name").on('change', handleNameChange);
        $(".weap-bonus1").on('change', handleBonus1Change);
        //$(".weap-bonus2").on('change', handleBonus2Change);

        $(li).find(".xww-disable-cb").on('change', handleDisableWatch);
        $(li).find(".option-delete").on('click', handleRemoveWatch);
        $(li).find("xlink-icon-svg").on('click', handleViewMatches);

        $(li).find(`.weap-cat`).trigger('change');
        $(li).find(`.weap-name`).trigger('change');

        // Manual addition: resize
        if (e) { // handleMainBtnClick(e, forceResize)
            handleMainBtnClick(null, true);
        }
    }

    function buildWatchList() {
        let watchList = [];
        let watches = $("#xw-watches > li");
        for (let idx=0; idx<$(watches).length; idx++) {
            let li = $(watches)[idx];
            let itemId = $(li).attr('data-id');
            let uuid = $(li).attr('data-uuid');
            let enabled = isEnabled(li);
            let name = $(li).find('.weap-name').val();
            let cat = $(li).find('.weap-cat').val();
            let arr = getWeapArray(li);

            let weapEntry = findWeapEntryById(arr, itemId);
            if (!weapEntry) continue;
            let itemName = weapEntry.name.trim();

            let entry = {id: $(li).attr('id'),
                         itemId: itemId,
                         uuid: uuid,
                         enabled: enabled,
                         cat: $(li).find('.weap-cat').val(),
                         name: name,
                         itemName: itemName,
                         bonus1: $(li).find('.weap-bonus1').val()};
                         //bonus2: $(li).find('.weap-bonus2').val()};

            debug("[buildWatchList] *** entry: ", entry);
            watchList.push(entry);
        }

        return watchList;
    }

    // remove uuid-base-list, -new-list, etc for items no longer in the list!
    function pruneSavedWatchKeys() {
        let tmp = GM_listValues();
        let valList = tmp.filter( entry => {
            return entry.indexOf('-list') > -1;
        });

        let uuidList = [];
        watchList.forEach(entry => { uuidList.push(entry.uuid); });

        // Both are arrays
        log("[pruneSavedWatchKeys] keys: ", valList);
        log("[pruneSavedWatchKeys] uuids: ", uuidList);

        let orphans = valList.filter( entry => {
            let uuid = entry.split('-')[0];
            return !uuidList.includes(uuid);
        });

        log("[pruneSavedWatchKeys] orphans: ", orphans);

        orphans.forEach(key => {GM_deleteValue(key);});

        tmp = GM_listValues();
        log("[pruneSavedWatchKeys] after: ", tmp);

    }

    function loadSavedWatches() {
        log("[loadSavedWatches]");
        let allOff = $("#x-disable-all").prop('checked');
        let savedWatches = JSON.parse(GM_getValue("savedWatches", JSON.stringify([])));
        if (!savedWatches.length) return log("No saved watches");

        $("#xw-watches").empty();
        savedWatches.forEach(entry => {
            debug("Adding saved entry ", entry);
            debug("entry uuid: ", entry.uuid);
            let li = getAddWatchLi(entry.id, entry.uuid);
            //$("#xw-watches").append(li);
            putWatchOnList(li, entry);

            if (allOff == true) {
                entry.enabled = false;
            }

            debug("Enabled? ", entry.enabled, (entry.enabled == false), (entry.enabled && entry.enabled == false));
            if (entry.enabled == false) {
                debug("Setting li to disabled");
                setEnabled(li, false);
            }

            $(`#${entry.id} .weap-cat`).on('change', handleCatChange);
            $(`#${entry.id} .weap-name`).on('change', handleNameChange);
            $(`#${entry.id} .weap-bonus1`).on('change', handleBonus1Change);
            //$(`#${entry.id} .weap-bonus2`).on('change', handleBonus2Change);

            $(`#${entry.id} .xww-disable-cb`).on('change', handleDisableWatch);
            $(`#${entry.id} .option-delete`).on('click', handleRemoveWatch);
            $(`#${entry.id} .xlink-icon-svg`).on('click', handleViewMatches);

            $(`#${entry.id} .weap-cat`).val(entry.cat);
            $(`#${entry.id} .weap-cat`).trigger('change');
            $(`#${entry.id} .weap-name`).val(entry.name);
            $(`#${entry.id} .weap-name`).trigger('change');
            $(`#${entry.id} .weap-bonus1`).val(entry.bonus1);
            //$(`#${entry.id} .weap-bonus2`).val(entry.bonus2);

            // LI tooltips
            addLiTooltips(entry.id);
        });
    }

    function saveWatches() {
        log("[saveWatches]");
        if (document.visibilityState === 'visible' && document.hasFocus() && isBuy()) {
            let savedWatches = JSON.parse(JSON.stringify(buildWatchList()));
            log("[saveWatches], saving: ", savedWatches);
            GM_setValue("savedWatches", JSON.stringify(savedWatches));
        }
    }

    function handleSaveWatches(e) {
        saveWatches();
        channel.postMessage({ type: "watches-saved", myId: myId });
        refreshWatchLists();
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
                                  <span class="w-disable-all">
                                      <input id='x-disable-all' type="checkbox" class="xww-disable-cb xww-opts-nh" name="xww-all-disable">
                                      <span class="w-disable-all">Disable all</span>
                                  </span>
                                  <div class="xwwstitle xww-inner-hdr">Weapon Watch Items</div>
                                  <span class="xrt-btn btn">
                                      <input id="xww-add-watch" type="submit" class="xedx-torn-btn-raw" value="+">
                                      <input id="xww-refresh-watch" type="submit" class="xedx-torn-btn-raw" value="R">
                                      <input id="xww-save-watch" type="submit" class="xedx-torn-btn-raw" value="S">
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
        displayHtmlToolTip($("#xww-add-watch"), "Add a new weapon to watch", "tooltip4");

        $("#xww-refresh-watch").on('click', refreshWatchLists);
        displayHtmlToolTip($("#xww-refresh-watch"), `Refresh - Last Update:<br>${tm_str(lastUpdate)}`, "tooltip4");

        $("#xww-save-watch").on('click', handleSaveWatches);
        displayHtmlToolTip($("#xww-save-watch"), "Save this list", "tooltip4");

        //$("#x-disable-all").change(disableWatchList);
        displayHtmlToolTip($("#x-disable-all"), "Check to disable all watches<br>(no API calls)", "tooltip4");

        loadSavedWatches();

        // Only do this if there aren't any saved watches...
        if (!$("#xw-watches > li").length)
            addWeaponWatch();

        // Notify done editing/initializing watches
        processWatchListComplete();
    }

    const getMainBtnDiv = function () {return `<div id="x-weapon-watch-btn"><span>Weapon Watch</span></div>`;}

    function installUi(retries = 0) {
        let page = 'unknown';
        if (location.hash.indexOf("market/view") > -1) page = 'buy';
        else if (location.hash.indexOf("addListing") > -1) page = 'sell';
        else if (location.hash.indexOf("viewListing") > -1) page = 'view';
        else {
            return log("not on a known page. ", location.hash);
        }

        log("[installUI]: ", page, "|", $("#x-weapon-watch-btn").length);

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
                log("Error: fix this! Install on sell page!");
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

            // Temp way to trigger debug function
            $("#x-weapon-watch-btn").on('contextmenu', handleMainBtnContext);

            // Not sure I should do this...
            $(document).on("visibilitychange", function() {
                if (document.visibilityState === "hidden") {
                    saveWatches();
                }
            });
        }

    }

    // ======================== The watcher, does API calls =========================

    // Array of entries:
    // { id: <itemId>, cat: <primary/secondary/melee>, name: <name>, bonus1: <bonus1>, bonus2: <bonus2> }
    var watchList = [];

    // Hook called when UI initialization is complete, used for dev/debugging
    function processWatchListComplete() {
        refreshWatchLists();
    }

    // This tries to ensure only one instance checks for updates at a time.
    // Now that we have a broadcast channel, leverage that?
    var hearbeatTimer = null;
    function checkStartTimer(retries=0) {
        if (!hearbeatTimer)  // Continuously check every 10 secs if one other inst goes away
            hearbeatTimer = setInterval(checkStartTimer, 10000);

        // Write heartbeat every 5 secs, check if over 10
        // Make 2 checks if > 5 and < 10
        let now = new Date().getTime();
        let heartbeat = parseInt(GM_getValue('heartbeat', 0));
        let diff = now - heartbeat;
        log("heartbeat check: ", now, heartbeat, diff);
        if (diff < 0) return log("heartbeat < 0");  // Prob never happen
        if (diff < 5000) return log("heartbeat within 5 secs");
        if (diff < 10000) return log("heartbeat within 10 secs");  // Should never happen

        // Start ourselves running
        clearInterval(hearbeatTimer);
        log("Starting heartbeat");

        channel.postMessage({ type: "refresh-started", myId: myId, timestamp: (new Date().getTime()) });

        hearbeatTimer = setInterval(doHeartbeat, 4000);
        refreshTimer = setInterval(refreshWatchLists, 5 * 60 * 1000);

        refreshWatchLists();

        function doHeartbeat() {
            GM_setValue('heartbeat', (new Date().getTime()));
        }
    }


    // ==================== Broadcast channel msg handler ============================

    var doAlertTimer;

    function handleBroadcasts(e) {
        log(sm_tm_str(), " [handleBroadcasts] received: ", e.data.type, " from: ", e.data.myId, " my ID: ", myId);

        switch (e.data.type) {
            case "lock-query": {
                log("[handleBroadcasts] me: ", notifyLock);
                log("[handleBroadcasts] them: ", e.data);
                notifyLock.type = 'lock-response';
                channel.postMessage(notifyLock);
                break;
            }
            case "lock-response": {
                log("[handleBroadcasts] me: ", notifyLock);
                log("[handleBroadcasts] them: ", e.data);

                if (e.data.locked == true && e.data.lockedFor == notifyLock.lockedFor) {

                    // Validate their unlock time
                    let now = new Date().getTime();
                    if (+now > +e.data.unlockTime) {
                        log("**** Error remote should be unlocked! ****");
                        log("now: ", new Date().toString(), " expired: ", new Date(e.data.unlockTime).toString());
                    }
                    notifyLock.locked = false;
                    notifyLock.remoteLocked = true;
                    notifyLock.owner = e.data.owner;
                    notifyLock.unlockTime = e.data.unlockTime;
                    clearTimeout(doAlertTimer);
                    doAlertTimer = null;
                    log("[handleBroadcasts] locked by ", e.data.owner, " until ", (new Date(e.data.unlockTime).toString()));
                }
                break;
            }
            case "watches-refresh": {  // Doing API lookup
                log("[handleBroadcasts] watches-refresh: ", e.data);
                break;
            }
            case "watches-saved": {
                log("[handleBroadcasts] watches-saved: ", e.data);
                //loadSavedWatches();
                break;
            }
            case "refresh-started":{
                log("[handleBroadcasts] refresh-started: ", e.data);
                break;
            }
            case "notify-click": {
                log("[handleBroadcasts] notify-click: ", e.data);
                inNotifyClick = true;
                setTimeout(function() {inNotifyClick = false;}, 2000);
                break;
            }

            default: {
                log("[handleBroadcasts] ignored: ", e.data);
                break;
            }
        }

    }

    // ========================== Browser Notifications ==============================

    var inNotifyClick = false;
    function handleNotifyClick(context) {
        //context.preventDefault();
        log("Notification clicked, visibility: ", document.visibilityState, " inNotifyClick: ", inNotifyClick,
            "\ncontext: ", context, "\nurl: ", context.url);

        context.preventDefault();
        if (inNotifyClick == true) return;
        inNotifyClick = true;
        setTimeout(function() {inNotifyClick = false;}, 500);

        if (document.visibilityState === 'visible') {
            let msg = "Weapon Watch: Opening new tab.\nmyId: " + myId + " page: " + pageTitle();
            alertWithTimeout(msg, 60);
            //if (confirm("Weapon Watch: Opening new tab.\nmyId: " + myId + " page: " + pageTitle() + "\n\nBreak in debugger?")) {
            //    debugger;
            //}
            channel.postMessage({ type: "notify-click", myId: myId });
            openInNewTab(context.url);
            return false;
        }

    }

    function getSearchUrlByEntry(entry) {
        //let entry = context.entry;
        let bonus1 = entry.bonus1;
        let bonusId = bonusIds[bonus1];
        let htmlName = entry.itemName.replaceAll(' ', '%20');
        let bonusMod = `bonuses[0]=${bonusId}`;

        if (commonEntries.includes(bonus1)) {
            let parts = bonus1.split(' ');
            switch(parts[0]) {
               case 'Yellow': bonusMod = 'rarity=1'; break;
               case 'Orange': bonusMod = 'rarity=2'; break;
               case 'Red': bonusMod = 'rarity=3'; break;
               default: log("Not handling common bonus ", bonus1); break;
           }
        }

        let fromPage = pageTitle().replaceAll(' ', '%20');
        let searchStr = `&itemID=${entry.itemId}&itemName=${htmlName}&itemType=${entry.cat}` +
            `&sortField=price&sortOrder=ASC&${bonusMod}&from=tww&uuid=${entry.uuid}&pageid=${myId}&pageTitle=${fromPage}`;
        log("Search: ", searchStr);

        let URL = baseUrl + searchHash + searchStr;
        //openInNewTab(URL);
        return URL;
    }

    function doBrowserAlert(msg, entry) {
        log("[doBrowserAlert] lock: ", notifyLock, " timer: ", doAlertTimer, " test: ", isTestPage);
        log("[doBrowserAlert]\n", msg, "\n", entry);

        if (isTestPage == true) return;

        // If anyone has sent a notification, cannot send until unlocked
        // This checks if I hold the lock or am waiting to send...
        if (notifyLock.locked == true || doAlertTimer) {
            log("Locked, ignoring: ", notifyLock.locked, " timer: ", doAlertTimer);
            return;
        }

        // Ask if any other instances locked as well. Wait for say 5 secs for an answer.
        // If no 'locked' responses, go ahead.
        notifyLock.type = 'lock-query';
        notifyLock.locked = 'waiting';
        notifyLock.page = pageTitle();
        notifyLock.remoteLocked = false;   // Set on positive response
        notifyLock.lockedFor = entry.uuid;
        log(sm_tm_str(), " [handleBroadcasts] post broadcast: ", notifyLock);
        channel.postMessage(notifyLock);

        // Will do notification when this pops, if not cancelled
        // or our notifyLock is changed
        log("[handleBroadcasts] setting doAlertTimer");
        doAlertTimer = setTimeout(realBrowserAlert, 10000, msg, entry);
        return;

        function realBrowserAlert(msg, entry) {
            log(sm_tm_str(), " [realBrowserAlert] Timer Popped! ");
            log("[realBrowserAlert]  notifyLock.remoteLocked: ", notifyLock.remoteLocked);
            log("[realBrowserAlert]  notifyLock: ", notifyLock);
            if (notifyLock.remoteLocked == true || notifyLock.locked == true) return;

            let lockDelay = (+notifyIntervalSecs + getRandomIntEx(5, 15)) * 1000;
            notifyLock.locked = true;
            notifyLock.lockedFor = entry.uuid;
            notifyLock.lockTime = new Date().getTime();
            notifyLock.unlockTime = new Date().getTime() + lockDelay;
            notifyLock.owner = myId;
            doAlertTimer = null;
            setTimeout(resetLock, lockDelay);

            let timeout = +notifyDurationSecs * 1000;
            setTimeout(function() {
                log(sm_tm_str(),
                    " [realBrowserAlert] timeout timer popped for item:\n", entry.itemName,
                    "\nuuid: ", notifyLock.lockedFor,
                    "\nlock: ", notifyLock);
            }, timeout);

            log(sm_tm_str(), " [realBrowserAlert] timeout: ", (timeout/1000), " seconds");
            log(sm_tm_str(), " [realBrowserAlert] resetLock: ", (lockDelay/1000), " seconds");

            let url = getSearchUrlByEntry(entry);

            //msg = msg + " (" + myId + ")";

            let title = sm_tm_str() + " - Weapon Watch Alert";
            //if (devMode == true)
            //    title = title + " (" + myId + ")";

            let opts = {
                title: title,
                text: msg,
                tag: entry.uuid,      // Prevent multiple msgs if it sneaks by my checks.
                image: 'https://imgur.com/QgEtwu3.png',
                timeout: notifyDurationSecs * 1000,
                entry: entry,
                url: url,
                onclick: (context) => {
                    log(sm_tm_str(), " [realBrowserAlert] notification clicked: ", entry, notifyLock);
                    handleNotifyClick(context);
                }, ondone: () => {
                    log(sm_tm_str(), " [realBrowserAlert] notification done: ", entry, notifyLock);
                    //setTimeout(notifyReset, mwItemCheckInterval*1000);
                }
            };

            let notfCount = GM_getValue("notfCount", 0);
            GM_setValue("notfCount", (+notfCount + 1));

            log("**** broadcasts OK, realBrowserAlert notifying! ", sm_tm_str(), " myId: ", myId);
            log("Can notify again at: ", (new Date(notifyLock.unlockTime).toString()));

            GM_notification ( opts );
        }

        function resetLock() {
            log(sm_tm_str(), " [resetLock] Unlocking! ", notifyLock);
            notifyLock.locked = false;
            notifyLock.remoteLocked = false;
            notifyLock.lockedFor = 0;
            notifyLock.owner = '';
            notifyLock.unlockTime = 0;
            log(sm_tm_str(), " [resetLock] Unlocked: ", notifyLock);
        }
    }

     // ================ Custom alert support ============================

    var alertStylesAdded = false;

    function dontShowAgain() {
        return GM_getValue("xalert-checked", false);
    }

    async function alertEx(mainMsg, cbMsg, btnMsg) {
        if (!alertStylesAdded || !$("#xalert").length)
            addAlertSupport();

        $("#xalert .mainMsg").text(mainMsg);
        if (cbMsg)  $("#xalert label").text(cbMsg);
        if (btnMsg) $("#xalert button").text(btnMsg);

        let rc = await openModalAlert();
        log("openModal rc: ", rc);
        return rc;

        // Local support functions

        async function openModalAlert() {
            $("#xalert").css("display", "block");

            return new Promise(resolve => {
                const okButton = document.getElementById("xalert-ok-btn");
                okButton.addEventListener("click", (e) => {resolve(handleClicks(e));});
                //const cnclButton = document.getElementById("xalert-cncl-btn");
                //cnclButton.addEventListener("click", (e) => {resolve(handleClicks(e));});


                $("#xalert-cncl-btn").on('click', function (e) {$("#xalert").remove();});
                $("#xalert-ok-btn").on('click', function (e) {$("#xalert").remove();});
            });

            function handleClicks(e) {
                let target = $(e.currentTarget);
                const checked = $("#xalert-cb")[0].checked;
                GM_setValue("xalert-checked", checked);
                $("#xalert").css("display", "none");
                let rc = $(target).attr("id") == "xalert-ok-btn" ? true : false;
                logt("handleClick, rc: ", rc);
                return rc;
            }
        }

        function addAlertSupport() {
            if (!alertStylesAdded && !$("#xalert").length) {
                GM_addStyle(`
                    #xalert {
                        display: none;
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        width: 300px;
                        height: 150px;
                        transform: translate(-50%, -50%);
                        background-color: var(--default-white-color);
                        padding: 20px 20px 0px 20px;
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
                        color: var(--default-black-color);
                        font-size: 14px;
                        font-family: arial;
                        z-index: 9999999;
                    }
                    #xalert button {
                        margin: 10px 25px 10px 25px;
                    }
                    .cb-wrap {
                        position: absolute;
                        /* bottom: 10%; */
                        top: 10%;
                        left: 50%;
                        transform: translate(-50%);
                        width: 100%;
                        justify-content: center;
                        display: flex;
                        flex-flow: column wrap;
                    }
                    .cb-wrap label {
                        padding: 2px 0px 0px 20px;
                    }
                    #xalert input {
                        margin-right: 10px;
                    }
                    .mainMsg {
                        padding: 20px 0px 20px 0px;
                        font-size: 16px;
                    }
                    .alert-content {
                        position: relative;
                        display: flex;
                        flex-flow: column wrap;
                        align-content: center;
                        height: 100%;
                    }
                    .xbtn-wrap {
                        display: flex;
                        flex-flow: row wrap;
                        justify-content: center;
                        position: absolute;
                        bottom: 10%;
                        left: 50%;
                        transform: translate(-50%);
                    }
                `);
                alertStylesAdded = true;
            }

            let newDiv = `
                <div id="xalert">
                    <div class="alert-content">
                        <p class='mainMsg'></p>

                        <!-- span class="xbtn-wrap">
                            <button id="xalert-cncl-btn" class="xedx-torn-btn" data-ret="false">Later</button>
                            <button id="xalert-ok-btn" class="xedx-torn-btn" data-ret="true">OK</button>
                        </span -->

                        <div class="cb-wrap">
                            <label for="xnoshow-item">
                                <input type="checkbox" id="xnoshow-item" > Do not alert for these items again.
                            </label>

                            <label for="xnoshow-view">
                                <input type="checkbox" id="xnoshow-view"> Always stop alerts after viewing.
                            </label>

                            <label for="xnoshow-dlg">
                                <input type="checkbox" id="xnoshow-dlg"> Do not show this dialog again.
                            </label>
                        </div>

                        <span class="xbtn-wrap">
                            <!-- button id="xalert-cncl-btn" class="xedx-torn-btn" data-ret="false">Later</button -->
                            <button id="xalert-ok-btn" class="xedx-torn-btn" data-ret="true">OK</button>
                        </span>

                    </div>
                </div>
            `;

            $("body").append(newDiv);
        }
    }

    // ============================= API calls =======================================

    function makeListKeys(uuid) {
        return { base: `${uuid}-base-list`, curr: `${uuid}-curr-list`, new: `${uuid}-new-list` };
    }

    function parseResultDiffs(entry) {
        log("[parseResultDiffs]");
        let keys = makeListKeys(entry.uuid);
        let baseListKey = keys.base;
        let currListKey = keys.curr;
        let newListKey = keys.new;

        let baseListings = JSON.parse(GM_getValue(baseListKey, JSON.stringify([])));
        let currListings = JSON.parse(GM_getValue(currListKey, JSON.stringify([])));

        let result = findUniqueStrings(baseListings, currListings);
        let gone = result.inFirstOnly;
        let newListings = result.inSecondOnly;
        let numNewListings = newListings.length;

        log(numNewListings, " new listings for ", entry.itemName, " uuid ", entry.uuid, ": ", newListings);
        log("Expired listings: ", gone);

        // =============== Attempt to notify ================================

        if (numNewListings > 0) {
            GM_setValue(newListKey, JSON.stringify(newListings));
            let msg = "There " + (parseInt(numNewListings) == 1 ? "is " : "are ") + numNewListings + " new " +
                entry.itemName + ":  " + entry.bonus1 + " in the Item Market!\n\n" +
                "Click here to view or 'Close' to dismiss.";
            if (devMode == true)
                msg =  numNewListings + " new " +
                entry.itemName + " | " +  entry.uuid + " | " + pageTitle() + " | " + myId;

            doBrowserAlert(msg, entry);
        } else {
            GM_setValue(newListKey, JSON.stringify([]));
        }

        return newListings;
    }

    function refreshWatchLists() {
        log("[refreshWatchLists]");

        if (watchesDirty == true || !watchList.length && $("#xw-watches").length) {
            log("[refreshWatchLists] dirty: ", watchesDirty, " len: ", watchList.length);
            watchList = JSON.parse(JSON.stringify(buildWatchList()));
            log("[refreshWatchLists] watchList: ", watchList);
        }

        if (!watchList.length) {
            log("Loading saved version");
            watchList = JSON.parse(GM_getValue('savedWatches', JSON.stringify([])));
        }

        log("[refreshWatchLists] watchList: ", watchList);

        if (!watchList.length) {
            log("No active watches!");
            return;
        }

        setWatchesDirty(false);

        // Call the market API to get list of matching items on the market.
        // https://api.torn.com/v2/market/399/itemmarket?bonus=Red&offset=0'
        watchList.forEach(entry => {
            doEntryLookup(entry);
        });

        pruneSavedWatchKeys();

        lastUpdate = new Date().getTime();
        GM_setValue("lastUpdate", lastUpdate);

        if ($('#xww-refresh-watch').is(':ui-tooltip')) {
            $("#xww-refresh-watch").tooltip("option", "content", `Refresh - Last Update:<br>${tm_str(lastUpdate)}`);
        }

        function processLookupResult(response, status, xhr, entry) {
            log("[processLookupResult] status: ", (response && response.error) ? "error" : status,
                "\nResponse: ", response);
            if (status == 'success' || (response && response.error)) {
                if (response.error) {
                    log("Error: ", response.error.error);
                    return;
                }
                let item = response.itemmarket.item;
                let listings = response.itemmarket.listings;
                let id = item.id;

                let uuid = entry.uuid;
                let node = $(`#${uuid} #item-cnt`);
                $(node).text(listings.length);

                let count = 0;
                let keys = makeListKeys(uuid);
                let baseListKey = keys.base; //`${uuid}-base-list`;
                let currListKey = keys.curr; //`${uuid}-curr-list`;
                let baseListings = JSON.parse(GM_getValue(baseListKey, JSON.stringify([])));
                let currListings = [];
                listings.forEach(listing => {
                    let uid = listing.item_details.uid;
                    currListings.push(uid);
                });
                log("Curr listings for ", uuid, " item ID ", item.id, ": ", currListings);
                log("Base listings: ", baseListings);

                entry.newListings = {};
                if (baseListings.length == 0) {
                    GM_setValue(baseListKey, JSON.stringify(currListings));
                } else {
                    GM_setValue(currListKey, JSON.stringify(currListings));
                    let newListings = parseResultDiffs(entry);
                    if (newListings && newListings.length) {
                        listings.forEach(listing => {
                            let uid = listing.item_details.uid;
                            if (newListings.includes(uid)) {
                                entry.newListings[`${uid}`] = listing;
                            }
                        });
                    }
                    log("New listings: ", newListings);
                    log("entry: ", entry);
                }
            }
        }

        function doEntryLookup(entry) {
            let url;
            let itemId = entry.itemId;
            let li = $(`#${entry.id}`);
            let bonus =  $(li).find('.weap-bonus1 option:selected').text();
            let bonusId = bonusIds[bonus];
            let nameEscaped = entry.itemName.replaceAll(' ', '%20');

            // Not used here!
            //let searchStr = `&itemID=${itemId}&itemName=${nameEscaped}&itemType=${entry.cat}&sortField=price&sortOrder=ASC&bonuses[0]=${useBonus}&comment=WeaponWatch`;
            log("entry: ", entry);
            //log("Search: ", searchStr);

            let useBonus = entry.bonus1.trim(); //.replaceAll(' ', '%20');
            if (commonEntries.includes(entry.bonus1)) {
                log("Found bonus in common entries!");
                let parts = entry.bonus1.split(' ');
                useBonus = parts[0];
            }

            log("useBonus: ", useBonus);
            if (entry.bonus1 == 'Bonus filter off')
                url = `https://api.torn.com/v2/market/${itemId}/itemmarket?key=${api_key}&comment=${myId}-WWatch`;
            else
               url = `https://api.torn.com/v2/market/${itemId}/itemmarket?bonus=${useBonus}&key=${api_key}&comment=${myId}-WWatch`;

            channel.postMessage({type: "watches-refresh", myId: myId, itemId: entry.itemId, uuid: entry.uuid});

            log("[doEntryLookup]: ", url);

            $.ajax({
                url: url,
                type: 'GET',
                success: function (response, status, xhr) {
                    processLookupResult(response, status, xhr, entry);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    log("Error in doAjaxPost: ", textStatus, "\nThrown: ", errorThrown, "\nEntry: ", entry);
                }
            });
        }
    }

    // TBD - highlight new items
    function processCustomSearch(params) {

        alertEx();

        let uuid = params.get('uuid');
        log("[processCustomSearch] uuid: ", uuid);

        let res = makeListKeys(uuid);
        let newItems = JSON.parse(GM_getValue(res.new, JSON.stringify([])));

        log("[processCustomSearch] item uids: ", newItems);
    }

    // ========= Entry points, once executing - called once the page has loaded ===========

    function handlePageLoad(retries=0) {

        installUi();

        if (!refreshTimer) {
            checkStartTimer();
        }

    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    log("My ID: ", myId);

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    addStyles();

    if (location.hash) {
            let paramsString = location.hash.slice(1);
            log("Hash string: ", location.hash);
            log("paramsString: ", paramsString);
            let params = new URLSearchParams(paramsString);
            let from = params.get('from');
            if (from && from == 'tww') {
                callOnContentLoaded(processCustomSearch);
                return;
            }
        }

    validateApiKey();
    versionCheck();

    getWeaponLists();


    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);

    // ======================= CSS Styles =======================

    function addStyles() {

        addToolTipStyle();
        GM_addStyle(`
            .weap-cat { width: 130px; }
            .weap-name { width: 200px; }
            .weap-bonus1 { width: 130px; }

            .weap-bonus2 { width: 110px; /*margin-right: 20px;*/ }

            #xww-add-watch { font-size: 26px; }

            .xlink-icon-svg {
                width: 18px;
                height: 18px;
                margin-top: -4px;
                /* margin-left: 6px; */
                margin-right: 8px;
                cursor: pointer;
            }
            .xicons {
                display: flex;
                flex-flow: row wrap;
                width: 90px;
                /* justify-content: space-between; */
            }
            #item-cnt {
                min-width: 14px;
                height: 16px;
                margin-top: 8px;
                margin-right: 8px;
            }

            #xww-add-watch, #xww-save-watch, #xww-refresh-watch {
                width: 32px;
                padding: 0px 10px 0px 10px;
                margin-left: 5px;
            }
            #xww-save-watch {
                margin-right: 10px;
            }

            .w-disable-all {
                /* margin: 0px 10px 0px 15px; */
                align-content: center;
                display: flex;
                flex-flow: row wrap;
            }

            #x-disable-all { margin: 0px 10px 0px 15px;}

            .wai-btn-wrap {
                display: flex;
                flex-flow: row wrap;
                align-content: center;
                justify-content: flex-start;
                padding-right: 14px;
                margin-left: -10px;
            }
            .xwai-btn {
                background-position: left -136px;
                height: 28px !important;
                width: 28px !important;
                background: var(--items-options-icons);
                filter: var(--default-icon-filter);
                margin-top: -10px;
                cursor: pointer;
            }

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
                font-size: 18px;
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

            /*
            .xinner-list > li > span {
                font-size: 10pt;
                padding: 5px 0px 5px 0px;
            }
            */

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