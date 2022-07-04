// ==UserScript==
// @name         Torn Company Employees
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Display company employees on job listing
// @author       xedx [2100735]
// @match        https://www.torn.com/joblist.php*
// @connect      api.torn.com
// @require       https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
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

    GM_addStyle(`
        .capacity {display: inline-block; float: right; margin-right: 10px;}
        .capacity-green {display: inline-block; float: right; margin-right: 10px; color: limegreen;}
        `);

    const COMPANY_CACHE = {};

    function getCompanyProfile(e) {
        debug('[getCompanyProfile] hash: ', e.hash);
        let ID = idFromURL(e.hash);
        debug('[getCompanyProfile] ID: ', ID);
        if (!ID) {
            debug('[getCompanyProfile] ID not found!');
            return;
        }
        let parentUL = e.parentNode.parentNode;

        if (COMPANY_CACHE[ID]) {
            debug('[getCompanyProfile] using cached ID: ', COMPANY_CACHE[ID]);
            modifyPageLi(parentUL, COMPANY_CACHE[ID]);
        } else {
            xedx_TornCompanyQuery(ID, 'profile', getCompanyProfileCB, parentUL);
        }
    }

    function getCompanyProfileCB(responseText, ID, parentUL) {
        let _jsonResp = JSON.parse(responseText);
        if (_jsonResp.error) {return handleError(responseText);}
        let company = _jsonResp.company;
        let hired = company.employees_hired;
        let capacity = company.employees_capacity;
        let name = company.name; // Just for logging
        let cacheEntry = {'hired': hired, 'capacity': capacity, 'name': name};

        modifyPageLi(parentUL, cacheEntry);
        COMPANY_CACHE[ID] = cacheEntry;
    }

    function modifyPageLi(parentUL, cacheEntry) {
        let hired = cacheEntry.hired;
        let capacity = cacheEntry.capacity;
        let name = cacheEntry.name;
        let nameLi = $(parentUL).find("li.company.t-overflow")[0];
        if (!$(nameLi).find("li.capacity").length && !$(nameLi).find("li.capacity-green").length) {
            let addlText = ' (' + hired + '/' + capacity + ')';
            $(nameLi).append('<li class="' + (hired < capacity ? 'capacity-green' : 'capacity') +'">' + addlText + '</li>');
        }
    }

    function hashChangeHandler() {
        debug('[getCompanyProfileCB] hashChangeHandler');
        debug('[getCompanyProfileCB] readystate: ', document.readyState);
        setTimeout(handlePageLoad, 1000);
    }

    function handlePageLoad() {
        debug('[getCompanyProfileCB] handlePageLoad');
        let companies = $(".view-icon");
        if (!companies.length) setTimeout(handlePageLoad, 500);
        Array.from(companies).forEach(e => getCompanyProfile(e));
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    installHashChangeHandler(hashChangeHandler);
    callOnContentComplete(handlePageLoad);

})();
