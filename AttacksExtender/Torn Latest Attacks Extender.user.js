// ==UserScript==
// @name         Torn Latest Attacks Extender
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Extends the 'Latest Attack' display to include the last 100 with detailed stats
// @author       xedx [2100735]
// @updateURL    https://github.com/edlau2/Tampermonkey/blob/master/AttacksExtender/Torn%20Latest%20Attacks%20Extender.user.js
// @blah      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      file://///Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers.js
// @include      https://www.torn.com/index.php
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

const latest_attacks_div =
      '<div class="sortable-box t-blue-cont h" id="xedx-attacks-ext">' +
          '<div id="header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">' +
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
              '<button id="config-btn">Configure</button>' +
          '</div>' +
      '</div>';

const latest_attacks_config_div =
      '<div id="config-div" class="cont-gray bottom-round" style="text-align: center">' +
          '<br>User ID: <input type="text" id="userid"><br>' +
          '<br>API Key: <input type="text" id="apikey"><br>' +
          '<br>Max Entries (0-100): <input type="text" id="maxinput"><br>' +
          '<br>Date format: ' +
          '<select id="dateformat">' +
              '<option value="YYYY-MM-DD">YYYY-MM-DD</option>' +
              '<option value="YYYY-MONTH-DD DDD">YYYY-MONTH-DD DDD</option>' +
              '<option value="YYYY-MM-DD HH:MM:SS">YYYY-MM-DD HH:MM:SS</option>' +
              '<option value="DAY MONTH DD YYYY HH:MM:SS">DAY MONTH DD YYYY HH:MM:SS</option>' +
              '<option value="FULL (DAY MONTH DD YYYY HH:MM:SS TZ)">FULL (DAY MONTH DD YYYY HH:MM:SS TZ)</option>' +
          '</select><br><br>' +
          '<button id="cancel-btn" style="margin: 0px 10px 10px 0px;">Cancel</button>' +
          '<button id="save-btn" style="margin: 0px 10px 10px 0px;">Save</button>' +
      '</div>';

// Global configuration and user information
var config = {'user_id' : GM_getValue('gm_user_id'),
              'user_name' : GM_getValue('gm_user_name'),
              'api_key': GM_getValue('gm_api_key'),
              'max_values': GM_getValue('gm_max_values'),
              'date_format': GM_getValue('gm_date_format')
             };

(function() {
    'use strict';

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Configuration helpers
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function queryProfileInfo() {
        xedx_TornUserQuery('', 'profile', populateUserConfig);
    }

    function populateUserConfig(responseText, ID, param) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        config.user_id = jsonResp.player_id;
        config.user_name = jsonResp.name;
        GM_setValue('gm_user_id', config.user_id);
        GM_setValue('gm_user_name', config.user_name);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Config screen and associated handlers
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function createConfigDiv() {
        if (document.getElementById('config-div')) return;

        let extendedDiv = document.getElementById('xedx-attacks-ext');
        if (!validPointer(extendedDiv)) {return;}
        $(extendedDiv).append(latest_attacks_config_div);

        $('#apikey').val(GM_getValue('gm_api_key'));
        $('#userid').val(GM_getValue('gm_user_id'));
        $('#maxinput').val(GM_getValue('gm_max_values'));
        $('#dateformat').val(GM_getValue('gm_date_format'));

        $('#cancel-btn').click(function () {cancelConfig();});
        $('#save-btn').click(function () {saveConfig();});
    }

    // Handler for 'Config' screen, 'Cancel' button
    function cancelConfig() {
        let element = document.getElementById('config-div');
        element.parentNode.removeChild(element);
    }

    // Handler for 'Config' screen, 'Save' button
    function saveConfig() {
        let userIdInput = document.getElementById('userid');
        let apikeyInput = document.getElementById('apikey');
        let maxInput = document.getElementById('maxinput');
        let dateFormat = document.getElementById('dateformat');

        if (maxInput.value > 100 || !isaNumber(maxInput.value) || maxInput.value < 0) {
            maxInput.value = 100;
        }
        GM_setValue('gm_user_id', userIdInput.value);
        GM_setValue('gm_api_key', apikeyInput.value);
        GM_setValue('gm_max_values', maxInput.value);
        GM_setValue('gm_date_format', dateFormat.options[dateFormat.selectedIndex].text);

        config.user_id = GM_getValue('gm_user_id');
        config.api_key = GM_getValue('gm_api_key');
        config.max_values = GM_getValue('gm_max_values');
        config.date_format = GM_getValue('gm_date_format');

        var headerDiv = document.getElementById('header_div');
        headerDiv.removeChild(headerDiv.lastChild);
        headerDiv.appendChild(document.createTextNode('Latest Attacks (Previous ' + GM_getValue('gm_max_values') + ')'));

        cancelConfig();
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Functions to query the Torn API, fill list of recent attacks, and other related stuff
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function getLatestAttacksList() {
        xedx_TornUserQuery('', 'attacks', populateLatestAttacksList);
    }

    // Just save this as a const...
    function createLi(span) {
        var li = document.createElement("li");
        var a1 = document.createElement('a')
        a1.className = 't-blue';
        a1.setAttribute('href', 'profiles.php?XID=');
        span.appendChild(a1);
        return li;
    }

    // This is where all the formatting of the latest attacks dialog takes place...
    // Any additional data from the response can be added here.
    function populateLatestAttacksList(responseText, ID, param) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        let counter = 0;
        let ul = document.getElementById('latest-attacks-list');

        let keys = Object.keys(jsonResp.attacks).reverse(); // Why reverse? Latest first...
        for (let i = 0; i < keys.length; i++) {
            let obj = jsonResp.attacks[keys[i]];
            let span = document.createElement('span');
            let li = createLi(span);

            // Link to the attack log: data-location="loader.php?sid=attackLog&ID=
            let code = 'loader.php?sid=attackLog\u0026ID=' + obj.code;
            li.setAttribute('data-location', code);

            // List element title: date of attack
            let d = new Date(0);
            d.setUTCSeconds(obj.timestamp_ended);

            // Should allow format to be specified here.
            li.setAttribute("title", dateConverter(d, config.date_format));

            // Attacker name, either myself or opponent
            let offense = (obj.attacker_id == config.user_id);
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

            if (counter++ > config.max_values) {return;}
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Latest Attacks Extender: this extends the "Latest Attacks" element.
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function extendLatestAttacks() {
        // Find first column
        let mainDiv = document.getElementById('column1');
        if (!validPointer(mainDiv)) {return;}
        $(mainDiv).append(latest_attacks_div);

        // Hook up button handler(s)
        $('#config-btn').click(function () {createConfigDiv();});

        getLatestAttacksList();
        queryProfileInfo();
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Main
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    validateApiKey();
    logScriptStart();
    let currentPage = window.location.href;
    if (currentPage.indexOf('torn.com/index.php') !== -1) {
        if (config.max_values === 'undefined') {
            config.max_values = 100;
            GM_setValue('gm_max_values', '100');// Default
        }

        if (awayFromHome()) {return;}
        extendLatestAttacks();

        // If not properly configured, extend the config dialog.
        if (typeof config.api_key === 'undefined') {
            createConfigDiv();
        }
    }

}(unsafeWindow.jQuery));



