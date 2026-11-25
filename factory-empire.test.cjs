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
 core().init({ v: 2, m: 1e6, o: objects, ...setup }, 2);
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
const hub=d.cell(10,8);
assert(hub);
assert.deepEqual(Array.from(hub.base),[1,1]);
assert(!d.place(6,9,'hub',0));
assert(d.place(11,9,'belt',0));
assert(!d.moveObj(hub,8,8));
assert(d.moveObj(hub,12,8));
assert.equal(d.cell(12,8),hub);
assert(!d.cell(13,9));
const savedHub=save();
d=load(savedHub.o,savedHub);
assert.equal(d.cell(12,8).t,'hub');
assert.equal(savedHub.o.find(row=>row[2]==='hub')[10].large,false);
assert(d.previewPlan(d.makePlan([d.cell(12,8)]),7,3).error);
d=load([[18,45,'cellFab',0,1,-1,0,-1,0,0,{large:true}],[23,45,'sto',0,1]],{hl:{gar:1,hit:1}});
const copied = d.makePlan([d.cell(18,45),d.cell(23,45)]);
const preview = d.previewPlan(copied,18,49);
assert.equal(preview.error, '');
assert(d.commitBuild(preview));
assert.equal(d.cell(19,50),d.cell(18,49));
assert(!d.commitBuild(preview));

const oldFootprints={
 v:2,ts:clock,m:9600,hl:{gar:1,met:1},sp:1,
 o:[
  [28,5,'sme',0,3,-1,[0],7,0,0,{large:true,oq:126}],
  [30,5,'sto',0,1],
  [32,8,'sme',3,2,-1,[1],-1,0,0,{large:true}],
  [32,10,'belt',3,1,6,0,-1,0,0,{iq:115}],
  [32,7,'sto',0,1]
 ]
};
core().applySave(oldFootprints);
d=core();
assert.deepEqual(JSON.parse(data.get('2pg_fe_demo.before-compact-buildings')),oldFootprints);
assert.deepEqual(Array.from(d.cell(38,5).base),[1,1]);
assert.equal(d.cell(39,5).t,'belt');
assert.equal(d.cell(39,5).r,0);
assert.equal(d.cell(42,9).t,'belt');
assert.equal(d.cell(42,9).r,3);
assert.equal(d.cell(38,5).lv,3);
assert.equal(d.G.m,9600);
ticks(90);
assert.deepEqual(Array.from(d.cell(40,5).q),[7]);
assert.deepEqual(Array.from(d.cell(40,5).qq),[126]);
assert.deepEqual(Array.from(d.cell(42,7).q),[7]);
const compactSave=save();
d=load(compactSave.o,compactSave);
assert.equal(d.L.length,oldFootprints.o.length+2,'reloading does not insert a belt a second time');
assert.equal(d.cell(38,5).lv,3);
const compactTemplate=d.previewPlan([[0,0,'sme',0,true],[2,0,'sto',0,false]],45,9);
assert.equal(compactTemplate.error,'');
assert(compactTemplate.rows.some(row=>row.t==='belt'&&row.x===46&&row.y===9&&row.r===0));
assert(d.commitBuild(compactTemplate));
assert.equal(d.cell(46,9).t,'belt');

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

const logisticsTypes=['belt','fast','express','sort','smart','tunnel','sorter','spl','fus','kre','sto','shp','prj'];
const logisticsResearch=['bel','bel2','lag','spd3'];
d=load([], { rs: logisticsResearch });
for(const [type,model] of Object.entries(d.MD)){
 const [w,h]=model.size||[1,1];
 assert.equal(w*h>1,(model.r?.length||0)>3,type+' footprint matches ingredient count');
}
assert.equal(d.MD.furniture.g,'h');
assert.equal(d.MD.label.g,'h');
assert.equal(d.MD.sorter.g,'l');
const lotArea=()=>d.industrial.slabs.reduce((area,[,,width])=>area+width,0);
const garageArea=lotArea();
assert(d.industrial.get(18,9));
assert(!d.industrial.get(58,26));
assert.equal(d.industrial.get(4,8),1,'the former creek bed is clear building ground');
assert.equal(d.industrial.crossings.length,0,'the starter yard is free of waterways');
assert.equal(d.bchk(12,12,'belt'),'','the garage service lane accepts logistics');
assert(d.place(12,12,'belt',0));
assert.equal(d.bchk(26,3,'belt'),'LOCK:met');
assert.equal(d.bchk(89,9,'belt'),'LOCK:nor');
assert(d.bchk(20,6,'saw'),'production still uses the assigned hall');
for(const type of logisticsTypes){
 assert.equal(d.bchk(18,9,type),'',type+' can be used in the yard');
 assert.equal(d.bchk(8,9,type),'',type+' can be used in the garage');
 for(const [x,y] of [[-1,6],[144,6],[80,6],[68,44],[83,1],[58,26]])assert(d.bchk(x,y,type),type+' at '+x+','+y);
}
assert(d.place(18,9,'sorter',0));
const yardSorter=d.cell(18,9);
assert(d.rotObj(yardSorter,1));
assert(d.moveObj(yardSorter,16,9));
assert(d.moveObj(yardSorter,20,6));
assert(d.rotObj(yardSorter,0));
assert(!d.moveObj(yardSorter,79,61));
assert.equal(d.cell(20,6),yardSorter);
assert(d.previewPlan(d.makePlan([yardSorter]),79,61).error);
assert(!d.commitBuild(d.checkBuild([{o:yardSorter,x:16,y:8,r:1}],true)));
assert(d.commitBuild(d.checkBuild([{o:yardSorter,x:17,y:8,r:0}],true)));
d.buyHall(d.hallOf('gar'));
assert(lotArea()>garageArea&&d.industrial.get(24,7),'a larger garage expands its paved yard');
d.G.sp=1;
const expandedArea=lotArea();
d.buyHall(d.hallOf('met'));
assert(lotArea()>expandedArea&&d.industrial.get(24,6),'purchasing the next hall connects its paved yard');
d.G.m=1e6;
d.buyHall(d.hallOf('gar'));
assert.equal(d.industrial.get(13,17),1,'the factory apron remains usable beside the freight road');
assert.equal(d.bchk(13,17,'belt'),'');
assert(d.place(13,17,'belt',0));
assert(d.bchk(53,18,'belt'),'the freight road stays unbuildable beyond the purchased yards');
d=load([],save());
assert.equal(d.cell(12,12).t,'belt');
assert.equal(d.cell(13,17).t,'belt');

d=load([
 [17,6,'saw',0,1,-1,[2]],[26,5,'sto',1,1,-1,0,-1,[8,8]],[27,6,'shp',0,1]
],{hl:{gar:1,met:1}});
assert(!d.place(21,6,'wrk',0));
assert(d.place(26,6,'wrk',0));
const crossHall=d.planRoute(d.cell(17,6),d.cell(26,6));
assert(crossHall?.rows.some(row=>row.x===20&&row.y===6));
assert(d.commitBuild(crossHall));
ticks(200);
assert.equal(d.G.sl[9],2,'a line combines ingredients from the garage and the metal hall');
assert(d.connectedLine(d.cell(17,6)).includes(d.cell(26,6)));

const yardSave={
 v:2,m:60000,hl:{gar:1},legacyPlots:['w'],rs:['bel'],
 o:[
  [5,6,'belt',0,2,1,0,-1,0,0,{iq:128,ag:.25}],
  [5,11,'sto',0,3,-1,0,-1,[1],0,{qq:[125]}],
  [18,6,'prj',0,1],
  [80,6,'auto',0,1],
  [28,5,'qa',0,2,1],
  [4,5,'depot',0,1,-1,0,-1,[5]],
  [24,19,'sto',0,2,-1,0,-1,[1],0,{qq:[119]}],
  [66,44,'express',0,4,1,0,-1,0,0,{queue:[[5,124,2,0,false]]}]
 ]
};
d=load(yardSave.o,yardSave);
assert.equal(d.cell(5,6).needsRelocation,false);
assert.equal(d.cell(5,11).needsRelocation,false);
assert.equal(d.cell(18,6).needsRelocation,false);
assert.equal(d.cell(4,5).needsRelocation,false);
assert(!d.industrial.get(24,19));
assert.equal(d.cell(24,19).needsRelocation,false,'an old yard line can continue working on its existing supports');
assert(d.bchk(25,19,'belt'),'new installations are confined to the purchased industrial area');
assert(d.cell(80,6).needsRelocation&&d.cell(28,5).needsRelocation&&d.cell(66,44).needsRelocation);
assert(!d.rotObj(d.cell(66,44),1));
assert(!d.give(d.cell(66,44),0,1));
assert(!d.commitBuild({rows:[{x:66,y:44,r:0,t:'express',base:[1,1],existing:d.cell(66,44)}]}));
const roundTrip=save();
d=load(roundTrip.o,roundTrip);
assert.equal(d.cell(5,6).lv,2);
assert.equal(d.cell(5,6).iq,128);
assert.equal(d.cell(5,11).qq[0],125);
assert(d.moveObj(d.cell(66,44),17,10),'old logistics can be relocated without researching it again');
assert.equal(d.cell(17,10).queue[0][1],124);
assert.equal(d.cell(17,10).needsRelocation,false);

d=load();
d.view(20.5,6.5,1.3);
d.setTool('belt');
play.draw();
const {view}=d.tuD();
const screenX=x=>view.cx+(x-20)*48*1.3*view.worldScale;
const screenY=y=>view.cy+(y-6)*48*1.3*view.worldScale;
const notifications=[],redFootprints=[];
const previousToast=scope.toast;
scope.toast=message=>notifications.push(message);
scope.c.strokeRect=(...rect)=>{if(scope.c.strokeStyle==='#fb7185')redFootprints.push(rect)};
for(const pointerType of ['mouse','touch']){
 const y=pointerType==='mouse'?6:5;
 play.click(screenX(24),screenY(y),0,1,pointerType);
 play.dragMove(screenX(25),screenY(y),0,1);
 play.dragMove(screenX(26),screenY(y),0,1);
 play.dragEnd(screenX(26),screenY(y),0,1);
 assert(d.cell(24,y)&&d.cell(25,y),pointerType);
 assert(!d.cell(26,y),pointerType);
}
play.draw();
assert(notifications.some(message=>message.includes('Metallhalle')));
assert(redFootprints.some(([x,y])=>x===26*48+2&&y===5*48+2));
scope.toast=previousToast;
delete scope.c.strokeRect;
d=load([[67,44,'sto',0,1]],{hl:{gar:1,bnk:3},sp:6});
d.setTool('hand');
play.draw();
const repair=d.tuD().HB.find(hit=>hit.id==='move_saved_logistics');
assert(repair);
const repairX=repair.x+repair.w/2,repairY=repair.y+repair.h/2;
play.click(repairX,repairY,0,1,'mouse');
play.dragEnd(repairX,repairY,0,1);
assert.equal(d.tuD().tool,'mov');
assert.equal(d.tuD().mvO,d.cell(67,44));
assert.equal(d.tuD().cam.x,67.5*48);
play.draw();
const targetX=view.cx-2*48*d.tuD().cam.z*view.worldScale,targetY=view.cy;
play.click(targetX,targetY,0,1,'mouse');
play.dragEnd(targetX,targetY,0,1);
assert.equal(d.cell(65,44)?.t,'sto');
assert(!d.cell(67,44));
play.draw();
assert(!d.tuD().HB.some(hit=>hit.id==='move_saved_logistics'));
const yardLine=[[16,6,'src',0,3],...Array.from({length:9},(_,i)=>[17+i,6,'belt',0,1]),[26,6,'sto',0,2]];
const connectedSave={v:2,ts:clock,m:6000,hl:{gar:1,met:1},sp:1,o:yardLine};
d=load(yardLine,connectedSave);
assert.equal(d.bchk(19,7,'saw'),'','the existing hall extends without relocating old machines');
assert(d.industrial.get(6,18),'the widened yard provides additional space');
assert.equal(d.L.length,yardLine.length);
assert(d.L.every(o=>!o.needsRelocation));
ticks(120);
const connectedRoundTrip=save(), storageBefore=d.cell(26,6).q.length;
assert(storageBefore>0);
d=load(connectedRoundTrip.o,connectedRoundTrip);
assert.equal(d.cell(26,6).q.length,storageBefore);
assert(d.L.every((o,i)=>o.x===yardLine[i][0]&&o.y===yardLine[i][1]&&o.r===yardLine[i][3]&&!o.needsRelocation));
ticks(160);
assert(d.cell(26,6).q.length>storageBefore);
console.log('Yard logistics, two-input production, site boundaries, old equipment and drag placement passed.');

const retiredContracts=[{id:'premium',items:[{item:1,total:8,done:2}]}];
d=load([[7,6,'saw',0,1],[8,6,'auto',0,1],[7,8,'depot',0,1,-1,0,-1,[0,1],0,{supplyItem:0,supplyStock:10}]],{
 od:[[1,3,2,100]],contracts:retiredContracts,contractWins:{long:2},supplyOrders:{0:{count:5,period:1}},rs:['grd'],pu:{network:1},epoch:2
});
const value=d.salePrice(1),cash=d.G.m;
assert(d.give(d.cell(7,6),0,1,132));
assert.equal(d.G.m,cash+value+100);
assert.equal(d.G.ord,1);
ticks(80);
assert.deepEqual(Array.from(d.cell(7,8).q),[0,1]);
const savedBusiness=save();
assert.deepEqual(savedBusiness.contracts,retiredContracts);
assert.equal(savedBusiness.contractWins.long,2);
assert.equal(savedBusiness.supplyOrders[0].count,5);
assert(!('pu' in savedBusiness),'retired prestige upgrades are absent from new snapshots');
assert(savedBusiness.rs.includes('grd'));
assert.equal(savedBusiness.saleIncome[1],value);

const saleMigration={
 m:5000,te:1600,tr:1600,sold:204,sl:{1:200,5:4},sa:{1:1e9,5:160},rs:['hnd'],ord:2,
 od:{0:{0:1,1:3,2:2,3:100},1:null},
 o:[[7,6,'belt',0,1,1,0,-1,0,0,{ag:.25,iq:132}],[8,6,'shp',0,4]]
};
d=load(saleMigration.o,saleMigration);
assert.equal(d.G.m,saleMigration.m);
assert.equal(d.G.te,saleMigration.te);
assert.equal(d.G.sold,204);
assert.equal(d.G.sl[1],200);
assert.equal(d.G.sl[5],4);
assert.equal(d.G.saleIncome[1],undefined);
assert.equal(d.G.od[0].d,2);
assert.equal(d.salePrice(1),6);
ticks(1);
assert.equal(d.G.m,saleMigration.m+6+125);
assert.equal(d.G.te,saleMigration.te+6+125);
assert.equal(d.G.ord,3);
assert.equal(d.G.sold,205);
assert.equal(d.G.sl[1],201);
assert.equal(d.G.saleIncome[1],6);
assert.equal(d.cell(7,6).it,-1);
const afterSale=save();
assert.deepEqual(afterSale.sa,saleMigration.sa);
assert.equal(afterSale.saleIncome[1],6);
d=load(afterSale.o,afterSale);
ticks(8*650);
assert.equal(d.G.m,afterSale.m,'a loaded sale and completed order are not repeated');
assert.equal(d.G.sold,205);
assert.equal(d.salePrice(1),6);
const deprecatedShipping=d.cell(8,6);
for(let i=0;i<500;i++)assert(d.give(d.cell(7,6),0,1));
assert.equal(d.G.saleIncome[1],6*501);
assert.equal(d.G.m,afterSale.m+6*500);
assert.equal(deprecatedShipping.lv,4);

d=load([[7,6,'belt',0,1],[8,6,'shp',0,1],[7,8,'belt',0,1],[8,8,'auto',0,1]],{
 rs:['mkt','brd','exp','vtr','prm'],pu:{log2:2},bpt:3,emp:{q:3},mg:[{id:'qual',lv:10,x:8,y:6}]
});
const bonus=1.05*1.08*1.08*1.05*1.12*1.03*1.06*1.04;
const standardPrice=Math.round(60*bonus),managedPrice=Math.round(60*bonus*1.2);
assert.equal(d.salePrice(5),Math.round(60*bonus/1.03),'the quality crew bonus applies only to shipping in its assigned hall');
assert(d.give(d.cell(7,6),0,5));
assert(d.give(d.cell(7,8),0,5));
assert.equal(d.G.saleIncome[5],standardPrice+managedPrice);
const salesText=[];
scope.c.fillText=(label,x,y)=>salesText.push({label:String(label),x,y});
d.setTool('hand');
d.sel(d.cell(8,6));
play.draw();
assert(salesText.some(row=>row.label==='Verkauft automatisch zum festen Stückpreis.'));
d.tuD().HB.find(hit=>hit.id==='ship_prices').fn();
salesText.length=0;
play.draw();
assert(salesText.some(row=>row.label==='📊 Verkauf'));
const sampleProduct=salesText.find(row=>row.label==='Verpackte Spielzeuge');
assert(sampleProduct);
const saleRow=salesText.filter(row=>row.y===sampleProduct.y).map(row=>row.label);
assert.deepEqual(saleRow,['Verpackte Spielzeuge','60 €',standardPrice+'–'+managedPrice+' €','2',standardPrice+managedPrice+' €']);
const productNames=new Set(d.ITEMS.map(item=>item.n));
const shownProducts=salesText.filter(row=>productNames.has(row.label)).map(row=>row.label);
for(let page=1;page<Math.ceil(53/9);page++){
 d.tuD().HB.find(hit=>hit.id==='market_next').fn();
 salesText.length=0;
 play.draw();
 shownProducts.push(...salesText.filter(row=>productNames.has(row.label)).map(row=>row.label));
}
assert.deepEqual(shownProducts,Array.from(d.ITEMS.slice(0,53),item=>item.n));
d.tuD().HB.find(hit=>hit.id==='market_next').fn();
d.mkOpen(false);
d.sel(null);
delete scope.c.fillText;
console.log('Fixed sales, bonuses, historic counts and revenues, open orders and save round trip passed.');

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
assert(!d.beginNextChapter());
assert.equal(d.G.milestones.gar,1);
assert.equal(d.cell(7,6).t,'src');
console.log('Original orders, sites, production records and campaign gate passed.');

const starter = [
 [7, 6, 'src', 0, 1], [8, 6, 'belt', 0, 1], [9, 6, 'saw', 0, 1],
 [10, 6, 'belt', 0, 1], [11, 6, 'shp', 0, 1]
];
const worldLabels=[];
let floorGrids=0,quietGrids=0,terrainEllipses=0,supportPiers=0,riverStrokes=0,roadStrokes=0,yardLanes=0;
scope.c.fillText=label=>worldLabels.push(String(label));
scope.c.stroke=()=>{
 if(scope.c.strokeStyle==='#293d495a')floorGrids++;
 if(scope.c.strokeStyle==='#35434b33')quietGrids++;
 if(scope.c.strokeStyle==='#315e65')riverStrokes++;
 if(scope.c.strokeStyle==='#41494b'){
  if(scope.c.lineWidth<.6)yardLanes++;
  else roadStrokes++;
 }
};
scope.c.ellipse=()=>{terrainEllipses++};
scope.c.fill=()=>{if(scope.c.fillStyle==='#bfb9a2')supportPiers++};
function drawWorldAt(x,y,zoom){
 worldLabels.length=0;floorGrids=quietGrids=terrainEllipses=supportPiers=riverStrokes=roadStrokes=yardLanes=0;
 core().view(x,y,zoom);
 play.draw();
}
d=load(starter,{sp:2});
d.setTool('hand');
drawWorldAt(29,12,.22);
assert(worldLabels.includes('GARAGE'));
for(const name of ['METALLHALLE','ELEKTRONIKHALLE','VERSORGUNGSWERK','MODULWERK']){
 assert(!worldLabels.some(label=>label.includes(name)),name);
}
assert.equal(floorGrids,0,'world view does not draw the global grid');
assert.equal(quietGrids,1,'an owned hall shows subtle expansion joints in normal view');
assert(riverStrokes>0&&roadStrokes>0,'roads and the river draw beside the industrial lot');
assert(yardLanes>0,'the narrow freight entrance draws beside the garage');
assert(terrainEllipses>20&&terrainEllipses<1400,'visible terrain is detailed and culled');
drawWorldAt(27.5,4.5,1.3);
let stage=d.tuD().view;
play.click(stage.cx,stage.cy,0,1,'mouse');
play.dragEnd(stage.cx,stage.cy,0,1);
assert(!d.tuD().hlO,'a future hall has no interaction hotspot in the landscape');
d.buyHall(d.hallOf('met'));
d.buyHall(d.hallOf('gar'));
drawWorldAt(29,12,.22);
assert(worldLabels.includes('METALLHALLE'));
assert(worldLabels.includes('GARAGE · STUFE 2'));
assert(!worldLabels.includes('ELEKTRONIKHALLE'));
assert.equal(floorGrids,0);

d.setTool('belt');
drawWorldAt(18.5,8.5,1.3);
stage=d.tuD().view;
play.click(stage.cx,stage.cy,0,1,'mouse');
play.dragEnd(stage.cx,stage.cy,0,1);
play.draw();
assert.equal(d.cell(18,8)?.t,'belt');
assert.equal(floorGrids,0,'after first placement the hall returns to quiet floor joints');
assert.equal(supportPiers,0,'indoor belts sit on the hall floor');
drawWorldAt(24.5,8.5,1.3);
play.click(stage.cx,stage.cy,0,1,'mouse');
play.dragEnd(stage.cx,stage.cy,0,1);
floorGrids=0;
play.draw();
assert.equal(d.cell(24,8)?.t,'belt');
assert.equal(floorGrids,0,'the ground outside a hall has no construction grid');
assert(supportPiers>0,'outdoor belts render visible footings');

const bunkerRooms=['VORRÄTE','ENERGIE','EVAKUIERUNG','KERNTECHNIK','WOHNTRAKT','LEITSTELLE'];
for(let phase=0;phase<=d.PH.length;phase++){
 const materials=d.PH[phase]?.q.map(([,target])=>Math.ceil(target/2))||[];
 d=load(starter,{sp:phase,sq:materials});
 d.setTool('hand');
 drawWorldAt(73.5,51.5,.65);
 assert(worldLabels.includes('BUNKER ARCHE'));
 const visibleRooms=phase>=6?bunkerRooms:bunkerRooms.slice(0,Math.max(0,phase-1));
 assert.deepEqual(worldLabels.filter(label=>bunkerRooms.includes(label)),visibleRooms);
 const phaseText=phase===d.PH.length?'Fertiggestellt':d.PH[phase].n+' · ';
 assert(worldLabels.some(label=>label.startsWith(phaseText)),phaseText);
 assert.equal(floorGrids,0);
}
assert.equal(d.hallOf('bnk').n,'Modulwerk');
assert.equal(d.hallOf('bnk').id,'bnk');
assert.equal(d.PH.at(-1).hall,'bnk');
d=load(starter,{sp:3,sq:[]});
drawWorldAt(73.5,51.5,.65);
assert(worldLabels.includes('VORRÄTE')&&!worldLabels.includes('ENERGIE'),'a room appears after its first delivery');
play.click(stage.cx,stage.cy,0,1,'mouse');
play.dragEnd(stage.cx,stage.cy,0,1);
assert(d.tuD().bkO,'ARCHE itself opens the project menu');
play.draw();
assert(d.tuD().HB.some(hit=>hit.id==='bunker_location'));
d.togP('bk');
d=load([[10,11,'belt',0,1],[11,11,'prj',0,1]]);
assert(d.give(d.cell(10,11),0,14));
assert(d.give(d.cell(10,11),0,14));
assert(!d.give(d.cell(10,11),0,0),'unrequested materials do not start a trip');
assert.equal(d.projectTrucks.length,0);
play.update(2.4);
assert.equal(d.projectTrucks.length,1);
const trip=d.projectTrucks[0];
assert.equal(trip.count,2);
assert.equal(trip.item,14);
assert.deepEqual(Array.from(trip.route.points[0]),[11.5,11.5]);
assert.equal(Math.floor(trip.route.points.at(-1)[0]),74);
assert(trip.route.distance>50);
drawWorldAt(11.5,11.5,1.3);
assert(worldLabels.includes('2× Holzbalken'));
assert(worldLabels.includes('ARCHE'),'the truck uses a marked freight entrance');
const [garageLeft,,,garageBottom]=d.hrect(d.hallOf('gar'));
const garageGate=(garageLeft+d.hrect(d.hallOf('gar'))[2]+1)/2;
assert(trip.route.points.some(([x,y])=>Math.abs(x-garageGate)<.5&&y>=garageBottom+.5&&y<=18.5));
assert.equal(d.G.sd,2);
const receipt=save();
d=load(receipt.o,receipt);
assert.equal(d.G.sd,2);
assert.equal(d.projectTrucks.length,0,'the visual trip is not replayed as a new delivery after loading');
for(const method of ['fillText','stroke','ellipse','fill'])delete scope.c[method];
assert.deepEqual(renderErrors,[],'the terrain and all seven cutaway phases render');
d=load([], {hl:{gar:3,met:3,elk:3,vrs:3,ene:3,fzg:3,hit:3,bnk:3,nor:1,lab:1,prt:1},sp:7});
assert.equal(d.industrial.crossings.length,0,'no connectors cross a river in the completed factory');
for(const [x,y] of [[4,8],[13,19],[27,29],[15,51],[140,26]]){
 assert.equal(d.industrial.get(x,y),1,'clear industrial ground at '+x+','+y);
}
console.log('Factory landscape, locked halls, construction grids and seven ARCHE phases passed.');

const idle = { v: 2, m: 120, ts: clock, tk: 0, o: starter, hl: { gar: 1 } };
load(starter, { m: 120 });
assert.equal(core().G.od.find(order=>order.s===1).r,116);
ticks(720);
const online = { m: core().G.m, sold: core().G.sold, units: core().G.units, cost: core().G.cost, saleIncome: {...core().G.saleIncome} };
const offline = factory();
offline.dbg().applySave(idle);
clock += 600000;
offline.update(.016);
const offlineResult = offline.dbg().G;
assert.deepEqual({ m: offlineResult.m, sold: offlineResult.sold, units: offlineResult.units, cost: offlineResult.cost, saleIncome: {...offlineResult.saleIncome} }, online);
assert(overlay.includes('10 Min.') && overlay.includes('15 %') && overlay.includes('Material und Löhne'));
for(const [research,seconds,efficiency] of [[[],1200,.15],[['nst'],1800,.20]]){
 const long=factory();
 long.dbg().applySave({...idle,ts:clock,rs:research});
 clock+=24*3600*1000;
 long.update(.016);
 assert.equal(long.dbg().G.tk,seconds*efficiency/.125,'overnight credits only the capped fraction');
 assert.equal(long.dbg().fx().KOF,seconds);
 assert.equal(long.dbg().fx().OFFE,efficiency);
}
assert.equal(offlineResult.history.length,1);

const excessCarry=factory();
excessCarry.dbg().applySave({...idle,ts:clock,carry:7200});
excessCarry.update(.016);
assert.equal(excessCarry.dbg().G.tk,1440,'remaining offline time in older saves uses the new limit');

const unlockedAchievements=Array.from(core().AC,a=>a.id);
const researchSave={m:170000,rp:4300,rs:['spd3','lag2','wrk','lean'],sold:330,ac:unlockedAchievements};
d=load([[7,6,'src',0,3],[8,6,'sto',0,2]],researchSave);
const baseEffects=d.fx();
assert.equal(d.G.rp,researchSave.rp);
assert.equal(d.G.m,researchSave.m);
assert.equal(d.RN.filter(node=>node.advanced).length,12);
assert(!d.rOK(d.RN.find(node=>node.id==='tools2')));
d.rsOpen(true);
play.draw();
d.tuD().HB.find(hit=>hit.id==='research_advanced').fn();
play.draw();
assert(d.tuD().HB.some(hit=>hit.id==='research_tools1'));
assert(!d.tuD().HB.some(hit=>hit.id==='research_spd3'));
for(const id of ['tools1','tools2','depots1','sourcing1','service1']){
 const node=d.RN.find(entry=>entry.id===id);
 assert(d.rOK(node));
 assert(d.G.rp>=node.c);
 d.buyR(node);
}
d.rsOpen(false);
const enhanced=d.fx();
assert.equal(enhanced.STC,baseEffects.STC+20);
assert(Math.abs(enhanced.SPm/baseEffects.SPm/(1+.01*(d.lv()-1))-1.08)<1e-10);
assert.equal(enhanced.RCm,baseEffects.RCm*.96);
assert.equal(enhanced.KUC,baseEffects.KUC*.96);
const savedResearch=save();
d=load(savedResearch.o,savedResearch);
assert(d.RH('tools2')&&d.RH('spd3'));
assert.equal(d.G.rp,savedResearch.rp);
assert.equal(d.G.m,researchSave.m);
assert.deepEqual(d.fx(),enhanced);

d=load([[7,6,'belt',0,1],[8,6,'shp',0,1]],{sold:1999,ord:2,rp:100,
 ac:unlockedAchievements,xp:0,ds:[0,1]});
d.G.od=[{s:1,n:1,d:0,r:5}];
assert(d.give(d.cell(7,6),0,1));
assert.equal(d.G.ord,3);
assert.equal(d.G.rp,101,'sales milestone awards 1 FP and ordinary repeat orders award none');
d.G.ord=9;d.G.od=[{s:1,n:1,d:0,r:5}];
assert(d.give(d.cell(7,6),0,1));
assert.equal(d.G.rp,102,'every tenth completed order awards 1 FP');
console.log('Offline limits, saved research and four upgrade tracks passed.');

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
 [820,1180],[1180,820],[1280,650],[1366,768],[1920,1080],[2541,1300],[2560,1080],[3440,1440],[367,612],[367,611],
 [844,390,true],[320,256],[640,256]
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
  assert(view.status.x>=47&&view.status.y>=8&&view.status.y+view.status.h<=view.headerBottom,label);
  assert(view.status.h>=31&&view.status.h<=60,label+' header size');
  if(width>=1280&&height>=650)assert(view.status.h>=50&&view.dockLabelScale>=1.2,label+' desktop targets');
  if(Math.min(width,height)>=640&&width<=1180)assert(view.status.h>=46,label+' tablet targets');
  if(width<=430&&height>=550){
   assert(view.status.h>=35&&view.status.h<=40&&view.shortcuts[0].h>=53&&view.machines.h>=65,label+' phone targets');
  }
  assert(view.navigation.every(box=>box.h===view.status.h),label+' header alignment');
  assert(view.machines.h>=45&&view.machines.h<=82,label+' measures of machine buttons');
  assert.equal(view.dock.w,width-2*view.inset,label+' available dock width');
  assert.equal(view.dock.x,view.inset,label+' dock begins on the left');
  const toolEnd=view.shortcuts.at(-1),machines=view.machines;
  assert(view.wide?machines.x-toolEnd.x-toolEnd.w>=9:machines.y-toolEnd.y-toolEnd.h>=9,label+' tool and building groups are separated');
  assert(view.shortcuts[0].y-view.categories.y-view.categories.h>=8.99,label+' categories have their own gap');
  const [zoom]=view.camera;
  if(zoom.y>=view.headerBottom){
   assert.equal(zoom.x,view.inset,label+' camera controls align left');
   assert(view.categories.y-zoom.y-zoom.h>=8.99,label+' camera controls clear the categories');
  }else assert(view.camera.at(-1).x+zoom.w<view.status.x,label+' compact camera controls clear the status');
  assert(view.dock.h<=205&&view.dock.y>view.headerBottom,label+' dock leaves visible factory space');
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
 for(const id of ['mk','rs','pn','hl','bk','ac','blueprints']){
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
 for(let scroll=0;scroll<10&&hits().some(hit=>hit.id==='group_prev');scroll++)tap('group_prev');
 for(const id of ['h','m','v','e','n','f','t','b','l']){
  for(let scroll=0;scroll<10&&!hits().some(hit=>hit.id==='pg_'+id);scroll++)tap('group_next');
  tap('pg_'+id);
  const {shop}=d.tuD().dockTracks;
  assert.equal(shop.clip.x,d.tuD().view.machines.x,label+' model row starts on the left');
  assert(shop.buttonWidth>=83&&shop.buttonWidth<=108,label+' responsive card width');
  const built=new Set();
  for(let page=0;page<20;page++){
   for(const hit of hits())if(hit.id?.startsWith('tl_'))built.add(hit.id.slice(3));
   if(!hits().some(hit=>hit.id==='shop_next'))break;
   tap('shop_next');
  }
  for(const [type,model] of Object.entries(d.MD)){
   if(model.g===id&&!model.legacyOnly&&!model.chapter)assert(built.has(type),label+' '+type);
  }
 }
 for(const id of ['tl_hand','tl_belt','tl_rot','tl_mov','tl_del','zoom_in','zoom_out','camera_home']){
  assert(hits().some(hit=>hit.id===id),label+' '+id);
 }
 d.sel(d.cell(9,6));
 play.draw();
 assert(core().tuD().panelSurface,label+' machine panel');
 assert(hits().some(hit=>hit.id==='device_info'),label+' device info beside the navigation');
 tap('device_info');
 assert(core().tuD().panelScroll.id==='device',label+' device info opens');
 tap('panel_close');
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
for(const [width,height] of [[390,844],[1440,900]]){
 responsiveSize(width,height);
 d=load(starter,{ac:['first'],tu:-1});
 d.G.sold=50;
 d.fTabSet(0);
 const labels=[];
 scope.c.fillText=label=>labels.push(String(label));
 function press(id){
  const hit=d.tuD().HB.find(entry=>entry.id===id);
  assert(hit,id+' at '+width+'×'+height);
  const x=hit.x+hit.w/2,y=hit.y+hit.h/2;
  play.click(x,y,0,1,'mouse');play.dragEnd(x,y,0,1);
  labels.length=0;play.draw();
 }
 play.draw();
 press('ac');
 assert(labels.includes('Unternehmenslevel')&&!labels.includes('GARAGE'));
 press('company_achievements');
 press('achievement_group_0');
 assert(labels.includes('Kleiner Händler')&&labels.includes('50 / 100')&&labels.includes('+20 XP'));
 assert(!d.tuD().HB.some(hit=>hit.id==='tl_belt'),'the company screen blocks factory controls');
 if(width<500){
  press('panel_scroll_↓');
  assert(d.tuD().panelScroll.y>0);
  press('panel_scroll_↑');
 }
 press('achievement_group_1');
 assert(labels.includes('Elektronik-Pionier'));
 press('achievement_back');
 press('panel_close');
 assert(d.tuD().HB.some(hit=>hit.id==='tl_belt'));
 assert.equal(d.L.length,starter.length);
 delete scope.c.fillText;
}
for(const [width,height,rotated] of [[320,300],[390,844],[800,600],[1280,720],[2560,1080],[844,390,true]]){
 responsiveSize(width,height,rotated);
 d=load(starter,{sp:7});
 d.togP('bk');
 play.draw();
 let button=d.tuD().HB.find(hit=>hit.id==='bunker_location');
 for(let i=0;i<5&&!button;i++){
  d.tuD().HB.find(hit=>hit.id==='panel_scroll_↓')?.fn();
  play.draw();
  button=d.tuD().HB.find(hit=>hit.id==='bunker_location');
 }
 assert(button,width+'×'+height);
 button.fn();
 play.draw();
 const {view:layout,cam}=d.tuD(),zoom=cam.z*layout.worldScale;
 const x=tile=>layout.cx+(tile*48-cam.x)*zoom,y=tile=>layout.cy+(tile*48-cam.y)*zoom;
 assert(x(d.SITE[0])>layout.inset&&x(d.SITE[2]+1)<width-layout.inset,width+'×'+height+' ARCHE width');
 assert(y(d.SITE[1])>layout.headerBottom&&y(d.SITE[3]+1)<layout.dock.y,width+'×'+height+' ARCHE height');
 const zoomIn=d.tuD().HB.find(hit=>hit.id==='zoom_in');
 zoomIn.fn();
 assert(d.tuD().cam.z>cam.z);
 d.tuD().HB.find(hit=>hit.id==='zoom_out').fn();
 assert(Math.abs(d.tuD().cam.z-cam.z)<1e-8,width+'×'+height+' focus zoom can be restored');
 assert.deepEqual(renderErrors,[]);
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
 const firstGame=first.dbg();
 firstGame.G.m = 404;
 assert(firstGame.give(firstGame.cell(10,6),0,1));
 firstGame.sv(true);
 await settle();
 assert.equal(first.dbg().cloud.status, 'offline');
 const localBusiness=JSON.parse(data.get('2pg_fe_simulation-account'));
 assert.equal(localBusiness.m,410);
 assert.equal(localBusiness.saleIncome[1],6);
 assert(firstGame.give(firstGame.cell(10,6),0,1));
 assert.equal(firstGame.G.saleIncome[1],12);
 const fallback = factory();
 fallback.update(1);
 await settle();
 assert.equal(fallback.dbg().G.m, 410);

 fail = false;
 await first.dbg().flushCloud(true);
 assert.equal(first.dbg().cloud.status, 'synced');
 assert.equal(server.m, 410);
 assert.equal(server.sl[1],1);
 assert.equal(server.saleIncome[1],6);
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
 const x=recipe.chapter?155:7,y=recipe.chapter?12:6;
 d = load([[x,y,type,0,1,-1,ingredients,-1],[x+1,y,'sto',0,1]], { m: 1e5,...(recipe.chapter?{sp:7,campaign:{level:2}}:{}) });
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
assert.equal(recipeTypes.length,61);
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

const careerFixture={m:15e6,xp:50000,pr:3,sp:6,hl:{gar:3,hit:1,bnk:1}};
d=load(starter,careerFixture);
const portSite=d.REGIONS.find(site=>site.id==='port');
assert(!portSite.open());
d.buyHall(d.hallOf('prt'));
assert.equal(d.hlv('prt'),0);
assert(!d.place(120,18,'mobile',1));
assert(d.place(20,46,'mobile',1));
assert.equal(d.cell(21,48).t,'mobile');

const earlyPortObjects=[
 [120,18,'mobile',1,5,-1,[1,2,1,3],51,0,0,{large:true}],
 [119,22,'sto',0,1,-1,0,-1,[51]]
];
d=load(earlyPortObjects,{...careerFixture,site:'port',hl:{...careerFixture.hl,prt:1}});
assert(d.switchSite(portSite));
const portSave=save();
d=load(portSave.o,portSave);
assert.equal(d.hlv('prt'),1);
assert.equal(d.cell(121,20).t,'mobile');
assert.equal(d.cell(121,20).lv,5);
assert.deepEqual(Array.from(d.cell(119,22).q),[51]);
assert.equal(portSave.site,'port');

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

const teamStore=(x,y,items=[],extra={})=>[x,y,'sto',0,1,-1,[], -1,items,0,{teamDepot:true,...extra}];
const legacyTeam={v:2,m:12500,emp:{p:2,q:1,l:1},mg:[{id:'prod',lv:6,sp:1,x:9,y:6}],hl:{gar:1,met:1},o:starter,ts:clock};
core().applySave(legacyTeam);
d=core();
assert.deepEqual(JSON.parse(data.get('2pg_fe_demo.before-hall-teams')),legacyTeam);
assert.equal(d.G.m,12500,'existing team investments are not charged a second time');
assert.equal(d.G.crew.gar.p,2);
assert.equal(d.G.mg[0].lv,6);
assert.equal(d.G.mg[0].sp,1);
assert(d.setCrew('p','gar',-1)&&d.setCrew('p','met',1));
assert(!d.setCrew('p','vrs',1),'locked halls cannot be assigned a crew');
assert(!d.setCrew('p','met',1),'reassignment cannot duplicate an employee');
const relocatedTeam=save();
d=load(relocatedTeam.o,relocatedTeam);
assert.equal(d.G.crew.gar.p,1);
assert.equal(d.G.crew.met.p,1);
assert.equal(d.G.emp.p,2);

d=load([teamStore(8,5,[1],{qq:[137]}),[10,7,'frm',0,1]],{crewVersion:1,emp:{p:1},crew:{gar:{p:1}}});
ticks(24);
assert.equal(d.cell(8,5).q.length,0);
assert.equal(d.cell(10,7).iv[0],1);
assert.equal(d.cell(10,7).ivq[0],137,'material staff preserve the transported quality');
const afterPickup=save();
d=load(afterPickup.o,afterPickup);
assert(d.cell(8,5).teamDepot);
assert.equal(d.cell(10,7).iv[0],1);
assert.equal(d.G.crew.gar.p,1);
assert(d.setCrew('p','gar',-1));
const inReserve=save();
delete inReserve.crew;
d=load(inReserve.o,inReserve);
assert.equal(d.G.emp.p,1);
assert.equal(d.fx().WG,0,'Firebase can omit empty hall assignments without losing the reserve');

const misroutedBelt=(x,y,item)=>[x,y,'belt',0,1,item,0,-1,0,0,{iq:129}];
d=load([teamStore(8,4),misroutedBelt(8,6,1),[9,6,'saw',0,1]],{crewVersion:1,emp:{q:1},crew:{gar:{q:1}}});
ticks(24);
assert.equal(d.cell(8,6).it,-1);
assert.deepEqual(Array.from(d.cell(8,4).q),[1]);
assert.deepEqual(Array.from(d.cell(8,4).qq),[129]);

d=load([teamStore(8,5,[14]),[10,7,'prj',0,1]],{ord:1,crewVersion:1,emp:{l:1},crew:{gar:{l:1}}});
ticks(24);
assert.equal(d.G.sd,1,'shipping staff deliver with the regular bunker receipt');
assert.equal(d.cell(8,5).q.length,0);
d=load([teamStore(8,5,[1]),[10,7,'shp',0,1]],{ord:1,od:[[1,30,1,80]],crewVersion:1,emp:{l:1},crew:{gar:{l:1}}});
ticks(24);
assert.equal(d.G.sold,1,'the shipping crew uses the standard sale and order workflow');
assert.equal(d.G.od[0].d,2);
assert.equal(d.cell(8,5).q.length,0);

d=load([teamStore(8,5),[10,7,'frm',0,1,-1,[0],2]],{crewVersion:1,mg:[{id:'prod',hall:'gar',lv:1}]});
ticks(48);
assert.equal(d.cell(10,7).out,-1);
assert.deepEqual(Array.from(d.cell(8,5).q),[2],'the production manager clears completed output');
d=load([teamStore(8,4),misroutedBelt(8,6,0),[9,6,'prj',0,1]],{crewVersion:1,mg:[{id:'qual',hall:'gar',lv:1}]});
ticks(48);
assert.equal(d.G.sd,0);
assert.equal(d.cell(8,6).it,-1);
assert.deepEqual(Array.from(d.cell(8,4).q),[0],'the quality manager recovers rejected freight');
d=load([[10,6,'frm',0,1,-1,[0],2],[8,8,'asm',0,1]],{crewVersion:1,mg:[{id:'eng',hall:'gar',lv:1}]});
ticks(48);
assert.equal(d.cell(10,6).out,-1);
assert.equal(d.cell(8,8).iv[0],1,'the engineer transfers a waiting output directly to its next recipe');
d=load([teamStore(8,5,Array(24).fill(1)),teamStore(10,7)],{crewVersion:1,mg:[{id:'log',hall:'gar',lv:1}]});
ticks(48);
assert.deepEqual([d.cell(8,5).q.length,d.cell(10,7).q.length],[23,1],'the logistics manager redistributes existing stock');
assert.equal(save().mg[0].hall,'gar');

d=load([[8,5,'sto',0,1]]);
d.setTool('hand');d.sel(d.cell(8,5));play.draw();
d.tuD().HB.find(hit=>hit.id==='team_depot').fn();
assert(d.cell(8,5).teamDepot);
d.togP('pn');play.draw();
d.tuD().HB.find(hit=>hit.id==='crew_hire_p').fn();
assert.equal(d.G.crew.gar.p,1);
d.togP('pn');
console.log('Hall teams, all four manager tasks, warehouse controls and previous team saves passed.');

d=load([
 [8,6,'sorter',0,1,1,0,-1,0,0,{large:true,sortRule:0,iq:123,queue:[[1,105,2,0,false],[7,100,2,0,false]]}],
 [8,5,'sto',0,1],[8,7,'sto',0,1],[10,6,'sto',0,1]
],{rs:['spd3'],epoch:2});
assert.equal(d.cell(9,6).t,'belt');
assert.deepEqual(Array.from(d.cell(8,6).base),[1,1]);
ticks(40);
assert.equal(d.cell(8,5).q.length,0);
assert.deepEqual(Array.from(d.cell(8,7).qq),[123,105]);
assert.deepEqual(Array.from(d.cell(10,6).q),[7]);
assert(d.currentStats(d.cell(8,6)).moves>0);

d=load([[8,6,'sorter',0,1,52,0,-1,0,0,{sortRule:8}],[8,7,'sto',0,1],[9,6,'sto',0,1]],{rs:['spd3']});
ticks(20);
assert.deepEqual(Array.from(d.cell(8,7).q),[52],'saved household sorting rules still match furniture');
assert.equal(d.cell(9,6).q.length,0);

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

d=load(starter,{m:120,bp:45,pu:{prd1:2},sp:6});
assert.equal(d.G.m,22620);
assert(!d.beginNextChapter(),'the last bunker phase still has to be delivered');
assert(d.bchk(155,12,'hull'));
const lastPhase=d.PH.at(-1);
for(const [item,target] of lastPhase.q)for(let i=0;i<target;i++)assert(d.prjIn(item));
assert.equal(d.G.sp,7);
assert.equal(d.currentStoryId(),'arche-7');
assert(!d.beginNextChapter());
assert(d.finishStory());
assert.equal(d.currentStoryId(),'arche-finale');
assert(d.finishStory());
const startingMoney=d.G.m,startingTime=d.tme(d.cell(9,6));
assert(d.beginNextChapter());
assert.equal(d.currentStoryId(),'horizont-intro');
assert(!d.beginNextChapter());
assert.equal(d.G.m,startingMoney+75000);
assert.equal(d.G.sp,7);
assert.equal(d.cell(9,6).t,'saw');
assert(d.tme(d.cell(9,6))<startingTime);
assert(d.place(155,12,'laminate',0));
const launchRamp=d.put(156,12,'orbitRamp',0);
assert(!d.prjIn(1,launchRamp));
assert(d.prjIn(53,launchRamp));
const fleetSave=save();
assert(!('bp' in fleetSave));
d=load(fleetSave.o,fleetSave);
assert.equal(d.G.campaign.level,2);
assert.equal(d.G.campaign.delivery[0],1);
assert.equal(d.G.m,fleetSave.m);
for(const phase of [[ [53,39],[54,20],[55,12] ],[ [56,16],[57,16],[58,12] ],[ [59,14],[60,8],[56,8] ]]){
 for(const [item,target] of phase)for(let i=0;i<target;i++)assert(d.prjIn(item,d.cell(156,12)));
}
assert.equal(d.G.campaign.stage,3);
assert(!d.prjIn(60,d.cell(156,12)));
assert.deepEqual(Array.from(d.G.story.queue),['horizont-intro','horizont-1','horizont-2','horizont-3','horizont-finale']);
for(const id of Array.from(d.G.story.queue)){
 assert.equal(d.currentStoryId(),id);
 d.updateStory(.2);
 d.G.story.paused=true;d.updateStory(.25);
 assert.equal(d.G.story.time,.2);
 const pendingStory=save();
 d=load(pendingStory.o,pendingStory);
 assert.equal(d.currentStoryId(),id);
 assert.equal(d.G.story.time,.2);
 assert(d.G.story.paused);
 assert(d.finishStory());
}
const beforeReplay=JSON.stringify(d.G.story);
assert(d.replayStory('arche-finale'));
assert.equal(d.currentStoryId(),'arche-finale');
play.draw();
assert(d.tuD().HB.some(hit=>hit.id==='story_skip'));
assert(d.finishStory());
assert.equal(JSON.stringify(d.G.story),beforeReplay);

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
const portraitDock=responsiveSize(390,844);
d.setTool('hand');zoomGame.draw();
d.tuD().HB.find(hit=>hit.id==='pg_h').fn();
zoomGame.draw();
const {clip:machineClip}=d.tuD().dockTracks.shop;
const dockY=machineClip.y+machineClip.h/2,dockCamera={...d.tuD().cam};
const swipeX=machineClip.x+machineClip.w*.7;
zoomGame.click(swipeX,dockY,0,44,'touch');
zoomGame.dragMove(swipeX-75,dockY,0,44);
zoomGame.dragEnd(swipeX-75,dockY,0,44);
assert.equal(d.tuD().dockOffsets.shop,75);
assert.equal(d.tuD().tool,'hand','swiping does not select a machine');
zoomGame.draw();
let dockWheel=false;
wheel({...portraitDock(machineClip.x+35,dockY),deltaX:61,preventDefault(){dockWheel=true}});
assert(dockWheel&&d.tuD().dockOffsets.shop>75);
assert.deepEqual({...d.tuD().cam},dockCamera,'horizontal shop scrolling leaves the camera in place');
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
d.init({v:2,m:65000,o:loadedObjects,hl:{gar:3,met:3,elk:3},emp:{p:12,q:12}},2);
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
d.init({v:2,m:65000,o:catalogue,hl:{gar:3,met:3,elk:3},sp:7,campaign:{level:2}},2);
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
d.init({v:2,m:65000,o:loadedObjects,hl:{gar:3,met:3,elk:3}},2);
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
 if(String(label).startsWith('💰 '))drawnHeader=true;
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
for(const method of ['save','restore','translate','scale','setTransform','fillText'])delete nativeTarget[method];
scope.c.createLinearGradient=()=>({addColorStop(){}});
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
assert.equal(oldGame.G.m,oldSave.m+7200);
assert(oldGame.G.rp>=24);
assert.equal(oldGame.G.legacyIndustry.foundings,3);
assert.equal(oldGame.G.pc[13],18);
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
assert.equal(migratedSave.v,4);
assert.equal(migratedSave.m,16480);
assert.deepEqual(migratedSave.legacyPlots,['w','e']);
const recoveredFactory=factory();
recoveredFactory.update(.6);
assert.equal(recoveredFactory.dbg().cell(24,6).lv,7);
assert.equal(recoveredFactory.dbg().G.m,migratedSave.m);

const futureSave=JSON.stringify({...oldSave,v:999,original:'must remain'});
data.set('2pg_fe_guest',futureSave);
const compatible=factory();
compatible.update(.6);
compatible.dbg().sv(false);
assert.equal(data.get('2pg_fe_guest'),futureSave);
assert.equal(JSON.parse(data.get('2pg_fe_guest.compatible')).v,4);
data.delete('2pg_fe_guest');
data.delete('2pg_fe_guest.compatible');
console.log('Zoom: wheel, camera bounds, two pointer zoom, canceled gestures and editing passed. Saves: original v1 and unsupported snapshots preserved.');

const earlyYard=factory();
earlyYard.dbg().init({v:4,yardRows:[2,2],m:1000,hl:{gar:1,met:1}});
assert.equal(earlyYard.dbg().bchk(24,25,'belt'),'','the first logistics yard opens with the metal hall');

const oldYardSave={
 v:2,ts:clock,rev:'yard-original',m:15250,sp:6,hl:{gar:3,met:2,vrs:3,ene:2,hit:1,nor:1},
 crewVersion:1,mg:[{id:'prod',lv:3,x:20,y:45,hall:'hit'}],
 o:[
  [10,17,'src',1,2],
  [10,18,'express',1,1,1,0,-1,0,0,{iq:122,queue:[[2,131,3,0,false]]}],
  [10,19,'kre',0,1],[10,20,'sto',1,2,-1,0,-1,[3],0,{qq:[112]}],
  [15,16,'tunnel',1,1,1,0,-1,0,0,{iq:138}],[15,21,'tunnel',1,1],[15,22,'sto',1,1],
  [22,42,'belt',3,1,1,0,-1,0,0,{iq:119}],[22,41,'belt',3,1],
  [22,40,'belt',3,1],[22,39,'sto',0,1],
  [20,45,'cellFab',0,3,-1,[1,2,1,1],-1,0,0,{large:true}],
  [90,12,'sto',0,2,-1,0,-1,[2]]
 ]
};
data.set('2pg_fe_guest',JSON.stringify(oldYardSave));
const expandedFactory=factory();
expandedFactory.update(.6);
const expanded=expandedFactory.dbg;
let yard=expanded();
assert.deepEqual(JSON.parse(data.get('2pg_fe_guest.before-logistics-yard.yard-original')),oldYardSave);
assert.equal(yard.G.m,oldYardSave.m);
assert.equal(yard.L.length,oldYardSave.o.length);
assert.equal(yard.hrect(yard.hallOf('vrs'))[1],30);
assert.equal(yard.hrect(yard.hallOf('hit'))[1],60);
assert.equal(yard.SITE[1],58);
assert.equal(yard.bchk(35,26,'belt'),'');
assert.equal(yard.bchk(35,57,'belt'),'');
assert(yard.bchk(35,26,'src'));
assert(yard.bchk(94,67,'belt').includes('ARCHE'));
assert.equal(yard.cell(10,27).t,'kre');
assert.equal(yard.cell(15,29).t,'tunnel');
assert.equal(yard.cell(22,57).t,'belt');
assert.equal(yard.cell(21,62),yard.cell(20,61));
assert.equal(yard.G.mg[0].y,61);
assert.equal(yard.cell(20,61).lv,3);
assert.equal(yard.cell(110,12).q[0],2);
assert(yard.connectedLine(yard.cell(10,18)).includes(yard.cell(10,28)));
assert(yard.connectedLine(yard.cell(15,16)).includes(yard.cell(15,30)));
assert(yard.connectedLine(yard.cell(22,58)).includes(yard.cell(22,47)));
yard.sv(false);
const beforeTransport=JSON.parse(data.get('2pg_fe_guest'));
assert.equal(beforeTransport.v,4);
assert.equal(beforeTransport.yardLinks.length,3);
const reloadedFactory=factory();
reloadedFactory.update(.6);
yard=reloadedFactory.dbg();
assert.equal(yard.L.length,oldYardSave.o.length);
assert.equal(yard.cell(10,18).queue[0][1],131);
for(let i=0;i<80;i++)yard.tick();
assert.deepEqual(Array.from(yard.cell(10,28).q.slice(0,3)),[3,1,2]);
assert.deepEqual(Array.from(yard.cell(10,28).qq.slice(0,3)),[112,122,131]);
assert.equal(yard.cell(15,30).qq[0],138);
assert.equal(yard.cell(22,47).qq[0],119);
yard.view(10.5,22,1);
yard.sel(yard.cell(10,18));
reloadedFactory.draw();
assert.deepEqual(renderErrors,[],'the expanded map and selection render');
assert(yard.tuD().HB.some(hit=>hit.id==='disconnect_yard'));
assert.equal(yard.bchk(10,20,'belt'),'');
yard.delAt(10,27);
yard.sv(false);
const afterRemoval=JSON.parse(data.get('2pg_fe_guest'));
assert.equal(afterRemoval.yardLinks.length,2);
assert(!yard.connectedLine(yard.cell(10,18)).includes(yard.cell(10,28)));

const legacyFootprint={v:2,ts:clock,m:5600,hl:{gar:3,hit:1},o:[
 [10,18,'cellFab',0,3,-1,[1,2,1,1],-1,0,0,{large:true}]
]};
yard.applySave(legacyFootprint);
yard=reloadedFactory.dbg();
assert.equal(yard.hrect(yard.hallOf('hit'))[1],44);
assert.equal(yard.cell(11,19),yard.cell(10,18),'a footprint across the cut stays completely intact');
yard.sv(false);
const retained=JSON.parse(data.get('2pg_fe_guest'));
assert.equal(retained.v,2);
assert.deepEqual(retained.o[0].slice(0,5),legacyFootprint.o[0].slice(0,5));
data.delete('2pg_fe_guest');
console.log('Expanded yards, migration backups, both conveyor directions, tunnels, managers and saved cargo passed.');

const oldSideYard={
 v:3,ts:clock,rev:'side-yard-original',m:520000,sp:6,rs:['bel2'],hl:{gar:3,met:3,elk:3,vrs:3,ene:3,fzg:3,hit:3,bnk:3},
 yardLinks:[[27,18,27,29,1,false]],
 o:[
  [24,6,'express',0,1,1,0,-1,0,0,{iq:139}],
  [25,6,'kre',0,1],[26,6,'sto',0,1],
  [25,9,'belt',2,1,2,0,-1,0,0,{iq:132}],[24,9,'sto',2,1],
  [27,18,'belt',1,1,1,0,-1,0,0,{iq:127}],[27,29,'sto',0,1],
  [29,60,'belt',1,1,3,0,-1,0,0,{iq:126}],[29,61,'sto',0,1],
  [30,60,'belt',1,1,4,0,-1,0,0,{iq:114}],[40,61,'sto',0,1],
  [10,19,'tunnel',1,1,1,0,-1,0,0,{iq:143}],[10,26,'tunnel',1,1],[10,27,'sto',1,1]
 ]
};
reloadedFactory.dbg().applySave(oldSideYard);
yard=reloadedFactory.dbg();
const rect=id=>yard.hrect(yard.hallOf(id));
for(const [left,right] of [['gar','met'],['met','elk'],['vrs','ene'],['ene','fzg'],['hit','bnk']]){
 const a=rect(left),b=rect(right);
 assert.equal(b[0]-a[2]-1,12,left+' to '+right);
 for(let x=a[2]+1;x<b[0];x++)assert.equal(yard.bchk(x,a[1]+4,'belt'),'',left+' to '+right+' pavement');
}
assert.equal(rect('vrs')[1]-rect('gar')[3]-1,12);
assert.equal(rect('hit')[1]-rect('vrs')[3]-1,12);
assert.deepEqual(JSON.parse(data.get('2pg_fe_guest.before-side-yards')),oldSideYard);
assert.equal(yard.cell(35,6).t,'kre');
assert(yard.connectedLine(yard.cell(24,6)).includes(yard.cell(36,6)));
assert(yard.connectedLine(yard.cell(37,18)).includes(yard.cell(27,27)));
assert(!yard.connectedLine(yard.cell(40,56)).includes(yard.cell(40,57)));
assert(!yard.connectedLine(yard.cell(10,19)).includes(yard.cell(10,25)));
yard.sv(false);
const sideSave=JSON.parse(data.get('2pg_fe_guest'));
assert.equal(sideSave.v,4);
assert.deepEqual(sideSave.yardRows,[2,2]);
assert.equal(sideSave.yardLinks.filter(link=>link[6]).length,2);
yard.applySave(sideSave);
yard=reloadedFactory.dbg();
for(let i=0;i<32;i++)yard.tick();
assert.equal(yard.L.length,oldSideYard.o.length);
assert.equal(yard.cell(36,6).qq[0],139);
assert.equal(yard.cell(24,9).qq[0],132);
assert.equal(yard.cell(27,27).qq[0],127);
assert.equal(yard.cell(29,57).qq[0],126);
assert.equal(yard.cell(40,57).q.length,0);
assert.equal(yard.cell(10,25).q.length,0);
assert.equal(yard.cell(10,19).it,1);
yard.view(30,10,.6);
yard.sel(yard.cell(24,6));
reloadedFactory.draw();
assert.deepEqual(renderErrors,[],'the new side corridors render');
yard.view(40,56,.8);
yard.sel(yard.cell(40,56));
reloadedFactory.draw();
const unseal=yard.tuD().HB.find(hit=>hit.id==='unlock_yard_ports');
assert(unseal);
unseal.fn();
for(let i=0;i<10;i++)yard.tick();
assert.equal(yard.cell(40,57).qq[0],114);


const busyRows={...oldSideYard,rev:'dense-yard-original',yardLinks:[],o:Array.from({length:10},(_,i)=>[
 11,19+i,'belt',0,2,1,0,-1,0,0,{iq:110+i}
])};
yard.applySave(busyRows);
yard=reloadedFactory.dbg();
for(const row of busyRows.o){
 assert.equal(yard.cell(row[0],row[1]).iq,row[10].iq);
}
yard.sv(false);
const denseSave=JSON.parse(data.get('2pg_fe_guest'));
assert.equal(denseSave.v,4);
assert.deepEqual(denseSave.yardRows,[0,2]);
assert.equal(denseSave.o.length,busyRows.o.length);
assert.equal(yard.hrect(yard.hallOf('met'))[0]-yard.hrect(yard.hallOf('gar'))[2]-1,12);
data.delete('2pg_fe_guest');
console.log('Sideways yards, retained dense rows, existing links and blocked accidental connections passed.');




scope.window.NOFIN = false;
scope.$=()=>({style:{display:'none'}});
scope.c.createLinearGradient=scope.c.createRadialGradient=()=>({addColorStop(){}});
const guest = factory();
guest.update(.6);
const learner=()=>guest.dbg();
const lesson=()=>learner().tuD().cur?.id;
function tutorialButton(id){
 guest.draw();
 const button=learner().tuD().HB.find(hit=>hit.id===id);
 assert(button,id+' during '+lesson());
 const x=button.x+button.w/2,y=button.y+button.h/2;
 guest.click(x,y,0,9,'mouse');guest.dragEnd(x,y,0,9);
 guest.update(.024);
}
function exercise(current,next,action){
 assert.equal(lesson(),current);
 guest.draw();
 action(learner());guest.update(.024);
 assert.equal(lesson(),next);
}
assert.equal(learner().G.m,220);
assert.equal(learner().L.length,0);
assert.equal(learner().currentStoryId(),'arche-intro');
guest.draw();
assert(!learner().tuD().HB.some(hit=>hit.id==='tnext'||hit.id==='tpause'));
tutorialButton('story_pause');
const progress=learner().G.story.time;
guest.update(.2);
assert.equal(learner().G.story.time,progress);
tutorialButton('story_skip');
assert.equal(lesson(),'pan');
tutorialButton('tpause');
const pausedGuide=JSON.parse(data.get('2pg_fe_guest'));
assert(pausedGuide.tutorialPaused);
learner().applySave(pausedGuide);
guest.update(.024);
tutorialButton('tresume');
exercise('pan','zoom',()=>{
 guest.click(760,230,0,9,'mouse');guest.dragMove(694,231,0,9);guest.dragEnd(694,231,0,9);
});
tutorialButton('zoom_in');
assert.equal(lesson(),'home');
tutorialButton('camera_home');
assert.equal(lesson(),'pick-wood');
tutorialButton('tl_src');
exercise('wood','source-turn',d=>assert(d.place(7,6,'src',3)));
exercise('source-turn','input-belt',d=>assert(d.rotObj(d.cell(7,6),0)));
exercise('input-belt','saw',d=>assert(d.place(8,6,'belt',0)));
exercise('saw','inspect-line',d=>assert(d.place(9,6,'saw',0)));
exercise('inspect-line','output-belt',d=>d.sel(d.cell(9,6)));
exercise('output-belt','shipment',d=>assert(d.place(10,6,'belt',0)));
exercise('shipment','first-sale',d=>assert(d.place(11,6,'shp',0)));
exercise('first-sale','machine-upgrade',d=>{for(let i=0;i<120;i++)d.tick()});
exercise('machine-upgrade','spare',d=>d.buy(d.cell(9,6)));
exercise('spare','move-belt',d=>assert(d.place(12,6,'belt',0)));
exercise('move-belt','remove-belt',d=>assert(d.moveObj(d.cell(12,6),12,7)));
exercise('remove-belt','selling',d=>assert(d.delAt(12,7)));
tutorialButton('mk');
assert.equal(lesson(),'orders');
tutorialButton('market_tab_2');
assert.equal(lesson(),'research');
tutorialButton('rs');
assert.equal(lesson(),'halls');
tutorialButton('hl');
assert.equal(lesson(),'arche');
tutorialButton('bk');
assert.equal(lesson(),'plans');
tutorialButton('blueprints');
assert.equal(lesson(),'company');
tutorialButton('ac');
tutorialButton('ft4');
tutorialButton('save');
tutorialButton('panel_close');
assert.equal(lesson(),'summary');
const beforeReward=learner().G.rp;
tutorialButton('tnext');
assert.equal(learner().G.tu,-1);
assert(learner().G.rp>=beforeReward+2);
tutorialButton('ac');
tutorialButton('ft3');
tutorialButton('tutorial_start');
assert.equal(lesson(),'pan');
assert.equal(learner().L.length,5,'restarting from Help preserves the existing production line');
tutorialButton('tskip');
assert.equal(learner().G.tu,-1);
assert(!learner().currentStoryId(),'restarting the lesson does not replay the introductory film');
const fleetLesson={v:2,m:75000,sp:7,tu:0,campaign:{level:2},site:'orbit',ts:clock,
 guide:{kind:'fleet',anchor:[155,12]},story:{version:1,queue:['horizont-intro'],done:{'arche-finale':true}}};
learner().applySave(fleetLesson);
guest.draw();
assert(learner().tuD().HB.some(hit=>hit.id==='story_skip'));
tutorialButton('story_skip');
assert.equal(lesson(),'fleet-plan');
tutorialButton('bk');
assert.equal(lesson(),'fleet-machine');
tutorialButton('panel_close');
exercise('fleet-machine','fleet-ramp',d=>assert(d.place(175,12,'laminate',0)));
exercise('fleet-ramp','fleet-check',d=>assert(d.place(176,12,'orbitRamp',0)));
exercise('fleet-check','fleet-summary',d=>d.sel(d.cell(176,12)));
tutorialButton('tnext');
assert.equal(learner().G.tu,-1);
assert.equal(learner().G.campaign.level,2);
assert.equal(learner().G.sp,7);
assert.deepEqual(renderErrors,[]);
console.log('Interactive tutorials in both chapters, pause, recovery, completion and Help restart passed.');
Promise.all([testCloud(),testOfflineAssets()]).catch(error=>{console.error(error);process.exitCode=1;});
