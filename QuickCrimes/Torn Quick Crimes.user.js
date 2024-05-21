// ==UserScript==
// @name         Torn Quick Crimes
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add links under Crimes on the sidebar
// @author       xedx [2100735]
// @match        https://www.torn.com/*
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
    'use strict';

    // Can comment out any of the crimes in this list to prevent from displaying in the dropdown
    const crimeULs = [
         "searchforcash",
         "bootlegging",
         "graffiti",
         "shoplifting",
         "pickpocketing",
         "cardskimming",
         "burglary",
         "hustling",
         "disposal",
         "cracking",
         "forgery"
     ];

     const crimeNodeName = "#nav-crimes";
     let cs_caretState = 'fa-caret-down';
     var custLinkClassNames = {};

     GM_addStyle(".xedx-caret {" +
                "padding-top:5px;" +
                "padding-bottom:5px;" +
                "padding-left:20px;" +
                "padding-right:10px;" +
                "}");

    const crimeURLRoot = "https://www.torn.com/loader.php?sid=crimes#/";

    function handlePageLoad() {
        // See if the Crimes sidebar is here...
        // Might want to retry a few times if we loaded too early...
        let crimeBar = $(crimeNodeName);
        log("crimeBar: ", crimeBar);

        installCollapsibleCaret();
        initCustLinkClassNames();
        insertCrimeNodes();
    }

    function initCustLinkClassNames() {
        if($('#nav-crimes').length){
            custLinkClassNames.link_class = $('#nav-crimes').attr('class').split(" ")[0];
            custLinkClassNames.row_class  = $('#nav-crimes > div:first').attr('class');
            custLinkClassNames.a_class    = $('#nav-crimes a').attr('class');
            custLinkClassNames.icon_class = $('#nav-crimes a span').attr('class');
            custLinkClassNames.icon_class = $('#nav-crimes a span').attr('class');
            custLinkClassNames.link_name_class = $('#nav-crimes a span').eq(1).attr('class');
        }

        debug('[initCustLinkClassNames] custLinkClassNames: ', custLinkClassNames);
    }

    function insertCrimeNodes() {
        for (let i=crimeULs.length; i>0; i--) {
            let crime = crimeULs[i-1];
            let node = buildCustLink(crime);
            let root = document.querySelector("#nav-crimes");

            debug("cust node: ", node);
            debug("root: ", root);

            $(node).insertAfter(root);
        }
    }

    function capsA(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    function buildCustLink(crime) {
        let elemState = "none";
        if (cs_caretState == 'fa-caret-down') elemState = "block";

        let outerDiv = '<div class="' + custLinkClassNames.link_class + '" style="display: ' + elemState + '" id="xqc-' + crime + '"><div class="' +
            custLinkClassNames.row_class  + '">';
        let aData = '<a href="' + crimeURLRoot + crime + '" class="' + custLinkClassNames.a_class + '">'; // '" i-data="i_0_1120_172_23">' +
        let span2 = '<span class="' + custLinkClassNames.link_name_class + '">&nbsp;&nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp;' + capsA(crime) + '</span>';
        let endDiv = '</a></div></div>';

        return outerDiv + aData + span2 + endDiv;
    }

    function installCollapsibleCaret() {
        log("installCollapsibleCaret");

        const caretNode = `<span style="float:right;"><i id="xedx-crime-collapse" class="icon fas fa-caret-down xedx-caret"></i></span>`;
        cs_caretState = GM_getValue('cs_lastState', cs_caretState);
        if (!document.querySelector("#sidebarroot")) return "'#sidebarroot' not found, try again later!";
        if (document.getElementById('xedx-crime-collapse')) document.getElementById('xedx-crime-collapse').remove();

        let crimeNode = document.querySelector(crimeNodeName);
        if (!crimeNode) return crimeNodeName + " not found, try again later!";

        log("Adding caret to ", crimeNode);

        // Set parents to 'flex', allow divs to be side-by-side
        document.querySelector(crimeNodeName).setAttribute('style', 'display:block;');
        document.querySelector("#nav-crimes > div > a").setAttribute('style', 'width:auto;height:23px;float:left;');

        // Add the caret and handler.
        let target = document.querySelector("#nav-crimes > div");
        if (!target) return "'#nav-crimes > div' not found, try again later!";
        $(target).append(caretNode);
        document.getElementById("xedx-crime-collapse").addEventListener('click', function (event) {
            handleCaretClick(event)}, { passive: false });

        // Little trick here - set current state to opposite of the saved state.
        // So calling the handler tricks it to set the *other* way, which is how
        // we want it to start up.
        cs_caretState = (cs_caretState == 'fa-caret-down') ? 'fa-caret-right' : 'fa-caret-down';
        debug("Last caret state: ", GM_getValue('cs_lastState', cs_caretState));
        handleCaretClick();
    }

    function handleCaretClick(e) {
        let targetNode = document.querySelector("#xedx-crime-collapse");
        let elemState = 'block;';

        if (cs_caretState == 'fa-caret-down') {
            targetNode.classList.remove("fa-caret-down");
            targetNode.classList.add("fa-caret-right");
            cs_caretState = 'fa-caret-right';
            elemState = 'none;';
        } else {
            targetNode.classList.remove("fa-caret-right");
            targetNode.classList.add("fa-caret-down");
            cs_caretState = 'fa-caret-down';
        }

        GM_setValue('cs_lastState', cs_caretState);
        $("[id^=xqc-]").attr("style", "display: " + elemState);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    versionCheck();

    callOnContentLoaded(handlePageLoad);

})();