/* Shared save identity and time-budgeted runs of the fixed simulation tick. */
const FactoryRuntime=(()=>{
function validSave(value){
 if(!value||typeof value!=='object'||!Number.isFinite(value.ts)||value.ts<=0||!Number.isFinite(value.m))return false;
 if(value.transportVersion!=null&&value.transportVersion!==1&&value.transportVersion!==2)return false;
 if(value.v===4)return [0,1].every(i=>Number.isInteger(value.yardRows?.[i])&&value.yardRows[i]>=0&&value.yardRows[i]<=FactoryYard.trim);
 return value.v===1||value.v===2||value.v===3||value.v==null&&('ar' in value||'o' in value);
}
function revision(value){
 if(value==null)return '';
 if(!validSave(value))return 'invalid';
 return typeof value.rev=='string'&&value.rev?value.rev:'legacy:'+value.ts;
}

/* Keep the local snapshot schema unchanged. Old clients reject the envelope
   as unsupported rather than interpreting it as a new, empty factory. */
const CLOUD_FORMAT='factory-json-v1',CHUNK_SIZE=128*1024;
function cloudRevision(value){
 if(value?.format!==CLOUD_FORMAT)return revision(value);
 return typeof value.rev==='string'&&value.rev&&Number.isFinite(value.ts)&&value.ts>0?value.rev:'invalid';
}
function splitPayload(payload){
 const parts=[];
 for(let i=0;i<payload.length;){
  let end=Math.min(i+CHUNK_SIZE,payload.length);
  if(end<payload.length&&/[\uD800-\uDBFF]/.test(payload[end-1]))end--;
  parts.push(payload.slice(i,end));i=end;
 }
 return parts;
}
const byteSize=value=>typeof Blob==='function'?new Blob([value]).size:value.length;
async function packCloudSave(value){
 if(!validSave(value)||typeof value.rev!=='string'||!value.rev)throw new Error('Invalid local save');
 const json=JSON.stringify(value);
 let codec='json',payload=json;
 if(typeof CompressionStream==='function'&&typeof DecompressionStream==='function'&&typeof Blob==='function'&&typeof Response==='function'&&typeof btoa==='function'&&typeof atob==='function'){
  try{
   const bytes=new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
   let binary='';
   for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   const compressed=btoa(binary);
   if(compressed.length<byteSize(json)){codec='gzip-base64';payload=compressed}
  }catch{/* JSON remains a lossless and portable fallback. */}
 }
 return {format:CLOUD_FORMAT,rev:value.rev,ts:value.ts,codec,parts:splitPayload(payload)};
}
async function unpackCloudSave(value){
 if(value?.format!==CLOUD_FORMAT)return value;
 if(!Array.isArray(value.parts)||!value.parts.length||value.parts.some(part=>typeof part!=='string'||!part.length))throw new Error('Invalid cloud save parts');
 let json=value.parts.join('');
 if(value.codec==='gzip-base64'){
  if(typeof DecompressionStream!=='function'||typeof atob!=='function'||typeof Blob!=='function'||typeof Response!=='function')throw new Error('Cloud save requires a newer browser');
  const bytes=Uint8Array.from(atob(json),ch=>ch.charCodeAt(0));
  json=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 }else if(value.codec!=='json')throw new Error('Unknown cloud save encoding');
 const decoded=JSON.parse(json);
 if(!validSave(decoded)||revision(decoded)!==cloudRevision(value)||decoded.ts!==value.ts)throw new Error('Invalid cloud save identity');
 return decoded;
}

function openSaveStorage(){
 if(typeof indexedDB==='undefined')return null;
 return new Promise(resolve=>{
  let request;
  try{request=indexedDB.open('2pg-factory-saves',1)}catch{resolve(null);return}
  let expired=false;
  const timeout=setTimeout(()=>{expired=true;resolve(null)},1500);
  request.onupgradeneeded=()=>request.result.createObjectStore('saves');
  request.onblocked=request.onerror=()=>{clearTimeout(timeout);resolve(null)};
  request.onsuccess=()=>{
   clearTimeout(timeout);
   const db=request.result;
   if(expired){db.close();return}
   db.onversionchange=()=>db.close();
   resolve({
    read(keys){
     return new Promise((ok,fail)=>{
      const matches=new Map(),tx=db.transaction('saves','readonly'),store=tx.objectStore('saves');
      const deadline=setTimeout(()=>fail(new Error('IndexedDB read timeout')),2000);
      tx.oncomplete=()=>{clearTimeout(deadline);ok(matches)};
      tx.onabort=()=>{clearTimeout(deadline);fail(tx.error)};
      for(const key of keys){
       const request=store.openCursor(IDBKeyRange.bound(key,key+'.\uffff'));
       request.onsuccess=()=>{
        const cursor=request.result;
        if(cursor){
         if(cursor.key===key||cursor.key.startsWith(key+'.'))matches.set(cursor.key,cursor.value);
         cursor.continue();
        }
       };
      }
     });
    },
    write(key,value){
     return new Promise((ok,fail)=>{
      const tx=db.transaction('saves','readwrite');
      tx.oncomplete=()=>ok();tx.onabort=()=>fail(tx.error);
      tx.objectStore('saves').put(value,key);
     });
    }
   });
  };
 });
}
function step(steps,tick,budget=14){
 const start=Date.now();
 let ran=0;
 while(ran<steps){
  const limit=Math.min(steps,ran+64);
  for(;ran<limit;ran++)tick();
  if(steps>40&&Date.now()-start>=budget)break;
 }
 return ran;
}
 return {validSave,revision,cloudRevision,packCloudSave,unpackCloudSave,byteSize,openSaveStorage,step};
})();
