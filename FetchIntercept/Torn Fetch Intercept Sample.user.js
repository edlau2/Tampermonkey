// ==UserScript==
// @name         Torn Fetch Intercept Sample
// @namespace    http://tampermonkey.net/
// @version      0.2
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

    // Stuff to intercept chat
    const spyAllMsgs = true;       // Set to false to reduce chat clutter
    const secret = $('script[secret]').attr("secret");
    const userID = $('script[uid]').attr("uid");
    const chatURL = 'wss://ws-chat.torn.com/chat/ws';
    const origin = 'https://www.torn.com';

    // Just so I know I'm running...
    logScriptStart();

    const globalWS = newSocket();               // Global socket if we want to intercept chat also

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

    ////////////////////////////////////////////////
    // AJAX interceptor
    var origOpen = XMLHttpRequest.prototype.open;
    const offlineStatus = "/onlinestatus.php?offline";
    XMLHttpRequest.prototype.open = function() {
        log('XMLHTTP request started! ', this);
        log("URL: ", this.url);
        log("Original arguments: ", arguments);

        this.addEventListener('load', function() {
            log('XMLHTTP request completed! ', this);

            log(this.readyState);   // will always be 4 (ajax is completed successfully)
            log(this.responseText); // whatever the response was
        });

        log("Apply: ", this, "arguments: ", arguments);
        origOpen.apply(this, arguments);
    };
    log("Inserted AJAX interceptor");
    ////////////////////////////////////////////////

    ////////////////////////////////////////////////
    // Chat interception stuff
    //
    installWebSocket();  // Hook chat

    // Creates a new WebSocket for chatting
    function newSocket() {
        const wsURL = chatURL + '?uid=' + userID + "&secret=" + secret;
        debug('[newSocket] wsURL: ' + wsURL);
        return new WebSocket(wsURL, [], {'origin': origin});
    }

    // Start up our WebSocket - add event listeners
    function installWebSocket() {
        if (!globalWS) globalWS = newSocket();
        installSocketHandlers(globalWS);
    }

    //////////////////////////////////////////////////////////////////////
    // Install handlers for a socket. Done here (in a separate function)
    // so we can easily retry a failed/closed socket.
    //////////////////////////////////////////////////////////////////////

    function installSocketHandlers(socket) {
        log('[installSocketHandlers]');
        if (!globalWS) {
                log('[installSocketHandlers] Error creating WebSocket!');
                return;
            }

        // Handle received chat messages
        globalWS.onmessage = function(event) {
            if (typeof event.data === 'string') {
                let jsonObject = JSON.parse(event.data);
                let message = jsonObject.data[0];
                if (spyAllMsgs) log('[CHAT] [WebSocket.onmessage] ', message);

                // Just text messages, for now...
                if (message.hasOwnProperty("messageText")) {
                    //handleInboundMessage(message);
                }
            }
        };

        // Handle 'ping/pong'
        //globalWS.on('pong', function() {
        globalWS.addEventListener('pong', function (event) {log('[PONG]');});
        globalWS.addEventListener('ping', function (event) {log('[PING]');});

        // Handle socket open event.
        globalWS.onopen = function() {
            log('[CHAT] WebSocket client connected.');
            log('[CHAT] Socket: ', globalWS);
            //socketRetries = 0;
            //sendPing();
        };

        // Handle socket close events.
        globalWS.onclose = function(event) {
            log('[CHAT] [WebSocket.onclose]');
            if (event.wasClean) {
                log(`[CHAT] [close] Connection closed cleanly.\n\tcode=${event.code}\n\treason=${event.reason}`);
            } else {
                log(`[CHAT] [close] Connection died!\n\tcode=${event.code}\n\treason=${event.reason}`);
            }
            //recoverSocket();
        };

        // Handle socket errors
        globalWS.onerror = function(error) {
            log('[CHAT] [WebSocket.onerror]');
            let httpCode = error.message.match(/\d+/);
            let httpStatus = status.HttpStatusEnum.get(Number(httpCode));
            let httpMsg = httpStatus ? (httpCode + ' ' + httpStatus.name + ' : ' + httpStatus.desc) : 'Unknown';
            log(`[CHAT] [error] Connection error detected!` +
                `\n\tHTTP error: ${httpMsg}\n\tmessage=${error.message}\n\terror=${error.error}\n\tclose=${error.close}`);
            //recoverSocket();
        };

        log('[installSocketHandlers] WebSocket initialized, waiting for client connection.');
    }

})(); // End script