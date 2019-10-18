// ==UserScript==
// @name         Torn Net Worth Display
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add net worth to a user's profile
// @author       xedx
// @include      https://www.torn.com/profiles.php*
// @connect      api.torn.com
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
    // UI helpers
    //////////////////////////////////////////////////////////////////////

    /* Will add a custom ID to the <li> to see if it already exists
        <li>
            <div class="user-information-section left width112">
                <span class="bold>Net Worth</span>
            </div>
            <div>
                <span>[value goes here]</span>
            </div>
        </li>
    */
    function createLI(nw) {
        // Create the value we want to display
        var display = '$' + numberWithCommas(nw);

        // Build the <li>
        var li = document.createElement('li'); // Main <li>
        li.id = 'xedx-networth-li';

        var div = document.createElement('div'); // First <div>
        div.className = 'user-information-section left width112';

        var span = document.createElement('span'); // Span inside of the <div>
        span.className = 'bold';
        span.innerHTML = 'Net Worth';

        // Put them together
        li.appendChild(div);
        div.appendChild(span);

        var div2 = document.createElement('div');
        var span2 = document.createElement('span');
        span2.innerHTML = display;

        li.appendChild(div2);
        div2.appendChild(span2);

        return li;
    }

    //////////////////////////////////////////////////////////////////////
    // Query functions
    //////////////////////////////////////////////////////////////////////

    function personalStatsQuery(ID) {
        var details = GM_xmlhttpRequest({
            method:"POST",
            url:"https://api.torn.com/user/" + ID + "?selections=personalstats&key=" + api_key,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                personalStatsQueryCB(response.responseText);
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

    // Callback to parse returned JSON
    function personalStatsQueryCB(responseText) {
        var jsonResp = JSON.parse(responseText);

        if (jsonResp.error) {
            return handleError(responseText);
        }

        var stats = jsonResp.personalstats;

        console.log("Got Net Worth: $" + numberWithCommas(stats.networth));

        globalNW = stats.networth; // Set the global, as returning a value from a callback makes no sense.

        // Insert into the page
        addNetWorthToProfile();
    }

   //////////////////////////////////////////////////////////////////////
    // Very simple error handler; only displayed (and logged) once
    //////////////////////////////////////////////////////////////////////

    // TBD: Change this to a self-closing message.
    var errorLogged = false;
    function handleError(responseText) {
        if (!errorLogged) {
            var jsonResp = JSON.parse(responseText);
            var errorText = 'Torn Net Worth Display: An error has occurred querying personal stats information.\n' +
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
    // Main functions that do the real work
    //////////////////////////////////////////////////////////////////////

    // The URL s the form "https://www.torn.com/profiles.php?XID=1162022#/"
    // We ned the XID
    function parseURL(URL) {
        var n = URL.indexOf('='); // Find the '=' sign
        var n2 = URL.indexOf('#'); // Find the '#' sign
        var ID = URL.slice(n+1, n2); // Extract just the ID from the URL, between the '=' and '#'
        return ID;
    }

    function queryPersonalStatsNW(ID) {
        personalStatsQuery(ID); // Callback from this will set our global networth variable
    }

    function addNetWorthToProfile() {

        // Only do this once
        var testDiv = document.getElementById('xedx-networth-li');
        if (validPointer(testDiv)) {
            return;
        }

        // Underneath 'targetNode', find class 'basic-list' (a UL)

        // Whole profile info section, left side
        var rootDiv = targetNode.getElementsByClassName('basic-information profile-left-wrapper left')[0];

        // Actual UL we need. Will fail if not yet loaded. Don't worry, we'll get called again later.
        var targetUL = rootDiv.getElementsByClassName('basic-list')[0];
        if (!validPointer(targetUL)) {
            return;
        }

        // Create an LI, mirroring th othe LI's in that list
        var li = createLI(globalNW);

        // Append to end of list and we're done.
        if (globalNW != 0) {
            targetUL.appendChild(li);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Effectively 'main', where the script starts. Log this event in the
    // console so we know it has started
    //////////////////////////////////////////////////////////////////////

    console.log("Networth Display script started!");

    // Make sure we have an API key
    var api_key = GM_getValue('gm_api_key');
    if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
        api_key = prompt("Please enter your API key.\n" +
                         "Your key will be saved locally so you won't have to be asked again.\n" +
                         "Your key is kept private and not shared with anyone.", "");
        GM_setValue('gm_api_key', api_key);
    }

    // Main conatainer for all the other DOM, loaded first so should be available.
    // Well, sort, it's a div underneat maincontainer but should still be there
    var targetNode = document.getElementById('profileroot');
    var config = { attributes: true, childList: true, subtree: true };
    var globalNW = 0; // Global to hold the result of the querie's callback

    var callback = function(mutationsList, observer) {
        // This is where all the work is done
        // Turn OFF the observer, otherwise we'll be triggered here when we edit the page.
        observer.disconnect();

        // Since when we call addNetWorthToProfile(), the section may not have loaded yet -
        // if not, no need to do these again, so just do once - if not loaded, that function
        // just returns and as things load, the observer will be called again.
        if (!globalNW) {
            // First, get the player's ID by parsing the URL, which is window.location.href
            var ID = parseURL(window.location.href);
            console.log("Got ID: " + ID);

            // Next, query the Torn API (personalstats) and get networth
            queryPersonalStatsNW(ID);
        }

        // Finally, insert into the page (now done from the callback)
        //addNetWorthToProfile();

        // We can re-connect our observer now.
        observer.observe(targetNode, config);

    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

})();