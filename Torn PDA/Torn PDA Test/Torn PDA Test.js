// ==UserScript==
// @name         Torn PDA test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @include      https://www.torn.com/
// @connect      api.torn.com
// @grant        unsafeWindow
// ==/UserScript==

// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js

(function() {
    'use strict';

    const apikey = '###PDA-APIKEY###';

     function handlePageLoad() {
         // Can check for any required DIV here and setTimeout() if not available,
         // or trigger any required API calls...
         alert('handlePageLoad called!\nMy API key: ' + apikey);
         let url = 'https://api.torn.com/user/?selections=personalstats&key=' + apikey;
         let pdaRes = PDA_httpGet(url).then(result => {
             console.log('obj names: ', Object.getOwnPropertyNames(result));
             console.log('status: ', result.status);
             console.log('text: ', result.responseText); // Yay! It works!
         });

    }

  //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    //logScriptStart();
    //versionCheck();
    console.log('Torn PDA Test script started!');

    // Delay until DOM content load (not full page) complete
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoaded);
    } else {
        handlePageLoad();
    }
    
    // Could also just call and delay if required stuff not yet present...

})();
