var Configurator = function (options) {
	this.appId = options.appId;
	this.jsKey = options.jsKey;
	this.defaultFilter = options.defaultFilter;
	this.loginErrorMsg = options.loginErrorMsg;
	this.emptyNote = options.emptyNote;
};

Configurator.prototype = {
	getAppKey: function () {
		return this.appId;
	},
	getJsKey: function () {
		return this.jsKey;
	},
	getDefaultFilter: function () {
		return this.defaultFilter;
	},
	getLoginErrorMessage: function () {
		return this.loginErrorMsg;
	},
	getEmptyNote: function () {
		return this.emptyNote;
	}
}

var cfg = new Configurator({ 
								appId:"AXAPjVoHYkChvpKiXE8gpk34yCs7n5G0uUFVj49u",
							 	jsKey:"lCJ4o5fCOpPYwjB7SMkvuTbn64WdY18k7NzwM8Jr",
							 	defaultFilter: "all",
							 	loginErrorMsg: "Invalid username or password. Please try again.",
							 	emptyNote: "Empty note",
							});