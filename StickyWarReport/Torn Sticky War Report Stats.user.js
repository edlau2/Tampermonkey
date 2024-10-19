// ==UserScript==
// @name         Torn Sticky War Report Stats
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Make header sticky on war report
// @author       xedx [2100735]
// @match        https://www.torn.com/war.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
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

    function handlePageLoad(retries=0) {
        let target = $(".report-members-stats-content")[0];
        if(!$(target).length) {
            if (retries++ < 10) return setTimeout(handlePageLoad, 250);
                log("Too many attempts...");
            } else {
                $(target).css("max-height", "90vh"); // bottom margin for TTS footer.
                $(target).css("overflow-y", "auto");
                $(target).css("top", "0px");
                $(target).css("position", "sticky");
                let hdrs = $("ul.report-stats-titles").css({"position": "sticky", "top": 0});
            }
    }

    logScriptStart();
    callOnContentComplete(handlePageLoad);

})();