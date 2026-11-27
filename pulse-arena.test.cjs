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
 assert.ok(s.orbs.length<=48);assert.ok(s.time>89&&s.time<91);
});
test('Round timeout and held jump',()=>{const p=player(0,'A'),s=makeState(0,[p],10,1);for(let i=0;i<90;i++)simulate(s,{0:{jump:true}},1/60);assert.equal(s.ph,'end');assert.equal(p.y,0);});
test('Menu, PWA and room rule registration',()=>{const html=fs.readFileSync(__dirname+'/index.html','utf8'),sw=fs.readFileSync(__dirname+'/service-worker.js','utf8'),r=JSON.parse(fs.readFileSync(__dirname+'/firebase/database.rules.json','utf8')).rules.rooms.$code;assert.match(html,/id:'pulsearena'/);assert.ok(html.includes('pulse-arena.js?v=1'));assert.ok(sw.includes('pulse-arena.js?v=1'));assert.match(r.game['.validate'],/pulsearena/);assert.match(r.loadouts.$seat['.write'],/auth.uid/);});
