// ==UserScript==
// @name         Torn Adv Mini Profile
// @namespace    http://tampermonkey.net/
// @version      0.1
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
    // has been added, we may to look for new nodes with this as a parent.
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

        document.querySelector("#profile-mini-root > div > div.profile-mini-_userProfileWrapper___39cKq")
        let parent = node.querySelectorAll(`[class^="profile-mini-_userProfileWrapper___"]`)[0];
        let newNode = '<div id="xedx-mini-adv">' +
            '<span>NW: $' + numberWithCommas(networth) + '</span>' +
            '<br><span>Xan: ' + numberWithCommas(xanax) + '</span>' +
            '<br><span>Cans: ' + numberWithCommas(cans) + '</span>' +
            '<br><span>SE`s: ' + numberWithCommas(ses) + '</span>' +
            '<br><span>Attacks: ' + numberWithCommas(totalAttacks) + '</span>' +
            '<br><span>Crimes: ' + numberWithCommas(crimes) + '</span>' +
            '</div>';
        console.log('queryUserProfileCB: Appending new node to ', parent);
        log(newNode);
        $(parent).append(newNode);
    }

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

    // Handle the new nodes that are added.
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

    document.onreadystatechange = function () {
      if (document.readyState == "complete") {
        handlePageLoaded();
      }
    };


})();