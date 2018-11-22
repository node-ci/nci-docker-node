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

		if (this.tls) {
			args.push('--tls');
		}

		if (this.tlsVerify) {
			args.push('--tlsverify');
		}

		if (this.tlsCaCert) {
			args.push('--tlscacert', this.tlsCaCert);
		}

		if (this.tlsCert) {
			args.push('--tlscert', this.tlsCert);
		}

		if (this.tlsKey) {
			args.push('--tlskey', this.tlsKey);
		}

		if (this.shmSize) {
			args.push('--shm-size', this.shmSize);
		}

		args.push(params.cmd);

		// command specific options

		if (params.cmd === 'run' || params.cmd === 'exec') {
			if (this.user) {
				args.push('--user', this.user);
			}
		}

		if (params.cmd === 'run') {
			if (this.publish) {
				_(this.publish).each(function(publishString) {
					args.push('--publish', publishString);
				});
			}

			if (this.publishAll) {
				args.push('--publish-all');
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
		if (params.tls) this.tls = params.tls;
		if (params.tlsVerify) this.tlsVerify = params.tlsVerify;
		if (params.tlsCaCert) this.tlsCaCert = params.tlsCaCert;
		if (params.tlsCert) this.tlsCert = params.tlsCert;
		if (params.tlsKey) this.tlsKey = params.tlsKey;
		if (params.shmSize) this.shmSize = params.shmSize;

		// run, exec command options
		if (params.user) this.user = params.user;

		// run options
		if (params.publish) this.publish = params.publish;
		if (params.publishAll) this.publishAll = params.publishAll;
	};

	return Command;
};