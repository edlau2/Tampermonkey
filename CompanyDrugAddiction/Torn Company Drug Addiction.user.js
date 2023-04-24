// ==UserScript==
// @name         Torn Company Drug Addiction
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Display your addiction, as seen by company directors, on your home page.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
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

    var userId = 0;
    var addiction = 0;

    var addictionDiv = `<span id="xedx-addiction">Addiction: REPLACE%</span><hr class="delimiter___bIaxE">`;

    function updateUI() {
        let sidebarDiv = $("#sidebarroot");
        if (!sidebarDiv.length) return;

        let energyDiv = $('#barEnergy');
        if (!energyDiv) return;
        let span = addictionDiv.replace("REPLACE", addiction);
        energyDiv.before(span);
        if (Number(addiction) != 0) {
            $("#xedx-addiction").addClass("xedx-red");
        }
    }

    function companyEmployeesCB(responseText, ID, param) {
        var jsonObj = JSON.parse(responseText);
        if (jsonObj) {
            let employees = jsonObj.company_employees;
            if (!employees) {
                log("No employee data found!");
                return;
            }
            let user = employees[userId];
            if (!user) {
                log("No employee data found!");
                return;
            }
            let effectiveness = user.effectiveness;
            if (!effectiveness) {
                log("No employee data found!");
                return;
            }
            let tmp = effectiveness.addiction;
            if (tmp) addiction = tmp;
        }

        updateUI();
    }

    function userIdCallback(userId_) {
        userId = userId_;

        xedx_TornCompanyQuery(null, "employees", companyEmployeesCB);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    GM_addStyle(`.xedx-red {color: red;}`);

    queryUserId(userIdCallback);

})();