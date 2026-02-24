// ==UserScript==
// @name         HoverTip
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  This script provides custom tooltips for any element on a page
// @author       xedx [2100735]
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

// Example usage
/* 1) Tooltips for all <li> in a <ul>, anchored to element, above

    const tips = new HoverTip({
      selector: 'ul#myList > li',
      mode: 'anchor',
      placement: 'top',
      offset: 8,
      follow: true,      // reposition on scroll/resize
      persist: false,
      className: 'hovertip'
    }).install();

    tips.setForEach($('ul#myList > li'), ($li, i) => `Item ${i + 1}`);
*/

/* 2) Follow the mouse, to the right of cursor, no scroll handler needed
    const tipsMouse = new HoverTip({
      selector: '.has-tip',
      mode: 'mouse',
      placement: 'right',
      offset: 12,
      follow: true
    }).install();

    tipsMouse.set($('.has-tip'), 'Hello next to mouse');
*/

/* 3) Persistent tooltip (stays after leaving; hide manually)
    const tipsPersist = new HoverTip({
      selector: '.pin-tip',
      persist: true,
      mode: 'anchor',
      placement: 'bottom'
    }).install();

    // show programmatically if you want:
    tipsPersist.show($('.pin-tip').first());

    // later:
    tipsPersist.hide(true);
*/

/* 4) Override CSS via className + your stylesheet

    Just set className: 'my-hover-tip' and define .my-hover-tip { ... }.
*/

/* 5) Override styles inline (quick one-off)
    const tipsStyled = new HoverTip({
      selector: '.warn',
      inlineStyle: {
        background: '#222',
        color: '#ffd54a',
        border: '1px solid #555'
      }
    }).install();
*/

/* 6) Custom HTML render (instead of plain text)
    const tipsHtml = new HoverTip({
      selector: '.rich',
      render: ($tip, $el, text) => {
        $tip.html(`<strong>Tip:</strong> <span>${escapeHtml(text)}</span>`);
      }
    }).install();

    function escapeHtml(s){
      return String(s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      }[c]));
    }
*/

//
//=========================== HoverTip class ==================================
//

class HoverTip {
  /**
   * @param {Object} opts
   * @param {string} opts.selector - delegated selector for tooltip targets
   * @param {'anchor'|'mouse'} [opts.mode='anchor'] - position by element or cursor
   * @param {'top'|'bottom'|'left'|'right'} [opts.placement='top']
   * @param {number} [opts.offset=8] - gap from anchor/mouse
   * @param {boolean} [opts.follow=true] - keep repositioning while visible
   * @param {boolean} [opts.persist=false] - keep visible after mouseleave until hide() called
   * @param {number} [opts.showDelay=0]
   * @param {number} [opts.hideDelay=150]
   * @param {string} [opts.className='hovertip'] - tooltip div class
   * @param {Object|null} [opts.inlineStyle=null] - applied to tooltip div via .css()
   * @param {function($el): string} [opts.getText] - how to read text from element
   * @param {function($el, text): void} [opts.setText] - how to set text on element
   * @param {function($tip, $el, text): void} [opts.render] - custom render
   * @param {function($el, state): boolean} [opts.shouldShow] - optional conditional gate
   */
  constructor(opts = {}) {
    this.opts = Object.assign({
      selector: '[data-hovertip]',
      mode: 'anchor',
      placement: 'top',
      offset: 8,
      follow: true,
      persist: false,
      showDelay: 0,
      hideDelay: 150,
      className: 'hovertip',
      inlineStyle: null,
      getText: ($el) => $el.attr('data-hovertip') || '',
      setText: ($el, text) => $el.attr('data-hovertip', text),
      render: null,
      shouldShow: null
    }, opts);

    this.$tip = null;
    this.visible = false;
    this.$anchor = null;
    this.lastMouse = { pageX: 0, pageY: 0 };

    this._showTimer = null;
    this._hideTimer = null;

    // bind methods once
    this._onEnter = this._onEnter.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onMove  = this._onMove.bind(this);
    this._onScrollResize = this._onScrollResize.bind(this);
  }

  install(root = document) {
    this.root = root;

    // delegated handlers
    $(root).on('mouseenter', this.opts.selector, this._onEnter);
    $(root).on('mouseleave', this.opts.selector, this._onLeave);

    if (this.opts.follow && this.opts.mode === 'mouse') {
      $(root).on('mousemove', this.opts.selector, this._onMove);
    }

    if (this.opts.follow && this.opts.mode === 'anchor') {
      $(window).on('scroll resize', this._onScrollResize);
    }

    return this;
  }

  destroy() {
    if (!this.root) return;
    $(this.root).off('mouseenter', this.opts.selector, this._onEnter);
    $(this.root).off('mouseleave', this.opts.selector, this._onLeave);
    $(this.root).off('mousemove',  this.opts.selector, this._onMove);
    $(window).off('scroll resize', this._onScrollResize);

    this.hide(true);
    this.root = null;
  }

  set($elements, text) {
    const t = String(text);
    $elements.each((_, el) => this.opts.setText($(el), t));
    return this;
  }

  setForEach($elements, fn) {
    $elements.each((i, el) => this.opts.setText($(el), String(fn($(el), i))));
    return this;
  }

  show($el, mouseEvent = null) {
    this.hide(true); // remove any existing tooltip of this manager

    const text = this.opts.getText($el);
    if (!text) return;

    if (typeof this.opts.shouldShow === 'function') {
      const ok = this.opts.shouldShow($el, { text });
      if (!ok) return;
    }

    this.$anchor = $el;
    if (mouseEvent) this.lastMouse = { pageX: mouseEvent.pageX, pageY: mouseEvent.pageY };

    const $tip = this._ensureTip();

    if (typeof this.opts.render === 'function') {
      this.opts.render($tip, $el, text);
    } else {
      $tip.text(text);
    }

    $tip.removeClass('is-hidden');
    this.visible = true;
    this._position(mouseEvent);

    return this;
  }

  hide(immediate = false) {
    clearTimeout(this._showTimer); this._showTimer = null;
    clearTimeout(this._hideTimer); this._hideTimer = null;

    const doHide = () => {
      if (this.$tip) {
        this.$tip.remove();
        this.$tip = null;
      }
      this.visible = false;
      this.$anchor = null;
    };

    if (immediate || this.opts.hideDelay <= 0) {
      doHide();
    } else {
      this._hideTimer = setTimeout(doHide, this.opts.hideDelay);
    }
    return this;
  }

  setOptions(patch) {
    Object.assign(this.opts, patch || {});
    return this;
  }

  // ---------------- private ----------------

  _ensureTip() {
    if (!this.$tip) {
      this.$tip = $('<div/>', { class: this.opts.className + ' is-hidden' })
        .appendTo(document.body);

      if (this.opts.inlineStyle && typeof this.opts.inlineStyle === 'object') {
        this.$tip.css(this.opts.inlineStyle);
      }
    }
    return this.$tip;
  }

  _onEnter(e) {
    clearTimeout(this._hideTimer); this._hideTimer = null;
    clearTimeout(this._showTimer); this._showTimer = null;

    const $el = $(e.currentTarget);

    if (this.opts.showDelay > 0) {
      this._showTimer = setTimeout(() => this.show($el, e), this.opts.showDelay);
    } else {
      this.show($el, e);
    }
  }

  _onLeave(e) {
    if (this.opts.persist) return; // user will call hide() manually
    const $el = $(e.currentTarget);
    // only hide if leaving the current anchor
    if (this.$anchor && this.$anchor[0] === $el[0]) this.hide(false);
  }

  _onMove(e) {
    this.lastMouse = { pageX: e.pageX, pageY: e.pageY };
    if (!this.visible) return;
    if (!this.opts.follow) return;
    if (this.opts.mode !== 'mouse') return;

    // Only reposition when tip is for this hovered element
    const $el = $(e.currentTarget);
    if (this.$anchor && this.$anchor[0] === $el[0]) this._position(e);
  }

  _onScrollResize() {
    if (!this.visible) return;
    if (!this.opts.follow) return;
    if (this.opts.mode !== 'anchor') return;
    if (!this.$anchor) return;
    this._position(null);
  }

  _position(mouseEvent) {
    const $tip = this.$tip;
    const $el = this.$anchor;
    if (!$tip || !$el) return;

    const placement = this.opts.placement;
    const offset = this.opts.offset;

    // measure tooltip size
    const tipW = $tip.outerWidth();
    const tipH = $tip.outerHeight();

    let x = 0, y = 0;

    if (this.opts.mode === 'mouse') {
      const mx = mouseEvent ? mouseEvent.pageX : this.lastMouse.pageX;
      const my = mouseEvent ? mouseEvent.pageY : this.lastMouse.pageY;

      ({ x, y } = this._placeRect(mx, my, 0, 0, tipW, tipH, placement, offset, true));
    } else {
      const off = $el.offset();
      const elW = $el.outerWidth();
      const elH = $el.outerHeight();

      ({ x, y } = this._placeRect(off.left, off.top, elW, elH, tipW, tipH, placement, offset, false));
    }

    // clamp to viewport
    const scrollLeft = $(window).scrollLeft();
    const scrollTop  = $(window).scrollTop();
    const vw = $(window).width();
    const vh = $(window).height();

    x = Math.max(scrollLeft + 8, Math.min(x, scrollLeft + vw - tipW - 8));
    y = Math.max(scrollTop + 8,  Math.min(y, scrollTop + vh - tipH - 8));

    $tip.css({ left: x, top: y });
  }

  _placeRect(ax, ay, aw, ah, tipW, tipH, placement, offset, isPoint) {
    // ax,ay is top-left of anchor rect; if isPoint, aw/ah are 0 and ax/ay are the point
    let x = ax, y = ay;

    switch (placement) {
      case 'bottom':
        x = isPoint ? ax : (ax + (aw - tipW) / 2);
        y = isPoint ? (ay + offset) : (ay + ah + offset);
        break;
      case 'left':
        x = isPoint ? (ax - tipW - offset) : (ax - tipW - offset);
        y = isPoint ? (ay - tipH / 2) : (ay + (ah - tipH) / 2);
        break;
      case 'right':
        x = isPoint ? (ax + offset) : (ax + aw + offset);
        y = isPoint ? (ay - tipH / 2) : (ay + (ah - tipH) / 2);
        break;
      case 'top':
      default:
        x = isPoint ? ax : (ax + (aw - tipW) / 2);
        y = isPoint ? (ay - tipH - offset) : (ay - tipH - offset);
        break;
    }

    return { x, y };
  }
}


