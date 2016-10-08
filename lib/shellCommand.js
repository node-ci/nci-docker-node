'use strict';

var _ = require('underscore'),
	inherits = require('util').inherits;

module.exports = function(app) {
	var ParentCommand = require('./command')(app);

	function Command(params) {
		ParentCommand.call(this, params);
		this.shell = params.shell || '/bin/sh';
		this.shellCmdArg = params.shellCmdArg || '-c';
	}

	inherits(Command, ParentCommand);

	Command.prototype._escapeCmd = function(cmd) {
		return (
			cmd
				.replace(/'/g, '\'\'')
				.replace(/\r?\n/g, '')
		);
	};

	Command.prototype._escapeArg = function(arg) {
		return arg.replace(/"/g, '\\"');
	};

	Command.prototype.run = function(params, callback) {
		var self = this;

		// command inside shell
		var shellCmd = '';

		var cwd = params.options && params.options.cwd || this._cwd;
		if (cwd) {
			shellCmd += 'cd "' + cwd + '" && ';
		}

		shellCmd += self._escapeCmd(params.cmd);

		shellCmd +=  ' ' + _(params.args).map(function(arg) {
			return '"' + self._escapeArg(arg) + '"';
		}).join(' ');

		ParentCommand.prototype.run.call(self, {
			cmd: 'exec',
			args: [self.containerId, self.shell, self.shellCmdArg, shellCmd],
			options: params.options
		}, callback);
	};

	Command.prototype.setParams = function(params) {
		ParentCommand.prototype.setParams.call(this, params);

		if (params.containerId) this.containerId = params.containerId;
	};

	return Command;
};