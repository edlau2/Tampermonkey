// ==UserScript==
// @name         Torn NPC Cycler for Elim
// @namespace    http://tampermonkey.net/
// @version      0.1
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

    const baseNPCUrl = 'https://www.torn.com/loader.php?sid=attack&user2ID=';
    const maxAttackers = 10; // When to notify, when attackers > this number
    const names = {4: 'Duke',
                   15: 'Leslie',
                   19: 'Jimmy',
                   20: 'Fernando',
                   21: 'Tiny',
                  };

    var queryString = window.location.search;
    var urlParams = new URLSearchParams(queryString);
    var playerID = urlParams.get('user2ID');
    var userName = names[playerID];
    const delaySecs = 10;

    debugLoggingEnabled = true; // Declared in Torn-JS-Helpers, set to false to suppress debug() statements.
    var notificationsDisabled = false; // true if we need to stop notifying

    // Where we actually do stuff.
    function handlePageLoad() {
        let container = "#stats-header > div.titleNumber___2ZLSJ";
        let target = document.querySelector(container);
        if (!validPointer(target)) {
            setTimeout(function() {handlePageLoad();}, 1000);
            return;
        }
        setTitle();
        if (Number(target.innerText) > maxAttackers) {
            if (!notificationsDisabled) {
                log('Target has hit ' + target.innerText + ' attackers, notifying!');
                blinkTab('Go Go Go!');
                GM_notification ( {title: userName + ' is ready!', text: target.innerText + ' user attacking.'} );
                alert(userName + ' is ready to attack!');
            }
        } else {
            // Go onto the next NPC, after a brief pause
            nextPage(delaySecs * 1000);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Helpers, some are unused
    //////////////////////////////////////////////////////////////////////

    // Helper to go to next page after 'ms' milliseconds
    async function nextPage(ms) {
        await mySleep(ms);
        window.location.assign(baseNPCUrl + nextNPC(playerID));
    }

    // Helper to really sleep for 'x' ms.
    function mySleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Helper to get next NPC ID
    function nextNPC(id) {
        switch (Number(id)) {
        case 4:
            return 15;
        case 15:
            return 19;
        case 19:
            return 20;
        case 20:
            return 21;
        case 21:
            return 4;
        default:
            return id;
        }
    }

    // Helper to handle the hash changing - went to a new ID or page.
    // This ocurrs if you join a fight on any tab.
    // Disables notifications if we've gone to another NPC page.
    function handleHashChange() {
        playerID = getNpcID();
        log('handleHashChange: ' + queryString);
        notificationsDisabled = (playerID != initialPlayerID && initialPlayerID != 0);
    }

    // Helper to set the title in the tab
    function setTitle() {
        let target = document.querySelector("#stats-header > div.titleNumber___2ZLSJ");
        playerID = getNpcID();
        userName = names[playerID];
        document.title = userName + ' (' + playerID + ') | ' + target.innerText;
    }

    // Helper just to return current NPC ID
    function getNpcID() {
        queryString = window.location.search;
        urlParams = new URLSearchParams(queryString);
        playerID = urlParams.get('user2ID');
        return playerID;
    }

    // Helper function to blink the tab with a given message. To use, call 'blinkTab(message)'
    var blinkTab = function(message) { // re-write as function blinkTab(message { ...} ?
        var oldTitle = document.title,                                                           /* save original title */
        timeoutId,
        blink = function() { document.title = document.title == message ? ' ' : message; },      /* function to BLINK browser tab */
        clear = function() {                                                                     /* function to set title back to original */
            clearInterval(timeoutId);
            document.title = oldTitle;
            window.onmousemove = null;
            timeoutId = null;
        };

        if (!timeoutId) {
            timeoutId = setInterval(blink, 1000);
            window.onmousemove = clear;                                                          /* stop changing title on moving the mouse */
        }
    };

    /*
    /    Idea: set color too:
    /    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#123456'); // BG only
    //
    //   $(function() {
            var i = 0;
            var colors = ["#FF0000", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF"];
            setInterval(function() {
                var color = colors[i = i++ > 4 ? 0 : i];
                $("meta[name='theme-color']").attr('content', color);
                $("#x").text(color);
            }, 500);
        });

    */

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    log('Tracking ' + userName);

    handlePageLoad();


})();