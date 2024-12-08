// ==UserScript==
// @name         Torn War Score Watcher
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Notify on any page when war is almost over.
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
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

    debugLoggingEnabled = false;    // Verbose, global development/debug logging. Prob don't want to enable!

    // These values can be edited in storage...
    const timerInterval = GM_getValue("timerInterval", 10000);           // Frequency of updating and checking data, ms
    const notifyWhenReaches = GM_getValue("notifyWhenReaches", true);    // Notify when a set score is reached
    const notifyScore = GM_getValue("notifyScore", 15000);               // Score to notify at
    const notifyValue = GM_getValue("notifyValue", "ourScore");          // What score part to compare: ourScore, theirScore, lead, remains
    const notifyWhenNearEnd = GM_getValue("notifyWhenNearEnd", false);   // Notify when near the end (close to target score)
    const notifyDuration = GM_getValue("notifyDuration", 30000);         // Time before notification is auto-closed, ms
    const logScoreUpdates = GM_getValue("logScoreUpdates", false);       // Log score data at each update

    // Globals internally maintained
    var ourScore = 0, theirScore = 0;
    var lead = 0, targetScore = 0, remains = 0;
    var scoreBlock;

    // Experimental values used for notifying when close to end....
    var levels = [{diff: 500, tms: 30000, shown: false},
                  {diff: 100, tms: 30000, shown: false},
                  {diff: 50, tms: 30000, shown: false}
                 ];

    // Re-save on version change in case new opts are added
    var needsSave = GM_getValue("needsSave", true);
    const savedVer = GM_getValue("savedVer", 0);
    if (GM_info.script.version > savedVer) needsSave = true;
    debug("savedVer: ", savedVer, " current: ", GM_info.script.version, " need save: ", needsSave);

    if (needsSave == true) saveOptions();

    // Persist options to storage
    function saveOptions() {
        GM_setValue("timerInterval", timerInterval);
        GM_setValue("notifyWhenReaches", notifyWhenReaches);
        GM_setValue("notifyScore", notifyScore);
        GM_setValue("notifyWhenNearEnd", notifyWhenNearEnd);
        GM_setValue("notifyDuration", notifyDuration);
        GM_setValue("logScoreUpdates", logScoreUpdates);
        GM_setValue("notifyValue", notifyValue);

        needsSave = false;
        GM_setValue("needsSave", needsSave);
        GM_setValue("savedVer", GM_info.script.version);
    }

    function logScoreData() {
        logt("Us: ", ourScore, " Them:", theirScore, " Lead: ", lead, " Remains: ", remains, "/", targetScore);
    }

    var notifyPaused = false;
    const resumeNotify = function () {notifyPaused = false;}

    function onNotifyClick() { }
    function onNotifyDone() { setTimeout(resumeNotify, 15000); }

    // Do the notification
    function doBrowserNotify(msg, timeout=0) {
        debug("Notify: ", msg, " paused:", notifyPaused);
        if (notifyPaused == true) return;

        let opts = {
            title: 'War Score Watcher',
            text: msg,
            tag: "xedx",
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: notifyDuration,
            onclick: onNotifyClick,
            ondone: onNotifyDone
        };

        if (timeout > 0) opts.timeout = timeout;
        GM_notification (opts);
        notifyPaused = true;
    }

    function updateWarScoreData() {

        updateScores();
        updateLead();

        // Score remaing to hit target
        remains = targetScore - lead;

        if (logScoreUpdates == true) logScoreData();

        // Update global score data
        function updateScores() {
            ourScore = $($(scoreBlock).find("[class*='currentFaction_']")[0]).text();
            theirScore = $($(scoreBlock).find("[class*='opponentFaction_']")[0]).text();
            debug("ourScore: ", ourScore, " theirs: ", theirScore);
        }

        // Read and update lead and target values
        function updateLead() {

            let target = $("[class*='scoreBlock_'] [class*='target_']").html();
            let parts = target ? target.split('<br>') : undefined;
            if (!parts) return log("Can't find target, going home.");
            parts = parts[1].split('/');
            lead = parts[0].replace(',', '');
            targetScore = parts[1].replace(',', '');
            debug("Lead: ", lead, " (", parseInt(lead), ") targetScore: ", targetScore, " (", parseInt(targetScore), ")");
        }
    }

    function checkNearEnd() {
        for (let idx=0; idx < levels.length; idx++) {
            let level = levels[idx];
            if (level.shown == true) continue;

            if (remains < level.diff) {
                let msg = "Within " + level.remains + " (" + remains + ") of the target!";
                level.shown = true;
                doBrowserNotify(msg, level.tms);
                break;
            }
        }
    }

    function checkCurrentScore() {
        log("checkCurrentScore: ", notifyValue);
        let notify = false;
        let msg = "";

        switch (notifyValue.toLowerCase()) {
            case 'ourscore':
                if (ourScore >= notifyScore) {
                    msg = "You've hit " + notifyScore + "!";
                    notify = true;
                }
                break;
            case 'theirscore':
                if (theirScore >= notifyScore) {
                    msg = "They've hit " + notifyScore + "!";
                    notify = true;
                }
                break;
            case 'lead':
                if (lead >= notifyScore) {
                    msg = "You've hit " + notifyScore + "!";
                    notify = true;
                }
                break;
            case 'remains':
                if (remains <= notifyScore) {
                    msg = "Less than " + notifyScore + " to go!";
                    notify = true;
                }
                break;
        }

        if (notify == true) {
            doBrowserNotify(msg);
        }
    }

    function notifyWarOver() {
        let msg = "War is over, " + ourScore + " to " + theirScore;
        doBrowserNotify(msg, 0);
    }

    // Update values periodically
    function timerProc() {
        updateWarScoreData();
        if (remains == 0) return notifyWarOver();

        // Check and notify if conditions met
        if (notifyWhenNearEnd == true) checkNearEnd();
        if (notifyWhenReaches == true) checkCurrentScore();

        if (remains > 0) setTimeout(timerProc, timerInterval);
    }

    // Find score block and start updating
    function handlePageLoad(retries=0) {
        scoreBlock = $("[class*='scoreBlock_']");
        if (!$(scoreBlock).length) {
            if (retries++ < 20) return setTimeout(handlePageLoad, 250, retries);
            return log("Too many retries, I quit.");
        }
        debug("scoreBlock: ", $(scoreBlock));

        updateWarScoreData();
        if (remains == 0) {
            log("War is over, " + ourScore + " to " + theirScore);
            return;
        }

        setTimeout(timerProc, timerInterval);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");
    if (location.href.indexOf("step=your&type=1") < 0)
        return log("Wrong fac page!");

    versionCheck();

    log("Valid values for notifyValue: ourScore, theirScore, lead, remains.");
    log("case-insensitive, you have " + notifyValue + " set.");

    callOnContentLoaded(handlePageLoad);

})();