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

    /*
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

        var div = document.reateElement('div'); // First <div>
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
        globalNW = stats.networth; // Set the global, as returning a value from a callback makes no sense.


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
        var ID = URL.slice(n, n2); // Extract just the ID from the URL, between the '=' and '#'
        return ID;
    }

    function queryPersonalStatsNW(ID) {
        personalStatsQuery(ID); // Callback from this will set our global networth variable
    }

    function addNetWorthToProfile(nw) {
        // Underneath 'targetNode', find class 'basic-list' (a UL)
        var targetUL = targetNode.findElementByClassName('basic-list');
        // Create an LI, mirroring th othe LI's in that list (will be a UI helper fn, createLI())
        var li = createLI(nw);
        // Append to end of list and we're done.
        targetUL.appendChild(li);
    }

    //////////////////////////////////////////////////////////////////////
    // Effectively 'main', where the script starts. Log this event in the
    // console so we know it has started
    //////////////////////////////////////////////////////////////////////

    console.log("Networth Display script started!");

    // Our target node is more effectively "basic-information profile-left-wrapper left"
    // That's the class name of the profile stats section on a profile page.
    // I got that from the inspector in Chrome. It's a global
    var targetNode = document.getElementByClassName('basic-information profile-left-wrapper left');
    var config = { attributes: true, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        // This is where all the work is done
        //
        // First, get the player's ID by parsing the URL, which is window.location.href
        var ID = parseURL(window.location.href);

        // Next, query the Torn API (personalstats) and get networth
        var globalNW = 0; // Global to hold the result of the querie's callback
        queryPersonalStatsNW(ID);

        // Finally, insert into the page
        addNetWorthToProfile(nw);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

})();