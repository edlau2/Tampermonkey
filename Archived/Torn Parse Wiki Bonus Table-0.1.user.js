// ==UserScript==
// @name         Torn Parse Wiki Bonus Table
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://wiki.torn.com/wiki/Weapon_Bonus*
// @require https://code.jquery.com/jquery-3.6.0.min.js
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.43.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    function handlePageLoad() {
        let list = $("#tabber-55bcf10792736e9d94e88d1f2ccdd8e6 > div:nth-child(2) > table > tbody > tr > td:nth-child(1)");
        log("List: ", $(list));

        let bonusArr = [];

        for (let idx=0; idx<$(list).length; idx++) {
            let node = $(list)[idx];
            let bonus = $(node).text();
            log("node #", idx, ": ", bonus);
            bonusArr.push(bonus.trim());
        }

        log("bonusArr: ", bonusArr);

    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    //versionCheck();

    callOnContentComplete(handlePageLoad);

})();