// ==UserScript==
// @name         Torn Fac Travel Icons
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Indicate where people flying/abroad are at or going to.
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php?step=profile&ID=*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    // Uses the description from User->basic, status.description
    function getCountryFromStatus(desc) {
        if (desc.indexOf("United Kingdom") > -1) return 'UK';
        if (desc.indexOf("Mexico") > -1) return 'Mexico';
        if (desc.indexOf("Argentina") > -1) return 'Argentina';
        if (desc.indexOf("Canada") > -1) return 'Canada';
        if (desc.indexOf("Cayman") > -1) return 'Caymans';
        if (desc.indexOf("Switzerland") > -1) return 'Zurich';
        if (desc.indexOf("Japan") > -1) return 'Japan';
        if (desc.indexOf("China") > -1) return 'China';
        if (desc.indexOf("UAE") > -1) return 'UAE'; // ???
        if (desc.indexOf("Arab") > -1) return 'UAE'; // ???
        if (desc.indexOf("South") > -1) return 'SA'; // ??
        if (desc.indexOf("Africa") > -1) return 'SA'; // ??
        if (desc.indexOf("Hawaii") > -1) return 'Hawaii';

        return null;
    }

    // Images for country flags
    function getAbroadFlag(country) {
        if (country == 'UK') {
            return `<li style=margin-bottom: 0px;"><img class="flag selected" src="/images/v2/travel_agency/flags/fl_uk.svg"
                country="united_kingdom" alt="United Kingdom" title="United Kingdom"></li>`;
        }
        if (country == 'Mexico') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_mexico.svg"
                country="mexico" alt="Mexico" title="Mexico"></li>`;
        }
        if (country == 'Canada') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_canada.svg"
                country="canada" alt="Canada" title="Canada"></li>`;
        }
        if (country == 'Argentina') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_argentina.svg"
                country="argentina" alt="Argentina" title="Argentina"></li>`;
        }
        if (country == 'Hawaii') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_hawaii.svg"
                country="hawaii" alt="Hawaii" title="Hawaii"></li>`;
        }
        if (country == 'Caymans') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_cayman.svg"
                country="cayman_islands" alt="Cayman Islands" title="Cayman Islands"></li>`;
        }
        if (country == 'Zurich') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_switzerland.svg"
                country="switzerland" alt="Switzerland" title="Switzerland"></li>`;
        }
        if (country == 'Japan') {
            return `<li style=margin-bottom: 0px;"><img class="flag selected" src="/images/v2/travel_agency/flags/fl_japan.svg"
                country="japan" alt="Japan" title="Japan"></li>`;
        }
        if (country == 'China') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_china.svg"
                country="china" alt="China" title="China"></li>`;
        }
        if (country == 'UAE') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_uae.svg"
                country="uae" alt="UAE" title="UAE"></li>`;
        }
        if (country == 'SA') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_south_africa.svg"
                country="south_africa" alt="South Africa" title="South Africa"></li>`;
        }
    }

    function userBasicQueryCallback(responseText, id, iconLi) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            log('Error: ' + JSON.stringify(jsonResp.error));
            //if (recoverableErrors.includes(jsonResp.error.code)) { // Recoverable - pause for now.
            //    pauseRequests(15); // Pause for 15 secs
            //    queryQueue.push(msg);
            //}
            return handleError(responseText);
        }

        let desc = jsonResp.status.description;
        let country = getCountryFromStatus(desc);
        //log("Got ", country, " for ID ", id);
        if (country) $(iconLi).replaceWith($(getAbroadFlag(country)));
    }

    function handlePageLoad() {
        let travelIcons = document.querySelectorAll("[id^='icon71___']");
        log("Found ", $(travelIcons).length,  " people abroad");

        // Now back up the DOM tree to get to ID, and get basic stats
        for (let i=0; i < $(travelIcons).length; i++) {
            let iconLi = $(travelIcons)[i];

            let memberRow = $(iconLi).closest("li.table-row");
            if (!memberRow) {log("no memberRow!"); continue;}

            let honorWrap = $(memberRow).find("[class^='honorWrap'] > a");
            if (!honorWrap) {log("no honorWrap!"); continue;}

            let fullId = $(honorWrap).prop("href");
            if (!fullId) {log("no fullId!"); continue;}

            let id = fullId.match(/\d+/)[0];
            xedx_TornUserQuery(id, "basic", userBasicQueryCallback, iconLi);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    callOnContentComplete(handlePageLoad);

})();