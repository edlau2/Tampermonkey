// ==UserScript==
// @name         Simplest API test
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Count camels
// @author       kontamusse
// @match        https://www.torn.com/imarket.php*
// @connect      api.torn.com
// @xedx-require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// Alot of the 'grants', above, are used by my helper lib, not needed here...'cept get/setValue
// @xedx-require is just my helper lib, commented out.

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint curly: 0*/

(function() {
    'use strict';

    // Normally, I have this in my helper lbrary, so it's all one call at script start.
    var api_key = GM_getValue('gm_api_key');

    async function validateApiKey(type = null) {
        let text = GM_info.script.name + "Says:\n\nPlease enter your API key.\n" +
                             "Your key will be saved locally so you won't have to be asked again.\n" +
                             "Your key is kept private and not shared with anyone.";
        if (type == 'FULL')
            text += '\n\nA full access key is required!';
        else
            text += '\n\nOnly limited access is required';

        if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
            api_key = prompt(text, "");
            GM_setValue('gm_api_key', api_key);
        }

        if (type == 'FULL') {

        }
    }

    // Callback for API call
    var countCamels = 0;
    function CountCamelsCallback(responseText) {
        console.log("API call completed!");

        if (responseText == undefined) {
            console.log("Error querying user stats - no result!");
            return;
        }

        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            //if (jsonResp.error.code == 6)
            //    return;
            //return handleError(responseText);
            console.log("Response error " + jsonResp.error);
            return;
        }

        let data = jsonResp;
        for (let i = 0; i < data.inventory.length; i++) {
            if (data.inventory[i].ID == "384") {
                countCamels = data.inventory[i].quantity;
                let msg = "I have " + countCamels + " camels";
                console.log(msg);
                alert(msg);
                return;
            }
        }
    }

    function CountCamels() {
        let urlApi = `https://api.torn.com/user/?selections=inventory&key=` + api_key;
        console.log(urlApi);

        GM_xmlhttpRequest({
            method:"POST",
            url:urlApi,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                CountCamelsCallback(response.responseText);
            },
            // Error handling func is provided in my helper lib, do what you will here, like log it...
            onerror: function(response) {
                //handleSysError(response);
            },
            onabort: function(response) {
                //handleSysError(response);
            },
            ontimeout: function(response) {
                //handleSysError(response);
            }
        });

        console.log("Waiting for API to complete...");
    }

    function handlePageLoad() {
        // Can check for any required DIV here and setTimeout() if not available,
        // or trigger any required API calls...
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    validateApiKey();

    // Here I would call my function to do any pre-loading, like API calls, that I may need,
    // and in their callbacks, do whatever I need to do. Or, I may wait until page content
    // has laoded enough for me to insert any UI elements or do page scraping. In this example,
    // I'll manually do an API call and print the result from the callback. I have a simple call
    // in my wrapper lib to do this and handle errors, here I'll do it the long way.
    //callOnContentLoaded(handlePageLoad);

    CountCamels();

    // Can do other stuff here...
    console.log("Script is still executing...");


})();