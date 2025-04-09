// ==UserScript==
// @name         Torn Custom Chat 3.0
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  This script does...
// @author       xedx [2100735]
// @run-at       document-start
// @match        https://www.torn.com/*
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    // ========== Editable options, will be in a UI menu later ===============

    // Options for fac chat messages
    const FAC_OPTS = {
        MY_TEXT_COLOR: '#dd0000',
        THEM_TEXT_COLOR: 'white',
        MY_BORDER: '1px solid limegreen',
        THEM_BORDER: 'none',
        MY_BG_COLOR: 'black',
        THEM_BG_COLOR: 'transparent'
    }

    // Options for private chat messages
    const PRIV_OPTS = {
        MY_TEXT_COLOR: 'red',
        THEM_TEXT_COLOR: 'white',
        MY_BORDER: '1px solid #000099',
        THEM_BORDER: 'none',
        MY_BG_COLOR: 'black',
        THEM_BG_COLOR: 'transparent'
    }

    // Applies to all chat msg text
    const GEN_OPTS = {
        FONT_FAMILY: 'arial',
        FONT_SIZE: '14px'
    }

    // =========== End editable options ===============

    const addDevStyles = false;    // This ATM puts borders on various chat boxes, I use during development to locate elements

    const log = function(...data) {console.log(GM_info.script.name + ': ', ...data);}
    log("script started");

    const FAC_SEL = `#chatRoot [id^='faction-']`;
    const PRIV_SEL = `#chatRoot [id^='private-']`;

    const ALL_MSGS_SEL = `[class^='list_'] [class*='root_']:not([class*='divider'])`;
    const MY_MSGS_SEL = `[class^='list_'] [class*='self_']`;
    const THEM_MSGS_SEL = `[class^='list_'] > [class*='root_']:not([class*='self_']):not([class*='divider'])`;

    const xedx_addStyle = function(styles) {
        (typeof GM_addStyle != "undefined") ?
            GM_addStyle(styles) :
            (styles) => {
                const styleElement = document.createElement("style");
                styleElement.setAttribute("type", "text/css");
                styleElement.innerHTML = styles;
                document.head.appendChild(styleElement);
            }
    };

    function classList(element) {if ($(element).attr("class")) return $(element).attr("class").split(/\s+/);}

    let stylesList = "";
    function addStyleToList(rootSel, opt, val) {
        let style;
        let subSel = MY_MSGS_SEL;
        if (opt.indexOf('THEM') > -1) subSel = THEM_MSGS_SEL;

        if (opt.indexOf('BG_COLOR') > -1) {
            style = `${rootSel} ${subSel} {
                background-color: ${val} !important;
            }`;
        }
        if (opt.indexOf('TEXT_COLOR') > -1) {
            style = `${rootSel} ${subSel} span {
                color: ${val} !important;
            }`;
        }
        if (opt.indexOf('BORDER') > -1) {
            style = `${rootSel} ${subSel} {
                border: ${val} !important;
            }`;
        }

        stylesList = stylesList + ' ' + style;
    }

    let opts = FAC_OPTS;
    let keys = Object.keys(opts);
    for (let idx=0; idx<keys.length; idx++) {
        let opt = keys[idx];
        let val = opts[opt];
        if (val == 'none') continue;
        addStyleToList(FAC_SEL, opt, val);
    }

    opts = PRIV_OPTS;
    keys = Object.keys(opts);
    for (let idx=0; idx<keys.length; idx++) {
        let opt = keys[idx];
        let val = opts[opt];
        if (val == 'none') continue;
        addStyleToList(PRIV_SEL, opt, val);
    }

    xedx_addStyle(stylesList);

    xedx_addStyle(`
        ${FAC_SEL} ${ALL_MSGS_SEL}, ${PRIV_SEL} ${ALL_MSGS_SEL} {
            font-family: ${GEN_OPTS.FONT_FAMILY} !important;
            font-size: ${GEN_OPTS.FONT_SIZE} !important;
        }
        `);

    if (addDevStyles == true) {
        xedx_addStyle(`
            ${FAC_SEL} {
                border: 1px solid limegreen;
                /*width: 260px !important;*/
            }
            ${PRIV_SEL} {
                border: 1px solid blue;
                /*width: 260px !important;*/
            }
        `);
    }

})();