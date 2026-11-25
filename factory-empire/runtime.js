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
 return {validSave,revision,openSaveStorage,step};
})();
