const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const source=html.slice(html.indexOf('const PROG_KEYS='),html.indexOf("addEventListener('visibilitychange',()=>{if(document.hidden&&progT)"));
const copy=v=>JSON.parse(JSON.stringify(v));
const writes=[];
let fail=false,hold=null;
const S={prs:0,high:{pong:5,tennis:4},ach:{first:1},sk:[0,1]};
const OL={me:'test',pready:true,db:{ref:path=>({
 set:async data=>{writes.push({path,set:copy(data)});if(fail)throw Error('Offline');if(hold)await hold},
 update:async data=>{writes.push({path,update:copy(data)});if(fail)throw Error('Offline');if(hold)await hold}
})}};
const api=vm.runInNewContext(source+'\n;({progDelta,progPush,progOut,setState:s=>progState=s})',{S,OL,toast(){},setTimeout,clearTimeout});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const initial={...copy(S),rs:0,ts:1};delete initial.prs;
 const state={uid:'test',ack:initial,busy:false,again:false};
 api.setState(state);
 api.progPush(1);await settle();assert.equal(writes.length,0,'unchanged progress is not uploaded');
 S.high.pong=7;api.progPush(1);await settle();
 assert.equal(writes.length,1);assert.deepEqual(Object.keys(writes[0].update).sort(),['high/pong','ts']);
 assert.equal(writes[0].update['high/pong'],7);
 assert.equal(state.ack.high.tennis,4);
 fail=true;S.high.tennis=8;api.progPush(1);await settle();
 assert.equal(state.ack.high.tennis,4,'failed write cannot advance acknowledged baseline');
 fail=false;api.progPush(1);await settle();assert.equal(state.ack.high.tennis,8);
 let release;hold=new Promise(resolve=>release=resolve);
 S.high.pong=9;api.progPush(1);await settle();
 S.high.pong=10;api.progPush(1);hold=null;release();await settle();await settle();
 assert.equal(state.ack.high.pong,10,'in-flight change is queued');
 S.prs=123;S.high={};S.ach={};api.progPush(1);await settle();
 assert.equal(writes.at(-1).set.rs,123,'explicit reset uses full snapshot');
 assert.deepEqual(writes.at(-1).set.high,{});
 OL.me='other';api.progPush(1);await settle();assert.equal(writes.at(-1).path,'users/test/progress');
 assert.deepEqual(copy(api.progDelta({ts:1,rs:0,sk:[0,1]},{ts:2,rs:0,sk:{0:0,1:1}})),{});
 console.log('Shared progress: unchanged data, partial writes, retry, in-flight updates, explicit reset and account isolation passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
