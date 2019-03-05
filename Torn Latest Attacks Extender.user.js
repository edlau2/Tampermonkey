// ==UserScript==
// @name         Torn Latest Attacks Extender
// @namespace    http://tampermonkey.net/
// @version      0.11
// @description  Extends the 'Latest Attack' display to include the last 100 with detailed stats
// @author       xedx
// @include      https://www.torn.com/index.php
// @connect      tornstats.com
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// ==/UserScript==

(function($) {
    'use strict';

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Utility functions, mostly dialog (UI/div) elements
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    var date_formats = ["YYYY-MM-DD",
                        "YYYY-MONTH-DD DDD",
                        "YYYY-MM-DD HH:MM:SS",
                        "DAY MONTH DD YYYY HH:MM:SS",
                        "FULL (DAY MONTH DD YYYY HH:MM:SS TZ)"];

    var months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    var days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

    function dateConverter(dateobj, format){
        var year = dateobj.getFullYear();
        var month= ("0" + (dateobj.getMonth()+1)).slice(-2);
        var date = ("0" + dateobj.getDate()).slice(-2);
        var hours = ("0" + dateobj.getHours()).slice(-2);
        var minutes = ("0" + dateobj.getMinutes()).slice(-2);
        var seconds = ("0" + dateobj.getSeconds()).slice(-2);
        var day = dateobj.getDay();
        var converted_date = dateobj.toString();

        switch(format){
            case "YYYY-MM-DD":
                converted_date = year + "-" + month + "-" + date;
                break;
            case "YYYY-MONTH-DD DDD":
                converted_date = year + "-" + months[parseInt(month)-1] + "-" + date + " " + days[parseInt(day)];
                break;
            case "YYYY-MM-DD HH:MM:SS":
                converted_date = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
                break;
            case "DAY MONTH DD YYYY HH:MM:SS":
                converted_date = days[parseInt(day)] + " " + months[parseInt(month)-1] + " " + date + " " + year + " " +
                    hours + ":" + minutes + ":" + seconds;
                break;
            case "FULL (DAY MONTH DD YYYY HH:MM:SS TZ)":
                converted_date = dateobj.toString();
                break;
        }

        return converted_date;
    }

    function isaNumber(x)
    {
        var regex=/^[0-9]+$/;
        if (x.match(regex)) {
            return true;
        }
        return false;
    }

    function createExtendedDiv() {
        var extendedDiv = document.createElement('div');
        extendedDiv.className = 'sortable-box t-blue-cont h';
        extendedDiv.id = 'xedx-attacks-ext';
        return extendedDiv;
    }

    function createHeaderDiv() {
        var headerDiv = document.createElement('div');
        headerDiv.id = 'header_div';
        headerDiv.className = 'title main-title title-black active top-round';
        headerDiv.setAttribute('role', 'heading');
        headerDiv.setAttribute('aria-level', '5');
        return headerDiv;
    }

    function createArrowDiv() {
        var arrowDiv = document.createElement('div');
        arrowDiv.className = 'arrow-wrap';
        var a = document.createElement('i');
        a.className = 'accordion-header-arrow right';
        arrowDiv.appendChild(a);
        return arrowDiv;
    }

    function createMoveDiv() {
        var moveDiv = document.createElement('div');
        moveDiv.className = 'move-wrap';
        var b = document.createElement('i');
        b.className = 'accordion-header-move right';
        moveDiv.appendChild(b);
        return moveDiv;
    }

    function createBodyDiv() {
        var bodyDiv = document.createElement('div');
        bodyDiv.className = 'bottom-round';
        return bodyDiv;
    }

    function createContentDiv() {
        var contentDiv = document.createElement('div');
        contentDiv.className = 'cont-gray bottom-round';
        contentDiv.setAttribute('style', 'width: 386px; height: 179px; overflow: auto');
        return contentDiv;
    }

    function createUL() {
        var ul = document.createElement('ul');
        ul.className = 'list-cont';
        ul.id = 'latest-attacks-list';
        return ul;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Configuration helpers
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    var config = {
        'user_id' : GM_getValue('gm_user_id'),
        'user_name' : GM_getValue('gm_user_name'),
        'api_key': GM_getValue('gm_api_key'),
        'max_values': GM_getValue('gm_max_values'),
        'date_format': GM_getValue('gm_date_format')
    };

    function queryProfileInfo() {
        GM_xmlhttpRequest ( {
            url: 'https://api.torn.com/user/?selections=profile&key=' + config.api_key,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                populateUserConfig(response.responseText);
            },
            onerror: function(response) {
                handleUserConfigError(response);
            }
        });
    }

    // TBD...
    function handleUserConfigError(response) {
        alert('An unknown error has occurred querying profile information.' +
              '/nPress OK to continue.');
    }

    function populateUserConfig(responseText) {
        var jsonResp = JSON.parse(responseText);

        config.user_id = jsonResp.player_id;
        config.user_name = jsonResp.name;

        GM_setValue('gm_user_id', config.user_id);
        GM_setValue('gm_user_name', config.user_name);
    }

    // Handlers for the config screen
    function cancelConfig() {
        var element = document.getElementById('config-div');
        element.parentNode.removeChild(element);
    }

    function saveConfig() {
        var userIdInput = document.getElementById('userid');
        var apikeyInput = document.getElementById('apikey');
        var maxInput = document.getElementById('maxinput');
        var dateFormat = document.getElementById('dateformat');

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

        // Note that this assumes the text was the last element appended!
        var headerDiv = document.getElementById('header_div');
        headerDiv.removeChild(headerDiv.lastChild);
        headerDiv.appendChild(document.createTextNode('Latest Attacks (Previous ' + GM_getValue('gm_max_values') + ')'));

        cancelConfig();
    }

    //
    // A bunch of code to build the simple configuration dialog.
    // Should be an easier/better way to do this, rather than doing
    // it long hand.
    //
    function createConfigDiv() {
        // Don't do this more than once.
        if (document.getElementById('config-div')) return;

        // Should be using GM_addStyle in here instead of this ugly formatting.
        var configDiv = document.createElement('div');
        configDiv.id = 'config-div';
        configDiv.className = 'cont-gray bottom-round';
        configDiv.setAttribute('style', 'text-align: center');

        var userIdInput = document.createElement('input');
        userIdInput.type = 'text';
        userIdInput.id = 'userid';
        userIdInput.value = GM_getValue('gm_user_id');
        configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createTextNode('User ID: '));
        configDiv.appendChild(userIdInput);
        configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createElement('br'));

        var apikeyInput = document.createElement('input');
        apikeyInput.type = 'text';
        apikeyInput.id = 'apikey';
        apikeyInput.value = GM_getValue('gm_api_key');
        //configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createTextNode('API Key: '));
        configDiv.appendChild(apikeyInput);
        configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createElement('br'));

        var maxInput = document.createElement('input');
        maxInput.type = 'text';
        maxInput.id = 'maxinput';
        maxInput.value = GM_getValue('gm_max_values');
        configDiv.appendChild(document.createTextNode('Max Entries (0-100): '));
        configDiv.appendChild(maxInput);
        configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createElement('br'));

        var dateFormat = document.createElement('select');
        dateFormat.id = 'dateformat';
        for (var i = 0; i < date_formats.length; i++) {
            var opt = document.createElement('option');
            opt.appendChild( document.createTextNode(date_formats[i]));
            opt.value = date_formats[i];
            dateFormat.options.add(opt);
        }

        var selected = GM_getValue('gm_date_format');
        if (selected == 'undefined') {
            GM_setValue('gm_date_format', date_formats[4]);// Full
            selected = GM_getValue('gm_date_format');
            dateFormat.selectedIndex = 4;
        } else {
            var j = 0;
            for(i, j = 0; i = date_formats[j]; j++) {
                if(i == selected) {
                    dateFormat.selectedIndex = j;
                    break;
                }
            }
        }
        configDiv.appendChild(document.createTextNode('Date format: '));
        configDiv.appendChild(dateFormat);
        configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createElement('br'));

        var btn1 = document.createElement('button');
        btn1.style.margin = "0px 10px 10px 0px";
        var t1 = document.createTextNode('Cancel');
        btn1.appendChild(t1);
        configDiv.appendChild(btn1);
        btn1.addEventListener('click',function () {
            cancelConfig();
        });

        var btn2 = document.createElement('button');
        btn2.style.margin = "0px 10px 10px 0px";
        var t2 = document.createTextNode('Save');
        btn2.appendChild(t2);
        btn2.onClick = function(){saveConfig()};
        configDiv.appendChild(btn2);
        btn2.addEventListener('click',function () {
            saveConfig();
        });

        // Find and append to our extendedDiv
        var extendedDiv = document.getElementById('xedx-attacks-ext');
        extendedDiv.appendChild(configDiv);
    }

    function createConfigButton() {
        var btnDiv = document.createElement('div');
        btnDiv.className = 'title-black bottom-round';
        btnDiv.setAttribute('style', 'text-align: center');
        var btn = document.createElement('button');
        var t = document.createTextNode('Configure');
        btn.addEventListener('click',function () {
            createConfigDiv();
        });

        // Add text to button, button to div
        btn.appendChild(t);
        btnDiv.append(btn);

        return btnDiv;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Functions to query the Torn API, fill list of recent attacks, and other related stuff
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function getLatestAttacksList() {
        // https://api.torn.com/user/?selections=attacks&key=<api key>
        GM_xmlhttpRequest ( {
            url: 'https://api.torn.com/user/?selections=attacks&key=' + config.api_key,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                populateLatestAttacksList(response.responseText);
            },
            onerror: function(response) {
                handleAttackListError(response);
            }
        });
    }

    // TBD...
    function handleAttackListError(response) {
        alert('An unknown error has occurred querying attack information.' +
              '/nPress OK to continue.');
    }

    function createLi(span) {
        var li = document.createElement("li");
        var a1 = document.createElement('a')
        a1.className = 't-blue';
        a1.setAttribute('href', 'profiles.php?XID=');
        span.appendChild(a1);
        return li;
    }

    //
    // This is where all the formatting of the latest attacks dialog takes place...
    // Any additional data from the response can be added here.
    // Sample response data:
    //
    /*
    "66290614": {
			"timestamp_started": 1551448810,
			"timestamp_ended": 1551448827,
			"attacker_id": 2100735,
			"attacker_name": "xedx",
			"attacker_faction": 7835,
			"attacker_factionname": "Mentos and Cola",
			"defender_id": 2125197,
			"defender_name": "b97yqq",
			"defender_faction": 15120,
			"defender_factionname": "Wolf Pack Next Generation",
			"result": "Lost",
			"stealthed": 0,
			"respect_gain": 0,
			"chain": 0,
			"modifiers": {        // These are respect multipliers
				"fairFight": 1,
				"war": 1,
				"retaliation": 1,
				"groupAttack": 1,
				"overseas": 1,
				"chainBonus": 1
			}
		},
    */
    function populateLatestAttacksList(responseText) {
        var jsonResp = JSON.parse(responseText);
        var count = Object.keys(jsonResp.attacks).length;

        // Check for possible incorrect key
        if (typeof jsonResp.error != 'undefined') {
            alert('There may be an error with your supplied API key ' +
                  'used to display extend latest attack information.\n'+
                  'Please verify using the Configure button.\n\n' +
                  'Supplied error code: ' + jsonResp.error.code + ' Message: ' + jsonResp.error.error +
                  '\nPress OK to continue.');
            return;
        }

        var counter = 0;
        var ul = document.getElementById('latest-attacks-list');

        var keys = Object.keys(jsonResp.attacks).reverse();
        for (var i = 0; i < keys.length; i++) {
            var obj = jsonResp.attacks[keys[i]];
            var span = document.createElement('span');
            var li = createLi(span);

            // List element title: date of attack
            var d = new Date(0);
            d.setUTCSeconds(obj.timestamp_ended);

            // Should allow format to be specified here.
            li.setAttribute("title", dateConverter(d, config.date_format));

            // Attacker name, either myself or opponent
            var offense = (obj.attacker_id == config.user_id);
            var a2 = document.createElement('a');
            a2.setAttribute('href', 'profiles.php?XID=' + obj.attacker_id);
            a2.innerHTML = obj.attacker_name ? obj.attacker_name : 'someone';
            if (!offense && obj.attacker_name && obj.attacker_factionname != null) {
                a2.innerHTML += ' [' + obj.attacker_id + ']';
                a2.innerHTML += ' (' + obj.attacker_factionname + ')';
            }
            span.appendChild(a2);

            // Sanitize the Action
            var result = obj.result;
            if (result === 'Lost') {
                result = 'Attacked and lost to';
            }
            if (result === 'Stalemate') {
                result = 'Stalemated with';
            }
            if (result === 'Escape') {
                result = 'Escaped from';
            }
            span.appendChild(document.createTextNode(' ' + result + ' '));

            // Defender name, either myself or opponent
            var a3 = document.createElement('a');
            a3.setAttribute('href', 'profiles.php?XID=' + obj.defender_id);
            a3.innerHTML = obj.defender_name;
            if (offense) {
                a3.innerHTML += ' (' + obj.defender_factionname + ')';
            }
            span.appendChild(a3);

            // Respect gain
            if (obj.respect_gain > 0) {
                span.appendChild(document.createTextNode(' (Respect: ' + obj.respect_gain + ')'));
            }

            li.appendChild(span);
            ul.appendChild(li);

            if (counter++ > config.max_values) {
                return;
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Latest Attacks Extender: this extends the "Latest Attacks" element.
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    var LatestAttacksExtender = (function() {
        function extendLatestAttacks() {

            // Find first column
            var mainDiv = document.getElementById('column1');

            // Create div for our own extended attack list box
            var extendedDiv = createExtendedDiv();
            var headerDiv = createHeaderDiv();
            var arrowDiv = createArrowDiv();
            var moveDiv = createMoveDiv();
            var bodyDiv = createBodyDiv();
            var contentDiv = createContentDiv();
            var configBtn = createConfigButton();
            var ul = createUL();

            // Build <div> tree
            mainDiv.append(extendedDiv);

            // Header
            extendedDiv.appendChild(headerDiv);
            headerDiv.appendChild(arrowDiv);
            headerDiv.appendChild(moveDiv);
            headerDiv.appendChild(document.createTextNode('Latest Attacks (Previous ' + GM_getValue('gm_max_values') + ')'));

            // Bottom (content) divs
            extendedDiv.appendChild(bodyDiv);
            bodyDiv.appendChild(contentDiv);
            contentDiv.appendChild(ul);

            // Configuration button
            extendedDiv.appendChild(configBtn);

            //
            // Query and append elements (last 100 attacks) to the list
            // Move all this to 2 separate functions
            // One to perform the query to the Torn API (https://api.torn.com/user/2100735?selections=attacks&key=<API key>)
            // One to populate the list
            //
            getLatestAttacksList();
            //populateLatestAttacksList();

        }

        return {
            extendLatestAttacks: extendLatestAttacks
        };

    }());

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Main
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    console.log("Latest Attacks Extender script started!");
    var currentPage = window.location.href;
    if (currentPage.indexOf('torn.com/index.php') !== -1) {
        // Note: this is done first so that the title of the dialog is correct
        if (config.max_values === 'undefined') {
            config.max_values = 100;
            GM_setValue('gm_max_values', '100');// Default
        }
        LatestAttacksExtender.extendLatestAttacks();
        queryProfileInfo();

        // If not properly configured, extend the config dialog.
        if (typeof config.api_key === 'undefined') {
            createConfigDiv();
        }
    }

}(unsafeWindow.jQuery));
