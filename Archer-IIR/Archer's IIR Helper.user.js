// ==UserScript==
// @name         Archer's IIR Helper
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Save IIR data to disk
// @author       xedx [2100735]
// @match        https://www.insolvencydirect.bis.gov.uk/*
// @connect      www.insolvencydirect.bis.gov.uk
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    var enabled = true;
    var gPaused = GM_getValue("paused", false);

    let firstLetterToSearchFor = 'l';
    let lastLetterToSearchFor = 'z'; // Normally would be "Z"!

    const recoverLtr = 'l';
    const recoverNum = 60;

    const domainPrefix = "https://www.insolvencydirect.bis.gov.uk/eiir/";
    const homePageURL = "https://www.insolvencydirect.bis.gov.uk/eiir/IIRMasterPage.asp";
    const nameSearchURL = "https://www.insolvencydirect.bis.gov.uk/eiir/IIRRegisterNameInput.asp?option=NAME&court=ALL";
    const resultsPageURLPrefix = "https://www.insolvencydirect.bis.gov.uk/eiir/IIRSearchNames.asp";
    const caseDetailPrefix = "https://www.insolvencydirect.bis.gov.uk/eiir/IIRCaseIndivDetail.asp";
    const errorPagePrefix = "https://www.insolvencydirect.bis.gov.uk/eiir/IIRErrorPage.asp";
    const resultsPageURL = "https://www.insolvencydirect.bis.gov.uk/eiir/IIRSearchNames.asp?court=ALL&courtname=&office=&officename=&OPTION=NAME";
    var topNavTarget = document.querySelector("#topnav");

    // UI elements

    const tblHdr = GetTableHeader();           // Header for the main table
    const tblFtr = GetTableFooter();           // Footer for same

    const mainPageUI = GetMainPageUI();        // Page displayed on home page
    const processingDiv = GetProcessingUI();   // Page displayed on results of search page
    const searchingDiv = GetSearchingUI();     // ... while searching
    const searchContinuesDiv = GetContinuesUI(); // Page shown when going to next 'letter'
    const recoveringDiv = GetRecoveringUI();   // Page displayed when recovery starting


    // Returns TRUE if clicked a button or went to new page
    function onBtnClickGo(fromPageLoad=false) {
        log("[onBtnClickGo] enabled: ", enabled);
        if (!enabled) {
            alert("Shouldn't be here!");
            return;
        }

        let redirected = GM_getValue("redirected", false);
        let searching = GM_getValue("searching", false);
        let searchOver = GM_getValue("searchOver", false);
        let processing = GM_getValue("processing", false);
        let continuing = GM_getValue("continuing", false);
        let currURL = location.href;
        let resultsPage = currURL.toLowerCase().indexOf(resultsPageURLPrefix.toLowerCase()) > -1;

        log("[onBtnClickGo]");
        log("Redirected? ", redirected);
        log("Searching? ", searching);
        log("Search over? ", searchOver);
        log("Processing? ", processing);
        log("Results page? ", resultsPage);
        log("Continuing? ", continuing);

        // Clear state flags
        // if (currURL == homePageURL && !recovering && GM_getValue("searchOver", true)) { // Clear all state variables
        if (false) {
            log("Clearing state");
            GM_setValue("continuing", false);
            GM_setValue("redirected", false);
            GM_setValue("searching", false);
            GM_setValue("processing", false);
            GM_setValue("searchOver", false);
            GM_setValue("processPage", 1);
            GM_setValue("lastSearch", "");
        }

        // Reset vars as appropriate
        GM_setValue("redirected", false);

        if (location.href != nameSearchURL && !redirected && !searching) {
            window.location.href = nameSearchURL;
            GM_setValue("redirected", true);
            GM_setValue("searching", false);
            return false;
        }

        log("After redirect check.");

        // Start the search, if not already searching.
        if (!searching) {
            GM_setValue("processing", false);
            GM_setValue("searching", true);
            GM_setValue("searchOver", false);
            GM_setValue("lastSearch", firstLetterToSearchFor);

            //alert("Starting search for 'a'");

            // Search!
            log("Submitting initial search, for '" + firstLetterToSearchFor + "'");
            $("#surnamesearch").val(firstLetterToSearchFor);
            $("#btnSubmit").click();

            $("#mainbody > form").addClass("xedx-hidden");
            $("#mainbody > form").insertAfter(searchingDiv);
            return true;
        }

        // Check for a results page.
        if (resultsPage && searching) {
            let lastLtr = GM_getValue("lastSearch", lastLetterToSearchFor);
            log("Must be results for last search, letter = '" + lastLtr + "'");
            let morePages = handleNextResult();
            let processing = GM_getValue("processing", false);
            let msg = ("More page results? " + morePages + " still processing? " + processing);
            log(msg);
            return false;
        }

        if (searching && !searchOver) {
            //let newLtr = GM_getValue("lastSearch", lastLetterToSearchFor);
            let newLtr = GM_getValue("_newLtr", "a");
            log("newLtr: ", newLtr);

            log("Continuing search for '" + newLtr + "'");
            //alert("Continuing search for '" + newLtr + "'");

            log("val input: ", $("#surnamesearch"));
            log("Button: ", $("#btnSubmit"));

            // Search again!
            $("#surnamesearch").val(newLtr);
            $("#btnSubmit").click();
            $("#mainbody > form").addClass("xedx-hidden");
            $("#mainbody > form").insertAfter(searchingDiv);
            intervalTimer = setInterval(updateTimeText, 1000);

            return true;
        }

        // All done?
        GM_setValue("searching", false);
        log("All done??? searching: " + searching + " processing: " + processing);
        return false;
    }

    // Adds one to a char to get next, alphabetically.
    function nextChar(c) {
        return String.fromCharCode(c.charCodeAt(0) + 1);
    }

    // Handle the search page, enter in a letter to search for or process results
    function handleNextResult(inRecovery=false) {
        log("[handleNextResult] enabled: ", enabled);
        if (!enabled) {
            alert("Shouldn't be here!");
            return;
        }

        GM_setValue("continuing", false);

        let lastLtr = GM_getValue("lastSearch", lastLetterToSearchFor).toLowerCase();
        log("lastLtr: ", lastLtr);

        let processPage = GM_getValue("processPage", 1);
        log("Handling results for '" + lastLtr + processPage + "'");

        let moreResults = processCurrentPageResults(inRecovery);
        processPage = GM_getValue("processPage", 1);
        if (moreResults) {
            let msg = "More page results to follow - not done yet!";
            log(msg);
            //alert(msg);
            return true;
        }

        log("processCurrentPageResults returned FALSE,....");
        log("lastLtr: ", lastLtr, "last to look for: ", lastLetterToSearchFor);

        //alert("Search continuing, maybe...");
        //debugger;

        // Need to go back to the search page, and search again.
        if (lastLtr != 'z' && lastLtr != lastLetterToSearchFor.toLowerCase()) {
            let nextLtr = nextChar(lastLtr);
            GM_setValue("lastSearch", nextLtr);

            log("Going onto nextLtr: ", nextLtr);
            GM_setValue("_newLtr", nextLtr);
            GM_setValue("searching", true);
            GM_setValue("processing", false);
            GM_setValue("continuing", true);
            //alert("Going onto next search: " + nextLtr);

            // Search!
            window.location.href = nameSearchURL;
            return true;
        }

        // At last letter: stop the search.
        GM_setValue("searching", false);
        GM_setValue("searchOver", true);

        log("At letter '" + lastLtr + "'\nSearch complete!");
        alert("At results for '" + lastLtr + processPage + "'\nSearch complete!");

        GoHome();

        return false;
    }

    let intervalTimer = 0;
    function updateTimeText() {
        if (!GM_getValue("processing", false)) {
            $("#xedx-time-text").text("");
            clearInterval(intervalTimer);
            return;
        }

        let currText = $("#xedx-time-text").text() + ".";
        $("#xedx-time-text").text(currText);
    }

    // Build URL to query for a given page
    function nextPageURL(nextPage, letter) {
        let nextPageURL = "https://www.insolvencydirect.bis.gov.uk/eiir/IIRSearchNames.asp?" +
                "court=ALL&CourtName=&Office=&OfficeName=&page=" +
                nextPage +
                "&surnamesearch=" +
                letter +
                "&forenamesearch=ALLFORENAMES&OPTION=NAME&tradingnamesearch=";
        return nextPageURL;
    }

    // Handle the results page, the table of 15 names
    function processCurrentPageResults(inRecovery=false) {
        log("[processCurrentPageResults] enabled: ", enabled);
        if (!enabled) {
            alert("Shouldn't be here!");
            return;
        }
        let retries = GM_getValue("retries", 0);

        //if (inRecovery) debugger;

        gPaused = GM_getValue("paused", false);
        if (gPaused) {
            log("Processing is PAUSED");
            $("#xedx-det-text").text("Paused!");
            setTimeout(processCurrentPageResults, 5000);
        }
        let processing = GM_getValue("processing", false);
        let processPage = GM_getValue("processPage", 1);
        let lastLtr = GM_getValue("lastSearch", lastLetterToSearchFor).toLowerCase();

        log("Processing: ", processing, " processPage: ", processPage, " lastLtr: ", lastLtr);

        if (inRecovery) {
            let nextPage = GM_getValue("lastPageClick", 0);
            if (!nextPage) {
                log("Can't find last page click (value lastPageClick)!");
                return;
            }
            let pageURL = nextPageURL(nextPage, lastLtr);

            // Go to the failed page
            log("Clicking the link for page " + lastLtr + nextPage + "!!!");
            log(pageURL);

            alert("Recovery: going to URL\n" + pageURL);
            window.location.href = pageURL;
            return true;
        }

        // First time here: set "processing" flag
        if (!processing) {
            GM_setValue("processPage", 1);
            GM_setValue("processing", true);
        }

        // Check for error, retry if possible
        if (processing) {
            if (location.href.toLowerCase().indexOf(errorPagePrefix.toLowerCase()) > -1) {
                let lastURL = GM_getValue("lastPageURL", "");
                if (lastURL && retries < 60) {  // Try for one minute
                    setTimeout(function() {window.location.href = lastURL;}, 1000);
                    return;
                }
                let msg = "Exceeded retries on error page, will set to recover";
                log(msg);
                alert(msg);
                GM_setValue("recover", true);
                GM_setValue("retries", 0);
                return;
            }
        }
        GM_setValue("retries", 0);

        // Page we're on now ("page >>1<< of X" -> currPage == 1)
        let index = 18;
        let currPageSel = document.querySelector("#mainbody > font:nth-child(" + index + ") > strong");
        if (!currPageSel) {
            index++;
            currPageSel = document.querySelector("#mainbody > font:nth-child(" + index + ") > strong");
        }
        let currPage = currPageSel ? currPageSel.textContent : "unknown";

        // Total pages ("Page X of >>253<<" -> resPages == 253)
        index++;
        let pagesSel = document.querySelector("#mainbody > font:nth-child(" + index + ") > strong");
        if (!pagesSel) {
            index++;
            pagesSel = document.querySelector("#mainbody > font:nth-child(20) > strong");
        }
        let resPages = pagesSel ? pagesSel.textContent : "unknown";

        // Total result count ("Your search returned 18775 records." -> resCount == 18775)
        let resCountSel = document.querySelector("#mainbody > b");
        let resCount = resCountSel ? resCountSel.textContent : "unknown";

        // Look for the paginator, to get to the next page.
        // Alternatively, just cycle through by URL.
        if (!resCountSel || !pagesSel) {
            log("Didn't find page (of X pages) selector!");
            log("resCountSel: ", resCountSel, " pagesSel:", pagesSel);
            if (++retries < 3) {
                setTimeout(processCurrentPageResults, 1000);
                return;
            }

            let msg = "Exceeded retries on error page, will set to recover";
            log(msg);
            alert(msg);
            GM_setValue("recover", true);
            GM_setValue("retries", 0);
            return;
        }
        GM_setValue("retries", 0);

        // Set detail text
        log("Setting detail text");
        $("#xedx-det-text").text("Each page takes about 10 seconds to load (on page " + currPage + " of " + resPages + ")");
        intervalTimer = setInterval(updateTimeText, 1000);

        log("ProcessPage " + lastLtr + "[" + processPage + "] Best be curr page: ", currPage);
        log("Result count: ", resCount, " Pages total: ", resPages, " Curr page: ", currPage);

        var table = document.getElementById("MyTable");
        if (!table) {
            alert("Unable to find results!");
            if (++retries < 3) {
                setTimeoout(processCurrentPageResults, 1000);
                return;
            }

            let msg = "Exceeded retries on error page, will set to recover";
            log(msg);
            alert(msg);
            GM_setValue("recover", true);
            GM_setValue("retries", 0);
            return;
        }
        GM_setValue("retries", 0);

        // Save data for this page
        for (var i = 1, row; row = table.rows[i]; i++) {
            let msg = (
                row.cells[1].textContent + ", " +   // Last name
                row.cells[0].textContent + ", " +   // first name
                row.cells[2].textContent + ", " +   // DOB
                row.cells[3].textContent + ", " +   // DOB
                row.cells[4].textContent + ", " +   // DOB
                row.cells[5].textContent + ", " +   // DOB
                row.cells[6].textContent);

            // Get details URL
            let hrefSel = row.cells[1].querySelector("#navDet");
            let userHref = "href=" + $(hrefSel).attr("href");
            msg = msg + ", " + userHref;

            let key = "result." + lastLtr + currPage + "." + i;
            GM_setValue("lastKey", key);
            GM_setValue(key, msg);

            log(msg);
            //alert(msg);
        }

        // Repeat for each page (2...resPages)
        log("Look for next page, curr: " + currPage + " max: " + resPages);
        if (+currPage < +resPages) {
            let nextPage = (currPage*1) + 1; // Can also be written as +currPage + 1;
            log("currPage: " + currPage + " nextpage: " + nextPage);
            GM_setValue("processPage", nextPage);

            let pageURL = nextPageURL(nextPage, lastLtr);

            // Save page and URL in case of error.
            GM_setValue("lastPageURL", pageURL);
            GM_setValue("lastPageClick", nextPage);

            // Go to the next page
            log("Clicking the link for page [" + lastLtr + "]" + nextPage + "!!!");
            window.location.href = pageURL;
            GM_setValue("_nextURL", pageURL);

            // Indicate there are more pages to process
            return true; // Processing more pages
        }

        GM_setValue("processing", false);
        log("Done processing pages!");
        return false; // No more pages.
    }

    // Persist all storag to disk
    function saveStorageToDisk() {
        log("[saveStorageToDisk]");
        $("#xedx-saveall-btn").text("Wait...");
        let keys = GM_listValues();
        log("Keys lenght: ", keys.length);
        let storageData = "";
        let counter = 0;
        let firstRes = "";
        let lastRes = "";
        for (let i=0; i < keys.length; i++) {
            let key = keys[i];
            if (key.indexOf("result.") > -1) { // Change to .a, .b, etc for individual letters....
                if (firstRes == "") firstRes = key;
                lastRes = key;
                counter++;
                storageData += GM_getValue(key, "") + "\r\n";
            }
        }
        log("Wrote " + counter + " entries to file, total " + storageData.length + " bytes");
        log("From " + firstRes + " to " + lastRes);

        if (counter >= 1) {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([storageData], {
                type: "text/plain"
              }));
            a.setAttribute("download", "data.csv");
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert("Nothing to save!");
        }
        $("#xedx-saveall-btn").text("Save All");
    }

    // Called to process the "paused" button
    function handlePauseBtn() {
        if (gPaused) {
            $("#xedx-pause-btn").text("Pause");
            GM_setValue("paused", false);
        } else {
            $("#xedx-pause-btn").text("Continue");
            GM_setValue("paused", true);
        }
    }

    // Process the "Stop" button press
    function handleStopButton() {
        $("#xedx-ui").replaceWith(GetStoppingUI());
        intervalTimer = setInterval(updateTimeText, 1000);
        GM_setValue("continuing", false);
        GM_setValue("redirected", false);
        GM_setValue("searching", false);
        GM_setValue("processing", false);
        GM_setValue("searchOver", true);
        GM_setValue("stopPage", GM_getValue("processPage", 1));
        GM_setValue("stopLtr", GM_getValue("lastSearch", 1));

        GoHome();
    }

    // Handle the "Restart" button press
    function handleRestartButton() {
        $("#xedx-ui").replaceWith(GetRestartingUI());
        GM_setValue("redirected", false);
        GM_setValue("searching", false);
        GM_setValue("processing", true);
        GM_setValue("searchOver", false);
        GM_setValue("processPage", GM_getValue("stopPage", 1));
        GM_setValue("lastSearch", GM_getValue("stopLtr", 1));

        // Go to the last page we tried to go to
        let pageURL = GM_getValue("_nextURL", "");
        log("Attempting recovery");
        log("URL: ", pageURL);
        window.location.href = pageURL;
    }

    // Handle the "Recover" button press, may not really be needed
    function handleRecoverButton() {
        // TEMPORARY - cleared if not already in recovery mode, above!
        //
        GM_setValue("lastLtr", "This is unused!"); // accidentally got trashed...
        GM_setValue("processPage", recoverNum);
        GM_setValue("lastPageClick", recoverNum);
        GM_setValue("lastSearch", recoverLtr);
        GM_setValue("processing", true);
        GM_setValue("retries", 0);
        GM_setValue("searching", false);
        GM_setValue("paused", false);


        GM_setValue("recover", true);
        location.reload();
    }

    // Handle the "Enable" checkbox
    function handleEnableBtn() {
        enabled = $("#xedx-enabled").is(':checked');
        log("[handleEnableBtn] enabled: ", enabled);
        GM_setValue("enabled", enabled);

        // State of buttons:
        $("#xedx-go-btn").prop("disabled", !enabled);
        $("#xedx-restart-btn").prop("disabled", !enabled);
        $("#xedx-recover-btn").prop("disabled", !enabled);

    }

    let newAddrSearch = true;
    function handleAddressBtn() {
        log("[handleAddressBtn]");
        let keys = GM_listValues();
        log("Keys lenght: ", keys.length);

        // Start where we left off, in case of error.
        // For now, until debugged, start at 0
        let startIndex = GM_getValue("addrIndex", -1);
        if (startIndex < 0 || newAddrSearch) startIndex = 0;
        //for (let i=startIndex; i < keys.length; i++) {

        for (let i=0; i < keys.length; i++) {
            let key = keys[i];
            if (key.indexOf("result.") < 0) continue;
            let value = GM_getValue(key);

            // Make sure not already processed.
            if (value.indexOf("addr=") > -1) continue;

            // Parse out address from value
            let URL = parseUrlFromResultValue(value);
            GM_setValue("addrIndex", i);
            GM_setValue("addrURL", URL);
            GM_setValue("addrKey", key);
            window.location.href = URL;
            return;
        }
    }

    function GoHome() {
        window.location.href = homePageURL;
    }

    function parseUrlFromResultValue(value) {
        let tokens = value.split(",");
        let href = tokens[7]; // Should be href=<URL>

        log("[parseUrlFromResultValuetoken] token: ", href);
        let URL = href.substring(href.indexOf('=')+1)
        log("URL: ", URL);
        return URL;
    }

    // Save address data for a key
    var addrRetries = 0;
    function parseDDetailsPage() {
        // <td> with full address, parts separated by <br>
        let addrCell =  document.querySelector("#frmCaseDetail > table:nth-child(21) > tbody > tr:nth-child(7) > td:nth-child(2)");
        if (!addrCell) {
            addrCell = document.querySelector("#frmCaseDetail > table:nth-child(23) > tbody > tr:nth-child(7) > td:nth-child(2)");
        }
        if (!addrCell) {
            log("Can't find address table cell");
            if (addrRetries++ < 3) {
                return setTimeout(parseDDetailsPage, 250);
            } else {
                let addrIndex = GM_getValue("addrIndex");
                log("****Skipping index " + addrIndex + ", moving to next one.****");
                log("Bad URL: ", location.href);
                log("addrURL: ", GM_getValue("addrURL", "unknown"));
                log("Bad key: ", GM_getValue("addrKey", "unknown"));

                // Keep track of this. Reset when? Button click?
                let count = GM_getValue("badURLs", 0);
                GM_setValue("badURLs", (+count +1));

                addrIndex = +addrIndex + 1;
                GM_setValue("addrIndex", addrIndex);
                handleAddressBtn();
                addrRetries = 0;
                return;
            }
            return;
        }
        addrRetries = 0;

        let addrKey = GM_getValue("addrKey", null);
        let addrURL = GM_getValue("addrURL", null);
        let addrIndex = GM_getValue("addrIndex", -1);
        if (!addrKey || !addrURL || addrIndex < 0) {
            log("addrKey, addrURL or index missing: ", addrKey, addrURL, addrIndex);
            //debugger;
            return;
        }

        let keys = GM_listValues();
        let count = GM_getValue("badURLs", 0);
        log("Keys lenght: ", keys.length);
        $("#xedx-count-span").text("On record " + addrIndex + " of " + keys.length + " records, " + count + " skipped");

        // Validate addrURL against location.href?
        let areEqual = (domainPrefix + addrURL).toUpperCase() === location.href.toUpperCase();
        if (!areEqual) {
            log("***** May not be right URL!!!!! *****");
            log("addrURL: ", addrURL);
            log("href: ", location.href);
        }

        // Save address info
        let oldValue = GM_getValue(addrKey);
        if (oldValue.indexOf("addr=") > -1) {
            log("Value already has an addr!");
            return;
        }

        // Make sure not already processed.
        let newValue = oldValue + ", addr=" + addrCell.innerHTML;

        log("Setting new value: ", newValue);
        GM_setValue(addrKey, newValue);

        // Get the next value. How do we know if we're at the end?
        let nextIndex = +addrIndex + 1;
        if (nextIndex >= keys.length) {
            log("Reached end of keys: ", nextIndex);
            GM_setValue("addrIndex", -1);    // Mark end of search
            alert("Parsed all available addresses!");
            return;
        }
        let key = keys[nextIndex];
        if (key.indexOf("result.") < 0) {
            log("Error parsing result index: ", key);
            return;
        }

        // Save where we're at
        GM_setValue("addrIndex", nextIndex);
        GM_setValue("addrKey", key);

        // Parse out address from value
        let value = GM_getValue(key);
        let URL = parseUrlFromResultValue(value);

        // Go to next one
        GM_setValue("addrURL", URL);
        window.location.href = URL;

        return;
    }

    // Called on page load
    function handlePageLoad() {
        enabled = GM_getValue("enabled", enabled);

        let recovering = GM_getValue("recover", false);
        if (recovering && enabled) {
            let msg = "Recovery Mode!";
            log(msg);

            $(topNavTarget).after(recoveringDiv);

            alert(msg);
            GM_setValue("recover", false);

            handleNextResult(true);
            return;
        }

        let currURL = location.href;

        // Toggle to interrupt address parsing
        let  addSearchEnabled = true;
        if (addSearchEnabled && currURL.toUpperCase().indexOf(caseDetailPrefix.toUpperCase()) > -1) {
            // Add some sort of UI...
            if (topNavTarget) {
                $(topNavTarget).after(GetAddrDetailsUI());
                intervalTimer = setInterval(updateTimeText, 1000);  // Just in case, depends on the UI
                InstallHandlers();
            }
            log("Details page: parsing");
            parseDDetailsPage();
            return;
        }

        // This is wrong ... to support recovery....
        // Clear state flags
        if (false && currURL == homePageURL && !recovering && GM_getValue("searchOver", true)) { // Clear all state variables
            log("Clearing state");
            GM_setValue("continuing", false);
            GM_setValue("redirected", false);
            GM_setValue("searching", false);
            GM_setValue("processing", false);
            GM_setValue("searchOver", false);
            GM_setValue("processPage", 1);
            GM_setValue("lastSearch", "");
        }

        // Get state
        let resultsPage = currURL.toLowerCase().indexOf(resultsPageURLPrefix.toLowerCase()) > -1;
        let homePage = currURL.toLowerCase().indexOf(homePageURL.toLowerCase()) > -1;
        let redirected = GM_getValue("redirected", false);
        let searching = GM_getValue("searching", false);
        let processing = GM_getValue("processing", false);
        let processPage = GM_getValue("processPage", 0);
        let searchOver = GM_getValue("searchOver", false);

        log("[handlePageLoad] enabled: ", enabled);
        log("target: ", topNavTarget);
        log("location: ", currURL);

        // Install a mini-UI
        if (topNavTarget) {
            let useUI = enabled ? searchingDiv : null; // Search starts automatically - so put up "searching....
            log("UI is 'searching....'");

            // Only UI if not enabled...so far.
            if (homePage) {
            //if (location.href != nameSearchURL) {
                useUI = mainPageUI;
                if (!resultsPage) GM_setValue("searching", false);
                log("Changing UI to main page UI");
            }

            if (searching && !searchOver && enabled) {
                if (GM_getValue("continuing", false))
                    useUI = searchContinuesDiv;
                else
                    useUI = searchingDiv;

                log("Changing UI to 'searching...'");
            }

            if (processing && !searchOver && enabled) {
                useUI = processingDiv;
                log("Changing UI to 'processing...'");
            }

            log("Inserting main UI...");
            if (useUI) {
                $(topNavTarget).after(useUI);
                intervalTimer = setInterval(updateTimeText, 1000);  // Just in case, depends on the UI

                // Install handlers
                InstallHandlers();
            }
        } else {
            topNavTarget = document.querySelector("#topnav");
            return setTimeout(handlePageLoad, 1000);
        }

        // Check for page reload due to not being on the right page...
        // We'll get called back here once that page loads.

        log("Redirected? ", redirected);
        log("Searching? ", searching);
        log("Search over? ", searchOver);
        log("Processing? ", processing);
        log("processPage: ", processPage);
        log("Results page? ", resultsPage);

        if (!enabled) {
            log("Disabled, all done here.");
            return;
        }

        if (searchOver) {
            $("#xedx-tbl-title").text("Archer's IIR Helper - Search complete!");
            log("Search is over - staying here");
            log("Best be  on home page!");
            return;
        }

        gPaused = GM_getValue("paused", false);
        log("Paused? ", gPaused);
        if (gPaused) {
            $("#xedx-det-text").text("Paused!");
            setTimeout(handleNextResult, 5000);
        }

        if (redirected && !searching && !processing) {
            log("Redirected...start search");
            if (onBtnClickGo(true)) return;
        }

        if (searching && !searchOver) {
            log("Continuing search...");
            if (onBtnClickGo(true)) return;
        }

        if (processing) {
            log("Processing - handleNextResult");
            handleNextResult();
        }

        log("[handlePageLoad] EXITING!!!");
    }


    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    enabled = GM_getValue("enabled", enabled);
    log("Script state: ", enabled ? "ENABLED" : "DISABLED");

    installStyles();

    callOnContentLoaded(handlePageLoad);

    //////////////////////////////////////////////////////////////////////
    // End main
    //////////////////////////////////////////////////////////////////////

    // Install UI handlers
    function InstallHandlers() {
        // Install handlers
        $('#xedx-go-btn').on('click', onBtnClickGo);
        $("#xedx-saveall-btn").on('click', saveStorageToDisk);
        $("#xedx-pause-btn").on('click', handlePauseBtn);
        $("#xedx-recover-btn").on('click', handleRecoverButton);
        $("#xedx-stop-btn").on('click', handleStopButton);
        $("#xedx-restart-btn").on('click', handleRestartButton);
        $("#xedx-address-btn").on('click', handleAddressBtn);

        $("#xedx-enabled").prop('checked', enabled);
        $("#xedx-enabled").on('click', handleEnableBtn);
        handleEnableBtn();  // Sets the state of buttons
    }

    // Get tables/DIVs for various UI pieces
    function GetTableFooter() {
        let u =
                           `</tbody></table></center>
                </td></tr>
            </tbody>
        </table>`;

        return u;
    }

    function GetTableHeader() {
        let u =
            `<table id="xedx-ui" width="100%" cellspacing="0" cellpadding="0">
                <tbody>
                    <tr><td style="color: white;" align="center" bgcolor="blue">
                        <b><span id="xedx-tbl-title">Archer's IIR Helper</span></b>
                    </td></tr>
                    <tr><td id="xedx-tbl-body" style="padding: 5px; border: 1px solid blue;" class="xedx-show">
                        <center><table><tbody><center>`;

        return u;
    }

    function GetMainPageUI() {
        let u = tblHdr + // TBD: Add an "Enabled" checkbox
            `<tr><td><button id="xedx-go-btn" class="xedx-btn">Start New Search</button>
            <button id="xedx-saveall-btn" class="xedx-btn">Save All</button>` +
            // `<td><tr><button id="xedx-recover-btn" class="xedx-btn">Start Recovery</button></td></tr>`
            `<button id="xedx-restart-btn" class="xedx-btn">Restart</button>
            <input type="checkbox" id="xedx-enabled" name="enable"><label for="enable">Enable Search</label></td></tr>` +

            `<tr><td><button id="xedx-address-btn" class="xedx-btn">Start Address Lookup</button></td></tr>
            <tr><td style="text-align: center" colspan="13">Save any page individually:</td></tr>
            <tr>
                <td>
                    <button class="xedx-btn bsm">A</button>
                    <button class="xedx-btn bsm">B</button>
                    <button class="xedx-btn bsm">C</button>
                    <button class="xedx-btn bsm">D</button>
                    <button class="xedx-btn bsm">E</button>
                    <button class="xedx-btn bsm">F</button>
                    <button class="xedx-btn bsm">G</button>
                    <button class="xedx-btn bsm">H</button>
                    <button class="xedx-btn bsm">I</button>
                    <button class="xedx-btn bsm">J</button>
                    <button class="xedx-btn bsm">K</button>
                    <button class="xedx-btn bsm">L</button>
                    <button class="xedx-btn bsm">M</button>
                </td>
            </tr>
            <tr>
                <td>
                    <button class="xedx-btn bsm">N</button>
                    <button class="xedx-btn bsm">O</button>
                    <button class="xedx-btn bsm">P</button>
                    <button class="xedx-btn bsm">Q</button>
                    <button class="xedx-btn bsm">R</button>
                    <button class="xedx-btn bsm">S</button>
                    <button class="xedx-btn bsm">T</button>
                    <button class="xedx-btn bsm">U</button>
                    <button class="xedx-btn bsm">V</button>
                    <button class="xedx-btn bsm">W</button>
                    <button class="xedx-btn bsm">X</button>
                    <button class="xedx-btn bsm">Y</button>
                    <button class="xedx-btn bsm">Z</button>
                </td>
            </tr>` + tblFtr;

        return u;
    }

    function GetProcessingUI() {
        let u = tblHdr +
           `<tr><td align="center" colspan="2"><span class="cred dt"><h2>Loading next page</h2></span></td></tr>
            <tr><td colspan="2"><span id="xedx-det-text" class="xedx-wait-span cblue">Each page takes about 10 seconds to load.</span></td></tr>
            <tr><td colspan="2"><span id="xedx-time-text" class="xedx-wait-span"></span></td></tr>
            <tr><td align="right"><button id="xedx-pause-btn" class="xedx-btn dt">Pause</button></td>
            <td align="left"><button id="xedx-stop-btn" class="xedx-btn dt">Stop</button></td></tr>` + tblFtr;

        return u;
    }

    /*
    function GetSearchPageUI() {
        let u = tblHdr +
              `<td align="left"><button id="xedx-go-btn" class="xedx-btn dt">Stearch!<button></td></tr>` + tblFtr;

        return u;
    }
    */

    function GetSearchingUI() {
        let u = tblHdr +
              `<tr><td align="center" colspan="2"><span class="cred dt"><h2>Search started ... please wait, be patient!</span></h2>
              <tr><td><span id="xedx-time-text" class="xedx-wait-span"></span></td></tr>
              <td align="center"><button id="xedx-stop-btn" class="xedx-btn dt">Stop</button></td></tr>` + tblFtr;

        return u;
    }

    function GetAddrDetailsUI() {
        let u = tblHdr +
              `<tr><td align="center" colspan="2"><span class="cred dt"><h2>Getting address details ... stand  by!</span></h2>
              <tr><td><span id="xedx-count-span" class="xedx-wait-span"></span></td></tr>
              <tr><td><span id="xedx-time-text" class="xedx-wait-span"></span></td></tr>
              <td align="center"><button id="xedx-stop-btn" class="xedx-btn dt">Stop</button></td></tr>` + tblFtr;

        return u;
    }

    function GetContinuesUI() {
        let u = tblHdr +
              `<tr><td align="center" colspan="2"><span class="cred dt">
                  <h2>Search continuing onto next page ... please wait, be patient!</span></h2>
              <td align="left"><button id="xedx-stop-btn" class="xedx-btn dt">Stop</button></td></tr>
              <tr><td><span id="xedx-time-text" class="xedx-wait-span"></span></td></tr>` + tblFtr;

        return u;
    }

    function GetRecoveringUI() {
        let u = tblHdr +
              `<tr><td align="center" colspan="2"><span class="cred dt">
                  <h2>Recovery started ... please wait, be patient!</span></h2>
              <td align="left"><button id="xedx-stop-btn" class="xedx-btn dt">Stop</button></td></tr>
              <tr><td><span id="xedx-time-text" class="xedx-wait-span"></span></td></tr>` + tblFtr;

        return u;
    }

    function GetRestartingUI() {
        let u = tblHdr +
              `<tr><td align="center" colspan="2"><span class="cred dt">
                  <h2>Restarting ... please wait, be patient!</span></h2>
              <td align="left"><button id="xedx-stop-btn" class="xedx-btn dt">Stop</button></td></tr>
              <tr><td><span id="xedx-time-text" class="xedx-wait-span"></span></td></tr>` + tblFtr;

        return u;
    }

    function GetStoppingUI() {
        let u = tblHdr +
              `<tr><td align="center" colspan="2"><span class="cred dt">
                  <h2>Stopping search ... please wait, be patient!</span></h2>
                  <tr><td><span id="xedx-time-text" class="xedx-wait-span"></span></td></tr>` + tblFtr;

        return u;
    }

    // Install common styles
    function installStyles() {
        GM_addStyle(`
            .xedx-container {
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .xedx-main-span {
                display: table;
                margin: 0 auto;
                color: red;
            }

            .cred {color: red;}
            .cblue {color: #000080;}

            .dt {display: table;}

            .xedx-wait-span {
                display: table;
                margin: 0 auto;
            }

            .xedx-hidden {
                display: none;
            }

            .bsm {width: 29px;}

            .xedx-btn {
                background: transparent linear-gradient(180deg,#CCCCCC 0%,#999999 60%,#666666 100%) 0 0 no-repeat;
                border-radius: 5px;
                font-family: Arial,sans-serif;
                font-size: 14px;
                font-weight: 700;
                text-align: center;
                letter-spacing: 0;
                color: #333;
                text-shadow: 0 1px 0 #ffffff66;
                text-decoration: none;
                text-transform: uppercase;
                margin: 5px;
                border: none;
                outline: none;
                overflow: visible;
                box-sizing: border-box;
                line-height: 16px;
                padding: 4px 8px;
                height: auto;
                white-space: nowrap;
                cursor: pointer;
            }
       `);


    }

})();
