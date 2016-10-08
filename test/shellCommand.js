'use strict';

var expect = require('expect.js'),
	sinon = require('sinon'),
	_ = require('underscore'),
	proxyquire = require('proxyquire');

describe('docker shell command', function() {

	// it's object to been able to add sinon spy to the closure at
	// getCommandConstructor
	var constructors = {ParentCommand: _.noop},
		ParentCommand = constructors.ParentCommand;

	var getCommandConstructor = function(app) {
		var getConstructor = proxyquire('../lib/shellCommand', {
			'./command': function(app) {
				return constructors.ParentCommand;
			}
		});

		var Command = getConstructor(app);

		return Command;
	};

	var app = {};
	
	describe('module', function() {
		it('should export function', function() {
			expect(getCommandConstructor).a(Function);
		});

		it('should export func which accepts single arg', function() {
			expect(getCommandConstructor.length).equal(1);
		});

		var Constructor;

		it('should export func which called without errors', function() {
			Constructor = getCommandConstructor(app);
		});

		it('should export func which returns command constructor', function() {
			expect(Constructor.super_).equal(ParentCommand);
		});
	});

	describe('constructor', function() {
		var Command, parentConstructorSpy;

		before(function() {
			parentConstructorSpy = sinon.spy(constructors, 'ParentCommand');
		});

		beforeEach(function() {
			parentConstructorSpy.reset();

			Command = getCommandConstructor(app);
		});

		after(function() {
			constructors.ParentCommand.restore();
		});

		it('should call parent constructor', function() {
			var command = new Command({});
			expect(parentConstructorSpy.calledOnce).equal(true);
		});

		it('should call parent constructor with params', function() {
			var params = {collectOut: true},
				command = new Command(params);

			expect(parentConstructorSpy.getCall(0).args[0]).eql(params);
		});

		it('should set shell by default to /bin/sh', function() {
			var command = new Command({});
			expect(command.shell).equal('/bin/sh');
		});

		it('should allow set another shell', function() {
			var command = new Command({shell: '/bin/bash'});
			expect(command.shell).equal('/bin/bash');
		});

		it('should set shell cmd arg by default to -c', function() {
			var command = new Command({});
			expect(command.shellCmdArg).equal('-c');
		});

		it('should allow set another shell cmd arg', function() {
			var command = new Command({shellCmdArg: '-m'});
			expect(command.shellCmdArg).equal('-m');
		});
	});

	describe('set params', function() {
		var Command, parentSetParamsSpy;

		beforeEach(function() {
			ParentCommand.prototype.setParams = function(params) {
				if (params.cwd) this.cwd = params.cwd;
			};

			parentSetParamsSpy = sinon.spy(ParentCommand.prototype, 'setParams');

			Command = getCommandConstructor(app);
		});

		after(function() {
			delete ParentCommand.prototype.setParams;
		});

		it('should call parent set params', function() {
			var command = new Command({});
			command.setParams({});
			expect(parentSetParamsSpy.calledOnce).equal(true);
		});

		it('should call parent set params with params', function() {
			var params = {opt: '1'},
				command = new Command({});

			command.setParams(params);
			expect(parentSetParamsSpy.getCall(0).args[0]).eql(params);
		});

		it('should set container id', function() {
			var command = new Command({});
			command.setParams({containerId: '123'});
			expect(command.containerId).equal('123');
		});

		it('should not allow set arbitrary option', function() {
			var command = new Command({});
			command.setParams({someOption: '123'});
			expect(command).not.have.key('someOption');
		});
	});

	describe('run method', function() {
		var Command, runSpy;

		beforeEach(function() {
			ParentCommand.prototype.run = sinon.spy();
			runSpy = ParentCommand.prototype.run;

			Command = getCommandConstructor(app);
		});

		after(function() {
			delete ParentCommand.prototype.run;
		});

		it('should pass callback to parent run method', function() {
			var command = new Command({}),
				callback = function() {};
			command.run({cmd: 'beep', args: ['1', '2']}, callback);

			expect(runSpy.getCall(0).args[1]).equal(callback);
		});

		it('should pass options to parent run method', function() {
			var command = new Command({});
			command.run({cmd: 'beep', args: ['1', '2'], options: {
				foo: '1',
				bar: '2',
				cwd: '/tmp'
			}});

			var params = runSpy.getCall(0).args[0];
			expect(params.options).eql({foo: '1', bar: '2', cwd: '/tmp'});
		});

		it('should always call exec', function() {
			var command = new Command({});
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.cmd).equal('exec');
		});

		it('should run remote command in a shell using cmd arg', function() {
			var command = new Command({});
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0],
				cmd = _(params.args).rest().join(' ');
			expect(cmd).eql('/bin/sh -c beep "1" "2"');
		});

		it('should pass options cwd as cd to command', function() {
			var command = new Command({});
			command.run({cmd: 'beep', args: ['1', '2'], options: {
				cwd: '/tmp'
			}});

			var params = runSpy.getCall(0).args[0],
				cmd = _(params.args).rest().join(' ');
			expect(cmd).match(new RegExp(' -c cd "/tmp" && '));
		});

		it('should pass _cwd as cd to command', function() {
			var command = new Command({});
			command._cwd = '/tmp';
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0],
				cmd = _(params.args).rest().join(' ');
			expect(cmd).match(new RegExp(' -c cd "/tmp" && '));
		});

		it('should escape duoble quotes inside args', function() {
			var command = new Command({});
			command.run({cmd: 'beep', args: ['1"2', '3']});

			var params = runSpy.getCall(0).args[0],
				cmd = params.args[params.args.length - 1];
			expect(cmd).contain('beep "1\\"2" "3"');
		});

		it('should escape single quotes inside cmd', function() {
			var command = new Command({});
			command.run({cmd: 'beep "1\'2"'});

			var params = runSpy.getCall(0).args[0],
				cmd = params.args[params.args.length - 1];
			expect(cmd).contain('beep "1\'\'2"');
		});

		it('should remove line breaks from cmd', function() {
			var command = new Command({});
			command.run({cmd: 'beep \n boop'});

			var params = runSpy.getCall(0).args[0],
				cmd = params.args[params.args.length - 1];
			expect(cmd).contain('beep  boop');
		});

		it('should work in general', function() {
			var command = new Command({});
			command.containerId = '123';
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.cmd).equal('exec');
			expect(params.args).eql(['123', '/bin/sh', '-c', 'beep "1" "2"']);
		});

	});

});
