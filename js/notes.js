$(function() {
	// Give Parse JQuery
	Parse.$ = jQuery;

	// Initialize Parse
	Parse.initialize(cfg.getAppKey(), cfg.getJsKey());

	var AppRouter = Parse.Router.extend({
		routes: {
			"all": "all",
		},

		initialize: function(options) {
		},

		all: function() {
			state.set({ filter: cfg.getDefaultFilter() });
		},
	});

	// Transient application state
	var AppState = Parse.Object.extend("AppState", {
		defaults: {
			filter: cfg.getDefaultFilter()
		}
	});

	var state = new AppState();

	// Note model.
	var Note = Parse.Object.extend("Note", {
		// Default attributes for the note.
		defaults: {
			content: cfg.getEmptyNote(),
		},

		// Ensure that each note created has `content`.
		initialize: function() {
			if (!this.get("content")) {
				this.set({"content": this.defaults.content});
			}
		},

		// Toggle the `done` state of this item.
		toggle: function() {
			this.save();
		}
	});

	var NoteList = Parse.Collection.extend({
		// Collection model
		model: Note,

		// Keep the notes in sequential order, despite being saved by unordered
		// GUID in the database. This generates the next order number for new items.
		nextOrder: function() {
			if (!this.length) return 1;
			return this.last().get('order') + 1;
		},

		// Notes are sorted by their original insertion order.
		comparator: function(note) {
			return note.get('order');
		}
	});

	// The DOM element for a note item...
	var NoteView = Parse.View.extend({
		tagName:  "li",

		// Cache the template function for a single item.
		template: _.template($('#item-template').html()),

		// The DOM events specific to an item.
		events: {
			"click .note-destroy"   : "clear",
			"click .note-save"    : "save",
		},

		// The NoteView listens for changes to its model, re-rendering. Since there's
		// a one-to-one correspondence between a Note and a NoteView in this
		// app, we set a direct reference on the model for convenience.
		initialize: function() {
			_.bindAll(this, 'render', 'close', 'remove');
			this.model.bind('change', this.render);
			this.model.bind('destroy', this.remove);
		},

		// Re-render the contents of the item.
		render: function() {
			$(this.el).html(this.template(this.model.toJSON()));
			this.input = this.$('.edit');
			this.input.val(this.model.toJSON().content.replace(/<br\s*\/?>/ig, "\r\n"));
			return this;
		},

		// Switch this view into `"editing"` mode, displaying the input field.
		edit: function() {
			$(this.el).addClass("editing");
			this.input.focus();
		},

		// Close the `"editing"` mode, saving changes to the item.
		close: function() {
			this.model.save({content: this.input.val()});
			$(this.el).removeClass("editing");
		},

		save: function() {
			this.model.save({content: this.input.val()});
		},

		// Remove the item, destroy the model.
		clear: function() {
			this.model.destroy();
		}
	});

	// The main view that lets a user manage their notes
	var ManageNotesView = Parse.View.extend({
		// Delegated events for creating new items.
		events: {
			"click #save-new": "saveNew",
			"click .log-out": "logOut",
		},

		el: ".content",

		// At initialization we bind to the relevant events on the `Notes`
		// collection, when items are added or changed. Kick things off by
		// loading any preexisting notes that might be saved to Parse.
		initialize: function() {
			var self = this;

			_.bindAll(this, 'addOne', 'addAll', 'render', 'logOut');

			// Main note management template
			this.$el.html(_.template($("#manage-notes-template").html()));

			this.input = this.$("#new-note");

			// Create our collection of Notes
			this.notes = new NoteList();

			// Setup the query for the collection to look for notes from the current user
			this.notes.query = new Parse.Query(Note);
			this.notes.query.equalTo("user", Parse.User.current());

			this.notes.bind('add',     this.addOne);
			this.notes.bind('reset',   this.addAll);
			this.notes.bind('all',     this.render);

			// Fetch all the items for this user
			this.notes.fetch();

			state.on("change", this.filter, this);
		},

		// Logs out the user and shows the login view
		logOut: function(e) {
			Parse.User.logOut();
			new LogInView();
			this.undelegateEvents();
		},

		// Re-rendering the App.
		render: function() {
			this.delegateEvents();
		},

		// Add a single item to the list by creating a view for it, and
		// appending its element to the `<ul>`.
		addOne: function(note) {
			var view = new NoteView({model: note});
			this.$("#note-list").append(view.render().el);
		},

		// Add all items in the collection at once.
		addAll: function(collection, filter) {
			this.$("#note-list").html("");
			this.notes.each(this.addOne);
		},

		filter: function() {
			var filterValue = state.get("filter");
			if (filterValue === cfg.getDefaultFilter()) {
				this.addAll();
			}
		},

		saveNew: function () {
			var str = this.input.val().replace(/(\n)+/g, '<br />');

			this.notes.create({
				content: str,
				order:   this.notes.nextOrder(),
				user:    Parse.User.current(),
				ACL:     new Parse.ACL(Parse.User.current())
			});
		},
	});

	var LogInView = Parse.View.extend({
		events: {
			"submit form.login-form": "logIn",
			"submit form.signup-form": "signUp"
		},

		el: ".content",

		initialize: function() {
			_.bindAll(this, "logIn", "signUp");
			this.render();
		},

		logIn: function(e) {
			var self = this;
			var username = this.$("#login-username").val();
			var password = this.$("#login-password").val();

			Parse.User.logIn(username, password, {
				success: function(user) {
					new ManageNotesView();
					self.undelegateEvents();
				},

				error: function(user, error) {
					self.$(".login-form .error").html(cfg.getLoginErrorMessage()).show();
					this.$(".login-form button").removeAttr("disabled");
				}
			});

			this.$(".login-form button").attr("disabled", "disabled");

			return false;
		},

		signUp: function(e) {
			var self = this;
			var username = this.$("#signup-username").val();
			var password = this.$("#signup-password").val();

			Parse.User.signUp(username, password, { ACL: new Parse.ACL() }, {
				success: function(user) {
					new ManageNotesView();
					self.undelegateEvents();
				},

				error: function(user, error) {
					self.$(".signup-form .error").html(error.message).show();
					this.$(".signup-form button").removeAttr("disabled");
				}
			});

			this.$(".signup-form button").attr("disabled", "disabled");

			return false;
		},

		render: function() {
			this.$el.html(_.template($("#login-template").html()));
			this.delegateEvents();
		}
	});

	// The main view for the app
	var AppView = Parse.View.extend({
		el: $("#noteapp"),

		initialize: function() {
			this.render();
		},

		render: function() {
			if (Parse.User.current()) {
				new ManageNotesView();
			} else {
				new LogInView();
			}
		}
	});

	new AppRoute();
	new AppView();
});
