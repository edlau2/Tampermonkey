// ==UserScript==
// @name         Torn Drug Stats
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds drug stats to the home page: drugs used, OD's, Rehabs and rehab total cost to date.
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

    // Insert comma separators into a number
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }


    //////////////////////////////////////////////////////////////////////
    // Build the Drug Stats div, append underneath the Personal Perks div
    //////////////////////////////////////////////////////////////////////

    function buildDrugStatsDiv() {
        // Only do this once
        var testDiv = document.getElementById('xedx-drug-stats-ext');
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
        extDiv.appendChild(hdrDiv);
        hdrDiv.appendChild(document.createTextNode('Drug and Rehab Stats'));
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
        extendedDiv.className = 'sortable-box t-blue-cont h';
        extendedDiv.id = 'xedx-drug-stats-ext';
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
        contentDiv.id = 'xedx-drug-stats-content-div';
        contentDiv.className = 'cont-gray bottom-round';
        contentDiv.setAttribute('style', 'width: 386px; height: 174px; overflow: auto');
        //contentDiv.setAttribute('style', 'width: 386px; height: 174px');

        var ulList = document.createElement('ul')
        ulList.className = 'info-cont-wrap';
        contentDiv.appendChild(ulList);

        var cannibusLi = document.createElement('li');
        var ecstasyLi = document.createElement('li');
        var ketamineLi = document.createElement('li');
        var lsdLi = document.createElement('li');
        var opiumLi = document.createElement('li');
        var shroomsLi = document.createElement('li');
        var speedLi = document.createElement('li');
        var pcpLi = document.createElement('li');
        var xanaxLi = document.createElement('li');
        var vicodinLi = document.createElement('li');
        var totalTakenLi = document.createElement('li');
        var odsLi = document.createElement('li');
        var rehabsLi = document.createElement('li');
        var rehabCostLi = document.createElement('li');

        cannibusLi.appendChild(createDividerSpan('Cannibus Used'));
        ecstasyLi.appendChild(createDividerSpan('Ecstsyibus Used'));
        ketamineLi.appendChild(createDividerSpan('Ecstsyibus Used'));
        lsdLi.appendChild(createDividerSpan('LSD Used'));
        opiumLi.appendChild(createDividerSpan('Opium Used'));
        shroomsLi.appendChild(createDividerSpan('Shrooms Used'));
        speedLi.appendChild(createDividerSpan('Speed Used'));
        pcpLi.appendChild(createDividerSpan('PCP Used'));
        xanaxLi.appendChild(createDividerSpan('Xanax Used'));
        vicodinLi.appendChild(createDividerSpan('Vicodin Used'));
        totalTakenLi.appendChild(createDividerSpan('Total Drugs Used'));
        odsLi.appendChild(createDividerSpan('Overdoses'));
        rehabsLi.appendChild(createDividerSpan('Rehabs'));
        rehabCostLi.appendChild(createDividerSpan('Rehab Costs'));

        cannibusLi.appendChild(createValueSpan('cantaken'));
        ecstasyLi.appendChild(createValueSpan('exttaken'));
        ketamineLi.appendChild(createValueSpan('kettaken'));
        lsdLi.appendChild(createValueSpan('lsdtaken'));
        opiumLi.appendChild(createValueSpan('opitaken'));

        // Haven't found key for these yet
        shroomsLi.appendChild(createValueSpan('', false));
        speedLi.appendChild(createValueSpan('', false));
        pcpLi.appendChild(createValueSpan('', false));

        xanaxLi.appendChild(createValueSpan('xantaken'));
        vicodinLi.appendChild(createValueSpan('victaken'));
        totalTakenLi.appendChild(createValueSpan('drugsused'));
        odsLi.appendChild(createValueSpan('overdosed'));
        rehabsLi.appendChild(createValueSpan('rehabs'));
        rehabCostLi.appendChild(createValueSpan('rehabcost'));

        ulList.appendChild(cannibusLi);
        ulList.appendChild(ecstasyLi);
        ulList.appendChild(ketamineLi);
        ulList.appendChild(lsdLi);
        ulList.appendChild(opiumLi);
        ulList.appendChild(shroomsLi);
        ulList.appendChild(speedLi);
        ulList.appendChild(pcpLi);
        ulList.appendChild(xanaxLi);
        ulList.appendChild(vicodinLi);
        ulList.appendChild(totalTakenLi);
        ulList.appendChild(rehabsLi);
        ulList.appendChild(rehabCostLi);

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

    function createValueSpan(item, query=true) {
        var value = "Not available ATM";
        if (query) {
            value = queryPersonalStats(item);
        }
        var valSpan = document.createElement('span');
        valSpan.id = 'xedx-val-span-' + item;
        //valSpan.className = 'desc';
        // This compensates for the scrollbar. So we don't use the 'desc' attributes.
        valSpan.setAttribute('style', 'width: 160px');
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
                console.log('Torn Drug Stats: onabort');
                handleError(response.responseText);
            },
            ontimeout: function(response) {
                console.log('Torn Drug Stats: ontimeout');
                handleError(response.responseText);
            }
        });
    }

    // Callback to parse returned JSON
    function personalStatsQueryCB(responseText, name) {
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

        /*
        console.log('Torn Drug Stats, personalStatsQueryCB: id = ' + valSpan + ' busted = ' + stats.peoplebusted +
                    ' failed = ' + stats.failedBusts + ' jailed = ' + stats.jailed + ' bailed = ' + stats.peoplebought +
                   ' Bail Fees = ' + stats.peopleboughtspent);
        debugger;
        */

        switch (name) {
            case 'rehabs':
                valSpan.innerText = stats.rehabs;
                return jsonResp.rehabs;
                break;
            case 'opitaken':
                valSpan.innerText = stats.opitaken;
                return jsonResp.opitaken;
                break;
            case 'lsdtaken':
                valSpan.innerText = stats.lsdtaken;
                return jsonResp.lsdtaken;
                break;
            case 'overdosed':
                valSpan.innerText = stats.overdosed;
                return jsonResp.overdosed;
                break;
            case 'rehabcost':
                var ret = '$' + numberWithCommas(stats.rehabcost);
                valSpan.innerText = ret; //stats.peopleboughtspent;
                return jsonResp.rehabcost;
                break;
            case 'drugsused':
                valSpan.innerText = stats.drugsused;
                return jsonResp.drugsused;
                break;
            case 'victaken':
                valSpan.innerText = stats.victaken;
                return jsonResp.victaken;
                break;
            case 'victaken':
                valSpan.innerText = stats.victaken;
                return jsonResp.victaken;
                break;
            case 'xantaken':
                valSpan.innerText = stats.victaken;
                return jsonResp.victaken;
                break;
            case 'exttaken':
                valSpan.innerText = stats.victaken;
                return jsonResp.victaken;
                break;
            case 'kettaken':
                valSpan.innerText = stats.victaken;
                return jsonResp.victaken;
                break;
            case 'cantaken':
                valSpan.innerText = stats.cantaken;
                return jsonResp.cantaken;
                break;
            default:
                return 'Bad Param';
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
            console.log('Torn Drug Stats: re-enabling observer');
            observer.observe(targetNode, config);
            return handleError(responseText);
        }

        console.log('Torn Drug Stats, realBasicQueryCB');

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

    console.log("Torn Drug Stats script started!");

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
        buildDrugStatsDiv();

        // This call either immediately re-connects the observer,
        // or else sets a timeout to re-connect when we land, if
        // we are travelling.
        checkTravelling();

        //observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    console.log('Torn Drug Stats: starting observer');
    observer.observe(targetNode, config);
})();