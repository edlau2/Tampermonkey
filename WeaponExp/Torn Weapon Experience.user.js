// ==UserScript==
// @name         Torn Weapon Experience
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Creates new expandable DIV on Items page with formatted weapons exp displayed
// @author       xedx [2100735]
// @include      https://www.torn.com/item.php
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function($) {
    'use strict';

    // This trigger on the 'items' page. Insert a small div beneath weapons
    // with button to display exp. Make expandable, start collapsed. Need
    // little down arrow things.
    //
    // Have <UL>, each <LI> is a weapon, displaying XP as:
    // ID <name> experience: <XP>

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

    // load jQuery. Currently, this will not load:
    // "refused to load the script because it violates the following content security policy..."
    function loadJQuery() {
        /*
        var script = document.createElement('script');
        script.src = 'https://code.jquery.com/jquery-3.4.1.min.js  unsafe-inline unsafe-eval';
        script.type = 'text/javascript';
        document.getElementsByTagName('head')[0].appendChild(script);

        if (typeof jQuery != 'undefined') {
            // jQuery is loaded => print the version
            console.log('Torn Weapon Experience: jQuery loaded. Version: ' + $().jquery);
        } else {
            console.log('Torn Weapon Experience: jQuery does NOT seem to be loaded!');
        }
        */
    }

    //////////////////////////////////////////////////////////////////////
    // Build the Weapon Experience div, append underneath the
    // Equipped Weapons div
    //////////////////////////////////////////////////////////////////////

    function buildWeaponExpDiv() {
        // Only do this once
        var testDiv = document.getElementById('xedx-weapon-exp');
        if (validPointer(testDiv)) {
            return;
        }

        var parentNode = document.getElementsByClassName("equipped-items-wrap")[0];
        var refDiv = document.getElementById('equipped-armour');
        //var mainDiv = document.getElementById('equipped-weapons');
        //var mainDivs = document.getElementsByClassName('equipped-weapons cont-gray bottom-round disable');
        if (!validPointer(refDiv)) {
            console.log("Torn Weapon Experience: Unable to find refDiv!");
            return;
        }

        // Piece everything together.
        var sep = createSeparator();
        var extDiv = createExtendedDiv();
        var hdrDiv = createHeaderDiv();
        var bodyDiv = createBodyDiv();
        var contentDiv = createContentDiv();
        var ul = createUL();

        //sep.appendChild(extDiv);
        //extDiv.appendChild(hdrDiv);
        hdrDiv.appendChild(document.createTextNode('Weapon Experience'));
        extDiv.appendChild(bodyDiv);
        bodyDiv.appendChild(contentDiv);
        contentDiv.appendChild(ul);

        //mainDiv.appendChild(sep);
        parentNode.insertBefore(hdrDiv, refDiv);
        parentNode.insertBefore(extDiv, refDiv);
        parentNode.insertBefore(sep, refDiv);

        // Populate via the Torn API
        queryWeaponInfo(ul);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Dialog (UI/div) element utility functions
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function createExtendedDiv() {
        var extendedDiv = document.createElement('div');
        //extendedDiv.id = 'xedx-weaponxp-ext';
        //extendedDiv.className = 'sortable-box t-blue-cont h';
        extendedDiv.className = 'xedx-weapon-exp content-gray bottom-round disable';
        return extendedDiv;
    }

    function createHeaderDiv() {
        var headerDiv = document.createElement('div');
        headerDiv.id = 'xedx-weapon-exp';
        headerDiv.className = 'title-black title-toggle';
        headerDiv.setAttribute('role', 'heading');
        headerDiv.setAttribute('aria-level', '5');

        var arrowDiv = createArrowDiv();
        headerDiv.appendChild(arrowDiv);
        return headerDiv;
    }

    function createArrowDiv() {
        var arrowDiv = document.createElement('div');
        //arrowDiv.className = 'arrow-wrap';
        arrowDiv.className = 'arrow-999 right';
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

    // overflow: auto for scrolling?
    function createContentDiv() {
        var contentDiv = document.createElement('div');
        contentDiv.className = 'cont-gray bottom-round';
        //contentDiv.setAttribute('style', 'width: 386px; height: 179px; overflow: auto');
        contentDiv.setAttribute('style', 'height: 174px; overflow: auto');
        return contentDiv;
    }

    function createUL() {
        var ul = document.createElement('ul');
        ul.className = 'list-cont';
        ul.id = 'weapon-xp-list';
        return ul;
    }

    /* Create an <LI> for a single weapon. 'value' is the object
       to parse, for example:
    {
			"itemID": 539,
			"name": "Blood Spattered Sickle",
			"exp": 100
		},
    */
    function createLI(value) {
        // Build the <li>
        var li = document.createElement('li'); // Main <li>x
        li.id = 'xedx-weaponexp-li';
        //li.setAttribute('style', 'border-bottom: 1px gray; height: 15px');
        li.setAttribute('style', 'height: 24px');


        // Create content.
        var span1 = document.createElement('span');
        var span2 = document.createElement('span');
        //var span3 = document.createElement('span');

        var padAttr1 = 'padding-right: 30px';
        if (value.exp < 100) {
            padAttr1 = 'padding-right: 36px';
        }
        if (value.exp < 10) {
            padAttr1 = 'padding-right: 44px';
        }

        var a1 = document.createElement('a');
        a1.setAttribute('style', padAttr1);
        var a2 = document.createElement('a');
        //var a3 = document.createElement('a');

        a1.innerText = value.exp + '%';
        span1.appendChild(a1);
        li.appendChild(span1);

        a2.innerText = value.name + '  (ID=' + value.itemID + ')';
        span2.appendChild(a2);
        li.appendChild(span2);

        /*
        a3.innerText = ' - ' + value.exp + '%';
        span3.appendChild(a3);
        li.appendChild(span3);
        */

        return li;
    }

    function createSeparator() {
        var sepHr = document.createElement('hr');
        sepHr.className = 'delimiter-999 m-top10 m-bottom10';
        return sepHr;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Torn API call and filling the list
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function queryWeaponInfo(ul) {
        GM_xmlhttpRequest ( {
            url: 'https://api.torn.com/user/?selections=weaponexp&key=' + api_key,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                populateExperienceDiv(response.responseText, ul);
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
            var errorText = 'Torn Jail Stats: An error has occurred querying weapon experience information.\n' +
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

    function populateExperienceDiv(responseText, ul) {
        var jsonResp = JSON.parse(responseText);

        if (jsonResp.error) {
            return handleApiError(responseText);
        }

        // Build <LI>'s for each and insert into the <UL>
        var i=0;
        var obj = jsonResp.weaponexp;
        var len = jsonResp.weaponexp.length;
        for (i=0; i<len; i++) {
            var li = createLI(obj[i]);
            if (validPointer(li)) {
                ul.appendChild(li);
            } else {
                // TBD - error handling
            }
        }

        observer.observe(targetNode, config);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    console.log("Torn Weapon Experience script started!");

    // Load/insert jQuery
    loadJQuery();

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
        console.log('Torn Weapon Experience: disconnecting observer');
        observer.disconnect();
        buildWeaponExpDiv();

        //observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    console.log('Torn Weapon Experience: starting observer');
    observer.observe(targetNode, config);
})();