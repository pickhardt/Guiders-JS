/**
 * guiders.js
 *
 * version 1.2.8
 *
 * Developed at Optimizely. (www.optimizely.com)
 * We make A/B testing you'll actually use.
 *
 * Released under the Apache License 2.0.
 * www.apache.org/licenses/LICENSE-2.0.html
 *
 * Questions about Guiders?
 * You may email me (Jeff Pickhardt) at jeff+pickhardt@optimizely.com
 *
 * Questions about Optimizely should be sent to:
 * sales@optimizely.com or support@optimizely.com
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
 * - _buttonClass: property allows you to change the default button "classname" for all guider buttons (default: guider_button)
 *
 * @author tychay@php.net Patches for WordPress.com Guided Tour
 * @todo Merge in this https://github.com/jeff-optimizely/Guiders-JS/pull/33 and modify so it so it checks either visibility or DOM
 * @todo: add pulsing jquery.pulse https://github.com/jamespadolsey/jQuery-Plugins/tree/master/pulse/
 * @see https://github.com/tychay/Guiders-JS
 */

var guiders = (function($) {
  var guiders = {};
  
  guiders.version = "1.2.8";

  guiders._defaultSettings = {
    attachTo: null, // Selector of the element to attach to.
    autoAdvance: null, //replace with array of selector, event to bind to cause auto-advance
    autoFocus: false, // Determines whether or not the browser scrolls to the element."
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
    closeOnEscape: false,
    description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    highlight: null,
    isHashable: true,
    offset: {
        top: null,
        left: null
    },
    onClose: null, 
    onHide: null,
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

  guiders._arrowSize = 42; // This is the arrow's width and height.
  guiders._backButtonTitle = "Back";
  guiders._buttonElement = "<a></a>";
  guiders._buttonAttributes = {"href": "javascript:void(0);"};
  guiders._buttonClass = "guider_button"; //make this "button-secondary" for wordpress
  guiders._closeButtonTitle = "Close";
  guiders._currentGuiderID = null;
  guiders._guiderInits = {}; //stores uncreated guiders indexed by id
  guiders._guiders = {}; //stores created guiders indexed by id
  guiders._lastCreatedGuiderID = null;
  guiders._nextButtonTitle = "Next";
  guiders._offsetNameMapping = {
    "topLeft": 11,
    "top": 12,
    "topRight": 1,
    "rightTop": 2,
    "right": 3,
    "rightBottom": 4,
    "bottomRight": 5,
    "bottom": 6,
    "bottomLeft": 7,
    "leftBottom": 8,
    "left": 9,
    "leftTop": 10
  };
  guiders._windowHeight = 0;

  guiders._addButtons = function(myGuider) {
	// Add buttons
    var guiderButtonsContainer = myGuider.elem.find(".guider_buttons");
  
    if (myGuider.buttons === null || myGuider.buttons.length === 0) {
      guiderButtonsContainer.remove();
      return;
    }
  
    for (var i = myGuider.buttons.length - 1; i >= 0; i--) {
      var thisButton = myGuider.buttons[i];
      var thisButtonElem = $(guiders._buttonElement,
        $.extend({"class" : guider._buttonClass, "html" : thisButton.name }, guiders._buttonAttributes, thisButton.html || {})
      );

      if (typeof thisButton.classString !== "undefined" && thisButton.classString !== null) {
        thisButtonElem.addClass(thisButton.classString);
      }
  
      guiderButtonsContainer.append(thisButtonElem);
      
      var thisButtonName = thisButton.name.toLowerCase();
  guiders._buttonClass = "guider_button"; //make this "button-secondary" for wordpress
      if (thisButton.onclick) {
        thisButtonElem.bind("click", thisButton.onclick);
      } else {
        switch (thisButtonName) {
          case guiders._closeButtonTitle.toLowerCase():
            thisButtonElem.bind("click", function () {
              guiders.hideAll();
              if (myGuider.onClose) {
                myGuider.onClose(myGuider, false /* close by button */);
              }
            });
            break;
          case guiders._nextButtonTitle.toLowerCase():
            thisButtonElem.bind("click", function () {
              !myGuider.elem.data('locked') && guiders.next();
            });
            break;
          case guiders._backButtonTitle.toLowerCase():
            thisButtonElem.bind("click", function () {
              !myGuider.elem.data('locked') && guiders.prev();
            });
            break;
        }
      }
    }
  
    if (myGuider.buttonCustomHTML !== "") {
      var myCustomHTML = $(myGuider.buttonCustomHTML);
      myGuider.elem.find(".guider_buttons").append(myCustomHTML);
    }
  
    if (myGuider.buttons.length === 0) {
      guiderButtonsContainer.remove();
    }
  };

  guiders._addXButton = function(myGuider) {
    var xButtonContainer = myGuider.elem.find(".guider_close");
    var xButton = $("<div></div>", {
                    "class" : "x_button",
                    "role" : "button" });
    xButtonContainer.append(xButton);
    xButton.click(function() {
      guiders.hideAll();
      if (myGuider.onClose) {
        myGuider.onClose(myGuider, true);
       }
    });
  };

  guiders._wireEscape = function (myGuider) {
    $(document).keydown(function(event) {
      if (event.keyCode == 27 || event.which == 27) {
        guiders.hideAll();
        if (myGuider.onClose) {
          myGuider.onClose(myGuider, true /*close by X/Escape*/);
        }
        return false;
      }
    });      
  };

  guiders._unWireEscape = function (myGuider) {
    $(document).unbind("keydown");
  };
  
  guiders._attach = function(myGuider) {
    if (typeof myGuider !== 'object') {
      return;
    }
        
    var attachTo = $(myGuider.attachTo);

    var myHeight = myGuider.elem.innerHeight();
    var myWidth = myGuider.elem.innerWidth();

    if (myGuider.position === 0 || attachTo.length === 0) {
      // The guider is positioned in the center of the screen.
      myGuider.elem.css("position", "fixed");
      myGuider.elem.css("top", ($(window).height() - myHeight) / 3 + "px");
      myGuider.elem.css("left", ($(window).width() - myWidth) / 2 + "px");
      return;
    }
    
    // Otherwise, the guider is positioned relative to the attachTo element.
    var base = attachTo.offset();
    var top = base.top;
    var left = base.left;
    
    // topMarginOfBody corrects positioning if body has a top margin set on it.
    var topMarginOfBody = $("body").outerHeight(true) - $("body").outerHeight(false);
    top -= topMarginOfBody;

    // Now, take into account how the guider should be positioned relative to the attachTo element.
    // e.g. top left, bottom center, etc.
    if (guiders._offsetNameMapping[myGuider.position]) {
      // As an alternative to the clock model, you can also use keywords to position the guider.
      myGuider.position = guiders._offsetNameMapping[myGuider.position];
    }
    
    var attachToHeight = attachTo.innerHeight();
    var attachToWidth = attachTo.innerWidth();  
    var bufferOffset = 0.9 * guiders._arrowSize;
    
    // offsetMap follows the form: [height, width]
    var offsetMap = {
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
    var offset = offsetMap[myGuider.position];
    top   += offset[0];
    left  += offset[1];
    
    var positionType = "absolute";
    // If the element you are attaching to is position: fixed, then we will make the guider
    // position: fixed as well.
    if (attachTo.css("position") == "fixed") {
      positionType = "fixed";
      top -= $(window).scrollTop();
      left -= $(window).scrollLeft();
    }
    
    // If you specify an additional offset parameter when you create the guider, it gets added here.
    if (myGuider.offset.top !== null) {
      top += myGuider.offset.top;
    }
    if (myGuider.offset.left !== null) {
      left += myGuider.offset.left;
    }
    
    // Finally, set the style of the guider and return it!
    return myGuider.elem.css({
      "position": positionType,
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
    $(selector).addClass('guider_highlight');
  };

  guiders._dehighlightElement = function(selector) {
    $(selector).removeClass('guider_highlight');
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

  guiders.reposition = function() {
    var currentGuider = guiders._guiders[guiders._currentGuiderID];
    guiders._attach(currentGuider);
  };
  
  guiders.next = function() {
    //var currentGuider = guiders._guiders[guiders._currentGuiderID];
    try {
      var currentGuider = guiders._guiderById(guiders._currentGuiderID); //has check to make sure guider is initialized
    } catch (err) {
      //console.log(err);
      return;
    }
    currentGuider.elem.data('locked', true);
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
      guiders.hideAll(omitHidingOverlay, true);
      if (currentGuider && currentGuider.highlight) {
          guiders._dehighlightElement(currentGuider.highlight);
      }
      guiders.show(nextGuiderId);
    }
  };

  guiders.prev = function () {
    var currentGuider = guiders._guiders[guiders._currentGuiderID];
    if (typeof currentGuider === "undefined") {
      // not what we think it is
      return;
    }
    if (currentGuider.prev === null) {
      // no previous to look at
      return;
    }
  
    var prevGuider = guiders._guiders[currentGuider.prev];
    prevGuider.elem.data('locked', true);
    
    // Note we use prevGuider.id as "prevGuider" is _already_ looking at the previous guider
    var prevGuiderId = prevGuider.id || null;
    if (prevGuiderId !== null && prevGuiderId !== "") {
      var myGuider = guiders._guiderById(prevGuiderId);
      var omitHidingOverlay = myGuider.overlay ? true : false;
      guiders.hideAll(omitHidingOverlay, true);
      if (prevGuider && prevGuider.highlight) {
        guiders._dehighlightElement(prevGuider.highlight);
      }
      guiders.show(prevGuiderId);
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
      guiders._attach(myGuider) && guiders._styleArrow(myGuider);
    }
    
    guiders._initializeOverlay();
    
    guiders._guiders[myGuider.id] = myGuider;
    if (guiders._lastCreatedGuiderID != null) {
      myGuider.prev = guiders._lastCreatedGuiderID;
    }
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

  guiders.hideAll = function(omitHidingOverlay, next) {
    next = next || false;

    $(".guider:visible").each(function(index, elem){
      var myGuider = guiders._guiderById($(elem).attr('id'));
      if (myGuider.onHide) {
        myGuider.onHide(myGuider, next);
      }
    });
    $(".guider").fadeOut("fast");
    var currentGuider = guiders._guiders[guiders._currentGuiderID];
    if (currentGuider && currentGuider.highlight) {
    	guiders._dehighlightElement(currentGuider.highlight);
    }
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
    
    if (myGuider.closeOnEscape) {
      guiders._wireEscape(myGuider);
    } else {
      guiders._unWireEscape(myGuider);
    }
  
    // You can use an onShow function to take some action before the guider is shown.
    if (myGuider.onShow) {
      myGuider.onShow(myGuider);
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

    myGuider.elem.fadeIn("fast").data("locked", false);
      
    guiders._currentGuiderID = id;
    
    var windowHeight = guiders._windowHeight = $(window).height();
    var scrollHeight = $(window).scrollTop();
    var guiderOffset = myGuider.elem.offset();
    var guiderElemHeight = myGuider.elem.height();
    
    var isGuiderBelow = (scrollHeight + windowHeight < guiderOffset.top + guiderElemHeight); /* we will need to scroll down */
    var isGuiderAbove = (guiderOffset.top < scrollHeight); /* we will need to scroll up */
    
    if (myGuider.autoFocus && (isGuiderBelow || isGuiderAbove)) {
      // Sometimes the browser won't scroll if the person just clicked,
      // so let's do this in a setTimeout.
      setTimeout(guiders.scrollToCurrent, 10);
    }
    
    $(myGuider.elem).trigger("guiders.show");

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
  
  guiders.scrollToCurrent = function() {
    var currentGuider = guiders._guiders[guiders._currentGuiderID];
    if (typeof currentGuider === "undefined") {
      return;
    }
    
    var windowHeight = guiders._windowHeight;
    var scrollHeight = $(window).scrollTop();
    var guiderOffset = currentGuider.elem.offset();
    var guiderElemHeight = currentGuider.elem.height();
    
    // Scroll to the guider's position.
    var scrollToHeight = Math.round(Math.max(guiderOffset.top + (guiderElemHeight / 2) - (windowHeight / 2), 0));
    window.scrollTo(0, scrollToHeight);
  };
  
  // Change the bubble position after browser gets resized
  var _resizing = undefined;
  $(window).resize(function() {
    if (typeof(_resizing) !== "undefined") {
      clearTimeout(_resizing); // Prevents seizures
    }
    _resizing = setTimeout(function() {
      _resizing = undefined;
      if (typeof (guiders) !== "undefined") {
        guiders.reposition();
      }
    }, 20);
  });
  
  return guiders;
}).call(this, jQuery);
