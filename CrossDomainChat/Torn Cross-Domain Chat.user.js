// ==UserScript==
// @name         Torn Cross-Domain Chat
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  This script lets you keep an eye on chat from a tab open  in another domain.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @match        https://yata.yt/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
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

(function() {
    'use strict';

    if (isAttackPage()) return log("Won't run on attack page!");

    // =============== Editable Options =============
    debugLoggingEnabled = true;          // true for more verbose logging

    var options = {
        publishLastFacMsgs: GM_getValue("publishLastFacMsgs", true),     // Write fac msgs to storage for sharing
        publishAnyAllowedMsg: GM_getValue("publishAnyAllowedMsg", true),   // Publish any msg (not just fac) if not filtered out
        filterFacMsgsOnly: GM_getValue("filterFacMsgsOnly", true),     // Only log fac messages. Supercedes previous option.
        dbEnable: GM_getValue("dbEnable", true),               // Save received mesages in indexDB. Used for saved log (clicking the eyeball)
        verboseMsgs: GM_getValue("verboseMsgs", false),

        allowPublic: GM_getValue("allowPublic", false),            // If true, let things like public trade, general, etc through
        doDevPings: GM_getValue("doDevPings", true),             // true to constantly ping - dev test to make sure both ends work without focus
        silentPings: GM_getValue("silentPings", true),          // If true don't log to chat window
        pingLifespan: GM_getValue("pingLifespan", 1),            // How long pings stay in the window, secs

        historyLimit: GM_getValue("historyLimit", 100),            // Chat message box will hold max this many messages before they scroll out.
        pingIntervalSecs: GM_getValue("pingIntervalSecs", 5)         // Time between pings
};

    // ========== End editable options ==========

    var db = null;
    var changeListener;
    var listenerWatchdog;
    var lastNonPingId = 0;
    const lastChatKey = "lastChat";
    const verifyChatKey = "lastValidChat";

    function updateOption(name, newVal) {
        options[name] = newVal;
        GM_setValue(name, newVal);
    }

    function writeOptions() {
        let keys = Object.keys(options);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            log("Saving opt ", key, " as ", options[key]);
            GM_setValue(key, options[key]);
        }
    }

    function updateOptions() {
        let keys = Object.keys(options);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            options[key] = GM_getValue(key, options[key]);
            log("Read opt ", key, " as ", options[key]);
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

    //writeOptions();

    // ================= YATA specific portion of script =====================

    if (location.hostname == 'yata.yt') {
        logScriptStart();
        log("Listening at ", location.hostname);
        callOnContentLoaded(handleYataPageLoad);
        return;
    }

    function initYataCSS() {
        addDraggableStyles();

        GM_addStyle(`
            .chat-box-wrapper {
                align-items: flex-end;
                bottom: 0px;
                display: flex;
                position: fixed;
                right: 1px;
                max-width: 262px;
            }
            .group-chat-box {
                align-items: flex-end;
                display: flex;
            }
            .chat-box {
                width: 262px;
                background: #333; 
                border-radius: 4px;
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
                align-items: center;
                display: flex;
                /*padding: 4px;*/
                /*border: 1px solid #676767;*/
                border-top: 2px solid #555;
                /*height: 34px;*/
                min-height: 24px;
            }
            .chat-box-footer__textarea {
                background: black;
                border-radius: 4px;
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
            .box-message p {
                font-size: 12px !important;
                line-height: 1rem;
                word-break: break-word;
                color: #e3e3e3;
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
        `);
    }

    function getChatMsgDiv(entry) {
        log("getChatMsgDiv: ", entry);
        let avatarUrl = entry.avatar;
        let imgSrc = (avatarUrl && avatarUrl.length) ? `https://avatars.torn.com/48X48_${avatarUrl}` : ``;
        let addlMsg = (entry.channel == "ping_channel" && options.verboseMsgs == true) ? (`(id=${entry.msg_id})`) : ``;
        let sender = (options.verboseMsgs == true) ?  `${entry.name} (on ${entry.channel}):` : `${entry.name}:`;
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
                        <p class="box-message">
                            <span class="text-message">
                            ${entry.msg} ${addlMsg}
                            </span>
                        </p>
                    </div>
                </div>
            </div>`;

        return msg;
    }

    function installYataChat() {
        let yataChatBox = `
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
                        <!-- div class='chat-box-footer'>
                            <textarea class="chat-box-footer__textarea" placeholder="Type your message here...">
                            </textarea>
                        </div -->
                    </div>
                </div>
                <div class='chat-box-footer'>
                    <textarea class="chat-box-footer__textarea" placeholder="Type your message here...">
                    </textarea>
                </div>
            </div>
            </div>
        `;

        $('body').append(yataChatBox);

        setHdrText();

        dragElement(document.getElementById("cdcb"));

        if (debugLoggingEnabled == true) logOptions();

        //setInterval(flashLed, 2000);
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
        log("Removing ping ID ", selector);
        $(selector).remove();
        setHdrText();
    }

    function ledOn() {
        $("#ping-led").animate({
            opacity: 1
        }, 50, function() {
            setTimeout(ledOff, 500);
        });
    }

    function ledOff() {
        $("#ping-led").animate({
            opacity: 0
        }, 50);
    }

    function flashLed() {
        log("Flashing LED");
        ledOn();

        /*
        $("#ping-led").animate({
            opacity: 1
        }, 100, function() {
            $("#ping-led").animate({
            opacity: 0
        }, 500)});
        */
    }

    // Notified when our storage key value changes, re-read the list
    function storageChangeCallback(key, oldValue, newValue, remote) {
        debug("storageChangeCallback, remote: ", remote, " key: ", key, " newValue? ", newValue ? true : false);
        if (!remote || !newValue) return;
        thisChat = JSON.parse(newValue);

        if (!prevChat)
            prevChat = thisChat;
        else
            if (prevChat.msg_id == thisChat.msg_id)
                return log("Same msg ID (", thisChat.msg_id, "), returning.");

        log("Entry: ", thisChat);

        if (thisChat.channel == 'ping_channel')
            flashLed();

        if (thisChat.channel == 'ping_channel' && options.silentPings == true) {
            debug("Ping detected, set to silent");
            return;
        }

        let newMsg = getChatMsgDiv(thisChat);
        $("#cbb").append(newMsg);
        keepScrolledToBottom();

        if (thisChat.channel == 'ping_channel') {
            let time = options.pingLifespan * 1000;
            log("Will remove ping id ", thisChat.msg_id, " in ", time, " ms");
            setTimeout(removeMsg, time, ("#" + thisChat.msg_id));
        } else {
            lastNonPingId = thisChat.msg_id;
            log("Last ID: ", lastNonPingId);
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
            log("ID's changed, entry: ", entry.msg_id, " last: ", lastNonPingId);
            if (changeListener) GM_removeValueChangeListener(changeListener);
            changeListener = GM_addValueChangeListener(lastChatKey, storageChangeCallback);
            lastNonPingId = 0;
            log("***** chageListener reset! *****");
        } else {
            log("Watchdog test passed: ", entry.msg_id, " last: ", lastNonPingId);
        }
    }

    function handleYataPageLoad() {
        initYataCSS();
        installYataChat();

        if (changeListener) GM_removeValueChangeListener(changeListener);
        changeListener = GM_addValueChangeListener(lastChatKey, storageChangeCallback);

        // Periodically check to see if we've lost our listener
        listenerWatchdog = setInterval(watchdogTimer, 5000);
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

            log("ChatRecorder: found chat2.0 websocket");
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
        const openRequest = indexedDB.open("ScriptChat2.0RecorderDB", 2);
        openRequest.onupgradeneeded = function (e) {
            db = e.target.result;
            if (!db.objectStoreNames.contains("messageStore")) {
                log("ChatRecorder: initIndexDB open onupgradeneeded create store");
                const objectStore = db.createObjectStore("messageStore", { keyPath: "messageId", autoIncrement: false });
                objectStore.createIndex("targetPlayerId", "targetPlayerId", { unique: false });
            }
        };
        openRequest.onsuccess = function (e) {
            log("ChatRecorder: initIndexDB open onsuccess");
            db = e.target.result;
        };
        openRequest.onerror = function (e) {
            console.error("ChatRecorder: initIndexDB open onerror");
            console.dir(e);
        };
    }

    function dbWrite(message) {
        if (!db) {
            console.error("ChatRecorder: dbWrite db is null");
        }

        let msg = {};
        const targetPlayer = getTargetPlayerFromMessage(message);
        if (!targetPlayer) {
            debug("[dbWrite] skipping msg: ", message.channel_url);
            return;
        }
        msg.targetPlayerId = targetPlayer.id;
        msg.targetPlayerName = targetPlayer.name;
        msg.senderPlayerId = message.user.guest_id;
        msg.senderPlayerName = message.user.name;
        msg.avatar = message.user.image;
        msg.timestamp = message.ts;
        msg.messageText = message.message;
        msg.messageId = message.msg_id;
        // console.log(msg);

        let isFacMsg = false;
        if (options.filterFacMsgsOnly == true && targetPlayer.id == 'faction') {
            isFacMsg = true;
            debug("Fac msg received: ", msg);
            debug("Full: ", message);
        } else if (options.filterFacMsgsOnly == false) {
            debug("Msg received: ", message.channel_url, msg);
            debug("Full: ", message);
        }

        if ((isFacMsg == true && options.publishLastFacMsgs == true) || (options.publishAnyAllowedMsg == true)) {
            let entry = {msg_id: message.msg_id, user_id: message.user.guest_id, avatar: message.user.image,
                         name: message.user.name, msg: message.message, channel: message.channel_url};

            debug("Writing entry: ", entry);
            GM_setValue(lastChatKey, JSON.stringify(entry));
            GM_setValue(verifyChatKey, JSON.stringify(entry));
        }

        if (options.dbEnable == false || !options.dbEnable) return;

        const transaction = db.transaction(["messageStore"], "readwrite");
        transaction.oncomplete = (event) => { };
        transaction.onerror = (event) => {
            console.error("ChatRecorder: dbWrite transaction onerror [" + msg.targetPlayerId + " " + msg.senderName + ": " + msg.messageText + "]");
        };

        const store = transaction.objectStore("messageStore");
        const request = store.put(msg);
        request.onsuccess = (event) => { };
    }

    var rollingId = 0;
    function doPing() {
        let msg = formatDateString(new Date());
        let elementId = "chat-ping-" + (rollingId++);
        let entry = {msg_id: elementId, user_id: 1, avatar: "",
                         name: "ping", msg: msg, channel: "ping_channel"};

        log("Pinging: ", entry);
        GM_setValue(lastChatKey, JSON.stringify(entry));
    }

    function dbWriteArray(messageArray) {
        if (!db) {
            console.error("ChatRecorder: dbWriteArray db is null");
            return;
        }

        const transaction = db.transaction(["messageStore"], "readwrite");
        transaction.oncomplete = (event) => { };
        transaction.onerror = (event) => {
            console.error("ChatRecorder: dbWrite transaction onerror [" + msg.targetPlayerId + " " + msg.senderName + ": " + msg.messageText + "]");
        };

        const store = transaction.objectStore("messageStore");

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

        const transaction = db.transaction(["messageStore"], "readonly");
        transaction.oncomplete = (event) => { };
        transaction.onerror = (event) => {
            console.error("ChatRecorder: dbReadByTargetPlayerId transaction onerror [" + targetPlayerId + "]");
        };

        const store = transaction.objectStore("messageStore");
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

        const transaction = db.transaction(["messageStore"], "readonly");
        transaction.oncomplete = (event) => { };
        transaction.onerror = (event) => {
            console.error("ChatRecorder: dbReadAllPlayerId transaction onerror");
        };

        const store = transaction.objectStore("messageStore");
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
                font-weight: bold;
            }
            #cdc-opt-table td label {
                padding: 2px 20px 2px 20px;
            }

            .cdc-ip {

            }
        `);
    }

    function initControlPanel() {
        debug("initControlPanel");
        let $title; // = $("div#top-page-links-list");
        let addlClass = "links-fmt";
        //if ($title.length === 0) {
            addlClass = "btn-wrap-fmt";
            $title = $(".header-navigation.right > .header-buttons-wrapper > ul");
        //}
        if ($title.length === 0) {
            console.error("ChatRecorder: nowhere to put control panel button");
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
                let text = "";
                for (const message of result) {
                    const timeStr = formatDateString(new Date(message.timestamp));
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
            log("On cb click, ", key);
            updateOption(key, $(this).prop('checked'));
        });

        // Input field handlers
        $(".cdc-input").on('change', function (e) {
            let key = $(this).attr('name');
            log("On input change, key: ", key, " new val: ", $(this).val());
            updateOption(key, $(this).val());
        });

        $controlBtn.click(function () {
            dbReadAllPlayerId().then((result) => {
                log("dbReadAllPlayerId res: ", result);
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
                            <td><label>Public: <input class="cdc-cb" type="checkbox" name="allowPublic"></label></td>
                            <td><label>Silent Pings: <input class="cdc-cb" type="checkbox" name="silentPings"></label></td>
                        </tr>
                        <tr>
                            <td><label>publishAnyAllowedMsgs: <input class="cdc-cb" type="checkbox" name="publishAnyAllowedMsgs"></label></td>
                            <td><label>filterFacMsgsOnly: <input class="cdc-cb" type="checkbox" name="filterFacMsgsOnly"></label></td>
                            <td><label>dbEnable: <input class="cdc-cb" type="checkbox" name="dbEnable"></label></td>
                        </tr>
                        <tr>
                            <td><label>Store in DB: <input class="cdc-cb" type="checkbox" name="dbEnable"></label></td>
                            <td><label>Verbose: <input class="cdc-cb" type="checkbox" name="verboseMsgs"></label></td>
                            <td><label style="display: none;"><input class="cdc-cb" type="checkbox" name=""></label></td>
                        </tr>
                    </tbody></table>
                </div>
                <!-- br -->
            </div>
            <textarea readonly id="chat-results" cols="120" rows="30"></textarea>
        `;

        return innerHtml;
    }

    function formatDateString(date) {
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







