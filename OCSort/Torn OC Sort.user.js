// ==UserScript==
// @name         Torn OC Sort
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Sort crimes, show missing members, etc
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

    const userId = getThisUserId();    // Used to highlight yourself in list

    // Extra debug logging, for development
    const logFullApiResponses = GM_getValue("logFullApiResponses", false);
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    const keepLastStateKey = "keepLastState";
    const lastStateKey = "lastState";
    const stateOpen = "visible";
    const stateClosed = "hidden";
    const sortKey = 'data-sort';

    // Sorting criteria
    const sortByTime = 1;
    const sortByLevel = 2;

    // Can edit this, but there's a hidden checkbox for it.
    var keepLastState = GM_getValue(keepLastStateKey, false);
    var lastState = GM_getValue(lastStateKey, stateClosed);

    // Will reset at page refresh, not permanent cache
    const cacheCompletedCrimes = true;

    const xedxDevMode = (userId == 2100735); // I can turn this on for dev-only stuff, only I will see
    const enableReadyAlert = false;          // Not implemented yet...

    const recruitingIdx = 0;
    const planningIdx = 1;
    const completedIdx = 2;

    var scenarios;
    var listRoot;        // root div above scenarios
    var scrollTimer;
    var sortTimer;

    const getBtnSel = function (btnIdx){ return `#faction-crimes [class^='buttonsContainer_'] button:nth-child(${(btnIdx+1)})`;}
    const getRecruitingTab = function () { return $(getBtnSel(recruitingIdx));}
    const getPlanningTab = function () { return $(getBtnSel(planningIdx));}
    const getCompletedTab = function () { return $(getBtnSel(completedIdx));}
    const isOcPage = function () {return location.hash ? (location.hash.indexOf("tab=crimes") > -1) : false;}
    const hashChangeHandler = function () {handlePageLoad();}
    const btnIndex = function () {return $("#faction-crimes [class^='buttonsContainer_'] > [class*='active_']").index();}
    const pageBtnsList = function () {return $("#faction-crimes [class^='buttonsContainer_'] button");}
    const isSortablePage = function () {return (btnIndex() != completedIdx);}
    const sortPage = function (c=sotByTime) {tagAndSortScenarios(c);}
    const getPlannedCrimes = function () { doFacOcQuery('planning'); }
    const getRecruitingCrimes = function () { doFacOcQuery('recruiting'); }
    const onRecruitingPage = function () {return (btnIndex() == recruitingIdx);}
    const onPlanningPage = function () {return (btnIndex() == planningIdx);}
    const onCompletedPage = function () {return (btnIndex() == completedIdx);}

    function logCurrPage() {
        let idx = btnIndex();
        let page = (idx == 0 ? "Recruiting" : idx == 1 ? "Planning" : idx == 2 ? "Completed": "Unknown");
        debug("On index ", idx, " page is '", page, "'", " sortable? ", isSortablePage());
    }

    function handlePageChange() {
        logCurrPage();
        switch (btnIndex()) {
            case recruitingIdx:
                sortPage(sortByLevel);
                return;
            case planningIdx:
                sortPage(sortByTime);
                return;
            case completedIdx:
                getCompletedCrimes();
                installCompletedPageButton(true);
                return;
        }

        debug("ERROR: Unknown page, idx = ", btnIndex(), " sortable? ", isSortablePage(), " (",
           recruitingIdx, "|", planningIdx, "|", completedIdx);
    }

    function sortList() {
        let scenario1 = $(scenarios)[0];
        let grandparent = $(scenario1).parent().parent();
        let list = $(grandparent).children("[class^='wrapper_']");
        let sortOrder = 'asc';
        if (onRecruitingPage()) sortOrder = 'desc';
        tinysort($(list), {attr: sortKey, order: sortOrder});
    }

    function pageBtnClicked(e) {
        debug("pageBtnClicked, idx: ", btnIndex(), "|", e);
        if (btnIndex() != completedIdx) {
            $("#xcsvbtn").addClass("vhide");
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

    function secsFromeTimeStr(text) {
        let tmp = text.slice(0, 11);
        let parts = tmp.split(":");
        let totalSecs = (+parts[0] * 24 * 60 * 60) + (+parts[1] * 60 * 60) + (+parts[2] * 60) + (+parts[3]);

        return totalSecs;
    }

    // Do the sorting. On Planning page, by time. Recruiting page, by level.
    // sortCriteria over-rides....
    function tagAndSortScenarios(sortCriteria=sortByTime) {
        if (!isSortablePage()) {
            debug("This page isn't sortable (by definition)");
            logCurrPage();
            return;
        }

        scenarios = $("[class^='scenario_']");
        let listRoot = $($(scenarios)[0]).parent().parent();

        for (let idx=0; idx<$(scenarios).length; idx++) {
            let scenario = $(scenarios)[idx];
            let sortVal = -1; // -1 means invalid
            switch (sortCriteria) {
                case sortByTime: {
                    let elem = $(scenario).find("[class^='wrapper_'] > div > p")[0];
                    let text = $(elem).text();
                    if (text) sortVal = secsFromeTimeStr(text);
                    break;
                }
                case sortByLevel: {
                    let elem = $(scenario).find("[class^='wrapper_'] > div > div > div > [class^='textLevel_'] [class^='levelValue_']");
                    if ($(elem).length)
                        sortVal = parseInt($(elem).text());
                    break;
                }
                default: {
                    console.error("ERROR: invalid sort criteria!");
                    debugger;
                    return;
                }
            }
            $(scenario).parent().attr(sortKey, sortVal);
        }

        if (!$(".xoc-myself").length) highlightSelf();

        sortList();
    }

    function onScrollTimer() {
        //debug("onScrollTimer: ", btnIndex());
        switch (btnIndex()) {
            case recruitingIdx:
                tagAndSortScenarios(sortByLevel);
                break;
            case planningIdx:
                tagAndSortScenarios(sortByTime);
                break;
            case completedIdx:
                getCompletedCrimes();
                break;
            default:
                break;
        }

    }

    function initialScenarioLoad(retries=0) {
        let rootSelector = "#factions";
        if ($("#faction-crimes-root").length)
            rootSelector = "#faction-crimes-root";
        else if ($("#faction-crimes").length)
            rootSelector = "#faction-crimes-root";

        callWhenElementExistsEx(rootSelector, "[class^='scenario_']:nth-child(1)", localLoadCb);

        function localLoadCb(node) {
            scenarios = $("[class^='scenario_']");
            if ($(scenarios).length == 0) {
                console.error("ERROR: Scenarios not found!");
                debugger;
                //if (retries++ < 20) return setTimeout(initialScenarioLoad, 250, retries);
                //return debug("Didn't find any scenarios!");
            }

            tagAndSortScenarios(onRecruitingPage() ? sortByLevel : sortByTime);
        }
    }

    // Build a CSV to download, as well as an HTML table to display
    const crimesTable = "<div><table id='comp-crimes'><tbody></tbody></table></div>";
    const filter = function(t) {let tmp = t.toString().replace(/(\r\n|\n|\r)/gm, "");return tmp.trim();}

    function writeCompletedCrimesAsCsv(e) {
        if (e) e.preventDefault();
        if (!completedCrimesArray) return false;

        // Find max # "slots" before making header
        let numSlots = 0;
        completedCrimesArray.forEach(function (crime, index) {
            let tmp = crime.slots.length;
            if (tmp > numSlots) numSlots = tmp;
        });

        let csvHdr = "CrimeID, Name, Difficulty, Status, CreatedAt, InitiatedAt, ReadyAt, ExpiredAt, " +
                  "Money, Items, Respect";
        let csvHdrHtml = csvHdr;
        for (let idx=0; idx<numSlots; idx++) {
            csvHdr += ", Slot" + (idx+1) + ", Position, Success ";
            csvHdrHtml += ", Slot" + (idx+1);
        }

        let fullCsvText = csvHdr + "\r\n";

        let theTable = $(crimesTable);
        crimesAddHdr(theTable, csvHdrHtml);

        completedCrimesArray.forEach(function (crime, index) {
            let rewards = crime.rewards;

            let textLine =
                `${crime.id},'${filter(crime.name)}',${filter(crime.difficulty)},${filter(crime.status.trim())},` +
                `${filter(toCsvDateStr(crime.created_at * 1000))},${filter(toCsvDateStr(crime.initiated_at * 1000))},` +
                `${filter(toCsvDateStr(crime.ready_at * 1000))},${filter(toCsvDateStr(crime.expired_at * 1000))},` +
                `${filter(rewards.money)},${filter(rewards.items.length)},${filter(rewards.respect)}`;

            let slots = crime.slots;
            slots.forEach(function (slot, index) {
                let name = facMembersJson[slot.user_id];
                let slotTxt = `,  ${name} [${slot.user_id}], ${filter(slot.position)}, ${slot.success_chance}%`;
                textLine += slotTxt;
            });

            crimesAddRow(theTable, textLine);
            fullCsvText += (textLine + "\r\n");
        });

        // Display/download
        var newWin = open("", "_blank",
                  "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=760,height=450");

        const style = newWin.document.createElement("style");
        style.textContent = `
            #comp-crimes {
                border-collapse: collapse;
                tr:nth-child(even) {background-color: #f2f2f2;}
            }
            #comp-crimes th {
                padding: 2px 15px 2px 15px;
                text-align: center;
                border: 2px solid black;
                background-color: #04AA6D;
                color: white;
            }
            #comp-crimes td {
                padding: 2px 15px 2px 15px;
                text-align: left;
                border: 1px solid black;
            }
        `;

        newWin.document.head.appendChild(style);
        newWin.document.body.innerHTML = $(theTable).html();

        downloadCsvData(fullCsvText, newWin);
        newWin.focus();

        return false;

        // =============================== local functions ======================
        function closeMiniWin(win) {
            win.close()
        }

        function toCsvDateStr(date) {
            const mediumTime = new Intl.DateTimeFormat("en-GB", {
              timeStyle: "medium",
              hourCycle: "h24",
            });
            const shortDate = new Intl.DateTimeFormat("en-GB", {
              dateStyle: "short",
            });
            const formattedDate = mediumTime.format(date) + "-" + shortDate.format(date);
            return formattedDate;
        }

        function getFilename() {
            let now = new Date();
            const formattedDate = toCsvDateStr(now);

            let filename = "CompletedCrimes_" + formattedDate + ".csv";
            filename.replaceAll(' ', '%20');

            debug("formattedDate: ", formattedDate, " filename: ", filename);
            return filename;
        }

        function downloadCsvData(data, theWin) {
            let blobx = new Blob([data], { type: 'text/plain' }); // ! Blob
            let elemx = theWin.document.createElement('a');
            elemx.href = theWin.URL.createObjectURL(blobx); // ! createObjectURL
            let filename = getFilename();
            elemx.download = filename;
            elemx.style.display = 'none';
            document.body.appendChild(elemx);
            elemx.click();
            document.body.removeChild(elemx);
        }

        function crimesAddRow(table, data) {
            let cells = data.split(',');
            let row = '<tr>';
            cells.forEach(function (cellText, idx) {
                row += `<td>${cellText}</td>`;
            });
            row += "</tr>";
            let body = $(table).find("tbody");
            $(table).find("tbody").append(row);
        }

        function crimesAddHdr(table, data) {
            let cells = data.split(',');
            let row = '<tr>';
            cells.forEach(function (cellText, idx) {
                if (cellText.indexOf("Slot") > -1)
                    row += `<th colspan="3">${cellText}</th>`;
                else
                    row += `<th>${cellText}</th>`;
            });
            row += "</tr>";
            let body = $(table).find("tbody");
            $(table).find("tbody").append(row);
        }
    }

    function handlePageLoad(node /*retries=0*/) {
        debug("handlePageLoad");
        if (!isOcPage()) return log("Not on crimes page, going home");

        let root = $("#faction-crimes");
        if ($(root).length == 0) {
            callWhenElementExistsEx("document", "#faction-crimes", handlePageLoad);
            return debug("Root not found, started observer...");
            //if (retries++ < 20) return setTimeout(handlePageLoad, 250, retries);
            //return log("Didn't find root!");
        }

        $(window).on('scroll', function() {
            clearTimeout(sortTimer);
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function() {
                sortTimer = setTimeout(onScrollTimer, 250);
            }, 250);
        });

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
        if (cacheCompletedCrimes == true && completedCrimesArray) {
            debug("using cached version..."); //, completedCrimesArray);
            completedCrimesCb(completedCrimesArray);
        } else {
            doFacOcQuery('completed');
        }
    }

    // 'crimes' is parsed array of JSON crime objects
    function completedCrimesCb(crimes) {
        completedCrimesArray = crimes;
        debug("Completed crimes CB: ", crimes ? crimes.length : 0);

        if (logFullApiResponses == true) {
            crimes.forEach(function (crime, index) {
                logCompletedCrime(crime);
            });
        } else {
            debug("Not logging details, 'logFullApiResponses' is off.");
        }

        if (btnIndex() == completedIdx) {
            syncCompletedCrimeData();
        }

        // Local functions..
        function syncCompletedCrimeData(retries=0) {
            completedScenarios = $("[class^='scenario_']");
            debug("syncCompletedCrimeData, count: ",
                  $(completedScenarios).length,
                  " retries: ", retries);

            // Scroll will call us anyways, don't retry too much.
            if (!$(completedScenarios).length) {
                if (retries++ < 10) return setTimeout(syncCompletedCrimeData, 250, retries);
                return debug("Too many sync retries");
            }

            for (let idx=0; idx < $(completedScenarios).length; idx++) {
                let scenario = $(completedScenarios)[idx];
                let desc = getCompCrimeDesc(idx);
                let rewardDiv = $(scenario).find("[class^='rewardContainer_'] [class^='reward_'] ");
                let prevDiv = $(rewardDiv).find(".xsort");
                if ($(prevDiv).length) continue;

                let item = $(rewardDiv).find("[class^='rewardItem_']")[0];
                let className = "";
                let classListRaw = $(item).attr('class');
                if (!classListRaw) {
                    debug("Error: missing class list! ", $(item));
                    debugger;
                }
                let classList = classListRaw ? classListRaw.split(/\s+/) : null;
                if (classList) className = classList[0];
                let newDiv = `<div class="${className} xsort">${desc}</div>`;
                $(rewardDiv).append(newDiv);
            }
        }

        // Format time/date however we want
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

        // Just for logging to dev console
        function logCompletedCrime(crime) {
            log("Completed crime, id: ", crime.id, " status: ", crime.status,
                " created: ", tm_str(crime.created_at), " initiated: ", tm_str(crime.initiated_at),
                " ready at: ", tm_str(crime.ready_at), " expired_at: ", tm_str(crime.expired_at));
        }

        // Build the span to display in a div on completed crime panel
        function getCompCrimeDesc(idx) {
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
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();
    addStyles();

    // Kick off calls to get fac members in an OC as well
    // as all our current members, diff is those not in an OC.
    getFacMembers();
    getPlannedCrimes();
    getCompletedCrimes();

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
            }
            #x-oc-click {
                border-radius: 4px;
                padding: 10px 30px 10px 20px;
            }
            #x-oc-click:hover {
                box-shadow: 0 12px 16px 0 rgba(0,0,0,0.24), 0 17px 50px 0 rgba(0,0,0,0.19);
            }
            #oc-opt-last-pos {
                margin: 0px 20px 0px 20px;
                cursor: pointer;
                opacity: 0;
                z-index: 9999999;
            }
            #oc-opt-wrap {
                display: flex;
                justify-content: center;
                align-content: center;
                border-radius: 4px;
                height: 100%;
            }
            #oc-opt-wrap:hover {
                filter: brightness(1.2);
            }
            #oc-opt-wrap:hover input {
                opacity: 1;
            }
            .vhide {visibility: hidden;}
            .vshow {visibility: visible;}
        `);
    }

    const lastStateOptCb = `<span id='oc-opt-wrap'><input type="checkbox" id="oc-opt-last-pos" class=""></span>`;
    function installCompletedPageButton(visible=false, retries=0) {
        const csvBtn = `<span id="xcsvbtn" class="csv-btn">CSV</span>`;

        if ($("#xcsvbtn").length == 0) {
            // Should just start a mutation observer...
            // Added callWhenElementExistsEx() for just that purpose
            let cBtn = getCompletedTab();
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

        // On click,  open profile in new tab
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
            GM_setValue(keepLastStateKey, keepLastState);
            if (keepLastState == true) writeCurrState();
        });

        $("#x-oc-can-click").on('click', doAnimateTable);

        if (keepLastState == true && lastState == stateOpen)
            doAnimateTable();    // Can call direct, event is unused
    }


})();