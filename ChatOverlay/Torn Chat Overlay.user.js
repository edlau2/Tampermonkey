// ==UserScript==
// @name         Torn Chat Overlays
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  try to take over the world!
// @author       xedx [2100735]
// @include      https://www.torn.com/*
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
    'use strict'

    const devMode = false;

    GM_addStyle(`.xedx-chat-overlay {background: lightgray; background-color: lightgray;}
                 .xedx-hide {display: none;}
                 .icon_chat_active {margin-bottom: 2px;
                                    background-position: left top;
                                    display: inline-block;
                                    vertical-align: middle;
                                    height: 34px;
                                    width: 34px;
                                    background: url(/images/v2/chat/tab_icons.svg) left top;
                                    filter: drop-shadow(0px 0px 1px rgba(17,17,17,0.678431));
                                    margin-left: -20px;
                                    }
                 .icon_chat_inactive {margin-bottom: 2px;
                                    background-position: left top;
                                    display: none;
                                    vertical-align: middle;
                                    height: 34px;
                                    width: 34px;
                                    background: url(/images/v2/chat/tab_icons.svg) left top;
                                    filter: drop-shadow(0px 0px 1px rgba(17,17,17,0.678431));
                                    margin-left: -20px;
                                      }
    `);

    // General globals
    debugLoggingEnabled = devMode;
    const chatOverlay = '<textarea name="xedx-chatbox2" autocomplete="off" maxlength="840" ' +
                            'class="chat-box-textarea_1RrlX" ' +
                            'style="width: 179.4px; height: 51px;">' +
                        '</textarea>';
    const chatOverlayActive = '<i class="icon_chat_active"></i>';

    // Globals for an observer
    const targetNode = document.querySelector("#chatRoot");
    const chatboxTextArea = 'chat-box-textarea_1RrlX';
    var observer = null;
    var config = { attributes: true, childList: true, subtree: true};

    ////////////////////////////////////////////////////////////////////////
    //
    // Message markdown
    //
    ////////////////////////////////////////////////////////////////////////

    // Supported markdown:
    // '~~' ==> strikeout
    // '__' ==> underline
    // '**' ==> bold
    // '*' ==> italic
    // '^2, ^3, ^+, ^-' ==> superscript
    // 'cc' ==> cursive

    // char code -> Unicode mappings
    const italic_lcOffset = 0x1D482 - 'a'.charCodeAt(0);
    const italic_ucOffset = 0x1D468 - 'A'.charCodeAt(0);
    const italicbold_lcOffset = 0x1D482 - 'a'.charCodeAt(0);
    const italicbold_ucOffset = 0x1D468 - 'A'.charCodeAt(0);
    const bold_lcOffset = 0x1D41a - 97; // 'a'.charCodeAt(0), same thing
    const bold_ucOffset = 0x1D400 - 65; // 'A'.charCodeAt(0);, same thing
    const cursive_lcOffset = 0x1D4Ea - 97; // 'a'.charCodeAt(0), same thing
    const cursive_ucOffset = 0x1D4D0 - 65; // 'A'.charCodeAt(0);, same thing

    function genericStrToUnicode(inStr, lcOffset, ucOffset) {
        let outStr = '';
        for (let i=0; i< inStr.length; i++) {
            let decNum = inStr.charCodeAt(i);
            if (inStr.charAt(i) <= 'z' && inStr.charAt(i) >= 'a') {
                let newNum = decNum + lcOffset;
                outStr += String.fromCodePoint(newNum);
            } else if (inStr.charAt(i) <= 'Z' && inStr.charAt(i) >= 'A') {
                let newNum = decNum + ucOffset;
                outStr += String.fromCodePoint(newNum);
            } else {
                outStr += inStr.charAt(i);
            }
        }
        return outStr;
    }
    function strToUnicodeItalics(inStr) {
        return genericStrToUnicode(inStr, italic_lcOffset, italic_ucOffset);
    }
    function strToUnicodeBold(inStr) {
        return genericStrToUnicode(inStr, bold_lcOffset, bold_ucOffset);
    }
    function strToUnicodeBoldItalic(inStr) {
        return genericStrToUnicode(inStr, italicbold_lcOffset, italicbold_ucOffset);
    }
    function strToUnicodeStrikeout(inStr) {
        let cArr = inStr.replaceAll('~~', '').split('');
        let outStr = '';
        for (let i=0; i < cArr.length; i++) {
            outStr += '\u0336' + cArr[i];
        }
        return outStr;
    }
    function strToUnicodeCursive(inStr) {
        return genericStrToUnicode(inStr, cursive_lcOffset, cursive_ucOffset);
    }
    function strToUnicodeUnderline(inStr) {
        let cArr = inStr.replaceAll('__', '').split('');
        let outStr = '';
        for (let i=0; i < cArr.length; i++) {
            outStr += '\u0332' + cArr[i];
        }
        return outStr;
    }
    function strToUnicodeSuperscripts(inStr) {
        let outStr = inStr;
        outStr = outStr.replaceAll('^2', '\u00B2');
        outStr = outStr.replaceAll('^3', '\u00B3');
        outStr = outStr.replaceAll('^+', '\u207A');
        outStr = outStr.replaceAll('^-', '\u207B'); // 00B0
        outStr = outStr.replaceAll('^.', '\u00B0');
        return outStr;
    }

    // Text conversion. Prepend 'GROUP' if for a group, and
    // perform markup (italics, bold, etc.)
    function internalFormatText(messageText) {
        log('[internalFormatText] text input', messageText);

        const italicboldRegex = /(\*\*\*)[A-z0-9 '!@#$%\^\&\*\(\)_\+{}\\|:;"<>,\?/~`\.\=\-\+]+(\*\*\*)/gi; // Matches between '***'
        const boldedRegex = /(\*\*)[A-z0-9 '!@#$%\^\&\*\(\)_\+{}\\|:;"<>,\?/~`\.\=\-\+]+(\*\*)/gi; // Matches between '**'
        const italicRegex = /(\*)[A-z0-9 '!@#$%\^\&\*\(\)_\+{}\\|:;"<>,\?/~`\.\=\-\+]+(\*)/gi; // Matches between '*'
        const strikeoutRegex = /(~~)[A-z0-9 '!@#$%\^\&\*\(\)_\+{}\\|:;"<>,\?/~`\.\=\-\+]+(~~)/gi; // Matches between '~~'
        const cursiveRegex = /(cc)[A-z0-9 '!@#$%\^\&\*\(\)_\+{}\\|:;"<>,\?/~`\.\=\-\+]+(cc)/gi; // Matches between 'cc'
        const ulRegex = /(__)[A-z0-9 '!@#$%\^\&\*\(\)_\+{}\\|:;"<>,\?/~`\.\=\-\+]+(__)/gi; // Matches between '__'

        // Bold and italic, before both bold and italic (***)
        let italicboldMatches = messageText.match(italicboldRegex);
        debug('[internalFormatText] italicbold matches', italicboldMatches);
        if (italicboldMatches) {
            italicboldMatches.forEach(e => (messageText = messageText.replace(e, strToUnicodeBoldItalic(e).replaceAll('***', ''))));
            debug('[internalFormatText] replaced: ', messageText);
        }


        // Bold: must be before italic (**)
        let boldedMatches = messageText.match(boldedRegex);
        debug('[internalFormatText] bold matches', boldedMatches);
        if (boldedMatches) {
            boldedMatches.forEach(e => (messageText = messageText.replace(e, strToUnicodeBold(e).replaceAll('**', ''))));
            debug('[internalFormatText] replaced: ', messageText);
        }

        // Italic (*)
        let italicMatches = messageText.match(italicRegex);
        debug('[internalFormatText] italic matches', italicMatches);
        if (italicMatches) {
            italicMatches.forEach(e => (messageText = messageText.replace(e, strToUnicodeItalics(e).replaceAll('*', ''))));
            debug('[internalFormatText] replaced: ', messageText);
        }

        // Subscript (~) must be before strikethrough (TBD)

        // Common Superscripts (^ 2, 3, +. -, .)
        messageText = strToUnicodeSuperscripts(messageText);

        // Strikethrough (~~)
        let strikeoutMatches = messageText.match(strikeoutRegex);
        debug('[internalFormatText] strikeout matches', strikeoutMatches);
        if (strikeoutMatches) {
            strikeoutMatches.forEach(e => (messageText = messageText.replace(e, strToUnicodeStrikeout(e))));
            debug('[internalFormatText] replaced: ', messageText);
        }

        // Underline (__)
        let ulMatches = messageText.match(ulRegex);
        debug('[internalFormatText] underline matches', ulMatches);
        if (ulMatches) {
            ulMatches.forEach(e => (messageText = messageText.replace(e, strToUnicodeUnderline(e))));
            debug('[internalFormatText] replaced: ', messageText);
        }

        // cursive (cc)
        let cursiveMatches = messageText.match(cursiveRegex);
        debug('[internalFormatText] cursive matches', cursiveMatches);
        if (cursiveMatches) {
            cursiveMatches.forEach(e => (messageText = messageText.replace(e, strToUnicodeCursive(e.replaceAll('cc', '')))));
            debug('[internalFormatText] replaced: ', messageText);
        }

        log('[internalFormatText] text output', messageText);

        return messageText;
    }

    ////////////////////////////////////////////////////////////////////////
    //
    // Keypress and message handling
    //
    ////////////////////////////////////////////////////////////////////////

    // Send an 'enter' keypress to an element
    const enterKeyOpts = {code: "Enter", key: "Enter", keyCode: 13, type: "keydpress", which: 13,
                          altKey:false, bubbles: true, cancelBubble: false, cancelable: true, charCode: 0,
                          composed: true, ctrlKey: false, currentTarget: null,defaultPrevented: true, detail: 0, eventPhase: 0,
                          isComposing: false, isTrusted: true, location: 0, metaKey: false, repeat: false, returnValue: false, shiftKey: false
                          }
    const enterKeydownEvent = new KeyboardEvent("keydown", enterKeyOpts);
    const enterKeypressEvent = new KeyboardEvent("keypress", enterKeyOpts);
    const enterKeyupEvent = new KeyboardEvent("keyup", enterKeyOpts);

    function sendEnter(element) {
        log('[sendEnter]');
        let useOpts = enterKeyOpts;
        //useOpts.type = "keypress";
        element.dispatchEvent(new KeyboardEvent("keypress", useOpts));

        //element.dispatchEvent(enterKeypresEvent);
        //element.dispatchEvent(enterKeyupEvent);
      }

    // Sanitize an entered text message and put in the actual, hidden,
    // wrapped text area and send it.
    function handleOutboundMessage(target) {
        let msg = $(target)[0].value;
        log('[handleOutboundMessage] ', msg);
        let wrappedChat = target.parentNode.querySelectorAll('[name="chatbox2"]')[0];

        let messageText = internalFormatText(msg);
        wrappedChat.value = messageText;
        wrappedChat.textContent = messageText;
        sendEnter(wrappedChat);
    }

    // Handle key presses in the text area wrapper - send to
    // actual one on 'enter', after sanitizaton
    function handleChatKeypress(e) {
        let target = e.target;
        if (e.keyCode == 13) { // If the user has pressed enter
            handleOutboundMessage(target); //$(target)[0].value);
            $(target)[0].value = '';
            return false;
        }
        return true;
    }

    ////////////////////////////////////////////////////////////////////////
    //
    // UI stuff. Observe parent chatroot, add chat overlays as required.
    //
    ////////////////////////////////////////////////////////////////////////

    // Wrap an existing chat textarea with our own private one,
    // to trap written text.
    function addChatOverlay(ta) {
        if (observer) observer.disconnect();
        log('[addChatOverlay]');
        let myChat = ta.parentNode.querySelectorAll('[name="xedx-chatbox2"]')[0];
        if (myChat) {
            log('Overlay already exists');
            if (observer) observer.observe(targetNode, config);
            return; // Only do once!
        }

        let wrappedStyle = ta.getAttribute('style');
        $(ta).after(chatOverlay);
        myChat = ta.parentNode.querySelectorAll('[name="xedx-chatbox2"]')[0];
        if (devMode) {
            myChat.setAttribute('style', wrappedStyle + 'background-color: #888888;');
        } else {
            myChat.setAttribute('style', wrappedStyle);
        }
        addOverlayActive(ta);
        ta.setAttribute('style', (wrappedStyle + 'display: none;'));
        $(myChat).on("keypress", handleChatKeypress);
        if (observer) observer.observe(targetNode, config);
    }

    // Add an 'active' indicatoer to the chatbox
    function addOverlayActive(ta) {
        let root = ta.parentNode.parentNode.parentNode;
        //let name = root ? root.querySelector('.chat-box-head_6LaFd > .chat-box-title_1-IuG > .name_314zy') : null;
        let name = root ? root.querySelector('.chat-box-head_6LaFd > .chat-box-title_1-IuG > .icon_3RPUi') : null;
        debug('[addOverlayActive] root: ', root, ' name: ', name);
        if (name) $(name).after(chatOverlayActive);
    }

    // Handle new nodes as they're added and removed.
    function processAddedNodes(nodeList, target) {
        debug('[processAddedNodes]');
        observer.disconnect();
        for (let i=0; i < nodeList.length; i++) {
            debug('Target node ', target, ' being added!');
            let iconNode = target ? target.getElementsByClassName('icon_chat_inactive')[0] : null;
            if (iconNode) {
                $(iconNode).removeClass('icon_chat_inactive');
                $(iconNode).addClass('icon_chat_active');
            }
        }
        observer.observe(targetNode, config);
    }

    function processRemovedNodes(nodeList, target) {
        debug('[processRemovedNodes]');
        observer.disconnect();
        for (let i=0; i < nodeList.length; i++) {
            debug('Target node ', target, ' being removed!');
            let iconNode = target ? target.getElementsByClassName('icon_chat_active')[0] : null;
            if (iconNode) {
                $(iconNode).removeClass('icon_chat_active');
                $(iconNode).addClass('icon_chat_inactive');
            }
        }
        observer.observe(targetNode, config);
    }

    // Handle target mutations.
    const observerCallback = function(mutationsList, observer) {
        debug('[observerCallback]');
        let nodeList = null;
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                let target = mutation.target;
                debug('[childList] target: ', target);

                nodeList = mutation.addedNodes;
                if (nodeList) processAddedNodes(nodeList, target);
                nodeList = mutation.removedNodes;
                if (nodeList) processRemovedNodes(nodeList, target);
            }
        }
    };

    function handlePageLoad() {
        let chatNodes = targetNode.getElementsByClassName(chatboxTextArea);
        log('Found ' + chatNodes.length + ' existing open chat boxes');
        for (let i=0; i<chatNodes.length; i++) {
            addChatOverlay(chatNodes[i]);
        }

        if (!observer) observer = new MutationObserver(observerCallback);
        observer.observe(targetNode, config);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    versionCheck();

    callOnContentLoaded(handlePageLoad);

})();
