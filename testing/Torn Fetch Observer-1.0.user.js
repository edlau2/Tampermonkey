// ==UserScript==
// @name         Torn Fetch Observer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @match        https://www.torn.com/loader.php*sid=attack&user2ID*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const log = function (...data) { console.log(GM_info.script.name + ': ', ...data); }

    log("Script started");

    function logResponse(r) {
        log("[logResponse]:\n", JSON.stringify(r, null, 4));
    }

    const { fetch: originalFetch } = unsafeWindow;
    unsafeWindow.fetch = async (...args) => {
    var [resource, config] = args;
    var response = await originalFetch(resource, config);
    const json = () => response.clone().json()
    .then((data) => {
        data = { ...data };

        log("URL: ", response.url);
        if (data?.DB) {
            log("[orgFetch] DB entries:");
            log(JSON.stringify(data.DB, null, 4));
        }
            //for (let entry of Object.entries(data.DB)) {
            //    log(entry);
            //}
            //log(JSON.stringify(data, null, 4));
        //}

        /*
        if(response.url.indexOf('?sid=attackData') != -1) {
            if(data.DB.error?.includes('in hospital') || data.DB.error?.includes('unconscious') || data.DB.error?.includes('This fight no longer exists')) {
                data.DB.defenderUser.playername += ' [Hospital]'
                delete data.DB.error
                delete data.startErrorTitle
            }
        }

        if(response.url.indexOf('page.php?sid=factionsProfile&step=getInfo') != -1) {
            if (hide_faction_desc === "true") {
                data.faction.description = 'Blocked by Walla Walla'
            }
        }
        */

        return data;
    })

    response.json = json;
    response.text = async () =>JSON.stringify(await json());

    // ===========
    log("response.url: ", response.url);
    response.json().then( r => logResponse(r));
    // ===========


    return response;
};

})();