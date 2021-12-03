// ==UserScript==
// @name         Torn Gym Gains
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Creates new expandable DIVs on Gym page with gym gains, perks and bat stats displayed
// @author       xedx [2100735]
// @include      https://www.torn.com/gym.php
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/GymGains/Torn-Gym-Gains-Div.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/GymGains/Torn%20Gym%20Gains.user.js
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

var DEV_MODE = false;

(function() {
    'use strict';

    let wrapperDiv = torn_gym_gains_div; // Pulled from the include, 'Torn-Gym-Gains-Div.js'

    //////////////////////////////////////////////////////////////////////
    // Build the Gym Gains div, append above the 'gymroot' div
    //////////////////////////////////////////////////////////////////////

    function buildGymGainsDiv() {
        let testDiv = document.getElementById('xedx-gym-gains-wrap');
        if (validPointer(testDiv)) {return;} // Only do this once

        let refDiv = document.getElementById('gymroot');
        if (!validPointer(refDiv)) {return;}

        $(wrapperDiv).insertBefore(refDiv);

        // Populate perk info/gym gain info via the Torn API
        doUserQuery();
        addOnClickHandlers();

        var add_minutes =  function (dt, minutes) {
            return new Date(dt.getTime() + minutes*60000);
        }

        var now = function () {
            return new Date().toString();
        }

        if (true) { // DEV_MODE: Spy on available e
            /*
            let newDiv = '<div class="cont-gray" style="text-align: center; vertical-align: middle; line-height: 24px;" id="xedx-chk-div" >' +
                '<span id="xedx-chk-span"><input type="checkbox" id="xedx-chk"><B> Dev Mode</B></span></div>';
            $('#xedx-summary-body').append(newDiv);
            */

            var currTimeout = null;
            var barEnergy = document.getElementById('barEnergy');
            var dexBtn = document.querySelector("#gymroot > div.gym___3whZp > div.gymContentWrapper___2DeUj > div " +
                                             "> ul > li.dexterity___1YdUM > div.propertyContent___1hg0- > div:nth-child(2) > button");
            if (barEnergy == null) {return;}
            var eConfig = { attributes: true, childList: true, subtree: true };
            let eCallback = function(mutationsList, eObserver) {
                eObserver.disconnect();
                if (!DEV_MODE) {
                    console.log(GM_info.script.name + ': DEV_MODE off, returning.');
                    return;
                }
                let value = document.querySelector("#barEnergy > div.bar-stats___7G40O > p.bar-value___10oCu").innerText;
                let numE = parseInt(value.slice(0, value.indexOf('/')));
                console.log(now() + ': Energy is at: ' + numE);
                //if (numE > 0 && (numE % 25) == 0) {
                if (numE >= 25) {
                    console.log(now() + ': Going for more dex (in 5 secs)!');
                    currTimeout = setTimeout(function() {
                        dexBtn = document.querySelector("#gymroot > div.gym___3whZp > div.gymContentWrapper___2DeUj > div >" +
                                               "ul > li.dexterity___1YdUM > div.propertyContent___1hg0- > div:nth-child(2) > button")
                        console.log('Clicking.');
                        dexBtn.click();
                    }, 5000); // Time to cancel...
                }

                // Turn back on in 3 mins. In reality, make 60 minutes, if not more.
                // 5 e every 10 minutes, so 25 in 50, full in 18,000 secs
                let time = 60 * 60 * 1000; // mins * secs/min * 1000 ms/sec
                currTimeout = setTimeout(function() {eObserver.observe(barEnergy, eConfig);}, time);
                console.log('setTimeout for: ' + add_minutes(new Date(), 60).toString());
            };
            var eObserver = new MutationObserver(eCallback);
            eObserver.observe(barEnergy, eConfig);

            if (darkMode()) {
                let table = document.querySelector("#xedx-bat-stat-table");
                let border = '1px solid rgb(91, 91, 91)'; // #5B5B5B
                let tds = table.getElementsByTagName('td');
                for (let i = 0; i < tds.length; i++) {
                        tds[i].style.borderBottom = border;
                        tds[i].style.borderTop = border;
                        tds[i].style.borderLeft = border;
                        tds[i].style.borderRight = border;
                        tds[i].style.color = '#FFFFFF';
                };
            }

            $('#xedx-chk').click(function(){
                console.log('Setting DEV_MODE to ', $('#xedx-chk').prop("checked"));
                DEV_MODE = ($('#xedx-chk').prop("checked") == true);
                if (DEV_MODE) {
                    console.log('Turning on e-observer');
                    eObserver.observe(barEnergy, eConfig);
                } else {
                    if (currTimeout) {
                        console.log('Cancelling running timeout.');
                        clearTimeout(currTimeout);
                        currTimeout = null;
                    }
                    console.log('Turning off e-observer');
                    eObserver.disconnect();
                }
            });
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Function to add onClick() handlers
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function addOnClickHandlers() {
        let gymDiv = document.getElementById('gymroot');
        // Replace these with jquery, get rid of in helper lib
        let rootDiv = myGetElementsByClassName2(gymDiv, 'gymList')[0];
        let buttonDivs = myGetElementsByClassName2(rootDiv, 'gymButton');

        for (let i=0; i < buttonDivs.length; i++) {
            buttonDivs[i].addEventListener("click", onGymClick, false);
        }

        let idArray = [{'bodyId': 'xedx-gym-gains-body', 'hdrId': 'xedx-gym-gains-hdr-div'},
                       {'bodyId': 'xedx-bat-stats-body', 'hdrId': 'xedx-bat-stats-hdr-div'}];
        for (let i=0; i < idArray.length; i++) {
            const bodyDiv = document.getElementById(idArray[i].bodyId);
            const headerDiv = document.getElementById(idArray[i].hdrId);
            const arrowDiv = headerDiv.parentElement;

            arrowDiv.addEventListener("click", function() {
                if (bodyDiv.style.display === "block") {
                    bodyDiv.style.display = "none";
                    headerDiv.className = 'title main-title title-black border-round';
                } else {
                    bodyDiv.style.display = "block";
                    headerDiv.className = 'title main-title title-black top-round active';
                    if (headerDiv.id == 'xedx-bat-stats-hdr-div') {
                        //queryBatStats();
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

        // I don't feel like editing the bat stats div RN, so
        // add a margin with code, instead.
        document.querySelector('#row-1-col-0 > b').setAttribute('style', 'margin-left: 10px;');
        document.querySelector('#row-2-col-0 > b').setAttribute('style', 'margin-left: 10px;');
        document.querySelector('#row-3-col-0 > b').setAttribute('style', 'margin-left: 10px;');
        document.querySelector('#row-4-col-0 > b').setAttribute('style', 'margin-left: 10px;');
        document.querySelector('#row-5-col-0 > b').setAttribute('style', 'margin-left: 10px;');

        fillBaseBatStats(jsonResp);
        fillBaseWithPassives(jsonResp);
        fillCurrentEffectiveBatStats(jsonResp);
        fillBaseWithPassivesAndVico(jsonResp);
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
    }

    function fillCurrentEffectiveBatStats(jsonResp) {
        let strMod = jsonResp.strength_modifier;
        let defMod = jsonResp.defense_modifier;
        let speMod = jsonResp.speed_modifier;
        let dexMod = jsonResp.dexterity_modifier;
        let strTot = Number(jsonResp.strength) + (jsonResp.strength * strMod/100);
        document.getElementById('row-1-col-3').innerHTML = numberWithCommas(Math.round(strTot)) +
            ' (' + ((strMod > 0) ? '+' : '') + strMod + '%)';
        let defTot = Number(jsonResp.defense) + (jsonResp.defense * defMod/100);
        document.getElementById('row-2-col-3').innerHTML = numberWithCommas(Math.round(defTot)) +
            ' (' + ((defMod > 0) ? '+' : '') + defMod + '%)';
        let speedTot = Number(jsonResp.speed) + (jsonResp.speed * speMod/100);
        document.getElementById('row-3-col-3').innerHTML = numberWithCommas(Math.round(speedTot)) +
            ' (' + ((speMod > 0) ? '+' : '') + speMod + '%)';
        let dexTot = Number(jsonResp.dexterity) + (jsonResp.dexterity * dexMod/100);
        document.getElementById('row-4-col-3').innerHTML = numberWithCommas(Math.round(dexTot)) +
            ' (' + ((dexMod > 0) ? '+' : '') + dexMod + '%)';
        let total = strTot + defTot + speedTot + dexTot;
        document.getElementById('row-5-col-3').innerHTML = numberWithCommas(Math.round(total));
    }

    function fillBaseWithPassivesAndVico(jsonResp) {
        let strMod = getPassives(jsonResp, 'strength') + 25;
        let speMod = getPassives(jsonResp, 'speed') + 25;
        let defMod = getPassives(jsonResp, 'defense') + 25;
        let dexMod = getPassives(jsonResp, 'dexterity') + 25;

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

    // These two func over-ride those in the helper lib (?)
    // Either fix in helper lib, or make more general...
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

    // This should be in utilities - put it here for now.
    function handlepiError(text) {
        log('Error: ' + text);
    }

    function populateGymGainsDiv(responseText, id=null, unused=null) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleApiError(responseText);}

        const ul = document.getElementById('gym-gains-list');
        resetGains(ul);
        const category = ['property_perks', 'education_perks', 'company_perks', 'faction_perks', 'book_perks'];
        const categoryName = ['Property Perks', 'Education Perks', 'Company Perks', 'Faction Perks', 'Book Perks'];
        for (let i=0; i<category.length; i++) { // Iterate object's arrays
            let arr = jsonResp[category[i]];
            for (let j=0; j<arr.length; j++) {  // Iterate category array
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

        darkModeFixup();
    }

    // Fixup for other stuff in Dark Mode
    var retries = 0;
    function darkModeFixup() {
       if (darkMode()) {
           log('Fixing up for Dark Mode.');
           let gainsMsg1 = document.querySelector("#xgr_msg1");
           let gainsMsg2 = document.querySelector("#xgr_msg2");
           console.log('Special Gym Requirements: ', gainsMsg1, gainsMsg2);
           if ((!gainsMsg1 || !gainsMsg2) && retries++ < 10) return setTimeout(darkModeFixup, 100);
           if (gainsMsg1) gainsMsg1.setAttribute('style', 'color:black;');
           if (gainsMsg2) gainsMsg2.setAttribute('style', 'color:black;');
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

    var targetNode = document.getElementById('gymroot');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        observer.disconnect();
        buildGymGainsDiv();
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
})();


