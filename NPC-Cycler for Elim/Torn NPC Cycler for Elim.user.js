// ==UserScript==
// @name         Torn NPC Alerts during Elim
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Notify when multiple attackers start hitting an NPC
// @author       xedx [2100735]
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @match        https://www.torn.com/*
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    // enum the ID's at some point
    const names = {4: 'Duke',
                   15: 'Leslie',
                   19: 'Jimmy',
                   20: 'Fernando',
                   21: 'Tiny',
                  };
    var notificationsDisabled = false; // true if we need to stop notifying

    // Where we actually do stuff.
    function getUserProfile(userID) {
        let userName = names[userID];
        log("Querying Torn for " + userName + "'s profile, ID = " + userID);
        xedx_TornUserQuery(userID, 'profile', updateUserLevelsCB);
    }

    function updateUserLevelsCB(responseText, userID) {
        let profile = JSON.parse(responseText);
        if (profile.error) {return handleError(responseText);}

        let userName = names[userID];
        let status = profile.status;
        let life = profile.life;
        log('(callback) Status details for ' + userName + ': ' + status.details);
        log('Life: ' + life.current + '/' + life.maximum);
        if (status.details.includes('V')) { // Matches IV and V
            if (life.current < life.maximum) {
                if (!notificationsDisabled) {
                    log('Target at ' + life.current + '/' + life.maximum + ' life!');
                    GM_notification ( {title: userName + ' is ready!', text: 'Low life: ' + life.current + '/' + life.maximum} );
                    alert(userName + ' is ready to attack! Life at:' + life.current + '/' + life.maximum);
                    notificationsDisabled = true;
                }
            }
        }

        setTimeout(function(){getUserProfile(nextNPC(userID));}, 10000);
    }

    //////////////////////////////////////////////////////////////////////
    // Helpers, some are unused
    //////////////////////////////////////////////////////////////////////

    // Helper to really sleep for 'x' ms. Call as 'await mySleep()' from an async function
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

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();

    getUserProfile(4);

})();