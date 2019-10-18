// ==UserScript==
// @name         Window Size
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Resize the 'docks' window
// @author       You
// @match        https://www.torn.com/shops.php?step=docks
// @grant        none
// ==/UserScript==

// ^^ the 'match' line, above, tells the script what page URL to run on.
// I assume you can more than one.
// To run on ALL pages, an extension, rather than a script, is a better option.
// On my GitHub page, see Torn Loot Level and an example of that.
// This will only run on the ocks page in the city

(function() {
    'use strict';

    // So we can debug in Chrome Developer tools...
    debugger;

    // We need to define what window we want to resize.
    // A page could have many windows embeded in it.
    // window.top is the topmost in the windows hierachy,
    // could also just use 'window', i.e. myWindow = window
    // This is because you can any frame on a page instead.
    var myWindow = window.top;

    // Call our function that does the resizing. We could just call
    // myWindow.resizeTo(250, 250); directly here instead.
    resizeWin(myWindow);

    // Our function to resize any window, that we just called above.
    // If not called, it won't run. We pased it myindow, which inside the function
    // is referenced as someWindow
    function resizeWin(someWindow) {
        // You'll se an error in the debugger, here, saying resiveWindow is not a function
        // of a window. So I'm to change this line.
        // someWindow.resizeWindow(250, 250);
        someWindow.resizeTo(250, 250);

        // Also not a 'window' function, and not needed anyway, so get rid of it.
        //someWindow.focus();
    }
})();