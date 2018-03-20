require('jasmine-expect');
const proxyquire = require('proxyquire');
const moment = require('moment');

const emptyFunction = () => {
  //
};
describe('NewRelic', () => {
  let uut;
  const mockNewRelic = {};
  const enablePromiseSpy = jasmine.createSpy('enablePromise');

  beforeEach(() => {
    mockNewRelic.send = emptyFunction;
    mockNewRelic.setAttribute = emptyFunction;
    mockNewRelic.nativeLog = emptyFunction;

    uut = proxyquire.noCallThru().noPreserveCache()('./../src/NewRelic', {
      'react-native': {
        NativeModules: {
          RNNewRelic: mockNewRelic
        }
      },
      'Promise': {
      },
      'promise/setimmediate/rejection-tracking': {
        enable: enablePromiseSpy
      }
    }).default;
  });

  describe('init', () => {
    it('inits everything that is enabled', () => {
      uut._overrideConsole = jasmine.createSpy('overrideConsole');
      uut._reportUncaughtExceptions = jasmine.createSpy('reportUncaughtExceptions');
      uut._reportRejectedPromises = jasmine.createSpy('reportRejectedPromises');

      uut.init({
        overrideConsole: true,
        reportUncaughtExceptions: true,
        reportRejectedPromises: true
      });

      expect(uut._overrideConsole).toHaveBeenCalled();
      expect(uut._reportUncaughtExceptions).toHaveBeenCalled();
      expect(uut._reportRejectedPromises).toHaveBeenCalled();
    });

    it('does not init anything that is disabled', () => {
      uut._overrideConsole = jasmine.createSpy('overrideConsole');

      uut.init({
        overrideConsole: false
      });

      expect(uut._overrideConsole).not.toHaveBeenCalled();
    });
  });

  describe('report', () => {
    it('sends name and args', () => {
      spyOn(mockNewRelic, 'send');
      expect(mockNewRelic.send).not.toHaveBeenCalled();
      uut.report('name', {inner: 'val'});
      expect(mockNewRelic.send).toHaveBeenCalledTimes(1);
      expect(mockNewRelic.send).toHaveBeenCalledWith('Logs', 'name', {inner: 'val'});
    });

    it('sends name as string', () => {
      spyOn(mockNewRelic, 'send');
      expect(mockNewRelic.send).not.toHaveBeenCalled();
      uut.report(123, {inner: 'val'});
      expect(mockNewRelic.send).toHaveBeenCalledTimes(1);
      expect(mockNewRelic.send).toHaveBeenCalledWith('Logs', '123', {inner: 'val'});
    });

    it('sends args as string', () => {
      spyOn(mockNewRelic, 'send');
      expect(mockNewRelic.send).not.toHaveBeenCalled();
      uut.report('name', {inner: 123});
      expect(mockNewRelic.send).toHaveBeenCalledTimes(1);
      expect(mockNewRelic.send).toHaveBeenCalledWith('Logs', 'name', {inner: '123'});
    });
  });

  describe('timeEvent', () => {
    it('records starting times based on event name', () => {
      const now = moment('2016-01-01').toDate();
      jasmine.clock().mockDate(now);
      const eventName = 'MyEvent';
      expect(uut.startingTimes).toEqual(undefined);
      uut.timeEvent(eventName);
      expect(uut.startingTimes).not.toEqual(undefined);
      expect(uut.startingTimes[eventName].toDate()).toEqual(now);
    });
  });

  describe('send', () => {
    it('adds duration to args if starting time present', () => {
      const now = moment('2016-01-01').toDate();
      jasmine.clock().mockDate(now);
      const eventType = 'MyEventType';
      const eventName = 'MyEvent';
      spyOn(mockNewRelic, 'send');
      uut.timeEvent(eventName);
      expect(mockNewRelic.send).not.toHaveBeenCalled();
      const later = moment(now).add(10, 's').toDate();
      jasmine.clock().mockDate(later);
      uut.send(eventType, eventName, {userId: 1});
      expect(mockNewRelic.send).toHaveBeenCalledTimes(1);
      expect(mockNewRelic.send).toHaveBeenCalledWith(eventType, eventName, {userId: '1', duration: 10});
    });

    it('does not send event if duration is over 500 seconds', () => {
      const now = moment('2016-01-01').toDate();
      jasmine.clock().mockDate(now);
      const eventType = 'MyEventType';
      const eventName = 'MyEvent';
      spyOn(mockNewRelic, 'send');
      uut.timeEvent(eventName);
      expect(mockNewRelic.send).not.toHaveBeenCalled();
      const later = moment(now).add(501, 's').toDate();
      jasmine.clock().mockDate(later);
      uut.send(eventType, eventName, {userId: 1});
      expect(mockNewRelic.send).not.toHaveBeenCalled();
    });

    it('does not add duration to args if no starting time present', () => {
      const eventType = 'MyEventType';
      const eventName1 = 'MyEvent';
      const eventName2 = 'MyOtherEvent';
      spyOn(mockNewRelic, 'send');
      uut.timeEvent(eventName1);
      uut.send(eventType, eventName2, {userId: 1});
      expect(mockNewRelic.send).toHaveBeenCalledTimes(1);
      expect(mockNewRelic.send).toHaveBeenCalledWith(eventType, eventName2, {userId: '1'});
    });

    it('removes the starting time of the sent event', () => {
      const eventType = 'MyEventType';
      const eventName = 'MyEvent';
      expect(uut.startingTimes).toEqual(undefined);
      uut.timeEvent(eventName);
      expect(uut.startingTimes).not.toEqual(undefined);
      expect(uut.startingTimes[eventName]).not.toBeNull();
      uut.send(eventType, eventName);
      expect(uut.startingTimes).not.toBeNull();
      expect(uut.startingTimes[eventName]).toBeNull();
    });

    it('does not remove the starting time of a different event', () => {
      const eventType = 'MyEventType';
      const eventName1 = 'MyEvent';
      const eventName2 = 'MyOtherEvent';
      expect(uut.startingTimes).toEqual(undefined);
      uut.timeEvent(eventName1);
      expect(uut.startingTimes).not.toEqual(undefined);
      expect(uut.startingTimes[eventName1]).not.toBeNull();
      uut.send(eventType, eventName2);
      expect(uut.startingTimes).not.toBeNull();
      expect(uut.startingTimes[eventName1]).not.toBeNull();
    });
  });

  describe('attributes', () => {
    it('set a global attribute', () => {
      spyOn(mockNewRelic, 'setAttribute');
      expect(mockNewRelic.setAttribute).not.toHaveBeenCalled();
      uut.init({
        globalAttributes: {
          always: 'send-this-attribute'
        }
      });

      uut.report('name', {inner: 123});
      expect(mockNewRelic.setAttribute).toHaveBeenCalledTimes(1);
      expect(mockNewRelic.setAttribute).toHaveBeenCalledWith('always', 'send-this-attribute');
    });
  });

  describe('uncaught exception', () => {
    it('reports uncaught exceptions', () => {
      spyOn(mockNewRelic, 'send');
      const originalErrorHandler = jasmine.createSpy('errorHandlerSpy');
      const errorUtils = {
        _globalHandler: originalErrorHandler
      };
      const error = new Error('some-exception');

      uut._reportUncaughtExceptions(errorUtils);
      errorUtils._globalHandler(error);

      expect(originalErrorHandler).toHaveBeenCalledWith(error);
      expect(originalErrorHandler).toHaveBeenCalledTimes(1);
      expect(mockNewRelic.send).toHaveBeenCalledWith('Logs', 'JS:UncaughtException', {
        error: String(error),
        stack: error.stack
      });
    });
  });

  describe('rejected promises', () => {
    it('reports rejected promises', () => {
      global.__DEV__ = false;
      uut._reportRejectedPromises();

      expect(enablePromiseSpy).toHaveBeenCalledWith({
        allRejections: true, onUnhandled: jasmine.anything(), onHandled: jasmine.anything()
      });
    });
  });

  describe('overrideConsole', () => {
    const defaultLog = console.log;
    const defaultWarn = console.warn;
    const defaultError = console.error;
    beforeEach(() => {
      console.log = emptyFunction;
      console.warn = emptyFunction;
      console.error = emptyFunction;
    });

    afterEach(() => {
      console.log = defaultLog;
      console.warn = defaultWarn;
      console.error = defaultError;
    });

    it('overrides default console.log', () => {
      expect(console.error).toBe(emptyFunction);
      uut._overrideConsole();
      expect(console.log).not.toBe(emptyFunction);
    });

    it('overrides default console.warn', () => {
      expect(console.error).toBe(emptyFunction);
      uut._overrideConsole();
      expect(console.warn).not.toBe(emptyFunction);
    });

    it('overrides default console.error', () => {
      expect(console.error).toBe(emptyFunction);
      uut._overrideConsole();
      expect(console.error).not.toBe(emptyFunction);
    });

    it('sends console.log to logger', () => {
      spyOn(mockNewRelic, 'send');
      uut._overrideConsole();
      expect(mockNewRelic.send).not.toHaveBeenCalled();
      console.log('hello');
      expect(mockNewRelic.send).toHaveBeenCalledTimes(1);
    });

    it('sends console.warn to logger', () => {
      spyOn(mockNewRelic, 'send');
      uut._overrideConsole();
      expect(mockNewRelic.send).not.toHaveBeenCalled();
      console.warn('hello');
      expect(mockNewRelic.send).toHaveBeenCalledTimes(1);
    });

    it('sends console.error to logger', () => {
      spyOn(mockNewRelic, 'send');
      uut._overrideConsole();
      expect(mockNewRelic.send).not.toHaveBeenCalled();
      console.error('hello');
      expect(mockNewRelic.send).toHaveBeenCalledTimes(1);
    });

    it('sends consoles to logger with name JSConsole', () => {
      let called = null;
      mockNewRelic.send = (eventType, name) => {
        called = name;
      };
      uut._overrideConsole();
      expect(called).toBeNull();
      console.log('hello');
      expect(called).toEqual('JSConsole');
      console.warn('hello');
      expect(called).toEqual('JSConsole');
      console.error('hello');
      expect(called).toEqual('JSConsole');
    });

    it('send consoles to logger with argument and consoleType', () => {
      spyOn(mockNewRelic, 'send');
      uut._overrideConsole();
      expect(mockNewRelic.send).not.toHaveBeenCalled();
      console.log('hello1');
      expect(mockNewRelic.send).toHaveBeenCalledWith('Logs', 'JSConsole', {consoleType: 'log', args: 'hello1'});
      console.warn('hello2');
      expect(mockNewRelic.send).toHaveBeenCalledWith('Logs', 'JSConsole', {consoleType: 'warn', args: 'hello2'});
      console.error('hello3');
      expect(mockNewRelic.send).toHaveBeenCalledWith('Logs', 'JSConsole', {consoleType: 'error', args: 'hello3'});
      expect(mockNewRelic.send).toHaveBeenCalledTimes(3);
    });

    it('send consoles error console to native log', () => {
      spyOn(mockNewRelic, 'send');
      spyOn(mockNewRelic, 'nativeLog');

      expect(mockNewRelic.send).not.toHaveBeenCalled();

      uut._overrideConsole();
      console.error('hello3');

      expect(mockNewRelic.send).toHaveBeenCalledWith('Logs', 'JSConsole', {consoleType: 'error', args: 'hello3'});
      expect(mockNewRelic.nativeLog).toHaveBeenCalledWith('[JSConsole:Error] hello3');
      expect(mockNewRelic.send).toHaveBeenCalledTimes(1);
    });

    it('send consoles to logger with argument seperated by comma and cast to string', () => {
      spyOn(mockNewRelic, 'send');
      uut._overrideConsole();
      expect(mockNewRelic.send).not.toHaveBeenCalled();
      console.log('hello', 'world', 123, null, {inner: 1});
      expect(mockNewRelic.send).toHaveBeenCalledWith('Logs', 'JSConsole', {consoleType: 'log', args: 'hello, world, 123, null, [object Object]'});
    });
  });
});
