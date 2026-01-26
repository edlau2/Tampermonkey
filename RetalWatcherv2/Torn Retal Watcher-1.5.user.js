// ==UserScript==
// @name         Torn Retal Watcher
// @namespace    http://tampermonkey.net/
// @version      1.5
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

    var startTime = 0;

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

    const tinyTimeStr = (tm) => {
        let dt = new Date(tm);
        const mediumTime = new Intl.DateTimeFormat("en-GB", {
          timeStyle: "medium",
          hourCycle: "h24",
        });
        return mediumTime.format(dt);
    }

    const channel = new BroadcastChannel(GM_info.script.name + '-instance');
    let isPrimaryInstance = true;
    debug("isPrimaryInstance: ", isPrimaryInstance);

    // If we don't hear back within 3 secs, start monitoring
    let mTO = setTimeout(startMonitoring, 3000);
    let monitoring = false;
    //channel.postMessage({ type: 'new_instance' });

    channel.addEventListener('message', (event) => {
        debug("New msg: ", event.data, " primary? ", isPrimaryInstance);
        if (event.data && event.data.type === 'new_instance' && isPrimaryInstance) {
            log('Sending instance_exists');
            channel.postMessage({ type: 'instance_exists', sender: window.location.href });
            if (mTO) {
                clearTimeout(mTO);
                mTO = null;
                debug("msg received, calling startMonitoring");
                startMonitoring();
            }
            mTO = null;
        } else if (event.data && event.data.type === 'instance_exists' && event.data.sender !== window.location.href) {
            // Another instance confirmed it is running. Stop this one.
            isPrimaryInstance = false;
            debug("isPrimaryInstance: ", isPrimaryInstance);
            log('Another instance is running. This script will stop. Primary instance href: ', event.data.sender);
            if (mTO) clearTimeout(mTO);
            mTO = null;
            //return; // Exit the script execution
        } else if (event.data && event.data.type === 'primary_instance_stop' && !isPrimaryInstance) {
            isPrimaryInstance = true;
            debug("isPrimaryInstance: ", isPrimaryInstance);
            mTO = setTimeout(startMonitoring, 3000);
            monitoring = false;
            channel.postMessage({ type: 'new_instance' });
        } else if (event.data && event.data.type === 'primary_notify') {
            let when = event.data.when;
            debug("Received primary_notify, primary? ", isPrimaryInstance, " start: ", startTime, event.data);
            // If one comes in older than us, they win, we stop monitoring
            if (+startTime && +startTime > +when) {
                if (mTO) clearTimeout(mTO);
                mTO = null;
                isPrimaryInstance = false;
                monitoring = false;
                debug("Stopping this instance for: ", event.data.sender);
            }
        }
    });

    debug("postMessage: new_instance, is primary? ", isPrimaryInstance);
    channel.postMessage({ type: 'new_instance' });

    // Handle the window closing to allow another tab to take over
    // Not always sent, trigger via storage?
    window.addEventListener('beforeunload', () => {
        debug("**** beforeUnload ****");
        if (isPrimaryInstance) {
            channel.postMessage({ type: 'primary_instance_stop' });
            alert("Posted stop msg");
            channel.close();
        }
    });

    /**
     * Adds an item to the array, removing the last element if the array exceeds a specified max size.
     * @param {Array} arr - The array to modify.
     * @param {*} item - The item to add.
     * @param {number} maxSize - The maximum allowed size of the array.
     */
    function pushAndLimit(arr, item, maxSize=100) {
        arr.push(item);
        if (arr.length > maxSize) {
            arr.pop(); // Remove the last element
        }
    }

    function canAttackRes(res) {
        const badRes = ['Lost', 'Stalemate', 'Assist', 'stealthed'];
        if (badRes.includes(res)) return false;

        return true;
    }


    let fromTime;
    let recheckInt = 15000;
    let attacksSeen = [];
    function processAttacksResult(response, status, xhr, target) {
        debug("processStatsResult, response: ", response);
        let done = false;
        if (response.error) {
            log("Error, code: ", response.error.code, " reason: ", response.error.error);
            if (response.error.code == 5) { // Too many reqs - so wait a full minute
                return setTimeout(getAttacks, 60000, fromTime);
            }
        }

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

        fromTime = parseInt(response.attacks[0].ended) + 1;

        let now = new Date().getTime();
        let fiveMin = parseInt( now / 1000) - 300;
        response.attacks.forEach((att, idx) => {
            if (idx == 0)
                fromTime = parseInt(att.ended) + 1;

            if (!attacksSeen.includes(att.id)) {
                pushAndLimit(attacksSeen, att.id);
                let when = att.ended;
                let diff = parseInt(now/1000) - +when;

                let ago = parseInt(diff / 60) + ":" + (diff % 60);
                let attName = att.attacker ? att.attacker.name : 'stealthed';
                let attId = att.attacker ? att.attacker.id : null;
                let attLvl = att.attacker ? att.attacker.level : null;
                debug(attName, " [", attId, "], level: ", attLvl, att.result, att.defender.name, ago, " ago!\n", (new Date(when * 1000)));

                // Alert if needed
                let url = `https://www.torn.com/loader.php?sid=attack&user2ID=${attId}`;
                //let msg = `${attName} [${attId}] ${att.result} ${att.defender.name} ${ago} ago!\nClick to retal!`;
                let msg = `${attName} [${attId}] ${att.result} ${att.defender.name} at ${tinyTimeStr(+when * 1000)}!\nClick to retal!`;
                if (canAttackRes(att.result) && attName && attId) {
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
        GM_setValue("lastRecord", fromTime);
        setTimeout(getAttacks, recheckInt, fromTime);

    }

    function getAttacks(from) {

        // Only need last 5 minutes, max
        let fiveMin = parseInt( (new Date().getTime() / 1000) - 300);
        if (!from) from = GM_getValue("lastRecord", fiveMin);
        from = (from && !isNaN(from)) ? (Math.max(+from, fiveMin)) : (fiveMin);
        let fromStr = "from=" + from + "&";

        debug("[getAttacks] from: ", from, " (", (new Date(+from * 1000)), ")");

        let url = `https://api.torn.com/v2/faction/attacks?filters=incoming&limit=100&sort=DESC&${fromStr}key=${api_key}&comment=RetalWatcher`;
        debug("getAttacks, isPrimaryInstance: ", isPrimaryInstance, " from: ", fromStr);

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

    function sendPrimaryNotify() {
        if (isPrimaryInstance) {
            channel.postMessage({ type: 'primary_notify', sender: window.location.href, when: startTime });
            setTimeout(sendPrimaryNotify, 1000);
        }
    }

    // Clear the style on an attack over 5 min
    function clearRetalStyles() {
        // get enemy attacks not flagged already
        let nodeList = $("ul.chain-attacks-list li:has(i.chain-arrow-icon.enemy):not(.expired) > div.time");
        //debug("[clearRetalStyles] nodeList: ", $(nodeList));
        for (let idx=0; idx<$(nodeList).length; idx++) {
            let li = $($(nodeList)[idx]).closest("li");
            let txt = $($(nodeList)[idx]).text();
            //log("clearRetalStyles: ", $(li), $($(nodeList)[idx]), txt);

            let expired = false;
            if (!txt) continue;
            if (txt.indexOf('h') > -1) {
                setExpired(li);
                continue;
            } else {
                let parts = txt.split(' ');
                debug('Expired - parts: ', parts);
                let min = +parseInt(parts[0]);
                debug("min > 5? ", min, (min > 5));
                if (min > 5) {
                    debug("EXPIRED!");
                    setExpired(li);
                } else
                    debug(parts[0], " is not expired");
            }

        }

        function setExpired(li) {
            debug("Setting ", $(li), " as expired");
            $(li).addClass('expired');
        }
    }

    // Wait for a response to our message or timeout before starting
    function startMonitoring() {
        debug("[startMonitoring], isPrimaryInstance: ", isPrimaryInstance);
        if (mTO) {
            debug("startMonitoring, timer must have popped");
            clearTimeout(mTO);
        }
        mTO = null;
        if (monitoring == true) return;
        if (isPrimaryInstance) {
            startTime = new Date().getTime();
            monitoring = true;
            log('This instance is the primary instance.');
            getAttacks();

            // Periodicall broadcast that we are primary
            sendPrimaryNotify();
        }
    }

    // If running on a fac page...
    if (location.href.indexOf('faction') > -1) {
        setInterval(clearRetalStyles, 1000);
    }


    // Add any styles here
    function addStyles() {
        GM_addStyle(`
            ul.chain-attacks-list li:has(i.chain-arrow-icon.enemy):not(.expired):nth-child(odd) {
                background-color: rgba(40, 150, 245, .3);
                filter: brightness(1.4);
            }

            ul.chain-attacks-list li:has(i.chain-arrow-icon.enemy):not(.expired):nth-child(even) {
                background-color: rgba(40, 50, 245, .4);
                filter: brightness(1.4);
            }
            ul.chain-attacks-list li:has(i.chain-arrow-icon.enemy):not(.expired)
            background-color: var(--default-bg-panel-color);
        `);
    }

})();