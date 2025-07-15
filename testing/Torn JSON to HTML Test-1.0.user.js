// ==UserScript==
// @name         Torn JSON to HTML Test
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/calendar.php*
// @exclude      https://www.torn.com/recaptcha.php*
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
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    debugLoggingEnabled = true;

    const jsonObj = {
                  "personalstats": {
                        "items": {
                              "found": {
                                    "city": 1078,
                                    "dump": 1634,
                                    "easter_eggs": 31
                              },
                              "trashed": 5066,
                              "used": {
                                    "books": 28,
                                    "boosters": 1176,
                                    "consumables": 22211,
                                    "candy": 4420,
                                    "alcohol": 9325,
                                    "energy": 8466,
                                    "energy_drinks": 8466,
                                    "stat_enhancers": 32,
                                    "easter_eggs": 11
                              },
                          "viruses_coded": 184
                    }
                  }
                };

    function buildHtmlListFromJson(jsonNode, htmlString, depth=2) {
        let keys = Object.keys(jsonNode);
        log("Keys: ", keys);
        // if key value is an object:
        // <ul><li><h3><a href="#"><i class="fa fa-lg fa-tachometer"></i>Key_Value</a></h3>
        //

        // Else: <li><a href="#">Reports</a></li>

        if (keys.length) {
            let lastWasLi = false;
            let lastWasUl = false;
            htmlString  += "<ul>";
            log(">>>> Starting UL", depth);
            keys.forEach(key => {
                let keyVal = jsonNode[key];
                log("Node: ", key, " : ", keyVal);
                if (typeof keyVal == 'object') {
                    let savedNode = jsonNode;
                    if (lastWasLi == true) {
                        log("<<<< Ending UL", depth);
                        htmlString += "</ul><ul>";
                        log(">>>> Starting UL", depth);
                        lastWasUl = true;
                        //depth = +depth - 1;
                    }
                    lastWasLi = false;
                    log("    >>>> Starting LI", depth);
                    htmlString +=  `<li><h${depth}><a href="#"><i class="fa fa-lg fa-tachometer"></i>${key}</a></h${depth}>`;
                    depth = +depth + 1;
                    let nextHtml = buildHtmlListFromJson(jsonNode[key], '', depth);
                    depth = +depth - 1;
                    log("nextHtml: ", nextHtml);
                    log("    <<<< Ending LI", depth);
                    nextHtml += "</li>";
                    htmlString += nextHtml;
                    log("htmlString: ", htmlString);
                }
                else {
                    if (lastWasUl == true) {
                        log("<<<< Ending UL", depth);
                        //depth = +depth - 1;
                        htmlString += "</ul>";
                        lastWasUl = false;
                    }
                    log("    >>>> Starting LI", depth);
                    htmlString += `<li><a href="#">${key}: ${keyVal}</a></li>`;
                    log("    <<<< Ending LI", depth);
                    log("htmlString: ", htmlString);
                    lastWasLi = true;
                }
            });
            log("<<<< Ending UL");
            htmlString += "</ul>";
        }
        return htmlString;
    }

    function handlePageLoad() {
        let html = "<div id='xedx-tmp'>";
        html += buildHtmlListFromJson(jsonObj, html);
        html += "</div>";
        $('body').append(html);

        if (!$('#xedx-tmp').length) {
            return log("Couldn't create HTML!");
        } else {
            log("New HTML: ", $('#xedx-tmp'));
        }

        if (confirm("Open HTML list, from JSON?")) {
            let divContent = $('#xedx-tmp').html();
            let newWindow = window.open('', '_blank');
            if (newWindow) { // Check if the window was successfully opened (not blocked by pop-up blocker)
                newWindow.document.write('<html><head><title>Dynamic Content</title></head><body>');
                newWindow.document.write(divContent);  // Just $(html).html() ???
                newWindow.document.write('</body></html>');
                newWindow.document.close();
            } else {
                alert('Pop-up blocked! Please allow pop-ups for this site to view the content in a new tab.');
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    addStyles();

    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {

    }

})();