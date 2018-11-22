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

		it('should allow set tls option', function() {
			var command = new Command({});
			command.setParams({tls: true});
			expect(command.tls).equal(true);
		});

		it('should allow set tls verify option', function() {
			var command = new Command({});
			command.setParams({tlsVerify: true});
			expect(command.tlsVerify).equal(true);
		});

		it('should allow set tls ca cert', function() {
			var command = new Command({});
			command.setParams({tlsCaCert: 'ca.pem'});
			expect(command.tlsCaCert).equal('ca.pem');
		});

		it('should allow set tls cert', function() {
			var command = new Command({});
			command.setParams({tlsCert: 'cert.pem'});
			expect(command.tlsCert).equal('cert.pem');
		});

		it('should allow set tls key', function() {
			var command = new Command({});
			command.setParams({tlsKey: 'key.pem'});
			expect(command.tlsKey).equal('key.pem');
		});

		it('should allow set user', function() {
			var command = new Command({});
			command.setParams({user: 'foo'});
			expect(command.user).equal('foo');
		});

		it('should allow set publish option', function() {
			var command = new Command({});
			command.setParams({publish: ['8080:8080']});
			expect(command.publish).eql(['8080:8080']);
		});

		it('should allow set publish all option', function() {
			var command = new Command({});
			command.setParams({publishAll: true});
			expect(command.publishAll).equal(true);
		});

		it('should not allow set arbitrary option', function() {
			var command = new Command({});
			command.setParams({someOption: '123'});
			expect(command).not.have.key('someOption');
		});

		it('should allow set shmSize option', function() {
			var command = new Command({});
			command.setParams({shmSize: true});
			expect(command.shmSize).equal(true);
		});
	});

	describe('run method', function() {
		var Command, runSpy, parentCommnadRunResult = {};

		beforeEach(function() {
			SpawnCommand.prototype.run = sinon.spy(function() {
				return parentCommnadRunResult;
			});
			runSpy = SpawnCommand.prototype.run;

			Command = getCommandConstructor(app);
		});

		after(function() {
			delete SpawnCommand.prototype.run;
		});

		it('should return result of run method of parent command', function() {
			var command = new Command({});
			var cmd = command.run({cmd: 'beep', args: ['1', '2']});

			expect(cmd).equal(parentCommnadRunResult);
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

		it('should optionally add tls option to command', function() {
			var command = new Command({});
			command.tls = true;
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[0]).equal('--tls');
		});

		it('should optionally add tls verify option to command', function() {
			var command = new Command({});
			command.tlsVerify = true;
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[0]).equal('--tlsverify');
		});

		it('should optionally add tls ca cert to command', function() {
			var command = new Command({});
			command.tlsCaCert = 'ca.pem';
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[0]).equal('--tlscacert');
			expect(params.args[1]).equal('ca.pem');
		});

		it('should optionally add tls cert to command', function() {
			var command = new Command({});
			command.tlsCert = 'cert.pem';
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[0]).equal('--tlscert');
			expect(params.args[1]).equal('cert.pem');
		});

		it('should optionally add tls key to command', function() {
			var command = new Command({});
			command.tlsKey = 'key.pem';
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[0]).equal('--tlskey');
			expect(params.args[1]).equal('key.pem');
		});

		it('should optionally add user to run command', function() {
			var command = new Command({});
			command.user = 'foo';
			command.run({cmd: 'run', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[1]).equal('--user');
			expect(params.args[2]).equal('foo');
		});

		it('should optionally add user to exec command', function() {
			var command = new Command({});
			command.user = 'foo';
			command.run({cmd: 'run', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[1]).equal('--user');
			expect(params.args[2]).equal('foo');
		});

		it('should not add user to oher command', function() {
			var command = new Command({});
			command.user = 'foo';
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args).eql(['beep', '1', '2']);
		});

		it('should optionally add single publish option to run command', function() {
			var command = new Command({});
			command.publish = ['8080:8080'];
			command.run({cmd: 'run', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[1]).equal('--publish');
			expect(params.args[2]).equal('8080:8080');
		});

		it('should optionally add multi publish options to run command', function() {
			var command = new Command({});
			command.publish = ['8080:8080', '9090:9999'];
			command.run({cmd: 'run', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[1]).equal('--publish');
			expect(params.args[2]).equal('8080:8080');
			expect(params.args[3]).equal('--publish');
			expect(params.args[4]).equal('9090:9999');
		});

		it('should not add publish option to oher command', function() {
			var command = new Command({});
			command.publish = ['8080:8080'];
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args).eql(['beep', '1', '2']);
		});

		it('should optionally add publish all option to run command', function() {
			var command = new Command({});
			command.publishAll = true;
			command.run({cmd: 'run', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[1]).equal('--publish-all');
		});

		it('should not add publish all option to oher command', function() {
			var command = new Command({});
			command.publishAll = true;
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args).eql(['beep', '1', '2']);
		});

		it('should work in general', function() {
			var command = new Command({});
			command.run({cmd: 'run', args: ['ubuntu']});

			var params = runSpy.getCall(0).args[0];
			expect(params.cmd).equal('docker');
			expect(params.args).eql(['run', 'ubuntu']);
		});

		it('should optionally add shmSize option to command', function() {
			var command = new Command({});
			command.shmSize = '128m';
			command.run({cmd: 'beep', args: ['1', '2']});

			var params = runSpy.getCall(0).args[0];
			expect(params.args[0]).equal('--shm-size');
			expect(params.args[1]).equal('128m');
		});

	});

});
