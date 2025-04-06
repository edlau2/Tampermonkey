// ==UserScript==
// @name         Torn Find Uniques
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
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

    const autoRun = true;                  // Will start checking when the script runs. For testing only...leave set to true!
    const browserNotify = true;            // Enable browser notifications
    const notifyMinSecsBetween = 30;       // Wait at least 30 secs before another notification
    const notifyTimeoutSecs = 30;          // Time notification is displayed
    const secsDelayEachCrime = 3;          // Check each crime, waiting this many secs between requests
    const secsDelayBetweenRuns = 15;       // Wait this many secs before checking each crime again.

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);
    GM_setValue("debugLoggingEnabled", debugLoggingEnabled);

    const rfcv = getRfcv();

    // TESTING - fake a unique. Don't turn this on...
    const testMode = GM_getValue("testMode", false);
    var   testHasUnique = GM_getValue("testHasUnique", false);

    var allCrimes = null;
    var currCrimeIdx = 0;

    // Crimes with no uniques, don't bother checking
    const noUniqueSlugs = ['cardskimming', 'hustling', 'disposal', 'cracking', 'forgery', 'scamming'];
    const noUniqueIds = [6, 8, 9, 10, 11, 12];

    function logOptions() {
        log("debugLoggingEnabled: ", debugLoggingEnabled, " testMode: ", testMode, " testHasUnique: ", testHasUnique,
            " autoRun: ", autoRun, " browserNotify: ", browserNotify);
        log("notifyMinSecsBetween: ", notifyMinSecsBetween, " notifyTimeoutSecs: ", notifyTimeoutSecs,
            " secsDelayEachCrime: ", secsDelayEachCrime, " secsDelayBetweenRuns: ", secsDelayBetweenRuns);
    }

    function atCrimeHub() {return (location.href.indexOf('sid=crimes') > -1 && location.hash == '#/');}

    function findKeyPathAndValue(obj, key, path = '', results = []) {
      if (typeof obj !== 'object' || obj === null) {
        return results;
      }

      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          findKeyPathAndValue(obj[i], key, `${path}[${i}]`, results);
        }
      } else {
        for (const k in obj) {
          if (obj.hasOwnProperty(k)) {
            const currentPath = path ? `${path}.${k}` : k;
            if (k === key) {
              results.push({ value: obj[k], path: currentPath });
            }
            findKeyPathAndValue(obj[k], key, currentPath, results);
          }
        }
      }
      return results;
    }

    function logSecretsArray(arr, name, root) {
        log("Uniques for ", name, ":");
        arr.forEach((entry, idx) => {
            let key = root + entry.path;
            log("  ", key, (entry.value == 0) ? " no unique" : " UNIQUE AVAILABLE");
        });
    }

    function logAllCrimes() {
        log("All allowed crimes:");
        allCrimes.forEach((crime, idx) => {
            log("    ID: ", crime.ID, " index: ", idx, " Name: ", crime.name, " slug: ", crime.slug, " hasUniques: ", crime.hasUniques);
        });
    }

    function getCrimeById(id) {
        if (allCrimes[id-1].ID == id) return allCrimes[id-1];
        allCrimes.forEach((crime) => {
            if (crime.ID == id) return crime;
        });
    }
    function crimeNameById(id) {return getCrimeById(id).name;}
    function crimeSlugById(id) {return getCrimeById(id).slug;}

    var notifyInProgress = false;
    function resetNtfy() {GM_setValue(notifyInProgress, false);} //notifyInProgress = false;}

    function doBrowserNotify(crimeId) {
        if (browserNotify != true) return;
        if (!crimeId) return log("Error: no crime ID provided!");

        if (GM_getValue(notifyInProgress, false) == true) return;
        GM_setValue(notifyInProgress, true);
        setTimeout(resetNtfy, notifyMinSecsBetween * 1000);

        let crimeName = crimeNameById(crimeId);
        let opts = {
                title: 'Crime Uniques',
                text: `Unique available in ${crimeName}!`,
                tag: crimeId,      // Prevent multiple msgs if it sneaks by my checks.
                image: 'https://imgur.com/QgEtwu3.png',
                timeout: notifyTimeoutSecs * 1000,
                onclick: (context) => {
                    //setTimeout(resetNtfy, 30000);
                }, ondone: () => {
                    //setTimeout(resetNtfy, 30000);
                }
            };

        GM_notification( opts );
    }

    function alertsOn(crimeId) {
        doBrowserNotify(crimeId);
        $("#nav-crimes [class^='linkName_']").addClass("blink-yellow");
        if (atCrimeHub() == true) {
            let slug = crimeSlugById(crimeId);
            $(`[href='#/${slug}'] [class^='crimeTitle_']`).addClass("blink-yellow");
        }

    }

    function stopAllAlerts() {
        $("#nav-crimes [class^='linkName_']").removeClass("blink-yellow");
        if (atCrimeHub() == true) {
            $(`[class^='crimeTitle_']`).removeClass("blink-yellow");
        }
    }

    var totalUniques = 0;
    function jsonCrimeCb(jsonResp, step, crimeId) {
        debug("JSON crimeCb: ", step, crimeId, jsonResp);
        if (step == 'hub' || !crimeId) return initCrimeListCb(jsonResp, step, crimeId);

        let DB = jsonResp.DB;
        if (!DB) return log("No DB!!!");

        if (!allCrimes) {
            allCrimes = DB.allowedCrimesTypes;
            allCrimes.forEach((crime, idx) => {
                allCrimes[idx]['uniqueCount'] = 0;
                allCrimes[idx]['hasUniques'] = noUniqueIds.includes(crime.ID) ? false : true;
            });
            if (debugLoggingEnabled == true) logAllCrimes();
        }

        let crimes = DB.crimesByType;
        let thisCrime = allCrimes[currCrimeIdx];
        let crimeName = thisCrime.name;
        let root = "DB.crimesByType";
        let crimesLen = Array.isArray(crimes) ? crimes.length : Object.keys(crimes).length;
        debug("Check ", crimeName, " for uniques, len: ", crimesLen);
        if (!crimes || !crimesLen) {
            debug("ERROR: no crimes for ", crimeName, "? crimes: ", crimes);
            debug("DB for ", crimeName, ": ", DB);
            let sec = findKeyPathAndValue(DB, 'secretsAvailable');
            debug("secrets for ", crimeName, "? ", sec);
        } else {
            let secrets = findKeyPathAndValue(crimes, 'secretsAvailable');
            if (debugLoggingEnabled == true)
                logSecretsArray(secrets, crimeName, root);

            thisCrime.uniqueCount = 0;
            testHasUnique = GM_getValue("testHasUnique", false);

            let alreadyLogged;
            secrets.forEach((entry, idx) => {

                // Testing: turn on/off a unique via storage
                let doFake = false;
                if (crimeId == 4 && testMode == true) {
                    if (testHasUnique == true) doFake = true;
                }

                if (entry.value > 0 || doFake == true) {
                    thisCrime.uniqueCount++;
                    totalUniques++;
                    if (!alreadyLogged) {
                        alreadyLogged = true;
                        alertsOn(crimeId);
                        log(`Unique found in ${crimeName}\nKey: ${root}${entry.path}`);
                    }
                }
            });
        }

        if (currCrimeIdx < allCrimes.length) {
            let id = getNextCrimeId();
            if (id) {
                let crime = getCrimeById(id);
                debug("Got next crime: ", id, currCrimeIdx, crime.name);
                let delay = (currCrimeIdx > 0) ? (secsDelayEachCrime * 1000) : (secsDelayBetweenRuns * 1000);
                setTimeout(doCrimeLoad, delay, id);
            }
        }

        function getNextCrimeId() {
            if (++currCrimeIdx == allCrimes.length) currCrimeIdx = 0;
            for (currCrimeIdx; currCrimeIdx<allCrimes.length; currCrimeIdx++) {
                let crime = allCrimes[currCrimeIdx];
                if (crime.hasUniques == true) {
                    return crime.ID;
                }
            }

            // Wrapped...if there are no uniques in any crime,
            // stop alerts. Clear the counters or next pass.
            debug("Crimes wrapped! totalUniques: ", totalUniques);

            if (!totalUniques) stopAllAlerts();
            currCrimeIdx = 0;
            totalUniques = 0;
            return allCrimes[currCrimeIdx].ID;
        }

    }

    function doCrimeLoad(crimeId) {
        let dataVal = crimeId ? { typeID: crimeId } : {};
        let step = crimeId ? 'crimesList' : 'hub';

        let crimeURL = `https://www.torn.com/page.php?sid=crimesData&step=${step}&rfcv=${rfcv}`;
        $.ajax({
            url: crimeURL,
            type: 'POST',
            data: dataVal,
            success: function (response, status, xhr) {
                jsonCrimeCb(response, step, crimeId);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                log("Error in crimeLoad: ", textStatus);
            }
        });
    }

    function loadCrimes() {
        currCrimeIdx = 0;
        doCrimeLoad(1);
        return false;
    }

    function findNerveContext(retries=0) {
        let ctxLi = $("#uniques-rsvd");
        if (!$(ctxLi).length) {
            if (retries++ < 20) return setTimeout(findNerveContext, 250, retries);
            log("Didn't find nerve bar ctx, will add ctx to crimes bar");
            $("#nav-crimes").on('contextmenu', loadCrimes);
        }

        $(ctxLi).css("display", "list-item");
        $(ctxLi).on('click', loadCrimes);
    }

    function handlePageLoad() {
        window.onbeforeunload = function(){
            resetNtfy();
            alert("unloading...");
        };

        // Just in case stuck on by another page...
        setTimeout(resetNtfy, 15000);

        // Custom test buttons to run manually
        if (testMode == true) findNerveContext();

        if (autoRun == true) doCrimeLoad(1);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    logOptions();

    addStyles();

    callOnContentLoaded(handlePageLoad);

    // Styles and UI just stuck down here out of the way...
    function addStyles() {

        GM_addStyle(`
            @keyframes blink {
                0% { opacity: 1; }
                50% { opacity: 0.2; }
                100% { opacity: 1; }
            }

            .blink-yellow {
                color: yellow !important;
                animation: blink 1s infinite;
            }
        `);
    }


})();