'use strict';

var expect = require('expect.js'),
	sinon = require('sinon'),
	_ = require('underscore'),
	getCommandConstructor = require('../lib/command');

describe('docker command', function() {

	var app = {lib: {command: {SpawnCommand: _.noop}}};
	
	var SpawnCommand = app.lib.command.SpawnCommand;

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
			expect(Constructor.super_).equal(app.lib.command.SpawnCommand);
		});
	});

	describe('constructor', function() {
		var Command, parentConstructorSpy;

		before(function() {
			parentConstructorSpy = sinon.spy(app.lib.command, 'SpawnCommand');
		});

		beforeEach(function() {
			parentConstructorSpy.reset();

			Command = getCommandConstructor(app);
		});

		after(function() {
			app.lib.command.SpawnCommand.restore();
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
	});

	describe('set params', function() {
		var Command, parentSetParamsSpy;

		beforeEach(function() {
			SpawnCommand.prototype.setParams = function(params) {
				if (params.cwd) this.cwd = params.cwd;
			};

			parentSetParamsSpy = sinon.spy(SpawnCommand.prototype, 'setParams');

			Command = getCommandConstructor(app);
		});

		after(function() {
			delete SpawnCommand.prototype.setParams;
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

		it('should rename cwd to _cwd', function() {
			var command = new Command({});
			command.setParams({cwd: '/tmp'});
			expect(command).not.have.key('cwd');
			expect(command._cwd).equal('/tmp');
		});

		it('should allow set host', function() {
			var command = new Command({});
			command.setParams({host: '192.168.0.1'});
			expect(command.host).equal('192.168.0.1');
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
			SpawnCommand.prototype.run = sinon.spy();
			runSpy = SpawnCommand.prototype.run;

			Command = getCommandConstructor(app);
		});

		after(function() {
			delete SpawnCommand.prototype.run;
		});

		it('should pass callback to parent run method', function() {
			var command = new Command({}),
				callback = function() {};
			command.run({cmd: 'beep', args: ['1', '2']}, callback);

			expect(runSpy.getCall(0).args[1]).equal(callback);
		});

		it('should pass options (except cwd) to parent run method', function() {
			var command = new Command({});
			command.run({cmd: 'beep', args: ['1', '2'], options: {
				foo: '1',
				bar: '2',
				cwd: '/tmp'
			}});

			var params = runSpy.getCall(0).args[0];
			expect(params.options).eql({foo: '1', bar: '2'});
		});

		it('should always call docker command', function() {
			var command = new Command({});
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.cmd).equal('docker');
		});

		it('should pass cmd and args to parent', function() {
			var command = new Command({});
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[0]).equal('beep');
			expect(params.args[1]).equal('1');
			expect(params.args[2]).equal('2');
		});

		it('should optionally add host to command', function() {
			var command = new Command({});
			command.host = '192.168.0.1';
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[0]).equal('--host');
			expect(params.args[1]).equal('192.168.0.1');
		});

		it('should work in general', function() {
			var command = new Command({});
			command.run({cmd: 'run', args: ['ubuntu']});

			var params = runSpy.getCall(0).args[0];
			expect(params.cmd).equal('docker');
			expect(params.args).eql(['run', 'ubuntu']);
		});

	});

});
