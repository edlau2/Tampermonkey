// ==UserScript==
// @name         Torn Gym Gains
// @namespace    http://tampermonkey.net/
// @version      0.2
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

    //////////////////////////////////////////////////////////////////////
    // Build the Gym Gains div, append above the 'gymroot' div
    //////////////////////////////////////////////////////////////////////

    function buildGymGainsDiv() {
        // Only do this once
        var testDiv = document.getElementById('xedx-gym-gains-wrap');
        if (validPointer(testDiv)) {
            observer.disconnect();
            window.setTimeout(queryGymInfo, 2000);
            return;
        }

        var tutorialNode = document.getElementsByClassName("tutorial-cont m-top10")[0];
        var parentNode = document.getElementsByClassName("content-wrapper m-left20 left winter")[0];
        var refDiv = document.getElementById('gymroot');
        if (!validPointer(refDiv) || !validPointer(parentNode)) {
            console.log("Torn Gym Gains: Unable to find refDiv/parentNode!");
            return;
        }

        // Piece everything together.
        var wrapperDiv = createWrapperDiv();

        var extDiv0 = createExtendedDiv();// Details
        extDiv0.id = 'xedx-gym-gains-ext0';

        var extDiv1 = createExtendedDiv(); // Summary
        extDiv1.id = 'xedx-gym-gains-ext1';

        var hdrDiv0 = createHeaderDiv();
        var arrowDiv = createArrowDiv();
        hdrDiv0.appendChild(arrowDiv);
        hdrDiv0.appendChild(document.createTextNode('Gym Gains (detailed)'));

        var hdrDiv1 = createHeaderDiv();
        hdrDiv1.className = 'title main-title title-black top-round active';
        hdrDiv1.appendChild(document.createTextNode('Gym Gains (summary)'));

        var bodyDiv0 = createBodyDiv();
        var contentDiv0 = createContentDiv();
        var ul = createUL();

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

        wrapperDiv.appendChild(extDiv1);
        extDiv1.appendChild(hdrDiv1);
        extDiv1.appendChild(bodyDiv1);
        bodyDiv1.appendChild(contentDiv1);
        wrapperDiv.insertBefore(createSmallSeparator(), extDiv1);

        parentNode.insertBefore(wrapperDiv, refDiv);
        parentNode.insertBefore(createSeparator(), refDiv);

        // Populate via the Torn API
        queryPerkInfo(ul);

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
        headerDiv.id = 'xedx-gym-gains-hdr-div';
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

    function createArrowDiv() {
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
            var content = document.getElementById('xedx-gym-gains-body');
            var headerDiv = document.getElementById('xedx-gym-gains-hdr-div');
            if (content.style.display === "block") {
                content.style.display = "none";
                headerDiv.className = 'title main-title title-black border-round';
            } else {
                content.style.display = "block";
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
        bodyDiv.id = 'xedx-gym-gains-body';
        return bodyDiv;
    }

    // overflow: auto for scrolling?
    function createContentDiv() {
        var contentDiv = document.createElement('div');
        contentDiv.className = 'cont-gray'; // bottom-round';
        contentDiv.setAttribute('style', 'height: auto; ); //overflow: auto');
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
                var at = 0, gymGains = arr[j].toLowerCase().indexOf('gym gains');
                if (gymGains != -1) {
                    var li = document.createElement('li'); // Create <li> for this category
                    li.appendChild(createDividerSpan(categoryName[i]));
                    li.appendChild(createValueSpan(arr[j]));
                    ul.appendChild(li);

                    // Parse % and add to app. type: speed, str, dex, def.
                    // If not specific, adds to all.
                    if ((at = arr[j].toLowerCase().indexOf('speed')) != -1) {
                        speedPct += Number(arr[j].slice(2, at-2));
                    } else if ((at = arr[j].toLowerCase().indexOf('strength')) != -1) {
                        strengthPct += Number(arr[j].slice(2, at-2));
                    } else if ((at = arr[j].toLowerCase().indexOf('defense')) != -1) {
                        defPct += Number(arr[j].slice(2, at-2));
                    } else if ((at = arr[j].toLowerCase().indexOf('dexterity')) != -1) {
                        dexPct += Number(arr[j].slice(2, at-2));
                    } else {
                        strengthPct = defPct = speedPct = dexPct += Number(arr[j].slice(2, gymGains-2));
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