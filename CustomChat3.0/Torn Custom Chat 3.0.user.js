// ==UserScript==
// @name         Torn Custom Chat 3.0
// @namespace    http://tampermonkey.net/
// @version      1.11
// @description  This script does...
// @author       xedx [2100735]
// @run-at       document-start
// @match        https://www.torn.com/*
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

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
    var options = {
        fac: {
            MY_TEXT_COLOR: '#990000',
            THEM_TEXT_COLOR: 'white',
            MY_BORDER: '1px solid #008800',
            THEM_BORDER: 'default',
            MY_BG_COLOR: 'black',                // 'BG' for 'background'
            THEM_BG_COLOR: 'transparent',
            BODY_BG_COLOR: '#181818',
            FOOTER_BG_COLOR: 'black',
            SNDR_AVATAR_COLOR: '#666',           // In fac chat, color of sender's name
            MSGS_UNREAD: 'none',                 // 'none' hides the blue pop-up that says "x unread messages"
            HDR_USE_ICON: true                   // Display icon in header, links to fac page (TBD)
        },

        priv: {
            MY_TEXT_COLOR: 'white',
            THEM_TEXT_COLOR: 'white',
            MY_BORDER: '1px solid blue',
            THEM_BORDER: 'default',
            MY_BG_COLOR: 'black',
            THEM_BG_COLOR: 'black',
            BODY_BG_COLOR: '#181818',
            FOOTER_BG_COLOR: 'black',
        }
    };

    // GM_xxx replacements
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
    const xedx_getValue = function(key, defValue) {
        if (typeof GM_getValue != "undefined") {
            return GM_getValue(key, defValue);
        } else {
            let tmp = localStorage.getItem(key);
            return tmp ? tmp : defValue;
        }
    };
    const xedx_setValue = function(key, value) {
        (typeof GM_setValue != "undefined") ?
            GM_setValue(key, value) :
            localStorage.setItem(key, value);
    };
    const xedx_deleteValue = function(key) {
        (typeof GM_deleteValue != "undefined") ?
            GM_deleteValue(key) :
            localStorage.removeItem(key);
    };

    loadOptions();

    function saveOptions() {
        //GM_setValue("options.fac", JSON.stringify(options.fac));
        //GM_setValue("options.priv", JSON.stringify(options.priv));
        xedx_setValue("options", JSON.stringify(options));
        loadOptions();
    }

    function loadOptions() {
        let tmp = xedx_getValue("options", null);
        log("loading options: ", tmp);
        if (!tmp) {
            log("Using default options: ", options);
            xedx_setValue("options", JSON.stringify(options));
        } else {
            options = JSON.parse(tmp);
            log("Using saved options: ", options);
        }

        /*
        let tmp = GM_getValue("options.fac", null);
        log("loading fac options: ", tmp);
        if (!tmp)
            GM_setValue("options.fac", JSON.stringify(options.fac));
        else
            options.fac = JSON.parse(tmp);
        log("Loaded: ", options.fac);

        tmp = GM_getValue("options.priv", null);
        if (!tmp)
            GM_setValue("options.priv", JSON.stringify(options.priv));
        else
            options.priv = JSON.parse(tmp);
        */
    }

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

    // Private chat list: #private-channel-list

    // Selectors
    const FAC_SEL = `#chatRoot [id^='faction-']`;
    const PRIV_SEL = `#chatRoot [id^='private-']:not(#private-channel-list) `;
    const BODY = `[class^='content_']`;
    const FOOTER = `[class^='content_'] > [class*='root_']:nth-child(2)`;

    const ALL_MSGS_SEL = `[class^='list_'] [class*='root_']:not([class*='divider'])`;
    const MY_MSGS_SEL = `[class^='list_'] [class*='self_'] span`;
    const MY_MSGS_BOX_SEL = `[class^='list_'] [class*='self_']`;
    const THEM_AVATAR_ROOT = `[class^='list_'] > [class*='root_']:not([class*='self_']):not([class*='divider'])`;
    const THEM_MSGS_SEL = `[class^='list_'] > [class*='root_'] [class*='message_']:not([class*='self_']):not([class*='divider']) span`;
    const THEM_MSGS_BOX_SEL = `[class^='list_'] > [class*='root_']:not([class*='self_']):not([class*='divider'])`;
    const NOT_ADMIN = `:not([class*='admin_'])`;

    const SNDR_NAME = `${THEM_AVATAR_ROOT} [class*='senderContainer_'] [class*='sender_']`;
    const UNREAD_MSGS_SEL = ` > div[class*='content_'] > div[class*='root_'] > button[class*='subtitle_']`;

    // Styles
    const BORDER_STYLE = 'border: ${val} !important;';
    const BG_STYLE = 'background-color: ${val} !important;';
    const TEXT_CLR_STYLE = 'color: ${val} !important;';
    const DISPLAY_STYLE = 'display: ${val} !important;';

    // Options for fac chat messages
    var FAC_OPTS = {
        MY_TEXT_COLOR: {val: options.fac.MY_TEXT_COLOR, style: TEXT_CLR_STYLE, subSel: MY_MSGS_SEL},
        THEM_TEXT_COLOR: {val: options.fac.THEM_TEXT_COLOR, style: TEXT_CLR_STYLE, subSel: THEM_MSGS_SEL},
        MY_BORDER: {val: options.fac.MY_BORDER, style: BORDER_STYLE, subSel: MY_MSGS_BOX_SEL},
        THEM_BORDER: {val: options.fac.THEM_BORDER, style: BORDER_STYLE, subSel: THEM_MSGS_BOX_SEL},
        MY_BG_COLOR: {val: options.fac.MY_BG_COLOR, style: BG_STYLE, subSel: MY_MSGS_BOX_SEL},
        THEM_BG_COLOR: {val: options.fac.THEM_BG_COLOR, style: BG_STYLE, subSel: THEM_MSGS_BOX_SEL},
        BODY_BG_COLOR: {val: options.fac.BODY_BG_COLOR, style: BG_STYLE, subSel: BODY},
        FOOTER_BG_COLOR: {val: options.fac.FOOTER_BG_COLOR, style: BG_STYLE, subSel: FOOTER},
        SNDR_AVATAR_COLOR: {val: options.fac.SNDR_AVATAR_COLOR, style: TEXT_CLR_STYLE, subSel: (SNDR_NAME + NOT_ADMIN), when: 'now'},
        MSGS_UNREAD: {val: options.fac.MSGS_UNREAD, style: DISPLAY_STYLE, subSel: UNREAD_MSGS_SEL, when: 'load'}
    };

    log("FAC_OPTS: ", FAC_OPTS);

    // Options for private chat messages
    var PRIV_OPTS = {
        MY_TEXT_COLOR: {val: options.priv.MY_TEXT_COLOR, style: TEXT_CLR_STYLE, subSel: MY_MSGS_SEL},
        THEM_TEXT_COLOR: {val: options.priv.MY_TEXT_COLOR, style: TEXT_CLR_STYLE, subSel: THEM_MSGS_SEL},
        MY_BORDER: {val: options.priv.MY_BORDER, style: BORDER_STYLE, subSel: MY_MSGS_BOX_SEL},
        THEM_BORDER: {val: options.priv.THEM_BORDER, style: BORDER_STYLE, subSel: THEM_MSGS_BOX_SEL},
        MY_BG_COLOR: {val: options.priv.MY_BG_COLOR, style: BG_STYLE, subSel: MY_MSGS_BOX_SEL},
        THEM_BG_COLOR: {val: options.priv.THEM_BG_COLOR, style: BG_STYLE, subSel: THEM_MSGS_BOX_SEL},
        BODY_BG_COLOR: {val: options.priv.BODY_BG_COLOR, style: BG_STYLE, subSel: BODY},
        FOOTER_BG_COLOR: {val: options.priv.FOOTER_BG_COLOR, style: BG_STYLE, subSel: FOOTER}
    };

    logStyle("PRIV_OPTS: ", PRIV_OPTS);

    // Applies to all chat msg text
    const GEN_OPTS = {
        FONT_FAMILY: 'arial',
        FONT_SIZE: '14px',
    };

    logStyle("GEN_OPTS: ", GEN_OPTS);

    xedx_addStyle(`.bg-blue {background-color: #4275a7;}`);
    xedx_addStyle(`.bg-gray {background-color: #333;}`);
    xedx_addStyle(`.bg-green {background-color: #11653b;}`);

    const KEY_MAP = {
        'fac': {opts: FAC_OPTS, sel: FAC_SEL, title: "Fac Chat Options", bg: 'bg-green'}, //'rgba(180, 0, 0, .4)'},
        'priv': {opts: PRIV_OPTS, sel: PRIV_SEL, title: "Private Chats", bg: 'bg-blue'} //'rgba(0, 0, 180, .4)'}
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
            line-height: 16px !important;
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

    // Make sure when pages change, but not reloaded, our UI remains
    const bindEventListener = function (type) {
        const historyEvent = history[type];
        return function () {
            const newEvent = historyEvent.apply(this, arguments);
            const e = new Event(type);
            e.arguments = arguments;
            window.dispatchEvent(e);
            return newEvent;
        };
    };

    function installPushStateHandler(pushStateChangedHandler) {
        history.pushState = bindEventListener("pushState");
        window.addEventListener("pushState", function (e) {
            pushStateChangedHandler(e);
        });
    }

    window.addEventListener('hashchange', function() {
        log('The hash has changed! new hash: ' + location.hash);
        hookSettingsBtn();}, false);

    installPushStateHandler(hookSettingsBtn);

    window.addEventListener('focus', hookSettingsBtn);

    // ================== UI elements and handlers =========================

    function hookSettingsBtn(retries=0) {
        let stBtn = $("#notes_settings_button");
        log("hookSettingsBtn: ", $(stBtn).length);

        if (!$(stBtn).length) {
            if (retries++ < 20) return setTimeout(hookSettingsBtn, 250, retries);
            return log("Timed out finding settings button");
        }

        $(stBtn).off('click.xedx');
        $(stBtn).css("border", "1px solid green");
        log("Added border to ", $(stBtn));

        $(stBtn).on('click.xedx', function() {
            log("settings btn clicked");
            setTimeout(installOptsBtn, 100);
        });
        log("Added handler to ", $(stBtn));

        let stSpan = $("[class*='panelSizeContainer_']").prev();
        log("stSpan: ", $(stSpan));

        if ($(stSpan).length) installOptsBtn();
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
                background-color: black;
                border-radius: 6px;
                z-index: 9999999;

                /*border: 1px solid limegreen;*/
            }
            #tcc-tbl-wrap {
                cursor: pointer;
                overflow-y: scroll;
                border-radius: 0px 0px 4px 4px;
                padding: 0px;
                justify-content: center;
                display: flex;
                border-left: 3px solid var(--title-black-gradient);
                border-right: 3px solid var(--title-black-gradient);
            }
            #tcc-tbl-wrap tbody {
                max-height: 372px;
                display: block;
                margin: 0px 5px 0px 5px;

                /*border: 1px solid blue;*/
            }
            #tcc-tbl-wrap tr {
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
                margin-left: 10px;
            }
            #tcc-tbl-wrap tr td input[type='text'] {
                width: 40%;
                margin: 4px;
                padding-left: 10px;
                border-radius: 4px;
            }
            #tcc-tbl-wrap tr td span {
                margin: auto;
                justify-content: center;
                display: flex;
                flex-flow: row wrap;
                color: white;
                font-family: arial;
                font-size: 14px;
            }
            #tcc-opts-table {
                 table-layout: fixed;
                 width: 400px;
                 margin: 0px 10px 0px 10px;
                 height: 372px;
                 max-height: 372px;
                 border-collapse: collapse;

                 /*border: 1px solid blue;*/
             }
             #tcc-hdr, #tcc-ftr {
                height: 38px;
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
            #tcc-ftr {
                border-bottom-left-radius: 6px;
                border-bottom-right-radius: 6px;
                color: white;
                font-family: arial;
                font-size: 14px;
            }
            #tcc-ftr > span {
                color: inherit;
                font-family: inherit;
                font-size: 14px;
                background-color: inherit;
            }

            .tbl-fnt-12 {color: white; font-size:12px;}
            .tbl-fnt-14 {color: white; font-size:14px;}
            .td-hdr {
                filter: brightness(1.4) !important;
                font-weight: bold !important;
                border: 2px solid black !important;
                border-radius: 4px;
                background: linear-gradient(180deg, #555555 0%, #333333 100%);
                cursor: none;
            }
            .td-hdr > span:not(.btn) {
                color: black !important;
            }
            .tcc-hdr-first {
                display: flex;
                flex-flow: row wrap;
                justify-content: center;
                width: 62%;
                align-content: center;
            }

            .opt-sp:hover {filter: brightness(1.8); font-weight: bold;}
            .tcc-xrt-btn {
                margin-right: 10px;
                float: right;
                /*width: 72px;
                height: 22px;*/

            }
            .tcc-force-r {
                margin-left: auto;
            }
             .tcc-torn-btn:hover {
                filter: brightness(2.00);
             }
             .tcc-torn-btn:active {
                filter: brightness(0.80);
             }

            .tcc-torn-btn {
                height: 20px;
                width: 64px;
                /*line-height: 22px;*/
                font-family: "Fjalla One", Arial, serif;
                font-size: 14px;
                font-weight: normal;
                text-align: center;
                text-transform: uppercase;
                border-radius: 5px;
                /*padding: 0 10px;*/
                cursor: pointer;
                color: #555;
                color: var(--btn-color);
                text-shadow: 0 1px 0 #FFFFFF40;
                text-shadow: var(--btn-text-shadow);
                background: linear-gradient(180deg, #DEDEDE 0%, #F7F7F7 25%, #CFCFCF 60%, #E7E7E7 78%, #D9D9D9 100%);
                background: var(--btn-background);
                border: 1px solid #aaa;
                border: var(--btn-border);
                display: inline-block;
                vertical-align: middle;
             }
             .tcc-between {
                display: flex;
                flex-flow: row wrap;
                justify-content: space-between;
                align-content: center;
            }
            .btn-between {
                font-size: 12px;
                margin: 2px 2px 2px 8px;
                border-radius: 4px;
                border: 1px solid white;
                background-color: #666;
            }
            .btn-between:hover {
                filter: brightness(1.6);
            }
        `);
    }

    function applySampleStyle(styleStr, val) {
        let orgVal = val;
        let style = styleStr.replace('${val}', val);
        if (styleStr.indexOf("background-color") > -1)
            style += ` background: ${val} !important;`;
        log("applySampleStyle, style: ", style);
        $("#tcc-ftr").attr("style", style);
    }

    function handleRowClick(e) {
        let key = $(this).attr("data-map");
        let opt = $(this).attr("data-opt");
        log("handleRowClick, key: ", key, " opt: ", opt);
        let entry = KEY_MAP[key].opts[opt];
        log("handleRowClick, entry: ", entry);
        let val = entry.val;
        let styleStr = entry.style;
        log("handleRowClick, val: ", val, " styleStr: ", styleStr);

        let cells = $("#tcc-opts-table > tbody > tr > td");
        log("cells: ", cells);
        //cells.forEach((el) => {
        for (let idx=0; idx<cells.length; idx++) {
            let el = cells[idx];
            $(el).attr("style", "");
        };
        log("Removed cell styles from: ", cells);

        $(this).parent().css("filter", "brightness(1.4)");

        if (styleStr && val != 'default') {
            applySampleStyle(styleStr, val);
        } else {
            $("#tcc-ftr").attr("style", "");
        }
    }

    function handleOptValChange(e) {
        let prevSib = $(this).prev();

        let key = $(prevSib).attr("data-map");
        let opt = $(prevSib).attr("data-opt");
        log("handleOptValChange, key: ", key, " opt: ", opt);
        let entry = KEY_MAP[key].opts[opt];
        log("handleOptValChange, entry: ", entry);

        let styleStr = entry.style;
        let oldVal = entry.val;
        let newVal = $(this).val();
        log("handleOptValChange, oldVal: ", oldVal, " new: ", newVal);


        log(`Setting options[${key}][${opt}] = ${newVal};`);
        log(`setting KEY_MAP[${key}].opts[${opt}].val `);
        log("Original options: ", options);
        log("FAC_OPTS, before: ", FAC_OPTS);
        log("PRIV_OPTS, before: ", PRIV_OPTS);

        options[key][opt] = newVal;
        KEY_MAP[key].opts[opt].val = newVal;

        log("New options: ", options);
        saveOptions();

        log("Options, after: ", options);
        log("FAC_OPTS, after: ", FAC_OPTS);
        log("PRIV_OPTS, after: ", PRIV_OPTS);

        if (styleStr && newVal != 'default') {
            applySampleStyle(styleStr, newVal);
        } else {
            $("#tcc-ftr").attr("style", "");
        }
    }

    function handleReset(e) {
        xedx_setValue("options.saved", JSON.stringify(options));
        xedx_deleteValue("options");
        location.reload();
    }

    function handleSetDefault(e) {

    }

    function addTableRows() {
        let optionKeys = Object.keys(options);
        for (let keyIdx=0; keyIdx<optionKeys.length; keyIdx++) {
            let key = optionKeys[keyIdx];
            let opts = KEY_MAP[key].opts;
            let bg = KEY_MAP[key].bg;
            let title = KEY_MAP[key].title;
            let keys = Object.keys(opts);

            let row = `<tr><td class="${bg} td-hdr tcc-between">
                         <span class="btn-between btn-default">Default</span>
                         <span class="tbl-fnt-14">${title}</span>
                         <span class="btn-between btn-reset">Reset</span>
                       </td></tr)`;
            let resetRow = `<tr><td class="tcc-between">
                                <span class="tcc-xrt-btn btn"><input class="tcc-torn-btn" value="Reset"></span>
                                <span class="tcc-xrt-btn btn"><input class="tcc-torn-btn" value="Default"></span>
                            </td></tr)`;
            $("#tcc-opts-table > tbody").append(row);

            for (let idx=0; idx<keys.length; idx++) {
                let opt = keys[idx];
                let entry = opts[opt];
                let val = entry.val;
                let styleStr = entry.style;

                //if (styleStr && val != 'default') {
                //    val = styleStr.replace('${val}', val);
                //}

                let row = `<tr><td class="${bg}">
                             <input type="checkbox">
                             <span id="sopt-${keyIdx}-${idx}" class="tbl-fnt-12 opt-sp" data-map="${key}" data-opt="${opt}">${opt}</span>
                             <input type="text" value="${val}">
                           </td></tr)`;

                $("#tcc-opts-table > tbody").append(row);
                $(`#sopt-${keyIdx}-${idx}`).on('click.xedx', handleRowClick);
                $(`#sopt-${keyIdx}-${idx}`).next().on('change.xedx', handleOptValChange);

                //if (styleStr && val != 'default') {
                //    log("Adding row style: ", val);
                //    $(`#sopt-${keyIdx}-${idx}`).parent().attr("style", val);
                //}
            }

            //$("#tcc-opts-table > tbody").append(resetRow);

            $(".btn-default").on('click.xedx', handleSetDefault);
            $(".btn-reset").on('click.xedx', handleReset);
        }
    }

    function buildOptsDiv() {
        if ($("#tcc-opts").length) return;
        let div = `
                <div id="tcc-opts">
                <div id="tcc-hdr" >
                    <span class="tcc-hdr-first">Options</span>
                    <span class="tcc-xrt-btn tcc-force-r btn"><input id="tcc-close" class="tcc-torn-btn" value="Close"></span>
                    <span class="tcc-xrt-btn btn"><input id="tcc-reload" class="tcc-torn-btn" value="Reload"></span>
                </div>
                <div style="height: 10px; width:100%;background-color: black"></div>
                    <div id="tcc-tbl-wrap">
                        <table id="tcc-opts-table">
                            <tbody>
                            </tbody>
                        </table>
                     </div>
                 <div style="height:10px; width:100%;background-color: black"></div>
                 <div id="tcc-ftr"><span>Select Row, Click to Test</span></div>
                 </div>
        `;

        $('body').after(div);

        addTableRows();

        $("#tcc-close").on('click.xedx', function(e) { $("#tcc-opts").remove(); });
        $("#tcc-reload").on('click.xedx', function() {location.reload();});
    }

    function installOptsBtn() {
        let stSpan = $("[class*='panelSizeContainer_']").prev(); //$("#settings_panel").closest("[class*='subtitle_']");
        log("installOptsBtn: ", $(stSpan).length, $("#xedx-wrap").length);
        if ($("#xedx-wrap").length) {
            return log("Opts wrap already installed");
        }

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