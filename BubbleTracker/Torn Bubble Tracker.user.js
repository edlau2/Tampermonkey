// ==UserScript==
// @name         Torn Bubble Tracker
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Track bubbles on the Torn home page.
// @author       xedx [2100735]
// @include      https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // Element styles
    GM_addStyle('.xedx_bb_rad {' +
                'border-bottom-left-radius: 5px !important;' +
                'border-bottom-right-radius: 5px !important;' +
                '}');

    // Globals
    var server = false;
    var targetNode = null;
    var observer = null;
    var config = { attributes: false, childList: true};
    var wsServer = null;
    var bc = new BroadcastChannel('xedx_bubbles');
    var minimized = false;

    // Handle received broadcasts
    var recvMsgQ = [];
    bc.onmessage = function(ev) {
        let obj = ev.data;
        console.log('Received Broadcast: ', obj.message);
        recvMsgQ.push(obj.message);
        if (recvMsgQ.length > 20) recvMsgQ.shift();
        if (!minimized) processNewMessage();
    }

    function processNewMessage() {
        //let sel = document.getElementById("xedx-msg-list");
        let sel = document.querySelector("#xedx-msg-list");
        if (!sel) return;
        var child = sel.lastElementChild;
        while (child) {
            sel.removeChild(child);
            child = sel.lastElementChild;
        }
        for (let i=0; i<recvMsgQ.length; i++) {
            console.log('Appending child to ', sel);
            $(sel).append('<div class="message_3Q16H"><span>' + recvMsgQ[i] + '</span></div>');
        }
    }

    // Handle target mutations - node additions, in this case.
    const bubbleCallback = function(mutationsList, observer) {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                let nodeList = mutation.addedNodes;
                if (nodeList) processNewNodes(nodeList);
            }
        }
    };

    const chatCallback = function(mutationsList, observer) {
        for(const mutation of mutationsList) {
            console.log('Chat mutation: ', mutation);
            if (!minimized) installUI();
        }
    };

    // Find the last active (open) chat box
    function lastActiveChat(target) {
        let activeChats = target.getElementsByClassName('chat-active_mF7Kn');
        let lastChat = activeChats[activeChats.length-1];
        return lastChat;
    }

    function handleMinimize() {
        log('Minimize called!');
        if (observer) observer.disconnect();
        let sel = document.getElementById("xedx-chat");
        if (sel.classList.contains("chat-active_mF7Kn")) {
            let oldNode = document.getElementById("xedx-chat");
            if (oldNode) oldNode.parentNode.removeChild(oldNode);
            let target = document.querySelector("#chatRoot > div");
            $(target).append(minimizedDiv);
            document.getElementById("xedx-chat").addEventListener("click", handleMinimize);
            minimized = true;
        } else {
            log('Maximize!');
            minimized = false;
            installUI();
        }
        if (observer) observer.observe(targetNode, config);
    }

    // Intall our UI - a chatbox, ATM
    function installUI() {
        log('installUI...');
        if (observer) observer.disconnect();

        // If already there, remove - we can call again later, if new nodes are added/removed!
        let oldNode = document.getElementById("xedx-chat");
        if (oldNode) oldNode.parentNode.removeChild(oldNode);

        // Figure out last active chat...
        let target = document.querySelector("#chatRoot > div");
        let lastChat = lastActiveChat(target);
        console.log('lastChat: ', lastChat);

        // Size width correctly, same as open chat to the right (lastChat).
        // If no last chat, assume 232? Doesn't account for custom scale....
        // Also need to specify it' right-hand position, which is the right-hand
        // position of the lastChat _ the width of tht chat. If there is no last
        // chat, should be 1px.
        let right = Number(lastChat ? lastChat.style.right.match(/\d+/)[0] : 1);
        let width = Number(lastChat ? lastChat.firstChild.style.maxWidth.match(/\d+/)[0] : 232); // Fix for custom width!
        log('right: ' + right + ' width: ' + width);
        let newDivRight = (Number(right) + Number(width) + 2) + 'px;'; // '2' for borders/margins ?

        // Now find the height - no input, so content + input of lastChat, or default to 251 (200+51), unless custom.
        let contentDiv = lastChat? lastChat.getElementsByClassName('chat-box-content_2iTSI')[0] : null;
        let contentHeight = contentDiv ? contentDiv.style.height.match(/\d+/)[0] : 0;
        console.log('content height: ', contentDiv.style.height.match(/\d+/)[0]);
        let inputDiv = lastChat? lastChat.getElementsByClassName('chat-box-textarea_1RrlX')[0] : null;
        let inputHeight = inputDiv ? inputDiv.style.height.match(/\d+/)[0] : 51;
        let myContentHeight = Number(contentHeight) + Number(inputHeight) + 20; // '20' for borders and margins
        let myViewHeight = myContentHeight - 2;

        // Add the new chatbox...
        if (target) {
            $(target).append(chatDiv);
            document.getElementById("xedx-chat").setAttribute('style', 'bottom: 48px; z-index: 999; right:' + newDivRight);
            document.getElementById("xedx-chat-content").setAttribute('style',
                                                                      "height: " + myContentHeight + "px; width: " + width + ".4px;");
            document.getElementById("xedx-chat-viewport").setAttribute('style',
                                                                       "height: " + myViewHeight + "px; max-height:  " + myViewHeight + "px;");
            document.getElementById("xedx-chat-minimize").addEventListener("click", handleMinimize);
            processNewMessage();
            log('Chat div appended');
            console.log('New chat div: ', document.getElementById("xedx-chat"));
            minimized = false;
        } else {
            log('Unable to find target node for chat!');
        }

        if (observer) observer.observe(targetNode, config);
    }

    // Handle new nodes as they're added
    function processNewNodes(nodeList) {
        log('processNewNodes');
        for (let i=0; i<nodeList.length; i++) {
            let textNodes = nodeList[i].getElementsByClassName("bubble-text");
            if (textNodes[0]) {
                log('Posting msg: ' + textNodes[0].innerText);
                let message = {'message': textNodes[0].innerText, 'sender': 'xedx'};
                bc.postMessage(message);
            }
        }
    }

    // Start the server/client process going.
    var retries = 0;
    function handlePageLoad() {
        if (!targetNode) {
            targetNode = document.querySelector("#body > div.city-banner > div");
            if (!targetNode && retries < 5) { // Fails, we are a client, otherwise, we're a server.
                log('City Banner div not located!');
                retries++;
                return setTimeout(handlePageLoad, 50);
            }
            if (targetNode) server = true;
        }

        if (server) { // In this case, look for new 'bubbles' being addded
            if (!observer) observer = new MutationObserver(bubbleCallback);
            observer.observe(targetNode, config);
        } else { // In this case, watch for chat nodes coming and going
            installUI();
            targetNode = document.querySelector("#chatRoot > div");
            config.attributes = true;
            if (!observer) observer = new MutationObserver(chatCallback);
            observer.observe(targetNode, config);
        }
        log('Up and running as a ' + (server ? 'server' : 'client') + ' process!');
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    handlePageLoad();

    //////////////////////////////////////////////////////////////////////
    // DIV for new chat window
    //////////////////////////////////////////////////////////////////////

    const chatDiv =
        '<div id="xedx-chat" class="chat-box_3hUA3 chat-active_mF7Kn" style="bottom: 49px; z-index: 999; right:1px;">' +
            '<div class="chat-box-head_6LaFd" style="width: 232.4px; max-width: 232.4px;">' +
                '<div id="xedx-chat-minimize" class="chat-box-title_1-IuG" title="Bubbles">' +
                    '<i class="icon_3RPUi"></i>' +
                    '<span class="name_314zy">Bubbles</span>' +
                    '<div class="close_3fpv3" title="Minimize Bubbles chat box">' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div id="xedx-chat-content" class="chat-box-content_2iTSI xedx_bb_rad" style="height: 164px; width: 230.4px;">' +
                '<div class="scrollbar_1xGYy">' +
                    '<div>' +
                        '<div class="thumb_3HNYP"></div>' +
                    '</div>' +
                '</div>' +
                '<div id="xedx-chat-viewport" class="viewport_2GO93" style="height: 163px; max-height: 163px;">' +
                    '<div id="xedx-msg-list" class="overview_3wKDe">' +
                        '<div class="message_3Q16H">' +
                            //'<span>Bubble Text Goes Here</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    const minimizedDiv =
        '<div id="xedx-chat" class="chat-box_3hUA3 minimized_28HED online_2Gxm9" style="top: 0px;">' +
            '<div class="chat-box-head_6LaFd">' +
                '<div class="chat-box-title_1-IuG" title="Bubbles">' +
                    '<i class="icon_3RPUi"></i>' +
                '</div>' +
            '</div>' +
        '</div>';

})();