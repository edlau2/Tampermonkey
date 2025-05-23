// ==UserScript==
// @name         Torn YATA Bat Stats
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script populates the YATA RW page with TS spies
// @author       xedx [2100735]
// @match        https://yata.yt/faction/war/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @connect      www.tornstats.com
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

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    class Queue {
      constructor() {this.items = [];}
      enqueue(element) {this.items.push(element); }
      dequeue() { return this.isEmpty() ? "Queue is empty" : this.items.shift(); }
      peek() { return this.isEmpty() ? "Queue is empty" : this.items[0];}
      isEmpty() {return this.items.length === 0;}
      size() { return this.items.length;}
      print() {log(this.items.join(" -> "));}
    }

    var facName;
    var facSpies;

    var spiesWaiting = new Queue();

    function putSpyInRow(id) {
        let spy = facSpies[id];
        if (!spy) return log("Error: no spy for ", id);

        $(`tr[data-val='${id}'] > td:nth-child(3)`).text(spy.strength);
        $(`tr[data-val='${id}'] > td:nth-child(4)`).text(spy.defense);
        $(`tr[data-val='${id}'] > td:nth-child(5)`).text(spy.speed);
        $(`tr[data-val='${id}'] > td:nth-child(6)`).text(spy.dexterity);
        $(`tr[data-val='${id}'] > td:nth-child(7)`).text(spy.total);
    }

    const units = ["K", "M", "B", "T", "Q"];
    function formatStat(statIn) {
        let stat = Number.parseInt(statIn);
        if (Number.isNaN(stat) || stat == 0) return statIn;
        for (let j = 0; j < units.length; j++) {
          stat = stat / 1000;
          if (stat > 1000) continue;
          stat = stat.toFixed(2);
          stat = `${stat}${units[j]}`;
          break;
        }

        return stat;
    }

     function getTornSpyCB(respText, ID) {
        let data = null;
        try {
            data = JSON.parse(respText);
        } catch (e) {
            log('Error parsing JSON: ', e);
        }
        if (!data || !data.status) {
            log('Error getting spy!', data);
        } else {
            if (data.spy.status) {
                let jsonSpy = {id: ID,
                           speed: formatStat(data.spy.speed),
                           strength: formatStat(data.spy.strength),
                           defense: formatStat(data.spy.defense),
                           dexterity: formatStat(data.spy.dexterity),
                           total: formatStat(data.spy.total)};
                debug('Spy result: ', jsonSpy);
                facSpies[ID] = JSON.parse(JSON.stringify(jsonSpy));
                GM_setValue(facName, JSON.stringify(facSpies));

                putSpyInRow(ID);
            }
        }
    }

    function doOneSpy() {
        if (spiesWaiting.isEmpty()) return debug("[doOneSpy] Queue is empty...");
        let id = spiesWaiting.dequeue();
        xedx_TornStatsSpy(id, getTornSpyCB);
    }

    var spyReqsActive = 0;  //not needed?
    var queueTimer;
    function getFacSpies(retries=0) {
        let members = $("#faction-targets > tbody > tr");
        log("Found ", $(members).length, " members for ", facName);
        if (!$(members).length) {
            if (retries++ < 20) return setTimeout(getFacSpies, 250, retries);
            return log("getFacSpies: timeout");
        }

        for (let idx=0; idx<$(members).length; idx++) {
            let member = $(members)[idx];
            let id = $(member).attr("data-val");
            debug("Got member: ", id);

            let spy = facSpies[id];
            debug("Spy: ", spy);
            if (spy) {
                putSpyInRow(id);
                continue;
            }

            spiesWaiting.enqueue(id);
            if (!queueTimer) {
                queueTimer = setInterval(doOneSpy, 5000);
                doOneSpy();
            }
        // xedx_TornStatsSpy(ID, getTornSpyCB);
        }
    }


    function handlePageLoad(retries=0) {
        // $("#faction-targets > tbody")
        let facNameNode = $("#war-status > div > table > tbody > tr > td:nth-child(1) > a");
        if (!$(facNameNode).length) {
            if (retries++ < 20) return setTimeout(handlePageLoad, 250, retries);
            return log("handlePageLoad: timeout");
        }
        facName = $(facNameNode).text();
        log("War against ", facName);
        facSpies = JSON.parse(GM_getValue(facName, JSON.stringify({})));

        getFacSpies();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    validateApiKey();
    versionCheck();

    addStyles();


    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {

    }

})();