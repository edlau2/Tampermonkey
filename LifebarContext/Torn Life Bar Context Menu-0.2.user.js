// ==UserScript==
// @name         Torn Life Bar Context Menu
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @xrequire      file:////Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers-2.45.3.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
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

    const itemsUrl = "https://www.torn.com/item.php";
    const medItemsUrl = itemsUrl + "#medical-items";

    const myMenuId = "xlifecm";              // ID of context menu
    const myMenuSel = "#" + myMenuId;

    const myListSel = myMenuSel + " > ul";   // Selector of UL to add menu items to
    const myOptsSel = "#life-bar-opts";      // Selector for options page


    function handlePageLoad() {
        log("Page href: ", location.href);
        log("Page hash: ", location.hash);

        let lifeBarNode = $("#sidebar").find("a[class*='life__']")[0];
        log("lifeBarNode: ", lifeBarNode);

        installContextMenu(lifeBarNode, myMenuId);
        $(myMenuSel).addClass("ctxhide");
        $(myMenuSel).addClass("xopts-border-89");

        // Our menu is automatically displayed on right-click
        // Add left-click which canbe configured by the opts dialog
        $(lifeBarNode).on('click', leftClickHandler);
        insertMenuItems();

        log("My menu: ", $(myMenuSel));

        // Hidden options screen
        //addOptionsDiv();

    }

    // Configurable behaviour
    function leftClickHandler() {
        log("leftClickHandler");
    }

    function insertMenuItems() {
        let itemsLi = `<li class="medItems"><a href="` + medItemsUrl + `">Med Items</a></li>`;
        let helaLi = `<li class="xhela"><a>HeLa Revive</a></li>`;
        let optsLi = `<li class="xcm-opts"><a>Options</a></li>`;
        $(myListSel).append(itemsLi);
        $(myListSel).append(helaLi);
        $(myListSel).append(optsLi);


        $(".xhela").on('click', submitHelaRequest);
        $(".xcm-opts").on('click', handleOptsSelection);
    }


    // ****************************** Experimental: overlaid options menu/div ***********************
    // Note: couldn't exchange data with popup due to content security
    //

    const toggleClass = function(sel, classA, classB) {
        if ($(sel).hasClass(classA)) {$(sel).removeClass(classA).addClass(classB);} else {$(sel).removeClass(classB).addClass(classA);}}
    const showMenu = function () {log("showMenu"); $(myMenuSel).removeClass("ctxhide").addClass("ctxshow");}
    const hideMenu = function () {log("hideMenu"); $(myMenuSel).removeClass("ctxshow").addClass("ctxhide");}
    const showOpts = function () {log("showOpts"); $(".xrflex").removeClass("ctxhide").addClass("xshow-flex");}
    const hideOpts = function () {log("hideOpts"); $(".xrflex").removeClass("xshow-flex").addClass("ctxhide");}
    //const showOpts = function () {log("showOpts"); $(myOptsSel).css("display", "flex");}
    //const hideOpts = function () {log("hideOpts"); $(myOptsSel).css("display", "none");}

    function doSwap() {
        // Test:
        //toggleClass(myMenuSel, "ctxHide", "ctxShow");
        //toggleClass(".xrflex", "ctxHide", "xshow-flex");

        if ($(myMenuSel).css("display") == "none" || $(myOptsSel).css("display") == "block") {
            showMenu();
            hideOpts();
        } else {
            hideMenu();
            showOpts();
        }
    }

    var hasBeenSaved = false;
    function doSave() {

        hasBeenSaved = true;
        if (confirm("Options saved!\nClose?"))
            doSwap();
    }

    function doCancel() {
        doSwap();
    }

    function handleOptsSelection(event) {
        console.log("Jail Scores: handleOptsSelection");
        if ($("#life-bar-opts").length == 0) {
            let optsDiv = getLifeBarOptsDiv();
            $("body").prepend(optsDiv);
            log("Prepended: ", $(myOptsSel));

            //$("body").after(myMenuSel);
            //log("Inserted after: ", $(myMenuSel));

            // Handlers for save and cancel buttons
            $("#opts-save").on('click', doSave);
            $("#opts-cancel").on('click', doCancel);

            // Default tab/same page behaviour radio button group
            $('input[name="tab-select"]').on("click", function() {
                hasBeenSaved = false;
                let tabOrPage = $('input[name = "tab-select"]:checked').val();
                alert(tabOrPage);
            });

            // Default left-click behaviour radio button group
            $('input[name="def-go"]').on("click", function() {
                hasBeenSaved = false;
                let defLeftClick = $('input[name = "def-go"]:checked').val();
                alert(defLeftClick);
            });
        }

        hideMenu();
        showOpts();
    }

    // ****************************** End Experimental: overlaid options menu/div ***********************

    // ******** taken from teh HeLa revive script ***********
    const owner = "HeLa";
    const source = "HeLa Script";
    const API_URL = 'https://api.no1irishstig.co.uk/request';

    function submitHelaRequest(e) {
          //e?.preventDefault();

          const sessionData = getSessionData();
          if (!sessionData.hospital) {
            alert('You are not in the hospital.');
            return;
          }

          //btn.setAttribute('disabled', true);
          //btn.setAttribute('aria-pressed', true);

          GM.xmlHttpRequest({
            method: 'POST',
            url: API_URL,
            headers: {
              'Content-Type': 'application/json',
            },
            data: JSON.stringify({
              'tornid': parseInt(sessionData.userID),
              'username': '' + sessionData.userName,
              "vendor": owner,
              'source': `${source} ${GM_info.script.version}`,
              'type': 'revive'
            }),
            onload: handleResponse,
          });
    }

    function handleResponse(response) {
      if (response?.status && response.status !== 200) {
        var responseText = response.responseText.replace(/^"|"$/g, '');
        alert(`Error Code: ${response.status}\nMessage: ${responseText}` || `An unknown error has occurred - Please report this to ${owner} leadership.`);
        return;
      }

      let contract = false;
      try {
        contract = !!JSON.parse(response.responseText).contract;
      } catch (e) {
      }

      if (contract) {
        alert(`Contract request has been sent to ${owner}. Thank you!`)
      } else {
        alert(`Request has been sent to ${owner}. Please pay your reviver a Xanax or $1m. Thank you!`);
      }
    }

    function getSessionData() {
        const sidebar = Object.keys(sessionStorage).find((k) => /sidebarData\d+/.test(k));
        const data = JSON.parse(sessionStorage.getItem(sidebar));
        return {
            userID: data.user ? data.user.userID : undefined,
            userName: data.user ? data.user.name : undefined,
            mobile: data.windowSize === 'mobile',
            hospital: data.statusIcons?.icons?.hospital,
        };
    }

    // ====================== End from the HeLa revive script =========================

    // ================================ Options dialog ================================


    function getLifeBarOptsDiv() {

        const alignLeft = ` align-content: flex-start !important; `;
        const alignCenter = ` align-content: center; `;
        const justifyCenter = ` justify-content: center; `;
        const flexCol = ` flex-direction: column; `;
        const flexRow = ` flex-direction: row; `;

        const bBlue = " border: 2px solid blue;";
        const bGreen = " border: 2px solid green;";
        const bRed = " border: 2px solid red;";
        const bYellow = " border: 2px solid yellow;";

        let flexRowStyle = ` minimum-height: 24px !important; `;
        flexRowStyle += ` padding-top: 15px !important; `;

        // Note: the xrflex is a dummy class used to remove the !impotant flex claas so it can be
        // over-ridden by the display: none class (ctxhide)
        //
        // xlb-opts-bg: life bar background, border, z-order
        // xedx-ctr-screen: position, transforms - to center outer div
        GM_addStyle(`
            .xfmt-font-blk input {
                margin-right: 10px;
            }
            .xbig-border {
                border: 3px solid darkslategray;
            }
            `);

        GM_addStyle(`
            .temp-3d {
                      transform:
                        rotateX(51deg)
                        rotateZ(43deg);
                      transform-style: preserve-3d;
                      border-radius: 32px;
                      box-shadow:
                        1px 1px 0 1px #f9f9fb,
                        -1px 0 28px 0 rgba(34, 33, 81, 0.01),
                        28px 28px 28px 0 rgba(34, 33, 81, 0.25);
                      transition:
                        .4s ease-in-out transform,
                        .4s ease-in-out box-shadow;

                      &:hover {
                        transform:
                          translate3d(0px, -16px, 0px)
                          rotateX(51deg)
                          rotateZ(43deg);
                        box-shadow:
                          1px 1px 0 1px #f9f9fb,
                          -1px 0 28px 0 rgba(34, 33, 81, 0.01),
                          54px 54px 28px -10px rgba(34, 33, 81, 0.15);
                      }
                    }`);

        const lifeBarOptsDiv = `
                 <div id="life-bar-opts" class="xopt-border-ml8 xopts-ctr-screen xfmt-font-blk x-ez-scroll xopts-bg xopts-def-size xrflex ctxhide">

                     <div class="xshow-flex lb-flex xrflex" style="` + flexCol + `">

                         <div class="xshow-flex xrflex" style="` + flexCol + alignLeft + `">
                             <span class="xfmt-hdr-span">
                                 Select how to open the medical items page
                             </span>

                             <span class="xfmt-span xopts-black"><input name="tab-select" type="radio" value="tab">Open med items page in new tab</span>
                             <span class="xfmt-span info-msg msg"><input name="tab-select" type="radio" value="page">Open med items page in same page</span>

                             <span class="break"></span>

                             <span class="xfmt-hdr-span">
                                 Select default options for left-click (if any)
                             </span>

                             <span class="break"></span>

                             <span class="xfmt-span"><input name="def-go" type="radio" value="med">Go to medical items page</span>
                             <span class="xfmt-span"><input name="def-go" type="radio" value="hela">Request revive from HeLa</span>
                             <span class="xfmt-span"><input name="def-go" type="radio" value="none">Nothing</span>

                             <span class="break"></span>

                             <span class="xfmt-hdr-span">
                                 Just a few checkboxes that do nothing.
                             </span>

                             <span class="xfmt-span"><input type="checkbox" id="chk-box" class="xedx-cb-opts xmr20" name="chk-box">Test</span>
                             <span class="xfmt-span"><input type="checkbox" id="chk-box2" class="xedx-cb-opts xmr20" name="chk-box">Test2</span>
                             <span class="xfmt-span"><input type="checkbox" id="chk-box3" class="xedx-cb-opts xmr20" name="chk-box">Test3</span>

                             <span class="break"></span>
                         </div>

                         <div class="xshow-flex xrflex" style="` + flexRowStyle + flexRow + alignCenter + justifyCenter + `">
                             <button id="opts-save" class="xedx-torn-btn xmr10">Save</button>
                             <button id="opts-cancel" class="xedx-torn-btn xml10">Cancel</button>
                         </div>
                     </div>

                 </div>
                 `;

        return lifeBarOptsDiv;
    }

    function addStyles() {

        addTornButtonExStyles();
        addFloatingOptionsStyles();
        loadCommonMarginStyles();
        loadMiscStyles();
        addBorderStyles();

        GM_addStyle(`
            .lb-flex,
            .lb-flex > div {
                width: 100% !important;
            }
        `);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    //versionCheck();

    if (isAttackPage()) return;
    if (abroad() || travelling()) return;

    addStyles();

    callOnContentLoaded(handlePageLoad);

})();