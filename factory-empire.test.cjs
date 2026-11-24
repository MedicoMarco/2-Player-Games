const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(require('node:path').join(__dirname, 'index.html'), 'utf8');
const root = require('node:path');
const factoryScripts = [...html.matchAll(/<script src="\.\/(factory-empire\/[^"?]+\.js)(\?[^"]*)?"><\/script>/g)]
 .map(([, file, query]) => ({ file, url: file+(query||''), source: fs.readFileSync(root.join(__dirname, file), 'utf8') }));
assert(factoryScripts.length >= 3);
const data = new Map();
let clock = Date.now();
let overlay = '';
const renderErrors=[];
const scope = {
 window: { NOFIN: true },
 console: { error: (...args) => renderErrors.push(args) },
 setTimeout, clearTimeout,
 Date: class extends Date { static now() { return clock; } },
 OL: {},
 localStorage: { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) },
 toast() {}, showOv(markup) { overlay = markup; }, bd() {}, bgc() {},
 c: new Proxy({
  measureText: value => ({ width: String(value).length * 6 }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} })
 }, { get: (target, key) => target[key] || (() => {}) }),
 cv: { getBoundingClientRect: () => ({ width: 800 }) },
 V: { pw: 800, ph: 480 }
};
const context = vm.createContext(scope);
for (const script of factoryScripts) vm.runInContext(script.source, context, { filename: script.file });
const factory = vm.runInContext('fabrik', context);
const play = factory();
play.update(0);
const core = () => play.dbg();

function ticks(count) {
 for (let i = 0; i < count; i++) core().tick();
}
function load(objects = [], setup = {}) {
 core().init({ v: 2, m: 1e6, o: objects, ...setup });
 core().analyze();
 return core();
}
function save() {
 core().sv(1);
 return JSON.parse(data.get('2pg_fe_demo'));
}

let d = load([
 [7, 6, 'src', 0, 1], [8, 6, 'belt', 0, 1], [9, 6, 'saw', 0, 1],
 [10, 6, 'belt', 0, 1], [11, 6, 'shp', 0, 1]
], { m: 120 });
ticks(480);
assert(d.G.sold > 10);
assert(d.G.m > 150);

d = load([
 [10, 6, 'saw', 0, 1, -1, [0], -1, 0, 0, { wk: true, p: 3.875, pq: 132 }],
 [11, 6, 'belt', 0, 1], [12, 6, 'sto', 0, 1]
]);
ticks(3);
assert.equal(d.G.pc[1], 1);
assert.deepEqual(Array.from(d.L[2].q), [1]);
assert.equal(d.L[2].qq[0], 100);
d = load(save().o);
assert.equal(d.L[2].qq[0], 100);

const retiredMachine={up:{speed:5,quality:4,material:5,capacity:4,automation:1},spec:'precision',paused:true,priority:true,control:2};
const retiredSetup={m:1e6,epoch:4,stock:{production:5},activeBoosts:{production:100000},emp:{d:12,w:7,a:9}};
const ordinary=[[10,6,'saw',0,1,-1,[5]],[11,6,'shp',0,1]];
d=load(ordinary);
const ordinaryTime=d.tme(d.L[0]);
ticks(400);
const ordinaryMoney=d.G.m;
d=load([[...ordinary[0],-1,0,0,retiredMachine],ordinary[1]],retiredSetup);
assert.equal(d.tme(d.L[0]),ordinaryTime);
assert.equal(d.inputCap(d.L[0],0),2);
assert.equal(d.fx().WG,0);
d.sel(d.L[0]);
play.draw();
assert(!core().tuD().HB.some(hit=>hit.id==='advanced'));
assert(core().tuD().HB.some(hit=>hit.id==='upg'));
ticks(400);
assert.equal(d.G.sold,5);
assert.equal(d.G.m,ordinaryMoney);
assert.equal(d.L[0].iv[0],0);
const previousExpansion=save();
assert.deepEqual(previousExpansion.o[0][10].up,retiredMachine.up);
assert.equal(previousExpansion.o[0][10].paused,true);
assert.equal(previousExpansion.epoch,4);
assert.equal(previousExpansion.emp.d,12);
assert.deepEqual(previousExpansion.stock,retiredSetup.stock);

d = load([
 [7, 6, 'belt', 0, 1, 1, 0, -1, 0, 0, { iq: 132 }],
 [8, 6, 'spl', 0, 1], [9, 6, 'qa', 0, 1], [10, 6, 'sto', 0, 1]
]);
ticks(16);
assert.deepEqual(Array.from(d.L[3].q), [1]);
assert.equal(d.L[3].qq[0], 132);

d = load([[7, 6, 'qa', 0, 1, 1], [8, 6, 'sto', 0, 1], [7, 7, 'sto', 0, 1]]);
ticks(4);
assert.deepEqual(Array.from(d.L[1].q),[1]);
assert.equal(d.L[2].q.length,0);

d = load([[7, 6, 'saw', 0, 1, -1, [1], -1, 0, 0], [8, 6, 'shp', 0, 1]]);
ticks(17);
const mid = save();
assert.equal(mid.o[0][10].wk, true);
assert.equal(mid.o[0][6][0], 0);
d = load(mid.o, { sold: mid.sold, pc: mid.pc });
ticks(80);
assert.equal(d.G.sold, mid.sold + 1);
assert.equal(d.G.pc[1], 1);
console.log('Starter, original machine levels, retired machine settings and in-progress saves passed.');

d=load([
 [8,8,'sto',0,1],
 [10,8,'hub',0,1,-1,0,-1,0,0,{large:true}]
],{hl:{gar:3}});
const hub=d.cell(11,9);
assert.equal(hub,d.cell(10,8));
assert(!d.place(6,9,'hub',0));
assert(!d.place(11,9,'belt',0));
assert(!d.moveObj(hub,7,8));
assert(d.moveObj(hub,12,8));
assert.equal(d.cell(13,9),hub);
const savedHub=save();
d=load(savedHub.o,savedHub);
assert.equal(d.cell(13,9),d.cell(12,8));
assert(d.previewPlan(d.makePlan([d.cell(12,8)]),7,3).error);
d=load([[18,45,'cellFab',0,1,-1,0,-1,0,0,{large:true}],[23,45,'sto',0,1]],{hl:{gar:1,hit:1}});
const copied = d.makePlan([d.cell(18,45),d.cell(23,45)]);
const preview = d.previewPlan(copied,18,49);
assert.equal(preview.error, '');
assert(d.commitBuild(preview));
assert.equal(d.cell(19,50),d.cell(18,49));
assert(!d.commitBuild(preview));

d = load([[7, 6, 'src', 0, 1], [10, 6, 'grid', 0, 1], [13, 6, 'shp', 0, 1]]);
const route = d.planRoute(d.cell(7, 6), d.cell(13, 6));
assert(route && route.rows.length > 5);
assert(!route.rows.some(row => row.x === 10 && row.y === 6));
assert(d.commitBuild(route));
ticks(200);
assert(d.G.sold > 4);
assert(d.connectedLine(d.cell(7, 6)).includes(d.cell(13, 6)));

d = load([
 [7, 6, 'src', 0, 5], [8, 6, 'tunnel', 0, 1], [9, 6, 'grid', 0, 1],
 [12, 6, 'tunnel', 0, 1], [13, 6, 'shp', 0, 1]
], { rs: ['bel2'] });
ticks(160);
assert(d.G.sold > 4);

d = load([
 [7, 6, 'sort', 0, 1, 1, 0, -1, 0, 0, { sortRule: 1 }],
 [8, 6, 'sto', 0, 1], [7, 7, 'sto', 0, 1]
], { rs: ['lag'] });
ticks(3);
assert.equal(d.cell(8, 6).q.length, 0);
assert.deepEqual(Array.from(d.cell(7, 7).q), [1]);

d = load([[8, 6, 'express', 0, 1], [9, 6, 'sto', 0, 1]], { rs: ['bel2'] });
for (let i = 0; i < 4; i++) assert(d.give(d.cell(8, 6), 0, 1, 100+i) && d.cell(9, 6).q.length === i+1);
const belt = d.cell(8, 6), feeder = d.put(7, 6, 'src', 0);
for (let i = 0; i < 4; i++) assert(d.give(feeder, 0, 1, 110+i));
assert(!d.give(feeder, 0, 1, 150));
assert.equal(belt.queue.length, 3);
d = load(save().o, { rs: ['bel2'] });
ticks(8);
assert.deepEqual(Array.from(d.cell(9, 6).qq), [100, 101, 102, 103, 110, 111, 112, 113]);
console.log('Building footprints, blueprints, route construction, tunnels and transport passed.');

const retiredContracts=[{id:'premium',items:[{item:1,total:8,done:2}]}];
d=load([[7,6,'saw',0,1],[8,6,'auto',0,1],[7,8,'depot',0,1,-1,0,-1,[0,1],0,{supplyItem:0,supplyStock:10}]],{
 od:[[1,3,2,100]],contracts:retiredContracts,contractWins:{long:2},supplyOrders:{0:{count:5,period:1}},rs:['grd'],pu:{network:1},epoch:2
});
const value=Math.round(d.price(1)),cash=d.G.m;
assert(d.give(d.cell(7,6),0,1,132));
assert.equal(d.G.m,cash+value+100);
assert.equal(d.G.ord,1);
ticks(80);
assert.deepEqual(Array.from(d.cell(7,8).q),[0,1]);
const savedBusiness=save();
assert.deepEqual(savedBusiness.contracts,retiredContracts);
assert.equal(savedBusiness.contractWins.long,2);
assert.equal(savedBusiness.supplyOrders[0].count,5);
assert.equal(savedBusiness.pu.network,1);
assert(savedBusiness.rs.includes('grd'));
assert(Math.abs(d.dem(1,900)-d.dem(1,899))<.01);

d=load([[7,6,'src',0,1],[8,6,'shp',0,1]],{sp:1,ord:10,xp:10000,rs:['spd3'],lineCounts:{gar:1000}});
d.buyHall(d.hallOf('nor'));
d.buyHall(d.hallOf('lab'));
assert.equal(d.hlv('nor'),1);
assert.equal(d.hlv('lab'),1);
assert(d.place(88,42,'src',0));
assert(d.place(89,42,'saw',0));
assert(d.place(90,42,'shp',0));
assert(d.switchSite(d.REGIONS.find(site=>site.id==='lab')));
ticks(90);
assert(d.cell(90,42).stats.sold>1);
assert(d.cell(8,6).stats.sold>1);
const career=save();
assert.equal(career.site,'lab');
d=load(career.o,career);
assert.equal(d.hlv('lab'),1);
assert.equal(d.G.milestones.gar,1);
d.G.tr=20e6;
const blueprintPoints=d.G.bp;
d.doPrestige();
d=core();
assert(d.G.bp>blueprintPoints);
assert.equal(d.G.milestones.gar,1);
assert.equal(d.cell(7,6).t,'src');
console.log('Original orders, sites, production records and prestige passed.');

const starter = [
 [7, 6, 'src', 0, 1], [8, 6, 'belt', 0, 1], [9, 6, 'saw', 0, 1],
 [10, 6, 'belt', 0, 1], [11, 6, 'shp', 0, 1]
];
const idle = { v: 2, m: 120, ts: clock, tk: 0, o: starter, hl: { gar: 1 } };
load(starter, { m: 120 });
ticks(1200);
const online = { m: core().G.m, sold: core().G.sold, units: core().G.units, cost: core().G.cost };
const offline = factory();
offline.dbg().applySave(idle);
clock += 600000;
offline.update(.016);
const offlineResult = offline.dbg().G;
assert.deepEqual({ m: offlineResult.m, sold: offlineResult.sold, units: offlineResult.units, cost: offlineResult.cost }, online);
assert(overlay.includes('10 Min.') && overlay.includes('Material und Löhne'));
assert(offlineResult.history.length >= 2);

const pending = factory();
pending.dbg().applySave({ ...idle, ts: clock, carry: 10 });
pending.update(.016);
assert.equal(pending.dbg().G.tk, 80);
assert.equal(pending.dbg().G.history.length, 0);
function responsiveSize(width,height,rotated=false){
 const left=23,top=31;
 scope.cv.clientWidth=width;scope.cv.clientHeight=height;
 scope.cv.getBoundingClientRect=()=>({left,top,width:rotated?height:width,height:rotated?width:height});
 scope.V.factory=true;scope.V.factoryRotated=rotated;
 scope.window.devicePixelRatio=2;
 return (x,y)=>rotated?{clientX:left+height-y,clientY:top+x}:{clientX:left+x,clientY:top+y};
}
const viewports=[
 [320,568],[390,844],[430,932],[568,320],[844,390],[768,1024],[1024,768],
 [1280,800],[1920,1080],[2560,1080],[3440,1440],[367,612],[367,611],
 [844,390,true]
];
for(const [width,height,rotated] of viewports){
 const toEvent=responsiveSize(width,height,rotated);
 const label=width+'×'+height+(rotated?' rotated':'');
 d=load(starter);
 play.draw();
 const originalLayout=JSON.stringify(d.L.map(o=>[o.t,o.x,o.y,o.r,o.lv]));
 const originalBalance=d.G.m;
 function hits(){
  const {HB,view,panelSurface}=core().tuD();
  assert.equal(view.width,width,label);
  assert.equal(view.height,height,label);
  assert(view.status.x>=50&&view.status.y>=8&&view.status.y+view.status.h<=view.headerBottom,label);
  for(const hit of HB){
   assert(hit.x>=-.001&&hit.x+hit.w<=width+.001,label+' '+hit.id);
   assert(hit.y>=-.001&&hit.y+hit.h<=height+.001,label+' '+hit.id);
  }
  if(panelSurface){
   const {clip}=panelSurface;
   assert(clip.x>=0&&clip.x+clip.w<=width+.001&&clip.y>=view.headerBottom&&clip.y+clip.h<=height+.001,label);
  }
  return HB;
 }
 function tap(id){
  const button=hits().findLast(hit=>hit.id===id);
  assert(button,label+' '+id);
  const x=button.x+button.w/2,y=button.y+button.h/2;
  const [u,v]=play.pointerPosition(toEvent(x,y));
  assert(Math.abs(u-x)<.001&&Math.abs(v-y)<.001,label);
  play.click(u,v,0,1,'mouse');
  play.dragEnd(u,v,0,1);
  play.draw();
 }
 for(const id of ['mk','rs','pn','hl','bk','ac']){
  tap(id);
  assert(core().tuD().panelSurface,label+' panel '+id);
  assert(!hits().some(hit=>hit.id==='tl_del'),label+' world button behind '+id);
  if(core().tuD().panelSurface.maxX){
   const camBefore={...core().tuD().cam};
   tap('panel_scroll_→');
   assert(core().tuD().panelScroll.x>0,label);
   assert.deepEqual({...core().tuD().cam},camBefore,label);
   tap('panel_scroll_←');
  }
  if(core().tuD().panelSurface.maxY){
   tap('panel_scroll_↓');
   assert(core().tuD().panelScroll.y>0,label);
   tap('panel_scroll_↑');
  }
  tap('panel_close');
 }
 for(const id of ['planning','growth','stats','save']){
  tap('ac');
  d.fTabSet(4);
  play.draw();
  if(!hits().some(hit=>hit.id===id))tap('panel_scroll_→');
  tap(id);
  assert(core().tuD().panelSurface,label+' tool '+id);
  tap('panel_close');
 }
 tap('mk');
 if(!hits().some(hit=>hit.id==='market_tab_2'))tap('panel_scroll_→');
 tap('market_tab_2');
 tap('panel_close');
 for(const id of ['h','m','v','e','n','f','t','b','l','u']){
  tap('pg_'+id);
  const built=new Set();
  for(let page=0;page<20;page++){
   for(const hit of hits())if(hit.id?.startsWith('tl_'))built.add(hit.id.slice(3));
   if(!hits().some(hit=>hit.id==='shop_next'))break;
   tap('shop_next');
  }
  for(const [type,model] of Object.entries(d.MD)){
   if(model.g===id&&!model.legacyOnly)assert(built.has(type),label+' '+type);
  }
 }
 for(const id of ['tl_hand','tl_belt','tl_rot','tl_mov','tl_del','zoom_in','zoom_out','camera_home']){
  assert(hits().some(hit=>hit.id===id),label+' '+id);
 }
 d.sel(d.cell(9,6));
 play.draw();
 assert(core().tuD().panelSurface,label+' machine panel');
 for(let step=0;step<20&&!hits().some(hit=>hit.id==='upg')&&core().tuD().panelSurface.maxY;step++)tap('panel_scroll_↓');
 assert(hits().some(hit=>hit.id==='upg'),label+' machine upgrade');
 tap('panel_close');
 const cameraBefore={...d.tuD().cam};
 tap('zoom_in');
 assert(d.tuD().cam.z>cameraBefore.z,label);
 tap('camera_home');
 assert.equal(JSON.stringify(d.L.map(o=>[o.t,o.x,o.y,o.r,o.lv])),originalLayout,label);
 assert.equal(d.G.m,originalBalance,label);
 assert.deepEqual(renderErrors,[],label);
}
responsiveSize(800,480);
scope.cv.getBoundingClientRect=()=>({left:0,top:0,width:800,height:480});
scope.V.factory=false;
play.draw();
console.log('Responsive controls, panels, clipped hitboxes and rotation passed for '+viewports.length+' viewport sizes.');

const handover = factory();
handover.dbg().applySave({
 v: 2, ts: clock, m: 250, tk: 0, sp: 0, sq: [419, 160, 150],
 o: [[7, 6, 'belt', 0, 1, 14], [8, 6, 'prj', 0, 1]]
});
clock += 750;
handover.update(.016);
assert.equal(handover.dbg().G.sp, 1);
const handoverSave = JSON.parse([...data.values()].findLast(value=>JSON.parse(value).sp===1));
assert.equal(handoverSave.o[0][5], -1);
assert(handoverSave.carry < .125);

const persistedRules = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, 'firebase/database.rules.json'), 'utf8'));
const accountRules = persistedRules.rules.users['$uid'];
assert(accountRules['.read'].includes('auth.uid === $uid'));
assert(accountRules['.write'].includes('auth.uid === $uid'));
assert(accountRules.factory['.validate'].includes('newData.hasChildren()'));

async function testCloud() {
 const settle = () => new Promise(resolve => setImmediate(resolve));
 const snap = value => ({ val: () => value });
 let server = { ...idle, ts: clock, rev: 'initial', m: 200 };
 let fail = false;
 const mock = {
  async get() {
   if (fail) throw Error('Offline');
   return snap(server);
  },
  async transaction(compare) {
   if (fail) throw Error('Offline');
   const next = compare(server);
   if (next === undefined) return { committed: false, snapshot: snap(server) };
   server = next;
   return { committed: true, snapshot: snap(server) };
  }
 };
 scope.window.NOFIN = false;
 scope.OL = { me: 'simulation-account', db: { ref: path => path.endsWith('/factoryAudio') ? { async get() { return snap(null); } } : mock } };
 const first = factory(), second = factory();
 first.update(1);
 second.update(1);
 await settle();
 assert.equal(first.dbg().G.m, 200);
 assert.equal(second.dbg().cloud.base, 'initial');

 first.dbg().G.m = 350;
 first.dbg().sv(true);
 await settle();
 assert.equal(first.dbg().cloud.status, 'synced');
 assert.equal(server.m, 350);

 second.dbg().G.m = 400;
 second.dbg().sv(true);
 await settle();
 assert.equal(second.dbg().cloud.status, 'conflict');
 assert.equal(server.m, 350);
 assert.equal(second.dbg().cloud.remote.m, 350);

 fail = true;
 first.dbg().G.m = 410;
 first.dbg().sv(true);
 await settle();
 assert.equal(first.dbg().cloud.status, 'offline');
 assert.equal(JSON.parse(data.get('2pg_fe_simulation-account')).m, 410);
 const fallback = factory();
 fallback.update(1);
 await settle();
 assert.equal(fallback.dbg().G.m, 410);

 fail = false;
 await first.dbg().flushCloud(true);
 assert.equal(first.dbg().cloud.status, 'synced');
 assert.equal(server.m, 410);
 assert.equal(first.dbg().cloud.pending, null);
 console.log('Phase 5: exact offline replay, report, saved backlog, viewport controls and concurrent cloud retries passed.');
}

function until(check, limit) {
 for (let i = 0; i < limit; i++) {
  if (check()) return i;
  core().tick();
 }
 throw new Error('Simulationsziel nicht innerhalb von '+limit+' Ticks erreicht: '+JSON.stringify({money:core().G.m,phase:core().G.sp,deliveries:core().G.sq,production:core().G.pc}));
}

d = load(starter, { m: 120 });
const secondsToForm = until(() => d.G.m >= 220, 8 * 420) / 8;
assert(secondsToForm > 25);
assert(d.delAt(11, 6));
assert(d.place(11, 6, 'frm', 0));
assert(d.place(12, 6, 'belt', 0));
assert(d.place(13, 6, 'shp', 0));
const secondsToNewProduct = until(() => d.G.ds[2], 8 * 60) / 8;
until(() => d.G.m >= 110, 8 * 360);
d.buy(d.cell(9, 6));
assert.equal(d.cell(9, 6).lv, 2);
const secondsToExpansion = until(() => d.G.m >= d.hNext(d.hallOf('gar')), 8 * 4800) / 8;
d.buyHall(d.hallOf('gar'));
assert.equal(d.hlv('gar'), 2);

const bunkerLayout = [
 ...[[7,5,'src'],[8,5,'saw'],[9,5,'bal'],[10,5,'prj']].map(row => [...row, 0]),
 ...[[7,7,'src'],[8,7,'saw'],[9,7,'bal'],[10,7,'reg'],[11,7,'prj']].map(row => [...row, 0]),
 [10,8,'saw',3],[10,9,'src',3],
 ...[[7,3,'src'],[8,3,'saw'],[9,3,'frm'],[10,3,'asm'],[11,3,'pnt'],[12,3,'pck'],[13,3,'prj']].map(row => [...row, 0])
];
d = load(starter, { m: 12000 });
for (const row of bunkerLayout) assert(d.place(...row), row.join(', '));
const bunkerMinutes = until(() => d.G.sp === 1, 8 * 7200) / 480;
assert(d.G.m >= d.hNext(d.hallOf('met')));
d.buyHall(d.hallOf('met'));
assert.equal(d.hlv('met'), 1);

for (const [, attributes, script] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
 if (!/\bsrc\s*=|\btype\s*=/.test(attributes)) new vm.Script(script);
}
console.log('Phase 6: first Formmaschine after '+secondsToForm.toFixed(1)+'s, product after '+secondsToNewProduct.toFixed(1)+'s, Garage expansion after '+(secondsToExpansion/60).toFixed(1)+'min of additional production, ARCHE foundation after '+bunkerMinutes.toFixed(1)+'min with 3 built lines.');

const recipeTypes = Object.entries(d.MD).filter(([, m]) => m.o != null);
for (const [type, recipe] of recipeTypes) {
 const ingredients = recipe.r?.map(([, count]) => count) || 0;
 d = load([[7,6,type,0,1,-1,ingredients,-1],[8,6,'sto',0,1]], { m: 1e5 });
 const [machine,warehouse] = d.L;
 const before = d.G.m;
 ticks(Math.ceil(recipe.w*8)+2);
 assert(warehouse.q.includes(recipe.o), 'missing output from '+type);
 assert.equal(warehouse.qq[0],100,type);
 assert.equal(machine.stats.output,1,type);
 if (recipe.r) {
  assert(machine.iv.every(n=>n===0), 'ingredients not consumed by '+type);
  ticks(Math.ceil(recipe.w*8)+2);
  assert.equal(warehouse.q.length,1,'extra product from '+type);
 } else {
  assert.equal(before-d.G.m,recipe.rc,type);
 }
}
assert.equal(recipeTypes.length,53);
assert(d.recipeTree(51).some(row=>row.id===6&&row.count>1));
assert(d.recipeTree(51).some(row=>row.id===50&&row.count===1));

d = load(starter, { rs: ['bel','bel2'] });
ticks(160);
const line = d.allProductionLines()[0];
const metrics = d.lineMetrics(line);
assert(metrics.output>0 && metrics.materials>0 && metrics.sold>0);
const firstBelt=d.cell(8,6), balanceBeforeBelt=d.G.m;
assert(d.upgradeBelt(firstBelt));
assert.equal(firstBelt.t,'fast');
assert(d.upgradeBelt(firstBelt));
assert.equal(firstBelt.t,'express');
assert(d.G.m<balanceBeforeBelt);
assert(d.connectedLine(d.cell(7,6)).includes(d.cell(11,6)));
const misplaced=[{o:d.cell(9,6),x:9,y:8,r:0}];
assert.equal(d.lostConnections(misplaced),2);
const safeMove=line.map(o=>({o,x:o.x,y:o.y+2,r:o.r}));
assert.equal(d.lostConnections(safeMove),0);
assert(d.commitBuild(d.checkBuild(safeMove,true)));
assert.equal(d.cell(11,8).t,'shp');
const movingAssembly=d.cell(9,8);
const workingRate=d.currentStats(movingAssembly).output;
const telemetrySave=save();
d=load(telemetrySave.o,telemetrySave);
assert.equal(d.currentStats(d.cell(9,8)).output,workingRate);

const careerFixture={m:15e6,xp:50000,pr:3,sp:6,hl:{gar:3,bnk:1}};
d=load(starter,careerFixture);
const portSite=d.REGIONS.find(site=>site.id==='port');
assert(portSite.open());
d.buyHall(d.hallOf('prt'));
assert.equal(d.hlv('prt'),1);
assert(d.place(120,18,'mobile',1));
const portSave=save();
d=load(portSave.o,portSave);
assert.equal(d.hlv('prt'),1);
assert.equal(d.cell(121,20).t,'mobile');

d=load([[7,6,'saw',0,20,-1,[25],-1,0,0],[8,6,'shp',0,1]]);
ticks(360);
const track=d.G.productTracks['gar-1'];
assert(track.units>=20 && track.level===20 && (track.awards&4));
const recordSave=save();
d=load(recordSave.o,recordSave);
assert.equal(d.G.productTracks['gar-1'].awards,track.awards);

d=load(starter,{sold:50,ord:4,xp:3000,rs:['lag','spd1'],m:300000});
const clockTime=d.tme(d.cell(9,6));
d.hireM(d.MG.find(manager=>manager.id==='prod'));
d.assignTo('prod',9,6);
assert(d.tme(d.cell(9,6))<clockTime);
const manager=d.G.mg[0],config=d.MG.find(kind=>kind.id===manager.id);
for(let i=0;i<4;i++)d.lvlM(manager,config);
d.specM(manager,1);
assert.equal(manager.sp,1);
const timeWithManager=d.tme(d.cell(9,6));
d.hireE('p');
assert(d.tme(d.cell(9,6))<timeWithManager);
ticks(16);
assert(d.G.wc>0);
d=load([
 [8,6,'sorter',0,1,1,0,-1,0,0,{large:true,sortRule:0,iq:123,queue:[[1,105,2,0,false],[7,100,2,0,false]]}],
 [8,5,'sto',0,1],[8,7,'sto',0,1],[10,6,'sto',0,1]
],{rs:['spd3'],epoch:2});
assert.equal(d.cell(9,6),d.cell(8,6));
ticks(40);
assert.equal(d.cell(8,5).q.length,0);
assert.deepEqual(Array.from(d.cell(8,7).qq),[123,105]);
assert.deepEqual(Array.from(d.cell(10,6).q),[7]);
assert(d.currentStats(d.cell(8,6)).moves>0);

d=load([[7,6,'sto',0,1],[8,6,'belt',0,1],[9,6,'prj',0,1]], {m:120});
const carrier=d.cell(7,6);
for(const [index,phase] of d.PH.entries()){
 for(const [item,quantity] of phase.q){
  for(let n=quantity;n>0;){
   const count=Math.min(20,n);
   for(let i=0;i<count;i++){carrier.q.push(item);carrier.qq.push(100)}
   until(()=>carrier.q.length===0&&d.cell(8,6).it<0,240);
   n-=count;
  }
 }
 assert.equal(d.G.sp,index+1);
}
assert.equal(d.G.end,1);
assert.equal(d.G.sd,d.PH.reduce((sum,phase)=>sum+phase.q.reduce((n,[,count])=>n+count,0),0));

function simulatedFrames(milliseconds, frameMilliseconds) {
 const instance=factory();
 instance.dbg().applySave({...idle,ts:clock});
 let elapsed=0;
 while(elapsed<milliseconds){
  const step=Math.min(frameMilliseconds,milliseconds-elapsed);
  clock+=step;
  elapsed+=step;
  instance.update(step/1000);
 }
 const {tk,m,sold,units}=instance.dbg().G;
 return {tk,m,sold,units};
}
assert.deepEqual(simulatedFrames(48000,16),simulatedFrames(48000,997));

d=load(starter,{m:120});
ticks(2400);
const ordinarySales=d.G.sold;
d=load(starter,{m:120,tr:10e6,bp:45});
assert(d.bpCalc().t>=12);
assert(d.buyP('prd1'));assert(d.buyP('prd1'));
d.doPrestige();
const soldAtStart=core().G.sold;
ticks(2400);
assert(core().G.sold-soldAtStart>ordinarySales,'prestige should accelerate production in a comparable new run');

async function testOfflineAssets() {
 const cache=new Map(), listeners={};
 const app='https://example.test/games/';
 const worker={
  registration:{scope:app},location:{origin:new URL(app).origin},
  addEventListener:(name,fn)=>{listeners[name]=fn},skipWaiting:async()=>{},clients:{claim:async()=>{}}
 };
 vm.runInNewContext(fs.readFileSync(root.join(__dirname,'service-worker.js'),'utf8'),{
  self:worker,URL,Request,Response,
  caches:{open:async()=>({
   addAll:async requests=>{for(const r of requests)cache.set(r.url,new Response('cached '+r.url))},
   match:async key=>cache.get(typeof key==='string'?key:key.url),
   put:async (key,value)=>cache.set(key.url,value),
  })},
  fetch:async()=>{throw new Error('offline')},
 });
 let result;
 listeners.install({waitUntil:value=>{result=value}});
 await result;
 assert(cache.has(app));
 for(const {url} of factoryScripts){
  assert(cache.has(app+url));
  listeners.fetch({request:new Request(app+url),respondWith:value=>{result=value}});
  assert.equal(await (await result).text(),'cached '+app+url);
 }
}
console.log('Vertiefung: alle '+recipeTypes.length+' Rezepte, Bandbeschleunigung, Produktionslinien, Standortfreischaltungen und Projekt ARCHE bestanden.');

const canvasListeners=new Map();
scope.document={body:{classList:{contains:()=>false}},addEventListener(){},removeEventListener(){}};
scope.addEventListener=()=>{};
scope.removeEventListener=()=>{};
scope.cv.addEventListener=(name,fn)=>canvasListeners.set(name,fn);
scope.cv.removeEventListener=name=>canvasListeners.delete(name);
scope.V.pw=800;scope.V.ph=480;
scope.cv.getBoundingClientRect=()=>({left:0,top:0,width:800,height:480});
vm.runInContext(html.match(/^const cpt=.*$/m)[0],context);
const zoomGame=factory();
zoomGame.update(0);
zoomGame.dbg().init({v:2,m:1e6,o:starter});
zoomGame.dbg().analyze();
d=zoomGame.dbg();
zoomGame.boot();
const wheel=canvasListeners.get('wheel');
assert(wheel);
const onSmallScreen=responsiveSize(568,320);
d.togP('rs');zoomGame.draw();
let {clip}=d.tuD().panelSurface;
const scrollCenter=[clip.x+clip.w*.55,clip.y+clip.h*.6],cameraBeforeScroll={...d.tuD().cam};
let wheelConsumed=false;
wheel({...onSmallScreen(...scrollCenter),deltaY:52,preventDefault(){wheelConsumed=true}});
assert(wheelConsumed&&d.tuD().panelScroll.y>0);
const beforeDrag=d.tuD().panelScroll.y;
zoomGame.click(...scrollCenter,0,45,'touch');
zoomGame.dragMove(scrollCenter[0],scrollCenter[1]-38,0,45);
zoomGame.dragEnd(scrollCenter[0],scrollCenter[1]-38,0,45);
assert(d.tuD().panelScroll.y>beforeDrag,'touch drag must scroll a clipped panel');
assert.deepEqual({...d.tuD().cam},cameraBeforeScroll,'scrolling a panel must not move the camera');
d.togP('rs');
responsiveSize(800,480);
scope.V.factory=false;
scope.cv.getBoundingClientRect=()=>({left:0,top:0,width:800,height:480});
zoomGame.draw();
d.view(17,11,1.25);
const original={...d.tuD().cam};
const pointer={clientX:480,clientY:302,deltaY:-10,preventDefault(){}};
wheel(pointer);
const zoomed=d.tuD().cam;
assert(zoomed.z>original.z);
assert(Math.abs(original.x+80/original.z-zoomed.x-80/zoomed.z)<1e-8);
assert(Math.abs(original.y+52/original.z-zoomed.y-52/zoomed.z)<1e-8);
scope.cv.getBoundingClientRect=()=>({left:0,top:0,width:0,height:0});
wheel(pointer);
assert.deepEqual(d.tuD().cam,zoomed);
scope.cv.getBoundingClientRect=()=>({left:0,top:0,width:800,height:480});
for(let i=0;i<60;i++)wheel({...pointer,deltaY:120});
assert.equal(d.tuD().cam.z,.22);
zoomGame.draw();
for(let i=0;i<60;i++)wheel({...pointer,deltaY:-120});
assert.equal(d.tuD().cam.z,2.6);
zoomGame.draw();
const zoomOut=d.tuD().HB.find(hit=>hit.id==='zoom_out');
const zoomIn=d.tuD().HB.find(hit=>hit.id==='zoom_in');
zoomOut.fn();
assert(d.tuD().cam.z<2.6);
zoomIn.fn();
assert.equal(d.tuD().cam.z,2.6);

d.view(17,11,1.25);
d.setTool('hand');
zoomGame.draw();
zoomGame.click(380,250,0,9,'mouse');
zoomGame.dragMove(420,250,0,9);
wheel({clientX:440,clientY:270,deltaY:-10,preventDefault(){}});
const zoomWhileDragging={...d.tuD().cam};
zoomGame.dragMove(420,250,0,9);
assert.deepEqual({...d.tuD().cam},zoomWhileDragging,'a stationary pointer must not snap back to the pre-zoom camera');
zoomGame.dragMove(540,250,0,9);
assert(Math.abs(d.tuD().cam.x-(zoomWhileDragging.x-120/zoomWhileDragging.z))<1e-8);
zoomGame.dragEnd(540,250,0,9);

d.view(7.5,6.5,1.3);
d.setTool('del');
const beforePinch=d.G.m;
zoomGame.click(400,250,0,1,'touch');
assert(d.cell(7,6), 'the first finger may become a pinch');
zoomGame.click(500,250,0,2,'touch');
zoomGame.dragMove(620,248,0,2);
assert(d.tuD().cam.z>1.3);
zoomGame.dragCancel(0,2);
zoomGame.dragMove(550,250,0,1);
zoomGame.dragEnd(550,250,0,1);
assert(d.cell(7,6));
assert.equal(d.G.m,beforePinch);
d.view(7.5,6.5,1.3);
zoomGame.click(400,250,0,3,'touch');
zoomGame.dragEnd(400,250,0,3);
assert(!d.cell(7,6),'single-finger editing works after a canceled pinch');

d.view(12.5,7.5,1.3);
d.setTool('belt');
const buildingCount=d.L.length;
zoomGame.click(400,250,0,4,'touch');
zoomGame.click(500,250,0,5,'touch');
zoomGame.dragMove(600,260,0,5);
zoomGame.dragEnd(600,260,0,5);
zoomGame.dragCancel(0,4);
assert.equal(d.L.length,buildingCount);
d.view(12.5,7.5,1.3);
zoomGame.click(400,250,0,6,'touch');
zoomGame.dragEnd(400,250,0,6);
assert.equal(d.cell(12,7).t,'belt');
const centerWheel={clientX:400,clientY:250,preventDefault(){}};
d.view(17,11,1.25);
wheel({...centerWheel,deltaY:-160});
const oneWheelZoom=d.tuD().cam.z;
d.view(17,11,1.25);
for(let i=0;i<8;i++)wheel({...centerWheel,deltaY:-20});
assert(Math.abs(d.tuD().cam.z-oneWheelZoom)<1e-8,'trackpad events scale by distance instead of event count');

d.view(17,11,1.25);
d.setTool('hand');
zoomGame.draw();
zoomGame.click(380,250,0,10,'touch');
zoomGame.click(540,250,0,11,'touch');
zoomGame.dragMove(650,305,0,11);
const finalPinch={...d.tuD().cam};
zoomGame.dragMove(810,650,0,11,true);
zoomGame.dragEnd(810,650,0,11);
zoomGame.dragEnd(380,250,0,10);
assert.deepEqual({...d.tuD().cam},finalPinch,'a release coordinate must not finish with a second zoom');

const loadedObjects=[];
for(let y=3;y<20;y++)for(let x=6;x<44;x++)loadedObjects.push([
 x,y,x%3===0?'belt':x%3===1?'saw':'sto',0,1,x%3===0?1:-1,x%3===1?[2]:0,-1,x%3===2?[1,0]:0
]);
d.init({v:2,m:65000,o:loadedObjects,hl:{gar:3,met:3,elk:3},emp:{p:12,q:12}});
d=zoomGame.dbg();
d.setTool('hand');
d.view(17,11,.83);
zoomGame.draw();
const movementGeometry=[];
const nativeTarget=scope.c;
nativeTarget.translate=(x,y)=>{assert(Number.isFinite(x)&&Number.isFinite(y));movementGeometry.push('translate')};
nativeTarget.scale=(x,y)=>{assert(Number.isFinite(x)&&Number.isFinite(y));movementGeometry.push('scale')};
const initialCash=d.G.m;
zoomGame.click(400,250,0,19,'mouse');
for(let i=0;i<180;i++){
 zoomGame.dragMove(400+(i%2?1:-1)*(150+i%90),250+(i%3?134:-129),0,19);
 wheel({...centerWheel,deltaY:i%4<2?-60:60});
 zoomGame.draw();
 const {x,y,z}=d.tuD().cam;
 assert(x>=0&&y>=0&&z>=.22&&z<=2.6);
}
zoomGame.dragEnd(400,250,0,19);
assert(movementGeometry.length>180);
assert.equal(d.L.length,loadedObjects.length);
assert.equal(d.G.m,initialCash);
delete nativeTarget.translate;
delete nativeTarget.scale;

const catalogue=Object.keys(d.MD).map((type,i)=>[
 6+i%10,3+Math.floor(i/10),type,i%4,2,-1,0,-1,type==='sto'?[1]:0
]);
d.init({v:2,m:65000,o:catalogue,hl:{gar:3,met:3,elk:3}});
d=zoomGame.dbg();
for(const z of [.22,.41,.42,1.3,2.6]){
 for(const x of [6,10,14]){
  d.view(x,6,z);
  for(const machine of d.L)machine.st=1;
  zoomGame.draw();
 }
}
assert.equal(d.L.length,catalogue.length);
assert.deepEqual(renderErrors,[],'all catalogue objects draw across zoom levels');
d.init({v:2,m:65000,o:loadedObjects,hl:{gar:3,met:3,elk:3}});
d=zoomGame.dbg();

assert(!html.includes('paintFactorySurround'));
assert(html.includes('body.fab #ex{display:none}'));
assert.deepEqual(renderErrors,[],'no render errors during normal navigation');

const canvasState=[];
let transform={x:0,y:0,sx:2,sy:2},drawnHeader=false,breakWorld=true,drawnHallTitles=0,detailedMachines=0;
nativeTarget.save=()=>canvasState.push({...transform});
nativeTarget.restore=()=>{
 assert(canvasState.length>0,'unbalanced Canvas restore');
 transform=canvasState.pop();
};
nativeTarget.translate=(x,y)=>{transform.x+=x*transform.sx;transform.y+=y*transform.sy};
nativeTarget.scale=(x,y)=>{transform.sx*=x;transform.sy*=y};
nativeTarget.setTransform=(sx,b,c,sy,x,y)=>{transform={x,y,sx,sy}};
nativeTarget.createLinearGradient=(x0,y0,x1,y1)=>{
 if(x0===0&&y0===-24&&x1===0&&y1===24&&transform.y>0)detailedMachines++;
 return {addColorStop(){}};
};
nativeTarget.fillText=(label)=>{
 if(String(label)==='Geld')drawnHeader=true;
 if(String(label).includes('GARAGE')){
  if(breakWorld){breakWorld=false;throw Error('A world drawing operation failed')}
  drawnHallTitles++;
 }
};
scope.cv.width=800;scope.cv.height=480;
const contextBefore={...transform};
d.view(17,11,.45);
assert.doesNotThrow(()=>zoomGame.draw(),'a drawing failure must leave the game in a usable state');
assert.equal(canvasState.length,0);
assert.deepEqual(transform,contextBefore);
assert(drawnHeader,'the Factory Empire controls must remain available');
assert.equal(drawnHallTitles,0);
assert.equal(renderErrors.length,1);
assert.match(renderErrors.pop()[0],/Halle gar/);
assert(detailedMachines>0,'machine artwork remains visible when a hall decoration fails');
for(const zoom of [.22,.30,.41,.42,.8,1.3,2.6,.33,1.8]){
 const previousMachines=detailedMachines;
 d.view(8,7,zoom);
 zoomGame.draw();
 assert(detailedMachines>previousMachines,'normal machine artwork is required at zoom '+zoom);
 assert.deepEqual(transform,contextBefore);
 assert.equal(canvasState.length,0);
}
assert(drawnHallTitles>0,'hall detail must recover on the next frame');
assert.deepEqual(renderErrors,[]);
for(const method of ['save','restore','translate','scale','setTransform','fillText','createLinearGradient'])delete nativeTarget[method];
delete scope.cv.width;delete scope.cv.height;

zoomGame.leave();
assert.equal(canvasListeners.size,0);

const oldSave={
 v:1,ts:clock,m:9280,tk:950,ar:{0:'gar',1:'w',2:'e'},rs:{0:'met',1:'elk'},rp:24,ac:['first'],
 pr:3,bp:12,bpt:15,pu:{cap1:2},pc:{13:18},ds:{0:1,1:1},
 emp:{p:2,q:1,l:2},mg:[{id:'prod',lv:5,sp:1,x:24,y:6}],
 o:{
  0:{0:3,1:5,2:'sto',3:0,4:2,5:-1,6:[],7:-1,8:{0:1,1:0}},
  1:[7,6,'src',0,3,-1,[],-1,[]],
  2:[8,6,'belt',0,1,0,[],-1,[]],
  3:[24,6,'ele',0,7,-1,[1,2],-1,[]],
  4:[25,6,'shp',0,2,-1,[],-1,[]],
 },
};
scope.window.NOFIN=false;
data.set('2pg_fe_guest',JSON.stringify(oldSave));
const migrated=factory();
migrated.update(.6);
const oldGame=migrated.dbg();
assert.equal(oldGame.G.m,oldSave.m);
assert(oldGame.G.rp>=24);
assert.equal(oldGame.G.pr,3);
assert.equal(oldGame.G.pc[13],18);
assert.equal(oldGame.G.pu.cap1,2);
assert.equal(oldGame.hlv('elk'),1);
assert.deepEqual(Array.from(oldGame.cell(3,5).q),[1,0]);
assert.equal(oldGame.cell(8,6).it,0);
assert.deepEqual(Array.from(oldGame.cell(24,6).iv),[1,2]);
assert.equal(oldGame.cell(24,6).lv,7);
assert.equal(oldGame.cell(24,6).mg,1);
assert.equal(oldGame.bchk(4,5,'src'),'');
assert.deepEqual(JSON.parse(data.get('2pg_fe_guest.before-v2')),oldSave);
oldGame.sv(false);
const migratedSave=JSON.parse(data.get('2pg_fe_guest'));
assert.equal(migratedSave.v,2);
assert.equal(migratedSave.m,9280);
assert.deepEqual(migratedSave.legacyPlots,['w','e']);
const recoveredFactory=factory();
recoveredFactory.update(.6);
assert.equal(recoveredFactory.dbg().cell(24,6).lv,7);
assert.equal(recoveredFactory.dbg().G.bp,12);

const futureSave=JSON.stringify({...oldSave,v:999,original:'must remain'});
data.set('2pg_fe_guest',futureSave);
const compatible=factory();
compatible.update(.6);
compatible.dbg().sv(false);
assert.equal(data.get('2pg_fe_guest'),futureSave);
assert.equal(JSON.parse(data.get('2pg_fe_guest.compatible')).v,2);
data.delete('2pg_fe_guest');
data.delete('2pg_fe_guest.compatible');
console.log('Zoom: wheel, camera bounds, two pointer zoom, canceled gestures and editing passed. Saves: original v1 and unsupported snapshots preserved.');

scope.window.NOFIN = false;
scope.$=()=>({style:{display:'none'}});
const guest = factory();
guest.update(.6);
assert.equal(guest.dbg().G.m, 120);
assert.equal(guest.dbg().G.tu, 0);
guest.draw();
assert.equal(guest.dbg().L.length, 5);
guest.dbg().delAt(11,6);
guest.update(.016);
guest.draw();
const lesson=guest.dbg().tuD().HB.find(hit=>hit.id==='tnext');
assert(lesson);
guest.click(lesson.x+lesson.w/2,lesson.y+lesson.h/2);
guest.dragEnd();
assert.equal(guest.dbg().tuD().cur.id,'own-line');
Promise.all([testCloud(),testOfflineAssets()]).catch(error=>{console.error(error);process.exitCode=1;});
