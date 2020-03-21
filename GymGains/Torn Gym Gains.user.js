// ==UserScript==
// @name         Torn Gym Gains
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Creates new expandable DIV on Gym page with gym gains perks displayed
// @author       xedx [2100735]
// @include      https://www.torn.com/gym.php
// @require      http://code.jquery.com/jquery-3.4.1.min.js
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
    // General utility functions
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

    // Wildcard version of getElementsByClassName()
    function myGetElementsByClassName2(anode, className) {
        var elems = anode.getElementsByTagName("*");
        var matches = [];
        for (var i=0, m=elems.length; i<m; i++) {
            if (elems[i].className && elems[i].className.indexOf(className) != -1) {
                matches.push(elems[i]);
            }
        }

        return matches;
    }

    // Insert comma separators into a number
    //function numberWithCommas(x) {
    //    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    //}

    function numberWithCommas(x) {
        var parts = x.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    }

    //////////////////////////////////////////////////////////////////////
    // Build the Gym Gains div, append above the 'gymroot' div
    //////////////////////////////////////////////////////////////////////

    function buildGymGainsDiv() {
        // Only do this once
        var testDiv = document.getElementById('xedx-gym-gains-wrap');
        if (validPointer(testDiv)) {
            return;
        }

        var tutorialNode = document.getElementsByClassName("tutorial-cont m-top10")[0];
        // Wonder why this changes per season??
        //var parentNode = document.getElementsByClassName("content-wrapper m-left20 left winter")[0];
        var parentNode = document.getElementsByClassName("content-wrapper m-left20 left")[0];
        var refDiv = document.getElementById('gymroot');
        debugger;
        if (!validPointer(refDiv) || !validPointer(parentNode)) {
            console.log("Torn Gym Gains: Unable to find refDiv/parentNode!");
            return;
        }

        // Piece everything together.
        // extDiv0 --> Perk Details, starts collapsed
        // extDiv2 --> Bat Stats, starts collapsed
        // extDiv1 --> Perk Summary + gym gains, expanded
        var wrapperDiv = createWrapperDiv();

        var extDiv0 = createExtendedDiv();// Details
        extDiv0.id = 'xedx-gym-gains-ext0';

        var extDiv2 = createExtendedDiv();// Bat Stats
        extDiv2.id = 'xedx-gym-gains-ext2';

        var extDiv1 = createExtendedDiv(); // Summary
        extDiv1.id = 'xedx-gym-gains-ext1';

        var hdrDiv0 = createHeaderDiv();
        hdrDiv0.id = 'xedx-gym-gains-hdr-div';
        var arrowDiv = createArrowDiv('xedx-gym-gains-body', 'xedx-gym-gains-hdr-div');
        hdrDiv0.appendChild(arrowDiv);
        hdrDiv0.appendChild(document.createTextNode('Gym Gains (detailed)'));

        var hdrDiv2 = createHeaderDiv();
        hdrDiv2.id = 'xedx-bat-stats-hdr-div';
        var arrowDiv2 = createArrowDiv('xedx-bat-stats-body', 'xedx-bat-stats-hdr-div');
        hdrDiv2.appendChild(arrowDiv2);
        hdrDiv2.appendChild(document.createTextNode('Battle Stats'));

        var hdrDiv1 = createHeaderDiv();
        hdrDiv1.className = 'title main-title title-black top-round active';
        hdrDiv1.appendChild(document.createTextNode('Gym Gains (summary)'));

        var bodyDiv0 = createBodyDiv();
        bodyDiv0.id = 'xedx-gym-gains-body';
        var contentDiv0 = createContentDiv();
        var ul = createUL();

        var bodyDiv2 = createBodyDiv();
        bodyDiv2.id = 'xedx-bat-stats-body';
        var contentDiv2 = createContentDiv();
        contentDiv2.id = 'xedx-bat-stats';

        var bodyDiv1 = createBodyDiv();
        bodyDiv1.id = 'xedx-summary-body';
        var contentDiv1 = createContentDiv();
        contentDiv1.id = 'xedx-summary-div';
        bodyDiv1.setAttribute('style', 'display: block; overflow: hidden');

        wrapperDiv.appendChild(extDiv0);
        extDiv0.appendChild(hdrDiv0);
        extDiv0.appendChild(bodyDiv0);
        bodyDiv0.appendChild(contentDiv0);
        contentDiv0.appendChild(ul);

        wrapperDiv.appendChild(extDiv2);
        extDiv2.appendChild(hdrDiv2);
        extDiv2.appendChild(bodyDiv2);
        bodyDiv2.appendChild(contentDiv2);
        wrapperDiv.insertBefore(createSmallSeparator(), extDiv2);

        wrapperDiv.appendChild(extDiv1);
        extDiv1.appendChild(hdrDiv1);
        extDiv1.appendChild(bodyDiv1);
        bodyDiv1.appendChild(contentDiv1);
        wrapperDiv.insertBefore(createSmallSeparator(), extDiv1);

        parentNode.insertBefore(wrapperDiv, refDiv);
        parentNode.insertBefore(createSeparator(), refDiv);

        // Populate perk info/gym gain info via the Torn API
        queryPerkInfo(ul);

        // Populate the bat stats section via the Torn API
        queryBatStats(contentDiv2);

        // Add onClick() handlers to toggle the gym stats info
        addOnClickHandlers();
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Function to add onClick() handlers
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function addOnClickHandlers() {
        var gymDiv = document.getElementById('gymroot');
        var rootDiv = myGetElementsByClassName2(gymDiv, 'gymList')[0];
        var buttonDivs = myGetElementsByClassName2(rootDiv, 'gymButton');
        for (var i=0; i < buttonDivs.length; i++) {
            buttonDivs[i].addEventListener("click", onGymClick, false);
        }
    }

    function onGymClick() {
        var id = this.id;
        var at = id.indexOf('-');
        var index = id.slice(++at);
        queryGymDetails(null, index);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Dialog (UI/div) element utility functions
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function createWrapperDiv() {
        var wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'content m-top10 sortable-list ui-sortable';
        wrapperDiv.id = 'xedx-gym-gains-wrap';
        return wrapperDiv;
    }

    function createExtendedDiv() {
        var extendedDiv = document.createElement('div');
        extendedDiv.className = 'sortable-box t-blue-cont h';
        return extendedDiv;
    }

    function createHeaderDiv(title=null) {
        var headerDiv = document.createElement('div');
        // Start off hidden, see bodyDiv also...
        // headerDiv.className = 'title main-title title-black top-round active';
        headerDiv.className = 'title main-title title-black border-round';
        headerDiv.setAttribute('role', 'table');
        headerDiv.setAttribute('aria-level', '5');
        if (title != null) {
            headerDiv.appendChild(document.createTextNode(title));
        }
        return headerDiv;
    }

    function createArrowDiv(bodyName, hdrName) {
        var arrowDiv = document.createElement('div');
        arrowDiv.className = 'arrow-wrap sortable-list';
        var a = document.createElement('a');
        a.setAttribute('role', 'button');
        a.setAttribute('href', '#/');
        a.className = 'accordion-header-arrow right';
        arrowDiv.appendChild(a);

        // New (just because I haven't figured out correct class layout yet - dirty way)
        arrowDiv.addEventListener("click", function() {
            // Toggle visibility and border style (and arrow image)
            var bodyDiv = document.getElementById(bodyName);
            var headerDiv = document.getElementById(hdrName);
            if (bodyDiv.style.display === "block") {
                bodyDiv.style.display = "none";
                headerDiv.className = 'title main-title title-black border-round';
            } else {
                bodyDiv.style.display = "block";
                headerDiv.className = 'title main-title title-black top-round active';
            }
        });

        return arrowDiv;
    }

    function createBodyDiv() {
        var bodyDiv = document.createElement('div');
        bodyDiv.className = 'bottom-round';
        // Start off hidden, see headerDiv also...
        //bodyDiv.setAttribute('style', 'display: block; overflow: hidden');
        bodyDiv.setAttribute('style', 'display: none; overflow: hidden');
        return bodyDiv;
    }

    // overflow: auto for scrolling?
    function createContentDiv() {
        var contentDiv = document.createElement('div');
        contentDiv.className = 'cont-gray'; // bottom-round';
        contentDiv.setAttribute('style', 'height: auto;'); //overflow: auto');
        return contentDiv;
    }

    function createSeparator() {
        var sepHr = document.createElement('hr');
        sepHr.className = 'delimiter-999 m-top10 m-bottom10';
        return sepHr;
    }

    function createSmallSeparator() {
        var sepHr = document.createElement('hr');
        sepHr.className = 'delimiter-999';
        sepHr.setAttribute('style', 'margin-top: 5px; margin-bottom: 5px;');
        return sepHr;
    }

    function createUL() {
        var ul = document.createElement('ul');
        ul.className = 'info-cont-wrap';
        ul.id = 'gym-gains-list';
        return ul;
    }

    function createDividerSpan(name) {
        var dividerSpan = document.createElement('span');
        dividerSpan.className = ('divider');

        dividerSpan.setAttribute('style',
                                 'display: inline-block; width: 376px; padding: 5px 10px; ' +
                                 'border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; background: 0 0;');

        var nameSpan = document.createElement('span');
        nameSpan.innerText = name;
        dividerSpan.appendChild(nameSpan);

        return dividerSpan;
    }

    // border-right: 1px solid #ddd;
    function createValueSpan(value) {
        var valSpan = document.createElement('span');

        // This manually makes the grid. Should be able to figure out
        // built in class for style, or use GM_addStyle...
        valSpan.setAttribute('style',
                                 'display: inline-block; width: 366px; padding: 5px 10px; ' +
                                 'border-bottom: 1px solid #ddd; background: 0 0;');
        valSpan.innerText = value;
        return valSpan;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Torn API call and filling the list
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function queryPerkInfo(ul) {
        GM_xmlhttpRequest ( {
            url: 'https://api.torn.com/user/?selections=perks&key=' + api_key,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                populateGymGainsDiv(response.responseText, ul);
            },
            onerror: function(response) {
                handleApiError(response);
            }
        });
    }

    function queryGymInfo() {
        console.log('Gym Gains: queryGymInfo');
        GM_xmlhttpRequest ( {
            url: 'https://api.torn.com/user/?selections=gym&key=' + api_key,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                queryGymDetails(response.responseText);
            },
            onerror: function(response) {
                handleApiError(response);
            }
        });
    }

    // Parse result of above, to enter gym into new query:
    // https://api.torn.com/torn/<19>?selections=gyms&key
    function queryGymDetails(responseText=null, index=0) {

        if (responseText != null) {
            var jsonResp = JSON.parse(responseText);
            if (jsonResp.error) {
                return handleApiError(responseText);
            }
        }

        var useGym = index ? index : jsonResp.active_gym;

        console.log('Gym Gains: queryGymDetails');
        GM_xmlhttpRequest ( {
            url: 'https://api.torn.com/torn/' + useGym +'?selections=gyms&key=' + api_key,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                fillGymDetailsDiv(response.responseText, useGym);
            },
            onerror: function(response) {
                handleApiError(response);
            }
        });
    }

    //////////////////////////////////////////////////////////////////////
    // Query and populate bat stats table
    //////////////////////////////////////////////////////////////////////

    function queryBatStats(contentDiv2) {
        var tableDiv = document.getElementById('xedx-bat-stat-table');
        if (!validPointer(tableDiv)) {
            buildBatStatTable(contentDiv2);
        }

        console.log('Gym Gains: queryGymDetails');
        GM_xmlhttpRequest ( {
            url: 'https://api.torn.com/user/?selections=battlestats&key=' + api_key,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                fillBatStatsDiv(response.responseText);
            },
            onerror: function(response) {
                handleApiError(response);
            }
        });

    }

    /////////////////////////////////////////////////////////////////////////////////////////////
    // Build the table: id = 'xedx-bat-stat-table', cell ID's = 'row-<row#, 0-5>-col-<col#, 0-4>'
    /////////////////////////////////////////////////////////////////////////////////////////////

    function buildBatStatTable(contentDiv2) {
        var table = document.createElement('TABLE');
        table.id = 'xedx-bat-stat-table';
        $(table).attr('style', 'width: 782px;');
        contentDiv2.appendChild(table);

        // Need a table of 6 rows: header, str, def, speed, dex, total
        // and 5 cols: header, Base stats, base + Passives, Current Effective, Base + Passives + Vico
        for (var i = 0; i < 6; i++) {
            var row = table.insertRow(i);
            $(row).attr('style', 'height: 23px;');

            /*
            GM_addStyle(".cellStyle1 {'border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; vertical-align: middle;'}" +
                        ".cellStyle2 {'border-left: 1px solid #ddd; border-bottom: 1px solid black; border_right: 1px solid black; vertical-align: middle;'" +
                        ".cellStyle3 {'border: 1px solid #ddd; vertical-align: middle;'}");
            */

            // Set  border styles
            var cell0 = row.insertCell(0);
            var cell1 = row.insertCell(1);
            var cell2 = row.insertCell(2);
            var cell3 = row.insertCell(3);
            var cell4 = row.insertCell(4);
            $(cell0).attr('style', 'border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; vertical-align: middle;');
            if (i == 0) {
                $(cell1).attr('style', 'border-left: 1px solid #ddd; border-bottom: 1px solid black; vertical-align: middle;');
                $(cell2).attr('style', 'border-left: 1px solid #ddd; border-bottom: 1px solid black; vertical-align: middle;');
                $(cell3).attr('style', 'border-left: 1px solid #ddd; border-bottom: 1px solid black; vertical-align: middle;');
                $(cell4).attr('style', 'border-left: 1px solid #ddd; border-bottom: 1px solid black; vertical-align: middle;');
            } else {
                $(cell1).attr('style', 'border-right: 1px solid black; border-bottom: 1px solid #ddd; vertical-align: middle;');
                $(cell2).attr('style', 'border-right: 1px solid black; border-bottom: 1px solid #ddd; vertical-align: middle;');
                $(cell3).attr('style', 'border-right: 1px solid black; border-bottom: 1px solid #ddd; vertical-align: middle;');
                $(cell4).attr('style', 'border-right: 1px solid black; border-bottom: 1px solid #ddd; vertical-align: middle;');
            }

            // Set cell ID's, to use to populate later.
            cell0.id = 'row-' + i + '-col-0';
            cell1.id = 'row-' + i + '-col-1';
            cell2.id = 'row-' + i + '-col-2';
            cell3.id = 'row-' + i + '-col-3';
            cell4.id = 'row-' + i + '-col-4';

            cell1.style.textAlign = 'center';
            cell2.style.textAlign = 'center';
            cell3.style.textAlign = 'center';
            cell4.style.textAlign = 'center';
            switch (i) { // 'i' is the row
                case 0:
                    cell1.innerHTML = '<B>Base</B>';
                    cell2.innerHTML = '<B>Base w/Passives</B>';
                    cell3.innerHTML = '<B>Effective</B>';
                    cell4.innerHTML = '<B>Base w/Passives & Vico</B>';
                    break;
                case 1:
                    cell0.innerHTML = '<B>Strength</B>';
                    cell1.style.borderLeft = '1px solid black';
                    cell4.style.borderRight = '1px solid black';
                    break;
                case 2:
                    cell0.innerHTML = '<B>Defense</B>';
                    cell1.style.borderLeft = '1px solid black';
                    cell4.style.borderRight = '1px solid black';
                    break;
                case 3:
                    cell0.innerHTML = '<B>Speed</B>';
                    cell1.style.borderLeft = '1px solid black';
                    cell4.style.borderRight = '1px solid black';
                    break;
                case 4:
                    cell0.innerHTML = '<B>Dexterity</B>';
                    cell1.style.borderLeft = '1px solid black';
                    cell1.style.borderBottom = '1px solid black';
                    cell2.style.borderBottom = '1px solid black';
                    cell3.style.borderBottom = '1px solid black';
                    cell4.style.borderBottom = '1px solid black';
                    cell4.style.borderRight = '1px solid black';
                    break;
                case 5:
                    cell0.innerHTML = '<B>Total</B>';
                    cell1.style.borderLeft = '1px solid black';
                    cell1.style.borderTop = '1px solid black';
                    cell2.style.borderTop = '1px solid black';
                    cell3.style.borderTop = '1px solid black';
                    cell4.style.borderTop = '1px solid black';
                    cell1.style.borderBottom = '1px solid black';
                    cell2.style.borderBottom = '1px solid black';
                    cell3.style.borderBottom = '1px solid black';
                    cell4.style.borderBottom = '1px solid black';
                    cell4.style.borderRight = '1px solid black';
                    break;
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Callback to populate the table created above
    //////////////////////////////////////////////////////////////////////

    function fillBatStatsDiv(responseText) {
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            return handleApiError(responseText);
        }

        // Base values
        fillBaseBatStats(jsonResp);

        // Base with passives
        fillBaseWithPassives(jsonResp);

        // Current effective
        fillCurrentEffectiveBatStats(jsonResp);

        // Base with passives and Vicodin
        fillBaseWithPassivesAndVico(jsonResp);
    }


    //////////////////////////////////////////////////////////////////////
    // Helpers for above
    //////////////////////////////////////////////////////////////////////

    // Get the passives applied to any given stat
    function getPassives(jsonResp, stat) {
        var key = stat + '_info';
        var info = jsonResp[key];
        var ret = 0;
        for (var i = 0; i < info.length; i++) { // Parse out '+25%' ==> 25, keep running total
            if (info[i][0] == '+') {
                var pAt = info[i].indexOf('%');
                var tmp = info[i].slice(1, pAt);
                ret += Number(tmp);
            }
        }
        return ret;
    }

    function fillBaseBatStats(jsonResp) {
        /*
        document.getElementById('row-1-col-1').innerHTML = numberWithCommas(jsonResp.strength);
        document.getElementById('row-2-col-1').innerHTML = numberWithCommas(jsonResp.defense);
        document.getElementById('row-3-col-1').innerHTML = numberWithCommas(jsonResp.speed);
        document.getElementById('row-4-col-1').innerHTML = numberWithCommas(jsonResp.dexterity);
        document.getElementById('row-5-col-1').innerHTML = numberWithCommas(jsonResp.total);
        */

        document.getElementById('row-1-col-1').innerHTML = numberWithCommas(Math.round(jsonResp.strength));
        document.getElementById('row-2-col-1').innerHTML = numberWithCommas(Math.round(jsonResp.defense));
        document.getElementById('row-3-col-1').innerHTML = numberWithCommas(Math.round(jsonResp.speed));
        document.getElementById('row-4-col-1').innerHTML = numberWithCommas(Math.round(jsonResp.dexterity));
        document.getElementById('row-5-col-1').innerHTML = numberWithCommas(Math.round(jsonResp.total));
    }

    function fillBaseWithPassives(jsonResp) {
        var strMod = getPassives(jsonResp, 'strength');
        var speMod = getPassives(jsonResp, 'speed');
        var defMod = getPassives(jsonResp, 'defense');
        var dexMod = getPassives(jsonResp, 'dexterity');
        var totMod = strMod + speMod + defMod + dexMod;

        var strTot = Number(jsonResp.strength) + (jsonResp.strength * strMod/100);
        //document.getElementById('row-1-col-2').innerHTML = numberWithCommas(strTot.toFixed(4)) + ' (+' + strMod + '%)';
        document.getElementById('row-1-col-2').innerHTML = numberWithCommas(Math.round(strTot)) + ' (+' + strMod + '%)';
        var defTot = Number(jsonResp.defense) + (jsonResp.defense * defMod/100);
        //document.getElementById('row-2-col-2').innerHTML = numberWithCommas(defTot.toFixed(4)) + ' (+' + defMod + '%)';
        document.getElementById('row-2-col-2').innerHTML = numberWithCommas(Math.round(defTot)) + ' (+' + defMod + '%)';
        var speedTot = Number(jsonResp.speed) + (jsonResp.speed * speMod/100);
        //document.getElementById('row-3-col-2').innerHTML = numberWithCommas(speedTot.toFixed(4)) + ' (+' + speMod + '%)';
        document.getElementById('row-3-col-2').innerHTML = numberWithCommas(Math.round(speedTot)) + ' (+' + speMod + '%)';
        var dexTot = Number(jsonResp.dexterity) + (jsonResp.dexterity * dexMod/100);
        //document.getElementById('row-4-col-2').innerHTML = numberWithCommas(dexTot.toFixed(4)) + ' (+' + dexMod + '%)';
        document.getElementById('row-4-col-2').innerHTML = numberWithCommas(Math.round(dexTot)) + ' (+' + dexMod + '%)';
        var total = strTot + defTot + speedTot + dexTot;
        //document.getElementById('row-5-col-2').innerHTML = numberWithCommas(total.toFixed(4));
        document.getElementById('row-5-col-2').innerHTML = numberWithCommas(Math.round(total));
    }

    function fillCurrentEffectiveBatStats(jsonResp) {
        var strMod = jsonResp.strength_modifier;
        var defMod = jsonResp.defense_modifier;
        var speMod = jsonResp.speed_modifier;
        var dexMod = jsonResp.dexterity_modifier;
        var strTot = Number(jsonResp.strength) + (jsonResp.strength * strMod/100);
        //document.getElementById('row-1-col-3').innerHTML = numberWithCommas(strTot.toFixed(4)) +
        document.getElementById('row-1-col-3').innerHTML = numberWithCommas(Math.round(strTot)) +
            ' (' + ((strMod > 0) ? '+' : '') + strMod + '%)';
        var defTot = Number(jsonResp.defense) + (jsonResp.defense * defMod/100);
        //document.getElementById('row-2-col-3').innerHTML = numberWithCommas(defTot.toFixed(4)) +
        document.getElementById('row-2-col-3').innerHTML = numberWithCommas(Math.round(defTot)) +
            ' (' + ((defMod > 0) ? '+' : '') + defMod + '%)';
        var speedTot = Number(jsonResp.speed) + (jsonResp.speed * speMod/100);
        //document.getElementById('row-3-col-3').innerHTML = numberWithCommas(speedTot.toFixed(4)) +
        document.getElementById('row-3-col-3').innerHTML = numberWithCommas(Math.round(speedTot)) +
            ' (' + ((speMod > 0) ? '+' : '') + speMod + '%)';
        var dexTot = Number(jsonResp.dexterity) + (jsonResp.dexterity * dexMod/100);
        //document.getElementById('row-4-col-3').innerHTML = numberWithCommas(dexTot.toFixed(4)) +
        document.getElementById('row-4-col-3').innerHTML = numberWithCommas(Math.round(dexTot)) +
            ' (' + ((dexMod > 0) ? '+' : '') + dexMod + '%)';
        var total = strTot + defTot + speedTot + dexTot;
        //document.getElementById('row-5-col-3').innerHTML = numberWithCommas(total.toFixed(4));
        document.getElementById('row-5-col-3').innerHTML = numberWithCommas(Math.round(total));
    }

    function fillBaseWithPassivesAndVico(jsonResp) {
        var strMod = getPassives(jsonResp, 'strength') + 25;
        var speMod = getPassives(jsonResp, 'speed') + 25;
        var defMod = getPassives(jsonResp, 'defense') + 25;
        var dexMod = getPassives(jsonResp, 'dexterity') + 25;

        var strTot = Number(jsonResp.strength) + (jsonResp.strength * strMod/100);
        //document.getElementById('row-1-col-4').innerHTML = numberWithCommas(strTot.toFixed(4)) + ' (+' + strMod + '%)';
        document.getElementById('row-1-col-4').innerHTML = numberWithCommas(Math.round(strTot)) + ' (+' + strMod + '%)';
        var defTot = Number(jsonResp.defense) + (jsonResp.defense * defMod/100);
        //document.getElementById('row-2-col-4').innerHTML = numberWithCommas(defTot.toFixed(4)) + ' (+' + defMod + '%)';
        document.getElementById('row-2-col-4').innerHTML = numberWithCommas(Math.round(defTot)) + ' (+' + defMod + '%)';
        var speedTot = Number(jsonResp.speed) + (jsonResp.speed * speMod/100);
        //document.getElementById('row-3-col-4').innerHTML = numberWithCommas(speedTot.toFixed(4)) + ' (+' + speMod + '%)';
        document.getElementById('row-3-col-4').innerHTML = numberWithCommas(Math.round(speedTot)) + ' (+' + speMod + '%)';
        var dexTot = Number(jsonResp.dexterity) + (jsonResp.dexterity * dexMod/100);
        //document.getElementById('row-4-col-4').innerHTML = numberWithCommas(dexTot.toFixed(4)) + ' (+' + dexMod + '%)';
        document.getElementById('row-4-col-4').innerHTML = numberWithCommas(Math.round(dexTot)) + ' (+' + dexMod + '%)';
        var total = strTot + defTot + speedTot + dexTot;
        //document.getElementById('row-5-col-4').innerHTML = numberWithCommas(total.toFixed(4));
        document.getElementById('row-5-col-4').innerHTML = numberWithCommas(Math.round(total));
    }

    //////////////////////////////////////////////////////////////////////
    // Very simple error handler; only displayed (and logged) once
    //////////////////////////////////////////////////////////////////////

    // TBD: Change this to a self-closing message.
    var errorLogged = false;
    function handleApiError(responseText) {
        if (!errorLogged) {
            var jsonResp = JSON.parse(responseText);
            var errorText = 'Torn Gym Gains: An error has occurred querying perks information.\n' +
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

    ////////////////////////////////////////////////////////////////////////
    // Build <LI>'s for each and insert into the <UL> (detailed summary)
    // ------------------------------------------------------
    // | Property Perks         |  +2% gym gains            |
    // ------------------------------------------------------
    // | Education Perks        |  + 1% Strength gym gains  |
    // ------------------------------------------------------
    // | Education Perks        |  + 1% Speed gym gains     |
    // ------------------------------------------------------
    // etc.
    ////////////////////////////////////////////////////////////////////////

    var strengthPct = 0, defPct = 0, speedPct = 0, dexPct = 0;
    function populateGymGainsDiv(responseText, ul) {
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            return handleApiError(responseText);
        }

        var i=0, j=0;
        var category = ['property_perks', 'education_perks', 'company_perks', 'faction_perks'];
        var categoryName = ['Property Perks', 'Education Perks', 'Company Perks', 'Faction Perks'];
        for (i=0; i<category.length; i++) { // Iterate object's arrays
            var arr = jsonResp[category[i]];
            for (j=0; j<arr.length; j++) { // Iterate category array
                // If is a gym gain, create the value span and add to the UL
                var gymGains = arr[j].toLowerCase().indexOf('gym gains');
                var val = 0;
                if (gymGains != -1) {
                    var li = document.createElement('li'); // Create <li> for this category
                    li.appendChild(createDividerSpan(categoryName[i]));
                    li.appendChild(createValueSpan(arr[j]));
                    ul.appendChild(li);

                    // Parse % and add to app. type: speed, str, dex, def.
                    // If not specific, adds to all.
                    var tmp = arr[j].slice(2, at-2);
                    val = Number(arr[j].slice(2, at-2));
                    //console.log('parsed value: ' + tmp);
                    var at = 0, at2 = 0, at3 = 0;
                    at2 = arr[j].toLowerCase().indexOf('gym gains by ');
                    if (at2 > 0) {
                        tmp = arr[j].slice(tmp+at2);
                        at3 = tmp.indexOf('%');
                    }
                    // Note: need to search for 'Increases X gym gains by ' in these cases.
                    if ((at = arr[j].toLowerCase().indexOf('speed')) != -1) {
                        if (at2 > 0 && at3 > 0) {
                            val = Number(arr[j].slice(at2+13, at3));
                        } else {
                            val = Number(arr[j].slice(2, at-2));
                        }
                        //console.log('Adding ' + val + ' to Speed: ' + speedPct);
                        speedPct += val;
                        //console.log('Added ' + val + ' to Speed: ' + speedPct);
                    } else if ((at = arr[j].toLowerCase().indexOf('strength')) != -1) {
                        if (at2 > 0 && at3 > 0) {
                            val = Number(arr[j].slice(at2+13, at3));
                        } else {
                            val = Number(arr[j].slice(2, at-2));
                        }
                        //console.log('Adding ' + val + ' to Strength: ' + strengthPct);
                        strengthPct += val;
                        //console.log('Added ' + val + ' to Strength: ' + strengthPct);
                    } else if ((at = arr[j].toLowerCase().indexOf('defense')) != -1) {
                        if (at2 > 0 && at3 > 0) {
                            val = Number(arr[j].slice(at2+13, at3));
                        } else {
                            val = Number(arr[j].slice(2, at-2));
                        }
                        //console.log('Adding ' + val + ' to Defense: ' + defPct);
                        defPct += val;
                        //console.log('Added ' + val + ' to Defense: ' + defPct);
                    } else if ((at = arr[j].toLowerCase().indexOf('dexterity')) != -1) {
                        if (at2 > 0 && at3 > 0) {
                            val = Number(arr[j].slice(at2+13, at3));
                        } else {
                            val = Number(arr[j].slice(2, at-2));
                        }
                        //console.log('Adding ' + val + ' to Dexterity: ' + dexPct);
                        dexPct += val;
                        //console.log('Added ' + val + ' to Dexterity: ' + dexPct);
                    } else {
                        val = Number(arr[j].slice(2, gymGains-2));
                        //console.log('Adding ' + val + ' to everything: speed=' + speedPct + ' defense=' + defPct +
                        //           ' strength=' + strengthPct + ' dexterity=' + dexPct);
                        strengthPct += val;
                        defPct += val;
                        speedPct += val;
                        dexPct += val; //Number(arr[j].slice(2, gymGains-2));
                        //console.log('New values: speed=' + speedPct + ' defense=' + defPct +
                        //           ' strength=' + strengthPct + ' dexterity=' + dexPct);
                    }
                }
            }
        }
        fillSummaryDiv(document.getElementById('xedx-summary-div'));
        observer.observe(targetNode, config);
    }

    //////////////////////////////////////////////////////////////////////
    // Fill the summary div with values obtained above
    //////////////////////////////////////////////////////////////////////

    function fillSummaryDiv(content) {
        content.setAttribute('style', 'text-align: center; vertical-align: middle; line-height: 24px;');
        var attr = ['Strength', 'Defense', 'Speed', 'Dexterity'];
        for (var i=0; i < attr.length; i++) {
            var s = document.createElement('span');
            s.setAttribute('style', 'color: red; margin: 10px');
            if (attr[i] === 'Strength') {
                s.appendChild(document.createTextNode('+' + strengthPct + '%'));
            } else if (attr[i] === 'Defense') {
                s.appendChild(document.createTextNode('+' + defPct + '%'));
            } else if (attr[i] === 'Speed') {
                s.appendChild(document.createTextNode('+' + speedPct + '%'));
            } else if (attr[i] === 'Dexterity') {
                s.appendChild(document.createTextNode('+' + dexPct + '%'));
            }
            content.appendChild(document.createTextNode(attr[i] + ':'));
            content.appendChild(s);
        }

        // Fill gym details section
        queryGymInfo();
    }

    // Array of all gym names, indexed (currently unused)
    var gymNamesArr = [null, "Premier Fitness", "Average Joes", "Woody's Workout Club", "Beach Bods", "Silver Gym",
                       "Pour Femme", "Davies Den", "Global Gym", "Knuckle Heads", "Pioneer Fitness", "Anabolic Anomalies",
                       "Core", "Racing Fitness", "Complete Cardio", "Legs, Bums and Tums", "Deep Burn", "Apollo Gym",
                       "Gun Shop", "Force Training", "Cha Cha's", "Atlas", "Last Round", "The Edge", "George's", "Balboas Gym",
                       "Frontline Fitness", "Mr. Isoyamas", "Total Rebound", "Elites", "The Sports Science Lab", "Unknown", "The Jail Gym"];

    // Handler for 'queryGymDetails()', called by 'queryGymInfo()'
    function fillGymDetailsDiv(responseText, active_gym) {
        var span1id = 'xedx-summary-s1';
        var span2id = 'xedx-summary-s2';
        var contentId = 'xedx-gymsum-contid';

        console.log('Gym Gains: fillGymDetailsDiv');

        var jsonResp = JSON.parse(responseText);

        if (jsonResp.error) {
            return handleApiError(responseText);
        }

        var e1 = document.getElementById(span1id);
        var e2 = document.getElementById(span2id);
        if (validPointer(e1)) {
            e1.parentNode.removeChild(e1);
        }
        if (validPointer(e2)) {
            e2.parentNode.removeChild(e2);
        }

        var parentDiv = document.getElementById('xedx-summary-body');
        var content = document.getElementById(contentId);
        if (!validPointer(content)) {
            content = createContentDiv();
            content.id = contentId;
            parentDiv.appendChild(content);
        }
        var s = document.createElement('span');
        s.id = span1id;
        var s2 = document.createElement('span');
        s2.id = span2id;
        content.setAttribute('style', 'text-align: center; vertical-align: middle; line-height: 24px;');

        var name = jsonResp.gyms[active_gym].name;
        console.log('fillGymDetailsDiv: name=' + name);
        s.setAttribute('style', 'font-weight: bold;');
        s.appendChild(document.createTextNode(name));
        content.appendChild(s);

        var speed = Math.round(jsonResp.gyms[active_gym].speed)/10;
        var strength = Math.round(jsonResp.gyms[active_gym].strength)/10;
        var dexterity = Math.round(jsonResp.gyms[active_gym].dexterity)/10;
        var defense = Math.round(jsonResp.gyms[active_gym].defense)/10;
        var result = ' - Strength: ' + strength + ', Defense: ' + defense + ', Speed: ' + speed + ', Dexterity: ' + dexterity;
        s2.appendChild(document.createTextNode(result));
        content.appendChild(s2);

        console.log('Gym Gains: enabling observer');
        observer.observe(targetNode, config);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    console.log("Torn Gym Gains script started!");

    // Make sure we have an API key
    var api_key = GM_getValue('gm_api_key');
    if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
        api_key = prompt("Please enter your API key.\n" +
                         "Your key will be saved locally so you won't have to be asked again.\n" +
                         "Your key is kept private and not shared with anyone.", "");
        GM_setValue('gm_api_key', api_key);
    }

    //var targetNode = document.getElementById('mainContainer');
    var targetNode = document.getElementById('gymroot');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        // Disconnect the observer to prevent looping before
        // we start modifying the page.
        console.log('Torn Gym Gains: disconnecting observer');
        observer.disconnect();
        buildGymGainsDiv();
    };
    var observer = new MutationObserver(callback);
    console.log('Torn Gym Gains: starting observer');
    observer.observe(targetNode, config);
})();