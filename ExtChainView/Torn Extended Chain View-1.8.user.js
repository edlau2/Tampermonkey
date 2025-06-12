// ==UserScript==
// @name         Torn Extended Chain View
// @namespace    http://tampermonkey.net/
// @version      1.8
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
    const maxAgeMin = GM_getValue("maxAgeMin", 0);                // Will be removed if fight > this many minutes ago. 0 disables
    const absMax1hr = GM_getValue("absMax1hr", false);            // Never save attacks at or over an hour ago
    const initialState = GM_getValue("initialState", "closed");   // open/closed
    var   saveInitialVals = GM_getValue("saveInitialVals", true); // Write these keys to storage

    var lastVer = GM_getValue("lastVer", 0);                      // Version check: on update, save any new options
    var thisVer = GM_info.script.version;
    if (thisVer != lastVer) saveInitialVals = true;

    logScriptStart();

    debug("This ver: ", thisVer, " last: ", lastVer, " saveInitialVals: ", saveInitialVals);

    if (saveInitialVals == true) {
        GM_setValue("debugLoggingEnabled", debugLoggingEnabled);
        GM_setValue("maxExtLength", maxExtLength);
        GM_setValue("maxAgeMin", maxAgeMin);
        GM_setValue("initialState", initialState);
        GM_setValue("absMax1hr", absMax1hr);
        GM_setValue("lastVer", thisVer);
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

    // 'optColor' used for development/debugging
    var oldestTime;
    function removeListElement(li, optColor) {
        let tm = $(li).find(".time");
        debug("[removeListElement] li: ", $(li), $(tm).text());
        if (optColor)
            $(li).css("border", `1px solid ${optColor}`);
        else {
            $(li).remove();
        }
    }

    function clearList(optColor) {
        let list = $('#ext-chain-view li');
        debug("[clearList] list: ", $(list));
        for (let idx=0; idx<$(list).length; idx++) {
            removeListElement($(list)[idx], optColor);
        }
    }

    function addUpdateStartTime(liNode) {
        const mult = { "s": 1, "m": 60, "h": 3600 };

        let disp = $(liNode).find(".time").text();
        if (!disp) return 0;
        let parts = disp.split(' ');

        // Display is this many seconds at 'now' seconds. So, at any
        // future 'now' seconds, will be (futureSecs - nowSecs) + elapsedSecs
        let s = parseInt(parts[0]);
        //let m = mult[parts[1]];
        let m = (parts[1] == 's') ? 1 : (parts[1] == 'm') ? 60 : (parts[1] == 'h') ? 3600 : 0;
        let secsElapsed = Number(s) * Number(m);
        let secsNow = Math.floor(new Date().getTime() / 1000);

        log("[addUpdateStartTime] parts: ", parts, " s: ", s, " m: ", m, " elapsed: ", secsElapsed);

        // Save
        $(liNode).attr("data-se", secsElapsed);
        $(liNode).attr("data-sn", secsNow);

        if (!$(liNode).attr("data-uuid"))
            $(liNode).attr("data-uuid", getRandomIntEx(100000000, 999999999));
    }


    /*
    // Instead of this - have a single second timer, update all at once, so they stay in sync.
    // Especially a prob with the minute timers.
    //
    // If saving the start time on the LI doesn't work, just make array when added with name-> time???
    function addTimeHandler(timeNode) {
        if (!$(timeNode).hasClass("time")) return;

        let root = $(timeNode).closest("li");
        let rootAttr = $(root).attr("data-tid");
        log("[addTimeHandler]: ", $(timeNode).attr("data-tid"), $(timeNode));
        log("root: ", $(root), " attr: ", rootAttr);
        let tm = $(timeNode).text();
        if (tm) {
            let root = $(timeNode).closest("li");
            let parts = tm.split(' ');
            $(root).attr("data-type", parts[1]);
            $(timeNode).attr("data-t0", parts[0]);
            $(root).attr("data-tm", tm);
            if (!$(timeNode).attr("data-tid")) {
                if (!rootAttr)
                    $(timeNode).attr("data-tid", (new Date().getTime() / 1000));
                else
                    $(timeNode).attr("data-tid", rootAttr);
            }
            $(timeNode).attr("data-now", parts[0]);
        }
        log("[addTimeHandler], attr: ", $(timeNode).attr("data-tid"));
    }
    */

    function updateOldestTime() {
        let lastOT = oldestTime;
        let tm = $(".chain-attacks-list.recent-attacks:not(#ext-chain-view) li:last-child > .time").text();
        if (!tm || !tm.length) { oldestTime = 0; return;}

        let parts = tm.split(' ');
        switch (parts[1]) {
            case 's': oldestTime = parts[0]; break;
            case 'm': oldestTime = +parts[0] * 60; break;
            case 'h': oldestTime = +parts[0] * 3600; break;
            default: oldestTime = 0; break;
        }

        if (lastOT != oldestTime)
            log("Oldest time: ", oldestTime, " secs, or ", tm, " Previous: ", lastOT, " secs");
    }

    function nodeText(liNode) { return $(liNode).find('.time').text(); }
    function getNodeUnit(liNode) {return nodeText(liNode) ? nodeText(liNode).split(' ')[1] : null;}
    function getNodeTime(liNode) {return nodeText(liNode) ? nodeText(liNode).split(' ')[0] : null;}

    var secsElapsed = 0;
    var updateTimerId;
    function updateItemTimes() {
        //updateOldestTime();
        //secsElapsed++;

        let secsNow = Math.floor(new Date().getTime() / 1000);
        let list = $('#ext-chain-view > li.ext-li');
        for (let idx=0; idx<$(list).length; idx++) {
            let liNode = $(list)[idx];
            let timeNode = $(liNode).find('.time');
            let textOut = $(timeNode).text();
            let savedText = textOut;
            let secsElapsed = $(liNode).attr("data-se");
            let secsThen = $(liNode).attr("data-sn");

            // (futureSecs - nowSecs) + elapsedSecs
            let secsDiff = Number(secsNow) - Number(secsThen);
            let secsDisplay = Number(secsDiff) + Number(secsElapsed);

            // Convert to min/hr if needed...
            if (secsDisplay > 3599)
                textOut = Math.floor(Number(secsDisplay) / 3600) + ' h';
            else if (secsDisplay > 59) {
                let num = Math.floor(Number(secsDisplay) / 60);
                textOut = num + ' m';
                let ckNode = (idx > 0) ? $(liNode).prev() : null;
                if (ckNode && getNodeUnit(ckNode) == 'm' && Number(num) < Number(getNodeTime(ckNode))) {
                    textOut = nodeText(ckNode);
                    $(ckNode).find('.time').css("color", "##cc0022");
                    secsElapsed = number($(ckNode).attr("data-se")) + 3;
                    secsThen = $(ckNode).attr("data-sn");
                    $(liNode).attr("data-se", secsElapsed);
                    $(liNode).attr("data-sn", secsThen);
                }
            } else
                textOut = secsDisplay + ' s';

            log("Updated ", $(liNode), " from ", savedText, " to ", textOut);
            log("saved: ", savedText, " out: ", textOut, " secsElapsed: ", secsElapsed, " secsThen: ", secsThen,
                " secsNow: ", secsNow, " secsDiff: ", secsDiff, " secsDisplay: ", secsDisplay);

            if (textOut == savedText) return log("No change");

            $(timeNode).text(textOut);
            log("Set new time: ", textOut);
        }
    }

    function installObserver(targetNode) {
        const nodeConfig = { childList: true, subtree: true, characterData: true };
        const listConfig = { childList: true };
        var savedTarget = targetNode;
        var listObserver, nodeObserver;
        if (listObserver) listObserver.disconnect();
        if (nodeObserver) nodeObserver.disconnect();
        listObserver = null; nodeObserver = null;

        function reconnectLiNodes() {
            let liList = $(savedTarget).find('li');
            for (let idx=0; idx<$(liList).length; idx++) {
                let liNode = $(liList)[idx];
                nodeObserver.observe(liNode, nodeConfig);
            }
        }

        // This observer watches for changes in the list items
        nodeObserver = new MutationObserver((mutationsList) => {
            nodeObserver.disconnect();
            for (const mutation of mutationsList) {
                if (/*mutation.type === 'childList' ||*/ mutation.type === 'characterData') {
                    let node = mutation.target;
                    let liNode = $(node).closest('li');
                    log("Text content changed! ", $(node), $(liNode));
                    addUpdateStartTime(liNode);
                    log("Updated node attrs: ", $(liNode).attr("data-se"), $(liNode).attr("data-sn"));
                }
            }
            reconnectLiNodes();
        });

        // Observe all existing list elements
        let liList = $(targetNode).find('li');
        log("Initial list: ", $(liList));
        for (let idx=0; idx<$(liList).length; idx++) {
            let liNode = $(liList)[idx];
            addUpdateStartTime(liNode);
            nodeObserver.observe(liNode, nodeConfig);
        }

        // This observer watches the UL of recent attacks for additions/removals
        listObserver = new MutationObserver((mutationsList) => {
          for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
              mutation.removedNodes.forEach(node => {
                  if (node.nodeName === 'LI') {
                      nodeObserver.observe(node, { attributes: true, attributeFilter: [] });
                      let newNode = $(node).clone(true, true);
                      $(newNode).addClass("ext-li");
                      $('#ext-chain-view').prepend(newNode);

                      log("Add new node, len: ", $('#ext-chain-view > li').length, " max: ", maxExtLength);
                      if ($('#ext-chain-view > li').length > maxExtLength) {
                          let li = $('#ext-chain-view li:last-child');
                          removeListElement(li);
                      }
                  }
              });

              mutation.addedNodes.forEach(node => {
                  log("Node added! ", $(node));
                  if (node.nodeName === 'LI') {
                      addUpdateStartTime(node);
                      nodeObserver.observe(node, nodeConfig);
                      log("Added node attrs: ", $(node).attr("data-se"), $(node).attr("data-sn"));
                  }
              });
            }
          }
        });

        listObserver.observe(targetNode, listConfig);
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

        if (!updateTimerId)
            updateTimerId = setInterval(updateItemTimes, 1000);
    }

    function handlePageLoad(retries=0) {
        log("[handlePageLoad]");
        if (location.href.indexOf("war/chain") < 0) return log("Wrong page: ", location.href);
        installExtendedUI();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    //logScriptStart();

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
                /*align-content: center;*/
                padding: 5px 10px 0px 20px;
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