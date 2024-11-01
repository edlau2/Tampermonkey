// ==UserScript==
// @name         Torn Fast User Lists
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  This script filters a user search for attackable targets
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
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

    var lvlFrom = 50;            // Will set from search params in URL
    var lvlTo = 70;
    var lastAction = 7;
    const maxUsersPerPage = 25;  // How many users to try to find that aren't filtered

    var startPageNum = 0;        // Last page we requested (0, 25, 50, etc)
    var lastSubmittedPageNum = 0;// Last page request sent out by Ajax call
    var lastPageNum= 0;          // Last page in the paginator
    var activePageNum = 0;       // Current page by number. Start value is (pagenum - 1) * 25
    var lastPageRef = "";        // Not used, simple href to the page
    var lastStartRequested = 0;  // Last start page we requested (0, 25, 50, etc)
    var totalUsersAdded = 0;     // Users added to this search result page

    //const lock = `<span><input type="checkbox" id="halloween-lock-box" class="">Scroll Lock</span>
    //              <span><input type="checkbox" id="halloween-no-honors" class="">No Honor Bars</span>
    //             `;

    var noHonorBars = GM_getValue('noHonorBars', false);
    var lockBox = GM_getValue('lockBox', true);
    const xedxDevMode = GM_getValue("xedxDevMode", false);

    // Filters to hide what twe can't attack
    function isInHosp(li) {
        return (li.querySelector("[id^='icon15___']")) ? true : false;
    }
    function isFedded(li) {
        return (li.querySelector("[id^='icon70___']")) ? true : false;
    }
    function isFallen(li) {
        return (li.querySelector("[id^='icon77___']")) ? true : false;
    }
    function isTravelling(li) {
        return (li.querySelector("[id^='icon71___']")) ? true : false;
    }

    function preFilter(li) {
        if (isInHosp($(li)[0])) return true;
        if (isTravelling($(li)[0])) return true;
        if (isFedded($(li)[0])) return true;
        if (isFallen($(li)[0])) return true;

        return false;
    }

    function addTempDivs() {
        log("addTempDivs");
        let resDiv = "<div id='xedx-res-div'></div>";
        let tmpDiv = "<div id='xedx-tmp-div'></div>";
        $("body").after(resDiv);
        $("#xedx-res-div").after(tmpDiv);
    }

    // The LI button, on the honor bar
    function handleLiBtnClick(e) {
        e.preventDefault();
        let target = $(e.currentTarget);
        let url = $(target).attr("href");

        let node = $(target).parent().parent();
        $(node).css("display", "none");
        //$(node).remove();

        window.open(url, '_blank').focus();
        return false;
    }

    function buildBaseLi(user) {
        let newLi = `
            <li class="` + user.classFlash  + ` xv" style="display: flex; flex-direction: row;">
                 <div class='expander clearfix torn-divider divider-vertical'>
                 </div>
                 <div class='level-icons-wrap' style=''">
                     <span class="level">
                        <span class="d-hide bold">Level: ` + user.level + `</span>
                        <span class="value">` + user.level + `</span>
                     </span>
                     <span class="user-icons">
                        <span class="d-hide bold">Status: </span>
                        <span class="icons-wrap icons">
                        </span>
                     </span>
                 </div>
             </li>`;

        return newLi;
    }

    function insertListIntoDiv(users, retries=0) {
        log("insertListIntoDiv, readyState: ", document.readyState, " retries: ", retries);
        if (document.readyState == "loading") {
            if (retries++ < 20) {
                return setTimeout(insertListIntoDiv, 250, users, retries);
                return;
            }
        }

        if (!$("#xedx-res-div").length) {
            addTempDivs();
            if (!$("#xedx-res-div").length) {
                if (retries++ < 20) return setTimeout(insertListIntoDiv, 250, users, retries);
                return;
            }
        }

        let added = 0;
        let filtered = 0;
        for (let idx=0; idx < users.length; idx++) {

            // Build basic LI for user
            let user = users[idx];
            let li = buildBaseLi(user);
            $("#xedx-tmp-div").append(li);

            // Import honor bar, icons, etc from ajax result
            $("#xedx-tmp-div > li > div.expander").html(user.userTags);
            $("#xedx-tmp-div  span.icons-wrap").html(user.IconsList);

            //log("wrap: ", $("#xedx-tmp-div  span.icons-wrap"));

            // Filter out those we can't attack
            li = $("#xedx-tmp-div > li");
            if (preFilter(li) == true) {
                //log("Filtered (1) ==> ", $(li));
                filtered++;
                $("#xedx-tmp-div").empty();
                continue;
            }

            // Add new LI to UL on page
            $("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul").append(li);
            li = $("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul > li." + user.classFlash);
            $(li).on('click', handleLiBtnClick);

            // And add direct link instead of profile page
            let url = "https://www.torn.com/loader.php?sid=attack&user2ID=" + user.userID;
            let sel = "li." + user.classFlash + "> div.expander.clearfix.torn-divider.divider-vertical > a";
            let node = $(sel);

            if (noHonorBars == true) {
                $(node).find("div.honor-text-wrap").remove();
                $(node).text($(node).attr("title"));
            }

            // <a class="user name" href="https://www.torn.com/loader.php?sid=attack&amp;user2ID=664709"
            // title="-BC-Pandemian [664709]" i-data="i_251_247_85_32">-BC-Pandemian</a>

            $(node).attr("href", url);
            $($(node)[0]).on('click', handleLiBtnClick);
            $("#xedx-tmp-div").empty();

           added++;

            if (added + totalUsersAdded >= maxUsersPerPage)
                break;
       }

        log("Added: ", added," filtered: ", filtered);
        totalUsersAdded = totalUsersAdded + added;

        callbackComplete();

        //return added;
    }

    function callbackComplete() {
        log("CallbackComplete");
        let endOfList = (lastPageNum == activePageNum);
        firstPass = false;
        let repeat = true;
        if (totalUsersAdded >= maxUsersPerPage) repeat = false;
        if (endOfList) repeat = false;
        if (startPageNum+25 >= ((lastPageNum - 1) * 25)) repeat = false;
        //if (totalUsersAdded < maxUsersPerPage && !endOfList && ((startPageNum + 25) < ((lastPageNum - 1) * 25))) {
        if (repeat == true) {
            startPageNum = parseInt(startPageNum) + 25;
            doAjaxPost(startPageNum);
            return;
        }

        log("Finished, totalUsersAdded: ", totalUsersAdded," last start num: ", lastSubmittedPageNum);
        log("Last start num: ", lastSubmittedPageNum, " (page ", (+lastSubmittedPageNum/25) + 1, ")");

        let paginators = $("#mainContainer .pagination");
        if ($(paginators).length) {
            for (let idx=0; idx < $(paginators).length; idx++) {
                let clone = $("#xedx-res-div .pagination").clone(true);
                $($(paginators)[idx]).replaceWith($(clone));
            }

            addPaginationHandlers();
        }

        // All done for now
        firstPass = true;
        totalUsersAdded = 0;
    }

    var firstPass = false;
    function ajaxSearchCB(response, status, xhr, params) {
        log("AJAX CB, response: ", response);
        log("AJAX CB, params: ", params);

        if (!response || response.success != true) {
             console.error("Error in ajax response!");
            return;
        }

        if (firstPass == true) {
            $("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul > li").css("display", "none");
        }

        // Grab current paginators
        let paginators = $("#mainContainer .pagination");
        //log("Paginators: ", $(paginators));

        // Import paginator
        $("#xedx-res-div").empty();
        $("#xedx-res-div").html(response.pagination);

        // Get last, current page
        let lastPage = $("#xedx-res-div a.page-number.last");
        let currPage = $("#xedx-res-div a.page-number.active");

        lastPageNum = parseInt($(lastPage).attr("page"));
        activePageNum = parseInt($(currPage).attr("page"));
        let endOfList = (lastPageNum == activePageNum);
        //log("lastPageNum: ", lastPageNum, " activePageNum: ", activePageNum, " endOfList: ", endOfList);

        if (firstPass == true) {
            $("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul").empty();
        }

        let users = response.list;
        log("readystate: ", document.readyState);
        if (users.length) {
            insertListIntoDiv(users);
        }
    }

    function doAjaxPost(startNum, init=false) {
        let postData = {
            sid: "UserListAjax",
            levelFrom: lvlFrom,
            levelTo: lvlTo,
            lastAction: lastAction,
            searchConditions: "inHospital",    // Might as well let Torn do some filtering
            searchConditionNot: "true",
            start: startNum,
            init: init,
        };

        lastSubmittedPageNum = startNum;
        log("[doAjaxPost] postData: ", postData);

        $.ajax({
            url: "https://www.torn.com/page.php?rfcv=67177f6049e99",
            type: 'POST',
            data: postData,
            callback: ajaxSearchCB,
            success: function (response, status, xhr) {
                ajaxSearchCB(response, status, xhr, postData);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                log("Error in doAjaxPost: ", textStatus);
                log("Error thrown: ", errorThrown);
            }
        });
    }

    function doReload(init) {
        firstPass = true;
        doAjaxPost(startPageNum, init);
    }

    function pageBtnHandler(e) {
        let target = $(e.currentTarget);
        debug("pageBtnHandler, target: ", $(target));
        let page = $(target).attr("page");
        let href = $(target).attr("href");

        startPageNum = (parseInt(page) - 1) * 25;
        debug("**** Page: ", page, " start: ", startPageNum, " href: ", href);

        $(".page-number.active").removeClass("active");
        $("target").addClass("active");
        doAjaxPost(startPageNum);
        return false;
    }

    function addPaginationHandlers() {
        let pageBtns = $("a.page-number");
        $(pageBtns).on('click', pageBtnHandler);
    }

    function handleLockClick(e) {
        //let lockTarget = $("#xusers-btns");
        let lockTarget = $(".user-info-list-wrap")[0];
        $(lockTarget).toggleClass("xedx-locked");
        GM_setValue('lockBox', $("#halloween-lock-box").prop('checked'));
        lockBox = GM_getValue('lockBox', lockBox);
    }

    function handleNoHonorsClick(e) {
        GM_setValue('noHonorBars', $("#halloween-no-honors").prop('checked'));
        noHonorBars = GM_getValue('noHonorBars', noHonorBars);
    }

    function addBtn(retries=0) {
        if ($("#xusers-btns").length > 0) return;
        
        let buttonsDiv = `
                        <span id="xusers-btns" style="position: absolute; left: 0;">
                            <input id="xedx-reload" type="submit" class="xedx-torn-btn"
                             style="display: inline-flex; justify-content: center;" value="Refresh">
                        </span>
                        <span class="xml10">
                            <input id="xedx-next" type="submit" class="xedx-torn-btn"
                             style="display: inline-flex; justify-content: center;" value="next">
                        </span>
                        <span><input type="checkbox" id="halloween-lock-box" class="xul-input xmr10">Scroll Lock</span>
                        <span><input type="checkbox" id="halloween-no-honors" class="xul-input xmr10">No Honor Bars</span>
                        `;

        if ($("#skip-to-content").length) {
            $("#skip-to-content").after(buttonsDiv);
        } else {
            if (retries++ < 30) return setTimeout(addBtn, 100, retries);
            return;
        }

        //$("#xedx-reload").after(nextButton);

        $("#xedx-reload").parent().parent().css("position", "relative");
        $("#xedx-reload").on('click', function() {
            $("#xedx-res-div").empty();  // not needed here...
            doAjaxPost(lastSubmittedPageNum);
        });

        $("#xedx-next").on('click', function() {
            $("#xedx-res-div").empty(); // not needed here...
            startPageNum += 25;
            doReload();
        });

        log("addBtns, lockbox: ", lockBox, " honors: ", noHonorBars);

        $("#halloween-lock-box").prop('checked', lockBox);
        $("#halloween-lock-box").on('click.xedx', handleLockClick);
        displayHtmlToolTip($("#halloween-lock-box"),
               "Checking this will lock the <br>scroll action.", "tooltip4");


        $("#halloween-no-honors").prop('checked', noHonorBars);
        $("#halloween-no-honors").on('click.xedx', handleNoHonorsClick);
        displayHtmlToolTip($("#halloween-no-honors"), "Checking this will hide honor <br>bars for faster loading.", "tooltip4");
    }

    function stickyDivs(retries=0) {
        if (lockBox == false) return;
        let target = $(".user-info-list-wrap")[0];
        if(!$(target).length) {
            if (retries++ < 10) {
                return setTimeout(stickyDivs, 250);
            }
            log("Too many attempts...");
        } else {
            $(target).addClass("xedx-locked");
        }
    }

    function parseHref() {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.levelFrom) lvlFrom = queryParams.levelFrom;
        if (queryParams.levelTo) lvlTo = queryParams.levelTo;
        if (queryParams.lastAction) lastAction = queryParams.lastAction;

        const hash = window.location.hash ?
              window.location.hash.substring(1) : undefined;
        if (hash && hash.indexOf("start") > -1) {
            let parts = hash.split("=");
            startPageNum = parseInt(parts[1]);
        }

        log("Parsed URL, lvlFrom: ", lvlFrom, " to: ",  lvlTo,
            " LA: ", lastAction, " start: ", startPageNum);
    }

    function addStyles() {
        addToolTipStyle();
        loadCommonMarginStyles();

        GM_addStyle(`
           .xedx-locked {
               max-height: 95vh;
               overflow-y: auto !important;
               top: 0px;
               position: sticky;
           }
           .xul-input {
                /*margin: 5px 10px 0px 0px;*/
                top: 3px;
                left: 5px;
                cursor: pointer;
                /*opacity: 0;*/
                z-index: 9999999;
                position: relative;
            }
            .xul-input:hover {
                opacity: 1;
            }
           .disable-scrollbars::-webkit-scrollbar {
                background: transparent; /* Chrome/Safari/Webkit */
                width: 0px;
            }
            .disable-scrollbars {
              scrollbar-width: none; /* Firefox */
              -ms-overflow-style: none;  /* IE 10+ */
            }
        `);
    }

    function handlePageLoad() {
        log("Dev Mode, adding buttons");
        addBtn();

        if (!$("#xedx-res-div").length) {
            addTempDivs();
        }

        // Here or after initial ajax result?
        addPaginationHandlers();
        stickyDivs();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");
    versionCheck();

    if (location.href.indexOf("UserList") < 0) return;

    parseHref();

    // $( 'div' ).not( ".test" );
    // $("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul > li").css("display", "none");

    GM_addStyle(`
        #mainContainer > div.content-wrapper > div.userlist-wrapper > ul > li:not(.xv) {
            display: none !important;
        }
    `);

    doReload(true);

    addStyles();

    callOnHashChange(handlePageLoad);
    installPushStateHandler(handlePageLoad);

    callOnContentComplete(handlePageLoad);

})();