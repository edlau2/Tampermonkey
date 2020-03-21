// ==UserScript==
// @name         Torn Jail Stats
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Adds basic jail stats to the Home page, jail busts and fails, bails and bail fees.
// @author       xedx [2100735]
// @include      https://www.torn.com/index.php
// @updateURL    https://github.com/edlau2/Tampermonkey/blob/master/JailStats/Torn%20Jail%20Stats.user.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @connect      tornstats.com
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // Utility functions
    //////////////////////////////////////////////////////////////////////

    // HTML constants
    var CRLF = '<br/>';
    var TAB = '&emsp;';

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

    // Insert comma separators into a number
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
                                             // We really should call only once and cache the data

        if (validPointer(mainDiv)) {
            mainDiv.appendChild(extDiv);
        }

        extDiv.appendChild(hdrDiv);
        hdrDiv.appendChild(document.createTextNode('Jail and Bounty Stats'));
        extDiv.appendChild(bodyDiv);
        bodyDiv.appendChild(contentDiv);
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
        extendedDiv.className = 'sortable-box t-blue-cont h';
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
        contentDiv.setAttribute('style', 'width: 386px; height: 174px; overflow: auto');

        var ulList = document.createElement('ul')
        ulList.className = 'info-cont-wrap';
        contentDiv.appendChild(ulList);

        // The ID's let us add tool tips via the Torn HomePage ToolTips script.
        // It only adds tooltips if the ID's are present.
        // We could (should?) just go ahead and add the title attributes
        // here - the title's text is the tooltip.
        //
        var jailBustsLi = document.createElement('li');
        jailBustsLi.id = 'xedx-busts';
        var jailFailsLi = document.createElement('li');
        var jailBailsLi = document.createElement('li');
        jailBailsLi.id = 'xedx-bails';
        var jailFeesLi = document.createElement('li');
        var jailJailsLi = document.createElement('li');
        var bountiesLi = document.createElement('li');
        bountiesLi.id = 'xedx-bounties';
        var bountiesFeesLi = document.createElement('li');
        bountiesFeesLi.id = 'xedx-fees';

        jailBustsLi.appendChild(createDividerSpan('People Busted'));
        jailFailsLi.appendChild(createDividerSpan('Failed Busts'));
        jailBailsLi.appendChild(createDividerSpan('People Bailed'));
        jailFeesLi.appendChild(createDividerSpan('Bail Fees'));
        jailJailsLi.appendChild(createDividerSpan('Times Jailed'));
        bountiesLi.appendChild(createDividerSpan('Bounties Collected'));
        bountiesFeesLi.appendChild(createDividerSpan('Bounty Rewards'));

        jailBustsLi.appendChild(createValueSpan('peoplebusted'));
        jailFailsLi.appendChild(createValueSpan('failedbusts'));
        jailBailsLi.appendChild(createValueSpan('peoplebought'));
        jailFeesLi.appendChild(createValueSpan('peopleboughtspent'));
        jailJailsLi.appendChild(createValueSpan('jailed'));
        bountiesLi.appendChild(createValueSpan('bountiescollected'));
        bountiesFeesLi.appendChild(createValueSpan('totalbountyreward'));

        ulList.appendChild(jailBustsLi);
        ulList.appendChild(jailFailsLi);
        ulList.appendChild(jailBailsLi);
        ulList.appendChild(jailFeesLi);
        ulList.appendChild(jailJailsLi);
        ulList.appendChild(bountiesLi);
        ulList.appendChild(bountiesFeesLi);

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

        personalStatsQuery(name); // Callback will set the correct values.

        return 'Please wait...';
    }

    function personalStatsQuery(name) {
        var details = GM_xmlhttpRequest({
            method:"POST",
            url:"https://api.torn.com/user/?selections=personalstats&key=" + api_key,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                personalStatsQueryCB(response.responseText, name);
            },
            onerror: function(response) {
                handleError(response.responseText);
            },
            onabort: function(response) {
                console.log('Torn Jail Stats: onabort');
                handleError(response.responseText);
            },
            ontimeout: function(response) {
                console.log('Torn Jail Stats: ontimeout');
                handleError(response.responseText);
            }
        });
    }

    // Callback to parse returned JSON. Note that we keep track of how many times we've done this.
    // We have 7 stats we keep track of - once all have been responded to, we can add tool tips.
    var totalCalls = 7;
    function personalStatsQueryCB(responseText, name) {
        var jsonResp = JSON.parse(responseText);
        totalCalls--;

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

        console.log('Torn Jail Stats, personalStatsQueryCB: id = ' + valSpan + ' busted = ' + stats.peoplebusted +
                    ' failed = ' + stats.failedbusts + ' jailed = ' + stats.jailed + ' bailed = ' + stats.peoplebought +
                   ' Bail Fees = $' + numberWithCommas(stats.peopleboughtspent));

        // If this fails, may not be in data (never done). Not an error.
        if (!validPointer(stats[name])) {
            return "0";
        }

        if (!name.localeCompare('totalbountyreward')) {
            valSpan.innerText = '$' + numberWithCommas(stats[name]);
        } else {
            valSpan.innerText = stats[name];
        }

        if (!totalCalls) {
            addToolTips();
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Function to add tooltips for honor bars/medals (merits)
    //////////////////////////////////////////////////////////////////////

    function addToolTips() {
        var bustsLi = document.getElementById('xedx-busts');
        var bailsLi = document.getElementById('xedx-bails');
        var bountiesLi = document.getElementById('xedx-bounties');
        var feesLi = document.getElementById('xedx-fees');

        if (validPointer(bustsLi) && validPointer(bailsLi) &&
            validPointer(bountiesLi) && validPointer(feesLi)) {
            buildBustsToolTip();
            buildBailsToolTip();
            buildBountiesToolTip();
            buildFeesToolTip();
        }
    }

    function buildFeesToolTip() {
        var feesLi = document.getElementById('xedx-fees');
        var feesText = document.getElementById('xedx-val-span-totalbountyreward').innerText;
        var tmp = feesText.replace('$', '');
        tmp = tmp.replace(/,/g, '');
        var pctText = tmp/10000000 * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + pctText + '%</font></B>';
        }

        var text = 'Honor Bar at $10,000,000: <B>\"Dead or Alive\"</B>: ' + pctText;

        $(feesLi).attr("data-html", "true");
        $(feesLi).attr("title", text);
    }

    function buildBountiesToolTip() {
        var bountiesLi = document.getElementById('xedx-bounties');
        var bountiesText = document.getElementById('xedx-val-span-bountiescollected').innerText;
        var pctText = bountiesText/250 * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + pctText + '%</font></B>';
        }

        var text = 'Honor Bar at 250: <B>\"Bounty Hunter\"</B>: ' + pctText;
        var text2 = 'Medals at: <B>' +
        ((bountiesText > 25) ? '<font color=green>25, </font>' : '<font color=red>25, </font>') +
            ((bountiesText > 100) ? '<font color=green>100, </font>' : '<font color=red>100, </font>') +
            ((bountiesText > 500) ? '<font color=green>500</font></B>' : '<font color=red>500</font></B>');

        $(bountiesLi).attr("data-html", "true");
        $(bountiesLi).attr("title", text + CRLF + text2);
    }

    function buildBustsToolTip() {
        var bustsLi = document.getElementById('xedx-busts');
        var bustsText = document.getElementById('xedx-val-span-peoplebusted').innerText;
        var pctText = bustsText/1000 * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + pctText + '%</font></B>';
        }
        var pctText2 = bustsText/2500 * 100;
        if (Number(pctText2) >= 100) {
            pctText2 = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText2 = '<B><font color=\'red\'>' + pctText2 + '%</font></B>';
        }
        var pctText3 = bustsText/10000 * 100;
        if (Number(pctText3) >= 100) {
            pctText3 = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText3 = '<B><font color=\'red\'>' + pctText3 + '%</font></B>';
        }

        var text = 'Honor Bar at 1,000: <B>\"Bar Breaker\"</B>: ' + pctText;
        var text2 = 'Honor Bar at 2,500: <B>\"Aiding and Abetting\"</B>: ' + pctText2;
        var text3 = 'Honor Bar at 10,000:<B>\"Don\'t Drop It\"</B>: ' + pctText3;
        var text4 = 'Medals at: <B>' +
            ((bustsText > 250) ? '<font color=green>250, </font>' : '<font color=red>250, </font>') +
            ((bustsText > 500) ? '<font color=green>500, </font>' : '<font color=red>500, </font>') +
            ((bustsText > 1000) ? '<font color=green>1K, </font>' : '<font color=red>1K, </font>') +
            ((bustsText > 2000) ? '<font color=green>2K, </font>' : '<font color=red>2K, </font>') +
            ((bustsText > 4000) ? '<font color=green>4K, </font>' : '<font color=red>4K, </font>') +
            ((bustsText > 6000) ? '<font color=green>6K</font>' : '<font color=red>6K</font>') + ' and ' +
            ((bustsText > 8000) ? '<font color=green>8K</font></B>' : '<font color=red>8K</font></B>');
            // 250, 500, 1K, 2K, 4K, 6K and 8K</B>';

        $(bustsLi).attr("data-html", "true");
        $(bustsLi).attr("title", text + CRLF + text2 + CRLF + text3 + CRLF + text4);
    }

    function buildBailsToolTip() {
        var bailsLi = document.getElementById('xedx-bails');
        var bailsText = document.getElementById('xedx-val-span-peoplebought').innerText;
        var pctText = bailsText/500 * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + pctText + '%</font></B>';
        }

        var text = 'Honor Bar at 500: <B>\"Freedom isn\'t Free\"</B>: ' + pctText;

        $(bailsLi).attr("data-html", "true");
        $(bailsLi).attr("title", text);
    }

    //////////////////////////////////////////////////////////////////////
    // Functions to query the Torn API for travel stats.
    //////////////////////////////////////////////////////////////////////

    // See if we are travelling. If we are, we need to wait until we
    // land before turning the observer back on. Otherwise, we will
    // re-call for personal stats too frequently, as the page changes
    // all the time while flying.
    //
    // There are other places this needs to be done, too....
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