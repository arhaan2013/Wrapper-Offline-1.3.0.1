export class ChunkedReader{fileSize(){}
loadedSize(){}
fileName(){}
cancel(){}
error(){}}
export class ChunkedFileReader{constructor(blob,chunkSize,chunkTransferredCallback){this._file=blob;this._fileSize=blob.size;this._loadedSize=0;this._chunkSize=chunkSize;this._chunkTransferredCallback=chunkTransferredCallback;this._decoder=new TextDecoder();this._isCanceled=false;this._error=null;}
read(output){if(this._chunkTransferredCallback){this._chunkTransferredCallback(this);}
this._output=output;this._reader=new FileReader();this._reader.onload=this._onChunkLoaded.bind(this);this._reader.onerror=this._onError.bind(this);this._loadChunk();return new Promise(resolve=>this._transferFinished=resolve);}
cancel(){this._isCanceled=true;}
loadedSize(){return this._loadedSize;}
fileSize(){return this._fileSize;}
fileName(){return this._file.name;}
error(){return this._error;}
_onChunkLoaded(event){if(this._isCanceled){return;}
if(event.target.readyState!==FileReader.DONE){return;}
const buffer=this._reader.result;this._loadedSize+=buffer.byteLength;const endOfFile=this._loadedSize===this._fileSize;const decodedString=this._decoder.decode(buffer,{stream:!endOfFile});this._output.write(decodedString);if(this._isCanceled){return;}
if(this._chunkTransferredCallback){this._chunkTransferredCallback(this);}
if(endOfFile){this._file=null;this._reader=null;this._output.close();this._transferFinished(!this._error);return;}
this._loadChunk();}
_loadChunk(){const chunkStart=this._loadedSize;const chunkEnd=Math.min(this._fileSize,chunkStart+this._chunkSize);const nextPart=this._file.slice(chunkStart,chunkEnd);this._reader.readAsArrayBuffer(nextPart);}
_onError(event){this._error=event.target.error;this._transferFinished(false);}}
export class FileOutputStream{async open(fileName){this._closed=false;this._writeCallbacks=[];this._fileName=fileName;const saveResponse=await Workspace.fileManager.save(this._fileName,'',true);if(saveResponse){Workspace.fileManager.addEventListener(Workspace.FileManager.Events.AppendedToURL,this._onAppendDone,this);}
return!!saveResponse;}
write(data){return new Promise(resolve=>{this._writeCallbacks.push(resolve);Workspace.fileManager.append(this._fileName,data);});}
async close(){this._closed=true;if(this._writeCallbacks.length){return;}
Workspace.fileManager.removeEventListener(Workspace.FileManager.Events.AppendedToURL,this._onAppendDone,this);Workspace.fileManager.close(this._fileName);}
_onAppendDone(event){if(event.data!==this._fileName){return;}
this._writeCallbacks.shift()();if(this._writeCallbacks.length){return;}
if(!this._closed){return;}
Workspace.fileManager.removeEventListener(Workspace.FileManager.Events.AppendedToURL,this._onAppendDone,this);Workspace.fileManager.close(this._fileName);}}
self.Bindings=self.Bindings||{};Bindings=Bindings||{};Bindings.ChunkedReader=ChunkedReader;Bindings.ChunkedFileReader=ChunkedFileReader;Bindings.FileOutputStream=FileOutputStream;