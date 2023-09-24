// ==UserScript==
// @name                Alteracoes
// @version             20220411.1
// @author              magno
// @description         Torn City Enhancer
// @include             http*://www.torn.com/*
// @include             http*://torn.com/*
// @require             https://ajax.googleapis.com/ajax/libs/jquery/3.4.0/jquery.min.js
// @require             https://gist.github.com/raw/2625891/waitForKeyElements.js
// @exclude             http://www.torn.com/js/channel/trampoline.html
// @exclude             http*://www.torn.com/js/chat/*
// @exclude             http*://www.torn.com/includes/*
// @grant               GM_getValue
// @grant               GM_setValue
// @grant               GM_log
// @grant               GM_xmlhttpRequest
// @grant               GM_openInTab
// @grant               GM_listValues
// @grant               GM_addStyle
// @connect             www.torntuga.com
// @connect             api.torn.com
// @connect             travelrun.torncentral.com
// @connect             yata.yt
// ==/UserScript==

GM_setValue('alt_versao','20220411.1');

//Summary:
// 06/02/16: Changed employee last action in company employee list
// 09/02/16: Fixes in employee last action (companies)
// 14/02/16: Faster load of employee last action (companies)
// 28/02/16: Fix in forum unread message notifications
// 15/03/16: Added last action in faction member list
// 19/03/16: Added option to hide missions link
// 19/03/16: Added customizable options for personal stats
// 19/03/16: Added option to hide crimes left for next merit
// 02/04/16: Added link in sidebar for Russian Roulette
// 10/05/16: Fix in Configurations layout
// 11/05/16: Fixed option to hide images from map in the city
// 12/05/16: Added a mailbox indicator while travelling
// 22/05/16: Added money on hand while travelling
// 01/06/16: Fixed city finds after layout change
// 24/06/16: Fixed warbase settings
// 08/07/16: Not a real update, just reorganizing stuff
// 27/07/16: Added option to add Bounties to sidebar
// 27/07/16: Extra Chain bar only shows up when chaining
// 03/08/16: Added option to redirect to gym after Xanax/FHC taken
// 08/09/16: Display personal stats abroad.
// 08/09/16: Added link to Wheels in sidebar
// 08/09/16: Added possibility to remove some crimes
// 14/09/16: Fixed error in extra chain bar
// 26/09/16: Fixed error in personal stats abroad
// 13/10/16: Fixed redirection to gym after taking Xanax
// 22/10/16: Fix in forum unread message notifications
// 03/11/16: Changed data source of employee/member last action to API
// 22/11/16: Added more stats to personal stats
// 07/01/17: Added link to stockmarket in sidebar
// 09/01/17: Added option to remove facebook stuff
// 10/01/17: Highlight your name in chat windows
// 11/01/17: Fix in chat highlight
// 12/01/17: Fixed price information from TravelRun in Home and Travel Agency
// 13/01/17: Improved layouts of some functionalities
// 22/01/17: Show cut text in personal perks
// 23/01/17: Improved layout of next crime merits in Home
// 25/01/17: Added plushies price information in Home from TravelRun
// 28/02/17: Adjusted to new home screen layout
// 02/03/17: Some more fixes in new Home layout
// 02/03/17: Remove table borders in Home and in profiles
// 02/03/17: Added total money in own bazaar
// 03/03/17: Fix in bazaar total money
// 03/03/17: Add total items and worth in display
// 03/03/17: Added Count of items in item page
// 07/03/17: Quick Fix for Home Page not working
// 12/03/17: Extra chain counter removed temporarily to adjust to new scripting rules
// 21/03/17: Fix in bazaar total money
// 21/03/17: Layout of script configuration adjusted to new Torn styles
// 02/04/17: Fixed a conflict error with Tornstats script
// 27/05/17: Added Total warbase count in faction
// 27/05/17: Readded Extra Chain Bar now using API
// 26/06/17: Removed Total Warbase count due to changes in warbase
// 27/08/17: Fixed Time Format for time display
// 31/08/17: Fixed Personal stats for new profile page
// 31/10/17: Fixed bazaar total money
// 02/11/17: Added Position Counter for other Companies
// 10/11/17: Script fixed after sidebar layout changes
// 01/12/17: Several fixes in the script
// 14/12/17: Fixed Holder Mode
// 14/12/17: Added 2 more links to remove in sidebar
// 26/12/17: Fixed error in other company position counter
// 17/01/18: Fix in chat highlight
// 27/04/18: Fixed error in personal stats/employee last action
// 05/06/18: Hide Icons functionality working again
// 05/06/18: Added option to hide Fallen players from enemy factions
// 28/06/18: Added option to hide new company and faction icons
// 17/07/18: Fixed layout of links in sidebar
// 24/07/18: New fix for layout of links in sidebar
// 11/08/18: Added more stats to personal stats
// 11/08/18: Added time when cooldown ends
// 11/08/18: Added option to align Torn to left
// 11/08/18: Stopped calling API everytime an employee is trained
// 16/08/18: Changed Bookie Link
// 18/08/18: Added more statistics to bookies
// 31/10/18: Fixed OC Readiness indicator
// 12/11/18: Added Chain Alert
// 22/11/18: Fixed Employee Last Action due to API change
// 05/12/18: Fixed Member Last Action
// 13/12/18: Fixed error script stopping while travelling
// 13/12/18: Fixed extra chain bar
// 13/12/18: Fixed Sound Chain Alert
// 11/02/19: Added search filter for userlist
// 13/02/19: Fized Search Filter
// 20/04/19: Fixed Personal stats in profile page
// 29/04/19: Added Stock profit/loss amount
// 06/05/19: Fixed home page not loading
// 09/05/19: Fixed checkboxes in script configuration
// 09/05/19: Highlight people abroad with a tag
// 17/05/19: Fixed a bug in search filter
// 25/06/19: Fixed missing icons when hide an icon is selected
// 29/06/19: Fix in Stocks profit/loss amount
// 20/07/19: Added Calculate Worth of Shares for Sale in Stock Market
// 05/03/20: Added Express Bail
// 08/03/20: Fixed left menu disappearing when jailed/hospitalized
// 15/03/20: Fixed option to remove players from userlist
// 15/03/20: Fixed Hide Icons option
// 22/03/20: Added Option to hide some blocks in Stock Portfolio
// 25/03/20: Fix for hide blocks in Stock Portfolio
// 05/04/20: Removed options to remove players from userlist
// 28/07/20: Fixed layout for personal stats in profile
// 31/07/20: Readded faction members last action
// 02/08/20: Fixed total money in bazaar
// 10/08/20: Changed Flower/Plushie stock info source to YATA
// 16/09/20: Fixed company employees layout
// 21/10/20: Fixed personal stats not showing
// 21/10/20: Added option to show/hide stock market profit
// 27/10/20: Fixed Express Crimes
// 10/11/20: Fixed YATA API link for flowers and plushies
// 15/11/20: Added Purple color for chat highlight
// 26/12/20: Fixed last action in company employees/faction members
// 01/01/21: Fixed city finds in city page
// 01/01/21: Fixed money and number of mails while traveling
// 03/02/21: Changed YATA links
// 01/03/21: Fixed personal stats
// 14/03/21: Added attack link in other faction members list
// 14/03/21: Fixed warbase settings
// 04/03/21: Added Reviving skill to personal stats
// 04/03/21: Adjusted layout for dark mode
// 14/08/21: Added links to sidebar for casino
// 14/08/21: Removed obsolete stock market options
// 29/08/21: Removed unused code
// 03/10/21: Removed old bookie link
// 03/10/21: Highlight other names in chat windows
// 10/10/21: Added merits/awards for other and illegal products
// 04/11/21: Added comment for api calls and changed script api input
// 06/12/21: Changed Poker link
// 24/01/22: Fixed attack links and last action in factions list
// 27/01/22: Fixed icons hiding
// 02/02/22: Added Slots direct link
// 02/02/22: Added icons in added links
// 06/02/22: Added option to hide revives
// 06/02/22: Fixed city find highlight
// 11/02/22: Fixed bug in company layout with dark mode
// 18/02/22: Fixed jail and hospital highlight
// 11/04/22: Removed option to show number of mails while traveling

updateScript();

// dados de configuracao:
var alt_versao = GM_getValue('alt_versao', null);
var holderMode = GM_getValue('holderMode', null);
var removerBounties = GM_getValue('removerBounties', null);
var removeRevives = GM_getValue('removeRevives', null);
var lastactionf = GM_getValue('lastaction', null);
var destacarJail = GM_getValue('destacarJail', null);
var destacarHosp = GM_getValue('destacarHosp', null);
var highlightOut = GM_getValue('highlightOut', null);
var tagJail = GM_getValue('tagJail', null);
var tagHosp = GM_getValue('tagHosp', null);
var tagOut = GM_getValue('tagOut', null);
var lraces = GM_getValue('lraces', null);
var lstockmarket = GM_getValue('lstockmarket', null);
var lpoker = GM_getValue('lpoker', null);
var lbookies = GM_getValue('lbookies', null);
var lrroulette = GM_getValue('lrroulette', null);
var llottery = GM_getValue('llottery', null);
var lslots = GM_getValue('lslots', null);
var lwheels = GM_getValue('lwheels', null);
var lstocks = GM_getValue('lstocks', null);
var lnotepad = GM_getValue('lnotepad', null);
var lbounties = GM_getValue('lbounties', null);
var lactivo1 = GM_getValue('lactivo1', null);
var lactivo2 = GM_getValue('lactivo2', null);
var lactivo3 = GM_getValue('lactivo3', null);
var lactivo4 = GM_getValue('lactivo4', null);
var lactivo5 = GM_getValue('lactivo5', null);
var nomeL1 = GM_getValue('nomeL1', null);
var nomeL2 = GM_getValue('nomeL2', null);
var nomeL3 = GM_getValue('nomeL3', null);
var nomeL4 = GM_getValue('nomeL4', null);
var nomeL5 = GM_getValue('nomeL5', null);
var link1 = GM_getValue('link1', null);
var link2 = GM_getValue('link2', null);
var link3 = GM_getValue('link3', null);
var link4 = GM_getValue('link4', null);
var link5 = GM_getValue('link5', null);
var useTravAg = GM_getValue('useTravAg', null);
var lvault = GM_getValue('lvault', null);
var hideOff = GM_getValue('hideOff', null);
var hideTravel = GM_getValue('hideTravel', null);
var hideHosped = GM_getValue('hideHosped', null);
var hideFactionList = GM_getValue('hideFactionList', null);
var addAttack = GM_getValue('addAttack', null);
var chainAlert = GM_getValue('chainAlert', null);
var chainAlert_time = GM_getValue('chainAlert_time', null);
if(chainAlert_time == null){ chainAlert_time = '01:30'; }
var percStats = GM_getValue('percStats', null);
var effstats = GM_getValue('effstats', null);
var crimeMerits = GM_getValue('crimeMerits', null);
var respfaction = GM_getValue('respfaction', null);
var hidemap = GM_getValue('hidemap', null);
var flowerprices = GM_getValue('flowerprices', null);
var plushieprices = GM_getValue('plushieprices', null);
var sortitems = GM_getValue('sortitems', null);
var extrachainbar = GM_getValue('extrachainbar', null);
var personalstats = GM_getValue('personalstats', null);
var removecrimes = GM_getValue('removecrimes', null);
var redirectgym = GM_getValue('redirectgym', null);
var removeborders = GM_getValue('removeborders', null);
var positioncounter = GM_getValue('positioncounter', null);
var expressbust = GM_getValue('expressbust', null);
var expressbail = GM_getValue('expressbail', null);
var alignleft = GM_getValue('alignleft', null);
var highlightchat = GM_getValue('highlightchat', null);
var highlightchat_color = GM_getValue('highlightchat_color', null);
var highlightchatothers = GM_getValue('highlightchatothers', null);
var highlightchatothers_color = GM_getValue('highlightchatothers_color', null);
var osex     = GM_getValue('osex', null);
var odonator = GM_getValue('odonator', null);
var omarried = GM_getValue('omarried', null);
var ojob     = GM_getValue('ojob', null);
var ofaction = GM_getValue('ofaction', null);
var obank    = GM_getValue('obank', null);
var ostock   = GM_getValue('ostock', null);
var oeduc    = GM_getValue('oeduc', null);
var obooster = GM_getValue('obooster', null);
var omedical = GM_getValue('omedical', null);
var odrug    = GM_getValue('odrug', null);
var olevel100 = GM_getValue('olevel100', null);
var otrade   = GM_getValue('otrade', null);
var orace    = GM_getValue('orace', null);
var oitem    = GM_getValue('oitem', null);
var opoints  = GM_getValue('opoints', null);
var oloan    = GM_getValue('oloan', null);
var obounty  = GM_getValue('obounty', null);
var ocashier  = GM_getValue('ocashier', null);
var ohosp    = GM_getValue('ohosp', null);
var ojail    = GM_getValue('ojail', null);
var ollife   = GM_getValue('ollife', null);
var obook   = GM_getValue('obook', null);
var oupkeep   = GM_getValue('oupkeep', null);
var oaddiction   = GM_getValue('oaddiction', null);
var oradiation   = GM_getValue('oradiation', null);
var oauction   = GM_getValue('oauction', null);
var oocrimes   = GM_getValue('oocrimes', null);


var lastSub  = GM_getValue('lastSub', null);
var usageDay = GM_getValue('usageDay', null);
var rhome    = GM_getValue('rhome', null);
var ritems   = GM_getValue('ritems', null);
var rcity    = GM_getValue('rcity', null);
var rjob     = GM_getValue('rjob', null);
var rgym     = GM_getValue('rgym', null);
var rproperties = GM_getValue('rproperties', null);
var reducation  = GM_getValue('reducation', null);
var rcrimes  = GM_getValue('rcrimes', null);
var rmissions  = GM_getValue('rmissions', null);
var rnewspaper  = GM_getValue('rnewspaper', null);
var rjail    = GM_getValue('rjail', null);
var rhospital   = GM_getValue('rhospital', null);
var rcasino  = GM_getValue('rcasino', null);
var rforums  = GM_getValue('rforums', null);
var rhof     = GM_getValue('rhof', null);
var rfaction = GM_getValue('rfaction', null);
var rcitizens = GM_getValue('rcitizens', null);
var rrules    = GM_getValue('rrules', null);
var time12h  = GM_getValue('time12h', null);
var time24h  = GM_getValue('time24h', null);
var locale;
var hour12;
var travelrunprices = GM_getValue('travelrunprices', null);
var api_key =  GM_getValue('api_key', null);

var psattackswon = GM_getValue('psattackswon', null);
var psdefendswon = GM_getValue('psdefendswon', null);
var psmoneymugged = GM_getValue('psmoneymugged', null);
var pshighestlevel = GM_getValue('pshighestlevel', null);
var pskillstreak = GM_getValue('pskillstreak', null);
var pstotalrespect = GM_getValue('pstotalrespect', null);
var pspeoplebusted     = GM_getValue('pspeoplebusted', null);
var pspeoplebailed     = GM_getValue('pspeoplebailed', null);
var pscriminaloffences = GM_getValue('pscriminaloffences', null);
var pstimestravelled = GM_getValue('pstimestravelled', null);
var psrevives = GM_getValue('psrevives', null);
var psbloodwithdrawn = GM_getValue('psbloodwithdrawn', null);
var psbooksread = GM_getValue('psbooksread', null);
var psecstasy = GM_getValue('psecstasy', null);
var psxanax = GM_getValue('psxanax', null);
var psvicodin = GM_getValue('psvicodin', null);
var pslsd = GM_getValue('pslsd', null);
var psmissioncredits = GM_getValue('psmissioncredits', null);
var psnetworth  = GM_getValue('psnetworth', null);
var pslogins    = GM_getValue('pslogins', null);
var psreffils   = GM_getValue('psreffils', null);
var psenhancers = GM_getValue('psenhancers', null);
var psdonator = GM_getValue('psdonator', null);
var pscandyeaten   = GM_getValue('pscandyeaten', null);
var psalcohol = GM_getValue('psalcohol', null);
var psdrinks = GM_getValue('psdrinks', null);
var psreviveskill = GM_getValue('psreviveskill', null);

var crime2 = GM_getValue('crime2', null);
var crime3 = GM_getValue('crime3', null);
var crime4 = GM_getValue('crime4', null);
var crime5 = GM_getValue('crime5', null);
var crime6 = GM_getValue('crime6', null);
var crime7 = GM_getValue('crime7', null);
var crime8 = GM_getValue('crime8', null);
var crime9 = GM_getValue('crime9', null);
var crime10 = GM_getValue('crime10', null);
var crime11 = GM_getValue('crime11', null);
var crime12 = GM_getValue('crime12', null);
var crime13 = GM_getValue('crime13', null);
var crime14 = GM_getValue('crime14', null);
var crime15 = GM_getValue('crime15', null);
var crime16 = GM_getValue('crime16', null);
var crime17 = GM_getValue('crime17', null);
var crime18 = GM_getValue('crime18', null);

//arrays para awards
var attacksArray = new Array();
attacksArray[0] = [5, 'Woodland Camo'];
attacksArray[1] = [20, 'Desert Storm Camo'];
attacksArray[2] = [50, 'Anti Social/Urban Camo'];
attacksArray[3] = [100, 'Arctic Camo'];
attacksArray[4] = [250, 'Happy Slapper/Fall Camo'];
attacksArray[5] = [500, 'Scar Maker/Yellow Camo'];
attacksArray[6] = [1000, 'Digital Camo'];
attacksArray[7] = [2000, 'Red Camo'];
attacksArray[8] = [2500, 'Going Postal'];
attacksArray[9] = [3000, 'Blue Camo'];
attacksArray[10] = [4000, 'Orange Camo'];
attacksArray[11] = [5000, 'Pink Camo'];
attacksArray[12] = [10000, 'Somebody Call 911'];

var defendsArray = new Array();
defendsArray[0] = [50, 'Bouncer'];
defendsArray[1] = [250, 'BrickWall'];
defendsArray[2] = [500, 'Turtle'];
defendsArray[3] = [2500, 'Solid as a Rock'];
defendsArray[4] = [10000, 'Fortress'];

var ranAwayArray = new Array();
ranAwayArray[0] = [50, 'Close Escape'];
ranAwayArray[1] = [250, 'Blind Judgement'];
ranAwayArray[2] = [1000, 'Overzealous'];

var foesRanArray = new Array();
foesRanArray[0] = [50, 'Ego Smashing'];
foesRanArray[1] = [250, 'Underestimated'];
foesRanArray[2] = [1000, 'Run Forest Run'];

var killStreakArray = new Array();
killStreakArray[0] = [25, 'Strike'];
killStreakArray[1] = [50, 'Barrage'];
killStreakArray[2] = [100, 'Skirmish'];
killStreakArray[3] = [250, 'Blitzkrieg'];
killStreakArray[4] = [500, 'Onslaught'];

var criticalArray = new Array();
criticalArray[0] = [500, 'Boom Headshot'];
criticalArray[1] = [1000, '50 Cal'];
criticalArray[2] = [2500, 'Pwned in the Face'];
criticalArray[3] = [10000, 'Lee Harvey Oswald'];

var medicalArray = new Array();
medicalArray[0] = [500, 'Pin Cushion'];
medicalArray[1] = [5000, 'Painkiller Abuse'];

var bountiesArray = new Array();
bountiesArray[0] = [25, 'Hired Gun'];
bountiesArray[1] = [100, 'Bone Collector'];
bountiesArray[2] = [250, 'Bounty Hunter'];
bountiesArray[3] = [500, 'Fett'];

var itemsFoundArray = new Array();
itemsFoundArray[0] = [10, 'Watchful'];
itemsFoundArray[1] = [50, 'Finders Keepers'];
itemsFoundArray[2] = [100, 'Eagle Eye'];

var travelArray = new Array();
travelArray[0] = [25, 'Frequent Flyer'];
travelArray[1] = [100, 'Jetlagged/Mile High Club'];
travelArray[2] = [500, 'Mile High Club'];
travelArray[3] = [1000, 'There and Back'];

var arrayThefts = [[1000, 'Sneak&nbsp;Thief'], [2500, 'Prowler'], [5000, 'Safe&nbsp;Cracker'], [7500, 'Marauder'], [10000, 'Cat&nbsp;Burgler'], [12500, 'Pilferer'], [15000, 'Desperado'], [17500, 'Rustler'], [20000, 'Pick-Pocket'], [22500, 'Vandal'], [25000, 'Kleptomaniac']];
var arrayVirus = [[500, 'Ub3rn00b&nbsp;Hacker'], [1000, 'N00b&nbsp;Hacker'], [1500, '1337n00b&nbsp;Hacker'],
                  [2000, 'Ph34r3dn00b&nbsp;Hacker'], [2500, 'Ph34r3d&nbsp;Hacker'], [3000, 'Ph343d1337&nbsp;Hacker'],
                  [3500, 'Ub3rph34r3d&nbsp;Hacker'], [4000, 'Ub3r&nbsp;Hacker'], [4500, '1337&nbsp;Hacker'],
                  [5000, 'Ub3r1337&nbsp;Hacker'], [5500, 'Key&nbsp;Puncher'], [6000, 'Script&nbsp;Kid'], [7000, 'Geek Speak'], [8000, 'Techie'], [9000, 'Cyber Punk'], [10000, 'Programmer']];
var arrayMurder = [[1000, 'Beginner&nbsp;Assassin'], [2000, 'Novice&nbsp;Assassin'], [3000, 'Competent&nbsp;Assassin'],
                   [4000, 'Elite&nbsp;Assassin'], [5000, 'Deadly&nbsp;Assassin'], [6000, 'Lethal&nbsp;Assassin'], [7000, 'Fatal&nbsp;Assassin'], [8000, 'Trigger&nbsp;Assassin'], [9000, 'Hit&nbsp;Man'], [10000, 'Executioner']];
var arrayDrugs = [[250, 'Drug&nbsp;Pusher'], [500, 'Drug&nbsp;Runner'], [1000, 'Drug&nbsp;Dealer'],
                  [2000, 'Drug&nbsp;Lord'], [4000, 'Candy Man'], [6000, 'Connection'], [8000, 'King Pin'], [10000, 'Supplier']];
var arrayFraud = [[300, 'Fake'], [600, 'Counterfeit'], [900, 'Pretender'], [1200, 'Clandestine'],
                  [1500, 'Imposter'], [2000, 'Pseudo'], [2500, 'Imitation'],
                  [3000, 'Simulated'], [3500, 'Hoax'], [4000, 'Faux'],
                  [5000, 'Poser'], [6000, 'Deception'], [7000, 'Phony'], [8000, 'Parody'], [9000, 'Travesty'], [10000, 'Pyro']];
var arrayGTA = [[200, 'Gone&nbsp;In&nbsp;300&nbsp;Seconds'], [400, 'Gone&nbsp;In&nbsp;240&nbsp;Seconds'], [600, 'Gone&nbsp;In&nbsp;180&nbsp;Seconds'],
                [800, 'Gone&nbsp;In&nbsp;120&nbsp;Seconds'], [1000, 'Gone&nbsp;In&nbsp;60&nbsp;Seconds'], [1200, 'Gone&nbsp;In&nbsp;30&nbsp;Seconds'],
                [1500, 'Gone&nbsp;In&nbsp;45&nbsp;Seconds'], [2000, 'Gone&nbsp;In&nbsp;15&nbsp;Seconds'], [2500, 'Booster'],
                [3000, 'Joy&nbsp;Rider'], [3500, 'Super&nbsp;Booster'], [4000, 'Master&nbsp;Carjacker'],
                [4500, 'Slim&nbsp;Jim'], [5000, 'Novice&nbsp;Joy&nbsp;Rider'], [5500, 'Novice&nbsp;Slim&nbsp;Jim'],
                [6000, 'Professional&nbsp;Joy&nbsp;Rider'], [6500, 'Professional&nbsp;Booster'], [7000, 'Professional&nbsp;Slim&nbsp;Jim'],
                [8000, 'Master&nbsp;Joy&nbsp;Rider'], [9000, 'Master Booster'], [10000, 'Master Slim Jim']];

var arrayIllegal = [[5000,'Civil&nbsp;Offence']];
var arrayOther = [[5000,'Find&nbsp;A&nbsp;Penny,&nbsp;Pick&nbsp;It&nbsp;Up']];

var bustAwards = new Array();
bustAwards[0] = [250, 'Novice Buster'];
bustAwards[1] = [500, 'Intermediate Buster'];
bustAwards[2] = [1000, 'Advanced Buster/Bar Breaker'];
bustAwards[3] = [2000, 'Professional Buster'];
bustAwards[4] = [2500, 'Aiding and Abetting'];
bustAwards[5] = [4000, 'Expert Buster'];
bustAwards[6] = [6000, 'Master Buster'];
bustAwards[7] = [8000, 'Guru Buster'];
bustAwards[8] = [10000, 'Don\'t drop It'];

var crimesArray = [[10000, 'Society\'s Worst']];
var revivesArray = [[500, 'Florence Nightingale'], [1000, 'Second Chance']];
var refillsArray = [[250, 'Energize']];
var bazaarArray = [[100, 'Middleman']];
var auctionArray = [[100, 'Bargain Hunter']];
var virusArray = [[100, 'Silicon Valley']];
var dumpArray = [[1000, 'Optimist']];
var trashArray = [[5000, 'Eco Friendly']];
var bailArray = [[500, 'Freedom Isn\'t Free']];
var bountiesMoneyArray = [[100000000, 'Dead or Alive']];
var medicalsStolenArray = [[500, 'I\'m a Real Doctor']];

var respectAwards = new Array();
respectAwards[0] = [100, 'Recruit'];
respectAwards[1] = [500, 'Associate'];
respectAwards[2] = [1000, 'Picciotto'];
respectAwards[3] = [2500, 'Soldier'];
respectAwards[4] = [5000, 'Capo'];
respectAwards[5] = [10000, 'Contabile'];
respectAwards[6] = [25000, 'Consigliere'];

var donatorAwards = new Array();
donatorAwards[0] = [30, 'Citizenship'];
donatorAwards[1] = [100, 'Devoted'];
//donatorAwards[2] = [1000, 'Picciotto'];
//donatorAwards[3] = [1000, 'Picciotto'];
//donatorAwards[4] = [1000, 'Picciotto'];

var donator = false;
var no = document.getElementById('icon3');
if(no != null){
  donator = true;
}else{
  no = document.getElementById('icon4');
  if(no != null){
    donator = true;
  }
}
// if no time selected => default 12h
if(time12h != '1' && time24h != '1') locale = ['en-us'];
if(time12h == '1') { locale = ['en-us']; hour12 = true; }
if(time24h == '1') { locale = ['pt-PT']; hour12 = false; }

var player = $("p[class^='menu-info-row']>a").text();
if(player == ''){
  player = GM_getValue('player', null);
}else{
  GM_setValue('player', player);
}
var idFacao = GM_getValue('idFacao', null);

if(!api_key){
  api_key = get_api_key();
}

var dark_mode = $("#dark-mode-state").is(':checked');

if (document.location.href.match(/\/index\.php$/)) {
    var link;
    var ratio;
    var jailed;
    var speedNode = null;     var speedValue = null;     var speedNodeName = null;
    var strengthNode = null;  var strengthValue = null;  var strengthNodeName = null;
    var defenceNode = null;   var defenceValue = null;   var defenceNodeName = null;
    var dexterityNode = null; var dexterityValue = null; var dexterityNodeName = null;
    var totalNode = null;     var totalValue = null;     var totalNodeName = null;
    var level; var faction; var nick; var id;
    var strengthMod = null; var strengthSign = null; var effStrength = null;
    var defMod = null; var defSign = null; var effDef = null;
    var speedMod = null; var speedSign = null; var effSpeed = null;
    var dexMod = null; var dexSign = null; var effDex = null;
    var faction_out;

    //determina id da Faction
    if(! $("#skip-to-content").text().match(/Traveling|Mexico|Canada|Cayman|Kingdom|Switzerland|UAE|Dubai|South|Argentina|Hawaii|Japan|China/)){
        if( $("div[id^=item]:has(>div.title-black:contains('Faction'))").find("a.href.t-blue").length > 0 )
            idFacao = $("div[id^=item]:has(>div.title-black:contains('Faction'))").find("a.href.t-blue").attr('href').match(/(\d+)/)[0];

        GM_setValue('idFacao', idFacao);

        level = $('[class^="name"]:contains("Level")').next().text();
        nick = $('[class^="menu-value"]').text();
        id = $('[class^="menu-value"]').attr('href').match(/(\d+)/)[0];

        faction_out = $("div[id^=item]:has(>div.title-black:contains('Faction Information'))").find("a").text();

        //get stats -- selector adapted to tornstats script
        $("div[id^=item]:has(>div.title-black:contains('Battle Stats'))>div.bottom-round>div.cont-gray.battle,div[id=vinkuun-tornStats-BattleStats]:has(>div.title-black:contains('Battle Stats'))")
            .find("ul.info-cont-wrap>li:lt(5)").each(function(){
            var statNode  = $(this).find("span.desc");
            var statValue = statNode.text().replace(/[^0-9.]/g, '');
            var statMod   = $(this).find("span.mod").text().replace(/\s/g, '');
            var statName  = $(this).find("span.divider").text();
            var statNameNode = $(this).find("span.divider");

            if(statName.match(/Speed/)){
                speedValue = 1 * statValue; speedNode = statNode; speedMod = statMod; speedNodeName = statNameNode; }
            if(statName.match(/Strength/)){
                strengthValue = 1 * statValue; strengthNode = statNode; strengthMod = statMod; strengthNodeName = statNameNode;}
            if(statName.match(/Defense/)){
                defenceValue = 1 * statValue; defenceNode = statNode; defMod = statMod; defenceNodeName = statNameNode;}
            if(statName.match(/Dexterity/)){
                dexterityValue = 1 * statValue; dexterityNode = statNode; dexMod = statMod; dexterityNodeName = statNameNode; }
            if(statName.match(/Total/)){ totalValue = 1 * statValue; totalNode = statNode; totalNodeName = statNameNode;}

            $(this).find("span.divider").attr('style','width: 153px;'); //153 -> 174  //193
            statNode.css('width', '146px'); //136 -> 145  //136
        });

        //Adds stat percentage
        if (speedValue && strengthValue && defenceValue && dexterityValue && percStats == '1') {
            if (speedNode && strengthNode && defenceNode && dexterityNode) {
                var novoNode = $("<span class='descCopiedStyleFrom_desc_becauseOfTornStatsSubmit' style='color:#007bff; width:52px; padding-top: 5px; padding-right: 8px; padding-bottom: 5px; padding-left: 0px; border-right-width: 1px; border-right-style: solid; border-right-color: rgb(221, 221, 221); text-align: right; white-space: nowrap; overflow-x: hidden; overflow-y: hidden; text-overflow: ellipsis; vertical-align: top; display: inline-block; line-height: 14px;'></span>");
                speedNode.css('width', '121px');     speedNodeName.css('width', '117px');
                strengthNode.css('width', '121px');  strengthNodeName.css('width', '117px');
                defenceNode.css('width', '121px');   defenceNodeName.css('width', '117px');
                dexterityNode.css('width', '121px'); dexterityNodeName.css('width', '117px');
                totalNode.css('width', '121px');     totalNodeName.css('width', '117px');

                speedNode.after(novoNode.text(' (' + (Math.round(10000 * speedValue / totalValue) / 100) + '%)'));
                strengthNode.after(novoNode.clone().text(' (' + (Math.round(10000 * strengthValue / totalValue) / 100) + '%)'));
                defenceNode.after(novoNode.clone().text(' (' + (Math.round(10000 * defenceValue / totalValue) / 100) + '%)'));
                dexterityNode.after(novoNode.clone().text(' (' + (Math.round(10000 * dexterityValue / totalValue) / 100) + '%)'));
            }
            //save stats in memory
            GM_setValue('speedValue', speedValue.toString());
            GM_setValue('strengthValue', strengthValue.toString());
            GM_setValue('defenceValue', defenceValue.toString());
            GM_setValue('dexterityValue', dexterityValue.toString());
        }

        speedValue = Math.round(speedValue);
        strengthValue = Math.round(strengthValue);
        defenceValue = Math.round(defenceValue);
        dexterityValue = Math.round(dexterityValue);
        totalValue = Math.round(totalValue);
        var data = new Date();
        var dia = data.getDate();
        var mes = data.getMonth()+1;
        var ano = data.getFullYear();
        if(dia < 10) dia = '0' + dia;
        if(mes < 10) mes = '0' + mes;
        var mesSub = ano.toString() + mes.toString();
        var today = mesSub.toString() + dia.toString();

        //Statistical usage: id/nick/faction sent. For clarify in plain text. Just once a day is enough
        if(usageDay != today){
            requestPage4('http://www.torntuga.com/pt/stats/temp.php?id=' + id + '&nome=' + nick + '&faccao=' + faction_out + '&version=' + alt_versao);
            GM_setValue('usageDay', today);
        }

        //Effective Battle Stats
        if( effstats == '1'){
            speedSign = speedMod.charAt(0).replace('−', '-');
            speedMod = speedMod.match(/\d+/)[0] * 1;
            effSpeed = eval(speedValue + speedSign + (speedValue * speedMod / 100)).toFixed(0);

            strengthSign = strengthMod.charAt(0).replace('−', '-');
            strengthMod = strengthMod.match(/\d+/)[0] * 1;
            effStrength = eval(strengthValue + strengthSign + (strengthValue * strengthMod / 100)).toFixed(0);

            defSign = defMod.charAt(0).replace('−', '-');
            defMod = defMod.match(/\d+/)[0] * 1;
            effDef = eval(defenceValue + defSign + (defenceValue * defMod / 100)).toFixed(0);

            dexSign = dexMod.charAt(0).replace('−', '-');
            dexMod = dexMod.match(/\d+/)[0] * 1;
            effDex = eval(dexterityValue + dexSign + (dexterityValue * dexMod / 100)).toFixed(0);

            var novoUL = $( '<ul class="info-cont-wrap"></ul>' );

            var effectiveColor = dark_mode ? "color: rgb(77, 196, 85)" : "color: rgb(18, 129, 81);";

            novoUL.append( $('<li><span class="divider"><span>Strength:</span></span><span class="desc" style="' + effectiveColor + '">' + fmtNumber(effStrength) + '</span></li>') );
            novoUL.append( $('<li><span class="divider"><span>Defense:</span></span><span class="desc" style="' + effectiveColor + '">' + fmtNumber(effDef) + '</span></li>') );
            novoUL.append( $('<li><span class="divider"><span>Speed:</span></span><span class="desc" style="' + effectiveColor + '">' + fmtNumber(effSpeed) + '</span></li>') );
            novoUL.append( $('<li><span class="divider"><span>Dexterity:</span></span><span class="desc" style="' + effectiveColor + '">' + fmtNumber(effDex) + '</span></li>') );

            var effTotal = effStrength * 1 + effDef * 1 + effSpeed * 1 + effDex * 1;

            novoUL.append( $('<li class="last"><span class="divider"><span>Total:</span></span><span class="desc">' + fmtNumber(effTotal.toFixed(0)) + '</span></li>') );

            var novoDivGray = $( '<div class="cont-gray battle bottom-round">').append(novoUL);

            var novoDivTopo = $('<div class="sortable-box t-blue-cont h"><div class="title title-black active top-round"><div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>Effective Battle Stats</div></div>').append(novoDivGray);

            $("div[id^=item]:has(>div.title-black:contains('Battle Stats')), div[id=vinkuun-tornStats-BattleStats]:has(>div.title-black:contains('Battle Stats'))" ).after(novoDivTopo);
        }

        //Add flower prices from travelrun
        if(flowerprices == '1'){
            var novoDivTopo = $('<div class="sortable-box t-blue-cont h"></div>').append('<div class="title title-black active top-round"><div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>Flowers Information</div>');
            var novoDivBase = $('<div class="bottom-round"></div>');
            var novoDivGray = $('<div class="cont-gray bottom-round"></div>');
            var novoUL = $('<ul class="info-cont-wrap"></ul>');

            //bloco por flor
            novoUL.append( flowerLine('Dahlia (Mexico)', 'f260'));
            novoUL.append( flowerLine('Crocus (Canada)', 'f263'));
            novoUL.append( flowerLine('Banana Orchid (Cayman Islands)', 'f617'));
            novoUL.append( flowerLine('Orchid (Hawaii)', 'f264'));
            novoUL.append( flowerLine('Heather (United Kingdom)', 'f267'));
            novoUL.append( flowerLine('Ceibo Flower (Argentina)', 'f271'));
            novoUL.append( flowerLine('Edelweiss (Switzerland)', 'f272'));
            novoUL.append( flowerLine('Cherry Blossom (Japan)', 'f277'));
            novoUL.append( flowerLine('Peony (China)', 'f276'));
            novoUL.append( flowerLine('Tribulus Omanense (UAE)', 'f385'));
            novoUL.append( flowerLine('African Violet (South Africa)', 'f282'));

            novoUL.children(":last").addClass("last");

            novoDivGray.append(novoUL);
            novoDivBase.append(novoDivGray);
            novoDivTopo.append(novoDivBase);
            $("div[id^=item]:has(>div.title-black:contains('Property Information'))").before(novoDivTopo);

            GM_xmlhttpRequest({
                method: "GET",
                url: "https://yata.yt/api/v1/travel/export/",
                headers: {
                    'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey/0.3',
                    'Accept': 'application/atom+xml,application/xml,text/xml',
                },
                synchronous: false,
                onload: function(response) {
                    var flowersJSON = JSON.parse(response.responseText);

                    $.each(flowersJSON.stocks, function(key, location) {
                        $.each(location.stocks, function(order, item){
                            $('#f' + item.id).text(fmtNumber(item.quantity) + " - " + timeSince(location.update));
                        });
                    });
                }
            });
        }
    
        //Add plushies prices from travelrun
        if(plushieprices == '1'){
            var novoDivTopo = $('<div class="sortable-box t-blue-cont h"></div>').append('<div class="title title-black active top-round"><div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>Plushies Information</div>');
            var novoDivBase = $('<div class="bottom-round"></div>');
            var novoDivGray = $('<div class="cont-gray bottom-round"></div>');
            var novoUL = $('<ul class="info-cont-wrap"></ul>');

            //bloco por peluche
            novoUL.append( flowerLine('Jaguar Plushie (Mexico)', 'f258'));
            novoUL.append( flowerLine('Wolverine Plushie (Canada)', 'f261'));
            novoUL.append( flowerLine('Stingray Plushie (Cayman Islands)', 'f618'));
            novoUL.append( flowerLine('Red Fox Plushie (United Kingdom)', 'f268'));
            novoUL.append( flowerLine('Nessie Plushie (United Kingdom)', 'f266'));
            novoUL.append( flowerLine('Monkey Plushie (Argentina)', 'f269'));
            novoUL.append( flowerLine('Chamois Plushie (Switzerland)', 'f273'));
            novoUL.append( flowerLine('Panda Plushie (China)', 'f274'));
            novoUL.append( flowerLine('Camel Plushie (UAE)', 'f384'));
            novoUL.append( flowerLine('Lion Plushie (South Africa)', 'f281'));

            novoUL.children(":last").addClass("last");

            novoDivGray.append(novoUL);
            novoDivTopo.append(novoDivGray);
            $("div[id^=item]:has(>div.title-black:contains('Property Information'))").before(novoDivTopo);

            GM_xmlhttpRequest({
                method: "GET",
                url: "https://yata.yt/api/v1/travel/export/",
                headers: {
                    'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey/0.3',
                    'Accept': 'application/atom+xml,application/xml,text/xml',
                },
                synchronous: false,
                onload: function(response) {
                    var plushiesJSON = JSON.parse(response.responseText)

                    $.each(plushiesJSON.stocks, function(key, location) {
                        $.each(location.stocks, function(order, item){
                            $('#f' + item.id).text(fmtNumber(item.quantity) + " - " + timeSince(location.update));
                        });
                    });
                }
            });
        }

        //Adiciona Awards de Crimes
        if(crimeMerits == '1'){
            $("div[id^=item]:has(>div.title-black:contains('Criminal Record'))" ).find('li').each(
                function(item){
                    var arr = null;
                    var type = $(this).children(":first").text().trim();
                    var desc = $(this).children(":last").text();
                    var n = desc.replace(',','');

                    switch(type){
                        case 'Other':
                            type += ' (nerve: 2)';
                            arr = arrayOther;
                            break;
                        case 'Illegal products':
                            type = 'Illegal products (nerve: 3, 16)';
                            arr = arrayIllegal;
                            break;
                        case 'Theft':
                            type += ' (nerve: 4, 5, 6, 7, 15)';
                            arr = arrayThefts;
                            break;
                        case 'Computer crimes':
                            type += ' (nerve: 9, 18)';
                            arr = arrayVirus;
                            break;
                        case 'Murder':
                            type += ' (nerve: 10)';
                            arr = arrayMurder;
                            break;
                        case 'Drug deals':
                            type += ' (nerve: 8)';
                            arr = arrayDrugs;
                            break;
                        case 'Fraud crimes':
                            type = 'Fraud (nerve: 11, 13, 14, 17)';
                            arr = arrayFraud;
                            break;
                        case 'Auto theft':
                            type += ' (nerve: 12)';
                            arr = arrayGTA;
                            break;
                    }
                    $(this).children(":first").text(type);

                    if (arr != null) {
                        var mink = -1;
                        for (var k=0; k<arr.length; ++k) {
                            if ((mink == -1) && (arr[k][0] > n)) mink = k;
                        }
                        if (mink >= 0) {
                            //desc += '&nbsp;(' + arr[mink][1] + '&nbsp;--&nbsp;<b>' + (arr[mink][0] - n) + '</b>)';
                            //desc = '<span style="float:left;width:30px;">'+desc+'</span><span style="font-style:italic;float:left;width:70px;">' + arr[mink][1] + '</span><span style="font-weight:bold;color:red;width:30px;float:right;text-align:right;">' + (arr[mink][0] - n) + '</span>';
                            desc = '<span style="float:right;width:60px;">'+desc+'</span><span style="font-style:italic;float:right;width:75px;text-align:left;display:block;overflow:hidden;">' + arr[mink][1] + '</span><span style="font-weight:bold;color:red;width:35px;float:right;text-align:left;">' + (arr[mink][0] - n) + '</span>';
                            $(this).children(":last").html(desc);
                            $(this).children(":last").attr('title', desc);
                        }else{
                            $(this).children(":last").css("color","green");
                            //$(this).children(":last").html("<span style='float:left;width:30px;'>"+desc+"</span><span style='font-style:italic;float:left;width:100px'>Good job!</span>");
                            $(this).children(":last").html("<span style='float:right;width:60px;'>"+desc+"</span><span style='font-style:italic;float:right;width:75px;text-align:left'>Good job!</span>");
                        }
                    }
                }
            );
        }

        //Fix text in personal perks
        $.each( $( "#personal-perks" ).find( ".perks-desc" ), function(){
            $(this).attr("title",$(this).html());
        });

    }
}

function flowerLine(name, id){
    return '<li><span class="divider"><span>' + name + '</span></span><span id="' + id + '" class="desc" ></span></li>';
}

function timeSince(date) {
    var seconds = Math.floor((new Date().getTime()/1000 - date));
    var interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
        return interval + " years ago";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return interval + " months ago";
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return interval + " days ago";
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return interval + " hours ago";
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return interval + " minutes ago";
    }else if(interval == 1){
        return interval + " minute ago";
    }
    return Math.floor(seconds) + " seconds ago";
}

//link para refresh em viagem
if (document.location.href.match(/\/index\.php$/) || document.location.href.match(/\/authenticate\.php$/) || document.location.href.match(/\/city\.php$/) || document.location.href.match(/torn.com\/$/) || document.location.href.match(/\/sidebar.php$/)) {
  
  if( $("#skip-to-content").text().match(/Traveling/) || $("#skip-to-content").text().match(/Mexico|Canada|Cayman Islands|Hawaii|United Kingdom|Argentina|Switzerland|Japan|China|South Africa|Dubai/) ){
    //Add arrival time
      if( $("#skip-to-content").text().match(/Traveling/)){
          var secondsLeft = $("#countrTravel").attr("data-to");
          var currentDate = new Date();
          currentDate.setSeconds(currentDate.getSeconds() + secondsLeft * 1 );

          $("#skip-to-content").after( ( $('<div class="left">&nbsp;Arriving at ' + currentDate.toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'}) + '</div>').css('margin', '8px 3px') ));
      }
  }
}

// Adds the hour when drug, bank or education finishes
// Bug: Qd se abre preferences, script dá erro e não mostra hora de fim
if(document.location.href.match(/\/item\.php\?temp=/)){
    var timeleft = $("span.item-count-down").attr("data-time") * 1;
    var now = new Date();
    now.setSeconds(now.getSeconds() + timeleft);
    if(timeleft >= 86400) // > 1 day
        var endTime = now.toLocaleTimeString(locale, {hour12: hour12, hour: '2-digit', minute:'2-digit', day:'2-digit', month:'short'});
    else
        var endTime = now.toLocaleTimeString(locale, {hour12: hour12, hour: '2-digit', minute:'2-digit'});

    var newSpan = "<span> Effect finishes at <b>" + endTime + "</b></span>";
    $("span.item-count-down").parent().append(newSpan);
}

var no = document.getElementById('icon49');
if(no == null)
  no = document.getElementById('icon50');
if(no == null)
  no = document.getElementById('icon51');
if(no == null)
  no = document.getElementById('icon52');
if(no == null)
  no = document.getElementById('icon53');
if(no != null && no.getAttribute('class').match(/iconShow/)){
  var texto = no.getAttribute('title');
  if(texto != null){
    var tempo = texto.match(/(\d+)\:(\d+):(\d+)/);
    var mins = tempo[1] * 1 * 60 + tempo[2] * 1 + 1;
    var now = new Date();
    now.setHours(now.getHours() + tempo[1] * 1, now.getMinutes() + tempo[2] * 1);
    var novoText = texto + " - effect finishes at " + now.toLocaleTimeString(locale, {hour12: hour12, hour: '2-digit', minute:'2-digit'});
    no.setAttribute('title', novoText);
  }
}

//2? adiciona links para vault e airstrip caso tenha.
//Adiciona outros links ao menu

//get class from sidebar links
if($('#nav-items').length){
    var link_class = $('#nav-items').attr('class').split(" ")[0];
    var row_class  = $('#nav-items > div:first').attr('class');
    var a_class    = $('#nav-items a').attr('class');
    var icon_class = $('#nav-items a span').attr('class');
    var link_name_class = $('#nav-items a span').eq(1).attr('class');
}

var divProperties = document.getElementById('nav-properties');
if(divProperties != null && lvault == '1'){
   var link = 'properties.php\#\/p\=options\&tab\=vault';
   addLink(divProperties, link, 'Vault', 1, '<i class="property-option-vault"></i>');
}

var divCity = document.getElementById('nav-city');
if(divCity != null){
  //link para races, viagens, bounties
  if(lraces == '1')
    addLink(divCity, 'racing.php', 'Races', 1, '<i class="cql-race-track"></i>');
  if(lstockmarket == '1')
    addLink(divCity, 'stockexchange.php', 'Stock Market', 1, '<i class="cql-stock-market"></i>');
  if(useTravAg == '1')
    var travelAgLink = addLink(divCity, 'travelagency.php', 'Travel Agency', 1, '<i class="cql-travel-agency"></i>');
  if(lbounties == '1')
    addLink(divCity, 'bounties.php#!p=main', 'Bounties', 1);
  
  //Shortcuts
  for( var ii=1; ii <= 5; ii++){
    var linkActivo = "lactivo" + ii;
    var nomeLink = "nomeL" + ii;
    var endereco = "link" + ii;

    if( eval(linkActivo) == '1' && eval(nomeLink) != null && eval(endereco) != null ){
      addLink(divCity, eval(endereco), eval(nomeLink), 1);
    }
  }
}

var divCasino = document.getElementById('nav-casino');
if(divCasino != null){
  if(lpoker == '1')
    addLink(divCasino, 'loader.php?sid=holdem', 'Poker', 1, '', '_blank');
  if(lbookies == '1')
    addLink(divCasino, 'page.php?sid=bookie#/your-bets', 'Bookies', 1, '<i class="gm-football-icon"></i>');
  if(lrroulette == '1')
    addLink(divCasino, 'loader.php?sid=russianRoulette', 'Russian Roulette', 1);
  if(lwheels == '1')
    addLink(divCasino, 'loader.php?sid=spinTheWheel', 'Spin the Wheel', 1);
  if(llottery == '1')
    addLink(divCasino, 'loader.php?sid=lottery', 'Lottery', 1);
  if(lslots == '1')
    addLink(divCasino, 'loader.php?sid=slots', 'Slots', 1);
}

//Remove Links from sidebar
if(rhome == '1')
  $('#nav-home').hide();

if(ritems == '1')
  $('#nav-items').hide();

if(rcity == '1')
  $('#nav-city').hide();

if(rjob == '1')
  $('#nav-job').hide();

if(rgym == '1')
  $('#nav-gym').hide();

if(rproperties == '1')
  $('#nav-properties').hide();

if(reducation == '1')
  $('#nav-education').hide();

if(rcrimes == '1')
  $('#nav-crimes').hide();

if(rmissions == '1')
  $('#nav-missions').hide();

if(rnewspaper == '1')
  $('#nav-newspaper').hide();

if(rjail == '1')
  $('#nav-jail').hide();

if(rhospital == '1')
  $('#nav-hospital').hide();

if(rcasino == '1')
  $('#nav-casino').hide();

if(rforums == '1')
  $('#nav-forums').hide();

if(rhof == '1')
  $('#nav-hall_of_fame').hide();

if(rfaction == '1')
  $('#nav-my_faction').hide();

if(rcitizens == '1')
  $('#nav-recruit_citizens').hide();

if(rrules == '1'){
  $('#nav-rules').hide();
}


//Hide Icons from bar
function hide_icons(jNode){
    //find('[id*=anotherid]')
  if(osex == '1'){
    jNode.find('[class*=icon6_]').remove();
    jNode.find('[class*=icon7_]').remove();
  }
  if( odonator == '1'){
      jNode.find('[class*=icon3_]').remove();
      jNode.find('[class*=icon4_]').remove();
  }
  if( omarried == '1'){
      jNode.find('[class*=icon8_]').remove();
  }
  if( ojob == '1'){
      jNode.find('[class*=icon21_]').remove();
      jNode.find('[class*=icon22_]').remove();
      jNode.find('[class*=icon23_]').remove();
      jNode.find('[class*=icon24_]').remove();
      jNode.find('[class*=icon25_]').remove();
      jNode.find('[class*=icon26_]').remove();
      jNode.find('[class*=icon27_]').remove();
      jNode.find('[class*=icon73_]').remove();
  }
  if( ofaction == '1'){
      jNode.find('[class*=icon9_]').remove();
      jNode.find('[class*=icon74_]').remove();
  }
  if( oeduc == '1'){
      jNode.find('[class*=icon19_]').remove();
      jNode.find('[class*=icon20_]').remove();
  }
  if( obank == '1'){
      jNode.find('[class*=icon29_]').remove();
      jNode.find('[class*=icon30_]').remove();
      jNode.find('[class*=icon31_]').remove();
  }
  if( oloan == '1'){
      jNode.find('[class*=icon33_]').remove();
  }
  if( oitem == '1'){
      jNode.find('[class*=icon34_]').remove();
      jNode.find('[class*=icon35_]').remove();
      jNode.find('[class*=icon36_]').remove();
  }
  if( opoints == '1'){
      jNode.find('[class*=icon54_]').remove();
  }
  if( otrade == '1'){
      jNode.find('[class*=icon37_]').remove();
  }
  if( ostock == '1'){
      jNode.find('[class*=icon38_]').remove();
      jNode.find('[class*=icon84_]').remove();
  }
  if( orace == '1'){
      jNode.find('[class*=icon17_]').remove();
      jNode.find('[class*=icon18_]').remove();
  }
  if( obounty == '1'){
      jNode.find('[class*=icon13_]').remove();
  }
  if( ocashier == '1'){
      jNode.find('[class*=icon28_]').remove();
  }
  if( oauction == '1'){
      jNode.find('[class*=icon55_]').remove();
      jNode.find('[class*=icon56_]').remove();
  }
  if( obooster == '1'){
      jNode.find('[class*=icon39_]').remove();
      jNode.find('[class*=icon40_]').remove();
      jNode.find('[class*=icon41_]').remove();
      jNode.find('[class*=icon42_]').remove();
      jNode.find('[class*=icon43_]').remove();
  }
  if( omedical == '1'){
      jNode.find('[class*=icon44_]').remove();
      jNode.find('[class*=icon45_]').remove();
      jNode.find('[class*=icon46_]').remove();
      jNode.find('[class*=icon47_]').remove();
      jNode.find('[class*=icon48_]').remove();
  }
  if( odrug == '1'){
      jNode.find('[class*=icon49_]').remove();
      jNode.find('[class*=icon50_]').remove();
      jNode.find('[class*=icon51_]').remove();
      jNode.find('[class*=icon52_]').remove();
      jNode.find('[class*=icon53_]').remove();
  }
  if(olevel100 == '1'){
      jNode.find('[class*=icon5_]').remove();
  }
  if( ohosp == '1'){
      jNode.find('[class*=icon15_]').remove();
      jNode.find('[class*=icon82_]').remove();
  }
  if( ojail == '1'){
      jNode.find('[class*=icon16_]').remove();
  }
  if( ollife == '1'){
      jNode.find('[class*=icon12_]').remove();
  }
  //Drug Addiction
  if( oaddiction == '1'){
      jNode.find('[class*=icon57_]').remove();
      jNode.find('[class*=icon58_]').remove();
      jNode.find('[class*=icon59_]').remove();
      jNode.find('[class*=icon60_]').remove();
      jNode.find('[class*=icon61_]').remove();
  }
  //Radiation Sickness
  if( oradiation == '1'){
      jNode.find('[class*=icon63_]').remove();
      jNode.find('[class*=icon64_]').remove();
      jNode.find('[class*=icon65_]').remove();
      jNode.find('[class*=icon66_]').remove();
      jNode.find('[class*=icon67_]').remove();
  }
  if( obook == '1' ){
      jNode.find('[class*=icon68_]').remove();
  }

  if( oupkeep == '1'){
      jNode.find('[class*=icon78_]').remove();
      jNode.find('[class*=icon79_]').remove();
      jNode.find('[class*=icon80_]').remove();
  }
  if( oocrimes == '1'){
      jNode.find('[class*=icon85_]').remove();
      jNode.find('[class*=icon86_]').remove();
  }
}

waitForKeyElements("#sidebarroot", hide_icons);

//configuracao script
//Hide images from map for easier city finds by Infamouspt & ebcdic
if(document.location.href.match(/\/city.php$/)){
  settings();
  
  if(hidemap == '1'){
    waitForKeyElements("div.leaflet-tile-pane", hide_map);
  }
}

function hide_map(jNode){
  jNode.remove();

  //Highlights City Finds with a 5px magenta coloured box and doubles the size of the item for better visibility. by Sanitarium (modified by Pidu)
  (function() {var css = "IMG[class=\"leaflet-marker-icon map-user-item-icon leaflet-zoom-hide leaflet-clickable\"][src*=\"items\/\"]{width:50px !important; height: 25px !important; -moz-border-radius:20px !important; -webkit-border-radius:20px !important; border-radius:20px !important; border: 2px solid magenta !important";
    if (typeof GM_addStyle != "undefined") {
      GM_addStyle(css);
    } else if (typeof PRO_addStyle != "undefined") {
      PRO_addStyle(css);
    } else if (typeof addStyle != "undefined") {
      addStyle(css);
    } else {
      var node = document.createElement("style");
      node.type = "text/css";
      node.appendChild(document.createTextNode(css));
      var heads = document.getElementsByTagName("head");
      if (heads.length > 0) {
        heads[0].appendChild(node);
      } else {
        // no head yet, stick it whereever
        document.documentElement.appendChild(node);
      }
    }
  })();
    
  //city find hax by AquaRegia [1551111] modified by ebcdic
  data = $('.leaflet-marker-pane > img[src*="\/items"]').map(function() { src =  this.src; return src.match(/\/items\/(\d+)/)[1]; }).get();

  if(data.length > 0){
      requestAPI('//api.torn.com/torn/?selections=items&key=', api_key, true, handler_city);
  }
}

function handler_city(){
    if(this.readyState == 4 && this.status == 200) {
        if(this.responseText != null){
            data = $('.leaflet-marker-pane > img[src*="\/items"]').map(function() { src =  this.src; return src.match(/\/items\/(\d+)/)[1]; }).get();

            var items = '';
            var httpResp = this.responseText;
            var itemList = JSON.parse(httpResp);

            $.each(data, function(i, item){
                if(items != '') items += ', ';
                items += '<a style="margin-right:0px;display:inline" href="http://www.torn.com/imarket.php#/p=shop&step=shop';
                items += '&type=&searchname=' + encodeURIComponent(item) + '">';
                items += itemList["items"][item]["name"] +'</a>';
            });

            $("h4").append('<span style="font-size: 12px"> ' +
                           ((data.length == 1) ? 'item' : 'items (' + data.length + ')') +
                           ': ' + items + '</span>');

        }
    }
}

function redirect_gym(jNode){
  if(jNode.parent().parent().text().match(/You pop the Xanax pill into your mouth and down a glass of water/) ||
      jNode.parent().parent().text().match(/and stay for a short while in the hotel./) ){
    document.location = '//' + document.domain + '\/gym.php';
  }
}

function ordena_items(jNode){
  if(sortitems == '1'){
    var items = jNode.children().get();

    items.sort(function(a, b) {
      var keyA = $(a).find('.type').text();
      var keyB = $(b).find('.type').text();

      if (keyA < keyB) return -1;
      if (keyA > keyB) return 1;
      return 0;
    });
    
    $.each(items, function(i, li){
      jNode.find('ul[class="items-cont cont-gray bottom-round"]').append(li);
      jNode.append(li);
    });
  }

    //add a color to main drugs and Boosters
  $('li[data-item="206"] div.title').css('background-color', '#eecc66');  //Xanax
  $('li[data-item="197"] div.title').css('background-color', '#eecc66');  //Ecstasy
  $('li[data-item="367"] div.title').css('background-color', '#eecc66');  //FHC
  $('li[data-item="366"] div.title').css('background-color', '#eecc66');  //Erotic DVD
  
}

function showItemsTotal(){
  if($("#totalItems").length == 0) {
    $(".items-name").append("<span id='totalItems'></span>");
  }
  var totalItems = 0;
  $("ul[aria-expanded=true] .qty.bold.d-hide").each(function() {
    if($( this ).html() != ""){
      totalItems += parseInt($( this ).html().replace('x', ''));
    }else{
      totalItems += 1;
    }
  });
  $("#totalItems").html(" | Total: "+totalItems);
}

//colorir items
if(document.location.href.match(/\/item.php$/)){
  //Sort items by category
  waitForKeyElements ('ul#all-items[data-loaded="1"]', ordena_items);
  
  //Count Total Items
  waitForKeyElements(".last-row.t-last-row.m-last-row", showItemsTotal);

  //Redirect to gym after FHC or Xanax
  if(redirectgym == '1')
    waitForKeyElements ("a.close-act.t-blue", redirect_gym);
}

// Add Personal stats in profile [adapted by Scripthen]
function handler_personal_stats(parsedRes){
  //if(this.readyState == 4 && this.status == 200) {
   // if(this.responseText != null){
      //var httpResp = this.responseText;
      //var personalstatsResp = JSON.parse(httpResp);
    var personalstatsResp = parsedRes;
      
      if(personalstatsResp.error != null && ( personalstatsResp.error.code == '2' || personalstatsResp.error.code == '12' )){
        var new_api_key = get_api_key();
        var url = this.responseURL.split('&key=');
        var new_url = url[0] + '&key=';
        personalstatsResp = requestAPI(new_url, new_api_key);
      }

      if(personalstatsResp.error != null){
        console.log('Error getting personal stats: ' + personalstatsResp.error.code);
      }
      
      var personalStats = personalstatsResp["personalstats"];
      var userID = personalstatsResp["player_id"];
      
      // Keys not valid if user has a zero value. We should really "try" all these up so we don't crash the script.
      if(personalStats["attackswon"] === undefined){STAT_ATTACKS_WON = 0;}else{STAT_ATTACKS_WON = personalStats["attackswon"];}
      if(personalStats["defendswon"] === undefined){STAT_DEFENDS_WON = 0;}else{STAT_DEFENDS_WON = personalStats["defendswon"];}
      if(personalStats["moneymugged"] === undefined){STAT_MONEY_MUGGED = 0;}else{STAT_MONEY_MUGGED = personalStats["moneymugged"];}
      if(personalStats["highestbeaten"] === undefined){STAT_HIGH_LEVEL = 0;}else{STAT_HIGH_LEVEL = personalStats["highestbeaten"];}
      if(personalStats["bestkillstreak"] === undefined){BEST_KILL_STREAK = 0;}else{BEST_KILL_STREAK = personalStats["bestkillstreak"];}
      if(personalStats["respectforfaction"] === undefined){STAT_RESPECT = 0;}else{STAT_RESPECT = personalStats["respectforfaction"];}
      if(personalStats["peoplebusted"] === undefined){STAT_PEOPLE_BUSTED = 0;}else{STAT_PEOPLE_BUSTED = personalStats["peoplebusted"];}
      if(personalStats["peoplebought"] === undefined){STAT_PEOPLE_BAILED = 0;}else{STAT_PEOPLE_BAILED = personalStats["peoplebought"];}
      if(personalStats["exttaken"] === undefined){STAT_ECSTASY_TAKEN = 0;}else{STAT_ECSTASY_TAKEN = personalStats["exttaken"];}
      if(personalStats["xantaken"] === undefined){STAT_XANAX_TAKEN = 0;}else{STAT_XANAX_TAKEN = personalStats["xantaken"];}
      if(personalStats["victaken"] === undefined){STAT_VICODIN_TAKEN = 0;}else{STAT_VICODIN_TAKEN = personalStats["victaken"];}
      if(personalStats["lsdtaken"] === undefined){STAT_LSD_TAKEN = 0;}else{STAT_LSD_TAKEN = personalStats["lsdtaken"];}
      if(personalStats["refills"] == undefined){STAT_REFILLS_TAKEN = 0;}else{STAT_REFILLS_TAKEN = personalStats["refills"];}// null or undefined, make sure.
      if(personalStats["statenhancersused"] === undefined){STAT_ENHANCER_TAKEN = 0;}else{STAT_ENHANCER_TAKEN = personalStats["statenhancersused"];}
      if(personalStats["daysbeendonator"] === undefined){DAYS_BEEN_DONATOR = 0;}else{DAYS_BEEN_DONATOR = personalStats["daysbeendonator"];}
      if(personalStats["missioncreditsearned"] == undefined){STAT_CREDITS_EARNED = 0;}else{STAT_CREDITS_EARNED = personalStats["missioncreditsearned"];}
      if(personalStats["logins"] == undefined){STAT_LOGINS = 0;}else{STAT_LOGINS = personalStats["logins"];}
      if(personalStats["traveltimes"] == undefined){STAT_TRAVEL_TIMES = 0;}else{STAT_TRAVEL_TIMES = personalStats["traveltimes"];}
      if(personalStats["revives"] == undefined){STAT_REVIVES = 0;}else{STAT_REVIVES = personalStats["revives"];}
      if(personalStats["bloodwithdrawn"] == undefined){STAT_bloodwithdrawn = 0;}else{STAT_bloodwithdrawn = personalStats["bloodwithdrawn"];}
      if(personalStats["booksread"] === undefined){STAT_BOOKS_READ = 0;}else{STAT_BOOKS_READ = personalStats["booksread"];}
      if(personalStats["candyused"] == undefined){STAT_CANDY_USED = 0;}else{STAT_CANDY_USED = personalStats["candyused"];}
      if(personalStats["alcoholused"] == undefined){STAT_alcohol_used = 0;}else{STAT_alcohol_used = personalStats["alcoholused"];}
      if(personalStats["energydrinkused"] === undefined){STAT_energy_drink_used = 0;}else{STAT_energy_drink_used = personalStats["energydrinkused"];}
      if(personalstatsResp["criminalrecord"]["total"] == undefined){STAT_TOTAL_CRIMES = 0;}else{STAT_TOTAL_CRIMES = personalstatsResp["criminalrecord"]["total"];}
      if(personalStats["reviveskill"] === undefined){STAT_revive_skill = 0;}else{STAT_revive_skill = personalStats["reviveskill"];}
      
      $("#" + 'attackswon-' + userID).text(fmtNumber(STAT_ATTACKS_WON));
      $("#" + 'defendswon-' + userID).text(fmtNumber(STAT_DEFENDS_WON));
      $("#" + 'moneymugged-' + userID).text(formatCurrency(STAT_MONEY_MUGGED));
      $("#" + 'highestlevel-' + userID).text(STAT_HIGH_LEVEL);
      $("#" + 'killstreak-' + userID).text(fmtNumber(BEST_KILL_STREAK));
      $("#" + 'respect-' + userID).text(fmtNumber(STAT_RESPECT));
      $("#" + 'busts-' + userID).text(fmtNumber(STAT_PEOPLE_BUSTED));
      $("#" + 'bailed-' + userID).text(fmtNumber(STAT_PEOPLE_BAILED));
      $("#" + 'criminaloffences-' + userID).text(fmtNumber(STAT_TOTAL_CRIMES));
      $("#" + 'timestravelled-' + userID).text(fmtNumber(STAT_TRAVEL_TIMES));
      $("#" + 'revives-' + userID).text(fmtNumber(STAT_REVIVES));
      $("#" + 'bloodwithdrawn-' + userID).text(fmtNumber(STAT_bloodwithdrawn));
      $("#" + 'booksread-' + userID).text(fmtNumber(STAT_BOOKS_READ));
      $("#" + 'ecstasy-' + userID).text(fmtNumber(STAT_ECSTASY_TAKEN));
      $("#" + 'xanax-' + userID).text(fmtNumber(STAT_XANAX_TAKEN));
      $("#" + 'vicodin-' + userID).text(fmtNumber(STAT_VICODIN_TAKEN));
      $("#" + 'lsd-' + userID).text(fmtNumber(STAT_LSD_TAKEN));
      $("#" + 'missioncredits-' + userID).text(fmtNumber(STAT_CREDITS_EARNED));
      $("#" + 'nw-' + userID).text(formatCurrency(personalStats["networth"]));
      $("#" + 'logins-' + userID).text(fmtNumber(STAT_LOGINS));
      $("#" + 'reffil-' + userID).text(fmtNumber(STAT_REFILLS_TAKEN));
      $("#" + 'enhancers-' + userID).text(fmtNumber(STAT_ENHANCER_TAKEN));
      $("#" + 'donator-' + userID).text(fmtNumber(DAYS_BEEN_DONATOR));
      $("#" + 'candyeaten-' + userID).text(fmtNumber(STAT_CANDY_USED));
      $("#" + 'alcohol-' + userID).text(fmtNumber(STAT_alcohol_used));
      $("#" + 'drinks-' + userID).text(fmtNumber(STAT_energy_drink_used));
      $("#" + 'reviveskill-' + userID).text(fmtNumber(STAT_revive_skill));
   // }
  //}
}

function addPersonalStatsLine(html, elemID, userID){
  var newspan2 = $("<span class='bold'></span").append(html);
  var newDiv2_1 = $("<div class='user-information-section'></div>").append(newspan2);
  var newspan2_2 = $("<span></span>").attr("id", elemID + userID).append("Wait...");
  var newDiv2_2 = $("<div class='user-info-value' style='width:50%'></div>").append(newspan2_2);
  var newli2_1 = $("<li></li>").append(newDiv2_1,newDiv2_2);

  return newli2_1;
}

function personal_stats2(jNode){
  var userID = document.location.href.match(/\/profiles.php\?XID\=(\d+)/)[1];

  var newDiv1 = $("<div class='menu-header'></div>").text("Personal Stats");
  var newDiv2 = $("<div class='profile-container basic-info bottom-round'></div>");
  var newul = $("<ul class='info-table'></ul>");
  
  if(psattackswon == '1') newul.append(addPersonalStatsLine('Attacks Won:', 'attackswon-', userID));
  if(psdefendswon == '1') newul.append(addPersonalStatsLine('Defends Won:', 'defendswon-', userID));
  if(psmoneymugged == '1') newul.append(addPersonalStatsLine('Money Mugged:', 'moneymugged-', userID));
  if(pshighestlevel == '1') newul.append(addPersonalStatsLine('Highest Level Beaten', 'highestlevel-', userID));
  if(pstotalrespect == '1') newul.append(addPersonalStatsLine('Total Respect Gained:', 'respect-', userID));
  if(pspeoplebusted == '1') newul.append(addPersonalStatsLine('People Busts:', 'busts-', userID));
  if(pspeoplebailed == '1') newul.append(addPersonalStatsLine('People Bailed:', 'bailed-', userID));
  if(pscriminaloffences == '1') newul.append(addPersonalStatsLine('Criminal offences:', 'criminaloffences-', userID));
  if(pstimestravelled == '1') newul.append(addPersonalStatsLine('Times travelled:', 'timestravelled-', userID));
  if(psrevives == '1') newul.append(addPersonalStatsLine('Revives:', 'revives-', userID));
  if(psbloodwithdrawn == '1') newul.append(addPersonalStatsLine('Blood withdrawn:', 'bloodwithdrawn-', userID));
  if(psbooksread == '1') newul.append(addPersonalStatsLine('Books Read:', 'booksread-', userID));
  if(psecstasy == '1') newul.append(addPersonalStatsLine('Ecstasy Taken:', 'ecstasy-', userID));
  if(psxanax == '1') newul.append(addPersonalStatsLine('Xanax Taken:', 'xanax-', userID));
  if(psvicodin == '1') newul.append(addPersonalStatsLine('Vicodin Taken:', 'vicodin-', userID));
  if(pslsd == '1') newul.append(addPersonalStatsLine('LSD Taken:', 'lsd-', userID));
  if(psmissioncredits == '1') newul.append(addPersonalStatsLine('Mission credits earned:', 'missioncredits-', userID));
  if(psnetworth == '1') newul.append(addPersonalStatsLine('Networth:', 'nw-', userID));
  if(pslogins == '1') newul.append(addPersonalStatsLine('Logins:', 'logins-', userID));
  if(psreffils == '1') newul.append(addPersonalStatsLine('Energy Refills:', 'reffil-', userID));
  if(psenhancers == '1') newul.append(addPersonalStatsLine('Stat Enhancers Used:', 'enhancers-', userID));
  if(psdonator == '1') newul.append(addPersonalStatsLine('Days Been a Donator:', 'donator-', userID));
  if(pscandyeaten == '1') newul.append(addPersonalStatsLine('Candy Eaten:', 'candyeaten-', userID));
  if(psalcohol == '1') newul.append(addPersonalStatsLine('Alcohol drunk:', 'alcohol-', userID));
  if(psdrinks == '1') newul.append(addPersonalStatsLine('Energy drinks drunk:', 'drinks-', userID));
  if(psreviveskill == '1') newul.append(addPersonalStatsLine('Reviving skill:', 'reviveskill-', userID));

  newDiv2.append(newul);
  var newbr = $("<br/>");
  $("#competition-profile-wrapper").append(newbr, newDiv1, newDiv2);

    var link = "https://api.torn.com/user/"+userID+"?selections=basic,personalstats,crimes&key=" + api_key + '&comment=Alteracoes';
    requestPage3(link);
  //requestAPI("//api.torn.com/user/"+userID+"?selections=basic,personalstats,crimes&key=", api_key, true, handler_personal_stats);
}

function requestPage3(link){
  GM_xmlhttpRequest({
    method: "GET",
    url: link,
    onreadystatechange: function (res) {
        if (res.readyState === 4 && res.status === 200) {
            const parsedRes = JSON.parse(res.responseText)
            handler_personal_stats( parsedRes);
        }
    }
  });
}

function personal_stats(jNode){
  waitForKeyElements("#competition-profile-wrapper", personal_stats2);
}

if (document.location.href.match(/profiles.php\?XID\=(\d+)/) ){
  if(personalstats == '1'){
      waitForKeyElements("#profileroot", personal_stats);
  }
}

//Remover bounties indisponíveis
function remove_bounties(jNode){
  jNode.children().each(function(i){
    if($(this).find('span.t-red').length){
      $(this).remove();
    }
  } );
}

if(document.location.href.match(/\/bounties.php/) && removerBounties == '1') {
  waitForKeyElements ("ul.bounties-list.t-blue-cont.h", remove_bounties, false);
}

//Redirects to gym after refilling
if(document.location.href.match(/\/points.php\?step\=refill/)){
  if(document.body.innerHTML.match(/You have used <b>25 points<\/b> to refill/)){
    document.location = '//' + document.domain + '\/gym.php';
  }
}

// add express crime form
if (document.location.href.match(/\/crimes\.php/)) {
  if(removecrimes == '1'){
    if(crime2 != '1') $("ul.highlightSearchForCash").parent().remove();
    if(crime3 != '1') $("ul.highlightSellMedia").parent().remove();
    if(crime4 != '1') $("ul.highlightShoplift").parent().remove();
    if(crime5 != '1') $("li.bonus:contains('Pickpocket Someone')").parent().parent().remove();
    if(crime6 != '1') $("li.bonus:contains('Larceny')").parent().parent().remove();
    if(crime7 != '1') $("li.bonus:contains('Armed Robberies')").parent().parent().remove();
    if(crime8 != '1') $("li.bonus:contains('Transport Drugs')").parent().parent().remove();
    if(crime9 != '1') $("li.bonus:contains('Plant a Computer Virus')").parent().parent().remove();
    if(crime10 != '1') $("li.bonus:contains('Assassination')").parent().parent().remove();
    if(crime11 != '1') $("li.bonus:contains('Arson')").parent().parent().remove();
    if(crime12 != '1') $("li.bonus:contains('Grand Theft Auto')").parent().parent().remove();
    if(crime13 != '1') $("li.bonus:contains('Pawn Shop')").parent().parent().remove();
    if(crime14 != '1') $("li.bonus:contains('Counterfeiting')").parent().parent().remove();
    if(crime15 != '1') $("li.bonus:contains('Kidnapping')").parent().parent().remove();
    if(crime16 != '1') $("li.bonus:contains('Arms Trafficking')").parent().parent().remove();
    if(crime17 != '1') $("li.bonus:contains('Bombings')").parent().parent().remove();
    if(crime18 != '1') $("li.bonus:contains('Hacking')").parent().parent().remove();
    
    //$("div.special.btn-wrap.silver.m-top10").after($("<div class=\"special btn-wrap silver m-top10\"><div id=\"view_original\" class=\"btn\"><a href=\"/crimes.php?step=main&ajax_load=true\"><button class=\"torn-btn\"> View Original </button></a></div></div>"));
    
  }
}

// Express Bust
function express_bust(jNode){
  jNode.attr('href', jNode.attr('href') + '1');
}

function highlight_jail(jNode){
    if(jNode.text() == tagJail){
        jNode.parent().css('background-color', 'lightgreen');
    }
}

if(document.location.href.match(/jailview.php/)) {
    if(expressbust == '1'){
        waitForKeyElements ("a.bust.t-gray-3", express_bust);
    }

    if(expressbail == '1'){
        waitForKeyElements ("a.bye.t-gray-3", express_bust);
    }

    if(destacarJail == '1'){
         waitForKeyElements ("a.user.faction", highlight_jail);
    }
}

function hide_revive(jNode){
    jNode.parent().hide();
}

function highlight_hosp(jNode){
    if(jNode.text() == tagHosp){
        jNode.parent().css('background-color', 'lightgreen');
    }
}

if(document.location.href.match(/hospitalview.php/)) {
    if(removeRevives == '1'){
        waitForKeyElements ("a.reviveNotAvailable", hide_revive);
    }

    if(destacarHosp == '1'){
        waitForKeyElements ("a.user.faction", highlight_hosp);
    }
}

// Highlight people abroad with tag
if(document.location.href.match(/\/index.php\?page\=people/)){
    $('ul.users-list>li:has(a.user.faction:contains("' + tagOut + '"))').each(function(){
        $(this).css('background-color', 'lightgreen');
    });
}

// Submits automatically prices from other cities to TravelRun
// http://travelrun.torncentral.com/ run by ebcdic
// Destacar pessoas na jail e no hospital com tag indicada
if(!document.location.href.match(/\/city.php/)){
  window.onload = function(){
    if(document.body.innerHTML.match(/You have purchased/) &&
       document.body.innerHTML.match(/You are in/)){

       var min5 = 5 * 60 * 1000;
       var now = new Date().getTime();
       var lastflowerupdate = GM_getValue('lastflowerupdate', null);
       if(!lastflowerupdate)
          lastflowerupdate = 0;
       if((now - lastflowerupdate) > min5){
         GM_setValue('lastflowerupdate', now.toString());

         GM_xmlhttpRequest ( {
          method:     "POST",
          url:        "http://travelrun.torncentral.com/update2.php",
          data:       "data=" + encodeURIComponent(document.body.textContent),
          headers:    {
              "Content-Type": "application/x-www-form-urlencoded"
          },
          onload:     function (response) {
              //GM_log("Resposta update TravelRun: " + response.responseText);
          }
        } );

       }
    }

  //Send a message when going to switzerland and rehab not done
    if($('div.switzerland').length > 0){

      $('a.travel-home').click(function(event){
        var lastRehab = GM_getValue('lastRehab', 9999999999999);
        var rehabDone = '' ;
        var now       = new Date().getTime();
        var umahora   = 60 * 60 * 1000;
        
        if((now - lastRehab) < umahora && lastRehab != '9999999999999'){
          rehabDone = 'X';
        }
        
        if(rehabDone != 'X'){
          var msg = $('<div class="delimiter"></div>').append($('<div class="msg right-round" style="color: rgb(255, 0, 0);">You haven\'t made rehab yet!</div>'));
          var infomsg = $('<div class="info-msg border-round"></div>)').append('<i class="info-icon"></i>')
                                                                       .append(msg)
                                                                       .css('background-color', '#FF0000');
          var infomsgcont = $('<div class="info-msg-cont user-info border-round m-top10"></div>').append(infomsg);
          $('div.travel-home-content').after(infomsgcont);
        }
      });
      
      $('span.btn:contains("REHAB")').click(function(){
        var now = new Date().getTime();
        GM_setValue('lastRehab', now.toString());
      });
    }
  }
}


function show_prices(jNode){
  var link = 'https://yata.yt/api/v1/travel/export/';
  var destination;
  
  if(jNode.parent().parent().parent().attr('class') == 'travel-container full-map'){
    var destination = jNode.find("span.bold").text();

    switch(destination){
      case 'Mexico': destination = 'mex'; break;
      case 'Cayman Islands': destination = 'cay'; break;
      case 'Canada': destination = 'can'; break;
      case 'Hawaii': destination = 'haw'; break;
      case 'United Kingdom': destination = 'uni'; break;
      case 'Argentina': destination = 'arg'; break;
      case 'Switzerland': destination = 'swi'; break;
      case 'Japan': destination = 'jap'; break;
      case 'China': destination = 'chi'; break;
      case 'UAE': destination = 'uae'; break;
      case 'South Africa': destination = 'sou'; break;
    }


    GM_xmlhttpRequest({
          method: "GET",
          url: link,
          headers: {
                'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey/0.3',
                'Accept': 'application/atom+xml,application/xml,text/xml',
          },
          synchronous: false,
          onload: function(response) {

              if(this.readyState == 4 && this.status == 200) {
                  if(this.responseText != null){
                      var httpResp = this.responseText;
                      var countryData = JSON.parse(this.responseText);

                      var tbody = $("<tbody></tbody>");
                      /*tbody.append('<tr height="35" bgcolor="#151515" style="font-family: Montserrat, sans-serif; letter-spacing: 2px;">\
                                   <th><font color="#FFFFFF"><b>TYPE</b></font></th>\
                                   <th><font color="#FFFFFF"><b>ITEM</b></font></th>\
                                   <th><font color="#FFFFFF"><b>COST</b></font></th>\
                                   <th><font color="#FFFFFF"><b>STOCK</b></font></th></tr>');*/
                      tbody.append('<tr height="35" bgcolor="#151515" style="font-family: Montserrat, sans-serif; letter-spacing: 2px;">\
                                   <th><font color="#FFFFFF"><b>ITEM</b></font></th>\
                                   <th><font color="#FFFFFF"><b>COST</b></font></th>\
                                   <th><font color="#FFFFFF"><b>STOCK</b></font></th></tr>');

                      $.each(countryData.stocks, function(key, location) {
                          if(key == destination){
                              var spanUpdate = $("<span>Last Update: <b>" + timeSince(location.update) + "</b></span>");

                              $.each(location.stocks, function(order, item){
                                  tbody.append('<tr class="Alcohol" height="25" style="font-family: Montserrat, sans-serif;">\
                                           <td>' + item.name + '</td>\
                                           <td><center>$' + fmtNumber(item.cost) + '</center></td>\
                                           <td><center>' + fmtNumber(item.quantity) + '</center></td></tr>');
                              });

                              var table = $('<table border="0" cellpadding="0" cellspacing="1"></table>').append(tbody);

                              $("#prices-dest").empty();
                              $("#prices-dest").append(table);

                              $("#last-update").empty();
                              $("#last-update").append(spanUpdate);
                          }
                      });
                  }
              }

            $("table").css({
                  'border-top-width' : '0px',
                  'border-right-width' : '0px',
                  'border-bottom-width' : '0px',
                  'border-left-width' : '0px',
                  'width' : '100%',
                  'border-spacing' : '1px',
                  'display' : 'table',
                  'border-collapse' : 'separate'
              });
              $("tbody").css({
                  'display' : 'table-row-group',
                  'vertical-align' : 'middle',
                  'border-color' : 'inherit',
              });
              $("tr").css({
                  'border-color' : 'inherit',
                  'vertical-align' : 'inherit',
                  'display' : 'table-row',
              });
              $("th").css({
                  'font-weight' : 'bold',
                  'text-align' : 'internal-center',
                  'display' : 'table-cell',
                  'vertical-align' : 'inherit'
              });
              $("td").css({
                  'display' : 'table-cell',
                  'vertical-align' : 'inherit'
              });
          }
        });
  }
}

// Show prices outside in travel agency from travelrun
if (document.location.href.match(/travelagency\.php/) && travelrunprices == '1'){
  
  waitForKeyElements("div.destination", show_prices);
  
  $("<style>")
    .attr("type", "text/css")
    .html("\
      tr.Drug { background-color: yellow; color: black; }\
      tr.Flower { background-color: limegreen; color: black; }\
      tr.Plushie { background-color: pink; color: black; }\
      tr.Alcohol { background-color: lightcyan; color: black; }\
      tr.Melee, tr.Primary, tr.Secondary, tr.Temporary { background-color: grey; color: black; }\
      tr.Defensive { background-color: lightblue; color: black; }\
      ")
    .appendTo("head");
  
  
  $("div.travel-agency:first").after("<br><div id='last-update'></div><div id='prices-dest'></div>");
}

// Holder Mode: Hides any upgrade links
function retiraUpgrade(){
  if(holderMode == 1){
    if(document.location.href.match(/\/index\.php$/)){
      var compLI = $('li:contains("Congratulations! You have enough")').parent().children().length;
      var UL = $('li:contains("Congratulations! You have enough")').parent().text();
      if(UL != '' && compLI == '1'){
        // na mesma caixa podem aparecer 2 avisos, se só tiver um, remove a caixa e a linha hr
        $('div.info-msg-cont.green.border-round.m-top10').remove();
        $('hr.page-head-delimiter.m-top10').remove();
      }else{
        $('li:contains("Congratulations! You have enough")').remove();
      }
    }
    //Remover botão de upgrade
    $('#pointsLevel').remove();
  }
}

if(holderMode == 1){
  retiraUpgrade();
  setInterval(retiraUpgrade, 1000);
}

//Align Torn to left (thanks to tn5421[276835] and LordBusiness [2052465])
if(alignleft == '1'){
 GM_addStyle(`.d .content .container, .d .header-wrapper-top .container {
    margin-left: 10px !important;
}
.d #mainContainer .content-wrapper {
margin-left: 10px;
}`);
}

//Adds employee last action in employee list (in companies)
if (document.location.href.match(/\/companies.php/)) {
  if($("div.details-wrap.player-info").text().match(/Director/) || player == 'alguem' || player == 'MaGnO' ){
    waitForKeyElements ("div.employee-list-wrap", employeeLastAction);
  }
}

function handler_empl_last_action(){
  if(this.readyState == 4 && this.status == 200) {
    if(this.responseText != null){
      var httpResp = this.responseText;
      var profileResp = JSON.parse(httpResp);

      if(profileResp.error != null && ( profileResp.error.code == '2' || profileResp.error.code == '12' )){
        var new_api_key = get_api_key();
        var url = this.responseURL.split('&key=');
        var new_url = url[0] + '&key=';
        profileResp = requestAPI(new_url, new_api_key);
      }

        $.each(profileResp.company_employees, function(i, item){
            var lastAction = item.last_action.relative;
            var userID = i;

            if( lastAction.search('day') != -1){
                lastAction = '<b><font color="red">' + parseInt(lastAction) + ' d</font></b>';
            }else if(lastAction.search('hour') != -1){
                lastAction = parseInt(lastAction) + ' h';
            }else if( lastAction.search('minute') != -1){
                lastAction = parseInt(lastAction) + ' m';
            }
            else{
                lastAction = parseInt(lastAction) + ' s';
            }

            $("#empl_" + userID).html(lastAction);
        })
    }
  }
}

var train_click;

function employeeLastAction(jNode) {
  var lista = jNode.find("div.employee.icons.t-overflow");

  $(".employee").css("width","160px");  //142px
  $(".pay").css("width","75px");  //118px
  $(".pay input").css("width","55px");
  $(".rank").css("width","146px");  //159px


  $("a.train-action").click(function(){
    //if clicked on train, disable last action
    train_click = '1';
  });
  
  if(train_click == '1'){ //if an update is made to the table, do not check again
    return;
  }
  
  lista.each( function(){
    var profile = $(this).find('a').attr('href');
    var ID = profile.match(/\/profiles.php\?XID\=(\d+)/)[1];
    //$(this).find('a').after( " (<span id=\"empl_" + ID + "\"><img src=\"http://qminh86it.googlepages.com/loading12.gif\"></img></span>)");
    $(this).find('a').after( " (<span id=\"empl_" + ID + "\"><img width=\"12px\" heigth=\"12px\" src=\"https://thumbs.gfycat.com/BitterEarnestBeardeddragon-small.gif\"></img></span>)");
  });

  var linkAPI = "//api.torn.com/company/?selections=employees&key=";
  requestAPI(linkAPI, api_key, true, handler_empl_last_action);
}

function get_chain_count(){
  var apiResponse = requestAPI('//api.torn.com/user/?selections=bars&key=', api_key);
  
  if(apiResponse.chain.current != 0){
    var time = apiResponse.chain.timeout * 1;
    var minutes = Math.floor(time / 60);
    var seconds = time - minutes * 60;
    if(seconds < 10)
      seconds = '0' + seconds;

    //$("#chainFrame").html("Chain: " + apiResponse.chain.current + " / 100 " + minutes +  ":" + seconds);
    $("#chainFrame").html("Chain: " + apiResponse.chain.current + " " + minutes +  ":" + seconds);
  }
}

// Add Chain counter in attacks
// Add chain counter while traveling
if(extrachainbar == '1' && ( $("#skip-to-content").text().match(/Travelling|Mexico|Canada|Cayman|Kingdom|Switzerland|UAE|Dubai|South|Argentina|Hawaii|Japan|China/) ||
                            document.location.href.match(/\/loader.php\?sid\=attack/) ) ){
  var setClock;
  //Chain:26 / 100 04:58
  $("div.header-wrapper-bottom").append("<div id='chainFrame' style='height:40px;background:rgb(200, 200, 200);font-size:14px;color:black;'></div>");
  $("#chainFrame").width($('#tcLogo').offset().left);
  get_chain_count();
  $("#chainFrame").mouseover(function (){setClock=window.setInterval(get_chain_count,2000);});
  $("#chainFrame").mouseout(function(){clearInterval(setClock);});
}

//Request by evilf9 - memberlist
if(player == 'evilf9'){
  //$(".menu-info-row-value.left a").text("evilfnoob");
  waitForKeyElements("div.faction-info-wrap>div.f-war-list", memberList);
}

//fun stuff
/*if(player == 'evilf9' || player == 'Pidu' || player == 'The_Storm'){
  var my_random_value = 0 + (100 - 0) * Math.random();
  
  if(my_random_value < 10){

    var stringTest = "Foste cheddado...";
    var char = 0;
    var myfunction;
    $(".content.m-top10").prepend("<div id='divTeste' class='cenas' style='color:red;width:100%;text-align:center;font-size:16px;margin:20px auto;font-weight:bold;'></div>");
    myfunction = window.setInterval(function(){
        $("#divTeste").append(stringTest[char]);
        char++;
        if(char > 16){
           clearInterval(myfunction);
        }
    }, 500);
       
        $(".cenas").css({
            'width': '100%',
            'text-align': 'center',
            'color': 'rgb(255, 255, 255)',
            'font-size': '40px',
            'background-color': 'rgb(51, 51, 51)',
            'text-shadow': 'rgb(255, 255, 255) 0px -1px 4px, rgb(255, 255, 0) 0px -2px 10px, rgb(255, 128, 0) 0px -10px 20px, rgb(255, 0, 0) 0px -18px 40px'
        });
  }
}*/

function memberList(jNode){
  var members = [];
  jNode.find("ul.member-list.info-members.bottom-round.t-blue-cont.h>li>div>span.m-hide>a")
       .each(function(){
              members.push($(this).text());
            });
 
  var textoAlert;
  $.each(members, function(item, val){
    if(textoAlert == null)
      textoAlert = val;
    else
      textoAlert += '\n' + val;
  });

  var listaMembros = function(){
    alert(textoAlert);
  }
 
  var newA = document.createElement('a');
  newA.setAttribute('class', 't-clear h c-pointer  m-icon line-h24 right');
  newA.setAttribute('id', 'listaMembros');
  newA.setAttribute('href', '#');
  newA.innerHTML = '<span class="icon-wrap"><i></i></span><span>Lista Membros</span>';
  newA.addEventListener('click', listaMembros, true);

  $('#skip-to-content').after(newA);
}

//$("div.header-wrapper-bottom").append($("div.footer-menu.left").clone(true).css('left','30%')
//                            .css('position', 'absolute') .css("color", "#fff") .css('border', 'none')
//                            .css('font-size', '110%')
//                            );
//$("div.footer-menu.left:last").remove();

// Warbase Settings

function hide_warbase(jNode){

  if(hideOff == '1'){
    // Modified by XedX
    jNode.find("li:has(div.member.icons:has(li[id^='icon2'])), li:has(div:has(div[id*='offline-user']))").each(function(item){
      $(this).remove();
    });
  }
  
  if(hideTravel == '1'){
    jNode.find("li:has(span.t-red:contains('Traveling')), li:has(span.t-red:contains('Federal')), li:has(span.t-red:contains('Fallen'))").each(function(item){
      $(this).remove();
    });
  }
  
  if(hideHosped == '1'){
    jNode.find("li:has(span.t-red:contains('Hospital'))").each(function(item){
      $(this).remove();
    });
  }

}

//if(document.location.href.match(/\/factions.php\?step\=profile/) && hideFactionList == '1' && ( hideOff == '1' || hideTravel == '1' || hideHosped == '1' || addAttack == '1')){
if(document.location.href.match(/\/factions.php\?step\=profile/) && ( hideOff == '1' || hideTravel == '1' || hideHosped == '1' || addAttack == '1')){
    if(hideOff == '1' || hideTravel == '1' || hideHosped == '1'){
        waitForKeyElements("ul.table-body", hide_warbase);
    }

    if(addAttack == '1'){
        //attack link in member list
        waitForKeyElements("div.members-list", attack_link, true);
    }
}

if(document.location.href.match(/\/factions.php\?step\=your/)){
  //Checks if OC is really ready
  waitForKeyElements("div.faction-crimes-wrap>div.organize-wrap>div.crimes-cont>ul.crimes-list", OC_readiness);
  
  //last action in member list
  //waitForKeyElements("div.faction-info-wrap>div.members-list", memberLastAction, true);
  waitForKeyElements("div.members-list", memberLastAction, true);
}

if(document.location.href.match(/\/factions.php\?step\=profile/)){
  //last action in member list
  waitForKeyElements("div.members-list", memberLastAction, true);
}

function OC_readiness(jNode){
  jNode.children().each(function(item){
    if($(this).find('ul>li.status>span.t-green').length){
      if($(this).find('div.details-wrap>ul.details-list>li>ul.item>li.stat-red').length){
        $(this).find('ul>li.status>span.t-green').attr('class', 'bold t-red').html('Not Ready');
      }
    }
  });
}

// Fix by xedx - match expression for ID
function memberLastAction(jNode) {
    console.log("Altercoes memberLastAction");

    $(".table-header").append($("<li class='table-cell position' style='width: 12%;'>Last Action</li>"));
    var lista = jNode.find("ul.table-body>li");

    lista.each( function(){ // Each one of these is a table.row
      var ID;
      $(this).find('div.member a').each(function(i, item){
          var url = $(this).attr('href');
          if(url.match(/user2ID\=(\d+)/)){
              ID = url.match(/user2ID\=(\d+)/)[1];
          }

          console.log("Altercoes ID for " ,url, ": ", ID);
      });
      $(this).append("<div class='table-cell position' style='width: 12%;'><span class='ellipsis' id=\"empl_" + ID + "\"><img width=\"12px\" heigth=\"12px\" src=\"https://thumbs.gfycat.com/BitterEarnestBeardeddragon-small.gif\"></img></span></div>");
  });

  var linkAPI = "https://api.torn.com/faction/?selections=basic&key=";
  requestAPI(linkAPI, api_key, true, handler_members_last_action);
}

function attack_link(jNode){
    $(".table-header>.member").after($("<li class='table-cell position' style='width: 8%;'>Attack</li>"));
    var lista = jNode.find("ul.table-body>li");

  lista.each( function(){
      var ID;
      $(this).find('div.member a').each(function(){
          var url = $(this).attr('href');
          if(url.match(/\/profiles.php\?XID\=(\d+)/)){
              ID = url.match(/\/profiles.php\?XID\=(\d+)/)[1];
          }

      });
      $(this).find('.member').after("<div class='table-cell position' style='width: 8%;'><a class='user name' target='_blank' href='https://www.torn.com/loader.php?sid=attack&user2ID=" + ID + "'>Attack</a></div>");
  });
}

function handler_members_last_action(){
  if(this.readyState == 4 && this.status == 200) {
    if(this.responseText != null){
      var httpResp = this.responseText;
      var profileResp = JSON.parse(httpResp);

      if(profileResp.error != null && ( profileResp.error.code == '2' || profileResp.error.code == '12' )){
        var new_api_key = get_api_key();
        var url = this.responseURL.split('&key=');
        var new_url = url[0] + '&key=';
        profileResp = requestAPI(new_url, new_api_key);
      }

      console.log("Altercoes got members list: ", profileResp.members);

        $.each(profileResp.members, function(i, item){
            var lastAction = item.last_action.relative.replace('ago', '');
            var userID = i;

            $("#empl_" + userID).html(lastAction);
        })
    }
  }
}


//Highlight Your nick in the chat
if(highlightchat == '1' || highlightchatothers == '1'){
  waitForKeyElements("#chatRoot", chat_highlight);
}

function chat_highlight2(jNode){
  //if(player == 'evilf9')
    //$('div[class^="chat-box-content"]').css("background-color","#ff33cc");
  highlight_name(jNode);
}

function chat_highlight(jNode){
  waitForKeyElements('div[class^="message_"]', chat_highlight2);
  highlight_name(jNode);
}

function highlight_name(jNode){
    if(highlightchat_color == null) highlightchat_color = 'blue';
    if(highlightchatothers_color == null) highlightchatothers_color = 'blue';

    if(highlightchat == '1'){
        jNode.find('a:contains(' + player + ')').each(function(){
            $(this).css("color", highlightchat_color);
        });
    }

    if(highlightchatothers == '1'){
        jNode.find('a:not(:contains(' + player + '))').each(function(){
            $(this).css("color", highlightchatothers_color);
        });
    }
}


//------------------Funcoes----------------------------------------------//
function fmtAmount(amt) {
  var x = "";
  if (amt<0) {
    x = "<font color=red>$";
    amt *= -1;
    x += fmtNumber(amt);
    x += "</font>";
  } else {
    if (amt>0) {
      x = "<font color=green>$";
      x += fmtNumber(amt);
      x += "</font>";
    } else {
      x = "0";
    }
  }
  return x;
}

function fmtNumber(n) {
  var x = n.toString();
  var y = '';
  var k = x.indexOf('.');
  var i=x.length;
  if(k<0) k = i;
  var j=0;
  while (i>0) {
    --i;
    y = x.substr(i, 1) + y;
    if(i < k){
      if (++j % 3 == 0) {
        if (i) y = ',' + y;
      }
    }
  }
  return y;
}

function formatCurrency(num) {
	num = num.toString().replace(/\$|\,/g,'');
	if(isNaN(num))
		num = "0";
	sign = (num == (num = Math.abs(num)));
	num = Math.floor(num*100+0.50000000001);
	cents = num%100;
	num = Math.floor(num/100).toString();
	if(cents<10)
		cents = "0" + cents;
	for (var i = 0; i < Math.floor((num.length-(1+i))/3); i++)
		num = num.substring(0,num.length-(4*i+3))+','+
		      num.substring(num.length-(4*i+3));
//	return (((sign)?'':'-') + '$' + num + '.' + cents);
	return (((sign)?'':'-') + '$' + num);
}

function updateScript(manual){
		try {
      var ONE_DAY = 24 * 60 * 60 * 1000;
      var now = new Date().getTime();
      var lastChecked = GM_getValue('alt_lastchecked', null);
      if(!lastChecked)
        lastChecked = 0;
      if((now - lastChecked) < ONE_DAY && manual != '1')
        return;
      GM_setValue('alt_lastchecked', now.toString());
      var link = 'https://www.torntuga.com/torncity/greasemonkey/alteracoes.user.js';
      var randomNumber =Math.floor(Math.random()*999)+1; //Obter número random entre 1 e 999
      link = link + '?rfc=' + randomNumber + '.user.js';
        
      GM_xmlhttpRequest({
			method: 'GET',
			url: link,
			onload: function(result) {
				if (!result.responseText.match(/@version\s+([\d.]+)/)) return;
				var theOtherVersion = parseFloat(RegExp.$1);
				var versaoActual = GM_getValue('alt_versao');
				if (theOtherVersion <= versaoActual){
          if(manual == '1')
            alert('There is no new version :(');
          return;
        }
				var mensagem = 'There is a new version of the script \'Altera' + String.fromCharCode(231) + String.fromCharCode(245) + 'es TC\'. Updates:';
				
				var alt = result.responseText.match(/(\d\d\/\d\d\/\d\d)(:)?\s+(.*)/g);
        var diaVActual = versaoActual.slice(6,8);
        var mesVActual = versaoActual.slice(4,6);
        var anoVActual = versaoActual.slice(2,4);

				for(var i = 0; i < alt.length; i++){
          var divisao = alt[i].match(/^((\d\d)\/(\d\d)\/(\d\d))(:)?\s+(.*)*/);
          if(dataAnterior(anoVActual,mesVActual,diaVActual, divisao[4],divisao[3],divisao[2])){
              mensagem += '\n- ' + divisao[6].slice(0,divisao[6].length);
          }
				}
				
				mensagem += '\n\nUpdate now?';
				
				if(window.confirm(mensagem)) {
					GM_openInTab(link);
				}
			}
			});
		} catch (ex) { }
}

// ver se 1 é anterior a 2
function dataAnterior(a1, m1, d1, a2, m2, d2){
  //GM_log(d1 + '/' + m1 + '/' + a1 + '  ' + d2 + '/' + m2 + '/' + a2);
  if(a1<a2)
    return 1;
  else
    if(a1==a2){
      if(m1<m2)
        return 1;
      else if(m1 == m2 && d1<d2)
        return 1;
  }
  return 0;
}

// Settings --- City
function settings(){
  var fxchkb = function(x) {
    GM_setValue(x.target.id, x.target.checked?'1':'0');
  };
  
  var fxtext = function(x) {
    GM_setValue(x.target.id, x.target.value);
  };
  
  var fxupdate = function(x){
    updateScript('1');
  };
  
  var fxradio = function(x) {
    GM_setValue(x.target.id, x.target.checked?'1':'0');
    switch(x.target.id){
      case 'time12h':
        GM_setValue('time24h', '0');
        break;
      case 'time24h':
        GM_setValue('time12h', '0');
        break;
    }
  };
  
  var versao = GM_getValue('alt_versao');
  
  $('head').append('<link rel="stylesheet" href="/css/style/home.css" type="text/css" />');
  //$('head').append('<link rel="stylesheet" href="/css/style/preferences.min.css" type="text/css" />');
  //$('head').append('<link rel="stylesheet" href="/css/style/header.min.css" type="text/css" />');
  //$('head').append('<link rel="stylesheet" href="/css/style/faction_controls.css" type="text/css" />');
  
  $('#tab-menu').append('<hr class="page-head-delimiter m-top10 m-bottom10">');
  $('#tab-menu').append('<div class="sortable-box t-blue-cont h "><div class="title-black active top-round"><div class="arrow-wrap"></div>Alteracoes/Torn City Enhancer Configuration</div></div>');
  $('#tab-menu').append('<div class="content m-top10">\
\
  <div class="sortable-list right ui-sortable" id="column1">\
  <div class="sortable-box t-blue-cont h"><div class="title-black top-round active"><div class="arrow-wrap"></div>Latest Version ' + versao + '</div><div style="display: block;" class="bottom-round"><div class="cont-gray10 bottom-round"><ul class="info-cont-wrap">\
  <li><div class="btn-wrap silver"><div class="btn"><button id="checkUpdate" class="torn-btn">Check for Update</button></div></div></li>\
  <li class="last" style="line-height: 1.35;">Script build by <a href="profiles.php?XID=51498">MaGnO[51498]</a>. No need for a donation, just suggestions are welcome!</li>\
  </ul></div></div></div>\
  <div class="sortable-box t-blue-cont h"><div class="title-black top-round active"><div class="arrow-wrap"></div>Hide Icons</div><div style="display: block;" class="bottom-round">\
  <div style="float:left; width:193px;" class="cont-gray bottom-round"><ul class="info-cont-wrap">\
  <li><span class="desc"><input type="checkbox" id="osex"> Sex</span></li>\
  <li><span class="desc"><input type="checkbox" id="odonator"> Donator/Subscriber</span></li>\
  <li><span class="desc"><input type="checkbox" id="omarried"> Married To</span></li>\
  <li><span class="desc"><input type="checkbox" id="ojob"> Job/Company</span></li>\
  <li><span class="desc"><input type="checkbox" id="ofaction"> Faction</span></li>\
  <li><span class="desc"><input type="checkbox" id="obank"> Bank</span></li>\
  <li><span class="desc"><input type="checkbox" id="ostock"> Stock Market</span></li>\
  <li><span class="desc"><input type="checkbox" id="oeduc"> Education</span></li>\
  <li><span class="desc"><input type="checkbox" id="obooster"> Booster Cooldown</span></li>\
  <li><span class="desc"><input type="checkbox" id="omedical"> Medical Cooldown</span></li>\
  <li><span class="desc"><input type="checkbox" id="odrug"> Drug Cooldown</span></li>\
  <li><span class="desc"><input type="checkbox" id="olevel100"> Level 100</span></li>\
  <li><span class="desc"><input type="checkbox" id="oaddiction"> Drug Addiction</span></li>\
  <li><span class="desc"><input type="checkbox" id="oauction"> Auction</span></li>\
  </ul></div>\
  <div style="float:right; width:193px;" class="cont-gray bottom-round">\
  <ul class="info-cont-wrap">\
  <li><span class="desc"><input type="checkbox" id="otrade"> Trades</span></li>\
  <li><span class="desc"><input type="checkbox" id="orace"> Race</span></li>\
  <li><span class="desc"><input type="checkbox" id="oitem"> Items in bazaar/auction/market</span></li>\
  <li><span class="desc"><input type="checkbox" id="opoints"> Points</span></li>\
  <li><span class="desc"><input type="checkbox" id="oloan"> Loan</span></li>\
  <li><span class="desc"><input type="checkbox" id="obounty"> Bounty</span></li>\
  <li><span class="desc"><input type="checkbox" id="ocashier"> Cashier Checks</span></li>\
  <li><span class="desc"><input type="checkbox" id="ohosp"> Hospital</span></li>\
  <li><span class="desc"><input type="checkbox" id="ojail"> Jail</span></li>\
  <li><span class="desc"><input type="checkbox" id="ollife"> Low Life</span></li>\
  <li><span class="desc"><input type="checkbox" id="obook"> Books</span></li>\
  <li><span class="desc"><input type="checkbox" id="oupkeep"> Property Upkeep</span></li>\
  <li><span class="desc"><input type="checkbox" id="oradiation"> Radiation Sickness</span></li>\
  <li><span class="desc"><input type="checkbox" id="oocrimes"> Organized Crimes</span></li>\
  </ul></div>\
  <div style="clear:both;"></div>\
  </div></div>\
  <div class="sortable-box t-blue-cont h"><div class="title-black top-round active"><div class="arrow-wrap"></div>Remove Links from Sidebar</div><div style="display: block;" class="bottom-round">\
  <div style="float:left; width:193px;" class="cont-gray bottom-round">\
  <ul class="info-cont-wrap">\
  <li><span class="desc"><input type="checkbox" id="rhome"> Home</span></li>\
  <li><span class="desc"><input type="checkbox" id="ritems"> Items</span></li>\
  <li><span class="desc"><input type="checkbox" id="rcity"> City</span></li>\
  <li><span class="desc"><input type="checkbox" id="rjob"> Job</span></li>\
  <li><span class="desc"><input type="checkbox" id="rgym"> Gym</span></li>\
  <li><span class="desc"><input type="checkbox" id="rproperties"> Properties</span></li>\
  <li><span class="desc"><input type="checkbox" id="reducation"> Education</span></li>\
  <li><span class="desc"><input type="checkbox" id="rcrimes"> Crimes</span></li>\
  <li><span class="desc"><input type="checkbox" id="rmissions"> Missions</span></li>\
  </ul></div>\
  <div style="float:right; width:193px;" class="cont-gray bottom-round">\
  <ul class="info-cont-wrap">\
  <li><span class="desc"><input type="checkbox" id="rnewspaper"> Newspaper</span></li>\
  <li><span class="desc"><input type="checkbox" id="rjail"> Jail</span></li>\
  <li><span class="desc"><input type="checkbox" id="rhospital"> Hospital</span></li>\
  <li><span class="desc"><input type="checkbox" id="rcasino"> Casino</span></li>\
  <li><span class="desc"><input type="checkbox" id="rforums"> Forums</span></li>\
  <li><span class="desc"><input type="checkbox" id="rhof"> Hall of Fame</span></li>\
  <li><span class="desc"><input type="checkbox" id="rfaction"> My Faction</span></li>\
  <li><span class="desc"><input type="checkbox" id="rcitizens"> Recruit Citizens</span></li>\
  <li><span class="desc"><input type="checkbox" id="rrules"> Rules</span></li>\
  </ul></div>\
  <div style="clear:both;"></div></div>\
  </div>\
    <div class="sortable-box t-blue-cont h"><div class="title-black top-round active"><div class="arrow-wrap"></div>Personal Stats (activate on main options)</div><div style="display: block;" class="bottom-round">\
  <div style="float:left; width:193px;" class="cont-gray bottom-round">\
  <ul class="info-cont-wrap">\
  <li><span class="desc"><input type="checkbox" id="psattackswon"> Attacks Won</span></li>\
  <li><span class="desc"><input type="checkbox" id="psdefendswon"> Defends Won</span></li>\
  <li><span class="desc"><input type="checkbox" id="psmoneymugged"> Money Mugged</span></li>\
  <li><span class="desc"><input type="checkbox" id="pshighestlevel"> Highest Level Beaten</span></li>\
  <li><span class="desc"><input type="checkbox" id="pskillstreak"> Best Kill Streak</span></li>\
  <li><span class="desc"><input type="checkbox" id="pstotalrespect"> Total Respect Gained</span></li>\
  <li><span class="desc"><input type="checkbox" id="pspeoplebusted"> People Busted</span></li>\
  <li><span class="desc"><input type="checkbox" id="pspeoplebailed"> People Bailed</span></li>\
  <li><span class="desc"><input type="checkbox" id="pscriminaloffences"> Criminal Offences</span></li>\
  <li><span class="desc"><input type="checkbox" id="pstimestravelled"> Times Travelled</span></li>\
  <li><span class="desc"><input type="checkbox" id="psrevives"> People Revived</span></li>\
  <li><span class="desc"><input type="checkbox" id="psbloodwithdrawn"> Blood withdrawn</span></li>\
  <li><span class="desc"><input type="checkbox" id="psbooksread"> Books Read</span></li>\
  </ul></div>\
  <div style="float:right; width:193px;" class="cont-gray bottom-round">\
  <ul class="info-cont-wrap">\
  <li><span class="desc"><input type="checkbox" id="psecstasy"> Ecstasy Taken</span></li>\
  <li><span class="desc"><input type="checkbox" id="psxanax"> Xanax Taken</span></li>\
  <li><span class="desc"><input type="checkbox" id="psvicodin"> Vicodin Taken</span></li>\
  <li><span class="desc"><input type="checkbox" id="pslsd"> LSD Taken</span></li>\
  <li><span class="desc"><input type="checkbox" id="psmissioncredits"> Mission Credits Earned</span></li>\
  <li><span class="desc"><input type="checkbox" id="psnetworth"> Networth</span></li>\
  <li><span class="desc"><input type="checkbox" id="pslogins"> Logins</span></li>\
  <li><span class="desc"><input type="checkbox" id="psreffils"> Energy Reffils</span></li>\
  <li><span class="desc"><input type="checkbox" id="psenhancers"> Stat Enhancers Used</span></li>\
  <li><span class="desc"><input type="checkbox" id="psdonator"> Days Been Donator</span></li>\
  <li><span class="desc"><input type="checkbox" id="pscandyeaten"> Candy Eaten</span></li>\
  <li><span class="desc"><input type="checkbox" id="psalcohol"> Alcohol Drunk</span></li>\
  <li><span class="desc"><input type="checkbox" id="psdrinks"> Energy Drinks Drunk</span></li>\
  <li><span class="desc"><input type="checkbox" id="psreviveskill"> Reviving Skill</span></li>\
  </ul></div>\
  <div style="clear:both;"></div></div>\
  </div>\
  \
  <div class="sortable-box t-blue-cont h"><div class="title-black top-round active"><div class="arrow-wrap"></div>Show only these crimes:</div><div style="display: block;" class="bottom-round">\
  <div style="float:left; width:193px;" class="cont-gray bottom-round">\
  <ul class="info-cont-wrap">\
  <li><span class="desc"><input type="checkbox" id="crime2"> Search for Cash (-2)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime3"> Sell Copied Media (-3)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime4"> Shoplift (-4)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime5"> Pickpocket (-5)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime6"> Larceny (-6)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime7"> Armed Robberies (-7)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime8"> Transport Drugs (-8)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime9"> Plant Virus (-9)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime10"> Assassination (-10)</span></li>\
  </ul></div>\
  <div style="float:right; width:193px;" class="cont-gray bottom-round">\
  <ul class="info-cont-wrap">\
  <li><span class="desc"><input type="checkbox" id="crime11"> Arson (-11)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime12"> Grand Theft Auto (-12)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime13"> Pawn Shop (-13)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime14"> Counterfeiting (-14)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime15"> Kidnapping (-15)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime16"> Arms Trafficking (-16)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime17"> Bombings (-17)</span></li>\
  <li><span class="desc"><input type="checkbox" id="crime18"> Hacking (-18)</span></li>\
  <li><span class="desc" style="height:16px;"></span></li>\
  </ul></div>\
  <div style="clear:both;"></div></div>\
  </div></div>\
<div class="sortable-list left" id="column0"> <div class="sortable-box t-blue-cont h"><div class="title-black top-round active"><div class="arrow-wrap"></div>Main Options</div><div style="display: block;" class="bottom-round"><div class="cont-gray bottom-round"><ul class="info-cont-wrap">\
  <li><span class="desc" title="Hides the level upgrade links"><input type="checkbox" id="holderMode"> Holder Mode</span></li>\
  <li><span class="desc" title="Removes bounties from the list that cannot be claimed"><input type="checkbox" id="removerBounties"> Remove unavailable bounties</span></li>\
  <li><span class="desc" title="Removes people from hospital that doesn\'t want to be revived"><input type="checkbox" id="removeRevives"> Remove unavailable revives</span></li>\
  <li><span class="desc"><input type="checkbox" id="destacarJail"> Highlight people in Jail with tag <input type="text" id="tagJail" size="4" maxlength="5"></span></li>\
  <li><span class="desc"><input type="checkbox" id="destacarHosp"> Highlight people in Hospital with tag <input type="text" id="tagHosp" size="4" maxlength="5"></span></li>\
  <li><span class="desc"><input type="checkbox" id="highlightOut"> Highlight people abroad with tag <input type="text" id="tagOut" size="4" maxlength="5"></span></li>\
  <li class="un-visible"><span class="desc"><input type="checkbox" id="lastaction"> Show Last Action/Location in other faction members list</span></li>\
  <li><span class="desc"><input type="checkbox" id="percStats"> Add battle stats percentage</span></li>\
  <li><span class="desc"><input type="checkbox" id="effstats"> Add effective battle stats</span></li>\
  <li><span class="desc" title="Adds the next merit and the crimes left in Criminal Record in Home page"><input type="checkbox" id="crimeMerits"> Add crimes left for next merit</span></li>\
  <li class="un-visible"><input type="checkbox" id="respfaction"> Show respect won in faction members list</li>\
  <li><span class="desc"><input type="checkbox" id="hidemap"> Hide images from map for easier city finds</span></li>\
  <li><span class="desc"><input type="checkbox" id="flowerprices"> Add flower prices in Home from YATA</span></li>\
  <li><span class="desc"><input type="checkbox" id="plushieprices"> Add plushie prices in Home from YATA</span></li>\
  <li><span class="desc" title="Get the latest prices from YATA and shows them when clicking in a destination"><input type="checkbox" id="travelrunprices"> Add outside prices in Travel Agency from Travelrun</span></li>\
  <!--<li><input type="checkbox" id="sortitems"> Sort items by category</li>-->\
  <li><span class="desc" title="Adds a new block in profile with personal stats"><input type="checkbox" id="personalstats"> Add Personal Stats on profile (select stats on the right)</span></li>\
  <li><span class="desc" title="Removes crimes from crime page"><input type="checkbox" id="removecrimes"> Remove crimes from Crime list (select crimes on the right)</span></li>\
  <li><span class="desc"><input type="checkbox" id="redirectgym"> Redirect to gym after Xanax/FHC taken</span></li>\
  <li><span class="desc"><input type="checkbox" id="highlightchat"> Highlight your nick in the chat with the color <select id="highlightchat_color"><option value="blue">Blue</option><option value="Gray">Gray</option><option value="green">Green</option><option value="#cc9900">Gold</option><option value="Brown">Brown</option><option value="Orange">Orange</option><option value="DeepPink">DeepPink</option><option value="purple">Purple</option></select></span></li>\
  <li><span class="desc"><input type="checkbox" id="highlightchatothers"> Highlight other nicks in the chat with the color <select id="highlightchatothers_color"><option value="blue">Blue</option><option value="Gray">Gray</option><option value="green">Green</option><option value="#cc9900">Gold</option><option value="Brown">Brown</option><option value="Orange">Orange</option><option value="DeepPink">DeepPink</option><option value="purple">Purple</option></select></span></li>\
  <li><span class="desc" title="Removes table borders in the new layout"><input type="checkbox" id="removeborders"> Remove table borders in Home and Profiles</span></li>\
  <li><span class="desc" title="Counts the position of a company and shows a table with the results"><input type="checkbox" id="positioncounter"> Add a position counter in company profile page</span></li>\
  <li><span class="desc" title="Removes bust confirmation"><input type="checkbox" id="expressbust"> Express Bust</span></li>\
  <li><span class="desc" title="Removes bail confirmation"><input type="checkbox" id="expressbail"> Express Bail</span></li>\
  <li><span class="desc" title="Aligns Torn menus to left side of screen"><input type="checkbox" id="alignleft"> Align Torn to left</span></li>\
  <li><span class="desc" title="Select if you want to see time like 1PM or 13:00"> Time Format <input type="radio" name="timeformat" id="time12h"> 12h <input type="radio"  name="timeformat" id="time24h"> 24h</span></li>\
  </ul></div></div></div>\
  <div class="sortable-box t-blue-cont h"><div class="title-black top-round active"><div class="arrow-wrap"></div>Add Links in Sidebar</div><div style="display: block;" class="bottom-round"><div class="cont-gray bottom-round"><ul class="info-cont-wrap">\
  <li><span class="desc"><input type="checkbox" id="lraces"> Races</span></li>\
  <li><span class="desc"><input type="checkbox" id="lstockmarket"> Stock Market</span></li>\
  <li><span class="desc"><input type="checkbox" id="lpoker"> Poker</span></li>\
  <li><span class="desc"><input type="checkbox" id="lbookies"> Bookies</span></li>\
  <li><span class="desc"><input type="checkbox" id="lrroulette"> Russian Roulette</span></li>\
  <li><span class="desc"><input type="checkbox" id="lwheels"> Spin the Wheel</span></li>\
  <li><span class="desc"><input type="checkbox" id="llottery"> Lottery</span></li>\
  <li><span class="desc"><input type="checkbox" id="lslots"> Slots</span></li>\
  <!--<li><input type="checkbox" id="lstocks"> Stocks in Hospital</li>\
  <li><span class="desc"><input type="checkbox" id="lnotepad"> Notepad in Hospital</li>-->\
  <li><span class="desc"><input type="checkbox" id="lbounties"> Bounties</span></li>\
  <li><span class="desc"><input type="checkbox" id= "useTravAg" name="tipoViag"> Travel Agency</span></li>\
  <li><span class="desc"><input type="checkbox" id= "lvault" name="lvault"> Vault</span></li>\
  </ul></div></div></div><!-- se retirar este ultimo div ele passa para o lado direito!!!-->\
  <div class="sortable-box t-blue-cont h"><div class="title-black top-round active"><div class="arrow-wrap"></div>Shortcuts</div><div style="display: block;" class="bottom-round"><div class="cont-gray bottom-round"><ul class="info-cont-wrap">\
  <li><span class="desc">Ex: Name: Notepad Link: notebook.php</span></li>\
  <li></li>\
  <li></li>\
  <li><span class="desc"><div class="inputs-wrap"><input class="count m-top10" type="checkbox" id="lactivo1">&nbsp; <input type="text" id="nomeL1" size="10"> \
&nbsp;&nbsp;&nbsp; <input type="text" id="link1" size="35"></div></span></li>\
<li><span class="desc"><input type="checkbox" id="lactivo2">&nbsp; <input type="text" id="nomeL2" size="10"> \
&nbsp;&nbsp;&nbsp; <input type="text" id="link2" size="35"></span></li>\
<li><span class="desc"><input type="checkbox" id="lactivo3">&nbsp; <input type="text" id="nomeL3" size="10"> \
&nbsp;&nbsp;&nbsp; <input type="text" id="link3" size="35"></span></li>\
<li><span class="desc"><input type="checkbox" id="lactivo4">&nbsp; <input type="text" id="nomeL4" size="10"> \
&nbsp;&nbsp;&nbsp; <input type="text" id="link4" size="35"></span></li>\
<li><span class="desc"><input type="checkbox" id="lactivo5">&nbsp; <input type="text" id="nomeL5" size="10"> \
&nbsp;&nbsp;&nbsp; <input type="text" id="link5" size="35"></span></li>\
  </ul></div></div></div>\
  <div class="sortable-box t-blue-cont h"><div class="title-black top-round active"><div class="arrow-wrap"></div>Warbase (Other factions member list)</div><div style="display: block;" class="bottom-round"><div class="cont-gray bottom-round"><ul class="info-cont-wrap">\
  <li><span class="desc"><input type="checkbox" id="hideOff"> Hide Offline Enemies</span></li>\
  <li><span class="desc"><input type="checkbox" id="hideTravel"> Hide Travelling/Fed Jailed/Fallen Enemies</span></li>\
  <li><span class="desc"><input type="checkbox" id="hideHosped"> Hide Hosped Enemies</span></li>\
  <!--<li><span class="desc"><input type="checkbox" id="hideFactionList"> Apply this settings also in other faction member list</span></li>-->\
  <li><span class="desc"><input type="checkbox" id="addAttack"> Add attack link in other faction member list</span></li>\
  <li><span class="desc" title="Adds an extra chain counter on top of page, it is updated when you leave your mouse over it for 2 seconds"><input type="checkbox" id="extrachainbar"> Add Extra chain counter</span></li>\
  <li><span class="desc"><input type="checkbox" id="chainAlert"> Chain alert at <select id="chainAlert_time"><option value="03:00">03:00</option><option value="02:30">02:30</option><option value="02:00">02:00</option><option value="01:30">01:30</option><option value="01:00">01:00</option></select></span></li>\
  </ul></div></div></div>\
  </div>\
  </div></div>\
  </div></div>');
  
  $('#tab-menu').append("<style>.d .sortable-list .info-cont-wrap .desc { overflow: visible; }</style>");

    
  var elem;
  $("#holderMode").prop('checked', (holderMode == '1' ? true : false) ).click(fxchkb);
  $("#removerBounties").prop('checked', (removerBounties == '1' ? true : false) ).click(fxchkb);
  $("#removeRevives").prop('checked', (removeRevives == '1' ? true : false) ).click(fxchkb);
  $("#percStats").prop('checked', (percStats == '1' ? true : false) ).click(fxchkb);
  $("#effstats").prop('checked', (effstats == '1' ? true : false)).click(fxchkb);
  $("#crimeMerits").prop('checked', (crimeMerits == '1' ? true : false) ).click(fxchkb);
  
  $("#hidemap").prop('checked', (hidemap == '1' ? true : false) ).click(fxchkb);
  $("#flowerprices").prop('checked', (flowerprices == '1' ? true : false) ).click(fxchkb);
  $("#plushieprices").prop('checked', (plushieprices == '1' ? true : false) ).click(fxchkb);
  $("#travelrunprices").prop('checked', (travelrunprices == '1' ? true : false) ).click(fxchkb);
  $("#sortitems").prop('checked', (sortitems == '1' ? true : false) ).click(fxchkb);
  $("#extrachainbar").prop('checked', (extrachainbar == '1' ? true : false) ).click(fxchkb);
  $("#personalstats").prop('checked', (personalstats == '1' ? true : false) ).click(fxchkb);
  $("#removecrimes").prop('checked', (removecrimes == '1' ? true : false) ).click(fxchkb);
  $("#redirectgym").prop('checked', (redirectgym == '1' ? true : false) ).click(fxchkb);
  $("#removeborders").prop('checked', (removeborders == '1' ? true : false) ).click(fxchkb);
  $("#positioncounter").prop('checked', (positioncounter == '1' ? true : false) ).click(fxchkb);
  $("#expressbust").prop('checked', (expressbust == '1' ? true : false) ).click(fxchkb);
  $("#expressbail").prop('checked', (expressbail == '1' ? true : false) ).click(fxchkb);
  $("#alignleft").prop('checked', (alignleft == '1' ? true : false)).click(fxchkb);
  $("#highlightchat").prop('checked', (highlightchat == '1' ? true : false) ).click(fxchkb);
  $("#highlightchat_color").find("option[value='" + highlightchat_color + "']").attr("selected", true);
  $("#highlightchat_color").change(fxtext);
  $("#highlightchatothers").prop('checked', (highlightchatothers == '1' ? true : false) ).click(fxchkb);
  $("#highlightchatothers_color").find("option[value='" + highlightchatothers_color + "']").attr("selected", true);
  $("#highlightchatothers_color").change(fxtext);
  $("#destacarJail").prop('checked', (destacarJail == '1' ? true : false) ).click(fxchkb);
  $("#tagJail").attr('value', tagJail).change(fxtext);
  $("#destacarHosp").prop('checked', (destacarHosp == '1' ? true : false) ).click(fxchkb);
  $("#tagHosp").attr('value', tagHosp).change(fxtext);
  $("#highlightOut").prop('checked', (highlightOut == '1' ? true : false) ).click(fxchkb);
  $("#tagOut").attr('value', tagOut).change(fxtext);
  $("#time12h").prop('checked', (time12h == '1' ? true : false) ).click(fxradio);
  $("#time24h").prop('checked', (time24h == '1' ? true : false) ).click(fxradio);
  
  $("#checkUpdate").click(fxupdate);
  
  $("#lraces").prop('checked', (lraces == '1' ? true : false) ).click(fxchkb);
  $("#lstockmarket").prop('checked', (lstockmarket == '1' ? true : false) ).click(fxchkb);
  $("#lpoker").prop('checked', (lpoker == '1' ? true : false) ).click(fxchkb);
  $("#lbookies").prop('checked', (lbookies == '1' ? true : false) ).click(fxchkb);
  $("#lrroulette").prop('checked', (lrroulette == '1' ? true : false) ).click(fxchkb);
  $("#lwheels").prop('checked', (lwheels == '1' ? true : false) ).click(fxchkb);
  $("#llottery").prop('checked', (llottery == '1' ? true : false) ).click(fxchkb);
  $("#lslots").prop('checked', (lslots == '1' ? true : false) ).click(fxchkb);
  $("#lstocks").prop('checked', (lstocks == '1' ? true : false) ).click(fxchkb);
  $("#lnotepad").prop('checked', (lnotepad == '1' ? true : false) ).click(fxchkb);
  $("#lbounties").prop('checked', (lbounties == '1' ? true : false) ).click(fxchkb);
  $("#useTravAg").prop('checked', (useTravAg == '1' ? true : false) ).click(fxchkb);
  $("#lvault").prop('checked', (lvault == '1' ? true : false) ).click(fxchkb);
  
  for(var ii=1; ii <= 5; ii++){
    var nome = "lactivo" + ii;
    $("#" + nome).prop('checked', ( eval(nome) == '1' ? true : false) ).click(fxchkb);
    
    nome = "nomeL" + ii;
    $("#" + nome).attr('value', eval(nome)).change(fxtext);
    
    nome = "link" + ii;
    $("#" + nome).attr('value', eval(nome)).change(fxtext);
  }
  
  //Warbase Settings
  $("#hideOff").prop('checked', (hideOff == '1' ? true : false) ).click(fxchkb);
  $("#hideTravel").prop('checked', (hideTravel == '1' ? true : false) ).click(fxchkb);
  $("#hideHosped").prop('checked', (hideHosped == '1' ? true : false) ).click(fxchkb);
  $("#hideFactionList").prop('checked', (hideFactionList == '1' ? true : false) ).click(fxchkb);
  $("#addAttack").prop('checked', (addAttack == '1' ? true : false) ).click(fxchkb);
  $("#chainAlert").prop('checked', (chainAlert == '1' ? true : false) ).click(fxchkb);
  $("#chainAlert_time").find("option[value='" + chainAlert_time + "']").attr("selected", true);
  $("#chainAlert_time").change(fxtext);
  
  //Hide Icons
  $("#osex").prop('checked', (osex == '1' ? true : false) ).click(fxchkb);
  $("#odonator").prop('checked', (odonator == '1' ? true : false) ).click(fxchkb);
  $("#omarried").prop('checked', (omarried == '1' ? true : false) ).click(fxchkb);
  $("#ojob").prop('checked', (ojob == '1' ? true : false) ).click(fxchkb);
  $("#ofaction").prop('checked', (ofaction == '1' ? true : false) ).click(fxchkb);
  $("#obank").prop('checked', (obank == '1' ? true : false) ).click(fxchkb);
  $("#ostock").prop('checked', (ostock == '1' ? true : false) ).click(fxchkb);
  $("#oeduc").prop('checked', (oeduc == '1' ? true : false) ).click(fxchkb);
  $("#obooster").prop('checked', (obooster == '1' ? true : false) ).click(fxchkb);
  $("#omedical").prop('checked', (omedical == '1' ? true : false) ).click(fxchkb);
  $("#odrug").prop('checked', (odrug == '1' ? true : false) ).click(fxchkb);
  $("#olevel100").prop('checked', (olevel100 == '1' ? true : false) ).click(fxchkb);
  $("#otrade").prop('checked', (otrade == '1' ? true : false) ).click(fxchkb);
  $("#orace").prop('checked', (orace == '1' ? true : false) ).click(fxchkb);
  $("#oitem").prop('checked', (oitem == '1' ? true : false) ).click(fxchkb);
  $("#opoints").prop('checked', (opoints == '1' ? true : false) ).click(fxchkb);
  $("#oloan").prop('checked', (oloan == '1' ? true : false) ).click(fxchkb);
  $("#obounty").prop('checked', (obounty == '1' ? true : false) ).click(fxchkb);
  $("#ocashier").prop('checked', (ocashier == '1' ? true : false) ).click(fxchkb);
  $("#ohosp").prop('checked', (ohosp == '1' ? true : false) ).click(fxchkb);
  $("#ojail").prop('checked', (ojail == '1' ? true : false) ).click(fxchkb);
  $("#ollife").prop('checked', (ollife == '1' ? true : false) ).click(fxchkb);
  $("#obook").prop('checked', (obook == '1' ? true : false) ).click(fxchkb);
  $("#oupkeep").prop('checked', (oupkeep == '1' ? true : false) ).click(fxchkb);
  $("#oaddiction").prop('checked', (oaddiction == '1' ? true : false) ).click(fxchkb);
  $("#oradiation").prop('checked', (oradiation == '1' ? true : false) ).click(fxchkb);
  $("#oauction").prop('checked', (oauction == '1' ? true : false) ).click(fxchkb);
  $("#oocrimes").prop('checked', (oocrimes == '1' ? true : false) ).click(fxchkb);
  
  //Remove Links
  $("#rhome").prop('checked', (rhome == '1' ? true : false) ).click(fxchkb);
  $("#ritems").prop('checked', (ritems == '1' ? true : false) ).click(fxchkb);
  $("#rcity").prop('checked', (rcity == '1' ? true : false) ).click(fxchkb);
  $("#rjob").prop('checked', (rjob == '1' ? true : false) ).click(fxchkb);
  $("#rgym").prop('checked', (rgym == '1' ? true : false) ).click(fxchkb);
  $("#rproperties").prop('checked', (rproperties == '1' ? true : false) ).click(fxchkb);
  $("#reducation").prop('checked', (reducation == '1' ? true : false) ).click(fxchkb);
  $("#rcrimes").prop('checked', (rcrimes == '1' ? true : false) ).click(fxchkb);
  $("#rmissions").prop('checked', (rmissions == '1' ? true : false) ).click(fxchkb);
  $("#rnewspaper").prop('checked', (rnewspaper == '1' ? true : false) ).click(fxchkb);
  $("#rjail").prop('checked', (rjail == '1' ? true : false) ).click(fxchkb);
  $("#rhospital").prop('checked', (rhospital == '1' ? true : false) ).click(fxchkb);
  $("#rcasino").prop('checked', (rcasino == '1' ? true : false) ).click(fxchkb);
  $("#rforums").prop('checked', (rforums == '1' ? true : false) ).click(fxchkb);
  $("#rhof").prop('checked', (rhof == '1' ? true : false) ).click(fxchkb);
  $("#rfaction").prop('checked', (rfaction == '1' ? true : false) ).click(fxchkb);
  $("#rcitizens").prop('checked', (rcitizens == '1' ? true : false) ).click(fxchkb);
  $("#rrules").prop('checked', (rrules == '1' ? true : false) ).click(fxchkb);
  
  //Personal Stats
  $("#psattackswon").prop('checked', (psattackswon == '1' ? true : false) ).click(fxchkb);
  $("#psdefendswon").prop('checked', (psdefendswon == '1' ? true : false) ).click(fxchkb);
  $("#psmoneymugged").prop('checked', (psmoneymugged == '1' ? true : false) ).click(fxchkb);
  $("#pshighestlevel").prop('checked', (pshighestlevel == '1' ? true : false) ).click(fxchkb);
  $("#pskillstreak").prop('checked', (pskillstreak == '1' ? true : false) ).click(fxchkb);
  $("#pstotalrespect").prop('checked', (pstotalrespect == '1' ? true : false) ).click(fxchkb);
  $("#pspeoplebusted").prop('checked', (pspeoplebusted == '1' ? true : false) ).click(fxchkb);
  $("#pspeoplebailed").prop('checked', (pspeoplebailed == '1' ? true : false) ).click(fxchkb);
  $("#pscriminaloffences").prop('checked', (pscriminaloffences == '1' ? true : false) ).click(fxchkb);
  $("#pstimestravelled").prop('checked', (pstimestravelled == '1' ? true : false) ).click(fxchkb);
  $("#psrevives").prop('checked', (psrevives == '1' ? true : false) ).click(fxchkb);
  $("#psbloodwithdrawn").prop('checked', (psbloodwithdrawn == '1' ? true : false) ).click(fxchkb);
  $("#psbooksread").prop('checked', (psbooksread == '1' ? true : false) ).click(fxchkb);
  $("#psecstasy").prop('checked', (psecstasy == '1' ? true : false) ).click(fxchkb);
  $("#psxanax").prop('checked', (psxanax == '1' ? true : false) ).click(fxchkb);
  $("#psvicodin").prop('checked', (psvicodin == '1' ? true : false) ).click(fxchkb);
  $("#pslsd").prop('checked', (pslsd == '1' ? true : false) ).click(fxchkb);
  $("#psmissioncredits").prop('checked', (psmissioncredits == '1' ? true : false) ).click(fxchkb);
  $("#psnetworth").prop('checked', (psnetworth == '1' ? true : false) ).click(fxchkb);
  $("#pslogins").prop('checked', (pslogins == '1' ? true : false) ).click(fxchkb);
  $("#psreffils").prop('checked', (psreffils == '1' ? true : false) ).click(fxchkb);
  $("#psenhancers").prop('checked', (psenhancers == '1' ? true : false) ).click(fxchkb);
  $("#psdonator").prop('checked', (psdonator == '1' ? true : false) ).click(fxchkb);
  $("#pscandyeaten").prop('checked', (pscandyeaten == '1' ? true : false) ).click(fxchkb);
  $("#psalcohol").prop('checked', (psalcohol == '1' ? true : false) ).click(fxchkb);
  $("#psdrinks").prop('checked', (psdrinks == '1' ? true : false) ).click(fxchkb);
  $("#psreviveskill").prop('checked', (psreviveskill == '1' ? true : false) ).click(fxchkb);
  
  //Remove Crimes
  $("#crime2").prop('checked', (crime2 == '1' ? true : false) ).click(fxchkb);
  $("#crime3").prop('checked', (crime3 == '1' ? true : false) ).click(fxchkb);
  $("#crime4").prop('checked', (crime4 == '1' ? true : false) ).click(fxchkb);
  $("#crime5").prop('checked', (crime5 == '1' ? true : false) ).click(fxchkb);
  $("#crime6").prop('checked', (crime6 == '1' ? true : false) ).click(fxchkb);
  $("#crime7").prop('checked', (crime7 == '1' ? true : false) ).click(fxchkb);
  $("#crime8").prop('checked', (crime8 == '1' ? true : false) ).click(fxchkb);
  $("#crime9").prop('checked', (crime9 == '1' ? true : false) ).click(fxchkb);
  $("#crime10").prop('checked', (crime10 == '1' ? true : false) ).click(fxchkb);
  $("#crime11").prop('checked', (crime11 == '1' ? true : false) ).click(fxchkb);
  $("#crime12").prop('checked', (crime12 == '1' ? true : false) ).click(fxchkb);
  $("#crime13").prop('checked', (crime13 == '1' ? true : false) ).click(fxchkb);
  $("#crime14").prop('checked', (crime14 == '1' ? true : false) ).click(fxchkb);
  $("#crime15").prop('checked', (crime15 == '1' ? true : false) ).click(fxchkb);
  $("#crime16").prop('checked', (crime16 == '1' ? true : false) ).click(fxchkb);
  $("#crime17").prop('checked', (crime17 == '1' ? true : false) ).click(fxchkb);
  $("#crime18").prop('checked', (crime18 == '1' ? true : false) ).click(fxchkb);
}

// funcao para adicionar um link ao menu:
// no - elemento anterior ao objecto a adicionar
// endereço - string com url
// texto - texto do link
// nivel - profundidade do link relativamente ao menu
// target - atributo target do link
// icon - icon to show before link
function addLink(no, endereco, texto, nivel, icon, target){
  var novoLink = document.createElement('a');
  var novoLI = document.createElement('div');
  var novoDiv  = document.createElement('div');

  novoLink.setAttribute('href', endereco);
  novoLink.setAttribute('class', a_class);

  if(target != null)
    novoLink.setAttribute('target', target);

  if(icon != null){
    novoLink.innerHTML = '<span class="' + icon_class + '">' + icon + '</span>';
    novoLink.innerHTML +=  '<span class="' + link_name_class + '">' + texto+'</span>';
  }else{
      novoLink.innerHTML =  '<span class="' + link_name_class + '">' + '&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp;' +  texto+'</span>';
  }

  novoDiv.setAttribute('class', row_class);
  novoDiv.appendChild(novoLink);

  novoLI.setAttribute('class', link_class);

  novoLI.appendChild(novoDiv);

  no.parentNode.insertBefore(novoLI, no.nextSibling);
  return novoLink;
}

function requestPage(link, modo, handler){
  var httpRequest = new XMLHttpRequest();
  httpRequest.onreadystatechange = handler;
  httpRequest.open('GET', link, modo);
  try{ httpRequest.send(null); } catch(x){ //alert(x);
  };
  return httpRequest.responseText;
}


function requestPage2(link){
   GM_xmlhttpRequest({
    method: "GET",
    url: link,
    headers: {
          'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey/0.3',
          'Accept': 'application/atom+xml,application/xml,text/xml',
    },
    synchronous: false,
    onload: function(response) {
      return response.responseText;
    }
  });
}

function requestPage4(link, handler){
  GM_xmlhttpRequest({
    method: "GET",
    url: link,
    onreadystatechange: handler,
    onload: function(response){
        return response.responseText;
    }
  });
}

function requestAPI(link, api_key, modo, handler){
  var requestLink = link + api_key + '&comment=Alteracoes';
  //var listJSON = requestPage(requestLink, modo, handler);
  var listJSON = requestPage4(requestLink, handler);

  if(handler == null){
      GM_log(listJSON);
    var list = JSON.parse(listJSON);
    
    //{"error":{"code":2,"error":"Incorrect Key"}}
    if(list.error != null){
      if(list.error.code == '2' || list.error.code == '12'){
        //get current API Key
        var new_api_key = get_api_key();
        list = requestAPI(link, new_api_key);
      }
    }
    return list;
  }
  
}

function fmtperc(x) {
  var y = x * 10000;
  y = Math.floor(y + 0.5) + 0.5;
  y /= 100;
  y += 0.00001;
  var yy = y.toString();
  var dotpos = yy.indexOf('.');
  return yy.substr(0, dotpos + 3);
}

function get_api_key(){
    const inputApi = prompt('Insert Torn API Key for Alteracoes Script. A key with Limited Access is needed.\n\nCancel or leave blank and you will be prompted to insert API Key again.');
    if (inputApi) {
        set_api_key(inputApi);
        return inputApi;
    }
}

function set_api_key(key){
  api_key = key;
  GM_setValue('api_key', key);
}
///

//Fix table borders
if( removeborders == '1'){
  $("<style>")
    .attr("type", "text/css")
    .html("\
          .d .sortable-list .info-cont-wrap li { padding: 2px 0px; border: 0px; }\
          .d .sortable-list .info-cont-wrap .divider { border: 0px; }\
          .d .sortable-list .battle .info-cont-wrap .desc { border: 0px; }\
      ")
    .appendTo("head");

  $("body").append("<style>.d .profile-wrapper .profile-container.basic-info ul.basic-list li, .d .profile-wrapper .profile-container.personal-info ul li {padding: 2px 0px;border: 0px;}.d .profile-wrapper .user-information-section{ border: 0px;}</style>");
}

//Add total money in bazaar
function showBazaarTotal(){
    /*if($("#totalItems").length == 0) {
        $(".info-msg-cont").prepend("<div id='totalItems'></div>");
    }*/
    var totalItems = 0;
    $("div[class^='rowItems']").each(function() {
        var price = $(this).find("p[class^='price'").html();
        if(price != null){
          price = parseInt(price.replace(/(\$|,)/g, ''));
          var quantity = parseInt($(this).find("span[class^='amountValue'").html().replace(/,/g, ''));
          totalItems += price*quantity;
     	  }
    });

    $(".msg.right-round").append("<div class='border-round'><b>Total Value:</b> <span style='color: #678c00;'>&#36;"+fmtNumber(totalItems)+"</span></div>");
}

if(document.location.href.match(/\/bazaar.php/) ){
    waitForKeyElements(".ReactVirtualized__Grid__innerScrollContainer", showBazaarTotal);
}

//Add total items and worth in display
function showDisplayTotal(){
  var totalItems = 0;
  $("ul.display-cabinet li").each(function() {
   var quantity = ($(this).find(".b-item-amount").html());
    if(quantity != null){
        quantity = parseInt(quantity.replace('x', ''));
        totalItems += quantity;
    }
   
  });

  if($(".delimiter > .msg").length == 0){
     var apiResponse = requestAPI('//api.torn.com/user/?selections=networth&key=', api_key);
    $(".display-main-page").prepend('<div class="info-msg-cont  border-round m-top10 r2996"><div class="info-msg border-round"><i class="info-icon"></i><div class="delimiter"><div class="msg right-round"><div>Total of <b>'+fmtNumber(totalItems)+'</b> items with an estimated value of <span class="t-green"><b>$'+fmtNumber(apiResponse.networth.displaycase)+'</b></span></div></div></div></div></div>');
  }else{
      var apiResponse = requestAPI('//api.torn.com/user/?selections=networth&key=', api_key);
      $(".delimiter > .msg").append('<div>Total of <b>'+fmtNumber(totalItems)+'</b> items with an estimated value of <span class="t-green"><b>$'+fmtNumber(apiResponse.networth.displaycase)+'</b></span></div>');
  }
   
}

if(document.location.href.match(/\/displaycase.php#display\/$/)){
   waitForKeyElements("ul.display-cabinet > li.clear", showDisplayTotal);
}

//Add position counter in companies (Tkx to Pidu)
function unique(array){
    return array.filter(function(el, index, arr) {
        return index === arr.indexOf(el);
    });
}

function createEmployeesRatio(jNode){
    var elementsToParse = $(jNode).find(".rank.t-overflow");
    var jobsArray = new Array();
    $(elementsToParse).each(function(){
      jobsArray.push($(this).html().replace('<span class="t-show bold">Rank:</span> ','').replace(/[^a-zA-Z0-9\s]/g, '') .replace(/^\s+|\s+$/, '').replace(/\s+/g, ''));
    });
    var jobsUniqueArray = unique(jobsArray);
    var finalArray = new Array();
 
    $(jobsUniqueArray).each(function(){
       var positionToAttach = {};
       positionToAttach["position"] = this.toString();
       positionToAttach["count"] = jobsArray.toString().match(new RegExp(this.toString(), 'g')).length;
       finalArray.push(positionToAttach);
    });
 
    $(".employees-wrap").append('<hr class="delimiter-999 m-top10 m-bottom10">');
    var newBox = $('<div class="title-black top-round"><ul class="title"><li style="width: 300px;">Job Title</li><li style="width: 150px; padding-left: 10px; border-left: 2px solid #CCC;">Total ('+jobsArray.length+')</li><li style="width: 150px;padding-left: 10px; border-left: 2px solid #CCC;">Percentage (aprox.)</li><li class="clear"></li></ul></div>');
    $(".employees-wrap").append(newBox);
    $(".employees-wrap").append( '<ul id="table2" class="employees-list cont-gray bottom-round"></ul>' );
    $(finalArray).each(function(i, val){
        var percentage = parseFloat(Math.round((val.count)/(jobsArray.length)*100));
        $("#table2").append( $('<li><ul class="item"><li style="width: 300px; padding-left: 10px;">'+val.position+'</li><li style="width: 150px; padding-left: 10px; border-left: 2px solid #CCC;">'+val.count+'</li><li style="width: 150px; padding-left: 10px; border-left: 2px solid #CCC;">'+percentage+'%</li><div class="clear"></div></ul></li>') );
    });
}

if(positioncounter == '1'){
  if(document.location.href.match(/\/joblist.php\#(\/|!)p=corpinfo/) ){
    waitForKeyElements(".employees-wrap", createEmployeesRatio);
  }
}

//Adds some more statistics to bookies
if(document.location.href.match(/\/bookies.php/) ){
    waitForKeyElements("#your-stats", bookie_statistics);
}

function bookie_statistics(jNode){
    var money_won = 0, money_lost = 0, bets_made = 0, bets_won = 0;
    var removed = 0;
    var nodeInsert, color;
    $(jNode).find("ul.cont-gray > li").each(function(){
        var stat_node = $(this).find("li.stat:first");
        var stat_value_node = $(this).find("li.stat-value:first");
        var stat_value = stat_value_node.text().replace(/[^0-9.]/g, '') * 1;
        var won_perc;

        if(stat_node.text().match(/Bets made/)){
            bets_made = stat_value;
        }

        if(stat_node.text().match(/Bets won/)){
            won_perc = Math.round(10000 * stat_value/bets_made) / 100;
            stat_value_node.append("<span> (" + won_perc + "%)</span>");
        }

        if(stat_node.text().match(/Bets lost/)){
            won_perc = Math.round(10000 * stat_value/bets_made) / 100;
            stat_value_node.append("<span> (" + won_perc + "%)</span>");
        }

        if(stat_node.text().match(/Bets refunded/)){
            won_perc = Math.round(10000 * stat_value/bets_made) / 100;
            stat_value_node.append("<span> (" + won_perc + "%)</span>");
        }

        if(stat_node.text().match(/Total money won/)){
            money_won = stat_value;
        }
        if(stat_node.text().match(/Total money lost/)){
            money_lost = stat_value;
            nodeInsert = stat_node.parent().parent();
        }
        if(stat_node.text() == '' && removed == 0){
            stat_node.parent().parent().remove();
            removed = 1;
        }
    });

    if(money_won - money_lost > 0){
        color = 'green';
    }else color = 'red';

    nodeInsert.append("<li><ul class='item'><li class='stat'>Profit<span class='m-show'>:</span></li><li class='stat-value'><b><font color='" + color + "'>" +
                      formatCurrency(money_won - money_lost) + "</font></b></li><li class='clear'></li></ul></li>");
}


//Adds an audible alert for chains
const a=new AudioContext() // browsers limit the number of concurrent audio contexts, so you better re-use'em
var intervalID;

function beep(vol, freq, duration){
  const v=a.createOscillator();
  const u=a.createGain();
  v.connect(u);
  v.frequency.value=freq;
  v.type="square";
  u.connect(a.destination);
  u.gain.value=vol*0.01;
  v.start(a.currentTime);
  v.stop(a.currentTime+duration*0.001);
}

function convertk(number){
    if(number.indexOf('k') > -1){
        number = parseFloat(number) * 1000;
    }
    return number;
}

function checkChainTimer(){
    if($("#barChain").length){
        const currentChainMax = convertk($("#barChain").find("p[class^='bar-value']").text().split('/')[1]);
        const currentTime = $("#barChain").find("p:last").text();
        if(currentChainMax > 10 && currentTime < chainAlert_time){
            beep(100, 520, 200);
        }
        if(currentTime == '00:00'){
            clearInterval(intervalID);
        }
    }
}

if(chainAlert == '1'){
    intervalID = window.setInterval(function(){ checkChainTimer() }, 10000);
}

// PARA UASR LINK COM SOM
function playSound(url) {
    var a = new Audio(url);
    a.play();
}