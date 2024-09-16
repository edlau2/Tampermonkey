// ==UserScript==
// @name         Torn Chat Bust Quick Click
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Add right-click to quickly bust fac mates out of jail.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
// @xrequire      file:////Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers-2.45.3.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    var cachedChatBox;
    var menusOnly = GM_getValue("menusOnly", true);
    GM_setValue("menusOnly", menusOnly);

    function pushStateChanged(e) {
        log("pushStateChanged: ", e);
        setTimeout(installChatBuster, 500);
    }

    var facChatRoot;
    var facChatTarget;

    // Observer to detect messages changing
    function chatObserverCB(mutations, observer) {
        if (menusOnly) return;

        let filtered = mutations.filter((mutation) => mutation.addedNodes.length > 0);
        let modified = 0;

        for (let added of filtered) {
            let element = added.addedNodes[0];
            let target = $(element).find("[class*='chat-box-message__box_']")[0];
            let hrefElem = $(target).children(":first")[0];
            let href = $(hrefElem).attr('href');
            let id = href ? idFromURL(href) : undefined;
            $(hrefElem).addClass("cbqc2");
            addNodeClickHandler(element, id);

            modified++;
        }
    }

    // Observer to see when fac-chat is added/removed
    function minMaxObserverCB(mutations, observer) {
        let facbox = findFacChatBox();
        if (cachedChatBox && $(facbox).length > 0 && (cachedChatBox != facbox)) {
            console.error("Cached chat not the same!!");
            log("Cached chat not the same!!");
            debugger;
        }
        if ($(facbox).length < 1) {
            $(".cbqc1").remove();
            return;
        }

        let filtered = mutations.filter((mutation) => mutation.addedNodes.length > 0);
        let facButton = undefined;

        for (let added of filtered) {
            let element = added.addedNodes[0];
            facButton = $(element).find("[class*='chat-box-header__'] > button > p")
                       .filter(function( index ) { return $(this).text().indexOf("Faction") > -1;});

            if ($(facButton).length > 0) break;
        }

        if (facButton) installChatBuster();
    }

    function addNodeClickHandler(node, id) {
        if (id) $(node).attr('XID', id);
        $(node).on('contextmenu', handleChatClick);
    }

    // Handle right-click on user name
    function handleChatClick(e) {
        log("handleChatClick: enabled? ", !menusOnly, " event: ", e);
        if (menusOnly) return;

        e.preventDefault();

        let target = $(e.currentTarget);
        let id = $(target).attr('XID');
        log("target: ", $(target));
        log("user ID: ", id);

        let name = $($(target).find(".cbqc2")[0]).text();
        if (name) name = name.slice(0, -1);

        if (confirm("Bust " + name + " loose?")) {
            let jailURL = "https://www.torn.com/jailview.php?XID=" + id;
            openInNewTab(jailURL, false);
        }
        return false;
    }

    function handleChatClick2(e) {
        log("handleChatClick2: enabled? ", !menusOnly, " event: ", e);
        if (menusOnly) return;

        e.preventDefault();

        let target = $(e.currentTarget);
        let id = $(target).attr('XID');
        let position = $(target).position();

        log("target: ", $(target));
        log("user ID: ", id);
        log("position: ", $(target).position());
        log("x,y: ", e.clientX, " ", e.clientY);

        let name = $($(target).find(".cbqc2")[0]).text();
        if (name) name = name.slice(0, -1);

        let popup = "<div id='xminipop' class='x-minipop'>" + //<div style='padding: 8px;'>" +
            '<input id="x-bust-btn" type="button" class="xedx-torn-btn" value="Bust!">' +
            '<input id="x-prof-btn" type="button" class="xedx-torn-btn" value="Profile">' +
            "</div>";
        $(target).parent().after(popup);
        $("#xminipop").css("top", position.top + "px");
        $("#xminipop").css("left", position.left + "px");

        $("#xminipop").on("contextmenu", function () {$("#xminipop").remove(); return false;});

        $("#x-bust-btn").on("click", function () {
            let jailURL = "https://www.torn.com/jailview.php?XID=" + id;
            openInNewTab(jailURL, false);
        });

        return false;
    }

    function addHandlersToListNodes(root) {
        let targets = $(root).find("[class*='chat-box-message__box_']");
        for (let idx=0; idx<$(targets).length; idx++) {
            let target = targets[idx];
            let hrefElem = $(target).children(":first")[0];
            let href = $(hrefElem).attr('href');
            let id = href ? idFromURL(href) : undefined;
            $(hrefElem).addClass("cbqc2");
            addNodeClickHandler(target, id);
        }
    }

    // Filter the right-click handler on the fac chat box, to
    // position correctly. Also close any tool tips.
    function facFilter(e) {
        $(".cbqc1").remove();
        $("#xfac-chat-ctx").addClass("x-ctx-pos");
    }

    function toggleMenuText() {
        if (!menusOnly) {
            $("#xkcd").removeClass("x-off-menu").addClass("x-on-menu");
            $("#xkcd > a").text("Turn Off");
        } else {
            $("#xkcd").removeClass("x-on-menu").addClass("x-off-menu");
            $("#xkcd > a").text("Turn On");
        }
    }

    // Handlee the enable/disable popup button
    var targetSelForHide;
    function doMenuClick(e) {
        e.preventDefault();
        menusOnly = !menusOnly;
        GM_setValue("menusOnly", menusOnly);
        let btn = e.currentTarget;
        toggleMenuText();

        if (!menusOnly) {
            let facChatTarget = $(facChatRoot).parent().parent().next().children(":first");
            addHandlersToListNodes($(facChatTarget)[0]);
        } else {
             $(".cbqc2").removeClass("cbqc2");
        }

        $("#xfac-chat-ctx").animate({opacity: 0},
           {duration: 1000,
            complete: function(){
                cmHideShow("#xfac-chat-ctx", targetSelForHide);
                $("#xfac-chat-ctx").css("opacity", 1);
            }});

        return false;
    }

    var toolTipText = //"<span style='border: 1px solid blue; padding: 3px; border-radius: 5px;align-content: center;'>" +
                      "<span style='color: red;'>" +
                      "Chat-Bust Quick-Click<br><br>" +
                      "</span>" +
                      "Right-click header bar to toggle <br>" +
                      "between enabled and disabled.<br><br>"+
                      "If activated, hovering on user's names<br>" +
                      "will cause them to glow green.<br><br>" +
                      "Right-click a user's name in Chat to open<br>" +
                      "a new tab in jail, to bust them loose!";

    var togleSwitch = false;
    function installChatBuster() {
        if (isJailPage()) {
            let params = new URL(document.location.toString()).searchParams;
            let xid = params.get("XID");
            if (xid)
                return callOnContentComplete(doJailBust);
        }

        facChatRoot = findFacChatBox();
        debug("facChatRoot: ", $(facChatRoot));

        // Add context menu to top bar. Can disable script dynamically.
        log("Adding context menu. Script enabled? ", !menusOnly);
        let topBar = $(facChatRoot).parent().parent().parent().children(":first")[0];
        let destNode = $(topBar).parent();
        targetSelForHide = destNode;
        installContextMenu(destNode, "xfac-chat-ctx", {filter: facFilter, fadeOut: true});
        $("#xfac-chat-ctx").addClass("xctx");
        $("#xfac-chat-ctx").addClass("x-ctx-pos");

        let testLi = `<li id="xkcd"><a>Toggle On/Off</a></li>`;
        $("#xfac-chat-ctx > ul").append(testLi);
        $("#xkcd").on('click', doMenuClick);

        if (!menusOnly) {
            $("#xkcd").addClass("x-on-menu");
            $("#xkcd > a").text("Turn Off");
        } else {
            $("#xkcd").addClass("x-off-menu");
            $("#xkcd > a").text("Turn On");
        }

        // tooltip for same. Test: multiple classes
        displayHtmlToolTip(topBar, toolTipText, "tooltip4 cbqc1");

        // Ugly, gotta be a better jquery way to do this or make my own...
        let facChatTarget = $(facChatRoot).parent().parent().next().children(":first");

        // Add handlers to messages
        if (!menusOnly)
            addHandlersToListNodes($($(facChatTarget)[0]).parent());

        // Add observer to monitor for new messages
        const chatOpts = {attributes: false, childList: true, characterData: false, subtree: true};
        if ($(facChatTarget).length) {
            let chatObserver = new MutationObserver(chatObserverCB);
            chatObserver.observe($(facChatTarget)[0], chatOpts);
        }

        // Add observer to handle minimize/maximize
        let minMaxTarget = $("#chatRoot > div > div > [class^='chat-app__chat-list-chat-box-wrapper__'] > div");
        const minMaxOpts = {attributes: false, childList: true, characterData: false, subtree: false};
        if ($(minMaxTarget).length) {
            let minMaxObserver = new MutationObserver(minMaxObserverCB);
            minMaxObserver.observe($(minMaxTarget)[0], minMaxOpts);
        }
    }

    function findFacChatBox() {
        if (document.contains($(cachedChatBox)[0]) == true) {
            log("Using cached node: ", $(cachedChatBox));
            return cachedChatBox;
        } else {
            log("Need new fac-chat: ", $(cachedChatBox));
            cachedChatBox = undefined;
        }

        let nameList = $("#chatRoot").find("[class*='chat-box-message__box_']");
        let chatBoxNodes =  $("#chatRoot").find("[class*='chat-box-header__'] > button > p");
        debug("Nodes: ", chatBoxNodes);
        let root = $("#chatRoot").find("[class*='chat-box-header__'] > button > p")
                       .filter(function( index ) { return $(this).text().indexOf("Faction") > -1;});

        if (!cachedChatBox && $(root).length > 0) cachedChatBox = root;
        return root;
    }

    function doJailBust() {
        let params = new URL(document.location.toString()).searchParams;
        let xid = params.get("XID");
        if (xid) {!
            log("Jailbreak! Going to bust out ", xid);
            scrollToXID(xid);
        }
    }

    function scrollTo (elem) {
       $('html,body').animate({
          scrollTop: $(elem).offset().top - $(window).height()/2
       }, 500);
    }

    function scrollToXID(xid) {
        let userElem;
        let users = $("li > a.user.name");
        for (let idx = 0; idx < users.length; idx++) {
            let node = users[idx];
            log("checking node: ", $(node));
            log("href: ", $(node).attr("href"));
            if ($(node).attr("href").indexOf(xid) > -1) {
                userElem = $(node);
                break;
            }
        }

        log("userElem: ", $(userElem));
        if ($(userElem).length) {
            let parent = $(userElem).parent();
            $(parent).css('border', '2px solid limegreen');
            scrollTo(parent);
        } else {
            log("XID not found!");
        }
    }

    function addStyles() {
        addContextStyles();
        addToolTipStyle();
        loadTtsColors();
        addTornButtonExStyles();

        // Colors for the fake button, when on or off.
        // Need to over-ride default hover efects...
        GM_addStyle(`
                .x-on-menu {
                    min-height: 28px;
                    background-color: rgba(0,255,0,0.5);
                    border: 2px solid black;
                }
                .x-off-menu {
                    background-color: rgba(255, 0, 0, 0.6);
                    min-height: 28px;
                    border: 2px solid black;
                }
                ul li.x-on-menu:hover {
                    background-color: rgba(0,255,0,0.9) !important;
                }
                ul li.x-off-menu:hover {
                    background-color: rgba(255,0,0,0.8) !important;
                }
                .cbqc2 {
                    
                }
                .cbqc2:hover {
                    color: rgba(0, 255, 0, 0.6) !important;
                }
            `);

        // fake "button", and LI in disguise,  appearance.
        // Also parent positioning, above chat header.
        GM_addStyle(`
                .x-ctx-pos {
                    left: 131px !important;
                    top: -10px !important;
                    position: absolute !important;
                    max-height: fit-content;
                }
                .xctx {
                    border-radius: 10px;
                    min-width: fit-content;
                    min-height: fit-content;
                    cursor: pointer;
                }
                .xctx ul {
                    border-radius: inherit;
                    min-width: inherit !important;
                    min-height: inherit;
                }
                .xctx ul li  {
                    border-radius: inherit;
                    width: 90px;
                    height: 26px;
                }
            `);

        GM_addStyle(`
            .x-minipop {
                position: absolute;
                display: flex;
                flex-direction: row;
                z-index: 9999999;
                width: 100px;
                height: 24px;
                background: none;
                border: 2px solid black;
                border-radius: 5px;
            }
        `);

    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (onAttackPage()) return log("Won't run on attack page");
    if (checkCloudFlare()) return log("Not running while ClouFlare is");
    if (travelling()) return log("Can't bust while travelling!");

    //validateApiKey();
    versionCheck();

    addStyles();

    callOnHashChange(installChatBuster);
    callOnContentLoaded(installChatBuster);

    installPushStateHandler(pushStateChanged);


})();
