// ==UserScript==
// @name         Torn Adv Mini Profile
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Adds additional stats to the mini profiles on a page.
// @author       xedx [2100735]
// @include      https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // Globals
    var observer = null;
    var target = document.body;
    var config = {childList: true, subtree: true, attributes: false, characterData: false};

    // Helpers
    function observeOn() {
        if (observer) {
           observer.observe(target, config);
        }
    }

    function observeOff() {
        if (observer) observer.disconnect();
    }

    // Handle page load - start an observer to check for new nodes,
    // specifically, the id="profile-mini-root" node. Once this node
    // has been added, we look for changes as this as the parent.
    function handlePageLoaded() {
        log('handlePageLoaded');
        observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (!mutation.addedNodes) return;

            for (let i = 0; i < mutation.addedNodes.length; i++) {
                let node = mutation.addedNodes[i];

                observeOff();
                handleNewNode(node);
            }
          })
        });

        observeOn();
    }

    function queryUserProfile(node, id) {
        log('queryUserProfile: ID=' + id);
        xedx_TornUserQuery(id, 'personalstats,crimes', queryUserProfileCB, node);
    }

    // This parses out the info we want to display, and adds it to
    // the mini profile in a table format.
    function queryUserProfileCB(responseText, ID, node) {
        log('queryUserProfileCB: id='+ID);
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        let networth = jsonResp.personalstats.networth;
        let xanax = jsonResp.personalstats.xantaken;
        let cans = jsonResp.personalstats.energydrinkused;
        let ses = jsonResp.personalstats.statenhancersused;
        let totalAttacks = jsonResp.personalstats.attackswon + jsonResp.personalstats.attackslost + jsonResp.personalstats.attacksdraw;
        let crimes = jsonResp.criminalrecord.total;

        let parent = node.querySelectorAll(`[class^="profile-mini-_userProfileWrapper___"]`)[0];
        //let parent = node.querySelectorAll(`[class^="profile-mini-_userImageWrapper___"]`)[0];
        //let parent = node.querySelector("#profile-mini-root > div");
        let wrapper = node.querySelectorAll(`[class^="profile-mini-_wrapper___"]`)[0];
        let newNode = '<div class="content-bottom-round" id="xedx-mini-adv" style="float: left;">' +
            '<table>' +
            '<tr>' +
            '<td class="xtdx"><strong>NW: </strong><span> $' + numberWithCommas(networth) + '</span></td>' +
            '<td class="xtdx"><strong>Xan: </strong><span> ' + numberWithCommas(xanax) + '</span></td>' +
            '</tr>' +
            '<tr>' +
            '<td class="xtdx"><strong>Cans: </strong><span> ' + numberWithCommas(cans) + '</span></td>' +
            '<td class="xtdx"><strong>SE`s: </strong><span> ' + numberWithCommas(ses) + '</span></td>' +
            '</tr>' +
            '<tr>' +
            '<td class="xtdx"><strong>Attacks: </strong><span> ' + numberWithCommas(totalAttacks) + '</span></td>' +
            '<td class="xtdx"><strong>Crimes: </strong><span> ' + numberWithCommas(crimes) + '</span></td>' +
            '</table>' +
            '</div>';
        console.log('queryUserProfileCB: Appending new node to ', parent);
        log(newNode);
        wrapper.style.maxHeight = '283px';
        $(parent).append(newNode);
    }

    // Handle changes to the mini profile node.
    // Query the personal stats and crimes of
    // the user.
    var profileQueried = false;
    function handleMiniProfileChange() {
        log('handleMiniProfileChange');
        let node = target;
        let idNode = node.querySelectorAll('[id$=-user]')[0];
        if (!idNode) {
            log('Mini-profile closing - no id');
            profileQueried = false;
            return;
        }
        if (!profileQueried) {
            let id = idNode.id.replace('-user', '');
            log('User ID = ' + id);
            queryUserProfile(node, id);
            profileQueried = true;
        }
    }

    // TBD: see if div already exists, if so,.....

    // Handle the new nodes that are added.
    // Once a mini profile node is inserted,
    // we change the observer to just look for
    // changes to that div.
    function handleNewNode(node) {
        if (!node.id || node.id != 'profile-mini-root') {
            observeOn();
            return;
        }

        console.log('Node added: ', node);
        log('Node ID = ' + node.id);

        target = node;
        observer = new MutationObserver(handleMiniProfileChange);
        observeOn();
    }
 
    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    GM_addStyle(".xtdx {" + // Define table cell style
                    "border-width: 1px !important;" +
                    "border-style: solid !important;" +
                    "border-color: #5B5B5B !important;" +
                    "padding: 0.2rem !important;" +
                    "vertical-align: middle !important;" +
                    // Change this to dark-gray, not white.
                    "color: " + (darkMode() ? "white; !important;" : "black; !important;") +
                    "text-align: left;" +
                    "}");

    document.onreadystatechange = function () {
      if (document.readyState == "complete") {
        handlePageLoaded();
      }
    };


})();