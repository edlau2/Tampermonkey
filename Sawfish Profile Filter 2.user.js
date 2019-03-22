// ==UserScript==
// @name         Sawfish Profile Filter 2
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Filters a returned user list (fro madvanced search) based on custom filter criteria
// @author       xedx
// @include      https://www.torn.com/userlist.php*
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function($) {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // Global variables
    //////////////////////////////////////////////////////////////////////

    var api_key = GM_getValue('gm_api_key');

    // Keep track of pending requests/responses
    var totalCompanyRequests = 0;
    var totalProfileRequests = 0;
    var totalProfileResponses = 0;
    var totalCompanyResponses = 0;

    // Error logging and display
    var errorLogged = false;
    var lastError = 0;

    // Configuration
    var allowed_co_prefix = 'allowed_companies';
    var not_allowed_co_prefix = 'not_allowed_companies';
    var main_config = {
        'api_key': GM_getValue('gm_api_key'),
        'max_days': GM_getValue('gm_max_days'),
        'allowed_companies': (JSON.parse (GM_getValue ('gm_' + allowed_co_prefix, null)) || []),
        'not_allowed_companies' : (JSON.parse (GM_getValue ('gm_' + not_allowed_co_prefix, null)) || [])
    };

    // Queue of entries to be removed from the UI
    var indexQueue = [];

    // Variables used by the main MutationObserver
    var targetNode = document.getElementById('mainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var observer = null;

    // Map company type number to company type name. Should be 38 types.
    var company_types = ['', // 0, not used - we won't have to worry about shifting the index into this array.
                         'Hair Salon', // 1
                         'Law Firm', // 2
                         'Flower Shop', // 3
                         'Car Dealership', // 4
                         'Clothing Store', // 5
                         'Gun Shop', // 6
                         'Game Shop', // 7
                         'Candle Shop', // 8
                         'Toy Shop', // 9
                         'Adult Novelties', // 10
                         'Cyber Cafe', // 11
                         'Grocery Store', // 12
                         'Theater', // 13
                         'Sweet Shop', // 14
                         'Cruise Line', // 15
                         'Television Network', // 16
                         '', // 17 (unused)
                         'Zoo', // 18
                         'Firework Stand', // 19
                         'Property Broker', // 20
                         'Furniture Store', // 21
                         'Gas Station', // 22
                         'Music Store', // 23
                         'Nightclub', // 24
                         'Pub', // 25
                         'Gents Strip Club', // 26
                         'Restaurant', // 27
                         'Oil Rig', // 28
                         'Fitness Center', // 29
                         'Mechanic Shop', // 30
                         'Amusement Park', // 31
                         'Lingerie Store', // 32
                         'Meat Warehouse', // 33
                         'Farm', // 34
                         'Software Corporation', // 35
                         'Ladies Strip Club', // 36
                         'Private Security Firm', // 37
                         'Mining Corporation', // 38
                         'Detective Agency']; // 39 (or null terminator)

    // Some default crap to prevent scoping issues
    var defCoType = 'unknown';
    var defDays = '0';

    //////////////////////////////////////////////////////////////////////
    // Kick off the whole shebang. Everything beneath this call is
    // functions required to do the actual processing.
    //
    // 'go()' is at the very bottom of this file.
    //////////////////////////////////////////////////////////////////////

    go();

    //////////////////////////////////////////////////////////////////////
    // Query profile information based on user ID
    // The index is the index of the <li> of the user in the user <ul>
    //////////////////////////////////////////////////////////////////////

    function queryProfileInfo(ID, index) {
        var details = GM_xmlhttpRequest({
            method:"POST",
            url:"https://api.torn.com/user/" + ID + "?selections=profile&key=" + api_key,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                updateUserListCB(response.responseText, index, ID);
            },
            onerror: function(response) {
                handleRequestError(response.responseText, 'profile');
            }
        });
        totalProfileRequests++;
    }

    //////////////////////////////////////////////////////////////////////
    // Query company profile information based on comapny ID
    //////////////////////////////////////////////////////////////////////

    function queryCompanyInfo(co_ID, user_ID, name, index) {
        var details = GM_xmlhttpRequest({
            method:"POST",
            url:"https://api.torn.com/company/" + co_ID + "?selections=profile&key=" + api_key,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                handleCompanyResponseCB(response.responseText, user_ID, name, index);
            },
            onerror: function(response) {
                handleRequestError(response.responseText, 'company');
            }
        });
        totalCompanyRequests++;
    }

    //////////////////////////////////////////////////////////////////////
    // Very simple error handler; only displayed (and logged) once
    //////////////////////////////////////////////////////////////////////

    function handleRequestError(responseText, type) {

        var jsonResp = null;
        if (responseText != "") {
            jsonResp = JSON.parse(responseText);
        } else {
            // Unknown error
            return;
        }

        if (responseText != "") {
            if (!errorLogged || jsonResp.error.code != lastError) {
                var errorText = 'An error has occurred querying ' + type + ' information.\n' +
                    '\nCode: ' + jsonResp.error.code +
                    '\nError: ' + jsonResp.error.error;

                lastError = jsonResp.error.code;
                if (jsonResp.error.code == 5) {
                    errorText += '\n\n The Torn API only allows so many requests per minute. ' +
                        'If this limit is exceeded, this error will occur. It will clear itself' +
                        'up shortly, or you may try refreshing the page.\n';
                }

                errorText += '\nPress OK to continue.';
                alert(errorText);
                console.log(errorText);
                errorLogged = true;
            }
        } else {
            // Unknown error.
        }
    }

    //////////////////////////////////////////////////////////////////////
    // This callback begins the filter process for elements in the UL.
    // For each user, we need to find out their job info if they have
    // a job.
    //////////////////////////////////////////////////////////////////////

    function updateUserListCB(responseText, index, user_ID) {
        //console.log("Response: " + responseText);
        totalProfileResponses++;
        var jsonResp = JSON.parse(responseText);
        var name = jsonResp.name;

        if (jsonResp.error) {
            if (totalProfileRequests == totalProfileResponses &&
                totalCompanyRequests == totalCompanyResponses) {
                processIndexQueue();
            }
            return handleRequestError(responseText);
        }

        // User has no job or not in company - leave them in list.
        if (!jsonResp.job.company_id) {
            console.log("Sawfish: not filtering (no job)" +
                        jsonResp.name + " [" + user_ID + "].");
            if (totalProfileRequests == totalProfileResponses &&
                totalCompanyRequests == totalCompanyResponses) {
                processIndexQueue();
                return;
            }
            return;
        }

        // Filter out Directors
        if (jsonResp.job.position == 'Director') {
            console.log("Sawfish: filtering, Director " +
                        jsonResp.name + " [" + user_ID + "].");
            var reason = 'Director';
            var queueObj = {index, user_ID, name, defDays, defCoType, reason};
            indexQueue.push(queueObj);
            if (totalProfileRequests == totalProfileResponses &&
                totalCompanyRequests == totalCompanyResponses) {
                processIndexQueue();
                return;
            }
            return;
        }

        // Query their company info. We need name, ID and index in the callback.
        queryCompanyInfo(jsonResp.job.company_id, user_ID, jsonResp.name, index);
    }

    //////////////////////////////////////////////////////////////////////
    // This callback handles the response for the company info query.
    //
    // The following filters are applied to the user list. The values here
    // can be edited as desired via th 'config' UI. Refresh the user list page after saving
    // the changes for them to be applied. The filters are applpied in this,
    // but moving them here does not affect the ordering, it is done in the code below.
    //
    // 1. 'allowed_companies'
    //
    //     If in this type of job, keep in user list regardless.
    //     Takes precedence over other filters; no further filtering is done.
    //
    // 2. 'not_allowed_companies'
    //
    //     If working at one of these jobs, remove from list. No further
    //     filtering is done.
    //
    // 3. 'max_days'
    //
    //     If in job for greater than this many days, remove from display.
    //     In other words, contact users who have been in their current job
    //     for less than this many days. This is currently the only filter
    //     that is applied to the user list.
    //
    // Anything else we can think of (TBD)
    // ...
    //
    //////////////////////////////////////////////////////////////////////

    function handleCompanyResponseCB(responseText, user_ID, name, index) {
        totalCompanyResponses++;
        var jsonResp = JSON.parse(responseText);

        if (jsonResp.error) {
            if (totalProfileRequests == totalProfileResponses &&
                totalCompanyRequests == totalCompanyResponses) {
                processIndexQueue();
            }
            return handleRequestError(responseText);
        }

        var employees = jsonResp.company.employees;
        var companyType = jsonResp.company.company_type;
        var filtered = false;
        for (var employee in employees) {
            if (employees[employee].name == name) {
                var days = employees[employee].days_in_company;

                /////////////////////////////////////////////////////////////////////////////
                // Found the employee: apply filters (move these to individual functions)
                /////////////////////////////////////////////////////////////////////////////

                // Always allowed company filter (if in this type of co, keep in list)
                if ((filtered = filterAllowedCompanies(companyType, name, user_ID))) {
                    return; // Don't process more filters
                }

                // Always dis-allowed company filter (if in this type of co, remove from list)
                if ((filtered = filterNotAllowedCompanies(companyType, name, user_ID, days, index))) {
                    return; // Don't process more filters
                }

                // Days in Company filter
                filtered = filterCompanyDays(companyType, name, user_ID, days, index);

                // Filter out directors.
                if (!filtered) {
                    filtered = filterDirectors(companyType, name, user_ID, days, index);
                }

                // Add any other filters here ...
                // ... TBD

                // Doesn't match any filter (or any filter we may add later),
                // leave in the UI. Fall through to see if we can process the indexQueue yet.
                if (!filtered) {
                    console.log("Sawfish: not filtering " +
                                name + " [" + user_ID + "]." +
                                " Days in company: " + days + " days" +
                                " Company type: " + company_types[companyType] + " [" + companyType + "]"
                               );
                }
            }
        }

        if (totalProfileRequests == totalProfileResponses &&
            totalCompanyRequests == totalCompanyResponses) {
            processIndexQueue();
            return;
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Filter functions
    //////////////////////////////////////////////////////////////////////

    function filterAllowedCompanies(companyType, name, user_ID) {
        if (main_config.allowed_companies.includes(companyType)) {
            console.log("Sawfish: Leaving " + name + " [" + user_ID + "] in list: company " + company_types[companyType] +
                        " [" + companyType + "] is allowed.");
            if (totalProfileRequests == totalProfileResponses &&
                totalCompanyRequests == totalCompanyResponses) {
                processIndexQueue();
            }
            return true;
        }
        return false;
    }

    function filterNotAllowedCompanies(companyType, name, user_ID, days, index) {
        if (main_config.not_allowed_companies.includes(companyType)) {
            var reason = "company";
            var queueObj = {index, user_ID, name, days, companyType, reason};
            indexQueue.push(queueObj);
            if (totalProfileRequests == totalProfileResponses &&
                totalCompanyRequests == totalCompanyResponses) {
                processIndexQueue();
            }
            return true;
        }
        return false;
    }

    function filterCompanyDays(companyType, name, user_ID, days, index) {
        if (days > main_config.max_days) {
            var reason = "days";
            var queueObj = {index, user_ID, name, days, companyType, reason};
            indexQueue.push(queueObj);
            return true;
        }
        return false;
    }

    function filterDirectors(companyType, name, user_ID, days, index) {

        // TBD....
        return false;
    }

    //////////////////////////////////////////////////////////////////////////
    // This actually updates the UI, by removing entries in the indexQueue
    //////////////////////////////////////////////////////////////////////////

    function processIndexQueue() {
        if (!indexQueue.length) {
            return;
        }

        var elemList = document.getElementsByClassName('user-info-list-wrap bottom-round cont-gray');
        var ul = elemList[0];
        for (var i = ul.childElementCount; i > 0; i--) {
            var node = ul.children[i-1];
            var ID = node.childNodes[1].children[2].search.split("=")[1];
            var qIndex = 0;
            if ((qIndex = queueContainsId(ID)) > -1) {
                var name = indexQueue[qIndex].name;
                var days = indexQueue[qIndex].days;
                var type = indexQueue[qIndex].companyType;
                var reason = indexQueue[qIndex].reason;
                console.log("Sawfish: removing " +
                            name + " [" + ID + "] from list." +
                            " Days in company: " + days + " days" +
                            " Company type: " + company_types[type] + " [" + type + "]" +
                            " Reason: " + reason
                           );
                ul.removeChild(node);
            }
        }

        // Re-connect our observer, in preparation for going to another page.
        indexQueue = [];
        totalProfileRequests = totalProfileResponses = 0;
        totalCompanyRequests = totalCompanyResponses = 0;
        observer.observe(targetNode, config);

        console.log("Sawfish Profile Filter: done updating, reconnecting observer.");
    }

    // See if ID is in the indexQueue
    function queueContainsId(ID) {
        for (var i = 0; i < indexQueue.length; i++) {
            if (indexQueue[i].user_ID == ID) {
                return i;
            }
        }

        return -1;
    }

    //////////////////////////////////////////////////////////////////////
    // This prepares to update the UI by locating level, user ID
    // and the index of the <li> in the <ul>.
    //////////////////////////////////////////////////////////////////////

    function updateUserList() {
        // Get the <UL>
        var elemList = document.getElementsByClassName('user-info-list-wrap bottom-round cont-gray');
        var ul = elemList[0];
        if (ul == 'undefined') {
            return;
        }

        // Iterate each <LI>
        var items = ul.getElementsByTagName("li");
        if (items == 'undefined') {
            return;
        }

        // We seem to be called twice, the first call always has a length of 1.
        // It seems we can ignore this call.
        //console.log("<LI> Items detected: " + items.length);
        if (items.length == 1) {
            return;
        }

        var pendingReqQueue = [];
        for (var i = 0; i < items.length; ++i) {
            // Get user ID, to look up rank
            var li = items[i];
            var userNames = li.getElementsByClassName('user name');
            if (userNames == 'undefined' || userNames[0] == 'undefined' ||
                typeof userNames === 'undefined' || typeof userNames[0] === 'undefined') {
                continue;
            }

            var href = userNames[0].getAttribute("href");
            if (href == 'undefined') {
                return;
            }

            // Get user ID from href, and company ID from user ID
            var parts = href.split("=");
            var ID = parts[1];

            // At this point, 'i' is the index into the <ul> 'array'.
            // We'll need to get company info from the ID, async, so
            // the callback will have to repeat the above but can
            // just index into the <ul> array, no need for the loop
            // anymore.
            var queueObj = [ID, i];
            pendingReqQueue.push(queueObj);

        } // End 'for' loop

        // Now we have all requests in a local queue, submit them all.
        console.log("Sawfish Profile Filter: " + pendingReqQueue.length + " requests queued." );
        pendingReqQueue.forEach(function(element) {
            queryProfileInfo(element[0], element[1]);
        });

        // We're done iterating. We can disconnect the observer now, since
        // we don't want to be called while updating the <li>'s.
        // We are expecting 'totalQueries' responses.
        observer.disconnect();
    }

    //////////////////////////////////////////////////////////////////////
    // Insert a 'configuration' bar on the page, beneath the paginator bar
    //////////////////////////////////////////////////////////////////////

    // Helper to do the actual insertion
    function insertAfter(el, referenceNode) {
        referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
    }

    // Create and insert the bar itself
    function insertConfigurationBar() {
        var aboveDivs = document.getElementsByClassName('pagination-wrap');
        var newDiv = document.createElement('div');
        newDiv.id = 'config-buttons-div';

        var btn = createButton(newDiv, 'Configure');
        btn.addEventListener('click',function () {
            configHandler();
        });

        btn = createButton(newDiv, 'Send Messages');
        btn.addEventListener('click',function () {
            messageHandler();
        });

        insertAfter(newDiv, aboveDivs[0]);
    }

    // Handler for the 'Config' button, create the configuration dialog.
    function configHandler() {
        createConfigDiv();
    }

    // Handler for the 'Message' button, send a message to those remaining
    // in the filterd list. ...TBD...
    function messageHandler() {
        alert("Not Yet Implemented");
    }

    /////////////////////////////////////////////////////////////
    // Handlers and helpers for the config screen
    /////////////////////////////////////////////////////////////

    // Determine if a value is a number or not.
    function isaNumber(x)
    {
        var regex=/^[0-9]+$/;
        if (x.match(regex)) {
            return true;
        }
        return false;
    }

    // Handler for the 'Cancel' button
    function cancelConfig() {
        var header = document.getElementById('header_div');
        var element = document.getElementById('config-div');
        header.parentNode.removeChild(header);
        element.parentNode.removeChild(element);
    }

    // Handler for the 'Save' button
    function saveConfig() {
        var apikeyInput = document.getElementById('apikey');
        var maxdays = document.getElementById('maxdays');

        if (!isaNumber(maxdays.value)) {
            alert('Max Days filter must be numeric');
            maxdays.style.border="1px solid red";
            return;
        }
        maxdays.style.border="1px solid black";

        GM_setValue('gm_api_key', apikeyInput.value);
        GM_setValue('gm_max_days', maxdays.value);

        main_config.api_key = GM_getValue('gm_api_key');
        main_config.max_days = GM_getValue('gm_max_days');

        enumerateCheckboxes(allowed_co_prefix);
        enumerateCheckboxes(not_allowed_co_prefix);

        cancelConfig();
    }

    // Iterate a checkbox div, building a list of selected elements
    // Prefix is either 'allowed_companies' or 'not_allowed_companies'
    function enumerateCheckboxes(prefix) {
        var selected = [];
        var id = prefix + 'chkboxContDiv'
        var chkDiv = document.getElementById(id);
        var checkboxes = chkDiv.getElementsByClassName('xedx-chkbox');
        console.log('Sawfish: Selected items for the ' + prefix + ' list:');
        for (var i = 0; i < checkboxes.length; i++) {
            var index = i + 1;
            if (checkboxes[i].checked) {
                console.log('Sawfish: ' + company_types[index] + ' [' + index + '] selected.');
                selected.push(index);
            } else {
                console.log('Sawfish: ' + company_types[i+1] + ' [' + index + '] NOT selected.');
            }
        }

        GM_setValue ('gm_' + prefix, JSON.stringify(selected));

        if (prefix == allowed_co_prefix) {
            main_config.allowed_companies = (JSON.parse (GM_getValue ('gm_' + allowed_co_prefix, null)) || {});
        } else if (prefix == not_allowed_co_prefix) {
            main_config.not_allowed_companies = (JSON.parse (GM_getValue ('gm_' + not_allowed_co_prefix, null)) || {});
        }
    }

    /////////////////////////////////////////////////////////////////////////
    // A bunch of code to build the simple configuration dialog.
    // Should be an easier/better way to do this, rather than doing
    // it long hand.
    /////////////////////////////////////////////////////////////////////////

    // Create the list of checkboxes/lebels, scrolling, for the allowed/disallowed companies lists.
    function createCompanyCheckboxList(prefix) {
        var chkboxContDiv = document.createElement('div');
        chkboxContDiv.id = prefix + 'chkboxContDiv';
        chkboxContDiv.className = 'cont-gray bottom-round';
        chkboxContDiv.setAttribute('style', 'width: 200px; height: 179px; overflow: auto; border: 1px solid black; display: inline-block');

        var chkList = [];
        if (prefix == allowed_co_prefix) {
            chkList = JSON.parse(GM_getValue ('gm_' + allowed_co_prefix, null)) || [];
        } else if (prefix == not_allowed_co_prefix) {
            chkList = JSON.parse(GM_getValue ('gm_' + not_allowed_co_prefix, null)) || [];
        }

        // Dynamically create all the checkboxes and their labels.
        var counter = 0;
        for (var obj in company_types) {
            if (counter == 0) {
                counter++;
                continue;
            }

            if (company_types.hasOwnProperty(obj)) {
                // These two divs hold the text (left div) and checkboxes (right div)
                // to help align correctly.
                var txtDiv = document.createElement('div');
                txtDiv.id = prefix + '_txtdiv';
                txtDiv.setAttribute('style', 'width: 150px; height: 14px; float: left; line-height: 14px;');

                var chkDiv = document.createElement('div');
                chkDiv.id = prefix + '_chkdiv';
                chkDiv.setAttribute('style', 'width: 20px; height: 14px; float: right; line-height: 14px;');

                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'xedx-chkbox';
                checkbox.setAttribute('style', 'margin-left:auto; margin-right:20px;');

                var text = company_types[counter];
                if (text === '') text = '(unused)';

                // Again, for alignment: store the label in a read-only
                // input field so it behaves just like a checkbox field.
                var textNode = document.createElement('input');
                textNode.setAttribute('readonly', true);
                textNode.value = text;

                if (chkList != 'undefined' && typeof chkList != 'undefined' && chkList != null) {
                    if (chkList.includes(counter)) {
                        checkbox.checked = true;
                    }
                }

                txtDiv.appendChild(textNode);
                txtDiv.appendChild(document.createElement('br'));

                chkDiv.appendChild(checkbox);
                chkDiv.appendChild(document.createElement('br'));

                var masterDiv = document.createElement('div');
                masterDiv.className = 'xedx-master-div';
                masterDiv.appendChild(txtDiv);
                masterDiv.appendChild(chkDiv);
                chkboxContDiv.appendChild(masterDiv);
            }
            counter++;
        }
        return chkboxContDiv;
    }

    // Create the configuration dialog header (the title bar)
    function createHeaderDiv() {
        var headerDiv = document.createElement('div');
        headerDiv.id = 'header_div';
        headerDiv.className = 'title main-title title-black active top-round';
        headerDiv.setAttribute('role', 'heading');
        headerDiv.setAttribute('aria-level', '5');
        headerDiv.appendChild(document.createTextNode('Configuration Options'));

        return headerDiv;
    }

    // Create the API key input
    function createApiKeyInput(configDiv) {
        var apikeyInput = document.createElement('input');
        apikeyInput.type = 'text';
        apikeyInput.id = 'apikey';
        apikeyInput.style.border="1px solid black"; // Add a GM_addStyle for this
        configDiv.appendChild(document.createElement('br'));
        apikeyInput.value = GM_getValue('gm_api_key');
        configDiv.appendChild(document.createTextNode('API Key: '));
        configDiv.appendChild(apikeyInput);
        configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createElement('br'));
    }

    // Create the 'max days in job' input
    function createDaysInJobInput(configDiv) {
        configDiv.appendChild(document.createTextNode('Days in job: ' +
                                                      'If the user has been in their job for more than ' +
                                                      'this number of days, they will be removed from the list.'));
        configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createElement('br'));

        var maxDays = document.createElement('input');
        maxDays.type = 'text';
        maxDays.id = 'maxdays';
        maxDays.style.border="1px solid black";
        maxDays.value = GM_getValue('gm_max_days');
        if (maxDays.value == 'undefined') {
            maxDays.value = 5000;
            GM_setValue('gm_max_days', 5000);
        }
        configDiv.appendChild(document.createTextNode('Days in job filter: '));
        configDiv.appendChild(maxDays);
        configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createElement('br'));
    }

    // Create the list of checkboxes for always allowed jobs
    function createAllowedJobsList(configDiv) {
        configDiv.appendChild(document.createTextNode('Allowed job list: ' +
                                                      'If the user has a job in one of these companies, ' +
                                                      'they will remain in the list.'));
        configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createElement('br'));
        var companies = createCompanyCheckboxList(allowed_co_prefix);
        configDiv.appendChild(companies);
        configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createElement('br'));
    }

    // Same as above, but for not allowed jobs
    function createNotAllowedJobList(configDiv) {
        configDiv.appendChild(document.createTextNode('Not allowed job list: ' +
                                                      'If the user has a job in one of these companies, ' +
                                                      'they will be removed from the list.'));
        configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createElement('br'));
        var companies = createCompanyCheckboxList(not_allowed_co_prefix);
        configDiv.appendChild(companies);
        configDiv.appendChild(document.createElement('br'));
        configDiv.appendChild(document.createElement('br'));
    }

    // Create a generic button
    function createButton(configDiv, label) {

        var btn = document.createElement('button');
        btn.style.margin = "0px 10px 10px 0px";
        var t1 = document.createTextNode(label);
        btn.appendChild(t1);
        configDiv.appendChild(btn);
        return btn;
    }

    //////////////////////////////////////////////////////////////////
    // Create the configuration dialog main body, and populate it.
    //////////////////////////////////////////////////////////////////

    function createConfigDiv() {
        if (document.getElementById('config-div')) return;

        // Main container
        var configDiv = document.createElement('div');
        configDiv.id = 'config-div';
        configDiv.className = 'cont-gray bottom-round';
        configDiv.setAttribute('style', 'text-align: center');

        // Other elements: header and body content.
        // API Key, and filters: days in job, allowed jobs, disallowed jobs.
        var headerDiv = createHeaderDiv();
        createApiKeyInput(configDiv);
        createDaysInJobInput(configDiv);
        createAllowedJobsList(configDiv);
        createNotAllowedJobList(configDiv);

        var btn = createButton(configDiv, 'Cancel');
        btn.addEventListener('click',function () {
            cancelConfig();
        });

        btn = createButton(configDiv, 'Save');
        btn.addEventListener('click',function () {
            saveConfig();
        });

        // Find and append to our extendedDiv
        var parentDiv = document.getElementById('config-buttons-div');
        parentDiv.appendChild(headerDiv);
        parentDiv.appendChild(configDiv);
    }

    //////////////////////////////////////////////////////////////////////
    // Main (erm, 'go()'). Using a MutationObserver allows us to be notified
    // whenever the root of the 'User List' section (the
    // <div id="mainContainer"> section) changes/updates. Note
    // that this is likely triggered at the addition of each <li>,
    // and we'll need to keep track of what has already been edited.
    //////////////////////////////////////////////////////////////////////

    function go() {
        console.log("'Sawfish Profile Filter 2' script started!");

        // Make sure we have an API key
        if (api_key == null || api_key == 'undefined' || typeof api_key == 'undefined' || api_key == '') {
            api_key = prompt("Please enter your API key.\n" +
                             "Your key will be saved locally so you won't have to be asked again.\n" +
                             "Your key is kept private and not shared with anyone.", "");
            GM_setValue('gm_api_key', api_key);
        }

        // Add a new UI element to configure and send a message
        insertConfigurationBar();

        // Set up an observer to modify the found user's list.
        var callback = function(mutationsList, observer) {
            updateUserList();
        };
        observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

})();