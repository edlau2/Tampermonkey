// ==UserScript==
// @name        T*RN : R@ce H3lper
// @namespace   maf1a.raceway
// @author      Maf1a[61o357]
// @description Get Accurate stats for your car. And repair helper.
// @include     https://www.torn.com/loader.php?sid=racing*
// @version     1.10
// @grant       GM_addStyle
// @require     https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.18.1/moment.min.js
// @require     https://greasyfork.org/scripts/39572-tornlib/code/tornlib.js?version=259509
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

'use strict';
function unique(list) {
    var result = [];
    $.each(list, function(i, e) {
        if ($.inArray(e, result) == -1) result.push(e);
    });
    return result;
}

function hexToRgbA(hex){
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+',0.54)';
    }
    throw new Error('Bad Hex');
}

hexToRgbA('#fbafff')

// Repair Helper
function checkUpgrade() {
    GM_addStyle(".needUpgrade { font-size: 40px; bottom: 10px; position: absolute; right: 15px; color: #ffd600; } #txtUpgrade span { text-shadow: 1px 1px 1px rgb(0, 0, 0); } .bar-gray-d { font-size: 10px; text-align: right; }");

    var parts = [];
    var needUpgrade = [];
    $.each($("li[data-part]"), function(){
        parts.push($(this).attr("data-part"));
    });

    parts = unique(parts);
    $.each(parts,function(){
        if(!$("li.bought[data-part='"+this+"']").length) {
            var part = this;
            var bgcolor = '#'+(0x1000000+(Math.random())*0xffffff).toString(16).substr(1,6);
            $("li[data-part='"+this+"'] .status").css("background-color", bgcolor).addClass("highlight-active");
            var $noti = $("ul.pm-categories li[data-category='"+$("li[data-part='"+this+"'] .status").closest(".pm-items-wrap").attr("category")+"']");
            $noti.find(".needUpgrade").length ? $noti.find(".needUpgrade").text(parseInt($noti.find(".needUpgrade").text()) + 1) : $noti.find(".icon").after("<div class='needUpgrade'>1</div>").parent().addClass("highlight-active");
            needUpgrade.push("<span style='color:"+bgcolor+"'>"+this+"</span>");
            $("li[data-part='"+this+"']").hover(function(){
                $(".pm-items > li[data-part='"+part+"']").css("opacity", 1).find("div.title").css("background-color", hexToRgbA(bgcolor));
                $(".pm-items > li:not([data-part='"+part+"'])").css("opacity", 0.5);
            },function(){
                $("li[data-part='"+part+"']").find("div.title").css("background-color", '');
                $(".pm-items-wrap li").css("opacity", 1);
            });
        }
    });
    $(".info-msg-cont .msg:eq(0)").append(needUpgrade.length ? "<p id='txtUpgrade'><br/><br/><strong>" + needUpgrade.length + "</strong> parts available to upgrade :  <strong style='color: #ff9b00;'>" + needUpgrade.join(", ") + "</strong></p>" : $(".info-msg-cont").hasClass("red") ? "" : "<p id='txtUpgrade'><br/><br/>Your car is <strong style='color: #789e0c;'>FULLY UPGRADED</strong></p>");

    $.each($(".progress-bar .bar-border-wrap"), function() {
        current = parseFloat($(this).find(".bar-gray-light-wrap-d")[0].style.width.replace('%',''));
        changes = parseFloat($(this).find(".bar-color-wrap-d")[0].style.width.replace('%',''));
        diff = changes - current;

        if(!isNaN(diff)) {
            $(this).find(".bar-gray-d").css("color", diff == 0 ? '#ccc' : $(this).parent().hasClass("negative") ? '#ff6464' : '#65d007').text(parseInt(diff) + '%');
        }
    });
};

$( document ).ajaxComplete(function( event, xhr, settings ) {

    // Detail Car Stats
    if(settings.url.indexOf('tab=cars') !== -1 || settings.url.indexOf('tab=parts') !== -1 || (settings.url.indexOf('tab=race&section=chooseRacing') !== -1)) {
        GM_addStyle(".title.m-bottom10 { float: right; } .title.m-bottom10 > strong { color: yellow; }");

        var race = JSON.parse(localStorage.race || '{}');

        if($(".enlisted-wrap").length) {
            $.each($("a[id-value]"),function(){
                if(race[$(this).attr("id-value")] != undefined) {
                    var stats = race[$(this).attr("id-value")];
                    $.each($(this).closest("li").find("ul.enlist-bars li .properties .title"), function() {
                        $(this).next().append(stats[$(this).text().replace(/\s+/g, '').toLowerCase()].val > 0 ? "<div class='title m-top5 m-bottom10'><strong>" + stats[$(this).text().replace(/\s+/g, '').toLowerCase()].val + "</strong> - " + stats[$(this).text().replace(/\s+/g, '').toLowerCase()].bars.toFixed(2) + "%</div>" : "");
                    });
                }
            });
        }

        if(settings.url.indexOf('section=addParts') !== -1) {
            checkUpgrade();
        }

        //Export/Download Car Data to CSV
        var rows = [["Car Model", "Top Speed", "Acceleration", "Braking", "Handling", "Dirt", "Tarmac", "Safety"]];
        $.each(JSON.parse(localStorage.race), function() {
            var arr = [this.car];
            delete this.car;
            $.each(this, function() {
                arr.push(this.val > 0 ? this.val : 0);
            });
            rows.push(arr);
        });
        let csvContent = "data:text/csv;charset=utf-8,";
        rows.forEach(function(rowArray){
        let row = rowArray.join(",");
        csvContent += row + "\r\n";
        });
        $("a[section-value='enlistRacingCar']").after('<a href="'+encodeURI(csvContent)+'" download="your_cars.csv" class="link"><span class="btn-wrap silver c-pointer"><span class="btn">DOWNLOAD CSV</span></span></a>');
    }

    //after bought upgrade
    if(settings.url.indexOf('sid=racingActions&section=buyParts&step=partsbuy') !== -1) {
        $(".highlight-active").removeClass("highlight-active").removeAttr("style");
        $(".needUpgrade,#txtUpgrade").remove();
        checkUpgrade();
    }

    if(settings.url.indexOf('sid=raceData') !== -1) {
        var data = JSON.parse(xhr.responseText || '{}');

        if(data.carData != undefined) {
            // Detail Car Stats
            if(!$(".dtcarStats").length) {
                GM_addStyle(".dtcarStats { float: right; } .dtcarStats > strong { color: #8aac26; }");
                $.each($("#racingupdates .properties .title"), function() {
                    $(this).append("<div class='dtcarStats' style='display:none;'><strong>" + data.carData["0"][$(this).text().replace(/\s+/g, '').toLowerCase()] + "</strong> - " + data.carBars[$(this).text().replace(/\s+/g, '').toLowerCase()].newval.toFixed(2) + "%</div");
                });
                $(".dtcarStats").fadeIn(2000);
            }


            var obj = {};
            var carData = data.carData["0"];
            var carBars = data.carBars;

            obj[carData.ID] = { car: carData.title };
            $.each(carBars, function(k,v){
                obj[carData.ID][k] = {
                    bars:carBars[k].newval,
                    val:parseInt(carData[k])
                }
            });
            race = JSON.parse(localStorage.race || '{}');
            delete race[carData.ID];
            $.extend( true, race, obj);
            localStorage.race = JSON.stringify(race);
        }

        $.each($("#leaderBoard li .name span"),function() {
            $(this).wrap("<a target='_blank' href='/profiles.php?XID="+$(this).parent().parent().parent().attr("id").substr(4)+"'></a>");
        });

        // Race Result Script
        if(data.timeData.status == 3 && (data.timeData.currentTime > parseInt(data.timeData.timeEnded))) {
            GM_addStyle("li.time.best.all { color: gold; } li.time.best.worst { color: #f44336; }");
            var lapIntervals = data.raceData.trackData.intervals.length;
            var lapIntervalsDetails = data.raceData.trackData.intervals;
            var laps = parseInt(data.raceData.trackData.laps);
            var totalIntervals = lapIntervals * laps;

            var cars = {};
            var output = "";
            var bestlapoverall = '09:00:00';
            var worstlapoverall = '00:00:00';
            var worstmark = '';
            $.each(data.raceData.cars, function (playername, data) {
                var arrVal = window.atob(data).split(",");
                var intervals = 0;
                var bestlap = 0;
                var lap = 1;
                var txtbestlap = [];
                var thebestlap = 9999;
                var theworstlap = 0;
                $.each(arrVal, function(){
                    intervals++;
                    bestlap += parseFloat(this);
                    if(intervals == lapIntervals) {
                        intervals = 0;
                        thebestlap = thebestlap > bestlap ? bestlap : thebestlap;
                        theworstlap = theworstlap < bestlap ? bestlap : theworstlap;
                        txtbestlap.push((lap++) + ") " + moment.utc().startOf('day').add(((Math.ceil(bestlap * 100) / 100).toFixed(7).substr((Math.ceil(bestlap * 100) / 100).toFixed(7).indexOf(".") + 1,2) == '00') ? (parseInt(bestlap) + 1) : parseInt(bestlap), 'seconds').format('mm:ss') + ":" + (Math.ceil(bestlap * 100) / 100).toFixed(7).substr((Math.ceil(bestlap * 100) / 100).toFixed(7).indexOf(".") + 1,2));
                        bestlap = 0;
                    }
                });

                if(arrVal.length == totalIntervals) {
                    $.extend(true, cars, {[playername]:{
                        txtbestlap: txtbestlap,
                        thebestlap: moment.utc().startOf('day').add(((Math.ceil(thebestlap * 100) / 100).toFixed(7).substr((Math.ceil(thebestlap * 100) / 100).toFixed(7).indexOf(".") + 1,2) == '00') ? (parseInt(thebestlap) + 1) : parseInt(thebestlap), 'seconds').format('mm:ss') + ":" + (Math.ceil(thebestlap * 100) / 100).toFixed(7).substr((Math.ceil(thebestlap * 100) / 100).toFixed(7).indexOf(".") + 1,2),
                        theworstlap: moment.utc().startOf('day').add(((Math.ceil(theworstlap * 100) / 100).toFixed(7).substr((Math.ceil(theworstlap * 100) / 100).toFixed(7).indexOf(".") + 1,2) == '00') ? (parseInt(theworstlap) + 1) : parseInt(theworstlap), 'seconds').format('mm:ss') + ":" + (Math.ceil(theworstlap * 100) / 100).toFixed(7).substr((Math.ceil(theworstlap * 100) / 100).toFixed(7).indexOf(".") + 1,2)
                    }});
                    bestlapoverall = moment(cars[playername].thebestlap, 'mm:ss:SS').valueOf() < moment(bestlapoverall, 'mm:ss:SS').valueOf() ? cars[playername].thebestlap : bestlapoverall;
                    if(moment(cars[playername].theworstlap, 'mm:ss:SS').valueOf() > moment(worstlapoverall, 'mm:ss:SS').valueOf()) {
                        worstlapoverall = cars[playername].theworstlap;
                        worstmark = cars[playername].thebestlap;
                        console.log(worstmark);
                    }
                }
                else {
                    var fullLap = 0;
                    var crashTime;
                    var i = 0;

                    $.each(lapIntervalsDetails, function(){
                        fullLap += this;
                        i++;
                        if(i == (arrVal.length % lapIntervals)) crashTime = fullLap;
                    });

                    $.extend(true, cars, {[playername]:{
                        txtbestlap: txtbestlap,
                        thebestlap: "-",
                        theworstlap: "-"
                    }});
                }
                // This line appends the 'best lap' column ...
                //$("ul.driver-item>li.name:contains("+playername+")").parent().parent().find("li.time").before("<li class='time best'>"+(cars[playername].thebestlap)+"</li>");
            });


            $("li[id^='lbr-']").click(function(){
                player = $(this).find("ul>li.name span").text();

                if(!$(".model-wrap").length)
                {
                    $("ul.properties-wrap").before('<div class="model-wrap"><span class="img" title="Honda NSX"><img src="/images/items/78/large.png?v=1528808940574" width="100" height="50"></span><span class="model"><p>Honda NSX</p></span><span class="modellap"><p></p></span><div class="clear"></div></div>');

                }
                if(!$(".modellap").length) {
                    $(".model-wrap > .model").after('<span class="modellap"><p></p></span>');
                }
                $("ul.properties-wrap").empty();
                $("div.car-selected-wrap .title-black:first").text("Lap time");

                $('.model-wrap .model p:first').text($(this).find("ul>li.car img").attr("title"));
                $('.model-wrap .modellap p:first').text(player);
                $('.model-wrap img').attr("src", $(this).find("ul>li.car img").attr("src"));
                $('.model-wrap img').attr("title", $(this).find("ul>li.car img").attr("title"));

                $.each(cars[player].txtbestlap, function() {
                    $("ul.properties-wrap").append(`
                    <li>
                        <div class="properties">
                            <div class="title m-bottom10">${this}</div>
                        </div>
                    </li>`);
                });

                thebestlap = cars[player].thebestlap;
                theworstlap = cars[player].theworstlap;
                $("li .properties .title:contains("+thebestlap+")").css("color","yellow");
                $("li .properties .title:contains("+theworstlap+")").css("color","#ff3d2e");
            });

            $("li.time.best:contains("+bestlapoverall+")").addClass("all");
            $("li.time.best:contains("+worstmark+")").addClass("worst");
        }
        else {
            if(!$("#racingupdatesnew ul.properties-wrap:contains(Time started)").length) {
                duration = ((parseInt(data.timeData.timeEnded) + data.timeData.cooldown) - parseInt(data.timeData.timeStarted)) * 1000;
                $("#racingupdatesnew ul.properties-wrap").prepend(`
                    <li><div class="properties"><div class="title">ID: ${data.raceID}  [ <a target="_blank" href='/loader.php?sid=racing&tab=log&raceID=${data.raceID}'>Spectator link</a> ]</div><div class="bar-tpl-wrap  active m-top5 m-bottom10"></div><div class="clear"></div></div></li>
                    <li><div class="properties"><div class="title">Time started: ${moment.unix(parseInt(data.timeData.timeStarted)).utc().format('YYYY-MM-DD kk:mm:ss')}</div><div class="bar-tpl-wrap  active m-top5 m-bottom10"></div><div class="clear"></div></div><div class="t-delimiter"></div><div class="b-delimiter"></div></li>
                    <li><div class="properties"><div class="title">Time ended: ${moment.unix(parseInt(data.timeData.timeEnded) + data.timeData.cooldown).utc().format('YYYY-MM-DD kk:mm:ss')}</div><div class="bar-tpl-wrap  active m-top5 m-bottom10"></div><div class="clear"></div></div><div class="t-delimiter"></div><div class="b-delimiter"></div></li>
                    <li><div class="properties"><div class="title">Estimate race duration: ${moment.utc(duration).format('HH[h] mm[m] ss[s]')}</div><div class="bar-tpl-wrap  active m-top5 m-bottom10"></div><div class="clear"></div></div><div class="t-delimiter"></div><div class="b-delimiter"></div></li>
                `);
            }
        }

        if(!$("li.time.best").length) {
            $("li.name").removeClass("linamewidth");
        }
        else {
            $("li.name").addClass("linamewidth");
        }



        GM_addStyle(`
        .linamewidth {
            width: 266px !important;
        }
        @media (max-width: 1000px) {
            .linamewidth {
                width: 112px !important;
            }
            .d .racing-main-wrap .car-selected-wrap .drivers-list .driver-item>li.time.best {
                width: 45px;
            }
        }


        .modellap {
            color: #e6da1c;
            padding-bottom: 10px;
            text-align: right;
            font-weight: 700;
            font-size: 16px;
            display: inline-block;
            vertical-align: middle;
            line-height: 13px;
        }
        `);
    }
});
