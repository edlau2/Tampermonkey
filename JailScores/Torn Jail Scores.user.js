// ==UserScript==
// @name         Torn Jail Scores
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add 'score' to jailed people list
// @author       xedx [2100735]
// @include      https://www.torn.com/jailview.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function($) {
    'use strict';

    /////////////////////////////////////////////////////////////////////////
    // Helper to parse a time string (33h 14m format), converting to minutes
    /////////////////////////////////////////////////////////////////////////

    function parseJailTimeStr(timeStr) {
        var hour = 0;
        var minute = 0;
        var minuteStart = 0;
        var end = timeStr.indexOf("h");
        if (end != -1) {
            hour = timeStr.slice(0, end);
            minuteStart = end + 2;
        }

        end = timeStr.indexOf("m");
        if (end != -1) {
            minute = timeStr.slice(minuteStart, end);
        }

        var minutes = parseInt(hour) * 60 + parseInt(minute);
        return minutes;
    }

    //////////////////////////////////////////////////////////////////////
    // This adds the 'score' to the level column in the Jail view
    //////////////////////////////////////////////////////////////////////

    function addJailScores() {
        // Get the <UL> and list of <li>'s
        var elemList = document.getElementsByClassName('user-info-list-wrap icons users-list bottom-round');
        var items = elemList[0].getElementsByTagName("li");

        // We seem to be called twice, the first call always has a length of 1.
        // It seems we can ignore this call.
        if (items.length <= 1) {return;}

        for (var i = 0; i < items.length; ++i) {
            // Get the wrapper around the time and level (and reason)
            let wrapper = items[i].getElementsByClassName("info-wrap")[0];
            if (!validPointer(wrapper)) {continue;}

            var timeStr = wrapper.children[0].innerText;
            var lvlStr = wrapper.children[1].innerText;
            if (lvlStr.indexOf("(") != -1) {return;} // Don't do this more than once!

            var minutes = parseJailTimeStr(timeStr);
            var score = minutes * parseInt(lvlStr);

            // Write out the score, append to the level.
            var scoreStr = score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            wrapper.children[1].innerText = lvlStr + " (" + scoreStr + ") ";
         }
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    var targetNode = document.getElementById('mainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        observer.disconnect();
        addJailScores();
        observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

})();

