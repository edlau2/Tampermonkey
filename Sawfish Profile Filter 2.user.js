// ==UserScript==
// @name         Sawfish Profile Filter 2
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Filters a returned user list (fro madvanced search) based on custom filter criteria
// @author       xedx
// @include      https://www.torn.com/userlist.php*
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function($) {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // Query profile information based on user ID
    // The index is the index of the <li> of the user in the user <ul>
    //////////////////////////////////////////////////////////////////////

    var totalProfileRequests = 0;
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
                handleRequestError(response.responseText);
            }
        });
        totalProfileRequests++;
    }

    //////////////////////////////////////////////////////////////////////
    // Query company profile information based on comapny ID
    //////////////////////////////////////////////////////////////////////

    var totalCompanyRequests = 0;
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
                handleRequestError(response.responseText);
            }
        });
        totalCompanyRequests++;
    }

    //////////////////////////////////////////////////////////////////////
    // Very simple error handler; only displayed (and logged) once
    //////////////////////////////////////////////////////////////////////

    var errorLogged = false;
    var lastError = 0;
    function handleRequestError(responseText) {

        var jsonResp = null;
        if (responseText != "") {
            jsonResp = JSON.parse(responseText);
        } else {
            // Unknown error
            return;
        }

        if (responseText != "") {
            if (!errorLogged || jsonResp.error.code != lastError) {
                var errorText = 'An error has occurred querying rank information.\n' +
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

    var totalProfileResponses = 0;
    function updateUserListCB(responseText, index, user_ID) {
        //console.log("Response: " + responseText);
        totalProfileResponses++;
        var jsonResp = JSON.parse(responseText);

        if (jsonResp.error) {
            if (totalProfileRequests == totalProfileResponses &&
                totalCompanyRequests == totalCompanyResponses) {
                processIndexQueue();
            }
            return handleRequestError(responseText);
        }

        // User has no job or not in company - leave them in list.
        if (!jsonResp.job.company_id) {
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
    // This callback handles the response for the comapny info query.
    //
    // The following filters are applied to the user list. The values here
    // can be edited as desired. Refresh the user list page after saving
    // the changes for them to be applied. The filters are applpied in this,
    // but moving them here does not affect the ordering, it is done in the code below.
    //
    // Job IDs, which are the numbers in the 'allowed_job_ids' and
    // 'not_allowed_job_ids' lists are mapped in the "company_types" array, below.
    // Use that array to determine the number (type) for a given name, to put
    // into the following lists.
    //
    // If in this type of job, keep in user list regardless.
    // Takes precedence over other filters; no further filtering is done.
    //
    var allowed_job_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15];
    //
    // If working at one of these jobs, remove from list. No further
    // filtering is done.
    //
    var not_allowed_job_ids = [16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
    //
    // If in job for greater than this many days, remove from display.
    // In other words, contact users who have been in their current job
    // for less than this many days. This is currently the only filter
    // that is applied to the user list.
    //
    var days_in_job_filter = 5;
    //
    // Anything else we can think of (TBD)
    // ...
    //
    //////////////////////////////////////////////////////////////////////

    var indexQueue = [];
    var totalCompanyResponses = 0;
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
        for (var employee in employees) {
            if (employees[employee].name == name) {
                var days = employees[employee].days_in_company;

                ////////////////////////////////////
                // Found the employee: apply filters
                ////////////////////////////////////

                // Always allowed company filter (if in this type of co, keep in list)
                if (not_allowed_job_ids.includes(companyType)) {
                    console.log("Sawfish: Leaving " + name + " [" + user_ID + "] in list: company " + company_types[companyType] +
                                " [" + companyType + "] is allowed.");
                    if (totalProfileRequests == totalProfileResponses &&
                        totalCompanyRequests == totalCompanyResponses) {
                        processIndexQueue();
                    }
                return; // Don't process more filters
                }

                // Always dis-allowed company filter (if in this type of co, remove from list)
                if (allowed_job_ids.includes(companyType)) {
                    var reason = "company";
                    var queueObj = {index, user_ID, name, days, companyType, reason};
                    indexQueue.push(queueObj);
                    if (totalProfileRequests == totalProfileResponses &&
                        totalCompanyRequests == totalCompanyResponses) {
                        processIndexQueue();
                    }
                    return; // Don't process more filters
                }

                // Days in Company filter
                if (days > days_in_job_filter) {
                    reason = "days";
                    queueObj = {index, user_ID, name, days, companyType, reason};
                    indexQueue.push(queueObj);
                    if (totalProfileRequests == totalProfileResponses &&
                        totalCompanyRequests == totalCompanyResponses) {
                        processIndexQueue();
                        return;
                    }
                }
                // Add any other filters here ...
                // ... TBD

                // Doesn't match the days_in_job_filter filter (or any filter we may add later),
                // leave in the UI. Fall through to see if we can process the indexQueue yet.
            }
        }

        if (totalProfileRequests == totalProfileResponses &&
            totalCompanyRequests == totalCompanyResponses) {
            processIndexQueue();
            return;
        }
    }

    //////////////////////////////////////////////////////////////////////
    // This actually updates the UI
    //////////////////////////////////////////////////////////////////////

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
    // Map company type number to company type name. Should be 38 types.
    //////////////////////////////////////////////////////////////////////

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

    //////////////////////////////////////////////////////////////////////
    // Insert a 'configuration' bar on the page, beneath the paginator bar
    //////////////////////////////////////////////////////////////////////

    // Helper to do the actual insertion
    function insertAfter(el, referenceNode) {
        referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
    }

    function insertConfigurationBar() {
        var aboveDivs = document.getElementsByClassName('pagination-wrap');
        var newDiv = document.createElement('div');

        var btn1 = document.createElement('button');
        btn1.style.margin = "10px 10px 10px 0px";
        var t1 = document.createTextNode('Configure');
        btn1.appendChild(t1);
        newDiv.appendChild(btn1);
        btn1.addEventListener('click',function () {
            configHandler();
        });

        var btn2 = document.createElement('button');
        btn1.style.margin = "10px 10px 10px 0px";
        var t2 = document.createTextNode('Send Messages');
        btn2.appendChild(t2);
        newDiv.appendChild(btn2);
        btn2.addEventListener('click',function () {
            messageHandler();
        });

        insertAfter(newDiv, aboveDivs[0]);
    }

    // Handlers for above buttons, TBD
    function configHandler() {
        alert("Not Yet Implemented");
    }

    function messageHandler() {
        alert("Not Yet Implemented");
    }

    //////////////////////////////////////////////////////////////////////
    // Main. Using a MutationObserver allows us to be notified
    // whenever the root of the 'User List' section (the
    // <div id="mainContainer"> section) changes/updates. Note
    // that this is likely triggered at the addition of each <li>,
    // and we'll need to keep track of what has already been edited.
    //////////////////////////////////////////////////////////////////////

    console.log("Sawfish Profile Filter 2 script started!");

    // Make sure we have an API key
    var api_key = GM_getValue('gm_api_key');
    if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
        api_key = prompt("Please enter your API key.\n" +
                         "Your key will be saved locally so you won't have to be asked again.\n" +
                         "Your key is kept private and not shared with anyone.", "");
        GM_setValue('gm_api_key', api_key);
    }

    // Add a new UI element to configure and send a message
    insertConfigurationBar();

    // Set up an observer to modify the found user's list.
    var targetNode = document.getElementById('mainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        updateUserList();
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

})();