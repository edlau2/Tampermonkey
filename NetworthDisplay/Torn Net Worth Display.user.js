// ==UserScript==
// @name         Torn Net Worth Display
// @namespace    http://tampermonkey.net/
// @version      0.7
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

        let display = '$' + numberWithCommas(nw);
        let profileDiv = $('#profileroot').find('div.user-profile');
        let basicInfo = $(profileDiv).find('div.profile-wrapper > div.basic-information');
        var targetNode = document.getElementById('profileroot');
        let ul = $(basicInfo).find('ul.info-table');
        if (!ul.length) {console.log('Target Node (43): ' + targetNode);
            console.trace();
            console.log('Target Node (45): ' + targetNode);
            observer.observe(targetNode, config);
            return;
        }
        let li = '<li id="xedx-networth-li"><div class="user-information-section">' +
            '<span class="bold">Net Worth</span></div>' +
            '<div class="user-info-value"><span>' + display + '</span></div></li>';
        $(ul).append(li);
        console.trace();
        console.log('Target Node (54): ' + targetNode);
    }

    function handlePageLoad() {
        personalStatsQuery(xidFromProfileURL(window.location.href));
    }

    //////////////////////////////////////////////////////////////////////
    // Effectively 'main', where the script starts. Log this event in the
    // console so we know it has started
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();

    // Delay until DOM content load (not full page) complete, so that other scripts run first.
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoaded);
    } else {
        handlePageLoad();
    }

})();
