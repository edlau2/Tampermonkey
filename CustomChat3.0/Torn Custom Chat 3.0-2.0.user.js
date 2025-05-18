// ==UserScript==
// @name         Torn Custom Chat 3.0
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  This script does...
// @author       xedx [2100735]
// @run-at       document-start
// @match        https://www.torn.com/*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
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

    const dbgStyles = true;
    const log = function(...data) {console.log(GM_info.script.name + ': ', ...data);}
    const logStyle = function(...data) {if (dbgStyles == true) console.log(GM_info.script.name + ': ', ...data);}
    let pendStylesList = "";
    let atLoadStylesList = "";
    log("script started");

    if (checkCloudFlare()) return console.log("Custom Chat Won't run while challenge active!");

    function checkCloudFlare() {
    //if ($("#challenge-form").length > 0) {
    let active = false;
    if (document.querySelector("#challenge-form")) {
        active = true;
    } else if (location.href.indexOf('recaptcha') > -1) {
        active = true;
    } else if (document.querySelector(".iAmUnderAttack")) {
        active = true;
    } else {
        console.log(GM_info.script.name + " no active Cloudflare challenge detected.");
    }
    if (active == true) {
        console.log(GM_info.script.name + " Cloudflare challenge active!");
        return true;
    }
    return false;
}

    document.addEventListener("readystatechange", handleReadyState);

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
            MY_TEXT_COLOR: '#990000',   // addStyle( `${FAC_STYLE} ${MY_MSGS_SEL} { color: var(--tcc_my_chat_color);}
                                        // Init var: :root {--tcc_my_chat_color: '';}
                                        // Change on the fly: document.body.style.setProperty('--tcc_my_chat_color', '#990000');
            THEM_TEXT_COLOR: 'white',
            MY_BORDER: '1px solid #008800',
            THEM_BORDER: 'default',
            MY_BG_COLOR: 'black',                // 'BG' for 'background'
            THEM_BG_COLOR: 'transparent',
            BODY_BG_COLOR: '#181818',
            FOOTER_BG_COLOR: 'black',
            SNDR_AVATAR_COLOR: '#666',           // In fac chat, color of sender's name
            MSGS_UNREAD: true,                   // 'none' hides the blue pop-up that says "x unread messages"
            MSG_BOX_HEIGHT: '39px'               // Height of text input field
            //HDR_USE_ICON: true                   // Display icon in header, links to fac page (TBD)
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
            MSG_BOX_HEIGHT: '39px'               // Height of text input field
        }
    };

    log("Default options: ", options);

    // ================= New experimental Method ===================

    // New approach: add ALL styles we used, with prop as ''. i.e., <selector> {color: var(--text-color);}
    // and document.body.style.setProperty('--color-tide', '');
    // Immediately apply by setting the property
    /*
    MY_TEXT_COLOR: '#990000',   // addStyle( `${FAC_STYLE} ${MY_MSGS_SEL} { color: var(--tcc_my_chat_color);}
                                        // Init var: :root {--tcc_my_chat_color: '';}
                                        // Change on the fly: document.body.style.setProperty('--tcc_my_chat_color', '#990000');

    function keyToVarName(key) {return "--" + key.replaceAll("_", "-").toLowerCase();}

    var opts = {
        FAC_MY_TEXT_COLOR: {enabled: true, selector: FAC_TEXT_SEL, style: `color: var(keyToVarName(${key}))`, desc:"My text color in fac chat"
        hmmm, can't really use the key as a var, unless itself is vay somwhere else...

        opts = [
            {enabled: true, selector: FAC_TEXT_SEL, style: `color: var(--fac-my-text-color);`, ...
        ];

        ..or, build table from that template, if not saved in storage:
        for (let idx=0; idx<keys.length;...) {
            let key = keys[idx];
            let entry = opts[key];
            entry["style"] = `color: var(keyToVarName(${key}))`;
            ... or save property and val separate? ..nah...vary too much
            Save last variable values as is or by key name???
            Or have "style: `color: var($val);`" and replace $val with keyToVarName(${key})?

        maybe small table that references longer entries in another?

    var optsTable = { // This way, key can be used as var for other table's values, that buld actual table
                      // Maybe desc and section (fac, priv, group_ here also, just to build UI?
        FAC_MY_TEXT_COLOR: {enabled: true, value: 'green'}
        }

    var optsValues = {
        {selector: FAC_TEXT_SEL, style: `color: var(keyToVarName(${key}));`

    */

    const optionsDefault = {
        optionKey1: {enabled: true, display: "Some option text",
                     order: 0, type: 'style', when: 'now',
                     selector: 'pre-defined',
                     variable: '--this-prop-color',
                     property: 'color: var(--this-prop-color) !important;',
                     value: ''},

    }


    // ==============================================================

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

    function saveOptions(reload=true) {
        xedx_setValue("options", JSON.stringify(options));
        if (reload == true) loadOptions(false);
    }

    function loadOptions(doSave=true) {
        let tmp = xedx_getValue("options", null);
        log("loading options: ", tmp);
        if (!tmp) {
            log("Using default options: ", options);
            xedx_setValue("options", JSON.stringify(options));
        } else { // This will merge in any new options
            log("xxx-chat fac opts before merge: ", options.fac);
            let tmpOpts = JSON.parse(tmp);
            log("xxx-chat tmp fac opts before merge: ", tmpOpts.fac);
            let primaryKeys = Object.keys(tmpOpts);
            for (let idx=0; idx<primaryKeys.length; idx++) {
                let primKey = primaryKeys[idx];
                let obj = tmpOpts[primKey];
                let secKeys = Object.keys(obj);
                if (primKey == 'fac') log("xxx-chat Iterate primary key: ", primKey, " sec keys: ", secKeys);
                for (let j=0; j<secKeys.length; j++) {
                    let key = secKeys[j];
                    let val = obj[key];
                    if (primKey == 'fac') log("xxx-chat Got ", key, " = ", val);
                    if (primKey == 'fac') log("xxx-char setting options[", primKey, "][", key, "] = ", val);
                    options[primKey][key] = val;
                    if (primKey == 'fac') log("xxx-chat, val is: ", options[primKey][key], " for ", key);
                }
            }
            log("xxx-chat fac opts after merge: ", options.fac);
            //log("Using saved options: ", options);
        }
        if (doSave == true) {
            log("xxx-chat fac opts before save: ", options.fac);
            saveOptions(false);
            options = JSON.parse(xedx_getValue("options", {}));
            log("xxx-chat fac opts, reloaded: ", options.fac);
        }
    }

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

    const FAC_SCROLL_LIST = `#chatRoot [id^='faction-'] [class^='scrollContainer_'] [class^='list_']`;
    const FAC_SCROLL_LIST_LAST = `#chatRoot [id^='faction-'] [class^='scrollContainer_'] [class^='list_'] div:last`;

    const ALL_MSGS_SEL = `[class^='list_'] [class*='root_']:not([class*='divider'])`;
    const MY_MSGS_SEL = `[class^='list_'] [class*='self_'] span`;
    const MY_MSGS_BOX_SEL = `[class^='list_'] [class*='self_']`;
    const THEM_AVATAR_ROOT = `[class^='list_'] > [class*='root_']:not([class*='self_']):not([class*='divider'])`;
    const THEM_MSGS_SEL = `[class^='list_'] > [class*='root_']:not([class*='self_']):not([class*='divider']) [class*='message_'] span`;
    const THEM_MSGS_BOX_SEL = `[class^='list_'] > [class*='root_']:not([class*='self_']):not([class*='divider'])`;
    const NOT_ADMIN = `:not([class*='admin_'])`;

    const SNDR_NAME = `${THEM_AVATAR_ROOT} [class*='senderContainer_'] [class*='sender_']`;
    //const UNREAD_MSGS_SEL = ` > div[class*='content_'] > div[class*='root_'] > button[class*='subtitle_']`;
    const UNREAD_MSGS_SEL = ` > div[class*='content_'] > div[class*='root_'] [class*='closeButton']`;
    const MSG_BBL_SEL = `[class*='messageCount_']`;

    // $("#chatRoot [id^='faction-'] > div[class*='content_'] > div[class*='root_'] button[class*='closeButton_']")

    // Styles
    const BORDER_STYLE = 'border: ${val} !important;';
    const BG_STYLE = 'background-color: ${val} !important;';
    const TEXT_CLR_STYLE = 'color: ${val} !important;';
    const DISPLAY_STYLE = 'display: ${val} !important;';
    const HEIGHT_STYLE = 'height: ${val} !important;';

    // Options for fac chat messages.
    // 'val' is the value used for the style defined by the 'style' property.
    // The selector has already been chosen by the KEY_MAP, the sub selector is appended.
    // The 'type' defines if a checkbox, input field, or both are in themenu row for the option.
    // The display name is the  internal option name (key), unless the entry has a 'display' property.
    // ('input', 'cb', or 'both' - not present defaults to both)
    // The 'help' field defines context sensitive help, if present.
    var FAC_OPTS = {
        MY_TEXT_COLOR: {val: options.fac.MY_TEXT_COLOR, style: TEXT_CLR_STYLE,
                        subSel: MY_MSGS_SEL, type: 'input', display: "Color of my sent messages"},
        THEM_TEXT_COLOR: {val: options.fac.THEM_TEXT_COLOR, style: TEXT_CLR_STYLE,
                          subSel: THEM_MSGS_SEL, type: 'input', display: "Color of other people's text"},
        MY_BORDER: {val: options.fac.MY_BORDER, style: BORDER_STYLE,
                    subSel: MY_MSGS_BOX_SEL, type: 'input', display: "Border color around your msgs"},
        THEM_BORDER: {val: options.fac.THEM_BORDER, style: BORDER_STYLE,
                      subSel: THEM_MSGS_BOX_SEL, type: 'input', display: "Border color around their msgs"},
        MY_BG_COLOR: {val: options.fac.MY_BG_COLOR, style: BG_STYLE,
                      subSel: MY_MSGS_BOX_SEL, type: 'input', display: "My messages background color"},
        THEM_BG_COLOR: {val: options.fac.THEM_BG_COLOR, style: BG_STYLE,
                        subSel: THEM_MSGS_BOX_SEL, type: 'input', display: "My messages background color"},
        BODY_BG_COLOR: {val: options.fac.BODY_BG_COLOR, style: BG_STYLE,
                        subSel: BODY, type: 'input', display: "Color of background around msgs"},
        FOOTER_BG_COLOR: {val: options.fac.FOOTER_BG_COLOR, style: BG_STYLE,
                          subSel: FOOTER, type: 'input', display: "Color of footer"},
        SNDR_AVATAR_COLOR: {val: options.fac.SNDR_AVATAR_COLOR, style: TEXT_CLR_STYLE,
                            subSel: (SNDR_NAME + NOT_ADMIN), when: 'now', type: 'input', display: "Sender name color"},
        MSGS_UNREAD: {val: options.fac.MSGS_UNREAD, style: DISPLAY_STYLE,
                      subSel: UNREAD_MSGS_SEL, when: 'now', type: 'cb',
                      fn: 'MSGS_UNREAD', display: "Auto-Scroll, hide unread msg balloon"},
        MSG_BOX_HEIGHT: {val: options.fac.MSG_BOX_HEIGHT, style: HEIGHT_STYLE,
                      subSel: FOOTER, when: 'load', type: 'input',
                      display: "Height of text area you type in"},
    };

    log("FAC_OPTS: ", FAC_OPTS);

    // Options for private chat messages
    var PRIV_OPTS = {
        MY_TEXT_COLOR: {val: options.priv.MY_TEXT_COLOR, type: 'input', style: TEXT_CLR_STYLE,
                        subSel: MY_MSGS_SEL, display: "Color of my sent messages"},
        THEM_TEXT_COLOR: {val: options.priv.MY_TEXT_COLOR, type: 'input', style: TEXT_CLR_STYLE,
                          subSel: THEM_MSGS_SEL, display: "Color of other people's text"},
        MY_BORDER: {val: options.priv.MY_BORDER, type: 'input', style: BORDER_STYLE,
                    subSel: MY_MSGS_BOX_SEL, display: "Border color around your msgs"},
        THEM_BORDER: {val: options.priv.THEM_BORDER, type: 'input', style: BORDER_STYLE,
                      subSel: THEM_MSGS_BOX_SEL, display: "Border color around their msgs"},
        MY_BG_COLOR: {val: options.priv.MY_BG_COLOR, type: 'input', style: BG_STYLE,
                      subSel: MY_MSGS_BOX_SEL, display: "My messages background color"},
        THEM_BG_COLOR: {val: options.priv.THEM_BG_COLOR, type: 'input', style: BG_STYLE,
                        subSel: THEM_MSGS_BOX_SEL, display: "My messages background color"},
        BODY_BG_COLOR: {val: options.priv.BODY_BG_COLOR, type: 'input', style: BG_STYLE,
                        subSel: BODY, display: "Color of background around msgs"},
        FOOTER_BG_COLOR: {val: options.priv.FOOTER_BG_COLOR, type: 'input', style: BG_STYLE,
                          subSel: FOOTER, display: "Color of footer"},
        MSG_BOX_HEIGHT: {val: options.priv.MSG_BOX_HEIGHT, style: HEIGHT_STYLE, subSel: FOOTER,
                         when: 'load', type: 'input',display: "Height of input text area"},
    };

    logStyle("PRIV_OPTS: ", PRIV_OPTS);

   // ======================  New style table (experimental) =======================
   // ...is above...
   // =============================================================================

    // Applies to all chat msg text (make an option!)
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

    // ================ Handlers for checkbox style options ==========================

    var unreadMsgs;
    const unreadMsgsSel = FAC_SEL + UNREAD_MSGS_SEL;

    function hideUnreadMsgsBalloon(selector, attempts=0) {
        let msgs = document.querySelectorAll(selector);
        //log("Unread msgs: ", msgs);
        if (msgs && msgs.length) {
            msgs.forEach(element => {
                //log("Clicking ", $($(element)[0]), $(element));
                //element.style.display = 'none';
                $(element)[0].click();
            });
        } else {
            if (attempts++ < 20) setTimeout(hideUnreadMsgsBalloon, 50, selector, attempts);
        }
    }

    function hideUnreadMsgsBubbles(selector, attempts=0) {
        let bubbles = document.querySelectorAll(`[class*='messageCount_']`);
        //log("hideUnreadMsgsBubbles: ", attempts);
        //log("bubbles: ", $(bubbles));

        if (!$(bubbles).length) {
            if (attempts++ < 20) {
                //log("Setting bubbles timeout...");
                return setTimeout(hideUnreadMsgsBubbles, 50, selector, attempts);
            }
            //log("Not checking bubbles anymore");
            return;
        }

        //log("Got bubbles: ", $(bubbles).length, $(bubbles));

        for (let idx=0; idx<$(bubbles).length; idx++) {
            let bbl = $(bubbles)[idx];
            let btn = $(bbl).parent();
            let btnId = $(btn).attr("id");
            //log("bubbles btn: ", $(btn), " id: ", btnId);
            //log("msg: ", $(bbl));

            if (btnId && btnId.indexOf("faction") > -1) {
                //log("Hidding bubble!! ", $(bbl));
                bbl.style.display = 'none';
            }
        }
    }

    // =================== Chat box scrolling ===================

    var facUnreadBubble = `#faction-8151 > div.content___n3GFQ > div.root___uo_am > button`;

    // Do these with observer...
    function scrollToLastElement() {
        //log("xxx scroll [scrollToLastElement]");
        //if ($(FAC_SCROLL_LIST_LAST).get(0))
        //    $(FAC_SCROLL_LIST_LAST).get(0).scrollIntoView({ behavior: 'smooth', block: 'end' });

        var list = $(FAC_SCROLL_LIST);
        try {
            if (list[0]) {
                //log("**** List found! ", list[0], $(list)[0]);
                list.scrollTop($(list)[0].scrollHeight);
                //log("**** scrolled: ", $(list)[0].scrollHeight);
            } else {

                log("Error: no list! ", $(list), $(list)[0], list);
            }
        } catch (e) {
            log("Error: ", e);
        }
    }

    var tmpClickCnt = 0;
    function clickFacUnreadBtn() {
        if ($(facUnreadBubble).length > 0) {
            //log("xxx scroll [click] ", $(facUnreadBubble).length);
            $($(facUnreadBubble)[0]).click();
        }
        scrollToLastElement();
    }

    var scrollTimer;
    function instScrollOpts() {
        let ap = (location.href.indexOf("loader.php?sid=attack&user2ID") > -1);
        log("xxx scroll inst, ap: ", ap);
        if (ap == false && !scrollTimer) {

            GM_addStyle(`#faction-8151 > div.content___n3GFQ > div.root___uo_am > button {display: none !important;}`);

            scrollTimer = setInterval(scrollToLastElement, 3000);
            //scrollTimer = setInterval(clickFacUnreadBtn, 1000);
            log("xxx scroll timer added");
        }
    }

    instScrollOpts();


    // ================== Install styles ============================

    function handleCbOption(entry) {
        log("handleCbOption: ", entry.fn);
        switch(entry.fn) {
            case 'MSGS_UNREAD':
                /*
                GM_addStyle(`
                    #faction-8151 > div.content___n3GFQ > div.root___uo_am > button {
                        display: none !important;
                    }
                `);
                */

                //instScrollOpts();
                //hideUnreadMsgsBalloon(unreadMsgsSel);
                hideUnreadMsgsBubbles(MSG_BBL_SEL);

                break;

            default:
                break;
        }
    }

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
            let type = entry.type;
            let val = entry.val;

            if (val == 'default' || val == false) continue;
            if (type == 'cb') {
                handleCbOption(entry);
            }
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
        #xopts:hover { filter: brightness(1.6); }
    `);

    // UI stuff - once page loaded, hook into settings panel
    log("Adding event listener for loaded");
    if (document.readyState == 'loading') {
        log("readyState is loading (adding listener for DOMContentLoaded)");
        document.addEventListener('DOMContentLoaded', (e) => {
            log("DOMContentLoaded: ", document.readyState);
            handlePageLoad({from: "DOMContentLoaded"});
        });
    } else {
        log("readyState is: ", document.readyState);
        handlePageLoad({from: document.readyState});
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
        //log("Added border to ", $(stBtn));

        $(stBtn).on('click.xedx', function() {
            log("settings btn clicked");
            setTimeout(installOptsBtn, 100);
        });
        //log("Added handler to ", $(stBtn));

        let stSpan = $("[class*='panelSizeContainer_']").prev();
        //log("stSpan: ", $(stSpan));

        if ($(stSpan).length) installOptsBtn();
    }

    function handlePageLoad(params) {
        log("[handlePageLoad], params: ", params);

        $("[class*='scrollContainer']").parent().scrollTop(10000);

        hookSettingsBtn();

        // Trying  to add at ready state change...earlier than load...
        if (atLoadStylesList.length) {
            //logStyle("Sending atLoad style list: ", atLoadStylesList);
            //xedx_addStyle(atLoadStylesList);
        }
    }

    var atLoadComplete;
    function handleReadyState(e) {
        log("readystatechange: ", document.readyState);
        if (atLoadStylesList.length && !atLoadComplete) {
            log("Loading atLoad styles.");
            logStyle("Sending atLoad style list: ", atLoadStylesList);
            xedx_addStyle(atLoadStylesList);
            atLoadComplete = true;
        }
    }

    function addScrollOptStyles() {
        const optsWidth = '500px';
        const optsHeight = '400px';
        const innerHeight = '372px';
        xedx_addStyle(`
            #tcc-opts {
                position: fixed;
                width: ${optsWidth};
                height: ${optsHeight};
                max-height: ${optsHeight};
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
                max-height: ${innerHeight};
                display: block;
                margin: 0px 5px 0px 5px;

                /*border: 1px solid blue;*/
            }
            #tcc-tbl-wrap tr {
                display: flex;
                width: 100%;
                min-height: 28px;
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
                /*width: 40%;*/
                width: 30%;
                margin: 4px 10px 4px 5px;
                padding-left: 10px;
                border-radius: 4px;
            }
            #tcc-tbl-wrap tr td span {
                /*margin: auto;*/
                /*justify-content: flex-start;*/
                display: flex;
                flex-flow: row wrap;
                color: white;
                font-family: arial;
                font-size: 14px;
                /*max-width: 160px;*/
            }
            .opt-row {
                margin-right: auto;
                align-items: center;
                padding-left: 10px;
            }
            #tcc-opts-table {
                 table-layout: fixed;
                 width: ${optsWidth};
                 margin: 0px 10px 0px 10px;
                 height: ${innerHeight};
                 max-height: ${innerHeight};
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
            }
            #tcc-hdr {
                cursor: pointer;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
                justify-content: space-between;
                }
            #tcc-hdr > span { color: white; font-family: arial; font-size: 14px;}
            #tcc-ftr {
                border-bottom-left-radius: 6px;
                border-bottom-right-radius: 6px;
                color: white;
                font-family: arial;
                font-size: 14px;
                justify-content: center;
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
                /*width: 62%;*/
                align-content: center;
            }

            .opt-sp:hover {filter: brightness(1.8); font-weight: bold;}
             .tcc-torn-btn:hover {
                filter: brightness(2.00);
             }
             .tcc-torn-btn:active {
                filter: brightness(0.80);
             }

            .tcc-torn-btn {
                height: 20px;
                width: 64px;
                font-family: "Fjalla One", Arial, serif;
                font-size: 14px;
                font-weight: normal;
                text-align: center;
                text-transform: uppercase;
                border-radius: 5px;
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
                margin: 4px 10px 4px 10px;
             }
             .tcc-between {
                display: flex;
                flex-flow: row wrap;
                justify-content: space-between !important;
                align-content: center;
                align-items: center;
                height: 34px;
            }
            .ml18 {margin-left: 18px;}
            .mr18 {margin-right: 18px;}
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
        //log("handleRowClick, key: ", key, " opt: ", opt);
        let entry = KEY_MAP[key].opts[opt];
        //log("handleRowClick, entry: ", entry);
        let val = entry.val;
        let styleStr = entry.style;
        let type = entry.type;
        //log("handleRowClick, val: ", val, " styleStr: ", styleStr);

        let cells = $("#tcc-opts-table > tbody > tr > td");
        l//og("cells: ", cells);
        //cells.forEach((el) => {
        for (let idx=0; idx<cells.length; idx++) {
            let el = cells[idx];
            $(el).attr("style", "");
        };
        //log("Removed cell styles from: ", cells);

        $(this).parent().css("filter", "brightness(1.4)");
        if (type == 'cb') return;

        if (styleStr && val != 'default') {
            applySampleStyle(styleStr, val);
        } else {
            $("#tcc-ftr").attr("style", "");
        }
    }

    function handleCbValChange(e) {
        let nextSib = $(this).next();
        let key = $(nextSib).attr("data-map");
        let opt = $(nextSib).attr("data-opt");
        let entry = KEY_MAP[key].opts[opt];
        let checked = $(this).prop('checked');
        log("handleCbValChange, key: ", key, " opt: ", opt, " new va;: ", checked);

        options[key][opt] = checked;
        KEY_MAP[key].opts[opt].val = checked;
        saveOptions();
    }

    function handleOptValChange(e) {
        let prevSib = $(this).prev();

        let key = $(prevSib).attr("data-map");
        let opt = $(prevSib).attr("data-opt");
        let entry = KEY_MAP[key].opts[opt];

        let styleStr = entry.style;
        let oldVal = entry.val;
        let newVal = $(this).val();
        log("handleOptValChange, key: ", key, " opt: ", opt, " oldVal: ", oldVal, " new: ", newVal);

        options[key][opt] = newVal;
        KEY_MAP[key].opts[opt].val = newVal;
        saveOptions();

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

    function handleDisable(e) {

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
                         <span class="tcc-btn">
                             <input class="tcc-torn-btn btn-disable" value="Disable">
                         </span>
                         <span class="tbl-fnt-14">${title}</span>
                         <span class="tcc-btn">
                             <input class="tcc-torn-btn btn-reset" value="Reset">
                         </span>
                       </td></tr)`;

            $("#tcc-opts-table > tbody").append(row);

            for (let idx=0; idx<keys.length; idx++) {
                let opt = keys[idx];
                let entry = opts[opt];
                let val = entry.val;
                let styleStr = entry.style;
                let type = entry.type;
                let dispText = entry.display ? entry.display : opt;
                let cbStyle = '', inStyle = '';
                if (type == 'input') cbStyle = `style='visibility: hidden;'`;
                if (type == 'cb') inStyle = `style='display: none;'`;

                //if (styleStr && val != 'default') {
                //    val = styleStr.replace('${val}', val);
                //}

                let row = `<tr><td class="${bg}">
                             <input type="checkbox" ${cbStyle}>
                             <span id="sopt-${keyIdx}-${idx}" class="tbl-fnt-12 opt-sp opt-row" data-map="${key}" data-opt="${opt}">${dispText}</span>
                             <input type="text" value="${val}" ${inStyle}>
                           </td></tr)`;

                $("#tcc-opts-table > tbody").append(row);
                $(`#sopt-${keyIdx}-${idx}`).on('click.xedx', handleRowClick);

                let cb = $(`#sopt-${keyIdx}-${idx}`).prev();
                let inp = $(`#sopt-${keyIdx}-${idx}`).next();

                log("keyidx: ", keyIdx, " idx: ", idx, " opt: ", $(`#sopt-${keyIdx}-${idx}`));
                if (type == 'cb') {
                    $(cb).prop('checked', val);
                    $(cb).on('change.xedx', handleCbValChange);
                } else {
                    $(inp).on('change.xedx', handleOptValChange);
                    log("Added inp change handler to ", $(inp));
                    $(inp).css("border", "1px solid pink");
                }

                //if (styleStr && val != 'default') {
                //    log("Adding row style: ", val);
                //    $(`#sopt-${keyIdx}-${idx}`).parent().attr("style", val);
                //}
            }

            //$("#tcc-opts-table > tbody").append(resetRow);

            $(".btn-disable").on('click.xedx', handleDisable);
            $(".btn-reset").on('click.xedx', handleReset);
        }
    }

    function buildOptsDiv() {
        if ($("#tcc-opts").length) return;
        let div = `
                <div id="tcc-opts">
                <div id="tcc-hdr" >
                    <span class="tcc-xrt-btn btn ml18"><input id="tcc-close" class="tcc-torn-btn" value="Close"></span>
                    <span class="tcc-hdr-first">Options</span>
                    <span class="tcc-xrt-btn btn mr18"><input id="tcc-reload" class="tcc-torn-btn" value="Reload"></span>
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

        // Close the standard opts panel
        closeOptsPanel();

        function closeOptsPanel(retries=0) {
            let stBtn = $("#notes_settings_button");
            let cl = classList($(stBtn));
            let found = false;

            log("Close opts panel, retries: ", retries, " Button class list: ", cl);
            cl.forEach((el) => {
                if (el.indexOf('opened') > -1) {
                    found = true;
                    log("Panel open, closing!!!");
                    $(stBtn)[0].click();
                    //$(stBtn).css("border", "2px solid pink");
                    return;
                }
            });

            if (!found && retries < 10) setTimeout(closeOptsPanel, 250, retries);
        }
    }

    function installOptsBtn() {
        let stSpan = $("[class*='panelSizeContainer_']").prev(); //$("#settings_panel").closest("[class*='subtitle_']");
        log("installOptsBtn: ", $(stSpan).length, $("#xedx-wrap").length);
        if ($("#xedx-wrap").length > 0) {
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