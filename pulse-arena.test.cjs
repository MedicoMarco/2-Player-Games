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
test('Menu, PWA and room rule registration',()=>{const html=fs.readFileSync(__dirname+'/index.html','utf8'),sw=fs.readFileSync(__dirname+'/service-worker.js','utf8'),r=JSON.parse(fs.readFileSync(__dirname+'/firebase/database.rules.json','utf8')).rules.rooms.$code;assert.match(html,/id:'pulsearena'/);assert.ok(html.includes('pulse-arena.js?v=4'));assert.ok(sw.includes('pulse-arena.js?v=4'));assert.match(r.game['.validate'],/pulsearena/);assert.match(r.loadouts.$seat['.write'],/auth.uid/);});

test('Robot shield, deactivation and respawn',()=>{const a=player(0,'A'),b=player(1,'B'),s=makeState(0,[a,b],100,120);b.hp=1;b.shield=0;s.orbs.push({id:1,o:0,k:0,x:b.x,z:b.z,y:.8,a:0,pitch:0,t:1});simulate(s,{},1/60);assert.equal(b.hp,0);assert.ok(b.down>0);assert.equal(a.score,1);for(let i=0;i<160;i++)simulate(s,{},1/60);assert.equal(b.hp,100);assert.equal(b.down,0);assert.ok(b.shield>0);});
test('Vertical camera input bounds',()=>{assert.equal(moduleRef.exports.clean({pitch:10}).pitch,.7);assert.equal(moduleRef.exports.clean({pitch:-10}).pitch,-.65);});

for(let map=0;map<3;map++)test('Bots explore map '+map,()=>{const p=player(0,'A'),b=player(1,'Bot',true),c=player(2,'Bot2',true),s=makeState(map,[p,b,c],100,120),seen=[new Set(),new Set()];for(let i=0;i<3600;i++){simulate(s,{0:{a:0}},1/60);[b,c].forEach((q,k)=>seen[k].add(Math.round(q.x/3)+','+Math.round(q.z/3)));}assert.ok(seen.every(v=>v.size>=12));});
test('Overlapping robot bodies separate',()=>{const a=player(0,'A'),b=player(1,'B');b.x=a.x;b.z=a.z;const s=makeState(0,[a,b]);simulate(s,{},1/60);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=.8);});

test('Online state rejects malformed snapshots',()=>{const valid=moduleRef.exports.validSnapshot,s=makeState(0,[player(0,'A')]);assert.ok(valid(s));for(const patch of [{map:99},{seq:-1},{time:200},{p:[{i:0}]},{orbs:Array(49).fill({})}])assert.equal(valid({...s,...patch}),false);});
