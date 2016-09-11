'use strict';

var _ = require('underscore'),
	inherits = require('util').inherits;

module.exports = function(app) {
	var ParentCommand = app.lib.command.SpawnCommand;

	function Command(params) {
		ParentCommand.call(this, params);
	}

	inherits(Command, ParentCommand);

	Command.prototype.run = function(params, callback) {
		var args = [];

		if (this.host) {
			args.push('--host', this.host);
		}

		args.push(params.cmd);

		ParentCommand.prototype.run.call(this, {
			cmd: 'docker',
			args: args.concat(params.args),
			options: _(params.options).omit('cwd')
		}, callback);
	};

	Command.prototype.setParams = function(params) {
		ParentCommand.prototype.setParams.call(this, params);

		// transforms cwd to _cwds coz cwd will be passed as options.cwd at
		// spawn command - leads to ENOENT
		if (this.cwd) {
			this._cwd = this.cwd;
			delete this.cwd;
		}

		if (params.host) this.host = params.host;
	};

	return Command;
};