const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const moduleRef={exports:{}};
vm.runInNewContext(fs.readFileSync(__dirname+'/pulse-arena.js','utf8'),{module:moduleRef});
const {maps,player,makeState,simulate}=moduleRef.exports;
for(let m=0;m<maps.length;m++)test('Arena '+m+': stable movement and bounded state',()=>{
 const p=player(0,'A'),q=player(1,'B',true),s=makeState(m,[p,q],100,120);
 for(let i=0;i<1800;i++)simulate(s,{0:{x:1,z:1,a:Math.sin(i/200)*2,jump:i%120===0,fire:i%15===0,kit:2}},1/60);
 assert.ok(s.p.every(p=>Number.isFinite(p.x)&&Math.abs(p.x)<=16&&Math.abs(p.z)<=16&&p.y>=0));
 assert.ok(s.orbs.length<=48);assert.ok(q.lap>0,'bot advances through patrol points');assert.ok(s.time>89&&s.time<91);
});
test('Round timeout and held jump',()=>{const p=player(0,'A'),s=makeState(0,[p],10,1);for(let i=0;i<90;i++)simulate(s,{0:{jump:true}},1/60);assert.equal(s.ph,'end');assert.equal(p.y,0);});
test('Menu, PWA and room rule registration',()=>{const html=fs.readFileSync(__dirname+'/index.html','utf8'),sw=fs.readFileSync(__dirname+'/service-worker.js','utf8'),r=JSON.parse(fs.readFileSync(__dirname+'/firebase/database.rules.json','utf8')).rules.rooms.$code;assert.match(html,/id:'pulsearena'/);assert.ok(html.includes('pulse-arena.js?v=7'));assert.ok(sw.includes('pulse-arena.js?v=7'));assert.match(r.game['.validate'],/pulsearena/);assert.match(r.loadouts.$seat['.write'],/auth.uid/);});

test('Robot shield, deactivation and respawn',()=>{const a=player(0,'A'),b=player(1,'B'),s=makeState(0,[a,b],100,120);b.hp=1;b.shield=0;s.orbs.push({id:1,o:0,k:0,x:b.x,z:b.z,y:.8,a:0,pitch:0,t:1});simulate(s,{},1/60);assert.equal(b.hp,0);assert.ok(b.down>0);assert.equal(a.score,1);for(let i=0;i<160;i++)simulate(s,{},1/60);assert.equal(b.hp,100);assert.equal(b.down,0);assert.ok(b.shield>0);});
test('Vertical camera input bounds',()=>{assert.equal(moduleRef.exports.clean({pitch:10}).pitch,.7);assert.equal(moduleRef.exports.clean({pitch:-10}).pitch,-.65);});

for(let map=0;map<3;map++)test('Bots explore map '+map,()=>{const p=player(0,'A'),b=player(1,'Bot',true),c=player(2,'Bot2',true),s=makeState(map,[p,b,c],100,120),seen=[new Set(),new Set()];for(let i=0;i<3600;i++){simulate(s,{0:{a:0}},1/60);[b,c].forEach((q,k)=>seen[k].add(Math.round(q.x/3)+','+Math.round(q.z/3)));}assert.ok(seen.every(v=>v.size>=12));});
test('Overlapping robot bodies separate',()=>{const a=player(0,'A'),b=player(1,'B');b.x=a.x;b.z=a.z;const s=makeState(0,[a,b]);simulate(s,{},1/60);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=.8);});

test('Online state rejects malformed snapshots',()=>{const valid=moduleRef.exports.validSnapshot,s=makeState(0,[player(0,'A')]);assert.ok(valid(s));for(const patch of [{round:-1},{round:1.5},{serial:-1},{map:99},{seq:-1},{time:200},{p:[{i:0}]},{orbs:Array(49).fill({})}])assert.equal(valid({...s,...patch}),false);});

for(let map=0;map<3;map++)test('New round resets transient state on map '+map,()=>{const first=makeState(map,[player(0,'A'),player(1,'B',true)],15,60,7);for(let i=0;i<600;i++)simulate(first,{},1/60);assert.ok(moduleRef.exports.validSnapshot(first));const next=makeState(map,[player(0,'A'),player(1,'B',true)],15,120,8);assert.equal(next.round,8);assert.equal(next.time,120);assert.equal(next.orbs.length,0);assert.ok(next.p.every(p=>p.score===0&&p.hp===100));});

function makeHarness(src){
 const storage=new Map(),errors=[],frames=new Map();let id=0,root=null,clock=0;
 const ctx={createLinearGradient(){return {addColorStop(){}}},fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},fillText(){}};
 function el(){const children=new Map();return {dataset:{},style:{},events:{},classList:{toggle(){}},innerHTML:'',value:'',textContent:'',scrollTop:0,hidden:false,addEventListener(k,f){this.events[k]=f;},removeEventListener(k){delete this.events[k];},querySelector(k){if(!children.has(k))children.set(k,el());return children.get(k);},setAttribute(k,v){this[k]=v;},cloneNode(){return el();},replaceWith(){},remove(){},getBoundingClientRect(){return {width:800,height:600,left:0,top:0};},getContext(k){return k==='2d'?ctx:null;}};}
 const document=el();document.body={append(v){root=v;}};document.createElement=()=>el();document.pointerLockElement=null;
 const window=el(),localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const api={window,document,localStorage,devicePixelRatio:1,performance:{now:()=>clock},OL:{name:'Test'},LUN:{},requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i),luErr:e=>{errors.push(String(e));return String(e);},toast:t=>errors.push(t)};
 new Function(...Object.keys(api),src)(...Object.values(api));const game=window.createPulseArena();game.showSetup();
 const click=async action=>{const b={dataset:{pa:action},setAttribute(){}};await root.events.click({target:{closest:()=>b}});};
 const tick=(count=1)=>{for(let n=0;n<count;n++){clock+=1000/60;const list=[...frames.values()];frames.clear();for(const f of list)f(clock);}};
 return {game,click,tick,errors,storage,get phase(){return root.dataset.phase;},get ui(){return root.querySelector('.pa-ui');},get frameCount(){return frames.size;}};
}

test('Offline menu lifecycle and fallback rendering: start, pause, resume, mute, leave',async()=>{const h=makeHarness(fs.readFileSync(__dirname+'/pulse-arena.js','utf8'));assert.equal(h.phase,'setup');h.tick();await h.click('solo');assert.equal(h.phase,'play');h.tick(120);assert.deepEqual(h.errors,[]);await h.click('pause');assert.ok(h.ui.innerHTML.includes('Weiterspielen'));h.tick(20);await h.click('pause');assert.ok(!h.ui.innerHTML.includes('Weiterspielen'));h.tick(20);await h.click('sound');assert.equal(JSON.parse(h.storage.get('pulseArenaView')).muted,true);h.game.leave();assert.equal(h.frameCount,0);});
