// ==UserScript==
// @name         Torn OC Tracker
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Keep track of when your OC will be ready
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const userId = getThisUserId();

    var myCrimeId = GM_getValue("myCrimeId", null);
    var myCrimeStartTime = GM_getValue("myCrimeStartTime", 0);

    const secsInDay = 24 * 60 * 60;
    const secsInHr = 60 * 60;

    // Save cached crime data
    function saveMyCrimeData() {
        GM_setValue("myCrimeId", myCrimeId);
        GM_setValue("myCrimeStartTime", myCrimeStartTime);
    }

    function setTrackerTime(time) {
        $("#oc-tracker-time").text(time);
    }

    function nn(t) {return t == 0? '00' : t < 10 ? '0' + t : t;}
    function getTimeUntilOc() {
        let now = new Date();
        let dt = new Date(myCrimeStartTime * 1000);

        let diffSecs = +myCrimeStartTime - now.getTime()/1000;
        let days = Math.floor(diffSecs / secsInDay);
        let remains = (diffSecs - (days * secsInDay));
        let hrs = Math.floor(remains / secsInHr);
        remains = remains - (hrs * secsInHr);
        let mins = Math.floor(remains/60);

        let timeStr = "OC in: " + days + "d " + nn(hrs) + "h " + nn(mins) + "m";
        return timeStr;
    }

    // See if the cached crime has expired/completed.
    // Return false if invalid/expired/not set, true otherwise.
    function validateSavedCrime(crimes) {
        if (!myCrimeStartTime || !myCrimeId) return false;

        let now = new Date();
        let crimeTime = new Date(myCrimeStartTime * 1000);

        // If now is after the start time, expired...
        if (now.getTime() > myCrimeStartTime * 1000) {
            myCrimeId = null;
            myCrimeStartTime = 0;
            saveMyCrimeData();
            log("Expired crimeTime");
            return false;
        }

        // Cached time can be used...Should prob validate
        // is still in list, can be cancelled?
        return true;
    }

    function myOcTrackingCb(responseText, ID, param) {
        let jsonObj = JSON.parse(responseText);
        let crimes = jsonObj.crimes;
        let myCrime, readyAt;

        // Check to see if we can use cached crime time....
        if (validateSavedCrime(crimes) == true) {
            debug("Found valid cached start time!");
        } else {
            debug("Searching for my crime...");
            for (let crimeIdx=0; crimeIdx < crimes.length; crimeIdx++) {
                let crime = crimes[crimeIdx];
                let slots = crime.slots;
                for (let slotIdx=0; slotIdx<slots.length; slotIdx++) {
                    let slot = slots[slotIdx];
                    if (slot.user_id == userId) {
                        myCrime = crime;
                        readyAt = crime.ready_at;
                        break;
                    }
                }
                if (myCrime) break;
            }

            if (myCrime && readyAt) {
                myCrimeId = myCrime.id;
                myCrimeStartTime = readyAt;  
                saveMyCrimeData();
            } else {
                setTrackerTime("No OC found.");
                debug("Didn't locate my own OC!");
                setTimeout(getMyNextOcTime, 60000);    // Try again in a minute...
            }
        }

        if (myCrimeStartTime) {
            let dt = new Date(myCrimeStartTime * 1000);
            setTrackerTime(getTimeUntilOc());
            setInterval(updateTrackerTime, 31000);
        }

        function updateTrackerTime() {
            setTrackerTime(getTimeUntilOc());
        }
    }

    function getMyNextOcTime() {
        var options = {"cat": 'planning', "offset": "0"};
        xedx_TornFactionQueryv2("", "crimes", myOcTrackingCb, options);
    }

    function installTrackerUi() {
        if ($("#ocTracker").length) {
            return log("Warning: another instance of the OC Tracker is running!");
        }

        let elem = getMyOcTrackerDiv();
        let parentSelector = makeXedxSidebarContentDiv('oc-tracker');

        $(parentSelector).append(elem);
        $(parentSelector).css("padding", "0px");
    }

    function getMyOcTrackerDiv() {
        GM_addStyle(`
            #ocTracker {
                display: flex;
            }

            #ocTracker span {
                align-content: center;
                justify-content: center;
                display: flex;
                flex-flow: row wrap;
                padding: 3px;
                font-size: 14px;
                width: 90%;
            }

        `);

        let myDiv = `
            <div id="ocTracker">
               <span id="oc-tracker-time">00:00:00</span>
           </div>
        `;

        return myDiv;
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    getMyNextOcTime();

    callOnContentLoaded(installTrackerUi);

})();