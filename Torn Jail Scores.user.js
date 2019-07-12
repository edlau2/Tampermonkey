// ==UserScript==
// @name         Torn Jail Scores
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add 'score' to jailed people list
// @author       xedx [2100735]
// @include      https://www.torn.com/jailview.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function($) {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // Helper to parse a time string, converting to minutes
    //////////////////////////////////////////////////////////////////////

    function parseTimeStr(timeStr) {
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
        var items;
        try {
            items = elemList[0].getElementsByTagName("li")
        } catch(err) {
            return;
        }

        // We seem to be called twice, the first call always has a length of 1.
        // It seems we can ignore this call.
        if (items.length <= 1) {
            return;
        }

        // Disconnect the observer, so we don't trigger a callback while we are writing out new text
        // Will be reconnected after we return from this call.
        observer.disconnect();

        var wrapperList;
        var wrapper;

        for (var i = 0; i < items.length; ++i) {
            // Get the wrapper around the time and level (and reason)
            try {
                    wrapperList = items[i].getElementsByClassName("info-wrap");
                    wrapper = wrapperList[0];
                } catch(err) {
                    return;
                }

            if (wrapper == null || wrapper == 'undefined' || typeof wrapper === 'undefined') {
                continue;
            }

            var timeStr = wrapper.children[0].innerText;
            var lvlStr = wrapper.children[1].innerText;

            // Don't do this more than once!
            if (lvlStr.indexOf("(") != -1) {
                return;
            }

            var minutes = parseTimeStr(timeStr);
            var score = minutes * parseInt(lvlStr);

            // Write out the score, append to the level.
            var scoreStr = score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            wrapper.children[1].innerText = lvlStr + " (" + scoreStr + ") ";
         }
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the
    //////////////////////////////////////////////////////////////////////

    console.log("Torn Jail Scores script started!");

    // Make sure we have an API key
    var api_key = GM_getValue('gm_api_key');
    if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
        api_key = prompt("Please enter your API key.\n" +
                         "Your key will be saved locally so you won't have to be asked again.\n" +
                         "Your key is kept private and not shared with anyone.", "");
        GM_setValue('gm_api_key', api_key);
    }

    var targetNode = document.getElementById('mainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        addJailScores();

        // Re-connect the observer (disconnected when editing in addJailScores())
        observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
})();