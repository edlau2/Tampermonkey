// ==UserScript==
// @name         Torn Chat Overlay
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tribute.js
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
    const indicatorsOn = false;

    // Function so I can use code collapse to see stuff easier.
    function addStyles() {
        initEmojiStyles(); // CSS for auto-complete dropdown, for emojis.

        // Note: change this: background: url(/images/v2/chat/tab_icons.svg) left top;
        // to selct the idle/offline icons - instead of 'left' (0px), -34px, -68px
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
                                        margin-left: -20px; margin-right: 10px;
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
                                          background-position: -72px top;
                                          }
        `);
    }

    // General globals
    debugLoggingEnabled = devMode;

    // Globals for an observer
    const targetNode = document.querySelector("#chatRoot");

    const chatOverlay = '<textarea name="xedx-chatbox2" autocomplete="off" maxlength="840" ' +
                            'style="width: 179.4px; height: 51px;">' + // Will be over-written with target style
                        '</textarea>';
    const chatOverlayActive = '<i class="icon_chat_active"></i>'; // Only used if "indicatorsOn = true;"

    var observer = null;
    var config = { attributes: true, childList: true, subtree: true};

    // Auto-complete (see https://github.com/zurb/tribute)
    // Also, supported emojis are defined in the 'values' array created
    // by initEmojiValues(). 'key' is the typed value to match, 'value'
    // is the displayed value, to support shorthand. Not really used.
    // Will likely be removed (the 'value')
    function initEmojiStyles() {
        GM_addStyle(`.tribute-container {
                      position: absolute;
                      top: 0;
                      left: 0;
                      height: auto;
                      overflow: auto;
                      display: block;
                      z-index: 999999;
                    }
                    .tribute-container ul {
                      margin: 0;
                      margin-top: 2px;
                      padding: 0;
                      list-style: none;
                      background: #efefef;
                    }
                    .tribute-container li {
                      padding: 5px 5px;
                      cursor: pointer;
                      color: black;
                    }
                    .tribute-container li.highlight {
                      background: #ddd;
                    }
                    .tribute-container li span {
                      font-weight: bold;
                    }
                    .tribute-container li.no-match {
                      cursor: default;
                    }
                    .tribute-container .menu-highlighted {
                      font-weight: bold;
                    }
                    `);
    }
    function initEmojiCollection() {
        let collection = {
          trigger: ':',

          // function called on select that returns the content to insert
          selectTemplate: function (item) {
            return ':' + item.original.value + ':';
          },

          // template for displaying item in menu
          menuItemTemplate: function (item) {
            //return item.string;
            return item.string + ' ' + item.original.code;
          },

          noMatchTemplate: function(t){return null;},

          // column to search against in the object (accepts function or string)
          lookup: 'key',

          // column that contains the content to insert by default
          fillAttr: 'value',

          // REQUIRED: array of objects to match or a function that returns data (see 'Loading remote data' for an example)
          values: [],

          // When your values function is async, an optional loading template to show
          loadingItemTemplate: null,

          // specify whether a space is required before the trigger string
          requireLeadingSpace: true,

          // specify whether a space is allowed in the middle of mentions
          allowSpaces: false,

          // specify whether the menu should be positioned.  Set to false and use in conjuction with menuContainer to create an inline menu
          // (defaults to true)
          positionMenu: true,

          // when the spacebar is hit, select the current match
          spaceSelectsMatch: false,

          // turn tribute into an autocomplete
          autocompleteMode: false,

          // Customize the elements used to wrap matched strings within the results list
          // defaults to <span></span> if undefined
          searchOpts: {
            pre: '<span>',
            post: '</span>',
            skip: false // true will skip local search, useful if doing server-side search
          },

          // Limits the number of items in the menu
          menuItemLimit: 35,

          // specify the minimum number of characters that must be typed before menu appears
          menuShowMinLength: 0
        }

        return collection;
    }
    function initEmojiValues() {
        let values = [ // Ordered by code
            {key: "leaf_fluttering_in_wind", value: "leaf_fluttering_in_wind", code: '\u{1F343}'},

            // 0x1F44B block
            {key: "goat", value: "goat", code: '\u{1F410}'},
            {key: "eyes", value: "eyes", code: '\u{1F440}'},
            {key: "waving_hand", value: "waving_hand", code: '\u{1F44B}'},
            {key: "ok_hand", value: "ok_hand", code: '\u{1F44C}'},
            {key: "thumbs_up", value: "thumbs_up", code: '\u{1F44D}'},
            {key: "flexed_biceps", value: "flexed_biceps", code: '\u{1F4AA}'},

            // 0x1F600 block
            {key: "face_with_tears_of_joy", value: "face_with_tears_of_joy", code: '\u{1F602}'},
            {key: "grinning", value: "grinning", code: '\u{1F604}'},
            {key: "grinning_squinting_face", value: "grinning_squinting_face", code: '\u{1F606}'},
            {key: "winking_face", value: "winking_face", code: '\u{1F609}'},
            {key: "heart_eyes", value: "heart_eyes", code: '\u{1F60D}'},
            {key: "smiling_face_with_sunglasses", value: "smiling_face_with_sunglasses", code: '\u{1F60E}'},
            {key: "kissing_face", value: "kissing_face", code: '\u{1F617}'},
            {key: "kissing_heart", value: "kissing_heart", code: '\u{1F618}'},
            {key: "smiley_face", value: "smiley_face", code: '\u{1F60A}'},
            {key: "face_blowing_a_kiss", value: "face_blowing_a_kiss", code: '\u{1F618}'},
            {key: "winking_face_with_tongue", value: "winking_face_with_tongue", code: '\u{1F61C}'},
            {key: "squinting_face_with_tongue", value: "squinting_face_with_tongue", code: '\u{1F61D}'},
            {key: "sleepy_face", value: "sleepy_face", code: '\u{1F62A}'},
            {key: "sleeping_face", value: "sleeping_face", code: '\u{1F634}'},
            {key: "see_no_evil_monkey", value: "see_no_evil_monkey", code: '\u{1F648}'},
            {key: "hear_no_evil_monkey", value: "hear_no_evil_monkey", code: '\u{1F649}'},
            {key: "speak_no_evil_monkey", value: "speak_no_evil_monkey", code: '\u{1F64A}'},

            // 0x1F900 block
            {key: "thinking", value: "thinking", code: '\u{1F914}'},
            {key: "rofl", value: "rofl", code: '\u{1F923}'},
            {key: "facepalm", value: "facepalm", code: '\u{1F926}'},
            {key: "zany_face", value: "zany_face", code: '\u{1F92A}'},
            {key: "shrug", value: "shrug", code: '\u{1F937}'},
            {key: "smiling_face_with_3_hearts", value: "smiling_face_with_3_hearts", code: '\u{1F970}'},
            {key: "shushing_face", value: "shushing_face", code: '\u{1F92B}'},

            // Flags
            // hmmm. 1F1FA == 'U', 1F1E6 == 'A', 1F1FB == 'S'
            // key == 'flag_' + ISO, value same, code == [code(ISO[0]) + code(ISO[1])]
            // So keep array of the ISO's, build each value dynamically?
            {key: "flag_ua", value: "flag_ua", code: '\u{1F1FA}\u{1F1E6}'}, // Ukraine
            {key: "flag_us", value: "flag_us", code: '\u{1F1FA}\u{1F1F8}'}, // USA
        ];

        return values;
    }

    const emojiArray = initEmojiValues();
    let collection = initEmojiCollection();
    collection.values = emojiArray;
    var autoComplete = new Tribute({collection: [collection]});

    ////////////////////////////////////////////////////////////////////////
    //
    // Message markdown
    //
    ////////////////////////////////////////////////////////////////////////

    // Supported markdown: see https://github.com/edlau2/Tampermonkey/blob/master/ChatOverlay/README.md

    // char code -> Unicode mappings: Offsets from 'a' and 'A' into unicode versions
    const ca = 'a'.charCodeAt(0); // == 97
    const cA = 'A'.charCodeAt(0); // == 65
    const LC_SHIFT = function(x) {return x-ca;}
    const UC_SHIFT = function(x) {return x-cA;}

    const italic_lcOffset     = LC_SHIFT(0x1D44E); // With serif, except 'h' https://www.w3.org/TR/xml-entity-names/1D4.html
    const italic_ucOffset     = UC_SHIFT(0x1D434); // ...
    const italicbold_lcOffset = LC_SHIFT(0x1D482); // ...
    const italicbold_ucOffset = UC_SHIFT(0x1D468); // ...
    const italic_lcOffset_ss      = LC_SHIFT(0x1D622); // sans-serif https://www.w3.org/TR/xml-entity-names/1D6.html (has an 'h')
    const italic_ucOffset_ss      = UC_SHIFT(0x1D608); // ...
    const italicbold_lcOffset_ss  = LC_SHIFT(0x1D656); // ...
    const italicbold_ucOffset_ss  = UC_SHIFT(0x1D63C); // ...
    const bold_lcOffset       = LC_SHIFT(0x1D41A);
    const bold_ucOffset       = UC_SHIFT(0x1D400);
    const cursive_lcOffset    = LC_SHIFT(0x1D4EA);
    const cursive_ucOffset    = UC_SHIFT(0x1D4D0);

    var codeblocks = []; // Temp storage for codeblocks

    function genericStrToUnicode(inStr, lcOffset, ucOffset) {
        let outStr = '';
        let isItalicSerif = (lcOffset == italic_lcOffset);
        for (let i=0; i< inStr.length; i++) {
            let decNum = inStr.charCodeAt(i);
            // Exceptions
            if (inStr.charAt(i) == 'h' && isItalicSerif) {
                outStr += '\u210E';
            } else
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
    function strToUnicodeItalicsSansSerif(inStr) {
        return genericStrToUnicode(inStr, italic_lcOffset_ss, italic_ucOffset_ss).replaceAll('*', '');
    }
    function strToUnicodeItalicsSerif(inStr) { // No! Just strip first and last char!
        //return genericStrToUnicode(inStr, italic_lcOffset, italic_ucOffset).replaceAll('_', '');
        return genericStrToUnicode(inStr, italic_lcOffset, italic_ucOffset).trim().slice(1, -1);
    }
    function strToUnicodeBold(inStr) {
        return genericStrToUnicode(inStr, bold_lcOffset, bold_ucOffset).replaceAll('**', '');
    }
    function strToUnicodeBoldItalic(inStr) {
        return genericStrToUnicode(inStr, italicbold_lcOffset, italicbold_ucOffset).replaceAll('***', '');
    }
    function strToUnicodeStrikeout(inStr) {
        let cArr = inStr.replaceAll('~~', '').split('');
        let outStr = ''; let i=0; let len = cArr.length; // Hack to make the strikeout look better.
        for (i=0; i < (len > 1 ? len-1 : len); i++) { // The 'one less', last one bleeds over.
            outStr += cArr[i] + '\u0336';
        }
        if (len > 1) outStr += cArr[i]; // Hack to make the strikeout look better.
        return outStr;
    }
    function strToUnicodeCursive(inStr) {
        return genericStrToUnicode(inStr, cursive_lcOffset, cursive_ucOffset);
    }
    function strToUnicodeUnderline(inStr) {
        let cArr = inStr.replaceAll('__', '').split('');
        let outStr = '';
        for (let i=0; i < cArr.length; i++) outStr += cArr[i] + '\u0332'; // Hack: place the underlne after, instead of before
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
    function strToUnicodeEmoji(inStr) {
        debug('[strToUnicodeEmoji] inStr: ', inStr);
        let outStr = inStr;
        inStr = inStr.replaceAll(':', '');
        let matchTo = inStr.toLowerCase().trim();
        debug('Matching to: ' + matchTo);

        let match = emojiArray.filter(obj => obj.key == matchTo)[0];
        debug('Word: ' + matchTo + ' Match: ' + match + ' Code: ' + (match ? match.code : null));
        if (match) outStr = match.code;

        return outStr;
    }
    function strToCodeblock(inStr) {
        let workStr = inStr.replaceAll('`', '');
        codeblocks.push(workStr);
        return 'CODEBLOCK';
    }

    // Text conversion main function, calls appropriate functions as specified markup matches.
    function internalFormatText(messageText) {
        messageText = ' ' + messageText + ' ';
        debug('[internalFormatText] text input: ', messageText);

        const codeblockRegex = /(\`\`)([^\`]*)(\`\`)/gi;
        const italicBoldRegex = /(\*\*\*)[A-z0-9 '!@#$%\^\&\*\(\)_\+{}\\|:;"<>,\?/~`\.\=\-\+]+(\*\*\*)/gi; // Matches between '***'
        const boldedRegex = /(\*\*)[A-z0-9 '!@#$%\^\&\*\(\)_\+{}\\|:;"<>,\?/~`\.\=\-\+]+(\*\*)/gi; // Matches between '**'
        const italicSSRegex = /(\*)[A-z0-9 '!@#$%\^\&\(\)_\+{}\\|:;"<>,\?/~`\.\=\-\+]+(\*)/gi; // Matches between '*'
        const italicRegex = /(\ _)[A-z0-9 '!@#$%\^\&\(\)\+{}\\|:;"<>,\?/~`\.\=\-\+]+(\_ )/gi; // Matches between '_'
        const strikeoutRegex = /(~~)[A-z0-9 '!@#$%\^\&\*\(\)_\+{}\\|:;"<>,\?/~`\.\=\-\+]+(~~)/gi; // Matches between '~~'
        const cursiveRegex = /(cc)[A-z0-9 '!@#$%\^\&\*\(\)_\+{}\\|:;"<>,\?/~`\.\=\-\+]+(cc)/gi; // Matches between 'cc'
        const ulRegex = /(__)[A-z0-9 '!@#$%\^\&\*\(\)_\+{}\\|:;"<>,\?/~`\.\=\-\+]+(__)/gi; // Matches between '__'
        const discordEmojiRegex = /(:)[A-z0-9 _/~\.\=\-\+]+(:)/gi; // Matches between ':'

        // Testing code
        if (devMode && messageText.indexOf('emojitest') > -1) {
            let outMsg = 'Supported emojis: \r\n';
            log('emojitest: ', emojiArray);
            for (let i=0; i < emojiArray.length; i++) {
                outMsg += (emojiArray[i].code + ' ');
            }
            return outMsg;
        }

        // codeblocks: must be first. This will replace codeblocks with a string to be replaced again, at the end.
        codeblocks = [];
        let codeblockMatches = messageText.match(codeblockRegex);
        debug('[internalFormatText] codeblock matches', codeblockMatches);
        if (codeblockMatches) {
            codeblockMatches.forEach(e => (messageText = messageText.replace(e, strToCodeblock(e))));
            debug('[internalFormatText] codeblockMatches replaced: ', messageText);
        }

        // ***Bold and italic***, before both bold and italic
        let italicboldMatches = messageText.match(italicBoldRegex);
        debug('[internalFormatText] italicbold matches', italicboldMatches);
        if (italicboldMatches) {
            italicboldMatches.forEach(e => (messageText = messageText.replace(e, strToUnicodeBoldItalic(e))));
            debug('[internalFormatText] italicboldMatches replaced: ', messageText);
        }

        // **Bold**: must be before italic
        let boldedMatches = messageText.match(boldedRegex);
        debug('[internalFormatText] bold matches', boldedMatches);
        while (boldedMatches) {
            messageText = messageText.replace(boldedMatches[0], strToUnicodeBold(boldedMatches[0]));
            debug('[internalFormatText] boldedMatches replaced: ', messageText);
            boldedMatches = messageText.match(boldedRegex);
        }

        // __*underline italics*__, before italic and underline TBD

        // *Italic* (sans serif)
        let italicSSMatches = messageText.match(italicSSRegex);
        debug('[internalFormatText] italic matches', italicSSMatches);
        while (italicSSMatches) {
            messageText = messageText.replace(italicSSMatches[0], strToUnicodeItalicsSansSerif(italicSSMatches[0]));
            debug('[internalFormatText] italicSSMatches replaced: ', messageText);
            italicSSMatches = messageText.match(italicSSRegex);
        }

        // Subscript (~) must be before strikethrough (TBD)

        // Common Superscripts (^ 2, 3, +. -, .)
        messageText = strToUnicodeSuperscripts(messageText);

        // --Strikethrough--
        let strikeoutMatches = messageText.match(strikeoutRegex);
        debug('[internalFormatText] strikeout matches', strikeoutMatches);
        if (strikeoutMatches) {
            strikeoutMatches.forEach(e => (messageText = messageText.replace(e, strToUnicodeStrikeout(e))));
            debug('[internalFormatText] strikeoutMatches replaced: ', messageText);
        }

        // Underline (__) (must be before italic serif)
        let ulMatches = messageText.match(ulRegex);
        debug('[internalFormatText] underline matches', ulMatches);
        if (ulMatches) {
            ulMatches.forEach(e => (messageText = messageText.replace(e, strToUnicodeUnderline(e))));
            debug('[internalFormatText] ulMatches replaced: ', messageText);
        }

        // Discord-style emojis, such as :shrug: or :facepalm:
        let emojiMatches = messageText.match(discordEmojiRegex);
        debug('[internalFormatText] discord emoji matches', emojiMatches);
        if (emojiMatches) {
            emojiMatches.forEach(e => (messageText = messageText.replace(e, strToUnicodeEmoji(e))));
            debug('[internalFormatText] emojiMatches replaced: ', messageText);
        }

        // _Italic_ (serif) MUST BE AFTER EMOJIS!
        let italicMatches = messageText.match(italicRegex);
        debug('[internalFormatText] italic matches', italicMatches);
        while (italicMatches) {
            messageText = messageText.replace(italicMatches[0], strToUnicodeItalicsSerif(italicMatches[0]));
            debug('[internalFormatText] italicMatches replaced: ', messageText);
            italicMatches = messageText.match(italicRegex);
        }

        // cursive (cc) - really ugly, removed.
        /*
        let cursiveMatches = messageText.match(cursiveRegex);
        debug('[internalFormatText] cursive matches', cursiveMatches);
        if (cursiveMatches) {
            cursiveMatches.forEach(e => (messageText = messageText.replace(e, strToUnicodeCursive(e.replaceAll('cc', '')))));
            debug('[internalFormatText] replaced: ', messageText);
        }
        */

        // Fixup codeblocks
        if (codeblocks.length) {
            debug('Codeblock raw: ', messageText);
            let block = codeblocks.shift();
            while (block) {
                messageText = messageText.replace('CODEBLOCK', block);
                block = codeblocks.shift();
            }
            debug('Codeblock replaced: ', messageText);
        }

        debug('[internalFormatText] text output', messageText);
        messageText = messageText.trim();
        return messageText;
    }

    ////////////////////////////////////////////////////////////////////////
    //
    // Keypress and message handling
    //
    ////////////////////////////////////////////////////////////////////////

    // Send an 'enter' keypress to an element
    const enterKeyOpts = {code: "Enter", key: "Enter", keyCode: 13, /*type: "keypress",*/ which: 13, charCode: 0,
                          altKey:false, bubbles: true, cancelBubble: false, cancelable: true, composed: true,
                          ctrlKey: false, currentTarget: null, defaultPrevented: true, detail: 0, eventPhase: 0,
                          isComposing: false, isTrusted: true, location: 0, metaKey: false, repeat: false,
                          returnValue: false, shiftKey: false
                          };
    const enterKeypressEvent = new KeyboardEvent("keypress", enterKeyOpts);
    const enterKeydownEvent = new KeyboardEvent("keydown", enterKeyOpts);
    const enterKeyupEvent = new KeyboardEvent("keyup", enterKeyOpts);
    function sendEnter(element) {
        debug('[sendEnter]');
        element.dispatchEvent(enterKeypressEvent);
      }

    // Format an entered text message and put in the actual, hidden,
    // wrapped text area and send it.
    function handleOutboundMessage(target) {
        let msg = $(target)[0].value;
        debug('[handleOutboundMessage] ', msg);
        let wrappedChat = target.parentNode.querySelectorAll('[name="chatbox2"]')[0];

        let messageText = internalFormatText(msg);
        wrappedChat.value = messageText;
        wrappedChat.textContent = messageText;
        sendEnter(wrappedChat);
    }

    // Handle key presses in the text area wrapper - send to
    // actual one on 'enter', after formatting
    function handleChatKeypress(e) {
        let target = e.target;
        if (e.keyCode == 13) { // If the user has pressed enter
            handleOutboundMessage(target);
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
        if (!ta) return;
        if (observer) observer.disconnect();
        debug('[addChatOverlay]');
        try {
            let myChat = ta.parentNode.querySelectorAll('[name="xedx-chatbox2"]')[0];
            if (myChat) {
                debug('Overlay already exists');
                if (observer) observer.observe(targetNode, config);
                return; // Only do once!
            }

            $(ta).after(chatOverlay);
            myChat = ta.parentNode.querySelectorAll('[name="xedx-chatbox2"]')[0];
            $(myChat).attr("class", $(ta).attr("class")); // Mirror class - the names change.
            $(myChat).attr("style", $(ta).attr("style")); // And style.

            addOverlayActive(ta);

            $(ta).addClass("xedx-hide"); //Hide real textarea
            $(myChat).on("keypress", handleChatKeypress); // Trap 'enter'
            autoComplete.attach(myChat); // Add autocomplete, filters on ':'
        } catch (e) {
            log("[chatOverlay] ERROR: ", e);
        } finally {
            if (observer) observer.observe(targetNode, config);
        }
    }

    // Add an 'active' indicator to the chatbox (optional - decided I didn't like it)
    function addOverlayActive(ta) {
        const chatTitle = "._chat-box-head_14cwy_133 > ._chat-box-title_14cwy_148";
        const chatIcon = "._icon_14cwy_222";
        if (!ta || !indicatorsOn) return;
        debug('[addOverlayActive]');
        let root = ta.parentNode.parentNode.parentNode;
        //let indicator = root ? root.querySelector('.chat-box-head_6LaFd > .chat-box-title_1-IuG > .icon_chat_active') : null;
        //let name = root ? root.querySelector('.chat-box-head_6LaFd > .chat-box-title_1-IuG > .icon_3RPUi') : null;

        let indicator = root ? root.querySelector(chatTitle + ' > .icon_chat_active') : null;
        let name = root ? root.querySelector(chatTitle + ' > ' + chatIcon) : null;

        debug('[addOverlayActive] root: ', root);
        debug('[addOverlayActive] indicator: ', indicator);
        debug('[addOverlayActive] name: ', name);
        if (indicator) $(indicator).remove();
        if (name) $(name).after(chatOverlayActive);
    }

    // Handle new nodes as they're added and removed.
    function processAddedNodes(nodeList, target) {
        debug('[processAddedNodes]');
        observer.disconnect();
        for (let i=0; i < nodeList.length; i++) {
            let ia = target ? target.querySelectorAll("div[class ^= '_chat-box-input']")[0] : null;
            let ta = ia ? ia.querySelector("div > textarea") : null;

            debug('target: ', target, ' ia: ', ia, ' ta: ', ta);

            if (ta) addChatOverlay(ta);
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
            //debug('Target node ', target, ' being removed!');
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
        let chatNodes = targetNode.querySelectorAll("textarea[class ^= '_chat-box-textarea']");

        debug('Found ' + chatNodes.length + ' existing open chat boxes');
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
    versionCheck();
    addStyles();
    callOnContentLoaded(handlePageLoad);

})();








