// ==UserScript==
// @name         Torn Enable Attack Btn
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Enable disabled attack btn on profile page
// @author       xedx [2100735]
// @match        https://www.torn.com/profiles.php?XID=*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
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

    // This is the most important option, I'll try to put on the page
    // to make it easier to change on the fly. What it does is make it
    // so that when this much time is left in hosp, clicking the attack
    // button will start going to the attack page. From usin the links
    // on the war page in YATA, I usually can figure out exact time to
    // click at so I don't have to refresh and am first to attack. Varies
    // every time due to lag, usually dependent on how busy the war is.
    // Since Torn times are truncated to the second, the tenths place is
    // not terribly accurate
    var timeLeftLimit  = GM_getValue("timeLeftLimit", 4.5);         // Enable button when this many seconds remain...

    const intervalTable = [
            {secsLeft: 10, checkEvery: 500},          // When 10 secs left in hosp, check status every half second
            {secsLeft: 20, checkEvery: 750},          // 20 secs left, 750ms (3/4 second)
            {secsLeft: 60, checkEvery: 1000},         // 60 secs, check every 1 sec. Maybe 2 or 3 here?
            {secsLeft: 'default', checkEvery: 2000}   // All else, every 2 secs...prob should be 5 or use time on page...
        ];

    const allowGoOnGreen = false;
    var goOnGreen = false;              // experimental...
    const statusCheckInt = 1000;        // Initially, check status every 1 sec

    logScriptStart();

    const secsPerMin = 60, secsPerHr = 3600;
    const XID = xidFromProfileURL(location.href);
    const rfcv = getRfcv();
    const fillColor = $('body')[0].classList.contains('dark-mode') ?
          `url(#linear-gradient-dark-mode)` :
          `rgba(153, 153, 153, 0.4)`;
    const btnSel = "#button0-profile-" + XID;
    const url = `https://www.torn.com/profiles.php`;
    const userHref = `https://www.torn.com/loader.php?sid=attack&user2ID=${XID}`;

    const reqData = {step: 'getProfileData', XID: XID, rfcv: rfcv};

    callOnContentLoaded(handlePageLoad);

    function activateBtn() {
        $(btnSel).off('click.xedx');
        $(btnSel).css("border", "1px solid rgba(0,255,0,1)");
        $(btnSel).addClass("alert-on");
        $(btnSel).on('click', function(e) {
            window.location.href = userHref;
            return false;
        });
        if (goOnGreen == true)
            window.location.href = userHref;
    }

    var statusInt = 0;
    function go() {

        let btn = $(btnSel);
        if ($(btn).length > 0 && $(btn).hasClass('disabled')) {
            let svg = $(btn).find("svg");
            $(btn).removeClass('disabled');
            $(btn).addClass('active');
            $(btn).removeAttr('aria-disabled');
            $(btn).removeAttr('href');

            $(btn).find("svg").css('fill', fillColor);
            $(btn).css("border", "1px solid red");

            if (allowGoOnGreen == true) {
                $(btn).on('click.xedx', function() {
                    $(btnSel).css("border", "1px solid green");
                    goOnGreen = true;}
                );
            }

            getStatus();
            return;
        }
        if ($(btn).length > 0) return;

        setTimeout(go, 250);
    }

    function getSecsAndAdjust(time) {
        let nowMs = new Date().getTime();
        let now = nowMs / 1000;
        let diffMs = (time*1000) - nowMs;
        let diffSecs = time - now;
        if (diffSecs < intervalTable[0].secsLeft)
            return {diff: diffSecs, diffMs: diffMs, timeout: intervalTable[0].checkEvery};
        else if (diffSecs < intervalTable[1].secsLeft)
            return {diff: diffSecs, diffMs: diffMs, timeout: intervalTable[1].checkEvery};
        else if (diffSecs < intervalTable[2].secsLeft)
            return {diff: diffSecs, diffMs: diffMs, timeout: intervalTable[2].checkEvery};
        else
            return {diff: diffSecs, diffMs: diffMs, timeout: intervalTable[3].checkEvery};
    }

    var ts, type;
    var newTimeout = statusCheckInt;
    var oldTimeout = newTimeout;
    function getStatus() {
        $.ajax({url: url, type: 'GET', data: reqData,
          success: function(data) {
              let jsonObj;
              try {jsonObj = JSON.parse(data);} catch (err) {log("Error: ", err);}
              if (jsonObj && jsonObj.userStatus && jsonObj.userStatus.status) {
                  let status = jsonObj.userStatus.status;
                  ts = status.timestamp;
                  type = status.type;
                  if (type == "hospital") {
                      let rc = getSecsAndAdjust(ts);
                      let remains = rc.diff;
                      let remainsMs = rc.diffMs;
                      newTimeout = rc.timeout;
                      debug("getSecsAndAdjust returned: ", rc);
                      if (newTimeout != oldTimeout) {
                          oldTimeout = newTimeout;
                          debug("Timeout changed at ", rc.diff, " seconds");
                      }

                      if (remainsMs < timeLeftLimit*1000) {
                          debug("Activating at ", rc.diffMs/1000, " seconds");
                          activateBtn();
                          return;
                      }
                      return setTimeout(getStatus, newTimeout);
                  } else {
                      activateBtn();
                  }
              }
          },
          error: function(error) {log("Error: ", error);}
        });

    }

    function addStyles() {
        GM_addStyle(`
           .alert-on {
               animation: blinker .5s step-end infinite alternate;
           }

           @keyframes blinker {
               50% {border: 1px solid rgba(0,255,0,.2);}
           }
           #xtime {
               width: 40px;
               border-radius: 4px;
               margin-right: 5px;
               padding-left: 4px;
           }
           .time-wrap {
               display: flex;
               flex-flow: row wrap;
               align-content: center;
               justify-content: center;
               font-family: arial;
               font-size: 12px;
           }
        `);
    }

    function installUI(retries=0) {
        let hdr = $("#skip-to-content");
        if ($(hdr).length < 1) {
            if (retries++ < 20) return setTimeout(installUI, 250, retries);
            return log("Did find content header...");
        }
        const newDiv = `<div class="time-wrap">
                            <span style="margin-left: 5px;">Btn on at: <input type="number" id="xtime" value="${timeLeftLimit}">secs</span>
                        </div>`;
        $(hdr).css("display", "flex");
        $(hdr).css("flex-flow", "row wrap");
        $(hdr).append(newDiv);
        $("#xtime").on('change', function() {
            timeLeftLimit = $("#xtime").val();
            GM_setValue("timeLeftLimit", timeLeftLimit);
            debug("New xtime value: ", timeLeftLimit);
        });
    }

    function handlePageLoad() {
        addStyles();
        installUI();
        go();
    }

})();




