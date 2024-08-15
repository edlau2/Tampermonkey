// ==UserScript==
// @name         Torn NPC Attack Watcher
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Experiment, for now...
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @connect      api.lzpt.io
// @xrequire      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
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

    var local = false;
    const format = 24;

    var options = {
        atOrUntil: "until",
        timeFormat: "24",   // 12 or 24
        timeZone: "local",  // local, TCT
        showAlert: false,
        alertFormat: "highlight", // blink, notification, Discord....
    };

    var startTimes = {
        until: {hrs: 0, mins: 0, secs: 0},
        atLocal: "12:12:12",
        atTCT: "12:12:12",
        valid: false
    }

    function queryLootRangers() {
        const request_url = `https://api.lzpt.io/loot`;
        GM_xmlhttpRequest ({
            method:     "GET",
            url:        request_url,
            headers:    {
                "Content-Type": "application/json"
            },
            onload: response => {
                try {
                    const data = JSON.parse(response.responseText);
                    if(!data) {
                        log('Error: No response from Loot Rangers');
                    } else {
                        processLootRangerResult(data);
                    }
                }
                catch (e) {
                    console.error(e);
                }

            },
            onerror: (e) => {
                console.error(e);
            }
        })
    }

    var startTimeRaw;
    var starTimeDate;
    var startTimeUTC;
    var timesAreGood = false;
    function processLootRangerResult(result) {
        var attackOrder = '';
        var attackString = '';
        var attackLink = '';
        var attackTarget = 0;
        timesAreGood = false;

        log("processResult: ", result);

        // If there's no clear time set
        if(result.time.clear == 0  && result.time.attack === false) {
            attackString = result.time.reason ? 'NPC attacking will resume after '+result.time.reason : 'No attack currently set.';
            log("attackString: ", attackString);
        } else {
            // Build the string for the attack order
            $.each(result.order, function(key, value) {
                if(result.npcs[value].next){
                    // If there's an attack happening right now, cross out NPCs that are in the hospital
                    if(result.time.attack === true) {
                        if(result.npcs[value].hosp_out >= result.time.current) {
                            attackOrder += '<span style="text-decoration: line-through">'+result.npcs[value].name+'</span>, ';
                        } else {
                            attackOrder += result.npcs[value].name+', ';
                        }
                    } else {
                        attackOrder += result.npcs[value].name+', ';
                    }
                }
                // Adjust the current target based on if an attack is going and who isn't in the hospital yet
                if(result.time.attack === true) {
                    if(result.npcs[value].hosp_out <= result.time.current) { // Check if the NPC is currently out of the hospital
                        if(attackTarget == 0) {
                            attackTarget = value;
                        }
                    }
                }
            });

            // Check if target has been set, otherwise default to first in attack order
            if(attackTarget == 0) {
                attackTarget = result.order[0];
            }

            // Clean up the attack order string
            attackOrder = attackOrder.slice(0, -2)+'.';

            // Check if an attack is currently happening and adjust the message accordingly
            if(result.time.attack === true) {
                attackString = 'NPC attack is underway! Get in there and get some loot!';
                attackLink = 'loader.php?sid=attack&user2ID='+attackTarget;
            } else {
                timesAreGood = true;
                startTimeRaw = result.time.clear;
                starTimeDate = Date(+result.time.clear * 1000);

                local = false;
                startTimeUTC = utcformat(result.time.clear);

                startTimes.atUTC = startTimeUTC;

                attackString = 'NPC attack set for '+
                    utcformat(result.time.clear) + ' or ' +
                    new Date(+result.time.clear * 1000).toLocaleString() +
                    '. Order is: '+attackOrder;
                attackLink = 'loader.php?sid=attack&user2ID='+attackTarget;
            }
        }

        let now = new Date();
        let epoch = now.getTime();

        log("Start Time: ", new Date(+startTimeRaw * 1000));
        log("Start Time, local: ", new Date(+startTimeRaw * 1000).toLocaleString());
        log("timesAreGood: ", timesAreGood);

        log("Now time: ", new Date(+epoch).toLocaleString());
        let startsAt = new Date(+startTimeRaw * 1000);
        log("startsAt: ", startsAt);

        // Fills in the 'until' part of start times.
        timeDifference(startsAt);

        startTimes.atLocal = new Date(+startTimeRaw * 1000).toLocaleString();
        startTimes.atUTC = startTimeUTC;
        startTimes.valid = timesAreGood;
        log("startTimes: ", startTimes);
    }

    // Returns HH:MM:SS from now...
    function fromNowFormatted(date) {
        let now = new Date();
    }

    var intervalTimer = 0;
    function timeDifference(date) {
        let now = new Date();
        var difference =  date.getTime() - now.getTime();

        var daysDifference = Math.floor(difference/1000/60/60/24);
        difference -= daysDifference*1000*60*60*24

        var hoursDifference = Math.floor(difference/1000/60/60);
        difference -= hoursDifference*1000*60*60

        var minutesDifference = Math.floor(difference/1000/60);
        difference -= minutesDifference*1000*60

        var secondsDifference = Math.floor(difference/1000);

        startTimes.until.hrs = hoursDifference;
        startTimes.until.mins = minutesDifference;
        startTimes.until.secs = secondsDifference;

        if (intervalTimer == 0)
            intervalTimer = setInterval(handleIntTimer, 1000);

        log("until: ",  startTimes.until);
    }

    // Handle the one-sec timer
    function handleIntTimer() {
        log("handleIntTimer: ", startTimes.valid, " ", options.atOrUntil);
        log("times: ", startTimes);
        if (startTimes.valid) {
            --startTimes.until.secs;
            if (startTimes.until.secs == 0) {
                --startTimes.until.mins;
                startTimes.until.secs = 59;
            }
            if (startTimes.until.mins == 0) {
                --startTimes.until.hrs;
                startTimes.until.mins = 59;
            }

            // TBD: handle alerts

            if (options.atOrUntil == "until") {
                log("setting time");
                setTimeDisplay();
            }
        }
    }

    function utcformat(d){
        d= new Date(d * 1000);
        if(local) {
            var tail= ' LT', D= [d.getFullYear(), d.getMonth()+1, d.getDate()],
                T= [d.getHours(), d.getMinutes(), d.getSeconds()];
        } else {
            var tail= ' TCT', D= [d.getUTCFullYear(), d.getUTCMonth()+1, d.getUTCDate()],
                T= [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
        }
        if(format == 12) {
            /* 12 hour format */
            if(+T[0]> 12){
                T[0]-= 12;
                tail= 'PM '+tail;
            }
            else tail= 'AM '+tail;
        }
        var i= 3;
        while(i){
            --i;
            if(D[i]<10) D[i]= '0'+D[i];
            if(T[i]<10) T[i]= '0'+T[i];
        }
        return T.join(':')+ tail;
    }

    //
    // ============================== UI and options, display functions =====================
    //

    function addNpcStyles() {
         GM_addStyle(`
                div.xnpc {
                    padding-bottom: 0px;
                    padding-top: 0px;
                    display: flex;
                    justify-content: center;
                    flex-direction: column;
                }
                .xnpcs {
                     font-weight: 700;
                     justify-content: center;
                     display: flex;
                }
                .xhide-show2 {
                     font-weight: 700;
                     justify-content: center;
                }
                div.xnpc-inner {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                }
                .xtime {
                     justify-content: center;
                }
                .xnpc-inner span {
                    width: auto;
                    justify-content: center;
                }
                .xnpc-inner a {
                    color: white;
                }
                .xtouch {
                   cursor: pointer;
                }
                .xtouch:hover {
                    color: green;
                }
                .df {display: flex;}

                .npc-caret {
                     margin-left: auto;
                     cursor: pointer;
                }
                .xcrt {
                    width: 23px;
                    height: 23px;
                    float: left;
                }
            `);

        GM_addStyle(`
            .xjc {
                 justify-content: center;
                 display: inline-flex;
             }
         `);
    }

    // The elems with class 'xhide-show' toggle between xhide and df (display flex) when
    // the elem with class 'xtouch' is clicked.
    //
    // The elems with class "xhide-show2" toggle when the caret is clicked, between class 'xhide'
    // and not having that class...worked at one point.
    //
    // May change to displaying the pop-up options menu instead and have a caret to hide/show the alert
    // div. Can show time time, time when (TCT or local), have alerts, when to alert, etc.
    //
    function getNPCDiv() {
        return `
               <hr class="delimiter___neME6">
               <div id="xedxNPCAlert" class="xnpc">
                   <span class="xtouch xnpcs xml10">NPC - click to open</span>
                   <span class="xncpi">
                   <span class="break"></span>
                   <hr class="xhide-show xhide delimiter___neME6">
                   <div class="xhide-show xnpc-inner xhide">
                       <span class="xhide-show xhide">
                           <input id="xuntil" name="def-go" type="radio" value="until" checked>Until
                       </span>
                       <span class="xhide-show xhide">
                           <input id="xat" name="def-go" type="radio" value="at">At
                       </span>
                       <span class="xhide-show xhide">
                           <input type="checkbox" id="xchk-box" class="">Alert
                       </span>
                       <span class="xhide-show xhide" style="float:right;">
                           <i id="npccaret" class="icon fas fa-caret-down npc-caret"></i>
                       </span>
                   </div>
                   <hr class="xhide-show2 xhide delimiter___neME6">
                   <div class="xnpc xhide xhide-show2">
                       <span id="xmenu1" class="xtime xhide-show2 xhide">menu 1</span>
                   </div>
               </div>`;
    }

              // <span class="xhide-show xhide"><a href=#">More</a></span>

    var style;
    function adjStyle() {
        $('#xnpc-contextMenu').attr("style", style);
        log("Style: ", style);
        log("position: ", $("#xnpc-contextMenu").position());
    }

    const hideSidebarNpcTimers = function () {
        $("#sidebarNpcTimers").attr("style", "display: none;");
        $("#sidebarNpcTimers").prev().attr("style", "display: none;");
        setTimeout(hideSidebarNpcTimers, 500);
    }
    const toggleClass = function(sel, classA, classB) {
        if ($(sel).hasClass(classA)) {$(sel).removeClass(classA).addClass(classB);} else {$(sel).removeClass(classB).addClass(classA);}}

    const caretNode = `<span style="float:right;"><i id="npccaret" class="icon fas fa-caret-down xedx-caret"></i></span>`;
    var installRetries = 0;

    function installUI() {
        log("NPC Alert installUI");
        if ($('#xedxNPCAlert').length) {
            return log("NPC Alert Already installed!");
        }       

        let node = $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]');
        if ($(node).length == 0) {
            if (installRetries++ > 5) {
                return log("INPC Alert nstall failed, too many retries!");
            }
            return setTimeout(installUI, 250);
        }


        $("#sidebarNpcTimers").attr("style", "display: none;");
        $("#sidebarNpcTimers").prev().attr("style", "display: none;");
        // Temp hack
        setTimeout(hideSidebarNpcTimers, 250);

        let elem = getNPCDiv();
        $(node).append(elem);

        $("#xedxNPCAlert > span.xtouch").on('click', doNpcHideShow);
        $("#npccaret").on("click", handleCaretClick);

        setOptionsState();

        if ($('#xedxNPCAlert').length) {
            return true;
        } else {
            log("NPC Alert UI install failed!");
        }
    }

    // This handles clicking the "NPC Alert - Click Me" span (class 'xtouch')
    // Displays simple options
    function doNpcHideShow() {
        toggleClass(".xhide-show", "xhide", "df");
    }

    // This handles the caret click, opens the alert area.
    function handleCaretClick(e) {
        let node = e.currentTarget;
        log("caret click: ", $(node));

        if ($(node).hasClass('fa-caret-down')) {
            $(node).removeClass("fa-caret-down").addClass("fa-caret-right");
        } else {
            $(node).removeClass("fa-caret-right").addClass("fa-caret-down");
        }

        let list = $(".xhide-show2");
        log("list: ", $(list));
        for (let idx=0; idx < $(list).length; idx++) {
            let elem = $(list)[idx];
            log("elem: ", $(elem));
            if ($(elem).hasClass("xhide")) {
                log("Removing class");
                $(elem).removeClass("xhide");
                if ($(elem).hasClass("xtime")) $(elem).addClass("df");
            } else {
                log("Adding class");
                $(elem).addClass("xhide").removeClass("df");
            }
        }
        //toggleClass(".xhide-show2", "xhide", "df");
    }

    function n(n){return n > 9 ? "" + n: "0" + n;}
    function setTimeDisplay() {
        let timeText = "00:00:00";
        if (options.atOrUntil == "until") {
            timeText = n(startTimes.until.hrs) + ":" + n(startTimes.until.mins) + ":" + n(startTimes.until.secs);
        } else {
            timeText = startTimes.atLocal;
        }

        $("#xmenu1").text(timeText);
    }

    function setOptionsState() {
        let untilOrAt = GM_getValue("showUntilOrAt", "until");
        options.atOrUntil = untilOrAt;
        if (untilOrAt == "at") $("#xat").prop('checked', true);
        if (untilOrAt == "until") $("#xuntil").prop('checked', true);

        $('input:radio[name=def-go]').click(function() {
            let value = $(this).val();
            options.atOrUntil = value;
            GM_setValue("showUntilOrAt", value);
            setTimeDisplay();
            //$("#xmenu1").text(value);
            log("radio clicked, value = ", value);
        });
    }

    function handlePageLoad() {
        // Can check for any required DIV here and setTimeout() if not available,
        // or trigger any required API calls...
        installUI();
        queryLootRangers();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    //versionCheck();

    addFloatingOptionsStyles();
    addContextStyles();
    loadMiscStyles();
    addNpcStyles();

    callOnContentLoaded(handlePageLoad);

})();