// ==UserScript==
// @name         Torn Travel Icons
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
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

    debugLoggingEnabled = false;
    var rootId = "nav-traveling"; // or nav-abroad
    var rootHeight = '23px';
    var custLinkClassNames = {};

    var cs_caretState = 'fa-caret-down';
    const logLink = {enabled:true, cust: false, desc : "Log", link: "page.php?sid=log", cat: "Travelling"};
    const pcLink = {enabled:true, cust: false, desc : "Laptop", link: "pc.php", cat: "Travelling"};
    const statsLink = {enabled:true, cust: false, desc : "Personal Stats", link: "personalstats.php", cat: "Travelling"};

    const linkTable = [logLink, pcLink, statsLink];

    function cs_handleClick(e, optParam) {
        debug('[custLinks - cs_handleClick] state = ' + cs_caretState);

        let rootNodeName = rootId;
        if (e && e.data && e.data.from)
            rootNodeName = e.data.from;

        let nodeId = rootNodeName + "-collapse";
        let nodeSel = "#" + nodeId;
        let targetNode = document.querySelector(nodeSel); // e.target

        if (!targetNode) {
            debug("[custLinks] target not found: ", nodeSel);
            return;
        }

        debug("[custLinks - cs_handleClick] optParam: ", optParam);
        debug("[custLinks - cs_handleClick] rootNodeName: ", rootNodeName);
        debug("[custLinks - cs_handleClick] nodeId: ", nodeId);
        debug("[custLinks - cs_handleClick] nodeSel: ", nodeSel);
        debug("[custLinks - cs_handleClick] targetNode: ", targetNode);
        if (e)
            debug("[custLinks - cs_handleClick] e.target: ", e.target);

        let elemState = 'block;';
        let newH = "23px";
        if (cs_caretState == 'fa-caret-down') {
            targetNode.classList.remove("fa-caret-down");
            targetNode.classList.add("fa-caret-right");
            cs_caretState = 'fa-caret-right';
            elemState = 'none;';
            newH = "0px";
        } else {
            targetNode.classList.remove("fa-caret-right");
            targetNode.classList.add("fa-caret-down");
            cs_caretState = 'fa-caret-down';
            newH = "23px";
        }

        GM_setValue(rootNodeName + 'cs_lastState', cs_caretState);

        let partialID = rootNodeName + "-custlink-";
        debug("[custLinks - cs_handleClick] partial ID: ", partialID);
        debug("ID: ", "[id^=" + rootNodeName + "-custlink-]");
        debug("New style: ", ("display: " + elemState));

        /*
        let elems = $("[id^=" + rootNodeName + "-custlink-]");
        debug("elems: ", elems, " newH: ", newH, " state: ", elemState);
        for (let idx=0; idx<elems.length; idx++) {
            let node = elems[idx];
            logt("anim start, newH: ", newH);
            if (newH == '23px') $(node).attr("style", "display: " + elemState);
            $(node).animate({height: newH}, 1500, function() {
                logt("anim end");
                $(node).attr("style", "display: " + elemState);
            });
        }
        */

        $("[id^=" + rootNodeName + "-custlink-]").attr("style", "display: " + elemState);
    }

    function initCustLinkClassNames() {
        if ($(`#${rootId}`).length){
            custLinkClassNames.link_class = $(`#${rootId}`).attr('class').split(" ")[0];
            custLinkClassNames.row_class  = $(`#${rootId} > div:first`).attr('class');
            custLinkClassNames.a_class    = $(`#${rootId} a`).attr('class');
            custLinkClassNames.icon_class = $(`#${rootId} a span`).attr('class');
            custLinkClassNames.icon_class = $(`#${rootId} a span`).attr('class');
            custLinkClassNames.link_name_class = $(`#${rootId} a span`).eq(1).attr('class');
        }
        debug('[initCustLinkClassNames] custLinkClassNames: ', custLinkClassNames);
    }

    function buildCustLink(data, index) {
        debug("[buildCustLink] data: ", data);
        debug("[buildCustLink] rootId: ", rootId);

        let fullLink = (data.link.indexOf('www.torn.com') > -1) ? data.link : "https://www.torn.com/" + data.link;
        let custLinkId = rootId + "-custlink-" + index;

        // Don't add twice!
        let sel = "#" + custLinkId;
        if ($(sel).length > 0) return;

        rootHeight = $(`#${rootId}`).css("height");
        debug("rootHeight: ", rootHeight);
        let outerDiv = '<div class="' + custLinkClassNames.link_class +
            '" style="display: block;" id="' + custLinkId + '"><div class="' +
            custLinkClassNames.row_class  + '" style="height: ' + rootHeight + ';">';

        const linkIndent = '">&nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;';
        let aData = '<a href="' + fullLink + '" class="' + custLinkClassNames.a_class + '">'; // '" i-data="i_0_1120_172_23">' +
        let span2 = '<span class="' + custLinkClassNames.link_name_class + linkIndent + data.desc + '</span>';
        let endDiv = '</a></div></div>';

        return outerDiv + aData + span2 + endDiv;
    }

    function installCollapsibleCaret(nodeName) {
        if (!nodeName) nodeName = rootId;
        let selName = "#" + nodeName;
        let nodeId = nodeName + "-collapse";

        if (document.querySelector("#" + nodeId)) {
            log("collapse node exists, not adding again!");
            return;
        }

        debug("[custLinks - installCollapsibleCaret] nodeName: ", nodeName, " ID: ", nodeId, " sel: ", selName);

        const caretNode = `<span style="float:right;"><i id="` + nodeId + `" class="icon fas fa-caret-down xedx-caret"></i></span>`;
        cs_caretState = GM_getValue(nodeName + 'cs_lastState', cs_caretState);
        if (!document.querySelector("#sidebarroot")) return "'#sidebarroot' not found, try again later!";
        if (document.getElementById('xedx-collapse')) document.getElementById('xedx-collapse').remove();
        if (!document.querySelector(selName)) return selName + "' not found, try again later!";

        // Set parents to 'flex', allow divs to be side-by-side
        document.querySelector(selName).setAttribute('style', 'display:block;');
        document.querySelector(selName + " > div > a").setAttribute('style', 'width:auto;height:23px;float:left;');

        // Add the caret and handler.
        let target = document.querySelector(selName + " > div");
        if (!target) return selName + " > div' not found, try again later!";
        $(target).append(caretNode);

        let handlerSel = "#" + nodeId;
        debug("custLinks - add handler to ", handlerSel);

        $(handlerSel).on('click', {from: nodeName}, cs_handleClick);
    }

    function installLinks() {
        initCustLinkClassNames();
        linkTable.forEach((data, index) => {
            if (data.enabled) {
                debug('Adding node: ', data);
                let node = buildCustLink(data, index);
                if (node) $(`#${rootId}`).after(node);
            }
        });
    }

    function handlePageLoad() {
        let initialState = "down";

        GM_addStyle(".xedx-caret {" +
                "padding-top:5px;" +
                "padding-bottom:5px;" +
                "padding-left:20px;" +
                "padding-right:10px;" +
                "}");

        if (travelling())
            rootId = "nav-traveling";
        else if (abroad())
            rootId = "nav-abroad";
        else {
            debugger;  // OK if came from hash change handler?
            return;
        }
        if ($(`#${rootId}`).length == 0) {
            debugger;
            console.error("Travel Icons ERROR: root node not found! ", rootId);
            return;
        }

        installCollapsibleCaret(rootId);
        installLinks();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (!awayFromHome()) return log("Only runs when travelling");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    //validateApiKey();
    versionCheck();

    callOnHashChange(handlePageLoad);
    installPushStateHandler(handlePageLoad);

    callOnContentLoaded(handlePageLoad);

})();