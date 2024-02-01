// ==UserScript==
// @name         Torn HoF Helper
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Annotate HoF positions
// @author       xedx [2100735]
// @match        https://www.torn.com/halloffame.php*
// @connect      api.torn.com
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

    // Change these as needed, in you case, try making "ageColWidth" less,
    // maybe try '65px'
    const posColWidth = '97px';
    const ageColWidth = '70px';
    const respectColWidth = '69px';    // On the Respect page

    function handlePageLoad() {

        log("Hash for page: ", window.location.hash);
        if (!window.location.hash)
            return;
        //if (window.location.hash == '#type=factionrespect')
        //    return;

        let title = $("#hall-of-fame-list-wrap > div > ul.table-titles > li.position");
        $(title).css('width', posColWidth);

        let age = $("#hall-of-fame-list-wrap > div > ul.table-titles > li:nth-child(4)");
        log("age: ", $(age));
        if ($(age).length > 1)
        {
            $(age).css('width', ageColWidth);
        }
        else
        {
            let respect = $("#hall-of-fame-list-wrap > div > ul.table-titles > li.col-big");
            $(respect).css('width', respectColWidth);
        }

        let ulList = $("#hall-of-fame-list-wrap > div > ul.players-list")[0];

        log("ulList: ", ulList);

        let rows = ulList.querySelectorAll('ul[class^=player-info]');
        log("rows: ", rows);

        if (!rows.length)
        {
            setTimeout(handlePageLoad, 500);
            return;
        }

        // rank-change-icon down
        $(rows).each(function( index )
        {
            let pRow = rows[index].querySelector('li[class^=position]');
            $(pRow).css('width', posColWidth);

            let ageCol = rows[index].querySelector("li:nth-child(4)");
            log("ageCol: ", $(ageCol));
            if ($(ageCol).length > 1)
            {
                $(ageCol).css('width', ageColWidth);
            }
            else
            {
                let bigCol = rows[index].querySelector("li.col-big");
                $(bigCol).css('width', respectColWidth);
            }

            let iRow = rows[index].querySelector('i[class^=rank-change-icon]');
            let title = $(iRow).attr("title");

            if (!title)
            {
                iRow = rows[index].querySelector('i[class^=rank-change-icon]');
                title = $(iRow).text();
            }

            log("iRow: ", iRow);
            log("Title: ", title);

            if (iRow && title)
            {
              let modifier = "";
              let tokens = title.split(' ');
              if (tokens[0] == "Up") modifier = "   (+";
              if (tokens[0] == "Down") modifier = "   (-";
              modifier += tokens[1] + ")";

              let sRow = rows[index].querySelector('li[class^=position] > span');
              let orgText = $(sRow).text();
              $(sRow).text(orgText + modifier);
            }
        });
    }

    //////////////////////////////////////////////////////////////////////
    // Main. No API key needed for this simple script
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    versionCheck();

    callOnHashChange(handlePageLoad);
    callOnContentComplete(handlePageLoad);

})();