// ==UserScript==
// @name         Torn Crime Locker
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=crimes*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.43.js
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

    // ============== Monitor page transitions =====================
    function pushStateChanged(e) {
        log("pushStateChanged: ", e);
        log("hash: ", window.location.hash);
        setTimeout(handlePageLoad, 250);
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
    // ============== End Monitor page transitions =====================

    const chkbox = `<span><span class="xlock fake-cbx"></span>`;
    var crimesList;

    function processCrimes() {
        for (let idx=0; idx < $(crimesList).length; idx++) {
            let crime = $(crimesList)[idx];
            let props = getCrimeProps(crime);
            log("useName: ", props.useName, " label: ", props.label, " desc: ", props.desc, " href: ", props.href);

            let titleSpan = $(crime).find("[class^='crimeTitle_']");
            log("title span: ", $(titleSpan));

            let el = $(chkbox); //.find('input');
            $(titleSpan).before(el);

            $(el).attr("index", idx);
            $(el).attr("desc", props.useName);
            $(el).attr("href", props.href);

            let title = $(el).next();
            let xlock = $(el).find(".xlock");

            let checked = GM_getValue(props.useName, 'no');
            $(el).prop('checked', (checked == 'yes'));
            $(el).attr("state", checked);
            if (checked == 'yes') {
                $(xlock).addClass("xck");
                $(title).addClass("xcob");
            }
            $(el).on('click', handleCheckbox);

            let ID = "xcdiv" + idx;
            let crimeWrap = `<div id="` + ID +`" class="crime-wrap"></div>`;

            $(crime).wrap(crimeWrap);
            let wrapSel = "#" + ID;
            let statusSel = "#crimehub-statuses-" + (+idx + 1);

            let image = $(wrapSel).find("[class*='image_']");
            if (checked == 'yes') {
                $(image).addClass("xop");
                $(statusSel).addClass("xop");
            }

            $(wrapSel).on('click', handleWrapperClick);
        }
    }

    function handleWrapperClick(e) {
        let el = e.currentTarget;
        let cbx = $(el).find(".fake-cbx");
        let parent = $(cbx).parent();
        let checked = $(parent).attr("state");
        let href = $(parent).attr("href");
        if (checked == 'no') {
            return;
        }

        return false;
    }

    var inCbHandler = false;
    function resetCBFlag() {inCbHandler = false;}

    function handleCheckbox(e) {
        // Suppress dup clicks, not sure
        // why I get them...
        if (inCbHandler) return false;
        inCbHandler = true;

        let el = e.currentTarget;
        let index = $(el).attr("index");
        let wsel = "#xcdiv" + index;
        let statusSel = "#crimehub-statuses-" + (parseInt(index) + 1);
        let wrapper = $(wsel);
        let image = $(wrapper).find("[class*='image_']");
        let title = $(el).next();
        let checked = $(el).attr("state");
        let key = $(el).attr("desc");

        if ($(cb).hasClass("xck") || checked == 'yes') {    // checked to unchecked
            $(cb).removeClass("xck");
            $(image).removeClass("xop");
            $(title).removeClass("xcob");
            $(statusSel).removeClass("xop");
            $(el).prop("checked", false);
            $(el).attr("state", 'no');
            GM_setValue(key, 'no');
        } else {                                   // unchecked to checked
            $(cb).addClass("xck");
            $(image).addClass("xop");
            $(title).addClass("xcob");
            $(statusSel).addClass("xop");
            $(el).prop("checked", true);
            $(el).attr("state", 'yes');
            GM_setValue(key, 'yes');
        }

        setTimeout(resetCBFlag, 250);

        e.preventDefault();
        return false;
    }

    function getCrimeProps(crime) {
        let props = {};
        props.label = $(crime).attr("aria-label");
        props.desc = $(crime).attr("aria-describedby");
        props.href = $(crime).attr("href");
        if (props.href) {
            let parts = props.href.split('/');
            props.useName = parts[1];
        }

        return props;
    }

    var retries = 0;
    function handlePageLoad() {
        let hash = location.hash;
        let hashLen = hash ? hash.length : 0;
        debug("handlePageLoad, hash: ", hash, " len: ", hashLen);

        // If not crime hub, and locked, confirm or go back
        // Can get locked state from storage key
        if (hashLen > 2) {
            let parts = hash.split('/');
            let key = parts[1];
            let checked = GM_getValue(key, 'no');
            if (checked == 'yes') {
                if (confirm("You have locked this crime, go anyways?"))
                    return;
                else
                    location.href = "https://www.torn.com/loader.php?sid=crimes";
            }
            return;
        }

        crimesList = $(".crimes-hub-crime");
        if ($(crimesList).length == 0) {
            if (retries++ > 10) {
                return log("Exceeded max retries, root node not found");
            } else {
                setTimeout(handlePageLoad, 250);
            }
        }

        processCrimes();
    }

    function addStyles() {
        GM_addStyle(`
            .xlock {
                margin-top: 26px;
                left: 0;
                position: absolute !important;
                margin-left: 6px;
                cursor: pointer;
            }
            .fake-cbx {
                width: 13px;
                height: 13px;
                border: 1px solid black;
            }
            .xck {
                background-color: red;
            }
            .xop {
                opacity: .2 !important;
            }
            .xcob {
                color: var(--crimes-locked-color) !important;
            }
            .crime-wrap {
                overflow: auto;
                display: flex;
                width: fit-content;
                height: auto;
                position: relative;
                z-index: 11;
            }
        `);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    addStyles();

    callOnContentLoaded(handlePageLoad);
    callOnHashChange(handlePageLoad);

    history.pushState = bindEventListener("pushState");
    window.addEventListener("pushState", function (e) {
        pushStateChanged(e);  // Could directly call handlePageLoad() instead
    });

})();