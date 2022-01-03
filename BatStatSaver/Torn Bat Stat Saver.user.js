// ==UserScript==
// @name         Torn Bat Stat Saver
// @namespace    http://tampermonkey.net/
// @version      0.2
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
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const userQuery = 'https://api.torn.com/user/?selections=attacks,battlestats&key=';
    const uploadServer = 'http://18.119.136.223:8002/batstats/?cmd=saveStats';
    var opponentID = 0;
    var opponentLevel = 0;
    var opponentLastAction = 0;
    var intId = null;
    var tornStatSpy = null;

    // Get the basic details (namely level) of the opponent
    function queryOpponentLevel(opponentID) {
        xedx_TornUserQuery(opponentID, 'profile', profileQueryCB);
    }

    // Callback from above
    function profileQueryCB(responseText, ID) {
        log('[profileQueryCB]');
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        if (loggingEnabled) {console.log(GM_info.script.name + 'basic: ', jsonResp);}

        opponentLevel = jsonResp.level;
        opponentLastAction = jsonResp.last_action.relative;
    }

    // Query stats: attacks and bat stats.
    function getBatStats() {
        log('[getBatStats]');
        xedx_TornUserQuery(null, 'attacks,battlestats,basic', statsQueryCB);
    }

    // Parse the result, prepare to upload to server
    function statsQueryCB(responseText, ID) {
        log('[statsQueryCB]');
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        if (loggingEnabled) {console.log(GM_info.script.name + 'attacks,battlestats: ', jsonResp);}

        let batStats = {'strength': jsonResp.strength,
                        'speed': jsonResp.speed,
                        'dexterity': jsonResp.dexterity,
                        'defense': jsonResp.defense,
                        'total': jsonResp.total,
                        'score': 0};
        console.log('batstats: ', batStats);
        let score = calculateScore(batStats);
        log('Calculated score: ' + score);
        batStats.score = score;

        let lastAttackJSON = getLastAttack(jsonResp.attacks);
        let lastAttack = lastAttackJSON.attack;
        let res = lastAttack.result.toLowerCase();
        console.log('Last attack result: ' + res);
        console.log('Last Attack opponent ID: ', lastAttack.defender_id);
        if (lastAttack.defender_id != opponentID) { // Make sure we have the correct entry!
            log('**** Wrong attack! opp ID: ' + opponentID + ' ID in log: ' + lastAttack.defender_id);
            //return;
        }
        console.log('Last Attack ID: ', lastAttackJSON.id);
        console.log('Last Attack: ', lastAttack);
        console.log('Attack result: ', lastAttack.result);

        // Don't send up junk results.
        // Possibilities: attacked, mugged, lost, assist, special, hospitalized, escape, stalemate, ???
        if (res == 'lost' || res == 'assist' || res == 'escape' || res == 'stalemate') {
            log("Didn't win this one, result = " + res + ". Not reporting.");
            return;
        }

        let opponent = {'id': opponentID,
                        'name': lastAttack.defender_name,
                        'level': opponentLevel,
                        'lastaction': opponentLastAction,
                        'result': lastAttack.result,
                        'lkg': tornStatSpy ? tornStatSpy.total : 0,
                        'when': tornStatSpy ? tornStatSpy.when : 0};
        console.log('opponent: ', opponent);
        let user = {'id': jsonResp.player_id, 'name': jsonResp.name};
        let modifiers = {'ff': lastAttack.modifiers.fair_fight,
                         'respect': lastAttack.respect_gain};
        console.log('modifiers: ',modifiers);
        let result = {'attack_result': {'id': lastAttackJSON.id, 'user': user, 'batstats': batStats, 'opponent': opponent, 'modifiers': modifiers}};

        console.log('Attack Result: ', result);
        console.log('Attack Result (stringified): ', JSON.stringify(result));

        // Send to server. Don't bother if FF == 1.00, may be too low or attacker is a recruit.
        if (Number(lastAttack.modifiers.fair_fight) != 1) {
            uploadAttackData(result);
        }

        // Put an indicator in the attack window.
        let titleBar = document.querySelector("#react-root > div > div.appHeaderAttackWrap___OHuE_ > " +
                                              "div > div.topSection___OilHR > div.titleContainer___LJY0N"); // > h4");
        if (Number(lastAttack.modifiers.fair_fight) != 1) {
            $(titleBar).append('<span style="color: red; font-size: 18px;">Fight data saved (FF = ' +
                           lastAttack.modifiers.fair_fight + ')</span>');
        } else {
            $(titleBar).append('<span style="color: red; font-size: 18px;">Fight data not uploaded (FF = ' +
                           lastAttack.modifiers.fair_fight + ')</span>');
        }
    }

    // Upload data via POST to the DB server
    function uploadAttackData(result) {
        log('[uploadAttackData]');
        GM_xmlhttpRequest ( {
            method: "POST",
            url: uploadServer,
            data: JSON.stringify(result),
            headers:{
                "Content-Type": "Content-Type: application/json"
            },
            onload: function (response) {
                console.log(response.responseText);
            },
            onerror: function(error) {
                console.log("error: ", error);
            }
        } );

    }

    // Calculate the bat stat 'score'
    function calculateScore(batStats) {
        return (Math.sqrt(batStats.speed) + Math.sqrt(batStats.defense) + Math.sqrt(batStats.dexterity) + Math.sqrt(batStats.strength));
    }

    // Get the last attack from the attack log.
    function getLastAttack(attacks) {
        let keys = Object.keys(attacks);
        console.log('Keys: ', keys, ' length: ', keys.length);
        let len = keys.length;
        let key = keys[len-1];
        log('Key: ' + key);
        let la = attacks[key];
        console.log('Last Attack: ', la);
        return {'id': key, 'attack': la};
    }

    // Check the status of the fight periodically, once it appears, the fight is over, one way or another.
    function checkRes() {
        let sel = document.querySelector("#defender > div.playerArea___W1SRh > div.modal___EfpxI.defender___vDcLc > div > div > div.title___VHuxs");
        if (sel) {
            let result = sel.innerText;
            if (result) {
                let resultlc = result.toLowerCase();
                // TBD: get list of results...
                // THIS PERSON IS CURRENTLY IN HOSPITAL AND CANNOT BE ATTACKED
                // Possibilities: attacked, mugged, lost, assist, special, hospitalized, escape, stalemate, ???
                console.log('Result: ', sel.innerText);
                log('***** Fight Over! *****');

                if (resultlc.indexOf('cannot be attacked') > -1) return;

                if (intId) clearInterval(intId);
                if (resultlc.indexOf('lost') > -1) {
                    log('Bummer, you Lost!');
                    return;
                }
                // Something like 'you hospitalized, you mugged, ...
                log('Good news, you won!');
                setTimeout(getBatStats, 2000); // Give time for fight stats to get there.
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
                tornStatSpy = {speed: data.spy.speed,
                               strength: data.spy.strength,
                               defense: data.spy.defense,
                               dexterity: data.spy.dexterity,
                               total: data.spy.total,
                               when: data.spy.difference};
            }
        }
    }

    function handlePageLoad() {
        log('[handlePageLoad]');
        intId = setInterval(checkRes, 250); // Check for fight result.
        const params = new URLSearchParams(location.search);
        opponentID = params.get('user2ID');
        xedx_TornStatsSpy(opponentID, tornStatSpyCB);
        queryOpponentLevel(opponentID);
        log('[handlePageLoad] Opponent ID: ' + opponentID);
    }
 
    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    handlePageLoad();

})();
