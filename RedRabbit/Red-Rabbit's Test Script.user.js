// ==UserScript==
// @name         Red-Rabbit's Test Script
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  I am the world!
// @include      https://www.torn.com/crimes.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @author       Red-Rabbit [???????]
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// This synatx, '(function() {', is called an anonymous function. It's
// purpose is to keep everything in the scope of this file, to prevent
// it from messing with other scripts that might use the same variable or
// function names.
(function() {
    'use strict';

    // This is called from the observer set up below.
    //
    // Save 'crimePage' and 'crimeSubPage' text
    let crimePage = '';
    let crimeSubPage = '';
    function doSomething() {
        // GM_info is a Tampermonkey variable that has all the data in the ==UserScript== section
        // You don't need to @grant access to it, as you do for GM_get/setValue
        console.log(GM_info.script.name + ' noticed a change!');

        // See if our node of interest has loaded yet. If not, we'll be recalled later.
        // May also be used as an indicator that we couldn't do a crime? Not enough nerve?
        let useNode = document.getElementsByClassName('specials-cont-wrap')[0];
        if (!validPointer(useNode)) {
            //alert('No special content wrapper!');
            return; // Will be called back...
        }

        // On the Crimes page, the crimes are in a <ul> (Unordered List) element.
        // Each crime is it's own <li> (List Item). Get the UL. Note that we can access
        // via the var 'useNode from here, the parent DIV.
        let ul = useNode.getElementsByClassName('specials-cont')[0]; // Again, by class name. 'let' instead of 'var' keeps the scope local
        let errorMsg = null; // Will set and check later
        let successMsg = null; // Will set and check later
        if (validPointer(ul)) { // Make sure we found it!
            console.log(GM_info.script.name + 'Found the crimes UL!');

            // We know the ID's for Kidnap and Mayor, so just search for those.
            // We could use these just to determine where we are on all the 'crimes' pages.
            let kidnapBtn = document.getElementById('kidnapping'); // Indicates we're on the main crimes page

            //let mayorBtn = document.getElementById('mayor');       // Indicates we're on the 'kidnapping' sub-page
            //let heavyMetalBtn = document.getElementById('heavy-metal-cds'); // Indicates we're on the 'Sell copied Media' sub-page

            //
            // This means we are on the page where we select what crime, in general.
            // Note that setting the 'click' function sets it for *all* 'label's.
            // The entire page. So we'll get notified for any click, an any label.
            // We can differentiate by name. The name is 'e.currentTarget.innerText',
            // where 'e' is the event that triggered this, specifically the 'click' event.
            //
            // We *should* be able to just add an event handler to the radio button
            // we really want, which is this element:
            // <input id="kidnapping" class="radio-css without-label" type="radio" value="kidnapping" name="crime">
            // but that is not working, for some reason I tried about 10 different ways. With no success.
            // Normally, we'd get the button using getELementById(), as above - so kidnapBtn, for example,
            // refers tot he 'kidnapping' crimes button, and use something like 'kidnapBtn.click(function(){ ..do something});'
            // or kidnapButton.addEventListener('click', function() {...do something...});
            //
            if (validPointer(kidnapBtn)) { // Indicates primary crimes page.
                alert(/*'Found the "kidnap" button!*/ 'On Primary crime page!');
                $("label").click(function (e) { // Sets up a handler for all the labels on the current page
                    // These lines could be replaced with a separate fn, say 'handleCrimePage(...)'
                    alert('clicked on "' + e.currentTarget.innerText + '" label');
                    console.log('Clicked on "' + e.currentTarget.innerText + '" label', e);
                    crimePage = e.currentTarget.innerText;
                    crimeSubPage = '';
                });
            }

            //
            // Regardless of finding those specific buttons, if we wanted to track all crimes,
            // could probably set on *any* label, here - don't bother being specific ?
            //
            // Or, do a loop, based on an array - test this out!
            //
            let subCrimeArray = ['search-the-train-station', // Search for cash
                                  'heavy-metal-cds',          // Sell copied media
                                  'sweet-shop',               // Shoplift
                                  'hobo',                     // Pickpocket
                                  'apartment',                // Larceny
                                  'swift-robbery',            // Armed robbery
                                  'sell-pills',               // Transport drugs
                                  'simple-virus',             // Plant a computer virus
                                  'car-bomb',                 // Assasination
                                  'warehouse',                // Arson
                                  'hijack-a-car',             // Grand theft auto
                                  'side-door',                // Pawn shop
                                  'money',                    // Counterfeiting
                                  'mayor',                    // Kidnapping
                                  'firearms',                 // Arms trafficking
                                  'bomb-a-factory',           // Bombings
                                  'hack-into-a-bank-mainframe', // Hacking
                                 ];
            subCrimeArray.forEach(function(crime) {
                let subCrime = document.getElementById(crime);
                if (validPointer(subCrime)) { // THis indicates we are on a crime's sub-page
                    // These lines could be replaced with a separate fn, say 'handleSubCrimePage(...)'
                    alert('On the "' + crimePage + '" crimes sub-page!');
                    $("label").click(function (e) {  // Sets up a handler for all the labels on the current page
                        crimeSubPage = e.currentTarget.innerText;
                        alert('clicked on "'+ crimePage + '-->' + crimeSubPage + '" label');
                        console.log('Clicked on "' + crimePage + '-->' + crimeSubPage + '" label', e);
                     });
                }
            });


        } else if (validPointer(errorMsg = useNode.getElementsByClassName('error-message')[0])) { // Look for an error result of a crime
            alert('Detected crime error: ' + errorMsg.innerText);
        } else if (validPointer(successMsg = useNode.getElementsByClassName('success-message')[0])){
            alert('Detected crime success: ' + successMsg.innerText);
        }

    console.log(GM_info.script.name + 'All done with "doSomething"!');
    }


    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    console.log(GM_info.script.name + ' script started!'); // See above for exp. of GM_info.
                                                           // Note that ' and " are somewhat interchangeable,
                                                           // but ' is useful when you need a " inside a string,
                                                           // when building DIVs manually, for example.

    // If you open Chrome's Developer Tools, this line will cause it to break in a debugger:
    //debugger;

    // Alternatively, you could in Tamper Monkey's Settings, select Debug Scripts, which will
    // stop in the debugger at the start of EVERY script.

    // Get/validate the user's API key
    validateApiKey();

    // Set up an observer - we're interested in when the selected crime changes
    // It is referenced by class, which is not unique, so we take the first one
    // int the returned array. Using 'getElementById()' is much better - if an
    // ID is available. targetNode will be the DIV element with class
    // 'content-wrapper'. This is NOT specific to 'crimes.php', which I've specified
    // in the ==UserScript== section, the '@include', as the page to load on.
    // There is a DIV under that, 'specials-cont-wrap', that we'll get at later.
    //
    // An alternative would be to set up a listener to fire on page load. We listen for
    // changes in content-wrapper as it should be loaded by now. The other DIV usually isn't.
    // Example of calling on page load:
    //
    // document.addEventListener("DOMContentLoaded", function() {
    //     console.log(GM_info.script.name + ' DOMContentLoaded');
    //     doSomething();
    // });
    //
    // THis fires on initial page load
    window.onload = function () {
        console.log(GM_info.script.name + ' onLoad');
        doSomething();
    };

    var targetNode = document.getElementsByClassName('content-wrapper')[0];
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) { // This is called when the DIV we've specified is changed
        observer.disconnect(); // We can disconnect here, if we need to modify the DIV
                               // Otherwise, our callback will be called again. We can
                               // instead do this right before we modify

        console.log(GM_info.script.name + ' mutation observer');
        doSomething(); // This is our main function to do stuff

        observer.observe(targetNode, config); // Re-start the observer
    };

    var observer = new MutationObserver(callback); // Create the observer
    observer.observe(targetNode, config); // Start the observer



})();