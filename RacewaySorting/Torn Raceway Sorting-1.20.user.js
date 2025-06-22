// ==UserScript==
// @name         Torn Raceway Sorting
// @namespace    http://tampermonkey.net/
// @version      1.20
// @description  Allows sorting of custom races by start time
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
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const resetTableVal = 1.20;

    if (location.href.indexOf('racing') < 0) return log("Not at the raceway! (", location.href, ")");

    const getCustRaceWrap = function () {return $(".custom-events-wrap");}
    const hasCustRaceWrap = function () {return $(".custom-events-wrap").length > 0;}

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    const doCarSuggest = false;
    const filtOnColor = GM_getValue("filtOnColor", "#119C11");     // Maybe find Torn colors for green/red?
    const filtOffColor = GM_getValue("filtOffColor", "#C61B1B");
    GM_setValue("filtOnColor", filtOnColor);
    GM_setValue("filtOffColor", filtOffColor);

    let val = GM_getValue("curr_ver", 0);
    if (parseFloat(val) < parseFloat(resetTableVal))
        clearFilterStorage();

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
        "uptown": "(T) Lambrini Torobravo (LR)(T3)",
        "commerce": "(T) Edomondo NSX (SR)(T2)",
        "withdrawal": "(T) Veloria LFA (LR)(T3)",
        "underdog": "(T) Edomondo NSX (SR)(T2)",
        "parkland": "(D) Edomondo NSX (SR)(T3)",
        "docks ": "(T) Volt GT (LR) (T3)",
        "two islands": "(D) Edomondo NSX (LR)(T3)",
        "industrial": "(T) Edomondo NSX (SR) (T3)",
        "vector": "(T) Edomondo NSX (SR) (T3)",
        "mudpit": "(D) Colina Tanprice (LR) (T3)",
        "hammerhead": "(D) Edomondo NSX (SR) (T2)",
        "sewage": "(T) Edomondo NSX (SR) (T2)",
        "meltdown": "(T) Edomondo NSX (SR) (T3)",
        "speedway": "(T) Veloria LFA (LR) (T3)",
        "stone park": "(D) Echo R8 (SR) (T3)",
        "convict": "(T) Mercia SLR (LR) (T3)"
    };

    var carSuggested = false;
    function setBestCarSelection(retries=0) {
        if (carSuggested == true) {
            log("[setBestCarSelection] Already suggested!!!");
            return;
        }
        if (retries == 0) {
            debug("[setBestCarSelection] container: ", $("#racingAdditionalContainer"));
        }

        let hdr = $("#racingAdditionalContainer > div.enlist-wrap.enlisted-wrap > .enlisted-btn-wrap"); //[0];
        if (!$(hdr).length) hdr = $("#racingAdditionalContainer > div.enlist-wrap.enlisted-wrap > div:nth-child(2) > div");
        if (!$(hdr).length) {
            if (retries++ < 30) return setTimeout(setBestCarSelection, 250, retries);
            log("timed out, btn-wrap: ", $(".enlisted-btn-wrap"));
            return log("[setBestCarSelection] timed out...");
        }
        log("[setBestCarSelection] hdr: ", $(hdr), " hdr0: ", $($(hdr)[0]));

        hdr = $(hdr)[0];
        let text = $(hdr).text();
        let parts = text ? text.split('-') : null;
        let track = parts ? parts[0].trim().toLowerCase() : null;
        let suggested = track_cars[track];

        log("Text: ", text, " parts: ", parts, " Track: ", track, " suggested: ", suggested);

        if (text && suggested) {
            carSuggested = true;
            $(hdr).text(text + " > " + suggested);
        }
    }

    function hookButtons() {
        let raceBtn = $("#racingMainContainer > div > div.header-wrap.border-round > ul > li > a[tab-value='race']");
        $(raceBtn).on('click', handleOffRaceBtn);
        log("[hookButtons] race: ", $(raceBtn));

        function handleOffRaceBtn(e, retries=0) {
            let btn = $("#xraceWrap > div.btn-wrap > a[tab-value='race']");
            log("[handleOffRaceBtn]: ", $(btn).length, retries);
            if (!$(btn).length) {
                if (retries++ < 20) return setTimeout(handleOffRaceBtn, 200, e, retries);
                return log("[handleOffRaceBtn] time out");
            }
            $(btn).on('click', setBestCarSelection);
        }

    }

    // ==================== Sorting support ==================================

    var prevOrder = 0;
    function doSort(what) {
        debug("Sorting on ", what);
        let matches = $(".events-list > li");
        let attr = what; //'data-startTime';
        let order = (prevOrder == 0) ? 'asc' : 'desc';
        prevOrder = (prevOrder == 0) ? 1 : 0;
        debug("Order: ", order, " sort list: ", $(matches));
        tinysort(matches, {attr: attr, order: order});
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
        if ($(target).hasClass('track')) attr = "data-track";
        if ($(target).hasClass('startTime')) attr = "data-startTime";
        debug("[sort] attr: ", attr);
        if (!attr) {
            setTimeout(resetClickFlag, 500);
            debug("ERROR: invalid click!");
            //debugger;
            return;
        }
        doSort(attr);
        setTimeout(resetClickFlag, 500);
        return false;
    }

    function ifThisIsntUsed() {
        function handleStartTimeClick(e) {
            let target= $(e.currentTarget);
            debug("handleStartTimeClick: ", $(target));
            if (inClick == true) return false;
            inClick = true;
            doSort('data-startTime');
            setTimeout(resetClickFlag, 500);
            return false;
        }
        function handleTrackClick(e) {
            debug("handleTrackClick");
            if (inClick == true) return false;
            inClick = true;
            doSort('data-track');
            setTimeout(resetClickFlag, 500);
            return false;
        }
    }

    function handleCatClick(e) {
        let target = e ? $(e.currentTarget) : null;
        let page = $(target).find("a").attr("tab-value");
        debug("handleCatClick: ", page, $(target));

        setTimeout(handlePageLoad, 250);
    }

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

    function addSortFilterAttrs(retries, callback) {
        let rootLis = $(".events-list > li");

        if ($(rootLis).length == 0) {
            if (retries++ < 100) return setTimeout(addSortFilterAttrs, 250, retries, callback);
            return log("[addSortFilterAttrs] timed out!");
        }

        for (let idx=0; idx<$(rootLis).length; idx++) {
            let li = $(rootLis)[idx];
            let startTimeNode = $(li).find(".startTime");
            let timeText = $(startTimeNode).text();
            let timeSecs = parseTextTime(timeText);

            if (isNaN(timeSecs)) {
                debug("NaN!!! '", timeText, "' ", $(li), $(startTimeNode));
                debugger;
            }

            $(li).attr("data-startTime", timeSecs);

            let tnode = $(li).find(".track");
            let lnode = $(tnode).find(".laps");

            let track = $(tnode).text().trim().replaceAll(/\s+/g, ' ').split('(')[0];
            let laps = $(lnode).text().trim().split(' ')[0].replace('(', '');

            if (track.length) $(li).attr("data-track", track.trim());
            if (laps.length) $(li).attr("data-laps", laps);
        }

        if (callback) callback();
    }

    function addSortSupport(retries=0) {
        // Get the start time col header
        let startTimeBtn = $("li.startTime.title-divider");
        let trackBtn = $("li.track.title-divider");
        if ($(startTimeBtn).length == 0 && $(trackBtn).length == 0) {
            if (retries++ < 20) return setTimeout(addSortSupport, 250, retries);
            return debug("[addSortSupport] timeout: ", $(startTimeBtn).length, $(trackBtn).length);
        }

        $(trackBtn).addClass("xsrtbtn");
        $(startTimeBtn).addClass("xsrtbtn");

        $(".xsrtbtn").on('click.xedx', handleBtnClick);

        //addSortAttrs();
    }

    // ==================== Filtering support ============================

    var filterEnabled = GM_getValue("filterEnabled", true);
    var activeTable = GM_getValue("activeTable", "filterTable");
    var tablePresets = JSON.parse(GM_getValue("tablePresets", JSON.stringify( [] )));
    var activeIsPreset = (activeTable != "filterTable");

    log("activeTable: ", activeTable);
    log("tablePresets: ", tablePresets);

    function clearFilterStorage() {
        GM_deleteValue("filterTable");
        GM_deleteValue("activeTable");
        tablePresets = JSON.parse(GM_getValue("tablePresets", JSON.stringify( [] )));
        tablePresets.forEach(name => { GM_deleteValue(name); });
        GM_deleteValue("tablePresets");
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
            "No Long Races (25+ laps)":
                { enabled: false, sel: "long-time", inverted: true, class: 'longhide', id: "xnolong", ckId: "x100only" },
            "100 Laps Only":
                { enabled: false, filterFn: "shortFilter", class: 'shorthide', id: "x100only", ckId: "xnolong" },
        }
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
        let res = []; //, keys = Object.keys(trackList());
        //for (let idx=0; idx<keys.length; idx++) {
        for (let [key, entry] of Object.entries(trackList())) {
            debug("[getAllowedTracks] ", key, entry);
            //if (trackList()[keys[idx]].enabled == true)
            //    res.push(trackList()[keys[idx]]);
            if (entry.enabled == true)
                res.push(entry);
        }
        return res;
    }

    function openFilterTable(tableName = activeTable, initializing) {
        log("[openFilterTable] opening ", tableName);
        filterTable = JSON.parse(GM_getValue(tableName, JSON.stringify({})));
        if (!filterTable || !Object.keys(filterTable).length) { // Never savd, use default
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
            log("initializing, applying filters for ", activeTable);
            applyAllFilters(false, initializing);
        }
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
        "x-preset": {sel: "input.x-preset", text: "Save the current set of filters\nas a prest favorite." },
    }

    const filterClasses = "trackhide pwdhide feehide longhide shorthide";

    function getList(entry) {
        let list;
        if (entry.sel) {
            list = $(`.events-list > .${entry.sel}`);
            log("[getList] selector: ", entry.sel, " list: ", $(list), " class: ", entry.class);
            return $(list);
        }
        if (entry.filterFn) {
            switch (entry.filterFn) {
                case "feeFilter": {
                    list = $("ul.event-info > li.fee").not(":contains('$0')").closest('[data-track]');
                    return $(list);
                }
                case "shortFilter": {
                    list = $(".events-list > li").not("[data-laps='100']");
                    return $(list);
                }
                case "laps": {
                    //list = $("ul.event-info li.track > .laps")
                    //ul > li:nth-child(16) > div.event-header.left > ul > li.track > span
                    break;
                }
                default: {
                    debug("Filter fn ", entry.filterFn, " not found for entry ", entry);
                    debugger;
                }
            }
            return {};
        }
        debugger;
        return {};
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
        let entry;
        for (let idx=0; idx<miscKeys.length; idx++) {
            entry = filterTable.misc[miscKeys[idx]];
            if (entry.id == ckId) break;
            entry = null;
        }
        if (entry) {
            entry.enabled = false;
            $(`#${entry.id}`).prop('checked', false);
            $("ul.events-list > li").removeClass(entry.class);
        }
    }

    function handleMiscOptChange(e) {
        if (e) e.preventDefault();
        if (e) e.stopPropagation();

        if (filterEnabled == false) return;
        let key = $(this).attr('name');
        let checked = $(this).prop('checked');
        let entry = filterTable.misc[key];
        entry.enabled = checked;

        saveFilterTable();

        let list = getList(entry);
        if (checked == true) {
            entry.inverted ? $(list).addClass(entry.class) : $(list).removeClass(entry.class);
        } else {
            entry.inverted ? $(list).removeClass(entry.class) : $(list).addClass(entry.class);
        }

        if (entry.ckId && checked == true)
            toggleOtherEntry(entry, entry.ckId, checked);
    }

    function handleSelects(e) {
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

    function applyAllFilters(forced = false, init) {
        debug("Applying filter table. forced? ", forced, " enabled? ", filterEnabled, " init? ", init, " table: ", activeTable);
        debug("List len: ", $(`ul.events-list > li`).length);
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
            let checked = entry.enabled;
            $(this).prop('checked', checked);

            let list = getList(entry);
            if (checked == true) {
                $(list).removeClass(entry.class);
            } else {
                $(list).addClass(entry.class);
            }
        });

        if (init == true) $("#dummyDiv").remove();
    }

    function savePreset(e) {
        log("[savePreset]");

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
            log("Saving as new entry");
            let val = 'preset_' + tablePresets.length;
            let entry = {val: val, name: name};
            tablePresets.push(entry);
            GM_setValue("tablePresets", JSON.stringify(tablePresets));

            activeTable = val;
            activeIsPreset = false;
            saveFilterTable();

            let opt = `<option value="${entry.val}">${entry.name}</option>`;
            $('#presets').append(opt);
            $('#presets').val(activeTable);
        } else if (name == defName) {
            log("Saving active table");
            activeIsPreset = false;
            saveFilterTable();
        } else {
            log("Not saving? name: ", name, " def: ", defName, " exists: ", exists);
        }
    }

    function handlePresetSelect(e) {
        let tableVal = $(this).val();
        openFilterTable(tableVal);
        applyAllFilters();
    }

    function handleRemovePreset(e) {
        let find = $(this).val();
        log("[handleRemovePreset]: ", find);

        for (let idx=0; idx<tablePresets.length;idx++) {
            let entry = tablePresets[idx];
            if (entry.val == find) {
                log("Removing entry: ", entry);
                tablePresets.slice(idx, 1);
                GM_setValue("tablePresets", JSON.stringify(tablePresets));
                GM_deleteValue($(this).val());
                break;
            }
        }
    }

    var tblHeight = "221"; // dynamic
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
        } else {
            $(".xtrack").attr("disabled", "true");
            $(".xmisc").attr("disabled", "true");
            $(`.events-list > li`).removeClass(`${filterClasses}`);
        }

        $(".xtrack").on('change', handleTrackSelect);
        $(".xmisc").on('change', handleMiscOptChange);

        $(".tbl-ftr input.x-select").on('click', handleSelects);
        $(".tbl-ftr input.x-preset").on('click', savePreset);

        $("#rst-btn").on('click', clearFilterStorage);

        displayHtmlToolTip(tooltips["rst-btn"].sel, tooltips["rst-btn"].text, "tooltip5");
        displayHtmlToolTip(tooltips["xselect"].sel, tooltips["xselect"].text, "tooltip5");
        displayHtmlToolTip(tooltips["xdeselect"].sel, tooltips["xdeselect"].text, "tooltip5");
        displayHtmlToolTip(tooltips["x-preset"].sel, tooltips["x-preset"].text, "tooltip5");

        $("#presets").off();
        $("#presets").on('change', handlePresetSelect);
        //$('#presets option[value="default"]').attr("disabled", true);
        //if (activeTable != "filterTable") {
            $('#presets').val(activeTable);
        //}

        $("#presets > option").on('contextmenu', handleRemovePreset);

        $(".tbl-ftr [name='enable-filter']").on('change', handleEnableOnOff);
    }

    function setFilterBtnState() {
        let btnState = filterEnabled ? "on" : "off";
        let btnColor = filterEnabled ? filtOnColor : filtOffColor;
        $("#xfilt-btn").attr("style", `border: 1px solid ${btnColor}; color: ${btnColor};`);
        $("#xfilt-btn").text(`Filters (${btnState})`);
    }

    var inInit = false;
    var currRetries = 0;
    var pendedRetry;
    function addFilterBtn(retries=0, init) {
        if ($("#xfilt-btn").length > 0) return;
        if (inInit == true && !init) {
            if (pendedRetry) return;
            pendedRetry = setTimeout(addFilterBtn, ((100 - currRetries) * 250));
            return;
        }

        if (init == true) {
            inInit = true;
            currRetries = retries;
        }
        let btnWrap = $(".messages-race-wrap.start-race > div.bottom-round > .btn-wrap");
        //let btnWrap = $($("#racingAdditionalContainer  .cont-black.bottom-round")[0]).find(".btn-wrap");
        if (!$(btnWrap).length) {
            if (retries++ < (inInit == true ? 100 : 50)) return setTimeout(addFilterBtn, 250, retries, inInit);
            inInit = false;
            return log("[addFilterBtn] timed out!");
        }
        log("[addFilterBtn] retries: ", retries);
        if (pendedRetry) clearTimeout(pendedRetry);
        pendedRetry = null;
        let myWrap = `<div id="xraceWrap" class="xflexr" style="width: 100%;  justify-content: space-between;"></div>`;
        $(btnWrap).wrap(myWrap);

        let sep = `<div class="sep"></div>`;
        let btnState = filterEnabled ? "on" : "off";
        let initClass = filterEnabled ? "btnOn" : "btnOff";
        let btn =
            `<div class="btn-wrap silver c-pointer">
                <a id='xfilt-btn' class="btn torn-btn btn-dark-bg ${initClass}">Filters (${btnState})</a></div>`;
        $("#xraceWrap").append(btn);
        $("#xraceWrap").after(sep);
        $("#xfilt-btn").on('click', doFilterOpen);
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

        function addMiscOptionRows(tableDiv) {
            let keys = miscKeys;
            let row = `<tr>`, idx = 0;
            for (idx=0; idx<keys.length; idx++) {
                let key = keys[idx];
                let entry = filterTable.misc[key];
                let optId = entry.id ? `id="${entry.id}"`: '';
                row = row + `<td><label><input ${optId} class='xmisc' type='checkbox' name='${key}'>${key}</label></td>`;
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
                        <input name='xsavepreset' type="submit" class="x-preset btn-dark-bg torn-btn" value="Save">
                        <span class='preset-wrap'><label>Presets:
                            <select name="presets" id="presets">
                                <option value="filterTable">Default</option>
                            </select>
                        </label></span>
                    </span>
                    <span>
                        <label><input type='checkbox' name='enable-filter'>Enable Filtering</label>
                        <span id='rst-btn'>R</span>
                    </span>
                </td</tr>`;

            $(tableDiv).find('tbody').append(row);

            debug("[addFooterRow] tablePresets: ", tablePresets);
            if (tablePresets.length) {
                tablePresets.forEach(entry => {
                    let opt = `<option value="${entry.val}">${entry.name}</option>`;
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
                    margin: 1px 10px 1px 5px;
                }
                .tr-misc {

                }
                #presets {
                    margin: -4px 0px 0px 10px;
                    max-width: 234px;
                    width: 234px;
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

        $("ul.categories > li").off('click.xedx');
        $("ul.categories > li").on('click.xedx', handleCatClick);

    }

    function handlePageLoad(retries=0) {

        log("[handlePageLoad]", retries);

        if (location.href.indexOf('racing') < 0) {
            return log("Wrong page: ", location.href);
        }

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

        /*
        addFilterBtn();
        addSortSupport();
        addFilterSupport();

        $("ul.categories > li").off('click.xedx');
        $("ul.categories > li").on('click.xedx', handleCatClick);
        */
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

    addFilterBtn(0, true);

    callOnContentLoaded(handlePageLoad);
    callOnContentComplete(hookButtons);

    function addStyles() {
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
