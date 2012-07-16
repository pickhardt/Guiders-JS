/**
 * guiders.ext.js
 *
 * version 1.2.7
 *
 * Developed at toepoke.co.uk.
 * We ease the stress of organising a game of football with your mates much easier.
 *
 * Released under the Apache License 2.0.
 * www.apache.org/licenses/LICENSE-2.0.html
 *
 * guiders.ext is a plug-in which uses the guiders.js plug-in to ease creating website tours.
 *
 * Dependencies:
 * guiders.js: https://github.com/jeff-optimizely/Guiders-JS
 */

var guidersExt = (function($) {
	var guidersExt = {};

	// same version as guiders ... i.e. this is the version we're dependent on
	guidersExt.version = "1.2.7";
	guidersExt._currentStep = 0;
	guidersExt._prefix = "_";
	guidersExt._startWidth = 500;
	guidersExt._stepWidth = 450;
	guidersExt._finishWidth = 600;


	/// <summary>
	/// Defines the opening bubble (which _must_ be used).  Main difference between this
	/// and "addStep" is there's only a "Next" button (it's the start so there's nowhere to go back to)
	/// and the "X" close button is off.
	/// </summary>
	guidersExt.defineStart = function(startTitle, desc, options) {
		if (options === null || options === undefined)
			options = {};
		
		var defaults = {
			buttons: [{
				name: guiders._nextButtonTitle, 
				onclick: function() { 
					var doNext = true;
					if (defaults.onNext)	
						// let the caller decide if we continue through or not
						doNext = defaults.onNext();
					if (doNext === undefined || doNext)
						guiders.next();		// saves having .next() on every exit point
				} 
			}],
			overlay: true,
			xButton: false,	// as this is the intro, disable the X close button
			closeOnEscape: false,	// as this is the intro, disable the escape button
			title: startTitle,
			description: desc,
			width: guidersExt._startWidth
		};
		
		$.extend(defaults, options);

		// Reinit the step number
		guidersExt._currentStep = 0;

		// We _must_ setup the IDs ourselves otherwise why use this entry point!
		defaults.id = guidersExt._prefix + guidersExt._currentStep.toString();
		guidersExt._currentStep++;
		defaults.next = guidersExt._prefix + guidersExt._currentStep.toString();

		guiders.createGuider(defaults).show();

		return defaults.id;
	};


	/// <summary>
	/// Adds a step in the tour of the page, this must be added after a call to "defineStart" and 
	/// has both a "Next" and "Back" button.  By default an "X" close button is available.
	/// </summary>
	guidersExt.addStep = function(stepTitle, stepDesc, options) {
		if (options === null || options === undefined)
			options = {};

		var defaults = {
			buttons: [
				{
					name: guiders._prevButtonTitle, 
					onclick: function() {
						var doPrev = true;
						if (defaults.onPrev) 
						// let the caller decide if we continue through or not
							doPrev = defaults.onPrev();
						if (doPrev === undefined || doPrev)
							guiders.prev();		// saves having .prev() on every exit point
					}
				}, 
				{
					name: guiders._nextButtonTitle, 
					onclick: function() {
						var doNext = true;
						if (defaults.onNext) 
							// let the caller decide if we continue through or not
							doNext = defaults.onNext();
						if (doNext === undefined || doNext)
							guiders.next();		// saves having .next() on every exit point
					}
				}
			],
			overlay: true,
			xButton: true,
			closeOnEscape: true,
			title: stepTitle,
			description: stepDesc,
			width: guidersExt._stepWidth
		};

		$.extend(defaults, options);

		// We _must_ setup the IDs ourselves otherwise why use this entry point!
		defaults.id = guidersExt._prefix + guidersExt._currentStep.toString();
		defaults.next = guidersExt._prefix + (++guidersExt._currentStep).toString();

		guiders.createGuider(defaults);

		return defaults.id;
	};


	/// <summary>
	/// Defines the last bubble in the tour.  This can be per page, or covering lots of
	/// of pages (depends on the type of tour you're defining).
	/// The finish bubble has a "Close" button.  By default there is no "Next" or "Back"
	/// button.  The "X" close button is available by default.
	/// </summary>
	guidersExt.defineFinish = function(finishTitle, desc, options) { 
		if (options === null || options === undefined)
			options = {};
		
		var defaults = {
			buttons: [{
				name: guiders._closeButtonTitle, 
				onclick: function() {
					if (defaults.onClose) 
						defaults.onClose();
					guiders.hideAll();		// saves having to also close the guiders when closing
				}
			}],
			overlay: true,
			xButton: false,	// last slide => keep consistency with the Start slide
			closeOnEscape: false,	// last slide => keep consistency with the Start slide
			title: finishTitle,
			description: desc,
			width: guidersExt._finishWidth
		};

		$.extend(defaults, options);

		// We _must_ setup the IDs ourselves otherwise why use this entry point!
		defaults.id = guidersExt._prefix + guidersExt._currentStep.toString();
		defaults.next = "";

		guiders.createGuider(defaults);
	};

	return guidersExt;
}).call(this, jQuery);

