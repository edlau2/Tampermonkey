// ==UserScript==
// @name         Torn Revive Opts
// @namespace    http://tampermonkey.net/
// @version      0.5
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

    //GM_addStyle('.xedx-red: {color: red;}');
    //GM_addStyle('.xedx-green: {color: limegreen;}');
    //GM_addStyle('.xedx-orange: {color: orange;}');

    function personalStatsQuery(callback=personalStatsQueryCB) {
        log('[personalStatsQuery]');
        xedx_TornUserQuery(null, 'profile', callback);
    }

    // Callback for above
    var revivable = -1;
    var pageLoaded = false;
    function personalStatsQueryCB(responseText, ID) {
        if (responseText == undefined) {
            log('[personalStatsQueryCB] unknown error, no response!');
            return;
        }
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        log("jsonResp: ", jsonResp);
        log("jsonResp.revivable: ", jsonResp.revivable);
        revivable = jsonResp.revivable;

        if (!pageLoaded) handlePageLoad();
    }

    function clickHandler(e) {
        let internal = (typeof e === 'string');
        dugeb("Click handler, e is ", e);
        let $btn = null;
        if (!internal) {
            e.preventDefault();
        $btn = $(this);
        } else {
            $btn = $('.revive-availability-btn');
        }
        log("$btn: ", $btn);
        $btn.closest('.content-wrapper').tooltip('close');
        ajaxWrapper({
            url: '/hospitalview.php',
            type: 'POST',
            data: {
                action: 'toggleReviveSettings'
            },
            oncomplete: function(res) {
                log("Response: ", res);
                log("Response, e: ", e);
                let response = null;
                try {
                    response = JSON.parse(res.responseText);
                } catch (e) {
                    log("Error parsing JSON! ", e);
                }
                let newClass = '';
                let messageColor = '';
                if (response) {
                    newClass = response.class.split(' ').pop();
                    messageColor = '';
                    log("Response, newClass: ", newClass);
                    switch (newClass) {
                    case ('revive-option-everyone'):
                        messageColor = 'green';
                        $btn.attr("style", "color: limegreen;");
                        break;
                    case ('revive-option-friends'):
                        messageColor = 'orange';
                        $btn.attr("style", "color: orange;");
                        break;
                    case ('revive-option-nobody'):
                        messageColor = 'red';
                        $btn.attr("style", "color: red;")
                        break;
                    }
                    log("Message Color: ", messageColor);
                    $btn.removeClass(function(index, className) {
                        return (className.match(/(^|\s)revive-option-\S+/g) || []).join(' ');
                    });
                    $btn.addClass(newClass).attr('title', response.description).find('#revive-availability').text(response.title)
                    informationMessageTemplateIn($('#info-msg-wrapper').empty(), false, false, messageColor);
                    $('#info-msg-wrapper').find('.msg').html(response.description);
                }

                if (e == "internal-1")
                    clickHandler("internal-2");
                else if (e == "internal-2")
                    clickHandler("internal-3");
                else if (e == "internal-3") {
                    //log("Ensure we set correct text/color here!");
                    //log("class: ", newClass, " color: ". messageColor);
                    $("#xedx-revive").attr("style", "display: block");
                }
            },
            onerror: function(err) {
                log("Error: ", err);
            }
        });
    }

    GM_addStyle(`.xedx-area-desktop {display: inline-block; float: none; margin-left: 5px; vertical-align: middle;}`);

    var revElemNoOne =
        `<div class="area-desktop___Gy9J0" style="display: block" id="xedx-revive">
        <a aria-labelledby="revive-availability" class="revive-availability-btn t-clear h c-pointer m-icon line-h24 last revive-option-nobody" href="#" title="Nobody can revive you." i-data="i_735_25_79_26" aria-describedby="ui-tooltip-2 ui-tooltip-3">
            <span class="icon-wrap svg-icon-wrap" style="margin-left: 0px !important;">
                <span class="link-icon-svg revive-availability ">
                    <svg id="xedx-svg" xmlns="http://www.w3.org/2000/svg" width="18" height="14.72" viewBox="0 0 18 14.72">
                        <path id="path1" d="M16.2,9.36a.87.87,0,0,0-.66.42l-1.07,2L13.14,8a.71.71,0,0,0-.66-.5.86.86,0,0,0-.74.41L10.83,10,9.43,1.59C9.35,1.26,9,.93,8.68,1a.81.81,0,0,0-.74.58L6.7,11.43l-1-5.29a.69.69,0,0,0-.66-.58A.67.67,0,0,0,4.3,6L2.65,9.44H0v1.49H3.06a.73.73,0,0,0,.66-.41L4.63,8.7l1.49,7.44a.79.79,0,0,0,.74.58h0a.78.78,0,0,0,.74-.66L8.84,6.39l1.08,6.36a.68.68,0,0,0,.66.58.77.77,0,0,0,.74-.41l1.16-2.65,1.24,3.64a.72.72,0,0,0,.66.5.89.89,0,0,0,.75-.42l1.65-3.14H20V9.37Z" fill="#fff" opacity="0.35"></path>
                        <path id="path2" d="M16.2,8.36a.87.87,0,0,0-.66.42l-1.07,2L13.14,7a.71.71,0,0,0-.66-.5.86.86,0,0,0-.74.41L10.83,9,9.43.59C9.35.26,9-.07,8.68,0a.81.81,0,0,0-.74.58L6.7,10.43l-1-5.29a.69.69,0,0,0-.66-.58A.67.67,0,0,0,4.3,5L2.65,8.44H0V9.93H3.06a.73.73,0,0,0,.66-.41L4.63,7.7l1.49,7.44a.79.79,0,0,0,.74.58h0a.78.78,0,0,0,.74-.66L8.84,5.39l1.08,6.36a.68.68,0,0,0,.66.58.77.77,0,0,0,.74-.41l1.16-2.65,1.24,3.64a.72.72,0,0,0,.66.5.89.89,0,0,0,.75-.42l1.65-3.14H20V8.37Z" fill="#777"></path>
                    </svg>
                </span>
            </span>
            <span id="revive-availability" style="margin-left: 5px !important;">Nobody</span>
        </a></div>`;

    function handlePageLoad() {
        pageLoaded = true;

        if (revivable == -1) return;
        if (location.href.indexOf("hospitalview") > -1) return;

        // Doesn't work on some pages = such as the poker page.
        let BadURLs = ["holdem"];
        let badUrlFound = false;
        BadURLs.forEach (function(e) {
            debug("Checking " + e + " in '" + location.href + "'");
            if (location.href.indexOf(e) > -1) {
                log("Not displaying on the ", e, " page");
                badUrlFound = true;
            }
        });
        if (badUrlFound) return;

        log("Inserting rev element, revivable=", revivable);

        if ($("#nav-home").length < 1) {
            log("Not on page with sidebar!");
            return;
        }

        $("#nav-home").after(revElemNoOne);
        $("#xedx-revive").attr("style", "display: none");  // Hack!
        $('.revive-availability-btn').click(clickHandler);

        // Hack!
        //let e = $('.revive-availability-btn');
        clickHandler("internal-1");
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    personalStatsQuery();

})();