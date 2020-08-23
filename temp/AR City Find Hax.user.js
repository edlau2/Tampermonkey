// ==UserScript==
// @name         AR City Find Hax
// @namespace    City Find Hax
// @version      0.4
// @description
// @author       AquaRegia
// @match        http://www.torn.com/city.php*
// @match        https://www.torn.com/city.php*
// @match        http://torn.com/city.php*
// @match        https://torn.com/city.php*
// @grant        none
// ==/UserScript==

(function(open) {

    XMLHttpRequest.prototype.open = function(method, url, async, user, pass)
    {
        if(url.indexOf("step=mapData") != -1)
        {
            this.addEventListener("readystatechange", function()
                                  {
                if(this.readyState == 4)
                {
                    var data = JSON.parse(atob(JSON.parse(this.responseText).territoryUserItems));
                    console.log(data);


                    jQuery("h4").after
                    (
                        jQuery("<div></div>").html
                        (
                            //"Data dump: " + data + "<br/>" +
                            "Number of items currently in the city: " + data.length +
                            "<br/>" +
                            "Latest item spawned: " + (data.length > 0 ? data[data.length-1].title : "Nothing, not even a shitty kitten plushie :(") +
                            (data.length > 1 ? (
                                "<br/>" +
                                "Spawn rate (all time): " + function(a, b)
                                {
                                    return ((a - b)/(data.length - 1)/3600).toFixed(1) + " hours per spawn";

                                }(parseInt(data[data.length-1].ts, 36), parseInt(data[0].ts, 36)) +
                                "<br/>" +
                                "Spawn rate (last " + Math.min(5, data.length) + "): " + function(a, b)
                                {
                                    return ((a - b)/(Math.min(5, data.length) - 1)/3600).toFixed(1) + " hours per spawn";
                                }(parseInt(data[data.length-1].ts, 36), parseInt(data[data.length-(Math.min(5, data.length))].ts, 36))) : "")
                        ).css("clear", "left")
                        .css("margin-bottom", "-20px")
                    );
                }
            }, false);
        }

        open.call(this, method, url, async, user, pass);
    };

})(XMLHttpRequest.prototype.open);