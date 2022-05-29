// ==UserScript==
// @name         Torn Total Solution by XedX
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  A compendium of all my individual scripts for the Home page
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @match        http://18.119.136.223:8080/TornTotalSolution/*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/DrugStats/Torn-Drug-Stats-Div.js
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

//
// This script combines several scripts that were previously only available individually.
//
// All are configurable, and can be enabled/disbabled individually.
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
// Torn TT Filter - Tweaks the Torn Tools display to my liking, disabling some redundant features. (TBD: will add later)
// Torn Item Hints - Adds useful info onto the items page, so you don't have to expand the item.
// Torn Museum Sets Helper - Helps determine when museum sets are complete in Item pages (TBD)
// Torn Weapon Sort - Sorts weapons on the Items page by various criteria (TBD)
// Torn Weapon Experience Tracker - Displays a weapon's WE on the Itms page. (TBD)
// Torn Weapon Experience Spreadsheet - Creates a new expandable DIV on the Items page with Weapon Experience info in a table (TBD)
// Torn See The Temps - Allows lingering temps to be visible before an attack
// Torn Scroll On Attack - Modify the attack page to suit my needs (scrolls view upward)
// Torn Holdem Score - Makes the poker 'score' visible on the poker page. (TBD)
// Torn Stock Profits - Displays current stock profits for owned shares (TBD)
//
// jail scores, fac page search, disable refills
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
// those specific pages. Currently, only scripts that run at //@match https://www.torn.com/* have been
// implemented (migrated to here from standalone scripts).
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

    //////////////////////////////////////////////////////////////////////
    // Options and global variables
    //////////////////////////////////////////////////////////////////////

    initDebugOptions();

    // Configuration page URL's
    const configHost = "18.119.136.223:8080";
    const genConfigPath = "/TornTotalSolution/TTS-Opts.html";
    const statsConfigPath = "/TornTotalSolution/StatTracker.html";

    const tornStatTrackerCfgURL = "http://18.119.136.223:8080/TornTotalSolution/StatTracker.html";
    const tornTotalSolutionCfgURL = "http://18.119.136.223:8080/TornTotalSolution/TTS-Opts.html";

    var jsonResp = null;
    var personalStats = null;
    var honorsAwarded = null;
    var attacks = null;
    var weArray = null;
    var fhArray = null;
    var inventoryArray = null;
    let itemsArray = null; // Array of all Torn items

    var userId = null;
    var userName = null;

    const recoverableErrors = [5, // Too many requests
                               8, // IP Block
                               9, // API disabled
                               ];

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
    }

    //////////////////////////////////////////////////////////////////////
    // API calls (profile, attacks, personalstats, honors)
    //////////////////////////////////////////////////////////////////////

    // Get data used for most of the handlers in here, in one call.
    function personalStatsQuery(callback=personalStatsQueryCB) {
        log('[personalStatsQuery]');
        xedx_TornUserQuery(null, 'personalstats,profile,attacks,honors,weaponexp,inventory', callback);
    }

    // Callback for above
    function personalStatsQueryCB(responseText, ID) {
        log('[personalStatsQueryCB]');
        let _jsonResp = JSON.parse(responseText);
        if (_jsonResp.error) {return handleError(responseText);}

        jsonResp = _jsonResp;
        personalStats = jsonResp.personalstats;
        honorsAwarded = jsonResp.honors_awarded;
        attacks = jsonResp.attacks;
        weArray = jsonResp.weaponexp;
        fhArray = jsonResp.personalstats;
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

        const latest_attacks_config_div = getLatestAttacksCfgDiv();
        const latest_attacks_div = getLatestAttacksDiv();
        const latestAttacksconfig = {
            'max_values': GM_getValue('latest_attacks_max_values', 100),
            'date_format': GM_getValue('latest_attacks_date_format', "YYYY-MM-DD HH:MM:SS")
         };

        return _tornLatestAttacksExtender();

        function _tornLatestAttacksExtender() {
            log('[tornLatestAttacksExtender]');

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornLatestAttacksExtender] not at home!');
                if (!isIndexPage()) reject('[tornLatestAttacksExtender] not on home page.');

                let result = extendLatestAttacks();
                if (result)
                    return reject(result);
                else
                    return resolve("tornLatestAttacksExtender complete!");
            });
        }

        function extendLatestAttacks() {
            // Find first column
            let mainDiv = document.getElementById('column1');
            if (!validPointer(mainDiv)) {return '[extendLatestAttacks] main div not found! Consider launching later.';}
            $(mainDiv).append(latest_attacks_div);

            // Hook up button handler(s)
            $('#la-config-btn').click(function () {createConfigDiv();});

            populateLatestAttacksList();
            return null;
        }

        function populateLatestAttacksList() {
            let counter = 0;
            let ul = document.getElementById('latest-attacks-list');

            let keys = Object.keys(attacks).reverse(); // Why reverse? Latest first...
            for (let i = 0; i < keys.length; i++) {
                let obj = attacks[keys[i]];
                let span = document.createElement('span');
                let li = createLaLi(span);

                // Link to the attack log: data-location="loader.php?sid=attackLog&ID=
                let code = 'loader.php?sid=attackLog\u0026ID=' + obj.code;
                li.setAttribute('data-location', code);

                // List element title: date of attack
                let d = new Date(0);
                d.setUTCSeconds(obj.timestamp_ended);
                li.setAttribute("title", dateConverter(d, latestAttacksconfig.date_format));

                // Attacker name, either myself or opponent
                let offense = (obj.attacker_id == userId);
                let a2 = document.createElement('a');
                a2.setAttribute('href', 'profiles.php?XID=' + obj.attacker_id);
                a2.innerHTML = obj.attacker_name ? obj.attacker_name : 'someone';
                if (!offense && obj.attacker_name && obj.attacker_factionname != null) {
                    a2.innerHTML += ' [' + obj.attacker_id + ']';
                    a2.innerHTML += ' (' + obj.attacker_factionname + ')';
                }
                if (offense && obj.stealthed) {
                    a2.innerHTML += ' (stealth)';
                }
                span.appendChild(a2);

                // Format the Action (make fn, w/case stmt)
                let result = obj.result;
                if (result === 'Lost') {result = 'Attacked and lost to';}
                if (result === 'Stalemate') {result = 'Stalemated with';}
                if (result === 'Escape') {result = 'Escaped from';}
                if (result === 'Assist') {result = 'Assisted in attacking';}
                span.appendChild(document.createTextNode(' ' + result + ' '));

                // Defender name, either myself or opponent
                let a3 = document.createElement('a');
                a3.setAttribute('href', 'profiles.php?XID=' + obj.defender_id);
                a3.innerHTML = obj.defender_name;
                if (offense) {a3.innerHTML += ' (' + obj.defender_factionname + ')';}
                span.appendChild(a3);

                // Respect gain
                if (obj.respect_gain > 0) {span.appendChild(document.createTextNode(' (Respect: ' + obj.respect_gain + ')'));}

                li.appendChild(span);
                ul.appendChild(li);

                if (counter++ > latestAttacksconfig.max_values) {return;}
            }
        }

        function createLaLi(span) {
            var li = document.createElement("li");
            var a1 = document.createElement('a')
            a1.className = 't-blue';
            a1.setAttribute('href', 'profiles.php?XID=');
            span.appendChild(a1);
            return li;
        }

        function createConfigDiv() {
            if (document.getElementById('config-div')) return;

            let extendedDiv = document.getElementById('xedx-attacks-ext');
            if (!validPointer(extendedDiv)) {return;}
            $(extendedDiv).append(latest_attacks_config_div);
            $("#la-status-hdr").css("display", "none");

            $('#la-maxinput').val(GM_getValue('latest_attacks_max_values', "100"));
            $('#la-dateformat').val(GM_getValue('latest_attacks_date_format', "YYYY-MM-DD HH:MM:SS")); // Index 2 (dateFormat.selectedIndex)

            $('#la-cancel-btn').click(function () {$('#la-config-div').remove()});
            $('#la-save-btn').click(function () {saveLaConfig()});
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
              '<div class="sortable-box t-blue-cont h" id="xedx-attacks-ext">' +
                  '<div id="la_header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">' +
                      '<div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>' +
                      '<div class="move-wrap"><i class="accordion-header-move right"></i></div>' +
                      'Latest Attacks (Previous 100)' +
                  '</div>' +
                  '<div class="bottom-round">' +
                  '    <div class="cont-gray bottom-round" style="width: 386px; height: 179px; overflow: auto">' +
                          '<ul class="list-cont" id="latest-attacks-list">' +
                          '</ul>' +
                      '</div>' +
                  '</div>' +
                  '<div class="title-black bottom-round" style="text-align: center">' +
                      '<button id="la-config-btn" class="powered-by">Configure</button>' +
                  '</div>' +
              '</div>';
            return result;
        }
    }

    function removeLatestAttacksExtender() {$("#xedx-attacks-ext").remove()}

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
                           };

    function tornStatTracker() {

        const stats_div = loadStatsDiv();
        const award_li = loadAwardLi();

        var stats_intervalTimer = null;
        var stats_updateTimer = null;
        var stats_configWindow = null;
        var autoUpdateMinutes = 0; // Only sorta works, not sure why.

        return _tornStatTracker();

        function _tornStatTracker() {
            log('[tornStatTracker]');

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornStatTracker] not at home!');
                if (!isIndexPage()) reject('[tornStatTracker] not on home page.');

                initOptStats();
                if (!optStats.length) autoUpdateMinutes = 0;

                let result = buildStatsUI();

                if (autoUpdateMinutes) {
                    log('[tornStatTracker] updating every ' + autoUpdateMinutes + ' minute(s)');
                    stats_updateTimer = setInterval(function() {
                        personalStatsQuery(updateStatsHandlerer)}, autoUpdateMinutes *60 * 1000);
                }

                if (result)
                    return reject(result);
                else
                    return resolve("tornStatTracker complete!");
            });
        }

        function updateStatsHandlerer(responseText, ID) {
            log('[updateStatsHandlerer]');
            let _jsonResp = JSON.parse(responseText);
            if (_jsonResp.error) {return handleError(responseText);}

            jsonResp = _jsonResp;
            personalStats = jsonResp.personalstats;
            honorsAwarded = jsonResp.honors_awarded;
            attacks = jsonResp.attacks;

            userId = jsonResp.player_id;
            userName = jsonResp.name;

            buildStatsUI(true);
        }

        function buildStatsUI(update=false) {
            let targetDivRoot = document.querySelector("#mainContainer > div.content-wrapper.m-left20 >" +
                                                           " div.content.m-top10 > div.sortable-list.left.ui-sortable");
            let divList = $("#mainContainer > div.content-wrapper.m-left20 > div.content.m-top10 > div.sortable-list.left.ui-sortable > div");
            let targetDiv = divList[3];
            debug('[tornStatTracker] targetDivRoot: ', targetDivRoot, ' divList: ', divList, ' targetDiv: ', targetDiv);
            if (!targetDiv) return '[tornStatTracker] targetDiv not found! Consider starting later.';

            if (!document.querySelector("#xedx-stats")) {
                $(targetDiv).after(stats_div);
                $('#config-btn').click(createStatsConfigDiv);
                $('#refresh-btn').click(function() {
                    $('#refresh-btn').addClass('highlight-active');
                    personalStatsQuery(updateStatsHandlerer);
                    setTimeout(function() {$('#refresh-btn').removeClass('highlight-active')}, 3000);
                });
            }

            // Populate the UL of enabled stats
            let keys = Object.keys(optStats);
            for (let i=0; i < keys.length; i++) {
                let statName = keys[i];
                if (optStats[statName].enabled) {
                    if (update) {
                        updateStat(statName, optStats[statName].name, personalStats[statName]);
                    } else {
                        addStat(statName, optStats[statName].name, personalStats[statName]);
                    }
                }
            }

            return null; // Success!
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
            return '<div class="sortable-box t-blue-cont h" id="xedx-stats">' +
              '<div id="header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">' +
                  '<div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>' +
                  '<div class="move-wrap"><i class="accordion-header-move right"></i></div>' +
                  'Stat Tracker' +
              '</div>' +
              '<div class="bottom-round">' +
              '    <div class="cont-gray bottom-round" style="width: 386px; height: auto; overflow: auto;">' +
                      '<ul class="info-cont-wrap" id="stats-list" style="overflow-y: scroll; width: auto; max-height: 125px;">' +
                      '</ul>' +
                  '</div>' +
              '</div>' +
              '<div class="title-black bottom-round" style="text-align: center;">' +
                  '<button id="config-btn" class="powered-by">Configure</button>' +
                  '<button id="refresh-btn" class="powered-by">Refresh</button>' +
              '</div>' +
          '</div>';
        }

        function loadAwardLi() {
            return '<li tabindex="0" id="ID" role="row" aria-label="STAT_DESC: STAT_VAL">' +
                '<span class="divider"  style="width: 180px;">' +
                    '<span>STAT_DESC</span>' +
                '</span>' +
                '<span class="desc" style="width: 100px;">STAT_VAL</span>' +
            '</li>';
        }

        function checkStatsSaveButton() {
            let data = GM_getValue("stats-config");

            if (data == 'saved') {
                log('Save button has been pressed!');

                clearInterval(stats_intervalTimer);
                stats_intervalTimer = null;
                GM_setValue("stats-config", '');
                reloadOptStats();
                $("#stats-list").empty();
                buildStatsUI();
                if (stats_configWindow && !stats_configWindow.closed) stats_intervalTimer = setInterval(checkSaveButton, 2000);
            }

            debug('Check config win: ', stats_configWindow, (stats_configWindow ? stats_configWindow.closed : 'no window'));
            if (stats_configWindow && stats_configWindow.closed) {
                stats_configWindow = null;
                clearInterval(stats_intervalTimer);
            }
        }

        // Create a stats config options page in a new tab
        function createStatsConfigDiv() {
            log('[createStatsConfigDiv]');
            stats_configWindow = window.open(tornStatTrackerCfgURL);

            // Since broadcasts won't work, and storage notifications won't work, poll.
            if (!stats_intervalTimer) stats_intervalTimer = setInterval(checkStatsSaveButton, 2000);
        }

        // Add stats to the DIV on the home page
        function addStat(statName, desc, val) {
            log('[addStat] ', desc + ': ', val);
            let newLi = award_li;
            newLi = newLi.replaceAll('ID', "x-" + statName);
            newLi = newLi.replaceAll('STAT_DESC', desc);
            newLi = newLi.replaceAll('STAT_VAL', numberWithCommas(Number(val)));
            debug('Stats LI: ', newLi);
            $('#stats-list').append(newLi);
        }

        function updateStat(statName, desc, newValue) {
            let sel = "#x-" + statName;
            let li = document.querySelector(sel + " > span.desc");
            log('[updateStat] sel: ', sel, ' curr value: ', li.textContent,
                ' new value: ', newValue);
            li.textContent = numberWithCommas(Number(newValue));
        }

    }

    function initOptStats() {

        function addOptStat(name, desc, category) {
            optStats[name] = {enabled: GM_getValue(name, false), name: desc, cat: category};
        }

        addOptStat('killstreak', "Kill Streak", "attacks");
        addOptStat('defendswon', "Defends Won", "attacks");
        addOptStat('attackdamage', "Total Damage", "attacks");
        addOptStat('attackswon', "Attacks Won", "attacks");
        addOptStat('attackslost', "Attacks Lost", "attacks");
        addOptStat('attackcriticalhits', "Total Crit Hits", "attacks");
        addOptStat('onehitkills', "One Hit Kills", "attacks");
        addOptStat('attacksdraw', 'Stalemates', "attacks");
        addOptStat('bestdamage', "Best Damage", "attacks");
        addOptStat('attackdamage', "Total Damage", "attacks");
        addOptStat('bountiescollected', 'Bounties Collected', "attacks");
        addOptStat('unarmoredwon', "Unarmored Fights Won", "attacks");
        addOptStat('attackhits', "Total Attack Hits", "attacks");
        addOptStat('attacksassisted', "Total Assists", "attacks");
        addOptStat("yourunaway", "Times you Escaped", "attacks");
        addOptStat("theyrunaway", "Foes Escaped", "attacks");

        addOptStat("cantaken", "Cannabis Taken", "drugs");
        addOptStat("exttaken", "Ecstacy Taken", "drugs");
        addOptStat("kettaken", "Ketamine Taken", "drugs");
        addOptStat("lsdtaken", "LSD Taken", "drugs");
        addOptStat("opitaken", "Opium Taken", "drugs");
        addOptStat("shrtaken", "Shrooms Taken", "drugs");
        addOptStat("spetaken", "Speed Taken", "drugs");
        addOptStat("pcptaken", "PCP Taken", "drugs");
        addOptStat("xantaken", "Xanax Taken", "drugs");
        addOptStat("victaken", "Vicodin Taken", "drugs");

        addOptStat("argtravel", "Flights to Argentina", "travel");
        addOptStat("mextravel", "Flights to Mexico", "travel");
        addOptStat("dubtravel", "Flights to UAE", "travel");
        addOptStat("hawtravel", "Flights to Hawaii", "travel");
        addOptStat("japtravel", "Flights to Japan", "travel");
        addOptStat("lontravel", "Flights to UK", "travel");
        addOptStat("soutravel", "Flights to South Africa", "travel");
        addOptStat("switravel", "Flights to Switzerland", "travel");
        addOptStat("chitravel", "Flights to China", "travel");
        addOptStat("cantravel", "Flights to Canada", "travel");
        addOptStat("caytravel", "Flights to Caymans", "travel");

        addOptStat('smghits', "Finishing Hits: SMG", "weapons");
        addOptStat('chahits', "Finishing Hits: Mechanical", "weapons");
        addOptStat('heahits', "Finishing Hits: Heavy Artillery", "weapons");
        addOptStat('pishits', "Finishing Hits: Pistols", "weapons");
        addOptStat('machits', "Finishing Hits: Machine Guns", "weapons");
        addOptStat('grehits', "Finishing Hits: Temps", "weapons");
        addOptStat('h2hhits', "Finishing Hits: Hand to Hand", "weapons");
        addOptStat('axehits', "Finishing Hits: Clubbing", "weapons");
        addOptStat('rifhits', "Finishing Hits: Rifle", "weapons");
        addOptStat('shohits', "Finishing Hits: Shotgun", "weapons");
        addOptStat('piehits', "Finishing Hits: Piercing", "weapons");
        addOptStat('slahits', "Finishing Hits: Slashing", "weapons");

        addOptStat('roundsfired', "Rounds Fired", "weapons");
        addOptStat('specialammoused', "Special Ammo Total Used", "weapons");
        addOptStat('hollowammoused', "Hollow Point Ammo Used", "weapons");
        addOptStat('tracerammoused', "Tracer Ammo Used", "weapons");
        addOptStat('piercingammoused', "Piercing Ammo Used", "weapons");
        addOptStat('incendiaryammoused', "IncendiaryAmmo Used", "weapons");

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
    }

    function removeTornStatTracker() {
        if (stats_updateTimer) {
            clearInterval(stats_updateTimer);
            stats_updateTimer = null;
        }
        $("#xedx-stats").remove()
    }

    // Portion of "Torn Stat Tracker" script run when on config page
    function handleStatsConfigPage() {
        log('[handleStatsConfigPage]');

        initOptStats();

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

        let saveButton = document.querySelector('#xedx-button');
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
            log('[handleStatsSaveButton]');
            GM_setValue("stats-config", 'saved');
            const newP = '<p id="x1"><span class="notification">Data Saved!</span></p>';
            let myTable = document.getElementById('xedx-table');
            myTable.parentNode.insertBefore($(newP)[0], myTable.nextSibling);
            setTimeout(clearStatsResult, 3000);
        }

        function clearStatsResult() {
            document.getElementById('x1').remove();
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Drug Stats" (called at API call complete)
    //////////////////////////////////////////////////////////////////////

    function tornDrugStats() {

        return _tornDrugStats();

        function _tornDrugStats() {
            log('[tornDrugStats]');

            let extDiv = drug_stats_div; // Pulled from the include, 'Torn-Drug-Stats-Div.js' Move to here!!!
            let extDivId = 'xedx-drugstats-ext-div';
            let mainDiv = document.getElementById('column0');

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornDrugStats] not at home!');
                if (!isIndexPage()) reject('[tornDrugStats] not on home page.');
                if (!validPointer(mainDiv)) return reject('[tornDrugStats] unable to locate main DIV! Consider launching later.');
                $(mainDiv).append(extDiv); // could be $('#column0') ???

                installDrugStats(personalStats);

                resolve('tornDrugStats complete!');
            });
        }

        function installDrugStats(stats) {
            let knownSpans = ['cantaken', 'exttaken', 'kettaken', 'lsdtaken',
                              'opitaken', 'opitaken', 'shrtaken', 'spetaken',
                              'pcptaken', 'xantaken', 'victaken', 'drugsused',
                              'overdosed', 'rehabs', 'rehabcost'];

            knownSpans.forEach((name) => {
                let id = 'xedx-val-span-' + name;
                let valSpan = document.getElementById(id);
                let value = stats[name];
                if (typeof value === 'undefined' || value === null) {value = 0;} // Drug not taken yet

                // Format properly and insert.
                if (!name.localeCompare('rehabcost')) {
                    valSpan.innerText = '$' + numberWithCommas(value);
                } else if (!name.localeCompare('overdosed')) {
                    var pct = (Number(value) / Number(stats['drugsused'])*100).toFixed(2);
                    valSpan.innerText = value + ' (' + pct + '%)';
                } else {
                    valSpan.innerText = value;
                }
            });

            addDrugToolTips();
        }

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
            let useDiv = document.getElementById('xedx-val-span-' + item);
            let useText = useDiv.innerText.replace(/,/g, "");
            let pctText = useText/50 * 100;
            if (Number(pctText) >= 100) {
                pctText = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText = '<B><font color=\'red\'>' + pctText + '%</font></B>';
            }

            let divSpan = document.getElementById('xedx-div-span-' + item);
            let text = '<B>' + divSpan.innerText + ': </B>Honor Bar Available' + CRLF;
            let effectText, cdText, sideEffectText, odChance, addiction;

            switch (item) {
                case 'cantaken':
                    text = text + TAB + '<B>Who\'s Frank?</B> (50 Cannabis): ' + pctText + CRLF +
                        TAB + '<B>Spaced Out</B> (Overdose on Cannabis)' + CRLF;
                    effectText = 'Increases nerve by 2-3.';
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

    function removeDrugStats() {$("#xedx-drugstats-ext-div").remove()}

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Jail Stats" (called at API call complete)
    //////////////////////////////////////////////////////////////////////

    function tornJailStats() {
        const jailExtDivId = 'xedx-jailstats-ext-div';

        return _tornJailStats();

        function _tornJailStats() {
            log('[tornJailStats]');

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornJailStats] not at home!');
                if (!isIndexPage()) reject('[tornJailStats] not on home page.');
                if (document.querySelector(jailExtDivId)) {resolve('tornJailStats complete!');} // Only do this once

                let mainDiv = document.getElementById('column0');
                if (!validPointer(mainDiv)) {return reject('[tornJailStats] mainDiv nor found! Try calling later.');}
                $(mainDiv).append(getJailStatsDiv());
                populateJailDiv();

                resolve('tornJailStats complete!');
            });
        }

        function getJailStatsDiv() {
            let result = '<div class="sortable-box t-blue-cont h" id="' + jailExtDivId + '">' +
                  '<div id="xedx-header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">' +
                      '<div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>' +
                      '<div class="move-wrap"><i class="accordion-header-move right"></i></div>' +
                      'Jail and Bounty Stats' +
                  '</div>' +
                  '<div class="bottom-round">' +
                      '<div id="xedx-jail-stats-content-div" class="cont-gray bottom-round" style="width: 386px; height: 174px; overflow: auto">' +
                          '<ul class="info-cont-wrap">' +
                              '<li id="xedx-busts" title="original"><span class="divider" id="xedx-div-span-peoplebusted"><span>People Busted</span></span><span id="xedx-val-span-peoplebusted" class="desc">0</span></li>' +
                              '<li><span class="divider" id="xedx-div-span-failedbusts"><span>Failed Busts</span></span><span id="xedx-val-span-failedbusts" class="desc">0</span></li>' +
                              '<li id="xedx-bails" title="original"><span class="divider" id="xedx-div-span-peoplebought"><span>People Bailed</span></span><span id="xedx-val-span-peoplebought" class="desc">0</span></li>' +
                              '<li><span class="divider" id="xedx-div-span-peopleboughtspent"><span>Bail Fees</span></span><span id="xedx-val-span-peopleboughtspent" class="desc">0</span></li>' +
                              '<li><span class="divider" id="xedx-div-span-jailed"><span>Times Jailed</span></span><span id="xedx-val-span-jailed" class="desc">0</span></li>' +
                              '<li id="xedx-bounties" title="original"><span class="divider" id="xedx-div-span-bountiescollected"><span>Bounties Collected</span></span><span id="xedx-val-span-bountiescollected" class="desc">0</span></li>' +
                              '<li id="xedx-fees" title="original"><span class="divider" id="xedx-div-span-totalbountyreward"><span>Bounty Rewards</span></span><span id="xedx-val-span-totalbountyreward" class="desc">0</span></li>' +
                          '</ul>' +
                      '</div>' +
                  '</div>' +
              '</div>';

            return result;
        }

        function populateJailDiv() {
            let jailStatArray = ['peoplebusted', 'failedbusts','peoplebought','peopleboughtspent','jailed','bountiescollected','totalbountyreward'];
            for (let i=0; i<jailStatArray.length; i++) {
                let name = jailStatArray[i];
                let searchName = 'xedx-val-span-' + name;
                let valSpan = document.getElementById(searchName);
                let stats = jsonResp.personalstats;
                if (!validPointer(valSpan)) {
                    log('[populateJailDiv] Unable to find proper span: ' + searchName + ' at ' + document.URL);
                    continue;
                }
                if (!validPointer(stats[name])) {continue;}
                if (!name.localeCompare('totalbountyreward') || !name.localeCompare('peopleboughtspent')) {
                    valSpan.innerText = '$' + numberWithCommas(stats[name]);
                } else {
                    valSpan.innerText = stats[name];
                }
            }

            addJailToolTips();
        }

        function addJailToolTips() {
            addToolTipStyle();

            var bustsLi = document.getElementById('xedx-busts');
            var bailsLi = document.getElementById('xedx-bails');
            var bountiesLi = document.getElementById('xedx-bounties');
            var feesLi = document.getElementById('xedx-fees');

            if (validPointer(bustsLi) && validPointer(bailsLi) &&
                validPointer(bountiesLi) && validPointer(feesLi)) {
                buildBustsToolTip('People Busted');
                buildBailsToolTip('People Bailed');
                buildBountiesToolTip('Bounties Collected');
                buildFeesToolTip('Bounty Rewards');
            }
        }

        function buildFeesToolTip(title) {
            var feesLi = document.getElementById('xedx-fees');
            var feesText = document.getElementById('xedx-val-span-totalbountyreward').innerText;
            var tmp = feesText.replace('$', '');
            tmp = tmp.replace(/,/g, '');
            var pctText = tmp/10000000 * 100;
            if (Number(pctText) >= 100) {
                pctText = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
            }

            var text = '<B>' + title + CRLF + CRLF + '</B>Honor Bar at $10,000,000: <B>\"Dead or Alive\"</B> ' + pctText;
            displayToolTip(feesLi, text);
        }

        function buildBountiesToolTip(title) {
            var bountiesLi = document.getElementById('xedx-bounties');
            var bountiesText = document.getElementById('xedx-val-span-bountiescollected').innerText;
            var pctText = bountiesText/250 * 100;
            if (Number(pctText) >= 100) {
                pctText = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
            }

            var text = '<B>' + title + CRLF + CRLF + '</B>Honor Bar at 250: <B>\"Bounty Hunter\"</B> ' + pctText;
            var text2 = 'Medals at: <B>' +
            ((bountiesText > 25) ? '<font color=green>25, </font>' : '<font color=red>25, </font>') +
                ((bountiesText > 100) ? '<font color=green>100, </font>' : '<font color=red>100, </font>') +
                ((bountiesText > 500) ? '<font color=green>500</font></B>' : '<font color=red>500</font></B>');

            displayToolTip(bountiesLi, text + CRLF + text2);
        }

        function buildBustsToolTip(title) {
            var bustsLi = document.getElementById('xedx-busts');
            var bustsText = document.getElementById('xedx-val-span-peoplebusted').innerText;
            var pctText = bustsText/1000 * 100;
            if (Number(pctText) >= 100) {
                pctText = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
            }
            var pctText2 = bustsText/2500 * 100;
            if (Number(pctText2) >= 100) {
                pctText2 = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText2 = '<B><font color=\'red\'>' + Math.round(pctText2) + '%</font></B>';
            }
            var pctText3 = bustsText/10000 * 100;
            if (Number(pctText3) >= 100) {
                pctText3 = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText3 = '<B><font color=\'red\'>' + Math.round(pctText3) + '%</font></B>';
            }

            var text = '<B>' + title + CRLF + CRLF + '</B>Honor Bar at 1,000: <B>\"Bar Breaker\"</B> ' + pctText;
            var text2 = 'Honor Bar at 2,500: <B>\"Aiding and Abetting\"</B> ' + pctText2;
            var text3 = 'Honor Bar at 10,000: <B>\"Don\'t Drop It\"</B> ' + pctText3;
            var text4 = 'Medals at: <B>' +
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
            var bailsLi = document.getElementById('xedx-bails');
            var bailsText = document.getElementById('xedx-val-span-peoplebought').innerText;
            var pctText = bailsText/500 * 100;
            if (Number(pctText) >= 100) {
                pctText = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
            }

            var text = '<B>' + title + CRLF + CRLF + '</B>Honor Bar at 500: <B>\"Freedom isn\'t Free\"</B> ' + pctText;
            displayToolTip(bailsLi, text);
        }

    }

    function removeJailStats() {$("#xedx-jailstats-ext-div").remove();}

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Fac Respect" (called at API call complete)
    //////////////////////////////////////////////////////////////////////

    function tornFacRespect() {

        return _tornFacRespect();

        function _tornFacRespect() {
            log('[tornFacRespect]');

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornFacRespect] not at home!');
                if (!isIndexPage()) reject('[tornFacRespect] not on home page.');
                if ($('#skip-to-content').html().indexOf('Home') < 0) return reject('[tornFacRespect] unable to find content header.');
                let error = buildPersonalRespectLi();
                if (error)
                    reject(error);
                else
                    resolve("tornFacRespect complete!");
            });
        }

        // Returns null on success, string error otherwise...
        function buildPersonalRespectLi() {
            let respect = personalStats.respectforfaction;
            let children = document.querySelector("#column0").children;
            let useSel = null;
            let ul = null;
            for (let i=0; i<children.length; i++) {
                let title = children[i].querySelector("div.title.main-title.title-black.active.top-round > h5");
                if (!title) continue;
                if (title.innerText == 'Faction Information') {
                    useSel = children[i];
                    break;
                }
            };
            if (useSel) ul = $(useSel).find('div.bottom-round > div.cont-gray > ul.info-cont-wrap');
            debug('buildPersonalRespectLi ul = ', ul);
            if (!ul) return '[tornFacRespect] Unable to find correct ul!';

            let li = '<li tabindex="0" role="row" aria-label="Personal Respect Earned" id="xedx-respect-li"><div id="xedx-respect">' +
                         '<span class="divider"><span>Personal Respect Earned</span></span>' +
                         '<span class="desc">' + respect.toLocaleString("en") + '</span>' +
                     '</div></li>';
            $(ul).append(li);
            addFacToolTip(li);
            return null;
        }

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

        return _tornSidebarColors();

        function _tornSidebarColors() {
            log('[tornSidebarColors]');

            return new Promise((resolve, reject) => {
                init_opt_scIcons();

                let keys = Object.keys(opt_scIcons);
                for (let i=0; i<keys.length; i++) {
                    let data = opt_scIcons[keys[i]];
                    colorIcon(data);
                }

                resolve("tornSidebarColors complete!");
            });
        }

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
            opt_scIcons.facIcon = {svgLink: "#nav-my_faction", color: '#DFAF2A', strokeWidth: defStrokeWidth};
            opt_scIcons.recIcon = {svgLink: "#nav-recruit_citizens", color: 'red', strokeWidth: defStrokeWidth};
            opt_scIcons.calendarIcon = {svgLink: "#nav-calendar", color: 'orange', strokeWidth: defStrokeWidth};
            opt_scIcons.travelIcon = {svgLink: "#nav-traveling", color: '#6AB6F3', strokeWidth: defStrokeWidth};
            opt_scIcons.peopleIcon = {svgLink: "#nav-people", color: '#F7BDA4', strokeWidth: defStrokeWidth};
        }

        function colorIcon(data) {
            const sc_svrRoot = " > div > a > span.svgIconWrap___YUyAq > svg";
            let icon = document.querySelector(data.svgLink + sc_svrRoot);
            if (icon) {
                icon.setAttribute('stroke', data.color);
                icon.setAttribute('stroke-width', data.strokeWidth);
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

    function tornCustomizableSidebar() {
        let cs_caretState = 'fa-caret-down';

        return _tornCustomizableSidebar();

        function _tornCustomizableSidebar() {
            log('[tornCustomizableSidebar]');

            GM_addStyle(".xedx-caret {" +
                    "padding-top:5px;" +
                    "padding-bottom:5px;" +
                    "padding-left:20px;" +
                    "padding-right:10px;" +
                    "}");

            installCollapsibleCaret();
            installHashChangeHandler(installCollapsibleCaret);

            return new Promise((resolve, reject) => {
                initCustLinksObject();
                initCustLinkClassNames();
                let keys = Object.keys(custLinksOpts);
                for (let i=0; i<keys.length; i++) {
                    let key = keys[i];
                    if (custLinksOpts[key].enabled) {
                        log('[tornCustomizableSidebar] Adding: ' + key.replaceAll('custlink-', ''));
                        let node = buildCustLink(key, custLinksOpts[key]);
                        let root = custLinkGetRoot(key);
                        custLinkInsert(root, node, key);
                    } else {
                        log('[tornCustomizableSidebar] Removing: ' + key.replaceAll('custlink-', ''));
                        custLinkNodeRemove(key);
                    }
                }

                resolve("tornCustomizableSidebar complete!");
            });
        }

        function initCustLinkClassNames() {
            if($('#nav-items').length){
                custLinkClassNames.link_class = $('#nav-items').attr('class').split(" ")[0];
                custLinkClassNames.row_class  = $('#nav-items > div:first').attr('class');
                custLinkClassNames.a_class    = $('#nav-items a').attr('class');
                custLinkClassNames.icon_class = $('#nav-items a span').attr('class');
                custLinkClassNames.icon_class = $('#nav-items a span').attr('class');
                custLinkClassNames.link_name_class = $('#nav-items a span').eq(1).attr('class');
            }
            debug('[initCustLinkClassNames] custLinkClassNames: ', custLinkClassNames);
        }

        function custLinkGetRoot(key) {
            let cat = custLinksOpts[key].cat;
            let node = null;
            switch (cat.toLowerCase()) {
                case 'home':
                    node = document.getElementById('nav-home');
                    break;
                case 'casino':
                    node = document.getElementById('nav-casino');
                    break;
                case 'city':
                default:
                    node = document.getElementById('nav-city');
                    break;
            }

            return node;
        }

        function custLinkInsert(root, node, key=null) {
            debug('[custLinkInsert] root: ', root);
            debug('[custLinkInsert] node: ', node);
            debug('[custLinkInsert] key: ', key);
            $(node).insertAfter(root);
        }

        function custLinkNodeRemove(key) {
            $('#' + key).remove();
        }

        function buildCustLink(key) {
            // Span1: (icons - if I want to add them)
            // <i class="cql-raceway"></i>
            // <i class="cql-stock-market"></i>
            // <i class="cql-travel-agency"></i>

            let data = custLinksOpts[key];
            let fullLink = (data.link.indexOf('www.torn.com') > -1) ? data.link : "https://www.torn.com/" + data.link;

            let outerDiv = '<div class="' + custLinkClassNames.link_class + '" style="display: block" id="' + key + '"><div class="' +
                custLinkClassNames.row_class  + '">';
            //let span1 = '<span class="svgIconWrap___YUyAq "><i class="cql-travel-agency"></i></span>';
            let aData = '<a href="' + fullLink + '" class="' + custLinkClassNames.a_class + '">'; // '" i-data="i_0_1120_172_23">' +
            let span2 = '<span class="' + custLinkClassNames.link_name_class + '">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp;' + data.desc + '</span>';
            let endDiv = '</a></div></div>';

            return outerDiv + aData + /* span1 + */ span2 + endDiv;
        }

        // Returns null on success, error otherwise.
        function installCollapsibleCaret() {
            const caretNode = `<span style="float:right;"><i id="xedx-collapse" class="icon fas fa-caret-down xedx-caret"></i></span>`;
            cs_caretState = GM_getValue('cs_lastState', cs_caretState);
            if (!document.querySelector("#sidebarroot")) return "'#sidebarroot' not found, try again later!";
            if (document.getElementById('xedx-collapse')) document.getElementById('xedx-collapse').remove();
            if (!document.querySelector("#nav-city")) return "'#nav-city' not found, try again later!";

            // Set parents to 'flex', allow divs to be side-by-side
            document.querySelector("#nav-city").setAttribute('style', 'display:flex;');
            document.querySelector("#nav-city > div > a").setAttribute('style', 'width:70%;float:left;');

            // Add the caret and handler.
            let target = document.querySelector("#nav-city > div");
            if (!target) return "'#nav-city > div' not found, try again later!";
            $(target).append(caretNode);
            document.getElementById("xedx-collapse").addEventListener('click', function (event) {
                cs_handleClick(event)}, { passive: false });

            // Little trick here - set current state to opposite of the saved state.
            // So calling the handler tricks it to set the *other* way, which is how
            // we want it to start up.
            cs_caretState = (cs_caretState == 'fa-caret-down') ? 'fa-caret-right' : 'fa-caret-down';
            cs_handleClick();
        }

        function cs_handleClick(e) {
            debug('[cs_handleClick] state = ' + cs_caretState);
            let targetNode = document.querySelector("#xedx-collapse"); // e.target
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
            GM_setValue('cs_lastState', cs_caretState);
            $("[id^=custlink-]").attr("style", "display: " + elemState);
        }
    } // End function tornCustomizableSidebar() {

    function removeCustomizableSidebar() {
        $("[id^=custlink-]").remove();
        $("#xedx-collapse").remove();
    }

    // Initialize custom links - defaults (set cust=false). Sets value in storage, to be read into table by updateCustLinksRows()
    function initCustLinksObject() {
        log('[initCustLinksObject]');

        // Add 'dump' 'racetrack' - see altercoes for others (stock market, travel agency)
        // drag-and-drop to set order? (they appear in reverse order of here)
        // Maybe get list then traverse backwards? Or give an index value....better...
        //https://www.torn.com/racing.php
        //https://www.torn.com/dump.php
        //https://www.torn.com/travelagency.php
        let link0 = JSON.parse(GM_getValue('custlink-bounties', JSON.stringify({enabled: true, cust: false, desc: "Bounties", link: "https://www.torn.com/bounties.php#!p=main", cat: "City"})));
        let link1 = JSON.parse(GM_getValue('custlink-auctionhouse', JSON.stringify({enabled: true, cust: false, desc: "Auction House", link: "amarket.php", cat: "City"})));
        let link2 = JSON.parse(GM_getValue('custlink-bitsnbobs', JSON.stringify({enabled: true, cust: false, desc: "Bits 'n Bobs", link: "shops.php?step=bitsnbobs", cat: "City"})));
        let link3 = JSON.parse(GM_getValue("custlink-pointsbuilding", JSON.stringify({enabled:true, cust: false, desc: "Points Building", link: "points.php", cat: "City"})));
        let link4 = JSON.parse(GM_getValue("custlink-itemmarket", JSON.stringify({enabled:true, cust: false, desc: "Item Market", link: "imarket.php", cat: "City"})));
        let link5 = JSON.parse(GM_getValue("custlink-log", JSON.stringify({enabled:true, cust: false, desc : "Log", link: "page.php?sid=log", cat: "Home"})));
        let link6 = JSON.parse(GM_getValue("custlink-slots", JSON.stringify({enabled:true, cust: false, desc: "Slots", link: "loader.php?sid=slots", cat: "Casino"})));
        let link7 = JSON.parse(GM_getValue("custlink-spinthewheel", JSON.stringify({enabled:true, cust: false, desc: "Spin the Wheel", link: "loader.php?sid=spinTheWheel", cat: "Casino"})));
        let link8 = JSON.parse(GM_getValue("custlink-poker", JSON.stringify({enabled:true, cust: false, desc: "Poker", link: "loader.php?sid=holdem", cat: "Casino"})));
        let link9 = JSON.parse(GM_getValue("custlink-russianroulette", JSON.stringify({enabled:true, cust: false, desc: "Russian Roulette", link: "page.php?sid=russianRoulette", cat: "Casino"})));

        // Force an adjustment - move 'Log' to under 'Home'
        // Make editable?
        link5.cat = "Home";

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

        // Then fill the 'custLinksOpts' object
        updateCustLinksRows();
    }

    // Read all 'custlink-' storage entries into 'custLinksOpts' obj
    // Called from saveLinksTableToStorage, initCustLinksObject
    function updateCustLinksRows() {
        log('[updateCustLinksRows]');
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
        log('[saveLinksTableToStorage]');

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

    function tornHideShowChat() {

        const hideChatDiv = getHideChatDiv();

        return _tornHideShowChat();

        function _tornHideShowChat() {
            log('[tornHideShowChat]');

            return new Promise((resolve, reject) => {
                if (!validPointer($("#chatRoot > div"))) { // Should never happen...
                }

                appendHideShowChatDiv();
                hideChat(GM_getValue('xedxHideChat', false));
                disableTornToolsChatHide();

                resolve("tornHideShowChat complete!");
            });
        }

        function hideChat(hide) {
            log('[hideChat] ' + (hide ? "hiding chat icons." : "showing chat icons."));
            $('#showHideChat').text(`[${hide ? 'show' : 'hide'}]`);
            if (document.querySelector("#chatRoot > div"))
                document.querySelector("#chatRoot > div").style.display = hide ? 'none' : 'block';
        }

        //const hideChatHdr = '<hr id="xedx-hr-delim" class="delimiter___neME6">';

        function getHideChatDiv() {
            return '<div id="xedxShowHideChat"><hr id="xedx-hr-delim" class="delimiter___neME6">' +
                '<div style="padding-bottom: 5px; padding-top: 5px;">' +
                '<span style="font-weight: 700;">Chat Icons</span>' +
                '<a id="showHideChat" class="t-blue show-hide">[hide]</a></div></div>';
        }

        function disableTornToolsChatHide() {
            if (validPointer($('#tt-hide_chat')[0])) {
                log("Disabling TornTools 'Hide Chat' icon");
                $('#tt-hide_chat')[0].style.display = 'none';
            }
        }

        function appendHideShowChatDiv() {
            //$('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]').append(hideChatHdr);
            $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]').append(hideChatDiv);
            installHideShowClickHandler();
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
        log('[tornTTFilter]');

        const TT_HIDE_BAT_STATS = true; // Hide TT bat stats?

        // Mutation observer for attacks list
        var targetNode = null;
        var observer = null;
        const config = {attributes: false, childList: true, subtree: true};

        function handleNewPage() {
            debug('[tornTTFilter] hash change!');
            hideTtActiveIndicator();
        }

        return new Promise((resolve, reject) => {

            hideTtActiveIndicator();
            installHashChangeHandler(handleNewPage);

            // Faction page specific stuff
            if (location.href.indexOf('factions.php?step=your') > -1 &&
                location.hash.indexOf('tab=info') > -1) { // Faction info page
                setTimeout(handleFacInfoPage, 500);
            }

            // Hide bat stats estimates? (various pages)
            hideStatEstimates();

            resolve("tornTTFilter startup complete!");
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
            debug('[tornTTFilter] [hideStatEstimates]');
            if (!TT_HIDE_BAT_STATS) return;
            let ttNodes = document.getElementsByClassName('tt-stats-estimate');
            debug('[tornTTFilter] Found ' + ttNodes.length + ' stat estimates');
            if (ttNodes) {
                Array.prototype.forEach.call(ttNodes, function(node) {
                    debug('[tornTTFilter] Hiding node ', node);
                    node.setAttribute('style', 'display: none;');
                });
            }
        }

        function hideTtActiveIndicator() {
            debug('[tornTTFilter] [hideTtActiveIndicator]');
            let ttIndicator = document.querySelector("#tt-page-status");
            if (ttIndicator) {
                debug("[tornTTFilter] Hidding 'active' indicator");
                $(ttIndicator).addClass('xhidden');
            } else {
                debug("[tornTTFilter] not found - will check later.");
                setTimeout(hideTtActiveIndicator, 500);
            }
        }

    }

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Crime Tooltips" (called at content complete)
    //////////////////////////////////////////////////////////////////////

    function tornCrimeTooltips() {

        return _tornCrimeTooltips();

        function _tornCrimeTooltips() {
            log('[tornCrimeTooltips]');

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornCrimeTooltips] not at home!');

                addCriminalRecordToolTips();
                resolve("tornCrimeTooltips complete!");
            });
        }

        function addCriminalRecordToolTips() {
            let rootDiv = document.getElementsByClassName('cont-gray bottom-round criminal-record')[0];
            if (!validPointer(rootDiv)) {return;}

            addToolTipStyle();

            let ul = rootDiv.getElementsByClassName("info-cont-wrap")[0];
            let items = ul.getElementsByTagName("li");
            for (let i = 0; i < items.length; ++i) {
                let li = items[i];
                let label = li.innerText;
                let ariaLabel = li.getAttribute('aria-label');
                let crimes = qtyFromAriaLabel(ariaLabel);

                debug('li #' + i + '\nlabel = "' + label +'"\naria-label = "' + ariaLabel +'"');
                if (ariaLabel.indexOf('Illegal') != -1) {
                    dispIllegalProductsTT(li, crimes);
                } else if (ariaLabel.indexOf('Theft') != -1) {
                    dispTheftTT(li, crimes);
                } else if (ariaLabel.indexOf('Auto theft') != -1) {
                    dispAutoTT(li, crimes);
                } else if (ariaLabel.indexOf('Drug deals') != -1) {
                    dispDrugTT(li, crimes);
                } else if (ariaLabel.indexOf('Computer crimes') != -1) {
                    dispComputerTT(li, crimes);
                } else if (ariaLabel.indexOf('Murder') != -1) {
                    dispMurderTT(li, crimes);
                } else if (ariaLabel.indexOf('Fraud crimes') != -1) {
                    dispFraudTT(li, crimes);
                } else if (ariaLabel.indexOf('Other') != -1) {
                    dispOtherTT(li, crimes);
                } else if (ariaLabel.indexOf('Total') != -1) {
                    dispTotalTT(li, crimes);
                }
            }
        }

        function dispIllegalProductsTT(li, crimes) {
            debug('dispIllegalProductsTT');
            var text = '<B>Illegal Products (Bottlegging):</B>' + CRLF + TAB + 'Sell Copied Media, Arms Trafficking' + CRLF + CRLF;
            text = text + 'Honor Bar at 5,000: <B>\"Civil Offence\",</B> ' + getPctForLi(li, 5000);

            displayToolTip(li, text);
        }

        function dispTheftTT(li, thefts) {
            var text = '<B>Theft:</B>' + CRLF +
                TAB + 'Shoplift, Pickpocket Someone, Larceny,' + CRLF + TAB + 'Armed Robberies, Kidnapping' + CRLF + CRLF;
                text = text + 'Honor Bars at:' + CRLF +
                TAB + '1,000: <B>\"Candy Man\",</B> ' + getPctForLi(li, 1000) + CRLF +
                TAB + '2,500: <B>\"Smile You\'re On Camera\",</B> ' + getPctForLi(li, 2500) + CRLF +
                TAB + '5,000: <B>\"Smokin\' Barrels\",</B> ' + getPctForLi(li, 5000) + CRLF +
                TAB + '7,500: <B>\"Breaking And Entering\",</B> ' + getPctForLi(li, 7500) + CRLF +
                TAB + '10,000: <B>\"Stroke Bringer\",</B> ' + getPctForLi(li, 10000);

            debug('dispTheftTT, thefts = ' + thefts);
            var text2 = 'Medals at: <B>' +
                ((thefts >= 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
                ((thefts >= 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
                ((thefts >= 5000) ? '<font color=green>5000, </font></B>' : '<font color=red>5000, </font>') +
                ((thefts >= 7500) ? '<font color=green>7500, </font></B>' : '<font color=red>7500, </font>') +
                ((thefts >= 10000) ? '<font color=green>10000, </font></B>' : '<font color=red>10000, </font>') +
                ((thefts >= 12500) ? '<font color=green>12500, </font></B>' : '<font color=red>12500, </font>') +
                ((thefts >= 15000) ? '<font color=green>15000, </font></B>' : '<font color=red>15000, </font>') +
                ((thefts >= 17500) ? '<font color=green>17500, </font></B>' : '<font color=red>17500, </font>') +
                ((thefts >= 20000) ? '<font color=green>20000, </font></B>' : '<font color=red>20000, </font>') +
                ((thefts >= 22500) ? '<font color=green>22500, </font></B>' : '<font color=red>22500, </font>') +
                ((thefts >= 25000) ? '<font color=green>25000</font></B>' : '<font color=red>25000</font></B>');

            displayToolTip(li, text + CRLF + CRLF + text2);
        }

        function dispAutoTT(li, crimes) {
            var text = '<B>Auto Theft:</B>' + CRLF + TAB + 'Grand Theft Auto' + CRLF + CRLF;
            text = text + 'Honor Bar at 5,000: <B>\"Joy Rider\",</B> ' + getPctForLi(li, 5000);

            debug('dispAutoTT, crimes = ' + crimes);
            var text2 = 'Medals at: <B>' +
                ((crimes >= 1500) ? '<font color=green>1500, </font>' : '<font color=red>1500, </font>') +
                ((crimes >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
                ((crimes >= 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
                ((crimes >= 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
                ((crimes >= 3500) ? '<font color=green>3500, </font>' : '<font color=red>3500, </font>') +
                ((crimes >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
                ((crimes >= 4500) ? '<font color=green>4500, </font>' : '<font color=red>4500, </font>') +
                ((crimes >= 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
                ((crimes >= 5500) ? '<font color=green>5500, </font>' : '<font color=red>5500, </font>') +
                ((crimes >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
                ((crimes >= 6500) ? '<font color=green>6500, </font>' : '<font color=red>6500, </font>') +
                ((crimes >= 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
                ((crimes >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
                ((crimes >= 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
                ((crimes >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');


            displayToolTip(li, text + CRLF + CRLF + text2);
        }

        function dispDrugTT(li, crimes) {
            var text = '<B>Drug deals:</B>' + CRLF + TAB + 'Transport Drugs' + CRLF + CRLF;
            text = text + 'Honor Bar at 5,000: <B>\"Escobar\",</B> ' + getPctForLi(li, 5000);

            debug('dispDrugTT, crimes = ' + crimes);
            var text2 = 'Medals at: <B>' +
                ((crimes >= 250) ? '<font color=green>250, </font>' : '<font color=red>250, </font>') +
                ((crimes >= 500) ? '<font color=green>500, </font>' : '<font color=red>500, </font>') +
                ((crimes >= 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
                ((crimes >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
                ((crimes >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
                ((crimes >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
                ((crimes >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
                ((crimes >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

            displayToolTip(li, text + CRLF + CRLF + text2);
        }

        function dispComputerTT(li, crimes) {
            var text = '<B>Computer crimes:</B>' + CRLF + TAB + 'Plant a Computer Virus, Hacking' + CRLF + CRLF;
            text = text + 'Honor Bar at 1,000: <B>\"Bug\",</B> ' + getPctForLi(li, 1000) + CRLF;
            text = text + 'Honor Bar at 5,000: <B>\"We Have A Breach\",</B> ' + getPctForLi(li, 5000);

            debug('dispComputerTT, crimes = ' + crimes);
            var text2 = 'Medals at: <B>' +
                ((crimes >= 1500) ? '<font color=green>1500, </font>' : '<font color=red>1500, </font>') +
                ((crimes >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
                ((crimes >= 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
                ((crimes >= 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
                ((crimes >= 3500) ? '<font color=green>3500, </font>' : '<font color=red>3500, </font>') +
                ((crimes >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
                ((crimes >= 4500) ? '<font color=green>4500, </font>' : '<font color=red>4500, </font>') +
                ((crimes >= 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
                ((crimes >= 5500) ? '<font color=green>5500, </font>' : '<font color=red>5500, </font>') +
                ((crimes >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
                ((crimes >= 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
                ((crimes >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
                ((crimes >= 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
                ((crimes >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

            displayToolTip(li, text + CRLF + CRLF + text2);
        }

        function dispMurderTT(li, frauds) {
            var text = '<B>Murder crimes:</B>' + CRLF + TAB + 'Assasination' + CRLF + CRLF;
            text = text + 'Honor Bar at 5,000: <B>\"Professional\",</B> ' + getPctForLi(li, 5000);

            debug('dispMurderTT, crimes = ' + frauds);
            var text2 = 'Medals at: <B>' +
                ((frauds >= 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
                ((frauds >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
                ((frauds >= 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
                ((frauds >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
                ((frauds >= 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
                ((frauds >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
                ((frauds >= 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
                ((frauds >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
                ((frauds >= 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
                ((frauds >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

            displayToolTip(li, text + CRLF + CRLF + text2);
        }

        function dispFraudTT(li, frauds) {
            var text = '<B>Fraud crimes:</B>' + CRLF + TAB + 'Arson, Pawn Shop, Counterfeiting,' + CRLF + TAB +
                'Arms Trafficking, Bombings' + CRLF + CRLF;
            text = text + 'Honor Bar at 5,000: <B>\"Fire Starter\",</B> ' + getPctForLi(li, 5000);

            debug('dispFraudTT, crimes = ' + frauds);
            var text2 = 'Medals at: <B>' +
                ((frauds >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
                ((frauds >= 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
                ((frauds >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
                ((frauds >= 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
                ((frauds >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

            displayToolTip(li, text + CRLF + CRLF + text2);
        }

        function dispOtherTT(li, crimes) {
            debug('dispOtherTT');
            var text = '<B>Other crimes:</B>' + CRLF + TAB + 'Search for cash' + CRLF + CRLF;
            text = text + 'Honor Bar at 5,000: <B>\"Find A Penny, Pick It Up\",</B> ' + getPctForLi(li, 5000);

            displayToolTip(li, text);
        }

        function dispTotalTT(li, crimes) {
            debug('dispTotalTT');
            var text = '<B>Total Criminal Offences:</B>' + CRLF + TAB + 'Well, everything.' + CRLF + CRLF;
            text = text + 'Honor Bar at 10,000: <B>\"Society\'s Worst\",</B> ' + getPctForLi(li, 10000);

            displayToolTip(li, text);
        }

        // Helper to parse # from an aria-label
        function qtyFromAriaLabel(ariaLabel) {
            // ex. aria-label = "Drug deals: 255"
            var parts = ariaLabel.split(':');
            return Number(parts[1].replace(/,/g, ""));
        }

        // Helper to get the value of the number associated with the
        // span, which is a key/value string pair, as a percentage.
        function getPctForLi(li, value) {
            let ariaLabel = li.getAttribute('aria-label');
            let crimes = qtyFromAriaLabel(ariaLabel);
            let pctText = crimes/value * 100;
            if (Number(pctText) >= 100) {
                pctText = '<B><font color=\'green\'>100%</font></B>';
            } else {
                pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
            }

            return pctText;
        }
    }

    function removeCrimeTooltips() {
        let rootDiv = document.getElementsByClassName('cont-gray bottom-round criminal-record')[0];
        if (!validPointer(rootDiv)) {return;}
        let ul = rootDiv.getElementsByClassName("info-cont-wrap")[0];
        let items = ul.getElementsByTagName("li");
        for (let i = 0; i < items.length; ++i) {
            items[i].removeAttribute('title');
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Item Hints" (called at content complete)
    //////////////////////////////////////////////////////////////////////

    function tornItemHints() {

        // Page names, spans, divs, mutation observer stuff, etc.
        const observerConfig = { attributes: true, characterData: true, subtree: true, childList: true };
        const pageSpanSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black > span.items-name";
        const pageDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black";
        const pageDiv = document.querySelector(tornWeaponSort.pageDivSelector);
        const mainItemsDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap";
        let pageName = null;
        let pageSpan = null;
        let pageObserver = null;

        let tih_modified = false;

        return _tornItemHints();

        function _tornItemHints() {
             log('[tornItemHints]');

            return new Promise((resolve, reject) => {
                installHints();
                resolve("[tornItemHints] complete!");
            });
        }

        function installHints() {
            let tmpPageName = getCurrentPageName();
            if (pageName == tmpPageName && tih_modified) {
                log('[installHints] Same name, already modified.');
                return;
            }
            pageName = tmpPageName;
            tih_modified = false;
            tih_observeOff();
            log("[installHints] On page '" + pageName + "'");

            if (pageName == 'Flowers') {
                let liList = $('#flowers-items > li');
                if (liList.length <= 1) {setTimeout(installHints, 1000); return;}
                let hints = fillHints(liList, flowerHints);
                log('Added hints to ' + hints + ' items.');
            } else if (pageName == 'Plushies') {
                let liList = $('#plushies-items > li');
                if (liList.length <= 1) {setTimeout(installHints, 1000); return;}
                let hints = fillHints(liList, plushieHints);
                log('[installHints] Added hints to ' + hints + ' items.');
            } else if (pageName == 'Temporary') {
                let liList = $('#temporary-items > li');
                if (liList.length <= 1) {setTimeout(installHints, 1000); return;}
                let hints = fillHints(liList, temporaryHints);
                log('Added hints to ' + hints + ' items.');
            }

            // Watch for active page changes.
            if (pageObserver == null) {
                var callback = function(mutationsList, observer) {
                    installHints();
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
                log('[tornItemHints] Disconnected observer.');
            }
        }

        function tih_observeOn() {
            if (pageObserver) {
                pageObserver.observe(pageDiv, observerConfig);
                log('[tornItemHints] Observing page.');
            }
        }

    } // End function tornItemHints() {

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Museum Set Helper" (called on API complete)
    //////////////////////////////////////////////////////////////////////

    function tornMuseumSetHelper() {
        const observerConfig = { attributes: true, characterData: true, subtree: true, childList: true };
        const pageSpanSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black > span.items-name";
        const pageDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black";
        const mainItemsDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap";
        const sepDiv = '<hr class="delimiter-999 m-top10 m-bottom10">';

        const flowerSetColor = "#5f993c"; // "#FFFACD50"; // LemonChiffon, 0x50% xparency, looks OK in light and dark modes
        const plushiesSetColor = "#5f993c";
        const quransSetSetColor = "#2f690c";
        const coinSetSetColor = "#5f993c"; //"Plum"; // #DDA0DD
        const senetSetSetColor = "LightBlue"; // #ADD8E6
        const missingItemColor = "#228B2250"; //"ForestGreen" #228B22

        const pawnShopPays = 45000;

        return _tornMuseumSetHelper();

        function _tornMuseumSetHelper() {
             log('[tornMuseumSetHelper]');

            return new Promise((resolve, reject) => {
                if (location.href.indexOf("item.php") < 0) return reject('tornMuseumSetHelper wrong page!');
                if (abroad()) return reject('tornMuseumSetHelper not at home!');

                initStatics();
                removeTTBlock();
                xedx_TornMarketQuery(null, 'pointsmarket', marketQueryCB);

                resolve("[tornMuseumSetHelper] startup complete!");
            });
        }

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
            if (jsonResp.error) {return handleError(responseText);}

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
                        debug('[tornMuseumSetHelper] Highlighted ' + element.name + "'s, count = " + qty);
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
            //return div.childNodes;
        }

        // Insert a node after a reference node
        function insertAfter(newNode, referenceNode) {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        }

        // Create a <li> with supplied item ID and name
        function buildNewLi(id, name) {
            // LI and DIVs to insert for set count, items needed, items required
            const newLi =
                '<li class="">' +
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
                                '<span class="qty bold d-hide"> x0</span>'+
                                '<span class="name">replaceName</span>'+
                                '<span class="qty bold t-hide"> x0</span>'+
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
            let temp = newLi.replace(/replaceID/g, id);
            let temp2 = temp.replace(/replaceName/g, name);
            return temp2;
        }

        // Helper to add items which we don't own
        function addMissingItems(ulDiv, setArray) {
            debug('[tornMuseumSetHelper] Adding missing items.');
            let hdrNode = document.getElementById(tornMuseumSetHelper.xedxHdrID);
            if (validPointer(hdrNode)) {
                log('[tornMuseumSetHelper] addMissingItems: header already present.');
                return;
            } // Means we've done this already.

            // Add a separator, header (and UL for new LI's)
            let mainItemsDiv = document.querySelector(mainItemsDivSelector);
            tornMuseumSetHelper.xedxSepNode = createElementFromHTML(sepDiv);
            tornMuseumSetHelper.xedxHdrNode = createElementFromHTML(requiredHdr());
            insertAfter(tornMuseumSetHelper.xedxSepNode, mainItemsDiv);
            insertAfter(tornMuseumSetHelper.xedxHdrNode.nextSibling, tornMuseumSetHelper.xedxSepNode);

            // Add LI's for each missing item - TBD
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
            if (validPointer($('#tt-needed-flowers-div'))) {$('#tt-needed-flowers-div').remove();}
            if (validPointer($('#tt-needed-plushies-div'))) {$('#tt-needed-plushies-div').remove();}
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
            tornMuseumSetHelper.pageName = tornMuseumSetHelper.pageSpan.innerText;
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

                // Add LI's for missing items
                if (!fullPlushieSets) {
                    removeFullSetHdr();
                    addMissingItems(ulDiv, plushiesInSet);
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

        return _tornWeaponSort();

        function _tornWeaponSort() {
             log('[tornWeaponSort]');

            return new Promise((resolve, reject) => {

                initStatics();

                if (location.href.indexOf("item.php") < 0) return reject('tornWeaponSort wrong page!');
                if (abroad()) return reject('tornWeaponSort not at home!');

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
            });
        }

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
            debug('[tornWeaponSort] sortPage: Auto Sort is ' + (tornWeaponSort.autosort ? 'ON' : 'OFF'));
            if (!tornWeaponSort.autosort) {
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
            debug('[tornWeaponSort] installUI');
            let parent = document.querySelector("#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.equipped-items-wrap");
            if (!parent) return setTimeout(installUI, 50);
            if (!document.querySelector("xedx-weapon-sort")) {
                let optionsDiv = getOptionsDiv();
                $(optionsDiv).insertAfter(parent);
            }

            // Install handlers and default states
            let ckBox = document.querySelector("#autosort");
            if (!ckBox) return setTimeout(installUI, 50);

            tornWeaponSort.autosort = GM_getValue('wsort-checkbox', tornWeaponSort.autosort);
            ckBox.checked = tornWeaponSort.autosort;
            ckBox.addEventListener("click", onCheckboxClicked);

            tornWeaponSort.selID = GM_getValue('wsort-selectedBtn', tornWeaponSort.selID);
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
            if (tornWeaponSort.lastSelID == tornWeaponSort.selID) return;
            debug('[tornWeaponSort] Radio Button Selected: ' + tornWeaponSort.selID);
            GM_setValue('wsort-selectedBtn', tornWeaponSort.selID);
            debug('[tornWeaponSort] onRadioClicked: Sorting page by ' + tornWeaponSort.sortOrder[tornWeaponSort.selID]);
            sortPage();
        }

        // Handle the "Auto Sort" checkbox
        function onCheckboxClicked() {
            let ckBox = document.querySelector("#autosort");
            GM_setValue('wsort-checkbox', ckBox.checked);
            tornWeaponSort.autosort = ckBox.checked;
            debug('[tornWeaponSort] onCheckboxClicked: Auto Sort is ' + (tornWeaponSort.autosort ? 'ON' : 'OFF'));
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
                tornWeaponSort.autoSort = false; // TRUE to auto sort on load
                tornWeaponSort.dmgSel = null; // Selectors for sorting
                tornWeaponSort.accSel = null; // ...
                tornWeaponSort.selID = 'xedx-1'; // What to sort by (1 = default, 2 = acc, 3 = dmg, 4 = Q, 5 = name)
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

        return _tornWeTracker();

        function _tornWeTracker() {
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
                if (location.href.indexOf("item.php") < 0) return reject('tornWeTracker wrong page!');
                if (abroad()) return reject('tornWeTracker not at home!');

                modifyPage(weArray);

                resolve("[tornWeTracker] complete!");
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
                    if (!validPointer(nameSel)) {continue;} // Child elem.
                    let name = nameSel.innerHTML;
                    debug('[tornWeTracker] Name: ' + name);

                    let item = getItemByItemID(array, Number(itemID));
                    let WE = 0;
                    if (validPointer(item)) {
                        WE = item.exp;
                        //log('Weapon Exp.: ' + WE);
                    } else {
                        //log('Assuming 0 WE.');
                    }

                    let bonusUL = itemLi.querySelector('div.cont-wrap > div.bonuses.left > ul');
                    let ttPriceSel = bonusUL.querySelector('li.bonus.left.tt-item-price');
                    if (validPointer(ttPriceSel)) {ttPriceSel.remove();}
                    let weSel = bonusUL.querySelector('li.left.we');
                    if (validPointer(weSel)) {weSel.remove();}
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
        }

    } // End function tornWeTracker() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Weapon Experience Spreadsheet" (called at API complete)
    //////////////////////////////////////////////////////////////////////////////////

    function tornWeSpreadsheet() {

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

        return _tornWeSpreadsheet();

        function _tornWeSpreadsheet() {
             log('[tornWeSpreadsheet]');

            return new Promise((resolve, reject) => {
                if (location.href.indexOf("item.php") < 0) return reject('tornWeSpreadsheet wrong page!');
                if (abroad()) return reject('tornWeSpreadsheet not at home!');

                loadTableStyles();

                xedx_TornTornQuery(null, 'items', tornQueryCB);

                resolve("[tornWeSpreadsheet] startup complete!");
            });
        }

        function tornQueryCB(responseText, ID, param) {
            debug('[tornWeSpreadsheet] Torn items query callback.');
            var jsonResp = JSON.parse(responseText);
            if (jsonResp.error) {return handleError(responseText);}
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
                if (validPointer(itemObj)) {
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

            if (validPointer(document.querySelector("#xedx-we-spreadsheet-div"))) {
                debug('New WE and FH div already installed!');
                return;
            }
            let newDiv = newTopDiv() + fhRows + newMiddleDiv() + weRows + newBottomDiv();

            $(newDiv).insertBefore(refDiv);
            setTitlebar();
            installClickHandler();

            // Add all tooltips
            // displayToolTip(li, text + CRLF + CRLF + text2);
            addWeaponTypeToolTips();
        }

        function addWeaponTypeToolTips() {
            const typeIDs = ["machits", "rifhits", "piehits", "axehits", "smghits", "pishits",
                             "chahits", "grehits", "heahits", "shohits", "slahits", "h2hhits"];

            addToolTipStyle();

            for (let i=0; i<typeIDs.length; i++) {
                displayToolTip($("#" + typeIDs[i]), getToolTipText(typeIDs[i]));
            }
        }

        function machineGunText() {
            return  '<B>Machine Gun Weapons:</B>' + CRLF + CRLF +
                    TAB + "PKM" + CRLF +
                    TAB + "Stoner 96" + CRLF +
                    TAB + "Negev NG-5" + CRLF +
                    TAB + "Rheinmetall MG 3" + CRLF +
                    TAB + "Snow Cannon" + CRLF +
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
                    TAB + "China Lake" + CRLF +
                    TAB + "Neutrilux 2000" + CRLF +
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
            if (!validPointer(titleBar)) {
                setTimeout(setTitlebar, 1000);
            } else {
                let rfPct = Math.round((fhArray.roundsfired/1000000)*100);
                let dmgPct = Math.round((fhArray.attackdamage) /100000000*100);
                //document.querySelector("#xedx-we-title").innerText = "WE and Finishing Hits: " +
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
                    if (validPointer(useArray[i])) {
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
            let itemObj = getInventoryById(weItem.itemID);
            let color = (weItem.exp == 100) ? 'xtdx-green' :
                (weItem.exp >= 50) ? 'xtdx-orange' : 'xtdx-red';
            if (validPointer(itemObj) ? itemObj.equipped : false) {color = 'xtdx-yellow';}

            let output = '<td class="xtdx ' + color + '">' +
                '<span style="float:left">' + weItem.name +
                '</span><span style="float:right">' + weItem.exp + '%</span></td>';

            return output;
        }

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
        function getInventoryById(itemID) {
            let itemObjs = inventoryArray.filter(item => item.ID == itemID);
            return itemObjs[0];
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
                                     '<table id="xedx-fh-spreadsheet-table" style="width: 782px;">' +
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
                                     '<table id="xedx-we-spreadsheet-table" style="width: 782px;">' +
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
            if (location.href.indexOf("loader.php?sid=attack") < 0) return reject('tornSeeTheTemps wrong page!');
            if (abroad()) return reject('tornSeeTheTemps not at home!');

            GM_addStyle (`.defender___2q-P6 {background:none !important;}}`);
            resolve("tornSeeTheTemps complete!");
        });
    } // End function tornSeeTheTemps() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Scroll On Attack" (called immediately)
    //////////////////////////////////////////////////////////////////////////////////

    function tornScrollOnAttack() {
        log('[tornScrollOnAttack]');
        return new Promise((resolve, reject) => {
            if (location.href.indexOf("loader.php?sid=attack") < 0) return reject('tornScrollOnAttack wrong page!');
            if (abroad()) return reject('tornScrollOnAttack not at home!');

            // Make these configurable options one day.
            // 74 is exactly at the bottom of the header, on my MacBook Pro.
            // To compensate for the clock hiding time left, make it a bit less -
            // 66 seems to work for me. One mouse scroll click = 4 px on my Mac.
            let y = 66; //74;
            let delay = 2000;

            setTimeout(function() {window.scrollTo(0, y);}, delay);
            resolve("tornScrollOnAttack complete!");
        });
    } // End function tornScrollOnAttack() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Holdem Score" (called at document loaded)
    //////////////////////////////////////////////////////////////////////////////////

    // TBD !!!
    function tornHoldemScore() {

        return _tornHoldemScore();

        function _tornHoldemScore() {
             log('[tornHoldemScore]');

            return new Promise((resolve, reject) => {
                if (location.href.indexOf("loader.php?sid=holdem") < 0) return reject('tornHoldemScore wrong page!');
                if (abroad()) return reject('tornHoldemScore not at home!');

                reject('[tornHoldemScore] not yet implemented!');

                //resolve("[tornHoldemScore] complete!");
            });
        }
    } // End function tornHoldemScore() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Stock Profits" (called at API complete)
    //////////////////////////////////////////////////////////////////////////////////

    function tornStockProfits() {

        let observer = null;
        let userStocksJSON = null;
        let tornStocksJSON = null;
        const showProfit = true;
        const showLoss = true;

        // Get stock name/price from ID
        const stockNameFromID = function(ID){return tornStocksJSON.stocks[ID].name;};
        const stockPriceFromID = function(ID){return tornStocksJSON.stocks[ID].current_price;};

        return _tornStockProfits();

        function _tornStockProfits() {
            log('[tornStockProfits]');

            return new Promise((resolve, reject) => {
                if (location.href.indexOf("page.php?sid=stocks") < 0) return reject('tornStockProfits wrong page!');

                xedx_TornUserQuery(null, 'stocks', userStocksCB);

                resolve("[tornStockProfits] startup complete!");
            });

            // Callbacks for our Torn API calls.
            function userStocksCB(responseText, ID, param) {
                log('[tornStockProfits] userStocksCB');
                userStocksJSON = JSON.parse(responseText);
                if (userStocksJSON.error) {return handleError(responseText);}
                xedx_TornTornQuery(null, 'stocks', tornStocksCB);
            }

            function tornStocksCB(responseText, ID, param) {
                log('[tornStockProfits] tornStocksCB');
                tornStocksJSON = JSON.parse(responseText);
                if (tornStocksJSON.error) {return handleError(responseText);}
                modifyPage();
            }

            function highlightReadyStocks() {
                log('[tornStockProfits] [highlightReadyStocks]');
                var objects = $(".Ready___Y6Stk");
                log('objects: ', objects);
                for (let i=0; i<objects.length; i++) {
                    let obj = objects[i];
                    if (obj.textContent == 'Ready for collection') {
                        log('[tornStockProfits] Stock is ready!!');
                        if (!$(obj).hasClass('highlight-active')) $(obj).addClass('highlight-active');
                    }
                }
            }

            // Called when page loaded.
            function modifyPage() {
                if (observer) observer.disconnect();

                // -- prep work --
                var mainStocksUL = document.querySelector("#stockmarketroot > div.stockMarket___T1fo2");
                if (!mainStocksUL) return setTimeout(modifyPage, 250); // Check should not be needed

                var stocksList = mainStocksUL.getElementsByTagName('ul');
                if (stocksList.length < 2) return setTimeout(modifyPage, 250); // Check should not be needed

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
                        //console.log('ownedLI: ', ownedLI);
                        let ownedShares = owned[keys[j]].shares;
                        let boughtPrice = owned[keys[j]].bought_price;
                        let profit = (stockPrice - boughtPrice) * ownedShares; // Gross profit
                        let fee = stockPrice * ownedShares * .001;
                        profit = profit - fee; // -.1% fee.
                        if (profit > 0 && showProfit) $(ownedLI).append('<p class="up___WzZlD">' + asCurrency(profit) + '</p>');
                        if (profit < 0 && showLoss) $(ownedLI).append('<p class="down___BftsG">' + asCurrency(profit) + '</p>');
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
                xedx_TornUserQuery(null, 'stocks', userStocksCB);
            }

        }
    } // End function tornStockProfits() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Racing Alert" (called at document loaded)
    //////////////////////////////////////////////////////////////////////////////////

    var racingAlertTimer = null;
    function tornRacingAlert() {

        return _tornRacingAlert();

        function _tornRacingAlert() {
            log('[tornRacingAlert]');
            var animatedIcons = true; // TRUE to flash the red icon

            const globeIcon = `<li class="icon71___NZ3NH"><a id="icon71-sidebar" href="#" tabindex="0" i-data="i_64_86_17_17"></a></li>`;
            const raceIconGreen =  `<li class="icon17___eeF6s"><a href="/loader.php?sid=racing" tabindex="0" i-data="i_37_86_17_17"></a></li>`;
            const raceIconRed  =`<li id="xedx-race-icon" class="icon18___wusPZ"><a href="/loader.php?sid=racing" tabindex="0" i-data="i_37_86_17_17"></a></li>`;

            //if (animatedIcons) GM_addStyle(`.highlight-active {
            //                                -webkit-animation: highlight-active 1s linear 0s infinite normal;
            //                                animation: highlight-active 1s linear 0s infinite normal;}`);

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornRacingAlert] not at home!');
                racingAlertTimer = setInterval(addRaceIcon, 10000); // Check every 10 secs
                resolve("[tornRacingAlert] complete!");
            });

            function hasStockRaceIcons() {
                let result = document.getElementById("icon18-sidebar") || document.getElementById("icon17-sidebar");
                debug('[hasStockRaceIcons] result: ', result);
                debug('Icon 17: ', document.getElementById("icon17-sidebar"));
                debug('Icon 18: ', document.getElementById("icon18-sidebar"));
                return result;
            }

            function addRaceIcon() {
                let existingRaceIcon = document.getElementById("xedx-race-icon");
                debug('[addRaceIcon] existingRaceIcon: ', existingRaceIcon);

                let redIcon = document.getElementById("icon18-sidebar");
                if (redIcon && animatedIcons && !$(redIcon.parentNode).hasClass('highlight-active')) {
                    $(redIcon.parentNode).addClass('highlight-active');
                }

                if (abroad() || hasStockRaceIcons()) { // Remove if flying or stock icons there already
                    if (existingRaceIcon) {
                        $(existingRaceIcon).remove();
                    }
                    return;
                }

                if (existingRaceIcon) { // Style sometimes gets removed...not sure why. Test: used to have dup ID's!
                    debug('[addRaceIcon] Class: ', $("#xedx-race-icon").attr('class'));
                    if (animatedIcons && !$(existingRaceIcon).hasClass('highlight-active')) $(existingRaceIcon).addClass('highlight-active');
                    return;
                }

                //let iconArea = document.querySelector("#sidebar > div:nth-child(1) > div > div.user-information___DUwZf > div > div > div > div:nth-child(1) > ul");
                let iconArea = document.getElementsByClassName('status-icons___NLliD')[0];
                debug('iconArea: ', iconArea);
                if (!iconArea /*&& devMode*/) {
                    //alert('Can`t find icon area!');
                    log('[addRaceIcon] Can`t find icon area!');
                }

                // TBD: possibly add sidebar link.
                // let sidebarContent = document.querySelector("#sidebar > div:nth-child(3) > div > div > div > div");

                // Add our icon
                $(iconArea).append(raceIconRed);
                existingRaceIcon = document.getElementById("xedx-race-icon");
                if (animatedIcons) $(existingRaceIcon).addClass('highlight-active');
                log('[addRaceIcon] Race icon appended!');
                //setTimeout(addRaceIcon, 5000); // Style sometimes gets removed...not sure why. This will re-add it.
                                               //  Test: used to have dup ID's! May  not need anymore....
            }
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
    // Don't recall why...

    function tornRacingCarOrder() {

        debugLoggingEnabled = true;

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

        return _tornRacingCarOrder();

        function _tornRacingCarOrder() {
            log('[tornRacingCarOrder]');

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornRacingCarOrder] not at home!');
                if (location.href.indexOf("loader.php?sid=racing") < 0) return reject('tornRacingCarOrder wrong page!');

                loadStyles();
                startCarOrderScript();

                resolve("[tornRacingCarOrder] startup complete!");
            });

            function startCarOrderScript() {
                if (!targetNode) targetNode = document.getElementById('racingMainContainer');
                if (!targetNode) return setTimeout(startCarOrderScript, 250);
                observerOn();
            }
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
            if (validPointer(ul)) {

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
                    if (validPointer(li)) {
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
                if (validPointer(elemList) && elemList.length > 0) {
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
                if (validPointer(elems[i].className) && elems[i].className.indexOf(className) != -1) {
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
            //log('type: ', e.type);
            //log('handleDragOver: ', e);
            if (e.preventDefault) e.preventDefault(); // Necessary. Allows us to drop.
            e.dataTransfer.dropEffect = 'move'; // See the section on the DataTransfer object.
            return false;
        }

        function handleDragEnter(e) {
            log('type: ', e.type);
            log('handleDragEnter: ', e);
            this.classList.add('over');
        }

        function handleDragLeave(e) {
            debug('[tornRacingCarOrder] type: ', e.type);
            // this / e.target is previous target element.
            debug('[tornRacingCarOrder] handleDragLeave: ', e);
            this.classList.remove('over');
        }

        var stopBlinkBtnId = null;
        function handleDrop(e) {
            debug('[tornRacingCarOrder] type: ', e.type);
            debug('[tornRacingCarOrder] handleDrop: ', e);
            observerOff();

            if (e.stopPropagation) {
                e.stopPropagation(); // stops the browser from redirecting.
            }

            // Don't do anything if dropping the same column we're dragging.
            if (dragSrcEl != this) {
                dragSrcEl.innerHTML = this.innerHTML;
                this.innerHTML = e.dataTransfer.getData('text/html');

                stopBlinkBtnId = blinkBtn(saveBtnId);
                debug('[tornRacingCarOrder] Blinking "Save" button - ID = ' + stopBlinkBtnId);
            }

            // Get rid of the added <meta http-equiv="content-type" content="text/html;charset=UTF-8">
            // I think this was added by the setData call in the start drag handler.
            let elements = e.currentTarget.getElementsByTagName('meta');
            if (elements[0]) elements[0].parentNode.removeChild(elements[0]);

            observerOn();
            return false;
        }

        function handleDragEnd(e) {
            debug('[tornRacingCarOrder] type: ', e.type);
            // this / e.target is the current hover target.
            debug('[tornRacingCarOrder] handleDragEnd: ', e);

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
            debug('[populatePage] index: ', index);
            debug('[populatePage] savedCarsArray: ', savedCarsArray);
            let enlistList = refDiv.getElementsByClassName('enlist-list')[0];
            $(enlistList).empty();

            for (let i=index; i < savedCarsArray.length; i++) { // page 1 index is 0, page 2, 10, etc. Convert to 0-indexed.
                 let li = savedCarsArray[i];
                 if (validPointer(li)) {
                     let element = li.getElementsByClassName('enlist-bars')[0];
                     if (element) {
                         element.parentNode.removeChild(element);
                     }
                     log('[populatePage] appending car: ', li);
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

        function stopBlinkBtn(id) {
            log('[stopBlinkBtn]');
            clearInterval(id);
        }

        function blinkBtn(id) {
            debug('[blinkBtn]');
            let selector = document.getElementById(id);
            let Id = setInterval(() => {
                $(selector).fadeOut(500);
                $(selector).fadeIn(500);},
                1000);

            return id;
        }

        // Wrapper for the actual sorter, 'putCarsInOrder'
        function sortSavedCars(silent=false) {
            debug('[sortSavedCars] ==>');
            let carList = null;
            let key = 'carsPage' + currentPage();
            var data = GM_getValue(key);
            if (validPointer(data)) {
                carList = JSON.parse(data);
                if (validPointer(carList) && carList.length > 0) {
                    log('[sortSavedCars] carList: ', carList);
                    putCarsInOrder(carList);
                } else if (!silent) {
                    alert('Torn Racing Car Order - No car list has been saved! Please see the "Help".');
                } else {
                    log('[sortSavedCars] No car list has been saved! Please see the "Help".');
                }
            }
            debug('[sortSavedCars] carList: ', carList);
            debug('<== [sortSavedCars]');
        }

        // Handle the 'Save' button, save the current car order to local storage
        function handleSaveBtn() {
            debug('[handleSaveBtn] ==>');
            let checkDiv = refDiv.getElementsByClassName('enlist-wrap enlisted-wrap')[0];
            let carList = getCurrentCarOrder(checkDiv);
            debug('[handleSaveBtn] carList: ', carList);

            let key = 'carsPage' + currentPage();
            GM_setValue(key, JSON.stringify(carList));

            if (stopBlinkBtnId) {
                stopBlinkBtn(stopBlinkBtnId);
            }
            alert('Torn Racing Car Order - Car order has been saved! (key=' + key + ')');
            debug('<== [handleSaveBtn]');
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
            if (validPointer(carList) && carList.length > 0) {
                putCarsInOrder(carList);
            } else {
                alert('Default car list has not been saved! This is an error, please contact the developer' +
                     ' (xedx [2100735]) for assistance!');
            }
            observerOn();
        }

        // Handle the 'Help' button, display help.
        function handleHelpBtn() {
            log('handleHelpBtn');
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
                if (!validPointer(saved) || JSON.stringify(currOrder) != saved) {
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

        return _tornRacingStyles();

        function _tornRacingStyles() {
             log('[tornRacingStyles]');

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornRacingStyles] not at home!');
                if (location.href.indexOf("loader.php?sid=racing") < 0) return reject('tornRacingStyles wrong page!');

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
            });
        }
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
                if (abroad()) return reject('[tornBazaarPlus] not at home!');
                if (!checkLocation()) return reject('tornBazaarPlus wrong page!');

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
              const item_name = input.closest('LI').querySelector('canvas.item-converted').getAttribute('aria-label');
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
              document.querySelectorAll(`LI[data-item="${item_id}"] INPUT[type=checkbox]`).forEach(checkbox => checkbox.checked = !checkbox.checked);
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

        return _tornBazaarAddButton();

        // Need error handling!
        function _tornBazaarAddButton() {
             log('[tornBazaarAddButton]');

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornBazaarAddButton] not at home!');
                if (!isBazaarPage()) return reject('tornBazaarAddButton wrong page!');

                $(window).on('hashchange', function() {
                    debug('[tornBazaarAddButton] handle hash change.');
                    installTheButton();
                });

                installTheButton(0);

                resolve("[tornBazaarAddButton] complete!");
            });

            function isHidden(el) {return (el.offsetParent === null)}

            function installTheButton(retries=0) {
                const addBtnDiv = getAddBtnDiv();
                if (document.getElementById('xedx-add-btn')) document.getElementById('xedx-add-btn').remove();
                let hash = window.location.hash;
                let substrings = ['manage', 'personalize', 'add', 'userid'];
                if (substrings.some(v => hash.includes(v))) return;
                let targetNode = document.querySelector("#react-root > div > div.appHeaderWrapper___Omvtz > " +
                                                    "div.topSection___OilHR > div.titleContainer___LJY0N");
                if (!targetNode)
                    targetNode = document.querySelector("#bazaarRoot > div > div.appHeaderWrapper___Omvtz.disableLinksRightMargin____LINY > " +
                                       "div.topSection___OilHR > div.titleContainer___LJY0N");
                if (!targetNode && retries++ < 10) {
                    return setTimeout(function() {installTheButton(retries)}, 50);
                }
                if (!location.href.includes('userid=')) {
                    $(targetNode).append(addBtnDiv);
                }
            }

            function getAddBtnDiv() {
                return '<a id="xedx-add-btn" to="#/add" role="button" aria-labelledby="add-items" href="#/add" ' +
                    "style='float: right;' " +
                    'class="linkContainer___AOKtu inRow___uFQ4S greyLineV___mY84h link-container-ItemsAdd" ' +
                    'i-data="i_687_11_101_33"><span class="iconContainer___q3CES linkIconContainer___IqlVh">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" class="default___qrLNi svgIcon___gFpTP" ' +
                    'filter="url(#top_svg_icon)" fill="#777" stroke="transparent" stroke-width="1" ' +
                    'width="17" height="16" viewBox="0 0 16.67 17">' +
                    '<path d="M2,8.14A4.09,4.09,0,0,1,3,8a4,4,0,0,1,3.38,6.13l3,1.68V8.59L2,4.31ZM16,' +
                    '4.23,8.51,0,6.45,1.16,13.7,5.43ZM5.11,1.92,2.79,3.23,10,7.43l2.33-1.27Zm5.56,6.66V16l6-3.42V5.36ZM3,' +
                    '9a3,3,0,1,0,3,3A3,3,0,0,0,3,9Zm1.67,3.33H3.33v1.34H2.67V12.33H1.33v-.66H2.67V10.33h.66v1.34H4.67Z">' +
                    '</path></svg></span><span class="linkTitle___QYMn6">Add items</span></a>';
            }
        }

    } // End function tornBazaarAddButton() {

    function removeBazaarAddButton() {} // Dummy, just don't reload.

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Fac Page Search" (called at page complete)
    //////////////////////////////////////////////////////////////////////////////////

    function tornFacPageSearch() {

        return _tornFacPageSearch();

        function _tornFacPageSearch() {
            log('[tornFacPageSearch]');

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornFacPageSearch] not at home!');
                if (!isFactionPage()) return reject('tornFacPageSearch wrong page!');

                 GM_addStyle(`
                    .xedx-bdr {border: solid 1px red;}
                    .xedx-green {background: lime;
                                 -webkit-animation: highlight-active 1s linear 0s infinite normal;
                                 animation: highlight-active 1s linear 0s infinite normal;}
                `);

                installHashChangeHandler(facSearchHashHandler);

                installUI(0);

                resolve("[tornFacPageSearch] started!");
            });

            function installUI(retries=0) {
                log('[installUI]');
                const searchDiv = getFacSearchDiv();

                if (retries > 5) {
                    debug('[installUI] too many retires: aborting');
                }

                $("#xedx-search").remove();
                let targetNode = document.querySelector("#factions > ul");
                if (!targetNode) {
                    debug('[installUI] targetNode not found retrying...');
                    return setTimeout(function() {installUI(retries++)}, 500);
                }
                log('[installUI] primary target found:', targetNode);

                if (location.href.indexOf('/tab=info') > -1) {
                    targetNode = document.querySelector("#react-root-faction-info > div > div > div.faction-info-wrap > div.f-war-list.members-list");
                    if (!targetNode) {
                        debug('[installUI] targetNode not found, retrying...');
                        return setTimeout(function() {installUI(retries++)}, 500);
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
                        return setTimeout(function() {installUI(retries++)}, 500);
                    }

                    debug('[installUI] inserting search div after: ', targetNode);
                    $(targetNode).append(searchDiv);

                    debug('[installUI] new div: ', document.querySelector("#xedx-search"));

                    $("#search").on("keypress", handleSearchKeypress);
                    $("#search").on("keydown", handleSearchKeypress); // For backspace only
                } else {
                    debug('[installUI] missing selectors or hash, retrying (attempt #' + (retries+1));
                    return setTimeout(function() {installUI(retries++)}, 500);
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
                            $(el).addClass('xedx-green');
                            log('[handleSearchKeypress] adding green');
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
                    debug('[handleSearchKeypress] adding green');
                    $(el).addClass('xedx-green');
                    handleSearchKeypress.lastElems.push(el);
                });

                let count = $(".xedx-green").length;
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

        return _tornJailScores();

        function _tornJailScores() {
             log('[tornJailScores]');

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornJailScores] not at home!');
                if (!isJailPage()) return reject('tornJailScores wrong page!');

                reject('[tornJailScores] not yet implemented!');

                //resolve("[tornJailScores] complete!");
            });
        }
    } // End function tornJailScores() {

    //////////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Disable Refills" (called on API complete)
    //////////////////////////////////////////////////////////////////////////////////

    function tornDisableRefills() {

        return _tornDisableRefills();

        function _tornDisableRefills() {
            log('[tornDisableRefills]');

            const safetyNet = '<input class="xedx-ctrls" type="checkbox" id="refill_confirm" name="refill_confirm" value="refill_confirm" checked>' +
                            '<label for="refill_confirm">  Safety Net! Note that clicking the title bar will bypass the safety net.</label>';

            return new Promise((resolve, reject) => {
                if (abroad()) return reject('[tornDisableRefills] not at home!');
                if (!isPointsPage()) return reject('tornDisableRefills wrong page!');

                xedx_TornUserQuery(null, 'bars', refillsUserQueryCB);

                resolve("[tornDisableRefills] startup complete!");
            });

            function onCheckboxClicked() {
                let ckBox = document.querySelector("#refill_confirm");
                tornDisableRefills.safetyOn = ckBox.checked;
                GM_setValue('refills_checkbox', ckBox.checked);
            }

            function onRefillClick(e) {
                let target = e.target;
                var parent = e.target.parentElement;
                if (!tornDisableRefills.safetyOn) return;
                if (target.classList[1] == undefined) {
                    if ((parent.classList[1].indexOf('energy') > -1) && tornDisableRefills.jsonResp.energy.current > 0) return e.stopPropagation();
                    if ((parent.classList[1].indexOf('nerve') > -1) && tornDisableRefills.jsonResp.nerve.current > 0) return e.stopPropagation();
                } else {
                    if ((target.classList[1].indexOf('energy') > -1) && tornDisableRefills.jsonResp.energy.current > 0) return e.stopPropagation();
                    if ((target.classList[1].indexOf('nerve') > -1) && tornDisableRefills.jsonResp.nerve.current > 0) return e.stopPropagation();
                }
            }

            function refillsUserQueryCB(responseText, id, param) {
                if (typeof tornDisableRefills.jsonResp == 'undefined' ) {
                    tornDisableRefills.jsonResp = null;
                    tornDisableRefills.safetyOn = false;
                }
                tornDisableRefills.jsonResp = JSON.parse(responseText);
                if (tornDisableRefills.jsonResp.error) {return handleApiError(responseText);}

                let titleBar = document.querySelector("#mainContainer > div.content-wrapper.m-left20 > div.content-title");
                if (!titleBar) return setTimeout(function (){userQueryCB(responseText, id, param)}, 100);
                $(titleBar).append(safetyNet);

                let ckBox = document.querySelector("#refill_confirm");
                ckBox.addEventListener("click", onCheckboxClicked);
                ckBox.checked = tornDisableRefills.safetyOn = GM_getValue('refills_checkbox', true);

                document.querySelector("#mainContainer > div.content-wrapper > ul").addEventListener('click', onRefillClick, {capture: true}, true);
            }
        }
    } // End function tornDisableRefills() {

    function removeDisableRefills() {$("refill_confirm").remove()}

    ///////////////////////////////////////////////////////////////////////////////////
    //
    // Tool tip functions, return the text to be displayed
    //
    ///////////////////////////////////////////////////////////////////////////////////

    // Testing
    function generalToolTip(name) {
        return "This is a really generic Tool Tip for [" + name + "] , to be replaced at a later date!";
    }

    function attacksExtenderTt() {
        return "Adds a dialog that displays up to the latest 100 " +
            "attacks, along with attacker, defender, faction, and respect." + CRLF +
            "Date and time format are configurable, and is linked to the attack log.";
    }

    function statTrackerTt() {
        return "Adds a dialog to the home page to track almost any " +
            "personal stat you'd like. The stats to watch can be added via " +
            "a configuration menu.";
    }

    function crimeToolTipsTt() {
        return "Adds tool tips to the 'Criminal Record' section " +
            "of the home page. ALlows you to easily follow progress " +
            "towards all honor bars and medals available.";
    }

    function facRespectTt() {
        return "Adds personal faction respect earned to the home page " +
            "'Faction Information' section, and installs a tool tip to " +
            "follow your award progress.";
    }

    function drugStatsTt() {
        return "Adds drug usage statistics to the home page." + CRLF +
            "Shows the amount taken, overdoses, rehabs, as " +
            "well as installing tool tips for each with drug details " +
            "such as OD %, effects, and addiction points added.";
    }

    function hideShowChatTt() {
        return "Adds an option to the sidebar to hide the chat icons, and then re-diplay them";
    }

    function jailStatsTt() {
        return "Adds jail and bounty statistics to the home page." + CRLF +
            "Shows the amounts, as installing tool tips for each with " +
            "progress towards any merits.";
    }

    function sidebarColorTt() {
        return "Just for fun, adds color to the icons on the sidebar.";
    }

    function ttFilterTt() {
        return "This hides various Torn Tools features that I find redundant or annoying." + CRLF +
            "It hides the 'TornTools Active' icon on the lower left, the 'last active' status on " +
            "various fac pages, and the Bat Stats estimates showing up underneath users on various pages.";
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

    // Adds the "Powered by: XedX" menu link
    function installConfigMenu() {
        if ($('#xedx-opts')[0]) return;

        GM_addStyle(`
            .xedx-tts-span {line-height: 12px; margin-left: 10px;}
            .powered-by {color: var(--default-blue-color); text-decoration: none; cursor: pointer;}
            `);

        let cfgSpan = '<div class="xedx-tts-span"><span> Enhanced By: </span><a class="powered-by" id="xedx-opts">XedX [2100735]</a></div>';
        let serverDiv = $("div.footer-menu___uESqK.left___pFXym");
        if (!serverDiv) return setTimeout(installConfigMenu, 100);

        $(serverDiv).append(cfgSpan);
        $("#xedx-opts").click(function() {
            log('[handleTtsOptionsClick]');
            general_configWindow = window.open(tornTotalSolutionCfgURL);
            if (!general_intervalTimer) {
                debug('[handleTtsOptionsClick] starting interval timer.');
                general_intervalTimer = setInterval(checkGeneralSaveButton, 2000);
            }
        });
    }

    function initDebugOptions() {
        loggingEnabled = GM_getValue('dbgopts-logging', true);
        debugLoggingEnabled = GM_getValue('dbgopts-dbglogging', false);

        GM_setValue('dbgopts-logging', loggingEnabled);
        GM_setValue('dbgopts-dbglogging', debugLoggingEnabled);

        log('[initDebugOptions] loggingEnabled: ', loggingEnabled);
        log('[initDebugOptions] debugLoggingEnabled: ', debugLoggingEnabled);
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
        setGeneralCfgOpt("crimeToolTips", "Torn Crime Tooltips",
                         tornCrimeTooltips, removeCrimeTooltips, crimeToolTipsTt, "home");
        setGeneralCfgOpt("facRespect", "Torn Fac Respect Earned",
                         tornFacRespect, removeTornFacRespect, facRespectTt, "home");
        setGeneralCfgOpt("jailStats", "Torn Jail Stats",
                         tornJailStats, removeJailStats, jailStatsTt, "home");
        setGeneralCfgOpt("sidebarColors", "Torn Sidebar Colors",
                         tornSidebarColors, removeSidebarColors, sidebarColorTt, 'all');
        setGeneralCfgOpt("hideShowChat", "Torn Hide-Show Chat Icons",
                         tornHideShowChat, removeHideShowChat, hideShowChatTt, 'all');

        setGeneralCfgOpt("customizableSidebar", "Torn Customizable Sidebar Links",
                         tornCustomizableSidebar, removeCustomizableSidebar, generalToolTip, 'all');
        setGeneralCfgOpt("tornTTFilter", "Torn TT Filter",
                         tornTTFilter, null, ttFilterTt, "all", true);

        // BAZAAR (and shops)
        setGeneralCfgOpt("tornBazaarPlus", "Torn Bazaar Pricing, Plus!",
                         tornBazaarPlus, removeBazaarPlus, generalToolTip, "items");
        setGeneralCfgOpt("tornBazaarAddButton", "Torn Bazaar 'Add Items' Button",
                         tornBazaarAddButton, removeBazaarAddButton, generalToolTip, "items");

        // ITEMS: @match        https://www.torn.com/items.php*
        setGeneralCfgOpt("tornItemHints", "Torn Item Hints",
                         tornItemHints, null, generalToolTip, "items");
        setGeneralCfgOpt("tornMuseumSetHelper", "Torn Museum Sets Helper",
                         tornMuseumSetHelper, null, generalToolTip, "items");
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

        // POINTS:  @match        https://www.torn.com/points.php*
        setGeneralCfgOpt("tornDisableRefills", "Torn Point Refill Safety Net",
                         tornDisableRefills, removeDisableRefills, generalToolTip, "misc");


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

    function handleGeneralConfigPage() {
        log('[handleGeneralConfigPage]');

        addToolTipStyle();

        // Main menu: supported scripts
        addSupportedScriptsTable();

        // Add the debug menu
        addDebugMenu();

        // Add customizable sidebar links table
        addCustLinksTable();

        // Install handlers
        $('#xedx-button').click(handleGenOptsSaveButton); // General 'Save' button handler
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

            // Install handlers ... general opts (which scripts to support)
            let checkboxes = document.getElementsByClassName('gen-clickable');
            for (let i=0; i<checkboxes.length; i++) {
                // Saves state into storage
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
                let newRow = '<tr class="xvisible" style="background-color: ' + bgColor + ';" id="' + id + '">' +
                    '<td><input type="checkbox" style="margin-right: 10px; width: 14px;" class="gen-clickable" name="' + scriptName + '"' +
                    (opts_enabledScripts[scriptName].enabled ? ' checked ': '') + ' /></td>' +
                    '<td>' + opts_enabledScripts[scriptName].name + addlText + '</td>' +
                    '<td>' + opts_enabledScripts[scriptName].cat + '</td></tr>';
                $('#xedx-table').append(newRow);

                // Add general tool tip - gettext from fn.
                log('[[handleGeneralConfigPage]] ttFn: ', opts_enabledScripts[scriptName].ttFn);
                if (opts_enabledScripts[scriptName].ttFn) {
                    let ttText = opts_enabledScripts[scriptName].ttFn(opts_enabledScripts[scriptName].name);
                    log('text: ', ttText);
                    let node = document.getElementById(id);
                    displayToolTip(node, ttText);
                }

            function getBgColor(category) {
                switch (category) {
                    case "items":
                        return "#DAA520"; // GoldenRod
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
            }

            // Gen opts script selected handler, save to storage
            function genOptsClickHandler(ev) {
                log('[genOptsClickHandler] taget: ', ev.target.name, ' enabled: ', ev.target.checked);
                GM_setValue(ev.target.name, ev.target.checked);
            }
        }

        // Helper to build the debug opts menu. TBD: add opts to save values!!!!
        function addDebugMenu() {
            log('[addDebugMenu]');
            let tbody = document.querySelector("#debug-opts-div > table > tbody");
            // Add header
            const tblHdr = `<tr id="dbgtblhdr" class="xtblehdr xvisible open"><th>Enabled</th><th>Debug Option</th></tr>`;
            $(tbody).append(tblHdr);

            // Add rows
            let newRow = '<tr class="xvisible defbg">' +
                '<td><input type="checkbox" style="margin-right: 10px; width: 14px;" class="dbg-clickable"' +
                ' id="dbgopts-logging" ' + (GM_getValue("dbgopts-logging", true) ? 'checked' : '') + '/></td><td>Enable Logging</td></tr>';
            $(tbody).append(newRow);
            newRow = '<tr class="xvisible defbg">' +
                '<td><input type="checkbox" style="margin-right: 10px; width: 14px;" class="dbg-clickable"' +
                ' id="dbgopts-dbglogging" ' + (GM_getValue("dbgopts-dbglogging", false) ? 'checked' : '') + '/></td><td>Enable Debug Only Logging</td></tr>';
            $(tbody).append(newRow);

            // Add footer
            const expHdr = `<tr class="xexpand"><th colspan=2;>...click to expand</th></tr>`;
            $(tbody).append(expHdr);

            // Handler for any debug option change: set flag to implement 'on the other side'
            $(".dbg-clickable").on('click', handleDbgOptClick);

            // Default collapsed
            //$("#dbgtblhdr").click(); // Handler not installed yet!
            optsHdrClick({currentTarget: document.querySelector("#dbgtblhdr")});

            // TBD: add opts to save values!!!!
            function handleDbgOptClick(ev) {
                log('[handleDbgOptClick]');
                debug('[handleDbgOptClick] ev: ', ev);
                debug('[handleDbgOptClick] checked: ', $("#" + ev.currentTarget.id).prop("checked"));
                GM_setValue(ev.currentTarget.id,$("#" + ev.currentTarget.id).prop("checked"));
            }
        }

        // Helper to build the custom links table
        function addCustLinksTable() {
            log('[fillCustLinksTable]');
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
                debug('[fillCustLinksTable] build row: ', data);

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
            $("#new-link-add-row").click(handleGenCfgAddLinkRow);

            // Start off with table minimized
            //$('#custLinksHdr').click();  // Handler not installed yet!
            optsHdrClick({currentTarget: document.querySelector("#custLinksHdr")});

            // Custom sidebar links, 'Add Row' button
            function handleGenCfgAddLinkRow() { // Handler for the 'add row' button
                log('[handleGenCfgAddLinkRow]');
                const rowHtml = `<tr data-type="cust""><td><input type="checkbox" class="link-clickable" onclick="genLinksClickHandler"/></td>
                    <td data-type='desc' class="ctr-input"><input type="string"></td>
                    <td data-type='link' class="ctr-input"><input type="string"></td>
                    <td data-type='cat' class="ctr-input"><input type="string"></td></tr>`;
                $("#xedx-links-table-body").append(rowHtml);
            }

            /*
            // Initialize custom links - defaults (set cust=false). Sets value in storage, to be read into table by updateCustLinksRows()
            function initCustLinksObject() {
                log('[initCustLinksObject]');

                // Add 'dump' 'racetrack' - see altercoes for others (stock market, travel agency)
                // drag-and-drop to set order? (they appear in reverse order of here)
                // Maybe get list then traverse backwards? Or give an index value....better...
                //https://www.torn.com/racing.php
                //https://www.torn.com/dump.php
                //https://www.torn.com/travelagency.php
                let link0 = JSON.parse(GM_getValue('custlink-bounties', JSON.stringify({enabled: true, cust: false, desc: "Bounties", link: "https://www.torn.com/bounties.php#!p=main", cat: "City"})));
                let link1 = JSON.parse(GM_getValue('custlink-auctionhouse', JSON.stringify({enabled: true, cust: false, desc: "Auction House", link: "amarket.php", cat: "City"})));
                let link2 = JSON.parse(GM_getValue('custlink-bitsnbobs', JSON.stringify({enabled: true, cust: false, desc: "Bits 'n Bobs", link: "shops.php?step=bitsnbobs", cat: "City"})));
                let link3 = JSON.parse(GM_getValue("custlink-pointsbuilding", JSON.stringify({enabled:true, cust: false, desc: "Points Building", link: "points.php", cat: "City"})));
                let link4 = JSON.parse(GM_getValue("custlink-itemmarket", JSON.stringify({enabled:true, cust: false, desc: "Item Market", link: "imarket.php", cat: "City"})));
                let link5 = JSON.parse(GM_getValue("custlink-log", JSON.stringify({enabled:true, cust: false, desc : "Log", link: "page.php?sid=log", cat: "Home"})));
                let link6 = JSON.parse(GM_getValue("custlink-slots", JSON.stringify({enabled:true, cust: false, desc: "Slots", link: "loader.php?sid=slots", cat: "Casino"})));
                let link7 = JSON.parse(GM_getValue("custlink-spinthewheel", JSON.stringify({enabled:true, cust: false, desc: "Spin the Wheel", link: "loader.php?sid=spinTheWheel", cat: "Casino"})));
                let link8 = JSON.parse(GM_getValue("custlink-poker", JSON.stringify({enabled:true, cust: false, desc: "Poker", link: "loader.php?sid=holdem", cat: "Casino"})));
                let link9 = JSON.parse(GM_getValue("custlink-russianroulette", JSON.stringify({enabled:true, cust: false, desc: "Russian Roulette", link: "page.php?sid=russianRoulette", cat: "Casino"})));

                // Force an adjustment - move 'Log' to under 'Home'
                // Make editable?
                link5.cat = "Home";

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

                // Then fill the 'custLinksOpts' object
                updateCustLinksRows();
            }
            */

            // Handle clicking a checkbox
            function genLinksClickHandler(ev) {
                log('[genLinksClickHandler]');

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
                    debug('[genLinksClickHandler] deleting value: ', linkValue);
                    GM_deleteValue(keyName);
                } else {
                    debug('[genLinksClickHandler] setting value: ', linkValue);
                    GM_setValue(keyName, JSON.stringify(linkValue));
                }
            }
        }
    }

    function scrollTo(hash) {
        log('[handleGeneralConfigPage] scrollTo: ', hash);
        if (!hash) return;
        $(document.body).animate({
            'scrollTop':   $(hash).offset().top
        }, 2000);

        let trHdr = $(hash + " > table > tbody > tr")[0];
        if ($(trHdr).hasClass('closed')) $(trHdr).click();
    }

    // Fired when 'Save' is clicked - notifies the page script to re-read data
    // and change page as appropriate. Ideally, means the page won't need a refresh.
    // For simplicity, may force a refresh for some script opts - such as the
    // Customizabe Sidebar Links script, for now. Also creates the "Data Saved!"
    // indicator.
    function handleGenOptsSaveButton(ev) {
        log('[handleGenOptsSaveButton]');

        // Temporary workaround until I can figure out how this happened to me - once...
        let val = GM_getValue("custlink-");
        if (val) {
            log('[handleGenOptsSaveButton] ERROR: Invalid custom link saved!');
            debugger;
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

    // Page checking fns.
    function isIndexPage() {return (location.href.indexOf("index.php") > -1)}
    function isItemPage() {return (location.href.indexOf("item.php") > -1)}
    function isFactionPage() {return (location.href.indexOf("factions.php") > -1)}
    function isGymPage() {return (location.href.indexOf("gym.php") > -1)}
    function isAttackPage() {return (location.href.indexOf("loader.php?sid=attack&user2ID") > -1)}
    function isStocksPage() {return (location.href.indexOf("page.php?sid=stocks") > -1)}
    function isRacePage() {return (location.href.indexOf("loader.php?sid=racing") > -1)}
    function isBazaarPage() {return (location.href.indexOf("bazaar.php") > -1)}
    function isJailPage() {return (location.href.indexOf("jailview.php") > -1)}
    function isPointsPage() {return (location.href.indexOf("points.php") > -1)}

    // Shorthand for the result of a promise, here, they are just logged
    // promise.then(a => _a(a), b => _b(b));
    // instead of
    // promise.then(result => {<do something with success result>}, error => {<do something with error result>});
    function _a(result) {log('[SUCCESS] ' + result);}
    function _b(error, opt=null) {log('[ERROR] ' + (opt ? '[' + opt + '] ' : '') + error);}

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

        if (opts_enabledScripts.customizableSidebar.enabled) {tornCustomizableSidebar().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.sidebarColors.enabled) {tornSidebarColors().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.hideShowChat.enabled) {tornHideShowChat().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornHoldemScore.enabled) {tornHoldemScore().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornBazaarPlus.enabled) {tornBazaarPlus().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornBazaarAddButton.enabled) {tornBazaarAddButton().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornRacingAlert.enabled) {tornRacingAlert().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornRacingCarOrder.enabled) {tornRacingCarOrder().then(a => _a(a), b => _b(b, 'tornRacingCarOrder'));}

    }

    // And some need to wait until the page is complete. (readystatecomplete)
    function handlePageComplete() {
        log('[handlePageComplete]');

        // Adds the link to the general options page.
        // Currently, underneath the indicator of which server we're connecte to.
        installConfigMenu();

        if (opts_enabledScripts.crimeToolTips.enabled) {tornCrimeTooltips().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornTTFilter.enabled) {tornTTFilter().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornFacPageSearch.enabled) {tornFacPageSearch().then(a => _a(a), b => _b(b));}

        if (isItemPage()) {
            if (opts_enabledScripts.tornItemHints.enabled) {tornItemHints().then(a => _a(a), b => _b(b));}
        }

    }

    // And others after data from the API has been received.
    function handleApiComplete() {
        log('[onApiComplete]');

        if (opts_enabledScripts.latestAttacks.enabled) {tornLatestAttacksExtender().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.statTracker.enabled) {tornStatTracker().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.drugStats.enabled) {tornDrugStats().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.facRespect.enabled) {tornFacRespect().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.jailStats.enabled) {tornJailStats().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornMuseumSetHelper.enabled) {tornMuseumSetHelper().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornJailScores.enabled) {tornJailScores().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornWeaponSort.enabled) {tornWeaponSort().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornWeTracker.enabled) {tornWeTracker().then(a => _a(a), b => _b(b));}

        if (opts_enabledScripts.tornWeSpreadsheet.enabled) {tornWeSpreadsheet().then(a => _a(a), b => _b(b));}

    }

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

    logScriptStart();
    validateApiKey();
    versionCheck();

    addStyles();

    //
    // This call initializes the obj that defines what sub-scripts will be called in the three handlers.
    //
    updateKnownScripts(); // Load supported scripts

    // Scripts to execute immediately can go here
    if (isAttackPage()) {
        if (opts_enabledScripts.tornSeeTheTemps.enabled) {tornSeeTheTemps().then(a => _a(a), b => _b(b));}
        if (opts_enabledScripts.tornScrollOnAttack.enabled) {tornScrollOnAttack().then(a => _a(a), b => _b(b));}
    }

    if (isRacePage()) {
        if (opts_enabledScripts.tornRacingStyles.enabled) {tornRacingStyles().then(a => _a(a), b => _b(b));}
    }

    if (isPointsPage()) {
        if (opts_enabledScripts.tornDisableRefills.enabled) {tornDisableRefills().then(a => _a(a), b => _b(b));}
    }

    if (isJailPage()) {
        // Moved to API complete - requires two calls.
        //if (opts_enabledScripts.tornJailScores.enabled) {tornJailScores().then(a => _a(a), b => _b(b));}
    }

    if (isStocksPage()) {
        if (opts_enabledScripts.tornStockProfits.enabled) {tornStockProfits().then(a => _a(a), b => _b(b));}
    }

    // Separate URL just for the 'Stats Tracker' script config page.
    let urlNohash = location.href.split('#')[0];
    if (urlNohash == tornStatTrackerCfgURL) {
        handleStatsConfigPage();
    // Separate URL just for the General script config page.
    } else if (urlNohash == tornTotalSolutionCfgURL) {
        handleGeneralConfigPage()
    // Every thing else - called for every Torn page.
    } else {
        // Start of by collecting stats we need. Callback triggers handleApiComplete()
        // That, in turn, calls any functions requiring an API call.
        personalStatsQuery();

        // Other scripts can run at certain earlier page load states.
        callOnContentLoaded(handlePageLoad);
        callOnContentComplete(handlePageComplete);
    }

})();
