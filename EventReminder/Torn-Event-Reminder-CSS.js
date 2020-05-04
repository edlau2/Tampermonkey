// Used for clock
const eventTextStyle = '.event_text_style {' +
		'padding: 0 20px;' +
        'display: flex;' +
        'justify-content: center;' +
        'align-items: center;' +
        /* 'width: 100%;' + // Screws things up royally */
        /* 'font-size: 12pt;' + // This makes much larger... */
        'font-weight: bold;' +
	'}';

const eventBtnStyle = '.event-btn-style {' +
      'border-width: 3px;' +
      'border-style: inset;' +
      'border-color: gray;' +
      'border-radius: 5px;' +
      '}';

const eventBoxStyle = '.event_box_style{' +
        'float: left;' +
        'font-weight: 600;' +
        'line-height: 30px;' +
        'overflow: hidden;' +
        'max-height: 30px;' +
        'box-sizing: border-box;' +
	'}';
	
GM_addStyle(eventTextStyle);
GM_addStyle(eventBoxStyle);
GM_addStyle(eventBtnStyle);
	
// used for the 'info' hover-over/tool tip
const modal = '.modal {' +
  'display: none;' + /* Hidden by default */
  //'position: fixed;' + /* Stay in place */
  'float: left;' +
  'position: absolute;' +
  'margin-left: 580px;' +
  'margin-top: 100px;' +
  //'left: 100%;' +
  //'top: 100%;' +
  'transform: translate(-50%, -50%);' +
  'z-index: 1;' + /* Sit on top */
  'left: 0;' +
  'top: 0;' +
  //'width: 100%;' + /* Full width */
  //'height: 100%;' + /* Full height */
  'width: 300px;' + /* Full width */
  'height: 150px;' + /* Full height */
  'line-height: 150px;' +
  'overflow: auto;' + /* Enable scroll if needed */
  'background-color: rgb(0,0,0);' + /* Fallback color */
  'background-color: rgba(0,0,0,0.4);' + /* Black w/ opacity */
'}';
GM_addStyle(modal);

const modal_text = '.modal-text {' +
    'display: inline-block;' +
    'vertical-align: middle;' +
    'line-height: normal;' +
    'color: black;' +
    //'overflow: auto;' +
    'overflow-wrap: normal;' +
    //'line-height: 150px;' +
    'text-align: center;' +
  '}';
GM_addStyle(modal_text);

/* Modal Content/Box */
const modal_content = '.modal-content {' +
  'text-align: center;' +
  'background-color: #fefefe;' +
  //'margin: 15% auto;' + /* 15% from the top and centered */
  //'padding: 20px;' +
  'border: 1px solid #888;' +
  //'width: 80%;' + /* Could be more or less, depending on screen size */
'}';
GM_addStyle(modal_content);

// Used for the 'Add New Event' dialog
const addEventStyle = '.event-style {' +
      'display:none;' +
      'border: solid black 2px;' +
      'border-radius: 0px;' +
      'background-color: #000000;' +
      'filter: alpha(opacity=80);' +
      'opacity: 0.80;' +
      'font-weight: bold;' +
      'font-size: 12px;' +
      'color: #fff;' +
      '}';
GM_addStyle(addEventStyle);

const addEventCenter = '.event-center {' +
	  //'display: none;' +
	  'text-align: center;' +
  '}';
GM_addStyle(addEventCenter);

const addEventLeft = '.event-center {' +
	  //'display: none;' +
	  'text-align: left;' +
  '}';
GM_addStyle(addEventLeft);

// Used for the select box
const customSelect =
  `.custom-select {
      position: relative;
      font-family: Arial;
      margin-top: 7px;
      background-color: black;
    }

    .custom-select select {
      display: none; /*hide original SELECT element: */
    }

    .select-selected {
      background-color: white;
      /* following over-ridden by .select-items */
      color: #aaa;
    }

    /* Style the arrow inside the select element: */
    .select-selected:after {
      position: absolute;
      content: "";
      top: 14px;
      right: 10px;
      width: 0;
      height: 0;
      border: 6px solid transparent;
      border-color: #fff transparent transparent transparent;
    }

    /* Point the arrow upwards when the select box is open (active): */
    .select-selected.select-arrow-active:after {
      border-color: transparent transparent #fff transparent;
      top: 7px;
    }

    /* style the items (options), including the selected item: */
    /* Changes text... and other stuff... */
    .select-items div,.select-selected {
      /*color: #888;*/
      color: #646464;
      font-size: 11px;
      font-weight: bold;
      padding: 8px 16px;
      border: 1px solid transparent;
      border-color: transparent transparent rgba(0, 0, 0, 0.1) transparent;
      cursor: pointer;
    }

    /* Style items (options): */
    .select-items {
      position: absolute;
      background-color: DodgerBlue;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 99;
    }

    /* Hide the items when the select box is closed: */
    .select-hide {
      display: none;
    }

    .select-items div:hover, .same-as-selected {
      background-color: rgba(0, 0, 0, 0.1);
    }`;
    

    GM_addStyle(customSelect);
