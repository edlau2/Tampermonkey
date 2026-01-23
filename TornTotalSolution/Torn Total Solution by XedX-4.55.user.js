// ==UserScript==
// @name         Torn Total Solution by XedX
// @namespace    http://tampermonkey.net/
// @version      4.55
// @description  A compendium of many of my individual scripts
// @author       xedx [2100735]
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @match        https://www.torn.com/*
// @match        http://18.119.136.223:8080/TornTotalSolution/*
// @connect      api.torn.com
// @run-at       document-start
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-Hints-Helper.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint curly: 0*/

// ********************************** TBD FIX FOR API V2 *************************************

//
// This script combines several scripts that were previously only available individually.
//
// These scripts were originally written aeons ago (2019), and consolidated in 2022. I plan
// on updating many to use more JQuery and in general simplify things as time permits, it is
// a continuously ongoing process with both this script, my remaining stand-alone scripts
// that are not included here, and the general library that supports them all.
//
// All are configurable, and can be enabled/disabled individually. The IP address listed above,
// 18.119.136.223, hosts the HTML template and acts as a server for the dynamically created
// created options pages. There is some documentation
// at my GitHub site - but usually horribly outdated and incomplete! If you'd like to look, you
// can visit here: https://github.com/edlau2/Tampermonkey/tree/master/TornTotalSolution and also
// the root where many of the included scripts have outdated/deprecated stand-alone versions that
// may have documentation: https://github.com/edlau2/Tampermonkey/tree/master
//
// Torn Latest Attacks Extender - shows up to the last 100 attacks you've been in, with more detail.
// Torn Stat Tracker - Allows you to easily track statistics of interest right on the home page.
// Torn Drug Stats - Shows stats about drug usage, with tool tips describing drug effect.
// Torn Crime Tooltips - Shows data about your progress in crime merits.
// Torn Sidebar Colors - Just for fun, colors the sidebar icons.
// Torn Hide-Show Chat Icons - Allows you to easily hide and show the chat icons.
// Torn Fac Respect Earned - Shows respect earned for your fac, with tool tips for merit progress.
// Torn Collapsible Sidebar - Makes custom links on the sidebar collapsible, whether added by me, TT, altercoes...
// Torn Jail Stats - Adds basic jail stats to the Home page, jail busts and fails, bails and bail fees.
// Torn Customizable Sidebar - Adds links to pages you commonly use to the sidebar.
// Torn TT Filter - Tweaks the Torn Tools display to my liking, disabling some redundant features.
// Torn Item Hints - Adds useful info onto the items page, so you don't have to expand the item.
// Torn Museum Sets Helper - Helps determine when museum sets are complete in Item pages
// Torn Weapon Sort - Sorts weapons on the Items page by various criteria
// Torn Weapon Experience Tracker - Displays a weapon's WE on the Itms page.
// Torn Weapon Experience Spreadsheet - Creates a new expandable DIV on the Items page with Weapon Experience info in a table
// Torn See The Temps - Allows lingering temps to be visible before an attack
// Torn Scroll On Attack - Modify the attack page to suit my needs (scrolls view upward)
// Torn Holdem Score - Makes the poker 'score' visible on the poker page. (TBD)
// Torn Stock Profits - Displays current stock profits for owned shares
// Torn Jail Scores - Displays the bust 'score', and collects data to calculate % chance of success (TBD)
// Torn Fac Page Search - Adds custom search bar to search various fac pages, and *really* highlight matches
// Torn Point Refill Safety Net - Disables the refill button if energy/nerve not empty (can be over-ridden)
// Torn User List Extender - Adds rank to user lists, life left (highlighted if full), an country icon if travellng.
// Torn Overseas Rank Indicator - Indicates rank on the abroad 'people' page, as well as if just landed, and life.
// Torn Ammo & Mods Links - Adds a 'Mods' link to ammo page, and vice-versa.
// Torn Crime Details - Displays detailed info about your criminal record, on the home apge
// Torn Travl Alerts - Warns you to remember cash and a stealthy weapon, and lets you know if you're naked
// Torn Company Employees - Displayed the number of employees a company has, on the Job Listings page.
//
// Torn Bounty List Extender - TBD
//

//
// For programmers: The way this is set up - at the very bottom are the entry points. The main entry point first
// looks to see if called from Torn, or from the 2 configuration HTML pages (later to be merged into one).
//
// In general, to follow the script - use code folding! Fold everything at the top level beneath
// the anonymous function "(function() {}". Every sub-script is in it's own code-folded block, with the exception
// of public/static function related to updating/stopping/restarting that sub function. THose may be triggered from
// other areas, such as the config pages.
//
// If not from a config script, 3 callback are set up. One is called on DOMContentLoaded, another at
// readystate complete, and the third when an Torn API call is complete. It currently queries four selections.
//
// Each of these 3 callbacks can have a filter added so that new subscripts which are Torn page specific,
// such as perhaps the Items page (@match https://www.torn.com/item.php) can be called only when on
// those specific pages.
//
// Note: this has since changed slightly, this script itself now is set up to @run-at document start, and a few tings
// are started when this script is, not delayed. So need to be careful about when stuff gets launched. If
// this starts when on an attack page, it only loads scripts that run on that page and returns.
//
// Each of three callbacks in turn calls an entry point for each 'subscript', which returns a promise so as to
// be async. These are structured to be easily code-folded, for clarity in the script as a whole. Since these are
// all static functions, not need for a class, so you'll see the habit of functions placed inside of functions.
// Each subfunction entry point has a corresponding 'remove' function so the subscript can be dynamically
// enabled and disabled without a page refresh. Constants and globals for each subscript are kept by them for
// convenience.
//
// The exception to this general case of two functions for each subscript, is the configuration related functions,
// for the general script as a whole, the config for the 'customizable sidebar links', and a secondary web page
// for the 'Stat Tracker' script (whch will be merged into the general opts page at some point).
//
// On configuration pages (new HTML docs), the tables can automatically expand and collapse using the following classes:
// xtblehdr - for the header.
// xvisible - add to TD's to hide/show
//

(function() {
    'use strict';

    logScriptStart();

    //////////////////////////////////////////////////////////////////////
    // Options and global variables
    //////////////////////////////////////////////////////////////////////

    // over-ride setting in JS-Helpers...done via Options screen now.
    //alertOnError = false;
    //GM_setValue('alertOnError', true);

    // Log for API calls
    var apiCallLog = {}; // Must be before initDebugOptions()!
    var maxApiCalls = 10;

    // Misc debug stuff
    var alertOnRetry = false;
    loadApiCallLog();
    initDebugOptions();
    var xedxDevMode = false;

    var enableDebugger = GM_getValue("enableDebugger", false);

    // Configuration page URL's
    const configHost = "18.119.136.223:8080";
    const genConfigPath = "/TornTotalSolution/TTS-Opts.html";
    const statsConfigPath = "/TornTotalSolution/StatTracker.html";

    // These are the URLs for the framework HTML that is used to hold the
    // dynamically created options pages, which save the option locally in
    // script local storage. Nothing is ever saved at these URLs.

    // Note: I'm now testing only using a 100% internally generated options page, which
    // means that when it changes this script will have to change also. Up side is this
    // script won't have to connect to my server, hosted at AWS, which could, although
    // highly unlikely, be down.
    //
    // This is the variable that contols using the locally generated vs remote page.
    // Here I am forcing to true, use locally generated page.
    // Does not work! Must over-write downloaded page....
    var useLocalCfgPage = GM_getValue("useLocalCfgPage", false);
    //GM_setValue("useLocalCfgPage", true);

    const tornStatTrackerCfgURL = "http://18.119.136.223:8080/TornTotalSolution/StatTracker.html";
    const tornTotalSolutionCfgURL = "http://18.119.136.223:8080/TornTotalSolution/TTS-Opts.html";
    const tornTotalSolutionCfgURLAlt = "http://18.119.136.223:8080/TornTotalSolution/TTS-OptsAlt.html";

    var jsonResp = null;
    var personalStats = null;
    var honorsAwarded = null;
    var attacks = null;
    var weArray = null;
    var fhArray = null;

    // Note: The 'User->Inventory' API call has been removed, perhaps
    // permanently. This won't work unless a workaround is found.
    var inventoryArray = null; // JSON Array of your inventory

    let itemsArray = null; // JSON Array of all Torn items

    var userId = null;
    var userName = null;

    var queryRetries = 0; // global retry attempts for certain API errors, cleared after 5 (only try 5 times)

    const recoverableErrors = [5, // Too many requests
                               8, // IP Block
                               9, // API disabled
                               17 // Backend error occured
                               ];

    // General global options storage I haven't made a place for yet
    var globalOpts = {};

    // Install hooks for sortable lists
    //attachSortHooks();

    //class API_LOG {
        //constructor() {this.loadApiCallLog()}

        function loadApiCallLog() {
            log('[loadApiCallLog]');
            let rawData = GM_getValue("call_log", null);
            apiCallLog = rawData ? JSON.parse(rawData) : {};
            pruneApiCalLog();
        }
        function writeApiCallLog() {
            log('[writeApiCallLog]');
            pruneApiCalLog();
            GM_setValue("call_log", JSON.stringify(apiCallLog));
        }
        function clearApiLog() {
            apiCallLog = {};
            writeApiCallLog();
        }
        function pruneApiCalLog() {
            let keys = Object.keys(apiCallLog);
            debug('[pruneApiCalLog] length=', keys.length, 'max: ', maxApiCalls);
            if (keys.length <= maxApiCalls) return;

            for (let i=0; i<(keys.length - maxApiCalls); i++) {
                debug('[pruneApiCalLog] deleting ', keys[i]);
                delete apiCallLog[keys[i]];
            }
            GM_setValue('call_log_updated', true);
        }

        function logApiCall(data) {
            let timestamp = dateConverter(new Date(), "YYYY-MM-DD HH:MM:SS");
            apiCallLog[timestamp.toString()] = data;
            writeApiCallLog();
            GM_setValue('call_log_updated', true);
            debug('[logApiCall] ', GM_getValue('call_log_updated'));
        }
    //}

    // Helper to debug failed promises
     function rejectDebug(error) {
        let nonFatal = error.toString().indexOf('wrong page') > -1 || // Suppress 'wrong page' errors for now. Change to resolve's?
            error.toString().indexOf('not at home') > -1 ||
            error.toString().indexOf('not yet implemented') > -1;

        if (!nonFatal) {
            //debugger;
            log("fatal reject: ", error);
        } else {
            log("non-fatal reject: ", error);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Styles used on config pages, make into external CSS?
    //////////////////////////////////////////////////////////////////////

    function addStyles() {
        GM_addStyle(`.xtblehdr {background-color: #778899; cursor: pointer;}`); // Clickable, expands/collapses table
        GM_addStyle(`.xexpand {background-color: #A9A9A9; cursor: pointer;}`); // Clickable, only visible when collapsed, expands table
        GM_addStyle(`.xhidden {display: none;} .xvisible {display: table row;}`); // Classes for hideable table rows
        GM_addStyle(`.defbg {background-color: #FFFFF0;}`); // #FFE4C4;
        GM_addStyle(`.highlight-active {-webkit-animation: highlight-active 1s linear 0s infinite normal;
                                        animation: highlight-active 1s linear 0s infinite normal;}`);

        // Note that this style is referenced by one function in the helper lib
        //GM_addStyle(".xhyperlink {filter: brightness(85%);}");

        //GM_addStyle(
        //    `
        //    .xedx-green {color: limegreen;}
        //    .xedx-red {color: red;}
        //    .xedx-offred {color: #FF2B2B;}
        //     `);
    }

    //////////////////////////////////////////////////////////////////////
    // API calls (profile, attacks, personalstats, honors)
    //////////////////////////////////////////////////////////////////////

    // TBD FIX FOR API V2

    // Get data used for most of the handlers in here, in one call.
    // Note: The 'User->Inventory' API call has been removed, perhaps
    // permanently. This won't work unless a workaround is found.
    function personalStatsQuery(callback=personalStatsQueryCB) {
        logApiCall('user: personalstats,profile,attacks,honors,weaponexp');
        xedx_TornUserQuery(null, 'personalstats,profile,attacks,honors,weaponexp', callback);
    }

    // Callback for above
    function personalStatsQueryCB(responseText, ID) {
        if (responseText == undefined) {
            log('[personalStatsQueryCB] unknown error, no response!');
            return;
        }

        try {
           jsonResp = JSON.parse(responseText);
        }
        catch (err) {
            log("[personalStatsQueryCB] error, invalid JSON");
            log("response: ", responseText);
            log("error: ", err);
            return handleApiComplete(); //handleError(responseText);
        }

        if (!jsonResp) return handleError(responseText);

        if (jsonResp && jsonResp.error) {
            if (jsonResp.error.code == 17) {
                if (queryRetries++ < 5) {
                    if (alertOnRetry) alert("Retrying error 17!");
                    return personalStatsQuery();
                } else {
                    queryRetries = 0;
                }
            }
            return  handleError(responseText);
        }

        personalStats = jsonResp.personalstats;
        honorsAwarded = jsonResp.honors_awarded;
        attacks = jsonResp.attacks;
        weArray = jsonResp.weaponexp;
        fhArray = jsonResp.personalstats;

        // Note: The 'User->Inventory' API call has been removed, perhaps
        // permanently. This won't work unless a workaround is found.
        inventoryArray = jsonResp.inventory;

        userId = jsonResp.player_id;
        userName = jsonResp.name;

        // Call scripts that depend on stats being available
        handleApiComplete();
    }

   

    /****************************************************************************
     *
     * May change all the following to classes...can the contructor return a
     * promise? Or just have each class have a common "install()" and
     * "remove()" function?
     *
     ****************************************************************************/

    //////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Latest Attacks Extender" (called at API call complete)
    //////////////////////////////////////////////////////////////////////////////

    function tornLatestAttacksExtender() {
        log('[tornLatestAttacksExtender]');

        const latest_attacks_config_div = getLatestAttacksCfgDiv();
        const latest_attacks_div = getLatestAttacksDiv();
        const latestAttacksconfig = {
            'max_values': GM_getValue('latest_attacks_max_values', 100),
            'date_format': GM_getValue('latest_attacks_date_format', "YYYY-MM-DD HH:MM:SS")
         };

        return new Promise((resolve, reject) => {
            if (abroad()) return resolve('[tornLatestAttacksExtender] not at home!');
            if (!isIndexPage()) resolve('[tornLatestAttacksExtender] wrong page!');

            GM_addStyle(`.xadwrap {
                            display: flex;
                            flex-direction: row;
                            height: 36px !important;
                            padding: 2px 0px 2px 10px !important;
                        }`);

            let result = extendLatestAttacks();
            if (result)
                return reject("tornLatestAttacksExtender rejected: " + result);
            else
                return resolve("tornLatestAttacksExtender complete!");
        });

        function extendLatestAttacks() {
            // Find first column
            let mainDiv = $('#column1');
            if (!$(mainDiv).length) {return '[extendLatestAttacks] Error: main div not found! Consider launching later.';}
            $(mainDiv).append(latest_attacks_div);

            // Hook up button handler(s)
            $('#la-config-btn').on('click', function () {createConfigDiv();});

            $("#xedx-mattacks-ext").on('click', divArrowStateToggle);

            let key = 'xedx-mattacks-ext_active';
            let sel = "#xedx-mattacks-ext > div.bottom-round";
            let isActive = GM_getValue(key, true);
            if (isActive) {
                $("#xedx-mattacks-ext").addClass("active");
                $(sel).addClass("xshow").removeClass("xhide");
            } else {
                $("#xedx-mattacks-ext").removeClass("active");
                $(sel).addClass("xhide").removeClass("xshow");
            }

            populateLatestAttacksList();
        }

        function populateLatestAttacksList() {
            let counter = 0;
            let ul = document.getElementById('latest-attacks-list');

            loadListStyles();

            let keys = Object.keys(attacks).reverse(); // Why reverse? Latest first...
            for (let i = 0; i < keys.length; i++) {
                let obj = attacks[keys[i]];

                let newNode = buildNode(obj);
                $(ul).append(newNode);

                if (counter++ > latestAttacksconfig.max_values) {return;}
            }
        }

        // Never add the XID? What is this for?
        function createLaLi(span) {
            var li = document.createElement("li");
            var a1 = document.createElement('a')
            a1.className = 't-blue';
            span.appendChild(a1);
            return li;
        }

        // loader.php?sid=attackLog\u0026ID=' + obj.code;
        function buildNode(obj) {
            let sp = "&nbsp;";
            let offense = (obj.attacker_id == userId);

            // Often too long, just need tag..
            // https://api.torn.com/faction/51035?selections=basic&key=
            // The fac ID is obj.attacker_faction/defender_faction
            let facName = (offense && obj.defender_factionname) ? ' (' + obj.defender_factionname + ')' : '';
            let d = new Date(0);
            d.setUTCSeconds(obj.timestamp_ended);
            let title = dateConverter(d, latestAttacksconfig.date_format);
            let attacker = obj.attacker_name ? obj.attacker_name : 'someone';
            let stealth = (offense && obj.stealthed);
            let stTxt = stealth ? ' (stealth)' : '';
            let logURL = "loader.php?sid=attackLog\u0026ID=" + obj.code;

            let result = obj.result;
            if (result === 'Lost') {result = 'Attacked and lost to';}
            if (result === 'Stalemate') {result = 'Stalemated with';}
            if (result === 'Escape') {result = 'Escaped from';}
            if (result === 'Assist') {result = 'Assisted in attacking';}

            //let respect = offense ? ("Respect gained: " +obj.respect_gain) : ("Respect Lost: "  + obj.respect_loss);
            let respect = offense ? ("+" + obj.respect_gain) : ("-"  + obj.respect_loss);

            let newNode =
            `<li class="xadwrap" title="${title}">
                <span class="x-rdivider" style="width: 80%; white-space: nowrap; overflow:hidden;
                    display: flex; align-content: center; justify-content: space-between;">
                    <span style="display: flex; flex-flow: row wrap; align-content: center;">
                        <a href="profiles.php?XID=${obj.attacker_id}" target="_blank">${sp} ${attacker} ${sp} </a>
                        ${result}${stTxt}<a href='profiles.php?XID=${obj.defender_id}' target="_blank">
                        ${sp}${obj.defender_name} ${facName}</a>
                    </span>
                    <span style="display: flex; float: right; justify-content: flex-end; align-content: center;flex-wrap: wrap;">${respect}</span>
                </span>
                <span class="xflex">
                    <a href="${logURL}" target="_blank">
                        <span class="xview">View</span>
                    </a>
                </span>
            </li>`;

            return newNode;
        }

        function getTestSvg() {
            return `
            <svg class="xsvg" fill="#000000" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                 width="20px" height="20px" viewBox="0 0 442.04 442.04"
                 xml:space="preserve">
            <g>
                <g>
                    <path d="M221.02,341.304c-49.708,0-103.206-19.44-154.71-56.22C27.808,257.59,4.044,230.351,3.051,229.203
                        c-4.068-4.697-4.068-11.669,0-16.367c0.993-1.146,24.756-28.387,63.259-55.881c51.505-36.777,105.003-56.219,154.71-56.219
                        c49.708,0,103.207,19.441,154.71,56.219c38.502,27.494,62.266,54.734,63.259,55.881c4.068,4.697,4.068,11.669,0,16.367
                        c-0.993,1.146-24.756,28.387-63.259,55.881C324.227,321.863,270.729,341.304,221.02,341.304z M29.638,221.021
                        c9.61,9.799,27.747,27.03,51.694,44.071c32.83,23.361,83.714,51.212,139.688,51.212s106.859-27.851,139.688-51.212
                        c23.944-17.038,42.082-34.271,51.694-44.071c-9.609-9.799-27.747-27.03-51.694-44.071
                        c-32.829-23.362-83.714-51.212-139.688-51.212s-106.858,27.85-139.688,51.212C57.388,193.988,39.25,211.219,29.638,221.021z"/>
                </g>
                <g>
                    <path d="M221.02,298.521c-42.734,0-77.5-34.767-77.5-77.5c0-42.733,34.766-77.5,77.5-77.5c18.794,0,36.924,6.814,51.048,19.188
                        c5.193,4.549,5.715,12.446,1.166,17.639c-4.549,5.193-12.447,5.714-17.639,1.166c-9.564-8.379-21.844-12.993-34.576-12.993
                        c-28.949,0-52.5,23.552-52.5,52.5s23.551,52.5,52.5,52.5c28.95,0,52.5-23.552,52.5-52.5c0-6.903,5.597-12.5,12.5-12.5
                        s12.5,5.597,12.5,12.5C298.521,263.754,263.754,298.521,221.02,298.521z"/>
                </g>
                <g>
                    <path d="M221.02,246.021c-13.785,0-25-11.215-25-25s11.215-25,25-25c13.786,0,25,11.215,25,25S234.806,246.021,221.02,246.021z"/>
                </g>
            </g>
            </svg>`;
        }

        function loadListStyles() {
            GM_addStyle(`
                .xsvg {
                    margin-left: 0px;
                    }
                .xflex {
                    left: 0;
                    display: inline-flex;
                    }
                .xview {
                    padding-top: 10px;
                    margin-left: 10px;
                    }
                .xhref {
                    margin-bottom: 0px;
                    }
                .x-rdivider {
                    border-right: solid 1px black;
                    line-height: 1.4;
                    }
                `);
        }

        function createConfigDiv() {
            if (document.getElementById('config-div')) return;

            let extendedDiv = document.getElementById('xedx-mattacks-ext');
            if (!$(extendedDiv).length) {return;}
            $(extendedDiv).append(latest_attacks_config_div);
            $("#la-status-hdr").css("display", "none");

            $('#la-maxinput').val(GM_getValue('latest_attacks_max_values', "100"));
            $('#la-dateformat').val(GM_getValue('latest_attacks_date_format', "YYYY-MM-DD HH:MM:SS")); // Index 2 (dateFormat.selectedIndex)

            $('#la-cancel-btn').on('click', function () {$('#la-config-div').remove()});
            $('#la-save-btn').on ('click', function () {saveLaConfig()});
        }

         // Handler for 'Config' screen, 'Save' button
        function saveLaConfig() {
            let maxInput = document.getElementById('la-maxinput');
            let dateFormat = document.getElementById('la-dateformat');

            if (maxInput.value > 100 || !isaNumber(maxInput.value) || maxInput.value < 0) {
                maxInput.value = 100;
            }

            GM_setValue('latest_attacks_max_values', maxInput.value);
            GM_setValue('latest_attacks_date_format', dateFormat.options[dateFormat.selectedIndex].text);

            latestAttacksconfig.max_values = GM_getValue('latest_attacks_max_values', "100");
            latestAttacksconfig.date_format = GM_getValue('latest_attacks_date_format', "YYYY-MM-DD HH:MM:SS");

            let headerDiv = document.getElementById('la_header_div');
            headerDiv.removeChild(headerDiv.lastChild);
            headerDiv.appendChild(document.createTextNode('Latest Attacks (Previous ' + GM_getValue('latest_attacks_max_values') + ')'));

            //$('#la-config-div').parentNode.removeChild(element);
            $("#la-status").text("Saved!");
            $("#la-status-hdr").css("display", "block");
            $("#la-cancel-btn").remove();
            $("#la-save-btn").remove();
            setTimeout(function() {$('#la-config-div').remove();}, 3000);
        }

        // Functions to hide DIV's using code collapse
        function getLatestAttacksCfgDiv() {
            const result =
              '<div id="la-config-div" class="cont-gray bottom-round" style="text-align: center">' +
                  '<br>Max Entries (0-100): <input type="text" id="la-maxinput"><br>' +
                  '<br>Date format: ' +
                  '<select id="la-dateformat">' +
                      '<option value="YYYY-MM-DD">YYYY-MM-DD</option>' +
                      '<option value="YYYY-MONTH-DD DDD">YYYY-MONTH-DD DDD</option>' +
                      '<option value="YYYY-MM-DD HH:MM:SS">YYYY-MM-DD HH:MM:SS</option>' +
                      '<option value="DAY MONTH DD YYYY HH:MM:SS">DAY MONTH DD YYYY HH:MM:SS</option>' +
                      '<option value="FULL (DAY MONTH DD YYYY HH:MM:SS TZ)">FULL (DAY MONTH DD YYYY HH:MM:SS TZ)</option>' +
                  '</select>' + //<br><br>' +
                  '<div id="la-status-hdr" style="margin: 10px; width: 100%; height: 24px;">' +
                      '<span id="la-status" style="color: red; text-align: center;"></span>' +
                  '</div>' +
                  '<button id="la-cancel-btn" style="margin: 0px 10px 10px 0px;">Cancel</button>' +
                  '<button id="la-save-btn" style="margin: 0px 10px 10px 0px;">Save</button>' +
              '</div>';

            return result;
        }

        function getLatestAttacksDiv() {
            const result =
              '<div class="sortable-box t-blue-cont h" id="xedx-mattacks-ext">' +
                  '<div id="la_header_div" class="title xarrow main-title title-black active top-round" role="heading" aria-level="5">' +
                      '<div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>' +
                      '<div class="move-wrap"><i class="accordion-header-move right"></i></div>' +
                      'Latest Attacks (Previous 100)' +
                  '</div>' +
                  '<div class="bottom-round xexh">' +
                  '    <div class="cont-gray bottom-round" style="height: 179px; overflow: auto">' +
                          '<ul class="list-cont" id="latest-attacks-list">' +
                          '</ul>' +
                      '</div>' +
                  '</div>' +
                  '<div class="bottom-round title-black  xexh" style="text-align: center">' +
                      '<button id="la-config-btn" class="powered-by">Configure</button>' +
                  '</div>' +
              '</div>';
            return result;
        }
    }

    function removeLatestAttacksExtender() {$("#xedx-mattacks-ext").remove()}

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Stat Tracker" (called at API call complete)
    //////////////////////////////////////////////////////////////////////

    const optStats = {};
    const categoryColors = {"drugs":   '#FF69B4',  // Hot Pink
                            "travel":  '#6495ED',  // Cornflower Blue
                            "attacks": '#DC143C',  // Crimson
                            "weapons": '#FFD700',  // Gold
                            "medical": '#7FFF00',  // Chartreuse
                            "racing":  '#228B22',  // Forest Green
                            "foes":    '#FF8C00',  // DarkOrange
                            "jail":    '#CD5C5C',  // Indian Red
                            "skill":   'yellow',
                            "misc":    '#FF60B0',  // No clue, need a color here...
                           };

    function tornStatTracker() {
        log('[tornStatTracker]');

        const stats_div = loadStatsDiv();
        const award_li = loadAwardLi();

        var stats_intervalTimer = null;
        var stats_updateTimer = null;
        var stats_configWindow = null;
        var autoUpdateMinutes = 0; // Only sorta works, not sure why.

        return new Promise((resolve, reject) => {
            if (abroad()) return resolve('[tornStatTracker] not at home!');
            if (!isIndexPage()) resolve('[tornStatTracker] wrong page!');

            initOptStats();
            if (!optStats.length) autoUpdateMinutes = 0;

            let result = buildStatsUI();

            if (autoUpdateMinutes) {
                debug('[tornStatTracker] updating every ' + autoUpdateMinutes + ' minute(s)');
                stats_updateTimer = setInterval(function() {
                    personalStatsQuery(updateStatsHandlerer)}, autoUpdateMinutes *60 * 1000);
            }

            if (result)
                return reject("tornStatTracker rejected: " + result);
            else
                return resolve("tornStatTracker complete!");
        });

        function updateStatsHandlerer(responseText, ID) {
            log('[updateStatsHandlerer]');
            let _jsonResp = JSON.parse(responseText);
            if (_jsonResp.error) {
                if (queryRetries++ < 5) {
                    if (alertOnRetry) alert("Retrying error 17!");
                    return personalStatsQuery(updateStatsHandlerer);
                } else {
                    queryRetries = 0;
                }
                return handleError(responseText);
            }

            //jsonResp = _jsonResp;
            personalStats = _jsonResp.personalstats;
            honorsAwarded = _jsonResp.honors_awarded;
            attacks = _jsonResp.attacks;

            userId = _jsonResp.player_id;
            userName = _jsonResp.name;

            buildStatsUI(true);
        }

        function buildStatsUI(update=false) {
            //let targetDivRoot = document.querySelector("#mainContainer > div.content-wrapper.m-left20 >" +
            //                                               " div.content.m-top10 > div.sortable-list.left.ui-sortable");
            //let divList = $("#mainContainer > div.content-wrapper.m-left20 > div.content.m-top10 > div.sortable-list.left.ui-sortable > div");

            let targetDivRoot = document.querySelector("#mainContainer > div.content-wrapper >" +
                                                           " div.content > div.sortable-list.left.ui-sortable");
            let divList = $("#mainContainer > div.content-wrapper > div.content > div.sortable-list.left.ui-sortable > div");

            let targetDiv = divList[3];
            debug('[tornStatTracker] targetDivRoot: ', targetDivRoot, ' divList: ', divList, ' targetDiv: ', targetDiv);
            if (!targetDiv) targetDiv = $("#item10961668");
            if (!targetDiv) targetDiv = $("#item10961671");
            // ...

            if (!targetDiv) return '[tornStatTracker] targetDiv not found! Consider starting later.';

            if (!document.querySelector("#xedx-mstats-tracker")) {
                $(targetDiv).after(stats_div);
                $('#config-btn').on('click', createStatsConfigDiv);
                $('#refresh-btn').on('click', function() {
                    $('#refresh-btn').addClass('highlight-active');
                    personalStatsQuery(updateStatsHandlerer);
                    setTimeout(function() {$('#refresh-btn').removeClass('highlight-active')}, 3000);
                });
            }

            $("#xedx-mstats-tracker").on('click', divArrowStateToggle);

            let key = 'xedx-mstats-tracker_active';
            let sel = "#xedx-mstats-tracker > div.bottom-round";
            let isActive = GM_getValue(key, true);
            if (isActive) {
                $("#xedx-mstats-tracker").addClass("active");
                $(sel).addClass("xshow").removeClass("xhide");
            } else {
                $("#xedx-mstats-tracker").removeClass("active");
                $(sel).addClass("xhide").removeClass("xshow");
            }

            // Populate the UL of enabled stats
            log("tornStatTracker build UL");
            let keys = Object.keys(optStats);
            for (let i=0; i < keys.length; i++) {
                let statName = keys[i];
                debug("tornStatTracker: ", statName, " enabled: ", optStats[statName].enabled);
                if (optStats[statName].enabled) {
                    debug("tornStatTracker add or update: ", update);
                    if (update) {
                        updateStat(statName, optStats[statName].name, /*personalStats[statName],*/ massageStat(statName), optStats[statName].req);
                    } else {
                        addStat(statName, optStats[statName].name, /*personalStats[statName],*/ massageStat(statName), optStats[statName].req);
                    }
                }
            }
        }

        // Maybe add a fn - similar to massage - instead of .req, put a fn here to get by name?

        // Return vale to display on the LI. Usually raw stat, but may want to
        // format some of them.
        //
        // This returns a struct with both massaged value (if any), to be displayed as is, or
        // the non-massaged numeric value.
        function n(n){return n > 9 ? "" + n: "0" + n;}

        // TBD FIX FOR API V2
        function massageStat(statName) {
            debug("tornStatTracker massageStat: ", statName, ": ", personalStats[statName]);
            if (statName == 'traveltime') {  // Display says/hrs/mins/secs
                let secs = personalStats[statName];
                let mins = Math.floor(secs/60);
                let hrs = Math.floor(mins/60);
                let days = Math.floor(hrs/24);

                log("tornStatTracker: secs: ", secs, " min: ", mins, " hrs: ", hrs, " days: ", days);

                let time = days + ":" + (hrs - days*24) + ":" + (mins - hrs*60);
                let hrsLeft = (365 - +days) * 24 + (60 - (hrs - days*24));
                time = time + " / " + (365 - +days) + ":" + (24 - (hrs - days*24)) + ":" + (60 - (mins - hrs*60)) + " (" + hrsLeft + ")/";
                debug("tornStatTracker: time: ", time);
                return {num: undefined, asIs: time};
            }

            // Default
            return {num: personalStats[statName], asIs: undefined};
        }

        function reloadOptStats() {
            let keys = Object.keys(optStats);
            for (let i=0; i<keys.length; i++) {
                let name = keys[i];
                optStats[name].enabled = GM_getValue(name);
            }
        }

        // For code collapse, easier to read. Loaded into const's, above.
        function loadStatsDiv() {
            return '<div class="sortable-box t-blue-cont h" id="xedx-mstats-tracker">' +
              '<div id="header_div" class="title xarrow main-title title-black active top-round" role="heading" aria-level="5">' +
                  '<div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>' +
                  '<div class="move-wrap"><i class="accordion-header-move right"></i></div>' +
                  'Stat Tracker' +
              '</div>' +
              '<div class="bottom-round xexh">' +
              '    <div class="cont-gray bottom-round" style="height: auto; overflow: auto;">' + // used to have width: 386px;
                      '<ul class="info-cont-wrap" id="stats-list" style="overflow-y: scroll; width: auto; max-height: 125px;">' +
                      '</ul>' +
                  '</div>' +
              '</div>' +
              '<div class="title-black bottom-round xexh" style="text-align: center;">' +
                  '<button id="config-btn" class="powered-by">Configure</button>' +
                  '<button id="refresh-btn" class="powered-by">Refresh</button>' +
              '</div>' +
          '</div>';
        }

        function loadAwardLi() {
            let newNode = '<a href="https://www.torn.com/personalstats.php?ID=' +
                        userId + '&stats=' + name + '&from=1%20month"></a>';
                    let newNodeSel = '#xedx-div-span-' + name;
            $(newNodeSel).addClass("xhyperlink");
            $(newNodeSel).wrap(newNode);

            return '<li tabindex="0" id="ID" role="row" aria-label="STAT_DESC: STAT_VAL">' +
                '<span class="divider"  style="width: 46%;">' + // used to be 180px;">' +
                    '<span>STAT_DESC</span>' +
                '</span>' +
                '<span class="desc" style="width: auto;">STAT_VAL</span>' + // was 100px
            '</li>';
        }

        function checkStatsSaveButton() {
            let data = GM_getValue("stats-config");

            if (data == 'saved') {
                clearInterval(stats_intervalTimer);
                stats_intervalTimer = null;
                GM_setValue("stats-config", '');
                reloadOptStats();
                $("#stats-list").empty();
                buildStatsUI();
                if (stats_configWindow && !stats_configWindow.closed) stats_intervalTimer = setInterval(checkStatsSaveButton, 2000);
            }

            debug('Check config win: ', stats_configWindow, (stats_configWindow ? stats_configWindow.closed : 'no window'));
            if (stats_configWindow && stats_configWindow.closed) {
                stats_configWindow = null;
                clearInterval(stats_intervalTimer);
            }
        }

        // Create a stats config options page in a new tab
        function createStatsConfigDiv() {
            stats_configWindow = window.open(tornStatTrackerCfgURL);

            // Since broadcasts won't work, and storage notifications won't work, poll.
            if (!stats_intervalTimer) stats_intervalTimer = setInterval(checkStatsSaveButton, 2000);
        }

        // Add stats to the DIV on the home page
        // 'val' is a struct with two members: 'num' and 'asIs'; num is numeric and as-is is not to be modified.
        function addStat(statName, desc, val, required=null) {
            debug('tornStatTracker [addStat] ', statName, ": ", desc + ': ', val);
            let newLi = award_li;
            let newId = "x-stat-" + statName;
            newLi = newLi.replaceAll('ID', newId);
            newLi = newLi.replaceAll('STAT_DESC', desc);


            let statVal = val.num ? numberWithCommas(Number(val.num)) : val.asIs;

            if (required != null)
                statVal = statVal + " / " + required;

            // Add " award at: xyz" ? Or is that "required"?
            // required comes from stats table
            newLi = newLi.replaceAll('STAT_VAL', statVal);

            debug('**** Stats LI: ', newLi);
            $('#stats-list').append(newLi);

            if (globalOpts.statHyperLinks) {
                let newNode = '<a href="https://www.torn.com/personalstats.php?ID=' +
                            userId + '&stats=' + statName + '&from=1%20month" target="_blank" class="xhyperlink href t-blue"></a>';
                let newNodeSel = "#" + newId;
                $(newNodeSel).wrap(newNode);
            }

            /*
            // Add a right-click handler, for misc custom stuff
            let sel = "#" + newId;

            $(sel).on('contextmenu', handleStatRightClick);

            $(sel).attr("data-val", val);
            $(sel).attr("data-req", required);

            log("[addStat] right-click handler added to ", sel, " node: ", $(newLi));
            */

        }

        // Not yet implemented!
        function handleStatRightClick(e) {
            let statNode = e.currentTarget;
            log("StatTracker: target: ", $(statNode), " ID: ", $(statNode).attr("id"));

            let valText = $(statNode).text();
            let value = $(statNode).attr("data-val");
            let req = $(statNode).attr("data-req");
            log("StatTracker Text: ", valText);
            log("StatTracker value: ", value);
            log("StatTracker req: ", req);

            return false;
        }

        function updateStat(statName, desc, newValue, required=null) {
            let sel = "#x-" + statName;
            let li = document.querySelector(sel + " > span.desc");
            let statVal = numberWithCommas(Number(newValue));
            if (required != null) statVal = statVal + " / " + required;
            debug('[updateStat] sel: ', sel, ' curr value: ', li.textContent,
                ' new value: ', statVal);
            $(li).attr("data-val", newValue);
            $(li).attr("data-req", required);
            li.textContent = statVal;
        }

    }

    // This adds to the COnfig HTML, as well as to the stat tracker section on the home page,
    // depending on what has been selected from the Config page.
    // See above, "categoryColors", for categories.
    function initOptStats() {

        // TBD FIX FOR API V2

        // *** SKILL - get from skills, not personalstats, API call! ***
        // *** New category, just for skills! ***

        function addOptStat(name, desc, category, required=null) {
            optStats[name] = {enabled: GM_getValue(name, false), name: desc, cat: category, req: required};
        }

        addOptStat('killstreak', "Kill Streak", "attacks");
        addOptStat('defendswon', "Defends Won", "attacks", "10,000");
        addOptStat('attackswon', "Attacks Won", "attacks");
        addOptStat('attackslost', "Attacks Lost", "attacks");
        addOptStat('attackcriticalhits', "Total Crit Hits", "attacks");
        addOptStat('onehitkills', "One Hit Kills", "attacks");
        addOptStat('attacksdraw', 'Stalemates', "attacks");
        addOptStat('bestdamage', "Best Damage", "attacks");
        addOptStat('attackdamage', "Total Damage", "attacks", "100,000,000");
        addOptStat('bountiescollected', 'Bounties Collected', "attacks");
        addOptStat('unarmoredwon', "Unarmored Fights Won", "attacks");
        addOptStat('attackhits', "Total Attack Hits", "attacks");
        addOptStat('attacksassisted', "Total Assists", "attacks");
        addOptStat("yourunaway", "Times you Escaped", "attacks", "50|250|1,000");
        addOptStat("theyrunaway", "Foes Escaped", "attacks", "50|250|1,000");
        addOptStat("respectforfaction", "Faction Respect", "attacks", "100,000");

        addOptStat("cantaken", "Cannabis Taken", "drugs", "50");
        addOptStat("exttaken", "Ecstacy Taken", "drugs", "50");
        addOptStat("kettaken", "Ketamine Taken", "drugs", "50");
        addOptStat("lsdtaken", "LSD Taken", "drugs", "50");
        addOptStat("opitaken", "Opium Taken", "drugs", "50");
        addOptStat("shrtaken", "Shrooms Taken", "drugs", "50");
        addOptStat("spetaken", "Speed Taken", "drugs", "50");
        addOptStat("pcptaken", "PCP Taken", "drugs", "50");
        addOptStat("xantaken", "Xanax Taken", "drugs", "50");
        addOptStat("victaken", "Vicodin Taken", "drugs", "50");

        addOptStat("argtravel", "Flights to Argentina", "travel", "50");
        addOptStat("mextravel", "Flights to Mexico", "travel", "50");
        addOptStat("dubtravel", "Flights to UAE", "travel", "50");
        addOptStat("hawtravel", "Flights to Hawaii", "travel", "50");
        addOptStat("japtravel", "Flights to Japan", "travel", "50");
        addOptStat("lontravel", "Flights to UK", "travel", "50");
        addOptStat("soutravel", "Flights to South Africa", "travel", "50");
        addOptStat("switravel", "Flights to Switzerland", "travel", "50");
        addOptStat("chitravel", "Flights to China", "travel", "50");
        addOptStat("cantravel", "Flights to Canada", "travel", "50");
        addOptStat("caytravel", "Flights to Caymans", "travel", "50");
        addOptStat("traveltime", "Total Travel Time", "travel", undefined); //"365:00:00"); //"31,536,000");

        addOptStat('smghits', "Finishing Hits: SMG", "weapons", "100 and 1,000");
        addOptStat('chahits', "Finishing Hits: Mechanical", "weapons", "100 and 1,000");
        addOptStat('heahits', "Finishing Hits: Heavy Artillery", "weapons", "100 and 1,000");
        addOptStat('pishits', "Finishing Hits: Pistols", "weapons", "100 and 1,000");
        addOptStat('machits', "Finishing Hits: Machine Guns", "weapons", "100 and 1,000");
        addOptStat('grehits', "Finishing Hits: Temps", "weapons", "100 and 1,000");
        addOptStat('h2hhits', "Finishing Hits: Hand to Hand", "weapons", "100 and 1,000");
        addOptStat('axehits', "Finishing Hits: Clubbing", "weapons", "100 and 1,000");
        addOptStat('rifhits', "Finishing Hits: Rifle", "weapons", "100 and 1,000");
        addOptStat('shohits', "Finishing Hits: Shotgun", "weapons", "100 and 1,000");
        addOptStat('piehits', "Finishing Hits: Piercing", "weapons", "100 and 1,000");
        addOptStat('slahits', "Finishing Hits: Slashing", "weapons", "100 and 1,000");

        addOptStat('roundsfired', "Rounds Fired", "weapons", "1,000,000");
        addOptStat('specialammoused', "Special Ammo Total Used", "weapons");
        addOptStat('hollowammoused', "Hollow Point Ammo Used", "weapons");
        addOptStat('tracerammoused', "Tracer Ammo Used", "weapons");
        addOptStat('piercingammoused', "Piercing Ammo Used", "weapons");
        addOptStat('incendiaryammoused', "Incendiary Ammo Used", "weapons");

        addOptStat('medicalitemsused', "Medical Items Used", "medical");
        addOptStat('bloodwithdrawn', "Blood Bags Filled", "medical");
        addOptStat('revives', "People Revived", "medical");
        addOptStat('hospital', "Times Hospitalized", "medical");

        addOptStat("racingskill", "Racing Skill", "racing");
        addOptStat("raceswon", "Races Won", "racing");
        addOptStat("racesentered", "Races Entered", "racing");
        addOptStat("racingpointsearned", "Racing Points Earned", "racing");

        addOptStat("peoplebusted", "Busts Succeeded", "jail");
        addOptStat("failedbusts", "Busts Failed", "jail");
        addOptStat("peoplebought", "People Bailed Out", "jail");
        addOptStat("jailed", "Times Jailed", "jail");

        addOptStat("awards", "Awards", "misc");
    }

    function removeTornStatTracker() {
        if (stats_updateTimer) {
            clearInterval(stats_updateTimer);
            stats_updateTimer = null;
        }
        $("#xedx-xedx-mstats-tracker").remove()
    }

    // Portion of "Torn Stat Tracker" script run when on config page
    function handleStatsConfigPage() {
        debug('[handleStatsConfigPage]');

        initOptStats();

        // TBD FIX FOR API V2

        // Insert table rows
        let html = '';
        let keys = Object.keys(optStats);
        for (let i=0; i < keys.length; i++) {
            let statName = keys[i]; // eg, 'heahits' - name in the personalstats obj
            addStatsTableRow(statName);
        }

        // Install handlers
        let checkboxes = document.getElementsByClassName('stat-clickable');
        for (let i=0; i<checkboxes.length; i++) {
            checkboxes[i].addEventListener('click', statsClickHandler);
        }

        let saveButton = document.querySelector('#save-opts-btn');
        saveButton.addEventListener('click', handleStatsSaveButton);

        function addStatsTableRow(statName) {
            let cat = optStats[statName].cat;
            let color = cat ?  categoryColors[cat] : null;
            let table = document.getElementById('xedx-table');
            let row = table.insertRow();
            var cell1 = row.insertCell(0);
            var cell2 = row.insertCell(1);

            cell1.innerHTML = '<input type="checkbox" class="stat-clickable"' +
                (optStats[statName].enabled? 'checked ': '') + ' />';
            cell2.innerHTML = optStats[statName].name;
            if (color) cell2.setAttribute('bgcolor', color);

            cell1.firstChild.setAttribute('name', statName);
        }

        function statsClickHandler(ev) {
            let target = ev.target;
            let srcElem = ev.srcElement;

        GM_setValue(target.name, target.checked);
        }

        function handleStatsSaveButton(ev) {
            debug('[handleStatsSaveButton]');
            $("#hdr-msg").text("All changes saved!");
            $('#save-opts-btn').removeClass("blinkWarn");
            log("mag text, saved, hiding: ", $("#hdr-msg"));
            //$("#hdr-msg").css("visibility", "hidden");
            //$("#hdr-msg").text("Your changes have been saved!");
            setHdrMsg("Your changes have been saved!");
            GM_setValue("stats-config", 'saved');
            const newP = '<p id="x1"><span class="notification">Data Saved!</span></p>';
            let myTable = document.getElementById('xedx-table');
            myTable.parentNode.insertBefore($(newP)[0], myTable.nextSibling);
            setTimeout(setHdrMsg, 3000);
            setTimeout(clearStatsResult, 3000);
        }

        function clearStatsResult() {
            document.getElementById('x1').remove();
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Quick Refills" (called at content loaded)
    //////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Drug Stats" (called at API call complete)
    //////////////////////////////////////////////////////////////////////

    GM_addStyle(`
        .xdrugd {width: 55%;}
        #xedx-drug-stats-content-div li {
            display: flex;
        }
        `);

    var inDispToggle = false;
    const divArrowStateToggle2 = function (e) {
        inDispToggle = true;
        setTimeout(function () {inDispToggle = !inDispToggle;}, 500);
        let isActive = $(e.currentTarget).find(".xarrow").hasClass("active");
        let key = $(e.currentTarget).attr("id") + "_active";
        GM_setValue(key, !isActive);    // State is BEFORE change

        $(e.currentTarget).find(".xexh").css("display", "");
        $(e.currentTarget).find(".xexh").addClass(!isActive ? "xshow" : "xhide").removeClass(!isActive ? "xhide" : "xshow");
    }
    const divArrowStateToggle = function (e) {setTimeout(divArrowStateToggle2, 500, e);}

    const xdrug_stats_div = `<div class="sortable-box t-blue-cont h" id="xedx-mdrugstats-ext-div">
                                <div id="xedx_drug_header_div" class="title xarrow main-title title-black active top-round" role="heading" aria-level="5">
                                    <div id="drug-stat-arrow" class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>
                                    <div class="move-wrap"><i class="accordion-header-move right"></i></div>
                                Drug and Rehab Stats</div>
                                <div class="bottom-round">
                                    <div id="xedx-drug-stats-content-div" class="cont-gray bottom-round" style="height: 174px; overflow: auto">
                                            <ul class="info-cont-wrap">
                                            <li title="original"><span id="xedx-div-span-cantaken" class="divider"><span>Cannabis Used</span></span>
                                            <span id="xedx-val-span-cantaken" class="desc xdrugd">0</span></li>
                                            <li title="original"><span id="xedx-div-span-exttaken" class="divider"><span>Ecstasy Used</span></span>
                                            <span id="xedx-val-span-exttaken" class="desc xdrugd">0</span></li>
                                            <li title="original"><span id="xedx-div-span-kettaken" class="divider"><span>Ketamine Used</span></span>
                                            <span id="xedx-val-span-kettaken" class="desc xdrugd">0</span></li>
                                            <li title="original"><span id="xedx-div-span-lsdtaken" class="divider"><span>LSD Used</span></span>
                                            <span id="xedx-val-span-lsdtaken" class="desc xdrugd">0</span></li>
                                            <li title="original"><span id="xedx-div-span-opitaken" class="divider"><span>Opium Used</span></span>
                                            <span id="xedx-val-span-opitaken" class="desc xdrugd">0</span></li>
                                            <li title="original"><span id="xedx-div-span-shrtaken" class="divider"><span>Shrooms Used</span></span>
                                            <span id="xedx-val-span-shrtaken" class="desc xdrugd">0</span></li>
                                            <li title="original"><span id="xedx-div-span-spetaken" class="divider"><span>Speed Used</span></span>
                                            <span id="xedx-val-span-spetaken" class="desc xdrugd">0</span></li>
                                            <li title="original"><span id="xedx-div-span-pcptaken" class="divider"><span>PCP Used</span></span>
                                            <span id="xedx-val-span-pcptaken" class="desc xdrugd">0</span></li>
                                            <li title="original"><span id="xedx-div-span-xantaken" class="divider"><span>Xanax Used</span></span>
                                            <span id="xedx-val-span-xantaken" class="desc xdrugd">0</span></li>
                                            <li title="original"><span id="xedx-div-span-victaken" class="divider"><span>Vicodin Used</span></span>
                                            <span id="xedx-val-span-victaken" class="desc xdrugd">0</span></li>
                                            <li><span id="xedx-div-span-drugsused" class="divider"><span>Total Drugs Used</span></span>
                                            <span id="xedx-val-span-drugsused" class="desc xdrugd">0</span></li>
                                            <li><span id="xedx-div-span-overdosed" class="divider"><span>Overdoses</span></span>
                                            <span id="xedx-val-span-overdosed" class="desc xdrugd">0</span></li>
                                            <li><span id="xedx-div-span-rehabs" class="divider"><span>Rehabs</span></span>
                                            <span id="xedx-val-span-rehabs" class="desc xdrugd">127</span></li>
                                            <li><span id="xedx-div-span-rehabcost" class="divider"><span>Rehab Costs</span></span>
                                            <span id="xedx-val-span-rehabcost" class="desc xdrugd">0</span></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>`;

    function tornDrugStats() {
        let extDiv = xdrug_stats_div; // Pulled from the include, 'Torn-Drug-Stats-Div.js' Move to here!!!
        let extDivId = 'xedx-mdrugstats-ext-div';
        let mainDiv = document.getElementById('column0');

        return new Promise((resolve, reject) => {
            if (abroad()) return resolve('[tornDrugStats] not at home!');
            if (!isIndexPage()) resolve('[tornDrugStats] wrong page!');
            if (!$(mainDiv).length) return resolve('[tornDrugStats] unable to locate main DIV! Consider launching later.');
            $(mainDiv).append(extDiv); // could be $('#column0') ???
            installDrugStats(personalStats);

            $("#xedx-mdrugstats-ext-div").on('click', divArrowStateToggle);

            let key = 'xedx-mdrugstats-ext-div_active';
            let isActive = GM_getValue(key, true);
            if (isActive) {
                $("#xedx-mdrugstats-ext-div").addClass("active");
                $("#xedx-mdrugstats-ext-div > div.bottom-round").attr("style", "display: block;");
                //log("adding class 'active': ", $("#xedx-mdrugstats-ext-div"));
            } else {
                $("#xedx-mdrugstats-ext-div").removeClass("active");
                $("#xedx-mdrugstats-ext-div > div.bottom-round").attr("style", "display: none;");
                //log("removing class 'active': ", $("#xedx-mdrugstats-ext-div"));
            }

            resolve('tornDrugStats complete!');
        }).catch((error) => {
            log("[tornDrugStats] ERROR: ", error);
            rejectDebug(error);
        });

        // TBD FIX FOR API V2
        function installDrugStats(stats) {
            let knownSpans = ['cantaken', 'exttaken', 'kettaken', 'lsdtaken',
                              'opitaken', 'shrtaken', 'spetaken',
                              'pcptaken', 'xantaken', 'victaken', 'drugsused',
                              'overdosed', 'rehabs', 'rehabcost'];

            // TBD FIX FOR API V2

            // Add right-click, go to stats pages...
            // https://www.torn.com/personalstats.php?ID=2100735&stats=kettaken&from=1%20month
            knownSpans.forEach((name) => {
                let id = 'xedx-val-span-' + name;
                let valSpan = document.getElementById(id);
                let value = stats[name];
                if (typeof value === 'undefined' || value === null) {value = 0;} // Drug not taken yet

                // Format properly and insert.
                if (!name.localeCompare('rehabcost')) {
                    valSpan.innerText = '$' + numberWithCommas(value);
                } else if (!name.localeCompare('overdosed')) {
                    var pct = (Number(value) / Number(stats.drugsused)*100).toFixed(2);
                    valSpan.innerText = value + ' (' + pct + '%)';
                } else {
                    valSpan.innerText = value;
                }

                if (globalOpts.statHyperLinks) {
                    let newNode = '<a href="https://www.torn.com/personalstats.php?ID=' +
                        userId + '&stats=' + name + '&from=1%20month" target="_blank" class="xhyperlink href t-blue"></a>';
                    let newNodeSel = '#xedx-div-span-' + name;
                    $(newNodeSel).wrap(newNode);
                }

            });

            addDrugToolTips();
        }

        // TBD FIX FOR API V2
        function addDrugToolTips() {
            addToolTipStyle();

            buildUseString('cantaken');
            buildUseString('exttaken');
            buildUseString('kettaken');
            buildUseString('lsdtaken');
            buildUseString('opitaken');
            buildUseString('shrtaken');
            buildUseString('spetaken');
            buildUseString('pcptaken');
            buildUseString('xantaken');
            buildUseString('victaken');
        }

        function buildUseString(item) {
            let selector = 'xedx-val-span-' + item;
            let useDiv = document.getElementById(selector);
            let useText = useDiv.innerText.replace(/,/g, "");
            let pctText = useText/50 * 100;
            if (Number(pctText) >= 100) {
                pctText = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText = '<B><font color=\'red\'>' + pctText + '%</font></B>';
            }

            let spanSelect = 'xedx-div-span-' + item;
            let divSpan = document.getElementById(spanSelect);

            let text = '<B>' + divSpan.innerText + ': </B>Honor Bar Available' + CRLF;
            let effectText, cdText, sideEffectText, odChance, addiction;

            switch (item) {
                case 'cantaken':
                    text = text + TAB + '<B>Who\'s Frank?</B> (50 Cannabis): ' + pctText + CRLF +
                        TAB + '<B>Spaced Out</B> (Overdose on Cannabis)' + CRLF;
                    effectText = 'Increases nerve by 8-12 (x3 on 4/20).';
                    cdText = 'Cooldown: 1 to 1 1/2 hr.';
                    sideEffectText = '-35% speed, -25% def, -20% strength';
                    odChance = '.04% (1/2,500), 5x chance on 4/20';
                    addiction = '2 Addiction Points';
                    break;
                case 'exttaken':
                    text = text + TAB + '<B>Party Animal</B> (50 Ecstacy): ' + pctText + CRLF;
                    effectText = 'Doubles happiness.';
                    cdText = 'Cooldown: 3 hrs 20 min - 3 hrs 40 min';
                    sideEffectText = 'none.';
                    odChance = '~4%-5%';
                    addiction = '20 Addiction Points';
                    break;
                case 'kettaken':
                    text = text + TAB + '<B>Horse Tranquilizer</B> (50 Ketamine): ' + pctText + CRLF;
                    effectText = 'Temporarily increases Defense by 50%.';
                    cdText = 'Cooldown: 50 min - 1 hr 30 min';
                    sideEffectText = '-20% speed, -20% strength';
                    odChance = 'high';
                    addiction = '8 Addiction Points';
                    break;
                case 'lsdtaken':
                    text = text + TAB + '<B>Acid Dream</B> (50 LSD): ' + pctText + CRLF;
                    effectText = 'Increases energy by 50, nerve by 5, and happiness by 200-500. Also +50% def, +30% str';
                    cdText = 'Cooldown: 6 hrs 40 min - 7 hrs 30 min';
                    sideEffectText = '-30% dex';
                    odChance = '~5%-6%';
                    addiction = '21 Addiction Points';
                    break;
                case 'opitaken':
                    text = text + TAB + '<B>The Fields of Opium</B> (50 Opium): ' + pctText + CRLF;
                    effectText = 'Removes all hospital time and replenishes life by 66.6%. Increases happiness by 50-100.';
                    cdText = 'Cooldown: 3 hrs 20 min - 4 hrs 10 min';
                    sideEffectText = 'none';
                    odChance = 'none';
                    addiction = '10 Addiction Points';
                    break;
                case 'shrtaken':
                    text = text + TAB + '<B>I Think I See Dead People</B> (50 Shrooms): ' + pctText + CRLF;
                    effectText = 'Increases happiness by 500 and reduces energy by 25.';
                    cdText = 'Cooldown: 3 hrs 20 min - 3 hrs 54 min';
                    sideEffectText = '-20% on all bat stats, -25e';
                    odChance = 'unknown';
                    addiction = '6 Addiction Points';
                    break;
                case 'spetaken':
                    text = text + TAB + '<B>Crank it Up</B> (50 Speed): ' + pctText + CRLF;
                    effectText = 'Temporarily increases Speed by 20%. Increases happiness by 50.';
                    cdText = 'Cooldown: 3 hrs 28 min';
                    sideEffectText = '-20% dex';
                    odChance = 'unknown';
                    addiction = '14 Addiction Points';
                    break;
                case 'pcptaken':
                    text = text + TAB + '<B>Angel Dust</B> (50 PCP): ' + pctText + CRLF;
                    effectText = 'Temporarily increases Strength and Dexterity by 20%. Increases happiness by 250.';
                    cdText = 'Cooldown: 5 hrs 40 min - 6 hrs 40 min';
                    sideEffectText = 'none.';
                    odChance = 'unknown';
                    addiction = '26 Addiction Points';
                    break;
                case 'xantaken':
                    text = text + TAB + '<B>Free Energy</B> (50 Xanax): ' + pctText + CRLF;
                    effectText = 'Increases energy by 250 and happiness by 75.';
                    cdText = 'Cooldown: 6 - 8 hrs.';
                    sideEffectText = '-35% all bat stats';
                    odChance = '3.0%';
                    addiction = '35 Addiction Points';
                    break;
                case 'victaken':
                    text = text + TAB + '<B>Painkiller</B> (50 Vicodin): ' + pctText + '</B>';
                    effectText = 'Temporarily increases all battle stats by 25%. Increases happiness by 75.';
                    cdText = 'Cooldown: 5 hrs - 5 hrs 50 min';
                    sideEffectText = 'none.';
                    odChance = 'unknown';
                    addiction = '14 Addiction Points';
                    break;
                default:
                    return;
            }

            text = text + CRLF + 'Effects: ' + effectText + CRLF + cdText + CRLF + 'Side Effects: ' + sideEffectText +
                CRLF + 'Chance of OD: ' + odChance + CRLF + 'Addiction effect: ' + addiction;

            displayToolTip(useDiv.parentNode, text);
        }
    }

    function removeDrugStats() {$("#xedx-mdrugstats-ext-div").remove()}

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Jail Stats" (called at API call complete)
    //////////////////////////////////////////////////////////////////////

    function tornJailStats() {
        log('[tornJailStats]');
        const jailExtDivId = 'xedx-mjailstats-ext-div';
        const jailExtDivSel = '#xedx-mjailstats-ext-div';

        return new Promise((resolve, reject) => {
            let step = 0;
            if (abroad()) return resolve('[tornJailStats] not at home!');
            if (!isIndexPage()) resolve('[tornJailStats] wrong page!');
            if (document.querySelector(jailExtDivId)) {resolve('tornJailStats complete!');} // Only do this once

            let mainDiv = document.getElementById('column0');
            if (!$(mainDiv).length) {
                log("[tornJailStats] mainDiv not found!");
                log("[tornJailStats]: CF active? ", $("#challenge-form"));
                return reject('[tornJailStats] mainDiv nor found! Try calling later.');
            }
            $(mainDiv).append(getJailStatsDiv());
            populateJailDiv();

            $(jailExtDivSel).on('click', divArrowStateToggle);

            let key = jailExtDivId + '_active';
            let sel = jailExtDivSel + " > div.bottom-round";
            let isActive = GM_getValue(key, true);
            if (isActive) {
                $(jailExtDivSel).addClass("active");
                $(sel).attr("style", "display: block;");
            } else {
                $(jailExtDivSel).removeClass("active");
                $(sel).attr("style", "display: none;");
            }

            resolve('tornJailStats complete!');
        }).catch((error) => {
            log("[tornJailStats] ERROR: ", error);
            rejectDebug(error);
        });

        function getJailStatsDiv() {
            let result = '<div class="sortable-box t-blue-cont h" id="' + jailExtDivId + '">' +
                  '<div id="xedx_jail_header_div" class="title xarrow main-title title-black active top-round" role="heading" aria-level="5">' +
                      '<div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>' +
                      '<div class="move-wrap"><i class="accordion-header-move right"></i></div>' +
                      'Jail and Bounty Stats' +
                  '</div>' +
                  '<div class="bottom-round">' +
                      '<div id="xedx-jail-stats-content-div" class="cont-gray bottom-round" style="height: 199px; overflow: auto">' + // removed width: 386px;
                          '<ul class="info-cont-wrap">' +
                              '<li id="xedx-busts" title="original"><span class="divider" id="xedx-div-span-peoplebusted"><span>People Busted</span></span><span id="xedx-val-span-peoplebusted" class="desc">0</span></li>' +
                              '<li><span class="divider" id="xedx-div-span-failedbusts"><span>Failed Busts</span></span><span id="xedx-val-span-failedbusts" class="desc">0</span></li>' +
                              '<li id="xedx-bails" title="original"><span class="divider" id="xedx-div-span-peoplebought"><span>People Bailed</span></span><span id="xedx-val-span-peoplebought" class="desc">0</span></li>' +
                              '<li><span class="divider" id="xedx-div-span-peopleboughtspent"><span>Bail Fees</span></span><span id="xedx-val-span-peopleboughtspent" class="desc">0</span></li>' +
                              '<li><span class="divider"><span>Times Jailed</span></span><span id="xedx-val-span-jailed" class="desc">0</span></li>' +
                              '<li id="xedx-bounties" title="original"><span class="divider" id="xedx-div-span-bountiescollected"><span>Bounties Collected</span></span><span id="xedx-val-span-bountiescollected" class="desc">0</span></li>' +
                              '<li id="xedx-bounties-placed"><span class="divider" id="xedx-div-span-bountiesplaced"><span>Bounties Placed</span></span><span id="xedx-val-span-bountiesplaced" class="desc">0</span></li>' +
                              '<li id="xedx-fees" title="original"><span class="divider" id="xedx-div-span-totalbountyreward"><span>Bounty Rewards</span></span><span id="xedx-val-span-totalbountyreward" class="desc">0</span></li>' +
                          '</ul>' +
                      '</div>' +
                  '</div>' +
              '</div>';

            return result;
        }

        // TBD FIX FOR API V2
        function populateJailDiv() {
            debug("jailstats populateJailDiv");
            let jailStatArray = ['peoplebusted', 'failedbusts','peoplebought','peopleboughtspent',
                                 'jailed','bountiescollected','bountiesplaced','totalbountyreward'];
            for (let i=0; i<jailStatArray.length; i++) {
                let name = jailStatArray[i];
                let searchName = 'xedx-val-span-' + name;
                let valSpan = document.getElementById(searchName);
                let stats = personalStats;
                if (!valSpan || !stats[name]) continue;
                if (!name.localeCompare('totalbountyreward') || !name.localeCompare('peopleboughtspent')) {
                    valSpan.innerText = '$' + numberWithCommas(stats[name]);
                } else if (!name.localeCompare('peoplebusted')) {
                    // Just a test, make this better...
                    let numBusts = +stats[name];
                    let n = numBusts;  // temp shorthand
                    let numTohit = n < 250 ? 250 : n < 500 ? 500 : n < 1000 ? 1000 : n < 2000 ? 2000 : n < 2500 ? 2500 :
                        n < 4000 ? 4000 : n < 6000 ? 6000 : n < 8000 ? 8000 : n < 10000 ? 10000 : -1;
                    let numToGo = numTohit == -1 ? 0 : numTohit - numBusts;
                    valSpan.innerText = stats[name] + " (need: " + numToGo + ")";
                    debug("peoplebusted: ", numBusts);
                } else {
                    valSpan.innerText = stats[name];
                }

                if (globalOpts.statHyperLinks) {
                    let newNode = '<a href="https://www.torn.com/personalstats.php?ID=' +
                        userId + '&stats=' + name + '&from=1%20month" target="_blank" class="xhyperlink"></a>';
                    let newNodeSel = '#xedx-div-span-' + name;
                    $(newNodeSel).wrap(newNode);
                }
            }

            addJailToolTips();
        }

        function addJailToolTips() {
            addToolTipStyle();

            const bustsLi = document.getElementById('xedx-busts');
            const bailsLi = document.getElementById('xedx-bails');
            const bountiesLi = document.getElementById('xedx-bounties');
            const feesLi = document.getElementById('xedx-fees');

            if (bustsLi && bailsLi && bountiesLi && feesLi) {
                buildBustsToolTip('People Busted');
                buildBailsToolTip('People Bailed');
                buildBountiesToolTip('Bounties Collected');
                buildFeesToolTip('Bounty Rewards');
            }
        }

        function buildFeesToolTip(title) {
            const feesLi = document.getElementById('xedx-fees');
            const feesText = document.getElementById('xedx-val-span-totalbountyreward').innerText;
            let tmp = feesText.replace('$', '');
            tmp = tmp.replace(/,/g, '');
            let pctText = tmp/10000000 * 100;
            if (Number(pctText) >= 100) {
                pctText = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
            }

            const text = '<B>' + title + CRLF + CRLF + '</B>Honor Bar at $10,000,000: <B>\"Dead or Alive\"</B> ' + pctText;
            displayToolTip(feesLi, text);
        }

        function buildBountiesToolTip(title) {
            let bountiesLi = document.getElementById('xedx-bounties');
            let bountiesText = document.getElementById('xedx-val-span-bountiescollected').innerText;
            let pctText = bountiesText/250 * 100;
            if (Number(pctText) >= 100) {
                pctText = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
            }

            let text = '<B>' + title + CRLF + CRLF + '</B>Honor Bar at 250: <B>\"Bounty Hunter\"</B> ' + pctText;
            let text2 = 'Medals at: <B>' +
            ((bountiesText > 25) ? '<font color=green>25, </font>' : '<font color=red>25, </font>') +
                ((bountiesText > 100) ? '<font color=green>100, </font>' : '<font color=red>100, </font>') +
                ((bountiesText > 500) ? '<font color=green>500</font></B>' : '<font color=red>500</font></B>');

            displayToolTip(bountiesLi, text + CRLF + text2);
        }

        function buildBustsToolTip(title) {
            let bustsLi = document.getElementById('xedx-busts');
            let bustsText = document.getElementById('xedx-val-span-peoplebusted').innerText;
            let pctNum = bustsText.replace( /(^.+)(\w\d+\w)(.+$)/i,'$2');
            let pctText = Math.round(pctNum/10);

            if (Number(pctNum) >= 100) {
                pctText = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText = '<B><font color=\'red\'>' + pctText + '%</font></B>';
            }
            let pctText2 = Math.round(pctNum/2500 * 100);
            if (Number(pctText2) >= 100) {
                pctText2 = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText2 = '<B><font color=\'red\'>' + pctText2 + '%</font></B>';
            }
            let pctText3 = Math.round(pctNum/10000 * 100);
            if (Number(pctText3) >= 100) {
                pctText3 = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText3 = '<B><font color=\'red\'>' + pctText3 + '%</font></B>';
            }

            let text = '<B>' + title + CRLF + CRLF + '</B>Honor Bar at 1,000: <B>\"Bar Breaker\"</B> ' + pctText;
            let text2 = 'Honor Bar at 2,500: <B>\"Aiding and Abetting\"</B> ' + pctText2;
            let text3 = 'Honor Bar at 10,000: <B>\"Don\'t Drop It\"</B> ' + pctText3;
            let text4 = 'Medals at: <B>' +
                ((bustsText > 250) ? '<font color=green>250, </font>' : '<font color=red>250, </font>') +
                ((bustsText > 500) ? '<font color=green>500, </font>' : '<font color=red>500, </font>') +
                ((bustsText > 1000) ? '<font color=green>1K, </font>' : '<font color=red>1K, </font>') +
                ((bustsText > 2000) ? '<font color=green>2K, </font>' : '<font color=red>2K, </font>') +
                ((bustsText > 4000) ? '<font color=green>4K, </font>' : '<font color=red>4K, </font>') +
                ((bustsText > 6000) ? '<font color=green>6K</font>' : '<font color=red>6K</font>') + ' and ' +
                ((bustsText > 8000) ? '<font color=green>8K</font></B>' : '<font color=red>8K</font></B>');

            displayToolTip(bustsLi, text + CRLF + text2 + CRLF + text3 + CRLF + text4);
        }

        function buildBailsToolTip(title) {
            let bailsLi = document.getElementById('xedx-bails');
            let bailsText = document.getElementById('xedx-val-span-peoplebought').innerText;
            let pctText = bailsText/500 * 100;
            if (Number(pctText) >= 100) {
                pctText = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
            }

            let text = '<B>' + title + CRLF + CRLF + '</B>Honor Bar at 500: <B>\"Freedom isn\'t Free\"</B> ' + pctText;
            displayToolTip(bailsLi, text);
        }

    }

    function removeJailStats() {$("#xedx-mjailstats-ext-div").remove();}

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Fac Respect" (called at API call complete)
    //////////////////////////////////////////////////////////////////////

    function tornFacRespect() {

        return _tornFacRespect();

        function _tornFacRespect() {
            log('[tornFacRespect]');

            return new Promise((resolve, reject) => {
                if (abroad()) return resolve('[tornFacRespect] not at home!');
                if (!isIndexPage()) resolve('[tornFacRespect] wrong page!');
                if ($('#skip-to-content').html().indexOf('Home') < 0) return reject('[tornFacRespect] unable to find content header.');
                let error = buildPersonalRespectLi();
                if (error)
                    reject("tornFacRespect rejected: " + error);
                else
                    resolve("tornFacRespect complete!");
            }).catch((error) => {
                log("[tornFacRespect] ERROR: ", error);
                rejectDebug(error);
            });
        }

        // Returns null on success, string error otherwise...
        // TBD FIX FOR API V2
        // TBD Add money in vault...
        function buildPersonalRespectLi() {
            // Get balance while we are here...
            log("personal respect and fac balance");
            getFacBalance();

            let respect = personalStats.respectforfaction;
            let ul = $("#item10961662  ul.info-cont-wrap");
            if (!ul) return '[tornFacRespect] Unable to find correct ul!';

            let li = '<li tabindex="0" role="row" aria-label="Personal Respect Earned" id="xedx-respect-li"><div id="xedx-respect">' +
                         '<span class="divider"><span>Personal Respect Earned</span></span>' +
                         '<span class="desc">' + respect.toLocaleString("en") + '</span>' +
                     '</div></li>';
            $(ul).append(li);
            addFacToolTip(li);
            return null;
        }

        // Little quick cheat, testing v2 new call...
        function facBalanceCb(responseText, ID, param) {
            log("facBalanceCb");
            let jsonObj = JSON.parse(responseText);
            log("JSON: ", jsonObj);
            let balances = jsonObj.factionBalance;
            if (balances) {
                let cash = balances.money;
                let targetUl = $("#item10961662 ul.info-cont-wrap");

                let li = `<li tabindex="0" role="row" aria-label="Vault Balance"><div>
                             <span class="divider"><span>Vault Balance</span></span>
                             <span class="desc">${asCurrency(cash)}</span>
                         </div></li>`;
                $(targetUl).append(li);
            }
        }

        function getFacBalance() {
            log("getFacBalance");
            xedx_TornUserQueryv2("", "factionbalance", facBalanceCb);
            log("Queried v2");
        }

        // TBD FIX FOR API V2
        function addFacToolTip(li) {
            addToolTipStyle();

            let respect = personalStats.respectforfaction;
            let title = '<B>Respect Earned for Faction</B>';
            let honors = '<B>Honors - Respect in a Single Hit:</B>' + CRLF +
                TAB + '<B>Carnage (10): </B>' + hasHonor(256) + CRLF +
                TAB + '<B>Massacre (100): </B>' + hasHonor(477) + CRLF +
                TAB + '<B>Genocide (1,000): </B>' + hasHonor(478);
            let medals = '<B>Medals:</B>' + CRLF +
                buildMedalText('Recruit', respect, 100) +
                buildMedalText('Associate', respect, 500) +
                buildMedalText('Picciotto', respect, 1000) +
                buildMedalText('Soldier', respect, 2500) +
                buildMedalText('Capo', respect, 5000) +
                buildMedalText('Contabile', respect, 10000) +
                buildMedalText('Consigliere', respect, 25000) +
                buildMedalText('Underboss', respect, 50000) +
                buildMedalText('Boss', respect, 75000) +
                buildMedalText('Boss Of All Bosses', respect, 100000);
            let toolTipText = title + CRLF + CRLF + honors + CRLF + CRLF + medals;

            if (li) displayToolTip($('#xedx-respect')[0], toolTipText);
            return toolTipText;
        }

        // Miscellaneous utility functions
        function hasHonor(id) {
            return jsonResp.honors_awarded.includes(id) ?
                '<font color=green>Completed</font>' :
                '<font color=red>Not yet...</font>';
        }

        function buildMedalText(name, respect, needed) {
            let text = TAB + ((respect > needed) ? '<font color=green>' + name.toLocaleString() + ': ' + needed.toLocaleString() + ' (' + asHtmlPct(respect, needed) + ')' +
                        ', </font>' : '<font color=red>' + name.toLocaleString() + ': ' + needed.toLocaleString() + ' (' + asHtmlPct(respect, needed) + ')' +
                        ', </font>') + CRLF;
            return text;
        }

        function asHtmlPct(value, limit) {
            let pctText = value/limit * 100;
            if (Number(pctText) >= 100) {
                pctText = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
            }

            return pctText;
        }
    }

    function removeTornFacRespect() {$("#xedx-respect-li").remove();}

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Sidebar Colors" (called at content loaded)
    //////////////////////////////////////////////////////////////////////

    const opt_scIcons = {}; // key = {svgLink: "", color: '', strokeWidth: ""}

    function tornSidebarColors() {
        log('[tornSidebarColors]');

        return new Promise((resolve, reject) => {
            init_opt_scIcons();

            let keys = Object.keys(opt_scIcons);
            for (let i=0; i<keys.length; i++) {
                let data = opt_scIcons[keys[i]];
                colorIcon(data);
            }

            resolve("[tornSidebarColors] complete!");
        }).catch((error) => {
            log("[tornSidebarColors] ERROR: ", error);
            rejectDebug(error);
        });

        function init_opt_scIcons() {
            const defStrokeWidth = '1';

            opt_scIcons.homeIcon = {svgLink: "#nav-home", color: 'red', strokeWidth: defStrokeWidth};
            opt_scIcons.itemsIcon = {svgLink: "#nav-items", color: 'blue', strokeWidth: defStrokeWidth};
            opt_scIcons.cityIcon = {svgLink: "#nav-city", color: 'yellow', strokeWidth: defStrokeWidth};
            opt_scIcons.jobIcon = {svgLink: "#nav-job", color: '#9EBF7C', strokeWidth: '4'};
            opt_scIcons.gymIcon = {svgLink: "#nav-gym", color: '#719EA3', strokeWidth: defStrokeWidth};
            opt_scIcons.propIcon = {svgLink: "#nav-properties", color: 'yellow', strokeWidth: defStrokeWidth};
            opt_scIcons.eduIcon = {svgLink: "#nav-education", color: 'black', strokeWidth: defStrokeWidth};
            opt_scIcons.crimesIcon = {svgLink: "#nav-crimes", color: 'transparent', strokeWidth: defStrokeWidth};
            opt_scIcons.missionIcon = {svgLink: "#nav-missions", color: '#C32A1F', strokeWidth: defStrokeWidth};
            opt_scIcons.newsIcon = {svgLink: "#nav-newspaper", color: 'transparent', strokeWidth: '0'};
            opt_scIcons.jailIcon = {svgLink: "#nav-jail", color: 'black', strokeWidth: defStrokeWidth};
            opt_scIcons.hospIcon = {svgLink: "#nav-hospital", color: 'red', strokeWidth: defStrokeWidth};
            opt_scIcons.casinoIcon = {svgLink: "#nav-casino", color: '#4D8719', strokeWidth: defStrokeWidth};
            opt_scIcons.forumIcon = {svgLink: "#nav-forums", color: 'white', strokeWidth: defStrokeWidth};
            opt_scIcons.hofIcon = {svgLink: "#nav-hall_of_fame", color: '#FFD701', strokeWidth: defStrokeWidth};
            opt_scIcons.facIcon = {svgLink: "#nav-faction", color: '#DFAF2A', strokeWidth: defStrokeWidth};
            opt_scIcons.recIcon = {svgLink: "#nav-recruit_citizens", color: 'red', strokeWidth: defStrokeWidth};
            opt_scIcons.calendarIcon = {svgLink: "#nav-calendar", color: 'orange', strokeWidth: defStrokeWidth};
            opt_scIcons.travelIcon = {svgLink: "#nav-traveling", color: '#6AB6F3', strokeWidth: defStrokeWidth};
            opt_scIcons.peopleIcon = {svgLink: "#nav-people", color: '#F7BDA4', strokeWidth: defStrokeWidth};
        }

        function colorIcon2(data) {
            let root = $(data.svgLink);
            let icon1 = $(root).find('[class^="svgIconWrap"]')[0];
            let icon = $(icon1).find("svg");

            // 'stroke' now seems to now be over-ridden by a CSS attr on parent...
            if ($(icon).length) {
                let parentElem = $(icon).parent(); 
                let hasClass = false;
                let className = "";
                let cList = parentElem.classList;
                if (cList) for (let c of cList) {
                    if (c && c.indexOf('defaultIcon') > -1) {
                        hasClass = true;
                        className = c;
                    }
                }

                if (hasClass) {
                    $(parentElem).removeClass(className);
                }

                $(icon).attr('stroke', data.color);
                $(icon).attr('stroke-width', data.strokeWidth);
            }
        }

        function colorIcon(data) {
            let root = document.querySelector(data.svgLink);
            let icon1 = $(root).find('[class^="svgIconWrap"]')[0];
            let icon = $(icon1).find("svg")[0];
            if (icon) {
                let parentElem = $(icon).parent();
                let hasClass = false;
                let className = "";
                let cList = getClassList(parentElem);

                for (let c of cList) {
                    if (c && c.indexOf('defaultIcon') > -1) {
                        hasClass = true;
                        className = c;
                    }
                }

                if (hasClass) {
                    $(parentElem).removeClass(className);
                }

                $(icon).attr('stroke', data.color);
                $(icon).attr('stroke-width', data.strokeWidth);
            }
        }
    }

    function removeSidebarColors() {
        log('[removeSidebarColors]');

        let keys = Object.keys(opt_scIcons);
        for (let i=0; i<keys.length; i++) {
            let data = opt_scIcons[keys[i]];
            data.color = 'transparent';
            data.strokeWidth = '0';
            colorIcon(data);
        }
    }

    /////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Customizable Sidebar" (called at content loaded)
    /////////////////////////////////////////////////////////////////////////

    // custLinksOpts[key] = {enabled: enabled, cust: custom, desc: desc, link: link, cat: cat};
    var custLinksOpts = {};
    var custLinkClassNames = {};

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
        `);

    function tornCustomizableSidebar() {
        debug('[tornCustomizableSidebar]');

        let inHosp = false;
        let cs_caretState = 'fa-caret-down';
        let initialState = "down";

        GM_addStyle(".xedx-caret {" +
                "padding-top:5px;" +
                "padding-bottom:5px;" +
                "padding-left:20px;" +
                "padding-right:10px;" +
                "}");

        let sbData = getSidebarData();
        if (sbData && sbData.statusIcons && sbData.statusIcons.icons &&
            sbData.statusIcons.icons.hospital)
            inHosp = true;

        installCollapsibleCaret("nav-city");
        installCollapsibleCaret("nav-home");
        installCollapsibleCaret("nav-casino");
        installCollapsibleCaret("nav-crimes");
        if (awayFromHome()) {
            installCollapsibleCaret("nav-traveling");
        }
        if (inHosp) {
            installCollapsibleCaret("nav-hospital");
        }

        // Need new func to install all 3...
        installHashChangeHandler(installCollapsibleCaret);

        return new Promise((resolve, reject) => {
            initCustLinksObject();
            debug("[tornCustomizableSidebar] links obj installed.");
            initCustLinkClassNames();
            debug("[tornCustomizableSidebar] class names installed.");
            let keys = Object.keys(custLinksOpts);
            for (let i=0; i<keys.length; i++) {
                let key = keys[i];

                // If abroad or flying, the root nodes likely aren't there.
                // Flag entries that we can add when travelling, add to top
                // of the menu?

                if (custLinksOpts[key].enabled) {
                    debug('[tornCustomizableSidebar] Adding: ' + key.replaceAll('custlink-', ''));
                    let node = buildCustLink(key, custLinksOpts[key]);

                    // A dup node (by id) will return undefined.
                    if (!node) continue;

                    let root = custLinkGetRoot(key);
                    custLinkInsert(root, node, key);
                } else {
                    debug('[tornCustomizableSidebar] Removing: ' + key.replaceAll('custlink-', ''));
                    custLinkNodeRemove(key);
                }
            }

            // Only once all links have been inserted, can we set the initial state.
            initCustLinkState("nav-city");
            initCustLinkState("nav-home");
            initCustLinkState("nav-casino");
            initCustLinkState("nav-crimes");
            if (awayFromHome() == true) initCustLinkState("nav-traveling");
            initCustLinkState("nav-hospital");

            installCustLinkMenu();

            resolve("tornCustomizableSidebar complete!");
        }).catch((error) => {
            log("[tornCustomizableSidebar] ERROR: ", error);
            //rejectDebug(error);
            reject("[tornCustomizableSidebar] failed with an error! See log");
        });

        function installCustLinkMenu(retries=0) {
            log("[installCustLinkMenu] enter");
            let selector = "[id*='-custlink-']";
            log("[installCustLinkMenu] links: ", $(selector));

            $(selector).each(function(index, element) {
                if (!$(element).hasClass("xf")) {
                    $(element).addClass("xf");
                    $(element).on("contextmenu", function(e) {
                        log("custlink click!!!", $(e.currentTarget));
                        let target = e.currentTarget;
                        e.preventDefault(); // Prevent default right-click menu

                        let menuHtml = `
                            <ul id="tmp-id" class='custom-menu'>
                                <li data-action="remove">Remove</li>
                            </ul>
                        `;
                        let menu = $(menuHtml);
                        $(menu).css({top: e.pageY,left: e.pageX});
                        $("body").append(menu);

                        log("Appended menu: ", $("#tmp-id"));
                        log("e: ", e);
                        menu.show();

                        $(".custom-menu li").click(function() {
                            var choice = $(this).attr("data-action");
                            // Do something based on the choice. But really is no choice...
                            //debug("Menu choice: ", choice);
                            if (choice == 'remove')
                                handleRemove(target);
                            menu.remove(); // Remove the menu
                        });

                        // Hide menu when clicking outside
                        $(document).on("click", function(e) {
                            if (!$(e.target).closest(".context-menu").length) {
                                menu.remove();
                            }
                        });
                    });
                }
            });

            log("[installCustLinkMenu] exit");

            function handleRemove(target) {
                log("[handleRemove]: ", $(target));
                let id = $(target).attr("id");
                if (id) {
                    let key = 'custlink' + id.split('custlink')[1];
                    log("Remove link, key = ", key);
                    let saved = JSON.parse(GM_getValue(key, JSON.stringify({})));
                    if (saved.enabled) {
                        saved.enabled = false;
                        GM_setValue(key, JSON.stringify(saved));
                    }
                }
                $(target).remove();
            }
        }

        function initCustLinkClassNames() {
            let sel = '#nav-items';
            if(!$(sel).length)
                sel = '#nav-newspaper';
            if(!$(sel).length)
                sel = '#nav-calendar';
            if($(sel).length){
                custLinkClassNames.link_class = $(sel).attr('class').split(" ")[0];
                custLinkClassNames.row_class  = $((sel + ' > div:first')).attr('class');
                custLinkClassNames.a_class    = $((sel + ' a')).attr('class');
                custLinkClassNames.icon_class = $((sel + ' a span')).attr('class');
                custLinkClassNames.icon_class = $((sel + ' a span')).attr('class');
                custLinkClassNames.link_name_class = $((sel + ' a span')).eq(1).attr('class');
            }
            debug('[initCustLinkClassNames] custLinkClassNames: ', custLinkClassNames);
        }

        function validInHosp(key) {
            let searchKey = key.replace('custlink-', '');

            switch (searchKey) {
                case 'log':
                case 'personalstats':
                case 'pc':
                case 'laptop':
                case 'faction':
                    return true;
            }
            return false;
        }

        function validAbroad(key) {
            let searchKey = key.replace('custlink-', '');

            switch (searchKey) {
                case 'log':
                case 'personalstats':
                case 'pc':
                case 'laptop':
                case 'faction':
                    return true;
            }
            return false;
        }

        function custLinkGetRoot(key) {
            let cat = custLinksOpts[key].cat;
            let hospOk = validInHosp(key);
            let node = null;
            switch (cat.toLowerCase()) {
                case 'home':
                    node = document.getElementById('nav-home');
                    break;
                case 'casino':
                    node = document.getElementById('nav-casino');
                    break;
                case 'crimes':
                    node = document.getElementById('nav-crimes');
                    break;
                case 'city':
                default:
                    node = document.getElementById('nav-city');
                    break;
            }

            if (!node && inHosp == true && hospOk == true)
                node = document.getElementById('nav-hospital');
            if (!node && awayFromHome() == true && validAbroad(key) == true)
                node = document.getElementById('nav-traveling');

            return node;
        }

        function custLinkInsert(root, node, key=null) {
            debug('[custLinkInsert] root: ', $(root), ' node: ', $(node), ' key: ', key);
            $(node).insertAfter(root);
        }

        function custLinkNodeRemove(key) {
            $('#' + key).remove();
        }

        function buildCustLink(key) {
            // Add root to ID: -custlink-root?
            let root = custLinkGetRoot(key);
            let rootId = '';
            if (root) rootId = $(root).attr("id");
            debug("[buildCustLink] key: ", key, " rootId: ", rootId, " root: ", $(root));

            if (!$(root).length) return;

            let data = custLinksOpts[key];
            let fullLink = (data.link.indexOf('www.torn.com') > -1) ? data.link : "https://www.torn.com/" + data.link;

            let custLinkId = rootId + "-" + key;

            // Don't add twice!
            let sel = "#" + custLinkId;
            if ($(sel).length > 0) {
                //log(" **** temp **** link already exists!");
                return;
            }

            let className = custLinkClassNames.link_class;

            let rootHeight = $(root).css("height");
            let outerDiv = '<div class="' + className +
                '" style="display: block;" id="' + custLinkId + '"><div class="' +
                custLinkClassNames.row_class  + '" style="height: ' + rootHeight + ';">';

            const linkIndent = '">&nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;';
            let aData = '<a href="' + fullLink + '" class="' + custLinkClassNames.a_class + '">'; // '" i-data="i_0_1120_172_23">' +
            //let span2 = '<span class="' + custLinkClassNames.link_name_class + '">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;' + data.desc + '</span>';
            let span2 = '<span class="' + custLinkClassNames.link_name_class + linkIndent + data.desc + '</span>';
            let endDiv = '</a></div></div>';

            return outerDiv + aData + /* span1 + */ span2 + endDiv;
        }

        // Add crimes also!!!
        //
        // TBD: change this so that any root node (e.g., #nav-city) can be made collapsible.
        // Need to pass in root, and for the click fn, pass in the class, built from name of
        // root, to decide which to expand/collapse:
        // Instead of:
        // document.getElementById("xedx-collapse").addEventListener('click', function (event) {
        //        cs_handleClick(event)}, { passive: false });
        // do:
        // installCollapsibleCaret(rootNodeName)
        // let collapseId = rootNodeName + "-collapse";
        // let collapseSel = "#" + collapseId;
        // $(collapseSel).on('click', {from: collapseId}, cs_handleClick);
        // In handler, event.data.from will equal ID. 'from' can be anything...
        // Not sure if this would also work:
        // $(collapseSel).on('click', {from: collapseId}, { passive: false }, cs_handleClick);

        // Returns null on success, error otherwise.
       function installCollapsibleCaret(nodeName, retries=0) {
            debug("[custLinks - installCollapsibleCaret] nodeName: ", nodeName);

            if (!nodeName) nodeName = "nav-city";
            let selName = "#" + nodeName;
            let nodeId = nodeName + "-collapse";

           if ($(selName).length == 0) {
               log(nodeName, " not found!");
               if (retries++ < 20) return setTimeout(installCollapsibleCaret, 250, nodeName, retries);
           }

            if (document.querySelector("#" + nodeId)) {
                log("collapse node exists, not adding again!");
                return;
            }

            debug("[custLinks - installCollapsibleCaret] nodeName: ", nodeName, " ID: ", nodeId, " sel: ", selName);

            const caretNode = `<span style="float:right;"><i id="` + nodeId + `" class="icon fas fa-caret-down xedx-caret"></i></span>`;
            cs_caretState = GM_getValue(nodeName + 'cs_lastState', cs_caretState);
            if (!document.querySelector("#sidebarroot")) return "'#sidebarroot' not found, try again later!";
            if (document.getElementById('xedx-collapse')) document.getElementById('xedx-collapse').remove();
            if (!document.querySelector(selName)) return selName + "' not found, try again later!";

            // Set parents to 'flex', allow divs to be side-by-side
            document.querySelector(selName).setAttribute('style', 'display:block;');
            document.querySelector(selName + " > div > a").setAttribute('style', 'width:auto;height:23px;float:left;');

            // Add the caret and handler.
            let target = document.querySelector(selName + " > div");
            if (!target) return selName + " > div' not found, try again later!";
            $(target).append(caretNode);

            let handlerSel = "#" + nodeId;
            debug("custLinks - add handler to ", handlerSel);

            $(handlerSel).on('click', {from: nodeName}, cs_handleClick);
        }

        function initCustLinkState(nodeName) {
            cs_caretState = GM_getValue(nodeName + 'cs_lastState', cs_caretState);
            let newEvent = event;
            event.data = {};
            newEvent.data.from = nodeName;
            cs_caretState = (cs_caretState == 'fa-caret-down') ? 'fa-caret-right' : 'fa-caret-down';

            debug("[custLinks - initCustLinkState] initial state, from: ", newEvent.data.from);
            cs_handleClick(newEvent, nodeName);
        }

        function cs_handleClick(e, optParam) {
            debug('[custLinks - cs_handleClick] state = ' + cs_caretState);

            let rootNodeName = "nav-city";
            if (e && e.data && e.data.from)
                rootNodeName = e.data.from;

            let nodeId = rootNodeName + "-collapse";
            let nodeSel = "#" + nodeId;
            let targetNode = document.querySelector(nodeSel); // e.target

            if (!targetNode) {
                debug("[custLinks] target not found: ", nodeSel);
                return;
            }

            debug("[custLinks - cs_handleClick] optParam: ", optParam);
            debug("[custLinks - cs_handleClick] rootNodeName: ", rootNodeName);
            debug("[custLinks - cs_handleClick] nodeId: ", nodeId);
            debug("[custLinks - cs_handleClick] nodeSel: ", nodeSel);
            debug("[custLinks - cs_handleClick] targetNode: ", targetNode);
            if (e)
                debug("[custLinks - cs_handleClick] e.target: ", e.target);

            let elemState = 'block;';
            if (cs_caretState == 'fa-caret-down') {
                targetNode.classList.remove("fa-caret-down");
                targetNode.classList.add("fa-caret-right");
                cs_caretState = 'fa-caret-right';
                elemState = 'none;';
            } else {
                targetNode.classList.remove("fa-caret-right");
                targetNode.classList.add("fa-caret-down");
                cs_caretState = 'fa-caret-down';
            }

            GM_setValue(rootNodeName + 'cs_lastState', cs_caretState);

            // These need unique indicators (ID's) under 'city', 'home', etc.
            // let custLinkId = rootId + "-" + key;
            let partialID = rootNodeName + "-custlink-";
            debug("[custLinks - cs_handleClick] partial ID: ", partialID);
            $("[id^=" + rootNodeName + "-custlink-]").attr("style", "display: " + elemState);
        }
    } // End function tornCustomizableSidebar() {

    function removeCustomizableSidebar() {
        debug("[custLink] remove ALL new links !!!");

        $("[id^=custlink-]").remove();
        $("#xedx-collapse").remove(); // need to remove ALL here
    }

    // TBD: Add crimes also!!! Replace Torn Quick Crimes!!!
    //
    // Initialize custom links - defaults (set cust=false). Sets value in storage, to be read into table by updateCustLinksRows()
    function initCustLinksObject() {
        var slotsIcon;

        // Just for code collapse...
        if (true) {
            slotsIcon = `<span class="defaultIcon____xs95 mobile____pGyh">
                <svg xmlns="http://www.w3.org/2000/svg" stroke="transparent" stroke-width="0" width="14" height="14" viewBox="0 0 14 14">
                <path d="m0,0h1.77c0,.65.23.98.69.98l3.36-.98h.4c1.37.27,2.72.63,4.05,1.08h.29c.71-.04,1.35-.45,1.68-1.08h1.77v.29c0,
                1.58-1.05,3.2-3.15,4.84-.24.53-.37,1.1-.4,1.68v.2l.09.09v.09c-1.31.62-1.97,1.21-1.97,1.78v.49l.59,1.97c0,1.23-.96,
                1.96-2.87,2.18h-.4c-1.72,0-2.7-.73-2.95-2.18v-.09c.07-1.04.27-2.06.58-3.05l-.09-.7c1.68-1.12,3.42-2.14,
                5.22-3.05l.5-.69c0-.59-.79-.89-2.37-.89l-2.27-.8h-.1c-.93.04-1.72.68-1.97,1.57l-.09.5H0V0Z">
                </path></svg></span>`;
        }

        debug('[initCustLinksObject]');

        // Add 'dump' 'racetrack' - see altercoes for others (stock market, travel agency)
        // drag-and-drop to set order? (they appear in reverse order of here)
        // Maybe get list then traverse backwards? Or give an index value....better...
        //https://www.torn.com/racing.php
        //https://www.torn.com/dump.php
        //https://www.torn.com/travelagency.php
        //
        // When adding here, don't forget to also set, a bit below...
        let link0 = JSON.parse(GM_getValue('custlink-bounties', JSON.stringify({enabled: true, cust: false, desc: "Bounties",
                                                                                link: "https://www.torn.com/bounties.php#!p=main", cat: "City"})));
        let link1 = JSON.parse(GM_getValue('custlink-auctionhouse', JSON.stringify({enabled: true, cust: false, desc: "Auction House",
                                                                                    link: "amarket.php", cat: "City"})));
        let link2 = JSON.parse(GM_getValue('custlink-bitsnbobs', JSON.stringify({enabled: true, cust: false, desc: "Bits 'n Bobs",
                                                                                 link: "shops.php?step=bitsnbobs", cat: "City"})));
        let link3 = JSON.parse(GM_getValue("custlink-pointsbuilding", JSON.stringify({enabled:true, cust: false, desc: "Points Building",
                                                                                      link: "points.php", cat: "City"})));
        let link4 = JSON.parse(GM_getValue("custlink-itemmarket", JSON.stringify({enabled:true, cust: false, desc: "Item Market",
                                                                                  link: "imarket.php", cat: "City"})));
        let link5 = JSON.parse(GM_getValue("custlink-log", JSON.stringify({enabled:true, cust: false, desc : "Log",
                                                                           link: "page.php?sid=log", cat: "Home"})));
        let link6 = JSON.parse(GM_getValue("custlink-slots", JSON.stringify({enabled:true, cust: false, desc: "Slots",
                                                                             link: "page.php?sid=slots", cat: "Casino", icon: slotsIcon})));
        //https://www.torn.com/page.php?sid=spinTheWheel
        let link7 = JSON.parse(GM_getValue("custlink-spinthewheel", JSON.stringify({enabled:true, cust: false, desc: "Spin the Wheel",
                                                                                    link: "page.php?sid=spinTheWheel", cat: "Casino"})));
        let link8 = JSON.parse(GM_getValue("custlink-poker", JSON.stringify({enabled:true, cust: false, desc: "Poker",
                                                                             link: "page.php?sid=holdem", cat: "Casino"})));
        let link9 = JSON.parse(GM_getValue("custlink-russianroulette", JSON.stringify({enabled:true, cust: false, desc: "Russian Roulette",
                                                                                       link: "page.php?sid=russianRoulette", cat: "Casino"})));
        let link10 = JSON.parse(GM_getValue("custlink-personalstats", JSON.stringify({enabled:true, cust: false, desc: "Personal Stats",
                                                                                       link: "personalstats.php", cat: "Home"})));

        //GM_setValue("custlink-personalstats", JSON.stringify({enabled:true, cust: false, desc: "Personal Stats",
        //                                                                               link: "personalstats.php", cat: "Home", hospOK: true}));
        //GM_setValue("custlink-log", JSON.stringify({enabled:true, cust: false, desc : "Log",
        //                                                                   link: "page.php?sid=log", cat: "Home", hospOK: true}));

        // Add crimes...
        const crimeURLRoot = "https://www.torn.com/page.php?sid=crimes#/";
        const crimesPath = "page.php?sid=crimes#/";
        const crimeULs = [
             "searchforcash",
             "bootlegging",
             "graffiti",
             "shoplifting",
             "pickpocketing",
             "cardskimming",
             "burglary",
             "hustling",
             "disposal",
             "cracking",
             "forgery",
             "scamming"
        ];

        // Can get a/l crimes dynamically so don't ever need to edit this.
        let link11 = JSON.parse(GM_getValue("custlink-searchforcash",
                                            JSON.stringify({enabled:true, cust: false, desc: "Search for Cash",
                                            link: crimesPath + crimeULs[0], cat: "Crimes"})));
        let link12 = JSON.parse(GM_getValue("custlink-bootlegging",
                                            JSON.stringify({enabled:true, cust: false, desc: "Bootlegging",
                                            link: crimesPath + crimeULs[1], cat: "Crimes"})));
        let link13 = JSON.parse(GM_getValue("custlink-graffiti",
                                            JSON.stringify({enabled:true, cust: false, desc: "Graffiti",
                                            link: crimesPath + crimeULs[2], cat: "Crimes"})));
        let link14 = JSON.parse(GM_getValue("custlink-shoplifting",
                                            JSON.stringify({enabled:true, cust: false, desc: "Shoplifting",
                                            link: crimesPath + crimeULs[3], cat: "Crimes"})));
        let link15 = JSON.parse(GM_getValue("custlink-pickpocketing",
                                            JSON.stringify({enabled:true, cust: false, desc: "Pickpocketing",
                                            link: crimesPath + crimeULs[4], cat: "Crimes"})));
        let link16 = JSON.parse(GM_getValue("custlink-cardskimming",
                                            JSON.stringify({enabled:true, cust: false, desc: "Card Skimming",
                                            link: crimesPath + crimeULs[5], cat: "Crimes"})));
        let link17 = JSON.parse(GM_getValue("custlink-burglary",
                                            JSON.stringify({enabled:true, cust: false, desc: "Burglary",
                                            link: crimesPath + crimeULs[6], cat: "Crimes"})));
        let link18 = JSON.parse(GM_getValue("custlink-hustling",
                                            JSON.stringify({enabled:true, cust: false, desc: "Hustling",
                                            link: crimesPath + crimeULs[7], cat: "Crimes"})));
        let link19 = JSON.parse(GM_getValue("custlink-disposal",
                                            JSON.stringify({enabled:true, cust: false, desc: "Disposal",
                                            link: crimesPath + crimeULs[8], cat: "Crimes"})));
        let link20 = JSON.parse(GM_getValue("custlink-cracking",
                                            JSON.stringify({enabled:true, cust: false, desc: "Cracking",
                                            link: crimesPath + crimeULs[9], cat: "Crimes"})));
        let link21 = JSON.parse(GM_getValue("custlink-forgery",
                                            JSON.stringify({enabled:true, cust: false, desc: "Forgery",
                                            link: crimesPath + crimeULs[10], cat: "Crimes"})));
        let link22 = JSON.parse(GM_getValue("custlink-scamming",
                                            JSON.stringify({enabled:true, cust: false, desc: "Scamming",
                                            link: crimesPath + crimeULs[11], cat: "Crimes"})));

        let link23 = JSON.parse(GM_getValue("custlink-bazaar", JSON.stringify({enabled:true, cust: false, desc : "My Bazaar",
                                                                           link: "bazaar.php", cat: "Home"})));


        // I dont think that from here.....

        // Force an adjustment - move 'Log' to under 'Home'
        // Make editable? Did I do this for backwards compatibility?
        // Fix old versions? Maybe once under City? Don't recall..
        link5.cat = "Home";

        // Slots link changed: use the correct version (based on script version)
        if (GM_info.script.version == "4.15") {
            // Link changed from loader.php to page.php. Changed here 10/01/2023
            link6 = {enabled:true, cust: false, desc: "Slots", link: "page.php?sid=slots", cat: "Casino"};
        }

        // To here..... is required anymore.

        GM_setValue('custlink-bounties', JSON.stringify(link0));
        GM_setValue('custlink-auctionhouse', JSON.stringify(link1));
        GM_setValue('custlink-bitsnbobs', JSON.stringify(link2));
        GM_setValue("custlink-pointsbuilding", JSON.stringify(link3));
        GM_setValue("custlink-itemmarket", JSON.stringify(link4));
        GM_setValue("custlink-log", JSON.stringify(link5));
        GM_setValue("custlink-slots", JSON.stringify(link6));
        GM_setValue("custlink-spinthewheel", JSON.stringify(link7));
        GM_setValue("custlink-poker", JSON.stringify(link8));
        GM_setValue("custlink-russianroulette", JSON.stringify(link9));
        GM_setValue("custlink-personalstats", JSON.stringify(link10));

        GM_setValue("custlink-searchforcash", JSON.stringify(link11));
        GM_setValue("custlink-bootlegging", JSON.stringify(link12));
        GM_setValue("custlink-graffiti", JSON.stringify(link13));
        GM_setValue("custlink-shoplifting", JSON.stringify(link14));
        GM_setValue("custlink-pickpocketing", JSON.stringify(link15));
        GM_setValue("custlink-cardskimming", JSON.stringify(link16));
        GM_setValue("custlink-burglary", JSON.stringify(link17));
        GM_setValue("custlink-hustling", JSON.stringify(link18));
        GM_setValue("custlink-disposal", JSON.stringify(link19));
        GM_setValue("custlink-cracking", JSON.stringify(link20));
        GM_setValue("custlink-forgery", JSON.stringify(link21));
        GM_setValue("custlink-bazaar", JSON.stringify(link22));



        // Then fill the 'custLinksOpts' object
        updateCustLinksRows();
    }

    // Read all 'custlink-' storage entries into 'custLinksOpts' obj
    // Called from saveLinksTableToStorage, initCustLinksObject
    function updateCustLinksRows() {
        debug('[updateCustLinksRows]');
        // Find all keys saved as cust. links - 'custlink-'<key>
        let allKeys = GM_listValues();
        for (let i=0; i<allKeys.length; i++) {
            let key = allKeys[i];
            if (key.indexOf('custlink-') == -1) continue;
            let keyData = JSON.parse(GM_getValue(key));
            debug('[updateCustLinksRows] read data for ' + key + ' data: ', keyData);
            custLinksOpts[key] = keyData;
        }
        debug('[updateCustLinksRows] data: ', custLinksOpts);
    }

    // Save entire custom links table to storage
    // Note that clearing a row's name or link deletes it.
    // Called from handleGenOptsSaveButton
    function saveLinksTableToStorage() {
        debug('[saveLinksTableToStorage]');

        let tBody = $('#xedx-links-table-body');
        let tRows = tBody[0].getElementsByTagName('tr');
        Array.from(tRows).forEach(function(rowNode) {
            let rowDataType = $(rowNode).attr('data-type');
            let custom = (rowDataType == 'cust');

            let descNode = $(rowNode).find(`[data-type='desc']`);
            if (descNode[0]) {
                let input = $(rowNode).find("input")[0];
                let enabled = $(input).prop( "checked" );
                let desc = null, keyName = '', linkNode = null, link = '', catNode = null, cat = '';
               if (custom) {
                    desc = descNode[0].firstChild.value;
                    keyName = 'custlink-' + desc.replace(/[\s+\W]/g, '').toLowerCase();
                    linkNode = $(rowNode).find(`[data-type='link']`);
                    link = linkNode[0].firstChild.value;
                    catNode = $(rowNode).find(`[data-type='cat']`);
                    cat = catNode[0].firstChild.value;
               } else {
                    desc = descNode[0].innerText;
                    keyName = 'custlink-' + desc.replace(/[\s+\W]/g, '').toLowerCase();
                    linkNode = $(rowNode).find(`[data-type='link']`);
                    link = linkNode[0].innerText;
                    catNode = $(rowNode).find(`[data-type='cat']`);
                    cat = catNode[0].innerText;
               }

                let linkValue = {enabled: enabled, cust: custom, desc: desc, link: link, cat: cat};
                if (custom && (!link || !desc)) {
                    debug('[saveLinksTableToStorage] deleting value: ', linkValue);
                    GM_deleteValue(keyName);
                    $(rowNode).remove();
                } else {
                    debug('[saveLinksTableToStorage] setting value: ', linkValue);
                    GM_setValue(keyName, JSON.stringify(linkValue));
                }
            }
        });
        updateCustLinksRows();
    }

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Hide-Show Chat Icons" (called at content loaded)
    //////////////////////////////////////////////////////////////////////

    var hideShowChatRetries = 0;
    function tornHideShowChat(param) {
        if (parseInt(param) == 42) {
            let now = new Date();
            //log("tornHideShowChat Retry, at ", now.getSeconds(), " seconds"); //new Date().toLocaleString());
        }

        const chatDelim = '<div id="xedxShowHideChat"><hr id="xedx-hr-delim" class="delimiter___neME6">';
        var hideChatDiv = getHideChatDiv();

        return new Promise((resolve, reject) => {
            if (!$("#chatRoot > div").length) { // Should never happen...
                log("tornHideShowChat error: missing root");
            }

            loadChatStyles();
            let success = appendHideShowChatDiv();
            debug("tornHideShowChat appendHideShowChatDiv returned: ". success);

            hideChat(GM_getValue('xedxHideChat', false));
            debug("tornHideShowChat hidden/shown: ", $('#showHideChat'));

            // ==== New!
            if (!$('#showHideChat').length) {
                if (hideShowChatRetries++ > 3) {
                    return resolve("too many retires in hideShowChat");
                }
                setTimeout(tornHideShowChat, 5000, 42);
                return resolve("Trying again soon!");
            }

            // Temp - re-enable later.
            //disableTornToolsChatHide();

            resolve("tornHideShowChat complete!");
        }).catch((error) => {
            log("[tornHideShowChat] ERROR: ", error);
            rejectDebug(error);
        });

        function loadChatStyles() {
            GM_addStyle(`
                div.xchat {
                    padding-bottom: 5px;
                    padding-top: 0px;
                    }
                span.xchat {
                    font-weight: 700;
                    }
                a.xchat {
                    margin-left: 5px;
                    }
            `);
        }

        function hideChat(hide) {
            //log('[tornHideShowChat] ' + (hide ? "hiding chat icons: " : "showing chat icons: "), $('#showHideChat'));
            $('#showHideChat').text(`[${hide ? 'show' : 'hide'}]`);
            if (document.querySelector("#chatRoot > div"))
                document.querySelector("#chatRoot > div").style.display = hide ? 'none' : 'block';
        }

        function getHideChatDiv() {
            return '<div id="xedxShowHideChat"><hr id="xedx-hr-delim" class="delimiter___neME6 xmt5">' +
                //chatDelim +
                '<div class="xchat"><span class="xchat">Chat Icons</span>' +
                    '<a id="showHideChat" class="t-blue show-hide xchat">[hide]</a>' +
                '</div></div>';
        }

        function disableTornToolsChatHide() {
            if ($('#tt-hide_chat').length > 0) {
                debug("tornHideShowChat: Disabling TornTools 'Hide Chat' icon: ", $('#tt-hide_chat'));
                $('#tt-hide_chat')[0].style.display = 'none';
            }
        }

        function appendHideShowChatDiv() {
            debug("installing tornHideShowChat");
            if ($("#xedxShowHideChat").length > 0) {
                debug("tornHideShowChat Already installed: ", $("#xedxShowHideChat"));
                return false;
            }

            if (!hideChatDiv) {
                hideChatDiv = getHideChatDiv();
            }

            let node = $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]')[0];
             $(node).append(hideChatDiv);

            if ($('#showHideChat').length) {
                installHideShowClickHandler();
                return true;
            } else {
                log("tornHideShowChat .append failed!");
            }

            return false;
        }

        function installHideShowClickHandler() {
            $('#showHideChat').on('click', function () {
                const hide = $('#showHideChat').text() == '[hide]';
                GM_setValue('xedxHideChat', hide);
                hideChat(hide);
            });
        }

    }

    function removeHideShowChat() {$("#xedxShowHideChat").remove()}

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn TT Filter" (called at content complete)
    //////////////////////////////////////////////////////////////////////

    function tornTTFilter() {
        debug('[tornTTFilter]');

        const opts = {
            opt_cleanupFacPage: true,
            opt_hidebatStats: true,
            opt_hideTtActive: true,
        }

        // Mutation observer for attacks list
        var targetNode = null;
        var observer = null;
        const config = {attributes: false, childList: true, subtree: true};

        function handleNewPage() {
            debug('[tornTTFilter] hash change!');
            hideTtActiveIndicator();
            hideStatEstimates();
        }

        return new Promise((resolve, reject) => {

            if (!opts.opt_cleanupFacPage && !opts.opt_hidebatStats && !opts.opt_hideTtActive) {
                return reject("[tornTTFilter] no options enabled!");
            }

            hideTtActiveIndicator();
            installHashChangeHandler(handleNewPage);

            // Faction page specific stuff
            if (location.href.indexOf('factions.php?step=your') > -1 &&
                location.hash.indexOf('tab=info') > -1) { // Faction info page
                setTimeout(handleFacInfoPage, 500);
            }

            // Hide bat stats estimates? (various pages)
            if (opts.opt_hidebatStats) setInterval(hideStatEstimates , 1000);

            resolve("tornTTFilter startup complete!");
        }).catch((error) => {
            log("[tornTTFilter] ERROR: ", error);
            rejectDebug(error);
        });

        // Hide the 'Last Action' TT installs on the Fac Info page. Already there...
        function hideTtLastAction(mutationsList, observer) {
            debug('[tornTTFilter] [hideTtLastAction] observer: ', observer);

            let liList = Array.from(document.getElementsByClassName('tt-last-action'));
            debug('[tornTTFilter] liList: ', liList);
            liList.forEach(e => {if (!($(e).hasClass('xhidden'))) $(e).addClass('xhidden')});

            if (observer && liList.length > 10) observer.disconnect();
        }

        function handleFacInfoPage() {
            if (!opts.opt_cleanupFacPage) return;
            debug('[tornTTFilter] [handleFacInfoPage]');
            let targetNode = document.querySelector("#react-root-faction-info > div > div > div.faction-info-wrap > div.f-war-list.members-list > ul.table-body");
            if (targetNode) {
                hideTtLastAction();

                let node = document.querySelector("#react-root-faction-info > div > div > div.faction-info-wrap >" +
                                       " div.f-war-list.members-list > ul.table-header.cont-gray > li:nth-child(8)");
                if (node) node.textContent = 'Last';

                debug('[tornTTFilter] Starting observer, target: ', targetNode);
                if (!observer) observer = new MutationObserver(hideTtLastAction);
                observer.observe(targetNode, config);
            }
        }

        function hideStatEstimates() {
            if (!opts.opt_hidebatStats) return;
            $('.tt-stats-estimate').remove();
        }

        function hideTtActiveIndicator() {
            if (!opts.opt_hideTtActive) return;
            debug('[tornTTFilter] [hideTtActiveIndicator]');
            let ttIndicator = document.querySelector("#tt-page-status");
            if (ttIndicator) {
                debug("[tornTTFilter] Hidding 'active' indicator");
                $(ttIndicator).addClass('xhidden');
            } else {
                setTimeout(hideTtActiveIndicator, 1000);
            }
        }

    }

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Item Hints" (called at content complete)
    //////////////////////////////////////////////////////////////////////

    function tornItemHints() {
        debug('[tornItemHints]');

        // Page names, spans, divs, mutation observer stuff, etc.
        const observerConfig = { attributes: true, characterData: true, subtree: true, childList: true };
        const pageSpanSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black > span.items-name";
        const pageDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items"; // > div.title-black";
        const pageDiv = document.querySelector(pageDivSelector);

        const mainItemsDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap";
        let pageName = null;
        let pageSpan = null;
        let pageObserver = null;

        let tih_modified = false;

        return new Promise((resolve, reject) => {
            installHints();
            resolve("[tornItemHints] complete!");
        }).catch((error) => {
            debug("[tornItemHints] ERROR: ", error);
            rejectDebug(error);
        });

        function installHints() {
            let tmpPageName = getCurrentPageName();
            if (pageName == tmpPageName && tih_modified) {
                debug('[installHints] Same name, already modified.');
                return;
            }
            pageName = tmpPageName;
            tih_modified = false;
            tih_observeOff();
            debug("[installHints] On page '" + pageName + "'");

            if (pageName == 'Flowers') {
                let liList = $('#flowers-items > li');
                if (liList.length <= 1) {setTimeout(installHints, 1000); return;}
                let hints = fillHints(liList, flowerHints);
                debug('Added hints to ' + hints + ' items.');
            } else if (pageName == 'Plushies') {
                let liList = $('#plushies-items > li');
                if (liList.length <= 1) {setTimeout(installHints, 1000); return;}
                let hints = fillHints(liList, plushieHints);
                debug('[installHints] Added hints to ' + hints + ' items.');
            } else if (pageName == 'Temporary') {
                let liList = $('#temporary-items > li');
                if (liList.length <= 1) {setTimeout(installHints, 1000); return;}
                let hints = fillHints(liList, temporaryHints);
                debug('Added hints to ' + hints + ' items.');
            } else {
                debug('"' + pageName + '" did not match anything!');
            }

            // Watch for active page changes.
            // BUG BUG FIX ME! remove tih_modified check, go to items page...
            if (pageObserver == null) {
                var callback = function(mutationsList, observer) {
                    if (!tih_modified) installHints();
                };
                pageObserver = new MutationObserver(callback);
            }

            tih_modified = true;
            tih_observeOn();
        }

        // Return the name of page we're on, type of item
        function getCurrentPageName() {
            pageSpan = document.querySelector(pageSpanSelector);
            return pageSpan.innerText;
        }

        // Helpers to turn on and off the observer
        function tih_observeOff() {
            if (pageObserver) {
                pageObserver.disconnect();
                debug('[tornItemHints] Disconnected observer.');
            }
        }

        function tih_observeOn() {
            if (pageObserver) {
                pageObserver.observe(pageDiv, observerConfig);
                debug('[tornItemHints] Observing page.');
            }
        }

    } // End function tornItemHints() {

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Museum Set Helper" (called on API complete)
    //////////////////////////////////////////////////////////////////////

    function tornMuseumSetHelper() {
        log('[tornMuseumSetHelper]');

        const observerConfig = { attributes: true, characterData: true, subtree: true, childList: true };
        const pageSpanSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black > span.items-name";
        const pageDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black";
        const mainItemsDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > .items-wrap";
        const sepDiv = '<hr class="delimiter-999 m-top10 m-bottom10">';

        const flowerSetColor    = GM_getValue("flowerSetColor", "#5f993c"); // "#FFFACD50"; // LemonChiffon, 0x50% xparency, looks OK in light and dark modes
        const plushiesSetColor  = GM_getValue("plushiesSetColor", "#5f993c");
        const quransSetSetColor = GM_getValue("quransSetSetColor", "#2f690c");
        const coinSetSetColor   = GM_getValue("coinSetSetColor", "#5f993c"); //"Plum"; // #DDA0DD
        const senetSetSetColor  = GM_getValue("senetSetSetColor", "LightBlue"); // #ADD8E6
        const missingItemColor  = GM_getValue("missingItemColor", "#228B2250"); //"ForestGreen" #228B22

        GM_setValue("flowerSetColor", flowerSetColor);
        GM_setValue("plushiesSetColor", plushiesSetColor);
        GM_setValue("quransSetSetColor", quransSetSetColor);
        GM_setValue("coinSetSetColor", coinSetSetColor);
        GM_setValue("senetSetSetColor", senetSetSetColor);
        GM_setValue("missingItemColor", missingItemColor);

        const pawnShopPays = 45000;

        return new Promise((resolve, reject) => {
            if (location.href.indexOf("item.php") < 0) return resolve('tornMuseumSetHelper wrong page!');
            if (abroad()) return resolve('tornMuseumSetHelper not at home!');

            initStatics();
            removeTTBlock();
            logApiCall('market: pointsmarket');
            xedx_TornMarketQuery(null, 'pointsmarket', marketQueryCB);

            resolve("[tornMuseumSetHelper] startup complete!");
        }).catch((error) => {
            log("[tornMuseumHelper] ERROR: ", error);
            rejectDebug(error);
        });

        function initStatics() {
            if (typeof tornMuseumSetHelper.pointsPriceUnitCost == 'undefined') {
                tornMuseumSetHelper.pointsPriceUnitCost = 0;
                tornMuseumSetHelper.pageModified = false; // Page has been  modified
                tornMuseumSetHelper.pageObserver = null; // Mutation observer for the page
                tornMuseumSetHelper.observing = false; // Observer is active
                tornMuseumSetHelper.pageName = null;
                tornMuseumSetHelper.pageSpan = null;
                tornMuseumSetHelper.pageDiv = null;
                tornMuseumSetHelper.xedxSepNode = null;
                tornMuseumSetHelper.xedxHdrNode = null;
                tornMuseumSetHelper.xedxHdrID = 'xedx-required-hdr';
            }
        }

        function marketQueryCB(responseText, ID, param) {
            debug('[tornMuseumSetHelper] market query callback.');
            var jsonResp = JSON.parse(responseText);
            if (jsonResp.error) {
                if (queryRetries++ < 5) {
                    if (alertOnRetry) alert("Retrying error 17!");
                    return xedx_TornMarketQuery(null, 'pointsmarket', marketQueryCB);
                } else {
                    queryRetries = 0;
                }
                return handleError(responseText);
            }

            let objEntries = Object.entries(jsonResp.pointsmarket);
            let firstPointTrade = Object.entries(objEntries[0][1]);
            tornMuseumSetHelper.pointsPriceUnitCost = firstPointTrade[0][1]; // Save globally
            debug('[tornMuseumSetHelper] Unit Price: ' + tornMuseumSetHelper.pointsPriceUnitCost);

            modifyPage(true);
        }

        //////////////////////////////////////////////////////////////////////
        // Helpers for page modification
        //////////////////////////////////////////////////////////////////////

        // Helper to highlight proper LI's, and track item amounts
        function highlightList(liList, searchArray, color) {
            debug('[tornMuseumSetHelper] Highlighting items, <li> is ' + liList.length + ' item(s) long.');
            if (liList.length == 1) {
                console.log(GM_info.script.name + ' Re-calling modifyPage');
                tornMuseumSetHelper.pageModified = false;
                setTimeout(function() { modifyPage(false); }, 2000);
                return false;
            }
            for (let i = 0; i < liList.length; ++i) {
                searchArray.forEach((element, index, array) => {
                    let qty = Number(liList[i].getAttribute('data-qty'));
                    if (element.id == liList[i].getAttribute('data-item') && qty > 0) {
                        // Highlight & save quantity
                        liList[i].style.backgroundColor = color;
                        array[index].quantity = qty;
                    }
                });
            }
            return true;
        }

        // Builds a valid node element for inserting into the DOM
        function createElementFromHTML(htmlString) {
            var div = document.createElement('div');
            div.innerHTML = htmlString.trim();

            // Change this to div.childNodes to support multiple top-level nodes
            return div.firstChild;
        }

        // Insert a node after a reference node
        function insertAfter(newNode, referenceNode) {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        }

        // Create a <li> with supplied item ID and name
        function buildNewLi(id, name) {
            // LI and DIVs to insert for set count, items needed, items required
            const newLi =
                '<li class="" data-item="replaceID">' +
                    '<div class="thumbnail-wrap" tabindex="0">' +
                        '<div class="thumbnail">' +
                            '<img class="torn-item item-plate" data-size="medium" src="/images/items/replaceID/large.png"' +
                                'style="opacity: 0;" data-converted="1" aria-hidden="true">' +
                            '<canvas role="img"style="opacity: 1;" width="60" height="30" class="torn-item item-plate item-converted" item-mode="true">' +
                            '</canvas>' +
                        '</div>' +
                    '</div>' +
                    '<div class="title-wrap">' +
                        '<div class="title left">' +
                            '<span class="image-wrap">' +
                                '<div class="thumbnail">' +
                                    '<img src="/images/items/replaceID/large.png" width="60" height="30">' +
                                '</div>' +
                            '</span>' +
                            '<span class="name-wrap">'+
                                '<span class="qty bold d-hide"> x0 </span>'+
                                '<span class="name">replaceName</span>'+
                                '<span class="qty bold t-hide"> x0 </span>'+
                            '</span>'+
                        '</div>'+
                    '</div>' +
                    '<div class="cont-wrap">'+
                        '<div class="actions right">'+
                            '<ul class="actions-wrap">'+
                                '<li class="left"></li>'+
                                '<li class="left"></li>'+
                                '<li class="left"></li>'+
                                '<li class="left"></li>'+
                                '<li class="clear"></li>' +
                            '</ul>'+
                        '</div>'+
                    '</div>' +
                '<div class="clear"></div>'+
                '</li>';
            log('[tornBazaarPlus] buildNewLi()');
            let temp = newLi.replace(/replaceID/g, id);
            let temp2 = temp.replace(/replaceName/g, name);
            return temp2;
        }

        // Helper to add items which we don't own
        function addMissingItems(ulDiv, setArray) {
            debug('[tornMuseumSetHelper] Adding missing items.');
            let hdrNode = document.getElementById(tornMuseumSetHelper.xedxHdrID);
            if ($(hdrNode).length > 0) {
                return log('[tornMuseumSetHelper] addMissingItems: header already present.');
            } // Means we've done this already.

            // Add a separator, header (and UL for new LI's)
            let mainItemsDiv = document.querySelector(mainItemsDivSelector);
            tornMuseumSetHelper.xedxSepNode = createElementFromHTML(sepDiv);
            tornMuseumSetHelper.xedxHdrNode = createElementFromHTML(requiredHdr());
            insertAfter(tornMuseumSetHelper.xedxSepNode, mainItemsDiv);
            insertAfter(tornMuseumSetHelper.xedxHdrNode.nextSibling, tornMuseumSetHelper.xedxSepNode);

            // Add LI's for each missing item
            debug('Going to add ' + setArray.length + ' items.');
            for (let i = 0; i < setArray.length; i++) {
                let item = setArray[i];
                if (item.quantity == 0) {
                    debug('[tornMuseumSetHelper] Adding ' + item.name + ' to required list.');
                    let liStr = buildNewLi(item.id, item.name);
                    let newNode = createElementFromHTML(liStr);
                    newNode.style.backgroundColor = missingItemColor;
                    let ulList = $('#xedx-required-items');
                    ulList[0].appendChild(newNode);
                }
            }
        }

        // Header to display if we have full sets
        function displayFullSetHdr(count, pts) {
            debug('[tornMuseumSetHelper] displayFullSetHdr');
            let mainItemsDiv = document.querySelector(mainItemsDivSelector);
            tornMuseumSetHelper.xedxSepNode = createElementFromHTML(sepDiv);

            // '<span class="m-hide"> You have numberFullSets full sets. This can be traded in for ' +
            // ' numberFullPoints points, at priceOfPoints each, for totalPrice.</span>' +

            // This can be done in one shot?
            let fullSets = fullSetsHdr().replace('numberFullSets', count);
            let fullPts = fullSets.replace('numberFullPoints', count * pts);
            let ptsPrice = fullPts.replace('priceOfPoints', asCurrency(tornMuseumSetHelper.pointsPriceUnitCost));
            //log('displayFullSetHdr - points cost: "' + tornMuseumSetHelper.pointsPriceUnitCost + '"');
            let totalPrice = ptsPrice.replace('totalPrice', asCurrency(count * pts * tornMuseumSetHelper.pointsPriceUnitCost));
            let output = totalPrice.replace('pawnPrice', asCurrency(count * pts * pawnShopPays));

            tornMuseumSetHelper.xedxHdrNode = createElementFromHTML(output);
            insertAfter(tornMuseumSetHelper.xedxSepNode, mainItemsDiv);
            insertAfter(tornMuseumSetHelper.xedxHdrNode.nextSibling, tornMuseumSetHelper.xedxSepNode);
        }

        // Helper to remove above header(s) and items list
        function removeAdditionalItemsList() {
            if (tornMuseumSetHelper.xedxSepNode) {tornMuseumSetHelper.xedxSepNode.remove();}
            let hdrNode = document.getElementById(tornMuseumSetHelper.xedxHdrID);
            if (hdrNode) {hdrNode.remove();}
        }

        function removeFullSetHdr() {
            const xedxFullSetHdr = 'xedx-fullset-hdr';
            if (tornMuseumSetHelper.xedxSepNode) {tornMuseumSetHelper.xedxSepNode.remove();}
            let hdrNode = document.getElementById(xedxFullSetHdr);
            if (hdrNode) {hdrNode.remove();}
        }

        // Remove TornTools additional items required div
        function removeTTBlock() {
            $('#tt-needed-flowers-div').remove();
            $('#tt-needed-plushies-div').remove();
        }

        // Helpers to turn on and off the observer
        function observeOff() {
            if (tornMuseumSetHelper.observing && tornMuseumSetHelper.pageObserver) {
                tornMuseumSetHelper.pageObserver.disconnect();
                debug('[tornMuseumSetHelper] disconnected observer.');
                tornMuseumSetHelper.observing = false;
            }
        }

        function observeOn() {
            if (tornMuseumSetHelper.pageObserver) {
                tornMuseumSetHelper.pageObserver.observe(tornMuseumSetHelper.pageDiv, observerConfig);
                debug('[tornMuseumSetHelper] observing page.');
                tornMuseumSetHelper.observing = true;
            }
        }

        // Helper to see how many complete sets we have of a given type.
        function countCompleteSets(itemArray) {
            var totalSets = 999999999;
            itemArray.forEach((element, index, array) => {
                let amt = element.quantity;
                if (!amt || amt == null) {totalSets = 0;} // Too bad we can't 'break' here, or 'return'.
                if (amt < totalSets) {totalSets = amt;}
            });
            return totalSets;
        }

        //////////////////////////////////////////////////////////////////////
        // Modify the page
        //////////////////////////////////////////////////////////////////////

        function modifyPage(enableObserver) {
            if (!enableObserver) {log('[tornMuseumSetHelper] detected page change.');}
            if (tornMuseumSetHelper.pageModified) {return;}

            // To calculate prices/profit/etc.
            //
            // Plushies and flowers - 10 points per set.
            // Medieval coins - 100 points
            // Vairocana Buddha - 100 pts
            // Ganesha Sculpture - 250 pts
            // Shabti Sculpture - 500 pts
            // Script's from the Quran - 1,000 pts
            // Senet Game - 2,000 pts
            // Egyptian Amulet - 10,000 pts.
            //
            // To get value of points, call "https://api.torn.com/market/?selections=pointsmarket&key="
            //
            // pointsmarket": {
            //	    "11154988": {
            //		"cost": 45550,    <== Use this for current (live) price info.
            //		"quantity": 4000,
            //		"total_cost": 182200000
            //	},
            let flowersPtsPerSet = 10;
            let plushiesPtsPerSet = 10;
            let coinPtsPerSet = 100;
            let VairocanaPtsPerSet = 100;
            let ganeshaPtsPerSet = 250;
            let shabtiPtsPerSet = 500;
            let quranPtsPerSet = 1000
            let senetPtsPerSet = 2000;
            let egyptianPtsPerSet = 10000;

            // Variables tracking # full sets
            let fullFlowerSets = 0;
            let fullPlushieSets = 0;
            let fullCoinsSets = 0;
            let fullQuranSets = 0;
            let fullSenetSets = 0;
            // ...

            // Names of items in various sets.
            const flowersInSet = [{"name":"Dahlia", "id": 260, "quantity": 0},
                                  {"name":"Orchid", "id": 264, "quantity": 0},
                                  {"name":"African Violet", "id": 282, "quantity": 0},
                                  {"name":"Cherry Blossom", "id": 277, "quantity": 0},
                                  {"name":"Peony", "id": 276, "quantity": 0},
                                  {"name":"Ceibo Flower", "id": 271, "quantity": 0},
                                  {"name":"Edelweiss", "id": 272, "quantity": 0},
                                  {"name":"Crocus", "id": 263, "quantity": 0},
                                  {"name":"Heather", "id": 267, "quantity": 0},
                                  {"name":"Tribulus Omanense","id": 385, "quantity": 0},
                                  {"name":"Banana Orchid", "id": 617, "quantity": 0}];

            const plushiesInSet = [{"name":"Jaguar Plushie", "id": 258, "quantity": 0},
                                   {"name":"Lion Plushie", "id": 281, "quantity": 0},
                                   {"name":"Panda Plushie", "id": 274, "quantity": 0},
                                   {"name":"Monkey Plushie", "id": 269, "quantity": 0},
                                   {"name":"Chamois Plushie", "id": 273, "quantity": 0},
                                   {"name":"Wolverine Plushie", "id": 261, "quantity": 0},
                                   {"name":"Nessie Plushie", "id": 266, "quantity": 0},
                                   {"name":"Red Fox Plushie", "id": 268, "quantity": 0},
                                   {"name":"Camel Plushie", "id": 384, "quantity": 0},
                                   {"name":"Kitten Plushie", "id": 215, "quantity": 0},
                                   {"name":"Teddy Bear Plushie", "id": 187, "quantity": 0},
                                   {"name":"Sheep Plushie", "id": 186, "quantity": 0},
                                   {"name":"Stingray Plushie", "id": 618, "quantity": 0}];

            const coinsInSet = [{"name":"Leopard Coin",  "id": 450, "quantity": 0},
                               {"name":"Florin Coin",  "id": 451, "quantity": 0},
                               {"name":"Gold Noble Coin",  "id": 452, "quantity": 0}];

            const quransInSet = [{"name":"Quran Script : Ibn Masud",  "id": 455, "quantity": 0},
                               {"name":"Quran Script : Ubay Ibn Kab",  "id": 456, "quantity": 0},
                               {"name":"Quran Script : Ali",  "id": 457, "quantity": 0}];

            // TBD: sculptures, senets

            //$('#xedx-fullset-hdr').remove();
            removeFullSetHdr();
            removeAdditionalItemsList();
            removeTTBlock();
            tornMuseumSetHelper.pageModified = true;
            debug('[tornMuseumSetHelper] modifying page.');

            // See what page we are on
            tornMuseumSetHelper.pageSpan = document.querySelector(pageSpanSelector);
            if (tornMuseumSetHelper.pageSpan) {
                tornMuseumSetHelper.pageName = tornMuseumSetHelper.pageSpan.innerText;
            }
            debug("[tornMuseumSetHelper] On page '" + tornMuseumSetHelper.pageName + "'");

            // Highlight items that are in sets, if on an artifact page, flower page or plushie page.
            // Iterate the item <lis>'s, highlight if in proper array of items that are in sets.
            observeOff();
            if (tornMuseumSetHelper.pageName == 'Flowers') {
                // Highlight set items and count complete sets
                let ulDiv = $('#flowers-items'); // Verify this...
                let liList = $('#flowers-items > li');
                if (!highlightList(liList, flowersInSet, flowerSetColor)) {return;}
                let fullFlowerSets = countCompleteSets(flowersInSet);
                debug("[tornMuseumSetHelper] Complete flower sets: " + fullFlowerSets);
                sortUL($('#flowers-items > li'));

                // Add 'hints' - where to get items
                let hints = fillHints(liList, flowerHints);
                debug('[tornMuseumSetHelper] Added hints to ' + hints + ' items.');

                // Add LI's for missing items
                if (!fullFlowerSets) {
                    removeFullSetHdr();
                    addMissingItems(ulDiv, flowersInSet); // Verify this...
                    liList = $('#xedx-required-items > li');
                    hints = fillHints(liList, flowerHints);
                    debug('[tornMuseumSetHelper] Added hints to ' + hints + ' items.');
                } else {
                    removeAdditionalItemsList();
                    displayFullSetHdr(fullFlowerSets, flowersPtsPerSet);
                }

            } else if (tornMuseumSetHelper.pageName == 'Plushies') {
                // HIghlight set items and count complete sets
                let ulDiv = $('#plushies-items'); // Verify this...
                let liList = $('#plushies-items > li');
                if (!highlightList(liList, plushiesInSet, plushiesSetColor)) {return;}
                fullPlushieSets = countCompleteSets(plushiesInSet);
                debug("[tornMuseumSetHelper] Complete plushie sets: " + fullPlushieSets);
                sortUL($('#plushies-items > li'));

                // Add 'hints' - where to get items
                let hints = fillHints(liList, plushieHints);
                debug('[tornMuseumSetHelper] Added hints to ' + hints + ' items.');

                // Add LI's for missing items - add hints, too!
                if (!fullPlushieSets) {
                    removeFullSetHdr();
                    addMissingItems(ulDiv, plushiesInSet);
                    liList = $('#xedx-required-items > li');
                    hints = fillHints(liList, plushieHints);
                    debug('[tornMuseumSetHelper] Added hints to ' + hints + ' items.');
                } else {
                    removeAdditionalItemsList();
                    displayFullSetHdr(fullPlushieSets, plushiesPtsPerSet);
                }



            } else if (tornMuseumSetHelper.pageName == 'Artifacts') {
                // TBD -
                //
                // Medieval coins - 100 points
                // Vairocana Buddha - 100 pts
                // Ganesha Sculpture - 250 pts
                // Shabti Sculpture - 500 pts
                // Script's from the Quran - 1,000 pts
                // Senet Game - 2,000 pts
                // Egyptian Amulet - 10,000 pts.

                // HIghlight set items and count complete sets
                let ulDiv = $('#artifacts-items'); // Verify this...
                let liList = $('#artifacts-items > li');

                if (!highlightList(liList, coinsInSet, coinSetSetColor)) {return;}
                fullCoinsSets = countCompleteSets(coinsInSet);
                debug("[tornMuseumSetHelper] Complete coin sets: " + fullCoinsSets);

                if (!highlightList(liList, quransInSet, quransSetSetColor)) {return;}
                fullQuranSets = countCompleteSets(quransInSet);
                debug("[tornMuseumSetHelper] Complete coin sets: " + fullQuranSets);

                sortUL($('#artifacts-items > li'));

                // Add LI's for missing items
                removeFullSetHdr();
                removeAdditionalItemsList();
                if (!fullCoinsSets || !fullQuranSets) {
                    debug("[tornMuseumSetHelper] ulDiv", ulDiv);
                    debug("[tornMuseumSetHelper] Adding missing items. " + JSON.stringify({fullCoinsSets, coinsInSet, fullQuranSets, quransInSet}));
                    if (!fullCoinsSets) {addMissingItems(ulDiv, coinsInSet);}
                    if (!fullQuranSets) {addMissingItems(ulDiv, quransInSet);}
                }
                if (fullCoinsSets || fullQuranSets) {
                    debug("[tornMuseumSetHelper] ulDiv", ulDiv);
                    debug("[tornMuseumSetHelper] Displaying full set header. " + JSON.stringify({fullCoinsSets, fullQuranSets}));
                    if (fullCoinsSets) {displayFullSetHdr(fullCoinsSets, coinPtsPerSet);}
                    if (fullQuranSets) {displayFullSetHdr(fullQuranSets, quranPtsPerSet);}
                }
            } else {
                removeAdditionalItemsList()
            }

            // Watch for active page changes.
            if (tornMuseumSetHelper.pageObserver == null) {
                tornMuseumSetHelper.pageDiv = document.querySelector(pageDivSelector);
                var callback = function(mutationsList, observer) {
                    tornMuseumSetHelper.pageModified = false;
                    modifyPage(false);
                };
                tornMuseumSetHelper.pageObserver = new MutationObserver(callback);
            }

            tornMuseumSetHelper.pageModified = false;
            observeOn();
        }

        // Sort the list, ascending, by qty. See 'https://github.com/Sjeiti/TinySort'
        function sortUL(ulDiv) {
            log('[tornMuseumSetHelper] Sorting UL ' + ulDiv + ', length = ' + ulDiv.length);
            tinysort(ulDiv, {attr:'data-qty'});
            log('[tornMuseumSetHelper] Sorted.');

        }

        function requiredHdr() {
             const _requiredHdr = +
            '<div>' +
                '<div id="xedx-required-hdr" class="items-wrap primary-items t-blue-cont">' +
                    '<div class="title-black top-round scroll-dark" role="heading" aria-level="5">' +
                        '<span class="m-hide"> Required items for full sets </span>' +
                    '</div>' +
                    '<div id="xedx-category-wrap" class="category-wrap ui-tabs ui-widget ui-widget-content ui-corner-all">' +
                        '<ul id="xedx-required-items" class="items-cont tab-menu-cont cont-gray bottom-round itemsList ui-tabs-panel ui-widget-content ui-corner-bottom current-cont" data-loaded="0" aria-expanded="true" aria-hidden="false">' +
                        '</ul>' +
                    '</div>' +
                '</div>' +
            '</div>';

            return _requiredHdr;
        }

        function fullSetsHdr() {
            const _fullSetsHdr = +
                '<div>' +
                    '<div id="xedx-fullset-hdr" class="items-wrap primary-items t-blue-cont">' +
                        '<div class="title-black top-round bottom-round scroll-dark" role="heading" aria-level="5">' +
                            '<span class="m-hide"> You have numberFullSets full set(s). This can be traded in for ' +
                            ' numberFullPoints points, at priceOfPoints each, for totalPrice (pawnPrice at the Pawn Shop).</span>' +
                        '</div>' +
                        '<div id="xedx-category-wrap" class="category-wrap ui-tabs ui-widget ui-widget-content ui-corner-all">' +
                            '<ul id="xedx-required-items" class="items-cont tab-menu-cont cont-gray bottom-round itemsList ui-tabs-panel ui-widget-content ui-corner-bottom current-cont" data-loaded="0" aria-expanded="true" aria-hidden="false">' +
                            '</ul>' +
                        '</div>' +
                    '</div>' +
                '</div>';

            return _fullSetsHdr;
        }

    } // End function tornMuseumSetHelper() {

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Weapon Sort" (called at content complete)
    //////////////////////////////////////////////////////////////////////

    function tornWeaponSort() {
        log('[tornWeaponSort]');

        return new Promise((resolve, reject) => {

            initStatics();

            if (location.href.indexOf("item.php") < 0) return resolve('tornWeaponSort wrong page!');
            if (abroad()) return resolve('tornWeaponSort not at home!');

            GM_addStyle(`.xedx-ctrls {margin: 10px;}`);

            installUI();

            if (tornWeaponSort.pageObserver == null) { // Watch for active page changes.
                tornWeaponSort.pageDiv = document.querySelector(tornWeaponSort.pageDivSelector);
                var callback = function(mutationsList, observer) {
                    log('[tornWeaponSort] Observer triggered - page change!');
                    tornWeaponSort.lastSortOrder = 'Default';
                    sortPage(true);
                };
                tornWeaponSort.pageObserver = new MutationObserver(callback);
                observeOn();
            }

            sortPage();

            resolve("[tornWeaponSort] startup complete!");
        }).catch((error) => {
            log("[tornWeaponSort] ERROR: ", error);
            rejectDebug(error);
        });

        // Function to sort the page
        function sortPage(pageChange = false) {
            let lastPage =  tornWeaponSort.pageName;
            tornWeaponSort.pageName = getPageName();
            debug('[tornWeaponSort] sortPage: pageName = "' +  tornWeaponSort.pageName + '" pageChange = "' + pageChange + '"');
            if ((lastPage != '') && ( tornWeaponSort.pageName.indexOf(lastPage) == -1) && (pageChange == false)) {
                debug('[tornWeaponSort] Went from page "' + lastPage + '" to "' +  tornWeaponSort.pageName +'"');
            } else if (pageChange) {
                debug('[tornWeaponSort] pageChange (observer): "' + lastPage + '" --> "' +  tornWeaponSort.pageName + '"');
            } else {
                debug('[tornWeaponSort] pageChange: "' + lastPage + '" --> "' +  tornWeaponSort.pageName + '"');
            }
            debug('[tornWeaponSort] Observing = ' +  tornWeaponSort.observing);

            // Hide/show UI as appropriate
            let itemUL = null;
            if ( tornWeaponSort.pageName == 'Primary') {
                enableSortDiv();
                itemUL = $("#primary-items")[0];
            } else if ( tornWeaponSort.pageName == 'Secondary') {
                enableSortDiv();
                itemUL = $("#secondary-items")[0];
            } else if ( tornWeaponSort.pageName == 'Melee') {
                enableSortDiv();
                itemUL = $("#melee-items")[0];
            } else {
                enableSortDiv(false);
                return; // Not on a weapons page, go home.
            }

            // If not sorting, bail
            debug('[tornWeaponSort] sortPage: Auto Sort is ' + (tornWeaponSort.autoSort ? 'ON' : 'OFF'));
            if (!tornWeaponSort.autoSort) {
                debug('[tornWeaponSort] Auto Sort not on, going home.');
                return;
            }

            // Make sure fully loaded.
            let items = itemUL.getElementsByTagName("li");
            let itemLen = items.length;
            log('[tornWeaponSort] ' +  tornWeaponSort.pageName + ' Items length: ' + itemUL.getElementsByTagName("li").length);
            if (itemLen <= 1) { // Not fully loaded: come back later
                return setTimeout(function(){ sortPage(true); }, 500);
            }

            let sorted = false, sortSel = null;
            if (tornWeaponSort.lastSortOrder == tornWeaponSort.sortOrder[tornWeaponSort.selID]) return;
             tornWeaponSort.lastSortOrder = tornWeaponSort.sortOrder[tornWeaponSort.selID];

            observeOff(); // Don't call ourselves while sorting.
            setSumTotal(itemUL); // Create the 'totalStats' attr.

            debug('[tornWeaponSort] Preparing to sort by ' + tornWeaponSort.sortOrder[tornWeaponSort.selID]);

            let order = 'desc';
            let attr = '';
            switch (tornWeaponSort.sortOrder[ tornWeaponSort.selID]) {
                case 'Default':
                    location.reload();
                    observeON();
                    return;
                case 'Accuracy':
                    setSelectors(itemUL);
                    sorted = true;
                    sortSel =  tornWeaponSort.accSel;
                    break;
                case 'Damage':
                    setSelectors(itemUL);
                    sorted = true;
                    sortSel = tornWeaponSort.dmgSel;
                    break;
                case 'Total':
                    attr = 'totalStats';
                    sorted = true;
                    break;
                case 'Name':
                    sorted = true;
                    order = 'asc';
                    sortSel = "div.title-wrap > div > span.name-wrap > span.name";
                    break;
                default:
                    break;
            }

            if (!sorted) {
                debug('[tornWeaponSort] Not sorting by ' + tornWeaponSort.sortOrder[ tornWeaponSort.selID]);
            } else {
                debug('[tornWeaponSort] Sorting by ' + tornWeaponSort.sortOrder[ tornWeaponSort.selID]);
                debug('[tornWeaponSort] selector = "' + sortSel + '" attr = "' + attr + '"');
                let matches = itemUL.querySelectorAll("li[data-weaponinfo='1']");
                if (attr) {
                    tinysort(matches, {attr: attr, order: order});
                } else {
                    tinysort(matches, {selector: sortSel, order: order});
                }
            }

            observeOn();
        }

        //////////////////////////////////////////////////////////////////////
        //
        // Find each pertinent li, meaning which child it is. It *may*
        // vary, for example, if my WE script is installed, and WE hasn't
        // yet gotten here yet. So need to check each time, but only on first weapon.
        // We need this number, which 'nth' child:
        // document.querySelector(div.cont-wrap > div.bonuses.left > ul > li:nth-child(2) > span")
        //
        //////////////////////////////////////////////////////////////////////

        function setSelectors(itemUL) {
            debug('[tornWeaponSort] setSelectors ==>');
            let firstItemSel = itemUL.querySelector("li.bg-green");
            if (!firstItemSel) firstItemSel = itemUL.querySelectorAll("li.t-first-in-row")[0];
            debug('[tornWeaponSort] setSelectors: firstItemSel = ', firstItemSel);
            let liList = firstItemSel.querySelectorAll("div.cont-wrap > div.bonuses.left > ul > li");
            debug('[tornWeaponSort] setSelectors: liList = ', liList);
            for (let i=0; i<liList.length; i++) {
                let iSel = liList[i].querySelector('i');
                if (!iSel) continue;
                if (iSel.classList[0].indexOf('damage') > -1) {
                    tornWeaponSort.dmgSel = "div.cont-wrap > div.bonuses.left > ul > li:nth-child(" + (i+1) + ") > span";
                }
                if (iSel.classList[0].indexOf('accuracy') > -1) {
                    tornWeaponSort.accSel = "div.cont-wrap > div.bonuses.left > ul > li:nth-child(" + (i+1) + ") > span";
                }
            }
            debug('[tornWeaponSort] <== setSelectors');
        }

        // Summ acc and dmg to sort by sum total
        function setSumTotal(itemUL) {
            debug('[tornWeaponSort] setSumTotal ==>');
            let items = itemUL.children;
            for (let j = 0; j < items.length; j++) {
                let dmg = 0, acc = 0;
                let liList = items[j].querySelectorAll("div.cont-wrap > div.bonuses.left > ul > li");
                for (let i=0; i<liList.length; i++) {
                    let iSel = liList[i].querySelector('i');
                    if (!iSel) continue;
                    if (iSel.classList[0].indexOf('damage') > -1) {
                        tornWeaponSort.dmgSel = "div.cont-wrap > div.bonuses.left > ul > li:nth-child(" + (i+1) + ") > span";
                        dmg = Number(items[j].querySelector(tornWeaponSort.dmgSel).innerText);
                    }
                    if (iSel.classList[0].indexOf('accuracy') > -1) {
                        tornWeaponSort.accSel = "div.cont-wrap > div.bonuses.left > ul > li:nth-child(" + (i+1) + ") > span";
                        acc = Number(items[j].querySelector( tornWeaponSort.accSel).innerText);
                    }
                }
                if (dmg && acc) items[j].setAttribute('totalStats', (dmg + acc));
                //if (dmg && acc) items[j].setAttribute('totalStats', (dmg * acc));
            }
            debug('[tornWeaponSort] <== setSumTotal');
        }

        function installUI() {
            debug('[installUI] tornWeaponSort');
            GM_addStyle(`
                .d .bonuses-wrap li {
                    width: 66px;
                }
                .tt-item-price {
                    min-width: 80px;
                }
            `);
            let parent = document.querySelector("#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.equipped-items-wrap");
            if (!parent) return setTimeout(installUI, 50);
            if (!document.querySelector("xedx-weapon-sort")) {
                let optionsDiv = getOptionsDiv();
                $(optionsDiv).insertAfter(parent);
            }

            // Install handlers and default states
            let ckBox = document.querySelector("#autosort");
            if (!ckBox) return setTimeout(installUI, 50);

            ckBox.checked = tornWeaponSort.autoSort;
            ckBox.addEventListener("click", onCheckboxClicked);

            let btn = document.querySelector("#" + tornWeaponSort.selID); // querySelector("#\\3" + selID);
            btn.checked = true;
            btn.click();
            GM_setValue('wsort-selectedBtn', tornWeaponSort.selID);
            $('input[type="radio"]').on('click change', onRadioClicked);
        }

        //////////////////////////////////////////////////////////////////////
        // Helpers
        //////////////////////////////////////////////////////////////////////

        // Turn on/off sort option div.
        function enableSortDiv(enable=true) {
            let sortSel = document.querySelector("#xedx-weapon-sort");
            debug('[tornWeaponSort] enableSortDiv enable = ' + enable + ' selector: ' + sortSel);
            if (sortSel) sortSel.setAttribute('style', 'display: ' + (enable ? 'block' : 'none'));
        }

        // Handle the sort type radio buttons
        function onRadioClicked(e) {
            tornWeaponSort.lastSelID = tornWeaponSort.selID;
            tornWeaponSort.selID = document.querySelector('input[name="sortopts"]:checked').value;
            GM_setValue('wsort-selectedBtn', tornWeaponSort.selID);
            debug('[tornWeaponSort] set selId to ', tornWeaponSort.selID);
            if (tornWeaponSort.lastSelID == tornWeaponSort.selID) return;

            debug('[tornWeaponSort] Radio Button Selected: ' + tornWeaponSort.selID);
            debug('[tornWeaponSort] onRadioClicked: Sorting page by ' + tornWeaponSort.sortOrder[tornWeaponSort.selID]);
            sortPage();
        }

        // Handle the "Auto Sort" checkbox
        function onCheckboxClicked() {
            let ckBox = document.querySelector("#autosort");
            debug('[tornWeaponSort] set autoSort to ', ckBox.checked);
            GM_setValue('wsort-checkbox', ckBox.checked);

            //debug('[tornWeaponSort] GM_getValue("wsort-checkbox"): ', GM_getValue("wsort-checkbox"));
            tornWeaponSort.autoSort = ckBox.checked;
            debug('[tornWeaponSort] onCheckboxClicked: Auto Sort is ' + (tornWeaponSort.autoSort ? 'ON' : 'OFF'));
        }

        // Returns the page name of current page
        function getPageName() {
            let pageSpan = document.querySelector(tornWeaponSort.pageSpanSelector);
            let pageName = pageSpan.innerText;
            debug("[tornWeaponSort] On page '" + pageName + "'");
            return pageName;
        }

        // Helpers to turn on and off the observer
        function observeOff() {
            debug('[tornWeaponSort] disconnecting observer.');
            if (tornWeaponSort.observing &&  tornWeaponSort.pageObserver) {
                debug('disconnected observer.');
                tornWeaponSort.pageObserver.disconnect();
                tornWeaponSort.observing = false;
            }
        }

        function observeOn() {
            if (tornWeaponSort.pageObserver) {
                tornWeaponSort.pageObserver.observe( tornWeaponSort.pageDiv,  tornWeaponSort.observerConfig);
                debug('[tornWeaponSort] observing page.');
                tornWeaponSort.observing = true;
            }
        }


        function initStatics() {
            if (typeof tornWeaponSort.autoSort == 'undefined') {
                tornWeaponSort.autoSort = GM_getValue('wsort-checkbox', false); //false; // TRUE to auto sort on load
                tornWeaponSort.dmgSel = null; // Selectors for sorting
                tornWeaponSort.accSel = null; // ...
                tornWeaponSort.selID = GM_getValue('wsort-selectedBtn', 'xedx-1'); // What to sort by (1 = default, 2 = acc, 3 = dmg, 4 = Q, 5 = name)
                tornWeaponSort.lastSelID = 'xedx-1'; // Previous selection
                tornWeaponSort.lastSortOrder = 'Default';

                tornWeaponSort.pageName = ''; // Items page we are on
                tornWeaponSort.pageDiv = null; // Mis-named selector for items page div.
                tornWeaponSort.pageObserver = null; // Mutation observer for the page
                tornWeaponSort.observing = false; // Observer is active

                tornWeaponSort.sortOrder = {
                    'xedx-0': 'none',
                    'xedx-1': 'Default',
                    'xedx-2': 'Accuracy',
                    'xedx-3': 'Damage',
                    'xedx-4': 'Total',
                    'xedx-5': 'Name',
                };
                tornWeaponSort.pageSpanSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black > span.items-name";
                tornWeaponSort.pageDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black";
                tornWeaponSort.observerConfig = { attributes: true, characterData: true, subtree: true, childList: true };
            }
        }

        function getOptionsDiv() {
            let optionsDiv =
                '<hr class="page-head-delimiter m-top10 m-bottom10">' +
                '<div class="t-blue-cont h" id="xedx-weapon-sort" style="display: none;">' +
                      '<div id="xedx-content-div" class="cont-gray border-round" style="height: auto; overflow: auto;">' +
                          '<div style="text-align: center">' +
                              '<span class="xedx-main">' +
                                  '<div>' +
                                      '<input class="xedx-ctrls" type="checkbox" id="autosort" name="autosort" value="autosort">' +
                                      '<label for="confirm">Auto Sort?</label>'+
                                      '<input class="xedx-ctrls" type="radio" id="xedx-1" class="xedx-oneclick" name="sortopts" data="Default" value="xedx-1">' +
                                          '<label for="xedx-1">Default</label>' +
                                      '<input class="xedx-ctrls" type="radio" id="xedx-2" class="xedx-oneclick" name="sortopts" data="Accuracy" value="xedx-2">' +
                                          '<label for="xedx-2">Accuracy</label>' +
                                      '<input class="xedx-ctrls" type="radio" id="xedx-3" class="xedx-oneclick" name="sortopts" data="Damage" value="xedx-3">' +
                                          '<label for="xedx-3">Damage</label>' +
                                      '<input class="xedx-ctrls" type="radio" id="xedx-4" class="xedx-oneclick" name="sortopts" data="Total" value="xedx-4">' +
                                          '<label for="xedx-4">Total</label>'+
                                      '<input class="xedx-ctrls" type="radio" id="xedx-5" class="xedx-oneclick" name="sortopts" data="Name" value="xedx-5">' +
                                          '<label for="xedx-5">Name</label>'+
                                  '</div>'+
                              '</span>' +
                          '</div>' +
                      '</div>' +
                  '</div>';
            return optionsDiv;
        }

    } // End function tornWeaponSort() {

    ////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Weapon Experience Tracker" (called at content complete)
    ////////////////////////////////////////////////////////////////////////////////

    function tornWeTracker() {
         log('[tornWeTracker]');

        // Selectors
        const pageSpanSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black > span.items-name";
        const pageDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black";

        // Global vars
        let pageName = ''; // Items page we are on
        let pageDiv = null;
        let pageObserver = null; // Mutation observer for the page
        let observing = false; // Observer is active
        const observerConfig = { attributes: true, characterData: true, subtree: true, childList: true };

        return new Promise((resolve, reject) => {
            if (location.href.indexOf("item.php") < 0) return resolve('tornWeTracker wrong page!');
            if (abroad()) return resolve('tornWeTracker not at home!');

            modifyPage(weArray);

            resolve("[tornWeTracker] complete!");
        }).catch((error) => {
            log("[tornWeTracker] ERROR: ", error);
            rejectDebug(error);
        });

        // Write out WE onto the page
        function modifyPage(array, pageChange = false) {
            if (pageObserver == null) { // Watch for active page changes.
                pageDiv = document.querySelector(pageDivSelector);
                var callback = function(mutationsList, observer) {
                    log('[tornWeTracker] Observer triggered - page change!');
                    log('[tornWeTracker] Setting onload function.');
                    modifyPage(weArray, true);
                };
                pageObserver = new MutationObserver(callback);
            }

            let lastPage = pageName;
            pageName = getPageName();
            debug('[tornWeTracker] modifyPage: pageName = "' + pageName + '" pageChange = "' + pageChange + '"');
            if ((lastPage != '') && (pageName.indexOf(lastPage) == -1) && (pageChange == false)) {
                debug('[tornWeTracker] Went from page "' + lastPage + '" to "' + pageName +'"');
            } else if (array && pageChange) {
                debug('[tornWeTracker] pageChange (observer): ' + lastPage + ' --> ' + pageName);
            } else if (array == null) {
                debug('[tornWeTracker] pageChange (timeout): ' + lastPage + ' --> ' + pageName);
                array = weArray;
            }
            let itemUL = null;

            if (pageName == 'Primary') {
                itemUL = $("#primary-items")[0];
            } else if (pageName == 'Secondary') {
                itemUL = $("#secondary-items")[0];
            } else if (pageName == 'Melee') {
                itemUL = $("#melee-items")[0];
            } else if (pageName == 'Temporary') {
                itemUL = $("#temporary-items")[0];
            } else {
                observeOn();
                return; // Not on a weapons page
            }

            let items = itemUL.getElementsByTagName("li");
            let itemLen = items.length;
            debug(pageName + ' Items length: ' + itemUL.getElementsByTagName("li").length);
            if (itemLen <= 1) { // Not fully loaded: come back later
                setTimeout(function(){ modifyPage(null, true); }, 500);
                return;
            }

            observeOff(); // Don't call ourselves while editing.

            debug('[tornWeTracker] modifyPage scanning <li>s');
            for (let i = 0; i < items.length; ++i) {
                let itemLi = items[i]; // <li> selector
                let itemID = itemLi.getAttribute('data-item');
                if (itemID == null) {continue;} // Not an item
                let category = itemLi.getAttribute('data-category');
                if (category == null) {continue;} // Child elem.

                debug('[tornWeTracker] Item ID: ' + itemID + ' Category: ' + category);

                let nameSel = itemLi.querySelector('div.title-wrap > div > span.name-wrap > span.name');
                if ($(nameSel).length > 0) continue; // Child elem.
                let name = nameSel.innerHTML;
                debug('[tornWeTracker] Name: ' + name);

                let item = getItemByItemID(array, Number(itemID));
                let WE = 0;
                if (item) WE = item.exp;

                let bonusUL = itemLi.querySelector('div.cont-wrap > div.bonuses.left > ul');
                let ttPriceSel = bonusUL.querySelector('li.bonus.left.tt-item-price');
                $(ttPriceSel).remove();
                let weSel = bonusUL.querySelector('li.left.we');
                $(weSel).remove();
                bonusUL.prepend(buildExpLi(itemLi, WE));
            } // End 'for' loop. iterating LI's
            observeOn();
        }

        //////////////////////////////////////////////////////////////////////
        // Helpers
        //////////////////////////////////////////////////////////////////////

        // Get 1st object for item ID
        // @param data - data array to search
        // @param itemID - ID to look for
        // @return first JSON object with matching ID
        function getItemByItemID(data, itemID) {
            let objs = getItemsByItemID(data, itemID);
            return objs[0];
        }

        // Helper for above, get array of objects that match requested ID
        function getItemsByItemID(data, itemID) {
            return data.filter(
                function(data){ return data.itemID == itemID }
            );
        }

        // Build an <li> to display the WE
        function buildExpLi(itemLi, WE) {
            let newLi = document.createElement("li");
            newLi.className = 'we left';
            let weSpan = document.createElement('span')
            weSpan.innerHTML = WE + '%';
            newLi.appendChild(weSpan);
            return newLi;
        }

        // Returns the page name of current page
        function getPageName() {
            let pageSpan = document.querySelector(pageSpanSelector);
            let pageName = pageSpan.innerText;
            debug("[tornWeTracker] On page '" + pageName + "'");
            return pageName;
        }

        // Helpers to turn on and off the observer
        function observeOff() {
            if (observing && pageObserver) {
                pageObserver.disconnect();
                debug('[tornWeTracker] disconnected observer.');
                observing = false;
            }
        }

        function observeOn() {
            if (pageObserver) {
                pageObserver.observe(pageDiv, observerConfig);
                debug('[tornWeTracker] observing page.');
                observing = true;
            }
        }

    } // End function tornWeTracker() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Weapon Experience Spreadsheet" (called at API complete)
    //////////////////////////////////////////////////////////////////////////////////

    function tornWeSpreadsheet() {
        log('[tornWeSpreadsheet]');

        // Will be table rows
        let fhRows = null;
        let weRows = null;

        // Globals
        let itemsArray = null; // Array of all Torn items
        let weAt100pct = 0; // Count of weapons at 100%
        let fhRemains = 0; // Remaining finishing hits total

        let useCellBackground = false; // true to color background, else text itself.

        let primaryArray = [];
        let secondaryArray = [];
        let meleeArray = [];
        let temporaryArray = [];

        return new Promise((resolve, reject) => {
            if (location.href.indexOf("item.php") < 0) return resolve('tornWeSpreadsheet wrong page!');
            if (abroad()) return resolve('tornWeSpreadsheet not at home!');

            loadTableStyles();

            logApiCall('torn: items');
            xedx_TornTornQuery(null, 'items', tornQueryCB);

            resolve("[tornWeSpreadsheet] startup complete!");
        }).catch((error) => {
            log("[tornWeSpreadsheet] ERROR: ", error);
            rejectDebug(error);
        });

        function tornQueryCB(responseText, ID, param) {
            debug('[tornWeSpreadsheet] Torn items query callback.');
            var jsonResp = JSON.parse(responseText);
            if (jsonResp.error) {
                if (queryRetries++ < 5) {
                    if (alertOnRetry) alert("Retrying error 17!");
                    return xedx_TornTornQuery(null, 'items', tornQueryCB);
                } else {
                    queryRetries = 0;
                }
                return handleError(responseText);
            }
            itemsArray = jsonResp.items; // Array of Torn items
            sortArrays(); // Also calls 'modifyPage()'
        }

        // Sorts and merges the two arrays, items and experience, into 4 new arrays,
        // primary, secondary, melee and temporary weapons and their WE.
        // Also count the ## at 100% (weAt100pct)
        function sortArrays() {
            for (let i =0; i < weArray.length; i++) {
                if (weArray[i].exp == 100) {weAt100pct++;}
                let ID = weArray[i].itemID;
                let itemObj = getItemById(ID);
                if ($(itemObj).length > 0) {
                    if (itemObj.type == 'Primary') {
                        primaryArray.push(weArray[i]);
                    } else if (itemObj.type == 'Secondary') {
                        secondaryArray.push(weArray[i]);
                    } else if (itemObj.type == 'Melee') {
                        meleeArray.push(weArray[i]);
                    } else if (itemObj.type == 'Temporary') {
                        temporaryArray.push(weArray[i]);
                    } else {
                        debug('Unknown type ' + itemObj.type + ' for weapon ID ' + ID);
                    }
                } else {
                    debug('Error finding item ' + ID + ' in itemsArray!');
                }
            }

            weRows = buildWeTableRows();
            fhRows = buildFhTableRows(fhArray);
            modifyPage();
        }

        // Build our new DIV
        function modifyPage() {
            log('[tornWeSpreadsheet] modifyPage');

            // Install above this div
            let refDiv = $("#loadoutsRoot");
            if (!refDiv) return setTimeout(modifyPage, 250);

            if ($("#xedx-we-spreadsheet-div").length > 0) {
                return debug('New WE and FH div already installed!');
            }
            let newDiv = newTopDiv() + fhRows + newMiddleDiv() + weRows + newBottomDiv();

            $(newDiv).insertBefore(refDiv);
            setTitlebar();
            installClickHandler();
            addWeaponTypeToolTips();
        }

        function addWeaponTypeToolTips() {
            log('[tornWeSpreadsheet] addWeaponTypeToolTips');
            const typeIDs = ["machits", "rifhits", "piehits", "axehits", "smghits", "pishits",
                             "chahits", "grehits", "heahits", "shohits", "slahits", "h2hhits"];

            addToolTipStyle();

            for (let i=0; i<typeIDs.length; i++) {
                debug('[tornWeSpreadsheet] displayTT for ', typeIDs[i]);
                displayToolTip($("#" + typeIDs[i]), getToolTipText(typeIDs[i]));
            }
        }

        function machineGunText() {
            return  '<B>Machine Gun Weapons:</B>' + CRLF + CRLF +
                    TAB + "PKM" + CRLF +
                    TAB + "Stoner 96" + CRLF +
                    TAB + "Negev NG-5" + CRLF +
                    TAB + "Rheinmetall MG 3" + CRLF +
                    TAB + "Neutrilux 2000" + CRLF +
                    TAB + "M249 SAW" + CRLF +
                    TAB + "Minigun" + CRLF;
        }
        function mechanicalText() {
            return  '<B>Mechanical Weapons:</B>' + CRLF + CRLF +
                    TAB + "Bolt Gun" + CRLF +
                    TAB + "Taser" + CRLF +
                    TAB + "Chainsaw" + CRLF;
        }
        function SubMachineGunText() {
            return  '<B>Sub Machine Guns:</B>' + CRLF + CRLF +
                    TAB + "Dual TMPs" + CRLF +
                    TAB + "Dual Bushmasters" + CRLF +
                    TAB + "Dual MP5s" + CRLF +
                    TAB + "Dual P90s" + CRLF +
                    TAB + "Dual Uzis" + CRLF +
                    TAB + "Pink Mac-10" + CRLF +
                    TAB + "9mm Uzi" + CRLF +
                    TAB + "MP5k" + CRLF +
                    TAB + "Skorpion" + CRLF +
                    TAB + "TMP" + CRLF +
                    TAB + "Thompson" + CRLF +
                    TAB + "MP 40" + CRLF +
                    TAB + "AK74U" + CRLF +
                    TAB + "Bushmaster Carbon 15" + CRLF +
                    TAB + "P90" + CRLF +
                    TAB + "BT MP9" + CRLF +
                    TAB + "MP5 Navy" + CRLF;
        }
        function rifleText() {
            return  '<B>Rifle Weapons:</B>' + CRLF + CRLF +
                    TAB + "Prototype" + CRLF +
                    TAB + "Gold Plated AK-47" + CRLF +
                    TAB + "SIG 552" + CRLF +
                    TAB + "ArmaLite M-15A4" + CRLF +
                    TAB + "SIG 550" + CRLF +
                    TAB + "SKS Carbine" + CRLF +
                    TAB + "Heckler & Koch SL8" + CRLF +
                    TAB + "Tavor TAR-21" + CRLF +
                    TAB + "Vektor CR-21" + CRLF +
                    TAB + "XM8 Rifle" + CRLF +
                    TAB + "M4A1 Colt Carbine" + CRLF +
                    TAB + "M16 A2 Rifle" + CRLF +
                    TAB + "AK-47" + CRLF +
                    TAB + "Enfield SA-80" + CRLF +
                    TAB + "Steyr AUG" + CRLF;
        }
        function piercingText() {
            return  '<B>Piercing Weapons:</B>' + CRLF + CRLF +
                    TAB + "Tranquilizer Gun" + CRLF +
                    TAB + "Scalpel" + CRLF +
                    TAB + "Wand of Destruction" + CRLF +
                    TAB + "Poison Umbrella" + CRLF +
                    TAB + "Meat Hook" + CRLF +
                    TAB + "Devil's Pitchfork" + CRLF +
                    TAB + "Pair of High Heels" + CRLF +
                    TAB + "Fine Chisel" + CRLF +
                    TAB + "Diamond Icicle" + CRLF +
                    TAB + "Twin Tiger Hooks" + CRLF +
                    TAB + "Harpoon" + CRLF +
                    TAB + "Ice Pick" + CRLF +
                    TAB + "Sai" + CRLF +
                    TAB + "Ninja Claws" + CRLF +
                    TAB + "Spear" + CRLF +
                    TAB + "Crossbow" + CRLF +
                    TAB + "Dagger" + CRLF +
                    TAB + "Butterfly Knife" + CRLF +
                    TAB + "Pen Knife" + CRLF +
                    TAB + "Blowgun" + CRLF +
                    TAB + "Diamond Bladed Knife" + CRLF +
                    TAB + "Macana" + CRLF +
                    TAB + "Swiss Army Knife" + CRLF +
                    TAB + "Kitchen Knife" + CRLF;
        }
        function clubbingText() {
            return  '<B>Clubbing Weapons:</B>' + CRLF + CRLF +
                    TAB + "Millwall Brick" + CRLF +
                    TAB + "Handbag" + CRLF +
                    TAB + "Sledgehammer" + CRLF +
                    TAB + "Penelope" + CRLF +
                    TAB + "Duke's Hammer" + CRLF +
                    TAB + "Madball" + CRLF +
                    TAB + "Dual Axes" + CRLF +
                    TAB + "Flail" + CRLF +
                    TAB + "Dual Hammers" + CRLF +
                    TAB + "Golden Broomstick" + CRLF +
                    TAB + "Petrified Humerus" + CRLF +
                    TAB + "Ivory Walking Cane" + CRLF +
                    TAB + "Wushu Double Axes" + CRLF +
                    TAB + "Cricket Bat" + CRLF +
                    TAB + "Wooden Nunchakus" + CRLF +
                    TAB + "Pillow" + CRLF +
                    TAB + "Slingshot" + CRLF +
                    TAB + "Metal Nunchakus" + CRLF +
                    TAB + "Bo Staff" + CRLF +
                    TAB + "Frying Pan" + CRLF +
                    TAB + "Axe" + CRLF +
                    TAB + "Knuckle Dusters" + CRLF +
                    TAB + "Lead Pipe" + CRLF +
                    TAB + "Crowbar" + CRLF +
                    TAB + "Plastic Sword" + CRLF +
                    TAB + "Baseball Bat" + CRLF +
                    TAB + "Hammer" + CRLF;
        }
        function pistolText() {
            return  '<B>Pistol Weapons:</B>' + CRLF + CRLF +
                TAB + "Beretta Pico" + CRLF +
                TAB + "S&W M29" + CRLF +
                TAB + "Cobra Derringer" + CRLF +
                TAB + "Desert Eagle" + CRLF +
                TAB + "Luger" + CRLF +
                TAB + "Beretta 92FS" + CRLF +
                TAB + "Dual 92G Berettas" + CRLF +
                TAB + "Fiveseven" + CRLF +
                TAB + "Qsz-92" + CRLF +
                TAB + "Springfield 1911" + CRLF +
                TAB + "Flare Gun" + CRLF +
                TAB + "Beretta M9" + CRLF +
                TAB + "Magnum" + CRLF +
                TAB + "S&W Revolver" + CRLF +
                TAB + "Ruger 22/45" + CRLF +
                TAB + "Lorcin 380" + CRLF +
                TAB + "Taurus" + CRLF +
                TAB + "Raven MP25" + CRLF +
                TAB + "USP" + CRLF +
                TAB + "Glock 17" + CRLF;
        }
        function tempText() {
            return  '<B>Temporary, damaging Weapons:</B>' + CRLF + CRLF +
                TAB + "Nerve Gas" + CRLF +
                TAB + "Semtex" + CRLF +
                TAB + "Concussion Grenade" + CRLF +
                TAB + "Sand" + CRLF +
                TAB + "Nail Bomb" + CRLF +
                TAB + "Book" + CRLF +
                TAB + "Claymore Mine" + CRLF +
                TAB + "Fireworks" + CRLF +
                TAB + "Throwing Knife" + CRLF +
                TAB + "Molotov Cocktail" + CRLF +
                TAB + "Stick Grenade" + CRLF +
                TAB + "Snowball" + CRLF +
                TAB + "Trout" + CRLF +
                TAB + "Ninja Star" + CRLF +
                TAB + "HEG" + CRLF +
                TAB + "Grenade" + CRLF +
                TAB + "Brick" + CRLF;
        }
        function heavyArtilleryText() {
             return  '<B>Heavy Artillery Weapons:</B>' + CRLF + CRLF +
                    TAB + "Milkor MGL" + CRLF +
                    TAB + "SMAW Launcher" + CRLF +
                    TAB + "Snow Cannon" + CRLF +
                    TAB + "China Lake" + CRLF +
                    TAB + "Egg Propelled Launcher" + CRLF +
                    TAB + "RPG Launcher" + CRLF +
                    TAB + "Type 98 Anti Tank" + CRLF +
                    TAB + "Flamethrower" + CRLF;
        }
        function shotgunText() {
            return  '<B>Shotgun Weapons:</B>' + CRLF + CRLF +
                TAB + "Nock Gun" + CRLF +
                TAB + "Homemade Pocket Shotgun" + CRLF +
                TAB + "Blunderbuss" + CRLF +
                TAB + "Jackhammer" + CRLF +
                TAB + "Ithaca 37" + CRLF +
                TAB + "Mag 7" + CRLF +
                TAB + "Benelli M4 Super" + CRLF +
                TAB + "Sawed-Off Shotgun" + CRLF +
                TAB + "Benelli M1 Tactical" + CRLF;
        }
        function slashingText() {
            return  '<B>Slashing Weapons:</B>' + CRLF + CRLF +
                TAB + "Bug Swatter" + CRLF +
                TAB + "Bread Knife" + CRLF +
                TAB + "Riding Crop" + CRLF +
                TAB + "Cleaver" + CRLF +
                TAB + "Dual Scimitars" + CRLF +
                TAB + "Naval Cutlass" + CRLF +
                TAB + "Dual Samurai Swords" + CRLF +
                TAB + "Pair of Ice Skates" + CRLF +
                TAB + "Blood Spattered Sickle" + CRLF +
                TAB + "Guandao" + CRLF +
                TAB + "Kama" + CRLF +
                TAB + "Yasukuni Sword" + CRLF +
                TAB + "Chain Whip" + CRLF +
                TAB + "Claymore Sword" + CRLF +
                TAB + "Katana" + CRLF +
                TAB + "Rusty Sword" + CRLF +
                TAB + "Samurai Sword" + CRLF +
                TAB + "Scimitar" + CRLF +
                TAB + "Kodachi" + CRLF +
                TAB + "Leather Bullwhip" + CRLF;
        }
        function hand2handText() {
            return "I hope it's obvious - feet and hands." + CRLF;
        }

        function getToolTipText(id) {
            switch (id) {
                case "machits":
                    return machineGunText();
                case "rifhits":
                    return rifleText();
                case "piehits":
                    return piercingText();
                case "axehits":
                    return clubbingText();
                case "smghits":
                    return SubMachineGunText();
                case "pishits":
                    return pistolText();
                case "chahits":
                    return mechanicalText();
                case "grehits":
                    return tempText();
                case "heahits":
                    return heavyArtilleryText();
                case "shohits":
                    return shotgunText();
                case "slahits":
                    return slashingText();
                case "h2hhits":
                    return hand2handText();
                default:
                    return null;

            }
        }

        //////////////////////////////////////////////////////////////////////
        // Helper functions
        //////////////////////////////////////////////////////////////////////

        // Helper to set the title in the title bar to reflect # of weapons completed to 100%
        function setTitlebar() {
            let titleBar = document.querySelector("#xedx-we-title");
            $("#xedx-we-title").css("position", "absolute");
            if (!$(titleBar).length > 0) {
                return setTimeout(setTitlebar, 1000);
            } else {
                let rfPct = Math.round((fhArray.roundsfired/1000000)*100);
                let dmgPct = Math.round((fhArray.attackdamage) /100000000*100);
                titleBar.innerText = "WE and Finishing Hits: " +
                    weAt100pct + " weapons at 100%, Rounds fired: " + numberWithCommas(fhArray.roundsfired) + "/1,000,000 (" + rfPct + "%)," +
                    " Total damage: " + numberWithCommas(fhArray.attackdamage) + "/100,000,000 (" + dmgPct + "%)";

                $("#xedx-fh-hdr")[0].textContent = 'Finishing hits: ' + fhRemains + ' remain, about ' + numberWithCommas(fhRemains * 25) + 'e';
            }
        }

        // Function to build the table rows from our arrays for Weapon Experience
        function buildWeTableRows() {
            let maxRows = Math.max(primaryArray.length, secondaryArray.length, meleeArray.length, temporaryArray.length);
            if (maxRows < 1) {return;}

            let result = '';
            for (let i = 0; i < maxRows; i++) {
                result += '<tr style="height: 23px;">'; // Start row

                let arrays = [primaryArray, secondaryArray, meleeArray, temporaryArray];
                for (let j = 0; j < 4; j++) {
                    let useArray = arrays[j];
                    if (useArray[i]) {
                        result += buildWeCell(useArray[i]);
                    } else {
                        result += '<td class="xtdx"></td>'; // Empty cell
                    }
                }
                result += '</tr>'; // End row
            }
            return result;
        }

        // Helper to build and color-code an individual cell for WE
        function buildWeCell(weItem) {

            // Check this ! Inventory no longer in API...
            let itemObjs = getInventoryById(weItem.itemID);
            let color = (weItem.exp == 100) ? 'xtdx-green' :
                (weItem.exp >= 50) ? 'xtdx-orange' : 'xtdx-red';
            if (itemObjs && itemObjs.length && itemObjs.filter(i => i.equipped).length) {color = 'xtdx-yellow';}

            let output = '<td class="xtdx ' + color + '">' +
                '<span style="float:left">' + weItem.name +
                '</span><span style="float:right">' + weItem.exp + '%</span></td>';

            return output;
        }

        // TBD FIX FOR API V2
        // Function to build the table rows from our arrays for Finishing Hits
        function buildFhTableRows(obj) { // obj is a personalstats object
            let result = '<tr>';
            result += buildFhCell('Machine Guns', obj.machits, "machits");
            result += buildFhCell('Rifles', obj.rifhits, "rifhits");
            result += buildFhCell('Piercing', obj.piehits, "piehits");
            result += buildFhCell('Clubbing', obj.axehits, "axehits");
            result += '</tr><tr>';
            result += buildFhCell('Sub Machine Guns', obj.smghits, "smghits");
            result += buildFhCell('Pistols', obj.pishits, "pishits");
            result += buildFhCell('Mechanical', obj.chahits, "chahits");
            result += buildFhCell('Temporary', obj.grehits, "grehits");
            result += '</tr><tr>';
            result += buildFhCell('Heavy Artillery', obj.heahits, "heahits");
            result += buildFhCell('Shotguns', obj.shohits, "shohits");
            result += buildFhCell('Slashing', obj.slahits, "slahits");
            result += buildFhCell('Hand to Hand', obj.h2hhits, "h2hhits");
            result += '</tr>';

            fhRemains = calcRemainingFinishingHits(obj);

            return result;
        }

        // Helper to add together remaining finishing hits
        function calcRemainingFinishingHits(obj) {
            let result = remainingHits(obj.machits);
            result += remainingHits(obj.rifhits);
            result += remainingHits(obj.piehits);
            result += remainingHits(obj.axehits);
            result += remainingHits(obj.smghits);
            result += remainingHits(obj.pishits);
            result += remainingHits(obj.chahits);
            result += remainingHits(obj.grehits);
            result += remainingHits(obj.heahits);
            result += remainingHits(obj.shohits);
            result += remainingHits(obj.slahits);
            result += remainingHits(obj.h2hhits);

            return result;
        }

        function remainingHits(count) {
            return (count > 1000) ? 0 : 1000 - count;
        }

        // Helper to build and color-code an individual cell for FH
        function buildFhCell(name, count, id=null) {
            let color = (count >= 1000) ? 'xtdx-green' : (count >= 750 ? 'xtdx-orange' : 'xtdx-red');
            let result = '<td class="xtdx ' + color + '"' + (id ? ('id="' + id + '"') : '' ) + '><span style="float:left">' + name +
                '</span><span style="float:right">' + numberWithCommas(count) + '</span></td>';
            return result;
        }

        // Helper to get item object by ID
        function getItemById(itemID) {
            let itemObj = itemsArray[itemID.toString()];
            return itemObj;
        }

        // Helper to get inventory object by ID
        //
        // Note: The 'User->Inventory' API call has been removed, perhaps
        // permanently. This won't work unless a workaround is found.
        function getInventoryById(itemID) {
            debug("***inventory: ", inventoryArray);

            //let itemObjs = inventoryArray.filter(item => item.ID == itemID);
            //return itemObjs;

            return null;
        }

        // Helper to toggle body div on arrow click
        function installClickHandler() {
            const bodyDiv = document.getElementById('xedx-we-spreadsheet-body');
            const bodyDiv2 = document.getElementById('xedx-fh-spreadsheet-body');
            const headerDiv = document.getElementById('xedx-we-spreadsheet-hdr-div');
            const arrowDiv = headerDiv.parentElement; // xedx-we-spreadsheet-div ??

            arrowDiv.addEventListener("click", function() {
                if (bodyDiv.style.display === "block") {
                    bodyDiv.style.display = "none";
                    bodyDiv2.style.display = "none";
                    headerDiv.className = 'title main-title title-black border-round';
                } else {
                    bodyDiv.style.display = "block";
                    bodyDiv2.style.display = "block";
                }
            });
        }

        // These are all functions to help reduce clutter in here, can use code folding
        // Doesn't look right on mobile, maybe because width is 782px ???
        // try matching to $(.equipped-items-wrap) ? Or use flex or something toexpand into table?
        function newTopDiv() {
            return '<div class="sortable-box t-blue-cont h" id="xedx-we-spreadsheet-div">' +
                         '<div class="title main-title title-black top-round active box" role="table" aria-level="5" id="xedx-we-spreadsheet-hdr-div">' +
                             '<div class="arrow-wrap sortable-list">' +
                                 '<a role="button" href="#/" class="accordion-header-arrow right"></a>' +
                             '</div>' +
                             '<div class="box"><span id="xedx-we-title">Weapon Experience and Finishing Hits</span></div>' +
                         '</div>' +
                             '<div class="bottom-round" style="display: none; overflow: hidden;" id="xedx-fh-spreadsheet-body">' +
                                 '<div class="cont-gray" style="height: auto;" id="xedx-fh-spreadsheet-cont">' +
                                     // Finishing hits table
                                     '<table id="xedx-fh-spreadsheet-table" style="width: 782px;">' +    // style="width: 782px; (auto didn't work)
                                         '<thead><tr>' +
                                             '<th class="xthx" id="xedx-fh-hdr" colspan="4" scope="colgroup">Finishing Hits</th>' +
                                         '</tr></thead>' +
                                         '<tbody>'; // Start table

                                         /* Rows (fhRows) will be inserted here */
        }

        function newMiddleDiv() {
            return '</tbody>' + // End table
                                     '</table>' +
                                 '</div>' +
                             '</div>' +

                             '<div class="bottom-round" style="display: none; overflow: hidden;" id="xedx-we-spreadsheet-body">' +
                                 '<div class="cont-gray" style="height: auto;" id="xedx-we-spreadsheet-cont">' +
                                     // Weapon Experience table
                                     '<table id="xedx-we-spreadsheet-table" style="width: 782px;">' +    // style="width: 782px;
                                         //'<thead><tr>' +
                                         //    '<th class="xthx" colspan="4" scope="colgroup">Weapon Experience</th>' +
                                         //'</tr></thead>' +
                                         '<thead><tr>' +
                                             '<th class="xthx">Primary</th>' +
                                             '<th class="xthx">Secondary</th>' +
                                             '<th class="xthx">Melee</th>' +
                                             '<th class="xthx">Temporary</th>' +
                                         '</tr></thead>' +
                                         '<tbody>'; // Start table

                                         /* Rows (weRows) will be inserted here */
        }

        function newBottomDiv() {
           return            '</tbody>' + // End table
                                     '</table>' +
                                 '</div>' +
                             '</div>' +
                         '</div>' +
                     '</div>' +
                 '</div>' +
                 '<hr class="delimiter-999 m-top10 m-bottom10"></hr>';
        }

        // Load CSS styles for the new UI.
        function loadTableStyles() {
            log('Loading table styles.');
            GM_addStyle(`.box {display: flex; align-items: center; justify-content: center; flex-direction: column;}`);

            // General cell styles
            GM_addStyle(".xthx, .xtdx {" +
                        (useCellBackground ? '' : "background: #333333 !important;") +
                        "border-width: 1px !important;" +
                        "border-style: solid !important;" +
                        "border-color: #5B5B5B !important;" +
                        "padding: 0.5rem !important;" +
                        "vertical-align: middle !important;" +
                        "color: white; !important;" +
                        "text-align: center;" + // hmmm - seems redundant/not needed
                        "}");

            // Cell alignment
            GM_addStyle(`.xtdx-left {text-align: left;}
                        .xtdx-center {text-align: center;}
                        .xtdx-right {text-align: right;}`);

            // Cell colors. Text or background.
            if (useCellBackground) {
                GM_addStyle(`.xtdx-green {background: green;}
                             .xtdx-red {background: red;}
                             .xtdx-yellow {background: yellow;}
                             .xtdx-orange {background: orange;}`);
            } else {
                GM_addStyle(`.xtdx-green {color: green;}
                             .xtdx-red {color: red;}
                             .xtdx-yellow {color: yellow;}
                             .xtdx-orange {color: orange;}`);
            }
        }

    } // End function tornWeSpreadsheet() {

    function removeWeSpreadsheet() {$("#xedx-we-spreadsheet-div").remove()}

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn See The Temps" (called immediately)
    //////////////////////////////////////////////////////////////////////////////////

    function tornSeeTheTemps() {
        log('[tornSeeTheTemps]');
        return new Promise((resolve, reject) => {
            if (location.href.indexOf("loader.php?sid=attack") < 0) return resolve('tornSeeTheTemps wrong page!');
            if (abroad()) return resolve('tornSeeTheTemps not at home!');

            handleSeeTheTempsPageLoad();

            //GM_addStyle (`.defender___2q-P6 {background:none !important;}}`);
            resolve("tornSeeTheTemps complete!");
        }).catch((error) => {
            log("[tornSeeTheTemps] ERROR: ", error);
            rejectDebug(error);
        });

        // May want to move to the 'handlePageLoad()' section,
        // instead of retrying....
        var sttRetries = 0;
        function handleSeeTheTempsPageLoad()
        {
            let targetNode = $("#defender").find('[class^="modal_"]');
            if (targetNode.length == 0) {
                if (sttRetries++ >= 5) return;
                return setTimeout(handleSeeTheTempsPageLoad, 100);
            }

            var classList = $(targetNode).attr('class').split(/\s+/);
            $.each(classList, function(index, item) {
                log("Looking at class: ", item);
                if (item.indexOf('defender__') > -1) {
                    addSeeTheTempsStyle(item);
                }
            });
        }

        function addSeeTheTempsStyle(className) {
            GM_addStyle ( `.` + className + `{ background:none !important; }}`);
        }
    } // End function tornSeeTheTemps() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Scroll On Attack" (called immediately)
    //////////////////////////////////////////////////////////////////////////////////

    function tornScrollOnAttack() {
        log('[tornScrollOnAttack]');
        return new Promise((resolve, reject) => {
            if (location.href.indexOf("loader.php?sid=attack") < 0) return resolve('tornScrollOnAttack wrong page!');
            if (abroad()) return resolve('tornScrollOnAttack not at home!');

            // Make these configurable options one day.
            // 74 is exactly at the bottom of the header, on my MacBook Pro.
            // To compensate for the clock hiding time left, make it a bit less -
            // 66 seems to work for me. One mouse scroll click = 4 px on my Mac.
            let y = 66; //74;
            let delay = 2000;

            setTimeout(function() {window.scrollTo(0, y);}, delay);
            resolve("tornScrollOnAttack complete!");
        }).catch((error) => {
            log("[tornScrollOnAttack] ERROR: ", error);
            rejectDebug(error);
        });
    } // End function tornScrollOnAttack() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Holdem Score" (called at document loaded)
    //////////////////////////////////////////////////////////////////////////////////

    // TBD !!!
    function tornHoldemScore() {
        log('[tornHoldemScore]');

        return new Promise((resolve, reject) => {
            if (location.href.indexOf("loader.php?sid=holdem") < 0) return resolve('tornHoldemScore wrong page!');
            if (abroad()) return resolve('tornHoldemScore not at home!');

            resolve('[tornHoldemScore] not yet implemented!');

            //resolve("[tornHoldemScore] complete!");
        }).catch((error) => {
            log("[tornHoldemScore] ERROR: ", error);
            rejectDebug(error);
        });
    } // End function tornHoldemScore() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Stock Profits" (called at API complete)
    //////////////////////////////////////////////////////////////////////////////////

    function tornStockProfits() {
        debug('[tornStockProfits] ');
        let observer = null;
        let userStocksJSON = null;
        let tornStocksJSON = null;
        const showProfit = true;
        const showLoss = true;
        var readyStocksOnly = false;
        var ownedStocksOnly = false;
        var mainStocksUL = $("#stockmarketroot").find('[class^="stockMarket"]')[0];

        // Get stock name/price from ID
        const stockNameFromID = function(ID){return tornStocksJSON.stocks[ID].name;};
        const stockPriceFromID = function(ID){return tornStocksJSON.stocks[ID].current_price;};

        return new Promise((resolve, reject) => {
            GM_addStyle(`.xHiddenStock { display: none !important; }`);
            if (location.href.indexOf("page.php?sid=stocks") < 0) return resolve('tornStockProfits wrong page!');
            logApiCall('user: stocks');
            addCheckBox();
            xedx_TornUserQuery(null, 'stocks', userStocksCB);
            resolve("[tornStockProfits] startup complete!");
        }).catch((error) => {
            log("[tornStockProfits] ERROR: ", error);
            rejectDebug(error);
        });

        // Callbacks for our Torn API calls.
        function userStocksCB(responseText, ID, param) {
            userStocksJSON = JSON.parse(responseText);
            if (userStocksJSON.error) {return handleError(responseText);}
            xedx_TornTornQuery(null, 'stocks', tornStocksCB);
        }

        function tornStocksCB(responseText, ID, param) {
            tornStocksJSON = JSON.parse(responseText);
            if (tornStocksJSON.error) {
                if (tornStocksJSON.error.code == 17) {
                    if (queryRetries++ < 5) {
                        if (alertOnRetry) alert("Retrying error 17!");
                        return xedx_TornTornQuery(null, 'stocks', tornStocksCB);
                    } else {
                        queryRetries = 0;
                    }
                }
                return handleError(responseText);
            }
            modifyPage();
        }

        function addCheckBox() {
            let root = $("#stockmarketroot > div[class^='appHeaderWrapper_'] > " +
                  " div[class^='topSection_'] > div[class^='titleContainer_']");

            GM_addStyle(`
                .stk-cb {float: right; margin-left: 20px; margin-top: 8px;}
                .xblack {background: #111}
                .xact {border: 1px solid green; background: #111;}
                .xin {border: 1px solid red; opacity: .5;  background: #ccc;}
                .lime{border: 3px solid limegreen;  background: #111;}
                .stk-cb-wrap {display:flex; flex-flow: row wrap;font-size: 14px;float:right;}
                .stk-cb-wrap label {margin: 0px 5px 0px 20px;}
             `);

            let cb = $(`<span class="stk-cb-wrap">
                            <span id='sready'>
                                <label for="ready">Only ready: </label>
                                <input type="checkbox" name="ready">
                            </span><span id='sowned'>
                                <label for="ready">Owned: </label>
                                <input type="checkbox" name="owned">
                            </span>
                        </span>`);
            $(root).append(cb);

            Object.defineProperty(String.prototype, "has", {
                value: function (word) {
                    return this.indexOf(word) > -1;
                },
            });

            let tip = "Checking this will hide all stocks except<BR>for those currently ready to collect.";
            displayHtmlToolTip(cb, tip, "tooltip4");
            let tip2 = "Checking this will hide all stocks except<BR>for those owned by you.";
            displayHtmlToolTip(cb, tip2, "tooltip4");

            // add 'click' handler, and tooltip...
            $('#sready').on('click', toggleReadyOnly);
            $('#sowned').on('click', toggleOwnedOnly);
        }

        var claimProcessed = false;

        // Gets called twice, once w/class  [button.torn-btn.green]
        // then close btn,  [button.torn-btn.green]
        function clickClaimBtn(target, retries=0) {
            if (target && $(target).hasClass("xedx-clicked2")) {
                return log("[tornStockProfits] already clicked, ignored! ", $(target));
            }

            let parent = $(target).parent();
            let sib = $(parent).next();
            let btn = $(sib).find("div > button");
            if (!$(btn).length) {
                if (retries++ < 60) return setTimeout(clickClaimBtn, 250, target, retries);
                return log("[tornStockProfits] Too many retries!");
            }
            if (!$(target).hasClass("xedx-clicked2"))
                $(target).addClass("xedx-clicked2");
            debug("[tornStockProfits] Got button! ", $(btn));
            $(btn).click();
            claimProcessed = true;
        }

        function handleStockCollect(e) {
            //e.preventDefault();
            //e.stopPropagation();
            let target = $(e.currentTarget);
            $(target).off("click.xedx");
            $(target).addClass("xedx-clicked");

            debug("[tornStockProfits] : calling clickClaimBtn");
            claimProcessed = false;
            //clickClaimBtn(target);
            setTimeout(clickClaimBtn, 200, target);
            //return false;
        }

        function toggleReadyOnly(e) {
            let cb = $(e.currentTarget).find("input")[0];
            readyStocksOnly = $(cb).prop("checked");
            callOnContentComplete(handleReadyStocks);
        }
        function toggleOwnedOnly(e) {
            let cb = $(e.currentTarget).find("input")[0];
            ownedStocksOnly = $(cb).prop("checked");
            callOnContentComplete(handleOwnedStocks);
        }

        function handleOwnedStocks() {
            console.log("[handleOwnedStocks] owned only: ", ownedStocksOnly);
            let allStocks = $("[class*='stockMarket_'] > ul");
            if (ownedStocksOnly == false) {
                for (let idx=0; idx<$(allStocks).length; idx++) {
                    let item = $(allStocks)[idx];
                    $(item).removeClass("xHiddenStock");
                }
                return;
            }

            let unOwned = $("[class*='stockMarket_'] > ul").find("p[class^='count_']").filter( ( idx, el ) => {
                return $(el).text() == 'None';
            });

            console.log("[handleOwnedStocks] unowned: ", $(unOwned));
            for (let idx=0; idx<$(unOwned).length; idx++) {
                let item = $(unOwned)[idx];
                $(item).closest("ul").addClass("xHiddenStock");
            }
        }

        function handleReadyStocks() {
            let stockList = $(mainStocksUL).find("ul");
            let divInfo = $(mainStocksUL).find("[class^='dividendInfo']");

            for (let idx=0; idx < $(divInfo).length; idx++) {
                let el = $(divInfo)[idx];
                let child2 = $(el).children().eq(1);
                let text = $(child2).text();

                let sel = $(child2).closest("ul");
                if (readyStocksOnly) {
                    if (text.has("Benefit")) {log(text + " matches Benefit!");$(sel).addClass("xblack").addClass("xedx-not-ready");}
                    else if (text.has("Ready in")) {log(text + " matches Ready in!");$(sel).addClass("xblack").addClass("xedx-not-ready");}
                    else if (text.has("Inactive")) {log(text + " matches Inactive!");$(sel).addClass("xblack").addClass("xedx-not-ready");}
                    else if (text.has("collection")) {
                        $(sel).addClass("lime");
                        $(el).parent().addClass("xedx-ready");
                    }
                    else {$(sel).css("opacity", ".5").addClass("xedx-not-ready");}
                } else {
                    $(sel).removeClass("xblack").removeClass("lime").css("opacity", "1.0");
                }
            }

            $(".xedx-ready").on('click.xedx', handleStockCollect);
            let notRead = $(".xedx-not-ready");

            for (let idx=0; idx < $(notRead).length; idx++) {
                let node = $(notRead)[idx];
                let parent = $(node).closest("ul");
                if (readyStocksOnly)
                    $(parent).attr("style", "display: none !important");
                else
                    $(parent).css("display", "");
            }

        }

        // While we're here, also add dummy classes to find later
        function highlightReadyStocks() {
            let objects = document.querySelectorAll('[class*="Ready__"]');
            for (let i=0; i<objects.length; i++) {
                let obj = objects[i];
                if (obj.textContent == 'Ready for collection') {
                    $(obj).addClass("xedx-ready");
                    if (!$(obj).hasClass('highlight-active')) $(obj).addClass('highlight-active');
                } else {
                    $(obj).addClass("xedx-not-ready");
                }
            }
        }

        // Called when page loaded.
        function modifyPage() {
            if (observer) observer.disconnect();
            if (!mainStocksUL) {
                mainStocksUL = $("#stockmarketroot").find('[class^="stockMarket"]')[0];
            }
            if (!mainStocksUL) {
                log("[tornStockProfits] didn't find target!");
                return setTimeout(modifyPage, 250); // Check should not be needed
            }

            //var stocksList = mainStocksUL.getElementsByTagName('ul');
            var stocksList = $(mainStocksUL).find('ul');
            if (stocksList.length < 2) {
                log("[tornStockProfits] Retrying stocks page, no stocks yet...");
                return setTimeout(modifyPage, 250); // Check should not be needed
            }

            // -- Now we're all good to go. --
            for (let i = 0; i < stocksList.length; i++) {
                let stockUL = stocksList[i];
                let stockID = stockUL.id;
                if (!stockID) continue; // Expanded stock column
                let stockName = stockNameFromID(stockID);
                let stockPrice = stockPriceFromID(stockID);
                //log('Stock ' + i + ' ID = ' + stockID);
                if (!userStocksJSON.stocks[stockID]) { // Un-owned
                    continue;
                }
                stockUL.setAttribute('style', 'height: auto;');
                let owned = userStocksJSON.stocks[stockID].transactions;
                let keys = Object.keys(owned);
                for (let j = 0; j < keys.length; j++) {
                    let ownedLI = stockUL.querySelector("#ownedTab");
                    let ownedShares = owned[keys[j]].shares;
                    let boughtPrice = owned[keys[j]].bought_price;
                    let profit = (stockPrice - boughtPrice) * ownedShares; // Gross profit
                    let fee = stockPrice * ownedShares * .001;
                    profit = profit - fee; // -.1% fee.
                    if (profit > 0 && showProfit) $(ownedLI).append('<p class="xedx-green">' + asCurrency(profit) + '</p>');
                    if (profit < 0 && showLoss) $(ownedLI).append('<p class="xedx-offred">' + asCurrency(profit) + '</p>');
                }
            }

            highlightReadyStocks();

            // Now set up an observer, as the prices update now and again.
            if (!observer) observer = new MutationObserver(reload);
            observer.observe(mainStocksUL, {attributes: true, characterData: true});
        }

        // Reload after stock prices change
        function reload() {
            userStocksJSON = null;
            tornStocksJSON = null;
            logApiCall('user: stocks');
            xedx_TornUserQuery(null, 'stocks', userStocksCB);
        }
    } // End function tornStockProfits() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Racing Alert" (called at document loaded)
    //////////////////////////////////////////////////////////////////////////////////

    var racingAlertTimer = null;
    function tornRacingAlert() {
        debug('[tornRacingAlert]');
        var animatedIcons = true; // TRUE to flash the red icon

        const globeIcon = `<li class="icon71___NZ3NH"><a id="icon71-sidebar" href="#" tabindex="0" i-data="i_64_86_17_17"></a></li>`;
        const raceIconGreen =  `<li class="icon17___eeF6s"><a href="/page.php?sid=racing" tabindex="0" i-data="i_37_86_17_17"></a></li>`;
        const raceIconRed  =`<li id="xedx-race-icon" class="icon18___wusPZ"><a href="/page.php?sid=racing" tabindex="0" i-data="i_37_86_17_17"></a></li>`;

        return new Promise((resolve, reject) => {
            if (abroad()) return resolve('[tornRacingAlert] not at home!');
            setTimeout(addRaceIcon, 250);
            racingAlertTimer = setInterval(addRaceIcon, 10000); // Check every 10 secs
            resolve("[tornRacingAlert] complete!");
        }).catch((error) => {
            log("[tornRacingAlert] ERROR: ", error);
            rejectDebug(error);
        });

        function hasStockRaceIcons() {
            let result = $("[class^='icon18_']").length > 0 || $("[class^='icon17_']").length > 0;

            if ($("[class^='icon18_']").length > 0) {
                let iconClassRed = $($("[class^='icon18_']")[0]).attr("class");
                debug("Race icon class red: ", iconClassRed);
                GM_setValue("iconClassRed", iconClassRed);
            }
            if ($("[class^='icon17_']").length > 0) {
                let iconClassGreen = $($("[class^='icon17_']")[0]).attr("class");
                debug("Race icon class green: ", iconClassGreen);
                GM_setValue("iconClassGreen", iconClassGreen);
            }
            return result;
        }

        function addRaceIcon() {
            let existingRaceIcon = document.getElementById("xedx-race-icon");
            let redIcon = $("[class^='icon18_']");
            if ($(redIcon).length > 0 && animatedIcons && !$(redIcon).parent().hasClass('highlight-active')) {
                $(redIcon).addClass('highlight-active');
            }

            if (abroad() || hasStockRaceIcons()) { // Remove if flying or stock icons there already
                if (existingRaceIcon) {
                    $(existingRaceIcon).remove();
                }
                return;
            }

            if (existingRaceIcon) {
                if (animatedIcons && !$(existingRaceIcon).hasClass('highlight-active')) $(existingRaceIcon).addClass('highlight-active');
                return;
            }

            // Add our icon
            $('[class^="status-icons"]').append(raceIconRed);
            let iconClassRed = GM_getValue("iconClassRed", null);
            if (iconClassRed) $("#xedx-race-icon").attr("class", iconClassRed);
            if (animatedIcons) $("#xedx-race-icon").addClass('highlight-active');
        }
    } // End function tornRacingAlert() {

    function removetornRacingAlert() {
        $("#xedx-race-icon").remove();
        if (racingAlertTimer) clearTimeout(racingAlertTimer);
        racingAlertTimer = null;
    }

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Racing Car Order" (called at document loaded, uses observer)
    //////////////////////////////////////////////////////////////////////////////////

    // From original:
    // @require  https://raw.githubusercontent.com/lodash/lodash/4.17.15-npm/core.js
    // Don't recall why I added that...

    function tornRacingCarOrder() {
        log('[tornRacingCarOrder]');

        //////////////////////////////////////////////////////////////////////
        // Global to this function
        ///////////////////////////////////////////////////////////////////////

        const saveBtnId = 'saveBtnId';
        const xedxMainDiv = getMainDiv();
        var defOrderSaved = false;
        var savedCarsArray = [];
        var arrayFilled = false;
        var opt_sortCars = true; // Checkbox: load the saved car order
        var targetNode = document.getElementById('racingMainContainer');
        var config = { attributes: false, childList: true, subtree: true };
        var refDiv = null;
        var draggableSet = false;
        var carsSorted = false;
        var savedCurrPage = 0;
        var callback = function(mutationsList, observer) {
            refDiv = document.querySelector("#racingAdditionalContainer");
            let checkDiv = refDiv ? refDiv.getElementsByClassName('enlist-wrap enlisted-wrap')[0] : null;
            if (!checkDiv) return;

            debug('[tornRacingCarOrder] **** Observer triggered!');
            debug('[tornRacingCarOrder] mutationsList: ', mutationsList);
            observerOff();
            buildRaceCarOrderDiv();
            observerOn();
        };
        var observer = new MutationObserver(callback);

        return new Promise((resolve, reject) => {
            if (abroad()) return rejectDebug('[tornRacingCarOrder] not at home!');
            if (!isRacePage()) return resolve('tornRacingCarOrder wrong page!');

            loadStyles();
            startCarOrderScript();

            resolve("[tornRacingCarOrder] startup complete!");
        });

        function startCarOrderScript() {
            if (!targetNode) targetNode = document.getElementById('racingMainContainer');
            if (!targetNode) return setTimeout(startCarOrderScript, 250);
            observerOn();
        }

        //////////////////////////////////////////////////////////////////////
        // Order the cars.
        ///////////////////////////////////////////////////////////////////////

        // Given a list of cars, put them into the UL on the page, in that order.
        function putCarsInOrder(carList) {
            debug('[tornRacingCarOrder] [putCarsInOrder] ==>');
            debug('[tornRacingCarOrder] arrayFilled: ', arrayFilled);
            debug('[tornRacingCarOrder] carList: ', carList);

            // The savedCarsArray contains the actual LI's, the carList just references to them
            var ul = refDiv.getElementsByClassName('enlist-list')[0];
            if ($(ul).length > 0) {

                if (!arrayFilled) { // Unused? Never set to true?
                    debug('[tornRacingCarOrder] FILLING ARRAY');
                    for (var i = 0, len = ul.children.length; i < len; i++ ) {
                        var li = ul.children[i];
                        if(savedCarsArray.includes(li, 0)){
                            //log('savedCarsArray includes');
                            continue;
                        }
                        //if (doesLiExistInArray(li)) {
                        //    log('doesLiExistInArray');
                        //    continue;
                        //}
                        savedCarsArray.push(li);
                    }
                    debug('[tornRacingCarOrder] savedCarsArray: ', savedCarsArray);
                } else { // !arrayFilled
                    debug('[tornRacingCarOrder] Array already filled. Length: ', savedCarsArray.length);
                }

                $(ul).empty();
                carList.forEach(function(car){
                    var li = findSavedCar(car, savedCarsArray);
                    if ($(li).length > 0) {
                        ul.appendChild(li);
                    } else {
                        debug('[tornRacingCarOrder] Car not found in array!');
                    }
                })
            }
            log('<== [tornRacingCarOrder] [putCarsInOrder]');
        }

        function findSavedCar(name, liArray) {
            for (let i = 0; i < liArray.length; i++) {
                let li = liArray[i];
                let elemList = myGetElementsByClassName(li, name);
                if (elemList && elemList.length > 0) {
                    return li;
                }
            }
            return null;
        }

        function getCurrentCarOrder(parentNode) {
            let elemList = myGetElementsByClassName(parentNode, 'model-car-name');
            let nameArray = [];
            elemList.forEach(element => nameArray.push(element.className));
            return nameArray;
        }

        function myGetElementsByClassName(anode, className) {
            var elems = anode.getElementsByTagName("*");
            var matches = [];
            for (var i=0, m=elems.length; i<m; i++) {
                if (elems[i].className && elems[i].className.indexOf(className) != -1) {
                    matches.push(elems[i]);
                }
            }
            return matches;
        }

        //////////////////////////////////////////////////////////////////////
        // DnD handlers
        //////////////////////////////////////////////////////////////////////

        // If these work, put in common code?

        function makePageDraggable() {
            debug('[tornRacingCarOrder] [makePageDraggable] ==>');
            // let ul = refDiv.getElementsByClassName('enlist-list')[0];
            let ul = document.querySelector("#racingAdditionalContainer > div.enlist-wrap.enlisted-wrap > div.cont-black.bottom-round.enlist > ul");
            if (!ul) return setTimeout(makePageDraggable, 250);

            debug('[tornRacingCarOrder] [setDraggable] (only once!)');
            for (let i = 0, len = ul.children.length; i < len; i++ ) {
                let li = ul.children[i];
                makeNodeDraggable(li);
            }
            draggableSet = true;
            debug('<== [tornRacingCarOrder] [makePageDraggable]');
        }

        function makeNodeDraggable(node) {
            node.setAttribute("draggable", "true");
            node.addEventListener('dragstart', handleDragStart, false);
            node.addEventListener('dragenter', handleDragEnter, false);
            node.addEventListener('dragover', handleDragOver, false);
            node.addEventListener('dragleave', handleDragLeave, false);
            node.addEventListener('drop', handleDrop, false);
            node.addEventListener('dragend', handleDragEnd, false);

            //node.appendChild(createDraggableDiv()); // Adds the little cross shaped icon
        }

        var dragSrcEl = null;
        var orgBgColor;
        function handleDragStart(e) {
            debug('[handleDragStart] type: ', e.type);
            debug('[handleDragStart] e: ', e);
            // this.style.opacity = '0.4';  // Done automatically in Chrome...
            dragSrcEl = this;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.innerHTML);
        }

        function handleDragOver(e) {
            if (e.preventDefault) e.preventDefault(); // Necessary. Allows us to drop.
            e.dataTransfer.dropEffect = 'move'; // See the section on the DataTransfer object.
            return false;
        }

        function handleDragEnter(e) {this.classList.add('over');}
        function handleDragLeave(e) {this.classList.remove('over');}

        var stopBlinkBtnId = null;
        function handleDrop(e) {
            observerOff();
            if (e.stopPropagation) {
                e.stopPropagation(); // stops the browser from redirecting.
            }

            // Don't do anything if dropping the same column we're dragging.
            if (dragSrcEl != this) {
                dragSrcEl.innerHTML = this.innerHTML;
                this.innerHTML = e.dataTransfer.getData('text/html');

                stopBlinkBtnId = blinkBtn(saveBtnId);
            }

            // Get rid of the added <meta http-equiv="content-type" content="text/html;charset=UTF-8">
            // I think this was added by the setData call in the start drag handler.
            let elements = e.currentTarget.getElementsByTagName('meta');
            if (elements[0]) elements[0].parentNode.removeChild(elements[0]);

            observerOn();
            return false;
        }

        function handleDragEnd(e) {
            // Remove the 'over' class,that was added to prevent dragOver
            // from firing too many times, in the drag enter handler.
            for (let i = 0, len = this.children.length; i < len; i++ ) {
                let li = this.children[i];
                li.classList.remove('over');
            }
        }

        //////////////////////////////////////////////////////////////////////
        // Button handlers
        //////////////////////////////////////////////////////////////////////

        // Set up a handler for the page 2 button - what about the rest???
        // No, no, no - 'page' is start car index, 1 based. So a 'page-value' of '0' means cars 0-9, '10' means 9-19, etc.
        function clickHandler() {
            observerOff();
            let page = currentPage();

            debug('[tornRacingCarOrder] curr page: ', page, ' Saved page: ', savedCurrPage);

            // NEW
            draggableSet = false;
            //carsSorted = false;
            // end new

            let pageNum = Number(page);
            if (pageNum == Number(savedCurrPage)) {
                observerOn();
                log('<== [clickHandler]');
                return setTimeout(clickHandler, 250);
            }

            sortSavedCars(true);
            savedCurrPage = pageNum;

            observerOn();
        }

        // Why do this instead of the sort function???
        function populatePage(index) {
            let enlistList = refDiv.getElementsByClassName('enlist-list')[0];
            $(enlistList).empty();

            for (let i=index; i < savedCarsArray.length; i++) { // page 1 index is 0, page 2, 10, etc. Convert to 0-indexed.
                 let li = savedCarsArray[i];
                 if ($(li).length > 0) {
                     let element = li.getElementsByClassName('enlist-bars')[0];
                     if (element) {
                         element.parentNode.removeChild(element);
                     }
                     enlistList.appendChild(li);
                 }

            }
        }

        // Return page number, which is really an index into the paginator.
        // Appears as 0, 10, 20 ...
        function currentPage() {
            let element = document.querySelector("#racingAdditionalContainer > div.gallery-wrapper.pagination > a.page-number.active");
            let page = element.getAttribute('page-value');
            let active = element.hasAttribute('active');
            return page;
        }

        // Add the handler for when the paginator is clicked.
        function addPaginationHandler() {
            let root = document.querySelector("#racingAdditionalContainer > div.gallery-wrapper.pagination.m-top10.left");
            let aList = root.querySelectorAll('a'); // Paginator buttons: '<', 1, 2, ..., '>'
            for (let i=0; i<aList.length; i++) {
                aList[i].addEventListener('click', clickHandler); // associate the function above with the click event
            }
        }

        function stopBlinkBtn(id) {clearInterval(id);}

        function blinkBtn(id) {
            let selector = document.getElementById(id);
            let Id = setInterval(() => {
                $(selector).fadeOut(500);
                $(selector).fadeIn(500);},
                1000);

            return id;
        }

        // Wrapper for the actual sorter, 'putCarsInOrder'
        function sortSavedCars(silent=false) {
            let carList = null;
            let key = 'carsPage' + currentPage();
            var data = GM_getValue(key, null);
            if (data) {
                carList = JSON.parse(data);
                if (carList && carList.length > 0) {
                    putCarsInOrder(carList);
                } else if (!silent) {
                    alert('Torn Racing Car Order - No car list has been saved! Please see the "Help".');
                } else {
                    debug('[sortSavedCars] No car list has been saved! Please see the "Help".');
                }
            }
        }

        // Handle the 'Save' button, save the current car order to local storage
        function handleSaveBtn() {
            let checkDiv = refDiv.getElementsByClassName('enlist-wrap enlisted-wrap')[0];
            let carList = getCurrentCarOrder(checkDiv);
            let key = 'carsPage' + currentPage();
            GM_setValue(key, JSON.stringify(carList));

            if (stopBlinkBtnId) {
                stopBlinkBtn(stopBlinkBtnId);
            }
            alert('Torn Racing Car Order - Car order has been saved! (key=' + key + ')');
        }

        // Handle the 'Restore' button, restore the custom ordering, if you've moved stuff and changed your mind
        function handleRestoreBtn(silent=false) {
            observerOff();
            sortSavedCars(false);
            observerOn();
        }

        // Handle the 'Defaults' button, Restore the default ordering, currently not really supported.
        function handleDefBtn() {
            debug('[tornRacingCarOrder] [handleDefBtn]');
            debug('[tornRacingCarOrder] Not yet implemented!');
            return;

            // Call 'putCarsInOrder', using def list.
            observerOff();
            let carList = JSON.parse(GM_getValue('default_car_order'));
            if (carList && carList.length > 0) {
                putCarsInOrder(carList);
            } else {
                alert('Default car list has not been saved! This is an error, please contact the developer' +
                     ' (xedx [2100735]) for assistance!');
            }
            observerOn();
        }

        // Handle the 'Help' button, display help.
        function handleHelpBtn() {
            let helpText = "To create a saved car order, simply drag and drop the cars into any " +
                "order you want. When finished, press the 'Save' button to save in local storage. " +
                "\n\nSelecting the 'Load Saved on Startup' will cause that order to be restored whenever " +
                "this script runs." +
                "\n\nThe 'Restore' button will force any saved car order to be loaded." +
                "\n\nSlecting the 'Defaults' button will restore the Default order, as selected by Torn. You'd " +
                "need to select Save again, to keep that as the saved default, or de-select the 'Load Saved on Startup'" +
                " checkbox.";
            alert(helpText);
        }

        function loadStyles() { // TBD: finish 'styling' the dialog
            GM_addStyle(`.xedx-label {color: #06699B; margin-left: 10px;}
                         .xedx-chkbox {margin-right: 10px;}
                         .xedx-btn {border: 1px black solid; border-radius: 5px; background-color: #888888;}
                         .xedx-body {border: 2px black solid;}
            `);
        }

        //////////////////////////////////////////////////////////////////////
        // Build the Car Order div, append underneath the Personal Perks div
        //////////////////////////////////////////////////////////////////////

        function buildRaceCarOrderDiv() {
            debug('[tornRacingCarOrder] [buildRaceCarOrderDiv] ==>');
            refDiv = document.querySelector("#racingAdditionalContainer");
            let checkDiv = refDiv.getElementsByClassName('enlist-wrap enlisted-wrap')[0];
            let mainWrapDiv = document.querySelector("#racingMainContainer > div");
            if (!refDiv || !checkDiv || !mainWrapDiv) return;

            if (!document.querySelector("#xedx-carorder")) { // Build the 'Select Car Order' <DIV>, only do once.
                debug('[tornRacingCarOrder] [buildRaceCarOrderDiv] Building UI');
                $(xedxMainDiv).insertBefore(refDiv);

                // Handler for the arrow button
                $("#xedx-arrow").on("click", function() {
                    if ($('#xedx-body-div').css('display') == 'block') {
                        $('#xedx-body-div').css('display', 'none');
                        $('#xedx-hdr-div').className = 'title main-title title-black border-round';
                    } else {
                        $('#xedx-body-div').css('display', 'block');
                        $('#xedx-hdr-div').className = 'title main-title title-black top-round active';
                    }
                });

                // Handlers for remaining buttons
                $("#xedx-save-btn").on('click', handleSaveBtn);
                $("#xedx-restore-btn").on('click', handleRestoreBtn);
                $("#xedx-default-btn").on('click', handleDefBtn);
                $("#xedx-help-btn").on('click', handleHelpBtn);

                // Handler for checkbox, and set default state
                opt_sortCars = GM_getValue('load_saved', opt_sortCars);
                $("#xedx-chkbox1").prop('checked', opt_sortCars);
                $("#xedx-chkbox1").on('click',  function() {
                    opt_sortCars = $("#xedx-chkbox1").is(':checked');
                    GM_setValue('load_saved', opt_sortCars);
                });

                savedCurrPage = currentPage();
            } // End build main div

            addPaginationHandler();

            debug('[tornRacingCarOrder] currPage: ', currentPage(), ' saved: ', savedCurrPage);
            debug('[tornRacingCarOrder] carsSorted: ', carsSorted, ' savedCarsArray: ', savedCarsArray);

            // First save the current (default) car order
            // For now, ignore the default ...
            /*
            if (!defOrderSaved) {
                log('[defOrderSaved] (only once!)');
                let currOrder = getCurrentCarOrder(checkDiv);
                let saved = GM_getValue('default_car_order');

                // Save if it does not match current default, or does not exist.
                if (!saved || JSON.stringify(currOrder) != saved) {
                    GM_setValue('default_car_order', JSON.stringify(currOrder));
                }
                defOrderSaved = true;
            }
            */

            //if (!carsSorted) {
                if (opt_sortCars) {
                    //log('[sortSavedCars] (only once!)');
                    sortSavedCars(true);
                    carsSorted = true; // Don't need anymore?
                }
            //}

            // Make cars draggable. Also only do once.
            if (!draggableSet) makePageDraggable();

            //savedCurrPage = currentPage();
            debug('<== [tornRacingCarOrder] [buildRaceCarOrderDiv]');
        }

        function getMainDiv() {
            let result =
                `<div class="sortable-box t-blue-cont h" id="xedx-carorder">
                <div class="title main-title title-black border-round" role="table" aria-level="5" id="xedx-hdr-div">
                    <div class="arrow-wrap sortable-list" id="xedx-arrow">
                        <a role="button" href="#/" class="accordion-header-arrow right" i-data="i_946_369_9_14"></a>
                    </div>Car Order
                </div>
                <div class="bottom-round xedx-body" id="xedx-body-div" style="display: none;">
                    <div id="xedx-content-div" class="cont-gray bottom-round" style="background-color: #ddd;">
                        <span style="display: block; overflow: hidden; padding: 5px 10px;">
                            <span class="btn-wrap silver">
                                <span class="xedx-btn" style="padding: 5px 10px;">
                                    <button style="width: 108px;" id="xedx-save-btn">Save</button>
                                </span>
                            </span>
                            <span class="btn-wrap silver">
                                <span class="xedx-btn" style="padding: 5px 10px;">
                                    <button style="width: 108px;" id="xedx-restore-btn">Restore</button>
                                </span>
                            </span>
                            <span>
                                <label class="xedx-label">
                                <input type="checkbox" class="xedx-chkbox" id="xedx-chkbox1">Load Saved Order at Startup
                                </label>
                            </span>
                        </span>
                        <span style="display: block; overflow: hidden; padding: 5px 10px;">
                            <span class="btn-wrap silver">
                                <span class="xedx-btn" style="padding: 5px 10px;">
                                    <button style="width: 108px;" id="xedx-default-btn">Defaults</button>
                                </span>
                            </span>
                            <span class="btn-wrap silver">
                                <span class="xedx-btn" style="padding: 5px 10px;">
                                    <button style="width: 108px;" id="xedx-help-btn">Help</button>
                                </span>
                            </span>
                        </span>
                    </div>
                </div>
                <hr class="delimiter-999 m-top10 m-bottom10">
            </div>`;

            return result;
        }

        function observerOff() {
            debug('[tornRacingCarOrder] [observerOff]');
            if (observer) {
                observer.disconnect();
            } else {
                debug('[tornRacingCarOrder] observer not initialized!');
            }
        }

        function observerOn() {
            debug('[tornRacingCarOrder] [observerOn]');
            if (observer) {
                observer.observe(targetNode, config);
            } else {
                debug('[tornRacingCarOrder] observer not initialized!');
            }
        }

    } // End function tornRacingCarOrder() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Racing Styles" (called immediately)
    //////////////////////////////////////////////////////////////////////////////////

    function tornRacingStyles() {
        return new Promise((resolve, reject) => {
            if (abroad()) return rejectDebug('[tornRacingStyles] not at home!');
            if (location.href.indexOf("loader.php?sid=racing") < 0) return rejectDebug('tornRacingStyles wrong page!');

            const user_id = document.cookie.match('(^|;)\\s*uid\\s*=\\s*([^;]+)')?.pop() || '';
            GM_addStyle(`
                .d .racing-main-wrap .car-selected-wrap #drivers-scrollbar#drivers-scrollbar {
                    max-height: 328px!important;
                }
            `);

            GM_addStyle(`
                #leaderBoard {
                  padding-top: 32px;
                  position: relative;
                }
                #lbr-${user_id} {
                  position: absolute;
                  width: 100%;
                  top: 0;
            }`);

            resolve("[tornRacingStyles] complete!");
        }).catch((error) => {
            log("[tornRacingStyles] ERROR: ", error);
            rejectDebug(error);
        });
    } // End function tornRacingStyles() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Bazaar Plus" (called at API complete)
    //////////////////////////////////////////////////////////////////////////////////

    async function tornBazaarPlus() {
        // @name         TC Bazaar+ v2
        // @version      0.5
        // @description  description
        // @author       tos
        const event = new Event('input', {bubbles: true, simulated: true});
        const undercut = 1; // Amount to under-cut current lowest bazaar price
        let torn_items = null;

        async function torn_api(args) {
                const a = args.split('.');
                if (a.length!==3) throw(`Bad argument in torn_api(args, key): ${args}`);
                    return new Promise((resolve, reject) => {
                        GM_xmlhttpRequest ({
                            method: "POST",
                            url: `https://api.torn.com/${a[0]}/${a[1]}?comment=Bazaarv2&selections=${a[2]}&key=${api_key}`,
                            headers: {
                                "Content-Type": "application/json"
                        },
                        onload: (response) => {
                            try {
                                const resjson = JSON.parse(response.responseText);
                                log("tornBazaarPlus, resjoson: ", resjson);
                                resolve(resjson);
                            } catch(err) {
                                reject(err);
                            }
                        },
                        onerror: (err) => {
                            reject(err);
                        }
                    })
                })
            }

        const get_torn_items = () => torn_api('torn..items')
            .then(
                (r) => Object.fromEntries( Object.entries(r.items).map( ([itemID, properties]) => [properties.name, itemID] )))
            .catch(err => console.log(err));

        return _tornBazaarPlus();

        // Need error handling!
        function _tornBazaarPlus() {
             log('[tornBazaarPlus]');

            return new Promise((resolve, reject) => {
                if (abroad()) return rejectDebug('[tornBazaarPlus] not at home!');
                if (!checkLocation()) return rejectDebug('tornBazaarPlus wrong page!');

                document.addEventListener('dblclick', bazaarEventListener);

                resolve("[tornBazaarPlus] complete!");
            });

            function bazaarEventListener(e) {
                const location = window.location.pathname + window.location.hash;
                debug('[bazaar event listener]', location, e);
                if (e.target && e.target.tagName && e.target.tagName === 'INPUT') {
                        const input = e.target;
                        switch (location) {
                            case '/bazaar.php#/':
                                if (input.className.includes('buyAmountInput')) max_buy(input); //other bazaar buy
                                break;
                            case '/bazaar.php#/add':
                                if (input.className.includes('input-money')) auto_price_add(input); //my bazaar add
                                else if (input.className === 'clear-all') max_qty(input); //my bazaar qty add
                                break;
                            case '/bazaar.php#/manage':
                                if (input.className.includes('priceInput')) auto_price_manage(input); //my bazaar manage
                                else if (input.className.includes('numberInput')) max_qty_rem(input); //my bazaar qty remove
                                break;
                            case '/bigalgunshop.php':
                            case '/shops.php':
                                if (input.name ==='buyAmount[]') buy_hundred(input); //city shop buy 100
                                else if (input.id.includes('sell')) city_sell_all(input); //city shop sell all
                                else if (input.id.includes('item')) city_sell_all(input); //bigal sell all
                                break;
                            default:
                                if (input.id.includes('item')) foriegn_max(input); //foreign buy
                                else if (location.includes('trade.php') && input.name && input.name === 'amount') max_qty_trade(input);//trade qty input
                                break;
                        }
                } else if (e.target && e.target.tagName && e.target.tagName === 'LABEL') {
                      if (e.target.className === 'marker-css') {
                          const itemID = e.target.closest('LI[data-item]').getAttribute('data-item');
                          big_al_check_all(itemID); //big al check/uncheck all
                      }
                }
            }

            function checkLocation() {
                let at = location.href;
                let locationOK = ((at.indexOf('bazaar.php') > -1 ||
                      at.indexOf('bigalgunshop.php') > -1 ||
                      /* at.indexOf('index.php') > -1 || */
                      at.indexOf('shops.php') > -1 ||
                      at.indexOf('trade.php') > -1));
                debug('[tornBazaarPlus] checkLocation', locationOK);
                return locationOK;
            }

            function auto_price (lowest_price) {
                let value = lowest_price - undercut;
                let result = Math.floor(value/10) * 10; // Round down to closet $10
                log('[tornBazaarPlus] lowest price: ', lowest_price, ' value: ', value, ' result: ', result);
                return result;
                //return (lowest_price - undercut);
            }

            function lowest_market_price(itemID) {
                return torn_api(`market.${itemID}.bazaar,itemmarket`).then((r) => {
                    //const market_prices = Object.values(r).flat().filter(function (l) {return l != null} )
                    const market_prices = Object.values(r).reduce((acc, cur) => acc.concat(cur), []);
                    return market_prices.reduce((a, c) => a < c.cost ? a : c.cost, market_prices[0].cost);
                }).catch(err => log(err));
            }

            //other bazaar buy
            function max_buy(input) {
              const max = input.closest('DIV[class^=buyMenu]').querySelector('SPAN[class^=amount]').innerText.match(/[0-9]/g).join('');
              let old_value = input.value;
              set_react_input(input, max);
            }

            //foreign buy
            function foriegn_max (input) {
              const i = document.querySelector('div.user-info div.msg').innerText.match(/(\d+).\/.(\d+)/);
              set_regular_input(input, parseInt(i[2]) - parseInt(i[1]));
            }

            //my bazaar add
            async function auto_price_add(input) {
              if (!torn_items) torn_items = await get_torn_items();
              let item_name = input.closest('LI').querySelector('.t-overflow').textContent;
              log('[tornBazaarPlus] itemName: ', item_name);

              const lowest_price = await lowest_market_price(parseInt(torn_items[item_name]));
              set_regular_input(input, auto_price(lowest_price));
            }

            //my bazaar manage
            async function auto_price_manage (input) {
              if (!torn_items) torn_items = await get_torn_items();
              const itemID = input.closest('div[class^=row]').querySelector('img').src.split('items/')[1].split('/')[0];
              const lowest_price = await lowest_market_price(itemID);
              set_react_input(input, auto_price(lowest_price));
            }

            //my bazaar qty add
            function max_qty (input) {
              const qty = input.closest('LI').querySelector('div.name-wrap').innerText.match(/x(\d+)/);
              set_regular_input(input, qty ? qty[1] : 1);
            }

            //my bazaar qty remove
            function max_qty_rem (input) {
              const qty = input.closest('div[class^=row]').querySelector('div[class^=desc]').innerText.match(/x(\d+)/);
              set_react_input(input, qty ? qty[1] : 1);
            }

            //city shop buy 100
            function buy_hundred(input) {
              set_regular_input(input, 100);
            }

            //city shop sell all
            function city_sell_all(input) {
              const qty = input.closest('UL').querySelector('LI.desc').innerText.match(/x(\d+)/);
              set_regular_input(input, qty ? qty[1] : 1);
            }

            //big al check all
            function big_al_check_all(item_id) {
              document.querySelectorAll(`LI[data-item="${item_id}"] INPUT[type=checkbox]`).forEach(checkbox => {checkbox.checked = !checkbox.checked});
            }

            //trade max qty
            function max_qty_trade(input) {
              console.log(input.closest('div.title-wrap'));//.querySelector('div.name-wrap'))
            }

            function set_regular_input(input, newval) {
              input.value = newval;
              input.dispatchEvent(event);
              input.select();
            }

            function set_react_input(input, newval) {
              let old_value = input.value;
              input.value = newval;
              input._valueTracker.setValue(old_value);
              input.dispatchEvent(event);
              input.select();
            }

        }

    } // End function tornBazaarPlus() {

    function removeBazaarPlus() {document.removeEventListener('dblclick', bazaarEventListener);}

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Bazaar Plus" (called at API complete)
    //////////////////////////////////////////////////////////////////////////////////

    function tornBazaarAddButton() {
         log('[tornBazaarAddButton]');

        return new Promise((resolve, reject) => {
            if (abroad()) return rejectDebug('[tornBazaarAddButton] not at home!');
            if (!isBazaarPage()) return rejectDebug('tornBazaarAddButton wrong page!');

            $(window).on('hashchange', function() {
                debug('[tornBazaarAddButton] handle hash change.');
                installTheButton();
            });

            installTheButton(0);

            resolve("[tornBazaarAddButton] complete!");
        }).catch((error) => {
            log("[tornBazaarAddButton] ERROR: ", error);
            rejectDebug(error);
        });

        function isHidden(el) {return (el.offsetParent === null)}

        function installTheButton(retries=0) {
            const addBtnDiv = getAddBtnDiv();
            //if (document.getElementById('xedx-add-btn')) document.getElementById('xedx-add-btn').remove();
            let hash = window.location.hash;
            let substrings = ['manage', 'personalize', 'add', 'userid'];
            if (substrings.some(v => hash.includes(v))) return;
            let targetNode = document.querySelectorAll('[class^="titleContainer"]')[0];
            if (!targetNode && retries++ < 10) {
                return setTimeout(function() {installTheButton(retries)}, 50);
            }
            addIcon(targetNode, addBtnDiv);
            setInterval(function (){addIcon(targetNode, addBtnDiv);}, 1000);
        }

        function addIcon(targetNode, addBtnDiv) {
            if (!location.href.includes('userid=')) {
                if (!document.getElementById('xedx-add-btn')) //document.getElementById('xedx-add-btn').remove();
                    $(targetNode).append(addBtnDiv);
            }
        }

        function getAddBtnDiv() {
            return '<a id="xedx-add-btn" to="#/add" role="button" aria-labelledby="add-items" href="#/add" ' +
                "style='float: right;' " +
                'i-data="i_687_11_101_33"><span class="">' +
                '<svg xmlns="http://www.w3.org/2000/svg" ' +
                'filter="url(#top_svg_icon)" fill="#777" stroke="transparent" stroke-width="1" ' +
                'width="17" height="16" viewBox="0 0 16.67 17">' +
                '<path d="M2,8.14A4.09,4.09,0,0,1,3,8a4,4,0,0,1,3.38,6.13l3,1.68V8.59L2,4.31ZM16,' +
                '4.23,8.51,0,6.45,1.16,13.7,5.43ZM5.11,1.92,2.79,3.23,10,7.43l2.33-1.27Zm5.56,6.66V16l6-3.42V5.36ZM3,' +
                '9a3,3,0,1,0,3,3A3,3,0,0,0,3,9Zm1.67,3.33H3.33v1.34H2.67V12.33H1.33v-.66H2.67V10.33h.66v1.34H4.67Z">' +
                '</path></svg></span><span class="xedx-red">Add items</span></a>';
        }

    } // End function tornBazaarAddButton() {

    function removeBazaarAddButton() {} // Dummy, just don't reload.

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Fac Page Search" (called at page complete)
    // Doesn't work if Honor Bars are disabled!
    //////////////////////////////////////////////////////////////////////////////////

    function tornFacPageSearch() {
        log('[tornFacPageSearch]');

        return new Promise((resolve, reject) => {
            if (abroad()) return rejectDebug('[tornFacPageSearch] not at home!');
            if (!isFactionPage()) return rejectDebug('tornFacPageSearch wrong page!');

             GM_addStyle(`
                .xedx-green {background: lime;
                             -webkit-animation: highlight-active 1s linear 0s infinite normal;
                             animation: highlight-active 1s linear 0s infinite normal;}
                `);

            installHashChangeHandler(facSearchHashHandler);

            installUI(0);

            resolve("[tornFacPageSearch] started!");
        }).catch((error) => {
                    log("[tornFacPageSearch] ERROR: ", error);
                    rejectDebug(error);
                });

        function installUI(retries=0) {
            if (!retries)
                debug('[installUI] tornFacPageSearch ');
            else
                debug('[installUI] tornFacPageSearch (retry # ' + retries + ")");
            const searchDiv = getFacSearchDiv();

            if (retries > 5) {
                debug('[installUI] too many retries: aborting');
                return;
            }

            $("#xedx-search").remove();
            let targetNode = document.querySelector("#factions > ul");
            if (!targetNode) {
                debug('[installUI] targetNode not found retrying...');
                return setTimeout(function() {installUI(++retries)}, 500);
            }
            debug('[installUI] primary target found:', targetNode);

            if (location.href.indexOf('/tab=info') > -1) {
                targetNode = document.querySelector("#react-root-faction-info > div > div > div.faction-info-wrap > div.f-war-list.members-list");
                if (!targetNode) {
                    debug('[installUI] targetNode not found, retrying...');
                    return setTimeout(function() {installUI(++retries)}, 500);
                }

                debug('[installUI] inserting search div before: ', targetNode);
                $(targetNode).before(searchDiv);

                debug('[installUI] new div: ', document.querySelector("#xedx-search"));

                $("#search").on("keypress", handleSearchKeypress);
                $("#search").on("keydown", handleSearchKeypress); // For backspace only
            } else if (document.querySelector('#option-give-to-user') || document.querySelector('#option-pay-day')) {
                //targetNode = document.querySelector("#faction-controls");
                if (!targetNode) {
                    debug('[installUI] targetNode not found, retrying...');
                    return setTimeout(function() {installUI(++retries)}, 500);
                }

                debug('[installUI] inserting search div after: ', targetNode);
                $(targetNode).append(searchDiv);

                debug('[installUI] new div: ', document.querySelector("#xedx-search"));

                $("#search").on("keypress", handleSearchKeypress);
                $("#search").on("keydown", handleSearchKeypress); // For backspace only
            } else {
                debug('[installUI] [tornFacPageSearch] missing selectors or hash, retrying (attempt #' + (retries+1));
                return setTimeout(function() {installUI(++retries)}, 500);
            }
        }

        function facSearchHashHandler() {
            $("#xedx-search").remove();
            if (location.hash.indexOf('give-to-user') > -1 ||
                location.hash.indexOf('pay-day') > -1 ||
                location.href.indexOf('tab=info') > -1 ||
                location.href.indexOf('tab=controls') > -1) {
                installUI(0)
            }
        }

        // Handle key presses in the search area -
        function handleSearchKeypress(e) {
            // Sneaky way to make static 'class' vars, use the fn as a class.
            if ( typeof handleSearchKeypress.lastElems == 'undefined' ) {
                debug('[handleSearchKeypress] intializing lastElems!');
                handleSearchKeypress.lastElems = [];
                handleSearchKeypress.currSearch = '';
                handleSearchKeypress.lastSearch = '';
            }

            let memberList = location.href.indexOf('/tab=info') > -1;

            debug('[handleSearchKeypress] [lastElems]: ', handleSearchKeypress.lastElems);
            debug('[handleSearchKeypress] ==> ', e.key);
            let target = e.target;

            let searchNode = '';
            if (memberList) {
                searchNode = $(`[class^="searchWrap_"]`);
            } else {
                searchNode = document.querySelector("#faction-controls");
            }

            // Special case, handled on keydown and backspace.
            if (e.type == 'keydown') {
                if (e.key == 'Backspace') {
                    log('[handleSearchKeypress] Backspace: last: ', handleSearchKeypress.lastSearch, ' curr: ', handleSearchKeypress.currSearch);
                    log('[handleSearchKeypress] [lastElems]: ', handleSearchKeypress.lastElems);
                    handleSearchKeypress.lastElems.forEach(el => {
                        log('[handleSearchKeypress] removing green');
                        $(el).removeClass('xedx-green');
                    });

                    // Need diff query for some pages. Text content of class [searchText^
                    // Under class searchWrap^, and case sensitive.
                    searchNode.querySelectorAll('[title^="' + handleSearchKeypress.currSearch + '"]').forEach((el) => {
                        $(el).removeClass('xedx-green');
                        log('[handleSearchKeypress] removing green');
                    });
                    searchNode.querySelectorAll('[title^="' + handleSearchKeypress.lastSearch + '"]').forEach((el) => {
                        if (!$(el).hasClass('xedx-green')) {
                            $(el).addClass('xedx-green');
                            log('[handleSearchKeypress] adding green');
                        }
                        handleSearchKeypress.lastElems.push(el);
                    });
                    let temp = handleSearchKeypress.lastSearch.slice(0, -1);
                    handleSearchKeypress.currSearch = handleSearchKeypress.lastSearch;
                    handleSearchKeypress.lastSearch = temp;
                }

                let count = $(".xedx-green").length;
                debug ('[handleSearchKeypress] found ' + count + ' matches (setting innerHTML)');
                $("#xmatches").html(count ? "  (" + count + " matches)" : "");

                return;
            }

            handleSearchKeypress.lastSearch = $(target)[0].value;
            handleSearchKeypress.currSearch = $(target)[0].value + e.key;

            // Remove previous highlights
            handleSearchKeypress.lastElems.forEach(el => {
                debug('[handleSearchKeypress] removing green');
                $(el).removeClass('xedx-green');
            });
            handleSearchKeypress.lastElems.length = 0;

            // Add new ones (this is the search!)
            debug('[handleSearchKeypress] matching: ', handleSearchKeypress.currSearch);
            let list = memberList ?
                searchNode.filter(":contains(" + handleSearchKeypress.currSearch + ")") :
                searchNode.querySelectorAll('[title^="' + handleSearchKeypress.currSearch + '"]');

            // TBD: Scroll to first match! This does not seem to work at all,
            // or in some cases removes what scrolls out...
            if (false && list[0]) {
                debug('[handleSearchKeypress] scroll to: ', list[0]);
                list[0].scrollIntoView();
            }

            Array.from(list).forEach((el) => {
                if (!$(el).hasClass('xedx-green')) {
                        /*if ($(el).is("span"))*/ $(el).addClass('xedx-green');
                        log(el);
                        log('[handleSearchKeypress] adding green');
                    }
                handleSearchKeypress.lastElems.push(el);
            });

            let count = $(".xedx-green").length;
            log('All green: ', $(".xedx-green"));
            debug ('[handleSearchKeypress] found ' + count + ' matches (setting innerHTML)');
            $("#xmatches").html(count ? "  (" + count + " matches)" : "");
        }

        function getFacSearchDiv() {
            return `<div id="xedx-search">
                <hr class="delimiter-999 m-top10">
                <div>
                    <label for="search">Search:</label>
                    <input type="text" id="search" name="search" class="ac-search m-top10 ui-autocomplete-input ac-focus">
                    <span class="powered-by">Powered by XedX</span>
                    <span id="xmatches"></span>
                </div>
            </div>`;
        }

    } // End function tornFacPageSearch() {

    function removeFacPageSearch() {
        $("#xedx-search").remove();
        window.removeEventListener('hashchange', facSearchHashHandler);
    }

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Jail Scores" (called at document loaded)
    //////////////////////////////////////////////////////////////////////////////////

    // TBD !!!
    function tornJailScores() {
         log('[tornJailScores]');

        return new Promise((resolve, reject) => {
            if (abroad()) return rejectDebug('[tornJailScores] not at home!');
            if (!isJailPage()) return rejectDebug('tornJailScores wrong page!');

            rejectDebug('[tornJailScores] not yet implemented!');

            //resolve("[tornJailScores] complete!");
        }).catch((error) => {
            log("[tornJailScores] ERROR: ", error);
            rejectDebug(error);
        });
    } // End function tornJailScores() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Disable Refills" (called on API complete)
    //////////////////////////////////////////////////////////////////////////////////

    function tornDisableRefills() {
        log('[tornDisableRefills]');

        const safetyNet = '<input class="xedx-ctrls" type="checkbox" id="refill_confirm" name="refill_confirm" value="refill_confirm" checked>' +
                        '<label for="refill_confirm" id="confirm_label">  Safety Net! Note that clicking the title bar will bypass the safety net.</label>';

        return new Promise((resolve, reject) => {
            if (abroad()) return rejectDebug('[tornDisableRefills] not at home!');
            if (!isPointsPage()) return rejectDebug('tornDisableRefills wrong page!');

            logApiCall('user: bars');
            xedx_TornUserQuery(null, 'bars', refillsUserQueryCB);

            resolve("[tornDisableRefills] startup complete!");
        }).catch((error) => {
            log("[tornDisableRefills] ERROR: ", error);
            rejectDebug(error);
            //reject("[tornDisableRefills] failed with an error! See log");
        });

        function onCheckboxClicked() {
            let ckBox = document.querySelector("#refill_confirm");
            tornDisableRefills.safetyOn = ckBox.checked;
            GM_setValue('refills_checkbox', ckBox.checked);
        }

        function onRefillClick(e) {
            if (!tornDisableRefills.safetyOn) return;

            let targetText = null;
            let target = e.target;
            if (target) {
                targetText = $(target).text();
            }

            let li = $(target).closest("li");
            let classList = $(li).attr("class");

            // Check target text() for "Refill Energy" or "Refill Nerve"
            // Over-rides the safety net
            if (targetText) {
            if (targetText.indexOf('Refill Energy') > -1 ||
               targetText.indexOf('Refill Nerve') > -1) {
                return;
                }
            }

            if (classList)
            {
                if (classList.indexOf('Energy') > -1) {
                    debug("[tornDisableRefills] ENERGY node");
                    if (tornDisableRefills.jsonResp.energy.current > 0) {
                        debug("[tornDisableRefills] caught by safety net!");
                        return e.stopPropagation();
                    }
                }
                if (classList.indexOf('Nerve') > -1) {
                    debug("[tornDisableRefills] NERVE node");
                    if (tornDisableRefills.jsonResp.nerve.current > 0) {
                        debug("[tornDisableRefills] caught by safety net!");
                        return e.stopPropagation();
                    }
                }
            }
        }

        function refillsUserQueryCB(responseText, id, param) {
            if (typeof tornDisableRefills.jsonResp == 'undefined' ) {
                tornDisableRefills.jsonResp = null;
                tornDisableRefills.safetyOn = false;
                // Note: after too many retries, warn that this is disabled?
            }
            tornDisableRefills.jsonResp = JSON.parse(responseText);
            if (tornDisableRefills.jsonResp.error) {
                if (tornDisableRefills.error.code == 17) {
                    if (queryRetries++ < 5) {
                        if (alertOnRetry) alert("Retrying error 17!");
                        return xedx_TornUserQuery(null, 'bars', refillsUserQueryCB);
                    } else {
                        queryRetries = 0;
                    }
                }
                // Note: after too many retries, warn that this is disabled.
                return handleError(responseText);
            }

            debug("[tornDisableRefills] energy", tornDisableRefills.jsonResp.energy.current);
            debug("[tornDisableRefills] nerve", tornDisableRefills.jsonResp.nerve.current);

            // Changed 04/02/2024
            // Note: after too many retries, warn that this is disabled.
            let titleBar = document.querySelector("#points-building-root > div > div");
            //let titleBar = $("[class*='appHeaderWrapper_']")[0];

            if (!titleBar) {
                log("[tornDisableRefills] Title bar not found!");
                return setTimeout(function (){userQueryCB(responseText, id, param)}, 100);
            }
            $(titleBar).append(safetyNet);

            let ckBox = document.querySelector("#refill_confirm");
            ckBox.addEventListener("click", onCheckboxClicked);
            ckBox.checked = tornDisableRefills.safetyOn = GM_getValue('refills_checkbox', true);

            // Check this also...
            //let chkNode = document.querySelector("#mainContainer > div.content-wrapper > ul");
            let chkNodeRoot = document.querySelector("#points-building-root");
            let chkNode = chkNodeRoot ? chkNodeRoot.querySelectorAll('ul')[0] : null;
            if (!chkNode)
            {
                // Note: warn that this is disabled.
                log("[tornDisableRefills] chkNode not found! root: ", chkNodeRoot);
            }
            else
            {
                chkNode.addEventListener('click', onRefillClick, {capture: true}, true);
            }
        }
    } // End function tornDisableRefills() {

    function removeDisableRefills() {$("refill_confirm").remove()}

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn User List Extender" (called on page complete)
    // Doesn't work if Honor Bars are disabled!
    //////////////////////////////////////////////////////////////////////////////////

    // TBD: Add clear/refresh cache option !!!! Also, doesn't work with honor bars off
    function tornUserList() {
        let opts = {};
        getSavedOptions();
        let stats = {
            cache_hits: 0,
            cache_misses: 0
        };

        debug('[userListExtender] options: ', opts);

        let   reqDelay = 10; //seconds to delay on error code 5 (too many req's)
        let   mainTargetNode = null;
        const mainConfig = { attributes: false, childList: true, subtree: true };
        const mainObserver = new MutationObserver(function() {updateUserLevels('mainObserver')});
        let observing = false;
        function xedx_main_div() {
            const _xedx_main_div =
              '<div class="t-blue-cont h" id="xedx-main-div">' +

                  // Header and title.
                  '<div id="xedx-header-div" class="title main-title title-black top-round active" role="table" aria-level="5">' +
                      "<span>Advanced Search by XedX</span>" +

                      // This displays the active/inactive status - active when data array is populated.
                      '<div id="xedx-active-light" style="float: left; margin-right: 10px; margin-left: 10px; color: green;">' +
                          '<span>Active</span>' +
                      '</div>' +

                      // This displays the [hide] | [show] link
                      '<div class="right" style="margin-right: 10px">' +
                          '<a role="button" id="xedx-show-hide-btn" class="t-blue show-hide">[hide]</a>' +
                      '</div>' +
                  '</div>' +

              // This is the content that we want to hide when '[hide] | [show]' is clicked.
              '<div id="xedx-content-div" class="cont-gray bottom-round" style="height: auto; overflow: auto; display: flex";>' +
                  '<br>' +
                  '<span style="text-align: left; margin-left: 10px; margin-top: 10px;">Options:</span>' +
                  '<table style="margin-top: 10px; width: 550px; display: flex;"><tbody>' + // 500
                      '<tr>' + // Row 1 // <tr style="display: flex;">
                          '<td class="xtdx"><div>' +
                              '<input type="checkbox" class="xcbx" id="xedx-devmode-opt" name="devmode">' +
                              '<label for="devmode"><span style="margin-left: 15px;">Development Mode</span></label>' +
                          '</div></td>' +
                          '<td class="xtdx"><div>' +
                              '<input type="checkbox" class="xcbx" id="xedx-hidefallen-opt" name="hidefallen">' +
                              '<label for="hidefallen"><span style="margin-left: 15px;">Hide Fallen</span></label>' +
                          '</div></td>' +
                          '<td class="xtdx" id="viewcache" style="display: inline-block;"><div>' +
                              '<button id="xedx-viewcache-btn" class = "button">View Cache</button>' +
                          '</div></td>' +
                          '<td class="xtdx" id="clearcache" style="display: inline-block;"><div>' +
                              '<button id="xedx-clearcache-btn" class = "button">Clear Cache</button>' +
                          '</div></td>' +
                      '</tr>' +
                      '<tr>' + // Row 2
                          '<td class="xtdx"><div>' +
                              '<input type="checkbox" class="xcbx" id="xedx-hidefedded-opt" name="hidefedded">' +
                              '<label for="hidefedded"><span style="margin-left: 15px">Hide Fedded</span></label>' +
                          '</div></td>' +
                          '<td class="xtdx""><div>' +
                              '<input type="checkbox" class="xcbx" id="xedx-disabled-opt" name="disabled">' +
                              '<label for="disabled"><span style="margin-left: 15px;">Disable Script</span></label>' +
                          '</div></td>' +
                          '<td class="xtdx" id="viewcache" style="display: inline-block;  colspan: 2;"><div>' +
                              '<button id="xedx-refreshcache-btn" class = "button">Refresh</button>' +
                          '</div></td>' +
                      '</tr>' +
                      '<tr>' + // Row 3
                          '<td  class="xtdx"><div>' +
                              '<input type="checkbox" class="xcbx" id="xedx-hidetravel-opt" name="hidetravel">' +
                              '<label for="hidetravel"><span style="margin-left: 15px">Hide Traveling</span></label>' +
                          '</div></td>' +
                          '<td  class="xtdx" id="showcaymans" style="display: hide; colspan: 3;"><div>' +
                              '<input type="checkbox" class="xcbx" id="xedx-showcaymans-opt" name="showcaymans">' +
                              '<label for="showcaymans"><span style="margin-left: 15px">Caymans Only</span></label>' +
                          '</div></td>' +
                           '<td  class="xtdx" id="showscore" style="display: hide; colspan: 3;"><div>' +
                              '<input type="checkbox" class="xcbx" id="xedx-showscore-opt" name="showscore">' +
                              '<label for="showscore"><span style="margin-left: 15px">Show Score</span></label>' +
                          '</div></td>' +
                      '</tr>' +
                      '<tr>' + // Row 4
                          '<td class="xtdx"><div>' +
                              '<input type="checkbox" class="xcbx" id="xedx-hidehosp-opt" name="hidehosp" style="margin-bottom: 10px;">' +
                              '<label for="hidehosp"><span style="margin-left: 15px">Hide Hospitalized</span></label>' +
                          '</div></td>' +
                          '<td class="xtdx"><div>' +
                              '<input type="checkbox" class="xcbx" id="xedx-showctry-opt" name="showctry" style="margin-bottom: 10px;">' +
                              '<label for="showctry"><span style="margin-left: 15px">Show Country</span></label>' +
                          '</div></td>' +
                          '<td style="colspan: 2;" class="xtdx"><div>' +
                              '<input type="checkbox" class="xcbx" id="xedx-ctryabroad-opt" name="ctryabroad" style="margin-bottom: 10px;">' +
                              '<label for="ctryabroad"><span style="margin-left: 15px">Only if abroad</span></label>' +
                          '</div></td>' +
                          //'<td style="colspan: 3;" class="xtdx" id="loggingEnabled" style="display: block;"><div>' +
                          //    '<input type="checkbox" class="xcbx" id="xedx-loggingEnabled-opt" name="loggingEnabled"">' +
                          //    '<label for="loggingEnabled"><span style="margin-left: 15px;">Debug Logging Enabled</span></label>' +
                          //'</div></td>' +
                      '</tr>' +
                  '</tbody></table>' +
                  '<div id="xedx-mstats-tracker" style="float: right; margin-top: 10px;">' +
                      '<span id="xedx-info-text" style="color: red; margin-right: 20px; margin-left: 20px;">' +
                      //'<span id="xedx-info-text" class="powered-by" style="margin-right: 20px; margin-left: 20px;">' +
                      //GM_info.script.name +
                      '</span>' +
                  '</div>' +
                  '<br>' +
              '</div>'; // End _xedx_main_div

            return _xedx_main_div;
        }
        let rank_cache = {};
        let ttInstalled = false;
        var storageCacheInt = null;

        return new Promise((resolve, reject) => {
            rank_cache = readCacheFromStorage();

            // Check for expired cache entries at intervals, half max cache age.
            debug('[userListExtender] **** Performing interval driven cache clearing ****');
            if (!opts.cacheMaxMs) opts.cacheMaxMs = (6 * 3600 * 1000);
            storageCacheInt = setInterval(clearStorageCache, (0.5*opts.cacheMaxMs));

            mainTargetNode = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper");
            addDarkModeObserver(); // I've forgotten why I do this.
            buildUI();
            observerON();

            if (document.readyState === 'complete') {
                updateUserLevels('document.readyState');
            }

            resolve("[tornUserList] startup complete!");
        }).catch((error) => {
            log("[tornUserList] ERROR: ", error);
            rejectDebug(error);
        });

        function newCacheItem(ID, obj) {
            debug('[userListExtender] newcacheItem, from: ', obj);
            let lifeCurr = obj.life.current; // Can't use these (?), will be invalid if cached.
            let lifeMax = obj.life.maximum;  // ...
            let score = obj.competition ? obj.competition.score : 0;
            let rank = numericRankFromFullRank(obj.rank);
            return {ID: ID, numeric_rank: rank, name: obj.name, lifeCurr: lifeCurr, lifeMax: lifeMax,
                    state: obj.status.state, description: obj.status.description, access: new Date().getTime(), fromCache: true, score: score};
        }

        //////////////////////////////////////////////////////////////////////
        // Query profile information based on ID
        //////////////////////////////////////////////////////////////////////

        // Query profile information based on ID. Skip those we'd like to filter out.
        // We don't display if the class contains 'filter-hidden', added by TornTools,
        // or 'xedx_hidden', added here.
        async function getRankFromId(ID, li) {
            debug('[userListExtender] getRankFromId: ID ' + ID + ' classList: ' + li.classList);

            if (opts.opt_disabled) {
                debug('[userListExtender] Script disabled - ignoring.');
                return true;
            }

            if (li.classList.contains('filter-hidden') || li.classList.contains('xedx_hidden')) {
                log('[userListExtender] Skipping ' + ID + ': hidden.');
                return true;
            }

            if (isRanked(li)) { // Don't do again!
                debug('[userListExtender] ***** getRankFromId: rank already present! *****');
                debug('[userListExtender] ***** Should not be here!!! *****');
                return true;
            }

            if (opts.opt_paused) {
                debug('[userListExtender] Script paused - requeuing. (' + $("#xedx-info-text")[0].innerText + ')');
                if (!$("#xedx-info-text")[0].innerText) {
                    $("#xedx-info-text")[0].innerText = 'Requests paused, please wait.';
                }
                setTimeout(function(){
                    logApiCall('user: profile');
                    xedx_TornUserQuery(ID, 'profile', updateUserLevelsCB, li);}, reqDelay * 1000);
                return true;
            }

            debug("[userListExtender] TornAPI Querying Torn for rank, ID = " + ID);
            logApiCall('user: profile');
            xedx_TornUserQuery(ID, 'profile', updateUserLevelsCB, li);
        }

        //////////////////////////////////////////////////////////////////////
        // This callback create the cache used to store ID-rank associations
        // and updates the UI.
        //////////////////////////////////////////////////////////////////////

        function updateUserLevelsCB(rt, ID, li) {
            debug('[userListExtender] TornAPI updateUserLevelsCB ID: ', ID);
            let jsonResp = JSON.parse(rt);
            if (jsonResp.error) {
                debug('[userListExtender] updateUserLevelsCB: error:', jsonResp.error);

                if ($("#xedx-res-div").length > 0) return;

                if (jsonResp.error.code == 5) { // {"code":5,"error":"Too many requests"}
                    if (isRanked(li)) { // Don't do again!
                        log('[userListExtender] ***** updateUserLevelsCB: rank for ' + name + ' already present! Ignoring.');
                        return;
                    }
                    let name = fullNameFromLi(li);
                    let msg = "Delaying request for " + reqDelay + " seconds.";
                    debug('[userListExtender] updateUserLevelsCB requeuing ' + name);
                    setTimeout(function(){
                        $("#xedx-info-text")[0].innerText = "Restarting requests.";
                        opts.opt_paused = false;
                        logApiCall('user: profile');
                        xedx_TornUserQuery(ID, 'profile', updateUserLevelsCB, li);
                        debug('[userListExtender] Restarting requests.');
                    },
                    reqDelay * 1000);  // Turn back on in <delay> secs.

                    $("#xedx-info-text")[0].innerText = "Error: " + jsonResp.error.error + "\n" + msg;
                    debug('[userListExtender] ', msg);
                    opts.opt_paused = true;
                    return;
                }
                if (jsonResp.error.code == 17) {
                    if (queryRetries++ < 5) {
                        if (alertOnRetry) alert("Retrying error 17!");
                        return xedx_TornUserQuery(ID, 'profile', updateUserLevelsCB, li);
                    } else {
                        queryRetries = 0;
                    }
                }
                return handleError(responseText);
            }
            debug('[userListExtender] TornAPI updateUserLevelsCB jsonResp (' + ID + '): ', jsonResp);
            //debug('[userListExtender] TornAPI updateUserLevelsCB li: ', li);

            let liName = fullNameFromLi(li);
            let objName = jsonResp.name;
            if (liName && objName) {
                liName = liName.split(' ')[0];
                if (liName.trim().toLowerCase() != objName.trim().toLowerCase()) {
                    log('[userListExtender] TornAPI ERROR: returned profile info does not match!');
                    log('[userListExtender] TornAPI (error) liName: ', liName, ' objName: ', objName);
                    return;
                }
            }

            $("#xedx-info-text")[0].innerText = 'Queried ID ' + ID;
            setTimeout(function(){$("#xedx-info-text")[0].innerText = opts.opt_paused ? 'Requests paused, please wait.' : '';}, 5000);

            let lifeCurr = jsonResp.life.current; // Can't use these (?), will be invalid if cached.
            let lifeMax = jsonResp.life.maximum;  // ...

            let numeric_rank = numericRankFromFullRank(jsonResp.rank);
            let cache_item = newCacheItem(ID, jsonResp);
            debug("[userListExtender] TornAPI updateUserLevelsCB Caching rank: " + ID + " (" + cache_item.name + ") ==> " + cache_item.numeric_rank);
            rank_cache[ID] = cache_item;
            debug('[userListExtender] TornAPI updateUserLevelsCB Caching ID ' + ID + ' to storage.');
            debug('[userListExtender] TornAPI updateUserLevelsCB obj: ', cache_item);
            writeCacheToStorage();

            let state = observerOFF();
            updateLiWithRank(li, cache_item);
            if (state) observerON();
        }

        //////////////////////////////////////////////////////////////////////
        // Find a rank from our cache, based on ID
        //////////////////////////////////////////////////////////////////////

        function setCacheAccess() {
            let now = new Date().getTime();
            rank_cache.lastAccessed = now;
        }

        function writeCacheToStorage() {
            debug('[userListExtender] writeCacheToStorage: len ', Object.keys(rank_cache).length);
            try {
                setCacheAccess();
                GM_setValue('userListExtender.rank_cache', JSON.stringify(rank_cache));
            } catch(e) {
                log('[userListExtender] ERROR: ', e);
            }
        }

        function readCacheFromStorage() {
            try {
                 rank_cache = JSON.parse(GM_getValue('userListExtender.rank_cache', JSON.stringify(rank_cache)));
                 return rank_cache;
            } catch(e) {
                log('[userListExtender] ERROR: ', e);
            }
        }

        function getCachedRankFromId(ID, li) {
            try {
                let name = fullNameFromLi(li);
                debug('[userListExtender] Looking for ' + name + ' [' + ID + '] in cache...');

                let isHosped = isInHosp(li);
                let inFed = isFedded(li);
                let travelling = isTravelling(li);
                if (isHosped || inFed || travelling) {
                    debug('[userListExtender] Hosp: ' + isHosped + ' Fedded: ' + inFed + ' IsTravelling: ' + travelling);
                }

                let cache_obj = rank_cache[ID];
                debug('[userListExtender] cache_obj for ID ', ID, ': ', cache_obj);
                if (cache_obj) {
                    debug("[userListExtender] Returning cached rank: " + ID + "(" +  cache_obj.name + ") ==> " +  cache_obj.numeric_rank);

                    let state = observerOFF();
                    updateLiWithRank(li, cache_obj);
                    if (state) observerON();

                    let now = new Date().getTime();
                    let accessed = cache_obj.access;
                    let age = now - accessed;
                    debug("[userListExtender] age: " + (age/1000) + " max: " + (opts.cacheMaxMs/1000) + " secs)");

                    if ((now - accessed) > opts.cacheMaxMs) {
                        log('[userListExtender] Cache entry for ID ' + ID + ' expired, deleting.');
                        //GM_deleteValue(ID);
                        let rank = cache_obj.numeric_rank;
                        delete rank_cache[ID];
                        writeCacheToStorage();
                        stats.cache_hits++;
                        return rank;
                    }

                    cache_obj.access = now;
                    writeCacheToStorage();
                    stats.cache_hits++;
                    return cache_obj.numeric_rank;
                }

                debug("[userListExtender] didn't find " + name + ' [' + ID + "] in cache.");
                stats.cache_misses++;
                return 0; // Not found!
            } catch(e) {
                log('[userListExtender] ERROR: ', e);
            }
        }

        // Write out some cache stats
        function writeCacheStats() {
            readCacheFromStorage();
            let now = new Date().getTime();
            let lastAccess = rank_cache.lastAccessed;
            let arrayOfKeys = Object.keys(rank_cache);
            log('[userListExtender] Cache stats:\nNow: ' + now + '\nLast Access: ' + lastAccess +
                'Cache Age: ' + (now - lastAccess)/1000 + ' seconds.\nItem Count: ' + arrayOfKeys.length - 1);
        }

        // Clear entire cache
        function clearCache() {
            debug('[userListExtender] [clearCache]');
            rank_cache = {};
            writeCacheToStorage();
            debug('[userListExtender] cache cleared, len = ', rank_cache.length);
        }

        // Function to scan our cache and clear old entries
        function clearStorageCache() {
            try {
                readCacheFromStorage();
                let counter = 0;
                let idArray = [];
                let now = new Date().getTime();
                //let arrayOfKeys = GM_listValues();
                let arrayOfKeys = Object.keys(rank_cache);
                //GM_setValue('LastCacheAccess', now);
                rank_cache.lastAccessed = now;
                debug("[userListExtender] Clearing cache, 'timenow' = " + now + ' Cache lifespan: ' + opts.cacheMaxMs/1000 + ' secs.');
                for (let i = 0; i < arrayOfKeys.length; i++) {
                    //let obj = GM_getValue(arrayOfKeys[i]);
                    let obj = rank_cache[arrayOfKeys[i]];
                    if (obj && obj.access && (now - obj.access) > opts.cacheMaxMs) {idArray.push(arrayOfKeys[i]);}
                }
                for (let i = 0; i < idArray.length; i++) {
                    counter++;
                    debug('Cache entry for ID ' + idArray[i] + ' expired, deleting.');
                    //GM_deleteValue(idArray[i]);
                    delete rank_cache[idArray[i]];
                }
                writeCacheToStorage();
                debug('[userListExtender] Finished clearing cache, removed ' + counter + ' object.');
            } catch(e) {
                log('[userListExtender] ERROR: ', e);
            }
        }

        //////////////////////////////////////////////////////////////////////
        // This actually updates the UI - it finds the rank associated
        // with an ID from our cache and updates.
        //////////////////////////////////////////////////////////////////////

        // Write to the UI
        function updateLiWithRank(li, cache_item) {
            // Run through our filter
            li.classList.remove('xedx_hidden');

            if (opts.opt_disabled) return;

            if (!cache_item) {
                debug('[userListExtender] Invalid params - not filtering: li=' + li + ' cache_item: ' + cache_item);
                return;
            }

            if (filterUser(li, cache_item)) {
                debug('[userListExtender] Filtered ' + cache_item.name);
                li.classList.add('xedx_hidden');
                return;
            }

            let jsonResp = cache_item.jsonResp;
            let lifeCurr = cache_item.lifeCurr;
            let lifeMax = cache_item.lifeMax;
            let fullLife = (lifeCurr == lifeMax);
            let numeric_rank = cache_item.numeric_rank;

            if (isTravelling(li) && opts.opt_showctry) {
                if (cache_item.state == 'Abroad' || !opts.opt_ctryabroad) {
                    let icon = li.querySelector("[id^='icon71___']");
                    log('[userListExtender] found travel icon: ', icon);
                    if (icon) {
                        let country = getCountryFromStatus(cache_item.description);

                        debug('[userListExtender] country is ' + country);
                        let flag = $(getAbroadFlag(country));
                        debug('[userListExtender] flag is ' + flag);
                        debug('[userListExtender] replacing in li: ', li);

                        if (country) $(icon).replaceWith($(getAbroadFlag(country)));
                    }
                }
            }

            if ($(li).length > 0) {
                let lvlNode = li.getElementsByClassName('level')[0];
                let text = lvlNode.innerText;
                if (text.indexOf("/") != -1) { // Don't do again!
                    debug('[userListExtender] ***** Rank already present!! *****');
                    return;
                }

                // Not filtered: add rank.
                let logMsg = "";
                let score = cache_item.score;
                if (!lifeMax || !lifeCurr) {
                    lvlNode.innerText = text.trim() + '/' + (numeric_rank ? numeric_rank : '?');
                    logMsg = lvlNode.innerText;
                } else {
                    lvlNode.parentNode.setAttribute('style', 'width: 60%;');
                    lvlNode.setAttribute('style', 'width: 25%; color: ' + (fullLife ? 'limegreen;' : 'red;'));
                    lvlNode.nextElementSibling.setAttribute('style', 'width: 50%;');
                    lvlNode.innerText = '[' + lifeCurr + '/' + lifeMax + '] ' + text.trim() + '/' + (numeric_rank ? numeric_rank : '?') +
                                         (opts.opt_showscore ? ('/' + score) : '');
                    logMsg = lvlNode.innerText;
                }
                log('[userListExtender] score: ' + score);
                log('[userListExtender] innerText: ' + logMsg);
            } else {
                if (enableDebugger == true) debugger;
            }
        }

        function getCountryFromStatus(desc) {
            if (desc.indexOf("United Kingdom") > -1) return 'UK';
            if (desc.indexOf("Mexico") > -1) return 'Mexico';
            if (desc.indexOf("Argentina") > -1) return 'Argentina';
            if (desc.indexOf("Canada") > -1) return 'Canada';
            if (desc.indexOf("Cayman") > -1) return 'Caymans';
            if (desc.indexOf("Switzerland") > -1) return 'Zurich';
            if (desc.indexOf("Japan") > -1) return 'Japan';
            if (desc.indexOf("China") > -1) return 'China';
            if (desc.indexOf("UAE") > -1) return 'UAE'; // ???
            if (desc.indexOf("Arab") > -1) return 'UAE'; // ???
            if (desc.indexOf("South") > -1) return 'SA'; // ??
            if (desc.indexOf("Africa") > -1) return 'SA'; // ??
            if (desc.indexOf("Hawaii") > -1) return 'Hawaii';

            return null;
        }

        // Images for country flags
        function getAbroadFlag(country) {
            if (country == 'UK') {
                return `<li style=margin-bottom: 0px;"><img class="flag selected" src="/images/v2/travel_agency/flags/fl_uk.svg"
                    country="united_kingdom" alt="United Kingdom" title="United Kingdom"></li>`;
            }
            if (country == 'Mexico') {
                return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_mexico.svg"
                    country="mexico" alt="Mexico" title="Mexico"></li>`;
            }
            if (country == 'Canada') {
                return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_canada.svg"
                    country="canada" alt="Canada" title="Canada"></li>`;
            }
            if (country == 'Argentina') {
                return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_argentina.svg"
                    country="argentina" alt="Argentina" title="Argentina"></li>`;
            }
            if (country == 'Hawaii') {
                return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_hawaii.svg"
                    country="hawaii" alt="Hawaii" title="Hawaii"></li>`;
            }
            if (country == 'Caymans') {
                return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_cayman.svg"
                    country="cayman_islands" alt="Cayman Islands" title="Cayman Islands"></li>`;
            }
            if (country == 'Zurich') {
                return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_switzerland.svg"
                    country="switzerland" alt="Switzerland" title="Switzerland"></li>`;
            }
            if (country == 'Japan') {
                return `<li style=margin-bottom: 0px;"><img class="flag selected" src="/images/v2/travel_agency/flags/fl_japan.svg"
                    country="japan" alt="Japan" title="Japan"></li>`;
            }
            if (country == 'China') {
                return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_china.svg"
                    country="china" alt="China" title="China"></li>`;
            }
            if (country == 'UAE') {
                return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_uae.svg"
                    country="uae" alt="UAE" title="UAE"></li>`;
            }
            if (country == 'SA') {
                return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_south_africa.svg"
                    country="south_africa" alt="South Africa" title="South Africa"></li>`;
            }
        }

        // Diagnostic aids, will be used elsewhere later
        function isInHosp(li) {
            return (li.querySelector("[id^='icon15___']")) ? true : false;
        }
        function isFedded(li) {
            return (li.querySelector("[id^='icon70___']")) ? true : false;
        }
        function isFallen(li) {
            return (li.querySelector("[id^='icon77___']")) ? true : false;
        }
        function isTravelling(li) {
            return (li.querySelector("[id^='icon71___']")) ? true : false;
        }

        function isRanked(li) {
            let lvlNode = li.getElementsByClassName('level')[0];
            let lvlText = lvlNode.innerText;
            if (lvlText.indexOf("/") != -1) { // Don't do again!
                debug('[userListExtender] ***** isRanked: rank already present! *****');
                return true;
            }
            return false;
        }

        // Pre-filter - just based on icons in the li
        // If filtered, return TRUE
        function preFilter(li) {
            let ID = idFromLi(li);
            let name = fullNameFromLi(li);

            log("[userListExtender] Pre-filtering " + name + ' [' + ID + ']');

            if (opts.opt_hidehosp && isInHosp(li)) {
                log('[userListExtender] ***** preFilter: in hospital! (' + name + + ' [' + ID + '])');
                return true;
            }
            if (opts.opt_hidefedded && isFedded(li)) {
                log('[userListExtender] ***** preFilter: fedded! (' + name + + ' [' + ID + '])');
                return true;
            }
            if (opts.opt_hidefallen && isFallen(li)) {
                log('[userListExtender] ***** preFilter: fallen! (' + name + + ' [' + ID + '])');
                return true;
            }
            if (opts.opt_hidetravel && isTravelling(li)) {
                log('[userListExtender] ***** preFilter: travelling! (' + name + + ' [' + ID + '])');
                return true;
            }

            return false;
        }

        // Filter to cull out those we're not interested in, based callback info (not icons). Return TRUE if filtered.
        // Note: 'ci' ==> 'Cache Item' (object in rank_cache)
        function filterUser(li, ci) {
            try {
                debug('[userListExtender] Filtering ' + ci.name + ' Rank: ' + ci.numeric_rank + ' State: ' + ci.state + ' Desc: ' + ci.description);
                if (opts.opt_showcaymans && ci.state != 'Traveling') {
                    debug('[userListExtender] Filtered - Caymans only, but either not returning or not Caymans');
                    debug('[userListExtender] State = ' + ci.state);
                    return true;
                }

                let isHosped = isInHosp(li);
                let infed = isFedded(li);
                let fallen = isFallen(li);
                let travelling = isTravelling(li);
                if (isHosped || infed || travelling) {
                    log('[userListExtender] Hosp: ' + isHosped + ' Fedded: ' + infed + ' IsTravelling: ' + travelling);
                    log('[userListExtender] **** Shouldn`t be here? *****');
                }

                switch (ci.state) {
                    case 'Hospital':
                        if (opts.opt_hidehosp) {
                            if (isHosped) log('**** Shouldn`t be here? *****');
                            debug('[userListExtender] ***** Filtered - in hosp.');
                            return true;
                        }
                        break;
                    case 'Federal':
                        if (opts.opt_hidefedded) {
                            if (infed) log('[userListExtender] **** Shouldn`t be here? *****');
                            debug('[userListExtender] ***** Filtered - fedded.');
                            return true;
                        }
                        break;
                    case 'Fallen':
                        if (opts.opt_hidefallen) {
                            if (infed) log('[userListExtender] **** Shouldn`t be here? *****');
                            debug('[userListExtender] ***** Filtered - fallen.');
                            return true;
                        }
                        break;
                    case 'Abroad':
                    case 'Traveling':
                        if (opts.opt_hidetravel) {
                            if (travelling) log('[userListExtender] **** Shouldn`t be here? *****');
                            debug('[userListExtender] ***** Filtered - traveling.');
                            return true;
                        }
                        if (opts.opt_showcaymans) {
                            if (ci.description.indexOf('Cayman') != -1) {
                                if (ci.description.indexOf('Returning') != -1) {
                                    debug('[userListExtender] ******Returning from Caymans! Not filtered!');
                                    return false;
                                }
                            }
                            debug('[userListExtender] Filtered - caymans only, but either not returning or not Caymans');
                            return true;
                        }
                        break;
                    default:
                        return false;
                }
                return false;
            } catch(e) {
                log('[tornUserList] ERROR: ', e);
            }
        }

        //////////////////////////////////////////////////////////////////////
        // This prepares to update the UI by locating level, user ID
        // and the index of the <li> in the <ul>.
        //////////////////////////////////////////////////////////////////////

        async function updateUserLevels(display) {
            debug('[userListExtender] updateUserLevels called by: ' + display);

            if (opts.opt_disabled) {
                debug('[userListExtender] Script disabled - not processing.');
                return;
            }

            // See if TornTools filtering is in play.
            let ttPlayerFilter = document.querySelector("#tt-player-filter");
            if ($(ttPlayerFilter).length > 0) {
                debug('[userListExtender] TornTools filter detected!');
                ttInstalled = true;
                }

            // Get the <UL>, list of all users.
            let elemList = document.getElementsByClassName('user-info-list-wrap bottom-round cont-gray');
            let items = elemList[0].getElementsByTagName("li");
            if (items.length <= 1) {return;} // DOM not fully loaded, observer will recall us.

            observerOFF();
            for (var i = 0; i < items.length; ++i) {
                let li = items[i], ID = 0;
                if ((ID = idFromLi(li)) != 0) {

                    if (isRanked(li)) { // Don't do again!
                        debug('[userListExtender] ***** updateUserLevels: rank already present, ignoring *****');
                        continue;
                    }

                    // NOTE: Filter here first, before secondary filter, which
                    // requires stuff from a stats query. We can filter based on icons in the li.
                    // Just need to add the filter class, will be caught in getRankFromId()
                    // and ignored. The secondary filter, which uses data from the Torn API
                    // call, is called from updateLiWithRank().
                    if (preFilter(li)) {
                        li.classList.add('xedx_hidden');
                        debug('[userListExtender] pre-filtered: ignoring.');
                        continue;
                    }

                    // This returns TRUE if either a cached rank item is found, or it is filtered out.
                    // If neither of these cases is true, we query the Torn API, and then update the UI
                    // accordingly - we perform secondary filtering there.
                    if (!getCachedRankFromId(ID, li)) {
                        //setTimeout(function(){getRankFromId(ID, li);}, 500); // Updates UI. Do this in .5 sec intervals
                                                                             // to limit the 100 reqs/min errors
                        getRankFromId(ID, li);
                    }
                }
            }
            observerON();
        }

        // document.querySelector(" li.user2745846 > div.expander.clearfix.torn-divider.divider-vertical > a.user.name > span")
        function fullNameFromLi(li) {
            try {
                let elems = li.getElementsByClassName('user name'); // debugging
                if (elems.length == 0) {
                    debug('[userListExtender] Unable to find user.name!');
                    return 0;
                }
                let name = elems[0].getAttribute("data-placeholder");
                if (!name) { // Will happen if Honor Bars disabled
                    debug('[userListExtender] Unable to find "data-placeholder"');
                    elems = elems[0].getElementsByTagName('span');
                    debug('[userListExtender] spans: ', elems);
                    name = elems[0].innerText;
                }
                return name;
            } catch(err) { // Should never hit this.
                console.error(err);
                rejectDebug(error);
                return 0;
            }
        }

        // Helper for above
        function idFromLi(li) {
            try {
                let elems = li.getElementsByClassName('user name'); // debugging
                if (elems.length == 0) {return 0;}
                return elems[0].getAttribute("href").split("=")[1];
            } catch(err) { // Should never hit this.
                console.error(err);
                rejectDebug(error);
                return 0;
            }
        }

        // Disable the script
        function disableScript(disabled=true) {
            opts.opt_disabled = disabled;
            GM_setValue("opts.opt_disabled", opts.opt_disabled);
            $("#xedx-disabled-opt")[0].checked = disabled;
            indicateActive();
        }

        //////////////////////////////////////////////////////////////////////
        // UI related stuff, namely options
        //////////////////////////////////////////////////////////////////////

        // Build the main UI
        function buildUI() {
            getSavedOptions();
            if ($('#xedx-main-div').length > 0) {
                return debug('[userListExtender] UI already installed!');
            }

            let parentDiv = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper");
            if (!$(parentDiv).length) {return setTimeout(buildUI, 500);}

            loadTableStyles();
            $(separator).insertBefore(parentDiv);
            $(xedx_main_div()).insertBefore(parentDiv);

            installHandlers();
            setDefaultCheckboxes();
            hideDevOpts(!opts.opt_devmode);
            indicateActive();
            debug('[userListExtender] UI installed.');

            let node = document.getElementById("xedx-refreshcache-btn");
            displayMiniToolTip(node, "Not Yet Implemented!");
        }

        // Handle the selected options
        function handleOptsClick() {
            try {
                let option = this.id;
                let doUpdate = true;
                debug('[userListExtender] Handling checkbox change for ' + option);
                switch (option) {
                    //case "xedx-loggingEnabled-opt":
                    //    opts.opt_loggingEnabled = this.checked;
                    //    debugLoggingEnabled = opts.opt_loggingEnabled;
                    //    debug('[userListExtender] Saved value for opts.opt_loggingEnabled');
                    //    break;
                    case "xedx-hidefedded-opt":
                        opts.opt_hidefedded = this.checked;
                        debug('[userListExtender] Saved value for opts.opt_hidefedded');
                        break;
                    case "xedx-hidefallen-opt":
                        opts.opt_hidefallen = this.checked;
                        debug('[userListExtender] Saved value for opts.opt_hidefallen');
                        break;
                    case "xedx-devmode-opt":
                        opts.opt_devmode = this.checked;
                        hideDevOpts(!opts.opt_devmode);
                        debug('[userListExtender] Saved value for opts.opt_devmode');
                        break;
                    case "xedx-hidetravel-opt":
                        opts.opt_hidetravel = this.checked;
                        debug('[userListExtender] Saved value for opts.opt_hidetravel');
                        break;
                    case "xedx-showcaymans-opt":
                        opts.opt_showcaymans = this.checked;
                        if (opts.opt_showcaymans) {
                            $('#xedx-hidetravel-opt').prop("checked", false);
                            opts.opt_hidetravel = false;
                        }
                        debug('[userListExtender] Saved value for opts.opt_showcaymans');
                        break;
                    case "xedx-showscore-opt":
                        opts.opt_showscore = this.checked;
                        debug("[userlistextender] Saved value for opts.opt_snowscore");
                        break;
                    case "xedx-hidehosp-opt":
                        opts.opt_hidehosp = this.checked;
                        debug('[userListExtender] Saved value for opts.opt_hidehosp');
                        break;
                    case "xedx-showctry-opt":
                        opts.opt_showctry = this.checked;
                        debug('[userListExtender] Saved value for opts.opt_showctry');
                        break;
                    case "xedx-ctryabroad-opt":
                        opts.opt_ctryabroad = this.checked;
                        debug('[userListExtender] Saved value for opts.opt_ctryabroad');
                        break;
                    case "xedx-disabled-opt":
                        opts.opt_disabled = this.checked;
                        opts.opt_disabled ? observerOFF() : observerON();
                        indicateActive();
                        debug('[userListExtender] Saved value for opts.opt_disabled');
                        break;
                    case "xedx-viewcache-btn":
                        doUpdate = false;
                        displayCache();
                        break;
                    case "xedx-clearcache-btn":
                        doUpdate = false;
                        clearCache();
                        break;
                    case "xedx-refreshcache-btn":
                        doUpdate = false;
                        debug('[userListExtender] Cache refresh not yet implemented!');
                        break;
                    default:
                        debug('[userListExtender] Checkbox ID not found!');
                }
                debug('[userListExtender] opts: ', opts);
                if (doUpdate) setSavedOptions();
                if (doUpdate) updateUserLevels('handleOptsClick');
            } catch(e) {
                log('[tornUserList] ERROR: ', e);
            }
        }

        // Function to enable/diable dev mode options
        function hideDevOpts(hide = true) {
            if (hide) {
                $('#showcaymans')[0].style.display = 'none';
                //$('#loggingEnabled')[0].style.display = 'none';
                $('#viewcache')[0].style.display = 'none';
                $('#clearcache')[0].style.display = 'none';
                $('#showscore')[0].style.display = 'none';
                opts.opt_showscore = false;
                opts.opt_showcaymans = false;
                //GM_setValue("opts.opt_showcaymans", opts.opt_showcaymans);
            } else {
                $('#showcaymans')[0].style.display = 'block';
                //$('#loggingEnabled')[0].style.display = 'block';
                $('#viewcache')[0].style.display = 'inline-block';
                $('#clearcache')[0].style.display = 'inline-block';
                $('#showscore')[0].style.display = 'inline-block';
            }

            setSavedOptions();
        }

        // Function to display cache contents
        function displayCache() {
            debug('[userListExtender] [displayCache]');
            readCacheFromStorage();
            // var rank_cache = [{ID: 0, numeric_rank: 0, name: '', state: '', description: ''}];
            let rc = rank_cache;
            let now = new Date().getTime();
            var output = 'Cached Users (' + rc.length + ', max age = ' + (opts.cacheMaxMs/1000) + ' secs)\n';
            output += "Hits: " + stats.cache_hits + " Misses: " + stats.cache_misses + "\n\n";

            let keys = Object.keys(rank_cache);
            for (let i = 0; i < keys.length; i++) {
                if (!rc[keys[i]] || !rc[keys[i]].name) continue;
                let cacheObj = rc[keys[i]];
                let age = (now - cacheObj.access)/1000; // seconds
                output += 'Name: "' + cacheObj.name + '" [' + keys[i] + '] Rank: ' + cacheObj.numeric_rank +
                    ' State: ' + cacheObj.state + ' Age: ' + age + ' secs.\n';
            }
            alert(output);
        }

        // Read saved options values
        function getSavedOptions() {
            log('[userListExtender] Getting saved options.');
            try {
                let tmpOpts = JSON.parse(GM_getValue('userListExtenderOpts', opts));

                opts.opt_devmode = (typeof tmpOpts.opt_devmode !== undefined) ? tmpOpts.opt_devmode : true;
                opts.opt_loggingEnabled = (typeof tmpOpts.opt_loggingEnabled !== undefined) ? tmpOpts.opt_loggingEnabled : false;
                opts.opt_hidefedded = (typeof tmpOpts.opt_hidefedded !== undefined) ? tmpOpts.opt_hidefedded : true;
                opts.opt_hidefallen = (typeof tmpOpts.opt_hidefallen !== undefined) ? tmpOpts.opt_hidefallen : true;
                opts.opt_hidetravel = (typeof tmpOpts.opt_hidetravel !== undefined) ? tmpOpts.opt_hidetravel : true;
                opts.opt_showcaymans = (typeof tmpOpts.opt_showcaymans !== undefined) ? tmpOpts.opt_showcaymans : false;
                opts.opt_showscore = (typeof tmpOpts.opt_showscore !== undefined) ? tmpOpts.opt_showscore : false;
                opts.opt_hidehosp = (typeof tmpOpts.opt_hidehosp !== undefined) ? tmpOpts.opt_hidehosp : true;
                opts.opt_disabled = (typeof tmpOpts.opt_disabled !== undefined) ? tmpOpts.opt_disabled : false;
                opts.opt_showctry = (typeof tmpOpts.opt_showctry !== undefined) ? tmpOpts.opt_showctry : true;
                opts.opt_ctryabroad = (typeof tmpOpts.opt_ctryabroad !== undefined) ? tmpOpts.opt_ctryabroad : true;
                opts.opt_paused = (typeof tmpOpts.opt_paused !== undefined) ? tmpOpts.opt_paused : false;
                //if (typeof tmpOpts.cacheMins !== undefined) opts.cacheMins = tmpOpts.cacheMins;
                opts.cacheMins = GM_getValue("userlist-cache-time", 30); // So can be set by config page - may change that later
                //if (typeof tmpOpts.cacheMaxMs !== undefined) opts.cacheMaxMs = tmpOpts.cacheMaxMs;
                opts.cacheMaxMs = opts.cacheMins * 60 * 1000;
            } catch (e) {
                log('[userListExtender] ERROR: ', e);
            }

            return opts;
        }

        // Write saved options values
        function setSavedOptions() {
            GM_setValue('userListExtenderOpts', JSON.stringify(opts));
        }

        // Check checkboxes to default.
        function setDefaultCheckboxes() {
            try {
                log('[userListExtender] Setting default state of checkboxes.');
                debug('[userListExtender] opts: ', opts);
                opts = getSavedOptions();
                //$("#xedx-loggingEnabled-opt")[0].checked = opts.opt_loggingEnabled;
                $("#xedx-devmode-opt")[0].checked = opts.opt_devmode;
                $("#xedx-hidefedded-opt")[0].checked = opts.opt_hidefedded;
                $("#xedx-hidefallen-opt")[0].checked = opts.opt_hidefallen;
                $("#xedx-hidetravel-opt")[0].checked = opts.opt_hidetravel;
                $("#xedx-showcaymans-opt")[0].checked = opts.opt_showcaymans;
                $("#xedx-showscore-opt")[0].checked = opts.opt_showscore;
                $("#xedx-hidehosp-opt")[0].checked = opts.opt_hidehosp;
                $("#xedx-disabled-opt")[0].checked = opts.opt_disabled;
                $("#xedx-showctry-opt")[0].checked = opts.opt_showctry;
                $("#xedx-ctryabroad-opt")[0].checked = opts.opt_ctryabroad;
            } catch(e) {
                log('[tornUserList] ERROR: ', e);
            }
        }

        // Show/hide opts page
        function hideOpts(hide=true) {
            debug('[userListExtender] ' + (hide ? "hiding " : "showing ") + "options page.");
            $('#xedx-show-hide-btn').text(`[${hide ? 'show' : 'hide'}]`);
            document.querySelector("#xedx-content-div").style.display = hide ? 'none' : 'flex';
        }

        // Toggle active/inactive status
        function indicateActive() {
            try {
                debug('[userListExtender] Toggling active status: ' + (opts.opt_disabled ? 'active' : 'disabled'));
                if ($($('#xedx-active-light')[0]).length > 0) {
                    var str = `[${opts.opt_disabled ? 'Disabled' : 'Active'}]`;
                    $('#xedx-active-light').text(str);
                    $('#xedx-active-light')[0].style.color = opts.opt_disabled ? "red" : "green";
                    opts.opt_disabled ? observerOFF() : observerON();
                } else {
                    debug('[userListExtender] Active indicator not found!');
                }
            } catch(e) {
                log('[userListExtender] ERROR: ', e);
            }
        }

        // Add button handler(s).
        function installHandlers() {
            // Show/Hide options link
            const savedHide = GM_getValue('xedxHideOpts', false);
            hideOpts(savedHide);
            $('#xedx-show-hide-btn').on('click', function () {
                const hide = $('#xedx-show-hide-btn').text() == '[hide]';
                GM_setValue('xedxHideOpts', hide);
                hideOpts(hide);
            });

            // Options checkboxes
            //$("#xedx-loggingEnabled-opt")[0].addEventListener("click", handleOptsClick);
            $("#xedx-devmode-opt")[0].addEventListener("click", handleOptsClick);
            $("#xedx-hidefedded-opt")[0].addEventListener("click", handleOptsClick);
            $("#xedx-hidetravel-opt")[0].addEventListener("click", handleOptsClick);
            $("#xedx-showcaymans-opt")[0].addEventListener("click", handleOptsClick);
            $("#xedx-showscore-opt")[0].addEventListener("click", handleOptsClick);
            $("#xedx-hidehosp-opt")[0].addEventListener("click", handleOptsClick);
            $("#xedx-disabled-opt")[0].addEventListener("click", handleOptsClick);
            $("#xedx-viewcache-btn")[0].addEventListener("click", handleOptsClick);
            $("#xedx-clearcache-btn")[0].addEventListener("click", handleOptsClick);
            $("#xedx-showctry-opt")[0].addEventListener("click", handleOptsClick);
            $("#xedx-ctryabroad-opt")[0].addEventListener("click", handleOptsClick);
        }

        // Styles for UI elements
        function loadTableStyles() {
            GM_addStyle(".xedx_hidden {display: none;}");
            GM_addStyle(".xcbx {margin-left: 20px; margin-top: 5px;}");
            if (darkMode()) {
                GM_addStyle(".xtdx {color: white;}");
                GM_addStyle(".button {" +
                      "border: solid 1px;" +
                      "color: black;" +
                      "width: 82px;" +
                      "background-color: #c4c3c0;" +
                      "padding: 5;" +
                      "text-align: center;" +
                      "display: inline-block;" +
                      "cursor: pointer;" +
                      "border-radius: 4px;" +
                      "margin-left: 20px;" +
                    "}");

            } else {
                GM_addStyle(".xtdx {color: black;}");
                GM_addStyle(".button {" +
                      "border: solid 1px;" +
                      "color: black;" +
                      "background-color: #c4c3c0;" +
                      "padding: 5;" +
                      "text-align: center;" +
                      "display: inline-block;" +
                      "cursor: pointer;" +
                      "border-radius: 4px;" +
                      "margin-left: 50px;" +
                    "}");
            }
        }

        // Adds an observer to handle changes from dark mode to light
        function addDarkModeObserver() {
            var dmObserver = new MutationObserver(function() {loadTableStyles();});
            dmObserver.observe($('body')[0], {attributes: true, childList: false, subtree: false});
        }

        // Functions to log when we connect/disconnect main observer, for debugging
        function observerON() {
            debug('[userListExtender] Turning observer ON');
            if (mainObserver) {
                mainObserver.observe(mainTargetNode, mainConfig);
                observing = true;
            }
        }

        function observerOFF() {
            let currState = observing;
            debug('[userListExtender] Turning observer OFF, is now: ', (currState ? 'ON' : 'OFF'));
            if (mainObserver) {
                mainObserver.disconnect();
                observing = false;
            }

            return currState;
        }
    } // End function tornUserList() {

    function removeUserList() {
        disableScript(true);
        $("#xedx-main-div").remove();
    }

     //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Overseas Rank" (called on page load)
    // Doesn't work if Honor Bars are disabled!
    //////////////////////////////////////////////////////////////////////////////////

    // Note: auto-refresh won't work, timer isn't cleared when leaving page.
    // Will handleHashChange() catch it? And nee to turn back on....
    // doesn't work with honor bars off
    function tornOverseasRank() {
        let statusSpan = "span.user-green-status";
        let opts = {};
        var compActive = false;
        getSavedOpts();
        writeSavedOpts(); // Just write here for now, only need to save on change
        log("[tornOverseasRank] starting");
        debug("[tornOverseasRank] opts: ", opts);

        //debugLoggingEnabled = true;
        let   autoRefreshId = 0;
        let   requestsPaused = false;
        const ulRootContainerName = 'travel-people';
        const ulRootClassName = 'users-list';
        const config = { attributes: true, childList: true, subtree: true };
        const callback = function(mutationsList, observer) {updateUserLevels('Mutation Observer!')};
        let   targetNode = document.getElementsByClassName(ulRootContainerName)[0];
        let   observer = null;

        // Cache of ID->Rank associations
        let rank_cache = {};

        function newCacheItem(ID, obj) {
            let numeric_rank = numericRankFromFullRank(obj.rank);
            debug("[tornOverseasRank] Creating cache object: " + ID + " ==> " + numeric_rank + ' (cache depth = ' + rank_cache.length + ')');
            let state = obj.status.state;
            let la = obj.last_action.relative;
            let lifec = obj.life.current;
            let lifem = obj.life.maximum;
            let score = obj.competition ? obj.competition.score : 0;
            //if (obj.competition) compActive = true;

            // ID not needed here, it's the key...but check to see if we access it.
            return {ID: ID, name: obj.name, numeric_rank: numeric_rank, la: la, lifeCurr: lifec, lifeMax: lifem, state: state,
                    access: new Date().getTime(), fromCache: false, score: score};
        }

        // Queue of rank from ID requests, from the Torn API
        let queryQueue = []; // The queue
        let queryQueueId = null; // ID for queue check interval
        let sentIdQueue = [];
        function processQueryQueue() {if (!requestsPaused) processQueueMsg(queryQueue.pop());} // Pop message from queue and dispatch
        function processQueueMsg(msg) { // Process a queued message (request) for rank from ID
            if (!(msg)) return;
            let ID = msg.ID;
            let li = msg.li;
            let optMsg = msg.optMsg;

            log('[tornOverseasRank] Processing queued ID ' + ID);
            if (optMsg) {log(optMsg)};
            if (requestsPaused) {
                log("[tornOverseasRank] Requests pause, can't make request. Will retry later.");
                return queryQueue.push(msg);
            }
            logApiCall('user: profile');
            xedx_TornUserQuery(ID, 'profile', updateUserLevelsCB, msg);
        }

        return _tornOverseasRank();

        var storageCacheInt = null;
        function _tornOverseasRank() {
            return new Promise((resolve, reject) => {
                if (!abroad()) return resolve('[tornOverseasRank] at home!');
                GM_addStyle(`.xedx-cached {float: right; margin-left: 10px; font-size: 12px; color:red;}
                             .xedx-notcached {float: right; margin-left: 10px; font-size: 12px; color:green;}
                             .xedx-bg {background-color: green}
                             .xedx-btn {
                                  margin-top: 10px;
                                  margin-left: 20px;
                                  margin-bottom: 10px;}`);

                buildUI();

                rank_cache = readCacheFromStorage();
                installHashChangeHandler(updateUserLevels);
                if (!storageCacheInt)
                    storageCacheInt = setInterval(clearStorageCache, (0.5*opts.cacheMaxMs));
                startObserver();
                updateUserLevels('Ready State Complete!');
                resolve("[tornOverseasRank] startup complete!");
            }).catch((error) => {
                log("[tornOverseasRank] ERROR: ", error);
                rejectDebug(error);
            });
        }// End function _tornOverseasRank() {

        function buildUI() { // r8989  m-top10 m-bottom10 background
            debug("[tornOverseasRank] buildUI");

            GM_addStyle(`.xedx-btn {
                            margin-top: 10px;
                            margin-left: 20px;
                            margin-bottom: 10px;
                            }`);
            let div = `<div class="cont-gray border-round m-top10">
                           <div>
                           <input type="checkbox" id="abroad_click" class="xedx-btn"` +
                           (opts.autoRefresh ? ' checked ': '') + ` />
                           <span style="color: red;"> Auto Refresh </span>

                           <input type="checkbox" id="display_rank" class="xedx-btn"` +
                           (opts.displayRank ? ' checked ': '') + ` />
                           <span style="color: red;"> Display Rank </span>

                           <input type="checkbox" id="display_health" class="xedx-btn"` +
                           (opts.displayHealth ? ' checked ': '') + ` />
                           <span style="color: red;"> Display Health </span>

                           <input type="checkbox" id="last_action" class="xedx-btn"` +
                           (opts.displayLastAction ? ' checked ': '') + ` />
                           <span style="color: red;"> Last Action </span>
                           </div>
                       </div>`;

            let target = document.querySelector("#mainContainer > div.content-wrapper > div.travel-people.revive-people");
            $(target).before(div);

            // TBD: if went from off to on, set timer. Or just set, if now on.
            // Switch to interval?
            $("#abroad_click").on('click', function(event){
                opts.autoRefresh = $(event.currentTarget).is(':checked');
                writeSavedOpts();
            });
            $("#display_rank").on('click', function(event){
                opts.displayRank = $(event.currentTarget).is(':checked');
                writeSavedOpts();
            });
            $("#display_health").on('click', function(event){
                opts.displayHealth = $(event.currentTarget).is(':checked');
                writeSavedOpts();
            });
            $("#last_action").on('click', function(event){
                opts.displayLastAction = $(event.currentTarget).is(':checked');
                writeSavedOpts();
            });
        }

        // Query profile information based on ID. Places on a queue for later processing.
        // In case we are recalled before getting an answer, save the ID's we've already
        // sent requests for.
        function getRankFromId(ID, li, optMsg = null) {
            if (sentIdQueue.includes(ID)) {
                return;
            }
            log("[tornOverseasRank] Querying Torn for rank, ID = " + ID);
            let msg = {ID: ID, li: li, optMsg: optMsg};
            sentIdQueue.push(ID);
            queryQueue.push(msg);
            if (!queryQueueId) {queryQueueId = setInterval(processQueryQueue, opts.queueIntms);}
        }

        // Pauses further requests to the Torn API for 'timeout' seconds
        function pauseRequests(timeout) {
            if (!requestsPaused) {setTimeout(function(){
                requestsPaused = false;
                log('Restarting requests.');}, timeout*1000); // Turn back on in 'timeout' secs.
            }
            log('[tornOverseasRank] Pausing requests for ' + timeout + ' seconds.');
            return (requestsPaused = true);
        }

        // Callback from querying the Torn API
        function updateUserLevelsCB(responseText, ID, msg) {
            var jsonResp = JSON.parse(responseText);
            debug("[tornOverseasRank] updateUserLevelsCB = " + ID);
            if (jsonResp.error) {
                log('Error: ' + JSON.stringify(jsonResp.error));
                if (recoverableErrors.includes(jsonResp.error.code)) { // Recoverable - pause for now.
                    pauseRequests(15); // Pause for 15 secs
                    queryQueue.push(msg);
                }
                return handleError(responseText);
            }
            let li = msg.li;
            let cacheObj = newCacheItem(ID, jsonResp);
            rank_cache[ID] = cacheObj;
            debug('[tornOverseasRank] Caching ID ' + ID + ' to storage.');
            writeCacheToStorage();
            if ($(li).length > 0) {updateLiWithRank(li, cacheObj);}
        }

        // Write to the UI
        function updateLiWithRank(li, cacheObj) {
            //log("[tornOverseasRank] updateLiWithRank");
            observer.disconnect();
            let lvlNode = li.getElementsByClassName('level')[0];
            let statusNode = li.querySelector("div.left-right-wrapper > div.right-side.right > span.status > " + statusSpan);
            let text = lvlNode.childNodes[2].data;
            if (text.indexOf("/") != -1) { // Don't do again!
                observer.observe(targetNode, config);
                return;
            }
            let numeric_rank = cacheObj.numeric_rank;
            let la = cacheObj.la;
            let lifeCurrurr = cacheObj.lifeCurr;
            let lifeMaxax = cacheObj.lifeMax;
            let score = cacheObj.score;
            let ul = li.querySelector("div.center-side-bottom.left > ul");
            let div = li.querySelector("div.center-side-bottom.left");

            if (opts.displayHealth) {
                let newSpan = (cacheObj.fromCache == true) ?
                    ('<span class="xedx-cached"> ' + lifeCurrurr + '/' + lifeMaxax + '</span>') :
                    ('<span class="xedx-notcached"> ' + lifeCurrurr + '/' + lifeMaxax + '</span>');

                // Fix for issue where this was displaying numerous times....
                // See message from Spy, or this: https://imgur.com/DFUfLw2
                $(div).find(".xedx-cached").remove();
                $(div).find(".xedx-notcached").remove();
                $(div).append(newSpan);

                /*
                if (cacheObj.fromCache) {
                    $(div).append('<span class="xedx-cached"> ' + lifeCurrurr + '/' + lifeMaxax + '</span>');
                } else {
                    $(div).append('<span class="xedx-notcached"> ' + lifeCurrurr + '/' + lifeMaxax + '</span>');
                }
                */
            }
            if (statusNode && opts.displayLastAction) {
                la = la.replace('minutes', 'min');
                la = la.replace('minute', 'min');
                la = la.replace('hours', 'hrs');

                if (statusNode.textContent.indexOf('Okay') > -1 ||statusNode.textContent.indexOf('OK') > -1) {

                    statusNode.textContent = "OK " + la;

                    //statusNode.textContent = statusNode.textContent.replace('Okay', 'OK');
                    //statusNode.textContent = statusNode.textContent + ' ' + la;
                }
            }
            // Add score!
            if (opts.displayRank) lvlNode.childNodes[2].data = text.trim() + '/' + (numeric_rank ? numeric_rank : '?')
                + (compActive ? ('/' + score) : '');

            observer.observe(targetNode, config);
        }

        function setCacheAccess() {
            let now = new Date().getTime();
            rank_cache.lastAccessed = now;
        }

        function writeCacheToStorage() {
            try {
                setCacheAccess();
                GM_setValue('overseasRank.rank_cache', JSON.stringify(rank_cache));
            } catch(e) {
                log('[overseasRank] ERROR: ', e);
            }
        }

        function readCacheFromStorage() {
            try {
                 rank_cache = JSON.parse(GM_getValue('overseasRank.rank_cache', JSON.stringify(rank_cache)));
                 return rank_cache;
            } catch(e) {
                log('[overseasRank] ERROR: ', e);
            }
        }

        // Find a rank from our cache, based on ID
        // Note: this modifies the LI if a cached obj is found!
        // Returns rank if found, 0 otherwise.
        function getCachedRankFromId(ID, li) {
            try {
                let cacheObj = rank_cache[ID];
                if (cacheObj) {
                    debug('[tornOverseasRank] [getCachedRankFromId] ID: ', ID, ' rank_cache[ID]: ', rank_cache[ID]);
                    debug("[tornOverseasRank] Returning cached rank: " + ID + " (" +  cacheObj.name + ") ==> " +  cacheObj.numeric_rank);
                    cacheObj.fromCache = true;
                    updateLiWithRank(li, cacheObj);

                    let now = new Date().getTime();
                    let accessed = cacheObj.access;
                    let age = now - accessed;
                    debug("[tornOverseasRank] age: " + (age/1000) + " max: " + (opts.cacheMaxMs/1000) + " secs)");
                    if (age > opts.cacheMaxMs) {
                        debug('[tornOverseasRank] Cache entry for ID ' + ID + ' expired, deleting.');
                        let rank = cacheObj.numeric_rank;
                        delete rank_cache[ID];
                        writeCacheToStorage();
                        return rank; // Use for now, will get again next time.
                    }
                    rank_cache[ID].fromCache = true;
                    rank_cache[ID].access = now;

                    writeCacheToStorage();
                    return rank_cache[ID].numeric_rank;
                }

                debug("[tornOverseasRank] didn't find " + name + ' [' + ID + "] in cache.");
                return 0; // Not found!
            } catch(e) {
                log('[tornOverseasRank] ERROR: ', e);
            }
        }

        // Write out some cache stats
        function writeCacheStats() {
            readCacheFromStorage();
            let now = new Date().getTime();
            let lastAccess = rank_cache.lastAccessed;
            let arrayOfKeys = Object.keys(rank_cache);
            log('[tornOverseasRank] Cache stats:\nNow: ' + now + '\nLast Access: ' + lastAccess +
                'Cache Age: ' + (now - lastAccess)/1000 + ' seconds.\nItem Count: ' + arrayOfKeys.length - 1);
        }

        // Function to scan our storage cache and clear old entries
        function clearStorageCache() {
            readCacheFromStorage();
            let counter = 0;
            let idArray = [];
            let now = new Date().getTime();
            let arrayOfKeys = Object.keys(rank_cache);
            debug("Clearing storage cache, 'timenow' = " + now + ' Cache lifespan: ' + opts.cacheMaxMs/1000 + ' secs.');
            for (let i = 0; i < arrayOfKeys.length; i++) {
                let obj = rank_cache[arrayOfKeys[i]];
                if (!obj || !obj.access) continue;
                if ((now - obj.access) > opts.cacheMaxMs) {idArray.push(arrayOfKeys[i]);}
            }
            for (let i = 0; i < idArray.length; i++) {
                counter++;
                debug('[tornOverseasRank] Cache entry for ID ' + idArray[i] + ' expired, deleting.');
                delete rank_cache[idArray[i]];
            }
            writeCacheToStorage();
            debug('[tornOverseasRank] Finished clearing cache, removed ' + counter + ' object.');
        }

        function getSavedOpts() {
            try {
                let tmpOpts = JSON.parse(GM_getValue('overseasRankOpts', JSON.stringify(opts)));
                opts.displayRank = tmpOpts.displayRank ? tmpOpts.displayRank : true;
                opts.displayHealth = tmpOpts.displayHealth ? tmpOpts.displayHealth : true;
                opts.displayLastAction = tmpOpts.displayLastAction  ? tmpOpts.displayLastAction : true;
                opts.autoRefreshSecs = tmpOpts.autoRefreshSecs ? tmpOpts.autoRefreshSecs : 45;
                opts.autoRefresh = tmpOpts.autoRefresh ? tmpOpts.autoRefresh : false;
                opts.cacheMaxHours = tmpOpts.cacheMaxHours ? tmpOpts.cacheMaxHours : 6;
                opts.cacheMaxMs = tmpOpts.cacheMaxMs ? tmpOpts.cacheMaxMs : (6 * 3600 * 1000);
                opts.queueIntms = tmpOpts.queueIntms ? tmpOpts.queueIntms : 300;
            } catch (e) {
                log('[tornOverseasRank] ERROR: ', e);
            }

            return opts;
        }

        function writeSavedOpts() {
            GM_setValue('overseasRankOpts', JSON.stringify(opts));
        }

        //////////////////////////////////////////////////////////////////////
        // This prepares to update the UI by locating level, user ID
        // and getting the rank for each of the <li>'s in the <ul>.
        //////////////////////////////////////////////////////////////////////

        function updateUserLevels(optMsg=null) {
            if (optMsg != null) {debug('[tornOverseasRank] updateUserLevels: ' + optMsg);}
            debug('[tornOverseasRank] document.readyState: ' + document.readyState);
            debug('[tornOverseasRank] Entering updateUserLevels, cache depth = ' + rank_cache.length);
            let items = $('ul.' + ulRootClassName +  ' > li');
            if (!(items)) {return;}

            highlightMyself();

            debug('[tornOverseasRank] Detected ' + items.length + ' user entries');
            for (let i = 0; i < items.length; i++) {
                let li = items[i];
                if (window.getComputedStyle(li).display === "none") {continue;}
                let idNode = li.querySelector("div.left-right-wrapper > div.left-side.left > a.user.name");
                document.querySelector("div.left-right-wrapper > div.left-side.left > a.user.name")
                if (!(idNode)) { // Should never happen.
                    continue;
                }

                let ID = idNode.getAttribute('href').split('=')[1];
                if (!getCachedRankFromId(ID, li)) { // This call write to the li if found.
                    debug("[tornOverseasRank] ID: ", ID, " li: ", li);
                    let statusSel = li.querySelector('div.left-right-wrapper > div.right-side.right > span.status > ' + statusSpan);
                    let nameSel = li.querySelector("div.left-right-wrapper > div.left-side.left > a.user.name > img");
                    let name = (nameSel) ? nameSel.title : 'unknown';

                    if ((statusSel)) {
                        // Only get rank if status is 'Okay' ...
                        if (statusSel.innerText == 'Okay') {
                            debug('[tornOverseasRank] Querying rank for player ' + ID + ' ' + name + ' (i = ' + i + ')');
                            getRankFromId(ID, li, 'call to getRankFromId from updateUserLevels: ' + optMsg);
                        } else {
                            debug('[tornOverseasRank] player ' + ID + ', ' + name + ' status is ' + statusSel.innerText + ', skipping.');
                        }
                    } else {
                        debug("[tornOverseasRank] Invalid status selector, can't query rank.");
                    }
                }
            }

            debug('[tornOverseasRank] Finished iterating ' + items.length + ' users, ' + rank_cache.length + ' cache entries.');

            // If configured, reload periodically
            if (opts.autoRefreshSecs && opts.autoRefresh) {
                let interval = opts.autoRefreshSecs*1000;
                setTimeout(refreshCB, interval);
            }
        }

        function highlightMyself() {
            let uid = $('script[secret]').attr("uid");
            let name = $('script[secret]').attr("name");
            let fullName = name + ' [' + uid + ']';

            // getPlayerFullName();
            let li = $( "a[data-placeholder='" + fullName + "']");
            let parent = (li && li[0]) ? li[0].parentNode : null;
            if (parent) {
                let root = parent.parentNode.parentNode;
                $(root).addClass('xedx-bg');
            }
        }

        function refreshCB() {
            if (!opts.autoRefresh) return;
            if (location.href.indexOf("page=people") < 0) return;
            let interval = opts.autoRefreshSecs*1000;
            debug('[tornOverseasRank] Auto-refreshing in ' + interval + ' secs');
            location.reload();
            setTimeout(refreshCB, interval);
        }

        function startObserver() {
            if (targetNode) targetNode = document.getElementsByClassName(ulRootContainerName /*contentRootName*/)[0];
            if (!targetNode) return setTimeout(startObserver, 100);

            observer = new MutationObserver(callback);
            observer.observe(targetNode, config);
        }

    } // End function tornOverseasRank() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Ammo and Mods Icons" (called on page load complete)
    //////////////////////////////////////////////////////////////////////////////////

    function tornAmmoMods() {
            log('[tornAmmoMods]');

            return new Promise((resolve, reject) => {
                if (abroad()) return rejectDebug('[tornAmmoMods] not at home!');
                if (!isAmmoPage() && !isModsPage()) return rejectDebug('[tornAmmoMods] wrong page!');

                GM_addStyle(`.xsvg-icon {width: 25px; height: 25px;}
                             .xicon-wrap {display: flex;}
                             .xicon-span {color: var(--appheader-links-color); margin-left: 5px;}
                            `);
                addIcons();
                resolve("[tornAmmoMods] startup complete!");
            }).catch((error) => {
                log("[tornAmmoMods] ERROR: ", error);
                rejectDebug(error);
            });

            function getAmmoIcon() {
                let icon = `<a aria-labelledby="ammo" class=" ammo-locker t-clear h c-pointer m-icon line-h24 right last" href="page.php?sid=ammo" i-data="i_386_15_62_25">
                    <span class="icon-wrap svg-icon-wrap">
                    <span class="link-icon-svg ammo xsvg-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" viewBox="0 0 12.79407 17"><g id="Layer_2" data-name="Layer 2"><g id="icons"><g opacity="0.35"><path d="M1.77466,6.85571h1.0332V5.03528A8.01973,8.01973,0,0,0,1.76727,1.023,8.4107,8.4107,0,0,0,.73407,5.03528V6.85645H1.77466Zm1.0694.73047H.71338a4.52018,4.52018,0,0,1-.43274,1.5376H3.27679A4.50843,4.50843,0,0,1,2.84406,7.58618ZM0,16.89209A.10813.10813,0,0,0,.10858,17h3.3418a.10745.10745,0,0,0,.10779-.10791V9.85327H0Zm4.62018-.45923a.55111.55111,0,0,0,.5354.55237h2.4696a.56693.56693,0,0,0,.55316-.55237V9.83044H4.62018ZM7.45605,7.56323H5.32544a4.51663,4.51663,0,0,1-.432,1.5354h2.994A4.51422,4.51422,0,0,1,7.45605,7.56323Zm-.0354-2.55078A8.02017,8.02017,0,0,0,6.38007,1,8.40538,8.40538,0,0,0,5.34686,5.01245v1.821H7.42065Zm4.615,0A8.02118,8.02118,0,0,0,10.99579,1a8.40823,8.40823,0,0,0-1.0332,4.01245v1.821h2.07305Zm.0362,2.55078H9.94122a4.519,4.519,0,0,1-.43133,1.5354h2.99322A4.51276,4.51276,0,0,1,12.07184,7.56323ZM9.2359,9.83044v6.60242a.55112.55112,0,0,0,.53546.55237H12.241a.56693.56693,0,0,0,.5531-.55237V9.83044Z" fill="#fff"></path></g><path d="M1.77466,5.85571h1.0332V4.03528A8.01973,8.01973,0,0,0,1.76727.023,8.4107,8.4107,0,0,0,.73407,4.03528V5.85645H1.77466Zm1.0694.73047H.71338a4.52018,4.52018,0,0,1-.43274,1.5376H3.27679A4.50843,4.50843,0,0,1,2.84406,6.58618ZM0,15.89209A.10813.10813,0,0,0,.10858,16h3.3418a.10745.10745,0,0,0,.10779-.10791V8.85327H0Zm4.62018-.45923a.55111.55111,0,0,0,.5354.55237h2.4696a.56693.56693,0,0,0,.55316-.55237V8.83044H4.62018ZM7.45605,6.56323H5.32544a4.51663,4.51663,0,0,1-.432,1.5354h2.994A4.51422,4.51422,0,0,1,7.45605,6.56323Zm-.0354-2.55078A8.02017,8.02017,0,0,0,6.38007,0,8.40538,8.40538,0,0,0,5.34686,4.01245v1.821H7.42065Zm4.615,0A8.02118,8.02118,0,0,0,10.99579,0a8.40823,8.40823,0,0,0-1.0332,4.01245v1.821h2.07305Zm.0362,2.55078H9.94122a4.519,4.519,0,0,1-.43133,1.5354h2.99322A4.51276,4.51276,0,0,1,12.07184,6.56323ZM9.2359,8.83044v6.60242a.55112.55112,0,0,0,.53546.55237H12.241a.56693.56693,0,0,0,.5531-.55237V8.83044Z" fill="#777"></path></g></g></svg>
                    </span>
                    </span>
                    <span id="ammo">Ammo</span>
                    </a>
                    `;
                return icon;
            }

            function getModsIcon() {
                let icon = `
                    <a aria-labelledby="mods" class="mods t-clear h c-pointer line-h24 right xicon-wrap" href="loader.php?sid=itemsMods" i-data="i_474_15_56_25">
                    <span class="icon-wrap svg-icon-wrap xsvg-icon">
                    <span class="link-icon-svg mods">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 15"><defs><style>.cls-1{opacity:0.35;}.cls-2{fill:#fff;}.cls-3{fill:#777;}</style></defs><g id="Слой_2" data-name="Слой 2"><g id="icons"><g class="cls-1"><path class="cls-2" d="M10.39,6.16V5.23h2.69a.61.61,0,0,0,.62-.6v-.5h.68V3.79H16V3H14.38V2.65H13.7V2.59a.61.61,0,0,0-.62-.6h-.25V1.45a.29.29,0,0,0-.29-.28c-.28,0-.83.32-.83.53V2H10.3V1.45H9.23V2h-7V1.61H1.74V1.33H1.39V1H.92V2H.62A.61.61,0,0,0,0,2.58V4.63a.61.61,0,0,0,.62.6H2.18A1.63,1.63,0,0,1,3.65,6.79C3.65,8.17,3,8.54,3,10.22c0,.87.63.87.63.87h.46V14h2V11.09H6.6v-4a1,1,0,0,0,.76.34H9.08A1.35,1.35,0,0,0,10.39,6.16Zm-3,.77a.54.54,0,0,1-.5-.44V5.23h.81c-.15,1.5.93,1.49.61,1s-.07-.94.24-1H9.85v.93c0,.67-.74.76-.79.77Zm8.2,3.93a.63.63,0,0,1-.56-.4.65.65,0,0,1,.12-.67c.06,0,.31-.31.31-.31l-.91-.91s-.25.24-.31.31a.63.63,0,0,1-.68.12.64.64,0,0,1-.38-.56V8H11.84v.44a.61.61,0,0,1-.39.56.63.63,0,0,1-.66-.12l-.31-.31-.92.91.31.31a.59.59,0,0,1,.12.68.61.61,0,0,1-.55.37H9v1.32h.44a.62.62,0,0,1,.56.39.61.61,0,0,1-.13.66l-.31.31.92.91s.25-.24.31-.31a.63.63,0,0,1,.68-.12.62.62,0,0,1,.37.56V15h1.31v-.44a.63.63,0,0,1,1.06-.44l.31.31.92-.91-.31-.31a.63.63,0,0,1,.43-1.06H16V10.86ZM12.5,12.79a1.29,1.29,0,1,1,1.29-1.29A1.29,1.29,0,0,1,12.5,12.79Z"></path></g><path class="cls-3" d="M10.39,5.16V4.23h2.69a.61.61,0,0,0,.62-.6v-.5h.68V2.79H16V2H14.38V1.65H13.7V1.59a.61.61,0,0,0-.62-.6h-.25V.45a.29.29,0,0,0-.29-.28c-.28,0-.83.32-.83.53V1H10.3V.45H9.23V1h-7V.61H1.74V.33H1.39V0H.92V1H.62A.61.61,0,0,0,0,1.58V3.63a.61.61,0,0,0,.62.6H2.18A1.63,1.63,0,0,1,3.65,5.79C3.65,7.17,3,7.54,3,9.22c0,.87.63.87.63.87h.46V13h2V10.09H6.6v-4a1,1,0,0,0,.76.34H9.08A1.35,1.35,0,0,0,10.39,5.16Zm-3,.77a.54.54,0,0,1-.5-.44V4.23h.81c-.15,1.5.93,1.49.61,1s-.07-.94.24-1H9.85v.93c0,.67-.74.76-.79.77Zm8.2,3.93a.63.63,0,0,1-.56-.4.65.65,0,0,1,.12-.67c.06,0,.31-.31.31-.31l-.91-.91s-.25.24-.31.31a.63.63,0,0,1-.68.12.64.64,0,0,1-.38-.56V7H11.84v.44a.61.61,0,0,1-.39.56.63.63,0,0,1-.66-.12l-.31-.31-.92.91.31.31a.59.59,0,0,1,.12.68.61.61,0,0,1-.55.37H9v1.32h.44a.62.62,0,0,1,.56.39.61.61,0,0,1-.13.66l-.31.31.92.91s.25-.24.31-.31a.63.63,0,0,1,.68-.12.62.62,0,0,1,.37.56V14h1.31v-.44a.63.63,0,0,1,1.06-.44l.31.31.92-.91-.31-.31a.63.63,0,0,1,.43-1.06H16V9.86ZM12.5,11.79a1.29,1.29,0,1,1,1.29-1.29A1.29,1.29,0,0,1,12.5,11.79Z"></path></g></g></svg>
                    </span>
                    </span>
                    <span id="mods" class="xicon-span">Mods</span>
                    </a>`;
                return icon;
            }

            function addIcons() {
                let target = '';
                let ammoPage = false;
                if (location.href.indexOf('sid=ammo') > -1) { // On ammo page, add mods
                    ammoPage = true;
                    target = $("#react-root").find("div[class^='titleContainer_']")[0];
                } else if (location.href.indexOf('sid=itemsMods') > -1) { // Mods page, add ammo.
                    target = document.querySelector("#top-page-links-list");
                } else {
                    return;
                }

                if (!target) return setTimeout(addIcons, 250);

                if (target) {
                    ammoPage ? $(target).after(getModsIcon()) : $(target).append(getAmmoIcon());
                }
            }

    } // End function tornAmmoMods() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Gym Gains" (called on API complete)
    //////////////////////////////////////////////////////////////////////////////////

    // TBD!
    function tornGymGains() {
        log('[tornGymGains]');

        return new Promise((resolve, reject) => {
            if (abroad()) return rejectDebug('[tornGymGains] not at home!');
            if (!isGymPage()) return rejectDebug('[tornGymGains] wrong page!');

            rejectDebug("[tornGymGains] not yet implemented!");

        }).catch((error) => {
            log("[tornGymGains] ERROR: ", error);
            rejectDebug(error);
        });

    } // End function tornGymGains() {

    function removeTornGymGains() {

    }

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Company Employees" (called on API complete)
    //////////////////////////////////////////////////////////////////////////////////

    function tornCompanyEmployees() {
        log('[tornCompanyEmployees]');
        const COMPANY_CACHE = {};

        return new Promise((resolve, reject) => {
            if (abroad()) return rejectDebug('[tornCompanyEmployees] not at home!');
            if (!isJobsPage()) return rejectDebug('[tornCompanyEmployees] wrong page!');

            GM_addStyle(`
                .capacity {display: inline-block; float: right; margin-right: 10px;}
                .capacity-green {display: inline-block; float: right; margin-right: 10px; color: limegreen;}
                `);

            installHashChangeHandler(hashChangeHandler);

            function getCompanyProfile(e) {
                debug('[getCompanyProfile] hash: ', e.hash);
                let ID = idFromURL(e.hash);
                debug('[getCompanyProfile] ID: ', ID);
                if (!ID) {
                    debug('[getCompanyProfile] ID not found!');
                    return;
                }
                let parentUL = e.parentNode.parentNode;

                if (COMPANY_CACHE[ID]) {
                    debug('[getCompanyProfile] using cached ID: ', COMPANY_CACHE[ID]);
                    modifyPageLi(parentUL, COMPANY_CACHE[ID]);
                } else {
                    xedx_TornCompanyQuery(ID, 'profile', getCompanyProfileCB, parentUL);
                }
            }

            function getCompanyProfileCB(responseText, ID, parentUL) {
                let _jsonResp = JSON.parse(responseText);
                if (_jsonResp.error) {
                    if (_jsonResp.error.code == 17) {
                        if (queryRetries++ < 5) {
                            if (alertOnRetry) alert("Retrying error 17!");
                            return xedx_TornCompanyQuery(ID, 'profile', getCompanyProfileCB, parentUL);
                        } else {
                            queryRetries = 0;
                        }
                    }
                    return handleError(responseText);
                }
                let company = _jsonResp.company;
                let hired = company.employees_hired;
                let capacity = company.employees_capacity;
                let name = company.name; // Just for logging
                let cacheEntry = {'hired': hired, 'capacity': capacity, 'name': name};

                modifyPageLi(parentUL, cacheEntry);
                COMPANY_CACHE[ID] = cacheEntry;
            }

            function modifyPageLi(parentUL, cacheEntry) {
                let hired = cacheEntry.hired;
                let capacity = cacheEntry.capacity;
                let name = cacheEntry.name;
                let nameLi = $(parentUL).find("li.company.t-overflow")[0];
                if (!$(nameLi).find("li.capacity").length && !$(nameLi).find("li.capacity-green").length) {
                    let addlText = ' (' + hired + '/' + capacity + ')';
                    $(nameLi).append('<li class="' + (hired < capacity ? 'capacity-green' : 'capacity') +'">' + addlText + '</li>');
                }
            }

            function hashChangeHandler() {
                debug('[getCompanyProfileCB] hashChangeHandler');
                debug('[getCompanyProfileCB] readystate: ', document.readyState);
                setTimeout(companyEmployeesFunc, 1000);
            }

            function companyEmployeesFunc() {
                debug('[companyEmployeesFunc] handlePageLoad');
                let companies = $(".view-icon");
                if (!companies.length) setTimeout(handlePageLoad, 500);
                Array.from(companies).forEach(e => getCompanyProfile(e));
            }

            companyEmployeesFunc();

            resolve("[tornCompanyEmployees] startup complete!");

        }).catch((error) => {
            log("[tornCompanyEmployees] ERROR: ", error);
            rejectDebug(error);
        });

    } // End function tornCompanyEmployees() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Bounty List Extender" (called on page complete)
    //////////////////////////////////////////////////////////////////////////////////

    // TBD!
    function tornBountyListExtender() {
        log('[tornBountyListExtender]');

        return new Promise((resolve, reject) => {
            if (abroad()) return rejectDebug('[tornBountyListExtender] not at home!');

            rejectDebug('[tornBountyListExtender] not yet implemented!');
            //resolve("[tornBountyListExtender] startup complete!");

        }).catch((error) => {
            log("[tornBountyListExtender] ERROR: ", error);
            rejectDebug(error);
        });

    } // End function tornBountyListExtender() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Criminal Record Details" (called on page complete)
    //////////////////////////////////////////////////////////////////////////////////

    function tornCrimeDetails() {
        log('[tornCrimeDetails]');

        return new Promise((resolve, reject) => {
            if (abroad()) return rejectDebug('[tornCrimeDetails] not at home!');

            /*
            let arrayThefts = [[1000, 'Sneak&nbsp;Thief'], [2500, 'Prowler'], [5000, 'Safe&nbsp;Cracker'], [7500, 'Marauder'], [10000, 'Cat&nbsp;Burgler'], [12500, 'Pilferer'], [15000, 'Desperado'], [17500, 'Rustler'], [20000, 'Pick-Pocket'], [22500, 'Vandal'], [25000, 'Kleptomaniac']];
            let arrayVirus = [[500, 'Ub3rn00b&nbsp;Hacker'], [1000, 'N00b&nbsp;Hacker'], [1500, '1337n00b&nbsp;Hacker'],
                              [2000, 'Ph34r3dn00b&nbsp;Hacker'], [2500, 'Ph34r3d&nbsp;Hacker'], [3000, 'Ph343d1337&nbsp;Hacker'],
                              [3500, 'Ub3rph34r3d&nbsp;Hacker'], [4000, 'Ub3r&nbsp;Hacker'], [4500, '1337&nbsp;Hacker'],
                              [5000, 'Ub3r1337&nbsp;Hacker'], [5500, 'Key&nbsp;Puncher'], [6000, 'Script&nbsp;Kid'], [7000, 'Geek Speak'], [8000, 'Techie'], [9000, 'Cyber Punk'], [10000, 'Programmer']];
            let arrayMurder = [[1000, 'Beginner&nbsp;Assassin'], [2000, 'Novice&nbsp;Assassin'], [3000, 'Competent&nbsp;Assassin'],
                               [4000, 'Elite&nbsp;Assassin'], [5000, 'Deadly&nbsp;Assassin'], [6000, 'Lethal&nbsp;Assassin'], [7000, 'Fatal&nbsp;Assassin'], [8000, 'Trigger&nbsp;Assassin'], [9000, 'Hit&nbsp;Man'], [10000, 'Executioner']];
            let arrayDrugs = [[250, 'Drug&nbsp;Pusher'], [500, 'Drug&nbsp;Runner'], [1000, 'Drug&nbsp;Dealer'],
                              [2000, 'Drug&nbsp;Lord'], [4000, 'Candy Man'], [6000, 'Connection'], [8000, 'King Pin'], [10000, 'Supplier']];
            let arrayFraud = [[300, 'Fake'], [600, 'Counterfeit'], [900, 'Pretender'], [1200, 'Clandestine'],
                              [1500, 'Imposter'], [2000, 'Pseudo'], [2500, 'Imitation'],
                              [3000, 'Simulated'], [3500, 'Hoax'], [4000, 'Faux'],
                              [5000, 'Poser'], [6000, 'Deception'], [7000, 'Phony'], [8000, 'Parody'], [9000, 'Travesty'], [10000, 'Pyro']];
            let arrayGTA = [[200, 'Gone&nbsp;In&nbsp;300&nbsp;Seconds'], [400, 'Gone&nbsp;In&nbsp;240&nbsp;Seconds'], [600, 'Gone&nbsp;In&nbsp;180&nbsp;Seconds'],
                            [800, 'Gone&nbsp;In&nbsp;120&nbsp;Seconds'], [1000, 'Gone&nbsp;In&nbsp;60&nbsp;Seconds'], [1200, 'Gone&nbsp;In&nbsp;30&nbsp;Seconds'],
                            [1500, 'Gone&nbsp;In&nbsp;45&nbsp;Seconds'], [2000, 'Gone&nbsp;In&nbsp;15&nbsp;Seconds'], [2500, 'Booster'],
                            [3000, 'Joy&nbsp;Rider'], [3500, 'Super&nbsp;Booster'], [4000, 'Master&nbsp;Carjacker'],
                            [4500, 'Slim&nbsp;Jim'], [5000, 'Novice&nbsp;Joy&nbsp;Rider'], [5500, 'Novice&nbsp;Slim&nbsp;Jim'],
                            [6000, 'Professional&nbsp;Joy&nbsp;Rider'], [6500, 'Professional&nbsp;Booster'], [7000, 'Professional&nbsp;Slim&nbsp;Jim'],
                            [8000, 'Master&nbsp;Joy&nbsp;Rider'], [9000, 'Master Booster'], [10000, 'Master Slim Jim']];

            let arrayIllegal = [[5000,'Civil&nbsp;Offence']];
            let arrayOther = [[5000,'Find&nbsp;A&nbsp;Penny,&nbsp;Pick&nbsp;It&nbsp;Up']];
            */

            let arrayCrimes2 = [[100, ''], [200, ''], [300, ''], [500, ''], [750, ''], [1000, ''],
                        [1500, ''], [2000, ''], [2500, ''], [3000, ''], [4000, ''], [5000, ''],
                        [6000, ''], [7500, ''], [10000, '']];

            GM_addStyle(`
                .fr60 {float: right; width:60px;}
                .cdata {font-style:italic; float:right; width:75px; text-align:left}
                .mycdata {font-style:italic; float:left; width:75px; text-align:left}
                .block {display:block;overflow:hidden;}
                .boldred {font-weight:bold; color:red; width:35px; float:right; text-align:left;}
                .myboldred {font-weight:bold; color:red; width:35px; float:left; text-align:left;}
            `);

        // Helper to parse # from an aria-label
        function qtyFromAriaLabel(ariaLabel) {
            // ex. aria-label = "Drug deals: 255"
            let parts = ariaLabel.split(':');
            return Number(parts[1].replace(/,/g, ""));
        }

        function addCrimeToolTip(li, name, crimes, needed, minCost, maxCost) {
            debug("[addCrimeToolTip] crimes: ", crimes, " needed: ", needed, " min: ", minCost, " max: ", maxCost,
                  " (+minCost * +needed): ", (+minCost * +needed), " (+maxCost * +needed): ", (+maxCost * +needed));
            if (name.indexOf("Criminal off") > -1) return;

            let nerveNeeded = (minCost > 0) ? ('<BR>Nerve needed: ' + (+minCost * +needed) + ' min') : null;
            if (nerveNeeded && maxCost > 0)
                nerveNeeded = nerveNeeded + ', ' + (+maxCost * +needed) + ' max';

            let text = '<B>' + name + CRLF + CRLF + '</B>Medals at: <B>' +
                ((crimes >= 100) ? '<font color=green>100, </font>' : '<font color=red>100, </font>') +
                ((crimes >= 200) ? '<font color=green>200, </font>' : '<font color=red>200, </font>') +
                ((crimes >= 300) ? '<font color=green>300, </font>' : '<font color=red>300, </font>') +
                ((crimes >= 500) ? '<font color=green>500, </font>' : '<font color=red>500, </font>') +
                ((crimes >= 750) ? '<font color=green>750, </font>' : '<font color=red>750, </font>') +
                ((crimes >= 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
                ((crimes >= 1500) ? '<font color=green>1500, </font>' : '<font color=red>1500, </font>') +
                ((crimes >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
                ((crimes >= 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
                ((crimes >= 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
                ((crimes >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
                ((crimes >= 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
                ((crimes >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
                ((crimes >= 7500) ? '<font color=green>7500, </font>' : '<font color=red>7500, </font>') +
                ((crimes >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

            if (nerveNeeded) text = text + nerveNeeded;

            displayToolTip(li, text);
        }

        $("div[id^=item]:has(>div.title-black:contains('Criminal Record'))" ).find('li').each(
            function(item){
                let arr = null;
                let type = $(this).children(":first").text().trim();
                let desc = $(this).children(":last").text();
                let n = desc.replace(',','');
                let minCost = 0;
                let maxCost = 0;

                let label = this.innerText;
                let ariaLabel = this.getAttribute('aria-label');
                let crimes = qtyFromAriaLabel(ariaLabel);

                debug('Found crime: ' + type + ' desc: ' + desc + ' n: ' + n + ' aria-label: ' +
                    ariaLabel + ' crimes: ' + crimes);

                switch(type){
                    case 'Vandalism':
                        type += ' (Graffiti, Arson) ';
                        arr = arrayCrimes2;
                        minCost = 3;
                        maxCost = 5;
                        break;
                    case 'Illegal production':
                        type += ' ';
                        arr = arrayCrimes2;
                        break;
                    case 'Theft':
                        type += ' ';
                        arr = arrayCrimes2;
                        minCost = 2;
                        break;
                    case 'Cybercrime':
                        type += ' (Cracking)';
                        arr = arrayCrimes2;
                        minCost = 5;
                        maxCost = 7;
                        break;
                    case 'Counterfeiting':
                        type += ' (Bootlegging)';
                        arr = arrayCrimes2;
                        minCost = 2;
                        break;
                    case 'Fraud':
                        type += ' (Skimming, Hustling)';
                        arr = arrayCrimes2;
                        minCost = 2;
                        maxCost = 6;
                        break;
                    case 'Illicit services':
                        type += ' (Disposal)';
                        arr = arrayCrimes2;
                        minCost = 6;
                        maxCost = 14;
                        break;
                    case 'Extortion':
                        type += ' ';
                        arr = arrayCrimes2;
                        break;
                }
                $(this).children(":first").text(type);

                //addCrimeToolTip(this, type, crimes, minCost, maxCost);

                let needed = 0;
                if (arr != null) {
                    var mink = -1;
                    for (var k=0; k<arr.length; ++k) {
                        if ((mink == -1) && (arr[k][0] > n)) mink = k;
                    }
                    if (mink >= 0) {
                        //desc = '<span class="fr60">'+desc+'</span><span class="cdata block">' + arr[mink][1] +
                        //       '</span><span class="boldred">' + (arr[mink][0] - n) + '</span>';

                        needed = (arr[mink][0] - n);
                        desc = '<span class="fr60">'+desc+'</span><span class="cdata block">' + //arr[mink][1] +
                               '</span><span class="myboldred">Need: ' + needed + '</span>';
                        $(this).children(":last").html(desc);
                        $(this).children(":last").attr('title', desc);
                    }else{
                        $(this).children(":last").css("color","green");
                        $(this).children(":last").html('<span class="fr60">'+desc+'</span><span class="mycdata">Good job!</span>');
                    }
                }


                addCrimeToolTip(this, type, crimes, needed, minCost, maxCost);

            });

            //addCriminalRecordToolTips();

            resolve("[tornCrimeDetails] startup complete!");

        }).catch((error) => {
            log("[tornCrimeDetails] ERROR: ", error);
            rejectDebug(error);
        });

    } // End function tornCrimeDetails() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Travel Alerts" (called on API complete, for inventory)
    //////////////////////////////////////////////////////////////////////////////////

    function tornTravelAlerts() {
        log('[tornTravelAlerts]');

        const alertDiv = `<div id="xedx-alert-div" class="xedx-alert-div">
                             <span class="xedx-salert">Don't forget cash and a Macana!</span>
                         </div>`;

        // API v2 can gt "Torn -> calendar", on Tiger Day, remind about BCT!
        // https://api.torn.com/v2/torn/?selections=calendar&key=

        return new Promise((resolve, reject) => {
            if (abroad()) return rejectDebug('[tornTravelAlerts] not at home!');
            if (!isTravelPage()) return rejectDebug('[tornTravelAlerts] not at Travel Agency!');

            GM_addStyle( `.xedx-alert-div {display: flex; flex-direction: column;}
                          .xedx-salert {color: red; font-size: 18px; margin-left: 260px; width: 300px;
                                        font-weight: bold; margin-top: 10px; margin-bottom: 10px; text-align: center;}`);
            addAlerts();

            //reject('[tornTravelAlerts] not yet implemented!');
            resolve("[tornTravelAlerts] startup complete!");

        }).catch((error) => {
            log("[tornTravelAlerts] ERROR: ", error);
            rejectDebug(error);
            reject("[tornTravelAlerts] failed with an error! See log");
        });

        function addAlerts() {
            log('[tornTravelAlerts] addAlerts');
            //let node = document.querySelector("#tab4-2 > div.travel-map");
            let node = document.querySelector("#travelDestinations");
            log("Node: ", node);
            if (!node) {
                log("Node not found!");
                return setTimeout(addAlerts, 250);
            }

            $(node).before(alertDiv);
            //$(node).after(alertDiv);

            // Note: The 'User->Inventory' API call has been removed, perhaps
            // permanently. This won't work unless a workaround is found.

            //let weapons = inventoryArray.filter(e => {return (e.type == 'Primary' || e.type == 'Secondary' || e.type == 'Melee') && (e.equipped > 0)});
            //let armor = inventoryArray.filter(e => {return (e.type == 'Defensive') && (e.equipped > 0)});
            //debug('[tornTravelAlerts] weapons: ', weapons, ' armor: ', armor);
            //if (!weapons.length || !armor.length) {
            //    $(".xedx-salert").after("<span class='xedx-salert' style='margin-top: 0px;'>You seem to be kinda naked!</span>");
            //}
        }

    } // End function tornTravelAlerts() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Home Page Alerts" (called on load complete)
    //////////////////////////////////////////////////////////////////////////////////

    function tornHomepageLinks() {
        log('[tornHomepageLinks]');

        return new Promise((resolve, reject) => {
            if (abroad()) {
                log('[tornHomepageLinks] not at home!');
                return resolve('[tornHomepageLinks] not at home!');
            }

            log("tornHomepageLinks, user-money: ", $("#user-money"));

            $("#user-money").on('click', function() {
                location.href = "https://www.torn.com/properties.php#/p=options&tab=vault";
            });

            $("#user-money").attr('style', 'cursor: pointer;');

            //reject('[tornHomepageLinks] not yet implemented!');
            resolve("[tornHomepageLinks] startup complete!");
        }).catch((error) => {
            let msg = "[tornHomepageLinks] ERROR: " + error;
            log(msg);
            rejectDebug(msg);
        });

    } // End function tornHomepageLinks() {

    function removeHomePageLinks() {$("#user-money").off('click');}

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Script Template" (called on ???)
    //////////////////////////////////////////////////////////////////////////////////

    function tornScriptTemplate() {
        log('[tornScriptTemplate]');

        return new Promise((resolve, reject) => {
            if (abroad()) return rejectDebug('[tornScriptTemplate] not at home!');

            rejectDebug('[tornScriptTemplate] not yet implemented!');
            //resolve("[tornScriptTemplate] startup complete!");
        }).catch((error) => {
            log("[tornScriptTemplate] ERROR: ", error);
            rejectDebug(error);
        });

    } // End function tornScriptTemplate() {

    ///////////////////////////////////////////////////////////////////////////////////
    //
    // Tool tip functions, return the text to be displayed
    //
    ///////////////////////////////////////////////////////////////////////////////////

    // Testing
    function generalToolTip(name) {
        return `This is a really generic Tool Tip for "${name}", to be replaced at a later date...`;
    }

    function attacksExtenderTt() {
        return "Adds a dialog that displays up to the latest 100 " +
            "attacks, along with attacker, defender, faction, and respect. " +
            "Date and time format are configurable, and is linked to the attack log.";
    }

    function statTrackerTt() {
        return "Adds a dialog to the home page to track almost any " +
            "personal stat you'd like. The stats to watch can be added via " +
            "a configuration menu.";
    }

    function facRespectTt() {
        return "Adds personal faction respect earned to the home page " +
            "'Faction Information' section, and installs a tool tip to " +
            "follow your award progress.";
    }

    function drugStatsTt() {
        return "Adds drug usage statistics to the home page. " +
            "Shows the amount taken, overdoses, rehabs, as " +
            "well as installing tool tips for each with drug details " +
            "such as OD %, effects, and addiction points added.";
    }

    function hyperLinksTt() {
        return "Makes may stats on the homepage be 'clickable', taking you to the corresponding " +
            "personal stats page for that stat.";
    }

    function hideShowChatTt() {
        return "Adds an option to the sidebar to hide the chat icons, and then re-diplay them";
    }

    function museumSetTT() {
        return "Highlights items on the items page " +
               "that are part of full sets, lets you know " +
               "what is missing, and how much you can gain " +
               "from selling them. " +
               "You can change the highlight colors via the" +
               "'storage' tab in TM, I will at some point make " +
               "a friendly option editor.";
    }

    function jailStatsTt() {
        return "Adds jail and bounty statistics to the home page. " +
            "Shows the amounts, as installing tool tips for each with " +
            "progress towards any merits.";
    }

    function sidebarColorTt() {
        return "Just for fun, adds color to the icons on the sidebar.";
    }

    function ttFilterTt() {
        return "This hides various Torn Tools features that I find redundant or annoying. " +
            "It hides the 'TornTools Active' icon on the lower left, the 'last active' status on " +
            "various fac pages, and the Bat Stats estimates showing up underneath users on various pages.";
    }

    function travelAlertTt() {
        return "This simply warns you on the travel page to carry some $$ and stealth weapons.";
    }

    ///////////////////////////////////////////////////////////////////////////////////
    //
    // Install general configuration menu for this script
    //
    // Install the only UI portion (general configuration menu) for the main script.
    // Adds a link to an HTML options page.
    // Currently, underneath the indicator of which server we're connected to.
    //
    ///////////////////////////////////////////////////////////////////////////////////

    // Supported sub-scripts. Array used by config pages to trigger dynamic updates, in liveScriptUpdateHandler()
    const knownScripts = []; // Now built dynamically

    // Additional data read from storage
    const opts_enabledScripts = {};
    var general_intervalTimer = null;
    var general_configWindow = null;
    var configMaxRetries = 40;
    var configRetries = 0;

    // Adds the "Powered by: XedX" menu link TBD: update tool tip style.
    // On mobile, the div we append to may not exist...can put after this node, on settings menu
    const settingsSel = "#topHeaderBanner > div.header-wrapper-top > div > div.header-navigation.right > div > ul > li.avatar > ul.settings-menu";

    function installConfigMenu() {
        let usingMobileMenu  = false;
        if ($('#xedx-opts')[0]) return;

        GM_addStyle(`
            .xedx-tts-span {line-height: 12px; margin-left: 10px;}
            .powered-by {color: var(--default-blue-color); text-decoration: none; cursor: pointer;}
            .xedx-mobile {color: #74c0fc !important; line-height: 33px !important; cursor: pointer; margin-left: 25px;}
        `);

        let cfgSpan = '<div class="xedx-tts-span"><span> Enhanced By: </span><a class="powered-by" id="xedx-opts">XedX [2100735]</a></div>';
        let mobileCfgSpan = '<div class="xedx-tts-span"><a class="xedx-mobile" id="xedx-opts">TTS Options</a></div>';
        let serverDiv = document.querySelectorAll('[class^="footer-menu"]')[0];

        if (!serverDiv || serverDiv.length == 0) {
            if (configRetries++ > configMaxRetries) {
                log("Unable to add config link, footer div not found!");
                configRetries = 0;
                return;
            }
            debug("Didn't find settings div, retrying...");
            return setTimeout(installConfigMenu, 100);
        }
        configRetries = 0;

        // Experiment: load locally, don't need my server
        $(serverDiv).append(usingMobileMenu ? mobileCfgSpan : cfgSpan);

        $("#nav-ttsOpts").on('click', function() { $("#xedx-opts").trigger('click'); });
        $("#xedx-opts").on('click', function() {
            log('[handleTtsOptionsClick]');

            if (!useLocalCfgPage || useLocalCfgPage == false) {
                let useUrl = tornTotalSolutionCfgURL;
                let useAltCfgFile = GM_getValue("useAltCfgFile", false);
                if (useAltCfgFile == true)
                    useUrl = tornTotalSolutionCfgURLAlt;
                log("URL: ", useUrl);
                general_configWindow = window.open(useUrl);
            } else {
                log("*** Opening local configuration page");
                // Would need the .css used to be here locally as well....
                openTTSConfigWebPage();
            }

            if (!general_intervalTimer) {
                debug('[handleTtsOptionsClick] starting interval timer.');
                general_intervalTimer = setInterval(checkGeneralSaveButton, 2000);
            }
        });

        // Add tool tip. Note - this style isn't so good for this tip....
        // Too wide, should be centered.
        addToolTipStyle();
        displayMiniToolTip(document.getElementById("xedx-opts"), "Click to configure!");
    }

    function openTTSConfigWebPage() {

        general_configWindow = window.open();

        // Page blocked by security policy??? Popup-blocker???
        if (!general_configWindow) {
            log("Failed to open configuration window!");
        } else {
            log("writing config page to doc: ", general_configWindow.document);
            general_configWindow.document.write(getConfigWebPage());
            general_configWindow.document.close();
        }

        //x.close();

    }

    function initDebugOptions() {
        loggingEnabled = GM_getValue('dbgopts-logging', true);
        debugLoggingEnabled = GM_getValue('dbgopts-dbglogging', false);
        alertOnError = GM_getValue("dbgopts-alertonerror", false);
        alertOnRetry = GM_getValue("alertOnRetry", false);

        let savedSize = maxApiCalls;
        maxApiCalls = GM_getValue("api-call-log-size", maxApiCalls);
        if (maxApiCalls != savedSize) {
            pruneApiCalLog();
        }

        GM_setValue('dbgopts-logging', loggingEnabled);
        GM_setValue('dbgopts-dbglogging', debugLoggingEnabled);
        GM_getValue("dbgopts-alertonerror", alertOnError);
        GM_setValue("api-call-log-size", maxApiCalls);
        GM_setValue("alertOnRetry", alertOnRetry);

        log('[initDebugOptions] loggingEnabled: ', loggingEnabled);
        log('[initDebugOptions] debugLoggingEnabled: ', debugLoggingEnabled);
        log('[initDebugOptions] alertonerror: ', alertOnError);
        log('[initDebugOptions] alertOnRetry: ', alertOnRetry);
    }

    function checkGeneralSaveButton() {
        let data = GM_getValue("general-config");
        debug('[checkGeneralSaveButton] data: ', data);

        if (data == 'saved') {
            log('Save button has been pressed!');

            clearInterval(general_intervalTimer);
            general_intervalTimer = null;
            GM_setValue("general-config", '');

            try {
                liveScriptUpdateHandler(); // Update live, what we can (only supported by certain scripts)
            } catch(e) {
                log('ERROR in [liveScriptUpdateHandler]: ', e);
            }

            updateKnownScripts();      // General opts (which scripts to run)
            updateSidebarLinksCfg();   // Custom for "Customizable Sidebar Links"

            // Read debug options
            initDebugOptions();

            if (general_configWindow && !general_configWindow.closed) general_intervalTimer = setInterval(checkGeneralSaveButton, 2000);
        }

        debug('Config win (HTML page): ', general_configWindow, (general_configWindow ? general_configWindow.closed : 'no window'));
        if (general_configWindow && general_configWindow.closed) {
            general_configWindow = null;
            clearInterval(general_intervalTimer);
        }

        function liveScriptUpdateHandler() {
            log('[liveScriptUpdateHandler]');

            debug('[liveScriptUpdateHandler] opts_enabledScripts', opts_enabledScripts);
            debug('[liveScriptUpdateHandler] knownScripts', knownScripts);

            for (let i=0; i<knownScripts.length; i++) {
                let script = knownScripts[i];
                let enabled = GM_getValue(script);
                debug('[liveScriptUpdateHandler] script ', script, 'enabled: ',
                      opts_enabledScripts[script].enabled, 'gm_enabled: ', GM_getValue(script));

                if (opts_enabledScripts[script].enabled != enabled) {
                    let enableFn = opts_enabledScripts[script].enableFn;
                    let disableFn = opts_enabledScripts[script].disableFn;
                    debug('[liveScriptUpdateHandler] enableFn: ', enableFn);
                    debug('[liveScriptUpdateHandler] disableFn: ', disableFn);
                    if (enabled && enableFn) { // storage has been set (by opts page) - but may not be enabled live.
                        debug('[liveScriptUpdateHandler] enabling ' + script);
                        try {
                            enableFn();
                        } catch (e) {
                            log('[ERROR] error enabling ', script, ' err: ', e);
                        }
                    };
                    if (!enabled && disableFn) {
                        debug('[liveScriptUpdateHandler] disabling ' + script);
                        try {
                            disableFn();
                        } catch (e) {
                            log('[ERROR] error disabling ', script, ' err: ', e);
                        }
                    }
                }
            }
        }

        function updateSidebarLinksCfg() {
            // Save 'link-clickable' ("Customizable Sidebar") opts also...
        }
    }

    // Creates opts_enabledScripts {name: {enabled: bool, desc: str, enableFn: fn, disableFn: fn, cat: str}, ...}
    // Add any new subscripts here!
    function updateKnownScripts() {

        // TBD: Add 'toolTipFn', returns tool tip text.
        // Store in diff file, import.
        // If exists, add tool tip to <tr> for script.
        // Alternatively, document on new page or iFrame? Have URL (HTML) on my site? With help (? mark) button?

        function setGeneralCfgOpt(name, desc, enableFn=null, disableFn=null, ttFn=null, cat='default', valid=true, enabled=true) {
            if (!knownScripts.includes(name)) knownScripts.push(name);
            if (!valid) enabled = false;
            opts_enabledScripts[name] = {enabled: GM_getValue(name, enabled), installed: valid, name: desc,
                                         enableFn: enableFn, disableFn: disableFn, ttFn: ttFn, cat: cat};
            GM_setValue(name, opts_enabledScripts[name].enabled);

            debug('[setGeneralCfgOpt] name: ', name);
            debug('[setGeneralCfgOpt] saved: ', GM_getValue(name));
        }

        // HOME/ALL: @match        https://www.torn.com/*
        setGeneralCfgOpt("latestAttacks", "Torn Latest Attacks Extender",
                         tornLatestAttacksExtender, removeLatestAttacksExtender, attacksExtenderTt, "home");
        setGeneralCfgOpt("statTracker", "Torn Custom Stat Tracker",
                         tornStatTracker, removeTornStatTracker, statTrackerTt, "home");
        setGeneralCfgOpt("drugStats", "Torn Drug Stats",
                         tornDrugStats, removeDrugStats, drugStatsTt, "home");
        setGeneralCfgOpt("facRespect", "Torn Fac Respect Earned",
                         tornFacRespect, removeTornFacRespect, facRespectTt, "home");
        setGeneralCfgOpt("jailStats", "Torn Jail Stats",
                         tornJailStats, removeJailStats, jailStatsTt, "home");
        setGeneralCfgOpt("statHyperLinks", "Torn Stat Hyperlinks",
                         null, dummyFn, hyperLinksTt, "home");

        setGeneralCfgOpt("sidebarColors", "Torn Sidebar Colors",
                         tornSidebarColors, removeSidebarColors, sidebarColorTt, 'all');
        setGeneralCfgOpt("tornHomepageLinks", "Torn Home Page Links",
                         tornHomepageLinks, removeHomePageLinks, generalToolTip, 'all');

        setGeneralCfgOpt("hideShowChat", "Torn Hide-Show Chat Icons",
                         tornHideShowChat, removeHideShowChat, hideShowChatTt, 'all');

        setGeneralCfgOpt("customizableSidebar", "Torn Customizable Sidebar Links",
                         tornCustomizableSidebar, removeCustomizableSidebar, generalToolTip, 'all');
        setGeneralCfgOpt("tornTTFilter", "Torn TT Filter",
                         tornTTFilter, null, ttFilterTt, "all", true);
        setGeneralCfgOpt("tornCrimeDetails", "Torn Criminal Record Details",
                         tornCrimeDetails, null, generalToolTip, "home");

        // BAZAAR (and shops)
        setGeneralCfgOpt("tornBazaarPlus", "Torn Bazaar Pricing, Plus!",
                         tornBazaarPlus, removeBazaarPlus, generalToolTip, "items");
        setGeneralCfgOpt("tornBazaarAddButton", "Torn Bazaar 'Add Items' Button",
                         tornBazaarAddButton, removeBazaarAddButton, generalToolTip, "items");

        // ITEMS: @match        https://www.torn.com/items.php*
        setGeneralCfgOpt("tornItemHints", "Torn Item Hints",
                         tornItemHints, null, generalToolTip, "items");
        setGeneralCfgOpt("tornMuseumSetHelper", "Torn Museum Sets Helper",
                         tornMuseumSetHelper, null, museumSetTT, "items");
        setGeneralCfgOpt("tornWeaponSort", "Torn Weapon Sort Options",
                         tornWeaponSort, null, generalToolTip, "items");
        setGeneralCfgOpt("tornWeTracker", "Torn Weapon Experience Tracker",
                         tornWeTracker, null, generalToolTip, "items");
        setGeneralCfgOpt("tornWeSpreadsheet", "Torn Weapon Experience Spreadsheet",
                         tornWeSpreadsheet, removeWeSpreadsheet, generalToolTip, "items");

        // ATTACKS: @match        https://www.torn.com/loader.php?sid=attack&user2ID*
        setGeneralCfgOpt("tornSeeTheTemps", "Torn See The Temps",
                         tornSeeTheTemps, null, generalToolTip, "attack");
        setGeneralCfgOpt("tornScrollOnAttack", "Torn Scroll Attack Window",
                         tornScrollOnAttack, null, generalToolTip, "attack");

        // RACING: @match        https://www.torn.com/loader.php?sid=racing
        setGeneralCfgOpt("tornRacingAlert", "Torn Racing Alerts",
                         tornRacingAlert, removetornRacingAlert, generalToolTip, 'racing', true);
        setGeneralCfgOpt("tornRacingCarOrder", "Torn Racing Car Order",
                         tornRacingCarOrder, null, generalToolTip, "racing", true, false);
        setGeneralCfgOpt("tornRacingStyles", "Torn Racing Styles",
                         tornRacingStyles, null, generalToolTip, "racing", true);

        // CASINO:
        setGeneralCfgOpt("tornHoldemScore", "Torn Texas Holdem Score",
                         tornHoldemScore, null, generalToolTip, "casino", false);

        // STOCKS: @match        https://www.torn.com/page.php?sid=stocks
        setGeneralCfgOpt("tornStockProfits", "Torn Stock Profits",
                         tornStockProfits, null, generalToolTip, "stocks");

        // JAIL:  @match        https://www.torn.com/jailview.php*
        setGeneralCfgOpt("tornJailScores", "Torn Jail Scores",
                         tornJailScores, null, generalToolTip, "jail", false);

        // FACTION: @match        https://www.torn.com/factions.php?step=your*
        setGeneralCfgOpt("tornFacPageSearch", "Torn Fac Page Search",
                         tornFacPageSearch, removeFacPageSearch, generalToolTip, "faction");

        // GYM: @match        https://www.torn.com/gym.php*
        setGeneralCfgOpt("tornGymGains", "Torn Gym Gains",
                         tornGymGains, removeTornGymGains, generalToolTip, "gym", false, false);

        // POINTS:  @match        https://www.torn.com/points.php*
        // https://www.torn.com/page.php?sid=points (changed 04/02/2024)
        setGeneralCfgOpt("tornDisableRefills", "Torn Point Refill Safety Net",
                         tornDisableRefills, removeDisableRefills, generalToolTip, "misc");

        // MATCH: *userlist* case-insensitive.
        setGeneralCfgOpt("tornUserList", "Torn User List Extender",
                         tornUserList, removeUserList, generalToolTip, "misc", true);

        setGeneralCfgOpt("tornOverseasRank", "Torn Overseas Rank Indicator",
                         tornOverseasRank, null, generalToolTip, "misc", true);

        setGeneralCfgOpt("tornAmmoMods", "Torn Ammo & Mods Links",
                         tornAmmoMods, null, generalToolTip, "misc", true, true);

        setGeneralCfgOpt("tornCompanyEmployees", "Torn Company Employees",
                         tornCompanyEmployees, null, generalToolTip, "misc", true, true);

        setGeneralCfgOpt("tornTravelAlerts", "Torn Travel Alerts",
                         tornTravelAlerts, null, travelAlertTt, "misc", true, true);

        debug('[updateKnownScripts] opts_enabledScripts: ', opts_enabledScripts);
    }

    ///////////////////////////////////////////////////////////////////////////////////
    // Portion of script run when on General config page
    ///////////////////////////////////////////////////////////////////////////////////

    // Each options table's header will collapse/expand the table.
    function optsHdrClick(ev) {
        log('[OptsHdrClick] ev: ', ev);

        let target = ev.currentTarget;
        let tbody = ev.currentTarget.parentNode;
        let tRows = tbody.getElementsByTagName('tr');
        let wasHidden = false;

        let tblHdr = tRows[0];
        if ($(tblHdr).hasClass('open')) {
            $(tblHdr).addClass('closed').removeClass('open');
        } else {
            $(tblHdr).addClass('open').removeClass('closed');
        }

        Array.from(tRows).forEach(function(rowNode) {
            if (!rowNode.classList.contains('xtblehdr')) { // Don't hide the header
                if (!rowNode.classList.contains('xvisible')) { // Is hidden, so display.
                    if (!rowNode.classList.contains('xexpand')) wasHidden = true;
                    $(rowNode).addClass('xvisible').removeClass('xhidden');
                    $(rowNode).attr('style', $(rowNode).attr('oldstyle'));
                } else {  // Is visible, hide.
                    $(rowNode).addClass('xhidden').removeClass('xvisible');
                }
            }
        });
    }


    // Empty fn to use in the enabled scripts definitions, to prevent the "requires restart" message
    function dummyFn() {}

    var catColors = {
        "items":   "#DAA520", // GoldenRod
        "gym":     "#00FFFF", // Cyan
        'all':     "#F0F8FF", // AliceBlue
        'home':    "#FFFFF0", // Ivory
        'casino':  "#90EE90", // LightGreen
        'attack':  "#F08080", // LightCoral
         //"#CD5C5C"; // IndianRed
        'racing':  "#7FFFD4", // Aquamarine
        'jail':    "#DC143C", // Crimson
        'faction': "#FF8C00", // DarkOrange
        'misc':    "#D8BFD8", // Thistle
        'default': "#FFE4C4", // Bisque
    };

    function getBgColor(category) { return catColors[category] ?? catColors["default"]; }

    function handleGeneralConfigPage() {
        log('[handleGeneralConfigPage]');

        // Could replace serv-side html with local for testing...
        let useLocalPg = true;
        let newPage = getConfigWebPage();
        //log('[handleGeneralConfigPage] new page: ', $(newPage));

        if (useLocalPg == true) {
            $('body').html(newPage);
            var fixedElementHeight = $(".hdr-wrap").outerHeight(); // Get the height of the fixed element
            $(".outer-scroll").css("margin-top", (parseInt(fixedElementHeight) + 30) + "px");
        }

        addToolTipStyle();
        GM_addStyle( `.dbg-clickable { margin-right: 10px; width: 14px; }` );

        // TBD: Migrate all (most) to general table. See the addDebugStyle() fn

        // Main menu: supported scripts
        addSupportedScriptsTable();

        // Add the debug menu
        addDebugMenu();

        // Add the cache menu
        addCacheMenu();

        // Add customizable sidebar links table
        addCustLinksTable();

        // Add the API Calls table, for diagnostics
        addApiCallsTable();

        // Install handlers
        $('#save-opts-btn').on('click', handleGenOptsSaveButton); // General 'Save' button handler
        $(".xtblehdr").on('click', optsHdrClick);
        $(".xexpand").on('click', optsHdrClick);

        // Scroll to given hash, if any.
        let hash = location.hash;
        scrollTo(hash);

        // Helper to build the supported scripts table.
        function addSupportedScriptsTable() {
            // Add header
            const tblHdr = `<tr class="xtblehdr xvisible open"><th colspan=3;>Enabled Scripts</th></tr>`;
            $('#xedx-table').append(tblHdr);

            // Insert table rows (general opts, which scripts are supported)
            let html = '';
            let keys = Object.keys(opts_enabledScripts);
            for (let i=0; i < keys.length; i++) {
                let scriptName = keys[i]; // eg, 'drugstats'
                addGenOptsTableRow(scriptName, i);
            }

            // Add footer
            const expHdr = `<tr class="xexpand xhidden"><th colspan=3;>...click to expand</th></tr>`;
            $('#xedx-table').append(expHdr);

            $(".hasTt").tooltip({
                content: function() {
                    let scriptName = $(this).attr("data-name");
                    let ttText = opts_enabledScripts[scriptName].ttFn(opts_enabledScripts[scriptName].name);
                    $("#tootlTipArea").text(ttText);
                    $("#tootlTipArea").css("visibility", "visible");
                    return "";
                },
                close: function(event, ui) {     // never gets called...
                    //$("#tootlTipArea").text("");
                    //$("#tootlTipArea").css("visibility", "hidden");
                }
            });

            $('tbody').on('mouseleave', function() {
                $("#tootlTipArea").text("");
                $("#tootlTipArea").css("visibility", "hidden");
            });

            // Install handlers ... general opts (which scripts to support)
            let checkboxes = document.getElementsByClassName('gen-clickable');
            for (let i=0; i<checkboxes.length; i++) {
                checkboxes[i].addEventListener('click', genOptsClickHandler);
            }

            // Build and add a Gen opts script row
            function addGenOptsTableRow(scriptName, rowNum) {
                let rowTextColor = (typeof(opts_enabledScripts[scriptName].enableFn) == "function") ? 'black;' : 'red;';
                let bgColor = getBgColor(opts_enabledScripts[scriptName].cat);
                let id = "ttsRow" + rowNum;
                let addlText = !opts_enabledScripts[scriptName].installed ? ' (TBD)' :
                    (typeof(opts_enabledScripts[scriptName].disableFn) == "function") ? '' : ' (change requires refresh)';

                /* To change text color:
                let newRow = '<tr style="background-color: ' + bgColor + ';"><td><input type="checkbox" class="gen-clickable" name="' + scriptName + '"' +
                    (opts_enabledScripts[scriptName].enabled ? ' checked ': '') + ' /></td>' +
                    '<td style="color: ' + rowTextColor + '; border-color: black;">' + opts_enabledScripts[scriptName].name + '</td>' +
                    '<td>' + opts_enabledScripts[scriptName].cat + '</td></tr>';
                */

                // To change text desc:
                //let newRow = '<tr class="xvisible" style="background-color: ' + bgColor + ';" id="' + id + '" title="original">' +
                let ck = (opts_enabledScripts[scriptName].enabled ? ' checked ': '');
                let newRow = `<tr class="xvisible" style="background-color: ${bgColor};" id="${id}">
                    <td><input type="checkbox" style="margin-right: 10px; width: 14px;" class="gen-clickable" name="${scriptName}"
                    ${ck} /></td><td>${opts_enabledScripts[scriptName].name} ${addlText}</td>
                    <td>${opts_enabledScripts[scriptName].cat}</td></tr>`;


                $('#xedx-table').append(newRow);

                // Add general tool tip - gettext from fn.
                //debug('[[handleGeneralConfigPage]] ttFn: ', opts_enabledScripts[scriptName].ttFn);
                if (opts_enabledScripts[scriptName].ttFn) {
                    let ttText = opts_enabledScripts[scriptName].ttFn(opts_enabledScripts[scriptName].name);
                    let node = document.getElementById(id);

                    //displayHtmlToolTip(node, ttText, "ttsOptsTooltip");
                    $(node).addClass("hasTt");
                    $(node).attr("data-name", scriptName);
                    $(node).attr("title", "original");
                    $(node).attr("data-html", "true");

                    if (true == false) {
                        $(".hasTt").tooltip({
                            // Set the content option to a function
                            content: function() {
                                log("Tooltip triggered!");
                                // Get the original title attribute of the hovered element
                                // var originalTitle = $(this).attr("title");
                                // Update the text of the target span
                                $("#hdr-msg").text(ttText);
                                return "";
                            },
                            // Add a close event to clear the span when the mouse leaves
                            close: function(event, ui) {
                                $("#hdr-msg").text("");
                            }
                        });
                    }
                }

            /*
            function getBgColor(category) {
                switch (category) {
                    case "items":
                        return "#DAA520"; // GoldenRod
                    case "gym":
                        return "#00FFFF"; // Cyan
                    case 'all':
                        return "#F0F8FF"; // AliceBlue
                    case 'home':
                        return "#FFFFF0"; // Ivory
                    case 'casino':
                        return "#90EE90"; // LightGreen
                    case 'attack':
                        return "#F08080"; // LightCoral //"#CD5C5C"; // IndianRed
                    case 'racing':
                        return "#7FFFD4"; // Aquamarine
                    case 'jail':
                        return "#DC143C"; // Crimson
                    case 'faction':
                        return "#FF8C00"; // DarkOrange
                    case 'misc':
                        return "#D8BFD8"; // Thistle
                    default:
                        return "#FFE4C4"; // Bisque
                }
            }
            */

            }

            // Gen opts script selected handler, save to storage
            function genOptsClickHandler(ev) {
                log('[genOptsClickHandler] taget: ', ev.target.name, ' enabled: ', ev.target.checked);
                GM_setValue(ev.target.name, ev.target.checked);
                setOptsModified();
            }
        }

        // Helper to build the debug opts menu. TBD: add opts to save values!!!!
        function addDebugMenu() {
            debug('[addDebugMenu]');
            let dbgOpts = [
                    { id: "dbgopts-logging", type: "cb", def: true, desc: "Enable Logging" },
                    { id: "dbgopts-dbglogging", type: "cb", def: false, desc: "Enable Debug Only Logging" },
                    { id: "dbgopts-alertonerror", type: "cb", def: false, desc: "Alert on API errors" },
                    { id: "api-call-log-size", type: "number", min: 1, max: 200, def: maxApiCalls,
                      desc: "API Call Log Size (default 10)" },
                ];
            let tbody = $("#debug-opts-div > table > tbody");
            const tblHdr = `<tr id="dbgtblhdr" class="xtblehdr xvisible open"><th>Value</th><th>Debug Option</th></tr>`;
            $(tbody).append(tblHdr);

            // Add rows
            log("Adding dbg rows: ", $(dbgOpts).length);
            dbgOpts.forEach(entry => {
                let row = '';
                log("Add entry: ", entry);
                switch (entry.type) {
                    case "cb": {
                        let checked = (GM_getValue(entry.id, entry.def) == true) ? 'checked' : '';
                        row = `<tr class="xvisible defbg"><td>
                                   <input type="checkbox" style="margin-right: 10px; width: 14px;" class="dbg-clickable"
                                        id="${entry.id}"  ${checked} /></td><td>${entry.desc}
                               </td></tr>`;
                        $(tbody).append(row);
                        break;
                    }
                    case "number": {
                        let val = GM_getValue(entry.id, entry.def);
                        row = `<tr class="xvisible defbg">
                                   <td><input class="dbg-opt" type="number" id="${entry.id}"
                                   name="${entry.id}" min="${entry.min}" max="${entry.max}" value="${val}"/></td>
                               <td>${entry.desc}</td></tr>`;
                        $(tbody).append(row);
                        break;
                    }
                    default: {
                        log("Error: unknown type");
                        break;
                    }
                }
            });

            // Add footer
            const expHdr = `<tr class="xexpand"><th colspan=2;>...click to expand</th></tr>`;
            $(tbody).append(expHdr);

            // Handler for any debug option change: set flag to implement 'on the other side'
            $(".dbg-clickable").on('click', handleDbgOptClick);
            $(".dbg-opt").on('input', handleDbgOptSet);

            // Default collapsed
            optsHdrClick({currentTarget: document.querySelector("#dbgtblhdr")});

            function handleDbgOptClick(ev) {
                let size = $('#api-call-log-size').value;
                GM_setValue(ev.currentTarget.id,$("#" + ev.currentTarget.id).prop("checked"));
                setOptsModified();
            }

             function handleDbgOptSet(ev) {
                 GM_setValue(ev.currentTarget.id, $("#" + ev.currentTarget.id).val());
                 setOptsModified();
                 initDebugOptions();
            }
            log("Done with dbg opts");
        }

        // Helper to build the cache opts menu. TBD: add opts to save values!!!!
        function addCacheMenu() {
            //debug('[addCacheMenu]');
            let tbody = document.querySelector("#cache-opts-div > table > tbody");
            // Add header
            const tblHdr = '<tr id="cachetblhdr" class="xtblehdr xvisible open"><th>Value</th><th>Caching Option</th></tr>';
            $(tbody).append(tblHdr);

            // Add rows
            let cacheMins = GM_getValue("userlist-cache-time", 5);
            let newRow = '<tr class="xvisible defbg">' +
                '<td><input type="number" class="cache-opts" id="userlist-cache-time" name="user" min="1" max="300" value="' + cacheMins + '"/></td>' +
                '<td>User List Max Cache Time, minutes (default 5)</td></tr>';
            $(tbody).append(newRow);

            cacheMins = GM_getValue("abroadrank-cache-time", 30);
            newRow = '<tr class="xvisible defbg">' +
                '<td><input type="number" class="cache-opts" id="abroadrank-cache-time" name="rank" min="1" max="300" value="' + cacheMins + '"/></td>' +
                '<td>Overseas Rank Max Cache Time, minutes (default 30)</td></tr>';
            $(tbody).append(newRow);

            // Add footer
            const expHdr = `<tr class="xexpand"><th colspan=2;>...click to expand</th></tr>`;
            $(tbody).append(expHdr);

            // Handler for any cache option change: set flag to implement 'on the other side'
            $(".cache-opts").on('input', handleCacheOptChange);

            // Default collapsed
            optsHdrClick({currentTarget: document.querySelector("#cachetblhdr")});

            // TBD: add opts to save values!!!!
            function handleCacheOptChange(ev) {
                //debug('[handleCacheOptChange]');
                //debug('[handleCacheOptChange] id: ', ev.currentTarget.id);
                //debug('[handleCacheOptChange] ev: ', ev);
                //debug('[handleCacheOptChange] ' + $(ev.currentTarget).attr('name') + ' cache val: ',
                //      $("#" + ev.currentTarget.id).val());
                GM_setValue(ev.currentTarget.id, $("#" + ev.currentTarget.id).val());
                setOptsModified();
            }
        }

        // Helper to build the table of API calls made,.
        // GM_setValue('call_log_updated', true);
        function addApiCallsTable() {
            //debug('[addApiCallsTable]');
            let tbody = document.querySelector("#api-usage-div > table > tbody");
            // Add header
            const tblHdr = `<tr id="apiCallstblhdr" class="xtblehdr xvisible open"><th colspan=2>API Calls</th></tr>`;
            //const tblHdr = `<th id="apiCallstblhdr" class="xtblehdr xvisible open" colspan=2>API Calls</th>`;
            $(tbody).append(tblHdr);

            // Add footer
            const expHdr = `<tr class="xexpand lastrow"><th colspan=2>...click to expand</th></tr>`;
            //const expHdr = `<th class="xexpand" colspan=2>...click to expand</th>`;
            $(tbody).append(expHdr);

            // Add rows
            addApiTableRows();

            // Default collapsed
            optsHdrClick({currentTarget: document.querySelector("#apiCallstblhdr")});

            // Add handlers
            $('#api-calls-clear').on('click', function() {clearApiLog(); clearApiTableRows()});

            // Check for new calls every second
            setInterval(checkApiTableChanged, 1000);

            function checkApiTableChanged() {
                let changed = GM_getValue('call_log_updated', false);
                let visible = $('#apiCallstblhdr').hasClass('open');
                //log('[checkApiTableChanged] ', changed, visible);

                if (changed && visible) {
                    refreshApiTableRows();
                    GM_setValue('call_log_updated', false);
                }
            }

            function refreshApiTableRows() {
                //debug('[refreshApiTableRows]');
                clearApiTableRows();
                addApiTableRows();
            }

            function clearApiTableRows() {
                //debug('[clearApiTableRows]');
                $("#api-usage-body tr.bodyrow").remove();
            }

            function addApiTableRows() {
                // Add rows
                loadApiCallLog();
                //debug('[addApiTableRows] log: ', apiCallLog);
                let keys = Object.keys(apiCallLog);
                for (let i=0; i<keys.length; i++) {
                    let timestamp = keys[i];
                    let call = apiCallLog[keys[i]];
                    let newRow = '<tr class="xvisible defbg bodyrow"><td>' + timestamp + '</td><td>' + call + '</td></tr>';
                    $("#api-usage-body tr.lastrow").before(newRow);
                }
            }
        }

        // Helper to build the custom links table
        function addCustLinksTable() {
            //debug('[fillCustLinksTable]');
            GM_addStyle(`.ctr-input {text-align: center;}`);

            initCustLinksObject(); // Fills object from storage

            // Table header
            let tBody = $('#xedx-links-table-body');
            const tblHdr = `<tr id="custLinksHdr" class="xtblehdr xvisible open"><th>Enabled</th><th>Name</th><th>Address</th><th>Parent (optional)</th></tr>`;
            $(tBody).append(tblHdr);

            // Clear table and re-create.
            let tRows = tBody[0].getElementsByTagName('tr');
            Array.from(tRows).forEach(function(element) {if (!element.classList.contains('xtblehdr')) $(element).remove()});

            let allKeys = GM_listValues();
            for (let i=0; i<allKeys.length; i++) {
                let key = allKeys[i];
                if (key.indexOf('custlink-') == -1) continue;
                let data = JSON.parse(GM_getValue(key));
                //debug('[fillCustLinksTable] build row: ', data);

                let custom = data.cust
                let newRow = '';
                if (custom) {
                    newRow = '<tr' + (data.cust ? ' data-type="cust"' : '') +
                        ' class="defbg xvisible"><td><input type="checkbox" class="link-clickable"' +
                        (data.enabled ? ' checked ' : '')  + '/></td>' +
                        '<td data-type="desc"><input class="ctr-input" type="string" value="' + data.desc + '"></td>' +
                        '<td data-type="link"><input class="ctr-input" type="string" value="' + data.link + '"></td>' +
                        '<td data-type="cat"><input class="ctr-input" type="string" value="' + data.cat + '"></td></tr>';
                } else {
                    newRow = '<tr' + (data.cust ? ' data-type="cust"' : '') +
                        ' class="defbg xvisible"><td><input type="checkbox" class="link-clickable"' +
                        (data.enabled ? ' checked ' : '')  + '/></td>' +
                        '<td data-type="desc">' + data.desc + '</td><td data-type="link">' + data.link +
                        '</td><td data-type="cat">' + data.cat + '</td></tr>';
                }
                $(newRow).appendTo(tBody);
            }

            // Add footer
            const expHdr = `<tr class="xexpand"><th colspan=4;>...click to expand</th></tr>`;
            $(tBody).append(expHdr);

            // Install Customizable Sidebar Links checkbox handlers
            $('.link-clickable').on('click', genLinksClickHandler);

            if (opts_enabledScripts.customizableSidebar.enabled) {
                $("#xedx-addl-links-div").addClass('xvisible').removeClass('xhidden');
            }

            // Custom sidebar links, 'Add Row' button
            $("#new-link-add-row").on('click', handleGenCfgAddLinkRow);

            // Start off with table minimized
            //$('#custLinksHdr').click();  // Handler not installed yet!
            optsHdrClick({currentTarget: document.querySelector("#custLinksHdr")});

            // Custom sidebar links, 'Add Row' button
            function handleGenCfgAddLinkRow() { // Handler for the 'add row' button
                //debug('[handleGenCfgAddLinkRow]');
                const rowHtml = `<tr data-type="cust""><td><input type="checkbox" class="link-clickable" onclick="genLinksClickHandler"/></td>
                    <td data-type='desc' class="ctr-input"><input type="string"></td>
                    <td data-type='link' class="ctr-input"><input type="string"></td>
                    <td data-type='cat' class="ctr-input"><input type="string"></td></tr>`;
                $("#xedx-links-table-body").append(rowHtml);
            }

            // Handle clicking a checkbox
            function genLinksClickHandler(ev) {
                //debug('[genLinksClickHandler]');

                let descNode = null, desc = null, keyName = '', linkNode = null, link = '', catNode = null, cat = '', linkValue = {};
                let parentNode = ev.target.parentNode;
                let rowNode = parentNode.parentNode;
                let custom = $(rowNode).prop('data-type') == 'cust';
                let enabled = ev.target.checked;

                if (custom) {
                    descNode = $(rowNode).find(`[data-type='desc']`);
                    desc = descNode[0].firstChild.value;
                    keyName = 'custlink-' + desc.replace(/[\s+\W]/g, '').toLowerCase();
                    linkNode = $(rowNode).find(`[data-type='link']`);
                    link = linkNode[0].firstChild.value;
                    catNode = $(rowNode).find(`[data-type='cat']`);
                    cat = catNode[0].firstChild.value;
                    linkValue = {enabled: enabled, cust: custom, desc: desc, link: link, cat: cat};
                } else {
                    descNode = $(rowNode).find(`[data-type='desc']`);
                    desc = descNode[0].innerText;
                    keyName = 'custlink-' + desc.replace(/[\s+\W]/g, '').toLowerCase();
                    linkNode = $(rowNode).find(`[data-type='link']`);
                    link = linkNode[0].innerText;
                    catNode = $(rowNode).find(`[data-type='cat']`);
                    cat = catNode[0].innerText;
                    linkValue = {enabled: enabled, cust: custom, desc: desc, link: link, cat: cat};
                }
                if (custom && (!link || !desc)) {
                    //debug('[genLinksClickHandler] deleting value: ', linkValue);
                    GM_deleteValue(keyName);
                } else {
                    //debug('[genLinksClickHandler] setting value: ', linkValue);
                    GM_setValue(keyName, JSON.stringify(linkValue));
                }
            }
        }
    }

    function setHdrMsg(msg) {
        log("[setHdrMsg]: ", msg, $("#hdr-msg"));
        if (!msg) {
            log("Clearing msg and hiding");
            $("#hdr-msg").text("");
            $("#hdr-msg").css("visibility", "hidden");
        } else {
            log("Set msg: ", msg);
            $("#hdr-msg").text(msg);
            $("#hdr-msg").css("visibility", "visible");
        }
    }

    // Function to set the 'Save' button state, green or red.
    function setOptsModified(modified=true) {
        if (modified == true) {
            $('#save-opts-btn').addClass("blinkWarn");
            log("Adding text, unhiding: ", $("#hdr-msg"));
            setHdrMsg("You have unsaved changes!");
            //$("#hdr-msg").css("visibility", "visible");
        } else {
            //setTimeout(setHdrMsg, 3000);
            $('#save-opts-btn').removeClass("blinkWarn");
            setTimeout(setHdrMsg, 3000);
            //$("#hdr-msg").css("visibility", "hidden");
            //log("Adding text, hiding: ", $("#hdr-msg"));
        }
    }

    function scrollTo(hash) {
        if (!hash) return;
        $(document.body).animate({
            'scrollTop':   $(hash).offset().top
        }, 2000);

        let trHdr = $(hash + " > table > tbody > tr")[0];
        if ($(trHdr).hasClass('closed')) $(trHdr).click();
    }

    // Fired when 'Save' is clicked - notifies the page script to re-read data
    // and change page as appropriate. Ideally, means the page won't need a refresh.
    // For simplicity, may force a refresh for some script opts. Also creates the
    // "Data Saved!" indicator.
    function handleGenOptsSaveButton(ev) {
        debug('[handleGenOptsSaveButton]');

        // Temporary workaround until I can figure out how this happened to me - once...
        let val = GM_getValue("custlink-");
        if (val) {
            log('[handleGenOptsSaveButton] ERROR: Invalid custom link saved!');
            if (enableDebugger == true) debugger;
            GM_deleteValue('custlink-');
        }

        GM_setValue("general-config", 'saved');

        const newP = '<p id="x1"><span class="notification">Data Saved!</span></p>';
        let myTable = document.getElementById('xedx-table');
        myTable.parentNode.insertBefore($(newP)[0], myTable.nextSibling);

        setTimeout(clearGenoptsResult, 3000);

        // Hide/show the "Customizable Sidebar" options as appropriate
        // If visible, save the table data to storage
        if (GM_getValue("customizableSidebar") == true) {
            $("#xedx-addl-links-div").attr("style", "");
            saveLinksTableToStorage();
        } else {
            $("#xedx-addl-links-div").attr("style", "display: none;");
        }


        setHdrMsg("Your changes have been saved!");
        setOptsModified(false);
    }

    // Clears the "Data Saved!" indicator.
    function clearGenoptsResult() {
        document.getElementById('x1').remove();
    }

    //////////////////////////////////////////////////////////////////////
    //
    // The three handlers for various states of page loading
    //
    // 1. Run at DOMContentLoaded
    // 2. Run at document complete.
    // 3. Run when an API call to Torn has called back.
    //
    //////////////////////////////////////////////////////////////////////

    // Shorthand for the result of a promise, here, they are just logged
    // promise.then(a => _a(a), b => _b(b));
    // instead of
    // promise.then(result => {<do something with success result>}, error => {<do something with error result>});
    function _a(result) {log('[SUCCESS] ' + result);
                         //log("REMINDER: Finish addressing this!");
                         //if (result == undefined) debugger;
                        }
    function _b(error) {
        let wrongPage = error.toString().indexOf('wrong page') > -1 || // Suppress 'wrong page' errors for now. Change to resolve's?
            error.toString().indexOf('not at home') > -1
        if (!wrongPage) {
            log('[ERROR] ' + error);
            if (enableDebugger == true) debugger;
        }
    }

    // TBD: replace this:
    // if (opts_enabledScripts.latestAttacks.enabled) {tornLatestAttacksExtender().then(a => _a(a), b => _b(b));}
    // with:
    // if (opts_enabledScripts.xxx.enabled) {opts_enabledScripts.xxx.enableFn().then(...)}
    // of
    // if (opts_enabledScripts.xxx.enabled) doIt(script);
    // function doIt() {opts_enabledScripts.script.enableFn().then(...)}

    // Some scripts can run as soon as the page has loaded (Run at DOMContentLoaded)

    function handlePageLoad() {
        log('[handlePageLoad]');

        xedxDevMode = GM_getValue("xedxDevMode", false);

        // Experimental
        //if (checkCloudflare) return setTimeout(handlePageLoad, 250);

        // Links to options menu(s)
        installConfigMenu();

        // Everything that returns "not at home" if abroad ... put in here
        if (!awayFromHome()) {
            if (opts_enabledScripts.tornHoldemScore.enabled) {tornHoldemScore().then(a => _a(a), b => _b(b));}

            if (isBazaarPage()) {
                if (opts_enabledScripts.tornBazaarPlus.enabled) {tornBazaarPlus().then(a => _a(a), b => _b(b));}

                if (opts_enabledScripts.tornBazaarAddButton.enabled) {tornBazaarAddButton().then(a => _a(a), b => _b(b));}
            }

            if (opts_enabledScripts.tornRacingAlert.enabled) {tornRacingAlert().then(a => _a(a), b => _b(b));}

            if (isRacePage()) {
                if (opts_enabledScripts.tornRacingCarOrder.enabled) {tornRacingCarOrder().then(a => _a(a), b => _b(b,));}
            }

            if (opts_enabledScripts.tornHomepageLinks.enabled) {tornHomepageLinks().then(a => _a(a), b => _b(b));}
        }

        if (opts_enabledScripts.customizableSidebar.enabled) {tornCustomizableSidebar().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.sidebarColors.enabled) {tornSidebarColors().then(a => _a(a), b => _b(b));}

        if (awayFromHome()) {
            if (opts_enabledScripts.tornOverseasRank.enabled) {tornOverseasRank().then(a => _a(a), b => _b(b));}
        }

        if (isStocksPage()) {
            if (opts_enabledScripts.tornStockProfits.enabled) {tornStockProfits().then(a => _a(a), b => _b(b));}
        }

        if (isPointsPage()) {
            if (opts_enabledScripts.tornDisableRefills.enabled) {tornDisableRefills().then(a => _a(a), b => _b(b));}
        }
    }

    // And some need to wait until the page is complete. (readystatecomplete)
    function handlePageComplete() {
        log('[handlePageComplete]');

        // Everything that returns "not at home" if abroad ... put in here
        if (!awayFromHome()) {
            if (isFactionPage()) {
                if (opts_enabledScripts.tornFacPageSearch.enabled) {tornFacPageSearch().then(a => _a(a), b => _b(b));}
            }

            if (isIndexPage()) {
                if (opts_enabledScripts.tornCrimeDetails.enabled) {tornCrimeDetails().then(a => _a(a), b => _b(b));}

            // Hook up the moveable div listener, and move anything we need to.
            // Supported DIVs to date:
            //
            // const moveableDivs = ["xedx-mjailstats-ext-div", "xedx-mdrugstats-ext-div",
            //                "xedx-mstats-tracker", "xedx-mattacks-ext"];
            //
            attachSortHooks();
            setTimeout(instSortableListListener, 500);
            }
        }

        // Adds the link to the general options page.
        // Currently, underneath the indicator of which server we're connected to.
        //installConfigMenu();

        if (opts_enabledScripts.hideShowChat.enabled) {tornHideShowChat().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornTTFilter.enabled) {tornTTFilter().then(a => _a(a), b => _b(b));}

        if (isUserListPage()) {
            if (opts_enabledScripts.tornUserList.enabled) {tornUserList().then(a => _a(a), b => _b(b));}
        }

        if (isItemPage()) {
            if (opts_enabledScripts.tornItemHints.enabled) {tornItemHints().then(a => _a(a), b => _b(b));}
        }

        if (isAmmoPage() || isModsPage()) {
            if (opts_enabledScripts.tornAmmoMods.enabled) {tornAmmoMods().then(a => _a(a), b => _b(b));}
        }

        if (isJobsPage()) {
            if (opts_enabledScripts.tornCompanyEmployees.enabled) {tornCompanyEmployees().then(a => _a(a), b => _b(b));}
        }
    }

    // To be run after API calls complete, and page is loaded.
    function handleLoadedAfterApi() {

        // Everything that returns "not at home" if abroad ... put in here
        if (!awayFromHome()) {
            if (isIndexPage()) {
                if (opts_enabledScripts.latestAttacks.enabled) {tornLatestAttacksExtender().then(a => _a(a), b => _b(b));}

                if (opts_enabledScripts.statTracker.enabled) {tornStatTracker().then(a => _a(a), b => _b(b));}

                if (opts_enabledScripts.drugStats.enabled) {tornDrugStats().then(a => _a(a), b => _b(b));}

                if (opts_enabledScripts.facRespect.enabled) {tornFacRespect().then(a => _a(a), b => _b(b));}

                if (opts_enabledScripts.jailStats.enabled) {tornJailStats().then(a => _a(a), b => _b(b));}
            }

            // Still stand-alone only...
            //if (opts_enabledScripts.tornJailScores.enabled) {tornJailScores().then(a => _a(a), b => _b(b));}

            if (isItemPage()) {
                if (opts_enabledScripts.tornMuseumSetHelper.enabled) {tornMuseumSetHelper().then(a => _a(a), b => _b(b));}

                if (opts_enabledScripts.tornWeaponSort.enabled) {tornWeaponSort().then(a => _a(a), b => _b(b));}

                if (opts_enabledScripts.tornWeTracker.enabled) {tornWeTracker().then(a => _a(a), b => _b(b));}

                if (opts_enabledScripts.tornWeSpreadsheet.enabled) {tornWeSpreadsheet().then(a => _a(a), b => _b(b));}
            }
        }

        if (isGymPage()) {
            if (opts_enabledScripts.tornGymGains.enabled) {tornGymGains().then(a => _a(a), b => _b(b));}
        }

        if (isTravelPage()) {
            if (opts_enabledScripts.tornTravelAlerts.enabled) {tornTravelAlerts().then(a => _a(a), b => _b(b));}
        }
    }

    // And others after data from the API has been received. This is the last place where we start running
    // individual scripts, at the end is anything that meeds to wait on the rest of the scripts defined
    // in here.
    //
    // One such is the movable DIV support, on the homepage. That has to wait until the divs that may have
    // been moved, are present.
    //
    function handleApiComplete() {
        log('[onApiComplete]');

        // I changed to start when run, so some of these will start too early - initially
        // the API calls gave the page plenty of time to load. Now I've moved a few of these
        // to require contentLoaded as well.

        callOnContentLoaded(handleLoadedAfterApi);

    }

    // ============= Functions to support home page sorting/dragging events =============
    //
    // Support moving divs around on the home page.  From another script, this works (the sortstop callback
    // gets called). From in here, it does not....
    // The idea is, we trap the 'sortchange' event while moving a moveable element, as well as the stop
    // event. Only stop should be necessary.
    //
    var sortListenerEnabled = false;        // Set while attempting to move nodes to where they belong.
                                            // Do not want to save positions in storage while moving.

    const moveableDivs = ["xedx-mjailstats-ext-div", "xedx-mdrugstats-ext-div",
                          "xedx-mstats-tracker", "xedx-mattacks-ext"];

    // Helper to check if script associated with an ID is actually enabled, for determining if
    // everything we may have to move, we found.
    function isMoveableDivEnabled(myId) {
        if (!myId) return false;

        if (myId == "xedx-mjailstats-ext-div" || myId == "#xedx-mjailstats-ext-div" ||
           myId == "xedx-jailstats-ext-div" || myId == "#xedx-jailstats-ext-div")
            return opts_enabledScripts.jailStats.enabled;

        if (myId == "xedx-mdrugstats-ext-div" || myId == "#xedx-mdrugstats-ext-div" ||
           myId == "xedx-drugstats-ext-div" || myId == "#xedx-mrugstats-ext-div")
            return opts_enabledScripts.drugStats.enabled;

        if (myId == "xedx-mstats-tracker" || myId == "#xedx-mstats-tracker" ||
           myId == "xedx-stats" || myId == "#xedx-stats")
            return opts_enabledScripts.statTracker.enabled;

        if (myId == "xedx-mattacks-ext" || myId == "#xedx-mattacks-ext" ||
           myId == "xedx-attacks-ext" || myId == "#xedx-attacks-ext")
            return opts_enabledScripts.latestAttacks.enabled;

        return false;
    }

    //
    // This needs to be called after the sortable lists are on the page, so that can find them.
    // A small delay is added just in case, since I have seen this fail. We first look for
    // all of our saved node ID's and their sib IDs, to be sure they are all rendered, and
    // then we can actaully move things. We only retry a few times, then assume that perhaps
    // that feature was disabled (we could figure that out ourselves!)
    //
    function instSortableListListener() {
        sortListenerEnabled = false;

        log("[instSortableListListener]");

        debug("sortablelists: installing listener, lists: ", $( ".sortable-list" ));
        debug("sortablelists: document.readyState, ", document.readyState);

        // === Actual listener hook
        if (!isIndexPage || awayFromHome()) {
            debug("sortablelists, not on index page, going home.");
            return;
        }

        /*
        // Use 'attachSortHooks()' instead
        $( ".sortable-list" ).on( "sortstop", function( event, ui ) {
            log("sortablelists, got sortstop event! enabled: ", sortListenerEnabled);
            TTS_handleListChangeStop(event);
        } );

        $( ".sortable-list" ).on( "sortchange", function( event, ui ) {
            log("sortablelists, got sortchange event! enabled: ", sortListenerEnabled);
            TTS_handleListChangeStop(event);
        } );
        */

        // ======== Restoring saved positions
        // Not neccesary to check if complete, here we know it is.
        // Go and move any divs to previously saved locations.
        if (document.readyState == "complete") {
            restoreNodePositions();
        } else {
            $(window).on("load", function () {
                restoreNodePositions();
            });
        }

        debug("sortablelists, installed! enabled: ", sortListenerEnabled);
        log("[instSortableListListener] complete!");
    }

    // If a div has a saved root node, is enabled, and is on the page,
    // move it to the saved position.
    function restoreNodePositions() {
        sortListenerEnabled = false;
        for (let idx=0; idx < moveableDivs.length; idx++) {
            let myId = moveableDivs[idx];
            let myIdSel = "#" + myId;

            // See if enabled.
            let enabled = isMoveableDivEnabled(myId);
            let onPage = $(myIdSel).length > 0;

            let sibId = GM_getValue(myId, undefined);
            let sibSel = undefined;
            if (sibId) sibSel = "#" + sibId;

            debug("sortablelists: Saved sib ID for my ID ", myId, " is: ", sibId);

            let hasSib = (sibId != undefined && sibId != "" && sibId.length);
            let sibOnPage = ($(sibSel).length > 0);

            debug("[sortablelists] myId: ", myId, " enabled: ", enabled, " on page: ", onPage);
            debug("[sortablelists] sibId: ", sibId, " hasSib: ", hasSib, " on page: ", sibOnPage);

            // SAve currnt position if none in storage (never saved)
            let noMove = false;
            if (!hasSib) {
                let sib = saveNodePrevSibling($(myIdSel));
                debug("sortablelists - no saved sib ID, saved: ", $(sib));
                continue;
            }

            if (!enabled || !onPage) {
                log("WARNIING - [sortablelists], element either not enabled or hasn't started!");
                continue;
            }

            if (sibId) moveElement(sibId, myId);
        }

        // Now can turn on listener...
        sortListenerEnabled = true;
    }

    function attachSortHooks() {
        log("[attachSortHooks]");
        //console.log("Torn Total Solution, attachSortHooks for sortablelists");

        $( ".sortable-list" ).on( "sortstop", function( event, ui ) {
            debug("sortablelists, got sortstop event! enabled: ", sortListenerEnabled);
            TTS_handleListChangeStop(event);
        } );

        $( ".sortable-list" ).on( "sortchange", function( event, ui ) {
            debug("sortablelists, got sortchange event! enabled: ", sortListenerEnabled);
            TTS_handleListChangeStop(event);
        } );

        $( "#column0" ).on( "sortstop", function( event, ui ) {
            debug("sortablelists, got sortstop column0 event! enabled: ", sortListenerEnabled);
            TTS_handleListChangeStop(event);
        } );

        $( "#column1" ).on( "sortchange", function( event, ui ) {
            debug("sortablelists, got sortchange column1 event! enabled: ", sortListenerEnabled);
            TTS_handleListChangeStop(event);
        } );
    }

    function moveElement(sibId, elementId) {
        let sibSel = "#" + sibId;
        let nodeSel = "#" + elementId;

        debug("[sortablelists]: Moving ", nodeSel, " under node ", sibSel);
        $(sibSel).after($(nodeSel));
    }

    function TTS_handleListChangeStop(event) {
        let list = event.target;
        let len = $(list).length;

        debug("sortablelists: handle stop, list len: ", $(list).length);

        let checkedNodes = [];
        let foundNodes = 0;
        let savedNodes = 0;
        let myDivs = $(list).find("div[id^='xedx-m']");

        for (let idx=0; idx < $(myDivs).length; idx++) {
            let myNode = $(myDivs)[idx];
            let x = saveNodePrevSibling(myNode);
            if (x) savedNodes++;
            checkedNodes.push($(myNode).attr("id"));
        }

        debug("sortablelists: found ", $(myDivs).length, " see 'xedx-m' nodes, saved ", savedNodes);

        // If for some unknown reason we didn't find any nodes,
        // use our array as IDs to find.
        for (let idx=0; idx < moveableDivs.length; idx++) {
            let myId = moveableDivs[idx];
            let myIdSel = "#" + myId;

            for (let j=0; j < checkedNodes.length; j++) {
                if (checkedNodes[j] == myId) {
                    foundNodes++;
                    continue;
                }
            }
        }
        debug("sortablelists: found ", foundNodes, " from ourlist");
    }


    function saveNodePrevSibling(myNode) {

        debug("sortablelists - saveNodePrevSibling");
        let prevSib = $(myNode).prev();
        let sibId = $(prevSib).attr("id");
        let myId = $(myNode).attr("id");
        let nodeSel = "#" + myId;

        debug("sortablelists: saveNodePrevSibling sib data: ", myId, " ==> ", sibId);

        if (sibId) GM_setValue(myId, sibId);

        return sibId;
    }

    // ============== End home page sorting/dragging events ============================

    //////////////////////////////////////////////////////////////////////
    // Main. This is the primary entry point.
    //
    // It handles several scenarios:
    //
    // The config pages for several scripts, which are housed
    // on my AWS server so have no Torn URLs.
    //
    // The main '@match', which is for the scripts that run on the
    // home page. This sets up three other entry points:
    //
    // 1. Run at DOMContentLoaded (handlePageLoad())
    // 2. Run at document complete (handlePageComplete())
    // 3. Run when an API call to Torn has called back (handleApiComplete())
    //
    // These three entry points fire of calls to individual scripts.
    // Each of those entry points returns a promise, aso are run
    // async.
    //
    // Inside those three entry points, filters are also/will be in place for
    // Torn page-specific URLs, such as the Items page. This is basically
    // internal filtering similar to what a '@match' would normally do,
    // as this script is called on every Torn page.
    //
    // ^^ changing this. Each script is responsible for checking
    //    that we are at the correct URL
    //
    //////////////////////////////////////////////////////////////////////

    let leftAlign = false;

    //logScriptStart();
    validateApiKey();
    versionCheck();

    if (checkCloudFlare()) {
        log("CloudFlare challenge active, not exeecuting.");
        return;
    }

    // Align Torn to the left
    // Make an option at some point
    if (leftAlign) $("#mainContainer").attr("style", "display: flex; justify-content: left;");

    addStyles();
    addToolTipStyle();
    loadTtsColors();

    //
    // This call initializes the obj that defines what sub-scripts will be called in the three handlers,
    // run at content loaded, complete, and when the initial API calls complete.
    //
    updateKnownScripts(); // Load supported scripts

    // Some aren't run as scripts, but set options. Do that here.
    // They look like scripts for the options page builder.
    // Maybe move to fn like initDebugOpts??
    globalOpts.statHyperLinks = (opts_enabledScripts.statHyperLinks.enabled);

    // Scripts to execute immediately can go here. If running on the attack page,
    // only scripts here will run, we return immediately for least overhead as possible.
    if (isAttackPage()) {
        //if (leftAlign) $(".content").attr("style", "display: flex; justify-content: left;");
        if (opts_enabledScripts.tornSeeTheTemps.enabled) {tornSeeTheTemps().then(a => _a(a), b => _b(b));}
        if (opts_enabledScripts.tornScrollOnAttack.enabled) {tornScrollOnAttack().then(a => _a(a), b => _b(b));}

        log("On attacks page, only necessary scripts loaded. No more scripts will be loaded.");
        return;
    }

    if (isRacePage()) {
        if (opts_enabledScripts.tornRacingStyles.enabled) {tornRacingStyles().then(a => _a(a), b => _b(b));}
    }

    if (isPointsPage()) {
        //if (opts_enabledScripts.tornDisableRefills.enabled) {tornDisableRefills().then(a => _a(a), b => _b(b));}
    }

    if (isJailPage()) {
        // Moved to API complete - requires two calls.
        //if (opts_enabledScripts.tornJailScores.enabled) {tornJailScores().then(a => _a(a), b => _b(b));}
    }

    if (isStocksPage()) {
        //if (opts_enabledScripts.tornStockProfits.enabled) {tornStockProfits().then(a => _a(a), b => _b(b));}
    }

    // Separate URL just for the 'Stats Tracker' script config page.
    let urlNohash = location.href.split('#')[0];
    if (urlNohash == tornStatTrackerCfgURL) {
        handleStatsConfigPage();
    // Separate URL just for the General script config page.
    } else if (urlNohash == tornTotalSolutionCfgURL || urlNohash == tornTotalSolutionCfgURLAlt) {
        handleGeneralConfigPage()
    // Every thing else - the real scripts - called for every Torn page.
    // Filtered in the callback by actual page.
    } else {
        // Start of by collecting stats we need. Callback triggers handleApiComplete()
        // That, in turn, calls any functions requiring an API call.
        personalStatsQuery();

        // Other scripts can run at certain earlier page load states.
        callOnContentLoaded(handlePageLoad);
        callOnContentComplete(handlePageComplete);
    }

    // ================================================================================
    //
    // Extra stuff I just needed to put somewhere....no longer used?
    //
    function getCfgStylesHtml() {
        return `
             body {background-color: lightgray;}
             h2  {color: black;}
             .w1 {width: 10%;}
             .w2 {width: 20%;}
             .w3 {width: 50%;}
             .w4 {width: 20%;}
             table input {width: 100%;}
             .outer-scroll {
                 text-align: center;
                 overflow-y: auto;
                 height: 90vh;
                 overscroll-behavior: contain;
                 /*margin-bottom: 30px;*/
             }

             .subtab-hdr {margin-top:  20px; margin-bottom:  20px; margin-right: 20px;}
             .notification {color: red; font-size: 18px; margin-top:  10px;}
             td {text-align: center; vertical-align: middle; border: 1px solid; width: auto;}
             th {text-align: center; vertical-align: middle; border: 1px solid; width: auto;}
             table {border: 2px solid; width: 50%; margin: auto;}

             #save-opts-btn {
                 width: 128px;
                 height: 32px;
                 border-radius: 10px;
                 font-weight: bold;
                 font-size: 24px;
                 color: rgb(0, 160, 0);
             }
             #save-opts-btn:hover {
                 transform: scale(1.2);
                 /*background-color: #bbb;*/
                 background-image: linear-gradient(90deg, #bbbbbb, #efefef, #bbbbbb);
                 color: rgb(0, 220, 0);
             }
             .cg {color: limegreen;}
             .cr {color: red;}
             .hdr-wrap {
                 background: linear-gradient(180deg, #999999 0%, #333333 100%);
                 display: flex;
                 flex-direction: column;
                 position: fixed;
                 /*margin-bottom: 20px;*/
                 /*pointer-events: none;*/
                 width: 100%;
             }
             .hdr-wrap * {
                justify-content: center;
                display: flex;
                flex-flow: row wrap;
                align-content: center;
                margin: 0px;
             }
             .hdr-wrap p {
                 margin: 20px 0px 0px 0px;
             }
             .hdr-wrap span {
                 margin: 20px 0px 20px 0px;
                 font-size: 26;
                 min-height: 32px;
                 color: #aaa;
             }
             .content {
                 display: flex;
                 flex-direction: column;
                 position: relative;
                 max-height: 100vh;
                 margin-bottom: 30px;
                 overscroll-behavior: contain;
             }
             .blinkWarn {
                 color: red;
                 animation: blinker 1.4s linear infinite;
             }
             .blinkGreen {
                 color: green;
                 animation: blinker 1.4s linear infinite;
             }

             @keyframes blinker {
                 0%, 100% {opacity: 1;}
                 50%, 70% {opacity: .3;}
             }

             #tootlTipArea {
                 position: absolute;
                 left: 0;
                 top: 0;
                 background: transparent;
                 padding: 5px 5px 5px 20px;
                 max-width: 400px;
                 font-family: arial;
             }
     `;}

    function getConfigWebPageHead() {
        let styles = getCfgStylesHtml();
        let head =
            `<head>
                <meta http-equiv=Content-Security-Policy content="script-src 'self' 'unsafe-inline' googleapis.com;">
                <meta http-equiv="Content-Security-Policy" content="script-src-elem 'self'
                      https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js;">
                <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
                <style>${styles}</style>
            </head>`;

        return head;
    }

    function getConfigWebPageBody() {
        let body = `<body>
                <div class="content">
                    <div class="hdr-wrap">
                        <h2>Torn Total Solution Options</h2>
                        <p id="tootlTipArea" class="tt-display"></p>
                        <p><input class="button xedx-tts-btn cg2" type="submit" value="Save" id="save-opts-btn"></p>
                        <span id="hdr-msg" style="visibility: hidden;">You have unsaved changes!</span>
                    </div>
                    <div class="outer-scroll">
                    <!-- Main (supported scripts) table -->
                        <div id="xedx-main-opts-div">
                            <table id="xedx-table">
                                <tbody id="xedx-table-body">
                                </tbody>
                            </table>
                        </div>

                        <!-- Additional Sidebar Links table -->
                        <div id="xedx-addl-links-div">
                            <table id="xedx-addl-links-table">
                                <tbody id="xedx-links-table-body">
                                    <div  class="subtab-hdr" style="display: inline-block; cursor: pointer;">
                                        <b>Additional Sidebar Links</b>
                                        <button id="new-link-add-row" style="margin-left: 20px;">Add Custom Link</button>
                                    </div>
                                </tbody>
                            </table>
                        </div>

                        <!-- Debug options table -->
                        <div id="debug-opts-div">
                            <table>
                                <tbody id="dbg-opt-body">
                                <div  class="subtab-hdr" style="display: inline-block; cursor: pointer;">
                                    <b>Debugging Options</b>
                                </div>
                                </tbody>
                            </table>
                        </div>

                        <!-- Cache options table -->
                        <div id="cache-opts-div">
                            <table>
                                <tbody id="cache-opt-body">
                                <div  class="subtab-hdr" style="display: inline-block; cursor: pointer;">
                                    <b>Caching Options</b>
                                </div>
                                </tbody>
                            </table>
                        </div>

                        <!-- API Calls table -->
                        <div id="api-usage-div">
                            <table>
                                <tbody id="api-usage-body">
                                <div  class="subtab-hdr" style="display: inline-block; cursor: pointer;">
                                    <b>API Calls</b>
                                    <button id="api-calls-clear" style="margin-left: 20px;">Clear</button>
                                </div>
                                </tbody>
                            </table>
                        </div>

                        <div class="col-flex-wrap" style="margin: 20px 0px 30px 0px;">
                            <div>
                                <span>Outdated documentation for the curious:</span>
                                <span>
                                    <a href="https://github.com/edlau2/Tampermonkey/tree/master/TornTotalSolution">
                                        TTS Main GitHub Page
                                    </a>
                                </span>
                                <span>
                                    <a href="https://github.com/edlau2/Tampermonkey/tree/master">
                                        Root GitHub Page
                                    </a>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </body>`;
        return body;
    }

    function getConfigWebPageAlt() {
        let styles = getCfgStylesHtml();
        //let pageAlt = `<html> ${getConfigWebPageHead()}${getConfigWebPageBody()}</html>`;
        let pageAlt = `<html>${getConfigWebPageBody()}</html>`;
        return pageAlt;
    }

    function getConfigWebPage() {
        let styles = getCfgStylesHtml();
        let page =
            `<html>
            <head>
                <meta http-equiv=Content-Security-Policy content="script-src 'self' 'unsafe-inline' googleapis.com;">
                <style>${styles}</style>
            </head>
            <body>
                <div class="content">
                    <div class="hdr-wrap">
                        <h2>Torn Total Solution Options</h2>
                        <p id="tootlTipArea" class="tt-display"></p>
                        <p><input class="button xedx-tts-btn cg2" type="submit" value="Save" id="save-opts-btn"></p>
                        <span id="hdr-msg" style="visibility: hidden;">You have unsaved changes!</span>
                    </div>
                    <div class="outer-scroll">
                    <!-- Main (supported scripts) table -->
                        <div id="xedx-main-opts-div">
                            <table id="xedx-table">
                                <tbody id="xedx-table-body">
                                </tbody>
                            </table>
                        </div>

                        <!-- Additional Sidebar Links table -->
                        <div id="xedx-addl-links-div">
                            <table id="xedx-addl-links-table">
                                <tbody id="xedx-links-table-body">
                                    <div  class="subtab-hdr" style="display: inline-block; cursor: pointer;">
                                        <b>Additional Sidebar Links</b>
                                        <button id="new-link-add-row" style="margin-left: 20px;">Add Custom Link</button>
                                    </div>
                                </tbody>
                            </table>
                        </div>

                        <!-- Debug options table -->
                        <div id="debug-opts-div">
                            <table>
                                <tbody id="dbg-opt-body">
                                <div  class="subtab-hdr" style="display: inline-block; cursor: pointer;">
                                    <b>Debugging Options</b>
                                </div>
                                </tbody>
                            </table>
                        </div>

                        <!-- Cache options table -->
                        <div id="cache-opts-div">
                            <table>
                                <tbody id="cache-opt-body">
                                <div  class="subtab-hdr" style="display: inline-block; cursor: pointer;">
                                    <b>Caching Options</b>
                                </div>
                                </tbody>
                            </table>
                        </div>

                        <!-- API Calls table -->
                        <div id="api-usage-div">
                            <table>
                                <tbody id="api-usage-body">
                                <div  class="subtab-hdr" style="display: inline-block; cursor: pointer;">
                                    <b>API Calls</b>
                                    <button id="api-calls-clear" style="margin-left: 20px;">Clear</button>
                                </div>
                                </tbody>
                            </table>
                        </div>

                        <div class="col-flex-wrap" style="margin: 20px 0px 30px 0px;">
                            <div>
                                <span>Outdated documentation for the curious:</span>
                                <span>
                                    <a href="https://github.com/edlau2/Tampermonkey/tree/master/TornTotalSolution">
                                        TTS Main GitHub Page
                                    </a>
                                </span>
                                <span>
                                    <a href="https://github.com/edlau2/Tampermonkey/tree/master">
                                        Root GitHub Page
                                    </a>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
        </html>`;

        return page;
    }

})();







