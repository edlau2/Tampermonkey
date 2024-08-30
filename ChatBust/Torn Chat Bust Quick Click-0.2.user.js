// ==UserScript==
// @name         Torn Chat Bust Quick Click
// @namespace    http://tampermonkey.net/
// @version      0.2
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
    const TEST_USER_ID = "1875509";

    // ======================= Quick Chat Bust installer ===================

    //
    // When the chat box changes,the whole list is rebuilt - every inner div (the chat
    // messages) are removed and re-added. So each needs to be re-attached to the event
    // listener.
    //
    var facChatRoot;
    var facChatTarget;
    function chatObserverCB(mutations, observer) {
        //log("chatObserverCB"); //,  mutations);
        let filtered = mutations.filter((mutation) => mutation.addedNodes.length > 0);
        let modified = 0;

        for (let added of filtered) {
            let element = added.addedNodes[0];

            let target = $(element).find("[class*='chat-box-message__box_']")[0];
            let hrefElem = $(target).children(":first")[0];
            let href = $(hrefElem).attr('href');
            let id = href ? idFromURL(href) : undefined;


            $(hrefElem).css("color", "limegreen"); //"var(--home-battle-stats-100000-more-color)");

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
        log("handleChatClick: ", e);
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

    function installChatBuster() {
        let nameList = $("#chatRoot").find("[class*='chat-box-message__box_']");
        log("Chat list: ", $(nameList));

        let chatBoxNodes =  $("#chatRoot").find("[class*='chat-box-header__'] > button > p");
        log("Nodes: ", chatBoxNodes);
        facChatRoot = $("#chatRoot").find("[class*='chat-box-header__'] > button > p")
                       .filter(function( index ) { return $(this).text().indexOf("Faction") > -1;});
        log("facChatRoot: ", $(facChatRoot));

        // find jquery to do this or make my own...
        let facChatTarget = //$(facChatRoot).closest('div').filter(function(idx){$(this).attr('role').indexOf('button') > -1;});
            $(facChatRoot).parent().parent().next().children(":first");
        log("parent: ", $(facChatTarget));

        //debugger;

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
            let href = "/profiles.php?XID=2652249";    // Test!!
            log("Jailbreak! Going to bust out ", xid);

            // #mainContainer > div.content-wrapper.summer > div.userlist-wrapper > ul > li:nth-child(33) > a.user.name
            log("query: ", $("li > a.user.name"));

            // Test ID !
            if (TEST_USER_ID && TEST_USER_ID.length)
                xid = TEST_USER_ID;

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
            } else {
                alert("XID not found!");
            }

            scrollTo(parent);
        }

        installChatBuster();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (onAttackPage()) return log("Won't run on attack page");
    if (checkCloudFlare()) return log("Not running while ClouFlare is");

    //validateApiKey();
    versionCheck();

    // If on the jail page and we got here from a right-click,
    // will have an "?XID=<...> appended
    if (isJailPage()) {
        let params = new URL(document.location.toString()).searchParams;
        let xid = params.get("XID");
        if (xid)
            return callOnContentComplete(doJailBust);
    }

    callOnContentLoaded(installChatBuster);


})();