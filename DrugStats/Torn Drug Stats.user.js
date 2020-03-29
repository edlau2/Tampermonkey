// ==UserScript==
// @name         Torn Drug Stats
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Adds drug stats to the home page: drugs used, OD's, Rehabs and rehab total cost to date.
// @author       xedx [2100735]
// @include      https://www.torn.com/index.php
// @updateURL    https://github.com/edlau2/Tampermonkey/blob/master/DrugStats/Torn%20Drug%20Stats.user.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @connect      tornstats.com
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// @require      https://github.com/edlau2/Tampermonkey/blob/master/helpers/Torn-JS-Helpers.js

(function() {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // Build the Drug Stats div, append underneath the Personal Perks div
    //////////////////////////////////////////////////////////////////////

    var extDivId = 'xedx-drug-stats-ext';
    function buildDrugStatsDiv() {
        // Only do this once
        var testDiv = document.getElementById(extDivId);
        if (validPointer(testDiv)) {
            return;
        }

        var mainDiv = document.getElementById('column0');
        if (!validPointer(mainDiv)) {
            return;
        }

        // Piece everything together.
        var extDiv = createExtendedDiv('sortable-box t-blue-cont h', extDivId);
        var hdrDiv = createHeaderDiv();
        var bodyDiv = createBodyDiv();
        var contentDiv = createContentDiv(); // This call also queries the Torn API...
                                             // We really should call only once and cache the data
        hdrDiv.appendChild(document.createTextNode('Drug and Rehab Stats'));
        extDiv.appendChild(hdrDiv);
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

        cannibusLi.appendChild(createDividerSpan('cantaken', 'Cannibus Used'));
        ecstasyLi.appendChild(createDividerSpan('exttaken', 'Ecstsy Used'));
        ketamineLi.appendChild(createDividerSpan('kettaken', 'Ketamine Used'));
        lsdLi.appendChild(createDividerSpan('lsdtaken', 'LSD Used'));
        opiumLi.appendChild(createDividerSpan('opitaken', 'Opium Used'));
        shroomsLi.appendChild(createDividerSpan('shrtaken', 'Shrooms Used'));
        speedLi.appendChild(createDividerSpan('spetaken', 'Speed Used'));
        pcpLi.appendChild(createDividerSpan('pcptaken', 'PCP Used'));
        xanaxLi.appendChild(createDividerSpan('xantaken', 'Xanax Used'));
        vicodinLi.appendChild(createDividerSpan('victaken', 'Vicodin Used'));
        totalTakenLi.appendChild(createDividerSpan('drugsused', 'Total Drugs Used'));
        odsLi.appendChild(createDividerSpan('overdosed', 'Overdoses'));
        rehabsLi.appendChild(createDividerSpan('rehabs', 'Rehabs'));
        rehabCostLi.appendChild(createDividerSpan('rehabcost', 'Rehab Costs'));

        cannibusLi.appendChild(createValueSpan('cantaken'));
        ecstasyLi.appendChild(createValueSpan('exttaken'));
        ketamineLi.appendChild(createValueSpan('kettaken'));
        lsdLi.appendChild(createValueSpan('lsdtaken'));
        opiumLi.appendChild(createValueSpan('opitaken'));
        shroomsLi.appendChild(createValueSpan('shrtaken'));
        speedLi.appendChild(createValueSpan('spetaken'));
        pcpLi.appendChild(createValueSpan('pcptaken'));
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
        ulList.appendChild(odsLi);
        ulList.appendChild(rehabsLi);
        ulList.appendChild(rehabCostLi);

        return contentDiv;
    }

    function createValueSpan(item) {
        var value = "0";
        value = queryPersonalStats(item);

        var valSpan = document.createElement('span');
        valSpan.id = 'xedx-val-span-' + item;
        valSpan.className = 'desc';
        // This compensates for the scrollbar. So we don't use the 'desc' CSS attributes.
        valSpan.setAttribute('style', 'width: 160px');
        valSpan.innerText = value;

        return valSpan;
    }

    //////////////////////////////////////////////////////////////////////
    // Functions to query the Torn API for personal stats.
    //////////////////////////////////////////////////////////////////////

    function queryPersonalStats(name) {

        personalStatsQuery(name); // Callback will set the correct values.
        return "0";
    }

    // This should only be done once, just save the result.
    // I'll do that later when I have to refactor again.
    // Currently executes 14 requests.
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
    var expectedResponses = 14;
    function personalStatsQueryCB(responseText, name) {
        var jsonResp = JSON.parse(responseText);

        expectedResponses--;

        if (jsonResp.error) {
            return handleError(responseText);
        }

        var searchName = 'xedx-val-span-' + name;
        var valSpan = document.getElementById(searchName);
        var stats = jsonResp.personalstats;
        if (!validPointer(valSpan)) {
            console.log('Torn Drug Stats, personalStatsQueryCB - Unable to find proper span: ' + searchName + ' at ' + document.URL);
            return;
        }

        // If this fails, have never used this drug. Not an error.
        if (!validPointer(stats[name])) {
            //console.log('Torn Drug Stats, personalStatsQueryCB, name: ' + name + ' value = 0 (not found)');
            if (!expectedResponses) {
                addToolTips();
            }
            return "0";
        }

        if (!name.localeCompare('rehabcost')) {
            valSpan.innerText = '$' + numberWithCommas(stats[name]);
        } else {
            valSpan.innerText = stats[name];
        }

        // Once we have valid 'drugsused' and 'overdosed', we can calc the percentage.
        if (!name.localeCompare('drugsused') || !name.localeCompare('overdosed')) {
            searchName = 'xedx-val-span-drugsused';
            var valSpanDrugsused = document.getElementById(searchName);
            searchName = 'xedx-val-span-overdosed';
            var valSpanOverdosed = document.getElementById(searchName);
            if (valSpanDrugsused.innerText != '0' && valSpanOverdosed.innerText != '0') {
                var pct = ((Number(valSpanOverdosed.innerText) / Number(valSpanDrugsused.innerText))*100).toFixed(2);
                valSpanOverdosed.innerText = valSpanOverdosed.innerText + ' (' + pct + '%)';
            }
        }

        if (!expectedResponses) {
                addToolTips();
            }

    return jsonResp.name;
    }

    //////////////////////////////////////////////////////////////////////
    // Function(s) to add appropriate tool tip(s).
    //////////////////////////////////////////////////////////////////////

    function addToolTips() {
        GM_addStyle(".tooltip2 {" +
                  "radius: 4px !important;" +
                  "background-color: #ddd !important;" +
                  "padding: 5px 20px;" +
                  "border: 2px solid white;" +
                  "border-radius: 10px;" +
                  "width: 300px;" +
                  "margin: 50px;" +
                  "text-align: left;" +
                  "font: bold 14px ;" +
                  "font-stretch: condensed;" +
                  "text-decoration: none;" +
                  "}");

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

    function displayToolTip(div, text) {
        $(document).ready(function() {
            $(div.parentNode).attr("title", "original");
            $(div.parentNode).tooltip({
                content: text,
                classes: {
                    "ui-tooltip": "tooltip2"
                }
            });
        })
    }

    function buildUseString(item) {
        var useDiv = document.getElementById('xedx-val-span-' + item);
        var useText = useDiv.innerText.replace(/,/g, "");
        var pctText = useText/50 * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + pctText + '%</font></B>';
        }
        var divSpan = document.getElementById('xedx-div-span-' + item);
        var text = '<B>' + divSpan.innerText + ': </B>Honor Bar Available' + CRLF;
        switch (item) {
            case 'cantaken':
                text = text + TAB + '<B>Who\'s Frank?</B> (50 Cannibus): ' + pctText + CRLF;
                break;
            case 'exttaken':
                text = text + TAB + '<B>Party Animal</B> (50 Ecstacy): ' + pctText + CRLF;
                break;
            case 'kettaken':
                text = text + TAB + '<B>Horse Tranquilizer</B> (50 Ketamine): ' + pctText + CRLF;
                break;
            case 'lsdtaken':
                text = text + TAB + '<B>Acid Dream</B> (50 LSD): ' + pctText + CRLF;
                break;
            case 'opitaken':
                text = text + TAB + '<B>The Fields of Opium</B> (50 Opium): ' + pctText + CRLF;
                break;
            case 'shrtaken':
                text = text + TAB + '<B>I Think I See Dead People</B> (50 Shrooms): ' + pctText + CRLF;
                break;
            case 'spetaken':
                text = text + TAB + '<B>Crank it Up</B> (50 Speed): ' + pctText + CRLF;
                break;
            case 'pcptaken':
                text = text + TAB + '<B>Angel Dust</B> (50 PCP): ' + pctText + CRLF;
                break;
            case 'xantaken':
                text = text + TAB + '<B>Free Energy</B> (50 Xanax): ' + pctText + CRLF;
                break;
            case 'victaken':
                text = text + TAB + '<B>Painkiller</B> (50 Vicodin): ' + pctText + '</B>';
                break;
            default:
                return;
        }

        displayToolTip(useDiv, text);
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
            observer.observe(targetNode, config);
            return handleError(responseText);
        }

        console.log('Torn Drug Stats, realBasicQueryCB (travel check)');

        var stats = jsonResp.travel;
        console.log('  Destination: ' + stats.destination +
                    '\n  time_left: ' + stats.time_left + ' seconds.');
        if (stats.time_left == 0 && stats.destination == 'Torn') {
            observer.observe(targetNode, config);
        } else {
            // If travelling, set timeout to re-connect the observer
            // when we are scheduled to land.
            setTimeout(function(){
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
    validateApiKey();

    var targetNode = document.getElementById('mainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        // Disconnect the observer to prevent looping before
        // we start modifying the page.
        observer.disconnect();
        buildDrugStatsDiv();

        // This call either immediately re-connects the observer,
        // or else sets a timeout to re-connect when we land, if
        // we are travelling.
        checkTravelling();
    };
    var observer = new MutationObserver(callback);

    observer.observe(targetNode, config);
})();