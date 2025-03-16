// ==UserScript==
// @name         Torn Cross-Domain Chat
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  This script lets you keep an eye on chat from a tab open in another domain.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @match        https://yata.yt/*
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        unsafeWindow

// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

/*
https://github.com/edlau2/Tampermonkey/raw/refs/heads/master/CrossDomainChat/Torn%20Cross-Domain%20Chat.user.js
*/

(function() {
    'use strict';

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    // TEMP debugging aid
    function xGM_setValue(key, value) {
        if (!key || key == undefined)
            debugger;
        else
            GM_setValue(key, value);
    }

    // =============== Editable Options =============

    var options = {
        publishLastFacMsgs: GM_getValue("publishLastFacMsgs", true),       // Write fac msgs to storage for sharing
        publishAnyAllowedMsg: GM_getValue("publishAnyAllowedMsg", true),   // Publish any msg (not just fac) if not filtered out
        allowFacMsgsOnly: GM_getValue("allowFacMsgsOnly", true),           // Only log fac messages. Supercedes previous option.
        dbEnable: GM_getValue("dbEnable", true),                           // Save received mesages in indexDB. Used for saved log (clicking the eyeball)
        verboseMsgs: GM_getValue("verboseMsgs", false),                    // For development - extra stuff in chat window
        addTimestamps: GM_getValue("addTimestamps", false),                // Append short timestamp to message

        allowPublic: GM_getValue("allowPublic", false),            // If true, let things like public trade, general, etc through
        allowPrivate: GM_getValue("allowPrivate", true),           // If true, let tprivate msgs through
        doDevPings: GM_getValue("doDevPings", true),               // true to constantly ping - dev test to make sure both ends work without focus
        silentPings: GM_getValue("silentPings", true),             // If true don't log to chat window
        pingLifespan: GM_getValue("pingLifespan", 1),              // How long pings stay in the window, secs

        historyLimit: GM_getValue("historyLimit", 100),            // Chat message box will hold max this many messages before they scroll out.
        prepopulateChat: GM_getValue("prepopulateChat", true),     // Fill chat on open with past historyLimit messages
        pingIntervalSecs: GM_getValue("pingIntervalSecs", 5),       // Time between pings
        debugLoggingEnabled: GM_getValue("debugLoggingEnabled", false)
    };

    debugLoggingEnabled = options.debugLoggingEnabled;          // true for more verbose logging

    // ========== End editable options ==========

    var db = null;
    var changeListener;
    var optsUpdateListener;
    var listenerWatchdog;
    var lastNonPingId = 0;
    const optsChangedKey = "optionsUpdated";
    const lastChatKey = "lastChat";
    const verifyChatKey = "lastValidChat";
    const dbName = "Chat2.0.MessagesDB";
    const storeName = "messageStore";
    const pubLastChatKey = "pubLastChats";
    var pubMsgsSkipped = 0;

    function updateOption(name, newVal) {
        options[name] = newVal;
        xGM_setValue(name, newVal);

        GM_setValue(optsChangedKey, true);
    }

    function writeOptions() {
        let keys = Object.keys(options);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            xGM_setValue(key, options[key]);
        }
    }

    function updateOptions() {
        let keys = Object.keys(options);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            options[key] = GM_getValue(key, options[key]);
        }
    }

    function logOptions() {
        let keys = Object.keys(options);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            log("Option: ", key, " value: ", options[key]);
        }
    }

    var prevChat, thisChat;

    var needsWrite = GM_getValue("needsWrite", true);
    if (needsWrite == true) {
        writeOptions();
        xGM_setValue("needsWrite", false);
    }

    // ============================ Time stuff ===============================

    const secsInMin = 60;
    const minInHour = 60;
    const secsInHr = secsInMin * minInHour;
    const hrInDay = 24;
    const secsInDay = hrInDay * secsInHr;

    const nn = function(t) {return t == 0? '00' : t < 10 ? '0' + t : t;}

    function tsToTimeAgo(ts) {
        let nowSecs = new Date().getTime();
        let secsDiff = Math.floor((nowSecs - ts)/1000);
        let hrs = Math.floor(secsDiff/secsInHr);
        let rem = secsDiff % secsInHr;
        let min = Math.floor(rem/secsInMin);
        let secs = rem % secsInMin;
        let agoStrLong = hrs > 0 ?
            (hrs + " hrs " + min + " min " + secs + " secs ago") :
            min > 0 ? (min + " min " + secs + " secs ago") :
            (secs + " secs ago");
        let agoStrShort = nn(hrs) + ":" + nn(min) + ":" + nn(secs) + " ago";
        let result = {hrs: hrs, min: min, secs: secs, strLong: agoStrLong, strShort: agoStrShort};
        return result;
    }

    function formatDateStringLong(date) {
        const pad = (v) => {
            return v < 10 ? "0" + v : v;
        };
        let year = date.getFullYear();
        let month = pad(date.getMonth() + 1);
        let day = pad(date.getDate());
        let hour = pad(date.getHours());
        let min = pad(date.getMinutes());
        let sec = pad(date.getSeconds());
        return year + "/" + month + "/" + day + " " + hour + ":" + min + ":" + sec;
    }

    function formatTimeString(date) {
        const pad = (v) => {
            return v < 10 ? "0" + v : v;
        };

        let hour = pad(date.getHours());
        let min = pad(date.getMinutes());
        let sec = pad(date.getSeconds());
        return  hour + ":" + min + ":" + sec;
    }

    // ================ Other misc helpers ==================
    function arrayCopyLastN(arr, n) {
        if (n > arr.length) {
            return arr.slice();
        }
        return arr.slice(-n);
    }

    function savePosition(elementId) {
        let el = $(("#" + elementId));
        log("savePos: ", $(el));
        let key = elementId + "-lastOff";
        let pos = $(el).offset();
        log("savePos: ", pos);
        xGM_setValue(key, JSON.stringify(pos));
    }
    function getSavedPosition(elementId) {
        let key = elementId + "-lastOff";
        let obj = GM_getValue(key, undefined);
        if (!obj) return log("Nothing saved");
        let pos = JSON.parse(obj);
        return pos;
    }

    function setOffset(el, top, left) {
        log("setOffset top: ", top, " left: ", left);
        log("current: ", $(el).offset());
        let elH = $(el).height();
        $(el).offset({top: top, left: left});
        log("new: ", $(el).offset());
    }

    function restorePosition(elementId) {
        let key = elementId + "-lastOff";
        let pos = getSavedPosition(elementId);
        log("restorePos: ", pos);
        if (!pos) return log("Invalid obj saved.");

        let el = $(("#" + elementId));
        log("restorePos: ", $(el));

        setOffset(el, pos.top, pos.left)
    }


    // ========= Cross-domain, YATA in this case, specific portion of script =========

    /*
    Maybe on YATA page init...open DB, read fac list only, fill chat box
    with 'history limit' entries. Start at list.length - histLimit, and
    add until end. Then done with db....reading from publisher (the Torn
    side) rolling list of saved chats now.
    */

    var lastChatList = [];
    //if (location.hostname == 'yata.yt') {
    if (location.hostname.indexOf('torn.com') == -1) { // We don't care hat domain, just not Torn...
        logScriptStart();
        log("Listening at ", location.hostname);

        // We can go ahead and get last 'historyLimit' msgs
        // to populate the chat box....
        //if (options.prepopulateChat == true && options.dbEnable == true)
        //    getLastChats();

        //callOnContentLoaded(handleCrossDomainPageLoad);
        handleCrossDomainPageLoad();
        return;
    }

    function clearChats2(callback) {
        $("#cbb").animate({opacity: 0}, 400, function() {
            $("#cbb").empty();
            $("#cbb").css("opacity", 1);
            callback();
        });
    }

    function clearChats3(callback) {

        let msgs = $("#cbb > div:not('.gone')");
        let len = $(msgs).length;
        debug("clearChats3, len: ", len, " gone: ", $(".gone").length);

        if (!$(msgs).length) {
            $("#cbb").empty();
            return callback();
        }
        let msg = msgs[len-1];

        $(msg).animate({opacity: 0}, 10, function () {
            //$(msg).remove();
            $(msg).addClass("gone");
            clearChats(animated, callback)
        });
    }

    function clearChats(animated, callback) {
        if (animated == true) {
            let msgs = $("#cbb > div");
            let len = $(msgs).length;
            debug("clearChats, animated: ", len);

            if (!$(msgs).length) return callback();
            let msg = msgs[len-1];

            $(msg).animate({opacity: 0}, 10, function () {
                $(msg).remove();
                clearChats(animated, callback)
            });
        } else {
            $("#cbb").empty();
        }
    }

    // Save last 10 chats we've ead/dislayed, these can prepopulate on
    // reload. Or...maybe have the server portion maintain the list?
    // That would be more accurate but more contentious...
    // The keys are for "publisher" and "subscriber", pub being
    // Torn script, sub being YATA, in this case...
    function loadLastChats(key) {
        let tmp = GM_getValue(key, undefined);
        if (tmp) lastChatList = JSON.parse(tmp);

        debug("Preloading ", lastChatList.length, " saved chats");
        debug("options.allowFacMsgsOnly: ", options.allowFacMsgsOnly);
        for (let idx=0; idx<lastChatList.length; idx++) {
            let thisChat = lastChatList[idx];

            if (options.allowFacMsgsOnly == true && thisChat.channel.indexOf("faction") < 0) {
                debug("allowFacMsgsOnly is on, not showing ", thisChat.channel);
                continue;
            }

            let newMsg = getChatMsgDiv(thisChat);
            $("#cbb").append(newMsg);

            log("Loaded msg id ", thisChat.msg_id, " from ", thisChat.channel, ":", thisChat.name);

            $(`#${thisChat.ts}`).tooltip({
            content: function( event, ui ) {
                let id = $(this).attr("id");
                let ago = tsToTimeAgo(+id);
                $(this).tooltip("option", "content", ago.strLong);
            },
            open: doDynamicTtText,
            classes: {"ui-tooltip": "tooltip5"}
        });
        }

        // TBD: grab the last entry in storage also, if not in last chat list...
        keepScrolledToBottom();
    }

    function clearChatsCb() {loadLastChats(pubLastChatKey);}

    function  handleRefresh() {
        clearChats(true, clearChatsCb);
        //clearChats2(clearChatsCb);
    }

    function saveLastChats(key) {
        xGM_setValue(key, JSON.stringify(lastChatList));
    }

    // The saved position needs to be relative to actual visible screen, not scrolled window!!!
    function handleUnload() {
        saveLastChats();
        savePosition("cdcb");
    }

    function initCrossDomainCSS() {
        addDraggableStyles();
        addToolTipStyle();
        addBorderStyles();
        addBackgroundStyles();
        addContextStyles();

        GM_addStyle(`
            .sticky-bottom {
                align-items: flex-end;
                bottom: 0px;
                /*top:0px;*/
                left:0px;
                display: flex;
                position: fixed;
                right: 1px;
            }
            .chat-box-wrapper {
                align-items: flex-end;
                /*bottom: 0px;*/
                display: flex;
                position: fixed;
                right: 1px;
                max-width: 262px;
                z-index: 999999;
            }
            .group-chat-box {
                align-items: flex-end;
                display: flex;
            }
            .chat-box {
                width: 262px;
                background: #333; 
                border-radius: 4px 4px 0 0;
                box-shadow: 0 4px 4px rgba(0,0,0,.25);
                overflow: hidden;
                word-break: break-word;
                position: relative;
            }
            .chat-box-body {
                height: 100%;
                overflow-y: auto;
                overscroll-behavior: contain;
                padding: 0 10px;
                word-break: break-word;
            }

            [class^='chat-box-message'] {
                display: flex;
                word-break: break-word;
            }
            [class^='chat-box-message__avatar'] {
                margin-right: 4px;
            }
            [class*='avatar-status-wrapper'] {
                border-radius: 50%;
                display: flex;
                height: 16px;
                position: relative;
                width: 16px;
            }
            .avatar___tLOOh {
                background: #d9d9d9;
                border-radius: 50%;
                filter: drop-shadow(0 4px 4px rgba(0,0,0,.25));
                height: 16px;
                width: 16px;
                left: 50%;
                object-fit: cover;
                object-position: top;
                position: absolute;
                top: 50%;
                transform: translate(-50%,-50%);
            }

            .chat-box-footer {
                display: flex;
                border-top: 2px solid #555;
                min-height: 24px;
            }
            .chat-box-footer__textarea {
                background: black;
                border-radius: 0px 0px 4px 4px;
                color: white;
                flex-grow: 1;
                font-family: Arial,Helvetica,sans-serif;
                font-size: 12px;
                padding: 10px 8px;
                resize: none;
                word-break: break-word;
                border: none;
            }

            .chat-box-message__box {
                background: transparent;
                color: #ccc;
                padding: 0 10px 0 0;

                -webkit-tap-highlight-color: rgba(0,0,0,0);
                -webkit-touch-callout: none;
                border-radius: 4px 4px 8px;
                cursor: pointer;
                display: inline;
            }
            .message__sender p {
                font-size: 12px;
                color: #333;
                color: #ccc;
                display: inline;
                font-weight: 700;
                margin-right: 4px;
                word-break: break-word;
            }
            .box-message {
                margin-bottom: 0px;
            }
            .box-message p {
                font-size: 12px !important;
                line-height: 1rem;
                word-break: break-word;
                color: #e3e3e3;
                margin-bottom: 0px !important;
            }
            .chat-box-header {
                align-items: center;
                background: linear-gradient(180deg,#303030,#444 .01%,#565656 55.73%,#2e2e2e 99.99%,#2e2e2e);
                cursor: pointer;
                display: flex;
                min-height: 34px;
                justify-content: center;
                align-content: center;
                flex-flow: row wrap;
                border-bottom: 2px solid #555;
            }
            .chat-box-header p {
                color: #f6f6f6;
                font-size: .875rem;
                line-height: 1.125rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                margin-bottom: 0px;
                display: flex;
                flex-flow: row wrap;
                justify-content: center;
                width: 90%;
            }
            .chat-box-header:hover {
                background: linear-gradient(180deg,#555,#000);
            }
            .led-rnd {
                width: 10px;
                aspect-ratio: 1 / 1;
                border-radius: 50%;
                opacity: 0;
                margin-right: 0;
                background: limegreen;
            }
            .msg-ts {
                font-family: arial;
                font-size: 12px;
                color: #777;
            }
        `);
    }

    function getChatMsgDiv(entry) {
        // debug("getChatMsgDiv: ", entry);
        let avatarUrl = entry.avatar;
        let imgSrc = (avatarUrl && avatarUrl.length) ? `https://avatars.torn.com/48X48_${avatarUrl}` : ``;
        let addlMsg = (entry.channel == "ping_channel" && options.verboseMsgs == true) ? (`(id=${entry.msg_id})`) : ``;
        let sender = (options.verboseMsgs == true) ?  `${entry.name} (on ${entry.channel}):` : `${entry.name}:`;
        let tsSpan = '';
        if (options.addTimestamps == true) {
            let time = (entry.ts) ? formatTimeString(new Date(entry.ts)) : 'unknown';
            tsSpan = `<span class="msg-ts"> (${time})</span>`;
        }
        let msg =
            `<div id="${entry.msg_id}">
                <div class="chat-box-message">
                    <div class="chat-box-message__avatar">
                        <a href="/profiles.php?XID=${entry.user_id}" class="avatar-status-wrapper">
                            <img alt="chat-avatar" class="avatar___tLOOh"
                                src="${imgSrc}">
                        </a>
                    </div>
                    <div class="chat-box-message__box" data-is-tooltip-opened="false">
                        <a href="/profiles.php?XID=${entry.user_id}" class="message__sender">
                            ${sender}
                        </a>
                        <p class="box-message" title="original" id="${entry.ts}" data-html="true">
                            <span class="text-message">
                                ${entry.msg} ${addlMsg}
                            </span>
                            ${tsSpan}
                        </p>
                    </div>
                </div>
            </div>`;

        return msg;
    }

    function handleMinMax() {
        if ($("#cbb").parent().css("display") == 'none') {
            $("#cbb").parent().css("display", "block");
            $(".chat-box-footer").css("display", "flex");
        } else {
            $("#cbb").parent().css("display", "none");
            $(".chat-box-footer").css("display", "none");
        }
    }

    function handleCtxClick(e) {
        event.preventDefault();
        let target = e.currentTarget;
        let opt = $(target).attr("data-id");
        log("handleCtxClick: ", opt);

        if (opt == 'xcb-refresh') {
            handleRefresh();
        }

        cmHideShow("#xcb-ctx", $("#ccbh"));
        return false;
    }

    function installDefaultCtxItems() {
        $("#xcb-ctx").css("border-radius", "10px");
        $("#xcb-ctx > ul").css("border-radius", "10px");
        $("#xcb-ctx").addClass("no-pos");

        let refreshLi = `<li data-id="xcb-refresh" class="xmed-li-rad"><a>Refresh</a></li>`;
        let saveHtmlLi = `<li data-id="xcb-html" class="xmed-li-rad"><a>Save as HTML</a></li>`;
        let saveRawLi = `<li data-id="xcb-raw" class="xmed-li-rad"><a>Save raw msg data</a></li>`;

        $("#xcb-ctx > ul").append(refreshLi);
        $("#xcb-ctx > ul").append(saveHtmlLi);
        $("#xcb-ctx > ul").append(saveRawLi);

        $("#xcb-ctx > ul > li").on('click', handleCtxClick);
    }

    function installCrossDomainChatUI(retries=0) {
        let cdChatBox = `
            <div id="xcdcb-root" class="sticky-bottom">
                <div id="cdcb" class="chat-box-wrapper">
                    <div class="xflexc">
                        <div id="cdcbheader" class="group-chat-box">
                            <div class="chat-box" id="fac-chat">
                                <div class="chat-box-header xflexr">
                                    <p id="ccbh"></p>
                                    <span id="ping-led" class="led-rnd"></span>
                                </div>
                                <div style="height: 250px;">
                                    <div id='cbb' class='chat-box-body'>

                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class='chat-box-footer'>
                            <textarea class="chat-box-footer__textarea" placeholder="Type your message here..."></textarea>
                        </div>
                    </div>
                </div>
                </div>
            `;

        $('body').append(cdChatBox);

        if (!$("#cdcb").length) {
            if (retries++ < 20) return setTimeout(installCrossDomainChatUI, 250, retries);
            return console.error("Unable to install UI!", $('body'), $("#cdcb"));
        }

        setHdrText();

        dragElement(document.getElementById("cdcb"));

        //restorePosition("cdcb");

        $(".chat-box-header").on('click', handleMinMax);

        installContextMenu($("#ccbh"), "xcb-ctx");
        $("#xcb-ctx").addClass("xopts-border-89");
        installDefaultCtxItems();

        if (debugLoggingEnabled == true) logOptions();

    }

    function keepScrolledToBottom() {
        $("#cbb")[0].scrollTop = $("#cbb")[0].scrollHeight;
    }

    function setHdrText() {
        if (options.verboseMsgs == true)
            $("#ccbh").text("Chat v3.14159 (" +$("#cbb").children().length + " msgs)");
        else
            $("#ccbh").text("Chat v3.14159");
    }

    function removeMsg(selector) {
        $(selector).remove();
        setHdrText();
    }

    function flashLed() {
        function ledOff() {$("#ping-led").css("opacity", 0);}

        $("#ping-led").css("opacity", 1);
        setTimeout(ledOff, 600);
    }

    function doDynamicTtText(event, ui) {
        let target = $(event.currentTarget);
        let id = $(target).attr("id");
        let ago = tsToTimeAgo(+id);
        $(target).tooltip("option", "content", ago.strLong);
    }

    // Notified when our storage key value changes, re-read the list
    function storageChangeCallback(key, oldValue, newValue, remote) {

        //debug("storageChangeCallback, remote: ", remote, " key: ", key, " newValue? ", newValue ? true : false);

        if (key == optsChangedKey && remote == true) {
            debug("Updating options, remote: ", remote, " key: ", key, " newValue? ", newValue ? true : false);
            updateOptions();
            return;
        }

        if (!remote || !newValue) return;
        thisChat = JSON.parse(newValue);

        if (thisChat.name != 'ping') debug("Entry: ", thisChat);

        if (!prevChat)
            prevChat = thisChat;
        else
            if (prevChat.msg_id == thisChat.msg_id)
                return log("Same msg ID (", thisChat.msg_id, "), returning.");

        if ($(`#${thisChat.msg_id}`).length) {
            log("Error: trying to add dup ID ", thisChat.msg_id);
            return;
        }

        // Ping handling
        if (thisChat.channel == 'ping_channel')
            flashLed();

        if (thisChat.channel == 'ping_channel' && options.silentPings == true) {
            //debug("Ping detected, set to silent");
            return;
        }

        // Secondary handling if fac only is enabled
        if (options.allowFacMsgsOnly == true && thisChat.channel.indexOf("faction") < 0) {
            debug("allowFacMsgsOnly is on, not showing ", thisChat.channel);
            return;
        }

        let newMsg = getChatMsgDiv(thisChat);
        log("Adding new message");
        $("#cbb").append(newMsg);
        keepScrolledToBottom();

        // Replacing the inline function for content init
        // with the function, causes this to fail - no
        // clue why. Attaching an open handler later didn't
        // seem to work, either, but may not have tried
        // with the inline function here as well.
        $(`#${thisChat.ts}`).tooltip({
            content: function( event, ui ) {
                let id = $(this).attr("id");
                let ago = tsToTimeAgo(+id);
                $(this).tooltip("option", "content", ago.strLong);
            },
            open: doDynamicTtText,
            classes: {"ui-tooltip": "tooltip5"}
        });

        if (thisChat.channel == 'ping_channel') {
            let time = options.pingLifespan * 1000;
            setTimeout(removeMsg, time, ("#" + thisChat.msg_id));
        } else {
            lastNonPingId = thisChat.msg_id;
        }

        if ($("#cbb").children().length > options.historyLimit)
            $("#cbb").children()[0].remove();

        setHdrText();
    }

    function watchdogTimer() {
        let tmpEntry = GM_getValue(verifyChatKey, null);
        if (!tmpEntry || lastNonPingId == 0) return;
        let entry = JSON.parse(tmpEntry);
        if (entry.msg_id != lastNonPingId) {
            debug("ID's changed, entry: ", entry.msg_id, " last: ", lastNonPingId);
            if (changeListener) GM_removeValueChangeListener(changeListener);
            changeListener = GM_addValueChangeListener(lastChatKey, storageChangeCallback);
            lastNonPingId = 0;
            debug("***** chageListener reset! *****");
        }
    }

    function handleCrossDomainPageLoad() {
        initCrossDomainCSS();
        installCrossDomainChatUI();

        $(window).on('unload', handleUnload);

        if (changeListener) GM_removeValueChangeListener(changeListener);
        changeListener = GM_addValueChangeListener(lastChatKey, storageChangeCallback);

        if (optsUpdateListener) GM_removeValueChangeListener(optsUpdateListener);
        optsUpdateListener = GM_addValueChangeListener(optsChangedKey, storageChangeCallback);

        // Periodically check to see if we've lost our listener
        listenerWatchdog = setInterval(watchdogTimer, 5000);

        // Add last saved chats
        loadLastChats(pubLastChatKey);
    }

    // =================== Torn Chat Hook portion of script =================

    // Hook fetch chat
    const originalFetch = unsafeWindow.fetch;
    unsafeWindow.fetch = async (...args) => {
        let [resource, config] = args;
        let response = await originalFetch(resource, config);
        if (response.url.indexOf("sendbird.com/v3/group_channels/") != -1 && response.url.indexOf("/messages?") != -1) {
            response.clone().json().then((data) => {
                if (Array.isArray(data.messages)) {
                    // console.log(data.messages);
                    dbWriteArray(data.messages);
                }
            });
        }
        return response;
    };

    // Hook chat Websocket on receive message
    const originalSend = WebSocket.prototype.send;
    window.sockets = [];
    WebSocket.prototype.send = function (...args) {
        if (window.sockets.indexOf(this) === -1 && this.url.indexOf("sendbird.com") > -1) {

            log("Found chat 2.0 websocket");
            log("URL: ", this.url);

            window.sockets.push(this);
            this.addEventListener("message", function (event) {
                if (event.data.startsWith("MESG")) {
                    const messageObj = JSON.parse(event.data.substring(4));
                    handleMessage(messageObj);
                }
            });
        }
        return originalSend.call(this, ...args);
    };

    function handleMessage(message) {
        if (!message || !message.channel_url) {
            return;
        }
        dbWrite(message);
    }

    function initIndexDB() {
        //const openRequest = indexedDB.open("ScriptChat2.0RecorderDB", 2);
        const openRequest = indexedDB.open(dbName, 2);
        openRequest.onupgradeneeded = function (e) {
            db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                debug("ChatRecorder: initIndexDB open onupgradeneeded create store");
                const objectStore = db.createObjectStore(storeName, { keyPath: "messageId", autoIncrement: false });
                objectStore.createIndex("targetPlayerId", "targetPlayerId", { unique: false });
            }
        };
        openRequest.onsuccess = function (e) {
            debug("ChatRecorder: initIndexDB open onsuccess");
            db = e.target.result;
        };
        openRequest.onerror = function (e) {
            console.error("ChatRecorder: initIndexDB open onerror");
            console.dir(e);
        };
    }

    function dbWrite(message) {
        let pubMsg = false, privateMsg = false, facMsg = false;
        if (!db) {
            console.error("ChatRecorder: dbWrite db is null");
        }

        let msg = {};

        // This will filter out public chats, unless the "allowPublic"
        // option is enabled.
        const targetPlayer = getTargetPlayerFromMessage(message);
        if (!targetPlayer) {
            pubMsg = true;
            debug("[dbWrite] pubMsg: ", message.channel_url, (options.allowPublic == false) ? ", Skipped" : "");
            if (options.allowPublic == false) {
                pubMsgsSkipped++;
                return;
            }
        }

        //msg.channel = message.channel;
        msg.targetPlayerId = targetPlayer ? targetPlayer.id : message.channel_url;
        msg.targetPlayerName = targetPlayer ? targetPlayer.name : message.channel_url;
        msg.senderPlayerId = message.user.guest_id;
        msg.senderPlayerName = message.user.name;
        msg.avatar = message.user.image;
        msg.timestamp = message.ts;
        msg.messageText = message.message;
        msg.messageId = message.msg_id;

        if (targetPlayer && targetPlayer.id != 'faction') privateMsg = true;

        if (options.allowFacMsgsOnly == true && targetPlayer && targetPlayer.id == 'faction') {
            facMsg = true;
            debug("Fac msg received: ", msg);
            debug("Full: ", message);
        } else if (options.allowFacMsgsOnly == false) {
            debug("Msg received: ", message.channel_url, msg);
            debug("Full: ", message);
        }

        debug("Filter msg, pub: ", pubMsg, " fac: ", facMsg, " private: ", privateMsg);
        debug("Filter msg, isFac: ", facMsg, "|", options.allowFacMsgsOnly, "|", options.publishLastFacMsgs, "|", options.publishAnyAllowedMsg);
        if ((facMsg == true && options.publishLastFacMsgs == true) || (options.publishAnyAllowedMsg == true)) {
            let entry = {msg_id: message.msg_id, user_id: message.user.guest_id, avatar: message.user.image,
                         name: message.user.name, msg: message.message, channel: message.channel_url,
                         ts: message.ts};

            debug("Writing entry: ", entry);

            let prevEntry;
            let tmp = GM_getValue(lastChatKey, null);
            if (tmp) {
                prevEntry = JSON.parse(tmp);
                if (prevEntry.msg_id == entry.msg_id) {
                    log("ERROR: Dup entry detected, this: ", entry, " prev: ", prevEntry);
                    return;
                }
            }
            xGM_setValue(lastChatKey, JSON.stringify(entry));
            xGM_setValue(verifyChatKey, JSON.stringify(entry));

            // Push prevEntry onto queue of last 'X' saved chats, so
            // when the YATA half loads it can load last historyLimit chats
            tmp = GM_getValue(pubLastChatKey, undefined);
            let list = tmp ? JSON.parse(tmp) : [];
            list.push(entry);
            if (list.length > options.historyLimit) list.shift();
            xGM_setValue(pubLastChatKey, JSON.stringify(list));
        }

        if (options.dbEnable == false || !options.dbEnable) return;

        const transaction = db.transaction([storeName], "readwrite");
        transaction.oncomplete = (event) => { };
        transaction.onerror = (event) => {
            console.error("ChatRecorder: dbWrite transaction onerror [" + msg.targetPlayerId + " " + msg.senderName + ": " + msg.messageText + "]");
        };

        const store = transaction.objectStore(storeName);
        const request = store.put(msg);
        request.onsuccess = (event) => { };
    }

    var rollingId = 0;
    function doPing() {
        let msg = formatDateStringLong(new Date());
        let elementId = "chat-ping-" + (rollingId++);
        let entry = {msg_id: elementId, user_id: 1, avatar: "",
                     name: "ping", msg: msg,
                     channel: "ping_channel",
                     ts: (new Date().getTime())};

        xGM_setValue(lastChatKey, JSON.stringify(entry));
    }

    function dbWriteArray(messageArray) {
        if (!db) {
            console.error("ChatRecorder: dbWriteArray db is null");
            return;
        }

        const transaction = db.transaction([storeName], "readwrite");
        transaction.oncomplete = (event) => { };
        transaction.onerror = (event) => {
            console.error("ChatRecorder: dbWrite transaction onerror [" + msg.targetPlayerId + " " + msg.senderName + ": " + msg.messageText + "]");
        };

        const store = transaction.objectStore(storeName);

        for (const message of messageArray) {
            const targetPlayer = getTargetPlayerFromMessage(message);
            if (targetPlayer) {
                let msg = {};
                msg.targetPlayerId = targetPlayer.id;
                msg.targetPlayerName = targetPlayer.name;
                msg.senderPlayerId = message.user.user_id;
                msg.senderPlayerName = message.user.nickname;
                msg.timestamp = message.created_at;
                msg.messageText = message.message;
                msg.messageId = message.message_id;
                store.put(msg);
            }
        }
    }

    function dbReadByTargetPlayerId(targetPlayerId) {
        if (!db) {
            console.error("ChatRecorder: dbReadByTargetPlayerId db is null");
            return;
        }

        //log("dbReadByTargetPlayerId: ", targetPlayerId);

        const transaction = db.transaction([storeName], "readonly");
        transaction.oncomplete = (event) => { };
        transaction.onerror = (event) => {
            console.error("ChatRecorder: dbReadByTargetPlayerId transaction onerror [" + targetPlayerId + "]");
        };

        const store = transaction.objectStore(storeName);
        const index = store.index("targetPlayerId");
        const keyRange = IDBKeyRange.only(targetPlayerId);

        return new Promise((resolve, reject) => {
            const resultList = [];
            index.openCursor(keyRange).onerror = (event) => {
                resolve(resultList);
            };
            index.openCursor(keyRange).onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    resultList.push(cursor.value);
                    cursor.continue();
                } else {
                    //log("dbReadByTargetPlayerId, res: ", resultList);
                    resolve(resultList);
                }
            };
        });
    }

    function dbReadAllPlayerId() {
        if (!db) {
            console.error("ChatRecorder: dbReadAllPlayerId db is null");
            return;
        }

        const transaction = db.transaction([storeName], "readonly");
        transaction.oncomplete = (event) => { };
        transaction.onerror = (event) => {
            console.error("ChatRecorder: dbReadAllPlayerId transaction onerror");
        };

        const store = transaction.objectStore(storeName);
        const index = store.index("targetPlayerId");
        const keyRange = null;

        return new Promise((resolve, reject) => {
            const resultList = [];
            index.openCursor(keyRange, "nextunique").onerror = (event) => {
                resolve(resultList);
            };
            index.openCursor(keyRange, "nextunique").onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    resultList.push(cursor.value);
                    cursor.continue();
                } else {
                    //log("dbReadAllPlayerId res: ", resultList);
                    resolve(resultList);
                }
            };
        });
    }

    function getTargetPlayerFromMessage(message) {
        if (message.channel_url.startsWith("public_") && options.allowPublic == false) {
            return null;  // Ignore Globla, Trade, etc.
        } else if (message.channel_url.startsWith("faction-")) {
            return { id: "faction", name: "Faction" };  // Faction chat.
        }

        // Private chats.
        const selfId = getSelfIdFromSession();
        const selfName = getSelfNameFromSession();
        if (!selfId || !selfName) {
            return { id: "others", name: "Other" };
        }
        const strList = message.channel_url.split("-");
        if (strList.length !== 3) {
            return { id: "others", name: "Other" };
        }
        let target = { id: "others", name: "Other" };
        if (parseInt(strList[1]) === selfId) {
            target.id = strList[2];
            target.name = strList[2];
        } else if (parseInt(strList[2]) === selfId) {
            target.id = strList[1];
            target.name = strList[1];
        } else {
            return { id: "others", name: "Other" };
        }
        return target;
    }

    function getSelfIdFromSession() {
        let index = Object.keys(sessionStorage).findIndex((item) => item.startsWith("sidebarData"));
        if (index >= 0) {
            let sidebarData = JSON.parse(sessionStorage.getItem(sessionStorage.key(index)));
            let userID = sidebarData.user.userID;
            return userID;
        }
        return null;
    }

    function getSelfNameFromSession() {
        let index = Object.keys(sessionStorage).findIndex((item) => item.startsWith("sidebarData"));
        if (index >= 0) {
            let sidebarData = JSON.parse(sessionStorage.getItem(sessionStorage.key(index)));
            let userID = sidebarData.user.name;
            return userID;
        }
        return null;
    }

    function initCSS() {
        const isDarkmode = $("body").hasClass("dark-mode");
        GM_addStyle(`.chat-control-panel-popup {
                        position: fixed;
                        top: 10%;
                        left: 15%;
                        border-radius: 10px;
                        padding: 10px;
                        background: ${isDarkmode ? "#999" : "#F0F0F0"};
                        z-index: 1000;
                        display: none;
                      }

                      .chat-control-panel-results {
                        padding: 10px;
                      }

                      .chat-control-player {
                        margin: 4px 4px 4px 4px !important;
                        display: inline-block !important;
                      }

                      .chat-control-panel-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        background: ${isDarkmode ? "#404040" : "#B0B0B0"};
                        width: 100%;
                        height: 100%;
                        opacity: 0.7;
                        z-index: 900;
                        display: none;
                      }

                      div#chat-player-list {
                        overflow-y: scroll;
                        height: 50px;
                      }

                      a.chat-history-search:hover {
                        color: #318CE7 !important;
                      }

                      .chat-control-panel-item {
                        display: inline-block;
                        /* margin: 2px 2px 2px 2px; */
                      }`);

        GM_addStyle(`
            #chatHistoryControl {
                width: 30px;
                position: relative;
            }
            .links-fmt {
                margin-right: -16px;
            }
            .btn-wrap-fmt {
                margin-left: 5px;
                margin-right: -34px;
                top: 6px;
            }
            #chat-target-id-input {
                border-radius: 4px;
                padding: 2px;
                margin-left: 5px;
            }

            #cdc-opt-table td, label, input, .cpl-text {
                line-height: 22px;
                font-family: Arial, serif;
                font-size: 14px;
            }
            #cdc-opt-table td label {
                padding: 2px 20px 2px 20px;
            }

            .dbg-log {
                /*line-height: 22px;*/
                font-family: Arial, serif;
                font-size: 12px;
                color: black;
                margin-top: 6px;
            }

            .cdc-ip {

            }
            #history {
                width: 50px;
                border-radius: 5px;
                padding-left: 5px;
                margin-left: 5px;
            }
        `);
    }

    function initControlPanel(retries=0) {
        debug("initControlPanel");
        let $title; // = $("div#top-page-links-list");
        let addlClass = "links-fmt";
        //if ($title.length === 0) {
            addlClass = "btn-wrap-fmt";
            $title = $(".header-navigation.right > .header-buttons-wrapper > ul");
        //}
        if ($title.length === 0) {
            if (retries++ < 20) return setTimeout(initControlPanel, 250, retries);
            console.error("Nowhere to put control panel button");
        }

        const $controlBtn = $(`<a id="chatHistoryControl" class="t-clear h c-pointer right last ${addlClass}">
                                  <span class="icon-wrap svg-icon-wrap">
                                    <span class="link-icon-svg">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10.33"><defs><style>.cls-1{opacity:0.35;}.cls-2{fill:#fff;}.cls-3{fill:#777;}</style></defs><g id="Слой_2" data-name="Слой 2"><g id="icons"><g class="cls-1"><path class="cls-2" d="M10,5.67a2,2,0,0,1-4,0,1.61,1.61,0,0,1,0-.39A1.24,1.24,0,0,0,7.64,3.7a2.19,2.19,0,0,1,.36,0A2,2,0,0,1,10,5.67ZM8,1C3,1,0,5.37,0,5.37s3.22,5,8,5c5.16,0,8-5,8-5S13.14,1,8,1ZM8,9a3.34,3.34,0,1,1,3.33-3.33A3.33,3.33,0,0,1,8,9Z"></path></g><path class="cls-3" d="M10,4.67a2,2,0,0,1-4,0,1.61,1.61,0,0,1,0-.39A1.24,1.24,0,0,0,7.64,2.7a2.19,2.19,0,0,1,.36,0A2,2,0,0,1,10,4.67ZM8,0C3,0,0,4.37,0,4.37s3.22,5,8,5c5.16,0,8-5,8-5S13.14,0,8,0ZM8,8a3.34,3.34,0,1,1,3.33-3.33A3.33,3.33,0,0,1,8,8Z"></path></g></g></svg>
                                    </span>
                                  </span>
                                  <!-- span>ChatRecorder</span -->
                                </a>`);
        $title.append($controlBtn);

        debug("Added ctrl panel btn: ", $("#chatHistoryControl"));

        const $controlPanelDiv = $(`<div id="chatControlPanel" class="chat-control-panel-popup">control</div>`);

        //  chat-control-panel-item, replaced with xedx-torn-btn
        const $controlPanelOverlayDiv = $(`<div id="chatControlOverlayPanel" class="chat-control-panel-overlay"></div>`);

        $controlPanelDiv.html(getCtrlPanelHtml());

        // Control panel onClick listeners
        $controlPanelDiv.find("button#chat-search").click(function () {
            const inputId = $controlPanelDiv.find("input#chat-target-id-input").val();
            dbReadByTargetPlayerId(inputId).then((result) => {
                //log("InputId: ", inputId);
                let text = "";
                for (const message of result) {
                    //log("Res msg: ", message);
                    const timeStr = formatDateStringLong(new Date(message.timestamp));
                    text += timeStr + " " + message.senderPlayerName + ": " + message.messageText + "\n";
                }
                text += "Found " + result.length + " records\n";
                const $textarea = $("textarea#chat-results");
                $textarea.val(text);
                $textarea.scrollTop($textarea[0].scrollHeight);
            });
        });

        $title.append($controlPanelDiv);

        // Opaque overlay...
        //$title.append($controlPanelOverlayDiv);

        // init checkboxes
        let cbs = $(".cdc-cb");
        for (let idx=0; idx<$(cbs).length; idx++) {
            let cb = cbs[idx];
            let optName = $(cb).attr('name');
            $(`[name='${optName}']`).prop('checked', options[optName]);
        }

        // Checkbox handlers
        $(".cdc-cb").on('click', function (e) {
            let key = $(this).attr('name');
            updateOption(key, $(this).prop('checked'));
        });

        // Input field handlers
        $(".cdc-input").on('change', function (e) {
            let key = $(this).attr('name');
            updateOption(key, $(this).val());
        });

        $controlBtn.click(function () {
            dbReadAllPlayerId().then((result) => {
                //log("dbReadAllPlayerId res: ", result);
                const $playerListDiv = $controlPanelDiv.find("div#chat-player-list");
                $playerListDiv.empty();
                let num = 0;
                for (const message of result) {
                    if (num == 8) {
                        $playerListDiv.append($(`<br>`));
                        num = -1;
                    }
                    num++;
                    let a = $(`<a class="chat-control-player">${message.targetPlayerName}</a>`);
                    a.click(() => {
                        $controlPanelDiv.find("input#chat-target-id-input").val(message.targetPlayerId);
                        $controlPanelDiv.find("button#chat-search").trigger("click");
                    });
                    $playerListDiv.append(a);
                }

                $controlPanelDiv.fadeToggle(200);
                $controlPanelOverlayDiv.fadeToggle(200);
            });
        });

        $controlPanelOverlayDiv.click(function () {
            $controlPanelDiv.fadeOut(200);
            $controlPanelOverlayDiv.fadeOut(200);
        });

        $("#chat-close").on('click', function () {
            $controlPanelDiv.fadeOut(200);
            $controlPanelOverlayDiv.fadeOut(200);
        });
    }

    function getCtrlPanelHtml() {

        let innerHtml = `
            <div class="xflexr">
                <div class="xflexc" style="width: 25%;">
                    <div class=xflexr xmt10">
                        <input type="text" class="chat-control-panel-item cpl-text xmr10" id="chat-target-id-input" placeholder="Player ID" size="10" />
                        <button id="chat-search" class="xedx-torn-btn" style="cursor: pointer;">Search</button>
                    </div>
                    <div id="chat-player-list" class="cpl-text xmt10"></div><br>
                </div>
                <div>
                    <table id="cdc-opt-table" class="xmt10"><tbody>
                        <tr>
                            <td><label>Ping: <input class="cdc-cb" type="checkbox" name="doDevPings"></label></td>
                            <td><label>Silent Pings: <input class="cdc-cb" type="checkbox" name="silentPings"></label></td>
                            <td><label>Store in DB: <input class="cdc-cb" type="checkbox" name="dbEnable"></label></td>
                        </tr>
                        <tr>
                            <td><label>Public: <input class="cdc-cb" type="checkbox" name="allowPublic"></label></td>
                            <td><label>Private: <input class="cdc-cb" type="checkbox" name="allowPrivate"></label></td>
                            <td><label>Max History: <input id="history" type="number" name="maxHistory"></label></td>
                        </tr>
                        <tr>
                            <td><label>publishAnyAllowedMsg: <input class="cdc-cb" type="checkbox" name="publishAnyAllowedMsg"></label></td>
                            <td><label>allowFacMsgsOnly: <input class="cdc-cb" type="checkbox" name="allowFacMsgsOnly"></label></td>
                            <td><label>Verbose: <input class="cdc-cb" type="checkbox" name="verboseMsgs"></label></td>
                        </tr>
                    </tbody></table>
                </div>
                <div style="margin-left: auto;" class="xflexc">
                    <button id="chat-close" class="xedx-torn-btn" style="cursor: pointer;margin-left: auto;">Close</button>
                    <div style="display:flex;flex-flow:row wrap;align-items:center;">
                        <input id="dbgLogging" class="cdc-cb xmr5 xmt5" type="checkbox" name="debugLoggingEnabled">
                        <label for="dbgLogging" class="dbg-log">Debug Logging</label>
                    </div>
                </div>
            </div>
            <textarea readonly id="chat-results" cols="120" rows="30"></textarea>
        `;

        return innerHtml;
    }

    function handlePageLoad() {
        initControlPanel();
        if (options.doDevPings == true) {
            setInterval(doPing, options.pingIntervalSecs*1000);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    // Initialize the database for storage
    if (options.dbEnable == true) initIndexDB();
    initCSS();

    addTornButtonExStyles();
    addFlexStyles();

    callOnContentLoaded(handlePageLoad);

})();

/*
<div class="chat-box-header__actions___XuOq2">
<button type="button" class="chat-box-header__action-wrapper___SCl9f">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20" height="20" viewBox="0 0 13 20" class="chat-box-header__minimize-icon___tl5yb">
<defs><linearGradient xmlns="http://www.w3.org/2000/svg" id="minimize_dark_default" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
<stop offset="0" stop-color="#868686"></stop><stop offset="1" stop-color="#656565"></stop></linearGradient>
<linearGradient xmlns="http://www.w3.org/2000/svg" id="minimize_light_default" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
<stop offset="0" stop-color="#2A2B2B"></stop><stop offset="1" stop-color="#444444"></stop></linearGradient>
<linearGradient xmlns="http://www.w3.org/2000/svg" id="minimize_dark_hover" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
<stop offset="0" stop-color="#bababa"></stop><stop offset="1" stop-color="#9f9f9f"></stop></linearGradient>
<linearGradient xmlns="http://www.w3.org/2000/svg" id="minimize_light_hover" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
<stop offset="0" stop-color="#000"></stop><stop offset="1" stop-color="#000"></stop></linearGradient></defs>
<g transform="matrix(1, 0, 0, 1, 0, 0)"><path xmlns="http://www.w3.org/2000/svg" d="M1122,1060h16v2h-16Z" transform="translate(-1123 -1046)" fill="url(#minimize_dark_default)"></path></g></svg>
</button></div>
*/







