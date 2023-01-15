// ==UserScript==
// @name         Archer's IIR Helper
// @namespace    http://tampermonkey.net/
// @version      0.2
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

    var gPaused = GM_getValue("paused", false);

    let firstLetterToSearchFor = 'j';
    let lastLetterToSearchFor = 'z'; // Normally would be "Z"!

    const homePageURL = "https://www.insolvencydirect.bis.gov.uk/eiir/IIRMasterPage.asp";
    const nameSearchURL = "https://www.insolvencydirect.bis.gov.uk/eiir/IIRRegisterNameInput.asp?option=NAME&court=ALL";
    const resultsPageURLPrefix = "https://www.insolvencydirect.bis.gov.uk/eiir/IIRSearchNames.asp";
    const errorPagePrefix = "https://www.insolvencydirect.bis.gov.uk/eiir/IIRErrorPage.asp";
    const resultsPageURL = "https://www.insolvencydirect.bis.gov.uk/eiir/IIRSearchNames.asp?court=ALL&courtname=&office=&officename=&OPTION=NAME";
    var topNavTarget = document.querySelector("#topnav");

    // UI elements
    const mainPageUI = GetMainPageUI();

    const searchPageUI =
          `<br>
          <div class="xedx-container">
              <h2><span class="cred">Archer's IIR Helper</span></h2>
          </div>
          <div class="xedx-container">
              <button id="xedx-go-btn" class="xedx-btn">Search!</button>
          </div>`;

    const searchingDiv =
          `<br><div>
              <h2><span class="xedx-wait-span cred">Search started ... please wait, be patient!</span></h2>
              <button id="xedx-stop-btn" class="xedx-btn">Stop</button>
           </div>`;

    const searchContinuesDiv =
          `<br><div>
              <h2><span class="xedx-wait-span cred">Search continuing onto next page ... please wait, be patient!</span></h2>
              <button id="xedx-stop-btn" class="xedx-btn">Stop</button>
           </div>`;

    const recoveringDiv =
          `<br><div>
              <h2><span class="xedx-wait-span cred">Recovery started ... please wait, be patient!</span></h2>
           </div>`;

    const processingDiv = GetProcessingUI();

    function onBtnClickGo() {
        log("[onBtnClickGo]");

        let redirected = GM_getValue("redirected", false);
        let searching = GM_getValue("searching", false);
        let searchOver = GM_getValue("searchOver", false);
        let processing = GM_getValue("processing", false);
        let currURL = location.href;
        let resultsPage = currURL.toLowerCase().indexOf(resultsPageURLPrefix.toLowerCase()) > -1;

        log("[onBtnClickGo]");
        log("Redirected? ", redirected);
        log("Searching? ", searching);
        log("Search over? ", searchOver);
        log("Processing? ", processing);
        log("Results page? ", resultsPage);

        // Reset vars as appropriate
        GM_setValue("redirected", false);

        if (location.href != nameSearchURL && !redirected && !searching) {
            window.location.href = nameSearchURL;
            GM_setValue("redirected", true);
            GM_setValue("searching", false);
            return;
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
            return;
        }

        // Check for a results page.
        if (resultsPage && searching) {
            let lastLtr = GM_getValue("lastSearch", lastLetterToSearchFor);
            log("Must be results for last search, letter = '" + lastLtr + "'");
            let morePages = handleNextResult();
            let processing = GM_getValue("processing", false);
            let msg = ("More page results? " + morePages + " still processing? " + processing);
            log(msg);
            return;
        }

        if (searching && !searchOver) {
            //let newLtr = GM_getValue("lastSearch", lastLetterToSearchFor);
            let newLtr = GM_getValue("_newLtr", "a");
            log("newLtr: ", newLtr);

            log("Continuing search for '" + newLtr + "'");
            //alert("Continuing search for '" + newLtr + "'");

            // Search again!
            $("#surnamesearch").val(newLtr);
            $("#btnSubmit").click();
            $("#mainbody > form").addClass("xedx-hidden");
            $("#mainbody > form").insertAfter(searchingDiv);

            return;
        }

        // All done?
        GM_setValue("searching", false);
        log("All done??? searching: " + searching + " processing: " + processing);
    }

    function nextChar(c) {
        return String.fromCharCode(c.charCodeAt(0) + 1);
    }

    function handleNextResult(inRecovery=false) {
        log("[handleNextResult]");

        let lastLtr = GM_getValue("lastSearch", lastLetterToSearchFor).toLowerCase();
        log("[handleNextResult]");
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

        alert("Search continuing, maybe...");
        //debugger;

        // Need to go back to the search page, and search again.
        if (lastLtr != 'z' && lastLtr != lastLetterToSearchFor.toLowerCase()) {
            let nextLtr = nextChar(lastLtr);
            GM_setValue("lastSearch", lastLtr);
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

        return false;
    }

    let intervalTimer = 0;
    function updateTimeText() {
        if (!GM_getValue("processing", false)) {
            $("#xedx-time-text").text("");
            clearInterval(intervalTimer);
            return;
        }

        //log("Setting detail text (cb)");
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

    //
    // CHECK ALL RETURN CODES IN HERE!!!!
    //
    function processCurrentPageResults(inRecovery=false) {
        log("[processCurrentPageResults]");
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
        $("#xedx-test-btn").text("Wait...");
        let keys = GM_listValues();
        log("Keys lenght: ", keys.length);
        let storageData = "";
        let counter = 0;
        for (let i=0; i < keys.length; i++) {
            let key = keys[i];
            if (key.indexOf("result.a") > -1) {
                counter++;
                storageData += GM_getValue(key, "") + "\r\n";
            }
        }
        log("Wrote " + counter + " entries to file, total " + storageData.length + " bytes");

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
        $("#xedx-test-btn").text("Test");
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

    function handleStopButton() {
        GM_setValue("redirected", false);
        GM_setValue("searching", false);
        GM_setValue("processing", false);
        GM_setValue("searchOver", true);
    }

    // Called on page load
    function handlePageLoad() {
        //debugger;
        let recovering = GM_getValue("recover", false);
        if (recovering) {
            let msg = "Recovery Mode!";
            log(msg);

            $(topNavTarget).after(recoveringDiv);

            alert(msg);
            GM_setValue("recover", false);

            // Oops - this can finish, need to continue if more pages to process
            // If returns TRUE, is looping still
            // FALSE, need to go to next page.
            //processCurrentPageResults(true);
            handleNextResult(true);
            return;
        }

        let currURL = location.href;

        // This is wrong ... to support recovery....
        if (currURL == homePageURL && !recovering && GM_getValue("searchOver", true)) { // Clear all state variables
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
        let redirected = GM_getValue("redirected", false);
        let searching = GM_getValue("searching", false);
        let processing = GM_getValue("processing", false);
        let processPage = GM_getValue("processPage", 0);
        let searchOver = GM_getValue("searchOver", false);

        log("[handlePageLoad]");
        log("target: ", topNavTarget);
        log("location: ", currURL);

        // Install a mini-UI
        if (topNavTarget) {
            //let useUI = searchPageUI;
            //log("UI is search page UI");
            let useUI = searchingDiv; // e"arch starts automatically - so put up "searching....
            log("UI is 'searching....'");

            if (location.href != nameSearchURL) {
                useUI = mainPageUI;
                if (!resultsPage) GM_setValue("searching", false);
                log("Changing UI to main page UI");
            }

            if (searching) {
                if (GM_getValue("continuing", false))
                    useUI = searchContinuesDiv;
                else
                    useUI = searchingDiv; //duringSearchUI;

                GM_setValue("continuing", false);
                log("Changing UI to 'searching...'");
            }

            if (processing) {
                useUI = processingDiv;
                log("Changing UI to 'processing...'");
            }

            log("Inserting main UI...");
            $(topNavTarget).after(useUI);

            // Install handlers
            $('#xedx-go-btn').on('click', onBtnClickGo);
            $("#xedx-test-btn").on('click', saveStorageToDisk);
            $("#xedx-pause-btn").on('click', handlePauseBtn);
            $("#xedx-recover-btn").on('click', function() {
                // TEMPORARY - cleared if not already in recovery mode, above!
                //
                GM_setValue("lastLtr", "This is unused!"); // accidentally got trashed...
                GM_setValue("processPage", 193);
                GM_setValue("lastPageClick", 193);
                GM_setValue("lastSearch", "i");
                GM_setValue("processing", true);
                GM_setValue("retries", 0);
                GM_setValue("searching", false);
                GM_setValue("paused", false);


                GM_setValue("recover", true);
                location.reload();
            });
            $("#xedx-stop-btn").on('click', handleStopButton);
            $("#xedx-atop-btn").on('click', function() {
                GM_setValue("redirected", false);
                GM_setValue("searching", false);
                GM_setValue("processing", false);

                location.href = homePageURL;
            });

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

        gPaused = GM_getValue("paused", false);
        log("Paused? ", gPaused);
        if (gPaused) {
            $("#xedx-det-text").text("Paused!");
            //setTimeout(processCurrentPageResults, 5000);
            setTimeout(handleNextResult, 5000);
        }

        //GM_setValue("redirected", false);
        if (redirected && !searching && !processing) {
            log("Redirected...start search");
            onBtnClickGo(true);
        }

        if (searching && !searchOver) {
            log("Continuing search...");
            onBtnClickGo(true);
        }

        if (processing) {
            //processCurrentPageResults();
            handleNextResult();
        }

        log("[handlePageLoad] EXITING!!!");
    }


    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    installStyles();

    callOnContentLoaded(handlePageLoad);

    //////////////////////////////////////////////////////////////////////
    // End main
    //////////////////////////////////////////////////////////////////////

    function GetMainPageUI() {
        let u =    // TBD: Add an "Enabled" checkbox
        `
          <table width="100%" cellspacing="0" cellpadding="0">
            <tbody>
                <tr><td style="color: white;" align="center" bgcolor="blue">
                    <b><span id="xedx-tbl-title">Archer's IIR Helper</span></b>
                </td></tr>
                <tr><td id="xedx-tbl-body" style="padding: 5px; border: 1px solid blue;" class="xedx-show">
                    <center><table><tbody>
                        <td><tr><button id="xedx-go-btn" class="xedx-btn">Start Searching</button></td></tr>
                        <td><tr><button id="xedx-test-btn" class="xedx-btn">Save All</button></td></tr>
                        <td><tr><button id="xedx-recover-btn" class="xedx-btn">Start Recovery</button></td></tr>
                        <tr><td style="text-align: center" colspan="13">Save any page individually:</td></tr>
                        <tr>
                            <td><button class="xedx-btn">A</button></td>
                            <td><button class="xedx-btn">B</button></td>
                            <td><button class="xedx-btn">C</button></td>
                            <td><button class="xedx-btn">D</button></td>
                            <td><button class="xedx-btn">E</button></td>
                            <td><button class="xedx-btn">F</button></td>
                            <td><button class="xedx-btn">G</button></td>
                            <td><button class="xedx-btn">H</button></td>
                            <td><button class="xedx-btn">I</button></td>
                            <td><button class="xedx-btn">J</button></td>
                            <td><button class="xedx-btn">K</button></td>
                            <td><button class="xedx-btn">L</button></td>
                            <td><button class="xedx-btn">M</button></td>
                        </tr>
                        <tr>
                            <td><button class="xedx-btn">N</button></td>
                            <td><button class="xedx-btn">O</button></td>
                            <td><button class="xedx-btn">P</button></td>
                            <td><button class="xedx-btn">Q</button></td>
                            <td><button class="xedx-btn">R</button></td>
                            <td><button class="xedx-btn">S</button></td>
                            <td><button class="xedx-btn">T</button></td>
                            <td><button class="xedx-btn">U</button></td>
                            <td><button class="xedx-btn">V</button></td>
                            <td><button class="xedx-btn">W</button></td>
                            <td><button class="xedx-btn">X</button></td>
                            <td><button class="xedx-btn">Y</button></td>
                            <td><button class="xedx-btn">Z</button></td>
                        </tr>
                    </tbody></table></center>
                </td></tr>
            </tbody>
        </table>`;

        return u;
    }

    function GetProcessingUI() {
        let u =
           `<table width="100%" cellspacing="0" cellpadding="0">
            <tbody>
                <tr><td style="color: white;" align="center" bgcolor="blue">
                    <b><span id="xedx-tbl-title">Archer's IIR Helper</span></b>
                </td></tr>
                <tr><td id="xedx-tbl-body" style="padding: 5px; border: 1px solid blue;" class="xedx-show">
                    <center><table><tbody>
                        <tr><td><span id="xedx-det-text" class="xedx-wait-span cblue">Each page takes about 10 seconds to load.</span></td></tr>
                        <tr><td><span id="xedx-time-text" class="xedx-wait-span"></span></td></tr>
                        <td><tr><button id="xedx-pause-btn" class="xedx-btn">Pause</button></td></tr>
                        <td><tr><button id="xedx-stop-btn" class="xedx-btn">Stop</button></td></tr></tbody></table></center>
                </td></tr>
            </tbody>
        </table>`;

        /*
          `<br><div>
              <h1><span class="xedx-wait-span cred">Processing results ... please be patient!</span></h1>
              <span id="xedx-det-text" class="xedx-wait-span cblue">Each page takes about 10 seconds to load.</span>
              <span id="xedx-time-text" class="xedx-wait-span"></span>
              <br><button id="xedx-pause-btn" class="xedx-btn">Pause</button>
              <br><button id="xedx-atop-btn" class="xedx-btn">Stop</button>
           </div>`;
        */

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
            .cblue {color: #000080;;}

            .xedx-wait-span {
                display: table;
                margin: 0 auto;
            }

            .xedx-hidden {
                display: none;
            }

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