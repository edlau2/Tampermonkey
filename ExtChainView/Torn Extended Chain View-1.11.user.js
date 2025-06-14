// ==UserScript==
// @name         Torn Extended Chain View
// @namespace    http://tampermonkey.net/
// @version      1.11
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

    var useRootClones = false;

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

    function debugCheckNodes() {
        let list = $('#ext-chain-view > li.ext-li');
        for (let idx=0; idx<$(list).length; idx++) {
            let liNode = $(list)[idx];
            let uuid = $(liNode).attr("data-uuid");
            let others = $(`li[data-uuid='${uuid}']`);
            if ($(others).length > 1) {
                log("Error: duplicate nodes detected! ", $(others));
                console.error("List corruption! ", $('#ext-chain-view'));
                debugger;

                return;
            }
        }
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

    function logLiNode(liNode, msg='') {
        log(msg, " node: ", $(liNode),
            '\nuuid: ', $(liNode).attr("data-uuid"),
            ' inst: ', $(liNode).attr("data-inst"),
            ' se: ', $(liNode).attr("data-se"),
            ' sn: ', $(liNode).attr("data-sn"),
            ' st-tm: ', $(liNode).attr("data-st-tm"),
            ' st-tm-ck: ', $(liNode).attr("data-st-tm-ck"));
    }

    var nodeInst = 0;
    function addUpdateStartTime(liNode) {
        const mult = { "s": 1, "m": 60, "h": 3600 };

        if ($(liNode).attr("data-st-tm-ck") == 'true') {
            log("tm-ck is true, already set exact time.");
            return;
        }

        let disp = $(liNode).find(".time").text();
        if (!disp) return 0;
        let parts = disp.split(' ');

        // Display is this many seconds at 'now' seconds. So, at any
        // future 'now' seconds, will be (futureSecs - nowSecs) + elapsedSecs
        let s = parseInt(parts[0]);
        let m = (parts[1] == 's') ? 1 : (parts[1] == 'm') ? 60 : (parts[1] == 'h') ? 3600 : 0;
        let secsElapsed = Number(s) * Number(m);
        let secsNow = Math.floor(new Date().getTime() / 1000);

        log("[addUpdateStartTime] parts: ", parts, " s: ", s, " m: ", m, " elapsed: ", secsElapsed);
        log("ck: ", $(liNode).attr("data-st-tm-ck"), " st-tm: ", $(liNode).attr("data-st-tm"), "s: ", s);

        // Save if the time did, to get one exact timestamp
        if ($(liNode).attr("data-st-tm-ck") == 'false' && $(liNode).attr("data-st-tm") != s) {
            logLiNode(liNode, 'Updating, initial time change. ');
            //log("Updating, initial time change! ", $(liNode), $(liNode).attr("data-uuid"), $(liNode).attr("data-inst"), $(liNode).attr("data-st-tm"));
            $(liNode).attr("data-st-tm", s);         // displayed time
            $(liNode).attr("data-st-tm-ck", 'true');  // Caught at update, so valid
            $(liNode).attr("data-se", secsElapsed);
            $(liNode).attr("data-sn", secsNow);
        } else {
            log("NOT updating, no change! ", $(liNode), $(liNode).attr("data-uuid"), $(liNode).attr("data-inst"), $(liNode).attr("data-st-tm"));
        }

        if (!$(liNode).attr("data-uuid")) { // initial save
            $(liNode).attr("data-uuid", getRandomIntEx(50000000, 999999999));
            $(liNode).attr("data-inst", nodeInst++); //log("set data-inst: ", nodeInst);
            $(liNode).attr("data-se", secsElapsed); //log("set data-se: ", secsElapsed);
            $(liNode).attr("data-sn", secsNow); //log("set data-sn: ", secsNow);
            $(liNode).attr("data-st-tm", s); //log("set data-st-tm: ", s);
            $(liNode).attr("data-st-tm-ck", 'false'); //log("set data-st-tm-ck: ", 'false');

            let at = (new Date().toString().split(' ')[4] + " " + disp);
            $(liNode).attr("data-attach", at);
            logLiNode(liNode, 'ADDING, start time. ');
            //log("ADDING, start time ", $(liNode), $(liNode).attr("data-uuid"), $(liNode).attr("data-inst"), $(liNode).attr("data-st-tm"));
        }

        debugCheckNodes();

    }

    const nodeText = (liNode) => { return $(liNode).find('.time').text(); }
    const getNodeUnit = (liNode) => {return (nodeText(liNode)) ? (nodeText(liNode).split(' ')[1]) : null;}
    const getNodeTime = (liNode) => {return (nodeText(liNode)) ? (nodeText(liNode).split(' ')[0]) : null;}
    const nodeId = (liNode) => { return $(liNode).attr("data-uuid") + " - " + $(liNode).attr("data-inst"); }

    var updateTimerId;
    var secCount = 0;
    var unchanged = 0;
    function updateItemTimes() {
        secCount++;
        let minMark = (secCount % 60 == 0);
        
        const n = (x) => { return +x < 10 ? '0' + x : x; }
        const timeTic = () => { return ('[' + n(+secCount % 60) + ']'); }
        const maxHours = 2;

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

            // Convert to min/hr as needed...
            if (secsDisplay > 3599) {
                let num = Math.floor(Number(secsDisplay) / 3600);
                if (num > maxHours) {
                    removeListElement(liNode);
                    continue;
                }
                textOut = Math.floor(Number(secsDisplay) / 3600) + ' h';
            } else if (secsDisplay > 59) {
                let num = Math.floor(Number(secsDisplay) / 60);
                textOut = num + ' m';
            } else
                textOut = secsDisplay + ' s';

            if (textOut == savedText) {
                unchanged++;
                if (minMark == true) log("count unchanged: ", unchanged, "past mins: ", secCount / 60, " (", secCount, " secs)");
                //log(timeTic(), " ", nodeId(liNode), ": ", savedText, " to ", textOut, ": no change");
                continue;
            }

            log(timeTic(), " Updating ", nodeId(liNode), " from ", savedText, " to ", textOut);
            log(timeTic(), " saved: ", savedText, " out: ", textOut, " secsElapsed: ", secsElapsed, " secsThen: ", secsThen,
                " secsNow: ", secsNow, " secsDiff: ", secsDiff, " secsDisplay: ", secsDisplay);

            $(timeNode).text(textOut);
            log(timeTic(), " Set new time: ", textOut);
        }

        debugCheckNodes();
    }

    function installObserver(targetNode) {
        var nodeCount = 0;
        const nodeConfig = { childList: true, subtree: true, characterData: true, characterDataOldValue: true };
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

        function copyNewNode(node) {
            if ($(node).hasClass("ext-li")) {
                log("ERROR: cloning a clone! ", $(node));
                debugger;
                return;
            }
            let newNode = $(node).clone(true, true);
            $(newNode).addClass("ext-li");
            $(newNode).attr("data-inst", nodeCount++);
            $('#ext-chain-view').prepend(newNode);

            let retNode = $($('#ext-chain-view > li')[0]);
            log("Add new node, len: ", $('#ext-chain-view > li').length, " max: ", maxExtLength);
            log("Node: ", $(retNode));

            debugCheckNodes();
        }

        // This observer watches for changes in the list items
        nodeObserver = new MutationObserver((mutationsList) => {
            nodeObserver.disconnect();
            for (const mutation of mutationsList) {
                if (/*mutation.type === 'childList' ||*/ mutation.type === 'characterData') {
                    let node = mutation.target;
                    let liNode = $(node).closest('li');
                    log("Text changed! ", $(liNode).index(),
                        $(liNode).attr("data-uuid"), mutation.oldValue, " to ", mutation.target.data);
                    if ($(liNode).attr("data-st-tm-ck") == 'true') {
                        log($(liNode).index(), " mutation, tm-ck true, already set exact time: ", $(liNode).attr("data-sn"));
                    } else {
                        addUpdateStartTime(liNode);
                        log("Updated node attrs: ",
                            $(liNode).attr("data-se"), $(liNode).attr("data-sn"), $(liNode).attr("data-st-tm-ck"));
                    }
                }
            }
            debugCheckNodes();
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

                      let clone;
                      if (useRootClones == false) {
                          copyNewNode(node);
                          clone = $($('#ext-chain-view > li')[0]);
                      } else {
                          let cuid = $(node).attr("data-cuid");
                          clone = $(`#ext-chain-view > li[data-cuid='${cuid}']`);
                          $(clone).removeClass("lihide");
                      }

                      log("[mutation] Node removed: ", $(node), " clone: ", $(clone));

                      if ($('#ext-chain-view > li').length > maxExtLength) {
                          let li = $('#ext-chain-view li:last-child');
                          removeListElement(li);
                      }
                  }
              });
              debugCheckNodes();

              mutation.addedNodes.forEach(node => {
                  log("[mutation] Node added! ", $(node));
                  if (node.nodeName === 'LI') {
                      addUpdateStartTime(node);
                      if (useRootClones == true) {
                          let newNode = copyNewNode(node);
                          prepareClone(node, newNode);
                      }
                      nodeObserver.observe(node, nodeConfig);
                      log("[mutation] Added node attrs: ", $(node).attr("data-se"), $(node).attr("data-sn"));
                  }
              });
                debugCheckNodes();
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

    function prepareClone(li, clone) {
        if (useRootClones == false)
            debugger;
        let r = getRandomIntEx(10000000, 50000000);
        $(li).attr('data-cuid', r);
        $(clone).attr('data-cuid', r);
        $(clone).addClass("lihide");
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

            if (useRootClones == true) prepareClones(rootUL, rootClone);

            //$(rootClone).addClass("xchain-attacks-list").removeClass("chain-attacks-list");
            $(rootClone).attr('id', 'ext-chain-view');
            $(rootClone).addClass(`${hideState}`);
            if (useRootClones == false) $(rootClone).empty();
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

        installObserver($(rootUL)[0]);

        if (!updateTimerId)
            updateTimerId = setInterval(updateItemTimes, 1000);

        function prepareClones(root, clone) {
            if (useRootClones == false)
                debugger;
            //$(liNode).attr("data-uuid", getRandomIntEx(50000000, 999999999));
            let rootLis = $(root).find('li');
            let cloneLis = $(clone).find('li');
            for (let idx=0; idx<$(rootLis).length; idx++) {
                prepareClone($(rootLis)[idx], $(cloneLis)[idx]);
            }
        }
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
            .hdr-none, .lihide { display: none; }

            .d .xchain-attacks-list {
                background-color: #F2F2F2;
                background-color: var(--default-bg-panel-color);
                color: #777;
            }
        `);

        /*
        .d .xchain-attacks-list {
            background-color: #F2F2F2;
            background-color: var(--default-bg-panel-color);
            color: #777;
        }
        */
    }

})();