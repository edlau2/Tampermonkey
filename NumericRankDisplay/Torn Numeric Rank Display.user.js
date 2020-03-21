// ==UserScript==
// @name         Torn Numeric Rank Display
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Appends the numeric rank to a user's profile rank name
// @author       xedx [2100735]
// @updateURL    https://github.com/edlau2/Tampermonkey/blob/master/NumericRankDisplay/Torn%20Numeric%20Rank%20Display.user.js
// @include      https://www.torn.com/profiles.php*
// @grant        none
// ==/UserScript==

(function($) {
    'use strict';

    //
    // We need class length, I know of 'medium' and 'long'.
    // For 'Professional', for example, we need to go from
    // 'medium' to 'long' to get it to fit. 'Star', however,
    // can remain at 'medium'. 'Highly distinguished' does
    // not fit into 'long', I don't know if there is anything
    // beyond 'long', so for really long ranks, I truncate.
    // This is set up so any attribute could be set, not only
    // 'class' but perhaps 'font-size' instead.
    //
    // ['str-to-match', 'str-to-replace-with', 'attr', 'attr-value']
    //
    var ranks = [['Absolute beginner', 'Absolute noob', 'class', 'long'],
                 ['Beginner', 'Beginner', 'class','medium'],
                 ['Inexperienced', 'Inexperienced', 'class', 'long'],
                 ['Rookie', 'Rookie', 'class','medium'],
                 ['Novice', 'Novice', 'class','medium'],
                 ['Below average', 'Below average', 'class', 'long'],
                 ['Average', 'Average', 'class','medium'],
                 ['Reasonable', 'Reasonable', 'class', 'long'],
                 ['Above average', 'Above average', 'class', 'long'],
                 ['Competent', 'Competent', 'class','medium'],
                 ['Highly competent', 'Highly comp.', 'class', 'long'],
                 ['Veteran', 'Veteran', 'class','medium'],
                 ['Distinguished', 'Distinguished', 'class', 'long'],
                 ['Highly distinguished', 'Highly dist.', 'class', 'long'],
                 ['Professional', 'Professional', 'class', 'long'],
                 ['Star', 'Star', 'class','medium'],
                 ['Master', 'Master', 'class','medium'],
                 ['Outstanding', 'Outstanding', 'class', 'long'],
                 ['Celebrity', 'Celebrity', 'class', 'medium'],
                 ['Supreme', 'Supreme', 'class','medium'],
                 ['Idolized', 'Idolized', 'class','medium'],
                 ['Champion', 'Champion', 'class','medium'],
                 ['Heroic', 'Heroic', 'class','medium'],
                 ['Legendary', 'Legendary', 'class', 'long'],
                 ['Elite', 'Elite', 'class','medium'],
                 ['Invincible', 'Invincible', 'class', 'long']];

    function addNumericRank() {
        var elemList = document.getElementsByClassName('two-row');
        var element = elemList[0];
        if (element == 'undefined' || typeof element == 'undefined') {
            return;
        }
        var rank = element.firstChild;
        var html = rank.innerHTML;
        for (var i = 0; i < ranks.length; i++) {
            if (html == ranks[i][0]) {
                while(rank.attributes.length > 0) {
                    rank.removeAttribute(rank.attributes[0].name);
                }
                rank.setAttribute(ranks[i][2], ranks[i][3]);
                rank.innerHTML = ranks[i][1] + ' (' + (i+1) +')';
                return;
            }
        }
    }

    //////////////////////////////////////////////////////////////////
    // Main. Using a MutationObserver allows us to be notified
    // whenever the root of the 'User Profile' section (the
    // <div id="profileroot"> section) changes/updates. It is
    // probably over-aggressive to trigger on all 3 actions...
    //////////////////////////////////////////////////////////////////

    console.log("Numeric Rank Display script started!");

    var targetNode = document.getElementById('profileroot');
    var config = { attributes: true, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        addNumericRank();
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

})();