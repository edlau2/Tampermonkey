// ==UserScript==
// @name         Torn Custom Chat 3.0
// @namespace    http://tampermonkey.net/
// @version      1.8
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

    const dbgStyles = false;
    const log = function(...data) {console.log(GM_info.script.name + ': ', ...data);}
    const logStyle = function(...data) {if (dbgStyles == true) console.log(GM_info.script.name + ': ', ...data);}
    log("script started");

    // ========== Editable options, will be in a UI menu later ===============
    //
    // Note that setting anything to 'default' ignores that option, for example
    // MSGS_UNREAD: 'default'
    // will not suppress that message. So would commenting out the line with '//'
    // You could change that line to "// MSGS_UNREAD: 'none'" (no double quotes)
    // to prevent processing that option.
    //
    const options = {
        fac: {
            MY_TEXT_COLOR: '#dd0000',
            THEM_TEXT_COLOR: 'white',
            MY_BORDER: '1px solid #008800',
            THEM_BORDER: 'default',
            MY_BG_COLOR: 'black',                // 'BG' for 'background'
            THEM_BG_COLOR: 'transparent',
            BODY_BG_COLOR: '#181818',
            FOOTER_BG_COLOR: 'black',
            SNDR_AVATAR_COLOR: '#666',           // In fac chat, color of sender's name
            MSGS_UNREAD: 'none',                 // 'none' hides the blue pop-up that says "x unread messages"
            HDR_USE_ICON: true                   // Display icon in header, links to fac page
        },

        priv: {
            MY_TEXT_COLOR: 'red',
            THEM_TEXT_COLOR: 'dodgerblue',
            MY_BORDER: '1px solid #000099',
            THEM_BORDER: '1px solid blue',
            MY_BG_COLOR: 'black',
            THEM_BG_COLOR: 'default',
            BODY_BG_COLOR: '#181818',
            FOOTER_BG_COLOR: 'black',
        }
    };

    log("Options: ", Object.keys(options));

    // =========== End editable options ===============

    const addDevStyles = false;    // This ATM puts borders on various chat boxes, I use during development to locate elements
    const pendStyles = false;

    // ================= API test kinda stuff ===============
    // For fac tag name, need API, or scrape from fac page...
    const facIcon = "https://factiontags.torn.com/8151-16121.png";
    /*
        API call: GET, 'https://api.torn.com/v2/faction/basic'
        Headers:
            'accept: application/json'
            'Authorization: ApiKey 4ZMAvIBON4zZLrd9'
    */



    // Sidebar data
    function getSidebarData() {
        let key = Object.keys(sessionStorage).find(key => /sidebarData\d+/.test(key));
        return JSON.parse(sessionStorage.getItem(key));
    }
    var sidebarData = getSidebarData();
    log("Sidebar data: ", sidebarData);

    // =======================================================

    // Selectors
    const FAC_SEL = `#chatRoot [id^='faction-']`;
    const PRIV_SEL = `#chatRoot [id^='private-']`;
    const BODY = `[class^='content_']`;
    const FOOTER = `[class^='content_'] > [class*='root_']:nth-child(2)`;

    const ALL_MSGS_SEL = `[class^='list_'] [class*='root_']:not([class*='divider'])`;
    const MY_MSGS_SEL = `[class^='list_'] [class*='self_']`;
    const THEM_MSGS_SEL = `[class^='list_'] > [class*='root_']:not([class*='self_']):not([class*='divider'])`;

    const SNDR_NAME = `${THEM_MSGS_SEL} [class*='senderContainer_'] > a[class*='sender_']`;
    const UNREAD_MSGS_SEL = ` > div[class*='content_'] > div[class*='root_'] > button[class*='subtitle_']`;

    // Styles
    const BORDER_STYLE = 'border: ${val} !important;';
    const BG_STYLE = 'background-color: ${val} !important;';
    const TEXT_CLR_STYLE = 'color: ${val} !important;';
    const DISPLAY_STYLE = 'display: ${val} !important;';

    // Options for fac chat messages
    const FAC_OPTS = {
        MY_TEXT_COLOR: {val: options.fac.MY_TEXT_COLOR, style: TEXT_CLR_STYLE, subSel: MY_MSGS_SEL},
        THEM_TEXT_COLOR: {val: options.fac.THEM_TEXT_COLOR, style: TEXT_CLR_STYLE, subSel: THEM_MSGS_SEL},
        MY_BORDER: {val: options.fac.MY_BORDER, style: BORDER_STYLE, subSel: MY_MSGS_SEL},
        THEM_BORDER: {val: options.fac.THEM_BORDER, style: BORDER_STYLE, subSel: THEM_MSGS_SEL},
        MY_BG_COLOR: {val: 'black', style: BG_STYLE, subSel: MY_MSGS_SEL},
        THEM_BG_COLOR: {val: 'transparent', style: BG_STYLE, subSel: THEM_MSGS_SEL},
        BODY_BG_COLOR: {val: '#181818', style: BG_STYLE, subSel: BODY},
        FOOTER_BG_COLOR: {val: 'black', style: BG_STYLE, subSel: FOOTER},
        SNDR_AVATAR_COLOR: {val: '#666', style: TEXT_CLR_STYLE, subSel: SNDR_NAME, when: 'now'},
        MSGS_UNREAD: {val: 'none', style: DISPLAY_STYLE, subSel: UNREAD_MSGS_SEL, when: 'load'}
    };

    log("FAC_OPTS: ", FAC_OPTS);

    // Options for private chat messages
    const PRIV_OPTS = {
        MY_TEXT_COLOR: {val: options.priv.MY_TEXT_COLOR, style: TEXT_CLR_STYLE, subSel: MY_MSGS_SEL},
        THEM_TEXT_COLOR: {val: options.priv.MY_TEXT_COLOR, style: TEXT_CLR_STYLE, subSel: THEM_MSGS_SEL},
        MY_BORDER: {val: options.priv.MY_BORDER, style: BORDER_STYLE, subSel: MY_MSGS_SEL},
        THEM_BORDER: {val: options.priv.THEM_BORDER, style: BORDER_STYLE, subSel: THEM_MSGS_SEL},
        MY_BG_COLOR: {val: 'black', style: BG_STYLE, subSel: MY_MSGS_SEL},
        THEM_BG_COLOR: {val: 'transparent', style: BG_STYLE, subSel: THEM_MSGS_SEL},
        BODY_BG_COLOR: {val: 'black', style: BG_STYLE, subSel: BODY},
        FOOTER_BG_COLOR: {val: 'black', style: BG_STYLE, subSel: FOOTER}
    };

    logStyle("PRIV_OPTS: ", PRIV_OPTS);

    // Applies to all chat msg text
    const GEN_OPTS = {
        FONT_FAMILY: 'arial',
        FONT_SIZE: '14px',
    };

    logStyle("GEN_OPTS: ", GEN_OPTS);

    const KEY_MAP = {
        'fac': {opts: FAC_OPTS, sel: FAC_SEL, title: "Fac Chat Options", bg: 'gray'}, //'rgba(180, 0, 0, .4)'},
        'priv': {opts: PRIV_OPTS, sel: PRIV_SEL, title: "Private Chats", bg: 'dodgerblue'} //'rgba(0, 0, 180, .4)'}
    };

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

    let pendStylesList = "";
    let atLoadStylesList = "";
    function addStyleToList(rootSel, subSel, val, when='now') {
        let style = `${rootSel} ${subSel} {${val}}`;

        logStyle("Adding style: ", style, " when: ", when);

        if (!when)
            xedx_addStyle(style);
        else if (when == 'now')
            xedx_addStyle(style);
        else if (when == 'pend')
            pendStylesList = pendStylesList + ' ' + style;
        else if (when == 'load')
            atLoadStylesList = atLoadStylesList + ' ' + style;
    }

    // ================== Install styles ============================

    let optionKeys = Object.keys(options);
    log("optionKeys: ", optionKeys);
    for (let keyIdx=0; keyIdx<optionKeys.length; keyIdx++) {
        let key = optionKeys[keyIdx];
        let opts = KEY_MAP[key].opts;
        let sel = KEY_MAP[key].sel;
        let keys = Object.keys(opts);

        log("Styles for: ", key, opts, sel, keys);

        for (let idx=0; idx<keys.length; idx++) {
            let opt = keys[idx];
            let entry = opts[opt];
            let val = entry.val;
            if (val == 'default') continue;
            let styleStr = entry.style;
            if (styleStr) {
                val = styleStr.replace('${val}', val);
            }

            addStyleToList(sel, entry.subSel, val, entry.when);
        }
    }

    if (pendStylesList.length) {
        logStyle("Sending pended style list: ", pendStylesList);
        xedx_addStyle(pendStylesList);
    }

    // Font over-ride
    logStyle("Adding style: ", `
        ${FAC_SEL} ${ALL_MSGS_SEL}, ${PRIV_SEL} ${ALL_MSGS_SEL} {
            font-family: ${GEN_OPTS.FONT_FAMILY} !important;
            font-size: ${GEN_OPTS.FONT_SIZE} !important;
        }
    `);

    xedx_addStyle(`
        ${FAC_SEL} ${ALL_MSGS_SEL}, ${PRIV_SEL} ${ALL_MSGS_SEL} {
            font-family: ${GEN_OPTS.FONT_FAMILY} !important;
            font-size: ${GEN_OPTS.FONT_SIZE} !important;
        }
    `);

    if (addDevStyles == true) {    // Development only
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

    xedx_addStyle(`
        #xedx-wrap {
            display: flex;
            flex-flow: row wrap;
            justify-content: space-between;
        }
        #xopts { cursor: pointer; }
        #xopts:hover { filte: brightness(1.6); }
    `);

    // UI stuff - once page loaded, hook into settings panel
    log("Adding event listener for loaded");
    if (document.readyState == 'loading') {
        log("readyState is loading");
        document.addEventListener('DOMContentLoaded', handlePageLoad);
    } else {
        log("readyState is: ", document.readyState);
        handlePageLoad();
    }

    // ================ After page load =====================

    function hookSettingsBtn() {
        log("hookSettingsBtn: ", $("#notes_settings_button").length);
        $("#notes_settings_button").on('click', function() {
            log("settings btn clicked");
            setTimeout(installOptsUI, 100);
        });
        let stSpan = $("[class*='panelSizeContainer_']").prev();
        if ($(stSpan).length) installOptsUI();
    }

    function handlePageLoad() {
        log("[handlePageLoad]");

        hookSettingsBtn();

        if (atLoadStylesList.length) {
            logStyle("Sending atLoad style list: ", atLoadStylesList);
            xedx_addStyle(atLoadStylesList);
        }
    }

    function addScrollOptStyles() {
        xedx_addStyle(`
            #tcc-outer-opts {
                position: fixed;
                width: 400px;
                height: 400px;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                flex-direction: column;
                /*margin: 0px 10px 10px 10px;*/
                z-index: 999999999;

                border: 1px solid pink;

            }
            #tcc-opts {
                position: fixed;
                width: 400px;
                height: 400px;
                max-height: 400px;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                flex-direction: column;
                /*margin: 0px 10px 10px 10px;*/
                background-color: black;
                border-radius: 6px;
                z-index: 9999999;

                /*border: 1px solid limegreen;*/
            }
            #tcc-tbl-wrap {
                /*position: relative;*/
                cursor: pointer;
                overflow-y: scroll;
                border-radius: 0px 0px 4px 4px;
                padding: 0px;
                /*width: 100%;*/
                /*height: 100%;*/
                justify-content: center;
                display: flex;

                border-left: 3px solid var(--title-black-gradient);
                border-right: 3px solid var(--title-black-gradient);
            }
            #tcc-tbl-wrap tbody {
                /*overflow-y: scroll;*/
                /*height: 400px;*/
                max-height: 372px;
                display: block;
                /*width: 100%;*/
                /*padding: 10px;*/
                margin: 0px 5px 0px 5px;

                /*border: 1px solid blue;*/
            }
            #tcc-tbl-wrap tr {
                /*height: 30px;*/
                /*margin: auto;*/
                display: flex;
                width: 100%;
                height: 26px;
                border-bottom: 2px solid black;

                /*border: 1px solid lightblue;*/
            }
            #tcc-tbl-wrap tr td {
                width: 100%;
                display: flex;
                flex-flow: row wrap;
            }
            #tcc-tbl-wrap tr td input[type='checkbox'] {
                /*width: 30px;*/
                /*border: 1px solid yellow;*/
                margin-left: 10px;
            }
            #tcc-tbl-wrap tr td input[type='text'] {
                width: 40%;
                margin: 4px;
                /*border: 1px solid yellow;*/
                padding-left: 10px;
                border-radius: 4px;
            }
            #tcc-tbl-wrap tr td span {
                /*width: 33%;*/
                margin: auto;
                justify-content: center;
                display: flex;
                flex-flow: row wrap;
                color: white;
                font-family: arial;
                font-size: 12px;
            }
            #tcc-opts-table {
                 table-layout: fixed;
                 width: 400px;
                 margin: 0px 10px 0px 10px;
                 height: 372px;
                 max-height: 372px;
                 /*opacity: 0;*/
                 border-collapse: collapse;
                 /*border: 1px solid blue;*/
             }
             #tcc-hdr, #tcc-ftr {
                height: 28px;
                width: 100%;
                display: flex;
                align-content: center;
                flex-flow: row wrap;
                background: var(--title-black-gradient);
                border: none;
                color: var(--tabs-color);
                font-weight: 700;
                font-size: 14px;
                justify-content: center;
            }
            #tcc-hdr { cursor: pointer; border-top-left-radius: 6px; border-top-right-radius: 6px;}
            #tcc-hdr > span { color: white; font-family: arial; font-size: 14px;}
            #tcc-ftr { border-bottom-left-radius: 6px; border-bottom-right-radius: 6px;}
        `);
    }

    function addTableRows() {
        let optionKeys = Object.keys(options);
        for (let keyIdx=0; keyIdx<optionKeys.length; keyIdx++) {
            let key = optionKeys[keyIdx];
            let opts = KEY_MAP[key].opts;
            let bg = KEY_MAP[key].bg;
            let title = KEY_MAP[key].title;
            let keys = Object.keys(opts);

            let row = `<tr><td style="background: ${bg};">
                         <span style="color: white; font-size:14px;">${title}</span>
                       </td></tr)`;
            $("#tcc-opts-table > tbody").append(row);

            for (let idx=0; idx<keys.length; idx++) {
                let opt = keys[idx];
                let entry = opts[opt];
                let val = entry.val;

                let row = `<tr><td style="background: ${bg};">
                             <input type="checkbox">
                             <span style="color: white; font-size:12px;">${opt}</span>
                             <input type="text" value="${val}">
                           </td></tr)`;
                $("#tcc-opts-table > tbody").append(row);
            }
        }
    }

    function buildOptsDiv() {
        if ($("#tcc-opts").length) return;
        let div = `
                <div id="tcc-opts">
                <div id="tcc-hdr" ><span>Options (click here to close)</span></div>
                <div style="height: 10px; width:100%;background-color: black"></div>
                    <div id="tcc-tbl-wrap">
                        <table id="tcc-opts-table">
                            <tbody>
                            </tbody>
                        </table>
                     </div>
                 <div style="height:10px; width:100%;background-color: black"></div>
                 <div id="tcc-ftr"><span></span></div>
                 </div>
        `;

        let div2 = `
            <div id="tcc-outer-opts">
                <div id="tcc-hdr" ><span>Options (click here to close)</span></div>
                <div id="tcc-opts">
                    <div id="tcc-tbl-wrap">
                        <table id="tcc-opts-table">
                            <tbody>
                            </tbody>
                        </table>
                     </div>
                 </div>
                 <div style="height:10px; width:100%;background-color: black"></div>
                 <div id="tcc-ftr"><span></span></div>
             </div>
        `;
        $('body').after(div);

        addTableRows();
        /*
        for (let idx=0; idx<30; idx++) {
            let bg = (idx % 2 == 1) ? 'background: rgba(80, 80, 80, 0.8);' : 'background: rgba(160, 160, 160, 0.9);';
            let row = `
                <tr>
                     <td>
                         <input type="checkbox">
                         <span style="${bg}">-- sample --</span>
                         <input type="text">
                     </td>
                 </tr)
            `;
            $("#tcc-opts-table > tbody").append(row);
        }
        */

        $("#tcc-hdr").on('click', function(e) { $("#tcc-opts").remove(); });
    }

    function installOptsUI() {
        let stSpan = $("[class*='panelSizeContainer_']").prev(); //$("#settings_panel").closest("[class*='subtitle_']");
        log("installOptsUI: ", $(stSpan).length, $("#xedx-wrap").length);
        if ($("#xedx-wrap").length) return;
        // #settings_panel > div > div:nth-child(3) > span
        let wrapper = `<div id="xedx-wrap" style="display: flex; flex-flow: row wrap; justify-content: space-between;"></div>`;
        let optSpan = `<span id="xopts">Extra Opts</span>`;
        log("wrapping ", $(stSpan));
        $(stSpan).wrap($(wrapper));
        $("#xedx-wrap").append(optSpan);
        log("wrapper: ", $("#xedx-wrap"));

        let classes = classList($(stSpan));
        log("Classes: ", classes);
        classes.forEach(e => { $("#xopts").addClass(e);});
        addScrollOptStyles();

        $("#xopts").on('click', buildOptsDiv);
    }




})();