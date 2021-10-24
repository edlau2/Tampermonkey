// ==UserScript==
// @name         TORN: Mission Reward Information
// @namespace    dekleinekobini.missionrewardinformatiom
// @version      1.1.3
// @author       DeKleineKobini
// @description  Give some information about mission rewards.
// @match        https://www.torn.com/loader.php?sid=missions*
// @require      https://greasyfork.org/scripts/390917-dkk-torn-utilities/code/DKK%20Torn%20Utilities.js?version=754362
// @connect      api.torn.com
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

initScript({
    name: "Mission Reward Information",
    logging: "ALL"
});

addCSS("MRI", ".d .mod-description li:nth-child(3):after, .d .mod-description li:nth-child(4):after { content: ' '; position: absolute; display: block; width: 100%; height: 1px;  bottom: 0; left: 0; border-bottom:1px solid #000; }"
       + ".d .mod-description li:nth-child(3) { margin-left: 3px; }"
       + ".d .mod-description li:nth-child(5):before, .d .mod-description li:nth-child(6):before { content: ' '; position: absolute; display: block; width: 100%; height: 1px; top: 0; left: 0;  border-top: 1px solid #323232 }");

var spreadsheet;
var apiAmmo;

loadSpreadsheet().then(response => {
    dkklog.info("Spreadsheet information loaded.");
    spreadsheet = response;

    if ($(".rewards-list li.act").length) showInformation();
    observeMutations(document, ".rewards-slider", true, (mut, obs) => {
        observeMutations($(".rewards-slider").get(0), ".rewards-list li.act", false, showInformation, {attributes: true});
    }, {childList: true, subtree: true});
}, error => dkklog.fatal(error));

const API = new TornAPI(api => {
    api.sendRequest("user", null, "ammo").then(response => {
        apiAmmo = response.ammo;
    }, error => dkklog.error(error));
});

function loadSpreadsheet() {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            url: "https://script.google.com/macros/s/AKfycbwkO8mbiG1vfjsC03sAMutRNXGVsfPgQZ6PxM-20i0D8p95Lo5M/exec",
            method:"GET",
            onload: response => {
                try {
                    resolve(JSON.parse(response.responseText));
                } catch (error) {
                    reject(error.toString() + ": " + response.responseText);
                }
            },
            ontimeout: response => reject("Request timed out: " + response.responseText),
            onerror: response => reject("Received an error: " + response.responseText),
            onabort: response => reject("Request aborted: " + response.responseText)
        });
    });
}

function showInformation() {
    let $item = $(".rewards-list li.act");
    let item = JSON.parse($item.attr("data-ammo-info"));

    let type = item.basicType;

    if (type == "Upgrade") {
        let { name, points } = item;
        let mod = spreadsheet.filter(mod => mod.name == name)[0];

        let special = false;
        let { min, max } = mod[special ? "special" : "price"];
        let diff = max - min;
        let currentDif = max - points;
        let dif = (currentDif / diff) * 100;

        let priceMin = mod.price.min;
        let priceMax = mod.price.max;
        let specialMin = mod.special.min;
        let specialMax = mod.special.max;

        $(".mod-description > li:eq(1)").after(`<li><span>Price Range:</span> <span class="bold">${priceMin} - ${priceMax}${special ? ` @ ${dif.format(2)}%` : ""}</span></li>`)
        $(".mod-description > li:eq(2)").after(`<li><span>Special Offer Range:</span> <span class="bold">${specialMin} - ${specialMax}${special ? ` @ ${dif.format(2)}%` : ""}</span></li>`);
    } else if (type == "Ammo") {
        let { name, ammoType } = item;
        let owned;

        if (apiAmmo) {
            owned = apiAmmo.filter(ammo => ammo.size === name && ammo.type === ammoType);
            owned = owned.length ? owned[0].quantity.format() : 0;
        } else owned = "api not loaded";

        $(".ammo-description").append(`<li><span>Owned:</span> <span class="bold">${owned}</span></li>`);
        dkklog.debug("apiAmmo", apiAmmo);
    } else if (type == "Item") {
        let { points, amount } = item;

        if ($(".show-item-info .info-wrap").length) show();
        else observeMutations($(".show-item-info").get(0), ".show-item-info .info-wrap", true, show);

        function show() {
            let value = $(".show-item-info .graphs-stock:eq(0) .desc").text().replaceAll("$", "").replaceAll(",", "");

            let valueCredits = (value * amount) / points;

            let $field = $(".show-item-info .info-cont > li:not(.clear):last");
            if ($field.html().length > 0) {
                $field.after("<li class='t-left'></li>");
                $field = $(".show-item-info .info-cont > li:not(.clear):last")
            }
            $field.html(`<div class='title'>Money / Credit:</div><div class='desc'>$${valueCredits.format()}</div><div class='clear'></div>`);
        }
    } else {
        dkklog.debug("other", item);
    }
}