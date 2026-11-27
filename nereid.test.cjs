const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=vm.runInNewContext(fs.readFileSync(__dirname+'/nereid/game.js','utf8')+'\nNereid');
const seats=Array.from({length:6},(_,i)=>({k:'p',name:'P'+i}));
const s=E.newRound(seats,{},()=>.4);
assert.equal(s.players.filter(p=>p.role==='glitch').length,1);
assert(s.players.every(p=>E.fits(p.x,p.y)));
const tech=s.players.find(p=>p.role==='tech'),bad=s.players.find(p=>p.role==='glitch');
const publicSnap=E.publicState(s);
assert(publicSnap.players.every(p=>!Object.hasOwn(p,'role')&&!Object.hasOwn(p,'tasks')));
assert.equal(E.privateState(s,bad.id).role,'glitch');
assert.equal(E.apply(s,tech.id,{k:'disable',v:bad.id}),false);
assert.equal(E.apply(s,tech.id,{k:'move',x:Infinity,y:0}),false);
assert.equal(E.apply(s,tech.id,{k:'task',v:tech.tasks[0],answer:[0,0,0,9]}),false);
Object.assign(tech,E.stations[tech.tasks[0]]);
assert(E.apply(s,tech.id,{k:'task',v:tech.tasks[0],answer:E.challenge(s,tech,tech.tasks[0])}));
assert.equal(E.publicState(s).done,1);
assert(!E.apply(s,tech.id,{k:'task',v:tech.tasks[0],answer:E.challenge(s,tech,tech.tasks[0])}));
Object.assign(bad,{x:tech.x,y:tech.y});s.t=30;
assert(E.apply(s,bad.id,{k:'disable',v:tech.id}));
assert.equal(tech.alive,false);
const reporter=s.players.find(p=>p.alive&&p.role==='tech');Object.assign(reporter,{x:tech.x,y:tech.y});
assert(E.apply(s,reporter.id,{k:'report'}));
assert.equal(s.ph,'meeting');
assert(!E.apply(s,tech.id,{k:'vote',v:bad.id}));
for(const p of s.players.filter(p=>p.alive))assert(E.apply(s,p.id,{k:'vote',v:bad.id}));
E.step(s,.02);assert.equal(s.ph,'end');assert.equal(s.result,'tech');
const reachable=new Set(),q=[E.meeting];while(q.length){const p=q.pop(),x=Math.floor(p.x/E.T),y=Math.floor(p.y/E.T),key=x+','+y;if(reachable.has(key)||!E.floor[y]?.[x])continue;reachable.add(key);for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]])q.push(E.at(x+a,y+b))}
assert(E.stations.every(p=>reachable.has(Math.floor(p.x/E.T)+','+Math.floor(p.y/E.T))));
const bot=E.newRound(Array.from({length:6},(_,i)=>({k:i?'cpu':'p'})),{},()=>.41);
for(let i=0;i<1200;i++)E.step(bot,.05);
assert(bot.players.every(p=>E.fits(p.x,p.y)));
console.log('Nereid: roles, privacy, validated actions, tasks, report, vote, map connectivity and bot movement passed.');

for(let id=0;id<E.stations.length;id++){const pattern=E.challenge(s,tech,id);assert.equal(pattern.length,4);assert(pattern.every(v=>Number.isInteger(v)&&v>=0&&v<4));if(E.stations[id].kind==='sort'){assert.equal(new Set(pattern).size,4);const vals=E.sortValues(pattern);assert.deepEqual(Array.from(pattern.map(i=>vals[i])),[12,29,47,81]);}if(E.stations[id].kind==='route'){assert.equal(E.routePath(pattern).length,5);assert(E.routePath(pattern).every(([x,y])=>x>=0&&x<=8&&y>=0&&y<=8));}}
assert.equal(E.vision(E.meeting,320).length,112);
const witnessGame=E.newRound(seats,{},()=>.4);const g1=witnessGame.players.find(p=>p.role==='glitch'),crew=witnessGame.players.filter(p=>p.role==='tech');for(const p of [g1,...crew])Object.assign(p,{x:E.meeting.x,y:E.meeting.y});witnessGame.t=30;assert(E.apply(witnessGame,g1.id,{k:'disable',v:crew[0].id}));assert.equal(crew[1].evidence.id,g1.id);assert(E.publicState(witnessGame).players.every(p=>!Object.hasOwn(p,'evidence')));
console.log('Nereid v2 task variants, visibility and private witness evidence passed.');

assert(E.publicState(bot).done>0,'Bots must complete at least one assignment in a simulated minute');

assert.equal(E.rooms.length,10);assert.equal(E.stations.length,11);assert(E.stations.every(p=>reachable.has(Math.floor(p.x/E.T)+','+Math.floor(p.y/E.T))));
assert.equal(E.location(E.stations[7]),'OBSERVATORIUM');assert.equal(E.location(E.stations[8]),'ALGENZUCHT');
assert.equal(E.guidance(E.meeting,[0,1],[0]).id,1);assert.equal(E.guidance(E.meeting,[0],[0]),null);
for(const id of [7,8]){const s=E.newRound(seats,{tasks:5},()=>.4),p=s.players.find(q=>q.role==='tech');p.tasks=[id];Object.assign(p,E.stations[id]);assert(E.apply(s,p.id,{k:'task',v:id,answer:E.challenge(s,p,id)}));assert.equal(p.done[0],id);}
console.log('Nereid v3 expanded map, guidance and new task types passed.');

const lobby=E.normalizeLobby({x:9999,y:-20,style:8,ready:true});assert.equal(lobby.x,930);assert.equal(lobby.y,130);assert.equal(lobby.style,0);assert.equal(lobby.ready,true);
const spec=E.newRound(Array.from({length:8},(_,i)=>({k:'p',style:i%4})),{two:true,special:true},()=>.4);const analyst=spec.players.find(p=>p.special==='analyst'),support=spec.players.find(p=>p.special==='support');assert(analyst&&support);assert.equal(E.publicState(spec).players.some(p=>Object.hasOwn(p,'special')),false);assert.equal(E.privateState(spec,analyst.id).special,'analyst');
assert(E.apply(spec,analyst.id,{k:'scan'}));assert.equal(E.privateState(spec,analyst.id).scan.counts.length,10);assert(!E.apply(spec,analyst.id,{k:'scan'}));assert(!Object.hasOwn(E.publicState(spec),'scan'));
spec.alert={kind:'pressure',station:6,until:50};assert(E.apply(spec,support.id,{k:'stabilize'}));assert.equal(spec.alert.until,62);assert(!E.apply(spec,support.id,{k:'stabilize'}));assert.equal(E.privateState(spec,support.id).specialUsed,true);
const plain=E.newRound(seats,{special:false},()=>.4);assert(plain.players.every(p=>!p.special));console.log('Nereid v4 lobby bounds, cosmetic states, private roles, scan cooldown and one-use support passed.');

assert.equal(new Set(E.stations.map(p=>p.kind)).size,8);assert.equal(s.verdict.out,bad.id);assert.equal(s.verdict.cast,s.verdict.eligible);assert(!Object.hasOwn(publicSnap,'verdict'));
for(const id of [9,10]){const r=E.newRound(seats,{tasks:3},()=>.4),p=r.players.find(q=>q.role==='tech');p.tasks=[id];Object.assign(p,E.stations[id]);const pattern=E.challenge(r,p,id);assert(!E.apply(r,p.id,{k:'task',v:id,answer:[9,9,9,9]}));assert(E.apply(r,p.id,{k:'task',v:id,answer:pattern}));assert.equal(p.done[0],id)}
console.log('Nereid v5 archive and cargo tasks, private voting, result tally passed.');

assert(E.stations.every(p=>reachable.has(Math.floor(p.x/E.T)+','+Math.floor(p.y/E.T))));
const source=fs.readFileSync(__dirname+'/nereid/game.js','utf8');
assert(source.includes("const stableKey='meeting:'+s.rn+':'+s.meetingStarted"));
assert(source.includes("const key='hangar:'+code+':'+my"));
assert(!source.includes("s.notes,Math.ceil(s.meetingEnd-s.t)"));
console.log('Abyss v6 stable meeting/hangar keys and expanded connection graph passed.');
