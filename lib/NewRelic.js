'use strict';Object.defineProperty(exports,"__esModule",{value:true});var _extends=Object.assign||function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i];for(var key in source){if(Object.prototype.hasOwnProperty.call(source,key)){target[key]=source[key];}}}return target;};var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor);}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor;};}();
var _reactNative=require('react-native');
var _lodash=require('lodash');var _=_interopRequireWildcard(_lodash);
var _moment=require('moment');var _moment2=_interopRequireDefault(_moment);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj};}function _interopRequireWildcard(obj){if(obj&&obj.__esModule){return obj;}else{var newObj={};if(obj!=null){for(var key in obj){if(Object.prototype.hasOwnProperty.call(obj,key))newObj[key]=obj[key];}}newObj.default=obj;return newObj;}}function _defineProperty(obj,key,value){if(key in obj){Object.defineProperty(obj,key,{value:value,enumerable:true,configurable:true,writable:true});}else{obj[key]=value;}return obj;}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function");}}

var RNNewRelic=_reactNative.NativeModules.RNNewRelic;var

NewRelic=function(){function NewRelic(){_classCallCheck(this,NewRelic);}_createClass(NewRelic,[{key:'init',value:function init(

config){
if(config.overrideConsole){
this._overrideConsole();
}
if(config.reportUncaughtExceptions){
this._reportUncaughtExceptions();
}
if(config.reportRejectedPromises){
this._reportRejectedPromises();
}
if(config.globalAttributes){
this.setGlobalAttributes(config.globalAttributes);
}
}},{key:'_overrideConsole',value:function _overrideConsole()

{
var defaultLog=console.log;
var defaultWarn=console.warn;
var defaultError=console.error;
var self=this;

console.log=function(){
self.sendConsole('log',arguments);
defaultLog.apply(console,arguments);
};
console.warn=function(){
self.sendConsole('warn',arguments);
defaultWarn.apply(console,arguments);
};
console.error=function(){
self.sendConsole('error',arguments);
defaultError.apply(console,arguments);
};
}},{key:'_reportUncaughtExceptions',value:function _reportUncaughtExceptions()

{var _this=this;var errorUtils=arguments.length>0&&arguments[0]!==undefined?arguments[0]:global.ErrorUtils;
var defaultHandler=errorUtils._globalHandler;
errorUtils._globalHandler=function(error){
_this.send('JS:UncaughtException',{error:error,stack:error&&error.stack});
defaultHandler(error);
};
}},{key:'_reportRejectedPromises',value:function _reportRejectedPromises()

{var _this2=this;
var rejectionTracking=require('promise/setimmediate/rejection-tracking');
if(!__DEV__){
rejectionTracking.enable({
allRejections:true,
onUnhandled:function onUnhandled(id,error){
_this2.send('JS:UnhandledRejectedPromise',{error:error});
_this2.nativeLog('[UnhandledRejectedPromise] '+error);
},
onHandled:function onHandled(){

}});

}
}},{key:'setGlobalAttributes',value:function setGlobalAttributes(





args){
_.forEach(args,function(value,key){
RNNewRelic.setAttribute(String(key),String(value));
});
}},{key:'sendConsole',value:function sendConsole(

type,args){
var argsStr=_.map(args,String).join(', ');
this.send('JSConsole',{consoleType:type,args:argsStr});
if(type==='error'){
this.nativeLog('[JSConsole:Error] '+argsStr);
}
}},{key:'report',value:function report(

eventName,args){
this.send(eventName,args);
}},{key:'nativeLog',value:function nativeLog(




log){
RNNewRelic.nativeLog(log);
}},{key:'send',value:function send(

name,args){
var nameStr=String(name);
var argsStr={};
_.forEach(args,function(value,key){
argsStr[String(key)]=String(value);
});
var startingTime=this.startingTimes?this.startingTimes[name]:null;
if(startingTime){
argsStr=_extends({},
argsStr,{
duration:(0,_moment2.default)().diff(startingTime)/1000});

this.startingTimes[name]=null;
}
RNNewRelic.send(nameStr,argsStr);
}},{key:'timeEvent',value:function timeEvent(

name){
this.startingTimes=_extends({},
this.startingTimes,_defineProperty({},
name,(0,_moment2.default)()));

}}]);return NewRelic;}();exports.default=


new NewRelic();