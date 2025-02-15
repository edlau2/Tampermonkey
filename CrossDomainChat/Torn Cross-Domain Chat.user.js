// ==UserScript==
// @name         Torn Cross-Domain Chat
// @namespace    http://tampermonkey.net/
// @version      0.1
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

    debugLoggingEnabled = true;          // true for more verbose logging

    const publishLastFacMsgs = true;     // Write fac msgs to storage for sharing
    const publishAnyAllowedMsg = true;   // Publish any msg (not just fac) if not filtered out
    const filterFacMsgsOnly = false;     // Only log fac messages. Supercedes previous option.
    const dbEnable = true;               // Save received mesages in indexDB. Used for saved log (clicking the eyeball)
    const allowPublic = true;            // If true, let things like public trade, general, etc through

    const doDevPings = true;             // true to constantly ping - dev test to make sure both ends work without focus
    const pingIntervalSecs = 30;         // Time between pings

    const historyLimit = 100;            // Chat message box will hold max this many messages before they scroll out.

    var db = null;
    var changeListener;
    const lastChatKey = "lastChat";

    var prevChat, thisChat;

    // ================= YATA specific portion of script =====================

    if (location.hostname == 'yata.yt') {
        logScriptStart();
        log("Listening at ", location.hostname);
        callOnContentLoaded(handleYataPageLoad);
        return;
    }

    if (location.href.indexOf('bitsnbobs') < 0) {
        log("Only configured for Bits 'n Bobs...going home.");
        return;
    }

    function initYataCSS() {
        GM_addStyle(`
            .chat-box-wrapper {
                align-items: flex-end;
                bottom: 39px;
                display: flex;
                position: absolute;
                right: 1px;

                height: 334px;
                width: 268px;

                border: 1px solid limegreen;
            }
            .group-chat-box {
                align-items: flex-end;
                display: flex;
            }
            .chat-box {
                height: 328px;
                width: 262px;
                background: #333;  /* var(--chat-box-bg); */
                border-radius: 4px;
                box-shadow: 0 4px 4px rgba(0,0,0,.25);
                overflow: hidden;
                position: relative;
            }
            .chat-box-body {
                border: 1px solid red; /* var(--chat-box-border); */
                height: 100%;
                overflow-y: auto;
                overscroll-behavior: contain;
                padding: 0 10px;
            }

            [class^='chat-box-message'] {
                margin-bottom: 2px;
                display: flex;
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
                padding: 4px;
                border: 1px solid blue;
            }
            .chat-box-footer__textarea {
                background: black;  /* var(--chat-box-input-bg); */
                border: #999;  /* var(--chat-box-input-border); */
                border-radius: 4px;
                color: white;  /* var(--chat-box-input-color); */
                flex-grow: 1;
                font-family: Arial,Helvetica,sans-serif;
                font-size: 12px;
                min-width: 100px;
                padding: 10px 8px;
                resize: none;
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
                font-size: 12px;  /* var(--torntools-chat-font-size, 12px) !important; */
                color: #333;
                color: #ccc;  /* var(--chat-box-sender-name-text); */

                display: inline;
                font-weight: 700;
                margin-right: 4px;

                word-break: break-word;
            }
            .box-message p {
                font-size: 12px !important;  /* var(--torntools-chat-font-size, 12px) !important; */
                line-height: 1rem;

                color: #e3e3e3;  /* var(--chat-text-color); */
            }
            .chat-box-header {
                align-items: center;
                background: linear-gradient(180deg,#303030,#444 .01%,#363636 55.73%,#2e2e2e 99.99%,#2e2e2e);
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                min-height: 34px;
                padding: 0 0 0 6px;
            }
        `);
    }

    function getChatMsgDiv(entry) {
        let avatarUrl = entry.avatar;
        let imgSrc = (avatarUrl && avatarUrl.length) ? `https://avatars.torn.com/48X48_${avatarUrl}` : ``;
        let msg =
            `<div id="chat-${entry.msg_id}">
                <div class="chat-box-message">
                    <div class="chat-box-message__avatar">
                        <a href="/profiles.php?XID=${entry.user_id}" class="avatar-status-wrapper">
                            <img alt="chat-avatar" class="avatar___tLOOh"
                                src="${imgSrc}">
                        </a>
                    </div>
                    <div class="chat-box-message__box" data-is-tooltip-opened="false">
                        <a href="/profiles.php?XID=${entry.user_id}" class="message__sender">
                            ${entry.name}:
                        </a>
                        <p class="box-message">
                            <span class="text-message">
                            ${entry.msg}
                            </span>
                        </p>
                    </div>
                </div>
            </div>`;

        return msg;
    }

    function installYataChat() {
        let yataChatBox = `
            <div class="chat-box-wrapper">
                <div class="group-chat-box">
                    <div class="chat-box" id="fac-chat">
                        <div class="chat-box-header"></div>
                        <div style="height: 250px;">
                        <div id='cbb' class='chat-box-body'>

                        </div>
                        </div>
                    </div>
                    <div class='chat-box-footer'>
                        <textarea class="chat-box-footer__textarea" placeholder="Type your message here..." style="height: 14px !important;">
                        </textarea>
                    </div>
                </div>
            </div>
        `;

        $('body').append(yataChatBox);
    }

    function keepScrolledToBottom() {
        //let scrollableDiv = $("#cbb");
        //let scrollHeight = $(scrollableDiv).scrollTop();
        //$(scrollableDiv).scrollTop(scrollHeight);

        $("#cbb")[0].scrollTop = $("#cbb")[0].scrollHeight;
    }

    // Notified when our storage key value changes, re-read the list
    function storageChangeCallback(key, oldValue, newValue, remote) {
        debug("storageChangeCallback, remote: ", remote, " key: ", key, " newValue? ", newValue ? true : false);
        if (!remote || !newValue) return;
        thisChat = JSON.parse(newValue);

        //debug("storageChangeCallback, old: ", oldValue ? JSON.parse(oldValue) : "NA");
        //debug("storageChangeCallback, new: ", thisChat);

        if (!prevChat)
            prevChat = thisChat;
        else
            if (prevChat.msg_id == thisChat.msg_id) return;


        let newMsg = getChatMsgDiv(thisChat);
        $("#cbb").append(newMsg);
        keepScrolledToBottom();

        if ($("#cbb").children().length > historyLimit)
            $("#cbb").children()[0].remove();
    }

    function handleYataPageLoad() {
        initYataCSS();
        installYataChat();

        if (changeListener) GM_removeValueChangeListener(changeListener);
        changeListener = GM_addValueChangeListener(lastChatKey, storageChangeCallback);
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
                console.log("ChatRecorder: initIndexDB open onupgradeneeded create store");
                const objectStore = db.createObjectStore("messageStore", { keyPath: "messageId", autoIncrement: false });
                objectStore.createIndex("targetPlayerId", "targetPlayerId", { unique: false });
            }
        };
        openRequest.onsuccess = function (e) {
            console.log("ChatRecorder: initIndexDB open onsuccess");
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
            log("[dbWrite] skipping msg: ", message.channel_url);
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
        if (filterFacMsgsOnly == true && targetPlayer.id == 'faction') {
            isFacMsg = true;
            debug("Fac msg received: ", msg);
            debug("Full: ", message);
        } else if (filterFacMsgsOnly == false) {
            debug("Msg received: ", message.channel_url, msg);
            debug("Full: ", message);
        }

        if ((isFacMsg == true && publishLastFacMsgs == true) || (publishAnyAllowedMsg == true)) {
            let entry = {msg_id: message.msg_id, user_id: message.user.guest_id, avatar: message.user.image,
                         name: message.user.name, msg: message.message, channel: message.channel_url};

            debug("Writing entry: ", entry);
            GM_setValue(lastChatKey, JSON.stringify(entry));
        }

        if (dbEnable == false || !dbEnable) return;

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
        if (message.channel_url.startsWith("public_") && allowPublic == false) {
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
                        margin: 2px 2px 2px 2px;
                      }`);
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
        `);
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
        $controlPanelDiv.html(`
        <input type="text" class="chat-control-panel-item" id="chat-target-id-input" placeholder="Player ID" size="10" />
        <button id="chat-search" class="xedx-torn-btn" style="cursor: pointer;">Search</button><br>
        <div id="chat-player-list"></div><br>
        <textarea readonly id="chat-results" cols="120" rows="30"></textarea>
        `);

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
        //$title.append($controlPanelOverlayDiv);

        $controlBtn.click(function () {
            dbReadAllPlayerId().then((result) => {
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
        if (doDevPings == true) {
            setInterval(doPing, 10000);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    //versionCheck();

    // Initialize the database for storage
    if (dbEnable == true) initIndexDB();
    initCSS();

    addTornButtonExStyles();

    callOnContentLoaded(handlePageLoad);

})();
