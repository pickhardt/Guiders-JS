/*
   jQuery Mask Plugin

   https://github.com/dbellizzi/jquery-mask

   Copyright 2012 Dominick Bellizzi

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
(function($) {

  // NOTE: dimension objects are assumed to be immutable

  $.fn.mask = function(elems, options) {

	var settings = $.extend( {
      'className' : 'mask'
    }, options);

    $('.' + settings.className).remove();

    if (elems === false) {
      return this;
    } else if (typeof elems !== "string") {
      elems = $(elems);
    }

    return this.each(function() {
      var container = $(this), containerDims = $.mask.getDims(container), myElems = elems,
      maskDimsList = [containerDims], nextMaskDimsList = [];

      if (typeof myElems === "string") {
        myElems = container.find(myElems);
      }

      myElems.each(function() {
        var dims = $.mask.getDims(this);

        $.each(maskDimsList, function() {
          nextMaskDimsList = $.merge(nextMaskDimsList, $.mask.getMaskDimsList(this, dims));
        });

        maskDimsList = nextMaskDimsList;
        nextMaskDimsList = [];
      });

      $.each(maskDimsList, function() {
        $('<div>').css(this).addClass(settings.className).appendTo($('body'));
      });
    });
  };

  $.mask = {};

  $.mask.getDims = function(elem) {
    elem = $(elem);
    var dims = elem.offset();
    if (dims === null) {
      // document has no offset, but has different height/width than body
      dims = { top: 0, left: 0 };
    }
    dims.height = elem.outerHeight();
    dims.width = elem.outerWidth();
    return dims;
  };

  $.mask.intersectDims = function(containerDims, elemDims) {
    var top = elemDims.top, left = elemDims.left, height = elemDims.height,
    width = elemDims.width, newObj = false;

    if (top < containerDims.top) {
      height -= containerDims.top - top;
      top = containerDims.top;
      newObj = true;
    }

    if (left < containerDims.left) {
      width -= containerDims.left - left;
      left = containerDims.left;
      newObj = true;
    }

    if (top + height > containerDims.top + containerDims.height) {
      height -= ((top + height) - (containerDims.top + containerDims.height));
      newObj = true;
    }

    if (left + width > containerDims.left + containerDims.width) {
      width -= ((left + width) - (containerDims.left + containerDims.width));
      newObj = true;
    }

    if (newObj) {
      return {'top': top, 'left': left, 'height': height, 'width': width};
    }

    return elemDims;
  };

  $.mask.dimsOverlap = function(dims1, dims2) {
    return !(dims2.top + dims2.height <= dims1.top || dims1.top + dims1.height <= dims2.top ||
             dims2.left + dims2.width <= dims1.left || dims1.left + dims1.width <= dims2.left);
  };

  $.mask.getMaskDimsList = function(containerDims, dims) {
    // if the trimmed element doesn't overlap, mask the whole container
    if (!$.mask.dimsOverlap(containerDims, dims)) {
      return [containerDims];
    }

    // Trim the element to the area that is contained inside the container
    dims = $.mask.intersectDims(containerDims, dims);

    var maskDimsList = [
      {
        'top': containerDims.top,
        'left': containerDims.left,
        'height': dims.top - containerDims.top,
        'width': dims.left + dims.width - containerDims.left
      },
      {
        'top': containerDims.top,
        'left': dims.left + dims.width,
        'height': dims.top + dims.height - containerDims.top,
        'width': containerDims.left + containerDims.width - (dims.left + dims.width)
      },
      {
        'top': dims.top + dims.height,
        'left': dims.left,
        'height': containerDims.top + containerDims.height - (dims.top + dims.height),
        'width': containerDims.left + containerDims.width - dims.left
      },
      {
        'top': dims.top,
        'left': containerDims.left,
        'height': containerDims.top + containerDims.height - dims.top,
        'width': dims.left - containerDims.left
      }];

    return $.grep(maskDimsList, function(d) { return (d.height > 0 && d.width > 0); });
  };

})(jQuery);
