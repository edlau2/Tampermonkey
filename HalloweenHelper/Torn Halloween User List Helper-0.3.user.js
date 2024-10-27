// ==UserScript==
// @name         Torn Halloween User List Helper
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  This script filters a user search for attackable targets
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
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

    const xedxDevMode = GM_getValue("xedxDevMode", false);

    function preFilter(li) {
        let useLi = $(li)[0];
        if (useLi.querySelector("[id^='icon15__']")) return true; // hosp
        if (useLi.querySelector("[id^='icon70__']")) return true; // fedded
        if (useLi.querySelector("[id^='icon71__']")) return true; // abroad
        if (useLi.querySelector("[id^='icon77__']")) return true; // fallen

        return false;
    }

    // The LI button, on the honor bar
    function handleLiBtnClick(e) {
         let target = $(e.currentTarget);
         let url = $(target).attr("href");

         $(target).parent().parent().attr("style", "display: none; height: 0px; opacity: 0;");
         $(target).parent().parent().remove();

         window.open(url, '_blank').focus();
         return false;
    }

    function buildBaseLi(user) {
        let newLi = `
            <li class="` + user.classFlash  + `" style="display: flex; flex-direction: row;">
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

    function insertListIntoDiv(users) {
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

            // And add direct link instead of profile page
            let url = "https://www.torn.com/loader.php?sid=attack&user2ID=" + user.userID;
            let sel = "li." + user.classFlash + "> div.expander.clearfix.torn-divider.divider-vertical > a";
            let node = $(sel);

            $(node).attr("href", url);
            $($(node)[0]).on('click', handleLiBtnClick);
            $("#xedx-tmp-div").empty();

           added++;

            if (added + totalUsersAdded >= maxUsersPerPage)
                break;
       }

        log("Added: ", added," filtered: ", filtered);
        totalUsersAdded = totalUsersAdded + added;
        return added;
    }

    var firstPass = false;
    function ajaxSearchCB(response, status, xhr, params) {
        log("AJAX CB, response: ", response);

        if (!response || response.success != true) {
             console.error("Error in ajax response!");
            return;
        }

        // Grab current paginators
        let paginators = $("#mainContainer .pagination");
        log("Paginators: ", $(paginators));

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
        if (users.length) {
            insertListIntoDiv(users);
        }

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

    function doAjaxPost(startNum) {
        let postData = {
            sid: "UserListAjax",
            levelFrom: lvlFrom,
            levelTo: lvlTo,
            lastAction: lastAction,
            searchConditions: "inHospital",    // Might as well let Torn do some filtering
            searchConditionNot: "true",
            start: startNum,
        };

        lastSubmittedPageNum = startNum;
        log("[doAjaxPost] postData: ", postData);

        $.ajax({
            url: "https://www.torn.com/page.php?rfcv=67177f6049e99",
            type: 'POST',
            data: postData,
            callback: ajaxSearchCB,
            success: function (response, status, xhr) {
                ajaxSearchCB(response, status, xhr);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                log("Error in doAjaxPost: ", textStatus);
                log("Error thrown: ", errorThrown);
            }
        });
    }

    function doReload() {
        firstPass = true;
        doAjaxPost(startPageNum);
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

    function addBtn(retries=0) {
        let reloadButton = `<span style="position: absolute; left: 0;">
                            <input id="xedx-reload" type="submit" class="xedx-torn-btn xx123"
                             style="display: inline-flex; justify-content: center;" value="start">
                        </span>`;
        let nextButton = `<span style="">
                            <input id="xedx-next" type="submit" class="xedx-torn-btn xx123"
                             style="display: inline-flex; justify-content: center;" value="next">
                        </span>`;

        if ($("#skip-to-content").length) {
            $("#skip-to-content").after(reloadButton);
        } else {
            if (retries++ < 10) return setTimeout(addBtn, 250, retries);
            return;
        }

        $("#xedx-reload").after(nextButton);

        $("#xedx-reload").parent().parent().css("position", "relative");
        $("#xedx-reload").on('click', function() {
            $("#xedx-res-div").empty();  // not needed here...
            doReload();
        });

        $("#xedx-next").on('click', function() {
            $("#xedx-res-div").empty(); // not needed here...
            startPageNum += 25;
            doReload();
        });
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

    function handlePageLoad() {
        let list = $("ul.user-info-list-wrap > li > div > a.user.name");
        if (!list.length) return setTimeout(handlePageLoad, 500);

        // This adds the attack link to currently loaded page
        for (let idx=0; idx<list.length; idx++) {
            let node = list[idx];
            let li = $(node).parent().parent();
            if (!$(node).length) continue;
            let href = $(node).attr("href");
            if (!href) continue;
            if (preFilter(li) == true) {
                $(li).attr("style", "display: none;");
                continue;
            }

            let parts = href.split("=");
            let url = "https://www.torn.com/loader.php?sid=attack&user2ID=" + parts[1];
            $(node).attr("href", url);
            $($(node)[0]).on('click', function() {
                window.open(url, '_blank').focus();
                return false;
            });
        }

        if (xedxDevMode == true) {
            log("Dev Mode, adding buttons");
            addBtn();
            // set style to display: none ?
            let resDiv = "<div id='xedx-res-div'></div>";
            let tmpDiv = "<div id='xedx-tmp-div'></div>";
            $("body").after(resDiv);
            $("#xedx-res-div").after(tmpDiv);

            // Here or after initial ajax result?
            addPaginationHandlers();
        }
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

    callOnHashChange(handlePageLoad);
    installPushStateHandler(handlePageLoad);

    callOnContentComplete(handlePageLoad);

})();