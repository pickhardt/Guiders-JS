Guiders.js (version 1.2.8) + WP-Guiders (not committed)
======================================================
=======

Guiders are a user experience design pattern for introducing users to a web application.  WP-Guiders is a WordPress plugin for integrating Guiders.js into the WordPress admin a la [WP-Pointers](http://wpeden.com/how-to-use-wp-pointer-tooltip-in-wordpress-3-3/) in WordPress 3.3 and later.

Live Examples
-------------

Here are a couple examples hosted online.  You can also check out `README.html` for guiders in action!

- [http://jeffpickhardt.com/guiders/](http://jeffpickhardt.com/guiders/)
- [https://optimizely.appspot.com/edit#url=www.google.com](https://optimizely.appspot.com/edit#url=www.google.com)


Setup
-----

Here is sample code for initializing a couple of guiders.  Guiders are hidden when created, unless `.show()` is method chained immediately after `.createGuider`.

~~~ javascript

	guiders.createGuider({
		buttons: [{name: "Next"}],
		description: "Guiders are a user interface design pattern 	for introducing features of software. This dialog box, for 	example, is the first in a series of guiders that together make up a guide.",
		id: "first",
		next: "second",
		overlay: true,
		title: "Welcome to Guiders.js!"
	}).show();
	/* .show() means that this guider will get shown immediately 	after creation. */
	
	guiders.createGuider({
	  attachTo: "#clock",
	  buttons: [{name: "Close, then click on the clock.", onclick: guiders.hideAll}],
	  description: "Custom event handlers can be used to hide and 	show guiders. This allows you to interactively show the user how to use your software by having them complete steps. To try 	it, click on the clock.",
	  id: "third",
	  next: "fourth",
	  position: 2,
	  title: "You can also advance guiders from custom event handlers.",
	  width: 450
	});

~~~~

Note that if you can use `initGuider()` instead of `createGuider()`. The main difference is that `initGuider()` initializes a guider step without actually creating it. This is useful when you have steps where the guider being `attachTo`'d may ore may not be in the DOM yet. If you use `createGuider()` you would get an error like: `base is null [Break On This Error] var top = base top;

The parameters for creating guiders are:

- `attachTo`: (optional) selector of the html element you want to attach the guider to
- `autoAdvance` (optional): Array consisting of an element and event, that causes an auto-advance the guider when that event's element is triggered. This is a combination of `onShow()` binding of a `next()` plus a automatic removal of the bind when a `next()` happens.
- `autoFocus`: (optional) if you want the browser to scroll to the position of the guider, set this to true
- `bindAdvanceHandler` (optional): When using `autoAdvance` above,  it will (by default) normally advance if the event occurs. But sometimes you want to change it so that it might advance only if the form has content, etc. If that is the case, set this to a closure so that this actually runs the auto-advance (or not). Note that commonly used handlers are stored in `guiders.handlers` array. If you want to create your own, realize the closure is bound to `_advanceHandler` for unbinding. 
- `buttons`: array of button objects

~~~~ javascript

	  {
	    name: "Close",
	    classString: "primary-button",
	    onclick: callback function for when the button is clicked
	      (if name is "close" or "next", onclick defaults to guiders.hideAll and guiders.next respectively)
	   }

~~~

- `buttonCustomHTML`: (optional) custom HTML that gets appended to the buttons div
- `classString`: (optional) custom class name that the guider should additionally have to style different guiders differently based upon their classes
- `closeOnEscape`: (optional) if true, the escape key will close the currently open guider
- `defaultButtonClass`: (optional, default 'guider_button') property allows you to change the default button "classname" for all guider buttons. For instance, for WP-Guiders, set this to "button-secondary".
- `description`: text description that shows up inside the guider
- `highlight`: (optional) selector of the html element you want to highlight (will cause element to be above the overlay)
- `isHashable`: (optional, default true) allows the use of hash in the query string to show the guider automatically when a page is loaded with a url hash parameter #gudier=guider_name (see below).
- `offset`: fine tune the position of the guider, e.g. `{ left:0, top: -10 }`
- `onClose`: (optional) additional function to call if a guider is closed by the x button, close button, or escape key
- `onHide`: (optional) additional function to call when the guider is hidden
- `onShow`: (optional) function that will be executed just before the guider is shown by `show()`. This function has a parameter which is the guider being shown. Note that if this function returns a guider, then it is assumed that you have shown() that and don't want to show the guider being onShow. For instance, you can have onShow test for something and return a `show()` of a different step. Then it shunts the current.
- `overlay`: (optional) if true, an overlay will pop up between the guider and the rest of the page. Note that you can give it a string value, which will inject that as a class name into the overlay. This is useful in conjunction with a css rule for coloring the background of an overlay red on `'error'` for error events and the like.
- `position`: (optional / required if using attachTo) clock position at which the guider should be attached to the html element. Can also use a description keyword (such as "topLeft" for 11 or "bottom" for 6)
- `shouldSkip`: (optional) a function handler that forces a skip of this step if the function returns true.
- `title`: title of the guider
- `width`: (optional) custom width of the guider (it defaults to `400px`)
- `xButton`: (optional) if true, a X will appear in the top right corner of the guider, as another way to close the guider

Integration
-----------

Besides creating guiders, here is sample code you can use in your application to work with guiders:

~~~ javascript

	guiders.hideAll(); // hides all guiders
	guiders.endTour(); // like hideAll() but it remembers to remove the cookie also
	guiders.next(); // hides the last shown guider, if shown, and advances to the next guider
	guiders.prev(); // shows the previous guider
	guiders.show(id); // shows the guider, given the id used at creation
	guiders.resume(); //Start up the tour from the current place in the cookie (if set). This is useful when your tour leaves the page yoga re on. Unlike show() it will skip steps that need to be skipped.

~~~

Creating a multi-page tour?  If the URL of the current window is of the form `http://www.myurl.com/mypage.html#guider=foo`, then the guider with id equal to `foo` will be shown automatically.  To use this, you can set the onHide of the last guider to an anonymous function: function() { window.location.href=`http://www.myurl.com/mypage.html#guider=foo`; }

Overrides
---------

There is the possibility you might want to change the default parameters or behavior of the Guiders themselves, instead of individual guides.

Here are some default values you can override:

- `_defaultSettings`: This is the default values of all guiders created using `guiders.createGuider()` For instance, you change the `width` to something other than `400px` to match your application's branding. Please check the `_defaultSettings` object at the top of the `guiders.js`.
- `cookie`: setting this allows you to name a cookie that gets updated every time `show()` is called. Note that doing this requires the [jQuery Cookies plugin](https://github.com/carhartl/jquery-cookie).
- `failStep`: guiders property allows you to name a step to `show()` if the `show()` case fails (for instance, if the attchTo element is missing). For obvious reasons, this (error) step should not have an `attachTo`.

In Closing
----------

Guiders are a great way to improve the user experience of your web application.  If you're interested in optimizing user experience through A/B testing, check out [Optimizely](http://www.optimizely.com).  We're the people who built Guiders in the first place.

If you have questions about Guiders, you can email me (Jeff Pickhardt) at `jeff+pickhardt@optimizely.com`.  Optimizely inquiries should be directed to `support@optimizely.com` or `sales@optimizely.com`.

If you have questions to the Guided Tours additions to guiders for WordPress (WP-Guiders) and Wikipedia gadget additions to guiders, email me at `tchay+guiders@wikimedia.org`

License
-------

Released under the [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0.html).