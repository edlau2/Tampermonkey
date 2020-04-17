// ==UserScript==
// @name         Red-Rabbit's Test Script
// @namespace    http://tampermonkey.net/
// @version      0.2
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
    function doSomething() {
        // GM_info is a Tampermonkey variable that has all the data in the ==UserScript== section
        // You don't need to @grant access to it, as you do for GM_get/setValue
        console.log(GM_info.script.name + ' noticed a change!');

        // See if our node of interest has loaded yet. If not, we'll be recalled later.
        let useNode = document.getElementsByClassName('specials-cont-wrap')[0];
        if (!validPointer(useNode)) {return;}

        // On the Crimes page, the crimes are in a <ul> (Unordered List) element.
        // Each crime is it's own <li> (List Item). Get the UL. Note that we can access
        // via the var 'useNode from here, the parent DIV.
        let ul = useNode.getElementsByClassName('specials-cont')[0]; // Again, by class name. 'let' instead of 'var' keeps the scope local
        if (validPointer(ul)) { // Make sure we found it!
            console.log(GM_info.script.name + 'Found the crimes UL!');

            // We know the ID's for Kidnap and Mayor, so just search for those.
            // We could use these just to determine where we are on all the 'crimes' pages.
            let kidnapBtn = document.getElementById('kidnapping');
            let mayorBtn = document.getElementById('mayor');

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
            //
            if (validPointer(kidnapBtn)) {
                alert('Found the "kidnap" button!');
                $("label").click(function (e) {
                    alert('clicked on "' + e.currentTarget.innerText + '"');
                    console.log('Clicked on "' + e.currentTarget.innerText + '"', e);
                });
            }

            //
            // This means we're on the next page, the 'sub crime'. Here, if the
            // mayorBtn is valid, we're on the Kidnapping page, it was pressed.
            // We got the button, above: "let mayorBtn = document.getElementById('mayor');"
            //
            // Again, I set a fn to be called on ALL labels, we can differentiate by name.
            // The name is 'e.currentTarget.innerText', where 'e' is the event that triggered
            // this, specifically the 'click' event.
            if (validPointer(mayorBtn)) {
                alert('Found the "mayor" button!');
                $("label").click(function (e) {
                     alert('clicked on "'+ e.currentTarget.innerText + '"');
                     console.log('Clicked on "' + e.currentTarget.innerText + '"', e);
                });
            }
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
    // -or-
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

    //doSomething(); // I call here also, since we want to do some stuff *before* a change is made also,
                   // if already loaded. We don't need this -and- the onLoad handler...

    var observer = new MutationObserver(callback); // Create the observer
    observer.observe(targetNode, config); // Start the observer



})();