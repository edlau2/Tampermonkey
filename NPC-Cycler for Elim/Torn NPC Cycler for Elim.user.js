// ==UserScript==
// @name         Torn NPC Alerts during Elim
// @namespace    http://tampermonkey.net/
// @version      1.2
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

    const lifeThreshold = 3000; // Triggers when life < (max - threshold)
    const timeThreshold = 10; // Seconds between API calls, one per NPC
    var notificationsDisabled = false; // Default start-up value, true if we need to start at 'start' notifying
                                       // 'false' implies it will be enabled when abroad, etc. - anywhere there's no sidebar.
    const allowWhenAbroad = false; // true to allow when abroad, used for testing (see above).

    var alertsDiv = '<hr id="xedx-hr-delim" class="delimiter___neME6">' +
        '<div id="xedxStartStopAlerts" style="padding-bottom: 5px; padding-top: 5px;">' +
        '<span style="font-weight: 700;">NPC Alerts</span>' +
        '<a id="startStopAlerts" class="t-blue show-hide">' +
        (notificationsDisabled ? '[start]</a>' : '[stop]</a>');

    // Names ==> numeric ID relationship
    const ids = {
        'DUKE': 4,
        'LESLIE': 15,
        'JIMMY': 19,
        'FERNANDO': 20,
        'TINY': 21,
    };

    // Numeric ID's ==> name realtionship
    const names = {4: 'Duke',
                   15: 'Leslie',
                   19: 'Jimmy',
                   20: 'Fernando',
                   21: 'Tiny',
                  };
    var lastID = 4; // Last ID checked

    // Where we actually do stuff.
    function getUserProfile(userID) {
        let userName = names[userID];
        let flightBan = allowWhenAbroad ? false : ((abroad() ? true : false));
        lastID = userID;
        log("Querying Torn for " + userName + "'s profile, ID = " + userID);
        log('Notifications are ' + (notificationsDisabled ? 'DISABLED' : 'ENABLED'));
        if (flightBan) {log("Won't query during flight ban");}
        if (!notificationsDisabled && !flightBan) {
            xedx_TornUserQuery(userID, 'profile', updateUserLevelsCB);
        } else {
            log("(didn't query - will check when re-enabled.)");
        }
    }

    // Callback for above
    function updateUserLevelsCB(responseText, userID) {
        let profile = JSON.parse(responseText);
        if (profile.error) {return handleError(responseText);}

        let userName = names[userID];
        let status = profile.status;
        let life = profile.life;
        log('(callback) Status details for ' + userName + ': ' + status.details);
        log('Notifications are ' + (notificationsDisabled ? 'DISABLED' : 'ENABLED'));
        log('Life: ' + life.current + '/' + life.maximum);
        if (status.details.includes('V')) { // Matches IV and V
            if (life.current < (life.maximum - lifeThreshold)) {
                if (!notificationsDisabled) {
                    log('Target at ' + life.current + '/' + life.maximum + ' life!');
                    GM_notification ( {title: userName + ' is ready!', text: 'Low life: ' + life.current + '/' + life.maximum} );
                    alert(userName + ' is ready to attack! Life at:' + life.current + '/' + life.maximum);
                    stopAlerts(true);
                }
            }
        }

        setTimeout(function(){getUserProfile(nextNPC(userID));}, timeThreshold * 1000);
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
        case ids.DUKE:
            return ids.LESLIE;
        case ids.LESLIE:
            return ids.JIMMY;
        case ids.JIMMY:
            return ids.FERNANDO;
        case ids.FERNANDO:
            return ids.TINY;
        case ids.TINY:
            return ids.DUKE;
        default:
            return id;
        }
    }

    //////////////////////////////////////////////////////////////////////
    // UI stuff
    //////////////////////////////////////////////////////////////////////

    function appendStartStopAlertsDiv() {
        if (!validPointer($('#xedxStartStopAlerts'))) {
            console.log('#xedxStartStopAlerts NOT found.');
        } else {
            $('#xedx-hr-delim').remove();
            $('#xedxStartStopAlerts').remove();
        }
        console.log('Appending #xedxStartStopAlerts.');
        $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]').append(alertsDiv);
        installClickHandler();
    }

    function installClickHandler() {
        $('#startStopAlerts').on('click', function () {
                const stop = $('#startStopAlerts').text() == '[stop]';
                log('Button click: ' + (stop ? 'stopping' : 'starting') + ' alerts, text = "' + $('#startStopAlerts').text() +'"');
                stopAlerts(stop);
            });
    }

    function stopAlerts(stop) {
        notificationsDisabled = stop;
        if (!notificationsDisabled) {
            getUserProfile(nextNPC(lastID));
        }
        console.log(GM_info.script.name + (stop ? ": stopping " : ": starting " + "NPC alerts."));
        if (validPointer($('#startStopAlerts'))) {
            log('Setting text to: ' + `[${notificationsDisabled ? 'start' : 'stop'}]`);
            $('#startStopAlerts').text(`[${notificationsDisabled ? 'start' : 'stop'}]`);
        }
    }

    function handlePageLoaded() {
        appendStartStopAlertsDiv();

        /*
        if (window.location.pathname.indexOf('loader.php') >= 0) {
            stopAlerts(GM_getValue('xedxStopAlerts', false));
        } else {
            const savedHide = GM_getValue('xedxStopAlerts', false);
            appendStartStopAlertsDiv();
            stopAlerts(savedHide);
        }
        */

        getUserProfile(4);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();

    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoaded);
    } else {
        handlePageLoaded();
    }

})();