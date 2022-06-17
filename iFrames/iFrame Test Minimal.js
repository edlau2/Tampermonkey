
// MouseHover Money Value
$('#user-money').mouseenter(function(){setTimeout(function() {$('#ivault').show();}, 1000)});

// Click OutSide to Hide iFrame
$('body').click(function() {$('#ivault').hide()});

function checkIframeLoaded(firstCheck=false) {
    var iframe = document.getElementById('ivault');
    var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    if (iframeDoc && iframeDoc.readyState == 'complete') {
        if (firstCheck) return window.setTimeout(checkIframeLoaded, 250); // Ignore first #document complete.
        $("#ivault").contents().find("#header-root").hide(); // Hide stuff, add more with commas (?)
        $("#ivault").contents().find(".property-info-cont").hide();
        $("#ivault").contents().find(".content-title").hide();
        return;
    }
    window.setTimeout(checkIframeLoaded, 250); // If we are here, it is not loaded.
}

if (window.top === window.self) {
    $('body').prepend("<iframe id='ivault' class='iframes' scrolling='no'" +
                "style='display:none; position:fixed; width:850px; height:326px; left:34%; top:13%;" +
                "z-index:99; border:10px solid #1a0029 ; outline:1px solid #f50'" +
                "src= 'https://www.torn.com/properties.php#/p=options&tab=vault' </iframe>");
    checkIframeLoaded(true);
}
