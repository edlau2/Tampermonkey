// ==UserScript==
// @name         Torn NPC Watcher for Elim
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Notify when multiple attackers start hitting an NPC
// @author       xedx [2100735]
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @match        https://www.torn.com/loader.php?sid=attack&user2ID=4
// @match        https://www.torn.com/loader.php?sid=attack&user2ID=15
// @match        https://www.torn.com/loader.php?sid=attack&user2ID=19
// @match        https://www.torn.com/loader.php?sid=attack&user2ID=20
// @match        https://www.torn.com/loader.php?sid=attack&user2ID=10
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    const maxAttackers = 10; // When to notify, when attackers > this number
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const playerID = urlParams.get('user2ID');
    const names = {4: 'Duke',
                   15: 'Leslie',
                   19: 'Jimmy',
                   20: 'Fernando',
                   10: 'Tiny',
                  };
    const userName = names[playerID]; // Determine which NPC we are watching

    debugLoggingEnabled = true; // Declared in Torn-JS-Helpers, set to false to suppress debug() statements.

    // Where we actually do stuff.
    function handlePageLoad() {
        let target = document.querySelector("#stats-header > div.titleNumber___2ZLSJ");
        if (!validPointer(target)) {setTimeout(function() {handlePageLoaded();}, 1000)};

        if (Number(target.innerText) > maxAttackers) {
            log('Target has hit ' + target.innerText + ' attackers, notifying!');
            GM_notification ( {title: userName + ' is ready!', text: target.innerText + ' user attacking.'} );
        } else {
            debug('Checking target, ' + target.innerText + ' attackers.');
            setTimeout(function() {handlePageLoad();}, 20000); // Come back in 20 secs
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    log('Tracking ' + userName);
    window.onload = function(e){handlePageLoad();}
})();