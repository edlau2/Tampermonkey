// ==UserScript==
// @name         CTMAP - Extended View
// @namespace    Heasleys.ctextended
// @version      1.2
// @description  My weird project to extend and redesign the christmas town map viewer
// @author       Heasleys4hemp [1468764]
// @match        *.torn.com/christmas_town.php*
// @grant        GM_addStyle
// @updateURL    https://github.com/Heasleys/bird-scripts/raw/master/ctextended.user.js
// ==/UserScript==

var ctobserver = new MutationObserver(function(mutations) {
    if ($("#ct-wrap").length == 1 && $('#wb-ct-extended').length == 0) {
        initCTExtended();
        ctobserver.disconnect();
    }
});


$(window).load(function () {
    ctobserver.observe(document, {attributes: false, childList: true, characterData: false, subtree:true});
});

function initCTExtended() {
    $('.core-layout__viewport').before(`
    <div class="wb-ct-title" id="wb-ct-extended">
      <span>CT Extended
        <button class="wb-ct-button" id="toggleExtend">Extend View</button>
        <button class="wb-ct-button" id="toggleBorder" hidden>Toggle Fog</button>
      </span>
    </div>
  `);

    $('.user-map-container').before(`<p id="ct-message" style="display: none;">Welcome to Christmas Town!</p>`);

    $('#toggleExtend').on('click', function(){
        $('.content-wrapper').toggleClass('wb-extended');
        $('.user-map-container').removeClass('wb-hidden');
        $('.status-area-container').addClass('wb-hidden');
        $('#ct-message').toggle();
    });

    $('#toggleBorder').on('click', function(){
        $('.user-map').toggleClass('wb-user-map');
    });

    interceptFetch('christmas_town.php', (response, url) => {
        if ($('.content-wrapper.wb-extended').length > 0) {
            if (response && response.mapData) {
                if (response.mapData.trigger) {
                    if (response.mapData.trigger.message) {
                        $('#ct-message').text(response.mapData.trigger.message);
                    }

                    if (response.mapData.trigger.miniGameType && response.mapData.trigger.miniGameType != "Teleport") {
                        console.log("I found a mini game");
                        console.log(response.mapData.trigger.miniGameType);
                        $('.user-map-container').addClass('wb-hidden');
                        $('.status-area-container').removeClass('wb-hidden');
                    } else {
                        $('.user-map-container').removeClass('wb-hidden');
                        $('.status-area-container').addClass('wb-hidden');
                    }

                    if (response.mapData.trigger.item) {
                        let text = $('#ct-message').text();
                        $('#ct-message').html(`
                         ${text}<br>
                         <div class='wb-itemImage'>
                         <img src="${response.mapData.trigger.item.image.url}">
                         </div>
                        `);
                    }
                }

                if (response.mapData.cellEvent && response.mapData.cellEvent.type != "teleport") {
                    $('.user-map-container').addClass('wb-hidden');
                    $('.status-area-container').removeClass('wb-hidden');
                } else {
                    $('.user-map-container').removeClass('wb-hidden');
                    $('.status-area-container').addClass('wb-hidden');
                }
            }
        }
    });

}







GM_addStyle(`

  .wb-ct-title {
    border: 1px solid #a7bec9;
    padding: 5px;
    margin-bottom: 10px;
    display: block;
    color: #668fa3;
    text-shadow: 0 1px 0 hsla(0,0%,100%,.45);
    font-size: 15px;
    letter-spacing: 1px;
    font-weight: 400;
    line-height: 1.6;
    background: linear-gradient(180deg,#fff,#e0edf3 99%);
    border-radius: 5px 5px 0 0;
  }

  .wb-ct-title > span {
    padding-left: 5px;
    padding-right: 10px;
  }

  .wb-ct-button {
      border-radius: 5px;
      cursor: pointer;
      background-color: rgb(242, 242, 242);
      color: rgb(51, 51, 51);
      line-height: 20px;
      text-overflow: ellipsis;
      white-space: nowrap;
      border: 1px solid #a7bec9;
      text-decoration: none;
      overflow: hidden;
      padding: 0 5px;
      margin: 0 5px;
  }
  .wb-ct-button:disabled {
    background-color: rgb(219, 219, 219);
   }
  .wb-ct-button:hover:enabled {
    background-color: rgb(250, 250, 250);
   }

   #ct-message {
     text-align: center;
     font-size: 15px;
     letter-spacing: 1px;
     font-weight: 400;
     line-height: 1.6;
     padding: 6px;
     color: rgb(102, 143, 163);
     background: url(/images/v2/christmas_town/bg_image_path.jpg) center 0 no-repeat;
     background-size: cover;
     height: 72px;
     border: 1px solid #bfd0d8;
   }

   .wb-extended .wb-hidden {
     display: none;
   }

   .wb-extended #ct-wrap {
    display: flex;
    flex-direction: column;
   }

   .d .wb-extended #ct-wrap .user-map-container {
     grid-column: 1;
     width: 784px;
   }

   .d .wb-extended #ct-wrap .map-overview {
     width: 784px;
     height: 600px;
   }

   .d .wb-extended #ct-wrap .map-overview #world {
     left: 31%;
     top: 25%;
   }

   .d .wb-extended #ct-wrap .user-map-container .user-map::before {
     background: unset;
   }
   .wb-extended #ct-wrap .map-directions {
     display: none;
   }

.wb-user-map {

}

   .d .wb-extended .items-container .swiper-slide {
     width: 282px !important;
   }

   .d .wb-extended .status-area-container {
     min-height: 300px;
   }
   .d .wb-extended .status-area-container > div {
     min-height: 300px;
   }

   .d .wb-extended .status-area-container [class^="game-start-screen"] {
     background-repeat: repeat;
   }


   .wb-extended .wb-itemImage {
    background: #f1f4f6;
    background: -o-linear-gradient(bottom,#f1f4f6 0,#e8eef1 100%);
    background: -webkit-gradient(linear,left bottom,left top,from(#f1f4f6),to(#e8eef1));
    background: -o-linear-gradient(bottom,#f1f4f6,#e8eef1);
    background: linear-gradient(0deg,#f1f4f6,#e8eef1);
    border-bottom: 1px solid #fff;
    border-radius: 5px;
    -webkit-box-shadow: inset 0 2px 5px rgba(0,76,102,.35);
    box-shadow: inset 0 2px 5px rgba(0,76,102,.35);
    height: 50px;
    margin: 0 auto;
    position: relative;
    width: 100px;
   }

   .wb-extended .wb-itemTitle {
    color: #72bfac;
    font-size: 20px;
    font-weight: 400;
    line-height: 30px;
    margin: 0;
    padding: 10px;
    text-align: center;
   }

   .wb-extended .wb-itemDebugModeIcon {
    -webkit-box-pack: center;
    -ms-flex-pack: center;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    bottom: 0;
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    justify-content: center;
    position: absolute;
    top: 0;
    width: 100%;
   }

   .wb-extended .status-area-container.wb-textview {
      width: 100%;
      height: 500px;
      position: absolute;
   }

  `);


function interceptFetch(url, callback) {
    unsafeWindow.fetch = async (input, options) => {
        const response = await fetch(input, options)

        if (response.url.startsWith("https://www.torn.com/" + url)) {
            let res = response.clone();

            Promise.resolve(res.json().then((json) => callback(json, res.url)));
        }

        return response;
    }
}
