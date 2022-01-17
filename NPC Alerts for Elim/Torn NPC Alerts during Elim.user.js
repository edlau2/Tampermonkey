// ==UserScript==
// @name         Torn NPC Alerts during Elim
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Notify when multiple attackers start hitting an NPC
// @author       xedx [2100735]
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @match        https://www.torn.com/*
// @connect      api.torn.com
// @connect      yata.yt
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    // Variables that influence when alerts may be generated. Note that alerts aren't generated when on
    // an NPC attack page already (for that NPC); it's assumed you'll notice on your own!
    //
    // Moved 'lifeThreshold' to the names array, the 'threshold' member
    //const lifeThreshold = 3000;        // Triggers when [current life < (max life - threshold)], and [curr life > minAttackLife]
    const timeThreshold = 10;          // Seconds between API calls, one per NPC.
    const minAttackLife = 100000;      // Don't alert if current life not > this value. Not worth it.
    const allowWhenAbroad = false;     // true to allow when abroad, used for testing (see above).
    var notificationsDisabled = false; // Default start-up value, true if we need to startup with notifications turned on.

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

    // Numeric ID's ==> name relationship (and other miscellany)
    // Is 'var', not 'const', so we can toggle 'enabled'
    var names = {4: {name: 'Duke', enabled: true, threshold: 10000},
                   15: {name: 'Leslie', enabled: true, threshold: 10000},
                   19: {name: 'Jimmy', enabled: true, threshold: 10000},
                   20: {name: 'Fernando', enabled: true, threshold: 10000},
                   21: {name: 'Tiny', enabled: true, threshold: 10000},
                  };
    var lastID = 4; // Last ID checked

    // Where we actually do stuff. Well, where we kick it off - the callback does the heavy lifting.
    function getUserProfile(userID) {
        let userName = names[userID].name;
        let flightBan = allowWhenAbroad ? false : ((abroad() ? true : false));
        lastID = userID;

        log("Querying Torn for " + userName + "'s profile, ID = " + userID);
        log('Global notifications are ' + (notificationsDisabled ? 'DISABLED' : 'ENABLED'));
        if (flightBan) {log("Won't query during flight ban");}
        if (!names[userID].enabled) {log("Won't query disabled NPC (" + userName + ").");}

        if (!notificationsDisabled && !flightBan && names[userID].enabled) {
            log('Passed all checks - querying Torn for ' + userName);
            xedx_TornUserQuery(userID, 'profile', updateUserLevelsCB);
        } else {
            log("(didn't query - will check when re-enabled.)");
        }
    }

    // Callback for above
    function updateUserLevelsCB(responseText, userID) {
        let profile = JSON.parse(responseText);
        if (profile.error) {return handleError(responseText);}

        let userName = names[userID].name;
        let userThreshold = names[userID].threshold;
        let status = profile.status;
        let life = profile.life;

        log('(callback) Status details for ' + userName + ': ' + status.details);
        log('Notifications are ' + (notificationsDisabled ? 'DISABLED' : 'ENABLED'));
        log('Life: ' + life.current + '/' + life.maximum);

        if (status.details.includes('Loot level IV') || status.details.includes('Loot level V')) {
            if (life.current < (life.maximum - userThreshold) && life.current > minAttackLife) {
                // If already on this NPC's page, don't alert - just disable.
                let queryString = window.location.search;
                let urlParams = new URLSearchParams(queryString);
                let playerID = urlParams.get('user2ID');
                if (Number(userID) == Number(playerID)) {
                    stopAlerts(true);
                }
                // Notify if need be...
                if (!notificationsDisabled) {
                    let baseURL = 'https://www.torn.com/loader.php?sid=attack&user2ID=';
                    let text = userName + "'s life at:" + life.current + '/' + life.maximum + "!";
                    log(text + ' ISSUING ALERT!');
                    GM_notification ({title: GM_info.script.name,
                                      text: text + '\nClick to attack!',
                                      onlick: function(event) {
                                          log('Notification event clicked! Opening new tab.');
                                          window.open(baseURL + userID, '_blank');}
                                     });
                    alert(text);
                    stopAlerts(true);
                }
            } else {
                log("Didn't notify.");
            }
        } else {
            // Disable this particular NPC. Set timeout to re-enable at 10 minutes before LL IV,
            // which is hospout time + (210*60) seconds. Minus the 10 minutes. Don't do this if
            // this user is already disabled. We call the YATA api to do this - GET https://yata.yt/api/v1/loot/
            log('Issuing GET for hosp_out? ' + names[userID].enabled);
            if (names[userID].enabled) {
                log('Issuing GET request, hosp_out, for ' + userName + ' (ID ' + userID + ')');
                GM_xmlhttpRequest({
                    method: "GET",
                    url: "https://yata.yt/api/v1/loot/",
                    onload: function(response) {
                        log('hosp_out response for ID ' + userID + ': ' + response.responseText);
                        let respObj = JSON.parse(response.responseText);
                        let timenow = (new Date()) / 1000; // Convert to secs
                        let timeout = respObj.hosp_out[userID];
                        let timeToIV = (timeout + (210 * 60)) - timenow;
                        log('Seconds until loot level IV: ' + timeToIV);
                        let timeToReset = timeToIV - 300;
                        if (timeToReset > 0) {
                            log('Disabling timers for ' + names[userID].name + ', setting timeout for ' + timeToReset + ' seconds.');
                            names[userID].enabled = false;
                            setTimeout(function(){
                                log('Re-enabling timers for ' + names[userID].name + '! Will check now.');
                                names[userID].enabled = true;
                                getUserProfile(userID);
                            }, timeToReset * 1000);
                        }
                    }
                });
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

    // Add the little piece to the sidebar
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

    // Add the handler for the start/stop link
    function installClickHandler() {
        $('#startStopAlerts').on('click', function () {
                const stop = $('#startStopAlerts').text() == '[stop]';
                log('Button click: ' + (stop ? 'stopping' : 'starting') + ' alerts, text = "' + $('#startStopAlerts').text() +'"');
                stopAlerts(stop);
            });
    }

    // Stop alerts and toggle text in sidebar
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

    // We coud just call these directly, below - but htis is typically how my scripts are set up.
    function handlePageLoaded() {
        appendStartStopAlertsDiv();
        getUserProfile(ids.DUKE);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    handlePageLoaded();

})();
