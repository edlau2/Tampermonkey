// ==UserScript==
// @name         Torn OC Sort
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Sort crimes in planning by time remaining
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    // Extra debug logging, for development
    const logFullApiResponses = GM_getValue("logFullApiResponses", false);
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    GM_setValue("logFullApiResponses", logFullApiResponses);
    GM_setValue("debugLoggingEnabled", debugLoggingEnabled);

    const keepLastStateKey = "keepLastState";
    const lastStateKey = "lastState";
    const stateOpen = "visible";
    const stateClosed = "hidden";

    // Can edit this, but there's a hidden checkbox for it.
    var keepLastState = GM_getValue(keepLastStateKey, false);
    var lastState = GM_getValue(lastStateKey, stateClosed);

    // Will reset at page refresh, not permanent cache
    const cacheCompletedCrimes = true;

    // Not used yet...

    const userId = getThisUserId();

    const xedxDevMode = false; //(userId == 2100735);
    const enableReadyAlert = false;

    debug("keepLastState: ", keepLastState, " lastState: ", lastState);

    const recruitingIdx = 0;
    const planningIdx = 1;
    const completedIdx = 2;

    var scenarios;
    var listRoot;        // root div above scenarios
    var scrollTimer;
    var sortTimer;

    const isOcPage = function () {return location.hash ? (location.hash.indexOf("tab=crimes") > -1) : false;}
    const hashChangeHandler = function () {handlePageLoad();}
    const btnIndex = function () {return $("#faction-crimes [class^='buttonsContainer_'] > [class*='active_']").index();}
    const pageBtnsList = function () {return $("#faction-crimes [class^='buttonsContainer_'] button");}
    const isSortablePage = function () {return (btnIndex() == 1) ? true : false;}
    const sortPage = function () {tagAndSortScenarios();}
    const getPlannedCrimes = function () { doFacOcQuery('planning'); }
    const getRecruitingCrimes = function () { doFacOcQuery('recruiting'); }
    //const hideCompletedBtn = function () {$("#xcsvbtn").addClass("vhide"); }


    function logCurrPage() {
        let idx = btnIndex();
        let page = (idx == 0 ? "Recruiting" : idx == 1 ? "Planning" : idx == 2 ? "Completed": "Unknown");
        debug("On index ", idx, " page is '", page, "'", " sortable? ", isSortablePage());
    }

    function handlePageChange() {
        logCurrPage();
        switch (btnIndex()) {
            case recruitingIdx:
                return;
            case planningIdx:
                sortPage();
                return;
            case completedIdx:
                debug("**** getCompletedCrimes ****");
                getCompletedCrimes();
                installCompletedPageButton(true);
                return;
        }

        log("ERROR: Unknown page, idx = ", btnIndex(), " sortable? ", isSortablePage(), " (",
           recruitingIdx, "|", planningIdx, "|", completedIdx);
    }


    function sortList() {
        let grandparent = $(scenarios).parent().parent();
        let list = $(grandparent).children("[class^='wrapper_']");
        tinysort($(list), {attr:'data-time'});
        //tinysort($(scenarios), {attr:'data-time'});
    }

    function pageBtnClicked(e) {
        debug("pageBtnClicked, idx: ", btnIndex(), "|", e);

        if (btnIndex() != completedIdx) {
            $("#xcsvbtn").addClass("vhide");
            //hideCompletedBtn();
        }

        logCurrPage();
        handlePageChange();
    }

    function addPageBtnHandlers() {
        let list = pageBtnsList();
        $(pageBtnsList).on('click', pageBtnClicked);
    }

    // Compare two arrays: see what is in array1 but not in array2
    function arrayDiff(array1, array2) {
        const result = array1.filter(obj1 =>
          !array2.some(obj2 => obj1 === obj2)
        );
        return result;
    }

    // Make yourself easier to spot on the page.
    function highlightSelf() {
        let me = $(`a[class^="slotMenu"][href*="XID=${userId}"]`);
        let wrapper = $(me).closest("[class^='wrapper_']");
        $(wrapper).addClass("xoc-myself");
    }

    // Do the sorting
    var doSort = true;
    var hasBeenSorted = false;

    // Debugging aid
    var colorIndex = 0;
    var colors = ["red", "yellow", "blue", "white", "aqua", "blueviolet", "chocolate",
                  "cyan", "darkblue", "crimson", "darkorange", "darkseagreen", "darkorchid",
                  "deeppink", "indigo", "lawngreen"];
    function nextColor() {
        if (++colorIndex == colors.length) colorIndex = 0;
        return colors[colorIndex];
    }

    function tagAndSortScenarios() {
        if (!isSortablePage()) {
            debug("This page isn't sortable (by definition)");
            logCurrPage();
            return;
        }

        scenarios = $("[class^='scenario_']");
        let listRoot = $($(scenarios)[0]).parent().parent();

        for (let idx=0; idx<$(scenarios).length; idx++) {
            let scenario = $(scenarios)[idx];
            let elem = $(scenario).find("[class^='wrapper_'] > div > p")[0];
            let text = $(elem).text();

            if (xedxDevMode == true) {
                if (!$(scenario).attr("data-time")) {
                    let color = nextColor();
                    debug("Elem: ", $(elem), " scenario: ", $(scenario));
                    $(elem).css("border", ("1px solid " + color));
                    $(scenario).css("border", ("1px solid " + color));
                    $(scenario).next().css("border", ("1px solid " + color));
                }
            }

            if (text) {
                let tmp = text.slice(0, 11);
                let parts = tmp.split(":");
                debug("Text: ", text, " Text, sliced: ", tmp, " parts: ", parts);
                text = tmp;

                let secsDays = (+parts[0] * 24 * 60 * 60);
                let secsHrs = (+parts[1] * 60 * 60);
                let secsMins = (+parts[2] * 60);
                let secs = +parts[3];
                let totalSecs = secsDays + secsHrs + secsMins + secs;

                debug("secsDays: ", secsDays, " secsHrs: ",
                      secsHrs, " secsMins: ", secsMins, " secs: ", secs, " Total secs: ", totalSecs);

                let secsDays2 = parseInt(parts[0]) * 24 * 60 * 60;
                let secsHrs2 = parseInt(parts[1]) * 60 * 60;
                let secsMins2 = parseInt(parts[2]) * 60;
                let secs2 = parseInt(parts[3]);
                let totalSecs2 = secsDays2 + secsHrs2 + secsMins2 + secs2;

                debug("secsDays2: ", secsDays2, " secsHrs2: ",
                      secsHrs2, " secsMins2: ", secsMins2, " secs2: ", secs2, " Total secs2: ", totalSecs2);

                debug("Curr data-time: ", $(scenario).parent().attr("data-time"));
                $(scenario).parent().attr("data-time", totalSecs);
            }
        }

        if (doSort == true)
            sortList();

        if (!$(".xoc-myself").length) highlightSelf();
    }

    function onScrollTimer() {
        switch (btnIndex()) {
            case recruitingIdx:
                break;
            case planningIdx:
                tagAndSortScenarios();
                break;
            case completedIdx:
                getCompletedCrimes();
                break
        }

    }

    function initialScenarioLoad(retries=0) {
        scenarios = $("[class^='scenario_']");
        if ($(scenarios).length == 0) {
            if (retries++ < 20) return setTimeout(initialScenarioLoad, 250, retries);
            return debug("Didn't find any scenarios!");
        }

        tagAndSortScenarios();

        $(window).on('scroll', function() {
            clearTimeout(sortTimer);
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function() {
                sortTimer = setTimeout(onScrollTimer, 250);
            }, 250);
        });
    }

    function writeCompletedCrimesAsCsv(e) {
        debug("Writing crimes as CSV...", e);
        if (e) {
            e.stopPropogation();
            e.preventDefault();
        }
        return false;
    }

    function handlePageLoad(retries=0) {
        debug("handlePageLoad");
        if (!isOcPage()) return log("Not on crimes page, going home");

        let root = $("#faction-crimes");
        if ($(root).length == 0) {
            if (retries++ < 20) return setTimeout(handlePageLoad, 250, retries);
            return log("Didn't find root!");
        }

        addPageBtnHandlers();
        installCompletedPageButton();
        logCurrPage();

        setTimeout(initialScenarioLoad, 500);
    }

    //====================== API calls ===================================
    //
    var missingMembers;
    var facMembersJson = {};
    var plannedCrimeMembers = [];
    var facMembersArray = [];

    var completedCrimesSynced = false;
    var completedScenarios;
    var completedScenariosLastLen = 0;
    var completedCrimesArray;          // Array of completed crimes, will only get once per page visit

    var facMembersDone = false;
    var crimeMembersDone = false;


    function getCompletedCrimes() {
        debug("getCompletedCrimes, completedCrimesArray", completedCrimesArray);
        if (cacheCompletedCrimes == true && completedCrimesArray) {
            debug("using cached version: ", completedCrimesArray);
            completedCrimesCb(completedCrimesArray);
        } else {
            doFacOcQuery('completed');
        }
    }

    // 'crimes' is parsed array of JSON crime objects
    function completedCrimesCb(crimes) {

        completedCrimesArray = crimes;

        debug("Completed crimes CB: ", crimes.length);

        if (logFullApiResponses == true) {
            crimes.forEach(function (crime, index) {
                logCompletedCrime(crime);
            });
        } else {
            debug("Not logging details, 'logFullApiResponses' is off.");
        }

        syncCompletedCrimeData();

        // Local functions..

        var state = 0;
        function syncCompletedCrimeData(retries=0) {
            debug("syncCompletedCrimeData: ", retries);

            completedScenarios = $("[class^='scenario_']");
            debug("completedScenarios: ", $(completedScenarios));
            if (!$(completedScenarios).length) {
                if (retries++ < 20) return setTimeout(syncCompletedCrimeData, 250, retries);
                return log("Too many sync retries");
            }

            for (let idx=0; idx < $(completedScenarios).length; idx++) {
                let scenario = $(completedScenarios)[idx];
                let desc = getCompCrimeDesc(idx);
                let rewardDiv = $(scenario).find("[class^='rewardContainer_'] [class^='reward_'] ");
                let prevDiv = $(rewardDiv).find(".xsort");
                if ($(prevDiv).length) continue;

                let item = $(rewardDiv).find("[class^='rewardItem_']")[0];
                let className = "";
                let classList = $(item).attr('class').split(/\s+/);
                if (classList) className = classList[0];
                let newDiv = `<div class="${className} xsort">${desc}</div>`;
                $(rewardDiv).append(newDiv);

                //
            }
        }

        function tm_str(tm) {
            let dt = new Date(tm*1000);
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

        function logCompletedCrime(crime) {
            log("Completed crime, id: ", crime.id, " status: ", crime.status,
                " created: ", tm_str(crime.created_at), " initiated: ", tm_str(crime.initiated_at),
                " ready at: ", tm_str(crime.ready_at), " expired_at: ", tm_str(crime.expired_at));
        }

        function getCompCrimeDesc(idx) {
            debug("getCompCrimeDesc: ", idx, "|", completedCrimesArray, "|", completedCrimesArray[idx]);
            let crime = completedCrimesArray[idx];
            let payout = asCurrency(crime.rewards.money);
            let initiated = tm_str(crime.initiated_at);
            let span = `<span class="oc-comp-span1">Initiated:</span><span class="oc-comp-span2">${initiated}</span>`;
            return span;
        }
    }

    function plannedCrimesCb(responseText, ID, param) {
        let jsonObj = JSON.parse(responseText);
        let crimes = jsonObj.crimes;

        if (param == 'completed') {
            return completedCrimesCb(crimes);
        }

        crimes.forEach(function (crime, index) {
            crime.slots.forEach(function (slot, index) {
                if (slot.user_id) plannedCrimeMembers.push(slot.user_id);
            });
        });

        debug("Members in crimes: ", plannedCrimeMembers.length);

        if (param == "planning") {
            getRecruitingCrimes();
        } else {
            if (facMembersDone == true) {
                missingMembers = arrayDiff(facMembersArray, plannedCrimeMembers);
                buildMissingMembersUI();
            }
            crimeMembersDone = true;
        }
    }


    function doFacOcQuery(category) {
        debug("doFacQuery: ", category);

        var options = {"cat": category, "offset": "0", "param": category};
        xedx_TornFactionQueryv2("", "crimes", plannedCrimesCb, options);
    }

    function facMemberCb(responseText, ID, param) {
        let jsonObj = JSON.parse(responseText);
        let membersArray = jsonObj.members;
        membersArray.forEach(function (member, index) {
            if (member.id) {
                let state = member.status.state;
                if (state.toLowerCase() != "fallen") {
                    facMembersArray.push(member.id);
                    facMembersJson[member.id] = member.name;
                }
            }
        });

        debug("Fac members: ", facMembersArray.length);

        if (crimeMembersDone == true) {
                missingMembers = arrayDiff(facMembersArray, plannedCrimeMembers);
                buildMissingMembersUI();
            }
            facMembersDone = true;
    }

    function getFacMembers() {
        xedx_TornFactionQueryv2("", "members", facMemberCb);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //userId = getThisUserId();
    debug("User ID: ", userId);
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();
    addStyles();

    // Kick off calls to get fac members in an OC as well
    // as all our current members, diff is those not in an OC.
    // https://api.torn.com/v2/faction/crimes?key=4ZMAvIBON4zZLrd9&cat=planning&offset=0
    getFacMembers();
    getPlannedCrimes();

    callOnHashChange(hashChangeHandler);

    if (!isOcPage()) return log("Not on crimes page, going home");

    callOnContentComplete(handlePageLoad);

    // ========================= UI stuff ===============================

    const membersTextClosed = "Available Members (click to show)";
    const membersTextOpen = "Available Members (click to hide)";

    // Styles just stuck at the end, out of the way
    function addStyles() {
        let shadowColor = darkMode() ? "#555" : "#ccc";
        loadMiscStyles();
        GM_addStyle(`
            .oc-comp-span1 {
                 color: var(--oc-respect-reward-text-color);
                 font-family: Arial;
                 font-size: 12px;
                 padding-top: 2px;
                 margin-left: 150px;
             }
             .oc-comp-span2 {
                 font-family: Fjalla One;
                 margin-left: 5px;
                 padding-top: 2px;
             }
            .csv-btn {
               color: green;
               border-radius: 14px;
               padding: 0px 8px 0px 8px;
               position: absolute;
               display: flex;
               flex-wrap: wrap;
               justify-content: center;
               align-content: center;
               top: 0;
               left: 82%;
               height: 34px;
            }
            .csv-btn:hover  {
                color: limegreen;
                box-shadow: inset 6px 4px 2px 1px ${shadowColor};
            }
            .xoc-myself {
                border: 1px solid green;
                filter: brightness(1.5);
                z-index: 9;
            }
            .x-oc-wrap {
                padding: 10px 0px 10px 0px;
            }
            #x-no-oc-members {
                margin-top: 8px;
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
            }
            #x-no-oc-table {

            }
            #x-no-oc-table tr {
                display: flex;
                flex-direction: row;
                width: 90%;
                height: 30px;
                margin: 0px auto 0px auto;
            }
            #x-no-oc-table tr:first-child {
                border-radius: 10px 0px 0px 0px;
            }
            #x-no-oc-table td {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                text-align: center;
                color: var(--default-color);
                width: 20%;
                border: 1px solid #666;
                cursor: pointer;
            }
            #x-no-oc-table td:hover {
                color: var(--default-blue-color);
            }
            #x-no-oc-table td span {
                display: flex;
                align-items: center;
            }
            #x-oc-can-click {
                height: 38px;
                width: 100%;
                display: flex;
                align-content: center;
                flex-wrap: wrap;
                background: var(--tabs-bg-gradient);
                border: none;
                color: var(--tabs-color);
                font-weight: 700;
                font-size: 14px;
                justify-content: space-between;
            }
            #x-oc-can-click > div > span {
                cursor: pointer;
            }
            #x-oc-can-click .box {
                display: flex;
                /*border: 1px solid blue;*/
            }
            #x-oc-click {
                border-radius: 4px;
                padding: 10px 30px 10px 20px;
                /*border: 1px solid green;*/
            }
            #x-oc-click:hover {
                box-shadow: 0 12px 16px 0 rgba(0,0,0,0.24), 0 17px 50px 0 rgba(0,0,0,0.19);
            }
            #oc-opt-last-pos {
                margin: 0px 20px 0px 20px;
                cursor: pointer;
                opacity: 0;
                z-index: 9999999;
                /*border: 1px solid yellow;*/
            }
            #oc-opt-wrap {
                display: flex;
                justify-content: center;
                align-content: center;
                border-radius: 4px;
                height: 100%;
                /*border: 1px solid red;*/
            }
            #oc-opt-wrap:hover {
                filter: brightness(1.2);
                /*border: 2px solid lightgray;*/
            }
            #oc-opt-wrap:hover input {
                opacity: 1;
            }
            .vhide {visibility: hidden;}
            .vshow {visibility: visible;}
        `);
    }

    const lastStateOptCb = `<span id='oc-opt-wrap'><input type="checkbox" id="oc-opt-last-pos" class=""></span>`;
    const csvBtn = `<span id="xcsvbtn" class="csv-btn">CSV</span>`;

    function installCompletedPageButton(visible=false, retries=0) {
        if ($("#xcsvbtn").length == 0) {
            // Should just start a mutation observer...
            let cBtn = pageBtnsList()[2];
            if (!$(cBtn).length) {
                if (retries++ < 20) return setTimeout(installCompletedPageButton, 200, visible, retries);
                return log("ERROR: didn't find the Completed button!");
            }

            $(cBtn).append(csvBtn);
            $("#xcsvbtn").on('click', writeCompletedCrimesAsCsv);
            displayHtmlToolTip($("#xcsvbtn"),
                           "Click here to view and save data<br>" +
                           "in CSV format, to import into any<br>" +
                           "spreadsheet program later.", "tooltip4");
        }

        if (visible == true)
            $("#xcsvbtn").removeClass("vhide");
        else
            $("#xcsvbtn").addClass("vhide");
    }

    // Helper to save (in order to restore at start) state
    function writeCurrState(state) {
        if (state) {
            GM_setValue(lastStateKey, state);
            return;
        }
        if ($("#x-oc-tbl-wrap").length > 0)
            GM_setValue(lastStateKey, stateOpen);
        else
            GM_setValue(lastStateKey, stateClosed);
    }

    function doAnimateTable(e) {
        if ($("#x-oc-tbl-wrap").length) {
            $("#x-oc-tbl-wrap").animate({height: "0px"}, 500);
            $("#x-oc-tbl-wrap").animate({opacity: 0}, 200, function () {
                $("#x-oc-tbl-wrap").remove();
                $("#x-oc-click").text(membersTextClosed);
                writeCurrState();
            });
        } else {
            installTableWrap();
            $("#x-oc-tbl-wrap").animate({opacity: 1}, 200, function () {
                $("#x-oc-click").text(membersTextOpen);
                writeCurrState();
            });
        }
    }

    function installTableWrap() {
        let tblWrap = `
            <div id='x-oc-tbl-wrap' class="x-oc-wrap cont-gray bottom-round" style="opacity: 0.2;">
                  <table id="x-no-oc-table" style="width: 782px;">
                      <tbody>

                      </tbody>
                  </table>
             </div>
        `;

        $("#x-oc-can-click").after(tblWrap);

        let done = false;
        let tr = "<tr class='xoctr'>";
        for (let idx=0; idx < missingMembers.length || done == true;) {
            for (let j=idx; j < idx+5; j++) {
                let id = missingMembers[j];
                let name = "";
                if (!id) {
                    done = true;
                    tr += "<td><span></span></td>";
                } else {
                    name = facMembersJson[id];
                    tr += "<td data-id='" + id + "' class='xoctd'><span>" + name + " [" + id + "]</span></td>";
                }
            }
            tr += "</tr>"
            $("#x-no-oc-table > tbody").append($(tr));
            tr = "<tr>";
            idx += 5;
            if (done == true || idx >= missingMembers.length) break;
        };

        // Set cell borders
        $("#x-no-oc-table tr:first td:first").css("border-top-left-radius", "10px");
        $("#x-no-oc-table tr:first td:last").css("border-top-right-radius", "10px");
        $("#x-no-oc-table tr:last td:first").css("border-bottom-left-radius", "10px");
        $("#x-no-oc-table tr:last td:last").css("border-bottom-right-radius", "10px");

        // On clic,  open profile in new tab
        $(".xoctd").on('click', function (e) {
            let target = $(e.currentTarget);
            let id = $(target).attr("data-id");
            let href="/profiles.php?XID=" + id;
            window.open(href, "_blank");
        });
    }

    function buildMissingMembersUI() {
        let membersDiv = `
            <div id="x-no-oc-members" class="sortable-box t-blue-cont h">
              <div id="x-oc-can-click" class="hospital-dark top-round scroll-dark" role="table" aria-level="5">
                  <div class="box"><span id='x-oc-click'>${membersTextClosed}</span></div>
              </div>
          </div>
         `;


        $("#faction-crimes").before(membersDiv);

        $("#x-oc-can-click").append(lastStateOptCb);
        $("#oc-opt-last-pos").prop('checked', keepLastState);

        displayHtmlToolTip($("#oc-opt-wrap"),
                           "Checking this will cause this<br>" +
                           "script to keep this window in<br>" +
                           "the last state you left it in,<br>" +
                           "either open or hidden.", "tooltip4");

        $("#oc-opt-last-pos").on('click', function (e) {
            e.stopPropagation();

            let node = $(e.currentTarget);
            keepLastState = $("#oc-opt-last-pos")[0].checked;

            debug("Save State clicked: ", keepLastState, "|", $("#oc-opt-last-pos"), "|",
                $("#oc-opt-last-pos")[0].checked, "|",
                $("#oc-opt-last-pos").checked, "|",
                $("#oc-opt-last-pos").prop('checked'));

            GM_setValue(keepLastStateKey, keepLastState);
            if (keepLastState == true) writeCurrState();
        });

        $("#x-oc-can-click").on('click', doAnimateTable);

        debug("keepLastState: ", keepLastState, " lastState: ", lastState);
        if (keepLastState == true && lastState == stateOpen)
            doAnimateTable();    // Can call direct, event is unused
    }


})();