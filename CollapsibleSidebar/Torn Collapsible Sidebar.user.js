// ==UserScript==
// @name         Torn Collapsible Sidebar
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Make certain sidebar links collapsible
// @author       xedx [2100735]
// @include      https://www.torn.com/*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(".xedx-caret {" +
                "padding-top:5px;" +
                "padding-bottom:5px;" +
                "padding-left:20px;" +
                "padding-right:10px;" +
                //"width:15px;" +
                //"height:15px;" +
                "}");

    const caretNode = `<span style="float:right;"><i id="xedx-collapse" class="icon fas fa-caret-down xedx-caret"></i></span>`;
    var caretState = 'fa-caret-down';

    let retries = 0;
    function handlePageLoaded() {
        caretState = GM_getValue('lastState', caretState);
        if (!document.querySelector("#sidebarroot") && (retries++ < 5)) setTimeout(handlePageLoaded, 100);
        if (document.getElementById('xedx-collapse')) document.getElementById('xedx-collapse').remove();
        if (!document.querySelector("#nav-city")) return;

        // Set parents to 'flex', allow divs to be side-by-side
        document.querySelector("#nav-city").setAttribute('style', 'display:flex;');
        document.querySelector("#nav-city > div > a").setAttribute('style', 'width:70%;float:left;');

        // Add the caret and handler.
        let target = document.querySelector("#nav-city > div");
        if (!target) return (log('bail on no target'));
        $(target).append(caretNode);
        document.getElementById("xedx-collapse").addEventListener('click', function (event) {
            handleClick(event)}, { passive: false });

        // Little trick here - set current state to opposite of the saved state.
        // So calling the handler tricks it to set the *other* way, which is how
        // we want it to start up.
        caretState = (caretState == 'fa-caret-down') ? 'fa-caret-right' : 'fa-caret-down';
        handleClick();
    }

    function handleClick(e) {
        log('handleClick: state = ' + caretState);
        let targetNode = document.querySelector("#xedx-collapse"); // e.target
        let elemState = 'block';
        let childList = document.querySelector("#nav-home").parentNode.children;
        if (caretState == 'fa-caret-down') {
            targetNode.classList.remove("fa-caret-down");
            targetNode.classList.add("fa-caret-right");
            caretState = 'fa-caret-right';
            elemState = 'none';
        } else {
            targetNode.classList.remove("fa-caret-right");
            targetNode.classList.add("fa-caret-down");
            caretState = 'fa-caret-down';
        }
        GM_setValue('lastState', caretState);
        for (let i=0; i<childList.length; i++) {
            let node = childList[i];
            if (node.id == '') node.setAttribute('style' , 'display: ' + elemState);
        }
    }
 
    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    let stateCheck = setInterval(() => {
      if (document.readyState === 'complete') {
        clearInterval(stateCheck);
        setTimeout(handlePageLoaded, 100);
      }
    }, 100);

    $(window).on('hashchange', function() {
        log('handle hash change.');
      handlePageLoaded();
    });

})();




