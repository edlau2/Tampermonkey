// ==UserScript==
// @name         Stock Market Helper
// @namespace    mafia.stockmarket
// @version      1.36
// @description  Stock Helper that calculate your profit / loss in portfolio, highlight forecast that poor, very poor, good and very good. Also mark the stock that worth ($) 0 < 20b < 50b < 100b. And get new data everytime stock profile reexpanded in list/portfolio.
// @author       Mafia [610357]
// @match        https://www.torn.com/stockexchange.php*
// @match        https://www.torn.com/laptop.php*
// @require      http://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.18.1/moment.min.js
// @require      https://greasyfork.org/scripts/39572/code/helper.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/ismobilejs/0.4.1/isMobile.js
// @grant        GM_addStyle
// @run-at      document-start
// ==/UserScript==

'use strict';

if(location.href.indexOf('stockexchange.php') != -1) {
    $("#mainContainer").ready(function(){
        requireAPI(tcse);
        xhr2('stockexchange.php', 'Stock Market', laptop);
    });
}

if(location.href.indexOf('laptop.php') != -1) {
    xhr2('stockexchange.php', 'Stock Market', laptop);
}

function laptop(r){
    requireAPI(tcse);
}

function tcse() {
    
    var apikey = localStorage.getItem("_apiKey");
    var toggle = 0;
    var bigworth = 0;
    var sio = io('https://livesocket.herokuapp.com');
    var stocksAPI;
    var user = {
        uid: $("script[src*='js/chat/chat']").attr("uid"),
        name: $("script[src*='js/chat/chat']").attr("name")
    }; 
    var prevEL;

    GM_addStyle('.sticker {background-color: #ffffff; line-height: '+(isMobile.phone ? '23' : '15')+'px; padding: 3px;border-radius: 0px 5px 5px 0px;margin: 10px; cursor: pointer; } .seworth { border-left:solid 5px; width: 75px !important; } .pfworth { border-left:solid 5px; width: 145px !important; } .noshare { border-left:solid 5px #545150 !important; } .w0b20b { border-left:solid 5px #f44336 !important; } .w20b50b { border-left:solid 5px #FFEB2B !important; } .w50b100b { border-left:solid 5px #8bc34a !important; } .fvpoor { background: #ffb0ac !important; } .fpoor { background: #ffdedc !important; } .fgood { background: #cbff8f !important; } .fvgood { background: #6bff71 !important; } .favg { background-color: #f2f2f2; } .diffUp { cursor: default; font-size: 12px; margin-left: 2px; color: green; font-weight: 400; font-family: Arial; } .diffUp i { background: url(/images/v2/stock/up_down_steady.png) 0 -7px no-repeat; padding-left: 13px; height: 9px; display: inline-block; } .diffDown i { background: url(/images/v2/stock/up_down_steady.png) 0 1px no-repeat; padding-left: 13px; height: 9px; display: inline-block; } .diffDown { cursor: default; font-size: 12px; margin-left: 2px; color: red; font-weight: 400; font-family: Arial;} #stockFilter { height: 20px; padding: 0px 10px; width: 60px; background: none; border-bottom: solid 1px; border-radius: unset; text-align: center; color: #FF5722;}');
    $('div.tutorial-cont').after('<span class="sticker" id="noshare" style="border-left: 3px solid #545150;">No Shares</span><span class="sticker" id="w0b20b" style="border-left: 3px solid #f44336;">$0 - $20B worth shares</span><span class="sticker" id="w20b50b" style="border-left: 3px solid #FFEB2B;">$20B - $50B worth shares</span><span class="sticker" id="w50b100b" style="border-left: 3px solid #8bc34a;">$50B - $100B worth shares</span><br/><br/><br/><span class="sticker" id="fvpoor" style="background-color: #ffb0ac;">Very Poor</span><span class="sticker" id="fpoor" style="background-color: #ffdedc;">Poor</span><span class="sticker" id="fgood" style="background-color: #cbff8f;">Good</span><span class="sticker" id="fvgood" style="background-color: #6bff71;">Very Good</span> <input type="text" id="stockFilter" placeholder="Stock Filter"/>');
    if(!isMobile.phone) {
        $('#stockFilter').after('<img id="dcinv" src="https://i.imgur.com/IgjUiDo.png" style="float: right; margin-top: -37px; display: none; cursor: pointer;"></img>');
        GM_addStyle('.stock-main-wrap .stock-list .item .owned {line-height: 20px !important;} .stock-main-wrap .stock-list .item .owned span {color:#199cad !important;}');
    }
    else {
        GM_addStyle('.d .stock-main-wrap .tabs-wrap .info-stock-wrap .properties .property { width: 177px !important; }');
    }
    $("#dcinv").click(()=>window.open('https://discord.gg/cUXEzn4')).fadeIn(3000);

    if($(".title:eq(1)").text().trim() == 'Your portfolio') {
        user.s = 1;
        setTimeout(() => {
            sio.emit('us', user);
        }, 5000);

        $('#stockFilter').after('<span class="sticker" id="profit" style="color: #1e8f1e;font-weight: 700;">Profit</span><span class="sticker" id="loss" style="color: #ff0000;font-weight: 700;">Loss</span><span class="sticker" id="listed" style="color: #888888;">Listed</span>');
        $.each($("li.item-wrap"), function() {
            currentPrice = parseFloat($(this).find("li.info > div.b-price-wrap.price-wrap > div.second-row > span.prop-wrap.sort-cell.t-overflow").clone().children().remove().end().text().trim().replace("$",''));
            shares = parseInt($(this).find("li.info > div.b-price-wrap.price-wrap > div.first-row").clone().children().remove().end().text().trim().replace(/,/g,'').replace("$",''));
            worth = parseFloat($(this).find("li.info > div.c-price-wrap.price-wrap > div.first-row").clone().children().children().remove().end().text().trim().replace(/,/g,'').replace("$",''));
            bought = parseFloat($(this).find("li.info > div.c-price-wrap.price-wrap > div.second-row > span.prop-wrap.sort-cell").clone().children().remove().end().text().trim().replace(/,/g,'').replace("$",''));
            diff = worth - (shares * bought);
            color = diff > 0 ? 'green' : 'red';
            desc = isMobile.phone ? ("Bought : <strong>$"+(commaSeparateNumber(parseInt(shares*bought)))+"</strong> &#8212; <u>"+(diff>0?'Profit':'Loss')+"</u> : <strong style='color:"+color+"'>"+(diff>0?'+':'-')+' $'+commaSeparateNumber(Math.abs(parseInt(diff)))+"</strong>") : ("You bought at <strong>$"+(commaSeparateNumber(parseInt(shares*bought)))+"</strong> worth shares and <u>"+(diff>0?'profit':'loss')+"</u> <strong style='color:"+color+"'>"+(diff>0?'+':'-')+' $'+commaSeparateNumber(Math.abs(parseInt(diff)))+"</strong>");
            $(this).find("li.info > div.qualify-wrap").html(desc);
            $(this).find("li.logo").addClass(diff >= 0 ? "profit" : "loss");
            $(this).find("li.logo").addClass($(this).hasClass("remove") ? "listed" : "");

        });
    }
    else {
        user.s = 0;
        setTimeout(() => {
            sio.emit('us', user);
        }, 7000);
    }

    var noshare = [];
    $.getJSON("https://api.torn.com/torn/?selections=stocks&key="+apikey, function(data){
        stocksAPI = data.stocks;
        $.each(data.stocks, function(){
            
            if(!this.available_shares && this.acronym != 'TCSE') {  
                noshare.push(this);
            }

            switch (this.forecast) {
                case 'Very Poor':
                    fclass = "fvpoor";
                    break;
                case 'Poor':
                    fclass = "fpoor";
                    break;
                case 'Good':
                    fclass = "fgood";
                    break;
                case 'Very Good':
                    fclass = "fvgood";
                    break;                
                default:
                fclass = "favg";
                    break;
                }

            price = parseFloat($("ul.stock-list li.item div.abbr-name:contains("+this.acronym+")").closest("li.item").find(".price").clone().children().remove().end().text().replace("$","").replace(/,/g,"").trim());
            owned = parseFloat($("ul.stock-list li.item div.abbr-name:contains("+this.acronym+")").closest("li.item").find(".owned").clone().children().remove().end().text().replace("$","").replace(/,/g,"").trim());
            worth = price * owned;
            bigworth += worth;
            
            if($("li.item-wrap[data-stock='"+this.acronym.toLowerCase()+"'] span[title^='Current']").length) {
                price = parseFloat($("li.item-wrap[data-stock='"+this.acronym.toLowerCase()+"']").find("li.info > div.b-price-wrap.price-wrap > div.second-row > span.prop-wrap.sort-cell.t-overflow").clone().children().remove().end().text().trim().replace(/,/g,'').replace("$",''));
                changes = price - parseFloat(this.current_price.replace(/,/g,''));
                elChanges = "<span class='"+(changes < 0 ? "diffDown" : "diffUp")+"'><i></i>"+ Math.abs(changes).toFixed(3) + "</span>";
                $("li.item-wrap[data-stock='"+this.acronym.toLowerCase()+"'] span[title^='Current']").html($("li.item-wrap[data-stock='"+this.acronym.toLowerCase()+"'] span[title^='Current']").html().replace("Price","").replace("Current", "Price")).append(elChanges);
            }

            if(!isMobile.phone) $("ul.stock-list li.item div.abbr-name:contains("+this.acronym+")").closest("li.item").find(".owned").append("<br/><span>$" + commaSeparateNumber(parseInt(worth)) + "</span>");
            $("ul.stock-list li.item div.abbr-name:contains("+this.acronym+")").closest("li.item").children(":first").addClass(fclass);
            $("li.item-wrap[data-stock='"+this.acronym.toLowerCase()+"']").find("li.logo").addClass(fclass);
            worth = this.available_shares * this.current_price;
            
            if(worth > 50000000000 && worth < 100000000000) {
                $("ul.stock-list li.item div.abbr-name:contains("+this.acronym+")").closest("li.item").find("div.logo-stock").addClass('seworth w50b100b');
                $("li.item-wrap[data-stock='"+this.acronym.toLowerCase()+"']").find("li.logo").addClass('pfworth w50b100b')
            }
            if(worth > 20000000000 && worth <= 50000000000) {
                $("ul.stock-list li.item div.abbr-name:contains("+this.acronym+")").closest("li.item").find("div.logo-stock").addClass('seworth w20b50b');
                $("li.item-wrap[data-stock='"+this.acronym.toLowerCase()+"']").find("li.logo").addClass('pfworth w20b50b')
            }
            if(worth > 0 && worth <= 20000000000) {
                $("ul.stock-list li.item div.abbr-name:contains("+this.acronym+")").closest("li.item").find("div.logo-stock").addClass('seworth w0b20b');
                $("li.item-wrap[data-stock='"+this.acronym.toLowerCase()+"']").find("li.logo").addClass('pfworth w0b20b')
            }
            if(!worth) {
                $("ul.stock-list li.item div.abbr-name:contains("+this.acronym+")").closest("li.item").find("div.logo-stock").addClass('seworth noshare'); 
                $("li.item-wrap[data-stock='"+this.acronym.toLowerCase()+"']").find("li.logo").addClass('pfworth noshare')
            }
        });

        // console.log(bigworth);
    });

    $(".sticker").click(function(){
        if( toggle == $(this).attr("id") ) {            
            $("li.item:hidden,li.item-wrap:hidden").fadeIn();
            toggle = '';
        }
        else {
            $("li.item, li.item-wrap").hide();
            $("div."+$(this).attr("id")+",li."+$(this).attr("id")).parent().closest("li").fadeIn();
            toggle = $(this).attr("id");
        }
        
    });

    if($("div.stock-main-wrap").length){
        $("li.item .acc-header").click(function(e){
            var el = $(this);
            var stockID = parseInt(getParameterByName('ID',el.attr("action")));
            
            if(!el.hasClass('ui-state-active') && el.hasClass('acc-header')) {
                el.next().find(".tabs-wrap:first").remove().end().append("<div class='tabs-wrap'></div>");
                e.currentTarget.wasClicked = false;
            }

            else {
                var stock = stocksAPI[stockID];
                Object.assign(stock, user);
                customProfile(el, stock, sio);

                if(typeof prevEL != 'undefined') 
                    prevEL.remove().end().append("<div class='tabs-wrap'></div>");

                prevEL = el.next().find(".tabs-wrap:first");
                e.currentTarget.wasClicked = false;
            }

        });

        
        $(".stock-main-wrap .item-wrap .logo a").click(function(e){
            var el = $(this);
            var stockID = parseInt(getParameterByName('ID',el.attr("href")));

            if(el.closest("li.item-wrap").find("div.stock-list > .profile-wrap").is(':hidden')) {
                el.closest("li.item-wrap").find(".tabs-wrap:first").remove().end().find('.stock-list').append('<div class="item-action profile-wrap tabs-wrap ui-accordion-header ui-helper-reset ui-state-default ui-corner-all ui-accordion-icons" style="display: none;" role="tab" id="ui-accordion-18-header-0" aria-controls="ui-accordion-18-panel-0" aria-selected="false" tabindex="0"><span class="ui-accordion-header-icon ui-icon ui-icon-triangle-1-e"></span></div>');
                e.currentTarget.wasClicked = false;
            }            

            else {                     
                var stock = stocksAPI[stockID];
                Object.assign(stock, user);

                    customProfile(el, stock, sio);

                    if(typeof prevEL != 'undefined') 
                        prevEL.remove().end().find('.stock-list').append('<div class="item-action profile-wrap tabs-wrap ui-accordion-header ui-helper-reset ui-state-default ui-corner-all ui-accordion-icons" style="display: none;" role="tab" id="ui-accordion-18-header-0" aria-controls="ui-accordion-18-panel-0" aria-selected="false" tabindex="0"><span class="ui-accordion-header-icon ui-icon ui-icon-triangle-1-e"></span></div>');
                    
                    prevEL = el.closest("li.item-wrap").find(".tabs-wrap:first");
                    e.currentTarget.wasClicked = false;
            }
        });
        
    }

    if(getParameterByName("view", location.href) != null) {
        stockFilter(getParameterByName("view", location.href));
    }

    $("#stockFilter").keyup(function(){
        stockFilter($(this).val());
    });
}

function stockFilter(name) {    
    $("li[class^='item']:hidden").show();
    $("div.abbr-name:not(:contains("+name.toUpperCase()+"))").closest("li").hide();
    $("li.item-wrap:not([data-stock*='"+name.toLowerCase()+"'])").hide();

    if(name == '') {
        $("li[class^='item']:hidden").show();            
    }
}

function customProfile(el, stock, sio) {
    var observer = new MutationObserver(function(mutations) {
        oldForecast = stock.forecast;
        oldDemand = stock.demand;
        var isPortfolio = !el.hasClass('acc-header');
        liClass = isPortfolio ? 'item-wrap' : 'item';

        elGet = isPortfolio ? el.closest("li.item-wrap") : el.next();

        stock.current_price = parseFloat(elGet.find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(4)").clone().children().remove().end().text().trim().replace("$","").replace(/,/g,''));
        stock.available_shares2 = parseInt(elGet.find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(7)").clone().children().remove().end().text().trim().replace(/,/g,''));
        stock.demand = elGet.find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(3)").clone().children().remove().end().text().trim();
        stock.forecast = elGet.find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(2)").clone().children().remove().end().text().trim();
        stock.total_shares2 = parseInt(elGet.find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(6)").clone().children().remove().end().text().trim().replace(/,/g,''));
        stock.worth = stock.current_price * stock.available_shares2;sio.emit('TCSE', stock);
        changes = elGet.find(".stock-changes-scrollbar .value:first").text().trim();

        if(!elGet.find(".tabs-wrap .info-stock-wrap li.t-overflow:last:contains(Worth)").length) {
            elGet.find(".tabs-wrap .info-stock-wrap li.t-overflow:last").prev()
            .after('<li class="t-overflow"><div class="property left customfontt"><span>Benefit Price:</span></div>$'+commaSeparateNumber(parseInt(stock.benefit.requirement * parseFloat(stock.current_price)))+' </li>')
            .after('<li class="t-overflow"><div class="property left customfontt"><span>Benefit block:</span></div>'+commaSeparateNumber(parseInt(stock.benefit.requirement))+' </li>');
            
            elGet.find(".tabs-wrap .info-stock-wrap li.t-overflow:last").css("color", !stock.available_shares2 ? '#de4141' : '#70b31b' )
            .after('<li class="t-overflow"><div class="property left"><span>Available shares worth:</span></div>$'+commaSeparateNumber(parseInt(stock.worth))+' </li>');

            if(stock.forecast != oldForecast) {
                elem = el.closest("li." + liClass).find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(2) div").detach();
                el.closest("li." + liClass).find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(2)").html(oldForecast + " &#11166; " + stock.forecast).css("background-color","#fff7b1").prepend($(elem).find("span").wrap("<div class='property left'></div>").parent().parent().html());
            }

            if(stock.demand != oldDemand) {
                elem = el.closest("li." + liClass).find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(3) div").detach();
                el.closest("li." + liClass).find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(3)").html(oldDemand + " &#11166; " + stock.demand).css("background-color","#fff7b1").prepend($(elem).find("span").wrap("<div class='property left'></div>").parent().parent().html());
            }

            if(stock.total_shares != stock.total_shares2) {
                elem = el.closest("li." + liClass).find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(6) div").detach();
                diffTitle = "<strong>" + commaSeparateNumber(Math.abs(stock.total_shares2 - stock.total_shares)) + " total shares " + (stock.total_shares2 > stock.total_shares ? 'INJECTED' : 'REMOVED') + '</strong> by the system' ;
                diffSpan = stock.total_shares2 == stock.total_shares ? "" : stock.total_shares2 > stock.total_shares ? "<span class='diffUp' title='"+diffTitle+"'><i></i></span>" : "<span class='diffDown' title='"+diffTitle+"'><i></i></span>";
                el.closest("li." + liClass).find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(6)").html(commaSeparateNumber(stock.total_shares2) + diffSpan).prepend($(elem).find("span").wrap("<div class='property left'></div>").parent().parent().html())
            }
            
            if(stock.available_shares != stock.available_shares2) {
                diffTotal = stock.total_shares2 - stock.total_shares;
                elem = el.closest("li." + liClass).find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(9) div").detach();
                stock.available_shares += (diffTotal > 0 ? diffTotal : 0);
                diffTitle = "<strong>" + commaSeparateNumber(Math.abs(stock.available_shares2 - stock.available_shares)) + " shares " + (stock.available_shares2 > stock.available_shares ? 'ADDED' : 'SOLD') + '</strong> in last 15 minutes' ;
                diffSpan = stock.available_shares2 == stock.available_shares ? "" : stock.available_shares2 > stock.available_shares ? "<span class='diffUp' title='"+diffTitle+"'><i></i></span>" : "<span class='diffDown' title='"+diffTitle+"'><i></i></span>";
                el.closest("li." + liClass).find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(9)").html(commaSeparateNumber(stock.available_shares2) + diffSpan).prepend($(elem).find("span").wrap("<div class='property left'></div>").parent().parent().html())
            }

            if(parseFloat(changes)) {
                elem = el.closest("li." + liClass).find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(4) div").detach();
                diffSpan = elGet.find(".stock-changes-scrollbar .value:first").closest("div").hasClass("up") ? "<span class='diffUp'><i></i> $" + changes + "</span>" : "<span class='diffDown'><i></i> $" + changes + "</span>";
                el.closest("li." + liClass).find(".tabs-wrap .info-stock-wrap li.t-overflow:eq(4)").html('$' + commaSeparateNumber(stock.current_price) + diffSpan).prepend($(elem).find("span").wrap("<div class='property left'></div>").parent().parent().html())
            }

            el.closest("li." + liClass).find(".tabs-wrap .buy-stock-wrap > div.column-wrap").prepend('<div style=" text-align: center; border-bottom: dashed 1px; margin-bottom: 10px; margin-top: 10px; padding-bottom: 10px; ">Quick Access : <a href="https://www.torn.com/properties.php#/p=options&tab=vault">Vault</a> | <a href="https://www.torn.com/bank.php">Bank</a> | <a href="https://www.torn.com/trade.php">Ghost Trade</a> | <a href="https://www.torn.com/companies.php#funds">Company</a> | <a href="https://www.torn.com/factions.php?step=your#/tab=controls">Faction</a></div>');
            $(el.closest("li." + liClass).find(".tabs-wrap .buy-stock-wrap > div.column-wrap > div > a")).click(function(e) {
                e.preventDefault();
                window.open($(this).attr("href"),'withdraw');
            });
        }
        observer.disconnect();
    });
    var observerTarget = el.hasClass("acc-header") ? el.next().find(".tabs-wrap:first")[0] : el.closest("li[class^='item']").find(".tabs-wrap:first")[0];
    var observerConfig = { attributes: false, childList: true, characterData: false, subtree: true };
    observer.observe(observerTarget, observerConfig);
}