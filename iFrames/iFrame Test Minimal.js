
// MouseHover Money Value
$('#user-money').mouseenter(function(){setTimeout(function() {$('#ivault').show();}, 1000)});

// Click OutSide to Hide iFrame
$('body').click(function() {$('#ivault').hide()});

function hideHeader() {
    if ($('#ivault').length) {
        if ($("#ivault").contents().find("#header-root").length) {
            $("#ivault").contents().find("#header-root").hide();
        } else {
            setTimeout(hideHeader, 250);
        }
    }
}

if (window.top === window.self) {
    $('body').prepend("<iframe id='ivault' class='iframes' scrolling='no'" +
                "style='display:none; position:fixed; width:850px; height:326px; left:34%; top:13%;" +
                "z-index:99; border:10px solid #1a0029 ; outline:1px solid #f50'" +
                "src= 'https://www.torn.com/properties.php#/p=options&tab=vault' </iframe>");
    hideHeader();
}
