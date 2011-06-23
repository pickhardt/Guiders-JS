/**
 * guider.js
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

var guider = (function(){
  var guider = {
    _defaultSettings: {
      attachTo: null,
      buttons: [{name: "Close"}],
      buttonCustomHTML: "",
      description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      overlay: false,
      position: 0, // 1-12 follows an analog clock, 0 means centered
      title: "Sample title goes here",
      width: 400
    },

    _htmlSkeleton: [
"<div class='guider'>",
"  <div class='guider_content'>",
"    <h1 class='guider_title'></h1>",
"    <p class='guider_description'></p>",
"    <div class='guider_buttons'>",
"    </div>",
"  </div>",
"  <div class='guider_arrow'>",
"  </div>",
"</div>"].join(""),

    _arrowSize: 42, // = arrow's width and height
    _guiders: {},
    _currentGuiderID: null,
    _lastCreatedGuiderID: null,

    _addButtons: function(myGuider) {
      // Add buttons
      var guiderButtonsContainer = myGuider.elem.find(".guider_buttons");
      for (var i = myGuider.buttons.length-1; i >= 0; i--) {
        var thisButton = myGuider.buttons[i];
        var thisButtonElem = $("<a></a>", {
                                "class" : "guider_button",
                                "text" : thisButton.name });
        if (typeof thisButton.classString !== "undefined" && thisButton.classString !== null) {
          thisButtonElem.addClass(thisButton.classString);
        }

        guiderButtonsContainer.append(thisButtonElem);

        if (thisButton.onclick) {
          thisButtonElem.bind("click", thisButton.onclick);
        } else if (!thisButton.onclick && thisButton.name.toLowerCase() === "close") {
          thisButtonElem.bind("click", function() { guider.hideAll(); });
        } else if (!thisButton.onclick && thisButton.name.toLowerCase() === "next") {
          thisButtonElem.bind("click", function() { guider.next(); });
        }
      }

      if (myGuider.buttonCustomHTML !== "") {
        var myCustomHTML = $(myGuider.buttonCustomHTML);
        myGuider.elem.find(".guider_buttons").append(myCustomHTML);
      }
    },

    _attach: function(myGuider) {
      if (typeof myGuider.attachTo === "undefined" || myGuider === null) {
        return;
      }

      var myHeight = myGuider.elem.innerHeight();
      var myWidth = myGuider.elem.innerWidth();

      if (myGuider.position === 0) {
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

      var bufferOffset = 0.9 * guider._arrowSize;

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
      }

      offset = offsetMap[myGuider.position];
      top += offset[0];
      left += offset[1];

      myGuider.elem.css({
        "position":"absolute",
        "top": top,
        "left": left
      });
    },

    _guiderById: function(id) {
      if (typeof guider._guiders[id] === "undefined") {
        throw "Cannot find guider with id " + id
      }
      return guider._guiders[id];
    },
    
    _showOverlay: function() {
      $("#guider_overlay").fadeIn("fast")
    },
    
    _hideOverlay: function() {
      $("#guider_overlay").fadeOut("fast");
    },
    
    _initializeOverlay: function() {
      if ($("#guider_overlay").length === 0) {
        $("<div id=\"guider_overlay\"></div>").hide().appendTo("body");
      }
    },
    
    _styleArrow: function(myGuider) {
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
      var arrowOffset = guider._arrowSize / 2;
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
    },

    next: function() {
      var currentGuider = guider._guiders[guider._currentGuiderID];
      if (typeof currentGuider === "undefined") {
        return;
      }
      var nextGuiderId = currentGuider.next || null;
      if (nextGuiderId !== null && nextGuiderId !== "") {
        var myGuider = guider._guiderById(nextGuiderId);
        var omitHidingOverlay = myGuider.overlay ? true : false;
        guider.hideAll(omitHidingOverlay);
        guider.show(nextGuiderId);
      }
    },

    createGuider: function(passedSettings) {
      if (passedSettings === null || passedSettings === undefined) {
        passedSettings = {};
      }

      // Extend those settings with passedSettings
      myGuider = $.extend(true, {}, guider._defaultSettings, passedSettings);
      myGuider.id = myGuider.id || String(Math.floor(Math.random() * 1000));

      var guiderElement = $(guider._htmlSkeleton);
      myGuider.elem = guiderElement;
      myGuider.elem.css("width", myGuider.width + "px");
      guiderElement.find("h1.guider_title").html(myGuider.title);
      guiderElement.find("p.guider_description").html(myGuider.description);

      guider._addButtons(myGuider);

      guiderElement.hide();
      guiderElement.appendTo("body");

      // Ensure myGuider.attachTo is a jQuery element.
      if (typeof myGuider.attachTo !== "undefined" && myGuider !== null) {
        guider._attach(myGuider);
        guider._styleArrow(myGuider);
      }

      guider._initializeOverlay();

      guider._guiders[myGuider.id] = myGuider;
      guider._lastCreatedGuiderID = myGuider.id;
      return guider;
    },

    hideAll: function(omitHidingOverlay) {
      $(".guider").fadeOut("fast");
      if (typeof omitHidingOverlay !== "undefined" && omitHidingOverlay === true) {
        // do nothing for now
      } else {
        guider._hideOverlay();
      }
      return guider;
    },

    show: function(id) {
      if (!id && guider._lastCreatedGuiderID) {
        id = guider._lastCreatedGuiderID;
      }
      
      var myGuider = guider._guiderById(id);
      if (myGuider.overlay) {
        guider._showOverlay();
      }
      guider._attach(myGuider);
      myGuider.elem.fadeIn("fast");
      guider._currentGuiderID = id;
      return guider;
    }
  };

  return guider;
}).call(this);
