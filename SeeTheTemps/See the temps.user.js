// ==UserScript==
// @name         See the temps
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Remove haze around defender to see temps before attack.
// @author       _syntaxera_, inproved by xedx
// @match        https://www.torn.com/loader.php?sid=attack*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    let retries = 0;
    function handlePageLoad()
    {
        let targetNode = $("#defender").find('[class^="modal_"]');
        if (targetNode.length == 0) {
            if (retries++ >= 3) return;
            return setTimeout(handlePageLoad, 100);
        }

        var classList = $(targetNode).attr('class').split(/\s+/);
        $.each(classList, function(index, item) {
            if (item.indexOf('defender__') > -1) {
                addStyle(item);
            }
        });
    }

    function addStyle(className) {
        GM_addStyle ( `.` + className + `{ background:none !important; }}`);
    }


    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    callOnContentLoaded(handlePageLoad);
})();