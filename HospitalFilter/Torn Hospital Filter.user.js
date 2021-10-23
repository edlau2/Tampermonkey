// ==UserScript==
// @name         Torn Hospital Filter
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add filters to the hospital page
// @author       xedx [2100735]
// @include      https://www.torn.com/hospitalview.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // Global vars: options and class name(s)
    var ulRootClassName = "user-info-list-wrap";
    var muggedOpt = false;
    var rrOpt = false;

    // DIV for the UI
    var xedx_filter_div = '<div class="t-blue-cont h" id="xedx-filter-div">' +
                      '<div id="xedx-filter-hdr" class="title main-title title-black top-round active" aria-level="5">' +
                          '<div class="arrow-wrap">' +
                              '<span>XedX`s Hospital Filter</span>' +
                              '<a href="#/" id="xedx-filter-btn" role="button" class="accordion-header-arrow right"/>' +
                              '</div>' +
                      '</div>' +
                      '<div id = "xedx-content-div" class="cont-gray bottom-round" style="display: block;">' +
                          '<input type="checkbox" id="xedx-mugged-opt" name="mugged-opt" style="margin-left: 200px; margin-top: 10px; margin-bottom: 10px;">' +
                          '<label for="mugged-opt"><span style="margin-left: 15px;">Mugged</span></label>' +
                          '<input type="checkbox" id="xedx-rr-opt" name="rr-opt" style="margin-left: 200px;">' +
                          '<label for="rr-opt"><span style="margin-left: 15px;">Russian Roulette</span></label>' +
                      '</div>' +
                    '</div>';

    // Start things off: install UI and handlers.
    function handlePageLoad() {
        log('handlePageLoad');
        let targetNode = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper.hospital-list-wrapper" +
                                                " > div.users-list-title");

        if (!validPointer(targetNode)) {setTimeout(handlePageLoad, 500); return;}
        let parentNode = targetNode.parentNode;
        $(separator).insertBefore(targetNode);
        $(xedx_filter_div).insertBefore(targetNode);

        installHandlers();

        filterDisplay();
    }

    // Install handlers for checkboxes, buttons
    function installHandlers() {
        let myButton = document.getElementById('xedx-filter-btn');
        myButton.addEventListener('click',function () {
            handleAccordianBtn();
        });

        myButton = document.getElementById('xedx-mugged-opt');
        muggedOpt = myButton.checked = GM_getValue('muggedOpt', muggedOpt);
        myButton.addEventListener('click',function () {
            handleFilterBtn(this);
        });

        myButton = document.getElementById('xedx-rr-opt');
        rrOpt = myButton.checked = GM_getValue('rrOpt', rrOpt);
        myButton.addEventListener('click',function () {
            handleFilterBtn(this);
        });
    }

    // Handle the accordian arrow, toggle the "xedx-content-div"
    function handleAccordianBtn() {
        if ($("#xedx-filter-hdr")[0].classList.contains('active')) {
            $("#xedx-filter-hdr")[0].classList.remove('active');
            $("#xedx-content-div")[0].setAttribute('style', 'display: none;');
        } else {
            $("#xedx-filter-hdr")[0].classList.add('active');
            $("#xedx-content-div")[0].setAttribute('style', 'display: block;');
        }
    }

    // Handle the filter checkboxes
    function handleFilterBtn(cb) {
        switch (cb.id) {
            case "xedx-mugged-opt":
                GM_setValue('muggedOpt', (muggedOpt = cb.checked));
                break;

            case "xedx-rr-opt":
                GM_setValue('rrOpt', (rrOpt = cb.checked));
                break;

            default:
                break;
        }

        filterDisplay();
    }

    // Filter the display according to checkbox options
    function filterDisplay() {
        let liList = $('ul.' + ulRootClassName +  ' > li');
        if (!validPointer(liList)) {
            log('Invalid <ul> class name. Bailing.');
            return;
        }

        debugger;
        console.log('liList: ', liList);
        if (liList.length < 2) {setTimeout(filterDisplay, 500); return;}

        for (let i = 0; i < liList.length; i++) {
            let li = liList[i];
            let reason = li.querySelector('span > span.reason');
            let isMug = reason.innerText.includes('Mugged by');
            let isRR = reason.innerText.includes('Shot themselves');

            li.setAttribute('style', 'display: block');
            if (muggedOpt || rrOpt) {
                if (muggedOpt && rrOpt && !isMug && !isRR) {
                    li.setAttribute('style', 'display: none');
                }
                if (muggedOpt && !rrOpt && !isMug) {
                    li.setAttribute('style', 'display: none');
                }
                if (!muggedOpt && rrOpt && !isRR) {
                    li.setAttribute('style', 'display: none');
                }
            }
        }
    }

 
    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();
    handlePageLoad();
    window.addEventListener('hashchange', filterDisplay, false);

})();