// ==UserScript==
// @name         Torn OC Sort
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Sort crimes in planning by time remaining
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    debugLoggingEnabled = false;

    const isOcPage = function () {return location.hash ? (location.hash.indexOf("tab=crimes") > -1) : false;}
    const hashChangeHandler = function () {handlePageLoad();}
    const sortList = function () {tinysort($(scenarios), {attr:'data-time'});}
    const btnIndex = function () {return $("#faction-crimes [class^='buttonsContainer_'] > [class*='active_']").index();}

    var userId;
    var scenarios;
    var scrollTimer;
    var sortTimer;

    // Compare two arrays: see what is in array1 but not in array2
    function arrayDiff(array1, array2) {
        const result = array1.filter(obj1 =>
          !array2.some(obj2 => obj1 === obj2)
        );
        return result;
    }

    // Make yourself easier to spot on the page.
    function highlightSelf() {
        let me = $(`a[class^="slotMenu"][href*="XID=${userId}"]`);
        let wrapper = $(me).closest("[class^='wrapper_']");
        $(wrapper).addClass("xoc-myself");
    }

    // Do the sorting
    function tagAndSortScenarios() {
        scenarios = $("[class^='scenario_']");
        let listRoot = $($(scenarios)[0]).parent().parent();

        for (let idx=0; idx<$(scenarios).length; idx++) {
            let scenario = $(scenarios)[idx];
            let elem = $(scenario).find("[class^='wrapper_'] > div > p");
            let text = $(elem).text();
            if (text) {
                text = text.slice(0, 11);
                let parts = text.split(":");
                let totalSecs = (parts[0] * 24 * 60 * 60) + (parts[1] * 60 * 60) +
                    (parts[2] * 60) + parts[3];

                $(scenario).attr("data-time", totalSecs);
            }
        }
        sortList();

        if (!$(".xoc-myself").length) highlightSelf();
    }

    function initialScenarioLoad(retries=0) {
        scenarios = $("[class^='scenario_']");
        if ($(scenarios).length == 0) {
            if (retries++ < 20) return setTimeout(initialScenarioLoad, 250, retries);
            return debug("Didn't find any scenarios!");
        }

        tagAndSortScenarios();

        $(window).on('scroll', function() {
            clearTimeout(sortTimer);
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function() {
                sortTimer = setTimeout(tagAndSortScenarios, 250);
            }, 250);
        });
    }

    function handlePageLoad(retries=0) {
        debug("handlePageLoad");
        if (!isOcPage()) return log("Not on crimes page, going home");

        let root = $("#faction-crimes");
        if ($(root).length == 0) {
            if (retries++ < 20) return setTimeout(handlePageLoad, 250, retries);
            return log("Didn't find root!");
        }
        setTimeout(initialScenarioLoad, 500);
    }

    //====================== API calls ===================================
    //
    var missingMembers;
    var facMembersJson = {};
    var plannedCrimeMembers = [];
    var facMembersArray = [];

    var facMembersDone = false;
    var crimeMembersDone = false;

    function plannedCrimesCb(responseText, ID, param) {
        let jsonObj = JSON.parse(responseText);
        let crimes = jsonObj.crimes;
        crimes.forEach(function (crime, index) {
            crime.slots.forEach(function (slot, index) {
                if (slot.user_id) plannedCrimeMembers.push(slot.user_id);
            });
        });

        debug("Members in crimes: ", plannedCrimeMembers.length);

        if (param == "planning") {
            doFacOcQuery("recruiting");
        } else {
            if (facMembersDone == true) {
                missingMembers = arrayDiff(facMembersArray, plannedCrimeMembers);
                buildMissingMembersUI();
            }
            crimeMembersDone = true;
        }
    }

    function doFacOcQuery(category) {
        var options = {"cat": category, "offset": "0", "param": category};
        xedx_TornFactionQueryv2("", "crimes", plannedCrimesCb, options);
    }

    function facMemberCb(responseText, ID, param) {
        let jsonObj = JSON.parse(responseText);
        let membersArray = jsonObj.members;
        membersArray.forEach(function (member, index) {
            if (member.id) {
                facMembersArray.push(member.id);
                facMembersJson[member.id] = member.name;
            }
        });

        debug("Fac members: ", facMembersArray.length);

        if (crimeMembersDone == true) {
                missingMembers = arrayDiff(facMembersArray, plannedCrimeMembers);
                buildMissingMembersUI();
            }
            facMembersDone = true;
    }

    function getFacMembers() {
        xedx_TornFactionQueryv2("", "members", facMemberCb);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    userId = getThisUserId();
    debug("User ID: ", userId);
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();
    addStyles();

    // Kick off calls to get fac members in an OC as well
    // as all our current members, diff is those not in an OC.
    // https://api.torn.com/v2/faction/crimes?key=4ZMAvIBON4zZLrd9&cat=planning&offset=0
    getFacMembers();
    doFacOcQuery("planning");

    callOnHashChange(hashChangeHandler);

    if (!isOcPage()) return log("Not on crimes page, going home");

    callOnContentComplete(handlePageLoad);

    // Styles just stuck at the end, out of the way
    function addStyles() {
        GM_addStyle(`
            .xoc-myself {
                border: 1px solid green;
                filter: brightness(1.5);
                z-index: 9;
            }
            .x-oc-wrap {
                padding: 10px 0px 10px 0px;
            }
            #x-no-oc-members {
                margin-top: 8px;
            }
            #x-no-oc-table {

            }
            #x-no-oc-table tr {
                display: flex;
                flex-direction: row;
                width: 90%;
                height: 30px;
                margin: 0px auto 0px auto;
            }
            #x-no-oc-table tr:first-child {
                border-radius: 10px 0px 0px 0px;
            }
            #x-no-oc-table td {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                text-align: center;
                color: rgb(221, 221, 221);
                width: 20%;
                border: 1px solid #666;
                cursor: pointer;
            }
            #x-no-oc-table td:hover {
                color: var(--default-blue-color);
            }
            #x-no-oc-table td span {
                display: flex;
                align-items: center;
            }
            #x-oc-can-click > div > span {
                cursor: pointer;
            }
        `);
    }

    function doAnimateTable(e) {
        if ($("#x-oc-tbl-wrap").length) {
            $("#x-oc-tbl-wrap").animate({height: "0px"}, 500);
            $("#x-oc-tbl-wrap").animate({opacity: 0}, 200, function () {$("#x-oc-tbl-wrap").remove();});
        } else {
            installTableWrap();
            $("#x-oc-tbl-wrap").animate({opacity: 1}, 200);
        }
    }

    function installTableWrap() {
        let tblWrap = `
            <div id='x-oc-tbl-wrap' class="x-oc-wrap cont-gray bottom-round" style="opacity: 0.2;">
                  <table id="x-no-oc-table" style="width: 782px;">
                      <tbody>

                      </tbody>
                  </table>
             </div>
        `;

        $("#x-oc-can-click").after(tblWrap);

        let done = false;
        let tr = "<tr class='xoctr'>";
        for (let idx=0; idx < missingMembers.length || done == true;) {
            for (let j=idx; j < idx+5; j++) {
                let id = missingMembers[j];
                let name = "";
                if (!id) {
                    done = true;
                    tr += "<td><span></span></td>";
                } else {
                    name = facMembersJson[id];
                    tr += "<td data-id='" + id + "' class='xoctd'><span>" + name + " [" + id + "]</span></td>";
                }
            }
            tr += "</tr>"
            $("#x-no-oc-table > tbody").append($(tr));
            tr = "<tr>";
            idx += 5;
            if (done == true || idx >= missingMembers.length) break;
        };

        // Set cell borders
        $("#x-no-oc-table tr:first td:first").css("border-top-left-radius", "10px");
        $("#x-no-oc-table tr:first td:last").css("border-top-right-radius", "10px");
        $("#x-no-oc-table tr:last td:first").css("border-bottom-left-radius", "10px");
        $("#x-no-oc-table tr:last td:last").css("border-bottom-right-radius", "10px");

        // On clic,  open profile in new tab
        $(".xoctd").on('click', function (e) {
            let target = $(e.currentTarget);
            let id = $(target).attr("data-id");
            let href="/profiles.php?XID=" + id;
            window.open(href, "_blank");
        });
    }

    function buildMissingMembersUI() {
        let membersDiv = `
            <div id="x-no-oc-members" class="sortable-box t-blue-cont h">
              <div id="x-oc-can-click" class="title-black hospital-dark top-round scroll-dark" role="table" aria-level="5">
                  <div class="box"><span>Available Members (click to show)</span></div>
              </div>
          </div>
         `;


        $("#faction-crimes").before(membersDiv);

        //installTableWrap();

        $("#x-oc-can-click").on('click', doAnimateTable);
    }


})();