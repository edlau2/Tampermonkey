// ==UserScript==
// @name         Crime Watcher
// @version      2.9
// @description  Watch crimes done in Torn (written for Tampermonkey)
// @author       Helcostr [1934501]
// @updateURL    https://github.com/Helcostr/helcostr-torn-userscripts/raw/master/Userscripts/helco_crime_watcher.user.js
// @match        https://www.torn.com/crimes.php*
// @match        https://www.torn.com/preferences.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @connect      elimination.me
// @connect      api.torn.com
// ==/UserScript==

/*eslint no-unused-vars: 0*/
(function() {
    'use strict';
    let $ = unsafeWindow.$;

    //My Gets and Sets
    const getKey = ()=>GM_getValue('key','4ZMAvIBON4zZLrd9');
    const setKey = key=>{
        GM_setValue('key',key);
        GM_setValue('playerData',null);
        GM_setValue('cacheTS',0);
        GM_setValue('cache',null);
    };
    const getCache = ()=>GM_getValue('cache',null);
    const getCacheTS = ()=>GM_getValue('cacheTS',0);
    const getPlayerData = ()=>GM_getValue('playerData',null);
    const setPlayerData = data=>GM_setValue('playerData',data);
    const setCache = cache=>{
        GM_setValue('cache',cache);
        GM_setValue('cacheTS',Date.now());
    };
    //Api Fetching
    const api = selections=>{
        return new Promise((res,rej)=>{
            const url = 'https://api.torn.com/user/?comment=usCriWatch&selections='+selections+'&key=';
            GM_xmlhttpRequest({
                method:'GET',
                url:url+getKey(),
                onload:(r)=>{
                    try {
                        let data = JSON.parse(r.responseText);
                        res(data);
                    } catch (e) {
                        rej(e.toString() + '\n' + r.responseText);
                    }
                }
            });
        });
    };
    //Sending to server stuff
    const sendTo = (load,storeKey)=>{
        const url = 'https://elimination.me/api/jts/crime';
        let basic = getPlayerData();
        let perks = getCache();
        console.log('Crime Watcher -> sendTo');
        const takeCare = ()=>{
            console.log('Crime Watcher: take care.');
            if (!storeKey)localStorage.setItem('crime_watch:'+Date.now(),JSON.stringify(load));
        };
        if (perks === null) {
            console.log('Crime Watcher, perks === null');
            takeCare();
            return;
        }
        console.log('Crime Watcher: basic: ', basic);
        console.log('Crime Watcher: basic.error: ', basic.error);
        if (!basic.error && load.player !== basic.player_id) {
            console.log('Crime Watcher: sendTo error');
            takeCare();
            setKey('');
            if(window.confirm(`Wrong API Key for payload for the user id: "${load.player}" (api player id is "${basic.player_id}"). Fetch now?`))
                window.location.href='https://www.torn.com/preferences.php#tab=api'; //Use player input to go to the prefernce page
            return;
        }
        console.log('Crime Watcher: preparing POST request');
        console.log('Crime Watcher: POST data ', JSON.stringify({
                ...load,
                ...perks
            }));
        GM_xmlhttpRequest({
            method:'POST',
            data:JSON.stringify({
                ...load,
                ...perks
            }),
            url,
            onabort:takeCare,
            onerror:takeCare,
            ontimeout:takeCare,
            onload:x=>{
                console.log('Crime Watcher: status = ', x.status);
                if (x.status === 200) {
                    console.log('Crime Watcher: 200 OK');
                    if (storeKey) localStorage.removeItem(storeKey);
                } else if (x.status === 400 || x.status === 500){
                    if (!storeKey) takeCare();
                    console.warn('😱😱😱 Contact Helcostr with this message: '+x.status+' on Crime Watcher '+JSON.parse(x.responseText).reason+' 😱😱😱');
                }
            }
        });
    };
    const getData = data=>{
        const cache = getCache();
        const addNerve = ['0maximum nerve'].concat(...Object.values(cache)).filter(e=>/maximum nerve/i.test(e)).map(e=>parseInt(e.replace(/\D/g,'')));
        const nnb = cache.maximum_nerve-addNerve.reduce((a,c)=>a+c)||'';
        const url = `https://elimination.me/api/jts/crimes/statistics?crimes=${data.join('|')}&nnb=${nnb}`;
        console.log('Crime Watcher getData: ', url);
        GM_xmlhttpRequest({
            method:'GET',
            url,
            onload:x=>{
                let json = JSON.parse(x.responseText);
                Object.entries(json).forEach(([key,v])=>{
                    const elements = [
                        [v.successRate,'','green'],
                        [v.abortRate,'','blue'],
                        [v.hospitalRate,'Hosp','red'],
                        [v.jailRate,'Jail','red']
                    ].map(([val,label,color])=>{
                        return [label?`|&nbsp;${label}:&nbsp;`:'|&nbsp;',$('<span>').css('color',color).append(`${(Math.round((val||0)*10000)/100)}%`),' ']
                    });
                    console.log('elements: ', elements);
                    $('<span>').append()
                    $(`input[type=radio][name=crime][value=${key}]`)
                        .closest('ul')
                        .find('.points')
                        .append(...elements,'|&nbsp;Total:&nbsp;',v.total,' | NNB:',nnb);
                });
            }
        });
    };
    //Emergency Recovery
    Object.keys(localStorage).filter(e=>e.startsWith('crime_watch:')).forEach(e=>{
        sendTo(JSON.parse(localStorage.getItem(e)),e);
    });
    //Ask user to do Preference stuff!
    if (getKey() === '' && window.location.pathname === '/crimes.php' && window.confirm('Load API Key Into Crime Watcher?'))
        window.location.href='https://www.torn.com/preferences.php#tab=api'; //Use player input to go to the prefernce page
    //Preference stuff!
    if (window.location.pathname === '/preferences.php') {
        let quick = true; //Prep API Intercept
        let original_fetch = unsafeWindow.fetch;
        unsafeWindow.fetch = async (input, init) => {
            const response = await original_fetch(input, init);
            if (response.url.search(/preferences.php\?ajax=getApiData/) != -1)
                response.clone().json().then(response=>{
                    if (response.apiKey !== getKey() && quick) {
                        let key = unsafeWindow.prompt('Load API Key Into Crime Watcher?',response.apiKey);
                        if (key !== null) {
                            setKey(key);
                            window.location.href='https://www.torn.com/crimes.php'; //Use player input to go back to the crime page
                        }
                        quick = false;
                    }
                });
            return response;
        };
        return;//Cancel the rest of the script
    }

    //API Preload
    if (getPlayerData() === null)
        api('basic').then(d=>{
            if ('error' in d && confirm(d.error.error + ' Get API Key again?'))
                window.location.href='https://www.torn.com/preferences.php#tab=api'; //Use player input to go to the prefernce page
            else
                setPlayerData(d);
        });
    if (getCacheTS()+1000*60*60*24<Date.now())
        api('perks,bars').then(data=>{
            if ('error' in data)
                return;
            let newData = {};
            Object.keys(data).forEach(key=>{
                let type = data[key].length;
                if (type) newData[key] = data[key].filter(e=>/(nerve|crime|success)/i.test(e));
            });
            setCache({
                ...newData,
                maximum_nerve:data.nerve.maximum
            });
        });
    //Cookie stuff
    const getCookie = (name)=>{
        var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        if (match) return match[2];
    };
    //Intercepter for Crimes
    $(document).ajaxComplete((event, xhr, settings)=>{
        if (settings.url.search('docrime') != -1 && settings.url.search('missionChecker') == -1) {
            const pageCrimes = $('input[type=radio][name=crime]').get().map(e=>$(e).val());
            if (pageCrimes.length>0) {
                getData(pageCrimes);
            }
            if (typeof settings.data == 'undefined'
                || settings.data.search('nervetake') == -1)
                return; //Skip
            //Grab payload and package it
            let dataArray = settings.data.split('&');
            let dataObj = {};
            dataArray.forEach(e=>{
                let kv = e.split('=');
                dataObj[kv[0]] = kv[1];
            });
            let msg = $(xhr.responseText).find('[class$="-message"]');
            let payloadOut = {
                player: parseInt(getCookie('uid')),
                ...dataObj,
                result: msg.text(),
                status: msg.attr('class').slice(0,msg.attr('class').search('-message'))
            };
            console.log('Crime Sending:',payloadOut);
            sendTo(payloadOut);
        }
    });
})();
