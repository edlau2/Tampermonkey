// ==UserScript==
// @name         Torn Find Range Test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Test script to view crime responses
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=crimes*
// @match        https://torn.com/loader.php?sid=crimes*
// ==/UserScript==

(function() {
    'use strict';

    const isTampermonkeyEnabled = typeof unsafeWindow !== 'undefined';
    const win = isTampermonkeyEnabled ? unsafeWindow : window;
    const {fetch: originalFetch} = win;
    let currentCrimesByTypeData;

    // ==================================================================================================================
    // Build a mini web page and disply it, from data collected
    // Data collected and displayed:
    //
    // "multiplierUsed": afterTargetState.multiplierUsed: acceleration
    // "pip": afterTargetState.pip: start cell #
    // "actionMax": afterTargetState.actionMax: strong_forward, soft_forward, accelerator and backup
    // "actionMin": afterTargetState.actionMin: strong_forward, soft_forward, accelerator and backup
    //
    function logTheObj(obj) {
        var ret = "";
        for (var o in obj) {
            var data = obj[o];
            if (typeof data !== 'object') {
                ret += "<li>" + o + " : " + data + "</li>";
            } else {
                ret += "<li>" + o + " : " + logTheObj(data) + "</li>";
            }
        }
        return "<ul>" + ret + "</ul>";
    }

    function displayTheData(additionalData) {
        var newWin = open("", "_blank",
              "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=780,height=200");
        newWin.document.body.innerHTML = `<h1>Test Result</h1><div id="myTest">` + logTheObj(additionalData) + `</div>`;
    }

    // ==================================================================================================================
    // Hook fetch, parse the response data and save it
    //
    win.fetch = async (...args) => {
        let [resource, config] = args;
        return originalFetch(resource, config).then(response => detectCrimeDataRequest(resource, response));
    };

    // See if it's a crime result
    function detectCrimeDataRequest(resource, response) {
        if(!(resource.includes("sid=crimesData"))) return response;
        if (resource.includes("step=attempt")) response.clone().text().then(body => handleCrimeAttempt(body, resource));
        if (resource.includes("step=crimesList")) response.clone().text().then(body => handleCrimesList(body, resource));
        return response;
    }

    function handleCrimeAttempt(body, resource) {
        //Most likely cloudflare turnstyle or server error
        if(body.includes("!DOCTYPE")) {
            console.error("[Range Test] Unexpected HTML data, skipping...");
            return;
        }
        try {
            let data = JSON.parse(body);
            if (data.error) {
                console.log("[Range Test] Failed crime attempt: " + data.error);
                console.log(JSON.stringify(data));
                return;
            }
            if (!(data.DB && data.DB.outcome)) return;
            if(data.DB.outcome.result === "error") {
                console.log("[[Range Test]] Failed crime attempt.");
                console.log(JSON.stringify(data));
                return;
            }
            let typeID = resource.split("typeID=")[1].split("&")[0];
            getAdditionalData(data.DB.crimesByType, typeID, resource);
            currentCrimesByTypeData = data.DB.crimesByType;

        } catch (e) {
            console.error("[[Range Test]] Error parsing data:", body, e);
        }
    }

    function handleCrimesList(body, resource) {
        console.log("[[Range Test]] Updating crimes data.");
        if(body.includes("!DOCTYPE")) return;

        try {
            let data = JSON.parse(body);
            if (data.error) {
                console.log("[OutcomeDB] Failed crimesList: " + data.error);
                return;
            }
            if (!(data.DB && data.DB.crimesByType)) return;
            currentCrimesByTypeData = data.DB.crimesByType;
        } catch (e) {
            console.error("[[Range Test]] Error parsing data:", body, e);
        }
    }

    function getAdditionalData(attemptData, typeID, resource) {
        try {
            if(typeID === "12") return extractScammingData(attemptData, resource);
            return null;

        } catch(error) {
            console.error("[[Range Test]] Additional data failed, skipping:", error);
            return null;
        }
    }

    function extractScammingData(attemptData, resource) {
        if(!currentCrimesByTypeData) return null;

        //Is it linked to a target?
        if(!(resource.includes("value1"))) return null;
        let subID = resource.split("value1=")[1].split("&")[0];

        //Get target states
        let beforeTargetState = currentCrimesByTypeData.targets.find((target) => {return target.subID.includes(subID);});
        let afterTargetState = attemptData.targets.find((target) => {return target.subID.includes(subID);});

        let additionalData = {};


         additionalData.targetAfter = {
                "multiplierUsed": afterTargetState.multiplierUsed,
                "pip": afterTargetState.pip,
                "actionMax": afterTargetState.actionMax,
                "actionMin": afterTargetState.actionMin
            };

        // Build/display  the report
        displayTheData(additionalData);

        return additionalData;
    }

})();