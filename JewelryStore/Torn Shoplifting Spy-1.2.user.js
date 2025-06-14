// ==UserScript==
// @name         Torn Shoplifting Spy
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Spies on varies stores to report on the status of the guards and cameras.
// @author       xedx [2100735]
// @run-at       document-end
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
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


    const searchParams = new URLSearchParams(location.search);
    var  hashParams = new URLSearchParams(location.hash);
    const queryCrime = () => { xedx_TornTornQuery('', 'shoplifting', crimeQueryCb); }
    const lastCheckKey = "lastCheck";
    const lastAlertKey = "lastAlert";
    const apiCallInterval = 10000;      // Time between API calls
    const alertDisplayInterval = 60000;
    const alertTimeout = 30000;
    var callTimer;

    const checkBigAls = false;
    var allTargets = {};

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
        log("targets: ", targets);
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

        allTargets = JSON.parse(JSON.stringify(targets));
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

    function hashChangeHandler() {
        hashParams = new URLSearchParams(location.hash);
        debug("[hashChangeHandler]: ", location.hash, hashParams);

        callOnContentLoaded(handlePageLoad);
    }

    // ====================== initialization, UI ==========================

    const sectionMap = [{ "idx": 0, "name": "Sally's Sweet Shop", "key": "sallys_sweet_shop" },
                        { "idx": 1, "name": "Bits 'n' Bobs",      "key": "Bits_n_bobs" },
                        { "idx": 2, "name": "TC Clothing",        "key": "tc_clothing" },
                        { "idx": 3, "name": "Super Store",        "key": "super_store" },
                        { "idx": 4, "name": "Pharmacy",           "key": "pharmacy" },
                        { "idx": 5, "name": "Cyber Force",        "key": "cyber_force" },
                        { "idx": 6, "name": "Jewelry Store",      "key": "jewelry_store" },
                        { "idx": 7, "name": "Big Al's Gun Shop",  "key": "big_als"} ];

    // Simple options 'panels' to select what to watch
    function installOptPanels(retries=0) {
        let nameOptSections =
            $(`.crime-root.shoplifting-root [class*='currentCrime'] [class*='virtualList'] .virtual-item .crime-option ` +
              `[class*='crimeOptionSection']:nth-child(2)`);
        let namesLen = $(nameOptSections).length;
        if (namesLen < 8) {
            if (retries++ < 40) return setTimeout(handlePageLoad, 250, retries);
            return log("[installOptPanels] timed out");
        }
        for (let idx=0; idx<$(nameOptSections).length; idx++) {
            let section = $(nameOptSections)[idx];
            if ($(section).attr('data-optOn') == true) continue;
            log("Section #", idx, " text: ", $(section).text());
            let crime = allTargets[sectionMap[idx].key];
            log("crime entry: ", crime);
            //if (idx == 6) {
                let id = 'ct_' + idx;
                let newDiv = buildOptsDiv(id, crime);
                $(section).append(newDiv);
                $(section).css('position', 'relative');
                $(section).attr('data-optOn', true);
                log("Added opts div: ", $(`#${id}`));
            //}
        }
    }

    function handlePageLoad(retries=0) {
        log("[handlePageLoad] ");

        installOptPanels();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    startPolling();

    addStyles();

    log("searchParams: ", searchParams, " hashParams: ", hashParams);
    log("searchParams: ", searchParams.size, " hashParams: ", hashParams.size);
    log("searchParams: ", $(searchParams).length); //, " hashParams: ", hashParams.size);

    callOnHashChange(hashChangeHandler);
    if (searchParams.size > 0 && searchParams.get('sid') == 'crimes') {
        callOnContentLoaded(handlePageLoad);
    }

    // ================= CSS styles and UI elements ==============================

    function buildOptsDiv(id, crime) {
        let len = crime.length;
        log("buildOptsDiv: ", len, $(crime).length, crime);
        let visible = (len < 2) ? "hidden" : "visible";
        let title1 = crime[0].title;
        let title2 = (len == 2) ? crime[1].title : "";
        let optDiv =
            `<div id=${id} class="accordion stick-ur">
                <div class="accordion-body">
                    <div>

                        <div class="inner-acc->
                            <div class="spy-table grad-black">
                                <span>
                                    <label>
                                        <input type='checkbox' class='opt-cb' name='enabled'>
                                    </label>
                                </span>
                            </div>

                            <div style="display: flex; flex-direction: column;">
                                <span>
                                    <label>${crime[0].title}
                                            <input type='checkbox' name='cam'>
                                    </label>
                                </span>

                                <span style="visibility: ${visible};">
                                    <label>${((len == 2) ? crime[1].title : "")}
                                        <input type='checkbox' name='guards'>
                                    </label>
                                </span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>`;

        return optDiv;
    }

    function addStyles() {

        GM_addStyle(`
            .spy-table {
                padding: 5px;
                background-color: #333;
            }
            .spy-table td {
                padding: 5px 5px 5px 10px;
                color: white;
            }
            .spy-table > tbody > tr > td:first-child {
                align-content: center;
                justify-content: left;
            }
            .spy-table > tbody > tr {
                margin: 5px 10px 2px 5px;
            }
            .spy-table > tbody > tr > td:last-child {
                margin: 2px 10px 5px 5px;
                display: flex;
                justify-content: flex-end;
                width: 160px;
            }
            .spy-table > tbody > tr > td:first-child {
                display: flex;
                flex-flow: ow wrap;
                align-content: center;
                justify-content: flex-begin;
                padding-left: 10px; width: 20%;
            }
            .spy-table > tbody > tr > td:last-child { padding-right: 10px; }

            .grad-black {
                color: #EEE;
                text-shadow: 0 0 5px #000;
                background: linear-gradient(180deg, #111111 0%, #555555 25%, #333333 60%, #333333 78%, #111111 100%);
                border: 1px solid #111;
            }
        `);

        // To 'grow' from fixed edge:
        // transform-origin: top; (for example)
        // Can scale each axis independently: scale(x, y)
        // fixed, centered

        // Better way, 0 to auto: using gride
        GM_addStyle(`
            .accordion-body {
              display: grid;
              grid-template-rows: 0fr;
              transition: 250ms grid-template-rows ease;
            }

            .accordion:hover .accordion-body {
              grid-template-rows: 1fr;
            }

            .accordion-body > div {
              overflow: hidden;
              display: flex;
              flex-flow: row wrap;
            }
        `);

        GM_addStyle(`
            .stick-ur {
                position: absolute;
                top: 0px;
                right: 10px;
                height: 50px;
            }
        `)
    }


    function unusedStylesforRef() {
        GM_addStyle(`
            .container {
              /* Set position: relative for the container to act as a reference for the absolute positioned element */
              position: relative;
              width: 300px; /* Example width */
              height: 200px; /* Example height */
              border: 1px solid black; /* Example border */
            }

            .growing-element {
              /* Anchor the element within the container */
              position: absolute;
              top: 50%;
              left: 50%;
              /* Use transform to center the element and allow scaling */
              transform: translate(-50%, -50%);
              /* Initial size */
              width: 100px;
              height: 100px;
              background-color: lightblue; /* Example background */
              /* Add transition for smooth scaling */
              transition: transform 0.3s ease;
            }

            .growing-element:hover {
              /* Scale the element on hover */
              transform: translate(-50%, -50%) scale(1.5); /* Scales to 150% of original size */
            }

        `);

        // upper right, container relative
        GM_addStyle(`
            .fixed-and-scalable {
              position: absolute;
              top: 10px;
              right: 10px;
              width: 100px;
              height: 50px;
              background-color: blue;
              color: white;
              transition: transform 0.3s ease-in-out; /* Smooth transition for scaling */
            }

            .fixed-and-scalable:hover {
              transform: scale(1.5); /* Scale up on hover */
            }
        `);

        // Smooth expand height from 0 to max
        GM_addStyle(`
            #menu #list {
                max-height: 0;
                transition: max-height 0.50s ease-out;
                overflow: hidden;
                background: #d5d5d5;
            }

            #menu:hover #list {
                max-height: 500px;
                transition: max-height 0.50s ease-in;
            }
        `);


    }

})();