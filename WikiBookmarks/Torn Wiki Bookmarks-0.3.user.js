// ==UserScript==
// @name         Torn Wiki Bookmarks
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Add a 'favorites'/'Bookmarks' selection to the Wiki
// @author       xedx [2100735]
// @match        https://wiki.torn.com/*
// @connect      api.torn.com
// @require      https://code.jquery.com/jquery-3.6.3.min.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const instTopDiv = `<div id="footer"><span id="jmpbtn"><input type="button" class="xbtn" value="jump"></span></div>`;
    const jump = () => {$("html,body").scrollTop(0);}

    const mainKey = "Bookmarks";

    var favsDiv = `<div class="wrapper"><div class="dropdown">
                      <button>Profile</button>
                      <div class="dropdown-options">
                        <a href="#">Dashboard</a>
                        <a href="#">Setting</a>
                        <a href="#">Logout</a>
                      </div>
                    </div></div>`;

    var favsDiv2 = `<div class="wrapper">
                        <select id="xedx-select" class="xborder card test">
                          <option value="title">Bookmarks</option>
                          <option value="clr">Clear All</option>
                        </select>
                        <button id="xadd" class="smbtn">Add</button>
                        <button id="xdel" class="smbtn">Del</button>
                    </div>`;

    function updateOpts() {
        //$("#xedx-select").remove("option[data|='x']");
        //insertSavedBookmarks();
    }

    // Handle an option (bookmark) being selected
    function handleSelect() {
        log("[anon change] this: ", this); 
        let href = $(this).val();
        log("href: ", href);

        // special case
        if (href == "clr") return clearAllBookmarks();
        if (href == "title") return;

        if (!href) return;

        window.location.href = href;
    }

    function selectTitle() {
        $("#xedx-select").val("title").change();
    }

    function installUI() {
        $("#p-search").after(favsDiv2);

        insertSavedBookmarks();

        $("#xadd").on('click', bookmarkThisPage);
        $("#xdel").on('click', removeThisPage);
        //$("#xall").on('click', clearAllBookmarks);
        $("#xedx-select").change(handleSelect);
    }

    function makeOption(name, url) {
        return  '<option id="x' + name +'" data="x" value="' + url + '">' + name + '</option>';
    }

    // <option value="/wiki/Weapon_Bonus">Weapon Bonus</option>
    function insertSavedBookmarks() {
        let bookmarks = getBookmarkArray();
        if (!bookmarks) return;
        for (let obj of bookmarks) {
            if (obj.name && obj.url) {
                let elem = makeOption(obj.name, obj.url);
                $("#xedx-select").append(elem);
            }
        }
    }

    // Bookmark current page (Add button)
    function bookmarkThisPage() {
        let path = window.location.pathname;
        let title = $("#firstHeading").text().trim();
        if (!title || !path) return;

        if (addBookmark(title, path)) {
            let elem = makeOption(title, path);
            $("#xedx-select").append(elem);
            updateOpts();
        }
    }

    // Remove bookmark for this page, if exists
    function removeThisPage() {
        let path = window.location.pathname;
        let title = $("#firstHeading").text().trim();

        removeBookmark(title);
        updateOpts();
    }

    // Make sure no dups! Add fn to see if in array...
    function addBookmark(dispName, url) {
        let json = GM_getValue(mainKey, JSON.stringify({Bookmarks:[]}));
        let curr = JSON.parse(json);

        let res = curr[mainKey].filter(obj => obj.name == dispName);
        log("dup check: ", res, " len: ", res.length, " 0: ", res[0]);
        if (res[0] || res.length) return false;

        log("curr: ", curr);
        let newBM = {name: dispName, url: url};
        curr[mainKey].push(newBM);
        GM_setValue(mainKey, JSON.stringify(curr));
        getBookmarkArray();

        return true;
    }

    function saveBookmarkArray(array) {
        let newObj = {Bookmarks:[array]};
        GM_setValue(mainKey, JSON.stringify(newObj));
    }

    function clearAllBookmarks() {
        GM_setValue(mainKey, JSON.stringify({Bookmarks:[]}));
        updateOpts();

        let arr = getBookmarkArray();
        for (let obj of arr) {
            let ID = "#x" + obj.name;
            log("ID: ", ID);
            $(ID).remove();
        }

        selectTitle();
    }

    function removeBookmark(name) {
        let bookmarks = getBookmarkArray();
        log("remove, obj: ", bookmarks);

        let resArray = bookmarks.filter(obj => obj.name != name);
        log("res: ", resArray);
        saveBookmarkArray(resArray);

        log("after: ", getBookmarkArray());

        let ID = "#x" + name;
        log("ID: ", ID);
        $(ID).remove();
    }

    function getBookmarkArray() {
        let json = GM_getValue(mainKey, JSON.stringify({mainKey:[]}));
        let curr = JSON.parse(json);
        if (curr) {
            let bookmarks = curr[mainKey];
            log("get array: ", bookmarks);
            return bookmarks;
        }
    }

    function handlePageLoad() {
        // Install jump to top button
        $("#body").after(instTopDiv);
        $("#jmpbtn").on('click', jump);

        installUI();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    addStyles();

    callOnContentLoaded(handlePageLoad);

    //////////////////////////////////////////////////////////////////////
    // CSS stuff.
    //////////////////////////////////////////////////////////////////////

    function addStyles() {
        GM_addStyle(`
            .dropdown {
                display: inline-block;
                position: relative;
                }
            .dropdown-options {
                display: none;
                position: absolute;
                overflow: auto;
                }
            .dropdown:hover .dropdown-options {
                display: block;
                opacity: 1.0;
                }
            .wrapper{
                display: flex;
                justify-content: center;
                align-items:center;
                width: 100%;
                height: auto;
                margin-top: 5px;
                }
            .xborder {
                border-radius: 5px;
                border: 1px solid darkgray;
            }
            .test {
                xbackground: rgba(0, 0, 0, 0.3);
                xcolor: #fff;
                background-color: #f2f2f2;
                border: 1px solid black;
                border-radius: 5px;
                }
            .select .option {
                  margin: 40px;
                  background: rgba(0, 0, 0, 0.3);
                  color: #fff;
                  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
                  outline:none;
                }
            .option:focus, .option:active {
                background-color:#FFF;
                outline:none;
                border:none;
                box-shadow:none;
                }
            .bkg-gray {
                background-color: #f2f2f2;
                font-size: 15px;
                padding: 10px 40px 10px 12px;
                z-index: 1;
                border-radius: 5px;
                }
            .smbtn {
                margin-left: 5px;
                height: 22px;
                display: inline-flex;
                justify-content: center;
                align-items: center;
                border-radius: 5px;
                border: 1px solid black;
                }
            .xbtn {
               border-radius: 5px;
               width: 40px;
               opacity: 0.5;
               color: white;
               background-color: black;
            }
            `);
    }


})();