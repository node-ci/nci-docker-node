'use strict';

var expect = require('expect.js'),
	sinon = require('sinon'),
	getExecutorConstructor = require('../lib/executor'),
	_ = require('underscore'),
	proxyquire = require('proxyquire');

describe('docker executor', function() {

	var app = {lib: {
		command: {SpawnCommand: _.noop},
		executor: {BaseExecutor: function(params) {
			this.project = params.project;
			if (params.env) {
				this.env = params.env;
			}
		}},
		scm: {},
		logger: _.noop
	}};

	var makeExecutorConstructor = function(app, ShellCommand) {
		var getConstructor = proxyquire('../lib/executor', {
			'./shellCommand': function(app) {
				return ShellCommand;
			}
		});

		var Executor = getConstructor(app);

		return Executor;
	};

	var makeShellCommandSpy = function(app) {
		var ShellCommand = require('../lib/shellCommand')(app),
			ShellCommandSpy = sinon.spy(ShellCommand);

		return ShellCommandSpy;
	};

	describe('module', function() {
		it('should export function', function() {
			expect(getExecutorConstructor).a(Function);
		});

		it('should export func which accepts single arg', function() {
			expect(getExecutorConstructor.length).equal(1);
		});

		var Constructor;

		it('should export func which called without errors', function() {
			Constructor = getExecutorConstructor(app);
		});

		it('should export func which returns executor constructor', function() {
			expect(Constructor.super_).equal(app.lib.executor.BaseExecutor);
		});
	});

	var project = {name: 'test_project'},
		env = {name: 'test'};

	describe('constructor', function() {
		var Executor, parentConstructorSpy;

		before(function() {
			parentConstructorSpy = sinon.spy(
				app.lib.executor,
				'BaseExecutor'
			);

			Executor = getExecutorConstructor(app);
		});

		after(function() {
			app.lib.executor.BaseExecutor.restore();
		});

		it('should call parent constructor with params', function() {
			var params = {options: {}, project: project, env: env},
				executor = new Executor(params);

			expect(parentConstructorSpy.calledOnce).equal(true);
			expect(parentConstructorSpy.getCall(0).args[0]).eql(params);
		});

		it('should remember options passed to constructor', function() {
			var options = {someOption: 'someVal'},
				params = {options: options, project: project, env: env},
				executor = new Executor(params);

			expect(executor.options.someOption).eql(params.options.someOption);
		});

	});

	describe('_createScm method', function() {
		var Executor,
			executor = {},
			params = {someParam: 'someVal'},
			ShellCommandSpy,
			createScmSpy;

		before(function() {
			app.lib.scm.createScm = function(params) {
				return 'scm';
			};
			createScmSpy = sinon.spy(app.lib.scm, 'createScm');

			ShellCommandSpy = makeShellCommandSpy(app);
			Executor = makeExecutorConstructor(app, ShellCommandSpy);

			executor._createScm = Executor.prototype._createScm;
			executor.options = {someOption: 'someValue'};
			executor.containerId = '123';
		});

		after(function() {
			delete app.lib.scm.createScm;
		});

		var result;

		it('should be called without error', function() {
			result = executor._createScm(params);
		});

		it('should call lib createScm once', function() {
			expect(createScmSpy.calledOnce).equal(true);
		});

		it('should create command', function() {
			expect(ShellCommandSpy.calledOnce).equal(true);
		});

		it('should create command with options, params, containerId', function() {
			var args = ShellCommandSpy.getCall(0).args;
			expect(args[0]).eql(
				_({}).extend(
					executor.options,
					params,
					{containerId: executor.containerId}
				)
			);
		});

		it('should call lib createScm with params and command', function() {
			var args = createScmSpy.getCall(0).args;
			expect(_(args[0]).omit('command')).eql(params);
			expect(args[0].command).a(ShellCommandSpy);
		});

		it('should return result of create scm command', function() {
			expect(result).equal('scm');
		});
	});

	describe('_createCommand method', function() {
		var Executor,
			executor = {},
			params = {someParam: 'someVal'},
			ShellCommandSpy;

		before(function() {
			ShellCommandSpy = makeShellCommandSpy(app);
			Executor = makeExecutorConstructor(app, ShellCommandSpy);

			executor._createCommand = Executor.prototype._createCommand;
			executor.options = {someOption: 'someVal'};
		});

		var result;

		it('should be executed without error', function() {
			result = executor._createCommand(params);
		});

		it('should create command which calls spawn constructor', function() {
			expect(ShellCommandSpy.calledOnce).equal(true);
		});

		it('should create command from options, params, containerId', function() {
			var args = ShellCommandSpy.getCall(0).args;
			expect(args[0]).eql(
				_({}).extend(
					executor.options,
					params,
					{containerId: executor.containerId}
				)
			);
		});

		it('should return instance of command', function() {
			expect(result).a(ShellCommandSpy);
		});
	});

});
