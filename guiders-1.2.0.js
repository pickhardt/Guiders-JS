/**
 * guiders.js
 *
 * version 1.2.0
 *
 * Developed at Optimizely. (www.optimizely.com)
 * We make A/B testing you'll actually use.
 *
 * Released under the Apache License 2.0.
 * www.apache.org/licenses/LICENSE-2.0.html
 *
 * Questions about Guiders or Optimizely?
 * Email us at jeff+pickhardt@optimizely.com or hello@optimizely.com.
 *
 * Enjoy!
 *
 * Changes:
 * 
 * - cookie: guiders property allows you to name a cookie that gets updated every time show() is called. Requires jQuery Cookies plugin (https://github.com/carhartl/jquery-cookie)
 * - failStep: guiders property allows you to name a step to show() if the show() case fails (attachTo element is missing). For obvious reasons, this should not have an attachTo

 * - resume(): start up tour from current place in cookie (if set). This is useful when your tour leaves the page you are on. Unlike show, it will skip steps that need to be skipped.
 * - endTour(): Like hideAll() but it remembers to remove the cookie position.
 * - initGuider(): Allows for initializing Guiders without actually creating them (useful when guider is not in the DOM yet. Avoids error: base is null [Break On This Error] var top = base.top;

 * - autoAdvance: property allows binding to an element (and event) to auto-advance the guider. This is a combination of onShow() binding plus removing of bind when next is done.
 * - shouldSkip: property defines a function handler forces a skip of this step if function returns true.
 * - overlay "error": If not set to true, this defines the class of the overlay. (This is useful for coloring the background of the overlay red on error.
 * - onShow: If this returns a guider object, then it can shunt (skip) the rest of show()
 *
 * @author tychay@php.net Patches for WordPress.com Guided Tour
 * @todo Merge in this https://github.com/jeff-optimizely/Guiders-JS/pull/33 and modify so it so it checks either visibility or DOM
 * @todo: add pulsing jquery.pulse https://github.com/jamespadolsey/jQuery-Plugins/tree/master/pulse/
 * @see https://github.com/tychay/Guiders-JS
 */

var guiders = (function($) {
  var guiders = {};
  
  guiders.version = "1.2.0";

  guiders._defaultSettings = {
    attachTo: null,
    autoAdvance: null, //replace with array of selector, event to bind to cause auto-advance
    bindAdvanceHandler: function(this_obj) { //see guiders.handlers below for other common options
      if (!this_obj.autoAdvance) { return; }
      this_obj._advanceHandler = function() {
        $(this_obj.autoAdvance[0]).unbind(this_obj.autoAdvance[1], this_obj._advanceHandler); //unbind event before next
        switch (this_obj.autoAdvance[1]) {
          case 'hover': //delay hover so the guider has time to get into position (in the case of flyout menus, etc)
            guiders.hideAll(); //hide immediately
            setTimeout(function() { guiders.next(); }, 1000); //1 second delay
            break;
          case 'blur':
            // fall through...
          default:
            guiders.next();
        }
      };
    },
    buttons: [{name: "Close"}],
    buttonCustomHTML: "",
    classString: null,
    description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    highlight: null,
    isHashable: true,
    offset: {
        top: null,
        left: null
    },
    onShow: null,
    overlay: false,
    position: 0, // 1-12 follows an analog clock, 0 means centered
    shouldSkip: null, //function handler that allows you to skip this function if returns true.
    title: "Sample title goes here",
    width: 400,
    xButton: false, // this places a closer "x" button in the top right of the guider
    _advanceHandler: null //action to do on advance. Set by bindAdvanceHandler closure done on show()
  };

  // Begin additional functionality
  guiders.cookie = ""; //set this if you want to write the step to a cookie each show()
  guiders.failStep = "";
  /**
   * Various common utility handlers you can bind as advance handlers to your
   * guider configurations
   */
  guiders.handlers = {
    /**
     * Auto-advance if the element is missing
     */
    advance_if_not_exists: function() {
      return guiders._defaultSettings._bindAdvanceHandler;
    },
    /**
     * Advance if test_function() returns true
     */
    advance_if_test: function(test_function) {
        return function(this_obj) {
        var bind_obj = $(this_obj.autoAdvance[0]);
        this_obj._advanceHandler = function() {
          if (!test_function()) { return; } //don't advance if test_function is false
          bind_obj.unbind(this_obj.autoAdvance[1], this_obj._advanceHandler); //unbind event before next
          guiders.next();
        };
      }
    },
    /**
     * Advance if the form element has content
     */
    advance_if_form_content: function(this_obj) {
      var bind_obj = $(this_obj.autoAdvance[0]);
      this_obj._advanceHandler = function() {
        if ($(this_obj.autoAdvance[0]).val() == '') { return; } //don't advance if you haven't added content
        bind_obj.unbind(this_obj.autoAdvance[1], this_obj._advanceHandler); //unbind event before next
        guiders.next();
      };
    },
    /**
     * Skip if form element has content
     *
     * this context will be inside the actual guider step, not here
     */
    skip_if_form_content: function() { //skip if form element has content
      return ($(this.autoAdvance[0]).val() !== '')
    }
    };
  // end additional functionality

  guiders._htmlSkeleton = [
    "<div class='guider'>",
    "  <div class='guider_content'>",
    "    <h1 class='guider_title'></h1>",
    "    <div class='guider_close'></div>",
    "    <p class='guider_description'></p>",
    "    <div class='guider_buttons'>",
    "    </div>",
    "  </div>",
    "  <div class='guider_arrow'>",
    "  </div>",
    "</div>"
  ].join("");

  guiders._arrowSize = 42; // = arrow's width and height
  guiders._closeButtonTitle = "Close";
  guiders._currentGuiderID = null;
  guiders._guiderInits = {}; //stores uncreated guiders indexed by id
  guiders._guiders = {}; //stores created guiders indexed by id
  guiders._lastCreatedGuiderID = null;
  guiders._nextButtonTitle = "Next";
  guiders._zIndexForHighlight = 101;

  guiders._addButtons = function(myGuider) {
    // Add buttons
    var guiderButtonsContainer = myGuider.elem.find(".guider_buttons");

    if (myGuider.buttons === null || myGuider.buttons.length === 0) {
      guiderButtonsContainer.remove();
      return;
    }

    for (var i = myGuider.buttons.length-1; i >= 0; i--) {
      var thisButton = myGuider.buttons[i];
      // Error in botton class name and href
      var thisButtonElem = $("<a></a>", {
                              "href" : "#",
                              "class" : "guider_button",
                              "text" : thisButton.name });
      if (typeof thisButton.classString !== "undefined" && thisButton.classString !== null) {
        thisButtonElem.addClass(thisButton.classString);
      }

      guiderButtonsContainer.append(thisButtonElem);

      if (thisButton.onclick) {
        thisButtonElem.bind("click", thisButton.onclick);
      } else if (!thisButton.onclick &&
                 thisButton.name.toLowerCase() === guiders._closeButtonTitle.toLowerCase()) { 
        thisButtonElem.bind("click", function() { guiders.hideAll(); });
      } else if (!thisButton.onclick &&
                 thisButton.name.toLowerCase() === guiders._nextButtonTitle.toLowerCase()) { 
        thisButtonElem.bind("click", function() { guiders.next(); });
      }
    }

    if (myGuider.buttonCustomHTML !== "") {
      var myCustomHTML = $(myGuider.buttonCustomHTML);
      myGuider.elem.find(".guider_buttons").append(myCustomHTML);
    }

    if (myGuider.buttons.length == 0) {
      guiderButtonsContainer.remove();
    }
  };

  guiders._addXButton = function(myGuider) {
      var xButtonContainer = myGuider.elem.find(".guider_close");
      var xButton = $("<div></div>", {
                      "class" : "x_button",
                      "role" : "button" });
      xButtonContainer.append(xButton);
      xButton.click(function() { guiders.hideAll(); });
  };

  guiders._attach = function(myGuider) {
    if (myGuider === null) {
      return;
    }

    var myHeight = myGuider.elem.innerHeight();
    var myWidth = myGuider.elem.innerWidth();

    if (myGuider.position === 0 || myGuider.attachTo === null) {
      myGuider.elem.css("position", "absolute");
      myGuider.elem.css("top", ($(window).height() - myHeight) / 3 + $(window).scrollTop() + "px");
      myGuider.elem.css("left", ($(window).width() - myWidth) / 2 + $(window).scrollLeft() + "px");
      return;
    }

    myGuider.attachTo = $(myGuider.attachTo);
    var base = myGuider.attachTo.offset();
    var attachToHeight = myGuider.attachTo.innerHeight();
    var attachToWidth = myGuider.attachTo.innerWidth();

    var top = base.top;
    var left = base.left;

    var bufferOffset = 0.9 * guiders._arrowSize;

    var offsetMap = { // Follows the form: [height, width]
      1: [-bufferOffset - myHeight, attachToWidth - myWidth],
      2: [0, bufferOffset + attachToWidth],
      3: [attachToHeight/2 - myHeight/2, bufferOffset + attachToWidth],
      4: [attachToHeight - myHeight, bufferOffset + attachToWidth],
      5: [bufferOffset + attachToHeight, attachToWidth - myWidth],
      6: [bufferOffset + attachToHeight, attachToWidth/2 - myWidth/2],
      7: [bufferOffset + attachToHeight, 0],
      8: [attachToHeight - myHeight, -myWidth - bufferOffset],
      9: [attachToHeight/2 - myHeight/2, -myWidth - bufferOffset],
      10: [0, -myWidth - bufferOffset],
      11: [-bufferOffset - myHeight, 0],
      12: [-bufferOffset - myHeight, attachToWidth/2 - myWidth/2]
    };

    offset = offsetMap[myGuider.position];
    top   += offset[0];
    left  += offset[1];

    if (myGuider.offset.top !== null) {
      top += myGuider.offset.top;
    }

    if (myGuider.offset.left !== null) {
      left += myGuider.offset.left;
    }

    myGuider.elem.css({
      "position": "absolute",
      "top": top,
      "left": left
    });
  };

  /**
   * Returns the guider by ID.
   *
   * Add check to create and grab guider from inits if it exists there.
   */
  guiders._guiderById = function(id) {
    if (typeof guiders._guiders[id] === "undefined") {
      if (typeof guiders._guiderInits[id] == "undefined") {
          throw "Cannot find guider with id " + id;
      }
      var myGuider = guiders._guiderInits[id];
      // this can happen when resume() hits a snag somewhere
      if (myGuider.attachTo && guiders.failStep && ($(myGuider.attachTo).length == 0)) { 
        throw "Guider attachment not found with id " + myGuider.attachTo;
      }
      guiders.createGuider(myGuider);
      delete guiders._guiderInits[id]; //prevents recursion
      // fall through ...
    }
    return guiders._guiders[id];
  };

  guiders._showOverlay = function(overlayClass) {
    $("#guider_overlay").fadeIn("fast", function(){
      if (this.style.removeAttribute) {
        this.style.removeAttribute("filter");
      }
    }).each( function() {
      if (overlayClass) {
        $(this).addClass(overlayClass);
      }
    });
    // This callback is needed to fix an IE opacity bug.
    // See also:
    // http://www.kevinleary.net/jquery-fadein-fadeout-problems-in-internet-explorer/
  };

  guiders._highlightElement = function(selector) {
    $(selector).css({'z-index': guiders._zIndexForHighlight});
  };

  guiders._dehighlightElement = function(selector) {
    $(selector).css({'z-index': 1});
  };

  guiders._hideOverlay = function() {
    $("#guider_overlay").fadeOut("fast").removeClass();
  };

  guiders._initializeOverlay = function() {
    if ($("#guider_overlay").length === 0) {
      $("<div id=\"guider_overlay\"></div>").hide().appendTo("body");
    }
  };

  guiders._styleArrow = function(myGuider) {
    var position = myGuider.position || 0;
    if (!position) {
      return;
    }
    var myGuiderArrow = $(myGuider.elem.find(".guider_arrow"));
    var newClass = {
      1: "guider_arrow_down",
      2: "guider_arrow_left",
      3: "guider_arrow_left",
      4: "guider_arrow_left",
      5: "guider_arrow_up",
      6: "guider_arrow_up",
      7: "guider_arrow_up",
      8: "guider_arrow_right",
      9: "guider_arrow_right",
      10: "guider_arrow_right",
      11: "guider_arrow_down",
      12: "guider_arrow_down"
    };
    myGuiderArrow.addClass(newClass[position]);

    var myHeight = myGuider.elem.innerHeight();
    var myWidth = myGuider.elem.innerWidth();
    var arrowOffset = guiders._arrowSize / 2;
    var positionMap = {
      1: ["right", arrowOffset],
      2: ["top", arrowOffset],
      3: ["top", myHeight/2 - arrowOffset],
      4: ["bottom", arrowOffset],
      5: ["right", arrowOffset],
      6: ["left", myWidth/2 - arrowOffset],
      7: ["left", arrowOffset],
      8: ["bottom", arrowOffset],
      9: ["top", myHeight/2 - arrowOffset],
      10: ["top", arrowOffset],
      11: ["left", arrowOffset],
      12: ["left", myWidth/2 - arrowOffset]
    };
    var position = positionMap[myGuider.position];
    myGuiderArrow.css(position[0], position[1] + "px");
    // TODO: experiment with pulsing
    //myGuiderArrow.css(position[0], position[1] + "px").stop().pulse({backgroundPosition:["7px 0","0 0"],right:["-35px","-42px"]}, {times: 10, duration: 'slow'});
  };

  /**
   * One way to show a guider to new users is to direct new users to a URL such as
   * http://www.mysite.com/myapp#guider=welcome
   *
   * This can also be used to run guiders on multiple pages, by redirecting from
   * one page to another, with the guider id in the hash tag.
   *
   * Alternatively, if you use a session variable or flash messages after sign up,
   * you can add selectively add JavaScript to the page: "guiders.show('first');"
   */
  guiders._showIfHashed = function(myGuider) {
    var GUIDER_HASH_TAG = "guider=";
    var hashIndex = window.location.hash.indexOf(GUIDER_HASH_TAG);
    if (hashIndex !== -1) {
      var hashGuiderId = window.location.hash.substr(hashIndex + GUIDER_HASH_TAG.length);
      if (myGuider.id.toLowerCase() === hashGuiderId.toLowerCase()) {
        // Success!
        guiders.show(myGuider.id);
      }
    }
  };

  guiders.next = function() {
    //var currentGuider = guiders._guiders[guiders._currentGuiderID];
    try {
      var currentGuider = guiders._guiderById(guiders._currentGuiderID); //has check to make sure guider is initialized
    } catch (err) {
      //console.log(err);
      return;
    }
    //remove current auto-advance handler bound before advancing
    if (currentGuider.autoAdvance) {
      $(currentGuider.autoAdvance[0]).unbind(currentGuider.autoAdvance[1], currentGuider._advanceHandler);
    }
    var nextGuiderId = currentGuider.next || null;
    if (nextGuiderId !== null && nextGuiderId !== "") {
      var myGuider = guiders._guiderById(nextGuiderId);
      // If skip function is bound, check to see if we should advance the guider
      if (myGuider.shouldSkip) {
        if ( myGuider.shouldSkip() ) {
          guiders._currentGuiderID = myGuider.id;
          guiders.next();
          return;
        }
      }
      var omitHidingOverlay = myGuider.overlay ? true : false;
      guiders.hideAll(omitHidingOverlay);
      if (currentGuider.highlight) {
          guiders._dehighlightElement(currentGuider.highlight);
      }
      guiders.show(nextGuiderId);
    }
  };

  /**
   * This stores the guider but does no work on it.
   *
   * The main problem with createGuider() is that it needs _attach() to work. If
   * you try to _attachTo something that doesn't exist yet, the guider will
   * suffer a fatal javscript error and never initialize.
   *
   * A secondary problem is createGuider() code is expensive on the CPU/time.
   * This prevents more than one guider from being created at a time (it defers
   * creation to a user-is-idle time.
   */
  guiders.initGuider = function(passedSettings) {
    if (passedSettings === null || passedSettings === undefined) {
      return;
    }
    if (!passedSettings.id) {
      return;
    }
    this._guiderInits[passedSettings.id] = passedSettings;
  };

  guiders.createGuider = function(passedSettings) {
    if (passedSettings === null || passedSettings === undefined) {
      passedSettings = {};
    }

    // Extend those settings with passedSettings
    myGuider = $.extend({}, guiders._defaultSettings, passedSettings);
    myGuider.id = myGuider.id || String(Math.floor(Math.random() * 1000));

    var guiderElement = $(guiders._htmlSkeleton);
    myGuider.elem = guiderElement;
    if (typeof myGuider.classString !== "undefined" && myGuider.classString !== null) {
      myGuider.elem.addClass(myGuider.classString);
    }
    myGuider.elem.css("width", myGuider.width + "px");

    var guiderTitleContainer = guiderElement.find(".guider_title");
    guiderTitleContainer.html(myGuider.title);

    guiderElement.find(".guider_description").html(myGuider.description);

    guiders._addButtons(myGuider);

    if (myGuider.xButton) {
        guiders._addXButton(myGuider);
    }

    guiderElement.hide();
    guiderElement.appendTo("body");
    guiderElement.attr("id", myGuider.id);

    // Ensure myGuider.attachTo is a jQuery element.
    if (typeof myGuider.attachTo !== "undefined" && myGuider !== null) {
      guiders._attach(myGuider);
      guiders._styleArrow(myGuider);
    }

    guiders._initializeOverlay();

    guiders._guiders[myGuider.id] = myGuider;
    guiders._lastCreatedGuiderID = myGuider.id;

    /**
     * If the URL of the current window is of the form
     * http://www.myurl.com/mypage.html#guider=id
     * then show this guider.
     */
    if (myGuider.isHashable) {
      guiders._showIfHashed(myGuider);
    }

    return guiders;
  };

  guiders.hideAll = function(omitHidingOverlay) {
    $(".guider").fadeOut("fast");
    if (typeof omitHidingOverlay !== "undefined" && omitHidingOverlay === true) {
      // do nothing for now
    } else {
      guiders._hideOverlay();
    }
    return guiders;
  };

  /**
   * Like hideAll() but remembers to delete the cookie if set
   */
  guiders.endTour = function(omitHidingOverlay) {
    if (guiders.cookie) {
      $.cookie(guiders.cookie, null);
    }
    guiders.hideAll(omitHidingOverlay);
  };

  /**
   * Like show() but it will use a cookie if id is not specified and skips
   * steps if necessary
   */
  guiders.resume = function(id) {
    // if cookie specified and no id passed in, resume from cookie
    if (!id && guiders.cookie) {
      id = $.cookie(guiders.cookie);
    }
    //if no id or cookie, don't resume (they can call show themselves)
    if ( !id ) {
      return false;
    }
    try {
      var myGuider = guiders._guiderById(id);
    } catch (err) {
      if ( guiders.failStep ) {
        guiders.show(guiders.failStep);
        return true;
      } else {
        return false;
      }
    }

    //skip if should skip
    if (myGuider.shouldSkip) {
      if ( myGuider.shouldSkip() ) {
        guiders._currentGuiderID = myGuider.id;
        guiders.next();
        return true;
      }
    }
    guiders.show();
    return true;
  };

  guiders.show = function(id) {
    if (!id && guiders._lastCreatedGuiderID) {
      id = guiders._lastCreatedGuiderID;
    }

    try {
      var myGuider = guiders._guiderById(id);
    } catch (err) {
      //console.log(err);
      return;
    }
    if (myGuider.overlay) {
      guiders._showOverlay(myGuider.overlay);
      // if guider is attached to an element, make sure it's visible
      if (myGuider.highlight) {
        guiders._highlightElement(myGuider.highlight);
      }
    }

    guiders._attach(myGuider);

    //If necessary, save the guider id to a cookie
    if (guiders.cookie) {
      $.cookie(guiders.cookie, id);
    }
    //handle binding of auto-advance action
    if (myGuider.autoAdvance) {
      myGuider.bindAdvanceHandler(myGuider);
      $(myGuider.autoAdvance[0]).bind(myGuider.autoAdvance[1], myGuider._advanceHandler);
    }
    // You can use an onShow function to take some action before the guider is shown.
    if (myGuider.onShow) {
	  // if onShow returns something, assume this means you want to bypass the rest of onShow.
      var show_return = myGuider.onShow(myGuider);
	  if (show_return) {
	  	return show_return;
	  }
    }

    myGuider.elem.fadeIn("fast");

    var windowHeight = $(window).height();
    var scrollHeight = $(window).scrollTop();
    var guiderOffset = myGuider.elem.offset();
    var guiderElemHeight = myGuider.elem.height();

    if (guiderOffset.top - scrollHeight < 0 ||
        guiderOffset.top + guiderElemHeight + 40 > scrollHeight + windowHeight) {
      window.scrollTo(0, Math.max(guiderOffset.top + (guiderElemHeight / 2) - (windowHeight / 2), 0));
    }

    guiders._currentGuiderID = id;
    // Create (preload) next guider if it hasn't been created
    var nextGuiderId = guiders.next || null;
    var nextGuiderData;
    if (nextGuiderId !== null && nextGuiderId !== "") {
      if (nextGuiderData = guiders._guiderInits[nextGuiderId]) {
        //don't attach if it doesn't exist in DOM
        var testInDom = $(nextGuiderData.attachTo);
        if ( testInDom.length > 0 ) {
          guiders.createGuider(guiders.nextGuiderData);
          delete nextGuiderData;
        }
      }
    }
    return guiders;
  };

  return guiders;
}).call(this, jQuery);
