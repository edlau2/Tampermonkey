// ==UserScript==
// @name         Torn Bat Stat Saver
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Saves fight result info to est bat stats server
// @author       xedx [2100735]
// @include      https://www.torn.com/loader.php?sid=attack&user2ID*
// @connect      api.torn.com
// @connect      www.tornstats.com
// @connect      localhost
// @connect      18.119.136.223
// @connect      *
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint curly: 0*/

(function() {
    'use strict';

    // Some constants
    const userQuery = 'https://api.torn.com/user/?selections=attacks,battlestats&key=';
    const uploadServer = 'http://18.119.136.223:8002/batstats/?cmd=';
    const REQUEST_DELAY = 500; // ms before getting attack data
    const MAX_REQ_RETRIES = 24; // Max times to retry in case of wrong ID (attack result not there yet)

    // Some globals
    var g_intId = null; // ID for the interval timer that checks for fight end.
    let g_opponent = // member for 'result' that is uploaded, their data, both inbound and outbound
        {'id': 0, 'name': '', 'level': 'N/A', 'lastaction': 'N/A', 'result': '', 'lkg': 0, 'when': 0};
    var g_batStats = null; // member for 'result' that is uploaded, my batstats
    var g_user = null; // member for 'result' that is uploaded, defines me, the attacker

    var g_oldestAttack = 0; // Last attack in the attack log, before this fight ends.
    var g_oldLossArray = []; // Array of as yet unprocessed losses in the log

    // Get the basic details (level and last action) of the opponent
    function queryOpponentLevel(id, param=null) {
        xedx_TornUserQuery(id, 'profile', profileQueryCB, param);
    }

    // Callback from above
    function profileQueryCB(responseText, ID, param) {
        log('[profileQueryCB]');
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        log('basic: ', jsonResp);

        g_opponent.level = jsonResp.level;
        g_opponent.lastaction = jsonResp.last_action.relative;
    }

    // Query stats: my older attacks, my current bat stats, my basic info.
    // Called immediately on script load.
    function getBatStats() {
        log('[getBatStats]');
        xedx_TornUserQuery(null, 'attacks,battlestats,basic', statsQueryCB);
    }

    // This queries the last attack data. Called once the fight is over.
    function getAttacks() {
        log('[getAttacks]');
        xedx_TornUserQuery(null, 'attacks', getAttacksCB);
    }

    // Parse the stats query result, get Bat Stat score, old attacks, and basic data
    // Fills two global stat structs.
    function statsQueryCB(responseText, ID) {
        log('[statsQueryCB]');
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        log('attacks,battlestats,basic: ', jsonResp);

        // Fill global batstats (my batstats)
        g_batStats = {'strength': jsonResp.strength,
                        'speed': jsonResp.speed,
                        'dexterity': jsonResp.dexterity,
                        'defense': jsonResp.defense,
                        'total': jsonResp.total,
                        'score': 0};
        log('batstats: ', g_batStats);
        let score = calculateScore(g_batStats);
        log('Calculated score: ' + score);
        g_batStats.score = score;

        // Fill global user struct (my details, name/ID)
        g_user = {'id': jsonResp.player_id, 'name': jsonResp.name};
        log('user: ', g_user);

        // Upload fac member score data to DB
        let lkg = new Date().getTime();
        let scoreData = {'memberID': g_user.id, 'memberName': g_user.name, 'memberLevel': jsonResp.level,
                         'memberScore': g_batStats.score, 'lkg': lkg};
        log('Uploading score data: ', scoreData);
        uploadScoreData(scoreData);

        // Save last attack so we don't mistake previous attacks against same person for this one
        let lastAttackJSON = getLastAttack(jsonResp.attacks);
        let lastAttack = lastAttackJSON.attack;
        g_oldestAttack = lastAttackJSON.id;

        // If we have a saved attack result that hasn't had time to upload,
        // see if it matches this latest attack. If so, upload it.
        let savedOpp = GM_getValue('savedAttack', null);
        if (savedOpp) {
            log('Have previous attack saved!');
            let opponent = JSON.parse(savedOpp);
            log('Opponent: ', opponent);
            log('lastAttack: ', lastAttack);
            if (opponent.id == lastAttack.defender_id) {
                log('Last attack matches saved attack!');
                let res = lastAttack.result.toLowerCase();
                if (res == 'lost' || res == 'assist' || res == 'escape' || res == 'stalemate') {
                    log("Didn't win this one, result = " + res + ". Not reporting.");
                } else {
                    // Could get opponent level and last action here... TBD
                    let result = buildResult(lastAttackJSON, opponent, 'outbound');
                    if (lastAttack.respect_gain && lastAttack.modifiers.fair_fight == 1.00) lastAttack.modifiers.fair_fight == 1.01;
                    if (Number(lastAttack.modifiers.fair_fight) != 1) {
                        log('Uploading attack ' + lastAttackJSON.id);
                        uploadAttackData(result);
                    } else {
                        log('Saved fight NOT uploaded. FF = ' + lastAttack.modifiers.fair_fight);
                    }
                }
            }
            GM_deleteValue('savedAttack');
        }

        // Go through old attacks, incoming ...
        if (findLatestLosses(jsonResp.attacks)) {
            log('Found ' + g_oldLossArray.length + ' old losses not yet uploaded!');
            for (let i = 0; i < g_oldLossArray.length; i++) {
                let attack = g_oldLossArray.pop();
                // Could get opponent level and last action here... TBD
                let opponent = {'id': 0, 'name': '', 'level': 'N/A', 'lastaction': 'N/A', 'result': '', 'lkg': 0, 'when': 0};
                let result = buildResult(attack, opponent, 'inbound'); // Could get level and spy here, maybe...TBD
                                                                       // Wait, we get spy client side?
                log('Uploading a loss: ', result);
                uploadAttackData(result);
            }
        }
    }

    // Out of an attack log, collect losses
    var lossTypes = ["Hospitalized", "Mugged", "Lost", "Attacked"];
    function findLatestLosses(attacks) {
        let keys = Object.keys(attacks);
        log('[findLatestLosses] found ' + keys.length + ' attack entries');
        let oldestAttackTime = GM_getValue('oldestAttackTime', 0);
        for (let i=0; i < keys.length; i++) {
            let key = keys[i];
            let attack = attacks[key];
            if (attack.defender_name != g_user.name) continue;
            if (lossTypes.includes(attack.result) && attack.modifiers.fair_fight > 1) {
                if (attack.timestamp_started > oldestAttackTime) {
                    g_oldLossArray.push({'id': key, 'attack': attack});
                    GM_setValue('oldestAttackTime', attack.timestamp_started);
                }
            }
        }

        log('[findLatestLosses] found ' + g_oldLossArray.length + ' old losses.');
        return g_oldLossArray.length;
    }

    // Callback from the latest attacks query, once fight is over. Prepare to upload to server
    var lastAttackRetries = 0;
    function getAttacksCB(responseText, ID) {
        log('[statsQueryCB]');
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        log('attacks: ', jsonResp);

        let statusLine = document.querySelector("#xedx-status");
        let lastAttackJSON = getLastAttack(jsonResp.attacks);
        let lastAttack = lastAttackJSON.attack;
        let lastAttackId = lastAttackJSON.id;

        // Save this opponent data in case we don't get attack data in time.
        GM_setValue('savedAttack', JSON.stringify(g_opponent));

        let res = lastAttack.result.toLowerCase();
        log('Last attack result: ' + res);
        log('Last Attack opponent ID: ', lastAttack.defender_id);
        if (lastAttack.defender_id != g_opponent.id || g_oldestAttack >= lastAttackId) { // Make sure we have the correct entry!
            if (lastAttack.defender_id != g_opponent.id) log('**** Wrong opponent ID! opp ID: ' + g_opponent.id + ' ID in log: ' + lastAttack.defender_id);
            if (g_oldestAttack <= lastAttackId) log('**** Wrong attack ID! last: ' + g_oldestAttack + ' this: ' + lastAttackId);
            if (lastAttackRetries++ < MAX_REQ_RETRIES) {
                log('Retrying... (#' + lastAttackRetries + ')');
                if (lastAttackRetries % 2 == 0 && lastAttackRetries > 0)
                    statusLine.textContent = 'Waiting for API to catch up (' + (lastAttackRetries/2) + ' secs)';
                return setTimeout(getAttacks, REQUEST_DELAY);
            }
            statusLine.textContent = 'Internal error! Wrong ID in log.';
            return;
        }
        log('Last Attack ID: ', lastAttackJSON.id);
        log('Last Attack: ', lastAttack);
        log('Attack result: ', lastAttack.result);

        // Don't send up junk results.
        // Possibilities: attacked, mugged, lost, assist, special, hospitalized, escape, stalemate, ???
        if (res == 'lost' || res == 'assist' || res == 'escape' || res == 'stalemate') {
            log("Didn't win this one, result = " + res + ". Not reporting.");
            statusLine = document.querySelector("#xedx-status");
            statusLine.textContent = 'Not reporting ' + ((res == 'assist' || res == 'escape') ? 'an ' : 'a ') + res + '...';
            GM_deleteValue('savedAttack');
            return;
        }

        let result = buildResult(lastAttackJSON, g_opponent, /*g_opponent.level, g_opponent.lastaction, g_tornStatSpy,*/ 'outbound');

        // Send to server. Don't bother if FF == 1.00, may be too low or attacker is a recruit.
        // if FF = 1.00, and respect > 0, use 1.01 as FF...
        if (lastAttack.respect_gain && lastAttack.modifiers.fair_fight == 1.00) {
            lastAttack.modifiers.fair_fight == 1.01;
        }
        if (Number(lastAttack.modifiers.fair_fight) != 1) {
            uploadAttackData(result);
        }

        GM_deleteValue('savedAttack');

        if (Number(lastAttack.modifiers.fair_fight) != 1) {
            statusLine.textContent = 'Fight data saved (FF = ' + lastAttack.modifiers.fair_fight + ')';
        } else {
            statusLine.textContent = 'Fight data not uploaded (FF = ' + lastAttack.modifiers.fair_fight + ')';
            log('Respect: ', lastAttack.respect_gain, ' FF: ', lastAttack.modifiers.fair_fight);
        }
    }

    // Merge all stats into a result object for uploading
    // We do this separate from the globals as we need to wait for the last attack
    // to be present to get the FF modifier. We don't need this for previous,
    // incoming attacks.
    function buildResult(attackLog, opponent, direction) {
        let theAttack = attackLog.attack;
        let outbound = (direction == 'outbound');

        opponent.id = outbound ? theAttack.defender_id : theAttack.attacker_id;
        opponent.name = outbound ? theAttack.defender_name : theAttack.attacker_name;
        opponent.result = theAttack.result;

        if (!outbound && !opponent.name && !opponent.id) {
            opponent.name = 'stealthed';
            opponent.id = 'stealthed';
        }
        log('opponent: ', opponent);
        let modifiers = {'ff': theAttack.modifiers.fair_fight,
                         'respect': theAttack.respect_gain};
        log('modifiers: ', modifiers);
        let result = {'attack_result':
                          {'id': attackLog.id, 'user': g_user, 'batstats': g_batStats, 'opponent': opponent, 'modifiers': modifiers},
                      'direction': direction};

        log('Attack Result: ', result);
        log('Attack Result (stringified): ', JSON.stringify(result));

        return result;
    }

    // Upload data via POST to the DB server
    // const uploadServer = 'http://18.119.136.223:8002/batstats/?cmd=saveStats';
    function uploadAttackData(result) {
        let URL = uploadServer + 'saveStats';
        uploadData(URL, result);
    }

    function uploadScoreData(result) {
        let URL = uploadServer + 'saveScore';
        uploadData(URL, result);
    }

    // Upload data via POST to the DB server
    function uploadData(URL, result) {
        log('[uploadData] URL=' + URL);
        GM_xmlhttpRequest ( {
            method: "POST",
            url: URL,
            data: JSON.stringify(result),
            headers:{
                "Content-Type": "Content-Type: application/json"
            },
            onload: function (response) {
                log('[uploadData] response: ', response.responseText);
                log('[uploadData] URL was: ' + UTL);
            },
            onerror: function(error) {
                log("[uploadData] error: ", error);
            }
        } );

    }

    // Calculate the bat stat 'score'
    function calculateScore(batStats) {
        return (Math.sqrt(batStats.speed) + Math.sqrt(batStats.defense) + Math.sqrt(batStats.dexterity) + Math.sqrt(batStats.strength));
    }

    // Get the last attack from the attack log.
    // The attacks are arranged from oldest first, to most recent.
    //
    // While here, also get the last inbound attack? (TBD)
    // Save in local storage and update new inbound ones as we see them?
    //
    function getLastAttack(attacks) {
        let keys = Object.keys(attacks);
        let key = keys[keys.length-1];
        return {'id': key, 'attack': attacks[key]};
    }

    // Check the status of the fight periodically, once it appears, the fight is over, one way or another.
    function checkRes() {
        let sel = document.querySelector("#defender > div.playerArea___W1SRh > div.modal___EfpxI.defender___vDcLc > div > div > div.title___VHuxs");
        if (sel) {
            let result = sel.innerText;
            if (result) {
                let resultlc = result.toLowerCase();
                log('Result: ', sel.innerText);
                log('***** Fight Over! *****');
                if (g_intId) clearInterval(g_intId);
                g_intId = null;

                // Add a staus indicator to header div
                let titleBar = document.querySelector("#react-root > div > div.appHeaderAttackWrap___OHuE_ > " +
                                              "div > div.topSection___OilHR > div.titleContainer___LJY0N"); // > h4");
                // Note: container is flex, so 2nd span centers the first.
                $(titleBar).append('<span id="xedx-status" style="color: red; font-size: 18px;">&nbsp</span>' +
                                   '<span>&nbsp</span>');

                let statusLine = document.querySelector("#xedx-status");

                if (resultlc.indexOf('maximum') > -1 || resultlc.indexOf("can't attack") > -1 ||
                    resultlc.indexOf('cannot be attacked') > -1 || resultlc.indexOf('enough energy') > -1) {
                    statusLine.textContent = 'No attack to log.';
                    return;
                }

                if (resultlc.indexOf('lost') > -1) {
                    statusLine.textContent = 'Bummer, you Lost!';
                    log('Bummer, you Lost!');
                    return;
                }
                // Something like 'you hospitalized, you mugged, ...
                log('Good news, you won!');

                statusLine.textContent = 'Preparing to upload fight data...';
                setTimeout(getAttacks, REQUEST_DELAY); // Give time for fight stats to get there.
            }
        }
    }

    // See if we have a spy from TornStats
    function tornStatSpyCB(respText) {
        let batStats = 0;
        let data = JSON.parse(respText);
        log('Spy response: ' + respText);
        if (!data.status) {
            log('Error getting spy! Response text: ' + resptext);
        } else {
            if (data.spy.status) {
                /*
                g_tornStatSpy = {speed: data.spy.speed,
                               strength: data.spy.strength,
                               defense: data.spy.defense,
                               dexterity: data.spy.dexterity,
                               total: data.spy.total,
                               when: data.spy.difference};
                */

                g_opponent.lkg = data.spy.total;
                g_opponent.when = data.spy.difference;
            }
        }
    }

    function handlePageLoad() {
        log('[handlePageLoad]');
        g_intId = setInterval(checkRes, 250); // Check for fight result.
        const params = new URLSearchParams(location.search);
        g_opponent.id = params.get('user2ID');
        xedx_TornStatsSpy(g_opponent.id, tornStatSpyCB);
        queryOpponentLevel(g_opponent.id);
        log('[handlePageLoad] Opponent ID: ' + g_opponent.id);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    getBatStats(); // Get my stats, in preparation for fight to end...

    handlePageLoad();

})();