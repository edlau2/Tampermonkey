// ==UserScript==
// @name         Torn Holdem Score
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Checks the poker score
// @author       xedx [2100735]
// @include      https://www.torn.com/loader.php?sid=holdem*
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

// @include      https://www.torn.com/index.php

/*eslint no-undef: 0*/

(async function() {
    'use strict';

    debugLoggingEnabled = false;
    const checkSecs = 20;
    var autoClick = false;
    const GodMode = false;
    const wrappedBeforeSend = function(xhr){$.ajaxSettings.beforeSend;}
    const baseURL = "https://www.torn.com/loader.php?sid=viewPokerStats";

    const miniUI = '<div id="xedx-test-ui" class="box">' +
                       '<span id="xedx-stat-span" class="highlight-inactive">Test Script Active</span>' +
                       '<div id="god-mode" class="xedx-gm-inactive"><input class="xedx-chk" type="checkbox" id="auto" name="auto" value="auto">' +
                       '<label for="confirm" class="xedx-label">Auto</label></div>'+
                       //'<div id="xedx-result" class="xedx-res"> res </div>' +
                   '</div>';

    const altMiniUI = '<div id="xedx-test-ui-alt" class="box">' +
                       '<span id="xedx-stat-span-alt" class="highlight-inactive">Test Script Active</span>' +
                       '<div id="xedx-result" class="xedx-res"> res </div>' +
                      '</div>';

    function addWrappers() {
        $.ajaxSettings.beforeSend=function(xhr){
            debug('[beforeSend] xhr: ', xhr);
            debug('[beforeSend] headers: ', xhr.headers);
            wrappedBeforeSend(xhr);
        };

        $.fn.hasClassStartsWith=function(prefix){
            return $(this).is(`[class^=${prefix}]`);
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
                debug('[setRequestHeader] suppressing X-Requested-With!!!');
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
                     .box {display: flex; align-items: center; justify-content: center; flex-direction: column;margin-top: 10px;}
                     .box span {}
                     .xedx-res {display: none;}
                     .highlight-inactive {color: red;}
                     .xedx-chk {margin-left: 10px;}
                     .xedx-label {margin-left: 10px; color: darkgray;}
                     .xedx-gm-active {margin-top: 10px; display: block;}
                     .xedx-gm-inactive {display: none;}
                     .highlight-active {
                          -webkit-animation: highlight-active 1s linear 0s infinite normal;
                          animation: highlight-active 1s linear 0s infinite normal;
                          color: lime;}
        `);
    }

    function getPokerScore(ul) {
        let score = 0;
        let liList = ul.getElementsByClassName('stat');
        for (let i=0; i<liList.length; i++) {
            let text = liList[i].innerText;
            if (text.indexOf('Poker score') > -1) {
                let parentUL = liList[i].parentNode;
                let statLi = parentUL.getElementsByClassName('stat-value')[0];
                if (statLi) {
                    score = statLi.textContent;
                    debug("Score: ", score);
                    break;
                }
            }
        }
        return score;
    }

    function blinkScore() { // ... for 3 seconds.
        $("#xedx-stat-span").addClass('highlight-active');
        $("#xedx-stat-span").removeClass('highlight-inactive');
        setTimeout(function(){
            $("#xedx-stat-span").removeClass('highlight-active');
            $("#xedx-stat-span").addClass('highlight-inactive');
        }, 5000);
    }

    var currScore = 0;
    var lastScore = 0;
    var scoreGain = 0;
    function updateStatSpan(score) {
        currScore = parseFloat(score.replace(/,/g, ''));
        if (!lastScore) lastScore = currScore;
        if (currScore > lastScore) {
            blinkScore();
            scoreGain = currScore - lastScore;
        }
        if ($("#xedx-stat-span")[0]) $("#xedx-stat-span")[0].textContent = "Score: " + numberWithCommas(score) + " (+" + numberWithCommas(scoreGain) + ")";
        $("#xedx-stat-span-alt")[0].textContent = "Score: " + numberWithCommas(score) + " (+" + numberWithCommas(scoreGain) + ")";
        lastScore = currScore;
    }

    function refreshCompleteCb() {
        debug('[refreshCompleteCb]');
        let ul = document.querySelector("#xedx-result > ul");
        let score = getPokerScore(ul);
        if (score) {
            debug('getPokerScore returned: ', score);
            updateStatSpan(score); // And flash in the UI if enabled.
        }
    }

    function resetRefresh() {
        debug('[resetRefresh] checking again in ' + checkSecs + ' seconds.');
        setTimeout(refresh, checkSecs * 1000);
    }

    function refresh(autoReset=true) {
        debug('[refresh] ', autoReset);
        if (travelling()) return resetRefresh();
        $("#xedx-result").load(baseURL + " #your-stats > ul", refreshCompleteCb);
        if (autoReset) resetRefresh();
    }

    function getButtons() {
        return document.querySelectorAll("#react-root > main > div > div.panelPositioner___NjQfb " +
                                  "> div.panel___IuyJ0 > div.buttonsWrap___FQsHg > button");
    }

    function hasThreeButtons() {
        let hasThree = getButtons() ? ((getButtons().length) == 3) : false;
        return hasThree;
    }

    function secondButton() {
        return hasThreeButtons() ? document.querySelector("#react-root > main > div > div.panelPositioner___NjQfb > " +
                                                          "div.panel___IuyJ0 > div.buttonsWrap___FQsHg > button:nth-child(2)") :
        null;
    }

    function clickable(btn) {
        if (!autoClick) {
            debug('[clickable] autoClick is OFF!');
            return false;
        }
        let text = btn.innerText.toLowerCase();
        if (text == "i'm back" || text == "sit out" || text == "leave") {
            debug('Button Text = ' + text + ' Won`t click!');
            return false;
        }
        debug("[clickable] $(btn).hasClassStartsWith('pressed') ", $(btn).hasClassStartsWith('pressed'));
        debug("[clickable] $(btn).hasClass('queued___xMAEb') ", $(btn).hasClass('queued___xMAEb'));
        if (!$(btn).hasClassStartsWith('pressed') && !$(btn).hasClass('queued___xMAEb')) {
            return true;
        }
        return false;
    }

    function checkClick() {
        let btn = secondButton();
        if (!btn) {
            debug('[checkClick] no button!');
            return;
        }
        if (clickable(btn)) {
            debug('[checkClick] Can click!');
            $(btn).click();
        } else {
            debug('[checkClick] CANNOT click!');
        }
    }

    async function handlePageLoad() {
        debug('[handlePageLoad]');
        let altTarget = document.querySelector("#react-root > div.wrapper");
        if (altTarget && !document.querySelector("#xedx-test-ui-alt")) {
            $(altTarget).after(altMiniUI);
            refresh(false);
        }
        //let target = document.querySelector("#react-root > main > div > div.watcherPanel____y_5Y > div.panelTopRow___BiAd0");
        let target = document.querySelector("#react-root > main > div > div.panelPositioner___NjQfb")
        if (!target) return setTimeout(handlePageLoad, 50);

        if (!document.querySelector("xedx-test-ui")) $(target).after(miniUI);

        document.querySelector("#auto").addEventListener('click', function (e) {autoClick = this.checked;});
        if (GodMode) {
            let gm = document.querySelector("#god-mode");
            $(gm).removeClass('xedx-gm-inactive');
            $(gm).addClass('xedx-gm-active');
        }

        refresh();
        setInterval(checkClick, 1000);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    addWrappers();
    addStyles();

    callOnContentLoaded(handlePageLoad);

})();
