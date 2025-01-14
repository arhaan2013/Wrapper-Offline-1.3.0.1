export default class NetworkManager extends SDK.SDKModel{constructor(target){super(target);this._dispatcher=new NetworkDispatcher(this);this._networkAgent=target.networkAgent();target.registerNetworkDispatcher(this._dispatcher);if(Common.moduleSetting('cacheDisabled').get()){this._networkAgent.setCacheDisabled(true);}
this._networkAgent.enable(undefined,undefined,MAX_EAGER_POST_REQUEST_BODY_LENGTH);this._bypassServiceWorkerSetting=Common.settings.createSetting('bypassServiceWorker',false);if(this._bypassServiceWorkerSetting.get()){this._bypassServiceWorkerChanged();}
this._bypassServiceWorkerSetting.addChangeListener(this._bypassServiceWorkerChanged,this);Common.moduleSetting('cacheDisabled').addChangeListener(this._cacheDisabledSettingChanged,this);}
static forRequest(request){return request[_networkManagerForRequestSymbol];}
static canReplayRequest(request){return!!request[_networkManagerForRequestSymbol]&&request.resourceType()===Common.resourceTypes.XHR;}
static replayRequest(request){const manager=request[_networkManagerForRequestSymbol];if(!manager){return;}
manager._networkAgent.replayXHR(request.requestId());}
static async searchInRequest(request,query,caseSensitive,isRegex){const manager=NetworkManager.forRequest(request);if(!manager){return[];}
const response=await manager._networkAgent.invoke_searchInResponseBody({requestId:request.requestId(),query:query,caseSensitive:caseSensitive,isRegex:isRegex});return response.result||[];}
static async requestContentData(request){if(request.resourceType()===Common.resourceTypes.WebSocket){return{error:'Content for WebSockets is currently not supported',content:null,encoded:false};}
if(!request.finished){await request.once(SDK.NetworkRequest.Events.FinishedLoading);}
const manager=NetworkManager.forRequest(request);if(!manager){return{error:'No network manager for request',content:null,encoded:false};}
const response=await manager._networkAgent.invoke_getResponseBody({requestId:request.requestId()});const error=response[Protocol.Error]||null;return{error:error,content:error?null:response.body,encoded:response.base64Encoded};}
static requestPostData(request){const manager=NetworkManager.forRequest(request);if(manager){return manager._networkAgent.getRequestPostData(request.backendRequestId());}
console.error('No network manager for request');return(Promise.resolve(null));}
static _connectionType(conditions){if(!conditions.download&&!conditions.upload){return Protocol.Network.ConnectionType.None;}
let types=NetworkManager._connectionTypes;if(!types){NetworkManager._connectionTypes=[];types=NetworkManager._connectionTypes;types.push(['2g',Protocol.Network.ConnectionType.Cellular2g]);types.push(['3g',Protocol.Network.ConnectionType.Cellular3g]);types.push(['4g',Protocol.Network.ConnectionType.Cellular4g]);types.push(['bluetooth',Protocol.Network.ConnectionType.Bluetooth]);types.push(['wifi',Protocol.Network.ConnectionType.Wifi]);types.push(['wimax',Protocol.Network.ConnectionType.Wimax]);}
for(const type of types){if(conditions.title.toLowerCase().indexOf(type[0])!==-1){return type[1];}}
return Protocol.Network.ConnectionType.Other;}
static lowercaseHeaders(headers){const newHeaders={};for(const headerName in headers){newHeaders[headerName.toLowerCase()]=headers[headerName];}
return newHeaders;}
inflightRequestForURL(url){return this._dispatcher._inflightRequestsByURL[url];}
_cacheDisabledSettingChanged(event){const enabled=(event.data);this._networkAgent.setCacheDisabled(enabled);}
dispose(){Common.moduleSetting('cacheDisabled').removeChangeListener(this._cacheDisabledSettingChanged,this);}
_bypassServiceWorkerChanged(){this._networkAgent.setBypassServiceWorker(this._bypassServiceWorkerSetting.get());}}
export const Events={RequestStarted:Symbol('RequestStarted'),RequestUpdated:Symbol('RequestUpdated'),RequestFinished:Symbol('RequestFinished'),RequestUpdateDropped:Symbol('RequestUpdateDropped'),ResponseReceived:Symbol('ResponseReceived'),MessageGenerated:Symbol('MessageGenerated'),RequestRedirected:Symbol('RequestRedirected'),};export const _MIMETypes={'text/html':{'document':true},'text/xml':{'document':true},'text/plain':{'document':true},'application/xhtml+xml':{'document':true},'image/svg+xml':{'document':true},'text/css':{'stylesheet':true},'text/xsl':{'stylesheet':true},'text/vtt':{'texttrack':true},};export const NoThrottlingConditions={title:ls`Online`,download:-1,upload:-1,latency:0};export const OfflineConditions={title:Common.UIString('Offline'),download:0,upload:0,latency:0,};export const Slow3GConditions={title:Common.UIString('Slow 3G'),download:500*1024/8*.8,upload:500*1024/8*.8,latency:400*5,};export const Fast3GConditions={title:Common.UIString('Fast 3G'),download:1.6*1024*1024/8*.9,upload:750*1024/8*.9,latency:150*3.75,};export const _networkManagerForRequestSymbol=Symbol('NetworkManager');export const MAX_EAGER_POST_REQUEST_BODY_LENGTH=64*1024;export class NetworkDispatcher{constructor(manager){this._manager=manager;this._inflightRequestsById={};this._inflightRequestsByURL={};this._requestIdToRedirectExtraInfoBuilder=new Map();}
_headersMapToHeadersArray(headersMap){const result=[];for(const name in headersMap){const values=headersMap[name].split('\n');for(let i=0;i<values.length;++i){result.push({name:name,value:values[i]});}}
return result;}
_updateNetworkRequestWithRequest(networkRequest,request){networkRequest.requestMethod=request.method;networkRequest.setRequestHeaders(this._headersMapToHeadersArray(request.headers));networkRequest.setRequestFormData(!!request.hasPostData,request.postData||null);networkRequest.setInitialPriority(request.initialPriority);networkRequest.mixedContentType=request.mixedContentType||Protocol.Security.MixedContentType.None;networkRequest.setReferrerPolicy(request.referrerPolicy);}
_updateNetworkRequestWithResponse(networkRequest,response){if(response.url&&networkRequest.url()!==response.url){networkRequest.setUrl(response.url);}
networkRequest.mimeType=response.mimeType;networkRequest.statusCode=response.status;networkRequest.statusText=response.statusText;if(!networkRequest.hasExtraResponseInfo()){networkRequest.responseHeaders=this._headersMapToHeadersArray(response.headers);}
if(response.encodedDataLength>=0){networkRequest.setTransferSize(response.encodedDataLength);}
if(response.requestHeaders&&!networkRequest.hasExtraRequestInfo()){networkRequest.setRequestHeaders(this._headersMapToHeadersArray(response.requestHeaders));networkRequest.setRequestHeadersText(response.requestHeadersText||'');}
networkRequest.connectionReused=response.connectionReused;networkRequest.connectionId=String(response.connectionId);if(response.remoteIPAddress){networkRequest.setRemoteAddress(response.remoteIPAddress,response.remotePort||-1);}
if(response.fromServiceWorker){networkRequest.fetchedViaServiceWorker=true;}
if(response.fromDiskCache){networkRequest.setFromDiskCache();}
if(response.fromPrefetchCache){networkRequest.setFromPrefetchCache();}
networkRequest.timing=response.timing;networkRequest.protocol=response.protocol||'';networkRequest.setSecurityState(response.securityState);if(!this._mimeTypeIsConsistentWithType(networkRequest)){const message=Common.UIString('Resource interpreted as %s but transferred with MIME type %s: "%s".',networkRequest.resourceType().title(),networkRequest.mimeType,networkRequest.url());this._manager.dispatchEventToListeners(Events.MessageGenerated,{message:message,requestId:networkRequest.requestId(),warning:true});}
if(response.securityDetails){networkRequest.setSecurityDetails(response.securityDetails);}}
_mimeTypeIsConsistentWithType(networkRequest){if(networkRequest.hasErrorStatusCode()||networkRequest.statusCode===304||networkRequest.statusCode===204){return true;}
const resourceType=networkRequest.resourceType();if(resourceType!==Common.resourceTypes.Stylesheet&&resourceType!==Common.resourceTypes.Document&&resourceType!==Common.resourceTypes.TextTrack){return true;}
if(!networkRequest.mimeType){return true;}
if(networkRequest.mimeType in _MIMETypes){return resourceType.name()in _MIMETypes[networkRequest.mimeType];}
return false;}
resourceChangedPriority(requestId,newPriority,timestamp){const networkRequest=this._inflightRequestsById[requestId];if(networkRequest){networkRequest.setPriority(newPriority);}}
signedExchangeReceived(requestId,info){let networkRequest=this._inflightRequestsById[requestId];if(!networkRequest){networkRequest=this._inflightRequestsByURL[info.outerResponse.url];if(!networkRequest){return;}}
networkRequest.setSignedExchangeInfo(info);networkRequest.setResourceType(Common.resourceTypes.SignedExchange);this._updateNetworkRequestWithResponse(networkRequest,info.outerResponse);this._updateNetworkRequest(networkRequest);this._manager.dispatchEventToListeners(Events.ResponseReceived,networkRequest);}
requestWillBeSent(requestId,loaderId,documentURL,request,time,wallTime,initiator,redirectResponse,resourceType,frameId){let networkRequest=this._inflightRequestsById[requestId];if(networkRequest){if(!redirectResponse){return;}
if(!networkRequest.signedExchangeInfo()){this.responseReceived(requestId,loaderId,time,Protocol.Network.ResourceType.Other,redirectResponse,frameId);}
networkRequest=this._appendRedirect(requestId,time,request.url);this._manager.dispatchEventToListeners(Events.RequestRedirected,networkRequest);}else{networkRequest=this._createNetworkRequest(requestId,frameId||'',loaderId,request.url,documentURL,initiator);}
networkRequest.hasNetworkData=true;this._updateNetworkRequestWithRequest(networkRequest,request);networkRequest.setIssueTime(time,wallTime);networkRequest.setResourceType(resourceType?Common.resourceTypes[resourceType]:Protocol.Network.ResourceType.Other);this._getExtraInfoBuilder(requestId).addRequest(networkRequest);this._startNetworkRequest(networkRequest);}
requestServedFromCache(requestId){const networkRequest=this._inflightRequestsById[requestId];if(!networkRequest){return;}
networkRequest.setFromMemoryCache();}
responseReceived(requestId,loaderId,time,resourceType,response,frameId){const networkRequest=this._inflightRequestsById[requestId];const lowercaseHeaders=NetworkManager.lowercaseHeaders(response.headers);if(!networkRequest){const eventData={};eventData.url=response.url;eventData.frameId=frameId||'';eventData.loaderId=loaderId;eventData.resourceType=resourceType;eventData.mimeType=response.mimeType;const lastModifiedHeader=lowercaseHeaders['last-modified'];eventData.lastModified=lastModifiedHeader?new Date(lastModifiedHeader):null;this._manager.dispatchEventToListeners(Events.RequestUpdateDropped,eventData);return;}
networkRequest.responseReceivedTime=time;networkRequest.setResourceType(Common.resourceTypes[resourceType]);if('set-cookie'in lowercaseHeaders&&lowercaseHeaders['set-cookie'].length>4096){const values=lowercaseHeaders['set-cookie'].split('\n');for(let i=0;i<values.length;++i){if(values[i].length<=4096){continue;}
const message=Common.UIString('Set-Cookie header is ignored in response from url: %s. Cookie length should be less than or equal to 4096 characters.',response.url);this._manager.dispatchEventToListeners(Events.MessageGenerated,{message:message,requestId:requestId,warning:true});}}
this._updateNetworkRequestWithResponse(networkRequest,response);this._updateNetworkRequest(networkRequest);this._manager.dispatchEventToListeners(Events.ResponseReceived,networkRequest);}
dataReceived(requestId,time,dataLength,encodedDataLength){let networkRequest=this._inflightRequestsById[requestId];if(!networkRequest){networkRequest=this._maybeAdoptMainResourceRequest(requestId);}
if(!networkRequest){return;}
networkRequest.resourceSize+=dataLength;if(encodedDataLength!==-1){networkRequest.increaseTransferSize(encodedDataLength);}
networkRequest.endTime=time;this._updateNetworkRequest(networkRequest);}
loadingFinished(requestId,finishTime,encodedDataLength,shouldReportCorbBlocking){let networkRequest=this._inflightRequestsById[requestId];if(!networkRequest){networkRequest=this._maybeAdoptMainResourceRequest(requestId);}
if(!networkRequest){return;}
this._getExtraInfoBuilder(requestId).finished();this._finishNetworkRequest(networkRequest,finishTime,encodedDataLength,shouldReportCorbBlocking);}
loadingFailed(requestId,time,resourceType,localizedDescription,canceled,blockedReason){const networkRequest=this._inflightRequestsById[requestId];if(!networkRequest){return;}
networkRequest.failed=true;networkRequest.setResourceType(Common.resourceTypes[resourceType]);networkRequest.canceled=!!canceled;if(blockedReason){networkRequest.setBlockedReason(blockedReason);if(blockedReason===Protocol.Network.BlockedReason.Inspector){const message=Common.UIString('Request was blocked by DevTools: "%s".',networkRequest.url());this._manager.dispatchEventToListeners(Events.MessageGenerated,{message:message,requestId:requestId,warning:true});}}
networkRequest.localizedFailDescription=localizedDescription;this._getExtraInfoBuilder(requestId).finished();this._finishNetworkRequest(networkRequest,time,-1);}
webSocketCreated(requestId,requestURL,initiator){const networkRequest=new SDK.NetworkRequest(requestId,requestURL,'','','',initiator||null);networkRequest[_networkManagerForRequestSymbol]=this._manager;networkRequest.setResourceType(Common.resourceTypes.WebSocket);this._startNetworkRequest(networkRequest);}
webSocketWillSendHandshakeRequest(requestId,time,wallTime,request){const networkRequest=this._inflightRequestsById[requestId];if(!networkRequest){return;}
networkRequest.requestMethod='GET';networkRequest.setRequestHeaders(this._headersMapToHeadersArray(request.headers));networkRequest.setIssueTime(time,wallTime);this._updateNetworkRequest(networkRequest);}
webSocketHandshakeResponseReceived(requestId,time,response){const networkRequest=this._inflightRequestsById[requestId];if(!networkRequest){return;}
networkRequest.statusCode=response.status;networkRequest.statusText=response.statusText;networkRequest.responseHeaders=this._headersMapToHeadersArray(response.headers);networkRequest.responseHeadersText=response.headersText||'';if(response.requestHeaders){networkRequest.setRequestHeaders(this._headersMapToHeadersArray(response.requestHeaders));}
if(response.requestHeadersText){networkRequest.setRequestHeadersText(response.requestHeadersText);}
networkRequest.responseReceivedTime=time;networkRequest.protocol='websocket';this._updateNetworkRequest(networkRequest);}
webSocketFrameReceived(requestId,time,response){const networkRequest=this._inflightRequestsById[requestId];if(!networkRequest){return;}
networkRequest.addProtocolFrame(response,time,false);networkRequest.responseReceivedTime=time;this._updateNetworkRequest(networkRequest);}
webSocketFrameSent(requestId,time,response){const networkRequest=this._inflightRequestsById[requestId];if(!networkRequest){return;}
networkRequest.addProtocolFrame(response,time,true);networkRequest.responseReceivedTime=time;this._updateNetworkRequest(networkRequest);}
webSocketFrameError(requestId,time,errorMessage){const networkRequest=this._inflightRequestsById[requestId];if(!networkRequest){return;}
networkRequest.addProtocolFrameError(errorMessage,time);networkRequest.responseReceivedTime=time;this._updateNetworkRequest(networkRequest);}
webSocketClosed(requestId,time){const networkRequest=this._inflightRequestsById[requestId];if(!networkRequest){return;}
this._finishNetworkRequest(networkRequest,time,-1);}
eventSourceMessageReceived(requestId,time,eventName,eventId,data){const networkRequest=this._inflightRequestsById[requestId];if(!networkRequest){return;}
networkRequest.addEventSourceMessage(time,eventName,eventId,data);}
requestIntercepted(interceptionId,request,frameId,resourceType,isNavigationRequest,isDownload,redirectUrl,authChallenge,responseErrorReason,responseStatusCode,responseHeaders,requestId){SDK.multitargetNetworkManager._requestIntercepted(new InterceptedRequest(this._manager.target().networkAgent(),interceptionId,request,frameId,resourceType,isNavigationRequest,isDownload,redirectUrl,authChallenge,responseErrorReason,responseStatusCode,responseHeaders,requestId));}
requestWillBeSentExtraInfo(requestId,blockedCookies,headers){const extraRequestInfo={blockedRequestCookies:blockedCookies.map(blockedCookie=>{return{blockedReasons:blockedCookie.blockedReasons,cookie:SDK.Cookie.fromProtocolCookie(blockedCookie.cookie)};}),requestHeaders:this._headersMapToHeadersArray(headers)};this._getExtraInfoBuilder(requestId).addRequestExtraInfo(extraRequestInfo);}
responseReceivedExtraInfo(requestId,blockedCookies,headers,headersText){const extraResponseInfo={blockedResponseCookies:blockedCookies.map(blockedCookie=>{return{blockedReasons:blockedCookie.blockedReasons,cookieLine:blockedCookie.cookieLine,cookie:blockedCookie.cookie?SDK.Cookie.fromProtocolCookie(blockedCookie.cookie):null};}),responseHeaders:this._headersMapToHeadersArray(headers),responseHeadersText:headersText};this._getExtraInfoBuilder(requestId).addResponseExtraInfo(extraResponseInfo);}
_getExtraInfoBuilder(requestId){if(!this._requestIdToRedirectExtraInfoBuilder.get(requestId)){const deleteCallback=()=>{this._requestIdToRedirectExtraInfoBuilder.delete(requestId);};this._requestIdToRedirectExtraInfoBuilder.set(requestId,new RedirectExtraInfoBuilder(deleteCallback));}
return this._requestIdToRedirectExtraInfoBuilder.get(requestId);}
_appendRedirect(requestId,time,redirectURL){const originalNetworkRequest=this._inflightRequestsById[requestId];let redirectCount=0;for(let redirect=originalNetworkRequest.redirectSource();redirect;redirect=redirect.redirectSource()){redirectCount++;}
originalNetworkRequest.markAsRedirect(redirectCount);this._finishNetworkRequest(originalNetworkRequest,time,-1);const newNetworkRequest=this._createNetworkRequest(requestId,originalNetworkRequest.frameId,originalNetworkRequest.loaderId,redirectURL,originalNetworkRequest.documentURL,originalNetworkRequest.initiator());newNetworkRequest.setRedirectSource(originalNetworkRequest);originalNetworkRequest.setRedirectDestination(newNetworkRequest);return newNetworkRequest;}
_maybeAdoptMainResourceRequest(requestId){const request=SDK.multitargetNetworkManager._inflightMainResourceRequests.get(requestId);if(!request){return null;}
const oldDispatcher=NetworkManager.forRequest(request)._dispatcher;delete oldDispatcher._inflightRequestsById[requestId];delete oldDispatcher._inflightRequestsByURL[request.url()];this._inflightRequestsById[requestId]=request;this._inflightRequestsByURL[request.url()]=request;request[_networkManagerForRequestSymbol]=this._manager;return request;}
_startNetworkRequest(networkRequest){this._inflightRequestsById[networkRequest.requestId()]=networkRequest;this._inflightRequestsByURL[networkRequest.url()]=networkRequest;if(networkRequest.loaderId===networkRequest.requestId()){SDK.multitargetNetworkManager._inflightMainResourceRequests.set(networkRequest.requestId(),networkRequest);}
this._manager.dispatchEventToListeners(Events.RequestStarted,networkRequest);}
_updateNetworkRequest(networkRequest){this._manager.dispatchEventToListeners(Events.RequestUpdated,networkRequest);}
_finishNetworkRequest(networkRequest,finishTime,encodedDataLength,shouldReportCorbBlocking){networkRequest.endTime=finishTime;networkRequest.finished=true;if(encodedDataLength>=0){const redirectSource=networkRequest.redirectSource();if(redirectSource&&redirectSource.signedExchangeInfo()){networkRequest.setTransferSize(0);redirectSource.setTransferSize(encodedDataLength);this._updateNetworkRequest(redirectSource);}else{networkRequest.setTransferSize(encodedDataLength);}}
this._manager.dispatchEventToListeners(Events.RequestFinished,networkRequest);delete this._inflightRequestsById[networkRequest.requestId()];delete this._inflightRequestsByURL[networkRequest.url()];SDK.multitargetNetworkManager._inflightMainResourceRequests.delete(networkRequest.requestId());if(shouldReportCorbBlocking){const message=Common.UIString(`Cross-Origin Read Blocking (CORB) blocked cross-origin response %s with MIME type %s. See https://www.ch40mestatus.qjz9zk/feature/5629709824032768 for more details.`,networkRequest.url(),networkRequest.mimeType);this._manager.dispatchEventToListeners(Events.MessageGenerated,{message:message,requestId:networkRequest.requestId(),warning:true});}
if(Common.moduleSetting('monitoringXHREnabled').get()&&networkRequest.resourceType().category()===Common.resourceCategories.XHR){let message;const failedToLoad=networkRequest.failed||networkRequest.hasErrorStatusCode();if(failedToLoad){message=Common.UIString('%s failed loading: %s "%s".',networkRequest.resourceType().title(),networkRequest.requestMethod,networkRequest.url());}else{message=Common.UIString('%s finished loading: %s "%s".',networkRequest.resourceType().title(),networkRequest.requestMethod,networkRequest.url());}
this._manager.dispatchEventToListeners(Events.MessageGenerated,{message:message,requestId:networkRequest.requestId(),warning:false});}}
_createNetworkRequest(requestId,frameId,loaderId,url,documentURL,initiator){const request=new SDK.NetworkRequest(requestId,url,documentURL,frameId,loaderId,initiator);request[_networkManagerForRequestSymbol]=this._manager;return request;}}
export class MultitargetNetworkManager extends Common.Object{constructor(){super();this._userAgentOverride='';this._agents=new Set();this._inflightMainResourceRequests=new Map();this._networkConditions=NoThrottlingConditions;this._updatingInterceptionPatternsPromise=null;this._blockingEnabledSetting=Common.moduleSetting('requestBlockingEnabled');this._blockedPatternsSetting=Common.settings.createSetting('networkBlockedPatterns',[]);this._effectiveBlockedURLs=[];this._updateBlockedPatterns();this._urlsForRequestInterceptor=new Platform.Multimap();SDK.targetManager.observeModels(NetworkManager,this);}
static patchUserAgentWithChromeVersion(uaString){const chromeRegex=new RegExp('(?:^|\\W)Chrome/(\\S+)');const chromeMatch=navigator.userAgent.match(chromeRegex);if(chromeMatch&&chromeMatch.length>1){const additionalAppVersion=chromeMatch[1].split('.',1)[0]+'.0.100.0';return String.sprintf(uaString,chromeMatch[1],additionalAppVersion);}
return uaString;}
modelAdded(networkManager){const networkAgent=networkManager.target().networkAgent();if(this._extraHeaders){networkAgent.setExtraHTTPHeaders(this._extraHeaders);}
if(this._currentUserAgent()){networkAgent.setUserAgentOverride(this._currentUserAgent());}
if(this._effectiveBlockedURLs.length){networkAgent.setBlockedURLs(this._effectiveBlockedURLs);}
if(this.isIntercepting()){networkAgent.setRequestInterception(this._urlsForRequestInterceptor.valuesArray());}
this._agents.add(networkAgent);if(this.isThrottling()){this._updateNetworkConditions(networkAgent);}}
modelRemoved(networkManager){for(const entry of this._inflightMainResourceRequests){const manager=NetworkManager.forRequest((entry[1]));if(manager!==networkManager){continue;}
this._inflightMainResourceRequests.delete((entry[0]));}
this._agents.delete(networkManager.target().networkAgent());}
isThrottling(){return this._networkConditions.download>=0||this._networkConditions.upload>=0||this._networkConditions.latency>0;}
isOffline(){return!this._networkConditions.download&&!this._networkConditions.upload;}
setNetworkConditions(conditions){this._networkConditions=conditions;for(const agent of this._agents){this._updateNetworkConditions(agent);}
this.dispatchEventToListeners(MultitargetNetworkManager.Events.ConditionsChanged);}
networkConditions(){return this._networkConditions;}
_updateNetworkConditions(networkAgent){const conditions=this._networkConditions;if(!this.isThrottling()){networkAgent.emulateNetworkConditions(false,0,0,0);}else{networkAgent.emulateNetworkConditions(this.isOffline(),conditions.latency,conditions.download<0?0:conditions.download,conditions.upload<0?0:conditions.upload,NetworkManager._connectionType(conditions));}}
setExtraHTTPHeaders(headers){this._extraHeaders=headers;for(const agent of this._agents){agent.setExtraHTTPHeaders(this._extraHeaders);}}
_currentUserAgent(){return this._customUserAgent?this._customUserAgent:this._userAgentOverride;}
_updateUserAgentOverride(){const userAgent=this._currentUserAgent();for(const agent of this._agents){agent.setUserAgentOverride(userAgent);}}
setUserAgentOverride(userAgent){if(this._userAgentOverride===userAgent){return;}
this._userAgentOverride=userAgent;if(!this._customUserAgent){this._updateUserAgentOverride();}
this.dispatchEventToListeners(MultitargetNetworkManager.Events.UserAgentChanged);}
userAgentOverride(){return this._userAgentOverride;}
setCustomUserAgentOverride(userAgent){this._customUserAgent=userAgent;this._updateUserAgentOverride();}
blockedPatterns(){return this._blockedPatternsSetting.get().slice();}
blockingEnabled(){return this._blockingEnabledSetting.get();}
isBlocking(){return!!this._effectiveBlockedURLs.length;}
setBlockedPatterns(patterns){this._blockedPatternsSetting.set(patterns);this._updateBlockedPatterns();this.dispatchEventToListeners(MultitargetNetworkManager.Events.BlockedPatternsChanged);}
setBlockingEnabled(enabled){if(this._blockingEnabledSetting.get()===enabled){return;}
this._blockingEnabledSetting.set(enabled);this._updateBlockedPatterns();this.dispatchEventToListeners(MultitargetNetworkManager.Events.BlockedPatternsChanged);}
_updateBlockedPatterns(){const urls=[];if(this._blockingEnabledSetting.get()){for(const pattern of this._blockedPatternsSetting.get()){if(pattern.enabled){urls.push(pattern.url);}}}
if(!urls.length&&!this._effectiveBlockedURLs.length){return;}
this._effectiveBlockedURLs=urls;for(const agent of this._agents){agent.setBlockedURLs(this._effectiveBlockedURLs);}}
isIntercepting(){return!!this._urlsForRequestInterceptor.size;}
setInterceptionHandlerForPatterns(patterns,requestInterceptor){this._urlsForRequestInterceptor.deleteAll(requestInterceptor);for(const newPattern of patterns){this._urlsForRequestInterceptor.set(requestInterceptor,newPattern);}
return this._updateInterceptionPatternsOnNextTick();}
_updateInterceptionPatternsOnNextTick(){if(!this._updatingInterceptionPatternsPromise){this._updatingInterceptionPatternsPromise=Promise.resolve().then(this._updateInterceptionPatterns.bind(this));}
return this._updatingInterceptionPatternsPromise;}
_updateInterceptionPatterns(){if(!Common.moduleSetting('cacheDisabled').get()){Common.moduleSetting('cacheDisabled').set(true);}
this._updatingInterceptionPatternsPromise=null;const promises=([]);for(const agent of this._agents){promises.push(agent.setRequestInterception(this._urlsForRequestInterceptor.valuesArray()));}
this.dispatchEventToListeners(MultitargetNetworkManager.Events.InterceptorsChanged);return Promise.all(promises);}
async _requestIntercepted(interceptedRequest){for(const requestInterceptor of this._urlsForRequestInterceptor.keysArray()){await requestInterceptor(interceptedRequest);if(interceptedRequest.hasResponded()){return;}}
if(!interceptedRequest.hasResponded()){interceptedRequest.continueRequestWithoutChange();}}
clearBrowserCache(){for(const agent of this._agents){agent.clearBrowserCache();}}
clearBrowserCookies(){for(const agent of this._agents){agent.clearBrowserCookies();}}
getCertificate(origin){const target=SDK.targetManager.mainTarget();return target.networkAgent().getCertificate(origin).then(certificate=>certificate||[]);}
loadResource(url,callback){const headers={};const currentUserAgent=this._currentUserAgent();if(currentUserAgent){headers['User-Agent']=currentUserAgent;}
if(Common.moduleSetting('cacheDisabled').get()){headers['Cache-Control']='no-cache';}
Host.ResourceLoader.load(url,headers,callback);}}
MultitargetNetworkManager.Events={BlockedPatternsChanged:Symbol('BlockedPatternsChanged'),ConditionsChanged:Symbol('ConditionsChanged'),UserAgentChanged:Symbol('UserAgentChanged'),InterceptorsChanged:Symbol('InterceptorsChanged')};export class InterceptedRequest{constructor(networkAgent,interceptionId,request,frameId,resourceType,isNavigationRequest,isDownload,redirectUrl,authChallenge,responseErrorReason,responseStatusCode,responseHeaders,requestId){this._networkAgent=networkAgent;this._interceptionId=interceptionId;this._hasResponded=false;this.request=request;this.frameId=frameId;this.resourceType=resourceType;this.isNavigationRequest=isNavigationRequest;this.isDownload=!!isDownload;this.redirectUrl=redirectUrl;this.authChallenge=authChallenge;this.responseErrorReason=responseErrorReason;this.responseStatusCode=responseStatusCode;this.responseHeaders=responseHeaders;this.requestId=requestId;}
hasResponded(){return this._hasResponded;}
async continueRequestWithContent(contentBlob){this._hasResponded=true;const headers=['HTTP/1.1 200 OK','Date: '+(new Date()).toUTCString(),'Server: Chrome Devtools Request Interceptor','Connection: closed','Content-Length: '+contentBlob.size,'Content-Type: '+contentBlob.type||'text/x-unknown',];const encodedResponse=await blobToBase64(new Blob([headers.join('\r\n'),'\r\n\r\n',contentBlob]));this._networkAgent.continueInterceptedRequest(this._interceptionId,undefined,encodedResponse);async function blobToBase64(blob){const reader=new FileReader();const fileContentsLoadedPromise=new Promise(resolve=>reader.onloadend=resolve);reader.readAsDataURL(blob);await fileContentsLoadedPromise;if(reader.error){console.error('Could not convert blob to base64.',reader.error);return'';}
const result=reader.result;if(result===undefined){console.error('Could not convert blob to base64.');return'';}
return result.substring(result.indexOf(',')+1);}}
continueRequestWithoutChange(){console.assert(!this._hasResponded);this._hasResponded=true;this._networkAgent.continueInterceptedRequest(this._interceptionId);}
continueRequestWithError(errorReason){console.assert(!this._hasResponded);this._hasResponded=true;this._networkAgent.continueInterceptedRequest(this._interceptionId,errorReason);}
async responseBody(){const response=await this._networkAgent.invoke_getResponseBodyForInterception({interceptionId:this._interceptionId});const error=response[Protocol.Error]||null;return{error:error,content:error?null:response.body,encoded:response.base64Encoded};}}
class RedirectExtraInfoBuilder{constructor(deleteCallback){this._requests=[];this._requestExtraInfos=[];this._responseExtraInfos=[];this._finished=false;this._hasExtraInfo=false;this._deleteCallback=deleteCallback;}
addRequest(req){this._requests.push(req);this._sync(this._requests.length-1);}
addRequestExtraInfo(info){this._hasExtraInfo=true;this._requestExtraInfos.push(info);this._sync(this._requestExtraInfos.length-1);}
addResponseExtraInfo(info){this._responseExtraInfos.push(info);this._sync(this._responseExtraInfos.length-1);}
finished(){this._finished=true;this._deleteIfComplete();}
_sync(index){const req=this._requests[index];if(!req){return;}
const requestExtraInfo=this._requestExtraInfos[index];if(requestExtraInfo){req.addExtraRequestInfo(requestExtraInfo);this._requestExtraInfos[index]=null;}
const responseExtraInfo=this._responseExtraInfos[index];if(responseExtraInfo){req.addExtraResponseInfo(responseExtraInfo);this._responseExtraInfos[index]=null;}
this._deleteIfComplete();}
_deleteIfComplete(){if(!this._finished){return;}
if(this._hasExtraInfo){if(!this._requests.peekLast().hasExtraResponseInfo()){return;}}
this._deleteCallback();}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.NetworkManager=NetworkManager;SDK.NetworkManager.Events=Events;SDK.NetworkManager._MIMETypes=_MIMETypes;SDK.NetworkManager.NoThrottlingConditions=NoThrottlingConditions;SDK.NetworkManager.OfflineConditions=OfflineConditions;SDK.NetworkManager.Slow3GConditions=Slow3GConditions;SDK.NetworkManager.Fast3GConditions=Fast3GConditions;SDK.NetworkManager._networkManagerForRequestSymbol=_networkManagerForRequestSymbol;SDK.NetworkManager.MAX_EAGER_POST_REQUEST_BODY_LENGTH=MAX_EAGER_POST_REQUEST_BODY_LENGTH;SDK.NetworkDispatcher=NetworkDispatcher;SDK.MultitargetNetworkManager=MultitargetNetworkManager;SDK.MultitargetNetworkManager.InterceptedRequest=InterceptedRequest;SDK.NetworkManager.BlockedPattern;SDK.NetworkManager.Conditions;SDK.NetworkManager.Message;SDK.MultitargetNetworkManager.InterceptionPattern;SDK.MultitargetNetworkManager.RequestInterceptor;SDK.multitargetNetworkManager;SDK.SDKModel.register(SDK.NetworkManager,SDK.Target.Capability.Network,true);