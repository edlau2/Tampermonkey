// ==UserScript==
// @name         Torn Extended Chain View
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  This script lets the chain view on the fac page grow beyond the past 10 attacks.
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php?step=your*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @exclude      https://www.torn.com/recaptcha.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
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

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);                // Extra debug logging
    const maxExtLength = GM_getValue("maxExtLength", 5);          // Keep this many extras in the list
    const maxAgeMin = GM_getValue("maxAgeMin", 0);                // Will be removed if fight > this many minutes.
                                                                  // 0 disables, but will be removed at 1 hr regardless
    const initialState = GM_getValue("initialState", "closed");   // open/closed
    const saveInitialVals = GM_getValue("saveInitialVals", true); // Write these keys to storage

    if (saveInitialVals == true) {
        GM_setValue("debugLoggingEnabled", debugLoggingEnabled);
        GM_setValue("maxExtLength", maxExtLength);
        GM_setValue("maxAgeMin", maxAgeMin);
        GM_setValue("initialState", initialState);
        GM_setValue("saveInitialVals", false);
    }

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function removeListElement(li, optColor) {
        log("[removeListElement] li: ", $(li));
        if (optColor)
            $(li).css("border", `1px solid ${optColor}`);
        else {
            let id = $(li).find(".time").attr("data-tid");
            clearInterval(id);
            $(li).remove();
        }
    }

    function clearList(optColor) {
        let list = $('#ext-chain-view li');
        log("[clearList] list: ", $(list));
        for (let idx=0; idx<$(list).length; idx++) {
            removeListElement($(list)[idx], optColor);
        }
    }

    function handleHrUpdates(node) {
        if (!$(node).length) return;
        let tm = $(node).text();
        if (tm) {
            let hr = parseInt(tm.split(' ')[0]);
            let min = +hr * 60;
            if ((+maxAgeMin > 0 && +min > +maxAgeMin)) {
                let li = $(node).closest("li");
                removeListElement(li, "yellow");
            } else {
                $(node).text(((+hr + 1) + ' h'));
            }
        }
    }

    function handleMinUpdates(node) {
        if (!$(node).length) return;
        let tm = $(node).text();
        if (tm) {
            let min = parseInt(tm.split(' ')[0]);
            if ((+maxAgeMin > 0 && +min > +maxAgeMin) || +min == 59) {
                let li = $(node).closest("li");
                removeListElement(li, "yellow");
            } else {
                $(node).text(((+min + 1) + ' m'));
            }
        }
    }

    function handleSecUpdates(node) {
        if (!$(node).length) return;
        let tm = $(node).text();
        if (tm) {
            let secs = parseInt(tm.split(' ')[0]);
            if (secs < 59 && secs >= 0)
                $(node).text(((+secs + 1) + ' s'));
            else if (secs == 59) {
                $(node).text('1 m');
                let id = $(node).attr("data-tid");
                clearInterval(id);
                id = setInterval(handleMinUpdates, 60000, $(node));
                $(node).attr("data-tid", id);
            }
        }
    }

    function addTimeHandler(timeNode) {
        log("[addTimeHandler] ", $(timeNode));
        if (!$(timeNode).hasClass("time")) return;
        let tm = $(timeNode).text();
        if (tm) {
            let timerId;
            if (tm.split(' ')[1] == 's')
                timerId = setInterval(handleSecUpdates, 1000, $(timeNode));
            if (tm.split(' ')[1] == 'm')
                timerId = setInterval(handleMinUpdates, 60000, $(timeNode));
            if (tm.split(' ')[1] == 'h')
                timerId = setInterval(handleHrUpdates, 3600000, $(timeNode));
            $(timeNode).attr("data-tid", timerId);
        }

    }

    function installObserver(targetNode) {
        var observer;
        if (observer) observer.disconnect();
        observer = null;
        observer = new MutationObserver((mutationsList) => {
          for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
              mutation.removedNodes.forEach(node => {
                  if (node.nodeName === 'LI') {
                      let listLen = $(".chain-attacks-list.recent-attacks > li:not(.ext-li)").length;
                      debug("Remove LI, len = ", listLen);
                      if (listLen == 0) {
                          log("Clear extended LIs now?");
                          clearList();
                      } else {
                          let newNode = $(node).clone(true, true);
                          $(newNode).addClass("ext-li");
                          $('#ext-chain-view').prepend(newNode);
                          addTimeHandler($('#ext-chain-view li').first().find('.time'));
                          if ($('#ext-chain-view > li').length > maxExtLength) {
                              let li = $('#ext-chain-view li:last-child');
                              removeListElement(li);
                          }
                      }
                  }
              });
            }
          }
        });

        const config = { childList: true };
        observer.observe(targetNode, config);
    }

    function getListHdr() {
        let caretState = (initialState == 'closed') ? 'fa-caret-right' : 'fa-caret-down';
        const caretNode = `<span class="caret-wrap" style="float:right;"><i id="ext-hdr-caret" class="icon fas ${caretState}"></i></span>`;
        let hdr = `
            <div id="hdr-extended" class="sortable-box t-blue-cont h">
                 <div class="title main-title title-black active box" role="table" aria-level="5" style="height: 20px;">
                     ${caretNode}
                     <!-- div class="box"><span style="position: absolute;">More...</span></div -->
                 </div>
             </div>
        `;

        return hdr;
    }

    function installExtendedUI(retries=0) {
        let rootUL = $(".chain-attacks-list.recent-attacks");
        if (!$(rootUL).length) {
            if (retries++ < 30) return setTimeout(installExtendedUI, 250, retries);
            return log("[installExtendedUI] timed out");
        }

        if (!$('#ext-chain-view').length) {
            let hideState = (initialState == 'closed') ? 'hdr-none' : 'hdr-blk';
            let rootClone = $(rootUL).clone();
            $(rootClone).attr('id', 'ext-chain-view');
            $(rootClone).addClass(`${hideState}`);
            $(rootClone).empty();
            $(rootUL).after(getListHdr());
            $('#hdr-extended').append($(rootClone));
        } else {
            debug("UI already installed: ", $('#ext-chain-view'));
        }

        $('#ext-chain-view').css("border-top",  "1px solid blue");

        $("#ext-hdr-caret").on('click', function(e) {
            $("#ext-hdr-caret").toggleClass("fa-caret-right fa-caret-down");
            $("#ext-chain-view").toggleClass("hdr-none hdr-blk");
        });

        // quick test...
        /*
        let liList = $(".chain-attacks-list.recent-attacks > li");
        if ($(liList).length > 1) {
            let len = $(liList).length;
            let testLi = $($(liList)[len - 1]).clone();
            $(testLi).addClass("ext-li");
            $('#ext-chain-view').prepend(testLi);
            addTimeHandler($("#ext-chain-view li:first-child").find('.time'));
            testLi = $($(liList)[len - 2]).clone();
            $(testLi).addClass("ext-li");
            $('#ext-chain-view').prepend(testLi);
            addTimeHandler($("#ext-chain-view li:first-child").find('.time'));
        }
        */

        installObserver($(rootUL)[0]);
    }

    function handlePageLoad(retries=0) {
        if (location.href.indexOf("type=1") < 0) return log("Wrong page: ", location.href);
        installExtendedUI();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    versionCheck();
    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);

    function addStyles() {
        GM_addStyle(`
            #ext-hdr-caret {
                height: 20px;
                align-content: center;
                padding-left:20px;
                padding-right:10px;
            }
            .caret-wrap {
                display: flex;
                justify-content: center;
                float: right;
                height: 20px;
            }
            .hdr-blk { display: block; }
            .hdr-none { display: none; }
        `);
    }

})();