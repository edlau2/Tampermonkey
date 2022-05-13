// ==UserScript==
// @name         Torn Gym Gains
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Creates new expandable DIVs on Gym page with gym gains, perks and bat stats displayed
// @author       xedx [2100735]
// @match      https://www.torn.com/gym.php
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint no-sequences: 0*/

(function() {
    'use strict';

    debugLoggingEnabled = true;

    //////////////////////////////////////////////////////////////////////
    // Build the Gym Gains div, append above the 'gymroot' div
    //////////////////////////////////////////////////////////////////////

    function buildGymGainsDiv() {
        let testDiv = document.getElementById('xedx-gym-gains-wrap');
        if (validPointer(testDiv)) {return;} // Only do this once

        let refDiv = document.getElementById('gymroot');
        if (!validPointer(refDiv)) {return;}

        $(torn_gym_gains_div).insertBefore(refDiv);

        doUserQuery();
        addOnClickHandlers();
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Function to add onClick() handlers
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function addOnClickHandlers() {
        let gymDiv = document.getElementById('gymroot');
        let rootDiv = document.querySelector(".gym___iaU92");
        let buttonDivs = rootDiv.querySelectorAll('button[class*="gymButton"]');

        for (let i=0; i < buttonDivs.length; i++) {
            buttonDivs[i].addEventListener("click", onGymClick, false);
        }

        let idArray = [{'bodyId': 'xedx-gym-gains-body', 'hdrId': 'xedx-gym-gains-hdr-div'},
                       {'bodyId': 'xedx-bat-stats-body', 'hdrId': 'xedx-bat-stats-hdr-div'}];
        for (let i=0; i < idArray.length; i++) {
            const bodyDiv = document.getElementById(idArray[i].bodyId);
            const headerDiv = document.getElementById(idArray[i].hdrId);
            const arrowDiv = headerDiv.parentElement;

            arrowDiv.addEventListener("click", function(e) {
                debug('Click: ', e);
                if (bodyDiv.style.display === "block") {
                    bodyDiv.style.display = "none";
                    headerDiv.className = 'title main-title title-black border-round';
                } else {
                    bodyDiv.style.display = "block";
                    headerDiv.className = 'title main-title title-black top-round active';
                    if (headerDiv.id == 'xedx-bat-stats-hdr-div') {
                        doUserQuery();
                    }
                }
            });
        }
    }

    function onGymClick() {
        var id = this.id;
        var at = id.indexOf('-');
        var index = id.slice(++at);
        queryGymDetails(null, index);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Torn API call and filling the list
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function doUserQuery() {
        xedx_TornUserQuery(null, 'perks,battlestats,gym', userQueryCB);
    }

    function userQueryCB(responseText, ID, param) {
        populateGymGainsDiv(responseText);
        fillBatStatsDiv(responseText);
        queryGymDetails(responseText);
    }

    // Parse result of above, to enter individual gym into new query.
    function queryGymDetails(responseText=null, index=0) {
        if (responseText != null) {
            var jsonResp = JSON.parse(responseText);
            if (jsonResp.error) {return handleError(responseText);}
        }

        var useGym = index ? index : jsonResp.active_gym;
        xedx_TornTornQuery(null, 'gyms', fillGymDetailsDiv, useGym);
    }

    //////////////////////////////////////////////////////////////////////
    // Callback to populate the bat stats table
    //////////////////////////////////////////////////////////////////////

    function fillBatStatsDiv(responseText, ID=null, unused=null) {
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        let totalBase = fillBaseBatStats(jsonResp);
        let totalPass = fillBaseWithPassives(jsonResp);
        let totalEff = fillCurrentEffectiveBatStats(jsonResp);
        let totalVico = fillBaseWithPassivesAndVico(jsonResp);

        debug('totalBase: ', totalBase, ' totalPass: ', totalPass, ' totalEff: ', totalEff, ' totalVico: ', totalVico);

        $("#xedx-stat-base")[0].textContent = "Base: " + numberWithCommas(Math.round(totalBase));
        $("#xedx-stat-eff")[0].textContent = "Effective: " + numberWithCommas(Math.round(totalEff));
    }

    //////////////////////////////////////////////////////////////////////
    // Helpers for above, filling table elements
    //////////////////////////////////////////////////////////////////////

    // Get the passives applied to any given stat
    function getPassives(jsonResp, stat) {
        let key = stat + '_info';
        let info = jsonResp[key];
        let ret = 0;
        for (let i = 0; i < info.length; i++) { // Parse out '+25%' ==> 25, keep running total
            if (info[i][0] == '+') {
                let pAt = info[i].indexOf('%');
                let tmp = info[i].slice(1, pAt);
                ret += Number(tmp);
            }
        }
        return ret;
    }

    function fillBaseBatStats(jsonResp) {
        document.getElementById('row-1-col-1').innerHTML = numberWithCommas(Math.round(jsonResp.strength));
        document.getElementById('row-2-col-1').innerHTML = numberWithCommas(Math.round(jsonResp.defense));
        document.getElementById('row-3-col-1').innerHTML = numberWithCommas(Math.round(jsonResp.speed));
        document.getElementById('row-4-col-1').innerHTML = numberWithCommas(Math.round(jsonResp.dexterity));
        document.getElementById('row-5-col-1').innerHTML = numberWithCommas(Math.round(jsonResp.total));
        return jsonResp.total;
    }

    function fillBaseWithPassives(jsonResp) {
        let strMod = getPassives(jsonResp, 'strength');
        let speMod = getPassives(jsonResp, 'speed');
        let defMod = getPassives(jsonResp, 'defense');
        let dexMod = getPassives(jsonResp, 'dexterity');
        let totMod = strMod + speMod + defMod + dexMod;

        let strTot = Number(jsonResp.strength) + (jsonResp.strength * strMod/100);
        document.getElementById('row-1-col-2').innerHTML = numberWithCommas(Math.round(strTot)) + ' (+' + strMod + '%)';
        let defTot = Number(jsonResp.defense) + (jsonResp.defense * defMod/100);
        document.getElementById('row-2-col-2').innerHTML = numberWithCommas(Math.round(defTot)) + ' (+' + defMod + '%)';
        let speedTot = Number(jsonResp.speed) + (jsonResp.speed * speMod/100);
        document.getElementById('row-3-col-2').innerHTML = numberWithCommas(Math.round(speedTot)) + ' (+' + speMod + '%)';
        let dexTot = Number(jsonResp.dexterity) + (jsonResp.dexterity * dexMod/100);
        document.getElementById('row-4-col-2').innerHTML = numberWithCommas(Math.round(dexTot)) + ' (+' + dexMod + '%)';
        let total = strTot + defTot + speedTot + dexTot;
        document.getElementById('row-5-col-2').innerHTML = numberWithCommas(Math.round(total));

        return total;
    }

    const getMod = function(x) {return ' (' + ((x > 0) ? '+' : '') + x + '%)'}
    function fillCurrentEffectiveBatStats(jsonResp) {
        let strMod = jsonResp.strength_modifier;
        let defMod = jsonResp.defense_modifier;
        let speMod = jsonResp.speed_modifier;
        let dexMod = jsonResp.dexterity_modifier;
        let strTot = Number(jsonResp.strength) + (jsonResp.strength * strMod/100);
        document.getElementById('row-1-col-3').innerHTML = numberWithCommas(Math.round(strTot)) + getMod(strMod);
        let defTot = Number(jsonResp.defense) + (jsonResp.defense * defMod/100);
        document.getElementById('row-2-col-3').innerHTML = numberWithCommas(Math.round(defTot)) + getMod(defMod);
        let speedTot = Number(jsonResp.speed) + (jsonResp.speed * speMod/100);
        document.getElementById('row-3-col-3').innerHTML = numberWithCommas(Math.round(speedTot)) + getMod(speMod);
        let dexTot = Number(jsonResp.dexterity) + (jsonResp.dexterity * dexMod/100);
        document.getElementById('row-4-col-3').innerHTML = numberWithCommas(Math.round(dexTot)) + getMod(dexMod);
        let total = strTot + defTot + speedTot + dexTot;
        document.getElementById('row-5-col-3').innerHTML = numberWithCommas(Math.round(total));
        return total;
    }

    function fillBaseWithPassivesAndVico(jsonResp) {
        const VICO_BOOST = 25;
        let strMod = getPassives(jsonResp, 'strength') + VICO_BOOST;
        let speMod = getPassives(jsonResp, 'speed') + VICO_BOOST;
        let defMod = getPassives(jsonResp, 'defense') + VICO_BOOST;
        let dexMod = getPassives(jsonResp, 'dexterity') + VICO_BOOST;

        let strTot = Number(jsonResp.strength) + (jsonResp.strength * strMod/100);
        document.getElementById('row-1-col-4').innerHTML = numberWithCommas(Math.round(strTot)) + ' (+' + strMod + '%)';
        let defTot = Number(jsonResp.defense) + (jsonResp.defense * defMod/100);
        document.getElementById('row-2-col-4').innerHTML = numberWithCommas(Math.round(defTot)) + ' (+' + defMod + '%)';
        let speedTot = Number(jsonResp.speed) + (jsonResp.speed * speMod/100);
        document.getElementById('row-3-col-4').innerHTML = numberWithCommas(Math.round(speedTot)) + ' (+' + speMod + '%)';
        let dexTot = Number(jsonResp.dexterity) + (jsonResp.dexterity * dexMod/100);
        document.getElementById('row-4-col-4').innerHTML = numberWithCommas(Math.round(dexTot)) + ' (+' + dexMod + '%)';
        let total = strTot + defTot + speedTot + dexTot;
        document.getElementById('row-5-col-4').innerHTML = numberWithCommas(Math.round(total));

        return total;
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

    // Can make this *much* simpler using JQuery and classes. TBD...
    // eg $(node).append(`<span class="">...</span>`);

    function createValueSpan(value) {
        let valSpan = document.createElement('span');
        valSpan.setAttribute('style', 'display: inline-block; width: 366px; padding: 5px 10px; ' +
                             'border-bottom: 1px solid #ddd; background: 0 0;');
        valSpan.innerText = value;
        return valSpan;
    }

    function createDividerSpan(name) {
        let dividerSpan = document.createElement('span');
        dividerSpan.className = ('divider');
        dividerSpan.setAttribute('style',
                                 'display: inline-block; width: 376px; padding: 5px 10px; ' +
                                 'border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; background: 0 0;');
        let nameSpan = document.createElement('span');
        nameSpan.innerText = name;
        dividerSpan.appendChild(nameSpan);
        return dividerSpan;
    }

    var strengthPct = 0, defPct = 0, speedPct = 0, dexPct = 0;

    function resetGains(ul) {
        strengthPct = 0, defPct = 0, speedPct = 0, dexPct = 0;
        $(ul).empty();
    }

    function populateGymGainsDiv(responseText, id=null, unused=null) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleApiError(responseText);}

        const ul = document.getElementById('gym-gains-list');
        resetGains(ul);
        const category = ['property_perks', 'education_perks', 'company_perks', 'faction_perks', 'book_perks', 'job_perks'];
        const categoryName = ['Property Perks', 'Education Perks', 'Company Perks', 'Faction Perks', 'Book Perks'];
        for (let i=0; i<category.length; i++) { // Iterate object's arrays
            let arr = jsonResp[category[i]];
            debug('[populateGymGainsDiv] category: ', category[i], ' array: ', arr);
            if (!arr) continue;
            for (let j=0; j<arr.length; j++) { // Iterate category array
                // If is a gym gain, create the value span and add to the UL
                let gymGains = arr[j].toLowerCase().indexOf('gym gains');
                let val = 0;
                if (gymGains != -1) {
                    let li = document.createElement('li'); // Create <li> for this category
                    li.appendChild(createDividerSpan(categoryName[i]));
                    li.appendChild(createValueSpan(arr[j]));
                    ul.appendChild(li);

                    // Parse % and add to app. type: speed, str, dex, def.
                    // If not specific, adds to all.
                    let at = 0, at2 = 0, at3 = 0;
                    let tmp = arr[j].slice(2, at-2);
                    at2 = arr[j].toLowerCase().indexOf('gym gains by ');
                    if (at2 > 0) {
                        tmp = arr[j].slice(tmp+at2);
                        at3 = tmp.indexOf('%');
                    }

                    val = Number(arr[j].slice(at2+13, at3));
                    if ((at = arr[j].toLowerCase().indexOf('speed')) != -1) {
                        if (at2 < 0 || at3 < 0) {val = Number(arr[j].slice(2, at-2));}
                        speedPct += val;
                    } else if ((at = arr[j].toLowerCase().indexOf('strength')) != -1) {
                        if (at2 < 0 || at3 < 0) {val = Number(arr[j].slice(2, at-2));}
                        strengthPct += val;
                    } else if ((at = arr[j].toLowerCase().indexOf('defense')) != -1) {
                        if (at2 < 0 || at3 < 0) {val = Number(arr[j].slice(2, at-2));}
                        defPct += val;
                    } else if ((at = arr[j].toLowerCase().indexOf('dexterity')) != -1) {
                        if (at2 < 0 || at3 < 0) {val = Number(arr[j].slice(2, at-2));}
                        dexPct += val;
                    } else {
                        val = Number(arr[j].slice(2, gymGains-2));
                        strengthPct += val;
                        defPct += val;
                        speedPct += val;
                        dexPct += val; 
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
        let attr = ['Strength', 'Defense', 'Speed', 'Dexterity'];
        $(content).empty();
        for (let i=0; i < attr.length; i++) {
            let s = document.createElement('span');
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
    }

    // Handler for 'queryGymDetails()', called by 'queryGymInfo()'
    function fillGymDetailsDiv(responseText, unused_id, active_gym) {
        let span1id = 'xedx-summary-s1';
        let span2id = 'xedx-summary-s2';
        let contentId = 'xedx-gymsum-contid';

        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleApiError(responseText);}

        let e1 = document.getElementById(span1id);
        let e2 = document.getElementById(span2id);
        if (validPointer(e1)) {
            e1.parentNode.removeChild(e1);
        }
        if (validPointer(e2)) {
            e2.parentNode.removeChild(e2);
        }

        let parentDiv = document.getElementById('xedx-summary-body');
        let content = document.getElementById(contentId);
        if (!validPointer(content)) {
            content = createContentDiv();
            content.id = contentId;
            parentDiv.appendChild(content);
        }
        let s = document.createElement('span');
        s.id = span1id;
        let s2 = document.createElement('span');
        s2.id = span2id;
        content.setAttribute('style', 'text-align: center; vertical-align: middle; line-height: 24px;');

        let name = jsonResp.gyms[active_gym].name;
        s.setAttribute('style', 'font-weight: bold;');
        s.appendChild(document.createTextNode(name));
        content.appendChild(s);

        let speed = Math.round(jsonResp.gyms[active_gym].speed)/10;
        let strength = Math.round(jsonResp.gyms[active_gym].strength)/10;
        let dexterity = Math.round(jsonResp.gyms[active_gym].dexterity)/10;
        let defense = Math.round(jsonResp.gyms[active_gym].defense)/10;
        let result = ' - Strength: ' + strength + ', Defense: ' + defense + ', Speed: ' + speed + ', Dexterity: ' + dexterity;
        s2.appendChild(document.createTextNode(result));
        content.appendChild(s2);
        observer.observe(targetNode, config);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    var targetNode = document.getElementById('gymroot');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        observer.disconnect();
        buildGymGainsDiv();
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

    GM_addStyle(`
        .xedx_mleft {margin-left: 10px;}
        body.dark-mode .xedx_gg_td {border: 1px solid rgb(91, 91, 91) !important; vertical-align: middle !important; text-align: center; margin-top: 10px;}
        body:not(.dark-mode) .xedx_gg_td {border: 1px solid black !important; vertical-align: middle !important; text-align: center; margin-top: 10px;}
        .xedx-stat-span {width: 40%; text-align: center; color: #DDDDDD;}
    `);

    // This is here as if even with the '!important' keyword, the base <td>
    // color over-rides the specified one. Explicit 'style' does over-ride the base <td>.
    // TBD: just use CSS syntax '.dark-mode', ':not(.dark-mode)' ...
    function modeColor() {
        return darkMode() ? `style="color: rgb(221, 221, 221);"` : `style="color: black;"`;
    }

    const torn_gym_gains_div =
          `<div class="content m-top10 sortable-list ui-sortable" id="xedx-gym-gains-wrap">
            <div class="sortable-box t-blue-cont h" id="xedx-gym-gains-ext0">
                <div class="title main-title title-black top-round" role="table" aria-level="5" id="xedx-gym-gains-hdr-div">
                    <div class="arrow-wrap sortable-list">
                        <a role="button" href="#/" class="accordion-header-arrow right"></a>
                    </div>Gym Gains (detailed)
                </div>
                <div class="bottom-round" style="display: none; overflow: hidden;" id="xedx-gym-gains-body">
                    <div class="cont-gray" style="height: auto;">
                        <ul class="info-cont-wrap" id="gym-gains-list"></ul>
                    </div>
                </div>
            </div>
            <hr class="delimiter-999" style="margin-top: 5px; margin-bottom: 5px;">
            <div class="sortable-box t-blue-cont h" id="xedx-gym-gains-ext2">
                <div class="title main-title title-black border-round" role="table" aria-level="5" id="xedx-bat-stats-hdr-div">
                    <div class="arrow-wrap sortable-list">
                        <a role="button" href="#/" class="accordion-header-arrow right"></a>
                    </div>
                    <div style="width: 720px; display: flex;">
                        <span id="xedx-bat-stats" class="" style="width: 10%;">Battle Stats</span>
                        <span id="xedx-stat-base" class="xedx-stat-span">Base:</span>
                        <span id="xedx-stat-eff" class="xedx-stat-span">Effective:</span>
                    </div>
                </div>
                <div class="bottom-round" style="display: none; overflow: hidden;" id="xedx-bat-stats-body">
                    <div class="cont-gray" style="height: auto;" id="xedx-bat-stats">
                        <table id="xedx-bat-stat-table" style="width: 782px;">
                            <tbody>
                                <tr style="height: 23px;">
                                    <td class="xedx_gg_td xedx_mleft" ` + modeColor() + ` id="row-0-col-0"></td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-0-col-1"><b>Base</b></td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-0-col-2"><b>Base w/Passives</b></td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-0-col-3"><b>Effective</b></td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-0-col-4"><b>Base w/Passives &amp; Vico</b></td>
                                </tr>
                                <tr style="height: 23px;">
                                    <td class="xedx_gg_td xedx_mleft" ` + modeColor() + ` id="row-1-col-0"><b>Strength</b></td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-1-col-1" id="row-1-col-1">0</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-1-col-2" id="row-1-col-2">0 (+0%)</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-1-col-3" id="row-1-col-3">0 (false%)</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-1-col-4" id="row-1-col-4">0 (+25%)</td>
                                </tr>
                                <tr style="height: 23px;">
                                    <td class="xedx_gg_td xedx_mleft" ` + modeColor() + ` id="row-2-col-0"><b>Defense</b></td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-2-col-1" id="row-2-col-1">0</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-2-col-2" id="row-2-col-2">0 (+0%)</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-2-col-3" id="row-2-col-3">0 (false%)</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-2-col-4" id="row-2-col-4">0 (+25%)</td>
                                </tr>
                                <tr style="height: 23px;">
                                    <td class="xedx_gg_td xedx_mleft" ` + modeColor() + ` id="row-3-col-0"><b>Speed</b></td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-3-col-1">0</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-3-col-2">0 (+0%)</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-3-col-3">0 (false%)</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-3-col-4">0 (+25%)</td>
                                </tr>
                                <tr style="height: 23px;">
                                    <td class="xedx_gg_td xedx_mleft" ` + modeColor() + ` id="row-4-col-0"><b>Dexterity</b></td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-4-col-1">0</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-4-col-2">0 (+0%)</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-4-col-3">0 (false%)</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-4-col-4">0 (+25%)</td>
                                </tr>
                                <tr style="height: 23px;">
                                    <td class="xedx_gg_td xedx_mleft" ` + modeColor() + ` id="row-5-col-0"><b>Total</b></td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-5-col-1">0</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-5-col-2">0</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-5-col-3">0</td>
                                    <td class="xedx_gg_td" ` + modeColor() + ` id="row-5-col-4">0
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <hr class="delimiter-999" style="margin-top: 5px; margin-bottom: 5px;">
            <div class="sortable-box t-blue-cont h" id="xedx-gym-gains-ext1">
                <div class="title main-title title-black top-round active" role="table" aria-level="5">Gym Gains (summary)</div>
                <div class="bottom-round" style="display: block; overflow: hidden" id="xedx-summary-body">
                    <div class="cont-gray" style="text-align: center; vertical-align: middle; line-height: 24px;" id="xedx-summary-div">
                        Strength:<span style="color: red; margin: 10px">+0%</span>
                        Defense:<span style="color: red; margin: 10px">+0%</span>
                        Speed:<span style="color: red; margin: 10px">+0%</span>
                        Dexterity:<span style="color: red; margin: 10px">+0%</span>
                    </div>
                    <div class="cont-gray" style="text-align: center; vertical-align: middle; line-height: 24px;" id="xedx-gymsum-contid"></div>
                </div>
            </div>
        </div>`;

})();


