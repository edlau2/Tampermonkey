// ==UserScript==
// @name         Torn Drug Stats
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Adds drug stats to the home page: drugs used, OD's, Rehabs and rehab total cost to date.
// @author       xedx [2100735]
// @include      https://www.torn.com/index.php
// @updateURL    https://github.com/edlau2/Tampermonkey/blob/master/DrugStats/Torn%20Drug%20Stats.user.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/DrugStats/Torn-Drug-Stats-Div.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @connect      api.torn.com
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

    //////////////////////////////////////////////////////////////////////
    // Function(s) to add appropriate tool tip(s).
    //////////////////////////////////////////////////////////////////////

    function addToolTips() {
        addToolTipStyle();

        buildUseString('cantaken');
        buildUseString('exttaken');
        buildUseString('kettaken');
        buildUseString('lsdtaken');
        buildUseString('opitaken');
        buildUseString('shrtaken');
        buildUseString('spetaken');
        buildUseString('pcptaken');
        buildUseString('xantaken');
        buildUseString('victaken');
    }

    function buildUseString(item) {
        let useDiv = document.getElementById('xedx-val-span-' + item);
        let useText = useDiv.innerText.replace(/,/g, "");
        let pctText = useText/50 * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + pctText + '%</font></B>';
        }

        let divSpan = document.getElementById('xedx-div-span-' + item);
        let text = '<B>' + divSpan.innerText + ': </B>Honor Bar Available' + CRLF;
        let effectText, cdText, sideEffectText, odChance;

        switch (item) {
            case 'cantaken':
                text = text + TAB + '<B>Who\'s Frank?</B> (50 Cannibus): ' + pctText + CRLF +
                    TAB + '<B>Spaced Out</B> (Overdose on Cannibus)' + CRLF;
                effectText = 'Increases nerve by 2-3.';
                cdText = 'Cooldown: 1 to 1 1/2 hr.';
                sideEffectText = '-35% speed, -25% def, -20% strength';
                odChance = 'Very low (near impossible!), 5x chance on 4/20';
                break;
            case 'exttaken':
                text = text + TAB + '<B>Party Animal</B> (50 Ecstacy): ' + pctText + CRLF;
                effectText = 'Doubles happiness.';
                cdText = 'Cooldown: 3 hrs 20 min - 3 hrs 40 min';
                sideEffectText = 'none.';
                odChance = '~4%-5%';
                break;
            case 'kettaken':
                text = text + TAB + '<B>Horse Tranquilizer</B> (50 Ketamine): ' + pctText + CRLF;
                effectText = 'Temporarily increases Defense by 50%.';
                cdText = 'Cooldown: 50 min - 1 hr 30 min';
                sideEffectText = '-20% speed, -20% strength';
                odChance = 'high';
                break;
            case 'lsdtaken':
                text = text + TAB + '<B>Acid Dream</B> (50 LSD): ' + pctText + CRLF;
                effectText = 'Increases energy by 50, nerve by 5, and happiness by 200-500. Also +50% def, +30% str';
                cdText = 'Cooldown: 6 hrs 40 min - 7 hrs 30 min';
                sideEffectText = '-30% dex';
                odChance = '~5%-6%';
                break;
            case 'opitaken':
                text = text + TAB + '<B>The Fields of Opium</B> (50 Opium): ' + pctText + CRLF;
                effectText = 'Removes all hospital time and replenishes life by 66.6%. Increases happiness by 50-100.';
                cdText = 'Cooldown: 3 hrs 20 min - 4 hrs 10 min';
                sideEffectText = 'none';
                odChance = 'none';
                break;
            case 'shrtaken':
                text = text + TAB + '<B>I Think I See Dead People</B> (50 Shrooms): ' + pctText + CRLF;
                effectText = 'Increases happiness by 500 and reduces energy by 25.';
                cdText = 'Cooldown: 3 hrs 20 min - 3 hrs 54 min';
                sideEffectText = '-20% on all bat stats, -25e';
                odChance = 'unknown';
                break;
            case 'spetaken':
                text = text + TAB + '<B>Crank it Up</B> (50 Speed): ' + pctText + CRLF;
                effectText = 'Temporarily increases Speed by 20%. Increases happiness by 50.';
                cdText = 'Cooldown: 3 hrs 28 min';
                sideEffectText = '-20% dex';
                odChance = 'unknown';
                break;
            case 'pcptaken':
                text = text + TAB + '<B>Angel Dust</B> (50 PCP): ' + pctText + CRLF;
                effectText = 'Temporarily increases Strength and Dexterity by 20%. Increases happiness by 250.';
                cdText = 'Cooldown: 5 hrs 40 min - 6 hrs 40 min';
                sideEffectText = 'none.';
                odChance = 'unknown';
                break;
            case 'xantaken':
                text = text + TAB + '<B>Free Energy</B> (50 Xanax): ' + pctText + CRLF;
                effectText = 'Increases energy by 250 and happiness by 75.';
                cdText = 'Cooldown: 6 - 8 hrs.';
                sideEffectText = '-35% all bat stats';
                odChance = '3.0%';
                break;
            case 'victaken':
                text = text + TAB + '<B>Painkiller</B> (50 Vicodin): ' + pctText + '</B>';
                effectText = 'Temporarily increases all battle stats by 25%. Increases happiness by 75.';
                cdText = 'Cooldown: 5 hrs - 5 hrs 50 min';
                sideEffectText = 'none.';
                odChance = 'unknown';
                break;
            default:
                return;
        }
        text = text + CRLF + 'Effects: ' + effectText + CRLF + cdText + CRLF + 'Side Effects: ' + sideEffectText +
            CRLF + 'Chance of OD: ' + odChance;
        displayToolTip(useDiv.parentNode, text);
    }

    // Callback triggered once we have received a response from
    // the Torn API; the DIV has already been built at this point.
    // Just fill in the values.
    function personalStatsQueryCB(responseText, ID, name) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        let stats = jsonResp.personalstats;
        let knownSpans = ['cantaken', 'exttaken', 'kettaken', 'lsdtaken',
                          'opitaken', 'opitaken', 'shrtaken', 'spetaken',
                          'pcptaken', 'xantaken', 'victaken', 'drugsused',
                          'overdosed', 'rehabs', 'rehabcost'];

        knownSpans.forEach((name) => {
            let id = 'xedx-val-span-' + name;
            let valSpan = document.getElementById(id);
            let value = stats[name];
            if (typeof value === 'undefined' || value === null) {value = 0;} // Drug not taken yet

            // Format properly and insert.
            if (!name.localeCompare('rehabcost')) {
                valSpan.innerText = '$' + numberWithCommas(value);
            } else if (!name.localeCompare('overdosed')) {
                var pct = (Number(value) / Number(stats['drugsused'])*100).toFixed(2);
                valSpan.innerText = value + ' (' + pct + '%)';
            } else {
                valSpan.innerText = value;
            }
        });

        addToolTips();
    }

    function handlePageLoaded() {
        console.log(GM_info.script.name + ' onLoad');
        if (awayFromHome()) {return;}
        let extDivId = 'xedx-drugstats-ext-div';
        let mainDiv = document.getElementById('column0');
        if (!validPointer(mainDiv)) {return;}
        $(mainDiv).append(extDiv);
        xedx_TornUserQuery('', 'personalstats', personalStatsQueryCB, '');
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point
    //////////////////////////////////////////////////////////////////////

    let extDiv = drug_stats_div; // Pulled from the include, 'Torn-Drug-Stats-Div.js'

    logScriptStart();
    validateApiKey();

    // Delay until DOM content load (not full page) complete, so that other scripts run first.
    callOnContentLoaded(handlePageLoaded);

})();





