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

		// common options

		if (this.host) {
			args.push('--host', this.host);
		}

		args.push(params.cmd);

		// command specific options

		if (params.cmd === 'run' || params.cmd === 'exec') {
			if (this.user) {
				args.push('--user', this.user);
			}
		}

		return ParentCommand.prototype.run.call(this, {
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

		// common options
		if (params.host) this.host = params.host;

		// run, exec command options
		if (params.user) this.user = params.user;
	};

	return Command;
};