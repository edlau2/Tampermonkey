// ==UserScript==
// @name         Torn NPC Watcher for Elim
// @namespace    http://tampermonkey.net/
// @version      0.5
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
    var initialPlayerID = playerID;

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

        // We may have switched pages and some point, due to joining a fight in another tab, perhaps.
        // This can disable notifications. Turn back on if we have now gone to a diff page and gotten
        // back to a join/start fight page.
        let dlg = document.querySelector("#defender > div.playerArea___3T2uG >" +
                                         "div.modal___2aYmi.defender___2q-P6 > div > div > div.dialogButtons___3xN5A > button");
        if (validPointer(dlg)) {enableNotifications();}

        setTitle();

        // Add a mutation observer to 'document.querySelector("#defender");' ? (entire defender area - may trigger when target gets hit!)
        // Or just this, the button box?
        //
        // Fernando with a 'Join Fight' (or 'Start Fight'?) dialog button.
        // document.querySelector("#defender > div.playerArea___3T2uG > div.modal___2aYmi.defender___2q-P6 > div");
        // document.querySelector("#defender > div.playerArea___3T2uG > div.modal___2aYmi.defender___2q-P6 > div > div > div.dialogButtons___3xN5A > button")
        //
        // Jimmy text, not enough e: (prob also 'Fight is already over', 'user is unconcious', etc.)
        // document.querySelector("#defender > div.playerArea___3T2uG > div.modal___2aYmi.defender___2q-P6 > div");
        // document.querySelector("#defender > div.playerArea___3T2uG > div.modal___2aYmi.defender___2q-P6 > div > div > div.title___1M1kE");
        //
        // Get stuck, won't auto-refresh if no e or NPC is in hosp.
        //
        // Add an observer to the counter icon instead of polling?

        if (Number(target.innerText) > maxAttackers) {
            if (!notificationsDisabled) {
                log('Target has hit ' + target.innerText + ' attackers, notifying!');
                blinkTab('Go Go Go!');
                GM_notification ( {title: userName + ' is ready!', text: target.innerText + ' user attacking.'} );
                //alert(userName + ' is ready to attack!');
            }
            setTimeout(function() {updateUserCount();}, 5000); // Come back later, just update user counts
        } else {
            debug('Checking target, ' + target.innerText + ' attackers.');
            setTimeout(function() {handlePageLoad();}, 5000); // Come back later, notifications
        }
    }

    // Updates title only, no notifications.
    function updateUserCount() {
        // let target = document.querySelector("#stats-header > div.titleNumber___2ZLSJ");
        if (!validPointer(target)) {
            setTimeout(function() {handlePageLoad();}, 3000); // Go back to notifications
            return;
        }

        setTitle();

        if (Number(target.innerText) > maxAttackers) {
            setTimeout(function() {updateUserCount();}, 5000); // Come back later, just user count
        } else {
            setTimeout(function() {handlePageLoad();}, 5000); // Come back later, notifications
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

    // Helper to turn notifications back on, and save the current NPC ID as the original.
    function enableNotifications() {
        notificationsDisabled = true;
        initialPlayerID = getNpcID();
    }

    // Helper to set the title in the tab
    function setTitle() {
        let target = document.querySelector("#stats-header > div.titleNumber___2ZLSJ");
        playerID = getNpcID();
        userName = names[playerID];
        if (!initialPlayerID) {initialPlayerID = playerID;}
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

    /* TBD TBD TBD
    Right -that's the prob with them changing pages. I need to basically 1) remember the initial ID I'm on,
    and if it changed, stop notifications.
    So 2) is subscribe to URL changes and stop if the ID in the URL is different.

    See 'handleHashChange()'
    */

    window.addEventListener('hashchange', function() {
            log('The hash has changed! new hash: ' + location.hash);
            handleHashChange();
        }, false);

    logScriptStart();
    log('Tracking ' + userName);

    handlePageLoad();


})();