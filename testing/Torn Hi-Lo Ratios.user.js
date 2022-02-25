// ==UserScript==
// @name         Torn Hi-Lo Ratios
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Checks the Hi/Lo Win/Loss ratio periodically
// @author       xedx [2100735]
// @include      https://www.torn.com/loader.php?sid=highlow
// @include      https://www.torn.com/casino.php
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @local        file://///Users/edlau/Documents/Tampermonkey Scripts/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @connect      www.tornstats.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        unsafeWindow
// ==/UserScript==

// @include      https://www.torn.com/loader.php?sid=viewHighLowStats
// @include      https://www.torn.com/index.php

/*eslint no-undef: 0*/

(async function() {
    'use strict';

    const checkSecs = 10; // Interval, in seconds, between checking for ratio update.
    const orgBeforeSend = function(xhr){$.ajaxSettings.beforeSend;}
    const baseURL = "https://www.torn.com/loader.php?sid=viewHighLowStats";

    var intervalID = null;
    var wlRatioLiSel = null;
    var wlRatioUlSel = null;

    const miniUI = '<div id="xedx-test-ui" class="box">' +
                       '<span id="xedx-stat-span" class="highlight-inactive">Test Script Active</span>' +
                       '<div id="xedx-result" class="xedx-res"> res </div>' +
                   '</div>';

    function addWrappers() {
        $.ajaxSettings.beforeSend=function(xhr){
            log('[beforeSend] xhr: ', xhr);
            log('[beforeSend] headers: ', xhr.headers);
            orgBeforeSend(xhr);
        };

        var get_selector = function (element) {
            var pieces = [];

            for (; element && element.tagName !== undefined; element = element.parentNode) {
                if (element.className) {
                    var classes = element.className.split(' ');
                    for (var i in classes) {
                        if (classes.hasOwnProperty(i) && classes[i]) {
                            pieces.unshift(classes[i]);
                            pieces.unshift('.');
                        }
                    }
                }
                if (element.id && !/\s/.test(element.id)) {
                    pieces.unshift(element.id);
                    pieces.unshift('#');
                }
                pieces.unshift(element.tagName);
                pieces.unshift(' > ');
            }

            return pieces.slice(1).join('');
        };
        $.fn.getSelector = function (only_one) {
            if (true === only_one) {
                return get_selector(this[0]);
            } else {
                return $.map(this, function (el) {
                    return get_selector(el);
                });
            }
        };

        XMLHttpRequest.prototype.wrappedSetRequestHeader =
          XMLHttpRequest.prototype.setRequestHeader;

        XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
            if (header == 'X-Requested-With') {
                log('[setRequestHeader] suppressing X-Requested-With!!!');
                return;
            }
            this.wrappedSetRequestHeader(header, value);
            if(!this.headers) {this.headers = {};}
            if(!this.headers[header]) {this.headers[header] = [];}
            this.headers[header].push(value);
        }
    }

    function addStyles() {
        GM_addStyle(`
                     .box {display: flex; align-items: center; justify-content: center; flex-direction: column;}
                     .box span {}
                     .xedx-res {display: none;}
                     .highlight-inactive {color: red;}
                     .highlight-active {
                          -webkit-animation: highlight-active 1s linear 0s infinite normal;
                          animation: highlight-active 1s linear 0s infinite normal;
                          color: lime;}
        `);
    }

    function getWinLossRatio(ul) {
        let ratio = 0;
        //log('[getWinLossRatio] ul=', ul);
        let liList = ul.getElementsByClassName('stat');
        //log('liList: ', liList);
        for (let i=0; i<liList.length; i++) {
            let text = liList[i].innerText;
            //log('Node #' + i + ' stat: ' + text);
            if (text.indexOf('Win/Loss ratio') > -1) {
                let parentUL = liList[i].parentNode;
                log('parentNode: ', parentUL);
                let statLi = parentUL.getElementsByClassName('stat-value')[0];
                if (statLi) {
                    if (!wlRatioUlSel) wlRatioUlSel = $(parentUL).getSelector();
                    if (!wlRatioLiSel) wlRatioLiSel = $(statLi).getSelector();
                    log('*** WL Ratio Selector: ', wlRatioLiSel);
                    ratio = Number(statLi.textContent);
                    log("Win/Loss Ratio: ", ratio);
                    break;
                }
            }
        }
        return ratio;
    }

    function refreshCompleteCb() {
        log('[refreshCompleteCb]');
        let ul = document.querySelector("#xedx-result > ul");
        let wlRatio = getWinLossRatio(ul);
        if (wlRatio) {
            log('getWinLossRatio returned: ', wlRatio);
            log('span: ', $("#xedx-stat-span"));
            $("#xedx-stat-span")[0].textContent = "Win/Loss ratio: " + wlRatio;
            $("#xedx-stat-span").addClass('highlight-active');
            $("#xedx-stat-span").removeClass('highlight-inactive');
            setTimeout(function(){
                $("#xedx-stat-span").removeClass('highlight-active');
                $("#xedx-stat-span").addClass('highlight-inactive');
            }, 2000);
        }
    }

    function refresh() {
        log('[refresh]');
        $("#xedx-result").load(baseURL + " #overall-stats > ul", refreshCompleteCb);
    }

    async function handlePageLoad() {
        log('[handlePageLoad]');
        let target = document.querySelector("#mainContainer > div.content-wrapper.m-left20.left > div.content-title.m-bottom10");
        if (!target) return setTimeout(handlePageLoad, 50);
        if (!document.querySelector("xedx-test-ui")) $(target).after(miniUI);

        refresh();
        intervalID = setInterval(refresh, checkSecs * 1000);
    }

    function getIdFromName(name) {
        /*
        // Get ID from name...
        let testDiv = '<div id="test"></div>';
        $('#body').append(testDiv);

        var res = jQuery('#test').load('https://www.torn.com/profiles.php?NID=LouBaker #skip-to-content',
          function(response, status, jqXHR) {
            let refDiv = document.getElementById("test");
            let msg = 'Alert was performed\nInner Text: ' + refDiv.innerText + '\nResponse: ' + response + '\nstatus: ' + status;
            alert(msg);
          });
          */

        /*
        // Alt to above
        var jqxhr = $.get('https://www.torn.com/profiles.php?NID=LouBaker', null, function(text){
            alert('jqxhr text: ' + text); // jqxhr text: Exeption: No called function:
            //alert($(text).find('#skip-to-content')); // Some error in console.
        });

        jqxhr.done(function(text) { // Never hit.
          alert( "done: " + text );
        });

        jqxhr.always(function(text) {
          alert( "always - second complete: " + text ); // always - second complete: Exeption: No called function:
        });
        */
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    addWrappers();
    addStyles();

    callOnContentLoaded(handlePageLoad);

})();