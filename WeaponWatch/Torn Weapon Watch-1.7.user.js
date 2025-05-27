// ==UserScript==
// @name         Torn Weapon Watch
// @namespace    http://tampermonkey.net/
// @version      1.7
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

    const baseUrl = "https://www.torn.com/page.php?sid=ItemMarket";
    const searchHash = "#/market/view=search";
    
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

    const commonEntries = ["Bonus filter off", "Any bonuses", "Double bonuses", "Yellow bonuse", "Orange bonuse", "Red bonuse"];
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

    var weaponWatchRunning = false;

    const isBuy = function () {return location.hash.indexOf("market") > -1;}
    const isSell = function () {return location.hash.indexOf("addListing") > -1;}
    const isView = function () {return location.hash.indexOf("viewListing") > -1;}

    var weaponListsValid = false;
    var weapons = { primaries: [], secondaries: [], melees: [] };
    const weaponTypes = ["Primary", "Secondary", "Melee"];

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
            log("itemsQueryCB");
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

            log("Weapons: ", weaponListsValid, weapons);

            GM_setValue("weapons.primaries", JSON.stringify(weapons.primaries));
            GM_setValue("weapons.secondaries", JSON.stringify(weapons.secondaries));
            GM_setValue("weapons.melees", JSON.stringify(weapons.melees));
        }

        function doWeaponListLookup_v1() {
            xedx_TornTornQuery("", "items", itemsQueryCB);
        }

        log("[getWeaponLists] looking for cached lists");
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
                    log("Unknown type: ", type);
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

    function findEntryById(array, itemId) {
        return array.find(obj => obj && obj.hasOwnProperty('id') && obj.id === parseInt(itemId));
    }

    // ============== Fill Select Options lists ====================

    // If the watches change, flag as 'dirty'. Will need
    // to be re-read before checking for items...
    // If in the process of changing, the entries can be 'locked'
    // until complete.
    var watchesDirty = false;
    var watchesLocked = false;
    var watchLock = 0;

    function lockWatchList() {
        const unlockWatches = function () { watchLock = 0; watchesLocked = false; }
        clearTimeout(watchLock);
        watchesLocked = true;
        watchLock = setTimeout(unlockWatches, 5000);
    }

    function setWatchesDirty(dirty=true) {
        let wasDirty = watchesDirty;
        watchesDirty = dirty;
        if (dirty == false && wasDirty == true) saveWatches();
    }

    function catFromLi(li) {
         return $(li).find(".weap-cat").val();
    }

    function getWeapArray(li) {
        let optList = weapons.primaries;
        let selected = $(li).find(".weap-cat").val();
        if (selected == 'Secondary') optList = weapons.secondaries;
        if (selected == 'Melee') optList = weapons.melees;

        log("[getWeapArray] ", $(li), optList);

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
        let useArr = commonEntries.concat(arr);
        useArr.forEach(bonus => {
            let opt = `<option value="${bonus}">${bonus}</option>`;
            $(optSelect).append(opt);
        });
    }

    function fillBonusLists(li) {
        let optList = getWeapArray(li);
        let itemId = $(li).attr("id");
        itemId = itemId.replace("ww-", "");
        if (!itemId || itemId == 'none') return log("Bad ID: ", itemId);

        let entry = findEntryById(optList, parseInt(itemId));
        log("Weapon entry: ", entry);

        if (!entry) {
            return log("Error: no entry found for ID ", itemId);
        }

        let applicableBonusus = bonusByType[entry.type];
        applicableBonusus.sort((a, b) => {
                if (a.name < b.name) return -1;
                if (a.name > b.name) return 1;
                return 0;
            });

        let b1 = $(li).find(".weap-bonus1");
        //let b2 = $(li).find(".weap-bonus2");

        fillBonusList(b1, applicableBonusus);
        //fillBonusList(b2, applicableBonusus);
    }

    // When these fns are called, should stop updating until done...

    function handleCatChange(e) {
        log("[handleCatChange]: ", weaponListsValid);

        let selected = $(this).val();
        let optList = weapons.primaries;
        let optSelect = $(this).parent().find(".weap-name");
        if (selected == 'Secondary') optList = weapons.secondaries;
        if (selected == 'Melee') optList = weapons.melees;

        log("[handleCatChange] optList: ", optList);
        fillWeapsList($(optSelect), optList);
        $(optSelect).prop('disabled', false);

        setWatchesDirty();
    }

    function handleNameChange(e) {
        let itemId = $(this).val();
        let li = $(this).closest("li");
        $(li).attr("id", ("ww-" + itemId));           // This needs to be changed from "temp-id" so we can add more...
        $(li).attr("data-id", itemId);

        addLiTooltips(("ww-" + itemId));

        let b1 = $(this).next();
        //let b2 = $(b1).next();
        debug("handleNameChange: ", $(this), $(this).next(), $(b1)); //, $(b2));

        fillBonusLists($(this).parent());
        //fillBonusList($(this).parent().find(".weap-bonus1"));
        //fillBonusList($(this).parent().find(".weap-bonus2"));

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

    // When these fns are called, should stop updating until done...

    function getAddWatchLi(itemId) {
        let li = `<li id="${itemId}">
                       <input type="checkbox" class="xww-disable-cb xww-opts-nh" data-id="${itemId}" name="xww-disable">

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

    function handleRemoveWatch(e) {
        log("[handleRemoveWatch]: ", $(this), $(this).closest("li"));
        let li = $(this).closest("li");
        log("li: ", $(li));
        $(li).remove();

        setWatchesDirty();
        saveWatches();
    }

    // https://www.torn.com/page.php?sid=ItemMarket
    // #/market/view=search
    // &itemID=233&itemName=BT%20MP9&itemType=Secondary&sortField=price&sortOrder=ASC&bonuses[0]=41
    function handleViewMatches(e) {
        log("[handleViewMatches]: ", $(this), $(this).closest("li"));
        let li = $(this).closest("li");
        log("li: ", $(li));

        let itemId = $(li).attr('id').replace("ww-", "");
        let cat = catFromLi(li);
        let arr = getWeapArray(li);

        // This would be entry in weapon array!
        let entry = findEntryById(arr, itemId);
        log("Weapon entry: ", entry);
        if (!entry || !entry.name) {
            log("Error: entry not found! ", itemId);
            debugger;
            return;
        }

        let name = entry.name.trim();
        let bonusId = bonusIds[name];
        log("bonusIds: ", bonusIds);
        log("name: ", name, " bonus ID: ", bonusId);
        let htmlName = entry.name.trim().replaceAll(' ', '%20');
        log("Name: ", name, " html: ", htmlName);

        let searchStr = `&itemID=${itemId}&${htmlName}&itemType=${cat}&sortField=price&sortOrder=ASC&bonuses[0]=${bonusId}`;
        log("Search: ", searchStr);

        let URL = baseUrl + searchHash + searchStr;
        log("URL: ", URL);
        openInNewTab(URL);
    }

    function addWeaponWatch(e) {
        log("[addWeaponWatch]");
        const tempId = "temp-id";    // must be replaced later
        if ($(`#${tempId}`).length > 0) return log("ERROR: [addWeaponWatch] last key not finalized");

        let li = getAddWatchLi(tempId);
        $("#xw-watches").append(li);

        $(".weap-cat").on('change', handleCatChange);
        $(".weap-name").on('change', handleNameChange);
        $(".weap-bonus1").on('change', handleBonus1Change);
        //$(".weap-bonus2").on('change', handleBonus2Change);

        $(".xww-disable-cb").on('change', handleDisableWatch);
        $(".option-delete").on('click', handleRemoveWatch);

        // hmm .. weapon lists need to have been filled in by here!
        $(`#${tempId} .weap-cat`).trigger('change');
        $(`#${tempId} .weap-name`).trigger('change');

        //addLiTooltips(tempId);

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
            let itemId = $(li).attr('id').replace("ww-", "");
            let enabled = isEnabled(li);
            //let name = $(li).find('.weap-name option:selected').text();
            let name = $(li).find('.weap-name').val();

            let cat = $(li).find('.weap-cat').val();
            let arr = getWeapArray(li);

            // This would be entry in weapon array!
            let weapEntry = findEntryById(arr, itemId);
            let itemName = weapEntry.name.trim();

            let entry = {id: $(li).attr('id'),
                         enabled: enabled,
                         cat: $(li).find('.weap-cat').val(),
                         name: name,
                         itemName: itemName,
                         bonus1: $(li).find('.weap-bonus1').val()};
                         //bonus2: $(li).find('.weap-bonus2').val()};
            watchList.push(entry);
        }

        return watchList;
    }

    function loadSavedWatches() {
        let savedWatches = JSON.parse(GM_getValue("savedWatches", JSON.stringify([])));
        if (!savedWatches.length) return log("No saved watches");

        $("#xw-watches").empty();
        savedWatches.forEach(entry => {
            log("Adding saved entry ", entry);
            let li = getAddWatchLi(entry.id);
            $("#xw-watches").append(li);

            log("Enabled? ", entry.enabled, (entry.enabled == false), (entry.enabled && entry.enabled == false));
            if (entry.enabled == false) {
                log("Setting li to disabled");
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
        let savedWatches = JSON.parse(JSON.stringify(buildWatchList()));
        log("[saveWatches]: ", savedWatches);
        GM_setValue("savedWatches", JSON.stringify(savedWatches));
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
        displayHtmlToolTip($("#xww-refresh-watch"), "Refresh<br>(check for updates)", "tooltip4");

        $("#xww-save-watch").on('click', saveWatches);
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

            // Temp way to trigger debug function
            $("#x-weapon-watch-btn").on('contextmenu', handleMainBtnContext);

            $(document).on("visibilitychange", function() {
                if (document.visibilityState === "hidden") {
                    saveWatches();
                }
            });
        }

    }

    // ========================== The watcher, does API calls ============================

    // Array of entries:
    // { id: <itemId>, cat: <primary/secondary/melee>, name: <name>, bonus1: <bonus1>, bonus2: <bonus2> }
    var watchList = [];

    // Hook called when UI initialization is complete, used for dev/debugging
    function processWatchListComplete() {
        refreshWatchLists();
    }

    function refreshWatchLists() {
        if (watchesLocked == true) {
            log("[refreshWatchLists] locked!");
        }

        if (watchesDirty == true || !watchList.length) {
            log("[refreshWatchLists] dirty: ", watchesDirty, " len: ", watchList.length);
            watchList = JSON.parse(JSON.stringify(buildWatchList()));
            setWatchesDirty(false);
        }

        log("[refreshWatchLists] watchList: ", watchList);

        if (!watchList.length) {
            log("No active watches!");
            return;
        }

        // Call the market API to get list of matching items on the market.
        // https://api.torn.com/v2/market/399/itemmarket?bonus=Red&offset=0'
        watchList.forEach(entry => {
            doEntryLookup(entry);
        });

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

                log("item: ", item.name, item.id, " count: ", listings.length);
                log("Span: ", $(`#ww-${id} #item-cnt`));
                log("Sel: ", (`#ww-${id} #item-cnt`));
                $(`#ww-${id} #item-cnt`).text(listings.length);
            }
        }

        function doEntryLookup(entry) {
            let url;
            let itemId = entry.id.replace('ww-', '');
            let li = $(`#${entry.id}`);
            let bonus =  $(li).find('.weap-bonus1 option:selected').text();
            let bonusId = bonusIds[bonus];

            let searchStr = `&itemID=${itemId}&name=${entry.htmlName}&itemType=${entry.cat}&sortField=price&sortOrder=ASC&bonuses[0]=${bonusId}`;
            log("entry: ", entry);
            log("Search: ", searchStr);

            //let url = baseUrl + searchHash + searchStr;


            if (entry.bonus1 == 'Bonus filter off')
                url = `https://api.torn.com/v2/market/${itemId}/itemmarket?key=${api_key}`;
            else
               url = `https://api.torn.com/v2/market/${itemId}/itemmarket?bonus=${entry.bonus1}&key=${api_key}`;


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

    getWeaponLists();

    addStyles();

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

            .xlink-icon-svg {
                width: 18px;
                height: 18px;
                margin-top: -4px;
                margin-left: 6px;
                margin-right: 8px;
                cursor: pointer;
            }
            .xicons {
                display: flex;
                flex-flow: row wrap;
                /*width: 60px;*/
                justify-content: space-between;
            }
            #item-cnt {
                /*min-width: 32px;*/
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
                /*margin: 0px 10px 0px 15px;*/
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

    function archivedGetBonusIds() {
        let blist = $("div.filtersWrapper___pZ6sQ > div.dropdowns___QIaHL > div:nth-child(3) > div > div > ul > li");
        if (!$(blist).length) {
            log("Need to select weapon and bonus type!");
            return;
        }

        let bonusIdsObj = {};
        for (let idx=0; idx<$(blist).length; idx++) {
            let li = $(blist)[idx];
            let id = $(li).attr("id");
            if (id) id = id.replace('option-', '');
            let parts = id.split('-');
            //log("id: ", id, " parts: ", parts);

            let name = parts[0];
            let len = parts.length;
            let nameEnd = len - 1;
            let bid = parts[nameEnd];
            //log("Name: ", name, " bid: ", bid, " nameEnd: ", nameEnd);
            for (let i=1; i<nameEnd; i++) {
                //log("Addl parts: ", parts[i]);
                if (parts[i] == '') {bid = '-' + bid; break;}
                name = name + ' ' + parts[i];
            }
            log("***Final Name: ", name, " bid: ", bid);
            bonusIdsObj[name] = bid;
        }

        log("bonusIdsObj: ", bonusIdsObj);

        GM_setValue("bonusListStr", JSON.stringify(bonusIdsObj));
        GM_setValue("bonusListRaw", (bonusIdsObj));
    }

    function oldStuf() {
        const bonusList = [
            "Bonus filter off", "Any bonuses", "Double bonuses", "Yellow bonuses", "Orange bonuses", "Red bonuses",
            "Achilles", "Assassinate", "Backstab", "Berserk", "Bleed",
            "Blindfire", "Blindside", "Bloodlust", "Burn", "Comeback", "Conserve", "Cripple", "Crusher", "Cupid",
            "Deadeye", "Deadly", "Demoralize", "Disarm", "Double-edged", "Double Tap", /*"Emasculate", Pin Mac 10 */ "Empower",
            "Eviscerate", "Execute", "Expose", "Finale", "Focus", /*"Freeze", Snow Cannon */ "Frenzy", "Fury", "Grace", /* "Hazardous", Nock Gun */
            "Home run", "Irradiate", /*"Lacerate", Bread Knife*/ "Motivation", "Paralyze", "Parry", "Penetrate", "Plunder", /* "Poison", blowgun */
            "Powerful", "Proficience", "Puncture", "Quicken", "Rage", "Revitalize", "Roshambo", "Shock", /* "Sleep", Unreleased, Tranq Gun */ "Slow",
            /* "Smash", Sledgehammer */ "Smurf", "Specialist", "Spray", /*"Storage", Handbag */ "Stricken", "Stun", "Suppress", "Sure Shot", "Throttle",
            /* "Toxin", Poison Umbrella */ "Warlord", "Weaken", "Wind-up", "Wither"
            ];


        const bonusListSecondary = {
            "Bonus filter off": "0",
            "Any bonuses": "-2",
            "Double bonuses": "-1",
            "Yellow bonuses": "yellow",
            "Orange bonuses": "orange",
            "Red bonuses": "red",
            "Achilles": "50",
            "Assassinate": "72",
            "Bleed": "57",
            "Blindside": "51",
            "Burn": "30",
            "Comeback": "67",
            "Conserve": "55",
            "Cripple": "45",
            "Cupid": "47",
            "Deadeye": "63",
            "Deadly": "62",
            //"Demoralize": "",    // GAK
            "Disarm": "86",
            "Double-edged": "74",
            "Double Tap": "105",
            //"Emasculate": "",    // Pink Mac 10
            "Eviscerate": "56",
            "Execute": "75",
            "Expose": "1",
            "Finale": "82",
            //"Freeze": "",        // Snow Cannon
            //"Hazardous": "",     // Nock Gun
            //"Lacerate": "",      // Bread Knfe
            "Motivation": "61",
            "Paralyze": "59",
            //"Poison": "",        // Blowgun
            "Powerful": "68",
            "Proficience": "14",
            "Quicken": "88",
            "Revitalize": "41",
            "Shock": "120",
            //"Sleep": "",          // Unreleased, Tranq Gun
            "Slow": "44",
            //"Smash": "",          // Sledgehammer
            "Specialist": "71",
            //"Storage": "",        // Hand Bag
            "Stricken": "20",
            "Stun": "58",
            "Throttle": "48",
            //"Toxin": "",          // Poison Umbrella
            "Warlord": "81",
            "Weaken": "46",
            "Wind-up": "76",
            "Wither": "42"
        };

       const bonusListPrimary = {
            "Bonus filter off": "0",
            "Any bonuses": "-2",
            "Double bonuses": "-1",
            "Yellow bonuses": "yellow",
            "Orange bonuses": "orange",
            "Red bonuses": "red",
            "Achilles": "50",
            "Assassinate": "72",
            "Bleed": "57",
            "Blindfire": "33",
            "Blindside": "51",
            "Comeback": "67",
            "Conserve": "55",
            "Cripple": "45",
            "Cupid": "47",
            "Deadeye": "63",
            "Deadly": "62",
            "Demoralize": "36",
            "Disarm": "86",
            "Eviscerate": "56",
            "Expose": "1",
            "Focus": "79",
            "Freeze": "38",
            "Motivation": "61",
            "Penetrate": "101",
            "Powerful": "68",
            "Proficience": "14",
            "Puncture": "66",
            "Quicken": "88",
            "Revitalize": "41",
            "Slow": "44",
            "Smurf": "73",
            "Specialist": "71",
            "Spray": "35",
            "Stun": "58",
            "Suppress": "60",
            "Sure Shot": "78",
            "Throttle": "48",
            "Warlord": "81",
            "Weaken": "46",
            "Wither": "42"
        };

        const bonusListMelee =  {
            "Bonus filter off": "0",
            "Any bonuses": "-2",
            "Double bonuses": "-1",
            "Yellow bonuses": "yellow",
            "Orange bonuses": "orange",
            "Red bonuses": "red",
            "Achilles": "50",
            "Assassinate": "72",
            "Backstab": "52",
            "Berserk": "54",
            "Bleed": "57",
            "Bloodlust": "85",
            "Crusher": "49",
            "Cupid": "47",
            "Deadeye": "63",
            "Disarm": "86",
            "Double edged": "74",
            "Empower": "87",
            "Eviscerate": "56",
            "Expose": "1",
            "Frenzy": "80",
            "Fury": "64",
            "Grace": "53",
            "Home run": "83",
            "Irradiate": "102",
            "Lacerate": "89",
            "Motivation": "61",
            "Parry": "84",
            "Penetrate": "101",
            "Plunder": "21",
            "Powerful": "68",
            "Puncture": "66",
            "Quicken": "88",
            "Rage": "65",
            "Roshambo": "43",
            "Slow": "44",
            "Smash": "104",
            "Stun": "58",
            "Throttle": "48",
            "Toxin": "103",
            "Weaken": "46",
            "Wind up": "76",
            "Wither": "42"
        };
    }





})();