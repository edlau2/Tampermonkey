// ==UserScript==
// @name         Torn Chat 3.0 Plus
// @namespace    http://tampermonkey.net/
// @version      2.07
// @description  This script allows full customization of Chat 3.0
// @author       xedx [2100735]
// @run-at       document-start
// @match        https://www.torn.com/*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    var api_key = GM_getValue('gm_api_key', '');        // Only require public IP if in a faction...
    const dbgStyles = false;
    const debugLoggingEnabled = false;
    let basicFacInfo = JSON.parse(GM_getValue("basicFacInfo", JSON.stringify({})));
    const log = function(...data) {console.log(GM_info.script.name + ': ', ...data);}
    const debug = function(...data) {if (debugLoggingEnabled == true) console.log(GM_info.script.name + ': ', ...data);}
    const logStyle = function(...data) {if (dbgStyles == true) console.log(GM_info.script.name + ': ', ...data);}

    let pendStylesList = "";
    let atLoadStylesList = "";

    log("script started");

    if (checkCloudFlare()) return console.log("Custom Chat Won't run while challenge active!");

    // Follow state of chat windows
    var chatMetaData = {};

    // Don't need to do this- just query...
    const hookChatState = false;
    if (hookChatState == true) {
        const originalFetch = unsafeWindow.fetch;
        unsafeWindow.fetch = async (...args) => {
            let [resource, config] = args;
            let response = await originalFetch(resource, config);
            if (response.url.indexOf("metadata-v2") != -1) {
                log("metadata change detected");
                response.clone().json().then((data) => {
                    log("metadata ack: ", data.acknowledged);
                    log("metadata id: ", data._id);
                    log("metadata: ", data);
                    if (data._id) {
                        GM_setValue("chatMetaData", JSON.stringify(data));
                        chatMetaData = JSON.parse(GM_getValue("chatMetaData", JSON.stringify({})));
                    }
                });
            }

            return response;
        };

    log("metadata: Inserted Fetch interceptor");
    }

    if (api_key == '') {
        let text = GM_info.script.name + `Says:\n\nPlease enter your API key.\n
            Your key will be saved locally so you won't have to be asked again.\n
            Your key is kept private and not shared with anyone.
            Only a public access key is required.\n\n
            This is used only to get your faction information, if you\n
            aren't in a faction, enter 'none' or 'no faction' to prevent
            being asked again.`;
        api_key = prompt(text, "");
        GM_setValue('gm_api_key', api_key);
    }

    if (Object.keys(basicFacInfo).length == 0 && api_key != '' && api_key != 'no faction') {
        log("Calling [getFacInfo]");
        getFacInfo();
    } else {
        log("Skipping [getFacInfo]: ", Object.keys(basicFacInfo).length, api_key);
        log("[getFacInfo] basicFacInfo: ", basicFacInfo);
    }

    function checkCloudFlare() {
        let active = false;
        if (document.querySelector("#challenge-form")) {
            active = true;
        } else if (location.href.indexOf('recaptcha') > -1) {
            active = true;
        } else if (document.querySelector(".iAmUnderAttack")) {
            active = true;
        } else {
            log("No active Cloudflare challenge detected.");
        }
        if (active == true) {
            log("Cloudflare challenge active!");
            return true;
        }
        return false;
    }

    document.addEventListener("readystatechange", handleReadyState);

    function getRfcv() {
        let name = "rfc_id=";
        let ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

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
            MSG_BOX_HEIGHT: '39px',               // Height of text input field
            MARK_UNREAD: false,
            CLOSE_BTN: true,
        }
    };

    debug("Default options: ", options);

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
        debug("loading options: ", tmp);
        if (!tmp) {
            debug("Using default options: ", options);
            xedx_setValue("options", JSON.stringify(options));
        } else { // This will merge in any new options
            let tmpOpts = JSON.parse(tmp);
            let primaryKeys = Object.keys(tmpOpts);
            for (let idx=0; idx<primaryKeys.length; idx++) {
                let primKey = primaryKeys[idx];
                let obj = tmpOpts[primKey];
                let secKeys = Object.keys(obj);
                if (primKey == 'fac') debug("xxx-chat Iterate primary key: ", primKey, " sec keys: ", secKeys);
                for (let j=0; j<secKeys.length; j++) {
                    let key = secKeys[j];
                    let val = obj[key];
                    if (primKey == 'fac') debug("xxx-chat Got ", key, " = ", val);
                    if (primKey == 'fac') debug("xxx-char setting options[", primKey, "][", key, "] = ", val);
                    options[primKey][key] = val;
                    if (primKey == 'fac') debug("xxx-chat, val is: ", options[primKey][key], " for ", key);
                }
            }
        }
        if (doSave == true) {
            saveOptions(false);
            options = JSON.parse(xedx_getValue("options", {}));
        }
    }

    // =========== End editable options ===============

    const addDevStyles = false;    // This ATM puts borders on various chat boxes, I use during development to locate elements
    const pendStyles = false;

    // ================= API test kinda stuff ===============
    // For fac tag name, need API, or scrape from fac page...
    // Alternative way:
    // https://api.torn.com/user/?selections=profile&key=
    /*
     "faction": {
                "position": "Script-Ed",
                "faction_id": 8151,
                "days_in_faction": 1344,
                "faction_name": "Chromatic",
                "faction_tag": "CR",
                "faction_tag_image": "8151-16121.png",
        },

        or with no fac
         "faction": {
                "position": "None",
                "faction_id": 0,
                "days_in_faction": 0,
                "faction_name": "None",
                "faction_tag": null,
                "faction_tag_image": "0-.png",
        },
    */
    var facIcon = "https://factiontags.torn.com/";
    function getFacInfo() {
        const url = `https://api.torn.com/v2/faction/basic?key=${api_key}&comment=Chat3.0Plus`;
        log("[getFacInfo] url: ", url);
        $.ajax({
            url: url,
            type: 'GET',
            success: function (response, status, xhr) {
                if (response.error && critErrs.includes(+response.error.code)) {
                    console.error(GM_info.script.name, " Error in ajax lookup: ", response.error.code, response.error.error);
                    api_key = '';
                    let msg = GM_info.script.name + `: API key validation failed!\n\nThe server returned:
                               code ${response.error.code}, error ${response.error.error}.\n\n
                               Please enter a valid API key.\n\n
                               Your key will be saved locally so you won't have to be asked again.\n
                               Your key is kept private and not shared with anyone.\n
                               Only a key with public access is required`;
                    api_key = prompt(msg, "");
                    GM_setValue('gm_api_key', api_key);
                    return;
                }
                processLookupResult(response, status, xhr);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("Error in ajax lookup: ", textStatus);
                console.error("Error thrown: ", errorThrown);
            }
        });

        function processLookupResult(response, status, xhr) {
            let basic = response.basic;
            log("ajax response: ", response);
            log("Basic fac info: ", basic.name, basic.id, " icon: ", basic.tag_image);

            facIcon = facIcon + basic.tag_image;
            basicFacInfo = JSON.parse(JSON.stringify(basic));
            GM_setValue("basicFacInfo", JSON.stringify(basicFacInfo));
        }
    }

    // Sidebar data
    function getSidebarData() {
        let key = Object.keys(sessionStorage).find(key => /sidebarData\d+/.test(key));
        return JSON.parse(sessionStorage.getItem(key));
    }
    var sidebarData = getSidebarData();
    log("Sidebar data: ", sidebarData);

    // =======================================================

    // Private chat list: #private-channel-list

    // Minimized private chats, to add 'close' btn to
    const PRIVATE_CHAT_SEL = `#chatRoot [id^='channel_panel_button:private']`;
    // All open private chats (maximized)
    const PRIVATE_CHAT_OPEN_SEL = `#chatRoot > div > div[class*='root_'] > div[class^='item_'] [id*='private']`

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
                      subSel: THEM_MSGS_BOX_SEL, type: 'input', display: "Border color around their messages"},
        MY_BG_COLOR: {val: options.fac.MY_BG_COLOR, style: BG_STYLE,
                      subSel: MY_MSGS_BOX_SEL, type: 'input', display: "My messages background color"},
        THEM_BG_COLOR: {val: options.fac.THEM_BG_COLOR, style: BG_STYLE,
                        subSel: THEM_MSGS_BOX_SEL, type: 'input', display: "Their messages background color"},
        BODY_BG_COLOR: {val: options.fac.BODY_BG_COLOR, style: BG_STYLE,
                        subSel: BODY, type: 'input', display: "Color of background around messages"},
        FOOTER_BG_COLOR: {val: options.fac.FOOTER_BG_COLOR, style: BG_STYLE,
                          subSel: FOOTER, type: 'input', display: "Color of footer"},
        SNDR_AVATAR_COLOR: {val: options.fac.SNDR_AVATAR_COLOR, style: TEXT_CLR_STYLE,
                            subSel: (SNDR_NAME + NOT_ADMIN), when: 'now', type: 'input', display: "Sender name color"},
        MSGS_UNREAD: {val: options.fac.MSGS_UNREAD, style: DISPLAY_STYLE,
                      subSel: UNREAD_MSGS_SEL, when: 'now', type: 'cb',
                      fn: 'MSGS_UNREAD', display: "Auto-Scroll, hide unread message balloon"},
        MSG_BOX_HEIGHT: {val: options.fac.MSG_BOX_HEIGHT, style: HEIGHT_STYLE,
                      subSel: FOOTER, when: 'load', type: 'input',
                      display: "Height of text area you type in"},
    };

    debug("FAC_OPTS: ", FAC_OPTS);

    // Options for private chat messages
    var PRIV_OPTS = {
        MY_TEXT_COLOR: {val: options.priv.MY_TEXT_COLOR, type: 'input', style: TEXT_CLR_STYLE,
                        subSel: MY_MSGS_SEL, display: "Color of my sent messages"},
        THEM_TEXT_COLOR: {val: options.priv.MY_TEXT_COLOR, type: 'input', style: TEXT_CLR_STYLE,
                          subSel: THEM_MSGS_SEL, display: "Color of other people's text"},
        MY_BORDER: {val: options.priv.MY_BORDER, type: 'input', style: BORDER_STYLE,
                    subSel: MY_MSGS_BOX_SEL, display: "Border color around your messages"},
        THEM_BORDER: {val: options.priv.THEM_BORDER, type: 'input', style: BORDER_STYLE,
                      subSel: THEM_MSGS_BOX_SEL, display: "Border color around their messages"},
        MY_BG_COLOR: {val: options.priv.MY_BG_COLOR, type: 'input', style: BG_STYLE,
                      subSel: MY_MSGS_BOX_SEL, display: "My messages background color"},
        THEM_BG_COLOR: {val: options.priv.THEM_BG_COLOR, type: 'input', style: BG_STYLE,
                        subSel: THEM_MSGS_BOX_SEL, display: "My messages background color"},
        BODY_BG_COLOR: {val: options.priv.BODY_BG_COLOR, type: 'input', style: BG_STYLE,
                        subSel: BODY, display: "Color of background around messages"},
        FOOTER_BG_COLOR: {val: options.priv.FOOTER_BG_COLOR, type: 'input', style: BG_STYLE,
                          subSel: FOOTER, display: "Color of footer"},
        MSG_BOX_HEIGHT: {val: options.priv.MSG_BOX_HEIGHT, style: HEIGHT_STYLE, subSel: FOOTER,
                         when: 'load', type: 'input',display: "Height of input text area"},
        MARK_UNREAD: {val: options.priv.MARK_UNREAD, style: DISPLAY_STYLE,
                      subSel: PRIVATE_CHAT_SEL, when: 'now', type: 'cb',
                      fn: 'MARK_UNREAD', display: "Add 'Mark as Unread' dropdown option"},
        CLOSE_BTN: {val: options.priv.CLOSE_BTN, style: DISPLAY_STYLE,
                      subSel: PRIVATE_CHAT_SEL, when: 'now', type: 'cb',
                      fn: 'CLOSE_BTN', display: "Add close button to minimized chats"},
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

    // 'Mark as unread' styles
    function installMarkUnread() {
        log("[installMarkUnread]");
        const config = { childList: true, subtree: true };

        // Look for new chats becoming maximized or opened
        // When found, an obsevrver is added to those to
        // detect when the node with th options list opens
        installOpenChatObserver();

        // Grab open (maximized) private chats to add menu choice
        // Actually, add observer to root for the "optionsContainer_" class node,
        // need to add to that. The observer can observe as many elemts as desired
        let openChats = $(PRIVATE_CHAT_OPEN_SEL);
        for (let idx=0; idx<$(openChats).length; idx++) {
            log("[addMarkUnreadObserver]Open chat #", idx, $(openChats)[idx]);
            log("Call addMarkUnreadObserver with ", $(openChats)[idx]);
            addMarkUnreadObserver($(openChats)[idx]);
        }

        // Add the "Mark as unread" option to list: TBD !!!
        function addListOptToNode(node) {
            log("[addListOptToNode]: ", $(node));
        }

        // This looks for the options div to open and the list to appear
        var addedListObserver;
        function addMarkUnreadObserver(node) {
            log("[addMarkUnreadObserver]: ", $(node));

            const handleNodesWithList = function(mutationsList, observer) {
                let doAdd = false;
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        log("[MarkUnread]Add to list here!!");
                        log("[MarkUnread]Added nodes: ", mutation.addedNodes);

                        for (let idx=0; idx<mutation.addedNodes.length; idx++) {
                            log("[MarkUnread] adding list opt to node ", $(mutation.addedNodes[idx]));
                            addListOptToNode($(mutation.addedNodes[idx]));
                        }
                    }
                }
            };

            if (!addedListObserver)
                addedListObserver = new MutationObserver(handleNodesWithList);

            addedListObserver.observe($(node)[0], config);
        }

        // This looks for private chats to open (become maximized),
        // and adds an oberver to watch for the opts div
        var openChatObserver;
        function installOpenChatObserver(retries=0) {
            let target = $("#chatRoot > div > div[class^='root']")[0];
            log("[MarkUnread][installOpenChatObserver] ", $(target));
            if (!$(target).length) {
                if (retries++ < 20) return setTimeout(installOpenChatObserver, 250, retries);
                return log("[MarkUnread][installOpenChatObserver] timed out");
            }

            //const config = { childList: true, subtree: true };
            const handleAddedNodes = function(mutationsList, observer) {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        log("[MarkUnread][handleAddedNodes]Added: ", mutation.addedNodes);

                        for (let idx=0; idx<mutation.addedNodes.length; idx++) {
                            log("[MarkUnread][handleAddedNodes] adding ", $(mutation.addedNodes[idx]));
                            addMarkUnreadObserver($(mutation.addedNodes[idx]));
                        }
                    }
                }
            };

        openChatObserver = new MutationObserver(handleAddedNodes);
        openChatObserver.observe($(target)[0], config);
        }
    }

        /*
        // Bottom tabs (minimized btns) $("#chatRoot > div > div[class*='root_'] > div[class^='root_']")
        // Opened : $("#chatRoot > div > div[class*='root_'] > div[class^='item_'] [id*='private']")
        // Private chat drop-down list:
        // #private-1446944-2100735 > div.root___VXwBe > div
        // List element: To find - find the bottom btn, its parent().parent() div is next sib of a div, and will have this somewhere as a child.
        // #chatRoot > div > div.root___Io7i2 > div:nth-child(3) is the parent above this button
            <button type="button" class="root___naOVz">
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="icon_40" viewBox="0 0 24 22" width="24" height="24" class="root___DYylw icon___t6srz">
                <defs><linearGradient xmlns="http://www.w3.org/2000/svg" id="icon_gradient40_default" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox"><stop id="start" offset="0"></stop><stop id="end" offset="1"></stop></linearGradient></defs><g fill="url(#icon_gradient40_default)"><path d="M12,0L0,22h24L12,0ZM11,8h2v7h-2v-7ZM12,19.25c-.69,0-1.25-.56-1.25-1.25s.56-1.25,1.25-1.25,1.25.56,1.25,1.25-.56,1.25-1.25,1.25Z"></path></g></svg>
            <span class="root___xn40j subtitle___ETd9T title___eOp6z">Report</span>
            </button>

        // bottom btn:
        // #chatRoot > div > div.root___oWxEV > div:nth-child(2)    // the .root... is 2nd div, #chatroot > div.root > this-root > (list)
        // An open one:
        // #chatRoot > div > div.root___Io7i2 > div:nth-child(2)    // the .root... is 1st div, #chatroot > div.root > this-root > (list)
        //
        // Indicator on the People button:
        // #people_panel_button (child of this)
        // <button id="people_panel_button"...
        //     <div class="unread_btm_btn">    // Called "messageCount_..."
        //         <span class="one_digit      // sum of all unread
        .unread_btm_btn {
            position: absolute;
            top: -14px;
        }
        .unread_btm_btn_span {
            color: white;

            font-family: Arial;
            word-break: break-word;

            align-items: center;
            background: #5c940d;
            border: 1px solid #c0eb75;
            border-radius: 9px;
            box-shadow: 0 0 5px rgba(169,227,75,.502);
            display: flex;
            height: 17px;
            justify-content: center;

            font-size: 14px;
            font-weight: 700;
            line-height: 16px;
            text-shadow: 0 0 2px rgba(0,0,0,.161);


        //
        // Indicator on side panel when open:
        // #private_chat_card_private-1195734-2100735 > div   (child of this)
        // <button id="private_chat_card_private-1195734-2100735" ...
        //     <div class="unread_open_sidebar">
        //         <span class="unread_sidebar_span one_digit"> n </span>
        //
        // span class is same as above
        //
        .unread_open_sidebar {
            left: 15px;
            position: absolute;
            top: 5px;
            transform: translateX(-50%);
        }

        .one_digit {
            border-radius: 50%;
            width: 17px;
        }
        .unread_sidebar_span {
            color: white;

            font-family: Arial;
            word-break: break-word;

            align-items: center;
            background: #5c940d;
            border: 1px solid #c0eb75;
            border-radius: 9px;
            box-shadow: 0 0 5px rgba(169,227,75,.502);
            display: flex;
            height: 17px;
            justify-content: center;

            font-size: 14px;
            font-weight: 700;
            line-height: 16px;
            text-shadow: 0 0 2px rgba(0,0,0,.161);
        }
        // Upper left icon on open sidebar counter
        // Beneath #people_panel > div.root___DRvSq > button.root___TpaB2.selected___ZnYwI
        .unread_open_tab {
            left: 8px;
            position: absolute;
            top: -2px;
            transform: translateX(-50%);
        }

        // Icon on minimized chat bar
        // #channel_panel_button\:private-2100735-2408039
        .unread_bottom_bar {
            left: 20px;
            position: absolute;
            top: -14px;
            transform: translateX(-50%);
        }
        ...prob rest styles are the same...

        */
    //}

    // =================== Chat box scrolling ===================

    var facUnreadBubble = `#faction-8151 > div.content___n3GFQ > div.root___uo_am > button`;

    // Do these with observer...
    function scrollToLastElement() {
        var list = $(FAC_SCROLL_LIST);
        try {
            if (list[0]) {
                list.scrollTop($(list)[0].scrollHeight);
            } else {
                // Prob not really an error, fac chat might be minimized...
                // see if that is avail via metadata
                debug("Error? no list? ", $(list), $(list)[0], list);
                debug("selector: ", FAC_SCROLL_LIST);
            }
        } catch (e) {
            log("Error: ", e);
        }
    }

    var tmpClickCnt = 0;
    function clickFacUnreadBtn() {
        if ($(facUnreadBubble).length > 0) {
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
            debug("xxx scroll timer added");
        }
    }


    // ================== Install styles ============================

    instScrollOpts();
    installOptionStyles();

    // =========== Add btn to remove minimized private chats ========

    function getPrivateMinChats(id) {
        let array = chatMetaData.private;
        const index = array.indexOf(id);
        if (index > -1) {
            array.splice(index, 1);
        }
        return array;
    }

    // Remove a minimized private chat
    function closeMinimizedChat(id) {
        let sTime = new Date().getTime();
        let myData = {
            "metadata": {
                "private": getPrivateMinChats(id),
                "group": chatMetaData.group,
                "maximized": chatMetaData.maximized,
                "left": chatMetaData.left,
                "updatedAt": sTime
            }
        };

        let payload = JSON.stringify(myData);
        $.ajax({
            url: 'https://www.torn.com/chat/metadata-v2',
            type: 'PUT',
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            data: payload,
            success: function(response) {
                log('[closeMinimizedChat] response: ', response);
            },
            error: function(xhr, status, error) {
                console.error('[closeMinimizedChat] ERROR: ', error);
              }
        });

    }

    function updateChatMetadata(callback, param) {
        let rfcv = getRfcv();
        let url = `https://www.torn.com/chat/metadata-v2?rfcv=${rfcv}`;
        $.ajax({
            url: url,
            type: 'GET',
            success: function(response) {
                if (response._id) {
                    GM_setValue("chatMetaData", JSON.stringify(response));
                    chatMetaData = JSON.parse(GM_getValue("chatMetaData", JSON.stringify({})));
                }
                if (callback) callback(param);
            },
            error: function(xhr, status, error) {
                console.error('[updateChatMetadata] ERROR: ', error);
              }
        });
    }

    function handleMinClose(e) {
        e.stopPropagation();
        e.preventDefault();
        let root = $(this).parent(); // .parent(); ? or closest("button")
        let id = $(root).attr("id");
        if (id) {
            let parts = id.split(":");
            id = parts[1];
        }
        if (!Object.keys(chatMetaData).length) {
            chatMetaData = JSON.parse(GM_getValue("chatMetaData", JSON.stringify({})));
            if (!Object.keys(chatMetaData).length) return log("No metadata, can't continue!");
        }

        updateChatMetadata(closeMinimizedChat, id);
        return false;
    }

    // Add the 'X' to minimized priv chats, to close without opening.
    // Need to add an observer to parent to get new nodes added
    function delayedHandleCloseBtnOpt(entry, retries=0) {
        log("[delayedHandleCloseBtnOpt] entry: ", entry);
        log("subSel: ", entry.subSel);

        let nodes = $(`${entry.subSel}`);
        log("nodes: ", $(nodes));
        if (!$(nodes).length) {
            if (retries++ < 30) return setTimeout(delayedHandleCloseBtnOpt, 250, entry, retries);
            return log("delayedHandleCloseBtnOpt timedout.");
        }

        for (let idx=0; idx<$(nodes).length; idx++) {
            let node = $(nodes)[idx];
            log("Modify min btn: ", $(node).parent());

            let closeBtn = `<span class="min-close">X</span>`;
            $(node).append(closeBtn);

            $(".min-close").off("click.xedx");
            $(".min-close").on("click.xedx", handleMinClose);
        }
    }

    // ================== Checkbox functions (options) ==============

    function handleCbOption(entry) {
        log("handleCbOption: ", entry.fn);
        switch(entry.fn) {
            // Hide the unread messages bubbles - not sure this works correctly yet
            case 'MSGS_UNREAD': {
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
            }

            // Add close btn to minimized private chats, to close
            // without having to open first. Not sure why I delayed this....
            case 'CLOSE_BTN': {
                debug("Close button option!");
                setTimeout(delayedHandleCloseBtnOpt, 500, entry);
                break;
            }

            // Add option to mark a chat as 'unread'
            case 'MARK_UNREAD': {
                installMarkUnread();
                break;
            }

            default:
                break;
        }
    }

    function keyToVarName(chatType, key) {return "--" + chatType + "-" + key.replaceAll("_", "-").toLowerCase();}

    function setPropertyValue(chatType, opt, val) {
        let root = document.documentElement;
        let variant = keyToVarName(chatType, opt);
        if (val == 'default') {
            debug("[setPropertyValue] removing prop ", variant);
            root.style.removeProperty(variant, val);
        } else {
            debug("[setPropertyValue] setting prop ", variant, " to ", val);
            root.style.setProperty(variant, val);
        }
    }

    function installOptionStyles() {
        const root = document.documentElement;
        let optionKeys = Object.keys(options);
        debug("optionKeys: ", optionKeys);

        for (let keyIdx=0; keyIdx<optionKeys.length; keyIdx++) {
            let chatType = optionKeys[keyIdx];    // fac, priv, etc.
            let opts = KEY_MAP[chatType].opts;
            let sel = KEY_MAP[chatType].sel;
            let keys = Object.keys(opts);


            log("Styles for: ", chatType, opts, sel, keys);

            for (let idx=0; idx<keys.length; idx++) {
                let opt = keys[idx];
                let entry = opts[opt];
                let type = entry.type;
                let val = entry.val;
                let variant = keyToVarName(chatType, opt);
                logStyle("Variable name: ", variant, " value: ", val);

                if (val == 'default' || val == false) {
                    root.style.removeProperty(variant, val);
                    continue;
                }
                root.style.setProperty(variant, val);
                if (type == 'cb') {
                    handleCbOption(entry);
                }

                let styleStr = entry.style;
                if (styleStr) {
                    let actualVal = "var(" + variant + ")";
                    val = styleStr.replace('${val}', actualVal); //val);
                }

                addStyleToList(sel, entry.subSel, val, entry.when);
            }
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

        .min-close {
            position: absolute;
            right: 0;
            top: 0;
            height:20px;
            width: 20px;
            /* border: 1px solid blue; */
            border-radius: 4px;
        }
        .min-close:hover { filter: brightness(.4); width: 26px; height: 26px; }
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
        debug("hookSettingsBtn: ", $(stBtn).length);

        if (!$(stBtn).length) {
            if (retries++ < 20) return setTimeout(hookSettingsBtn, 250, retries);
            return log("Timed out finding settings button");
        }

        $(stBtn).off('click.xedx');
        $(stBtn).css("border", "1px solid green");

        $(stBtn).on('click.xedx', function() {
            debug("settings btn clicked");
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

    function applySampleStyle(styleStr, val, variant) {
        let orgVal = val;

        // don't need this anymore?
        let style = styleStr.replace('${val}', val);
        if (styleStr.indexOf("background-color") > -1)
            style += ` background: ${val} !important;`;

        debug("applySampleStyle, style: ", style);
        $("#tcc-ftr").attr("style", style);
    }

    function handleRowClick(e) {
        let key = $(this).attr("data-map");
        let opt = $(this).attr("data-opt");

        debug("handleRowClick, key: ", key, " opt: ", opt);
        let entry = KEY_MAP[key].opts[opt];
        debug("handleRowClick, entry: ", entry);
        let val = entry.val;
        let styleStr = entry.style;
        let type = entry.type;

        let cells = $("#tcc-opts-table > tbody > tr > td");
        for (let idx=0; idx<cells.length; idx++) {
            let el = cells[idx];
            $(el).attr("style", "");
        };

        $(this).parent().css("filter", "brightness(1.4)");
        if (type == 'cb') return;


        let sel = KEY_MAP[key].sel;
        let element = $(`${sel} ${entry.subSel}`)[0];
        let style = window.getComputedStyle(element);
        debug("Element: ", $(element), " Style: ", style);
        let currValue = style.getPropertyValue(opt);

        let variant = keyToVarName(key, opt);
        debug("getPropertyValue: ", variant, ", curr value: '", currValue, "'");

        // If default, need to add?
        if (!currValue) {
            debug("Style entry not there, adding");
            let styleStr = entry.style;
            if (styleStr) {
                let actualVal = "var(" + variant + ")";
                val = styleStr.replace('${val}', actualVal); //val);
            }

            let newStyle = `${sel} ${entry.subSel} {${val}}`;

            debug("Adding style: ", newStyle);
            addStyleToList(sel, entry.subSel, val);
        }

        setPropertyValue(key, opt, val);
        debug("setPropertyValue: ", key, opt, val);
        debug("entry: ", entry);

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
        debug("handleCbValChange, key: ", key, " opt: ", opt, " new va;: ", checked);

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
        debug("handleOptValChange, key: ", key, " opt: ", opt, " oldVal: ", oldVal, " new: ", newVal);

        options[key][opt] = newVal;
        KEY_MAP[key].opts[opt].val = newVal;
        saveOptions();

        setPropertyValue(key, opt, newVal);
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

            // TBD: Finish implementing buttons
            let row = `<tr><td class="${bg} td-hdr tcc-between">
                         <span class="tcc-btn" style="visibility: hidden;">
                             <input class="tcc-torn-btn btn-disable" value="Disable">
                         </span>
                         <span class="tbl-fnt-14">${title}</span>
                         <span class="tcc-btn" style="visibility: hidden;">
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

                debug("keyidx: ", keyIdx, " idx: ", idx, " opt: ", $(`#sopt-${keyIdx}-${idx}`));
                if (type == 'cb') {
                    $(cb).prop('checked', val);
                    $(cb).on('change.xedx', handleCbValChange);
                } else {
                    $(inp).on('change.xedx', handleOptValChange);
                    debug("Added inp change handler to ", $(inp));
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
            cl.forEach((el) => {
                if (el.indexOf('opened') > -1) {
                    found = true;
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
        debug("installOptsBtn: ", $(stSpan).length, $("#xedx-wrap").length);
        if ($("#xedx-wrap").length > 0) {
            return log("Opts wrap already installed");
        }

        // #settings_panel > div > div:nth-child(3) > span
        let wrapper = `<div id="xedx-wrap" style="display: flex; flex-flow: row wrap; justify-content: space-between;"></div>`;
        let optSpan = `<span id="xopts">Extra Opts</span>`;

        debug("wrapping ", $(stSpan));
        $(stSpan).wrap($(wrapper));
        $("#xedx-wrap").append(optSpan);
        debug("wrapper: ", $("#xedx-wrap"));

        let classes = classList($(stSpan));
        debug("Classes: ", classes);
        classes.forEach(e => { $("#xopts").addClass(e);});
        addScrollOptStyles();

        $("#xopts").on('click', buildOptsDiv);
    }




})();