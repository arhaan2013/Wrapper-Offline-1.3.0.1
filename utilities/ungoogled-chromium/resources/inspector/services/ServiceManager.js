export default class ServiceManager{createRemoteService(serviceName){if(!this._remoteConnection){const url=Root.Runtime.queryParam('service-backend');if(!url){console.error('No endpoint address specified');return(Promise.resolve(null));}
this._remoteConnection=new Connection(new RemoteServicePort(url));}
return this._remoteConnection._createService(serviceName);}
createAppService(appName,serviceName){let url=appName+'.js';const remoteBase=Root.Runtime.queryParam('remoteBase');const debugFrontend=Root.Runtime.queryParam('debugFrontend');const isUnderTest=Host.isUnderTest();const queryParams=[];if(remoteBase){queryParams.push('remoteBase='+remoteBase);}
if(debugFrontend){queryParams.push('debugFrontend='+debugFrontend);}
if(isUnderTest){queryParams.push('isUnderTest=true');}
if(queryParams.length){url+=`?${queryParams.join('&')}`;}
const worker=new Worker(url);const connection=new Connection(new WorkerServicePort(worker));return connection._createService(serviceName);}}
export class Connection{constructor(port){this._port=port;this._port.setHandlers(this._onMessage.bind(this),this._connectionClosed.bind(this));this._lastId=1;this._callbacks=new Map();this._services=new Map();}
_createService(serviceName){return this._sendCommand(serviceName+'.create').then(result=>{if(!result){console.error('Could not initialize service: '+serviceName);return null;}
const service=new Service(this,serviceName,result.id);this._services.set(serviceName+':'+result.id,service);return service;});}
_serviceDisposed(service){this._services.delete(service._serviceName+':'+service._objectId);if(!this._services.size){this._port.close();}}
_sendCommand(method,params){const id=this._lastId++;const message=JSON.stringify({id:id,method:method,params:params||{}});return this._port.send(message).then(success=>{if(!success){return Promise.resolve(null);}
return new Promise(fulfill=>this._callbacks.set(id,fulfill));});}
_onMessage(data){let object;try{object=JSON.parse(data);}catch(e){console.error(e);return;}
if(object.id){if(object.error){console.error('Service error: '+object.error);}
this._callbacks.get(object.id)(object.error?null:object.result);this._callbacks.delete(object.id);return;}
const tokens=object.method.split('.');const serviceName=tokens[0];const methodName=tokens[1];const service=this._services.get(serviceName+':'+object.params.id);if(!service){console.error('Unable to lookup stub for '+serviceName+':'+object.params.id);return;}
service._dispatchNotification(methodName,object.params);}
_connectionClosed(){for(const callback of this._callbacks.values()){callback(null);}
this._callbacks.clear();for(const service of this._services.values()){service._dispatchNotification('disposed');}
this._services.clear();}}
export class Service{constructor(connection,serviceName,objectId){this._connection=connection;this._serviceName=serviceName;this._objectId=objectId;this._notificationHandlers=new Map();}
dispose(){const params={id:this._objectId};return this._connection._sendCommand(this._serviceName+'.dispose',params).then(()=>{this._connection._serviceDisposed(this);});}
on(methodName,handler){this._notificationHandlers.set(methodName,handler);}
send(methodName,params){params=params||{};params.id=this._objectId;return this._connection._sendCommand(this._serviceName+'.'+methodName,params);}
_dispatchNotification(methodName,params){const handler=this._notificationHandlers.get(methodName);if(!handler){console.error('Could not report notification \''+methodName+'\' on \''+this._objectId+'\'');return;}
handler(params);}}
export class RemoteServicePort{constructor(url){this._url=url;}
setHandlers(messageHandler,closeHandler){this._messageHandler=messageHandler;this._closeHandler=closeHandler;}
_open(){if(!this._connectionPromise){this._connectionPromise=new Promise(promiseBody.bind(this));}
return this._connectionPromise;function promiseBody(fulfill){let socket;try{socket=new WebSocket((this._url));socket.onmessage=onMessage.bind(this);socket.onclose=onClose.bind(this);socket.onopen=onConnect.bind(this);}catch(e){fulfill(false);}
function onConnect(){this._socket=socket;fulfill(true);}
function onMessage(event){this._messageHandler(event.data);}
function onClose(){if(!this._socket){fulfill(false);}
this._socketClosed(!!this._socket);}}}
send(message){return this._open().then(()=>{if(this._socket){this._socket.send(message);return true;}
return false;});}
close(){return this._open().then(()=>{if(this._socket){this._socket.close();this._socketClosed(true);}
return true;});}
_socketClosed(notifyClient){this._socket=null;delete this._connectionPromise;if(notifyClient){this._closeHandler();}}}
export class WorkerServicePort{constructor(worker){this._worker=worker;let fulfill;this._workerPromise=new Promise(resolve=>fulfill=resolve);this._worker.onmessage=onMessage.bind(this);this._worker.onclose=this._closeHandler;function onMessage(event){if(event.data==='workerReady'){fulfill(true);return;}
this._messageHandler(event.data);}}
setHandlers(messageHandler,closeHandler){this._messageHandler=messageHandler;this._closeHandler=closeHandler;}
send(message){return this._workerPromise.then(()=>{try{this._worker.postMessage(message);return true;}catch(e){return false;}});}
close(){return this._workerPromise.then(()=>{if(this._worker){this._worker.terminate();}
return false;});}}
self.Services=self.Services||{};Services=Services||{};Services.ServiceManager=ServiceManager;Services.ServiceManager.Connection=Connection;Services.ServiceManager.Service=Service;Services.ServiceManager.RemoteServicePort=RemoteServicePort;Services.ServiceManager.WorkerServicePort=WorkerServicePort;Services.serviceManager=new ServiceManager();