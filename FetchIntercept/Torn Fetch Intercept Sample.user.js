// ==UserScript==
// @name         Torn Fetch Intercept Sample
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @connect      api.torn.com
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

    // Just so I know I'm running...
    logScriptStart();

    ///////////////////////////////////////////////
    // Could call this, replaces as a promise in a slightly diff fashion.
    // This is exactly what TT does
    /*
    function interceptFetch(channel) {
	    const oldFetch = window.fetch;
	    window.fetch = function () {
		    return new Promise((resolve, reject) => {
			    oldFetch
				    .apply(this, arguments)
				    .then(async (response) => {
					    const page = response.url.substring(response.url.indexOf("torn.com/") + "torn.com/".length, response.url.indexOf(".php"));
					    let json = {};
					    try {
						    json = await response.clone().json();
					    } catch {}

					    const detail = {
						    page,
						    json,
						    fetch: {
							    url: response.url,
							    status: response.status,
						    },
					    };

					    //window.dispatchEvent(new CustomEvent(channel, { detail }));
                        log("Fetch result: ", detail);

					    resolve(response);
				    })
				    .catch((error) => {
					    reject(error);
				    });
		    });
	    };
    } // End 'interceptFetch' function
    */
    //////////////////////////////////////////////


    ////////////////////////////////////////////////
    // Another similar approach
    // Save original fetch
    //const { fetch: originalFetch } = window;
    const originalFetch = window.fetch;

    // Intercept any other fetch
    window.fetch = async (...args) => {
        let [resource, config ] = args;

        // request interceptor starts
        log("FETCH: request: resource = ", resource, " config = ", config);
        // request interceptor ends

        const response = await originalFetch(resource, config);

        // response interceptor here
        log("FETCH: response = ", response);

        // Make sure original requestor actually still works :-)
        return response;

    }; // End replacement fetch

    log("Inserted Fetch interceptor");
    ////////////////////////////////////////////////

    // AJAX interceptor
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        log('XMLHTTP request started! ', this);
        this.addEventListener('load', function() {
            log('XMLHTTP request completed! ', this);

            log(this.readyState);   // will always be 4 (ajax is completed successfully)
            log(this.responseText); // whatever the response was
        });
        origOpen.apply(this, arguments);
    };
    log("Inserted AJAX interceptor");

})(); // End script