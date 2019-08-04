// ==UserScript==
// @name         Torn Jail Stats
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds basic jail stats to the Home page, jail busts and fails.
// @author       xedx [2100735]
// @include      https://www.torn.com/index.php
// @connect      tornstats.com
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function($) {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // Utility functions
    //////////////////////////////////////////////////////////////////////

    // Check to see if a pointer is valid
    function validPointer(val, dbg = false) {
        if (val == 'undefined' || typeof val == 'undefined' || val == null) {
            if (dbg) {
                debugger;
            }
            return false;
        }
        return true;
    }

    //////////////////////////////////////////////////////////////////////
    // Build the Jail Stats div, append underneath the Personal Perks div
    //////////////////////////////////////////////////////////////////////

    function buildJailStatsDiv() {
        // Only do this once
        var testDiv = document.getElementById('xedx-jail-stats-ext');
        if (validPointer(testDiv)) {
            return;
        }

        var mainDiv = document.getElementById('column0');
        if (!validPointer(mainDiv)) {
            return;
        }

        // Piece everything together.
        var extDiv = createExtendedDiv();
        var hdrDiv = createHeaderDiv();
        var bodyDiv = createBodyDiv();
        var contentDiv = createContentDiv(); // This call also queries the Torn API...

        extDiv.appendChild(hdrDiv);
        hdrDiv.appendChild(document.createTextNode('Jail Stats'));
        extDiv.appendChild(bodyDiv);
        bodyDiv.appendChild(contentDiv);

        if (validPointer(mainDiv)) {
            mainDiv.appendChild(extDiv);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Helpers for creating misc. UI parts and pieces
    //////////////////////////////////////////////////////////////////////

    function createSeparator() {
        var sepHr = document.createElement('hr');
        sepHr.className = 'delimiter-999 m-top10 m-bottom10';
        return sepHr;
    }

    function createExtendedDiv() {
        var extendedDiv = document.createElement('div');
        extendedDiv.className = 'sortavble-box t-blue-cont h';
        extendedDiv.id = 'xedx-jail-stats-ext';
        return extendedDiv;
    }

    function createHeaderDiv() {
        var headerDiv = document.createElement('div');
        headerDiv.id = 'xedx-header_div';
        headerDiv.className = 'title main-title title-black active top-round';
        headerDiv.setAttribute('role', 'heading');
        headerDiv.setAttribute('aria-level', '5');

        var arrowDiv = createArrowDiv();
        var moveDiv = createMoveDiv();
        headerDiv.appendChild(arrowDiv);
        headerDiv.appendChild(moveDiv);

        return headerDiv;
    }

    function createBodyDiv() {
        var bodyDiv = document.createElement('div');
        bodyDiv.className = 'bottom-round';
        return bodyDiv;
    }

    function createContentDiv() {
        var contentDiv = document.createElement('div');
        contentDiv.id = 'xedx-jail-stats-content-div';
        contentDiv.className = 'cont-gray bottom-round';
        contentDiv.setAttribute('style', 'width: 386px; height: 124px; overflow: auto');

        var ulList = document.createElement('ul')
        ulList.className = 'info-cont-wrap';
        contentDiv.appendChild(ulList);

        var jailBustsLi = document.createElement('li');
        var jailFailsLi = document.createElement('li');
        var jailBailsLi = document.createElement('li');
        var jailFeesLi = document.createElement('li');
        var jailJailsLi = document.createElement('li');

        jailBustsLi.appendChild(createDividerSpan('People Busted'));
        jailFailsLi.appendChild(createDividerSpan('Failed Busts'));
        jailBailsLi.appendChild(createDividerSpan('People Bailed'));
        jailFeesLi.appendChild(createDividerSpan('Bail Fees'));
        jailJailsLi.appendChild(createDividerSpan('Times Jailed'));

        jailBustsLi.appendChild(createValueSpan('peoplebusted'));
        jailFailsLi.appendChild(createValueSpan('failedbusts'));
        jailBailsLi.appendChild(createValueSpan('peoplebailed'));
        jailFeesLi.appendChild(createValueSpan('bailfees'));
        jailJailsLi.appendChild(createValueSpan('jailed'));

        ulList.appendChild(jailBustsLi);
        ulList.appendChild(jailFailsLi);
        ulList.appendChild(jailBailsLi);
        ulList.appendChild(jailFeesLi);
        ulList.appendChild(jailJailsLi);

        return contentDiv;
    }

    function createDividerSpan(name) {
        var dividerSpan = document.createElement('span');
        dividerSpan.className = ('divider');

        var nameSpan = document.createElement('span');
        nameSpan.innerText = name;
        dividerSpan.appendChild(nameSpan);

        return dividerSpan;
    }

    function createValueSpan(item) {
        var value = queryPersonalStats(item);
        var valSpan = document.createElement('span');
        valSpan.id = 'xedx-val-span-' + item;
        valSpan.className = 'desc';
        valSpan.innerText = value;
        return valSpan;
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

    //////////////////////////////////////////////////////////////////////
    // Functions to query the Torn API for personal stats.
    //////////////////////////////////////////////////////////////////////

    function queryPersonalStats(name) {
        if (name != 'peoplebusted' && name != 'failedbusts' && name != 'jailed') {
            return 'N/A';
        }
        realStatsQuery(name); // Callback will set the correct value.

        return 'Please wait...';
    }

    function realStatsQuery(name) {
        var details = GM_xmlhttpRequest({
            method:"POST",
            url:"https://api.torn.com/user/?selections=personalstats&key=" + api_key,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                realStatsQueryCB(response.responseText, name);
            },
            onerror: function(response) {
                handleError(response.responseText);
            },
            onabort: function(response) {
                console.log('Torn Jail Stats: onabort');
                handleError(response.responseText);
            },
            /*
            onloadstart: function(response) {
                console.log('Torn Jail Stats: onloadstart');
            },
            onprogress: function(response) {
                console.log('Torn Jail Stats: onprogress');
            },
            onreadystatechange: function(response) {
                console.log('Torn Jail Stats: onreadystatechange: ' + response.readyState);
            },
            */
            ontimeout: function(response) {
                console.log('Torn Jail Stats: ontimeout');
                handleError(response.responseText);
            }
        });
    }

    // Callback to parse returned JSON
    function realStatsQueryCB(responseText, name) {
        var jsonResp = JSON.parse(responseText);

        if (jsonResp.error) {
            return handleError(responseText);
        }

        var searchName = 'xedx-val-span-' + name;
        var valSpan = document.getElementById(searchName);
        var stats = jsonResp.personalstats;
        if (!validPointer(valSpan)) {
            console.log('Unable to find proper span: ' + searchName + ' at ' + document.URL);
            return;
        }

        console.log('Torn Jail Stats, realStatsQueryCB: id = ' + valSpan + ' busted = ' + stats.peoplebusted +
                    ' failed = ' + stats.failedBusts + ' jailed = ' + stats.jailed);
        switch (name) {
            case 'peoplebusted':
                valSpan.innerText = stats.peoplebusted;
                return jsonResp.peoplebusted;
                break;
            case 'failedbusts':
                valSpan.innerText = stats.failedbusts;
                return jsonResp.failedbusts;
                break;
            case 'jailed':
                valSpan.innerText = stats.jailed;
                break;
            default:
                return 'N/A';
                break;
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Functions to query the Torn API for travel stats.
    //////////////////////////////////////////////////////////////////////

    // See if we are travelling. If we are, we need to wait until we
    // land before turning the observer back on. Otherwise, we will
    // re-call for personal stats too frequently, as the page changes
    // all the time while flying.
    function checkTravelling() {
        queryTravelStats();
    }

    function queryTravelStats() {
        var details = GM_xmlhttpRequest({
            method:"POST",
            url:"https://api.torn.com/user/?selections=travel&key=" + api_key,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                realBasicQueryCB(response.responseText, name);
            },
            onerror: function(response) {
                handleError(response.responseText);
            }
        });
    }

    // Callback to parse returned JSON
    function realBasicQueryCB(responseText, name) {
        var jsonResp = JSON.parse(responseText);

        if (jsonResp.error) {
            console.log('Torn Jail Stats: re-enabling observer');
            observer.observe(targetNode, config);
            return handleError(responseText);
        }

        console.log('Torn Jail Stats, realBasicQueryCB');

        // Sample responses:
        /*
        "travel": {
		  "destination": "Switzerland",
		  "timestamp": 1564855026,
		  "departed": 1564847826,
		  "time_left": 6185 // Seconds
	    }

        {
	    "travel": {
		  "destination": "Torn",
		  "timestamp": 1564823178,
		  "departed": 1564819938,
		  "time_left": 0
	    }
        */

        var stats = jsonResp.travel;
        console.log('  Destination: ' + stats.destination +
                    '\n  time_left: ' + stats.time_left + ' seconds.');
        if (stats.time_left == 0 && stats.destination == 'Torn') {
            console.log('Torn Jail Stats: re-enabling observer');
            observer.observe(targetNode, config);
        } else {
            // If travelling, set timeout to re-connect the observer
            // when we are scheduled to land.
            setTimeout(function(){
                console.log('Torn Jail Stats: re-enabling observer');
                observer.observe(targetNode, config); },
                       stats.time_left * 1000);
        }

    }

    //////////////////////////////////////////////////////////////////////
    // Very simple error handler; only displayed (and logged) once
    //////////////////////////////////////////////////////////////////////

    // TBD: Change this to a self-closing message.
    var errorLogged = false;
    function handleError(responseText) {
        if (!errorLogged) {
            var jsonResp = JSON.parse(responseText);
            var errorText = 'Torn Jail Stats: An error has occurred querying personal stats information.\n' +
                '\nCode: ' + jsonResp.error.code +
                '\nError: ' + jsonResp.error.error;

            if (jsonResp.error.code == 5) {
                errorText += '\n\n The Torn API only allows so many requests per minute. ' +
                    'If this limit is exceeded, this error will occur. It will clear itself' +
                    'up shortly, or you may try refreshing the page.\n';
            }

            errorText += '\nPress OK to continue.';
            alert(errorText);
            console.log(errorText);
            errorLogged = true;
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    console.log("Torn Jail Stats script started!");

    // Make sure we have an API key
    var api_key = GM_getValue('gm_api_key');
    if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
        api_key = prompt("Please enter your API key.\n" +
                         "Your key will be saved locally so you won't have to be asked again.\n" +
                         "Your key is kept private and not shared with anyone.", "");
        GM_setValue('gm_api_key', api_key);
    }

    var targetNode = document.getElementById('mainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {

        // debugger;

        // Disconnect the observer to prevent looping before
        // we start modifying the page.
        console.log('Torn Jail Stats: disconnecting observer');
        observer.disconnect();
        buildJailStatsDiv();

        // This call either immediately re-connects the observer,
        // or else sets a timeout to re-connect when we land, if
        // we are travelling.
        checkTravelling();

        //observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    console.log('Torn Jail Stats: starting observer');
    observer.observe(targetNode, config);
})();