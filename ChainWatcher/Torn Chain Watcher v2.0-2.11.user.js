// ==UserScript==
// @name         Torn Chain Watcher v2.0
// @namespace    http://tampermonkey.net/
// @version      2.11
// @description  Make the chain timeout/count blatantly obvious.
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    // Global, editable options
    var flashOn = GM_getValue('flashOn', true);
    var muted = GM_getValue('muted', false);
    var beepOpt = GM_getValue('beepOpt', '$');       // Time before audio alert in sec
    var blinkOpt = GM_getValue('blinkOpt', '$');     // Time before visual in sec
    var notifyOpt = GM_getValue('notifyOpt', '$');   // Time before notificatiob alert in sec
    var volume = GM_getValue('volume', .5);
    var beepType = GM_getValue('beepType', "sine");  // "sine", "square", "sawtooth", "triangle" (or 'custom', but then need a periodic wave function)
    var hideOpts = GM_getValue('hideOpts', false);
    var notifyOn = GM_getValue('notifyOn', true);    // true if notifications enabled

    // Editable via storage - time in secs before notification times out
    const notifyTimeSecs = GM_getValue("notifyTimeSecs", 120);
    const notificationTimeoutMs = notifyTimeSecs * 1000;
    GM_setValue("notifyTimeSecs", notifyTimeSecs);

    // Non-editable globals, dynamically adjusted
    var lastState = GM_getValue("lastState", "open");         // open or collapsed
    var chainInCd = false;
    const chainTimeSelect = "[class*='chain-bar__'] [class*='bar-stats__'] [class*='bar-timeleft__']";
    const chainCountSelect = "[class*='chain-bar__'] [class*='bar-stats__'] [class*='bar-value__']";
    const chainTime = function () { return $(chainTimeSelect).text();}
    const chainCount = function () { return $(chainCountSelect).text();}
    const beepFrequency = 440; // In hertz, 440 is middle A
    var targetNode = null;
    var chainNode = null;
    var beeping = false;
    var beepInt = 0;
    var testBeepInt = 0;
    var testingVideo = false;
    var intTimer = null;

    // Debug/dev stuff
    debugLoggingEnabled = false;
    loggingEnabled = true;
    const xedxDevMode = true;

    var audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
    function beep(duration=500, frequency=440, volume=1, type='sine', callback) {
        var oscillator = audioCtx.createOscillator();
        var gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (volume){gainNode.gain.value = volume;}
        if (frequency){oscillator.frequency.value = frequency;}
        if (type){oscillator.type = type;}
        if (callback){oscillator.onended = callback;}

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + ((duration || 500) / 1000));
    };

    function handleInputChange(e) {
        log('handleInputChange: ', e);
        let target = e.target
        if (e.target.type !== 'range') {
            target = document.getElementById('range')
        }
        const min = target.min
        const max = target.max
        const val = target.value
        $("#rangevalue")[0].textContent = val;
        debug('min: ' + min + ' max: ' + max + ' val: ' + val + ' background size: ' + target.style.backgroundSize);

        target.style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%'
        volume = val/100;
        saveOptions();
    }

    function doBeep() {
        beep(null, beepFrequency, volume, beepType);
    }

    function beepingOn() {
        if (!muted && !beeping && !beepInt) {
            beepInt = setInterval(doBeep, 1000);
            beeping = true;
        }
    }

    function beepingOff() {
        if (beepInt) clearInterval(beepInt);
        beeping = false;
        beepInt = 0;
    }

    function mute(value) { // TRUE to mute
        log('Muting');
        muted = value;
        if (value) beepingOff();
    }

    function doMute() {
        mute(!muted);
        $('#xtoggle-mute').css('color', muted ? '#FF0033' : '');
        $('#xtoggle-mute').css('filter', muted ? 'brightness(1.2)' : '');
    }

    function checkBeep(seconds) {
        if (!beepOpt || beepOpt == '$' || muted || beepOpt < seconds) return false;
        return true;
    }

    function checkBlink(seconds) {
        if (!blinkOpt || blinkOpt == '$' || blinkOpt < seconds) return false;
        return true;
    }

    function checkNotify(seconds) {
        if (!notifyOpt || notifyOpt == '$' || notifyOpt < seconds) return false;
        return true;
    }

    var notifyOpen = false;
    const clearNotifyFlag = function(){notifyOpen = false;}

    function doBrowserNotify() {
        log("doBrowserNotify: ");
        if (notifyOpen == true) return;
        notifyOpen = true;
        let msgText = "The chain will time out in " + chainTime() + "!";

        GM_notification ( {
            title: 'Chain Watcher Alert!',
            text: msgText,
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: notificationTimeoutMs,
            onclick: () => {

            },

            // Maybe setTimeout to not clear, so won't be notified
            // again for a bit? Or flag in storage?
            ondone: () => {
                setTimeout(clearNotifyFlag, 30000);
            }
        } );
    }

    function stopAllAlerts() {
        beepingOff();

        if ($("#xedx-chain-span").hasClass("xedx-chain-alert"))
            $("#xedx-chain-span").toggleClass("xedx-chain-alert xedx-chain");
    }

    var lastVideoAlertState = false;    // true if in flashing/alert state
    function timerProc() {
        if (chainInCd == true) {
            $($("#xedx-chain-span")[0]).text("Cooldown");
            clearNotifyFlag();
            return;
        }
        let parts = chainTime() ? chainTime().split(':') : [0, 0];
        let seconds = Number(parts[0]) * 60 + Number(parts[1]);

        // Check for chain drop/end
        let count = Number(chainCount().split('/')[0]);
        if (count == 0 || seconds == 0) {
            $($("#xedx-chain-span")[0]).text("00:00");
            clearNotifyFlag();
            stopAllAlerts();
            return;
        }

        // Handle audio
        if (checkBeep(seconds)) {
            beepingOn();
        } else {
            beepingOff();
        }

        // Handle browser notifications
        if (notifyOn && !notifyOpen && checkNotify(seconds))
            doBrowserNotify();

        // Handle video - unless testing via button.
        let alertState = (checkBlink(seconds) && flashOn); // || testingVideo;
        if (alertState != lastVideoAlertState) {
            $("#xedx-chain-span").toggleClass("xedx-chain-alert xedx-chain");
        }
        lastVideoAlertState = alertState;

        $($("#xedx-chain-span")[0]).text(chainTime()); 
    };

    function saveOptions() {
        GM_setValue('flashOn', flashOn);
        GM_setValue('muted', muted);
        GM_setValue('beepOpt', beepOpt);
        GM_setValue('blinkOpt', blinkOpt);
        GM_setValue('notifyOpt', notifyOpt);
        GM_setValue('volume', volume);
        GM_setValue('beepType', beepType);
        GM_setValue('hideOpts', hideOpts);
        GM_setValue('notifyOn', notifyOn);
    }

    function setOptions() {
        let val = volume * 100;
        let min = $('#rangeslider')[0].min;
        let max = $('#rangeslider')[0].min;
        $('#rangeslider')[0].value = volume * 100;
        $('#rangeslider')[0].style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%'
        $("#rangevalue")[0].textContent = volume * 100;
        $('#audible-select')[0].value = beepOpt;
        $('#visible-select')[0].value = blinkOpt;
        $('#notify-select')[0].value = notifyOpt;
        $('#xedx-audible-opt').prop('checked', !muted);
        $('#xedx-visual-opt').prop('checked', flashOn);
        $('#xedx-notify-opt').prop('checked', notifyOn);

        //$('#type-select')[0].value = beepType;
        //$('#xtoggle-opts').prop('checked', hideOpts);
    }

    function startTimer() {
        targetNode = document.querySelector("[class*='bar-timeleft__']");
        chainNode = document.querySelector("[class*='bar-value__']");
        if (!targetNode || !chainNode) {
            log('Unable to find target nodes! ', targetNode, chainNode);
            return setTimeout(startTimer, 1000);
        }

        intTimer = setInterval(timerProc, 1000);
    }

    function hideInnerDiv(e) {
        let heightInner = parseInt($("#xchain-inner").css("height"));
        let doShrink = (heightInner > 0);

        log("hideInnerDiv: e, ", e, "height: ", heightInner, " doShrink: ", doShrink);

        if (doShrink)
            lastState = "collapsed";
        else
            lastState = "open";
        GM_setValue("lastState", lastState);

        $("#xchain-inner").animate({
            opacity: doShrink ? 0 : 1,
            height: doShrink ? "0px" : "69px",
        }, 1000, function () {
            log("tabL set height: ", $("#tabL").css('height'));
            log("Animate done: ", $("#xchain-inner"));
        });

        $("#xchain-tabl").animate({
            height: doShrink ? "27px" : "77px",
        }, 1000, function () {
            log("tabL set height: ", $("#xchain-tabl").css('height'));
            $("#xchain-tabl").toggleClass("xopen xcollapsed");
            log("tabL set height: ", $("#xchain-tabl").css('height'));
        });

        $("#xchain-tabr").animate({
            height: doShrink ? "27px" : "77px",
        }, 1000, function () {
            log("tabR set height: ", $("#xchain-tabr").css('height'));
            $("#xchain-tabr").toggleClass("xopen xcollapsed");
            log("tabR set height: ", $("#xchain-tabr").css('height'));
        });
    }

    function doNotifyTest() {
        GM_notification ( {
            title: 'Chain Watcher Alert!',
            text: "This is a test, should go away in 5 secs.",
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: 5000,
            onclick: () => {

            }
        } );
    }

    function doAudioTest() {
        let enabled = ($('#test-audio')[0].value == 'on') ? true : false;
        if (enabled) {
            log('Turning off');
            $('#test-audio')[0].value = 'off';
            $('#test-audio').removeClass('button-on');
            $('#test-audio').addClass('button-off');
            clearInterval(testBeepInt);
            testBeepInt = 0;
        } else {
            if (testBeepInt) return;
            log('Turning on');
            $('#test-audio')[0].value = 'on';
            $('#test-audio').addClass('button-on');
            $('#test-audio').removeClass('button-off');
            testBeepInt = setInterval(doBeep, 1000);
        }
    }

    function doVideoTest() {
        testingVideo = !testingVideo;
        $("#xedx-chain-span").toggleClass("xedx-chain-alert xedx-chain");
        $('#test-video').toggleClass("button-on");
    }

    function doHideOpts() {
        log("hide-op clicked! ", $('#xedx-chainwatch-opts'));

        let size = 0;
        let tabHeight = "77px";
        let opts = {};
        if (parseInt($('#xedx-chainwatch-opts').css("height")) > 0) {
            opts.height = "0px";
            opts.opacity = 0;
        } else {
            $('#xedx-chainwatch-opts').css("left", "");
            opts.opacity = 1;
            opts.height = "125px";
            tabHeight = "201px";
        }

        $('#xedx-chainwatch-opts').animate(opts, 1000, function() {
            $('#xedx-chainwatch-opts').css("left", ((size == "0px") ? -5000 : ""));
        });

        $("#xchain-tabl").animate({
            height: tabHeight,
        }, 1000, function () {
            //$("#xchain-tabl").toggleClass("xopen xcollapsed");
        });

        $("#xchain-tabr").animate({
            height: tabHeight,
        }, 1000, function () {
            //$("#xchain-tabr").toggleClass("xopen xcollapsed");
        });
    }

    function installUiHandlers() {

        instTabHandlers();       // 'Tab' on left, to open/close,
        instBtnHandlers();          // Buttons along top right
        instAudioVideoCtrls();      // Options for audio/video
        installToolips();           // Install simple help

        // Local functions...
        function installToolips() {
            let tt4 = "tooltip4";
            const minimizeTxt = "Collapse main window.<br>Tab on left restores.";
            const optionsTxt = "Show various alerting options";
            const audioAlertTxt = "Select this to beep when the chain counter<br>" +
                                  "is getting low. You will need to press 'Test Audio'<br>" +
                                  "to enable beeping to work.";
            const videoAlertTxt = "Select this to flash the time<br>" +
                                   "remaining when running low.";
            const timeUntilTxt = "Display alert when the chain<br>" +
                                 "timer reaches this time left.";
            const audioTestTxt = "You must press this button at<br>" +
                                 "once to enable audio support.<br>" +
                                 "It will beep your speaker until<br>" +
                                 "you press it again. The volume<br>" +
                                 "can be set to work independently<br>" +
                                 "of normal speaker volume.";
            const videoTestTxt = "Pressing this should cause<br>" +
                                 "the display to flash. Press<br>" +
                                 "again to stop.";
            const notifyTxt = "Select this to display browser alerts<br>" +
                              "when the timer is getting low. They will<br>" +
                              "show up no matter what tab you happen to be<br>" +
                              "viewing, Torn or not.";
            const notifyTestTxt = "This will briefly display a<br>" +
                                  "browser notification alert; it<br>" +
                                  "automatically close in 5 seconds<br>" +
                                  "or if clicked, or 'close' is pressed.";
            const tabTxt = "Click here to hide/show<br>the main chain watcher window.";
            const muteTxt = "Mute the damn beeping!<br>Can also turn off the option...";

            displayHtmlToolTip($("#xtoggle-main"), minimizeTxt, tt4);
            displayHtmlToolTip($("#xtoggle-opts"), optionsTxt, tt4);
            displayHtmlToolTip($("#xtoggle-mute"), muteTxt, tt4);

            displayHtmlToolTip($("#xedx-audible-opt").parent(), audioAlertTxt, tt4);
            displayHtmlToolTip($("#xedx-visual-opt").closest("td"), videoAlertTxt, tt4);
            displayHtmlToolTip($("#audible-select"), timeUntilTxt, tt4);
            displayHtmlToolTip($("#visible-select"), timeUntilTxt, tt4);
            displayHtmlToolTip($("#notify-select"), timeUntilTxt, tt4);
            displayHtmlToolTip($("#test-audio").parent(), audioTestTxt, tt4);
            displayHtmlToolTip($("#test-video"), videoTestTxt, tt4);
            displayHtmlToolTip($("#test-notify"), notifyTestTxt, tt4);
            displayHtmlToolTip($("#xedx-notify-opt").closest("td"), notifyTxt, tt4);
            displayHtmlToolTip($("#xchain-tabl"), tabTxt, tt4);
            displayHtmlToolTip($("#xchain-tabr"), tabTxt, tt4);

        }

        function handleSelect(e) {
            let id = $(this).attr("id");
            let val = $(this).val();

            log("handle select: ", id, " | ", val);
            switch (id) {
                case 'audible-select': beepOpt = val; break;
                case 'visible-select': blinkOpt = val; break;
                case 'notify-select': notifyOpt = val; break;
                case 'type-select': beepType = val; break;
            }
            saveOptions();
        }

        function instBtnHandlers() {
            // Buttons on top - after minimize is clicked, tab on left can re-open
            $("#xtoggle-main").on('click', hideInnerDiv);
            $('#xtoggle-opts').on('click', doHideOpts);
            $('#xtoggle-mute').on('click', doMute);
        }

        function instTabHandlers() {
            $("#xchain-tabl").on('click', hideInnerDiv);
            $("#xchain-tabl").addClass("xopen");
            $("#xchain-tabr").on('click', hideInnerDiv);
            $("#xchain-tabr").addClass("xopen");
        }

        function instAudioVideoCtrls() {
            // Testing buttons and 'select' options
            $('#test-audio').on('click', doAudioTest);
            $('#test-video').on('click', doVideoTest);
            $('#test-notify').on('click', doNotifyTest);
            $("#xchain-topts select").on('change', handleSelect);

            // Hook up volume control
            let rangeInputs = document.querySelectorAll('input[type="range"]');
            rangeInputs.forEach(input => {
                $("#rangevalue")[0].textContent = input.value;
                input.style.backgroundSize = (input.value - input.min) * 100 / (input.max - input.min) + '% 100%';
                input.addEventListener('input', handleInputChange);
            });

            // Hook up audio/visual enable checkboxes
            $('#xedx-audible-opt').change(function() {
                mute(!this.checked);
                saveOptions();
            });

            $('#xedx-notify-opt').change(function() {
                notifyOn = this.checked;
                saveOptions();
            });

            $('#xedx-visual-opt').change(function() {
                flashOn = this.checked;
                saveOptions();
            });
        }
    }

    function handlePageLoad(retries=0) {
        let cd = $("#xedx-chain-div");
        if ($(cd).length > 0) return log("Already installed!");

        // Install UI
        let parent = document.querySelector("#react-root > div > div > hr");
        if (!parent) {
            if (retries++ < 50) return setTimeout(handlePageLoad, 250);
            return log("Too many retries, giving up");
        }
        $(parent).after(getChainDiv());

        // Hide waveform type unless in dev mode
        //if (true || xedxDevMode == false) $("#type-select").css("display", "none");

        // Read saved options
        //readOptions();
        setOptions();

        // Add event/click handlers
        installUiHandlers();

        // Hide options screen by default
        if (hideOpts) {
            $('#xedx-chainwatch-opts').css("height","0px");
            $('#xedx-chainwatch-opts').css("opacity",0);
            $('#xedx-chainwatch-opts').css("left", -5000);
            $('#xbtn-row').addClass('top-margin20');
        } else {
            $('#xbtn-row').removeClass('top-margin20');
        }

        // prserve last state
        if (lastState == "collapsed") {
            //doHideOpts();
            hideInnerDiv();
        }

        startTimer();
    }

    function setChainInCd(retries=0) {
        if (chainInCd == false) return;
        if ($($("#xedx-chain-span")[0]).length < 1) {
            if (retries++ < 30) return setTimeout(setChainInCd, 250, retries);
            return log("too many retries!");
        }
        $($("#xedx-chain-span")[0]).text("Cooldown");
    }

    function chainQueryCb(responseText, ID, param) {
        log("chainQueryCb");
        let jsonResp = JSON.parse(responseText);
        log("responseText: ", responseText);
        if (jsonResp.error) {
            if (jsonResp.error.code == 6)
                return;
            return handleError(responseText);
        }
        let chain = jsonResp.chain;
        log("chain: ", chain);
        if (chain.cooldown > 0) {
            chainInCd = true;
            setChainInCd();
        }
    }

    function doChainApiCall() {
        log("doChainApiCall");
        xedx_TornFactionQuery("", "chain", chainQueryCb) ;
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();
    addStyles();

    doChainApiCall();


    callOnHashChange(handlePageLoad);
    installPushStateHandler(handlePageLoad);

    callOnContentLoaded(handlePageLoad);

    function getChainDiv() {
        const chainDiv = `
            <div id="xchain-wrap">
            <div id="xchain-tabl" class="xopen"></div>
            <div id="xedx-chain-div" class="xflexc-center xshow-flex">

                 <div class="title-black border-round xdiv"></div>

                 <div id="xchain-inner">
                     <div id="xbtn-row">
                         <span id="xtoggle-mute" style="width: 50px;">Mute</span>
                         <span id="xtoggle-opts">?</span>
                         <span id="xtoggle-main">_</span>
                     </div>
                     <div>
                         <span id="xedx-chain-span" class="xedx-chain">--:--</span>
                     </div>
                 </div>`

                 + getChainOptsDiv() +    // Lower panel options table.

                 `<div class="title-black border-round m-top10 xdiv"></div>
             </div>
             <div id="xchain-tabr" class="xopen"></div>
             </div>
             `;

        return chainDiv;
    }

    function getChainOptsDiv() {
        let optsTable = `
             <div id="xedx-chainwatch-opts">
                 <table id="xchain-topts">
                 <tbody>

                     <tr>
                         <td class="xtdx xcb1"><div>
                             <input type="checkbox" class="xcbx" id="xedx-audible-opt" name="audible" checked>
                             <label for="audible"><span class="xedx-span">Enable Audible Alerts</span></label>
                         </div></td>
                         <td class="xtdx">
                             <select id="audible-select" class="xedx-select">
                                  <option value="$">--Please Select--</option>
                                  <option value="60">1:00</option>
                                  <option value="75">1:!5</option>
                                  <option value="90">1:30</option>
                                  <option value="120">2:00</option>
                                  <option value="150">2:30</option>
                                  <option value="180">3:00</option>
                                  <option value="210">3:30</option>
                                  <option value="240">4:00</option>
                                  <option value="270">4:30</option>
                            </select>
                         </td>
                         <td class="audio-cell">
                             <Button class="xwa xedx-torn-btn-raw xbtn-size" id="test-audio" value="off">Test Audio</Button>
                             <input id="rangeslider" class="xwa" type="range" min="0" max="100" value="50" oninput="rangevalue.value=value"/>
                             <output id="rangevalue">100</output>
                         </td>
                         </td>
                    </tr>

                    <tr>
                         <td class="xtdx xcb1"><div>
                             <input type="checkbox" class="xcbx" id="xedx-visual-opt" name="visual" checked>
                             <label for="visual"><span class="xedx-span">Enable Visual Alerts</span></label>
                         </div></td>
                         <td class="xtdx">
                             <select id="visible-select" class="xedx-select">
                                  <option value="$">--Please Select--</option>
                                  <option value="60">1:00</option>
                                  <option value="75">1:!5</option>
                                  <option value="90">1:30</option>
                                  <option value="120">2:00</option>
                                  <option value="150">2:30</option>
                                  <option value="180">3:00</option>
                                  <option value="210">3:30</option>
                                  <option value="240">4:00</option>
                                  <option value="270">4:30</option>
                            </select>
                         </td>
                         <td>
                             <Button class="xedx-torn-btn-raw xbtn-size xw168" id="test-video" value="off">Test Video</Button>
                         </td>
                     </tr>

                     <tr id="xchain-last">
                         <td class="xtdx xcb1"><div>
                             <input type="checkbox" class="xcbx" id="xedx-notify-opt" name="notify" checked>
                             <label for="notify"><span class="xedx-span">Enable Notifications</span></label>
                         </div></td>
                         <td class="xtdx">
                             <select id="notify-select" class="xedx-select">
                                  <option value="$">--Please Select--</option>
                                  <option value="60">1:00</option>
                                  <option value="75">1:!5</option>
                                  <option value="90">1:30</option>
                                  <option value="120">2:00</option>
                                  <option value="150">2:30</option>
                                  <option value="180">3:00</option>
                                  <option value="210">3:30</option>
                                  <option value="240">4:00</option>
                                  <option value="270">4:30</option>
                            </select>
                         </td>
                         <td>
                             <Button class="xedx-torn-btn-raw xbtn-size xw168" id="test-notify" value="off">Test Notification</Button>
                         </td>
                     </tr>

                 </table>
             </div>
        `;

        return optsTable;

        /*

         <td class="xtdx">
             <select id="type-select" class="xedx-select" style="display: none;">
                  <option value="sine">Sine</option>
                  <option value="square">Square</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="triangle">Triangle</option>
            </select>
         </td>
        */
    }

    function addStyles() {
        const btnRadius = 24;

        loadMiscStyles();
        addFlexStyles();

        GM_addStyle(`
            .xcb1 div {
                display: inline-flex;
            }
            #xchain-wrap {
                display: flex;
                flex-direction: row;
            }
            #xedx-chain-div {
                width: 100%;
            }
            #xchain-tabl {
                width: 8px;
                background: #050;
                margin-left: -8px;
                border-radius: 5px 0px 0px 5px;
                height: 77px;
                margin-right: 0px;
                position: absolute;
                cursor: pointer;
            }
            #xchain-tabr {
                width: 8px;
                background: #050;
                border-radius: 0px 5px 5px 0px;
                height: 77px;
                /*margin-right: 0px;*/
                position: relative;
                cursor: pointer;
            }
            #xchain-inner {
                display: flex;
                flex-direction: column;
            }
            #xbtn-row {
                display: flex;
                flex-direction: row;
                justify-content: flex-end;
                align-items: center;
                z-index: 22;
            }
            .xcollapsed {margin-top: -4px;}
            .xopen {margin-top: 5px;}
            .xdiv {height: 4px !important; width: 99%;}

            #xtoggle-main, #xtoggle-opts {
                position: relative;
                display: flex;
                flex-wrap: wrap;
                align-content: center;
                justify-content: center;
                align-self: flex-end;
                margin: 0px 5px 0px 5px;
                top: -10px;
                height: ${btnRadius}px;
                width: ${btnRadius}px;
                border-radius: ${btnRadius}px;
                cursor: pointer;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
            }

            #xtoggle-mute {
                position: relative;
                display: flex;
                flex-wrap: wrap;
                align-content: center;
                justify-content: center;
                align-self: flex-end;
                width: 50px;
                margin: 0px 5px 0px 5px;
                top: -10px;
                height: ${btnRadius}px;
                border-radius: ${btnRadius}px;
                cursor: pointer;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
            }

            #xtoggle-main:hover, #xtoggle-opts:hover, #xtoggle-mute:hover {
                filter: brightness(1.5);
            }

            #xedx-chain-span {
                text-align: center;
                font-size: 56px;
                color: red;
                width: 100%;
                margin-top: -34px;
                justify-content: center;
                display: flex;
            }

            #xedx-chainwatch-opts {
                position: relative;
                height: auto;
            }

            #xchain-topts {
                width: 100%;
                color: white;
            }
            #xchain-topts tbody {
                flex-direction: column;
                display: flex;
                margin-left: 50px;
                margin-right: 50px;
                margin-top: 10px;
            }
            #xchain-topts tr {
                display: flex;
                justify-content: space-between;
                width: 100%;
                flex-direction: row;
                align-content: center;
                flex-wrap: wrap;
                margin-bottom: 5px;
                height: 32px;
            }
            #xchain-topts td {
                width: 33%;
                display: flex;
                align-items: center;
                flex-wrap: wrap;
            }
            .audio-cell {
                flex-direction: row;
                justify-content: space-between;
            }
            .xwa {
                width: auto;
            }
            .xw168 {
                 width: 168px;
            }
            body:not(.dark-mode) .xedx-table {
                 background: #3D3D3D;
                 border-radius: 10px;
            }

            body.dark-mode .xedx-chain-alert {
                text-align: center;
                font-size: 56px; color: lime; width: auto; margin-top: 10px; /*margin-left: 60px;*/
                -webkit-animation: highlight-active 1s linear 0s infinite normal;
                animation: highlight-active 1s linear 0s infinite normal;}

            body:not(.dark-mode) .xedx-chain-alert {text-align: center;
                font-size: 56px; color: #0CB814; width: auto; margin-top: 10px; /*margin-left: 60px;*/
                -webkit-animation: highlight-active 1s linear 0s infinite normal;
                animation: highlight-active 1s linear 0s infinite normal;}

            .xcbx {margin-left: 10px; margin-top: 0px; border-radius: 50%; vertical-align: middle;
                width: 1.1em; height: 1.1em; background-color: white;
                border: 1px solid #ddd; appearance: none; -webkit-appearance: none;}

            .xcbx:checked {background-color: #0032E0;}

            .xtdx {color: white;}

            .xedx-select {
                margin-left: 10px;
                margin-bottom: 10px;
                border-radius: 10px;
                align-items: center;
                display: flex;
            }

            .top-margin10 {margin-top: 10px;}
            .top-margin20 {margin-top: 20px;}
            .xxx-box-div {width: 100%;}
            .box-col {flex-direction: column;}
            .box {display: flex !important; align-items: center;}

             /*#xedx-chain-div button {*/
             .chain-btn {
                 display: table-cell;
                 border-radius: 10px;
                 border: 1px solid black;
                 color:black;
                 background: white;
                 height: 22px;
                 width: 168px;
                 margin-left: 10px;
                 margin-right: 5px;
             }

             .xbtn-size {
                 height: 26px;
                 margin-left: 10px;
                 margin-right: 5px;
                 border-radius: 10px;
             }

             .chain-btn-x {
                line-height: 22px;
                font-family: "Fjalla One", Arial, serif;
                font-size: 14px;
                font-weight: normal;
                text-align: center;
                text-transform: uppercase;
                border-radius: 5px;
                padding: 0 10px;
                cursor: pointer;
                color: #555;
                color: var(--btn-color);
                text-shadow: 0 1px 0 #FFFFFF40;
                text-shadow: var(--btn-text-shadow);
                background: linear-gradient(180deg, #DEDEDE 0%, #F7F7F7 25%, #CFCFCF 60%, #E7E7E7 78%, #D9D9D9 100%);
                background: var(--btn-background);
                border: 1px solid #aaa;
                border: var(--btn-border);
                display: inline-block;
                vertical-align: middle;
             }

             #xedx-chain-div .button-on {background: lime;}

             .body:not(.dark-mode) .xedx-span {margin-left: 5px; color: white;}
             .body.dark-mode .xedx-span {margin-left: 5px; color: white;}
             .xedx-vol-span {margin-left: 20px !important; padding-left: 10px !important;}
             #rangevalue {
                 display: none;
             }

             input[type="range"] {
                  -webkit-appearance: none;
                  height: 7px;
                  background: rgba(255, 255, 255, 0.6);
                  border-radius: 5px;
                  background-image: linear-gradient(#0032E0, #0032E0);
                  background-size: 70% 100%;
                  background-repeat: no-repeat;
            }

            input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  height: 20px;
                  width: 10px;
                  border-radius: 20%;
                  background: white;
                  cursor: ew-resize;
                  box-shadow: 0 0 2px 0 #555;
                  transition: background .3s ease-in-out;
             }

             input[type=range]::-webkit-slider-runnable-track  {
                  -webkit-appearance: none;
                  box-shadow: none;
                  border: none;
                  background: transparent;
             }
        `);
    }

})();