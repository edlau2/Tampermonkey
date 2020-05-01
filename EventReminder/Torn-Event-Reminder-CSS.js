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
      background-color: black;
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
