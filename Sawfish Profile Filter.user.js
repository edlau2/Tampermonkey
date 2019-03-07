// ==UserScript==
// @name         Sawfish Profile Filter
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  When opening user's profile in a new tab, will filter based on custom criteria
// @author       xedx [2100735]
// @include      https://www.torn.com/profiles.php*
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function($) {
    'use strict';

    //////////////////////////////////////////////////////////////////
    // Using the Torn API, query a user's profile info
    //////////////////////////////////////////////////////////////////

    var api_key = GM_getValue('gm_api_key');
    function submitProfileQuery(ID) {
        GM_xmlhttpRequest({
            method:"POST",
            url:"https://api.torn.com/user/" + ID + "?selections=profile&key=" + api_key,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                applyJobFilter(response.responseText, ID);
            },
            onerror: function(response) {
                handleProfileError(response.responseText);
            }
        });
    }

    //////////////////////////////////////////////////////////////////////
    // Very simple error handler; only displayed (and logged) once
    //////////////////////////////////////////////////////////////////////

    var errorLogged = false;
    function handleProfileError(responseText) {

        if (responseText != "") {
            if (!errorLogged) {
                var jsonResp = JSON.parse(responseText);
                var errorText = 'An error has occurred querying profile information.\n' +
                    '\nCode: ' + jsonResp.error.code +
                    '\nError: ' + jsonResp.error.error;

                // Likely will not happen with this script....
                if (jsonResp.error.code == 5) {
                    errorText += '\n\n The Torn API only allows so many requests per minute. ' +
                        'If this limit is exceeded, this error will occur. It will clear itself' +
                        'up shortly, or you may try refreshing the page.\n';
                }

                errorText += '\nPress OK to continue.';
                alert(errorText);
                console.log(errorText);
                errorLogged = true;
            }
        } else {
            // Unknown error.
        }
    }

    //////////////////////////////////////////////////////////////////
    // This is where the filtering takes place.
    //
    // For now, simple rules. We check the JSON response for
    // a job.company_id value of 0; this wil be the case if the
    // user either has no job or is in a 'starter' job. Anyone in
    // any position in a company will have this set to the company
    // ID.
    //
    // If the user is in a company, attempt to close the current tab.
    // This may or may not work.
    //////////////////////////////////////////////////////////////////

    function applyJobFilter(responseText, ID) {
        var jsonResp = JSON.parse(responseText);
        if (!jsonResp.job.company_id) {
            console.log("Closing tab for user ID " + ID + ", user has no company info.");
            alert("User has no job! The bum...\n\nPress OK and tab will close.");
            setTimeout (window.close, 0);
        }
    }

    //////////////////////////////////////////////////////////////////
    // Kicks off the whole shebang, queries a user's profile
    // based on user ID
    //////////////////////////////////////////////////////////////////

    function filterByJob() {
        // Get user ID from URL
        var url = document.URL;
        var parts = url.split('=');
        var parts2 = parts[1].split('#');
        var ID = parts2[0];

        // Submit query to get job info.
        submitProfileQuery(ID);
    }

    //////////////////////////////////////////////////////////////////
    // Main. Using a MutationObserver allows us to be notified
    // whenever the root of the 'User Profile' section (the
    // <div id="profileroot"> section) changes/updates. It is
    // probably over-aggressive to trigger on all 3 actions...
    //////////////////////////////////////////////////////////////////

    console.log("Sawfish Profile Filter script started!");

    // Make sure we have an API key
    api_key = GM_getValue('gm_api_key');
    if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
        api_key = prompt("Please enter your API key.\n" +
                         "Your key will be saved locally so you won't have to be asked again.\n" +
                         "Your key is kept private and not shared with anyone.", "");
        GM_setValue('gm_api_key', api_key);
    }

    var targetNode = document.getElementById('profileroot');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        observer.disconnect();
        filterByJob();
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

})();