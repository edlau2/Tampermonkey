// ==UserScript==
// @name         GitHub Sorting
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Allows sorting the displayed repo table by columns
// @author       xedx [2100735]
// @match        https://github.com/*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/js_utils.js
// @xrequire      file:////Users/edlau/Documents/Documents - Ed’s MacBook Pro/Tampermonkey Scripts/Helpers/js_utils.js
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

    GM_addStyle('@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css");');

    debugLoggingEnabled = true;
        //GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function addSortAttrs() {
        let list = $("[id^='folder-row-']");
        debug("[addSortAttrs] list: ", $(list));
        for (let idx=0; idx<$(list).length; idx++) {
            let row = $(list)[idx];
            if (!$(row).hasClass("trow")) $(row).addClass("trow");
            let ageNode = $(row).find('div.react-directory-commit-age > relative-time');
            let ts = $(ageNode).attr("datetime");
            let time = new Date(ts).getTime();

            let nameNode = $(row).find('div.react-directory-filename-cell > div > a');
            let name = $(nameNode).attr("title");
            $(row).attr('data-sort-time', time);
            $(row).attr('data-sort-name', name);

            //debug("row: ", $(row), " ageNode: ", $(ageNode), " nameNode: ", $(nameNode), " ts: ", ts, " time: ", time, " name: ", name);
        }
    }

    var dir = 'asc';
    function doSort(sortAttr) {
        let list = $("[id^='folder-row-']");

        debug("pre-sort: ", list);
        list.sort(function(a, b){
            let attr_a = $(a).attr(sortAttr);
            let attr_b = $(b).attr(sortAttr);

            if (!attr_a || !attr_b) {
                console.error("Missing row attrs, row a: ", $(a), " row b: ", $(b),
                              "\nsortAttr: ", sortAttr, " a: ", attr_a, "b: ", attr_b, " dir: ", dir);
                return 0;
            }

            if (sortAttr == 'data-sort-name') {
                return (dir == 'asc') ? attr_b.localeCompare(attr_a) :
                                        attr_a.localeCompare(attr_b);
            } else {
                return (dir == 'asc') ? Number(attr_a) - Number(attr_b) :
                                        Number(attr_b) - Number(attr_a);
            }
        });

        if (dir == 'asc') dir = 'desc';
        else dir = 'asc';
        debug("post-sort: ", list);

        let orderNum = $(list).length * -1;
        for (let idx=0; idx<$(list).length; idx++) {
            let id = $($(list)[idx]).attr("id");
            $(`#${id}`).css("order", orderNum);

            if (!$(`#${id}`).hasClass("trow")) $(`#${id}`).addClass("trow");
            orderNum++;
        }
    }

    function handleSortClick(e) {
        debug("[handleSortClick] ", $(this));
        let sortAttr = '';
        $(this).find('i').toggleClass('fa-caret-down fa-caret-up');
        if ($(this).parent().hasClass('sort-age')) sortAttr = 'data-sort-time';
        if ($(this).parent().hasClass('sort-name')) sortAttr = 'data-sort-name';

        doSort(sortAttr);
    }

    var observer;
    function installObserver(retries=0) {
        let target = $("table[class*='Table-module_'] tbody");
        if (!$(target).length) {
            if (retries++ < 50) return setTimeout(installObserver, 250, retries);
            return log("[installObserver] timed out");
        }

        $(target).addClass("t100");

        const config = { childList: true, subtree: true };
        const handleAddedNodes = function(mutationsList, observer) {
            let update = false;
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    update = true;
                }
            }

            if (update == true)
                setTimeout(addSortAttrs, 500);
        };

    if (!observer) observer = new MutationObserver(handleAddedNodes);
    observer.observe($(target)[0], config);
    }

    function insertHeaderRowLoader(retries=0) {
        //if ($("#xhdr-row").length > 0) return debug("#xhdr-row already installed!");
        let target = $($('table[class*="Table-module__Box"] > tbody > tr[class*="DirectoryContent-module"]')[0]);
        if (!$(target).length) {
            if (retries++ < 50) return setTimeout(insertHeaderRowLoader, 500, retries);
            return debug("[insertHeaderRowLoader] timed out finding target");
        }
        setTimeout(insertHeaderRow, 2000);
    }
    function insertHeaderRow(retries=0) {
        if ($("#xhdr-row").length > 0) return debug("#xhdr-row already installed!");
        let target = $($('table[class*="Table-module__Box"] > tbody > tr[class*="DirectoryContent-module"]')[0]);
        if (!$(target).length) {
            if (retries++ < 50) return setTimeout(insertHeaderRow, 250, retries);
            return debug("[insertHeaderRow] timed out finding target");
        }

        const toggleBtn = `<span class="sort-btn"><i class="fa fa-caret-down"></i></span>`;
        let row = `
            <tr class="react-directory-row" id="xhdr-row" style="height: 32px; order: -9998;">
                <td class="react-directory-row-name-cell-small-screen" colspan="2"></td>
                <td class="react-directory-row-name-cell-large-screen sortable sort-name" colspan="1">Name: ${toggleBtn} </td>
                <td class="react-directory-row-commit-cell">Commit: </td>
                <td class="sortable sort-age">Age: ${toggleBtn} </td>
            </tr>
        `;

        $(target).after($(row));
        $(".sort-btn").on("click", handleSortClick);

        debug("[insertHeaderRow] target: ", $(target), " row: ", $("#xhdr-row"));

        addSortAttrs();
        installObserver();
    }

    function handlePageLoad(retries=0) {
        let target = $('tbody > tr[class*="DirectoryContent-module"]');
        if (!$(target).length) {
            if (retries++ < 50) return setTimeout(handlePageLoad, 250, retries);
            log("[handlePageLoad] timed out.");
        }
        $(target).css("order", -9999);
        let tableBody = $(target).parent();
        $(tableBody).css({ 'display': 'flex', 'width': '896px', 'flex-direction': 'column'});
        let list = $("[id^='folder-row-']");

        for (let idx=0; idx<$(list).length; idx++) {
            $($(list)[idx]).addClass('trow');
        }

        callOnContentComplete(insertHeaderRowLoader);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    //if (location.href.indexOf('tree/master') < 0)
    //    return console.log("Wrong page: ", location.href);

    addStyles();
    addStyles2();
    callOnContentLoaded(handlePageLoad);

    // Add any styles here
    function addStyles2() {
        GM_addStyle(`
            .trow, #xhdr-row {
                display: flex;
                justify-content: space-between;
            }
            .trow td:nth-child(2),
            #xhdr-row td:nth-child(2) {
                width: 42%;
            }
            .trow td:nth-child(3),
            #xhdr-row td:nth-child(3) {
                width: 42%;
                align-content: center;
                display: grid;
            }
            .trow td:nth-child(4),
            #xhdr-row td:nth-child(4) {
                width: 16%;
                align-content: center;
                display: flex;
                flex-flow: row wrap;
            }
            [class^='table-module'] tbody {
                width: 100%;
            }
            .t100 {
                width: 100%;
            }
            tr.react-directory-row.trow {
                width: 100%;
            }
        `);
    }

    function addStyles() {
        GM_addStyle(`
            .sort-btn {
                /*position: absolute;*/
                cursor: pointer;
                width: 16px;
                height: 16px;
                opacity: 1;
                visibility: visible;
                transition: all .2s ease-in-out;
                align-content: center;
                /*top: 0;
                right: 0;*/
                z-index: 99999;
                margin-left: 20px;
            }
            .sort-btn:hover {
                transform: scale(1.6);
            }
            .sortable {
                position: relative;
            }
        `);
    }

})();



