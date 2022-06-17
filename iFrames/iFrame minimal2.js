
// MouseHover Money Value
$('#user-money').mouseenter(function(){setTimeout(function() {$('#ivault').show();}, 1000)});

// Click OutSide to Hide iFrame
$('body').click(function() {$('#ivault').hide()});

function checkIframeLoaded() {
    let a = $("#ivault").contents().find("#header-root");
    let b = $("#ivault").contents().find(".info-msg-cont");
    let c = $("#ivault").contents().find(".property-info-cont");
    let d = $("#ivault").contents().find(".content-title");

    if ($(a).length && $(b).length && $(c).length && $(d).length) {
        // Found them all, hide them all.
        $(a).hide();
        $(b).hide();
        $(c).hide();
        $(d).hide();
        return;
    } else {
        window.setTimeout(checkIframeLoaded, 250);
    }

if (window.top === window.self) {
    $('body').prepend("<iframe id='ivault' class='iframes' scrolling='no'" +
                "style='display:none; position:fixed; width:850px; height:326px; left:34%; top:13%;" +
                "z-index:99; border:10px solid #1a0029 ; outline:1px solid #f50'" +
                "src= 'https://www.torn.com/properties.php#/p=options&tab=vault' </iframe>");
    checkIframeLoaded();
}
