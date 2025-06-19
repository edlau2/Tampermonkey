// ==UserScript==
// @name         Torn Raceway Sorting
// @namespace    http://tampermonkey.net/
// @version      1.14
// @description  Allows sorting of custom races by start time
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=racing*
// @match        https://www.torn.com/page.php?sid=racing*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
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

    if (location.href.indexOf('racing') < 0) return log("Not at the raceway! (", location.href, ")");

    const getCustRaceWrap = function () {return $(".custom-events-wrap");}
    const hasCustRaceWrap = function () {return $(".custom-events-wrap").length > 0;}

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    const doCarSuggest = false;

    let val = GM_getValue("curr_ver", 0);
    if (parseFloat(val) < 1.13) GM_deleteValue("filterTable");

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
        let matches = $(".events-list > li");
        let attr = what; //'data-startTime';
        let order = (prevOrder == 0) ? 'asc' : 'desc';
        prevOrder = (prevOrder == 0) ? 1 : 0;
        tinysort(matches, {attr: attr, order: order});
    }

    var inClick = false;
    function resetClickFlag() {inClick = false;}
    function handleBtnClick(e) {
        let target= $(e.currentTarget);
        debug("handleBtnClick: ", $(target));
        if (inClick == true) return false;
        inClick = true;
        let attr;
        if ($(target).hasClass('track')) attr = "data-track";
        if ($(target).hasClass('startTime')) attr = "data-startTime";
        if (!attr) {
            debug("ERROR: invalid click!");
            debugger;
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

    function addSortAttrs() {
        let rootLis = $(".events-list > li");
        for (let idx=0; idx<$(rootLis).length; idx++) {
            let li = $(rootLis)[idx];
            let startTimeNode = $(li).find(".startTime");
            let timeText = $(startTimeNode).text();
            let timeSecs = parseTextTime(timeText);

            if (isNaN(timeSecs)) {
                debug("NaN!!! '", timeText, "' ", $(li), $(startTimeNode));
                debugger;
            }

            let tnode = $(li).find(".track");
            let track = $(tnode).text();

            $(li).attr("data-startTime", timeSecs);
            $(li).attr("data-track", track);
        }
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

        addSortAttrs();
    }

    // =================== End Sort Support ==============================

    // ==================== Filtering support ============================

    var filterEnabled = GM_getValue("filterEnabled", true);

    const defFilterTable = {
        tracks: {
            "Uptown": {}, "Commerce": {}, "Withdrawal": {}, "Underdog": {},
            "Parkland": {}, "Docks": {}, "Two Islands": {}, "Industrial": {},
            "Vector": {}, "Mudpit": {}, "Hammerhead": {}, "Sewage": {}, 
            "Meltdown": {}, "Speedway": {}, "Stone Park": {}, "Convict": {}
        },
        misc: {
            "Allow Password": { enabled: true, sel: `protected`, class: 'pwdhide' },
            "Allow Fees": { enabled: true, filter: 'feeFilter', class: 'feehide' },
            "Allow Long Races": { enabled: true, filter: "longFilter", class: 'longhide' },
        }
    };

    // 'Live' filtering definitions
    var filterTable = {};

    function saveFilterTable() {
        GM_setValue("filterTable", JSON.stringify(filterTable));
    }

    const trackList = () => {return filterTable.tracks;}
    function getAllowedTracks() {
        let res = [], keys = Object.keys(trackList());
        for (let idx=0; idx<keys.length; idx++) {
            if (trackList()[keys[idx]].enabled == true)
                res.push(trackList()[keys[idx]]);
        }
        return res;
    }

    // any car or any class
    // li > div.event-header.left > ul > li.car  .t-hide is 'any car', 'any class', any C class', etc

    // # drivers (x / y)
    // li > div.acc-body > div > div.event-wrap.left > ul > li.drivers >

    function addFilterSupport(retries=0) {
        if ($("#filter-opts").length > 0) return;
        let root = $("#racingAdditionalContainer > div.start-race");
        if ($(root).length == 0) {
            if (retries++ < 20) return setTimeout(addFilterSupport, 250, retries);
            return log("[addFilterSupport] timeout: ", retries);
        }

        openFilterTable();
        addFilterBtn();

        function openFilterTable() {
            log("[openFilterTable]");
            filterTable = JSON.parse(GM_getValue("filterTable", JSON.stringify({})));
            log("table: ", filterTable);
            if (!filterTable || !Object.keys(filterTable).length) { // Never savd, use default
                filterTable = JSON.parse(JSON.stringify(defFilterTable));
                let keys = Object.keys(filterTable.tracks);
                log("Track keys: ", keys);
                for (let idx=0; idx<keys.length; idx++) {
                    let entry = filterTable.tracks[keys[idx]];
                    entry.enabled = true;

                    let parts = keys[idx].split(' '); //[0].substring[1];
                    let name = parts[0];
                    let aka = name.substring(1);
                    log("key: ", keys[idx], " parts: ", parts, " name: ", name, " aka: ", aka);
                    entry.aka = aka; //keys[idx].split(' ')[0].substring[1];
                }
                log("filterTable: ", filterTable);
                saveFilterTable();
                filterTable = JSON.parse(GM_getValue("filterTable", JSON.stringify(filterTable)));
            }
        }
    }

    // =================== Build the filter UI table ========================

    const filterClasses = "trackhide pwdhide feehide longhide";

    // Option change handlers - these seem the same...merge
    function getList(entry) {
        let list;
        if (entry.sel) {
            list = $(`.events-list > .${entry.sel}`);
            return $(list);
        }
        if (entry.filter) {
            switch (entry.filter) {
                case "feeFilter": {
                    list = $("ul.event-info > li.fee").not(":contains('$0')").closest('[data-track]');
                    return $(list);
                }
                case "longFilter": {
                    list = $(`.events-list > .long-time`).closest('[data-track]');
                    return $(list);
                }
                default: {
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

    function handleMiscOptChange(e) {
        if (filterEnabled == false) return;
        let key = $(this).attr('name');
        let checked = $(this).prop('checked');
        let entry = filterTable.misc[key];
        entry.enabled = checked;
        saveFilterTable();

        let list = getList(entry);
        if (checked == true) {
            $(list).removeClass(entry.class);
        } else {
            $(list).addClass(entry.class);
        }
    }

    function handleSelects(e) {
        if (filterEnabled == false) return;
        let checked = $(this).attr("name") == "xselect" ? true : false;
        $(".xtrack").prop('checked', checked);

        if (checked == true)
            $(".xtrack").closest('[data-track]').removeClass("trackhide");
        else
            $(".xtrack").closest('[data-track]').addClass("trackhide");

        let keys = Object.keys(filterTable.tracks);
        for (let idx=0; idx<keys.length; idx++) {
            filterTable.tracks[keys[idx]].enabled = checked;
        }
        saveFilterTable();

        applyAllFilters(true);
    }

    function handleEnableOnOff(e) {
        filterEnabled = $(this).prop('checked');
        GM_setValue("filterEnabled", filterEnabled);

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

    function applyAllFilters(forced = false) {
        if (filterEnabled == false && forced == false) return;

        $(".xtrack").each(function (idx, el) {
            log("this: ", $(this));
            log("name: ", filterTable.tracks[$(this).attr('name')]);
            log("on: ", filterTable.tracks[$(this).attr('name')].enabled);

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
    }

    function installOptTable() {
        log("[installOptTable]");
        let optTable = getFilterOptsDiv();

        log("optTable: ", $(optTable));
        log("race wrap: ", $("#xraceWrap"));

        let root = $("#racingAdditionalContainer > div.start-race");
        log("root: ", $(root));

        $(root).append(optTable);

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

        $(".tbl-ftr input[type='submit']").on('click', handleSelects);
        $(".tbl-ftr [name='enable-filter']").on('change', handleEnableOnOff);
    }

    function addFilterBtn(retries=0) {
        if ($("#xfilt-btn").length > 0) return;
        let btnWrap = $($("#racingAdditionalContainer  .cont-black.bottom-round")[0]).find(".btn-wrap");
        if (!$(btnWrap).length) {
            if (retries++ < 50) return setTimeout(addFilterBtn, 250, retries);
            return log("[addFilterBtn] timed out!");
        }
        let myWrap = `<div id="xraceWrap" class="xflexr" style="width: 100%;  justify-content: space-between;"></div>`;
        $(btnWrap).wrap(myWrap);

        let sep = `<div class="sep"></div>`;
        // btn-action-tab
        let btn = `<div class="btn-wrap silver c-pointer"><a id='xfilt-btn' class="btn torn-btn btn-dark-bg">Filters (on)</a></div>`;
        $("#xraceWrap").append(btn);
        $("#xraceWrap").after(sep);
        $("#xfilt-btn").on('click', doFilterOpen);

        var detachedTable;
        function doFilterOpen(e) {
            if (!detachedTable && !$("#filter-opts").length) {
                installOptTable();
                return;
            }

            let root = $("#racingAdditionalContainer > div.start-race");
            let newHeight = "175px";
            let closing = false;
            log("[doFilterOpen]: ", $("#filter-opts").length, $("#filter-opts").css("height"), $("#filter-opts").hasClass('xf-open'));
            log("[doFilterOpen]: ", $("#filter-opts"));
            if ($("#filter-opts").hasClass('xf-open')) {
                newHeight = "0px";
                closing = true;
            } else {
                $(root).append(detachedTable);
            }

            log("[doFilterOpen] closing: ", closing, " newH: ", newHeight);
            log("[doFilterOpen]: ", $("#filter-opts"));

            $("#filter-opts").animate({
                height: newHeight
            }, 200, function() {
                if (closing == true) {
                    $("#filter-opts").removeClass('xf-open');
                    detachedTable = $("#filter-opts").detach();
                } else {
                    $("#filter-opts").addClass('xf-open');
                }
            });

        }
    }

    // After table, add div with 'select/deselect all' and general 'enable/disable' option
    var tblHeight = "221";
    function getFilterOptsDiv() {
        let filterOptDiv = $(`<div id="filter-opts" /*style="height: ${tblHeight}px;"*/ class='xf-open cont-black'><table><tbody></tbody></table></div>`);

        addFilterStyles();
        addTrackRows(filterOptDiv);
        addMiscOptionRows(filterOptDiv);
        addFooterRow(filterOptDiv);

        log("Built filter div, height: ", $(filterOptDiv).height());
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
            // go item by item, add a TD, end row if %4 = 0, if over add %4 empty td's
            let keys = Object.keys(filterTable.misc);
            let row = `<tr>`, idx = 0;
            for (idx=0; idx<keys.length; idx++) {
                let key = keys[idx];
                let entry = filterTable.misc[key];
                row = row + `<td><label><input class='xmisc' type='checkbox' name='${key}'>${key}</label></td>`;
                if ((idx > 0) && (idx % 3 == 0) && (idx != keys.length - 1)) row = row + `</tr><tr>`;
            }
            for (let i=0; i<(4 - (keys.length % 4)); i++) row = row + `<td></td>`;
            row = row + `</tr>`;

            $(tableDiv).find('tbody').append(row);
        }

        //  xedx-torn-btn-raw
        function addFooterRow(tableDiv) {
            let row =
                `<tr><td colspan='4' class='tbl-ftr'>
                    <span>
                        <input name='xselect' type="submit" class="btn-dark-bg torn-btn" value="Select All">
                        <input name='xdeselect' type="submit" class="btn-dark-bg torn-btn" value="Clear All">
                    </span>
                    <span>
                        <label><input type='checkbox' name='enable-filter'>Enable Filtering</label>
                    </span>
                </td</tr>`;

            $(tableDiv).find('tbody').append(row);
        }

        var stylesAdded = false;
        function addFilterStyles() {
            if (stylesAdded == true) return;
            stylesAdded = true;

            // table styles
            GM_addStyle(`
                #filter-opts {
                    padding: 10px;
                    /* background-color: #666; */
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
                    /*flex-flow: row wrap;
                    justify-content: space-between;*/
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
                #filter-opts td.tbl-ftr span:last-child {
                    align-content: center;
                    display: flex;
                    flex-flow: row wrap;
                    margin-left: 50px;
                    font-size: 14px;
                }
                .tbl-ftr input[type=checkbox] {
                    transform: scale(1.5);
                }
                .tbl-ftr input[type=submit] {
                    margin: 0px 10px 0px 10px;
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

                .trackhide, .pwdhide, .feehide, .longhide { display: none; }
            `);
        }
    }


    // =================== Called at page load ==============================

    function handlePageLoad(retries=0) {

        debug("[handlePageLoad]", retries);

        if (location.href.indexOf('racing') < 0) {
            return log("Wrong page: ", location.href);
        }

        // Experimental: car recomendations, official races
        if (doCarSuggest == true) {
            log("Find wrap: ", $("#racingAdditionalContainer > div.enlist-wrap.enlisted-wrap"));
            if ($("#racingAdditionalContainer > div.enlist-wrap.enlisted-wrap").length) {
                setBestCarSelection();
            } else {
                setTimeout(setBestCarSelection, 500);
            }
        }

        //addFilterOpts();

        addSortSupport();

        addFilterSupport();

        $("ul.categories > li").off('click.xedx');
        $("ul.categories > li").on('click.xedx', handleCatClick);
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

    callOnContentLoaded(handlePageLoad);
    callOnContentComplete(hookButtons);

    function addStyles() {
        addFlexStyles();
        loadCommonMarginStyles();
        addTornButtonExStyles();

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