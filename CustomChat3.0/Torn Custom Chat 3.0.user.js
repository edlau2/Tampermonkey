// ==UserScript==
// @name         Torn Custom Chat 3.0
// @namespace    http://tampermonkey.net/
// @version      1.7
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
            MSGS_UNREAD: 'none'                  // 'none' hides the blue pop-up that says "x unread messages"
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

    //log("Options: ", options);

    // =========== End editable options ===============

    const addDevStyles = false;    // This ATM puts borders on various chat boxes, I use during development to locate elements
    const pendStyles = false;

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
        let style = `${rootSel} ${subSel} {
                ${val}
            }`;

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

    let opts = FAC_OPTS;
    let keys = Object.keys(opts);
    for (let idx=0; idx<keys.length; idx++) {
        let opt = keys[idx];
        let entry = opts[opt];
        let val = entry.val;
        if (val == 'default') continue;
        let subSel = entry.subSel;
        let styleStr = entry.style;
        let when = entry.when;
        if (styleStr) {
            val = styleStr.replace('${val}', val);
        }

        addStyleToList(FAC_SEL, subSel, val, when);
    }

    opts = PRIV_OPTS;
    keys = Object.keys(opts);
    for (let idx=0; idx<keys.length; idx++) {
        let opt = keys[idx];
        let entry = opts[opt];
        let val = entry.val;
        let when = entry.when;
        if (val == 'default') continue;
        let subSel = entry.subSel;
        let styleStr = entry.style;
        if (styleStr) {
            //log("val: ", val);
            val = styleStr.replace('${val}', val);
            //log("New val: ", val);
        }

        addStyleToList(PRIV_SEL, subSel, val, when);
    }

    if (pendStylesList.length) {
        logStyle("Sending pended style list: ", pendStylesList);
        xedx_addStyle(pendStylesList);
    }

    // Font over-ride
    log("Adding style: ", `
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

    // 'Unread Messages" pop-up balloon
    /*
    log("Adding style: ", `
        ${FAC_SEL} ${UNREAD_MSGS_SEL} {
            display: none;
        }
    `);
    xedx_addStyle(`
        ${FAC_SEL} ${UNREAD_MSGS_SEL} {
            display: none;
        }
    `);
    */

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

    function addScrollLockToBottom() {
        /*
        addScrollLockStyles();
        let anchorDiv = `<div id="anchor"></div>`;
        let scrollWrap = $("#chatRoot [id^='faction-'] [class^='scrollContainer_']");
        let list = $("#chatRoot [id^='faction-'] [class^='scrollContainer_'] [class^='list_']");

        log("List: ", $(list));

        let classList;
        let tmp = $(list).attr("class");
        if (tmp) {
            classList = tmp.split(/\s+/);
            log("CL: ", classList);
            let listItemClass = classList[0].trim();
            let style = `${listItemClass} * {overflow-anchor: none;}`;
            xedx_addStyle(style);
            log("Added style: ", style);
        }

        $(list).append(anchorDiv);
        */

        /*
        <style type="text/css">
        .scrollarea-content{margin:0;padding:0;overflow:hidden;position:relative;touch-action:none}
        .scrollarea-content:focus{outline:0}
        .scrollarea{position:relative;overflow:hidden}
        .scrollarea .scrollbar-container{position:absolute;background:none;opacity:.1;z-index:99;-webkit-transition:all .4s;transition:all .4s}
        .scrollarea .scrollbar-container.horizontal{width:100%;height:10px;left:0;bottom:0}
        .scrollarea .scrollbar-container.horizontal .scrollbar{width:20px;height:8px;background:#000;margin-top:1px}
        .scrollarea .scrollbar-container.vertical{width:10px;height:100%;right:0;top:0}
        .scrollarea .scrollbar-container.vertical .scrollbar{width:8px;height:20px;background:#000;margin-left:1px}
        .scrollarea .scrollbar-container.active,.scrollarea .scrollbar-container:hover{background:gray;opacity:.6!important}
        .scrollarea:hover .scrollbar-container{opacity:.3}</style>
        */
    }

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


        addScrollLockToBottom();
    }

    // $("#faction-8151 > div[class*='content_'] > div[class*='root_'] > button[class*='subtitle_']")

    function addScrollLockStyles() {

        xedx_addStyle(`
            #anchor {
                overflow-anchor: auto;
                height: 1px;
            }
        `);
    }

    function addScrollOptStyles() {
        xedx_addStyle(`
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

                border: 1px solid limegreen;
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
            }
            #tcc-tbl-wrap tbody {
                overflow-y: scroll;
                /*height: 400px;*/
                max-height: 372px;
                display: block;
                /*width: 100%;*/
                /*padding: 10px;*/
                margin: 5px;
                border: 1px solid blue;
            }
            #tcc-tbl-wrap tr {
                /*height: 30px;*/
                /*margin: auto;*/
                display: flex;
                width: 100%;
                border: 1px solid lightblue;
            }
            #tcc-tbl-wrap tr td {
                width: 100%;
                display: flex;
                flex-flow: row wrap;
            }
            #tcc-tbl-wrap tr td input[type='checkbox'] {
                width: 30px;
                border: 1px solid yellow;
            }
            #tcc-tbl-wrap tr td input[type='text'] {
                width: 40%;
                margin-right: 10px;
                border: 1px solid yellow;
            }
            #tcc-tbl-wrap tr td span {
                /*width: 33%;*/
                margin: auto;
                justify-content: center;
                display: flex;
                flex-flow: row wrap;
            }
            #tcc-opts-table {
                 table-layout: fixed;
                 width: 400px;
                 margin: 10px;
                 height: 372px;
                 max-height: 372px;
                 /*opacity: 0;*/
                 border-collapse: collapse;
                 border: 1px solid blue;
             }
             #tcc-hdr {
                height: 28px;
                width: 100%;
                display: flex;
                align-content: center;
                flex-flow: row wrap;
                background: var(--tabs-bg-gradient);
                border: none;
                color: var(--tabs-color);
                font-weight: 700;
                font-size: 14px;
                justify-content: space-between;
            }
        `);
    }

    function buildOptsDiv() {
        if ($("#tcc-opts").length) return;
        let div = `
            <div id="tcc-opts">
                <div id="tcc-hdr"><span>Options (click here to close)</span></div>
                <div id="tcc-tbl-wrap">
                    <table id="tcc-opts-table">
                        <tbody>
                        </tbody>
                    </table>
                 </div>
             </div>
        `;
        $('body').after(div);

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