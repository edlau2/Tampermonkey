// ==UserScript==
// @name         Torn NPC Watcher for Elim
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Notify when multiple attackers start hitting an NPC
// @author       xedx [2100735]
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @match        https://www.torn.com/loader.php?sid=attack&user2ID=4
// @match        https://www.torn.com/loader.php?sid=attack&user2ID=15
// @match        https://www.torn.com/loader.php?sid=attack&user2ID=19
// @match        https://www.torn.com/loader.php?sid=attack&user2ID=20
// @match        https://www.torn.com/loader.php?sid=attack&user2ID=21
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
                   21: 'Tiny',
                  };
    const userName = names[playerID]; // Determine which NPC we are watching

    debugLoggingEnabled = true; // Declared in Torn-JS-Helpers, set to false to suppress debug() statements.

    // Where we actually do stuff.
    function handlePageLoad() {
        let target = document.querySelector("#stats-header > div.titleNumber___2ZLSJ");
        if (!validPointer(target)) {setTimeout(function() {handlePageLoad();}, 1000)};
        document.title = userName + ' | ' + target.innerText;

        if (Number(target.innerText) > maxAttackers) {
            log('Target has hit ' + target.innerText + ' attackers, notifying!');
            GM_notification ( {title: userName + ' is ready!', text: target.innerText + ' user attacking.'} );
            alert(userName + ' is ready to attack!');
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
    if (Document.readyState == 'complete') {
        handlePageLoad();
    } else {
        window.onload = function(e){handlePageLoad();}
    }
})();