// ==UserScript==
// @name         Torn Bazaar Add Items Button
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Add an 'Add' button to every Bazaar page (well, just your bazaar)
// @author       xedx [2100735]
// @include      https://www.torn.com/bazaar.php*
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

    let targetNode = null;
    let retries = 0;
    let addBtnDiv = '<a id="xedx-add-btn" to="#/add" role="button" aria-labelledby="add-items" href="#/add" ' +
        "style='float: right;' " +
        'class="linkContainer___AOKtu inRow___uFQ4S greyLineV___mY84h link-container-ItemsAdd" ' +
        'i-data="i_687_11_101_33"><span class="iconContainer___q3CES linkIconContainer___IqlVh">' +
        '<svg xmlns="http://www.w3.org/2000/svg" class="default___qrLNi svgIcon___gFpTP" ' +
        'filter="url(#top_svg_icon)" fill="#777" stroke="transparent" stroke-width="1" ' +
        'width="17" height="16" viewBox="0 0 16.67 17">' +
        '<path d="M2,8.14A4.09,4.09,0,0,1,3,8a4,4,0,0,1,3.38,6.13l3,1.68V8.59L2,4.31ZM16,' +
        '4.23,8.51,0,6.45,1.16,13.7,5.43ZM5.11,1.92,2.79,3.23,10,7.43l2.33-1.27Zm5.56,6.66V16l6-3.42V5.36ZM3,' +
        '9a3,3,0,1,0,3,3A3,3,0,0,0,3,9Zm1.67,3.33H3.33v1.34H2.67V12.33H1.33v-.66H2.67V10.33h.66v1.34H4.67Z">' +
        '</path></svg></span><span class="linkTitle___QYMn6">Add items</span></a>';

    function isHidden(el) {
        return (el.offsetParent === null)
    }

    function handlePageLoaded() {
        log('handlePageLoaded');
        if (document.getElementById('xedx-add-btn')) document.getElementById('xedx-add-btn').remove();
        let hash = window.location.hash;
        let substrings = ['manage', 'personalize', 'add', 'userid'];
        if (substrings.some(v => hash.includes(v))) return;
        targetNode = document.querySelector("#react-root > div > div.appHeaderWrapper___Omvtz > " +
                                            "div.topSection___OilHR > div.titleContainer___LJY0N");
        if (!targetNode)
            targetNode = document.querySelector("#bazaarRoot > div > div.appHeaderWrapper___Omvtz.disableLinksRightMargin____LINY > " +
                               "div.topSection___OilHR > div.titleContainer___LJY0N");
        if (!targetNode && retries++ < 10) return setTimeout(handlePageLoaded, 50);
        if (!location.href.includes('userid=')) {
            $(targetNode).append(addBtnDiv);
        }
    }

 
    //////////////////////////////////////////////////////////////////////
    // Main/startup when page fully loads, or hash changes.
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