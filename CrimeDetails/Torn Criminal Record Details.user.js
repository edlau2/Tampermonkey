// ==UserScript==
// @name         Torn Criminal Record Details
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/index.php
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

/*
Borrowed from:
    @name                Alteracoes
    @author              magno
*/

(function() {
    'use strict';

    let arrayThefts = [[1000, 'Sneak&nbsp;Thief'], [2500, 'Prowler'], [5000, 'Safe&nbsp;Cracker'], [7500, 'Marauder'], [10000, 'Cat&nbsp;Burgler'], [12500, 'Pilferer'], [15000, 'Desperado'], [17500, 'Rustler'], [20000, 'Pick-Pocket'], [22500, 'Vandal'], [25000, 'Kleptomaniac']];
    let arrayVirus = [[500, 'Ub3rn00b&nbsp;Hacker'], [1000, 'N00b&nbsp;Hacker'], [1500, '1337n00b&nbsp;Hacker'],
                      [2000, 'Ph34r3dn00b&nbsp;Hacker'], [2500, 'Ph34r3d&nbsp;Hacker'], [3000, 'Ph343d1337&nbsp;Hacker'],
                      [3500, 'Ub3rph34r3d&nbsp;Hacker'], [4000, 'Ub3r&nbsp;Hacker'], [4500, '1337&nbsp;Hacker'],
                      [5000, 'Ub3r1337&nbsp;Hacker'], [5500, 'Key&nbsp;Puncher'], [6000, 'Script&nbsp;Kid'], [7000, 'Geek Speak'], [8000, 'Techie'], [9000, 'Cyber Punk'], [10000, 'Programmer']];
    let arrayMurder = [[1000, 'Beginner&nbsp;Assassin'], [2000, 'Novice&nbsp;Assassin'], [3000, 'Competent&nbsp;Assassin'],
                       [4000, 'Elite&nbsp;Assassin'], [5000, 'Deadly&nbsp;Assassin'], [6000, 'Lethal&nbsp;Assassin'], [7000, 'Fatal&nbsp;Assassin'], [8000, 'Trigger&nbsp;Assassin'], [9000, 'Hit&nbsp;Man'], [10000, 'Executioner']];
    let arrayDrugs = [[250, 'Drug&nbsp;Pusher'], [500, 'Drug&nbsp;Runner'], [1000, 'Drug&nbsp;Dealer'],
                      [2000, 'Drug&nbsp;Lord'], [4000, 'Candy Man'], [6000, 'Connection'], [8000, 'King Pin'], [10000, 'Supplier']];
    let arrayFraud = [[300, 'Fake'], [600, 'Counterfeit'], [900, 'Pretender'], [1200, 'Clandestine'],
                      [1500, 'Imposter'], [2000, 'Pseudo'], [2500, 'Imitation'],
                      [3000, 'Simulated'], [3500, 'Hoax'], [4000, 'Faux'],
                      [5000, 'Poser'], [6000, 'Deception'], [7000, 'Phony'], [8000, 'Parody'], [9000, 'Travesty'], [10000, 'Pyro']];
    let arrayGTA = [[200, 'Gone&nbsp;In&nbsp;300&nbsp;Seconds'], [400, 'Gone&nbsp;In&nbsp;240&nbsp;Seconds'], [600, 'Gone&nbsp;In&nbsp;180&nbsp;Seconds'],
                    [800, 'Gone&nbsp;In&nbsp;120&nbsp;Seconds'], [1000, 'Gone&nbsp;In&nbsp;60&nbsp;Seconds'], [1200, 'Gone&nbsp;In&nbsp;30&nbsp;Seconds'],
                    [1500, 'Gone&nbsp;In&nbsp;45&nbsp;Seconds'], [2000, 'Gone&nbsp;In&nbsp;15&nbsp;Seconds'], [2500, 'Booster'],
                    [3000, 'Joy&nbsp;Rider'], [3500, 'Super&nbsp;Booster'], [4000, 'Master&nbsp;Carjacker'],
                    [4500, 'Slim&nbsp;Jim'], [5000, 'Novice&nbsp;Joy&nbsp;Rider'], [5500, 'Novice&nbsp;Slim&nbsp;Jim'],
                    [6000, 'Professional&nbsp;Joy&nbsp;Rider'], [6500, 'Professional&nbsp;Booster'], [7000, 'Professional&nbsp;Slim&nbsp;Jim'],
                    [8000, 'Master&nbsp;Joy&nbsp;Rider'], [9000, 'Master Booster'], [10000, 'Master Slim Jim']];

    let arrayIllegal = [[5000,'Civil&nbsp;Offence']];
    let arrayOther = [[5000,'Find&nbsp;A&nbsp;Penny,&nbsp;Pick&nbsp;It&nbsp;Up']];

    let arrayCrimes2 = [[100, ''], [200, ''], [300, ''], [500, ''], [750, ''], [1000, ''],
                        [1500, ''], [2000, ''], [2500, ''], [3000, ''], [4000, ''], [5000, ''],
                        [6000, ''], [7500, ''], [10000, '']];

    function addStyles() {
        GM_addStyle(`
            .fr60 {float: right; width:60px;}
            .mycdata {font-style:italic; float:left; width:75px; text-align:left}
            .block {display:block;overflow:hidden;}
            .myboldred {font-weight:bold; color:red; width:35px; float:left; text-align:left;}
        `);
    }

    function fixupCrimeLi(item){
        let arr = null;
        let type = $(this).children(":first").text().trim();
        let desc = $(this).children(":last").text();
        let n = desc.replace(',','');

        log("fixupLine for '" + type + "', " + desc);

        switch(type){
            case 'Vandalism':
                type += ' (TBD)';
                arr = arrayOther;
                break;
            case 'Illegal production':
                type += ' (TBD)';
                arr = arrayIllegal;
                break;
            case 'Theft':
                type += ' (nerve: 2)';
                arr = arrayThefts;
                break;
            case 'Cybercrime':
                type += ' (TBD)';
                arr = arrayVirus;
                break;
            case 'Counterfeiting':
                type += ' (TBD)';
                arr = arrayMurder;
                break;
            case 'Fraud':
                type = 'Fraud (TBD)';
                arr = arrayFraud;
                break;
            case 'Illicit services':
                type += ' (TBD)';
                arr = arrayGTA;
                break;
        }
        $(this).children(":first").text(type);

        if (arr != null) {
            var mink = -1;
            for (var k=0; k<arr.length; ++k) {
                if ((mink == -1) && (arr[k][0] > n)) mink = k;
            }
            if (mink >= 0) {
                desc = '<span class="fr60">'+desc+'</span><span class="cdata block">' + arr[mink][1] +
                       '</span><span class="boldred">' + (arr[mink][0] - n) + '</span>';
                $(this).children(":last").html(desc);
                $(this).children(":last").attr('title', desc);
            }else{
                $(this).children(":last").css("color","green");
                $(this).children(":last").html('<span class="fr60">'+desc+'</span><span class="cdata">Good job!</span>');
            }
        }
    }

    function handlePageLoad() {
        log('==>[handlePageLoad]');
        let rootNode = $("div[id^=item]:has(>div.title-black:contains('Criminal Record'))");
        log("Root node: ", rootNode);
        //$("div[id^=item]:has(>div.title-black:contains('Criminal Record'))" ).find('li').each(
        if (!rootNode.length) {
            log("Empty root node, will try another...");
            rootNode = $("#item10961667 > div.bottom-round > div > ul");
            log("Root node: ", rootNode);
        }

        if (rootNode.length) {
            log("Root node good, looking for crimes...");
            //$(rootNode).find('li').each(item => fixupCrimeLi(item));
            $(rootNode).find('li').each(
                function(item){
                let arr = null;
                let type = $(this).children(":first").text().trim();
                let desc = $(this).children(":last").text();
                let n = desc.replace(',','');

                log('Checking item (1): ' + item + ' type: ' + type + ' desc: ' + desc + ' n: ' + n);

                switch(type){
                    // Crimes 1.0
                    case 'Other':
                        type += ' (nerve: 2)';
                        arr = arrayOther;
                        break;
                    case 'Illegal products':
                        type = 'Illegal products (nerve: 3, 16)';
                        arr = arrayIllegal;
                        break;
                    //case 'Theft':   // Also 2.0
                    //    type += ' (nerve: 2)';
                    //    arr = arrayThefts;
                    //    break;
                    case 'Computer crimes':
                        type += ' (nerve: 9, 18)';
                        arr = arrayVirus;
                        break;
                    case 'Murder':
                        type += ' (nerve: 10)';
                        arr = arrayMurder;
                        break;
                    case 'Drug deals':
                        type += ' (nerve: 8)';
                        arr = arrayDrugs;
                        break;
                    case 'Fraud crimes':
                        type = 'Fraud (nerve: 11, 13, 14, 17)';
                        arr = arrayFraud;
                        break;
                    case 'Auto theft':
                        type += ' (nerve: 12)';
                        arr = arrayGTA;
                        break;

                    // All the rest are Crimes 2.0
                    case 'Vandalism':
                        type += ' ';
                        arr = arrayCrimes2;
                        break;
                    case 'Illegal production':
                        type += ' ';
                        arr = arrayCrimes2;
                        break;
                    case 'Theft':
                        type += ' (nerve: 2)';
                        arr = arrayCrimes2;
                        break;
                    case 'Cybercrime':
                        type += ' ';
                        arr = arrayCrimes2;
                        break;
                    case 'Counterfeiting':
                        type += ' (nerve: 2)';
                        arr = arrayCrimes2;
                        break;
                    case 'Fraud':
                        type += ' ';
                        arr = arrayCrimes2;
                        break;
                    case 'Illicit services':
                        type += ' ';
                        arr = arrayCrimes2;
                        break;
                    case 'Extortion':
                        type += ' ';
                        arr = arrayCrimes2;
                        break;
                }
                $(this).children(":first").text(type);

                if (arr != null) {
                    var mink = -1;
                    for (var k=0; k<arr.length; ++k) {
                        if ((mink == -1) && (arr[k][0] > n)) mink = k;
                    }
                    if (mink >= 0) {
                        let needed = (arr[mink][0] - n);
                        //desc = '<span class="fr60">'+desc+'</span><span class="cdata block">' + arr[mink][1] +
                        //       '</span><span class="boldred">' + (arr[mink][0] - n) + '</span>';

                        desc = '<span class="fr60">'+desc+'</span><span class="cdata block">' + //arr[mink][1] +
                               '</span><span class="myboldred">Need: ' + needed + '</span>';

                        $(this).children(":last").html(desc);
                        $(this).children(":last").attr('title', desc);
                    }else{
                        $(this).children(":last").css("color","green");
                        $(this).children(":last").html('<span class="fr60">'+desc+'</span><span class="mycdata">Good job!</span>');
                    }
                }
            }
            );
        } else {
            log("Can't find root node - page html changed?");
        }

        $("#xxx-item10961667 > div.bottom-round > div > ul").find('li').each(
            function(item){
                let arr = null;
                let type = $(this).children(":first").text().trim();
                let desc = $(this).children(":last").text();
                let n = desc.replace(',','');

                log('Checking item (2): ' + item + ' type: ' + type);

                switch(type){
                    case 'Other':
                        type += ' (nerve: 2)';
                        arr = arrayOther;
                        break;
                    case 'Illegal products':
                        type = 'Illegal products (nerve: 3, 16)';
                        arr = arrayIllegal;
                        break;
                    case 'Theft':
                        type += ' (nerve: 4, 5, 6, 7, 15)';
                        arr = arrayThefts;
                        break;
                    case 'Computer crimes':
                        type += ' (nerve: 9, 18)';
                        arr = arrayVirus;
                        break;
                    case 'Murder':
                        type += ' (nerve: 10)';
                        arr = arrayMurder;
                        break;
                    case 'Drug deals':
                        type += ' (nerve: 8)';
                        arr = arrayDrugs;
                        break;
                    case 'Fraud crimes':
                        type = 'Fraud (nerve: 11, 13, 14, 17)';
                        arr = arrayFraud;
                        break;
                    case 'Auto theft':
                        type += ' (nerve: 12)';
                        arr = arrayGTA;
                        break;
                }
                $(this).children(":first").text(type);

                if (arr != null) {
                    var mink = -1;
                    for (var k=0; k<arr.length; ++k) {
                        if ((mink == -1) && (arr[k][0] > n)) mink = k;
                    }
                    if (mink >= 0) {
                        desc = '<span class="fr60">'+desc+'</span><span class="cdata block">' + arr[mink][1] +
                               '</span><span class="boldred">' + (arr[mink][0] - n) + '</span>';
                        $(this).children(":last").html(desc);
                        $(this).children(":last").attr('title', desc);
                    }else{
                        $(this).children(":last").css("color","green");
                        $(this).children(":last").html('<span class="fr60">'+desc+'</span><span class="cdata">Good job!</span>');
                    }
                }
            }
        );
        log('<==[handlePageLoad]');
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();
    addStyles();
    callOnContentLoaded(handlePageLoad);

})();