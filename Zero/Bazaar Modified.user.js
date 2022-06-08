// ==UserScript==
// @name         Bazaar Modified
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  test
// @author       You
// @match        https://www.torn.com/zero
// @match        https://www.torn.com/bazaar.php*
// @grant        none
// @license MIT
// ==/UserScript==

/*eslint no-undef: 0*/

// USER API KEY
const api = '';

// Target list (switched to mine to play with)
var target_list = ['2100735']; //['2669774'];

// Targets. Changed to save as {ID: {sum: sum_market_value, sum_price: sum_bazaar_prices}, ...}
// Just for experimentation, won't really need both.
var target_dictionary = {};

// Differece Percentage
const perc = 0;

// Checking interval in Seconds
const time = 6;

const sound = new Audio('https://cdn.discordapp.com/attachments/896787212966953053/983906150162514000/56895DING.mp3');

// Doesn't need to be async unles you need an 'await' in it (or in function it in turn calls)
async function add_style() {
    $('#skip-to-content').html('ZERO');

    let img_ad = 'https://media.discordapp.net/attachments/921067367008698418/982110867590119486/unknown.png';
    let new_icon = `<img src=${img_ad} alt="-zero" width="100%">`;
    $('#mainContainer > div.content-wrapper.logged-out.left.spring > div.main-wrap.error-404').html(new_icon);
    document.title = "Zero";

}

async function check(){
    for (var index in target_list){
        let target = target_list[index];

        let url = `https://api.torn.com/user/${target}?selections=bazaar&key=${api}`;
        let new_data = await fetch(url).then(
            data =>{
                return data.json().then(
                dat =>{
                    return dat.bazaar;
                });
            });


        let sum = 0;
        let sum_price = 0;
        for (let i=0; i < new_data.length; i++){
            sum += new_data[i].quantity * new_data[i].market_price;
            sum_price += new_data[i].quantity * new_data[i].price;
        }
        console.log('[bazaar] fetch returned: ', new_data);
        console.log(`[bazaar] ${target}: ${sum} and ${target_dictionary[target]}`);

        if (target in target_dictionary){
            console.log('[bazaar] checking sum market price: ', sum, ' to ', (1-perc/100), ' * times ', target_dictionary[target].sum);
            if (sum < (1-perc/100) * target_dictionary[target].sum) { // See if total is < n% value, or removed
                sound.play();
                console.log(`[bazaar] ${target} bazaar market value dropped!!`);
                alert(`${target} bazaar market value dropped!!`)
                target_dictionary[target] = {sum: sum, sum_price: sum_price}; // save new, really low price. Will re-save a $1000 item at < $10
            }
            else if (sum > target_dictionary[target].sum){ // If increased, save again.
                target_dictionary[target] = {sum: sum, sum_price: sum_price};
                console.log(`[bazaar ${target} bazaar market value updated!!`);
            }

            /* Test - just saving bazaar price, too, and comparing.
            console.log('[bazaar] now checking price: ', sum_price, ' to ', (1-perc/100), ' * times ', target_dictionary[target].sum_price);
            if (sum_price < (1-perc/100) * target_dictionary[target].sum_price) { // See if total is < n% value, or removed
                sound.play();
                console.log(`[bazaar] `${target} bazaar price dropped!!`);
                alert(`${target} bazaar price dropped!!`)
                target_dictionary[target] = {sum: sum, sum_price: sum_price}; // save new price.
            }
            else if (sum_price > target_dictionary[target].sum_price){ // If increased, save again.
                target_dictionary[target] = {sum: sum, sum_price: sum_price};
                console.log(`[bazaar] ${target} bazaar price updated!!`);
            }
            */
        }
        else { // Not in the dictionary, new - add it.
            target_dictionary[target] = {sum: sum, sum_price: sum_price};
            console.log('[bazaar] adding new value: ', target_dictionary[target]);
        }
    }
    setTimeout(console.log(), 2000);
}

// initialise();
console.log('[bazaar] script started.');
add_style();
setInterval(check, time*1000);


