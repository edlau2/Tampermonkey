// ==UserScript==
// @name         Torn Retal Watcher
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  This script reads fac attack logs for available retals
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @exclude      https://www.torn.com/recaptcha.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", true);    // Extra debug logging
    GM_setValue("debugLoggingEnabled", debugLoggingEnabled);

    console.log(GM_info.script.name + ' version ' + GM_info.script.version + ' script started');

    const log = function(...data) { console.log(GM_info.script.name + ': ', ...data); }
    const debug = function(...data) { if (debugLoggingEnabled) { console.log(GM_info.script.name + ': ', ...data); } }

    let api_key = GM_getValue('gm_api_key');
    function validateApiKey() {
        let text = GM_info.script.name + "Says:\n\nPlease enter your API key.\n" +
            "Your key will be saved locally so you won't have to be asked again.\n" +
            "Your key is kept private and not shared with anyone.";

        text += '\n\nA full access key is required!';

        if (!api_key || typeof api_key === 'undefined' || api_key == '') {
            api_key = prompt(text, "");
            GM_setValue('gm_api_key', api_key);
        }
    }

    validateApiKey();
    addStyles();

    const channel = new BroadcastChannel(GM_info.script.name + '-instance');
    let isPrimaryInstance = true;

    // If we don't hear back within 3 secs, start monitoring
    let mTO = setTimeout(startMonitoring, 3000);
    let monitoring = false;
    channel.postMessage({ type: 'new_instance' });

    channel.addEventListener('message', (event) => {
        debug("New msg: ", event.data, isPrimaryInstance);
        if (event.data && event.data.type === 'new_instance' && isPrimaryInstance) {
            channel.postMessage({ type: 'instance_exists', sender: window.location.href });
            if (mTO) {
                clearTimeout(mTO);
                startMonitoring();
            }
            mTO = null;
        } else if (event.data && event.data.type === 'instance_exists' && event.data.sender !== window.location.href) {
            // Another instance confirmed it is running. Stop this one.
            isPrimaryInstance = false;
            log('Another instance is running. This script will stop.');
            if (mTO) clearTimeout(mTO);
            mTO = null;
            return; // Exit the script execution
        } else if (event.data && event.data.type === 'primary_instance_stop' && !isPrimaryInstance) {
            isPrimaryInstance = true;
            mTO = setTimeout(startMonitoring, 3000);
            monitoring = false;
            channel.postMessage({ type: 'new_instance' });
        }
    });

    // Handle the window closing to allow another tab to take over
    window.addEventListener('beforeunload', () => {
        debug("**** beforeUnload ****");
        if (isPrimaryInstance) {
            channel.postMessage({ type: 'primary_instance_stop' });
            // Optionally, signal that the primary is closing,
            // so another tab can take over if needed.
            // This is complex to manage perfectly, but the basic lock works for new tabs.
            alert("Posted stop msg");
        }
    });

    function canAttackRes(res) {
        const badRes = ['Lost', 'Stalemate', 'Assist'];
        if (badRes.includes(res)) return false;

        return true;
    }


    let fromTime;
    let recheckInt = 15000;
    function processAttacksResult(response, status, xhr, target) {
        debug("processStatsResult, response: ", response);
        let done = false;
        if (!response.attacks) {
            log("Error in data: ", response);
            done = true;
        }
        if (!response.attacks.length) {
            log("No new attacks!");
            done = true;
        }
        if (done) {
            debug("Checking again in ", (+recheckInt / 1000), " seconds...");
            return setTimeout(getAttacks, recheckInt, fromTime);
        }

        fromTime = response.attacks[0].ended;

        let now = new Date().getTime();
        let fiveMin = parseInt( now / 1000) - 300;
        response.attacks.forEach((att, idx) => {
            if (idx == 0) fromTime = att.ended;

            let when = att.ended;
            let diff = parseInt(now/1000) - +when;
            if (diff < fiveMin) {
                let then = new Date(when * 1000);
                debug (then, " is more than 5 minutes ago!");
            } else {
                let ago = parseInt(diff / 60) + ":" + (diff % 60);
                let attName = att.attacker ? att.attacker.name : 'stealthed';
                let attId = att.attacker ? att.attacker.id : null;
                let attLvl = att.attacker ? att.attacker.level : null;
                debug(attName, " [", attId, "], level: ", attLvl, att.result, att.defender.name, ago, " ago!");

                // Alert if needed
                let url = `https://www.torn.com/loader.php?sid=attack&user2ID=${attId}`;
                let msg = `${attName} [${attId}] ${att.result} ${att.defender.name} ${ago} ago!\nClick to retal!`;
                if (canAttackRes(att.result) && attName) {
                    debug("Alerting!");
                    GM_notification({
                        text: msg,
                        title: "Retal available!",
                        url: url,
                        timeout: 300000,
                        tag: attId,
                        onclick: (event) => {
                            debug("Alert clicked for: ", url);
                        }
                    });
                } else {
                    debug("Not a retal, ignoring.");
                }
            }
        });


        // Check again in say recheckInt millisecs
        debug("Checking again in ", (+recheckInt / 1000), " seconds...");
        setTimeout(getAttacks, recheckInt, fromTime);

    }

    function getAttacks(from) {

        // Only need last 5 minutes, max
        let fiveMin = parseInt( (new Date().getTime() / 1000) - 300);
        from = (from && !isNaN(from)) ? (Math.max(+from, fiveMin)) : (fiveMin);
        let fromStr = "from=" + from + "&";

        debug("[getAttacks] from: ", from, " (", (new Date(+from * 1000)), ")");

        let url = `https://api.torn.com/v2/faction/attacks?filters=incoming&limit=100&sort=DESC&${fromStr}key=${api_key}`;
        debug("getAttacks: ", url);

        $.ajax({
            url: url,
            headers: {'Authorization': ('ApiKey ' + api_key)},
            type: 'GET',
            success: processAttacksResult,
            error: function (jqXHR, textStatus, errorThrown) {
                console.debug(GM_info.script.name + ": Error in ajax GET: ", textStatus, errorThrown, jqXHR);
            }
        });
    }

    // Wait for a response to our message or timeout before starting
    function startMonitoring() {
        if (mTO) clearTimeout(mTO);
        mTO = null;
        if (monitoring == true) return;
        if (isPrimaryInstance) {
            monitoring = true;
            log('This instance is the primary instance.');
            getAttacks();
        }
    }


    // Add any styles here
    function addStyles() {

    }

})();