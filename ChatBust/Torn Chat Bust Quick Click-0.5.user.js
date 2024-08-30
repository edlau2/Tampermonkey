// ==UserScript==
// @name         Torn Chat Bust Quick Click
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Add right-click to quickly bust fac mates out of jail.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
// @xrequire      file:////Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers-2.45.3.js
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

    //
    // For testing - find someone who will likely be in jail for a while, and putt their
    // ID here. You can test either by right-click anyone in fac chat, or once at the jail
    // page - edit this to a valid ID, and as long as the jail URL ends with "?XID=nnnn"
    // it will use the XID here instead. Leave empty to always use the real ID from chat
    // like this: const TEST_USER_ID = "";
    //
    const TEST_USER_ID = "";

    var menusOnly = GM_getValue("menusOnly", true);
    GM_setValue("menusOnly", menusOnly);

    // ========== Push state change dispatcher =================
    // Put this in general library! (installPushStateChange(fn, optionalWaitTime);

    function pushStateChanged(e) {
        log("pushStateChanged: ", e);
        setTimeout(installChatBuster, 500);
    }

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


    // ======================= Quick Chat Bust installer ===================

    //
    // When the chat box changes,the whole list is rebuilt - every inner div (the chat
    // messages) are removed and re-added. So each needs to be re-attached to the event
    // listener.
    //
    var facChatRoot;
    var facChatTarget;
    function chatObserverCB(mutations, observer) {
        //log("chatObserverCB enabled? ", !menusOnly); //,  mutations);
        if (menusOnly) return;

        let filtered = mutations.filter((mutation) => mutation.addedNodes.length > 0);
        let modified = 0;

        for (let added of filtered) {
            let element = added.addedNodes[0];
            let target = $(element).find("[class*='chat-box-message__box_']")[0];
            let hrefElem = $(target).children(":first")[0];
            let href = $(hrefElem).attr('href');
            let id = href ? idFromURL(href) : undefined;
            $(hrefElem).addClass("xlg"); //css("color", "limegreen"); //"var(--home-battle-stats-100000-more-color)");
            addNodeClickHandler(element, id);

            modified++;
        }
        //log("chatObserverCB modified ", modified, " targets");

    }

    function addNodeClickHandler(node, id) {
        if (id) $(node).attr('XID', id);
        $(node).on('contextmenu', handleChatClick);
    }

    function handleChatClick(e) {
        log("handleChatClick: enabled? ", !menusOnly, " event: ", e);
        if (menusOnly) return;

        e.preventDefault();

        let target = $(e.currentTarget);
        let id = $(target).attr('XID');
        log("target: ", $(target));
        log("user ID: ", id);

        $(target).css("border", "1px solid red");

        if (confirm("Bust 'em loose?")) {
            let jailURL = "https://www.torn.com/jailview.php?XID=" + id;
            openInNewTab(jailURL, false);
        }
        return false;
    }

    function addHandlersToListNodes(root) {
        let targets = $(root).find("[class*='chat-box-message__box_']");
        //log("root: ", $(root));
        //log("Adding initial handlers: ", targets);
        let modified = 0;
        for (let idx=0; idx<$(targets).length; idx++) {
            let target = targets[idx];
            let hrefElem = $(target).children(":first")[0];
            let href = $(hrefElem).attr('href');
            let id = href ? idFromURL(href) : undefined;
            $(hrefElem).addClass("xlg"); //css("color", "limegreen"); //"var(--home-battle-stats-100000-more-color)");
            addNodeClickHandler(target, id);
            modified++;
        }
        //log("Modified ", modified, " elements");
    }

    function facFilter(e) {
        log("'facFilter: ", e);
        log("coords: ", e.clientX, " - ", e.clientY);
        let el = $(e.currentTarget);
        log("el : ", $(el));
        let parent = $(el).parent();
        log("parent: ", $(parent));
        log("pos p: ", $(parent).position());
        log("pos ct: ", $("#xfac-chat-ctx").position());

        $("#xfac-chat-ctx").addClass("x-ctx-pos"); //css("top", e.clientY);

        // Fix this...
        $("#xfac-chat-ctx").css("border-radius", "8px");
    }

    function doMenuClick(e) {
        menusOnly = !menusOnly;
        GM_setValue("menusOnly", menusOnly);
        let btn = e.currentTarget;
        if ($(btn).hasClass("x-on-menu"))
            $(btn).removeClass("x-on-menu");
        else
            $(btn).addClass("x-on-menu");

        if (!menusOnly) {
            let facChatTarget = $(facChatRoot).parent().parent().next().children(":first");
            addHandlersToListNodes($(facChatTarget)[0]);
            log("Adjusted curr menu");
        } else {
         $(".xlg").removeClass("xlg");
        }
    }

    function installChatBuster() {
        if (isJailPage()) {
            let params = new URL(document.location.toString()).searchParams;
            let xid = params.get("XID");
            if (xid)
                return callOnContentComplete(doJailBust);
        }

        let nameList = $("#chatRoot").find("[class*='chat-box-message__box_']");
        //log("Chat list: ", $(nameList));

        let chatBoxNodes =  $("#chatRoot").find("[class*='chat-box-header__'] > button > p");
        log("Nodes: ", chatBoxNodes);
        facChatRoot = $("#chatRoot").find("[class*='chat-box-header__'] > button > p")
                       .filter(function( index ) { return $(this).text().indexOf("Faction") > -1;});
        log("facChatRoot: ", $(facChatRoot));

        // ----------------------
        // Add context menu to top bar.
        // Maybe can disable script?
        log("Adding context menu. Script enabled? ", !menusOnly);
        let topBar = $(facChatRoot).parent().parent().parent().children(":first")[0];;
        //log("top bar: ", $(topBar));
        let destNode = $(topBar).parent();
        installContextMenu(destNode, "xfac-chat-ctx", {filter: facFilter});
        //log("CTX menu: ", $("#xfac-chat-ctx"));

        let testLi = `<li id="xkcd"><a>On/Off</a></li>`;
        $("#xfac-chat-ctx > ul").append(testLi);
        $("#xkcd").on('click', doMenuClick);
        if (!menusOnly)
            $("#xkcd").addClass("x-on-menu");
        // ----------------------

        // find jquery to do this or make my own...
        let facChatTarget = $(facChatRoot).parent().parent().next().children(":first");
        //log("parent: ", $(facChatTarget));

        //debugger;

        // =============
        if (!menusOnly)
            addHandlersToListNodes($($(facChatTarget)[0]).parent());

        log("facChatTargetSelector: $(facChatRoot).parent().parent().next().children(':first')");
        log("facChatTarget: ", $(facChatTarget));
        log("facChatTarget[0]: ", $(facChatTarget)[0]);
        log("Installing observer on ", $(facChatTarget)[0]);

        const chatOpts = {attributes: false, childList: true, characterData: false, subtree: true};
        if ($(facChatTarget).length) {
            let chatObserver = new MutationObserver(chatObserverCB);
            chatObserver.observe($(facChatTarget)[0], chatOpts);
        }
    }

    function scrollTo (elem) {
       $('html,body').animate({
          scrollTop: $(elem).offset().top - $(window).height()/2
       }, 500);
    }

    function doJailBust() {
        let params = new URL(document.location.toString()).searchParams;
        let xid = params.get("XID");

        if (xid) {
            //let href = "/profiles.php?XID=" + xid;
            //let href = "/profiles.php?XID=2652249";    // Test!!
            log("Jailbreak! Going to bust out ", xid);

            // #mainContainer > div.content-wrapper.summer > div.userlist-wrapper > ul > li:nth-child(33) > a.user.name
            log("query: ", $("li > a.user.name"));

            // Test ID !
            if (TEST_USER_ID && TEST_USER_ID.length)
                xid = TEST_USER_ID;

            scrollToXID(xid);
        }

        //installChatBuster();
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

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (onAttackPage()) return log("Won't run on attack page");
    if (checkCloudFlare()) return log("Not running while ClouFlare is");
    if (travelling()) return log("Can't bust while travelling!");

    //validateApiKey();
    versionCheck();

    addContextStyles();

    // Temp for menu on/off
    GM_addStyle(".x-on-menu {background: #ffc926;} .xlg {color: limegreen !important;}");

    // temp context positioniing
    GM_addStyle(".x-ctx-pos {left: 40px !important; top: 50px !important; position: absolute !important;}");

    callOnHashChange(installChatBuster);
    callOnContentLoaded(installChatBuster);

    history.pushState = bindEventListener("pushState");
    window.addEventListener("pushState", function (e) {
        pushStateChanged(e);  // Could directly call installChatBuster() instead
    });


})();