// ==UserScript==
// @name         Torn Net Worth Display
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Add net worth to a user's profile
// @author       xedx
// @include      https://www.torn.com/profiles.php*
// @updateURL    https://github.com/edlau2/Tampermonkey/blob/master/NetWorth/Torn%20Net%20Worth%20Display.user.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function($) {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // UI helpers
    //////////////////////////////////////////////////////////////////////

    function createLI(nw) {
        let display = '$' + numberWithCommas(nw);
        let li = document.createElement('li'); // Main <li>
        li.id = 'xedx-networth-li';

        let div = document.createElement('div'); // First <div>
        div.className = 'user-information-section left width112';

        let span = document.createElement('span'); // Span inside of the <div>
        span.className = 'bold';
        span.innerHTML = 'Net Worth';

        // Put them together
        li.appendChild(div);
        div.appendChild(span);

        let div2 = document.createElement('div');
        let span2 = document.createElement('span');
        span2.innerHTML = display;

        li.appendChild(div2);
        div2.appendChild(span2);

        return li;
    }

    //////////////////////////////////////////////////////////////////////
    // Query functions
    //////////////////////////////////////////////////////////////////////

    function personalStatsQuery(ID) {
        xedx_TornUserQuery(ID, 'personalstats', personalStatsQueryCB);
    }

    // Callback to parse returned JSON
    function personalStatsQueryCB(responseText) {
        let jsonResp = JSON.parse(responseText);

        if (jsonResp.error) {
            return handleError(responseText);
        }

        let stats = jsonResp.personalstats;
        addNetWorthToProfile(stats.networth);
    }

    //////////////////////////////////////////////////////////////////////
    // Main functions that do the real work
    //////////////////////////////////////////////////////////////////////

    function addNetWorthToProfile(nw) {
        if (validPointer(document.getElementById('xedx-networth-li'))) {return;}

        var rootDiv = targetNode.getElementsByClassName('basic-information profile-left-wrapper left')[0];
        var targetUL = rootDiv.getElementsByClassName('basic-list')[0];
        if (!validPointer(targetUL)) {
            return;
        }

        observer.disconnect();
        var li = createLI(nw);
        targetUL.appendChild(li);
        observer.observe(targetNode, config);
    }

    //////////////////////////////////////////////////////////////////////
    // Effectively 'main', where the script starts. Log this event in the
    // console so we know it has started
    //////////////////////////////////////////////////////////////////////

    console.log("Networth Display script started!");

    // Make sure we have an API key
    validateApiKey();

    var targetNode = document.getElementById('profileroot');
    var config = { attributes: true, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        if (validPointer(document.getElementById('xedx-networth-li'))) {return;}
        personalStatsQuery(xidFromProfileURL(window.location.href));

    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

})();