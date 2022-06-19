// Defines the iframe and contents we'd like to add. This happens to be the
// 'ivault' frame, we can have as many as we like.
const vaultFrameID = 'ivault';
const vaultFrame = "<iframe id='" + vaultFrameID + "' class='iframes' scrolling='no'" +
                "style='display:none; position:fixed; width:850px; height:326px; left:34%; top:13%;" +
                "z-index:99; border:10px solid #1a0029 ; outline:1px solid #f50'" +
                "src= 'https://www.torn.com/properties.php#/p=options&tab=vault' </iframe>";

// We can save this when created as an easy way to check for existence.
// var iframe = null;



// Hide an element (adds the 'display: none;' CSS style)
function hideElement(e) {
    if (!$(e).hasClass('myHideClass')) $(e).addClass('myHideClass');
}

// Same as above, using the 'spread' operator
function getFrameElements3(iFrameID, ...selectors) {
    console.log('[getFrameElements3] id: ', iFrameID, ' selectors length: ', selectors.length);
    let retArray = [];
    for(let sel of selectors) {
        let arr = Array.from($('#' + iFrameID).contents().find(sel));
        if (arr.length) retArray = [...retArray, ...arr];
    }
    return retArray;
}

// Now we could combine the above and hide also
function hideFrameElements3(iFrameID, ...selectors) {
    let arr = getFrameElements3(iFrameID, ...selectors);
    arr.forEach(e => hideElement(e));
}


// Once an iFrame is created, this will check the content, once the iFrame body itself
// has been created, and selectively hide whatever is specified.
function checkIframeLoaded(id, firstCheck=false) {
    // Get a handle to the iframe element
    let iframe = document.getElementById(id);
    if (!iframe) {
        log('ERROR: iFrame not yet created!');
        return;
    }
    var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    if (iframeDoc && iframeDoc.readyState == 'complete') {
        log('[checkIframeLoaded] complete!');
        if (firstCheck) return window.setTimeout(function(){checkIframeLoaded(id)}, 250); // Ignore first #document complete.

        //debugger; // Uncomment to stop in the debugger
        
        if (id == vaultFrameID) { // vault specific stuff
            // Prob be better here to define arrays of stuff to hide, and pass those. If you want to handle many iFrames.
            hideFrameElements3(id, ".info-msg-cont", ".property-info-cont", ".content-title", "a", "#header-root");
        } // else if (id == 'some-other-id, maybe refills?') { ...

        return;
    }

    // If we are here, it is not loaded.
    window.setTimeout(function(){checkIframeLoaded(id)}, 250);
}

function loadiFrame(frame, id) {
    // Vault iFrame
    if (window.top === window.self) {     // Run Script if the Focus is Main Window (Don't also put inside the iFrame!)
        log('Prepending iFrame');
        $('body').prepend(frame);
        iframe = document.getElementById(id); // save this so we know we've done this.
        checkIframeLoaded(id, true);
    }
}

//////////////////////////////////////////////////////////////////////
// Main.
//////////////////////////////////////////////////////////////////////

// Add the style to hide an element
GM_addStyle(`.myHideClass {display: none;}`);

// MouseHover Money Value. If the timeout (for the mouseenter) is interupted
// by the mouseleave, it cancels the fn to 'show'.
$('#user-money')
    .mouseenter(function(){
        log('[mouseenter]');
        $(this).data('timeout',
            setTimeout(function() {
              $('#ivault').show();
              checkIframeLoaded(vaultFrameID, true);
        }, 1000))
    })
    .mouseleave(function () {
        clearTimeout($(this).data('timeout'));});

// Click OutSide to Hide iFrame. This would trigger anywhere in the body.
// Right now, all it does it hide the entire 'ivault' iframe.
$('body').click(function() {
    log('[body.click]');
    $('#ivault').hide();
});

loadiFrame(vaultFrame, vaultFrameID); // Do the vault iFrame ...
// loadiFrame(refillFrame, refillFrameID); // another one ...
