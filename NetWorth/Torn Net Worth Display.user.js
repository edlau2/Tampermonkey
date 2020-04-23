// ==UserScript==
// @name         Torn Net Worth Display
// @namespace    http://tampermonkey.net/
// @version      0.4
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

(function() {
    'use strict';

    // Query functions
    function personalStatsQuery(ID) {
        xedx_TornUserQuery(ID, 'personalstats', personalStatsQueryCB);
    }

    // Callback to parse returned JSON
    function personalStatsQueryCB(responseText) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        addNetWorthToProfile(jsonResp.personalstats.networth);
    }

    // Add the new <li>
    function addNetWorthToProfile(nw) {
        if (validPointer(document.getElementById('xedx-networth-li'))) {return;}
        observer.disconnect();

        let display = '$' + numberWithCommas(nw);
        let profileDiv = $('#profileroot').find('div.user-profile');
        let basicInfo = $(profileDiv).find('div.profile-wrapper > div.basic-information');
        let ul = $(basicInfo).find('ul.basic-list');
        if (!ul.length) {return;}

        let li = '<li id="xedx-networth-li"><div class="user-information-section left width112">' +
            '<span class="bold">Net Worth</span></div><div><span>' + display + '</span></div></li>';
        $(ul).append(li);

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