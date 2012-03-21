/**
 * guiders.js
 *
 * version 1.2.3
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
 */

var guiders = (function($) {
  var guiders = {};
  
  guiders.version = "1.2.3";

  guiders._defaultSettings = {
    attachTo: null,
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
    onHide: null,
    overlay: false,
    position: 0, // 1-12 follows an analog clock, 0 means centered
    title: "Sample title goes here",
    width: 400,
    xButton: false // this places a closer "x" button in the top right of the guider
  };

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
  guiders._guiders = {};
  guiders._lastCreatedGuiderID = null;
  guiders._nextButtonTitle = "Next";

  guiders._addButtons = function(myGuider) {
    // Add buttons
    var guiderButtonsContainer = myGuider.elem.find(".guider_buttons");
  
    if (myGuider.buttons === null || myGuider.buttons.length === 0) {
      guiderButtonsContainer.remove();
      return;
    }
  
    for (var i = myGuider.buttons.length-1; i >= 0; i--) {
      var thisButton = myGuider.buttons[i];
      var thisButtonElem = $("<a></a>", {
                              "class" : "guider_button",
                              "html" : thisButton.name });
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
    
    var attachTo = $(myGuider.attachTo);
    if (attachTo.length === 0) {
      return;
    }
    var base = attachTo.offset();
    var attachToHeight = attachTo.innerHeight();
    var attachToWidth = attachTo.innerWidth();
    
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

  guiders._guiderById = function(id) {
    if (typeof guiders._guiders[id] === "undefined") {
      throw "Cannot find guider with id " + id;
    }
    return guiders._guiders[id];
  };

  guiders._showOverlay = function() {
    $("#guider_overlay").fadeIn("fast", function(){
      if (this.style.removeAttribute) {
        this.style.removeAttribute("filter");
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
    $("#guider_overlay").fadeOut("fast");
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
    var currentGuider = guiders._guiders[guiders._currentGuiderID];
    if (typeof currentGuider === "undefined") {
      return;
    }
    var nextGuiderId = currentGuider.next || null;
    if (nextGuiderId !== null && nextGuiderId !== "") {
      var myGuider = guiders._guiderById(nextGuiderId);
      var omitHidingOverlay = myGuider.overlay ? true : false;
      guiders.hideAll(omitHidingOverlay, true);
      if (currentGuider && currentGuider.highlight) {
          guiders._dehighlightElement(currentGuider.highlight);
      }
      guiders.show(nextGuiderId);
    }
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

  guiders.show = function(id) {
    if (!id && guiders._lastCreatedGuiderID) {
      id = guiders._lastCreatedGuiderID;
    }
  
    var myGuider = guiders._guiderById(id);
    if (myGuider.overlay) {
      guiders._showOverlay();
      // if guider is attached to an element, make sure it's visible
      if (myGuider.highlight) {
        guiders._highlightElement(myGuider.highlight);
      }
    }
  
    // You can use an onShow function to take some action before the guider is shown.
    if (myGuider.onShow) {
      myGuider.onShow(myGuider);
    }

    guiders._attach(myGuider);
  
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
    return guiders;
  };
  
  return guiders;
}).call(this, jQuery);
