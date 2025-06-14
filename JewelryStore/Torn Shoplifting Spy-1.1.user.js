// ==UserScript==
// @name         Torn Shoplifting Spy
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Spies on varies stores to report on the status of the guards and cameras.
// @author       xedx [2100735]
// @run-at       document-end
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);                // Extra debug logging

    logScriptStart();
    if (checkCloudFlare()) return log("Won't run while challenge active!");
    validateApiKey();

    const queryCrime = () => { xedx_TornTornQuery('', 'shoplifting', crimeQueryCb); }
    const lastCheckKey = "lastCheck";
    const lastAlertKey = "lastAlert";
    const apiCallInterval = 10000;      // Time between API calls
    const alertDisplayInterval = 60000;
    const alertTimeout = 30000;
    var callTimer;

    const checkBigAls = false;

    startPolling();

    function checkShopliftingStatus() {
        let now = new Date().getTime();
        let ts = parseInt(GM_getValue(lastCheckKey, 0));
        if (+now < ts + apiCallInterval) return; // log("Too soon to call: ", now, ts);
        GM_setValue(lastCheckKey, now);
        xedx_TornTornQuery('', 'shoplifting', crimeQueryCb);
    }

    // Start checking to see what effects are active
    function startPolling() {
        log("[startPolling]");
        if (callTimer) clearInterval(callTimer);
        callTimer = setInterval(checkShopliftingStatus, apiCallInterval);
        checkShopliftingStatus();
    }

    function stopPolling() {
        log("[stopPolling]");
        if (callTimer) clearInterval(callTimer);
        callTimer = null;
    }

    var crimesLogged = false;
    function logCrimeObj(obj) {
        let targets = obj.shoplifting;
        let keys = Object.keys(targets);
        for (let idx=0; idx<keys.length; idx++) {
            let crime = targets[keys[idx]];
            let msg1 = keys[idx] + ">> " + crime[0].title + ((crime[0].disabled == true) ? ": disabled! " : ": enabled. ");
            let msg2 = "";
            if (crime[1]) {
                msg2 = crime[1].title + ((crime[1].disabled == true) ? ": disabled! " : ": enabled.");
            }
            debug(`${msg1}${msg2}`);
        }
        crimesLogged = true;
    }

    function crimeQueryCb(response, ID, param) {
        let jsonObj = JSON.parse(response);
        let targets = jsonObj.shoplifting;
        if (!targets) return log("Error: no targets! ", jsonObj.shoplifting);
        //debug("***** ",targets.jewelry_store[0].title, (targets.jewelry_store[0].disabled == true) ? ": disabled! " : ": enabled, ",
        //      targets.jewelry_store[1].title, (targets.jewelry_store[1].disabled == true) ? ": disabled! *****" : ": enabled *****");

        if (targets.jewelry_store[0].disabled == true && targets.jewelry_store[1].disabled == true) {
            doAlert("jtag", "Cameras and Guards down at the jewelry store!");
        }
        if (checkBigAls == true && targets.big_als[0].disabled == true) {
            doAlert("batag", "Cameras out at Big Al's!");
        }

        if (crimesLogged == false) logCrimeObj(jsonObj);
    }

    function tm_str(tm) {
        let dt = tm ? new Date(tm) : new Date();
        const mediumTime = new Intl.DateTimeFormat("en-GB", {
          timeStyle: "medium",
          hourCycle: "h24",
        });

        const shortDate = new Intl.DateTimeFormat("en-GB", {
          dateStyle: "short",
        });
        const formattedDate = mediumTime.format(dt) + " - " + shortDate.format(dt);
        return formattedDate;
    }

    function doAlert(tag, msg) {
        let key = (lastAlertKey + '-' + tag);
        let now = new Date().getTime();
        let ts = parseInt(getAlertTime(key));
        if (ts > 0 && Number(now) < (ts + Number(alertDisplayInterval))) {
            return log("key: ", key, " Too soon to alert: ", now, ts,
                       (ts + Number(alertDisplayInterval)), ((ts + Number(alertDisplayInterval)) - Number(now)));
        }
        setAlertTime(key, now);

        log("**** Shoplifting alert: ", msg, " ****");
        GM_notification({
            text: msg,
            title: "Shoplifting Alert",
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: alertTimeout,
            onclick: (context) => {

            }, ondone: () => {

            }
        });

        function setAlertTime(key, time) {
            log("[setAlertTime] key: ", key, " time: ", time);
            GM_setValue(key, now);
        }

        function getAlertTime(key) {
            let time = GM_getValue(key, 0);
            log("[getAlertTime] key: ", key, " time: ", time);
            return time;
        }
    }

})();