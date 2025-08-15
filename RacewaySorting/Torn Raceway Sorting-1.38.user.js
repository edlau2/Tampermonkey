// ==UserScript==
// @name         Torn Raceway Sorting
// @namespace    http://tampermonkey.net/
// @version      1.38
// @description  Allows sorting/filtering of custom races
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=racing*
// @match        https://www.torn.com/page.php?sid=racing*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
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

    const resetTableVal = 1.29;

    var params = new URLSearchParams(window.location.search);
    var urlTab = params.get("tab");
    var urlSid = params.get("sid");
    var suggestionInt;

    if (location.href.indexOf('racing') < 0) return log("Not at the raceway! (", location.href, ")");

    const getCustRaceWrap = function () {return $(".custom-events-wrap");}
    const hasCustRaceWrap = function () {return $(".custom-events-wrap").length > 0;}

    const rfcv = getRfcv();

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    const doCarSuggest = GM_getValue("doCarSuggest", true);
    const filtOnColor = GM_getValue("filtOnColor", "#119C11");     // Maybe find Torn colors for green/red?
    const filtOffColor = GM_getValue("filtOffColor", "#C61B1B");

    GM_setValue("debugLoggingEnabled", debugLoggingEnabled);
    GM_setValue("doCarSuggest", doCarSuggest);
    GM_setValue("filtOnColor", filtOnColor);
    GM_setValue("filtOffColor", filtOffColor);

    let val = GM_getValue("curr_ver", 0);
    if (parseFloat(val) < parseFloat(resetTableVal))
        clearFilterStorage();

    function updateParams() {
        params = new URLSearchParams(window.location.search);
        urlTab = params.get("tab");
        urlSid = params.get("sid");
    }

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        setTimeout(handlePageLoad, 250);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        setTimeout(handlePageLoad, 250);
    }

    // ======================== Car recommendations ===================================

    const track_cars = {
        "uptown": "Lambrini Torobravo - (Tarmac) (LR)(T3)",
        "commerce": "Edomondo NSX - (Tarmac) (SR)(T2)",
        "withdrawal": "Veloria LFA - (Tarmac) (LR)(T3)",
        "underdog": "Edomondo NSX - (Tarmac) (SR)(T2)",
        "parkland": "Edomondo NSX - (Dirt) (SR)(T3)",
        "docks ": "Volt GT - (Tarmac) (LR)(T3)",
        "two islands": "Edomondo NSX - (Dirt) (LR)(T3)",
        "industrial": "Edomondo NSX - (Tarmac) (SR)(T3)",
        "vector": "Edomondo NSX - (Tarmac) (SR)(T3)",
        "mudpit": "Colina Tanprice - (Dirt) (LR)(T3)",
        "hammerhead": "Edomondo NSX - (Dirt) (SR)(T2)",
        "sewage": "Edomondo NSX - (Tarmac) (SR) (T2)",
        "meltdown": "Edomondo NSX - (Tarmac) (SR)(T3)",
        "speedway": "Veloria LFA - (Tarmac) (LR)(T3)",
        "stone park": "Echo R8 - (Dirt) (SR)(T3)",
        "convict": "Mercia SLR - (Tarmac) (LR)(T3)"
    };

    function addSuggestionStyles() {
        GM_addStyle(`
            .suggest-wrap {
                width: 782px;
                height: 138px;
                margin-bottom: 10px;
                border: 1px solid transparent;
            }
            .suggest-wrap.picked {
                border: 1px solid green;
                background-color: rgba(108,195,21,.3) !important;
            }

            .suggest-wrap .enlist-info-wrap {
                width: 772px !important;
                padding: 0px 10px 0px 0px !important;
            }
            .suggest-car {
                position: absolute;
                width: 780px;
                justify-content: center;
                display: flex;
            }

        `);
    }

    var carSuggested = false;
    function setBestCarSelection(retries=0) {
        if (carSuggested == true) {
            debug("[setBestCarSelection] Already suggested!!!");
            return;
        }

        let hdr = $("#racingAdditionalContainer > div.enlist-wrap.enlisted-wrap > div:nth-child(2) > div");
        if (!$(hdr).length) {
            if (suggestionInt) return;
            updateParams();
            if (urlTab == 'race' && urlSid == 'racing') {
                suggestionInt = setInterval(setBestCarSelection, 250);
                return;
            }
            if (retries++ < 50) return setTimeout(setBestCarSelection, 250, retries);
            return log("[setBestCarSelection] timed out: ", retries);
        }
        debug("[setBestCarSelection] hdr: ", $(hdr));

        let text = $(hdr).text();
        let parts = text ? text.split('-') : null;
        let track = parts ? parts[0].trim().toLowerCase() : null;
        let suggested = track_cars[track];
        let carParts = suggested ? suggested.split('-') : null;
        let carName = carParts ? carParts[0].trim() : null;

        if (text && suggested) {
            if (suggestionInt) clearInterval(suggestionInt);
            suggestionInt = null;
            $("ul.enlist-list").css("display", "grid");
            $("ul.enlist-list > li").addClass("suggest-wrap");
            carSuggested = true;

            $(hdr).parent().css("display", "flex");
            let hdrClone = $(hdr).clone();
            $(hdrClone).text("Recommended car: " + suggested);
            $(hdrClone).addClass("suggest-car");
            $(hdr).after(hdrClone);

            let enlistedCars = $(`img[title*='${carName}']`).closest("li");
            //$(`img[title*='${carName}']`).closest("li").addClass("picked");

            $(enlistedCars).each(function(idx, li) {
                $(li).addClass("picked");
            });

            $(".picked").each(function(idx, li) {
                $(li).prependTo($(li).parent()); // doesn't seem to work...
                let order = -1 - Number(idx);
                $(li).css("order", order);
            });
        }

        $(".page-number.pager-link").on('click', function() {setTimeout(setBestCarSelection, 250);});
    }

    function hookButtons() {
        let raceBtn = $("#racingMainContainer > div > div.header-wrap.border-round > ul > li > a[tab-value='race']");
        $(raceBtn).on('click', handleOffRaceBtn);
        debug("[hookButtons] race: ", $(raceBtn));

        function handleOffRaceBtn(e, retries=0) {
            let btn = $("#racingAdditionalContainer > div > div.bottom-round > div.btn-wrap > a");
            debug("[handleOffRaceBtn]: ", $(btn).length, retries);
            if (!$(btn).length) {
                if (retries++ < 20) return setTimeout(handleOffRaceBtn, 200, e, retries);
                return log("[handleOffRaceBtn] time out");
            }
            $(btn).css("border", "1px solid green");
            $(btn).on('click', function() {
                setTimeout(setBestCarSelection, 250, 0);
            });
        }

    }

    // ======================= Sort helpers =================================
    var prevOrder = 0;
    var prevDriversAttr = 0;
    var prevWhat;
    var sorted = false;
    function doSort(what, direction) {
        debug("Sorting on ", what);
        let matches = $(".events-list > li");
        let attr = what; //'data-startTime';
        // if (attr == "data-currUsers" && ++(Number(prevDriversAttr)) > 2) attr = "data-maxUsers";
        // else if (attr == "data-maxUsers" && prevDriversAttr == "data-maxUsers") attr = "data-currUsers";
        //prevDriversAttr = what;
        let order = (prevOrder == 0) ? 'asc' : 'desc';
        if (direction) order = direction;
        prevOrder = (prevOrder == 0) ? 1 : 0;
        prevWhat = what;
        sorted = true;
        debug("Order: ", order, " sort list: ", $(matches));
        tinysort(matches, {attr: attr, order: order});
    }

    function redoSort() {
        prevOrder = (prevOrder == 0) ? 1 : 0;
        debug("redoSort: ", prevOrder, prevWhat);
        doSort(prevWhat);
    }

    // ================ Custom Race List Reloading ==========================

    // These vars no longer used?
    var eventListParent;    // Parent of the UL we are replacing
    var detachedChild;      // The detached UL
    var joinTemplate;       // Cloned 'join race' node, hopfully with event handlers

    // =============== Race LI Helpers ==========================
    function namefromRaceLi(li) {
        return $(li).find(".acc-body .name").text() ?
            $(li).find(".acc-body .name").text().trim() : null;
    }

    function startTimeFromRaceLi(li) {
        return $(li).find(".startTime").text() ?
            $(li).find(".startTime").text().trim() : null;
    }

    function copyLiStartTime(srcLi, dstLi) {
        $(dstLi).find(".startTime").replaceWith($(srcLi).find(".startTime").clone());
    }

    function driversFromRaceLi(li) {
        let all = $(li).find(".drivers").text() ?
            $(li).find(".drivers").text().trim().split('\n')[2].trim().split('/') : null;
        return all ? {current: p(all[0]), max: p(all[1]) } : null;
    }

    function copyLiDrivers(srcLi, dstLi) {
        $(dstLi).find(".drivers").replaceWith($(srcLi).find(".drivers").clone(true, true));
    }

    function findLiForNameInList(liList, name) {
        let retLi;
        $(liList).each(function() {
            if (namefromRaceLi($(this)) == name) {
                retLi = $(this);
                return false;
            }
        });

        return $(retLi);
    }

    function findLiForNameInUl(ul, name) {
        return findLiForNameInList($(ul).children("li"), name);
    }

    function findLiForNameInPage(page, name) {
        return findLiForNameInUl($(page).find(".events-list"), name);
    }

    // ==========================================================

    function processPageData(data) {
        debug("[processPageData]");

        let newPage = $(data);
        let newEventsList = $(newPage).find(".events-list");    // new UL
        let newLiList = $(newEventsList).children("li");
        if (!$(newLiList).length) return log("Error: empty UL!");

        // Iterate the current list, copy over new wait time and drivers.
        // Remove ones no longer there.
        let currLiList = $(".events-list > li");

        for (let idx=0; idx<$(currLiList).length; idx++) {
            let currLi = $(currLiList)[idx];
            let name = namefromRaceLi($(currLi));
            //log("currLi: ", $(currLi), " name: ", name);
            if (!name) continue;

            let newLi = findLiForNameInList($(newLiList), name, true);
            //log("newLi: ", $(newLi));
            if (!$(newLi).length) {
                //log("LI missing! curr: ", $(currLi), " time: ", startTimeFromRaceLi(currLi));
                $(currLi).remove();
                continue;
            }

            copyLiStartTime(newLi, currLi);
            copyLiDrivers(newLi, currLi);
        }

        debug("Re-sort? ", sorted);
        if (sorted == true) {
            addSortFilterAttrs(0, sortFilterInitCb);
            redoSort();
        }
        applyAllFilters();
    }

    function reloadCustomRaces() {
        let useUrl = `https://www.torn.com/loader.php?sid=racing&tab=customrace&rfcv=${rfcv}`;

        debug("Quick reload URL: ", useUrl);
        $.get(
            useUrl,
            function (data, status) {
                processPageData(data);
            }
        );
    }

    // ==================== Sorting support ==================================

    var driverSortOrder = GM_getValue("driverSortOrder", "current"); // current or max
    var trackSortOrder = GM_getValue("trackSortOrder", "laps"); // laps or track

    GM_setValue("driverSortOrder", driverSortOrder);
    GM_setValue("trackSortOrder", trackSortOrder);

    GM_setValue("sortOrderFmt", "driver: 'current' or 'max', track: 'laps' or 'track'");

    function parseTextTime(timeText) {
        // format: 'x h y m", "y m", "waiting"
        let hrs = 0, min = 0;
        if (timeText.indexOf('waiting') > -1) return 0;

        let hasMin = (timeText.indexOf('m') > -1);
        timeText = timeText.replaceAll('\n', '').trim();
        if (timeText.indexOf('h') > -1) {
            let parts = timeText.split('h');
            hrs = parseInt(parts[0]);
            if (hasMin) min = parseInt(parts[1]);
        } else if (timeText.indexOf('m') > -1) {
            let parts = timeText.split('m');
            min = parseInt(parts[0]);
        }

        return hrs * 3600 + min * 60;
    }

    function updateDriversAttr(liList=$(".events-list > li")) {
        $(liList).each(function(idx, li) {
            let dnode = $(li).find("ul.event-info li.drivers");
            let parts = $(dnode).text().split('/');
            if (parts.length > 1) {
                let currUsers = parseInt(getAfterCr(parts[0]));
                let tmp = parts[1].replaceAll('\n', '');
                if (tmp) tmp = tmp.trim();
                let maxUsers = parseInt(tmp); 
                $(li).attr("data-currUsers", currUsers);
                $(li).attr("data-maxUsers", maxUsers);
            }

        });

        function getAfterCr(str) {
            const lastIndex = str.lastIndexOf("\n");
            if (lastIndex === -1) {
                return str;
            } else {
                return str.substring(lastIndex + 2).trim();
            }
        }
    }

    function updateStartTimeAttr(liList=$(".events-list > li")) {
        $(liList).each(function(idx, li) {
            let startTimeNode = $(li).find(".startTime");
            let timeText = $(startTimeNode).text();
            let timeSecs = parseTextTime(timeText);

            if (isNaN(timeSecs)) {
                debug("NaN!!! '", timeText, "' ", $(li), $(startTimeNode));
                debugger;
            }

            $(li).attr("data-startTime", timeSecs);
        });
    }

    function updateLapsAttr(liList=$(".events-list > li")) {
        $(liList).each(function(idx, li) {
            let tnode = $(li).find(".track");
            let lnode = $(tnode).find(".laps");
            let laps = $(lnode).text().trim().split(' ')[0].replace('(', '');
            if (laps.length) $(li).attr("data-laps", laps);
        });
    }

    function updateTracksAttr(liList=$(".events-list > li")) {
        $(liList).each(function(idx, li) {
            let tnode = $(li).find(".track");
            let track = $(tnode).text().trim().replaceAll(/\s+/g, ' ').split('(')[0];
            if (track.length) $(li).attr("data-track", track.trim());
        });
    }

    var inClick = false;
    function resetClickFlag() {inClick = false;}
    function handleBtnClick(e) {
        e.stopPropagation();
        e.preventDefault();

        let target= $(e.currentTarget);
        debug("[sort] handleBtnClick: ", $(target));
        if (inClick == true) return false;
        inClick = true;
        let attr;
        if ($(target).hasClass('track')) {
            attr = ((trackSortOrder == 'laps') ? "data-laps" : "data-track");
        }
        if ($(target).hasClass('startTime')) {
            updateStartTimeAttr();
            attr = "data-startTime";
        }
        if ($(target).hasClass('drivers')) {
            updateDriversAttr();
            attr = ((driverSortOrder == 'current') ? "data-currUsers" : "data-maxUsers");
        }
        debug("[sort] attr: ", attr);
        if (!attr) {
            setTimeout(resetClickFlag, 500);
            debug("ERROR: invalid click!");
            return;
        }
        doSort(attr);
        setTimeout(resetClickFlag, 500);
        return false;
    }

    function addContextStyles() {
        GM_addStyle(`
            .custom-menu {
                display: none;
                z-index: 1000;
                position: absolute;
                overflow: hidden;
                border: 1px solid green;
                white-space: nowrap;
                font-family: sans-serif;
                background: #ddd;
                color: #333;
                border-radius: 5px;
                padding: 0;
            }

            .custom-menu li {
                padding: 8px 12px;
                cursor: pointer;
                list-style-type: none;
                transition: all .3s ease;
                user-select: none;
            }

            .custom-menu li:hover {
                background-color: #DEF;
            }

            .custom-menu li.action-hdr {
                border-bottom: 1px solid black;
            }

            .custom-menu li.active {
                color: green;
            }
        `);
    }

    function installItemContextMenu(node, menuHtml, menuChoiceCb, retries=0) {
        if ($(node).length == 0) {
            if (retries++ < 30) return setTimeout(installItemContextMenus, 200, node, menuHtml, menuChoiceCb, retries);
            return log("installItemContextMenus : Too many retries: ", retries, " node: '", $(node));
        }

        if (!$(node).hasClass("xf")) {    // Check if already installed
            $(node).addClass("xf");
            $(node).on("contextmenu", function(e) {
                let target = e.currentTarget;
                e.preventDefault();
                let menu = $(menuHtml);
                let activeLi = getActiveLi($(node));
                $(menu).find('li').removeClass("active");
                $(menu).find(activeLi).addClass("active");
                $(menu).css({top: e.pageY,left: e.pageX});
                $("body").append(menu);
                menu.show();

                $(".custom-menu li.action-opt").click(function() {
                    var choice = $(this).attr("data-action");
                    menuChoiceCb(target, choice);
                    menu.remove();
                });

                $(document).on("click", function(e) {
                    if (!$(e.target).closest(".context-menu").length) {
                        menu.remove();
                    }
                });
            });
        }

        function getActiveLi(node) {
            let sel;
            if ($(node).hasClass('drivers')) {
                sel = `li[data-action*='${driverSortOrder}']`
            } else if ($(node).hasClass('track')) {
                sel = `li[data-action*='${trackSortOrder}']`
            }

            return sel;
        }
    }

    function handleSortContext(target, choice) {
        if ($(target).hasClass('drivers')) {
            driverSortOrder = choice;
            updateDriversAttr();
            GM_setValue("driverSortOrder", driverSortOrder);
        } else if ($(target).hasClass('track')) {
            trackSortOrder = choice;
            updateTracksAttr();
            updateLapsAttr();
            GM_setValue("trackSortOrder", trackSortOrder);
        }
    }

    function installAllTabContextMenus() {
        addContextStyles();

        let trackBtn = $("li.track.title-divider");
        let driversBtn = $("li.drivers.title-divider");

        displayHtmlToolTip($(driversBtn), "Right-click for sort options", "tooltip5");
        $(driversBtn).attr("style", "");

        let trackOpts = { 'track': "Track Name", 'laps': "Number of Laps", "active": `${trackSortOrder}` };
        let driverOpts = { 'current': "Current Enlisted", 'max': "Max Drivers", "active": `${driverSortOrder}` };

        installItemContextMenu($(trackBtn), getMenuHtml(trackOpts), handleSortContext);
        installItemContextMenu($(driversBtn), getMenuHtml(driverOpts), handleSortContext);

        function getMenuHtml(liEntries) {
            let menu = $(`<ul class='custom-menu'><li class='action-hdr'>Sort By:</li></ul>`);
            let active = liEntries["active"];
            for (let [key, value] of Object.entries(liEntries)) {
                let cval = "action-opt";
                if (key.toString() == active.toString()) cval = cval + " active";
                let li = `<li class='${cval}' data-action="${key}">${value}</li>`;
                if (key.toString() != 'active')
                    $(menu).append(li);
            };

           return $(menu)[0];
       }
    }

    function handleCatClick(e) {
        let target = e ? $(e.currentTarget) : null;
        let page = $(target).find("a").attr("tab-value");
        debug("handleCatClick: ", page, $(target));

        setTimeout(handlePageLoad, 250);
    }

    function addSortFilterAttrs(sfRetries=0, callback) {
        let rootLis = $(".events-list > li");

        if (sfRetries % 10 == 0)
            debug("[addSortFilterAttrs] ", sfRetries, $(rootLis).length);

        if ($(rootLis).length == 0) {
            if (sfRetries++ < 100) return setTimeout(addSortFilterAttrs, 250, sfRetries, callback);
            return log("[addSortFilterAttrs] timed out! ", sfRetries, $(".events-list > li"));
        }

        updateStartTimeAttr(rootLis);
        updateDriversAttr(rootLis);
        updateLapsAttr(rootLis);
        updateTracksAttr(rootLis);

        if (callback) callback();
    }

    function addSortSupport(retries=0) {
        // Get the start time col header
        let startTimeBtn = $("li.startTime.title-divider");
        let trackBtn = $("li.track.title-divider");
        let driversBtn = $("li.drivers.title-divider");

        if ($(startTimeBtn).length == 0 && $(trackBtn).length == 0) {
            if (retries++ < 50) return setTimeout(addSortSupport, 250, retries);
            return debug("[addSortSupport] timeout: ", $(startTimeBtn).length, $(trackBtn).length);
        }

        $(trackBtn).addClass("xsrtbtn");
        $(startTimeBtn).addClass("xsrtbtn");
        $(driversBtn).addClass("xsrtbtn");

        $(".xsrtbtn").on('click.xedx', handleBtnClick);

        installAllTabContextMenus();
    }

    // ==================== Filtering support ============================

    var filterEnabled = GM_getValue("filterEnabled", true);
    var activeTable = GM_getValue("activeTable", "filterTable");
    var tablePresets = JSON.parse(GM_getValue("tablePresets", JSON.stringify( [] )));
    var activeIsPreset = (activeTable != "filterTable");

    debug("activeTable: ", activeTable);
    debug("tablePresets: ", tablePresets);

    function clearFilterStorage() {
        let keys = GM_listValues();
        for (let key of keys) {
            GM_deleteValue(key);
        }

        GM_setValue("debugLoggingEnabled", debugLoggingEnabled);
        GM_setValue("doCarSuggest", doCarSuggest);
    }

    const defFilterTable = {
        tracks: {
            "Uptown": {}, "Commerce": {}, "Withdrawal": {}, "Underdog": {},
            "Parkland": {}, "Docks": {}, "Two Islands": {}, "Industrial": {},
            "Vector": {}, "Mudpit": {}, "Hammerhead": {}, "Sewage": {}, 
            "Meltdown": {}, "Speedway": {}, "Stone Park": {}, "Convict": {}
        },
        misc: {
            "Allow Password":
                { enabled: true, sel: `protected`, class: 'pwdhide' },
            "Allow Fees":
                { enabled: true, filterFn: 'feeFilter', class: 'feehide' },
            "Gold Only (URT/JLT)":
                { enabled: false, sel: `gold`, invert: true, class: 'goldhide' },
            //"Allow Long Races (25+ laps)":
            //    { enabled: true, filterFn: "longFilter", class: 'longhide', id: "xnolong", ckId: "x100only" },
            "100 Laps Only":
                { enabled: false, filterFn: "shortFilter", invert: true, class: 'shorthide', id: "x100only"},// ckId: "xnolong" },
            "Start Time":
                { enabled: true, type: "select", filterFn: "startFilter", class: 'starttimehide', id: "st-select", selected: "any"},
            "Max Racers":
                { enabled: true, type: "select", filterFn: "maxRacersFilter", class: 'maxracershide', id: "max-select", selected: "any"},
            "Sort":
                { enabled: false, type: "custom", filterFn: "customSort", class: '', id: "table-sort", selected: "none", idx: 0},
        }
    };

    // Aliases if I change the key: "New Key": "Old Key"
    const filterAliases = {
        //"Gold Only (URT)" : "Gold Only (URT/JLT)",
        "Gold Only (URT/JLT)": "Gold Only (URT)",

    };

    // Options for the start time select
    const stSelect = {
        "any": {name: "<span>-- any time --</span>"},
        "waiting": {name: "ASAP", time: 0, op: "le"},
        "under30min": {name: "Under 30 min", time: 1800, op: "le"},
        "under1hr": {name: "Under 1 hr", time: 3600, op: "le"},
        "under2hr": {name: "Under 2 hrs", time: 7200, op: "le"},
        "over2hr": {name: "Over 2 hrs", time: 7200, op: "ge"},
        "under4hr": {name: "Over 4 hrs", time: 14400, op: "ge"},
    };

    // ... max racers selection
    const maxSelect = {
        "any": {name: "<span>-- any amount --</span>"},
        "max2": {name: "Max 2 racers", racers: 2, op: "le"},
        "max6": {name: "Max 6 racers", racers: 6, op: "le"},
        "max12": {name: "Max 12 racers", racers: 12, op: "le"},
        "max25": {name: "Max 25 racers", racers: 25, op: "le"},
        "max50": {name: "Max 50 racers", racers: 50, op: "le"},
        "min6": {name: "Min 6 racers", racers: 6, op: "ge"},
        "min12": {name: "Min 12 racers", racers: 12, op: "ge"},
        "min25": {name: "Min 25 racers", racers: 25, op: "ge"},
        "min50": {name: "Min 50 racers", racers: 50, op: "ge"},
    };

    const sortSelect = {
        "none": {name: "-- none --", attr: "", dir: ""},
        "startAsc": {name: "Start, asc", attr: "data-starttime", dir: "asc"},
        "startDesc": {name: "Start, desc", attr: "data-starttime", dir: "desc"},
        "driversAsc": {name: "Drivers Max, asc", attr: "data-maxUsers", dir: "asc"},
        "driversDesc": {name: "Drivers Max, desc", attr: "data-maxUsers", dir: "desc"},
        "lapsAsc": {name: "Lapd, asc", attr: "data-laps", dir: "asc"},
        "lapsDesc": {name: "Lapd, desc", attr: "data-laps", dir: "desc"},
        "trackAsc": {name: "Track, asc", attr: "data-track", dir: "asc"},
        "trackDesc": {name: "Track, desc", attr: "data-track", dir: "desc"},
        "maxUsersAsc": {name: "Max Racers, asc", attr: "data-maxUsers", dir: "asc"},
        "maxUsersDesc": {name: "Max Racers, desc", attr: "data-maxUsers", dir: "desc"},
        "currUsersAsc": {name: "Curr Racers, asc", attr: "data-currUsers", dir: "asc"},
        "currUsersDesc": {name: "Curr Racers, desc", attr: "data-currUsers", dir: "desc"},
    };

    // 'Live' filtering definitions
    var filterTable = {};
    const trackKeys = Object.keys(defFilterTable.tracks);
    const miscKeys = Object.keys(defFilterTable.misc);

    var activeDirty = false;
    function saveFilterTable(tableName = activeTable) {
        if (activeIsPreset == true) {
            activeDirty = true;
            return;
        }
        debug("[saveFilterTable] Saving table as ", tableName);
        GM_setValue(tableName, JSON.stringify(filterTable));
        activeTable = tableName;
        GM_setValue("activeTable", tableName);
        if (tableName != 'filterTable') activeIsPreset = true;
    }

    const trackList = () => {return filterTable.tracks;}
    function getAllowedTracks() {
        let res = [];
        for (let [key, entry] of Object.entries(trackList())) {
            if (entry.enabled == true)
                res.push(entry);
        }
        return res;
    }

    function openFilterTable(tableName = activeTable, initializing) {
        debug("[openFilterTable] opening ", tableName);
        filterTable = JSON.parse(GM_getValue(tableName, JSON.stringify({})));
        if (!filterTable || !Object.keys(filterTable).length) { // Never saved, use default
            filterTable = JSON.parse(JSON.stringify(defFilterTable));
            for (let [key, entry] of Object.entries(trackList())) {
                entry.enabled = true;
                let name = key.split(' ')[0];
                let aka = name.substring(1);
                entry.aka = aka;
            }
            debug("filterTable: ", filterTable);
            saveFilterTable();
            filterTable = JSON.parse(GM_getValue("filterTable", JSON.stringify(filterTable)));
        }
        activeTable = tableName;

        if (initializing == true && filterEnabled == true) {
            debug("initializing, applying filters for ", activeTable);
            applyAllFilters(false, initializing);
        }
    }

    function reloadDefaultTable() {
        activeTable = "filterTable";
        GM_deleteValue(activeTable);
        openFilterTable(activeTable, true);
        let def = $('#st-select option:first').val()
        $("#st-select").val(def);
        applyAllFilters();
        $(".starttimehide").remove();  // Hack, fix in apply filters fn
    }

    function addFilterSupport(retries=0) {
        if ($("#filter-opts").length > 0) return;
        let root = $("#racingAdditionalContainer > div.start-race");
        if ($(root).length == 0) {
            if (retries++ < 20) return setTimeout(addFilterSupport, 250, retries);
            return log("[addFilterSupport] timeout: ", retries);
        }

        openFilterTable(activeTable, true);
        addFilterBtn();
    }

    // =================== Build the filter UI table ========================

    const tooltips = {
        "rst-btn": {sel: "#rst-btn", text: "Resets values saved in\nstorage back to defaults.\n" +
                                           "Often fixes filtering issues."},
        "xselect": {sel: "input[name='xselect']", text: "Selects all tracks\n(any track allowed)" },
        "xdeselect": {sel: "input[name='xdeselect']", text: "Uncheck all tracks\n(none allowed)" },
        "x-preset": {sel: "input.x-preset", text: "Save the current set of filters\nas a preset favorite." },
        "x-refresh": {sel: "input.x-refresh", text: "Refreshes the filtered list, updating current times." },
        "presets": {sel: "#presets", text: "Pick a previously saved set of filters" },
        "rmv-preset": {sel: "#rmv-preset", text: "Remove the selected preset from the list." },
    }

    const filterClasses = "trackhide pwdhide feehide longhide shorthide starttimehide goldhide maxracershide";

    function getList(entry) {
        let list = {};
        if (entry.sel) {
            if (entry.invert == true)
                list = $(`.events-list > li:not(".${entry.sel}")`);
            else
                list = $(`.events-list > .${entry.sel}`);
            debug("[getList] selector: ", entry.sel, " list: ", $(list), " class: ", entry.class);
            return $(list);
        }
        debug("[getList] filter: ", entry.filterFn, " class: ", entry.class);
        if (entry.filterFn) {
            switch (entry.filterFn) {
                case "feeFilter": {
                    list = $("ul.event-info > li.fee").not(":contains('$0')").closest('[data-track]');
                    break;
                }
                case "longFilter": { // Hide any over 20 laps
                    list = $(".events-list > li").filter(function() {
                        var laps = parseInt($(this).attr('data-laps'));
                        return laps >= 25;
                     });
                    break;
                }
                case "shortFilter": { // Hide any without 100 laps
                    list = $(".events-list > li").not("[data-laps='100']");
                    break;
                }
                case "laps": {
                    //list = $("ul.event-info li.track > .laps")
                    //ul > li:nth-child(16) > div.event-header.left > ul > li.track > span
                    break;
                }
                case "startFilter": {
                    let val = $(`#${entry.id}`).attr("data-selected");
                    $(".starttimehide").removeClass("starttimehide");
                    if (val == 'any') return;
                    let opt = stSelect[val];

                    let tmplist = $(".event-info > li.startTime").closest(".acc-body").parent();
                    list = $(tmplist).filter(function() {
                        let li = $(this); //.closest(".acc-body").parent();
                        let startSecs = parseInt($(li).attr("data-starttime"));
                        debug("start time: ", startSecs, " time: ", opt.time,  "eq: ", (Number(startSecs) == 0 && Number(opt.time) == 0));
                        if (Number(startSecs) == 0 && Number(opt.time) == 0) return false;
                        if (opt.op == "le")
                            return startSecs > parseInt(opt.time);
                        else
                            return startSecs < parseInt(opt.time);
                     });
                    break;
                }

                case "maxRacersFilter": {
                    let opts = maxSelect[entry.selected];
                    debug("Max users opts: ", opts);

                    let val = Number(opts.racers);
                    list = $(".events-list > li").filter(function() {
                        var racers = parseInt($(this).attr('data-maxUsers'));
                        let diff = racers - val;
                        return (opts.op == 'le') ? (diff >= 0) : (diff <= 0);
                     });

                    break;
                }
                default: {
                    debug("Filter fn ", entry.filterFn, " not found for entry ", entry);
                    list = {};
                    debugger;
                    break;
                }
            }
        }

        debug("list: ", $(list));
        return $(list);
    }

    function handleTrackSelect(e) {
        if (filterEnabled == false) return;
        let key = $(this).attr('name');
        let checked = $(this).prop('checked');

        filterTable.tracks[key].enabled = checked;
        saveFilterTable();

        let aka = $(this).attr('data-aka');
        if (checked)
            $(`ul.events-list > li[data-track*='${aka}']`).removeClass("trackhide");
        else
            $(`ul.events-list > li[data-track*='${aka}']`).addClass("trackhide");
    }

    function toggleOtherEntry(thatEntry, ckId, checked) {
        // Let ckId be an aray? So can be a group of mutuallt exclusive choices?
        debug("[toggleOtherEntry] Handled entry ", thatEntry, " looking for ", ckId);
        let entry;
        for (let idx=0; idx<miscKeys.length; idx++) {
            entry = filterTable.misc[miscKeys[idx]];
            if (entry.id == ckId) break;
            entry = null;
        }
        if (entry) {
            debug("Found entry for ", ckId, ": ", entry);
            entry.enabled = false;
            $(`#${entry.id}`).prop('checked', false);
            debug("Removing class: ", entry.class);
            $(`.${entry.class}`).removeClass(entry.class);
            //$("ul.events-list > li").removeClass(entry.class);
        }
    }

    function handleCustOptChange(e) {
        if (e) e.preventDefault();
        if (e) e.stopPropagation();

        if (filterEnabled == false) return;
        let key = $(this).attr('name');
        let checked = $(this).prop('checked');
        let entry = filterTable.misc[key];
        log("[handleCustOptChange] ", key, $(this));

        if (!entry) {
            let alias = filterAliases[key];
            debug("No entry for ", key, " alias: ", filterAliases[key], filterTable.misc[alias]);
            if (alias) {
                debug("886 - Save new key: ", key, " instead of ", alias, " Table: ", activeTable);
                filterTable.misc[key] = JSON.parse(JSON.stringify(filterTable.misc[alias]));
                delete filterTable.misc[alias];
                debug("New keys: ", Object.keys(filterTable.misc));
                GM_setValue(activeTable, JSON.stringify(filterTable));
            } else {
                filterTable.misc[key] = JSON.parse(JSON.stringify(defFilterTable.misc[key]));
                debug("New keys: ", Object.keys(filterTable.misc));
                GM_setValue(activeTable, JSON.stringify(filterTable));
            }
            entry = filterTable.misc[key];
        }
        entry.enabled = checked;

        saveFilterTable();
    }

    function handleMiscOptChange(e) {
        if (e) e.preventDefault();
        if (e) e.stopPropagation();

        if (filterEnabled == false) return;
        let key = $(this).attr('name');
        let checked = $(this).prop('checked');
        let entry = filterTable.misc[key];
        log("[handleMiscOptChange] ", key, $(this));
        if (!entry) {
            let alias = filterAliases[key];
            debug("No entry for ", key, " alias: ", filterAliases[key], filterTable.misc[alias]);
            if (alias) {
                debug("886 - Save new key: ", key, " instead of ", alias, " Table: ", activeTable);
                filterTable.misc[key] = JSON.parse(JSON.stringify(filterTable.misc[alias]));
                delete filterTable.misc[alias];
                debug("New keys: ", Object.keys(filterTable.misc));
                GM_setValue(activeTable, JSON.stringify(filterTable));
            } else {
                filterTable.misc[key] = JSON.parse(JSON.stringify(defFilterTable.misc[key]));
                debug("New keys: ", Object.keys(filterTable.misc));
                GM_setValue(activeTable, JSON.stringify(filterTable));
            }
            entry = filterTable.misc[key];
        }
        entry.enabled = checked;

        let list = getList(entry);
        if (checked == true) {
            if (entry.invert == true) {
                $(list).addClass(entry.class);
            } else {
                $(list).removeClass(entry.class);
            }
        } else {
            if (entry.invert == true) {
                $(list).removeClass(entry.class);
            } else {
                $(list).addClass(entry.class);
            }
        }

        if (entry.ckId && checked == true) {
            toggleOtherEntry(entry, entry.ckId, checked);
        }

        saveFilterTable();
    }

    function handleMiscOptSelects(e) {
        let selected = $(this).find("option:selected");
        let val = $(this).find("option:selected").val();
        let name = $(this).find("option:selected").attr('name');
        let dir = $(this).find("option:selected").attr('data-dir');
        let idx = $(this).find("option:selected").index();
        let entry = filterTable.misc[name];
        if (entry) {
            entry.enabled = true;
            entry.selected = val;
            entry.idx = idx;
            $(this).attr("data-selected", val);
        }

        let keys = Object.keys(sortSelect);
        let key = keys[idx];
        let sel = `#${entry.id}-select`;
        $(sel).val(key);

        debug("[handleMiscOptSelects] slected: ", selected, " val: ", val, " name: ", name, " idx: ", idx);
        debug("[handleMiscOptSelects] entry: ", entry);

        if (Number(idx) == 0) {
            $(".starttimehide").removeClass("starttimehide");
        }

        saveFilterTable();
        applyAllFilters(true);
    }

    function handleSelects(e) { // Select all/clear all tracks
        if (filterEnabled == false) return;
        let checked = $(this).attr("name") == "xselect" ? true : false;
        $(".xtrack").prop('checked', checked);

        if (checked == true)
            $(".xtrack").closest('[data-track]').removeClass("trackhide");
        else
            $(".xtrack").closest('[data-track]').addClass("trackhide");

        for (let [key, entry] of Object.entries(trackList())) {
            entry.enabled = checked;
        }

        saveFilterTable();
        applyAllFilters(true);
    }

    function handleEnableOnOff(e) {
        filterEnabled = $(this).prop('checked');
        GM_setValue("filterEnabled", filterEnabled);
        setFilterBtnState();

        if (filterEnabled == false) {
            $(".xtrack").attr("disabled", "true");
            $(".xmisc").attr("disabled", "true");
            $(`.events-list > li`).removeClass(`${filterClasses}`);
        } else {
            $(".xtrack").removeAttr("disabled");
            $(".xmisc").removeAttr("disabled");
            applyAllFilters();
        }
    }

    function applyCustFilter(key, entry) {

        switch (entry.filterFn) {
            case "customSort": {
                let checked = entry.enabled;
                $(`#${entry.id}`).prop('checked', checked);
                let sortKey = entry.selected;
                let sortEntry = sortSelect[sortKey];
                debug("[applyCustFilter] sortEntry: ", sortKey, sortEntry);

                if (checked == true && !sortEntry) {
                    debug("[applyCustFilter] ERROR: didn't find ", sortKey, " in ", sortSelect);
                }
                else if (checked == true) {
                    debug("[applyCustFilter] Applying customSort filter: ", sortEntry);
                    debug("[applyCustFilter] Doing sort by: ", sortEntry.attr, sortEntry.dir);
                    doSort(sortEntry.attr, sortEntry.dir);
                } else {
                    debug("[applyCustFilter] Sort not enabled for this filter");
                }
                break;
            }

            default:
                break;
        }
    }

    function applyAllFilters(forced = false, init) {
        //debug("Applying filter table. forced? ", forced, " enabled? ", filterEnabled, " init? ", init, " table: ", activeTable);
        //debug("List len: ", $(`ul.events-list > li`).length);
        if (filterEnabled == false && forced == false) return;

        if (init == true) {
            let optTable = getFilterOptsDiv();
            let dummyWrap = `<div id='dummyDiv' style="position: absolute; top: -5000; left: -5000;"></div>`;

            $('body').append(dummyWrap);
            $("#dummyDiv").append(optTable);
        }

        $(".xtrack").each(function (idx, el) {
            let entry = filterTable.tracks[$(this).attr('name')];
            let checked = filterTable.tracks[$(this).attr('name')].enabled;
            let aka = $(this).attr('data-aka');
            $(this).prop('checked', checked);
            if (checked)
                $(`ul.events-list > li[data-track*='${aka}']`).removeClass("trackhide");
            else
                $(`ul.events-list > li[data-track*='${aka}']`).addClass("trackhide");
        });

        $(".xmisc").each(function (idx, el) {
            let key = $(this).attr('name');
            let entry = filterTable.misc[key];
            if (!entry) {
                let alias = filterAliases[key];
                debug("No entry for ", key, " alias: ", filterAliases[key], filterTable.misc[alias]);
                if (alias) {
                    debug("1012 - Save new key: ", key, " instead of ", alias, " table: ", activeTable);
                    filterTable.misc[key] = JSON.parse(JSON.stringify(filterTable.misc[alias]));
                    delete filterTable.misc[alias];
                    debug("New keys: ", Object.keys(filterTable.misc));
                    GM_setValue(activeTable, JSON.stringify(filterTable));
                }  else {
                    filterTable.misc[key] = JSON.parse(JSON.stringify(defFilterTable.misc[key]));
                    debug("New keys: ", Object.keys(filterTable.misc));
                    GM_setValue(activeTable, JSON.stringify(filterTable));
                }
                entry = filterTable.misc[key];
            }
            let checked = entry.enabled;
            $(this).prop('checked', checked);

            let list = getList(entry);

            if (entry.type == 'select') {
                $(`.${entry.class}`).removeClass(entry.class);
                $(list).addClass(entry.class);
            } else {
                if (checked == true) {
                    if (entry.invert == true) {
                        $(list).addClass(entry.class);
                    } else {
                        $(list).removeClass(entry.class);
                    }
                } else {
                    if (entry.invert == true) {
                        $(list).removeClass(entry.class);
                    } else {
                        $(list).addClass(entry.class);
                    }
                }
            }
        });

        $(".xcust").each(function (idx, el) {
            let key = $(this).attr('name');
            let entry = filterTable.misc[key];

            applyCustFilter(key, entry);
            /*
            if (!entry) {
                let alias = filterAliases[key];
                debug("No entry for ", key, " alias: ", filterAliases[key], filterTable.misc[alias]);
                if (alias) {
                    debug("1012 - Save new key: ", key, " instead of ", alias, " table: ", activeTable);
                    filterTable.misc[key] = JSON.parse(JSON.stringify(filterTable.misc[alias]));
                    delete filterTable.misc[alias];
                    debug("New keys: ", Object.keys(filterTable.misc));
                    GM_setValue(activeTable, JSON.stringify(filterTable));
                }  else {
                    filterTable.misc[key] = JSON.parse(JSON.stringify(defFilterTable.misc[key]));
                    debug("New keys: ", Object.keys(filterTable.misc));
                    GM_setValue(activeTable, JSON.stringify(filterTable));
                }
                entry = filterTable.misc[key];
            }

            let checked = entry.enabled;
            $(this).prop('checked', checked);
            */
        });

        if (init == true) $("#dummyDiv").remove();
    }

    function savePreset(e) {
        // Temporary - use my own dialog box!
        let defName = '';
        let exists = false;
        if (activeTable != 'filterTable') {
            for (let idx=0; idx<tablePresets.length;idx++) {
                let entry = tablePresets[idx];
                if (entry.val == activeTable) {
                    defName = entry.name;
                    exists = true;
                    break;
                }
            }
        }

        let name = prompt("Please provide a friendly name", defName);
        if (name && name.length && name != defName) {
            debug("Saving as new entry");
            let val = 'preset_' + tablePresets.length;
            let entry = {val: val, name: name};
            tablePresets.push(entry);
            GM_setValue("tablePresets", JSON.stringify(tablePresets));

            activeTable = val;
            activeIsPreset = false;
            saveFilterTable();

            let opt = `<option class="cust-preset" value="${entry.val}">${entry.name}</option>`;
            $('#presets').append(opt);
            $('#presets').val(activeTable);
        } else if (name == defName) {
            debug("Saving active table");
            activeIsPreset = false;
            saveFilterTable();
        } else {
            debug("Not saving? name: ", name, " def: ", defName, " exists: ", exists);
        }
    }

    function handlePresetSelect(e) {
        let tableVal = $(this).val();
        if (tableVal == 'default') {
            reloadDefaultTable();
        } else {
            openFilterTable(tableVal);
            applyAllFilters();
        }
    }

    function handleRemovePreset(e) {
        let opt = $("#presets option:selected");
        let find = $(opt).val();

        for (let idx=0; idx<tablePresets.length;idx++) {
            let entry = tablePresets[idx];
            if (entry.val == find) {
                tablePresets.slice(idx, 1);
                GM_setValue("tablePresets", JSON.stringify(tablePresets));
                GM_deleteValue($(this).val());
                break;
            }
        }
        $("#presets").val("Default");
        $(opt).remove();
        reloadDefaultTable();
    }

    function handleResetBtn(e) {
        if (confirm("This will remove all saved presets and all filters.\nAre you sure?")) {
            clearFilterStorage();
            reloadDefaultTable();
            $("#presets .cust-preset").remove();
        }
    }

    function handleRefresh(e) {
        // Can this update race rows?
        addSortFilterAttrs();
        applyAllFilters();
    }

    var tblHeight = "221"; // dynamic, will be changed
    function installOptTable() {
        let optTable = getFilterOptsDiv();
        let root = $("#racingAdditionalContainer > div.start-race");
        debug("[installOptTable] root: ", $(root));

        $(root).append(optTable);

        let rows = $("#filter-opts tr").length;
        tblHeight = rows * 35 + 2 + 20; // 35 px per row, +2 for padding on last row, +20 for table padding

        $(".tbl-ftr [name='enable-filter']").prop('checked', filterEnabled);
        if (filterEnabled == true) {
            applyAllFilters();
            // Sort if desired
        } else {
            $(".xtrack").attr("disabled", "true");
            $(".xmisc").attr("disabled", "true");
            $(`.events-list > li`).removeClass(`${filterClasses}`);
        }

        let idx = parseInt($("#table-sort-select").attr('data-idx'));
        let val = Object.keys(sortSelect)[idx];
        $("#table-sort-select").val(val);

        $(".xtrack").on('change', handleTrackSelect);
        $(".xmisc").on('change', handleMiscOptChange);
        $(".xcust").on('change', handleCustOptChange);
        $(".xmselect").on('change', handleMiscOptSelects);

        $(".tbl-ftr input.x-select").on('click', handleSelects);
        $(".tbl-ftr input.x-preset").on('click', savePreset);
        $("#rmv-preset").on('click', handleRemovePreset);
        $(".tbl-ftr input.x-refresh").on('click', handleRefresh);

        $("#rst-btn").on('click', handleResetBtn);

        for (const [key, value] of Object.entries(tooltips))
            displayHtmlToolTip(value.sel, value.text, "tooltip5");

        $("#presets").off();
        $("#presets").on('change', handlePresetSelect);
        //$('#presets option[value="default"]').attr("disabled", true);
        //if (activeTable != "filterTable") {
            $('#presets').val(activeTable);
        //}

        $(".tbl-ftr [name='enable-filter']").on('change', handleEnableOnOff);
    }

    function setFilterBtnState() {
        let btnState = filterEnabled ? "on" : "off";
        let btnColor = filterEnabled ? filtOnColor : filtOffColor;
        $("#xfilt-btn").attr("style", `border: 1px solid ${btnColor}; color: ${btnColor};`);
        $("#xfilt-btn").text(`Filters (${btnState})`);
    }

    var inInit = false;

    function addFilterBtn(retries=0) {
        if ($("#xfilt-btn").length > 0) return;

        let btnWrap = $(".messages-race-wrap.start-race > div.bottom-round > .btn-wrap");
        //let btnWrap = $($("#racingAdditionalContainer  .cont-black.bottom-round")[0]).find(".btn-wrap");
        if (!$(btnWrap).length) {
            if (retries++ < 100) return setTimeout(addFilterBtn, 250, retries);
            return log("[addFilterBtn] timed out!\nSel: "  +
                      "$('.messages-race-wrap.start-race > div.bottom-round > .btn-wrap')  retries: ", retries);
        }
        inInit = false;
        let myWrap = `<div id="xraceWrap" class="xflexr" style="width: 100%;  justify-content: space-between;"></div>`;
        $(btnWrap).wrap(myWrap);

        let sep = `<div class="sep"></div>`;
        let btnState = filterEnabled ? "on" : "off";
        let initClass = filterEnabled ? "btnOn" : "btnOff";
        let btn =
            `<div class="btn-wrap silver c-pointer">
                <a id='xfilt-reload' class="btn torn-btn btn-dark-bg xmr10">Reload</a>
                <a id='xfilt-btn' class="btn torn-btn btn-dark-bg ${initClass}">Filters (${btnState})</a>
             </div>`;
        $("#xraceWrap").append(btn);
        $("#xraceWrap").after(sep);
        $("#xfilt-btn").on('click', doFilterOpen);
        $("#xfilt-reload").on('click', reloadCustomRaces);
        setFilterBtnState();

        var detachedTable;
        function doFilterOpen(e) {
            if (!detachedTable && !$("#filter-opts").length) {
                installOptTable();
                return;
            }

            let root = $("#racingAdditionalContainer > div.start-race");
            let newHeight = `${tblHeight}px`;
            let closing = false;
            if ($("#filter-opts").hasClass('xf-open')) {
                newHeight = "0px";
                closing = true;
            } else {
                $(root).append(detachedTable);
            }

            $("#filter-opts").animate({
                height: newHeight
            }, 100, function() {
                if (closing == true) {
                    $("#filter-opts").removeClass('xf-open');
                    detachedTable = $("#filter-opts").detach();
                } else {
                    $("#filter-opts").addClass('xf-open');
                }
            });

        }
    }

    function getFilterOptsDiv() {
        let filterOptDiv = $(`<div id="filter-opts" class='xf-open cont-black'><table><tbody></tbody></table></div>`);

        addFilterStyles();
        addTrackRows(filterOptDiv);
        addMiscOptionRows(filterOptDiv);
        addFooterRow(filterOptDiv);

        return filterOptDiv;

        function addTrackRows(tableDiv) {
            let keys = Object.keys(trackList());
            for (let idx=0; idx<keys.length; idx += 4) {
                let row = `<tr>`;
                for (let j=0;j<4;j++) {
                    let newIdx = idx + j;
                    let entry = trackList()[keys[newIdx]];
                        row = row + `<td><label><input class='xtrack' type='checkbox' name='${keys[newIdx]}' data-aka='${entry.aka}'>${keys[newIdx]}</label></td>`;
                }
                row = row + `</tr>`;
                $(tableDiv).find('tbody').append(row);
            }
        }

        function addCustomCell(key, entry) {
            let newCell; // = `<td> </td>`;
            if (entry.id == 'table-sort') {
                let val = Object.keys(sortSelect)[parseInt(entry.idx)];
                newCell = `
                    <td><label><input id="${entry.id}" class="xcust" type="checkbox" name="${key}">Sort</label>
                        <select class="xmselect" id="${entry.id}-select" name="${key}" data-idx='${entry.idx}' data-selected='${entry.selected}' value='${val}'>`;
                for (let [optkey, value] of Object.entries(sortSelect)) {
                    newCell = newCell + `<option class='xcust-opt' name='${key}' data-opt='${optkey}' value="${optkey}">${value.name}</option>`;
                }
                newCell = newCell + `</select></td>`;
            }

            return newCell;
        }

        function getSelectCell(mainKey, entry) {
            let row;

            switch (entry.id) {
                case "st-select": {
                    row = `<td><label>Start Time<select class='xmselect' id='${entry.id}' data-selected='${entry.selected}'>`;
                    for (let [key, value] of Object.entries(stSelect))
                        row = row + `<option class='xmisc' name='${mainKey}' value="${key}">${value.name}</option>`;
                    row = row + `</select></label></td>`;
                    break;
                }
                case "max-select": {
                    row = `<td><label>Racers<select class='xmselect' id='${entry.id}' data-selected='${entry.selected}'>`;
                    for (let [key, value] of Object.entries(maxSelect))
                        row = row + `<option class='xmisc' name='${mainKey}' value="${key}">${value.name}</option>`;
                    row = row + `</select></label></td>`;
                    break;
                }
                default: {
                    row = `<td><select class='' name='error'><option value="">Error</option></select></td>`;
                    break;
                }
            }
            return row;
        }

        function addMiscOptionRows(tableDiv) {
            let keys = miscKeys;
            let row = `<tr>`, idx = 0;
            for (idx=0; idx<keys.length; idx++) {
                let key = keys[idx];
                let entry = filterTable.misc[key];
                if (!entry) {
                    let alias = filterAliases[key];
                    debug("No entry for ", key, " alias: ", filterAliases[key], filterTable.misc[alias]);
                    if (alias) {
                        debug("1286 - Save new key: ", key, " instead of ", alias, " table: ", activeTable);
                        filterTable.misc[key] = JSON.parse(JSON.stringify(filterTable.misc[alias]));
                        delete filterTable.misc[alias];
                        debug("New keys: ", Object.keys(filterTable.misc));
                        GM_setValue(activeTable, JSON.stringify(filterTable));
                    } else {
                        filterTable.misc[key] = JSON.parse(JSON.stringify(defFilterTable.misc[key]));
                        debug("New keys: ", Object.keys(filterTable.misc));
                        GM_setValue(activeTable, JSON.stringify(filterTable));
                    }
                    entry = filterTable.misc[key];
                }
                if (!entry) {
                    log("ERROR: bad table key ", key);
                    continue;
                }
                let optId = entry.id ? `id="${entry.id}"` : '';

                if (entry.type == 'select') {
                    row = row + getSelectCell(key, entry);
                } else if (entry.type == 'custom') { // can't skip a cell, idx is off for counting...
                    let newCell = addCustomCell(key, entry);
                    if (newCell)
                        row = row + newCell;
                } else {
                    row = row + `<td><label><input ${optId} class='xmisc' type='checkbox' name='${key}'>${key}</label></td>`;
                }

                if ((idx > 0) && (idx % 3 == 0) && (idx != keys.length - 1)) row = row + `</tr><tr>`;
            }
            if (keys.length % 4 != 0)
                for (let i=0; i<(4 - (keys.length % 4)); i++) row = row + `<td></td>`;
            row = row + `</tr>`;

            $(tableDiv).find('tbody').append(row);
            let lastRow = $(tableDiv).find('tbody tr:last-child');
            $(lastRow).addClass("tr-misc");
        }

        function getAltFtr() {
            let row =
                `<tr><td colspan='4' class='tbl-ftr'>
                    <span>
                        <input name='xselect' type="submit" class="x-select btn-dark-bg torn-btn" value="Select All">
                        <input name='xdeselect' type="submit" class="x-select btn-dark-bg torn-btn" value="Clear All">
                        <input name='xsavepreset' type="submit" class="x-preset btn-dark-bg torn-btn" value="Save">
                        <!-- span class='preset-wrap'><label>Presets:
                            <select name="presets" id="presets">
                                <option value="filterTable">Default</option>
                            </select>
                        </label></span -->
                    </span>
                    <span>
                        <label><input type='checkbox' name='enable-filter'>Enable Filtering</label>
                    </span>
                </td</tr>
                <tr><td>
                    <span class='preset-wrap'><label>Presets:
                        <select name="presets" id="presets">
                            <option value="filterTable">Default</option>
                        </select>
                    </label></span>
                </td</tr>`;

            return row;
        }

        function addFooterRow(tableDiv) {
            let row =
                `<tr><td colspan='4' class='tbl-ftr'>
                    <span>
                        <input name='xselect' type="submit" class="x-select btn-dark-bg torn-btn" value="Select All">
                        <input name='xdeselect' type="submit" class="x-select btn-dark-bg torn-btn" value="Clear All">
                        <input name='xrefresh' type="submit" class="x-refresh btn-dark-bg torn-btn" value="Refresh">
                        <input name='xsavepreset' type="submit" class="x-preset btn-dark-bg torn-btn" value="Save">
                        <span class='preset-wrap'><label>Presets:
                            <select name="presets" id="presets">
                                <option value="filterTable" disabled>-- none selected --</option>
                                <option value="default">Default</option>
                            </select>
                            <span id='rmv-preset'>X</span>
                        </label></span>
                    </span>
                    <span>
                        <label><input type='checkbox' name='enable-filter'>Enabled</label>
                        <span id='rst-btn'>R</span>
                    </span>
                </td</tr>`;

            $(tableDiv).find('tbody').append(row);

            debug("[addFooterRow] tablePresets: ", tablePresets);
            if (tablePresets.length) {
                tablePresets.forEach(entry => {
                    let opt = `<option class="cust-preset" value="${entry.val}">${entry.name}</option>`;
                    $(tableDiv).find('#presets').append(opt);
                });
            }
        }

        var stylesAdded = false;
        function addFilterStyles() {
            if (stylesAdded == true) return;
            stylesAdded = true;

            // table styles
            GM_addStyle(`
                #table-sort-select {
                    width: 110px;
                    margin-left: 10px;
                    border-radius: 4px;
                }
                #rst-btn {
                    width: 18px;
                    height: 18px;
                    border-radius: 18px;
                    background-color: red;
                    border: 1px solid black;
                    margin-left: 8px !important;
                    justify-content: center;
                    opacity: 0;
                    cursor: pointer;
                }
                #rst-btn:hover {
                    opacity: 1;
                }
                #rmv-preset {
                    width: 18px;
                    height: 18px;
                    border-radius: 4px;
                    margin-left: 8px !important;
                    justify-content: center;
                    cursor: pointer;

                    color: #EEE;
                    text-shadow: 0 0 5px #000;
                    background: linear-gradient(180deg, #111111 0%, #555555 25%, #333333 60%, #333333 78%, #111111 100%);
                    border: 1px solid #111;
                }
                #rmv-preset:hover {
                    /*opacity: 1;*/
                    filter: brightness(1.2);
                }
                #rst-btn:active {
                    transform: scale(0.9);
                    filter: brightness(0.8);
                    color: black;
                }
                .btnOn {border: 1px solid green;}
                .btnOff {border: 1px solid red;}
                #filter-opts {
                    padding: 10px;
                }

                #filter-opts > table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                    border-radius: 4px;
                }

                #filter-opts tbody {
                    background-color: black;
                }

                #filter-opts label {
                    display: flex;
                    flex-flow: row wrap;
                    align-content: center;
                    justify-content: left;
                }

                #filter-opts tr {
                    display: flex;
                }

                #filter-opts td {
                    display: flex;
                    flex-flow: row wrap;
                    justify-content: left;
                    align-content: center;
                    vertical-align: middle;
                    padding: 2px 0px 2px 10px;
                    width: 25%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    color: white;
                    border: 1px solid white;
                    padding: 10px 0px 10px 10px;
                }
                #filter-opts td.tbl-ftr {
                    width: 100%;
                    justify-content: space-between;
                    padding: 0px 10px 1px 10px;
                }
                #filter-opts td.tbl-ftr span:first-child {
                    display: flex;
                    align-content: center;
                    vertical-align: middle;
                    flex-flow: row wrap;
                }
                #filter-opts td.tbl-ftr span:last-child {
                    align-content: center;
                    display: flex;
                    flex-flow: row wrap;
                    margin-left: 30px;
                    font-size: 14px;
                }
                .preset-wrap {
                    align-content: center;
                    display: flex;
                    flex-flow: row wrap;
                    margin-left: 0px !important;
                }
                .tbl-ftr input[type=checkbox] {
                    transform: scale(1.5);
                }
                .tbl-ftr input[type=submit] {
                    margin: 1px 5px 1px 5px;
                }
                .tr-misc {

                }
                /* #st-select, */
                .xmselect {
                    margin: -4px 0px 0px 10px;
                    border-radius: 4px;
                }
                #presets {
                    margin: -4px 0px 0px 10px;
                    max-width: 214px;
                    width: 214px;
                    border-radius: 4px;
                }
                #presets > option {
                    overflow: hidden;
                }
                #filter-opts tr:hover {
                    /*background-color: #ddd;*/
                    filter: brightness(1.2);
                }
                #filter-opts td.tbl-ftr:last-child {
                    filter: brightness(1);
                }

                #filter-opts td:hover {
                    /*background-color: coral;*/
                    filter: brightness(1.6);
                }

                #filter-opts input[type=checkbox] {
                    margin-right: 10px;
                }
                .outliner {
                    outline: 41x solid red;
                    outline-offset: 0px;
                }

            `);

            // .trackhide, .pwdhide, .feehide, .longhide { display: none; }

            filterClasses.split(' ').forEach(name => { GM_addStyle(`.${name} { display: none; }`); });
        }
    }


    // =================== Called at page load ==============================

    function sortFilterInitCb() {
        addFilterBtn();
        addSortSupport();
        addFilterSupport();

        //hookCatBtns();
    }

    function hookCatBtns(retries=0) {
        if (!$("ul.categories > li").length) {
            if (retries++ < 100) return setTimeout(hookCatBtns, 250, retries);
            return log("[hookCatBtns] timed out...");
        }
        $("ul.categories > li").off('click.xedx');
        $("ul.categories > li").on('click.xedx', handleCatClick);
    }

    function handlePageLoad(retries=0) {
        debug("[handlePageLoad]", retries);
        if (location.href.indexOf('racing') < 0) {
            return log("Wrong page: ", location.href);
        }

        updateParams();
        hookCatBtns();

        // Experimental: car recomendations, official races
        if (doCarSuggest == true) {
            debug("Find wrap: ", $("#racingAdditionalContainer > div.enlist-wrap.enlisted-wrap"));
            if ($("#racingAdditionalContainer > div.enlist-wrap.enlisted-wrap").length) {
                setBestCarSelection();
            } else {
                setTimeout(setBestCarSelection, 500);
            }
        }

        addSortFilterAttrs(0, sortFilterInitCb);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    //addFilterBtn(0, true);

    callOnContentLoaded(handlePageLoad);
    callOnContentComplete(hookButtons);

    function addStyles() {
        if (doCarSuggest == true)
            addSuggestionStyles();
        addFlexStyles();
        loadCommonMarginStyles();
        addTornButtonExStyles();
        addToolTipStyle();

        GM_addStyle(`
            .xsrtbtn {
                cursor: pointer;
            }
            .xsrtbtn:hover {
                background: linear-gradient(180deg,#333,#000);
            }
            .xr-opts {
                margin-left: auto;
                float: right;
                align-content: center;
            }
            .xr-opts label {
                font-family: arial;
                font-size: 14px;
            }
        `);
    }


})();
