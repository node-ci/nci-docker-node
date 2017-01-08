'use strict';

var Steppy = require('twostep').Steppy,
	_ = require('underscore'),
	inherits = require('util').inherits,
	path = require('path');

module.exports = function(app) {
	var ParentExecutor = app.lib.executor.BaseExecutor,
		logger = app.lib.logger('docker node'),
		Command = require('./command')(app),
		ShellCommand = require('./shellCommand')(app);

	function Executor(params) {
		ParentExecutor.call(this, params);

		this.options =  _({}).extend(params.options);

		if (params.env && params.env.options) {
			_(this.options).extend(params.env.options);
		}

		_(this.options).defaults({
			baseDir: '/var/tmp/nci-docker-node/projects',
			volumes: ['/var/tmp:/var/tmp']
		});

		if (!this.env && this.options.defaultEnv) {
			this.env = {name: this.options.defaultEnv};
		}

		if (!this.env) {
			throw new Error(
				'env for docker executor is not set, please specify ' +
				'env for the build or default env for the node'
			);
		}

		this.envsDir = path.join(
			this.options.baseDir,
			this.project.name,
			'envs'
		);
	}

	inherits(Executor, ParentExecutor);

	Executor.prototype._createScm = function(params) {
		return app.lib.scm.createScm(_({
			command: new ShellCommand(
				_({}).extend(this.options, params, {containerId: this.containerId})
			)
		}).defaults(params));
	};

	Executor.prototype._createCommand = function(params) {
		return new ShellCommand(
			_({}).extend(this.options, params, {containerId: this.containerId})
		);
	};

	Executor.prototype._isCloned = function(callback) {
		var self = this;

		Steppy(
			function() {
				// ensure envs dir exists
				// create envs dir with 777 coz project envs could be run by
				// any user
				new ShellCommand(_({
					containerId: self.containerId,
					collectOut: true,
					user: 'root'
				}).defaults(self.options)).run({
					cmd: 'mkdir -p -m 777 "' + self.envsDir + '"'
				}, this.slot());
			},
			function(err, mkdirResult) {
				new ShellCommand(_({
					containerId: self.containerId,
					collectOut: true
				}).defaults(self.options)).run({
					cmd: 'test -e "' + self.cwd + '"; echo $?'
				}, this.slot());
			},
			function(err, output) {
				var cwdExists = output && output[0] === '0';

				this.pass(cwdExists);

				// ensure that parent dir for target repo exist
				if (cwdExists) {
					this.pass(null);
				} else {
					new ShellCommand(_({
						containerId: self.containerId,
						collectOut: true
					}).defaults(self.options)).run({
						cmd: 'mkdir -p "' + path.dirname(self.cwd) + '"'
					}, this.slot());
				}
			},
			function(err, cwdExists, mkdirResult) {
				callback(err, cwdExists);
			}
		);
	};

	Executor.prototype._beforeRun = function(callback) {
		var self = this;
		Steppy(
			function() {
				var options = _({}).extend(
					self.options,
					self.env.options
				);

				var args = ['-d'];

				_(options.volumes).each(function(volume) {
					args.push('--volume', volume);
				});

				_(self.envVars).each(function(value, name) {
					args.push('--env', name + '=' + value);
				});

				// safe name for env dir, colon is not safe coz it separates
				// items inside PATH on posix systems
				var envDir = self.env.name.replace(/:/g, '_');

				self.cwd = path.join(self.envsDir, envDir, 'workspace');

				// TODO: env name to image mapping should be here
				var image = self.env.name;
				args.push(image);

				// something that will run forever to prevent deactivating of
				// container
				args.push('sleep', '365d');

				var command = new Command(_({
					collectOut: true,
					emitIn: true,
					emitOut: true,
					emitErr: true
				}).defaults(options));

				self._listenCommand(command);

				command.run({
					cmd: 'run',
					args: args
				}, this.slot());
			},
			function(err, containerId) {
				self.containerId = containerId.replace(/\n$/, '');

				this.pass(null);
			},
			callback
		);
	};

	Executor.prototype._removeContainer = function(containerId, callback) {
		var self = this;
		Steppy(
			function() {
				new Command(self.options).run({
					cmd: 'stop',
					args: ['-t', 0, containerId]
				}, this.slot());
			},
			function() {
				new Command(self.options).run({
					cmd: 'rm',
					args: [containerId]
				}, this.slot());
			},
			callback
		);
	};

	Executor.prototype._afterRun = function(callback) {
		this._removeContainer(this.containerId, callback);
	};

	Executor.prototype._onRunError = function(originalErr, callback) {
		var self = this;
		Steppy(
			function() {
				if (self.containerId) {
					self._removeContainer(self.containerId, this.slot());
				} else {
					this.pass(null);
				}
			},
			function(err) {
				if (err) {
					logger.error('Error while removing container:', err.stack || err);
				}

				callback(originalErr);
			}
		);
	};

	return Executor;
};