/* ===== Factory Empire ===== */
const fabrik=({preview=false}={})=>{
const canvasScope=createFactoryCanvasScope(c);
const {save:saveCanvas,restore:restoreCanvas,withState:withCanvasState}=canvasScope;
const TS=48,TICK=.125,DAYSEC=300,DAYS=1500,RRC=1920,DX=[1,0,-1,0],DY=[0,1,0,-1],PI=Math.PI;
let view=FactoryLayout.create(800,480),FW=view.width,FH=view.height,CX=view.cx,CY=view.cy;
let uiTransform={x:0,y:0,scale:1,clip:null},panelSurface=null;
let panelScroll={id:null,x:0,y:0},layoutRotated=false;
function refreshLayout(){
 const width=cv.clientWidth,height=cv.clientHeight;
 const rotated=!!V.factoryRotated;
 if(!width||!height)return false;
 const changed=width!==FW||height!==FH||rotated!==layoutRotated;
 if(changed){
  layoutRotated=rotated;
  view=FactoryLayout.create(width,height);
  ({width:FW,height:FH,cx:CX,cy:CY}=view);
  cv.parentElement?.style.setProperty('--factory-header-height',view.status.h+'px');
  resetCameraInput();
 }
 if(!window.NOFIN||V.factory){
  const density=Math.min(window.devicePixelRatio||1,2,2560/Math.max(width,height));
  const pixelsX=Math.max(1,Math.round(width*density)),pixelsY=Math.max(1,Math.round(height*density));
  if(cv.width!==pixelsX)cv.width=pixelsX;
  if(cv.height!==pixelsY)cv.height=pixelsY;
 }
 return changed;
}
const cameraZoom=()=>cam.z*view.worldScale;
const worldToView=(x,y)=>[CX+(x-cam.x)*cameraZoom(),CY+(y-cam.y)*cameraZoom()];
const viewToWorld=(x,y)=>[(x-CX)/cameraZoom()+cam.x,(y-CY)/cameraZoom()+cam.y];
const pointerPosition=event=>{
 if(refreshLayout())drawFrame();
 return FactoryLayout.point(event,cv,FW,FH,layoutRotated);
};
const RH=id=>!!G?.rs?.includes(id);
const campaignChapter=()=>G?.campaign?.level||1;
const { chapters,read:readCampaign,legacy:readLegacyIndustry,compensation:legacyCompensation,archeUpgrade,needsMigration:needsCampaignMigration }=FactoryCampaign;
const visibleItem=i=>visibleModel(MD[PR[i]]);
const { ITEMS, MD, PR, DS, jpre }=createFactoryCatalog(RH,campaignChapter);
const legacyIndustry=key=>G?.legacyIndustry?.[key]||0;
const salePrice=(item,shippingBonus=1)=>Math.max(1,Math.round(ITEMS[item].v*PM*shippingBonus));
const baseOrderReward=(item,count)=>Math.ceil(count*ITEMS[item].v*.8);
const orderReward=order=>Math.round(order.r*RM);
const rawCost=i=>{const m=MD[PR[i]];return!m?0:m.r?m.r.reduce((a,x)=>a+x[1]*rawCost(x[0]),0):m.rc};
const offlineLimits={regular:{seconds:1200,efficiency:.15},night:{seconds:1800,efficiency:.20}};
const offlineThreshold=60;
const {paths:logisticsPaths,pathFor:logisticsPath,stage:pathStage,upgradeSavedResearch,baseSpeed:logisticsSpeed,
 ranges:tunnelRanges,storage:storageBonuses}=FactoryLogistics;
const logisticsStage=key=>pathStage(logisticsPaths[key].ids,RH);
const tunnelRange=()=>tunnelRanges[logisticsStage('tunnel')];
const decimal=value=>value.toLocaleString('de-DE',{maximumFractionDigits:2});
const formatTransportRate=t=>decimal(logisticsRates[logisticsPath(t)]/100)+' Waren/s';
/* ---- Forschung: Technologiebaum, jeder Knoten hat einen echten Effekt ---- */
const RN=[
 {id:'met',n:'Materialkunde',c:4,p:[],x:0,y:0,e:'Rohstofflager (Holz, Erz, Granulat, Getreide, Wasser) arbeiten 20 % schneller.',rq:['2 Aufträge erfüllt',()=>G.ord>=2]},
 {id:'wrk',n:'Fertigungstechnik',c:10,p:['met'],x:1,y:0,e:'Rohstoffe werden 15 % günstiger eingekauft.',rq:['300 Produkte verkauft',()=>G.sold>=300]},
 {id:'bau',n:'Modulbauweise',c:12,p:['wrk'],x:2,y:0,e:'Maschinen und Förderbänder kosten 15 % weniger.'},
 {id:'elk',n:'Präzisionselektronik',c:36,p:['bau'],x:3,y:0,e:'Maschinen in Elektronik-, Energie- und Hightech-Halle arbeiten 12 % schneller.',rq:['Bunker-Phase 3 erreicht',()=>G.sp>=2]},
 {id:'spd1',n:'Präzisionswerkzeuge',c:5,p:[],x:0,y:1,e:'Alle Maschinen arbeiten 10 % schneller.'},
 {id:'spd2',n:'Hochleistungsmotoren',c:14,p:['spd1'],x:1,y:1,e:'Alle Maschinen arbeiten weitere 15 % schneller.'},
 {id:'spd3',n:'Vollautomatisierung',c:30,p:['spd2','wrk'],x:2,y:1,e:'Alle Maschinen arbeiten weitere 20 % schneller.'},
 {id:'lean',n:'Lean Management',c:24,p:['spd3'],x:3,y:1,e:'Maschinen-Upgrades kosten 12 % weniger.'},
 {id:'lag',n:'Hochregal-Lagerung',c:6,p:[],x:0,y:2,e:'Zwischenlager fassen 40 statt 20 Stück.'},
 {id:'lag2',n:'Automatisches Lager',c:18,p:['bel'],x:2,y:2,e:'Zwischenlager fassen 80 statt 40 Stück.'},
 {id:'mkt',n:'Verkaufsverträge',c:6,p:[],x:0,y:3,e:'Alle Verkaufspreise +5 %.'},
 {id:'hnd',n:'Handelsbeziehungen',c:10,p:['mkt'],x:1,y:3,e:'Auftragsprämien +25 %.'},
 {id:'brd',n:'Markenaufbau',c:18,p:['hnd'],x:2,y:3,e:'Alle Verkaufspreise +8 %.'},
 {id:'vtr',n:'Vertriebsnetz',c:22,p:['brd'],x:3,y:3,e:'Alle Verkaufspreise +5 %.'},
 {id:'exp',n:'Exportverträge',c:16,p:['mkt'],x:0,y:4,e:'Alle Verkaufspreise +8 %.'},
 {id:'off',n:'Auftragsbüro',c:8,p:['hnd'],x:1,y:4,e:'Ein vierter Auftrag gleichzeitig.'},
 {id:'mas',n:'Massenfertigung',c:28,p:['brd'],x:2,y:4,ex:'prm',e:'+20 % Tempo und 5 % niedrigere Verkaufspreise. Schließt Premiumfertigung aus.',rq:['Premiumfertigung nicht gewählt',()=>!RH('prm')]},
 {id:'prm',n:'Premiumfertigung',c:28,p:['brd'],x:3,y:4,ex:'mas',e:'+12 % Verkaufspreise, aber 5 % weniger Tempo. Schließt Massenfertigung aus.',rq:['Massenfertigung nicht gewählt',()=>!RH('mas')]},
 {id:'sch',n:'Schulungen',c:10,p:[],x:0,y:5,e:'Materialdienst arbeitet häufiger und stärkt das Produktionstempo in seiner Halle.'},
 {id:'ldr',n:'Führungstraining',c:20,p:['sch'],x:1,y:5,e:'Manager erledigen ihre Hallenaufgabe häufiger. Ihre Maschinenboni steigen um 15 %.'},
 {id:'nst',n:'Nachtschicht',c:30,p:['ldr'],x:2,y:5,e:'Offline-Betrieb: 30 statt 20 Min. Abwesenheit, mit 20 statt 15 % Tempo.'}];
const researchSeries=[
 {id:'tools',n:'Präzisionslinien',p:'spd3',cost:[90,240,680],effect:'Maschinen arbeiten pro Stufe 4 % schneller.'},
 {id:'depots',n:'Modulare Depots',p:'lag2',cost:[65,180,500],effect:'Zwischenlager fassen pro Stufe 20 Stück mehr.'},
 {id:'sourcing',n:'Direktbeschaffung',p:'wrk',cost:[75,210,580],effect:'Rohstoffe kosten pro Stufe weitere 4 % weniger.'},
 {id:'service',n:'Planbare Wartung',p:'lean',cost:[80,225,640],effect:'Maschinen-Upgrades kosten pro Stufe weitere 4 % weniger.'}
];
for(const [row,series] of researchSeries.entries()){
 for(const [stage,cost] of series.cost.entries()){
  RN.push({id:series.id+(stage+1),n:series.n+' '+['I','II','III'][stage],c:cost,
   p:[stage?series.id+stage:series.p],x:stage,y:row,
   e:series.effect,advanced:true});
 }
}
const logisticsLevels=['I','II','III','IV','V'];
for(const [row,[key,path]] of Object.entries(logisticsPaths).entries()){
 for(const [i,id] of path.ids.entries()){
  const p=key==='belt'&&i===0?['lag','spd1']:key==='belt'&&i===1?['bel','lag2']:i?[path.ids[i-1]]:path.requires?[path.requires]:[];
  const speed=decimal(logisticsSpeed(key,i+1))+' Waren/s';
  const extra=key==='tunnel'?' · Reichweite '+tunnelRanges[i+1]+' Felder':
   key==='storage'?' Ausgabe · +'+storageBonuses[i+1]+' Lagerplätze':key==='belt'&&i===1?' · schaltet Tunnel frei.':'';
  RN.push({id,n:path.name+' '+logisticsLevels[i],c:path.cost[i],p,x:i,y:row,e:speed+extra,logistics:key});
 }
}
const researchTier=id=>Number(RH(id+'1'))+Number(RH(id+'2'))+Number(RH(id+'3'));
/* ---- Hallenteams und ihre Transporte ---- */
const WAGE=6,crewRoles=[
 {id:'p',label:'Materialdienst',description:'Holt fehlende Rezeptzutaten aus Team-Lagern und bringt sie zu wartenden Maschinen.',color:'#dd8740',unlock:()=>true},
 {id:'q',label:'Linienservice',description:'Bringt Fehlteile von blockierten Bändern zurück ins Team-Lager.',color:'#4a9cd1',unlock:()=>G.sold>=25,require:'25 Produkte verkaufen'},
 {id:'l',label:'Versanddienst',description:'Liefert aus dem Team-Lager an ARCHE oder an den Versand für einen offenen Auftrag.',color:'#80a95a',unlock:()=>G.ord>=1||RH('lag'),require:'Einen Auftrag erfüllen oder Hochregal-Lagerung erforschen'}
],MG=[
 {id:'prod',n:'Hanna Berger',r:'Produktionsleiterin',base:.08,cost:800,tgt:'eine Maschine',lab:'Tempo',color:'#f0b066',task:'Bringt fertige Waren von blockierten Maschinen ins Team-Lager.',cond:['50 Produkte verkauft',()=>G.sold>=50]},
 {id:'qual',n:'Jonas Weber',r:'Qualitätsmanager',base:.02,cost:2500,tgt:'einen Versand',lab:'Verkaufspreis',color:'#83c5e8',task:'Holt nicht angeforderte Waren von blockierten ARCHE-Zuführungen zurück ins Team-Lager.',cond:['3 Aufträge erfüllt',()=>G.ord>=3]},
 {id:'eng',n:'Dr. Mira Voss',r:'Ingenieurin',base:.05,cost:6000,tgt:'eine Maschine',lab:'Upgrade-Kosten',color:'#c6a5e8',task:'Bringt fertige Ware von blockierten Maschinen direkt zu einer Maschine, der genau diese Zutat fehlt.',cond:['„Präzisionswerkzeuge“ erforscht',()=>RH('spd1')]},
 {id:'log',n:'Tobias Kern',r:'Logistikmanager',base:.15,cost:4000,tgt:'ein Zwischenlager',lab:'Lagerplätze',color:'#b8cf7c',task:'Verteilt Ware aus vollen Team-Lagern auf freie Team-Lager derselben Halle.',cond:['„Hochregal-Lagerung“ erforscht',()=>RH('lag')]}];
const comp=(d,o)=>!!o&&!o.needsRelocation&&(d.id==='qual'?typeShip(o.t):d.id==='log'?isStorage(o.t):prod(o));
const crewCount=(id,role)=>G.crew[id]?.[role]||0;
const assignedCrew=role=>Object.values(G.crew).reduce((sum,crew)=>sum+(crew[role]||0),0);
const managerHall=m=>m.hall?hallOf(m.hall):cell(m.x,m.y)&&areaAt(m.x,m.y);
const meff=(m,d)=>d.base*m.lv*(m.sp==1?1.5:m.sp==2?.6:1)*(1+.1*legacyIndustry('management'))*(RH('ldr')?1.15:1),hcost=k=>Math.round(150*Math.pow(1.3,G.emp[k])),lcost=(m,d)=>Math.round(d.cost*.5*Math.pow(1.7,m.lv-1));
function recalc(){for(const o of L){
 const hall=areaAt(o.x,o.y)?.id;
 o.sb=1+(RH('sch')?.03:.02)*crewCount(hall,'p');o.ub=1;
 o.pb=1+.01*crewCount(hall,'q');o.cb=0;o.extraStorage=2*crewCount(hall,'l');o.mg=0;
 }
 const par=new Map(),f=o=>{while(par.get(o)!==o)o=par.get(o);return o};for(const o of L)par.set(o,o);
 for(const o of L){
  const outputs=o.j?(o.j==1?o.jm.flatMap((mode,d)=>mode==2?[d]:[]):[0,1,2,3]):
   [o.r,(o.r+1)%4,(o.r+3)%4].filter(d=>fdn(o,(d+2)%4));
  for(const d of outputs){const q=neighbor(o,d);if(q)par.set(f(o),f(q))}
  const exit=tunnelExit(o);if(exit)par.set(f(o),f(exit));
 }
 for(const m of G.mg){const d=MG.find(q=>q.id==m.id),t=managerTarget(m,d);if(!t)continue;t.mg=1;const e=meff(m,d),hall=areaAt(t.x,t.y);
  for(const o of m.sp==2?L.filter(o=>f(o)===f(t)&&comp(d,o)&&areaAt(o.x,o.y)===hall):[t]){if(d.id==='prod')o.sb*=1+e;else if(d.id==='eng')o.ub*=Math.max(.4,1-e);else if(d.id==='qual')o.pb*=1+e;else o.cb+=e}
 }
}
function managerTarget(m,d){
 const target=cell(m.x,m.y),hall=managerHall(m);
 if(comp(d,target)&&(!m.hall||areaAt(target.x,target.y)===hall))return target;
 if(!hall||!hlv(hall.id))return null;
 return L.find(o=>comp(d,o)&&areaAt(o.x,o.y)===hall);
}
function setCrew(k,hall,delta){
 if(!hlv(hall)||!crewRoles.some(role=>role.id===k))return false;
 const next=crewCount(hall,k)+delta;
 if(next<0||delta>0&&assignedCrew(k)>=G.emp[k])return false;
 G.crew[hall]??={};
 G.crew[hall][k]=next;
 rfx();recalc();sv(0);
 return true;
}
function hireE(k,hall='gar'){
 const role=crewRoles.find(role=>role.id===k);
 if(!role?.unlock()||!hlv(hall))return false;
 if(G.emp[k]>=12){deny('Mehr als 12 Mitarbeiter je Rolle gehen nicht.');return false}
 const cost=hcost(k);
 if(G.m<cost){deny('Nicht genug Geld.');return false}
 G.m-=cost;G.emp[k]++;xp(2);setCrew(k,hall,1);sfx('hire');
 return true;
}
function hireM(d){if(G.mg.some(m=>m.id==d.id))return;if(!d.cond[1]()){deny('Gesperrt: '+d.cond[0]);return}if(G.m<d.cost){deny('Nicht genug Geld.');return}G.m-=d.cost;G.mg.push({id:d.id,lv:1,sp:0,x:-1,y:-1});xp(20);sfx('hire');toast(d.n+' arbeitet jetzt für dich. Setze den Manager im Team-Menü in einer Halle ein.');sv(1)}
function lvlM(m,d){if(m.lv>=10)return;const c1=lcost(m,d);if(G.m<c1){deny('Nicht genug Geld.');return}G.m-=c1;m.lv++;recalc();xp(10);sfx('upgrade');sv(0)}
function specM(m,sp){if(m.lv<5||m.sp)return;m.sp=sp;recalc();sfx('unlock');sv(0)}
function assignManager(m,hall,o){
 if(!m||!hall||!hlv(hall.id))return false;
 m.hall=hall.id;m.x=o?.x??-1;m.y=o?.y??-1;
 recalc();sfx('select');sv(0);
 return true;
}
function assignTap(a,b){
 const d=MG.find(q=>q.id===asg),m=G.mg.find(q=>q.id===asg),o=cell(a,b);
 if(!d||!comp(d,o)||!assignManager(m,areaAt(o.x,o.y),o)){deny('Wähle '+d.tgt+' in einer eigenen Halle.');return}
 teamHall=m.hall;asg=null;pnO=true;
}
/* ---- Spielerlevel & Erfolge ---- */
const need=l=>Math.round(60*Math.pow(l,1.5));
function setLv(){let l=1,x=G.xp,n=need(1);while(x>=n){x-=n;l++;n=need(l)}LV=l;XB=G.xp-x;XN=XB+n}
function xp(n){G.xp+=n;if(G.xp>=XN){const b=LV;setLv();for(let l=b+1;l<=LV;l++){G.rp++;if(!fs)toast('⭐ Spielerlevel '+l+' erreicht! +1 FP')}rfx();if(!fs)sfx('level')}}
const achievementGroups=['Verkauf','Produktion','Ausbau','Forschung','Team','Kampagne'];
const AC=[
 ['first','Erster Verkauf','Verkaufe dein erstes Produkt.',()=>G.sold,1,10,'Verkauf'],
 ['s100','Kleiner Händler','Verkaufe 100 Produkte.',()=>G.sold,100,20,'Verkauf'],
 ['s1k','Marktführer in spe','Verkaufe 1.000 Produkte.',()=>G.sold,1e3,50,'Verkauf'],
 ['s10k','Massenproduzent','Verkaufe 10.000 Produkte.',()=>G.sold,1e4,150,'Verkauf'],
 ['s100k','Industriegigant','Verkaufe 100.000 Produkte.',()=>G.sold,1e5,500,'Verkauf'],
 ['o1','Erster Auftrag','Erfülle deinen ersten Auftrag.',()=>G.ord,1,15,'Verkauf'],
 ['o10','Zuverlässiger Lieferant','Erfülle 10 Aufträge.',()=>G.ord,10,60,'Verkauf'],
 ['o50','Stammlieferant','Erfülle 50 Aufträge.',()=>G.ord,50,200,'Verkauf'],
 ['m10k','Erste Zehntausend','Erziele 10.000 € Gesamtumsatz.',()=>G.te,1e4,25,'Verkauf'],
 ['m1m','Millionär','Erziele 1 Mio. € Gesamtumsatz.',()=>G.te,1e6,200,'Verkauf'],
 ['m100m','Konzernbilanz','Erziele 100 Mio. € Gesamtumsatz.',()=>G.te,1e8,600,'Verkauf'],
 ['line','Erste vollständige Linie','Verpacke dein erstes Spielzeug.',()=>G.ds[5],1,40,'Produktion'],
 ['tool','Werkzeugbauer','Stelle dein erstes Werkzeug her.',()=>G.ds[9],1,60,'Produktion'],
 ['pho','Elektronik-Pionier','Stelle dein erstes Smartphone her.',()=>G.ds[13],1,150,'Produktion'],
 ['pho2','Digitaler Industriekonzern','Stelle in einem Durchlauf 100 Smartphones her.',()=>G.pc[13]||0,100,300,'Produktion'],
 ['disc','Produktvielfalt','Entdecke Bretter, Formteile, Spielzeug, lackierte und verpackte Ware, Blech, Stahl und Werkzeuge.',()=>[1,2,3,4,5,7,8,9].filter(i=>G.ds[i]).length,8,120,'Produktion'],
 ['hall1','Erste Erweiterung','Schalte eine zweite Halle frei.',()=>HL.filter(h=>hlv(h.id)>0).length,2,40,'Ausbau'],
 ['hall4','Fabrikkomplex','Schalte alle Hallen des Stammwerks frei.',()=>HL.filter(h=>!h.site&&hlv(h.id)>0).length,8,250,'Ausbau'],
 ['pl25','Bauherr','Platziere 25 Gebäude.',()=>G.pl,25,25,'Ausbau'],
 ['pl100','Fabrikplaner','Platziere 100 Gebäude.',()=>G.pl,100,100,'Ausbau'],
 ['r1','Forscher','Erforsche deine erste Technologie.',()=>G.rs.length,1,30,'Forschung'],
 ['r10','Technologieführer','Erforsche 10 Technologien.',()=>G.rs.length,10,250,'Forschung'],
 ['r21','Forschungsleiter','Erforsche 22 Technologien.',()=>G.rs.length,22,400,'Forschung'],
 ['r34','Industrieforschung','Erforsche alle verfügbaren Technologien.',()=>RN.filter(n=>RH(n.id)).length,RN.length-1,900,'Forschung'],
 ['mg1','Chef','Stelle deinen ersten Manager ein.',()=>G.mg.length,1,30,'Team'],
 ['mg4','Führungsriege','Stelle alle vier Manager ein.',()=>G.mg.length,4,120,'Team'],
 ['mg10','Meisterhaft','Bringe einen Manager auf Level 10.',()=>Math.max(0,...G.mg.map(m=>m.lv)),10,150,'Team'],
 ['e10','Belegschaft','Stelle 10 Mitarbeiter ein.',()=>G.emp.p+G.emp.q+G.emp.l,10,50,'Team'],
 ['pr1','Neuanfang','Historischer Erfolg aus einem früheren Spielstand.',()=>legacyIndustry('foundings'),1,150,'Kampagne'],
 ['pr5','Serienunternehmer','Historischer Erfolg aus einem früheren Spielstand.',()=>legacyIndustry('foundings'),5,400,'Kampagne'],
 ['lv5','Aufsteiger','Erreiche Spielerlevel 5.',()=>LV,5,40,'Kampagne'],
 ['lv10','Profi','Erreiche Spielerlevel 10.',()=>LV,10,120,'Kampagne'],
 ['b1','Fundament gelegt','Schließe die erste Bunkerphase ab.',()=>G.sp,1,100,'Kampagne'],
 ['b4','Strom für den Bunker','Schließe die vierte Bunkerphase ab.',()=>G.sp,4,300,'Kampagne'],
 ['b7','Rettung der Menschheit','Stelle den Bunker fertig.',()=>G.sp,7,2000,'Kampagne'],
 ['hup','Platz da!','Baue eine Halle auf Stufe 3 aus.',()=>Math.max(...HL.map(h=>hlv(h.id))),3,150,'Ausbau'],
 ['car','Autobauer','Stelle dein erstes Auto her.',()=>G.ds[37],1,200,'Produktion'],
 ['jn1','Verteilerchef','Baue einen Splitter oder Fusionator.',()=>Number(G.bt.includes('spl')||G.bt.includes('fus')),1,40,'Ausbau']
].map(([id,title,condition,progress,goal,reward,group])=>({id,title,condition,progress,goal,reward,group}));
function chkAc(){
 for(const {id,title,progress,goal,reward} of AC){
  if(G.ac.includes(id)||(Number(progress())||0)<goal)continue;
  G.ac.push(id);xp(reward);
  if(!fs)toast('🏆 Erfolg: '+title);
  sfx('achieve');
 }
}
/* ===== Audio: Web Audio API, komplett synthetisiert (keine Dateien), Start erst nach Nutzer-Interaktion ===== */
let wMsg='',wT=-99;
function deny(message){toast(message);sfx('deny')}
function warnChk(){if(bn&&msg!==wMsg&&tm-wT>25){sfx('warn');wT=tm}wMsg=bn?msg:''}
function auTab(X,Y,W,H){tx('Audio',X+26,Y+68,15,'#fff','left',800);
 [['master','Gesamtlautstärke','ma'],['music','Musik','mm'],['mach','Maschinengeräusche','mc'],['sfx','Soundeffekte','ms']].forEach(([k,n,m],i)=>{const y=Y+82+i*44,x0=X+250,w=262,dim=AS[m]||(k!='master'&&AS.ma);
  tx(n,X+26,y+18,13,'#fff','left',700);rr(x0,y+8,w,8,4,'#ffffff1c');rr(x0,y+8,Math.max(2,w*AS[k]),8,4,dim?'#64748b':'#7dd3fc');c.fillStyle=dim?'#94a3b8':'#fff';c.beginPath();c.arc(x0+w*AS[k],y+12,9,0,PI*2);c.fill();
  btn(x0-14,y-4,w+28,32,()=>{},'#0000',xx=>{AS[k]=Math.max(0,Math.min(1,(xx-x0)/w));audApply();audSave();if(k=='sfx'||k=='master')sfx('click')});
  tx(Math.round(AS[k]*100)+' %',x0+w+20,y+18,12,'#cbd5e1','left',700);
  btn(X+W-130,y,104,26,()=>{AS[m]=AS[m]?0:1;audApply();audSave();sfx('click')},AS[m]?'#7f1d1d':'#334155');tx(AS[m]?'🔇 Stumm':'🔊 An',X+W-78,y+18,12,'#fff','center',700)});
 btn(X+26,Y+256,304,32,()=>{AS.ma=AS.ma?0:1;audApply();audSave()},AS.ma?'#b91c1c':'#334155');tx(AS.ma?'🔇 Ton ist aus – tippen zum Einschalten':'🔊 Alles stumm schalten',X+178,Y+276,12.5,'#fff','center',800);
 tx('Der Ton startet nach dem ersten Klick (Browser-Vorgabe). Einstellungen werden im Konto gespeichert.',X+26,Y+306,10,'#94a3b8')}
const rOK=n=>!RH(n.id)&&n.p.every(p=>RH(p))&&(!n.rq||n.rq[1]());
function rfx(){const arche=G.sp===PH.length;SPm=(1+(RH('spd1')?.1:0)+(RH('spd2')?.15:0)+(RH('spd3')?.2:0)+(RH('mas')?.2:0)-(RH('prm')?.05:0))*(1+.01*Math.min(24,LV-1))*(1+.05*legacyIndustry('speed'))*(chapters[campaignChapter()]?.speed||1)*(1+.04*researchTier('tools'));STC=(RH('lag2')?80:RH('lag')?40:20)+10*legacyIndustry('storage')+20*researchTier('depots')+storageBonuses[logisticsStage('storage')]+(arche?archeUpgrade.storage:0);RM=RH('hnd')?1.25:1;
 for(const key of Object.keys(logisticsPaths))logisticsRates[key]=Math.round(logisticsSpeed(key,logisticsStage(key))*100*(arche?archeUpgrade.beltSpeed:1));
 BTv=100/logisticsRates.belt;
 PM=(RH('mkt')?1.05:1)*(RH('brd')?1.08:1)*(RH('exp')?1.08:1)*(RH('vtr')?1.05:1)*
  (RH('prm')?1.12:1)*(RH('mas')?.95:1)*(1+.02*legacyIndustry('experience'))*(1+.02*legacyIndustry('sales'));
 OS=RH('off')?4:3;WG=crewRoles.reduce((sum,role)=>sum+assignedCrew(role.id),0)*WAGE*(1-.1*legacyIndustry('wages'));KUC=(RH('lean')?.88:1)*(1-.04*researchTier('service'));KBC=(RH('bau')?.85:1)*(arche?archeUpgrade.construction:1);
 ({seconds:KOF,efficiency:OFFE}=offlineLimits[RH('nst')?'night':'regular']);
 RCm=(RH('wrk')?.85:1)*(1-.04*researchTier('sourcing'))}
function buyR(n){if(!rOK(n)){deny('Voraussetzungen noch nicht erfüllt.');return}const cost=researchCost(n);if(G.rp<cost){deny('Nicht genug Forschungspunkte.');return}G.rp-=cost;G.rs.push(n.id);rfx();xp(30);sfx('unlock');toast('Erforscht: '+n.n);rflash[n.id]=1;sv(1);analyze()}
const LVQ=n=>({t:'Spielerlevel '+n,ok:()=>LV>=n,p:()=>Math.min(LV,n)+'/'+n});
const REQ=(t,n,k)=>({t,ok:()=>G[k]>=n,p:()=>Math.min(G[k],n)+'/'+n});
const HL=[{"id":"gar","n":"Garage","ln":"Holzwerkstatt","tab":"h","rc":[[6,3,17,10],[6,3,21,10],[6,3,21,15]],"c":[0,6000,45000],"ph":0,"f":["#d3d6da","#b9bec5"]},{"id":"met","n":"Metallhalle","ln":"Stahlwerk","tab":"m","rc":[[26,3,39,12],[26,3,43,14],[26,3,47,16]],"c":[30000,22000,75000],"ph":1,"f":["#cdd6e0","#b3bfcc"]},{"id":"vrs","n":"Versorgungswerk","ln":"Lebensmittel & Wasser","tab":"v","rc":[[6,22,19,31],[6,22,23,33],[6,22,25,37]],"c":[120000,80000,280000],"ph":2,"f":["#d3e0d0","#b9cdb4"]},{"id":"elk","n":"Elektronikhalle","ln":"Elektronik","tab":"e","rc":[[52,3,67,12],[52,3,71,14],[52,3,75,16]],"c":[300000,210000,700000],"ph":2,"f":["#cfdbe4","#b2c4d2"]},{"id":"ene","n":"Energiehalle","ln":"Antriebe & Energie","tab":"n","rc":[[30,22,43,31],[30,22,47,33],[30,22,51,37]],"c":[900000,600000,2000000],"ph":3,"f":["#e4dec4","#cfc7a6"]},{"id":"fzg","n":"Fahrzeughalle","ln":"Mobilität","tab":"f","rc":[[56,22,71,31],[56,22,75,33],[56,22,79,37]],"c":[2500000,1700000,5600000],"ph":4,"f":["#dcd5d2","#c4bab6"]},{"id":"hit","n":"Hightech-Halle","ln":"Robotik & KI","tab":"t","rc":[[18,44,31,53],[18,44,35,55],[18,44,39,57]],"c":[8000000,5500000,19000000],"ph":5,"f":["#d2d4e8","#b6b9d6"]},{"id":"bnk","n":"Modulwerk","ln":"Endmodule für ARCHE","tab":"b","rc":[[44,44,57,53],[44,44,61,55],[44,44,65,57]],"c":[20000000,14000000,60000000],"ph":6,"f":["#dbd2c2","#c3b79f"]}];
const PH=[{"n":"Fundament","hall":"gar","q":[[14,420],[15,160],[5,150]],"rw":[40000,10]},{"n":"Stahlhülle","hall":"met","q":[[16,1000],[17,450],[9,300],[18,180]],"rw":[150000,20]},{"n":"Lebenserhaltung","hall":"vrs","q":[[23,1200],[25,1500],[27,450],[19,800]],"rw":[500000,30]},{"n":"Energie","hall":"ene","q":[[28,1300],[30,700],[31,240],[20,600]],"rw":[1400000,40]},{"n":"Evakuierung","hall":"fzg","q":[[35,350],[37,220],[38,90],[36,450]],"rw":[4000000,60]},{"n":"Hightech-Kern","hall":"hit","q":[[39,200],[40,600],[41,240],[32,70]],"rw":[15000000,80]},{"n":"Fertigstellung","hall":"bnk","q":[[42,180],[43,130],[44,48],[45,24]],"rw":[0,100]}];

const REGIONS=[
 {id:'main',name:'Stammwerk',rect:[0,0,79,61],center:[11.5,6.5]},
 {id:'north',name:'Nordwerk',rect:[82,1,111,30],center:[95,14],hall:'nor',cost:85000,
  need:'Bunker-Phase 2 erreicht · 10 Aufträge erfüllt',open:()=>G.sp>=1&&G.ord>=10},
 {id:'lab',name:'Versuchsfabrik',rect:[82,33,111,61],center:[95,47],hall:'lab',cost:45000,
  need:'Vollautomatisierung · Spielerlevel 10',open:()=>RH('spd3')&&LV>=10},
 {id:'orbit',name:'Raumwerft Horizont',rect:[146,4,187,59],center:[164,25],hall:'orb',chapter:2},
 {id:'port',name:'Bestandswerk',rect:[114,2,143,59],center:[128,26],hall:'prt',retired:true,
  need:'Dieser Standort ist nur in bestehenden Fabriken verfügbar.',open:()=>false}
];
HL.push(
 {id:'nor',n:'Nordwerk',ln:'Holz, Metall & Versorgung',tab:'m',site:'north',allow:['gar','met','vrs'],rc:[[87,7,103,20]],c:[85000],ph:0,f:['#c9d6d7','#9fb6b5']},
 {id:'lab',n:'Versuchsfabrik',ln:'Holz, Metall & Elektronik',tab:'e',site:'lab',allow:['gar','met','elk','ene'],rc:[[87,41,103,54]],c:[45000],ph:0,f:['#d4d0e7','#aea9cc']},
 {id:'prt',n:'Bestandswerk',ln:'Robotik · Versorgung · Bunkermodule',tab:'t',site:'port',retired:true,allow:['gar','met','vrs','elk','ene','fzg','hit','bnk'],rc:[[119,14,137,37]],c:[12e6],ph:0,f:['#c0d6df','#8baebf']},
 {id:'orb',n:'Raumwerft',ln:'Flottenbau und Warenversorgung',tab:'o',site:'orbit',chapter:2,allow:['gar','met','vrs','elk','ene','fzg','hit','bnk'],rc:[[154,10,174,39],[154,8,178,42]],c:[0,95000],ph:0,f:['#c3d6e5','#8298b0']}
);
const siteAvailable=site=>(site.chapter||1)<=campaignChapter()&&(!site.retired||hlv(site.hall));
const hallAvailable=hall=>(hall.chapter||1)<=campaignChapter()&&(!hall.retired||hlv(hall.id));
const originalWidth=FactoryYard.width,originalHeight=FactoryYard.height;
const regionTiles=new Array(originalWidth*originalHeight);
for(const site of REGIONS){
 const [left,top,right,bottom]=site.rect;
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)regionTiles[y*originalWidth+x]=site;
}
const bunkerOriginal=[66,42,81,61],fleetOriginal=[179,29,186,48];
const latestLayout=4;
let yardLayout=FactoryYard.create(2),GW=yardLayout.width,GH=yardLayout.height,SITE=bunkerOriginal,FLEET=fleetOriginal;
const siteAt=(x,y)=>{
 if(x<0||y<0||x>=GW||y>=GH)return;
 const originalX=x-yardLayout.east;
 const site=x<=yardLayout.mainRight?REGIONS[0]:originalX>=FactoryYard.annexStart&&y<originalHeight
  ?regionTiles[y*originalWidth+originalX]:null;
 return site&&siteAvailable(site)?site:undefined;
};
let currentSite='main';
const hlv=id=>(G&&G.hl&&G.hl[id])|0,hallOf=id=>HL.find(h=>h.id==id),inR=(r,x,y)=>x>=r[0]&&x<=r[2]&&y>=r[1]&&y<=r[3];
const hallExtensions={gar:[2,2],met:[2,1],vrs:[2,2],elk:[2,1],ene:[2,2],fzg:[0,2],hit:[2,2],bnk:[0,2],nor:[2,2],lab:[2,2],prt:[2,2],orb:[0,2]};
const extendedHallRects=new Map(HL.map(h=>[h.id,h.rc.map(([x,y,r,b])=>[x,y,r+hallExtensions[h.id][0],b+hallExtensions[h.id][1]])]));
const layoutRect=rect=>yardLayout.rect(rect);
const originalHallRect=h=>layoutRect(h.rc[Math.max(1,hlv(h.id))-1]);
const hrect=h=>hlv(h.id)?layoutRect(extendedHallRects.get(h.id)[hlv(h.id)-1]):originalHallRect(h);
const isProjectRamp=t=>t==='prj'||t==='orbitRamp';
const mapWidth=()=>campaignChapter()>=2?GW:144+yardLayout.east;
const hSize=h=>{const r=hrect(h);return(r[2]-r[0]+1)+'×'+(r[3]-r[1]+1)},hArea=r=>(r[2]-r[0]+1)*(r[3]-r[1]+1);
const ORD=['saw','frm','asm','pnt','pck'],QT=[1,10,25,0];
const fm=n=>{n=Math.floor(n);for(const[v,s]of[[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']])if(n>=v)return(n/v).toFixed(n>=v*100?0:n>=v*10?1:2).replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'').replace('.',',')+' '+s;return n.toLocaleString('de-DE')};
let STC=20,BTv=.5,SPm=1,RM=1,PM=1,OS=3,KUC=1,KBC=1,KOF=offlineLimits.regular.seconds,OFFE=offlineLimits.regular.efficiency,RCm=1,stQ=[],stOpen=0,hlO=false,bkO=false,hsel=null,mvO=null,mvT=null,delAsk=0,mp=null,mkTab=0,mkPg=0,WG=0,LV=1,XB=0,XN=60,acO=false,pfl=0,fTab=0,pcf=false,rsel=null,rsO=false,rflash={},pnO=false,asg=null;
const logisticsRates={};
let transportCycle=0;
// The per-path calendars use integer hundredths of a transfer per second.
const transferScale=800;
function transportProgress(type){
 const rate=logisticsRates[logisticsPath(type)];
 return Math.min(1,((G.tk*rate)%transferScale)/transferScale+acc*rate/100);
}
let G,L=[],g=[],ready=0,cam={x:11.5*TS,y:6.5*TS,z:1.3},tool='hand',rot=0,sel=null,hv=null,HB=[],PO=[],tm=0,acc=0,lr=Date.now(),KEY,ld=0,wt=0,at=0,pdn=null,mv=0,lt=null,msg='',tl=0,bn=null,qi=0,fs=0,sc=0,rw=0,selA=null,afl={},pg='h',ff=null,mkO=false;
const sb=new Array(60).fill(0),cell=(x,y)=>x<0||y<0||x>=GW||y>=GH?null:g[y*GW+x],areaAt=(x,y)=>HL.find(h=>inR(hrect(h),x,y)&&hallAvailable(h)),inG=(x,y)=>{const h=areaAt(x,y);return!!h&&hlv(h.id)>0};
/* Maschinenparameter. Waren behalten ihre Qualitätswerte entlang der Transportkette. */
const qvalue=value=>Number.isFinite(value)?Math.max(60,Math.min(160,value)):100;
const isStorage=t=>t=='sto'||!!MD[t]?.storage;
const typeShip=t=>t=='shp'||!!MD[t]?.ship;
const visibleModel=m=>!m?.chapter||m.chapter<=campaignChapter();
const knownType=t=>t=='belt'||Object.hasOwn(MD,t);
const isBelt=t=>t=='belt'||!!MD[t]?.belt;
const buildType=t=>t==='fast'||t==='express'?'belt':t;
const isLogistics=t=>isBelt(t)||MD[t]?.g==='l'||isStorage(t)||typeShip(t)||!!MD[t]?.inspect;
const beltSize=t=>Math.max(2,MD[t]?.belt||1,Math.ceil(logisticsRates[logisticsPath(t)]/transferScale)+1);
const maxBeltBuffer=Math.ceil(TICK*logisticsSpeed('belt',5)*archeUpgrade.beltSpeed)+1;
const beltCount=o=>o.it<0?0:1+o.queue.length;
const beltCapacity=(o={t:'belt'})=>logisticsRates[logisticsPath(o.t)]*.6;
const terminal=t=>typeShip(t)||isProjectRamp(t)||!!(MD[t]?.supply||MD[t]?.distribution);
const prod=o=>MD[o.t]?.o!=null;
const cap=o=>Math.floor((STC+(o.extraStorage||0))*(1+(o.cb||0)));
const inputCap=(o,i)=>MD[o.t].r[i][1]*2;
const levelSpeed=Array.from({length:61},(_,level)=>Math.pow(1.18,level-1));
const spd=(o,level=o.lv)=>levelSpeed[Math.min(60,level)]*SPm*(o.sb||1)*xsp(o);
const tme=(o,level=o.lv)=>MD[o.t].w/spd(o,level);
const defaultSize=t=>MD[t]?.size||[1,1];
const {dimensions,footprint,port}=FactoryGrid;
function mapObject(o,value){
 teamPaths.clear();
 for(const [x,y] of footprint(o))g[y*GW+x]=value;
}
function physicalNeighbor(o,d){
 return o.base[0]===1&&o.base[1]===1?cell(o.x+DX[d],o.y+DY[d]):cell(...port(o,d));
}
function yardNeighbor(o,d,physical,keepLink){
 const linked=o.yardOutputs?.[d];
 if(linked&&(!keepLink||keepLink(linked)))return linked;
 return physical&&o.yardBlocked?.[d]===physical&&(!keepLink||keepLink(physical))?null:physical;
}
function neighbor(o,d){
 if(o.needsRelocation)return null;
 const next=yardNeighbor(o,d,physicalNeighbor(o,d));
 return next?.needsRelocation?null:next;
}
function inputNeighbor(o,d){
 return o.yardInputs?.[d]||physicalNeighbor(o,d);
}
function legacyTunnelExit(o){
 if(o.t!='tunnel'||o.needsRelocation)return null;
 if(o.yardTunnel&&!o.yardTunnel.needsRelocation)return o.yardTunnel;
 const next=physicalTunnelExit(o,cell);
 return next&&o.yardBlockedTunnel===next?null:next;
}
function physicalTunnelExit(o,lookup){
 for(let distance=1;distance<=6;distance++){
  const q=lookup(o.x+distance*DX[o.r],o.y+distance*DY[o.r]);
  if(q?.t=='tunnel'&&!q.needsRelocation&&q.r==o.r)return distance>=2?q:null;
 }
 return null;
}
const tunnelPairs=new Map();
const tunnelDistance=(from,to)=>(to.x-from.x)*DX[from.r]+(to.y-from.y)*DY[from.r];
function alignedTunnel(from,to){
 if(from?.t!=='tunnel'||to?.t!=='tunnel'||from.r!==to.r)return false;
 return DX[from.r]!==0?from.y===to.y:from.x===to.x;
}
function tunnelExit(o){
 const target=tunnelPairs.get(o);
 return !o.needsRelocation&&target&&!target.needsRelocation?target:null;
}
const tunnelSurfaceOutput=o=>o.jumped||o.legacyTunnelPass&&!tunnelPairs.has(o);
const tunnelSurfaceInput=o=>!o.tunnelIn?.size||o.legacyTunnelPass||tunnelPairs.has(o);
function rememberTunnel(from,to){
 removeTunnel(from);
 tunnelPairs.set(from,to);
 (to.tunnelIn??=new Set()).add(from);
}
function removeTunnel(from){
 tunnelPairs.get(from)?.tunnelIn.delete(from);
 tunnelPairs.delete(from);
}
function unpairTunnel(o){
 removeTunnel(o);
 for(const from of o.tunnelIn||[])removeTunnel(from);
}
function keepsTunnel(from,to,future){
 const a=future.get(from)||from,b=future.get(to)||to;
 if(!alignedTunnel(a,b)||siteAt(a.x,a.y)!==siteAt(b.x,b.y))return false;
 const distance=tunnelDistance(a,b);
 return distance>=2&&(distance<=tunnelRange()||distance===tunnelDistance(from,to));
}
function pairTunnels(first,second){
 if(!alignedTunnel(first,second)||first.needsRelocation||second.needsRelocation
  ||siteAt(first.x,first.y)!==siteAt(second.x,second.y))return 'Wähle zwei gleich ausgerichtete Tunnel auf einer geraden Linie am selben Standort.';
 if([first,second].some(o=>tunnelPairs.has(o)||o.tunnelIn?.size))return 'Ein Tunnelende ist bereits verbunden. Trenne zuerst das bisherige Paar.';
 const distance=tunnelDistance(first,second);
 if(Math.abs(distance)<2||Math.abs(distance)>tunnelRange())return 'Der Abstand muss 2 bis '+tunnelRange()+' Felder betragen.';
 const [from,to]=distance>0?[first,second]:[second,first];
 from.legacyTunnelPass=to.legacyTunnelPass=false;
 // Goods already at the new exit are still allowed to leave on the surface.
 if(to.it>=0)to.jumped=true;
 for(const parcel of to.queue)parcel[4]=true;
 rememberTunnel(from,to);
 return '';
}
function readTunnelPairs(saved){
 const links=[];
 for(const row of Object.values(saved||{})){
  if(!row||![row[0],row[1],row[2],row[3]].every(Number.isInteger))continue;
  const from=cell(row[0],row[1]),to=cell(row[2],row[3]);
  if(alignedTunnel(from,to)&&tunnelDistance(from,to)>=2&&siteAt(from.x,from.y)===siteAt(to.x,to.y))links.push([from,to]);
 }
 return links;
}
const newStats=s=>FactoryTelemetry.totals(s,G.tk);
function record(o,key,value=1){
 o.stats[key]+=value;
 FactoryTelemetry.record(o.recent,G.tk,TICK,key,value);
}
const currentStats=o=>FactoryTelemetry.rates(o.recent,G.tk,TICK,o.stats.since);
const companyRates=()=>FactoryTelemetry.rates(G.recent,G.tk,TICK);
const uc=(o,l)=>Math.ceil(MD[o.t].c*.55*(Math.pow(1.5,l-1))*(o.ub||1)*KUC),cst=t=>Math.max(1,Math.round((t=='belt'?2:MD[t].c)*(1-.03*legacyIndustry('construction'))*KBC));
const xsp=o=>{const m=MD[o.t];return(RH('met')&&m.rc!=null?1.2:1)*(RH('elk')&&(m.a=='elk'||m.a=='ene'||m.a=='hit'&&o.t!=='mobile')?1.12:1)};
function put(x,y,t,r,lv,base=defaultSize(t)){const m=MD[t],o={t,x,y,r,lv:lv||1,it:-1,ein:(r+2)%4,wt:0,q:[],iv:(m&&m.r||[]).map(()=>0),wk:0,out:-1,p:0,ag:0,st:2,ew:0,es:0,eb:0,dv:0,fl:0,bt:1,bad:0};
 if(m&&m.j){o.j=m.j;o.rr=0;o.pr=0;o.xs=[-1,-1,-1,-1];o.xm=[];o.xQueue=[];o.inQueue=[];o.jm=m.j==1?jpre(t,r):[0,0,0,0]}
 Object.assign(o,{up:{},spec:'',paused:false,priority:false,control:0,supplyItem:-1,supplyStock:0,credits:o.iv.map(()=>0),ivq:o.iv.map(()=>0),oq:100,pq:100,iq:100,qq:[],xq:[100,100,100,100],threshold:105,base,queue:[],jumped:false,sortRule:-1,smartMode:0,stats:newStats(),recent:FactoryTelemetry.create(G.tk,TICK)});
 L.push(o);mapObject(o,o);return o}
function del(o){unpairTunnel(o);forgetYardLinks(new Set([o]));L=L.filter(q=>q!=o);mapObject(o,null);buildSelection.delete(o);if(routeSource===o){if(buildMode==='tunnel')buildMode='';routeSource=null;buildPreview=null}if(sel==o)sel=null}
const legacyPlots=[
 {id:'w',name:'Lagerhalle',rect:[1,3,5,10]},
 {id:'o',name:'Produktionshalle',rect:[18,3,22,10]},
 {id:'s',name:'Montagehalle',rect:[6,11,17,13]},
 {id:'n',name:'Verpackungszentrum',rect:[6,0,17,2]},
 {id:'e',name:'Elektronikhalle',rect:[23,3,33,10]}
];
let legacyYards=[];
function ownedLegacyPlots(){
 return legacyPlots.filter(plot=>G.legacyPlots.includes(plot.id)).flatMap(plot=>
  yardLayout.plotRects(plot.rect).map(rect=>({...plot,rect})));
}
const logisticsSiteError='Baue Logistik auf dem Werksboden rund um deine Hallen.';
let industrial;
function refreshIndustrialArea(){
 teamPaths.clear();
 legacyYards=ownedLegacyPlots();
 const halls=HL.filter(hall=>hlv(hall.id)>0);
 const plots=rectFor=>halls.map(hall=>{
  const rect=rectFor(hall);
  return {rect,site:siteAt(rect[0],rect[1])};
 }).concat(legacyYards.map(plot=>({
  rect:plot.rect,site:siteAt(plot.rect[0],plot.rect[1])
 })));
 const options={
  width:GW,height:GH,protectedTile:worldArt.protectedTile,
  usable:(x,y,site)=>{
   if(!site||siteAt(x,y)!==site||inR(SITE,x,y)||campaignChapter()>=2&&inR(FLEET,x,y))return false;
   const hall=areaAt(x,y);
   return !hall||hlv(hall.id)>0||logisticsHall(x,y);
  }
 };
 const previous=FactoryGrid.industrialArea(plots(originalHallRect),options).tiles;
 const yards=[];
 const [north,south]=yardLayout.depths;
 if(north&&['met','vrs','elk','ene','fzg'].some(hlv))yards.push([6,18,yardLayout.mainRight,21+north]);
 if(south&&['hit','bnk'].some(hlv))yards.push([6,40+north,yardLayout.mainRight,43+north+south]);
 if(yardLayout.east)for(const [left,right] of FactoryYard.hallPairs){
  if(!hlv(left)||!hlv(right))continue;
  const a=hrect(hallOf(left)),b=hrect(hallOf(right));
  yards.push([a[2]+1,Math.min(a[1],b[1]),b[0]-1,Math.max(a[3],b[3])]);
 }
 industrial=FactoryGrid.industrialArea(plots(hrect),{...options,apron:6,corridor:2,previous,
  yards:yards.map(rect=>({rect,site:REGIONS[0]}))});
}
function compactPortBridges(objects,compacted,canBridge){
 if(!compacted.size)return [];
 const previous=new Map(),oldGrid=[],currentGrid=[],bridges=[];
 const inside=(x,y)=>x>=0&&y>=0&&x<GW&&y<GH;
 const oldCell=(x,y)=>inside(x,y)?oldGrid[y*GW+x]:null;
 for(const o of objects){
  const old=compacted.has(o)?{...o,base:compacted.get(o)}:o;
  previous.set(o,old);
  for(const [x,y] of footprint(old))if(inside(x,y))oldGrid[y*GW+x]=old;
  for(const [x,y] of footprint(o))if(inside(x,y))currentGrid[y*GW+x]=o;
 }
 // The old extension becomes a short belt only when it used to carry a connection.
 for(const o of compacted.keys())for(let d=0;d<4;d++){
  const old=previous.get(o),[x,y]=port(o,d),[a,b]=port(old,d);
  if((x===a&&y===b)||!inside(x,y)||currentGrid[y*GW+x])continue;
  const peer=oldCell(a,b),opposite=(d+2)%4;
  if(!peer||!canBridge(x,y,a,b))continue;
  const sending=fdn(old,opposite)&&compatiblePort(old,peer,d);
  const receiving=fdn(peer,d)&&oldCell(...port(peer,opposite))===old&&compatiblePort(peer,old,opposite);
  if(sending||receiving){
   const row={x,y,t:'belt',r:sending?d:opposite,base:[1,1]};
   currentGrid[y*GW+x]=row;bridges.push(row);
  }
 }
 return bridges;
}
function logisticsHall(x,y,lastX=x,lastY=y){
 const fits=rect=>inR(rect,x,y)&&inR(rect,lastX,lastY);
 return HL.some(h=>hlv(h.id)>0&&fits(hrect(h)))||
  legacyYards.some(plot=>fits(plot.rect));
}
function refreshLogisticsPlacement(){
 for(const o of L){
  if(!isLogistics(o.t))continue;
  const site=siteAt(o.x,o.y);
  o.needsRelocation=footprint(o).some(([x,y])=>siteAt(x,y)!==site||bchk(x,y,o.t,true,true));
 }
}
let rejectedBuild=null;
function migrateLegacy(save){
 const plots=Object.values(save.ar||{}).filter(id=>legacyPlots.some(plot=>plot.id===id));
 const research=Object.values(save.rs||{});
 const types=Object.values(save.o||{}).flatMap(row=>row&&typeof row==='object'?[row[2]]:[]);
 const hl={gar:1};
 if(research.includes('met')||types.some(type=>MD[type]?.a==='met'))hl.met=1;
 if(plots.includes('e')||research.includes('elk')||types.some(type=>MD[type]?.a==='elk'))hl.elk=1;
 return {...save,v:2,hl,legacyPlots:plots};
}
let yardLinks=[];
function setYardLayout(version,removed){
 yardLayout=FactoryYard.create(version,removed);
 GW=yardLayout.width;GH=yardLayout.height;
 SITE=layoutRect(bunkerOriginal);FLEET=layoutRect(fleetOriginal);
 [worldArt,drawBunker]=yardArt(yardLayout);
}
function attachYardLinks(links){
 for(const {from,to} of yardLinks){
  delete from.yardOutputs;delete from.yardTunnel;
  delete from.yardBlocked;delete from.yardBlockedTunnel;
  delete to.yardInputs;delete to.yardFeeders;
 }
 yardLinks=links;
 for(const {from,to,d,tunnel,reverse,blocked} of links){
  if(blocked){
   if(tunnel)from.yardBlockedTunnel=to;
   else (from.yardBlocked??=[])[d]=to;
   continue;
  }
  if(tunnel)from.yardTunnel=to;
  else{
   (from.yardOutputs??=[])[d]=to;
   if(reverse)(to.yardInputs??=[])[(d+2)%4]=from;
  }
  (to.yardFeeders??=new Set()).add(from);
 }
}
function forgetYardLinks(objects){
 if(yardLinks.some(({from,to})=>objects.has(from)||objects.has(to))){
  attachYardLinks(yardLinks.filter(({from,to})=>!objects.has(from)&&!objects.has(to)));
 }
}
function readYardLinks(saved){
 const links=[];
 for(const row of Object.values(saved||{})){
  if(!row||![row[0],row[1],row[2],row[3]].every(Number.isInteger)||![0,1,2,3,4].includes(row[4]))continue;
  const from=cell(row[0],row[1]),to=cell(row[2],row[3]),tunnel=row[4]===4;
  if(!from||!to||from===to||from.x!==row[0]||from.y!==row[1]||to.x!==row[2]||to.y!==row[3])continue;
  if(siteAt(from.x,from.y)!==REGIONS[0]||siteAt(to.x,to.y)!==REGIONS[0])continue;
  if(tunnel&&(from.t!=='tunnel'||to.t!=='tunnel'||from.r!==to.r))continue;
  links.push({from,to,d:tunnel?from.r:row[4],tunnel,reverse:row[5]===true,blocked:row[6]===true});
 }
 return links;
}
function expandSavedYard(legacyTunnels){
 const expanded=FactoryYard.create(3),offset=o=>expanded.point(o.x,o.y)[1]-o.y;
 // An older or manually edited save can contain a footprint across a cut.
 // Keep the entire original layout if that footprint cannot move as a unit.
 if(L.some(o=>footprint(o).some(([x,y])=>expanded.point(x,y)[1]-y!==offset(o))))return false;

 const links=[];
 for(const from of L){
  for(let d=0;d<4;d++){
   if(!fdn(from,(d+2)%4))continue;
   const to=neighbor(from,d);
   if(!compatiblePort(from,to,d)||offset(from)===offset(to)||siteAt(from.x,from.y)!==siteAt(to.x,to.y))continue;
   const reverse=inputNeighbor(to,(d+2)%4)===from;
   if(isBelt(from.t)&&to.j&&!reverse)continue;
   links.push({from,to,d,reverse});
  }
  const to=legacyTunnels&&legacyTunnelExit(from);
  if(to&&offset(from)!==offset(to))links.push({from,to,d:from.r,tunnel:true});
 }
 setYardLayout(3);
 g=[];
 for(const o of L){o.y+=offset(o);mapObject(o,o)}
 for(const manager of G.mg)if(manager.x>=0&&manager.y>=0)manager.y+=offset(manager);
 attachYardLinks(links);
 refreshIndustrialArea();
 refreshLogisticsPlacement();
 return true;
}
function widenSavedYard(legacyTunnels){
 const occupied=new Set();
 for(const o of L)for(const [x,y] of footprint(o))if(x<FactoryYard.annexStart)occupied.add(y);
 const removed=FactoryYard.previousRows(occupied);
 const project=(x,y)=>FactoryYard.widen(x,y,removed);
 const moves=L.map(o=>({o,dest:project(o.x,o.y)}));
 // Keep a saved multi-tile building intact if it spans one of the new boundaries.
 if(moves.some(({o,dest:[a,b]})=>footprint(o).some(([x,y])=>{
  const [u,v]=project(x,y);
  return u-a!==x-o.x||v-b!==y-o.y;
 })))return false;

 const links=yardLinks.slice(),ports=[],tunnels=[];
 for(const from of L){
  if(from.x>=FactoryYard.annexStart||from.needsRelocation)continue;
  for(let d=0;d<4;d++){
   if(!fdn(from,(d+2)%4)||from.yardOutputs?.[d])continue;
   const peer=neighbor(from,d),reverse=peer&&inputNeighbor(peer,(d+2)%4)===from;
   const active=compatiblePort(from,peer,d)&&siteAt(from.x,from.y)===siteAt(peer.x,peer.y)&&(!isBelt(from.t)||!peer.j||reverse);
   ports.push({from,d,to:active?peer:null,reverse});
  }
  if(legacyTunnels&&from.t==='tunnel'&&!from.yardTunnel)tunnels.push({from,to:legacyTunnelExit(from),d:from.r,tunnel:true});
 }
 setYardLayout(4,removed.map(rows=>rows.length));
 g=[];
 for(const {o,dest:[x,y]} of moves){o.x=x;o.y=y;mapObject(o,o)}
 for(const manager of G.mg)if(manager.x>=0&&manager.y>=0)[manager.x,manager.y]=project(manager.x,manager.y);
 if(G.guide)G.guide.anchor=project(...G.guide.anchor);
 for(const link of ports){
  const {from,to,d,reverse}=link,next=physicalNeighbor(from,d);
  if(to&&(to!==next||isBelt(from.t)&&to.j&&reverse&&physicalNeighbor(to,(d+2)%4)!==from))links.push(link);
  else if(!to&&compatiblePort(from,next,d))links.push({...link,to:next,reverse:false,blocked:true});
 }
 for(const link of tunnels){
  const {from,to}=link,next=physicalTunnelExit(from,cell);
  if(to===next)continue;
  links.push(to?link:{...link,to:next,blocked:true});
 }
 attachYardLinks(links);
 refreshIndustrialArea();
 refreshLogisticsPlacement();
 if(currentSite!=='main')centerSite(REGIONS.find(site=>site.id===currentSite));
 return true;
}
function init(value,target=latestLayout){
 const legacy=value&&(value.v==null||value.v===1);
 const d=legacy?migrateLegacy(value):value;
 attachYardLinks([]);
 tunnelPairs.clear();
 setYardLayout(d?.v??latestLayout,d?.yardRows);
 resetPlanning();researchTab='basic';rsel=null;
 projectCargo.clear();projectTrucks.length=0;
 rejectedBuild=null;
 currentSite='main';traffic.clear();teamPaths.clear();teamTrips.length=0;teamHall='gar';teamTab=0;teamSpecialty=null;
 G={plans:[],crew:{},contracts:[],contractWins:{},supplyOrders:{},epoch:0,stock:{},activeBoosts:{},milestones:{},lineCounts:{},wins:{},history:[],units:0,productTracks:{},recent:FactoryTelemetry.create(0,TICK),goals:{mass:0,quality:0,efficiency:0,logistics:0,lab:0},legacyPlots:[],m:120,te:0,sold:0,made:0,pk:0,cost:0,tk:0,ord:0,od:[],hl:{gar:1},pc:{},sl:new Array(ITEMS.length).fill(0),saleIncome:{},rp:0,rs:[],ds:new Array(ITEMS.length).fill(0),emp:{p:0,q:0,l:0,w:0,d:0,a:0},mg:[],wc:0,xp:0,pl:0,bt:[],ac:[],campaign:readCampaign(d,false),legacyIndustry:readLegacyIndustry(d),tu:-1,th:[],sp:0,sq:[],st:0,sd:0,sf:{},late:0,end:0};L=[];g=[];
 if(d)G.campaign=readCampaign(d,d.sp>=PH.length);
 const compacted=new Map();
 if(d){for(const k of['m','te','sold','made','pk','cost','tk','ord','rp','wc','xp','pl','sp','st','sd','late','end'])if(typeof d[k]=='number')G[k]=d[k];
  for(let i=0;i<ITEMS.length;i++){
   if(Number.isFinite(d.sl?.[i])&&d.sl[i]>=0)G.sl[i]=d.sl[i];
   if(Number.isFinite(d.ds?.[i])&&d.ds[i]>=0)G.ds[i]=d.ds[i];
   if(Number.isFinite(d.saleIncome?.[i])&&d.saleIncome[i]>0)G.saleIncome[i]=d.saleIncome[i];
  }
  // Keep the old market data intact for save compatibility. It has no effect on sales.
  if(d.sa&&typeof d.sa==='object')G.legacySaturation=d.sa;
  for(const row of Object.values(d.o||{})){if(!row||typeof row!='object')continue;const e=row;const t=e[2];if(!knownType(t)||!visibleModel(MD[t]))continue;
   const base=e[10]?.large===true?defaultSize(t):[1,1],shape={x:e[0],y:e[1],r:(e[3]|0)&3,base};
   if(!Number.isInteger(shape.x)||!Number.isInteger(shape.y)||footprint(shape).some(([x,y])=>x<0||y<0||x>=GW||y>=GH||cell(x,y)))continue;
   const o=put(shape.x,shape.y,t,shape.r,Math.max(1,Math.min(100,e[4]|0)),base);o.it=Number.isInteger(e[5])&&ITEMS[e[5]]?e[5]:-1;{const v=e[6],r=MD[t]&&MD[t].r;if(r){if(typeof v=='number'){const i=r.findIndex(a=>a[0]==v);if(v>=0&&i>=0)o.iv[i]=1}else if(v)Object.values(v).forEach((n,i)=>{if(i<o.iv.length)o.iv[i]=Math.max(0,Math.min(500,n|0))})}}o.out=Number.isInteger(e[7])&&ITEMS[e[7]]?e[7]:-1;if(isStorage(t)&&e[8]&&typeof e[8]=='object')o.q=Object.values(e[8]).filter(v=>Number.isInteger(v)&&ITEMS[v]).slice(0,16384);
   if(o.j&&typeof e[9]=='string'){const a=e[9].split(o.j==1?'':',').map(Number);if(a.length==4&&a.every(v=>!isNaN(v))){if(o.j==1)o.jm=a.map(v=>Math.max(0,Math.min(2,v)));else o.xs=a.map(v=>ITEMS[v]?v:-1)}}
   const extra=e[10];
   if(extra&&typeof extra=='object'){
    if(extra.large===true&&MD[t]?.previousSize)compacted.set(o,MD[t].previousSize);
    for(const key of ['up','spec','paused','priority','control','threshold','supplyItem','supplyStock']){
     if(Object.hasOwn(extra,key))o[key]=extra[key];
    }
    o.wk=prod(o)&&!!MD[t].r&&extra.wk===true?1:0;
    o.p=prod(o)&&Number.isFinite(extra.p)?Math.max(0,Math.min(MD[t].w,extra.p)):0;
    o.iq=qvalue(extra.iq);o.oq=qvalue(extra.oq);o.pq=qvalue(extra.pq);
    o.jumped=extra.jumped===true;
    o.legacyTunnelPass=t==='tunnel'&&extra.legacyTunnelPass===true;
    o.teamDepot=isStorage(t)&&extra.teamDepot===true;
    if(o.j===1){o.rr=extra.rr&3;o.pr=extra.pr&3}
    o.sortRule=Number.isInteger(extra.sortRule)&&(t=='sorter'?!!sortingGroups[extra.sortRule]:!!ITEMS[extra.sortRule])?extra.sortRule:-1;
    o.smartMode=Math.max(0,Math.min(2,extra.smartMode|0));o.stats=newStats(extra.stats);
    o.recent=FactoryTelemetry.create(G.tk,TICK,extra.recent);
    if(isBelt(t)||o.j===1){
     const limit=o.j===1?1:maxBeltBuffer-1;
     o.queue=Object.values(extra.queue||{}).filter(row=>ITEMS[row?.[0]]).slice(0,limit).map(row=>[row[0],qvalue(row[1]),row[2]&3,-1,row[4]===true]);
    }
    if(o.j===1)for(let dir=0;dir<4;dir++){
     const parcel=extra.inQueue?.[dir];
     if(ITEMS[parcel?.[0]])o.inQueue[dir]=[parcel[0],qvalue(parcel[1]),dir,-1,false];
    }
    if(o.j===2)for(let dir=0;dir<4;dir++){
     const parcel=extra.xQueue?.[dir];
     if(ITEMS[parcel?.[0]])o.xQueue[dir]=[parcel[0],qvalue(parcel[1]),-1];
    }
    o.ivq=o.iv.map((n,i)=>n*qvalue(extra.ivq?.[i]));
    o.credits=o.iv.map((_,i)=>Math.max(0,Math.min(9,extra.credits?.[i]|0)));
    o.qq=o.q.map((_,i)=>qvalue(extra.qq?.[i]));o.xq=o.xq.map((_,i)=>qvalue(extra.xq?.[i]));
    o.ag=Number.isFinite(extra.ag)?Math.max(0,Math.min(1,extra.ag)):0;
    o.ein=Number.isInteger(extra.ein)&&extra.ein>=0&&extra.ein<4?extra.ein:o.ein;
   }else{
    o.ivq=o.iv.map(n=>n*100);o.qq=o.q.map(()=>100);
   }
  }
  G.legacyPlots=legacyPlots.filter(plot=>Object.values(d.legacyPlots||{}).includes(plot.id)).map(plot=>plot.id);
  G.hl={gar:1};if(d.hl)for(const h of HL){const l=d.hl[h.id]|0;if(l>0&&(h.chapter||1)<=campaignChapter())G.hl[h.id]=Math.min(h.rc.length,l)}
  G.rs=Object.values(d.rs||{}).filter(id=>id==='grd'||RN.some(n=>n.id==id));
  if(d.transportVersion!==2)G.rs=upgradeSavedResearch(G.rs);
  if(d.emp)for(const k of Object.keys(G.emp))G.emp[k]=Math.max(0,Math.min(12,d.emp[k]|0));
  for(const {id} of crewRoles){
   let available=G.emp[id];
   for(const hall of HL){
    if(!hlv(hall.id))continue;
    const saved=d.crewVersion===1?d.crew?.[hall.id]?.[id]:hall.id==='gar'?available:0;
    const amount=Math.max(0,Math.min(available,saved|0));
    if(amount){(G.crew[hall.id]??={})[id]=amount;available-=amount}
   }
  }
  G.mg=Object.values(d.mg||{}).filter(e=>e&&MG.some(g=>g.id===e.id)).map(e=>({id:e.id,lv:Math.max(1,Math.min(10,e.lv|0||1)),sp:Math.max(0,Math.min(2,e.sp|0)),x:e.x==null?-1:e.x|0,y:e.y==null?-1:e.y|0,hall:hlv(e.hall)?e.hall:undefined}));
  G.bt=Object.values(d.bt||{}).filter(t=>t=='belt'||MD[t]);G.ac=Object.values(d.ac||{}).filter(id=>AC.some(a=>a.id===id));
  G.tu=typeof d.tu=='number'?d.tu:-1;G.th=d.th?Object.values(d.th).filter(x=>typeof x=='string'):[];
  G.sp=Math.max(0,Math.min(PH.length,G.sp|0));G.sq=Object.values(d.sq||{}).map(v=>Math.max(0,v|0));G.sf=d.sf&&typeof d.sf=='object'&&!Array.isArray(d.sf)?d.sf:{};
  G.campaign=readCampaign(d,G.sp===PH.length);
  G.guide=readGuide(d.guide);
  G.tu=G.tu<guideSteps().length?Math.max(-1,G.tu|0):-1;
  G.tutorialPaused=d.tutorialPaused===true;
  G.tutorialAward=d.tutorialAward??(!d.guide&&d.tu<0);
  if(campaignChapter()===2&&G.campaign.stage===0&&d.story?.version===1&&d.guide===undefined){
   G.guide=newGuide('fleet',yardLayout.point(155,12));G.tu=0;
  }
  if(campaignChapter()>=2)G.hl.orb=Math.max(1,G.hl.orb||0);
  const compensation=legacyCompensation(d);
  G.m+=compensation.money;G.rp+=compensation.research;
  G.plans=readPlans(d.plans,d.transportVersion!==2);
  // Retired expansion data is kept in saves without applying its former effects.
  G.epoch=Math.max(0,d.epoch|0);
  G.units=Number.isFinite(d.units)?Math.max(0,d.units):G.made;
  G.productTracks=readProductTracks(d.productTracks);
  G.recent=FactoryTelemetry.create(G.tk,TICK,d.recent);
  G.history=Object.values(d.history||{}).filter(row=>Number.isFinite(row?.value)&&Number.isFinite(row?.sales)&&Number.isFinite(row?.units)&&Number.isFinite(row?.cost)&&Number.isFinite(row?.wages)&&Number.isFinite(row?.tick)).slice(-96);
  for(const id of Object.keys(G.goals)){
   G.goals[id]=id=='efficiency'?Number(d.goals?.[id])||0:Math.max(0,Number(d.goals?.[id])||0);
   if(d.wins?.[id])G.wins[id]=1;
  }
  G.stock={...d.stock};
  G.activeBoosts={...d.activeBoosts};
  for(const hall of HL){
   G.lineCounts[hall.id]=Math.max(0,Number(d.lineCounts?.[hall.id])||0);
   G.milestones[hall.id]=Math.max(0,Math.min(LINE_LEVELS.length,d.milestones?.[hall.id]|0));
  }
  const savedSite=REGIONS.find(site=>site.id==d.site&&siteAvailable(site)&&(!site.hall||hlv(site.hall)));
  if(savedSite&&savedSite.id!='main')switchSite(savedSite);
  G.contracts=Object.values(d.contracts||{});
  G.contractWins={...d.contractWins};
  G.supplyOrders={...d.supplyOrders};
  G.rr=d.rr==null?null:d.rr|0;G.pc={};if(d.pc&&typeof d.pc=='object')for(const k in d.pc)if(typeof d.pc[k]=='number'&&d.pc[k]>0)G.pc[k]=d.pc[k];
  for(const entry of Object.values(d.od||{})){
   const s=entry?.[0],n=entry?.[1],done=entry?.[2]??0,reward=entry?.[3];
   if(!Number.isInteger(s)||!visibleItem(s)||!ITEMS[s]?.oq||!Number.isInteger(n)||n<=0||!Number.isInteger(done)||done<0||done>=n)continue;
   G.od.push({s,n,d:done,r:Number.isFinite(reward)&&reward>=0?reward:baseOrderReward(s,n)});
  }
 }
 else{G.m=220;G.tu=0;G.guide=newGuide('build',[7,6]);G.tutorialAward=false;rot=3;pg='h';tool='hand';}
 G.story=FactoryStory.read(d,storyUnlocked);
 storyReplay=null;storyFocus=false;storyLastCue='';
 refreshIndustrialArea();
 const bridges=compactPortBridges(L,compacted,(x,y,a,b)=>siteAt(a,b)===siteAt(x,y)&&!bchk(x,y,'belt',true,true));
 for(const {x,y,t,r} of bridges)put(x,y,t,r);
 refreshLogisticsPlacement();
 const oldTunnels=d&&d.transportVersion!==2;
 const savedPairs=oldTunnels?[]:readTunnelPairs(d?.tunnelPairs);
 if(d?.v>=3)attachYardLinks(readYardLinks(d.yardLinks));
 else if(d&&target>=3)expandSavedYard(oldTunnels);
 if(yardLayout.version===3&&target>=4)widenSavedYard(oldTunnels);
 if(oldTunnels){
  for(const o of L)if(o.t==='tunnel'){
   const to=legacyTunnelExit(o);
   if(to)rememberTunnel(o,to);
   else o.legacyTunnelPass=true;
  }
  attachYardLinks(yardLinks.filter(link=>!link.tunnel));
 }else for(const [from,to] of savedPairs)rememberTunnel(from,to);
 if(legacy){
  G.sf={...G.sf,mig:1};
  stQ.push(storyCard('Spielstand übernommen','Deine Fabrik ist wieder da',[
   'Gebäude, Lagerbestände, Guthaben und Freischaltungen wurden aus deinem früheren Spielstand übernommen.'
  ]));
 }
 sb.fill(d&&d.rt?d.rt/60:0);rw=d&&d.rt?60:0;sc=Math.floor(G.tk*TICK);setLv();rfx();transportCycle=0;recalc()
}
function acc2(o,item){
 const recipe=MD[o.t]?.r;
 if(!recipe)return -1;
 return recipe.findIndex(([id],i)=>id==item&&o.iv[i]<inputCap(o,i));
}
const uses=(o,item)=>!!MD[o.t]?.r?.some(([id])=>id==item);
const can=(o,r)=>r.every(([,count],i)=>o.iv[i]>=count);
const fdn=(n,d)=>{
 if(!n||n.needsRelocation||terminal(n.t))return false;
 const direction=(d+2)%4;
 if(n.t=='sort'||n.t=='smart'||MD[n.t]?.sortStation)return n.r==direction||(n.r+1)%4==direction||(n.t=='smart'&&(n.r+3)%4==direction);
 return n.j==1?n.jm[direction]==2:n.j==2||n.r==direction;
};
function feeders(o){
 const found=new Set();
 for(const [x,y] of footprint(o))for(let d=0;d<4;d++){
  const n=cell(x+DX[d],y+DY[d]);
  if(n!==o&&fdn(n,d)&&neighbor(n,(d+2)%4)===o)found.add(n);
 }
 for(const from of o.tunnelIn||[])if(tunnelExit(from)===o)found.add(from);
 for(const n of o.yardFeeders||[]){
  if(tunnelExit(n)===o||[0,1,2,3].some(d=>fdn(n,(d+2)%4)&&neighbor(n,d)===o))found.add(n);
 }
 return [...found];
}
const ups=q=>{const seen=new Set([q]),st=[q],res=new Set();while(st.length){for(const n of feeders(st.pop()))if(!seen.has(n)){seen.add(n);st.push(n);if(MD[n.t]&&MD[n.t].o!=null)res.add(n)}}return res};
const mixed=(b,id)=>{const seen=new Set([b]),st=[b];while(st.length&&seen.size<60){for(const n of feeders(st.pop())){if(seen.has(n))continue;seen.add(n);if(isBelt(n.t)){if(n.it==id||n.queue.some(row=>row[0]==id))return true;st.push(n)}else if(n.j){if(n.it==id||n.queue.some(row=>row[0]===id)||n.inQueue.some(row=>row?.[0]===id)||n.xs.includes(id)||n.xQueue.some(row=>row?.[0]===id))return true;st.push(n)}else if(isStorage(n.t)){if(n.q.includes(id))return true;st.push(n)}else if(n.out==id)return true}}return false};
const activeRamp=()=>campaignChapter()===1?'prj':'orbitRamp';
const projectPhase=(type=activeRamp())=>type==='prj'?PH[G.sp]:chapters[campaignChapter()]?.phases[G.campaign.stage];
const projectStock=(type=activeRamp())=>type==='prj'?G.sq:G.campaign.delivery;
const prjNeed=(item,type=activeRamp())=>projectPhase(type)?.q.some(([id,target],i)=>id===item&&(projectStock(type)[i]||0)<target)===true;
function prjIn(item,ramp){
 const type=ramp?.t??'prj',phase=projectPhase(type),stock=projectStock(type);
 if(!phase)return false;
 const index=phase.q.findIndex(([id,target],i)=>id===item&&(stock[i]||0)<target);
 if(index<0)return false;
 stock[index]=(stock[index]||0)+1;
 if(type==='prj'){
  G.sd++;
  if(ramp&&!fs&&!ff&&!reducedMotion)queueProjectCargo(ramp,item);
 }else G.campaign.total++;
 xp(.3);
 finishProjectPhase(type);
 return true;
}
function sellProduct(q,item){
 const value=salePrice(item,q.pb||1);
 G.sl[item]++;
 G.saleIncome[item]=(G.saleIncome[item]||0)+value;
 G.m+=value;G.te+=value;G.sold++;record(q,'sold');record(q,'value',value);q.activity=G.tk;
 xp(.2);
 if(G.sold%2000==0){
  G.rp++;
  if(!fs)toast('Meilenstein: '+G.sold+' Produkte verkauft (+1 FP)');
 }
 sb[sc%60]+=value;
 if(item==5)G.pk++;
 ordD(item,q);
 if(!fs)PO.push({x:(q.x+.5)*TS,y:q.y*TS,t:0,v:'+'+value});
 return true;
}
function receiveStorage(store,item,quality){
 if(store.q.length>=cap(store))return false;
 store.q.push(item);store.qq.push(quality);
 if(store.stockCycle!==transportCycle){store.stockCycle=transportCycle;store.newStock=0}
 store.newStock++;
 record(store,'arrivals');store.activity=G.tk;store.incoming=item;
 return true;
}
function receiveRecipe(machine,item,quality){
 const i=acc2(machine,item);
 if(i<0)return false;
 machine.iv[i]++;machine.ivq[i]+=quality;
 return true;
}
function give(o,d,s,quality=100,jump=null){
 if(jump&&tunnelExit(o)!==jump)return false;
 const q=jump||neighbor(o,d);
 if(!q||o.needsRelocation||q.needsRelocation||!ITEMS[s]||siteAt(o.x,o.y)!==siteAt(q.x,q.y))return false;

 const entry=(d+2)%4;
 if(isBelt(q.t)){
  if(q.t==='tunnel'&&!jump&&!tunnelSurfaceInput(q))return false;
  if(beltCount(q)>=beltSize(q.t)||q.r==entry)return false;
  const parcel=[s,quality,entry,transportCycle,!!jump];
  if(q.it<0)loadParcel(q,parcel);
  else q.queue.push(parcel);
  return true;
 }
 if(q.j==1){
  if(q.jm[entry]!==1||q.inQueue[entry])return false;
  q.inQueue[entry]=[s,quality,entry,transportCycle,false];
  return true;
 }
 if(q.j==2){
  if(q.xQueue[entry])return false;
  if(q.xs[entry]>=0)q.xQueue[entry]=[s,quality,transportCycle];
  else{q.xs[entry]=s;q.xq[entry]=quality;q.xm[entry]=transportCycle}
  return true;
 }
 if(isProjectRamp(q.t))return prjIn(s,q);
 if(isStorage(q.t))return receiveStorage(q,s,quality);
 if(MD[q.t]?.inspect){
  if(q.it>=0)return false;
  q.it=s;q.iq=quality;q.ag=0;q.mt=G.tk;return true;
 }
 if(typeShip(q.t))return sellProduct(q,s);
 return receiveRecipe(q,s,quality);
}
function startRecipe(o,d){
 let used=0;
 for(const [i,[,count]] of d.r.entries()){
  const average=o.ivq[i]/o.iv[i];
  o.iv[i]-=count;o.ivq[i]=o.iv[i]*average;used+=count;
 }
 o.wk=1;record(o,'materials',used);
}
function dispatchProduct(o){
 if(give(o,o.r,o.out,o.oq))o.out=-1;
}
function produce(o){
 const d=MD[o.t];
 if(o.out>=0)dispatchProduct(o);
 let work=TICK*spd(o),status=2;
 // Keep fractional progress at high levels without accumulating work during a blockage.
 for(let cycle=0;cycle<16&&work>0;cycle++){
  if(o.out>=0){
   if(d.r?can(o,d.r):G.m>=d.rc*RCm)record(o,'blockedWork',work/d.w);
   return status==1?1:3;
  }
  const raw=!d.r;
  const cost=raw?d.rc*RCm:0;
  if(raw&&G.m<cost)return status;
  if(!raw&&!o.wk){
   if(!can(o,d.r))return status;
   startRecipe(o,d);
  }
  const done=Math.min(work,Math.max(0,d.w-o.p));
  o.p+=done;work-=done;status=1;
  if(o.p+1e-9<d.w)break;
  o.p=0;o.wk=0;o.out=d.o;o.oq=100;
  G.pc[d.o]=(G.pc[d.o]||0)+1;record(o,'output');G.units++;
 const hall=areaAt(o.x,o.y)?.id||d.a;
 G.lineCounts[hall]=(G.lineCounts[hall]||0)+1;
  recordProduct(o,hall,d.o);
  if(raw){G.m-=cost;G.cost+=cost;record(o,'cost',cost);record(o,'materials');sb[sc%60]-=cost}
  else{
   G.made++;
   if(!G.ds[d.o]){
    G.ds[d.o]=1;G.rp+=2;xp(20);
    if(!fs){toast('Neues Produkt entdeckt: '+ITEMS[d.o].n+' (+2 Forschungspunkte)');sfx('discover')}
   }
  }
  dispatchProduct(o);
 }
 return status;
}
function releaseStorage(o){
 // A parcel can cross at most one tile per cycle, even between adjacent stores.
 const ready=o.q.length-(o.stockCycle===transportCycle?o.newStock:0);
 if(ready>0){
  const index=o.lv>1?o.q.findIndex((item,i)=>i<ready&&give(o,o.r,item,o.qq[i])):give(o,o.r,o.q[0],o.qq[0])?0:-1;
  if(index>=0){o.q.splice(index,1);o.qq.splice(index,1);record(o,'moves')}
 }
 o.st=o.q.length>=cap(o)?3:o.q.length?1:2;
}
function tick(){
 G.tk++;
 transportCycle++;
 const groups=new Map();
 G.st+=TICK;
 if(G.sp<PH.length&&!G.late&&G.st>=DAYS*DAYSEC)lateStory();
 const second=Math.floor(G.tk*TICK);
 if(second!=sc){
  sc=second;sb[sc%60]=0;rw=Math.min(60,rw+1);
  progressChecks();chkAc();
  if(second%60==0)sampleBusiness();
 }
 if(WG>0){
  const wage=Math.min(G.m,WG*TICK/60);
  G.m-=wage;G.wc+=wage;FactoryTelemetry.record(G.recent,G.tk,TICK,'wages',wage);sb[sc%60]-=wage;
 }
 for(const o of L){
  if(o.needsRelocation)continue;
  const key=logisticsPath(o.t);
  if(key){
   const rate=logisticsRates[key];
   let group=groups.get(rate);
   if(!group){
    const start=(G.tk-1)*rate%transferScale;
    group={rate,next:transferScale-start,junctions:[],belts:[],stores:[]};
    groups.set(rate,group);
   }
   if(group.next<=rate)(o.j?group.junctions:isStorage(o.t)?group.stores:group.belts).push(o);
   continue;
  }
  if(terminal(o.t))continue;
  if(MD[o.t].inspect){
   if(o.it>=0&&o.mt!==G.tk){
    o.ag+=TICK;
    if(o.ag>=.5&&give(o,o.r,o.it,o.iq))clearBelt(o);
   }
   o.st=o.it<0?2:o.ag>=.5?3:1;
   continue;
  }
  const status=produce(o);
  if(status==3)record(o,'blocked');
  o.st=status;
  o.ew=o.ew*.99+(status==1?.01:0);
  o.es=o.es*.99+(status==2?.01:0);
  o.eb=o.eb*.99+(status==3?.01:0);
 }
 // Peers at the same instant share a cycle, so ore cannot jump two devices at once.
 const active=[...groups.values()].filter(group=>group.next<=group.rate);
 while(active.length){
  const next=active.reduce((first,group)=>group.next*first.rate<first.next*group.rate?group:first);
  const numerator=next.next,denominator=next.rate;
  transportCycle++;
  for(let i=active.length-1;i>=0;i--){
   const group=active[i];
   if(group.next*denominator!==numerator*group.rate)continue;
   for(const o of group.junctions)jtick(o);
   for(const o of group.belts)moveBelt(o);
   for(const o of group.stores)releaseStorage(o);
   group.next+=transferScale;
   if(group.next>group.rate)active.splice(i,1);
  }
 }
 if(G.tk%8===0)workCrews();
}
function analyze(){
 finishProjectPhase(activeRamp());
 fillOrders();recalc();chkAc();progressChecks();bn=null;const ms=L.filter(o=>MD[o.t]&&MD[o.t].o!=null),bad=L.find(o=>o.bad);
 if(bad&&neighbor(bad,beltDirections(bad)[0])){const q=neighbor(bad,beltDirections(bad)[0]),nd=isProjectRamp(q.t)?projectPhase(q.t)?.q.filter(([item])=>prjNeed(item,q.t)).map(([item])=>ITEMS[item].n).join(' / '):(MD[q.t].r||[]).map(a=>ITEMS[a[0]].n).join(' + ');bn=q;msg=`Falsches Material: ${MD[q.t].n} bekommt ${ITEMS[bad.it].n}, braucht aber ${nd||'keine Lieferung'}.`;return}
 for(const b of L)if(isBelt(b.t)&&b.wt&&b.it>=0){const q=cell(b.x+DX[b.r],b.y+DY[b.r]),r=q&&MD[q.t]&&MD[q.t].r;if(r&&r.length>1&&acc2(q,b.it)<0){const mi=r.findIndex((a,i)=>q.iv[i]<a[1]);if(mi>=0&&mixed(b,r[mi][0])){bn=q;msg=`${MD[q.t].n} ist verstopft: Das Band liefert nur ${ITEMS[b.it].n}, ${ITEMS[r[mi][0]].n} fehlt. Führe die Materialien über getrennte Bänder zu.`;return}}}
 const sat=ms.filter(o=>o.ew>.8),stv=ms.filter(o=>MD[o.t].r&&o.es>.2);let c1=null,q1=null;
 for(const q of stv){const U=ups(q);for(const x of sat)if(U.has(x)&&(!c1||MD[x.t].dp>=MD[c1.t].dp)){c1=x;q1=q}}
 if(c1){bn=c1;msg=`Engpass: ${MD[c1.t].n} (Lv ${c1.lv}) ist zu ${Math.round(c1.ew*100)} % ausgelastet, ${MD[q1.t].n} wartet ${Math.round(q1.es*100)} % der Zeit. Upgrade: ${tme(c1).toFixed(1)} s → ${tme(c1,c1.lv+1).toFixed(1)} s`;return}
 const w2=ms.find(o=>MD[o.t].r&&MD[o.t].r.length>1&&o.es>.5&&o.iv.some(v=>v>0));
 if(w2){const r=MD[w2.t].r,mi=r.findIndex((a,i)=>w2.iv[i]<a[1]);if(mi>=0){bn=w2;msg=`${MD[w2.t].n} wartet auf ${ITEMS[r[mi][0]].n} – die Zulieferung ist zu langsam oder unterbrochen.`;return}}
 if(ms.some(o=>!MD[o.t].r&&o.es>.5)&&G.m<3){msg='Kein Geld für Rohstoffe – verkaufe Produkte, um die Produktion fortzusetzen.';return}
 const full=L.find(o=>!o.needsRelocation&&isStorage(o.t)&&o.q.length>=cap(o));
 if(full){bn=full;msg='Zwischenlager voll: Lager ausbauen oder die Abnahme dahinter beschleunigen.';return}
 const blockedBelt=L.find(o=>!o.needsRelocation&&isBelt(o.t)&&o.wt&&beltCount(o)==beltSize(o.t));
 if(blockedBelt){bn=blockedBelt;msg='Förderband ausgelastet: Prüfe die Abnahme oder entlaste den Abschnitt mit einem zweiten Band.';return}
 const bl=lossPoint(ms);if(bl){bn=bl.object;msg=`Rückstau bei ${MD[bn.t].n}: bis zu ${bl.margin.toFixed(1)} €/Min. Marge. Abnahme hinter der Maschine prüfen.`;return}
 const mi=ORD.findIndex(t=>!L.some(o=>o.t==t));
 msg=mi>=0&&campaignChapter()===1?`Tipp: ${MD[ORD[mi]].n} in die Linie bauen – Grundwert ${ITEMS[mi+1].v} € pro Stück.`:tipStory()}
function tipStory(){if(campaignChapter()>=2){const next=projectPhase();return next?'Horizont · '+next.n+' – benötigte Waren an die Werftrampe liefern.':'Die Flotte ist startbereit.'}
 const q=PH[G.sp];if(!q)return'ARCHE ist fertig. Öffne das Bunkerprojekt, um die Kampagne fortzusetzen.';
 if(!hasProjectRamp())return`Bunker-Phase ${G.sp+1} „${q.n}“: Baue eine Bunker-Rampe neben der Linie und liefere die Quest-Waren an.`;
 const h=hallOf(q.hall);if(hlv(h.id)<1)return`Bunker-Phase ${G.sp+1} braucht die ${h.n}: Im Menü 🏭 Hallen freischalten (${fm(h.c[0])} €).`;
 const i=q.q.findIndex(([it,n],k)=>(G.sq[k]||0)<n);return i<0?'Phase abgeschlossen!':`Quest: ${ITEMS[q.q[i][0]].n} ${fm(G.sq[i]||0)} / ${fm(q.q[i][1])} – per Band zur Bunker-Rampe.`}
const rate=()=>{const total=sb.reduce((sum,value)=>sum+value,0);return total*60/Math.max(20,rw)};
/* ---- Aufträge (ohne Zeitdruck): Stücke einer Stufe liefern, Bonus bei Abschluss ---- */
const mk=(i,d)=>{const t=PR[i];if(!t||(d||0)>9||!L.some(o=>o.t==t))return false;return(MD[t].r||[]).every(a=>mk(a[0],(d||0)+1))};
function fillOrders(ban){const ok=ITEMS.map((x,i)=>x.oq&&visibleItem(i)&&mk(i)?i:-1).filter(i=>i>=0);
 G.od=(G.od||[]).filter(q=>q.d>0||ok.includes(q.s));
 while(G.od.length<OS){let f=ok.filter(i=>!G.od.some(q=>q.s==i)&&i!=ban);if(!f.length)f=ok.filter(i=>!G.od.some(q=>q.s==i));if(!f.length)break;const s=f[(G.ord+G.od.length+Math.floor(G.tk/2400)+(ban||0))%f.length],n=ITEMS[s].oq;G.od.push({s,n,d:0,r:baseOrderReward(s,n)})}}
const rrLeft=()=>G.rr==null?0:Math.max(0,Math.min(RRC,G.rr+RRC-G.tk)),rrFmt=()=>{const t=Math.ceil(rrLeft()*TICK);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
function rerollOrd(q){if(!q||q.d>0||!G.od.includes(q))return;if(rrLeft()>0){deny('Auftrag tauschen: wieder in '+rrFmt()+' Min.');return}const s=q.s;G.rr=G.tk;G.od=G.od.filter(x=>x!==q);fillOrders(s);sfx('select');sv(0)}
const orderFor=item=>G.od.find(q=>q.s==item&&q.d<q.n);
function ordD(s,ship){
 const result=orderFor(s);
 if(!result)return;
 const q=result;
 if(++q.d<q.n)return;
 const rw=orderReward(q);
 G.m+=rw;G.te+=rw;G.ord++;
 const points=G.ord<=2?2:G.ord%10===0?1:0;
 G.rp+=points;xp(25);record(ship,'value',rw);sb[sc%60]+=rw;
 if(!fs){toast('Auftrag erfüllt: +'+fm(rw)+' €'+(points?' und '+points+' FP':''));sfx('order')}
 G.od=G.od.filter(order=>order!==q);
 fillOrders();
}
/* ---- Kurven: Eingangsseite eines Bands bestimmen, Position eines Stücks auf Gerade/Bogen ---- */
function feed(o){const b=(o.r+2)%4;let sd=-1;for(const d of[b,(o.r+1)%4,(o.r+3)%4]){const q=cell(o.x+DX[d],o.y+DY[d]);if(fdn(q,d)){if(d==b)return b;sd=sd<0?d:-2}}return sd>=0?sd:b}
function itemPos(o){const b=(o.r+2)%4,e=o.ein==null||o.ein==o.r?b:o.ein,R=TS/2,cx=(o.x+.5)*TS,cy=(o.y+.5)*TS,t=o.wt?.78:transportProgress(o.t);
 if(e==b){const f=-R+t*TS;return[cx+DX[o.r]*f,cy+DY[o.r]*f]}
 const a=t*PI/2,u=R*(1-Math.sin(a)),v=R*(1-Math.cos(a));return[cx+DX[e]*u+DX[o.r]*v,cy+DY[e]*u+DY[o.r]*v]}
/* ---- Speichern ---- */
const cloud={ref:null,uid:null,base:null,status:'guest',pending:null,busy:false,localSaved:true,localKey:null,migrationBlocked:false,localMigrationBlocked:false,last:0,backoff:0,remote:null};
let saveOpen=false, saveAfterTick=false;
const {validSave,revision,cloudRevision,packCloudSave,unpackCloudSave,byteSize,openSaveStorage}=FactoryRuntime;
let saveStorage=null,latestLocalAttempt=0;
const diskSaves=new Map(),diskWrites=new Map();
function readLocal(key){
 let browserSave=null;
 try{browserSave=JSON.parse(localStorage.getItem(key))}catch{}
 const disk=diskSaves.get(key);
 if(disk&&(!browserSave||validSave(browserSave)&&(disk.ts>browserSave.ts||disk.ts===browserSave.ts&&disk.rev===browserSave.rev)))return disk;
 return browserSave;
}
function writeLocal(key,value){
 try{localStorage.setItem(key,JSON.stringify(value));return true}
 catch{return false}
}
function writeDisk(key,value){
 if(!saveStorage)return Promise.resolve(false);
 const previous=diskWrites.get(key);
 if(previous&&(previous.value===value||value.rev&&previous.value.rev===value.rev))return previous.promise;
 const entry={value,promise:null};
 entry.promise=saveStorage.write(key,value).then(()=>{
  diskSaves.set(key,value);return true;
 },()=>false).finally(()=>{if(diskWrites.get(key)===entry)diskWrites.delete(key)});
 diskWrites.set(key,entry);
 return entry.promise;
}
function storeSnapshot(key,value){
 const attempt=++latestLocalAttempt;
 cloud.localSaved=writeLocal(key,value);
 if(cloud.localSaved&&!diskSaves.has(key)&&!diskWrites.has(key)){cloud.localPending=false;sv.warned=false;return}
 const immediate=cloud.localSaved;
 cloud.localPending=!!saveStorage;
 writeDisk(key,value).then(written=>{
  if(attempt!==latestLocalAttempt)return;
  cloud.localPending=false;cloud.localSaved=immediate||written;
  if(cloud.localSaved){sv.warned=false;return}
  if(!sv.warned){sv.warned=true;toast(stillSignedIn()&&!cloud.migrationBlocked?'Lokale Sicherung fehlt. Cloud-Status unter Firma → Werkzeuge → Spielstand prüfen.':'Lokale Sicherung fehlt. Unter Firma → Werkzeuge → Spielstand als Datei sichern.')}
 });
}
const storeBackup=async(key,value)=>writeLocal(key,value)||await writeDisk(key,value);
function stillSignedIn(){
 return cloud.ref&&typeof OL!='undefined'&&OL.me===cloud.uid;
}
function cloudFailure(error){
 const code=String(error?.code||'')+' '+String(error?.message||error||'');
 if(/permission|denied|unauthor/i.test(code))return 'Firebase: Zugriff verweigert – Datenbank-Regeln prüfen.';
 if(/quota|limit|too.large|size|exceed/i.test(code))return 'Firebase: Speicher-, Transfer- oder Größenlimit erreicht.';
 if(/encoding|identity|save parts|newer browser|JSON/i.test(code))return 'Cloud-Daten nicht lesbar – Original bleibt unverändert.';
 return 'Cloud-Verbindung fehlgeschlagen; lokaler Stand bleibt erhalten.';
}
function readCloud(){
 const request=typeof cloud.ref.get=='function'?cloud.ref.get():cloud.ref.once('value');
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Cloud timeout')),4500);
  request.then(value=>{clearTimeout(timer);resolve(value.val())},error=>{clearTimeout(timer);reject(error)});
 });
}
function backupOriginal(save,suffix){
 if(!KEY)return true;
 const key=KEY+'.'+suffix,previous=readLocal(key);
 if(previous===null){
  const saved=writeLocal(key,save);
  if(!saved)writeDisk(key,save);
  return saved;
 }
 if(revision(previous)===revision(save))return true;
 const separate=key+'.'+revision(save).replace(/[^a-z0-9-]/gi,'-');
 if(readLocal(separate)!==null||writeLocal(separate,save))return true;
 writeDisk(separate,save);
 return false;
}
async function finishMigrationBackup(value){
 if(!saveStorage||!validSave(value))return;
 // Each stage may open a different backup key. Retry only while writes succeed.
 while(!backupBeforeMigration(value)&&diskWrites.size){
  if(!(await Promise.all([...diskWrites.values()].map(entry=>entry.promise))).every(Boolean))break;
 }
}
function backupBeforeMigration(save){
 if(needsCampaignMigration(save)&&!backupOriginal(save,'before-horizont-expansion'))return false;
 const oldTransport=save.transportVersion!==2&&(Object.values(save.o||{}).some(row=>logisticsPath(row?.[2]))
  ||Object.values(save.rs||{}).some(id=>logisticsPaths.belt.ids.includes(id))
  ||Object.values(save.plans||{}).some(plan=>Object.values(plan||{}).some(row=>row?.[2]==='tunnel'||buildType(row?.[2])!==row?.[2])));
 if(oldTransport&&!backupOriginal(save,'before-logistics-paths'))return false;
 if(save.v===4)return true;
 if(save.v===3)return backupOriginal(save,'before-side-yards');
 if(!backupOriginal(save,'before-logistics-yard'))return false;
 if(save.v!==2)return backupOriginal(save,'before-v2');
 const oversized=Object.values(save.o||{}).some(row=>row?.[10]?.large===true&&MD[row[2]]?.previousSize);
 const oldTeam=save.crewVersion!==1&&(crewRoles.some(role=>save.emp?.[role.id]>0)||Object.values(save.mg||{}).length>0);
 const oldIndustry=!save.legacyIndustry&&(save.bp>0||save.bpt>0||save.pr>0||Object.keys(save.pu||{}).length>0);
 return (!oversized||backupOriginal(save,'before-compact-buildings'))&&(!oldTeam||backupOriginal(save,'before-hall-teams'))&&(!oldIndustry||backupOriginal(save,'before-campaign'));
}
function applySave(value){
 stQ=[];ff=null;saveAfterTick=false;closeP2();
 const known=validSave(value);
 cloud.migrationBlocked=cloud.localMigrationBlocked||(known&&!backupBeforeMigration(value));
 init(known?value:null);
 ready=1;acc=Number.isFinite(value?.carry)?Math.max(0,Math.min(KOF*OFFE,value.carry)):0;
 lr=known&&value.ts<Date.now()?value.ts:Date.now();
 analyze();
}
function chooseSave(remote,local,guest){
 cloud.base=revision(remote);
 if(!validSave(remote)){
  if(remote!=null){cloud.status='invalid';return validSave(local)?local:null}
  cloud.status='local';return validSave(local)?local:validSave(guest)?guest:null;
 }
 if(validSave(local)&&(local.base===cloud.base||revision(local)===cloud.base)){
  cloud.status=revision(local)===cloud.base?'synced':'pending';
  return local;
 }
 if(validSave(local)&&local.ts>remote.ts){
  if(!writeLocal(KEY+'.recovery',local))writeDisk(KEY+'.recovery',local);
  cloud.status='recovered';
 }else cloud.status='synced';
 return remote;
}
function readAccountSave(){
 let raw=null,unsupportedLocal=false;
 try{
  raw=localStorage.getItem(KEY);
  unsupportedLocal=raw!==null&&!validSave(JSON.parse(raw));
 }catch{unsupportedLocal=raw!==null}
 const current=readLocal(KEY);
 const supported=validSave(current);
 cloud.localMigrationBlocked=supported&&!backupBeforeMigration(current);
 const compatibleKey=KEY+'.compatible',fallback=readLocal(compatibleKey);
 if(unsupportedLocal||cloud.localMigrationBlocked||!supported&&validSave(fallback)){
  cloud.localKey=compatibleKey;
  return validSave(fallback)?fallback:supported?current:null;
 }
 return current;
}
async function loadFactory(){
 const storage=openSaveStorage();
 if(storage){
  try{
   saveStorage=await storage;
   if(saveStorage){
    for(const [key,value] of await saveStorage.read([...new Set([KEY,'2pg_fe_guest'])]))diskSaves.set(key,value);
    await finishMigrationBackup(readLocal(KEY));
   }
  }catch{saveStorage=null;}
 }
 const local=readAccountSave();
 if(!stillSignedIn()){applySave(local);return}
 cloud.status='loading';
 try{
  const remote=await unpackCloudSave(await readCloud());
  if(!stillSignedIn())return;
  const chosen=chooseSave(remote,local,readLocal('2pg_fe_guest'));
  if(saveStorage){
   await diskWrites.get(KEY+'.recovery')?.promise;
   await finishMigrationBackup(chosen);
  }
  if(stillSignedIn())applySave(chosen);
 }catch(error){
  cloud.error=cloudFailure(error);
  cloud.base=validSave(local)?local.base??(local.rev?revision(local):null):null;
  cloud.status='offline';applySave(validSave(local)?local:readLocal('2pg_fe_guest'));
 }
}
function snapshot(){
 const ts=Date.now();
 return {
  v:yardLayout.version,transportVersion:2,ts,rev:ts.toString(36)+'-'+Math.random().toString(36).slice(2,12),base:cloud.base,
  carry:Math.max(0,acc),m:G.m,te:G.te,sold:G.sold,made:G.made,units:G.units,productTracks:G.productTracks,pk:G.pk,cost:G.cost,
  tk:G.tk,ord:G.ord,history:G.history,rt:Math.round(rate()*10)/10,
  hl:G.hl,legacyPlots:G.legacyPlots,site:currentSite,campaign:G.campaign,story:G.story,legacyIndustry:G.legacyIndustry,sp:G.sp,sq:G.sq.map(v=>v|0),st:G.st,sd:G.sd,sf:G.sf,late:G.late,end:G.end,
  emp:G.emp,crew:G.crew,crewVersion:1,mg:G.mg,wc:G.wc,xp:G.xp,pl:G.pl,bt:G.bt,ac:G.ac,
  tu:G.tu,guide:G.guide??null,tutorialPaused:!!G.tutorialPaused,tutorialAward:!!G.tutorialAward,th:G.th,rp:G.rp,rs:G.rs,ds:G.ds,sl:G.sl,saleIncome:G.saleIncome,pc:G.pc,
  ...(G.legacySaturation?{sa:G.legacySaturation}:{}),
  plans:G.plans,epoch:G.epoch,stock:G.stock,activeBoosts:G.activeBoosts,milestones:G.milestones,
  lineCounts:G.lineCounts,recent:G.recent,wins:G.wins,goals:G.goals,contracts:G.contracts,contractWins:G.contractWins,
  supplyOrders:G.supplyOrders,od:G.od.map(q=>[q.s,q.n,q.d,q.r]),rr:G.rr??null,
  ...(yardLayout.east?{yardRows:yardLayout.removed}:{}),
  ...(tunnelPairs.size?{tunnelPairs:[...tunnelPairs].map(([from,to])=>[from.x,from.y,to.x,to.y])}:{}),
  ...(yardLinks.length?{yardLinks:yardLinks.map(({from,to,d,tunnel,reverse,blocked})=>[
   from.x,from.y,to.x,to.y,tunnel?4:d,!!reverse,!!blocked
  ])}:{}),
  o:L.map(o=>[
   o.x,o.y,o.t,o.r,o.lv,o.it,o.iv.length?o.iv:0,o.out,isStorage(o.t)&&o.q.length?o.q:0,
   o.j?(o.j==1?o.jm.join(''):o.xs.join(',')):0,
   {
    up:o.up,spec:o.spec,paused:o.paused,priority:o.priority,control:o.control,credits:o.credits,threshold:o.threshold,
    wk:!!o.wk,p:o.p,supplyItem:o.supplyItem,supplyStock:o.supplyStock,iq:o.iq,oq:o.oq,pq:o.pq,ivq:o.iv.map((n,i)=>n?o.ivq[i]/n:100),
    ...(o.teamDepot?{teamDepot:true}:{}),
    qq:o.qq,xq:o.xq,ag:o.ag,ein:o.ein,large:o.base.some(n=>n>1),
    ...(o.legacyTunnelPass?{legacyTunnelPass:true}:{}),
    ...(o.j===1?{rr:o.rr,pr:o.pr,...(o.inQueue.some(Boolean)?{inQueue:o.inQueue.map(parcel=>parcel?.slice(0,2)||null)}:{})}:{}),
    ...(o.j===2&&o.xQueue.some(Boolean)?{xQueue:o.xQueue.map(parcel=>parcel?.slice(0,2)||null)}:{}),
    queue:o.queue.map(([item,quality,entry,,jumped])=>[item,quality,entry,0,jumped]),
    jumped:o.jumped,sortRule:o.sortRule,smartMode:o.smartMode,stats:o.stats,recent:o.recent
   }
  ])
 };
}
function sv(force){
 if(!ready||preview)return;
 const data=JSON.parse(JSON.stringify(snapshot()));
 storeSnapshot(cloud.localKey||(cloud.migrationBlocked?KEY+'.compatible':KEY),data);
 if(!stillSignedIn()||cloud.migrationBlocked)return;
 cloud.pending=data;
 if(cloud.status!='conflict'&&cloud.status!='invalid'){
  if(cloud.status!='offline'&&cloud.status!='recovered')cloud.status='pending';
  if(force||Date.now()-cloud.last>=60000)flushCloud(force);
 }
}
async function flushCloud(force=false){
 const data=cloud.pending;
 if(!data||cloud.busy||!stillSignedIn()||cloud.status=='conflict'||cloud.status=='invalid'||!force&&Date.now()<cloud.backoff)return;
 cloud.last=Date.now();cloud.busy=true;
 try{
  if(cloud.base==null){
   const remote=await unpackCloudSave(await readCloud());
   if(revision(remote)!==''){
    cloud.remote=remote;cloud.status=validSave(remote)?'conflict':'invalid';return;
   }
   cloud.base='';
  }
  if(!stillSignedIn())return;
  const expected=cloud.base;
  const wire=await packCloudSave({...data,base:expected});
  if(!stillSignedIn())return;
  const saved=await cloud.ref.transaction(current=>{
   if(cloudRevision(current)===expected||cloudRevision(current)===data.rev)return wire;
   // The SDK may invoke the callback with an empty cache before checking the server.
   // A null proposal on an empty cache can only commit against an already empty node.
   if(current==null&&expected!=='')return null;
   return undefined;
  },undefined,false);
  if(!stillSignedIn())return;
  const remote=await unpackCloudSave(saved.snapshot.val());
  if(!saved.committed||revision(remote)!==data.rev){
   cloud.remote=remote;cloud.status=validSave(remote)?'conflict':'invalid';return;
  }
  cloud.base=data.rev;cloud.backoff=0;cloud.error=null;
  cloud.rawBytes=byteSize(JSON.stringify(data));cloud.cloudBytes=byteSize(JSON.stringify(wire));
  if(cloud.pending===data){
   cloud.pending=null;cloud.status='synced';storeSnapshot(cloud.localKey||KEY,{...data,base:data.rev});
  }else{
   cloud.status='pending';
   cloud.pending={...cloud.pending,base:data.rev};
   storeSnapshot(cloud.localKey||KEY,cloud.pending);
  }
 }catch(error){
  cloud.error=cloudFailure(error);cloud.status='offline';cloud.backoff=Date.now()+15000;
 }finally{cloud.busy=false}
}
async function takeCloudSave(){
 if(cloud.status!='conflict'||!validSave(cloud.remote)||!stillSignedIn())return;
 const remote=cloud.remote;
 if(!(await storeBackup(KEY+'.recovery',snapshot()))){
  toast('Lokale Sicherung fehlgeschlagen. Beide Spielstände bleiben verfügbar.');return;
 }
 if(!stillSignedIn()||cloud.remote!==remote)return;
 await finishMigrationBackup(remote);
 cloud.base=revision(remote);cloud.remote=null;cloud.pending=null;cloud.status='recovered';saveOpen=false;
 applySave(remote);sv(false);
}
async function keepLocalSave(){
 if(cloud.status!='conflict'||!validSave(cloud.remote)||!stillSignedIn())return;
 const remote=cloud.remote;
 if(!(await storeBackup(KEY+'.cloud-backup',remote))){
  toast('Sicherung des bisherigen Cloud-Stands fehlgeschlagen.');return;
 }
 if(!stillSignedIn()||cloud.remote!==remote)return;
 cloud.base=revision(cloud.remote);cloud.remote=null;cloud.status='pending';saveOpen=false;sv(true);
}
let confirmLocal=false;
async function restoreLocalBackup(){
 const local=readLocal(KEY+'.recovery');
 if(!validSave(local)||cloud.busy)return;
 if(!stillSignedIn()){
  if(!(await storeBackup(KEY+'.recovery',snapshot()))){toast('Aktueller Stand konnte nicht gesichert werden.');return}
  applySave(local);sv(false);saveOpen=false;return;
 }
 cloud.busy=true;
 try{
  const remote=await unpackCloudSave(await readCloud());
  if(!stillSignedIn())return;
  if(!validSave(remote)){toast('Kein gültiger Cloud-Stand zum Vergleich verfügbar.');return}
  cloud.remote=remote;cloud.status='conflict';cloud.pending=local;confirmLocal=false;
  applySave(local);saveOpen=true;
 }catch{toast('Cloud nicht erreichbar. Die lokale Sicherung bleibt gespeichert.')}
 finally{cloud.busy=false}
}
function downloadFactorySave(){
 const file=new Blob([JSON.stringify(snapshot())],{type:'application/json'});
 const url=URL.createObjectURL(file),link=document.createElement('a');
 link.href=url;link.download='factory-empire-'+new Date().toISOString().slice(0,10)+'.json';
 link.click();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function importFactorySave(){
 const input=document.createElement('input');
 input.type='file';input.accept='.json,application/json';
 input.onchange=async()=>{
  let imported;
  try{imported=JSON.parse(await input.files[0].text())}catch{toast('Die Spielstanddatei konnte nicht gelesen werden.');return}
  if(!validSave(imported)||!Array.isArray(imported.o)){toast('Ungültige Factory-Empire-Spielstanddatei.');return}
  if(!window.confirm('Den Spielstand aus dieser Datei laden? Der aktuelle Stand wird zuerst gesichert.'))return;
  if(cloud.busy){toast('Warte auf die laufende Synchronisierung und versuche es erneut.');return}
  if(!(await storeBackup(KEY+'.recovery',snapshot()))){
   toast('Der aktuelle Stand konnte nicht gesichert werden. Die Datei wurde nicht geladen.');return;
  }
  await finishMigrationBackup(imported);
  applySave(imported);saveOpen=false;sv(true);
 };
 input.click();
}
function savePanel(){
 const [X,Y,W,H]=MENUS.save.box;
 pnlBox(X,Y,W,H,'Spielstand',()=>{saveOpen=false;confirmLocal=false});
 const labels={
  guest:'Gast-Spielstand',pending:'Wartet auf Cloud-Bestätigung',synced:'Letzter Spielstand in der Cloud bestätigt',
  offline:'Cloud nicht erreichbar · erneuter Versuch folgt automatisch',recovered:'Cloud geladen · lokaler Wiederherstellungspunkt prüfen',
  conflict:'Cloud-Konflikt · ein anderes Gerät hat seit deinem letzten Abgleich gespeichert',invalid:'Cloud-Spielstand hat ein unbekanntes Format · lokaler Stand ist aktiv',loading:'Cloud wird geladen',local:'Lokaler Spielstand ist aktiv'
 };
 tx(labels[cloud.status],X+20,Y+61,13,'#cbd5e1');
 if(cloud.localPending)tx('Lokale Sicherung wird geschrieben …',X+20,Y+78,10.5,'#cbd5e1');
 else if(!cloud.localSaved)tx('Keine lokale Sicherung. Der Cloud-Status steht oben.',X+20,Y+78,10.5,'#fca5a5');
 else if(cloud.migrationBlocked)tx('Cloud-Synchronisierung wartet auf eine Sicherung des ursprünglichen Spielstands.',X+20,Y+78,10.5,'#fde68a');
 else if(diskSaves.has(cloud.localKey||KEY))tx('Auf diesem Gerät über IndexedDB gesichert.',X+20,Y+78,10.5,'#86efac');
 if(cloud.status=='conflict'&&validSave(cloud.remote)){
  const remote=cloud.remote;
  tx('Cloud · '+fmtSaveDate(remote.ts)+' · '+fm(remote.m)+' €',X+20,Y+95,12,'#fde68a');
  tx('Dieses Gerät · '+fm(G.m)+' €',X+20,Y+121,12,'#fde68a');
  btn(X+20,Y+144,250,35,takeCloudSave,'#2f6d54');
  tx('Cloud laden · lokale Sicherung behalten',X+145,Y+166,11,'#fff','center',700);
  btn(X+283,Y+144,350,35,()=>{if(confirmLocal){confirmLocal=false;keepLocalSave()}else confirmLocal=true},confirmLocal?'#92400e':'#334155');
  tx(confirmLocal?'Lokalen Stand in der Cloud speichern? Bestätigen':'Lokalen Stand auswählen',X+458,Y+166,11,'#fff','center',700);
 }else if(stillSignedIn()&&!['loading','invalid'].includes(cloud.status)&&!cloud.migrationBlocked){
  btn(X+20,Y+86,178,34,()=>sv(true),'#334155');tx('Jetzt synchronisieren',X+109,Y+108,11,'#fff','center',700);
 }
 if(cloud.error&&cloud.status==='offline')tx(cloud.error,X+20,Y+139,11,'#fca5a5');
 if(cloud.cloudBytes&&cloud.status==='synced')tx('Cloud: '+Math.ceil(cloud.cloudBytes/1024)+' KiB · vorher unkomprimiert: '+Math.ceil(cloud.rawBytes/1024)+' KiB',X+20,Y+139,11,'#86efac');
 const backup=readLocal(KEY+'.recovery');
 if(validSave(backup)){
  tx('Wiederherstellungspunkt · '+fmtSaveDate(backup.ts)+' · '+fm(backup.m)+' €',X+20,Y+211,11,'#cbd5e1');
  btn(X+399,Y+190,234,30,restoreLocalBackup,'#334155');
  tx('Lokale Sicherung öffnen',X+516,Y+210,11,'#fff','center',700);
 }
 if(!preview){
  btn(X+20,Y+229,178,30,downloadFactorySave,'#29504f',null,'save_download');
  tx('Spielstand herunterladen',X+109,Y+249,11,'#fff','center',700);
  btn(X+209,Y+229,159,30,importFactorySave,'#334155',null,'save_import');
  tx('Spielstand aus Datei laden',X+288.5,Y+249,11,'#fff','center',700);
 }
}
function offlineStart(seconds){
 return {money:G.m,revenue:G.te,cost:G.cost+G.wc,sales:G.sold,units:G.units,orders:G.ord,
  milestones:Object.values(G.milestones).reduce((sum,n)=>sum+n,0),made:{...G.pc},sold:G.sl.slice(),
  seconds,simulated:acc,efficiency:seconds>offlineThreshold?OFFE:null,credited:Math.min(seconds,KOF),n:Math.max(1,Math.floor(acc/TICK))};
}
function offlineReport(report){
 const duration=value=>{
  const seconds=Math.floor(value),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);
  return hours?hours+' Std. '+minutes+' Min.':minutes?minutes+' Min.':seconds+' Sek.';
 };
 const top=(current,previous)=>ITEMS.map((item,i)=>({name:item.n,n:(current[i]||0)-(previous[i]||0)}))
  .filter(row=>row.n>0).sort((a,b)=>b.n-a.n).slice(0,5).map(row=>nf(row.n)+'× '+row.name).join(' · ');
 const made=top(G.pc,report.made),sold=top(G.sl,report.sold),delta=G.m-report.money;
 const steps=Object.values(G.milestones).reduce((sum,n)=>sum+n,0)-report.milestones;
 const title=report.seconds>offlineThreshold?'Du warst '+duration(report.seconds)+' offline.':'Ausstehende Fortschritte wurden nachgeholt.';
 showOv(`<div class="fe-offline-report"><div class="kick">Offline-Produktion</div><h2>Willkommen zurück in deiner Fabrik</h2>
  <p>${title} Simuliert: ${duration(report.simulated)}.</p>
  ${report.efficiency?`<p>${duration(report.credited)} Abwesenheit zählen mit ${Math.round(report.efficiency*100)} % Produktionstempo.</p>`:''}
  <p style="font-size:27px;font-weight:800">${delta>=0?'+':'−'}${fm(Math.abs(delta))} € Kontostand</p>
  <p>+ ${fm(G.te-report.revenue)} € Einnahmen inkl. Prämien · − ${fm(G.cost+G.wc-report.cost)} € Material und Löhne</p>
  <p>${fm(G.units-report.units)} produziert · ${fm(G.sold-report.sales)} verkauft · ${G.ord-report.orders} Aufträge · ${steps} Meilensteine</p>
  ${made?'<p><b>Produziert:</b> '+made+'</p>':''}${sold?'<p><b>Verkauft:</b> '+sold+'</p>':''}
  <p>${bn?'Engpass: '+msg:'Aktuell kein gemeldeter Engpass.'}</p>
  <button class="btn" id="fec">Weiterspielen</button></div>`);
 bd('fec',()=>{$('#ov').style.display='none'});
}
function sampleBusiness(){
 G.history.push({tick:G.tk,value:companyValue(),sales:G.te,units:G.units,cost:G.cost,wages:G.wc});
 if(G.history.length>96)G.history.shift();
}
const fmtSaveDate=ts=>new Date(ts).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'});
/* ---- Bau & Aktionen ---- */
function movEnd(p){if(!mvO||!L.includes(mvO)){mvO=null;return}const[a,b]=tileAt(p.x,p.y);
 if(mv&&p.pick){const t=hv||[a,b];if(moveObj(mvO,t[0],t[1]))mvO=null;return}
 if(mv)return;
 if(p.pick)return;
 const q=cell(a,b);if(q&&q!=mvO){mvO=q;sfx('select');return}if(q==mvO){mvO=null;return}
 if(moveObj(mvO,a,b))mvO=null}
const hasProjectRamp=()=>L.some(o=>o.t===activeRamp()&&!o.needsRelocation);
function bchk(x,y,t,existing=false,keepGround=false){
 const m=MD[t],logistics=isLogistics(t);
 if(!visibleModel(m))return 'Kampagnenfortschritt erforderlich.';
 if(!(existing&&logistics)&&m?.unlock&&!m.unlock())return m.need+'.';
 if(x<0||y<0||x>=mapWidth()||y>=GH)return'Außerhalb der Karte.';
 const h=areaAt(x,y),site=siteAt(x,y);
 if(inR(SITE,x,y))return'Für ARCHE reserviert. Beliefere den Bunker über eine Rampe auf deinem Werkshof.';
 if(campaignChapter()>=2&&inR(FLEET,x,y))return'Für den Flottenbau reserviert. Liefere an eine Werftrampe.';
 if(logistics){
  if(logisticsHall(x,y))return '';
  if(!site)return logisticsSiteError;
  if(h&&hlv(h.id)<1)return 'LOCK:'+h.id;
  if(site.hall&&!hlv(site.hall))return 'LOCK:'+site.hall;
  return keepGround||industrial.get(x,y)?'':logisticsSiteError;
 }
 if(!site)return 'Zwischen den Standorten kann nicht gebaut werden.';
 const previousPlot=legacyYards.find(plot=>inR(plot.rect,x,y));
 if(previousPlot&&(!m?.a||m.a==='gar'||m.a==='met'&&RH('met')||m.a==='elk'&&previousPlot.id==='e'))return '';
 if(site.hall&&!hlv(site.hall))return 'LOCK:'+site.hall;
 if(h){if(hlv(h.id)<1)return'LOCK:'+h.id;if(m&&m.a&&m.a!=h.id&&!h.allow?.includes(m.a))return'Nur in der '+hallOf(m.a).n+' baubar.';return''}
 if(m?.g==='u'&&!m.a&&(keepGround||industrial.get(x,y)))return '';
 return 'Diese Maschine kann nur in einer Halle gebaut werden.';
}
function lockHit(e){hsel=e.slice(5);if(hallOf(hsel)?.site){closeP2();growthOpen=true;growthTab=0;return}hlO=true;mkO=rsO=pnO=acO=bkO=false;deny('Diese Halle ist noch gesperrt – hier kannst du sie freischalten.')}
function placement(o,x=o.x,y=o.y,r=o.r,ignore=new Set()){
 const occupied=footprint(o,x,y,r);
 const logistics=isLogistics(o.t);
 const startingArea=logistics?siteAt(x,y):areaAt(x,y);
 const existingObject=ignore.has(o);
 const sameAnchor=existingObject&&x===o.x&&y===o.y;
 for(const [u,v] of occupied){
  const existing=cell(u,v);
  const error=bchk(u,v,o.t,existingObject,sameAnchor&&existing===o);
  if(error)return error;
  if(occupied.length>1&&(logistics?siteAt(u,v):areaAt(u,v))!==startingArea)return 'Gebäude brauchen eine zusammenhängende Fläche.';
  if(existing&&!ignore.has(existing))return 'Dieses Feld ist belegt.';
 }
 return '';
}
function constructionError(message,shape){
 if(shape)rejectedBuild={...shape,until:tm+1.5};
 if(message.startsWith('LOCK:')&&shape&&isLogistics(shape.t))deny(hallOf(message.slice(5)).n+' ist noch nicht freigeschaltet.');
 else if(message.startsWith('LOCK:'))lockHit(message);
 else deny(message);
}
function addBuild(x,y,t,r,base=defaultSize(t)){
 const o=put(x,y,t,r,1,base);
 o.bt=0;G.pl++;
 if(!G.bt.includes(t)){G.bt.push(t);xp(15)}
 return o;
}
function place(x,y,t,r){
 t=buildType(t);
 if(MD[t]?.legacyOnly)return false;
 const existing=cell(x,y),shape={t,x,y,r,base:defaultSize(t)};
 if(isBelt(t)&&buildType(existing?.t)===t)return rotObj(existing,r);
 const error=placement(shape);
 if(error){constructionError(error,shape);return false}
 const cost=cst(t);
 if(G.m<cost){deny('Nicht genug Geld.');return false}
 G.m-=cost;addBuild(x,y,t,r);
 PO.push({x:(x+.5)*TS,y:y*TS,t:0,v:'-'+cost,n:1});
 sfx(isBelt(t)?'belt':'place');analyze();sv(0);return true;
}
const hReq=h=>hallAvailable(h)&&(h.site?(REGIONS.find(site=>site.id===h.site).open?.()??hlv(h.id)>0):G.sp>=h.ph),hNext=h=>hlv(h.id)<h.rc.length?h.c[hlv(h.id)]:0;
function buyHall(h){const l=hlv(h.id);if(l>=h.rc.length){deny('Diese Halle hat ihre maximale Größe.');return}
 if(!hReq(h)&&h.site){deny(REGIONS.find(site=>site.id==h.site).need);return}
 if(!hReq(h)){deny('Gesperrt: Erst Bunker-Phase '+h.ph+' ('+PH[h.ph-1].n+') abschließen.');return}
 if(G.m<h.c[l]){deny('Nicht genug Geld.');return}G.m-=h.c[l];G.hl[h.id]=l+1;afl[h.id]=1;xp(l?40:90);sfx('unlock');
 refreshIndustrialArea();refreshLogisticsPlacement();toast(l?h.n+' erweitert: jetzt '+hSize(h)+' Felder!':h.n+' freigeschaltet!');sv(1);analyze()}
function delAt(a,b){const o=cell(a,b);if(!o)return false;const v=Math.floor(cst(o.t)/2);G.m+=v;PO.push({x:(a+.5)*TS,y:b*TS,t:0,v:'+'+v});if(mvO==o)mvO=null;for(const m of G.mg)if(m.x==o.x&&m.y==o.y){m.x=-1;m.y=-1}del(o);sfx('remove');return true}
function sellAll(){let v=0;for(const o of L)v+=Math.floor(cst(o.t)/2);for(const m of G.mg){m.x=-1;m.y=-1}G.m+=v;attachYardLinks([]);tunnelPairs.clear();L=[];g=[];resetPlanning();sel=null;mvO=null;delAsk=0;PO.push({x:cam.x,y:cam.y,t:0,v:'+'+fm(v)});sfx('remove');toast('Alles verkauft: +'+fm(v)+' €');recalc();analyze();sv(1)}
function moveObj(o,x,y){
 const error=placement(o,x,y,o.r,new Set([o]));
 if(error){constructionError(error,{x,y,t:o.t,r:o.r,base:o.base});return false}
 relocate([{o,x,y}]);return true;
}
function relocate(positions){
 const positionsByObject=new Map(positions.map(row=>[row.o,{...row.o,x:row.x,y:row.y}]));
 for(const manager of G.mg){
  const move=positionsByObject.get(cell(manager.x,manager.y));
  if(move){manager.x=move.x;manager.y=move.y}
 }
 forgetYardLinks(new Set(positions.filter(({o,x,y})=>x!==o.x||y!==o.y).map(({o})=>o)));
 for(const [from,to] of tunnelPairs)if((positionsByObject.has(from)||positionsByObject.has(to))&&!keepsTunnel(from,to,positionsByObject))removeTunnel(from);
 for(const {o} of positions)mapObject(o,null);
 for(const {o,x,y} of positions){o.x=x;o.y=y;o.bt=0;o.needsRelocation=false;mapObject(o,o)}
 sfx('place');analyze();sv(0);
}
function plan(o){let n=0,tot=0,l=o.lv;const w=QT[qi];while(l<60&&(w?n<w:tot+uc(o,l)<=G.m||n<1)){tot+=uc(o,l);l++;n++}return{n,tot}}
function buy(o){const p=plan(o);if(!p.n||G.m<p.tot){deny('Nicht genug Geld.');return}G.m-=p.tot;o.lv+=p.n;o.fl=1;sfx('upgrade');sv(0);analyze()}
const tileAt=(x,y)=>viewToWorld(x,y).map(n=>Math.floor(n/TS));
let lastCameraMotion=-Infinity;
function clampCam(){
 cam.x=Math.max(0,Math.min(mapWidth()*TS,cam.x));
 const edge=GH*TS+(cam.bottomPadding||0)/cameraZoom();
 cam.y=Math.max(0,Math.min(edge,cam.y));
}
function focusWorld([left,top,right,bottom]){
 const areaTop=view.headerBottom+view.warningHeight+6;
 const width=(right-left+1)*TS,height=(bottom-top+1)*TS,padding=28;
 const maxScale=(FW-2*view.inset)/(width+padding);
 let areaBottom=view.dock.y-6;
 let scale=Math.min(maxScale,Math.max(1,areaBottom-areaTop)/(height+padding));
 const cameraEdge=view.camera.at(-1);
 if(CX-width*scale/2<cameraEdge.x+cameraEdge.w+6&&cameraEdge.y>=areaTop&&areaBottom>cameraEdge.y){
  areaBottom=view.camera[0].y-5;
  scale=Math.min(maxScale,Math.max(1,areaBottom-areaTop)/(height+padding));
 }
 const z=Math.min(1.3,scale/view.worldScale);
 const centerY=(areaTop+areaBottom)/2;
 cam={x:left*TS+width/2,y:top*TS+height/2+(CY-centerY)/(z*view.worldScale),z};
 if(z<.22)cam.min=z;
 if(cam.y>GH*TS)cam.bottomPadding=(cam.y-GH*TS)*z*view.worldScale;
 clampCam();hv=null;
}
function zoomAt(factor,x,y,previousX=x,previousY=y){
 if(![factor,x,y,previousX,previousY].every(Number.isFinite)||factor<=0)return false;
 const [worldX,worldY]=viewToWorld(previousX,previousY);
 const nextZ=Math.max(cam.min??.22,Math.min(2.6,cam.z*factor));
 const zoom=nextZ*view.worldScale,nextX=worldX-(x-CX)/zoom,nextY=worldY-(y-CY)/zoom;
 if(!Number.isFinite(nextX)||!Number.isFinite(nextY))return false;
 if(nextZ!==cam.z)guideAction('zoom');
 if(cam.x!==nextX||cam.y!==nextY||cam.z!==nextZ)lastCameraMotion=tm;
 cam={...cam,x:nextX,y:nextY,z:nextZ};
 clampCam();
 hv=null;
 return true;
}
function wh(event){
 if(storyOnScreen())return;
 const [x,y]=pointerPosition(event);
 if(!Number.isFinite(x)||!Number.isFinite(y))return;
 const unit=event.deltaMode===1?32:event.deltaMode===2?FH:1;
 if(panelSurface&&FactoryLayout.contains(panelSurface.clip,x,y)){
  const dx=Number(event.deltaX)||0,dy=Number(event.deltaY)||0;
  if(event.shiftKey||!panelSurface.maxY)scrollPanel((dx||dy)*unit,0);
  else scrollPanel(dx*unit,dy*unit);
  event.preventDefault();
  return;
 }
 const dock=dockAt(x,y);
 if(dock){
  scrollDock(dock,(Number(event.deltaX)||Number(event.deltaY)||0)*unit);
  event.preventDefault();
  return;
 }
 if(openMenu()||hitAt(x,y)||!Number.isFinite(event.deltaY)||!event.deltaY)return;
 const delta=Math.max(-240,Math.min(240,event.deltaY*unit));
 if(!zoomAt(Math.exp(-delta*.0014),x,y))return;
 if(pdn&&!pdn.h&&(tool==='mov'||tool==='del'||isBelt(tool)||MD[tool]||asg||buildMode))cancelAction();
 event.preventDefault();
}
function mm(event){
 if(touchPointers.size)return;
 const [x,y]=pointerPosition(event);
 if(!Number.isFinite(x)||!Number.isFinite(y))return;
 mp=[x,y];hv=hitAt(x,y)||openMenu()?null:tileAt(x,y);
}
const ml=()=>{hv=null;mp=null};
const touchPointers=new Map();
let multiTouch=false;
function pinchFrame(){
 const points=[...touchPointers.values()];
 if(points.length!==2)return null;
 const [[ax,ay],[bx,by]]=points;
 return {x:(ax+bx)/2,y:(ay+by)/2,distance:Math.hypot(ax-bx,ay-by)};
}
function trackTouch(x,y,id,ending=false){
 const before=pinchFrame();
 touchPointers.set(id,[x,y]);
 if(touchPointers.size<2)return false;
 if(!multiTouch){cancelAction();multiTouch=true;hv=null;mp=null}
 const after=pinchFrame();
 if(!ending&&before&&after&&before.distance>0&&after.distance>0){
  zoomAt(after.distance/before.distance,after.x,after.y,before.x,before.y);
 }
 return true;
}
function releaseTouch(id){
 if(!touchPointers.delete(id))return false;
 const consume=multiTouch;
 if(!touchPointers.size)multiTouch=false;
 return consume;
}
function cancelAction(){
 const deleted=pdn?.dl;
 pdn=null;lt=null;mv=0;
 if(deleted){analyze();sv(0)}
}
function startWorldEdit(press){
 if(press.h||press.blocked||press.started||asg||buildMode)return;
 press.started=true;
 const [x,y]=tileAt(press.x,press.y);
 hv=[x,y];
 if(isBelt(tool)&&!MD[tool]?.sortStation){
  if(place(x,y,tool,rot))lt=[x,y];
 }else if(tool=='del'){
  if(delAt(x,y)){lt=[x,y];press.dl=1}
 }else if(tool=='mov'){
  const object=cell(x,y);
  if(!mvO&&object)mvO=object;
  press.pick=!!object&&mvO===object;
 }
}
function resetCameraInput(){
 touchPointers.clear();multiTouch=false;cancelAction();hv=null;mp=null;
}
const onHide=()=>{
 if(document.hidden){resetCameraInput();sv(1)}
 audio.pause(document.hidden);
};
/* ---- Zeichnen ---- */
const {rr,tx,sh,di}=createFactoryDrawing(c,ITEMS,canvasScope);
const {equipment,forklift,conveyor}=createFactoryEquipment(c,{rr,di,withState:withCanvasState});
const worldPrimitives={rr,tx,withState:withCanvasState};
const worldArtByLayout=new Map();
function yardArt(layout){
 const key=[layout.version,...layout.depths].join('/');
 if(!worldArtByLayout.has(key)){
  const art=createFactoryWorldArt(c,TS,GW,GH,SITE,worldPrimitives,layout);
  worldArtByLayout.set(key,[art,createFactoryBunkerArt(c,TS,worldPrimitives,art)]);
 }
 return worldArtByLayout.get(key);
}
let worldArt,drawBunker;
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const projectCargo=new Map(),projectTrucks=[];
const truckSpeed=5.35;
function queueProjectCargo(ramp,item){
 const key=ramp.x+','+ramp.y+','+item;
 let shipment=projectCargo.get(key);
 if(!shipment){
  if(projectCargo.size>=36)return;
  shipment={x:ramp.x,y:ramp.y,item,count:0,waiting:tm};
  projectCargo.set(key,shipment);
 }
 shipment.count++;
}
function launchProjectTrucks(){
 for(let i=projectTrucks.length-1;i>=0;i--){
  const trip=projectTrucks[i];
  if(tm-trip.started>trip.route.distance/truckSpeed+1.6)projectTrucks.splice(i,1);
 }
 for(const [key,cargo] of projectCargo){
  if(projectTrucks.length>=20)break;
  if(tm-cargo.waiting<2.2)continue;
  if(projectTrucks.some(trip=>trip.x===cargo.x&&trip.y===cargo.y&&tm-trip.started<2.4))continue;
  const {x,y}=cargo,hall=areaAt(x,y),drive=hall&&hlv(hall.id)>0?worldArt.driveway(hall.id,hrect(hall)):null;
  const passage=drive?floorRoute([x,y],[Math.floor(drive.x),drive.side===1?hrect(hall)[3]:hrect(hall)[1]],hall)
   .map(([a,b])=>[a+.5,b+.5]):[];
  const yardDrives=drive?[]:HL.filter(candidate=>{
   const [a,b]=hrect(candidate);
   return hlv(candidate.id)>0&&siteAt(a,b)===siteAt(x,y);
  }).flatMap(candidate=>worldArt.driveway(candidate.id,hrect(candidate))||[]);
  const route=worldArt.deliveryRoute([x+.5,y+.5],drive,passage,yardDrives);
  if(route.distance>0)projectTrucks.push({...cargo,route,started:tm});
  projectCargo.delete(key);
 }
}
function dm(o,wk){
 const k=MD[o.t].k,h=TS/2,w=wk&&o.st==1;
 if(MD[o.t].j){dj(o);return}
 c.fillStyle='#0004';c.beginPath();c.roundRect(-h+4,-h+6,TS-6,TS-6,9);c.fill();
 const gr=c.createLinearGradient(0,-h,0,h);gr.addColorStop(0,sh(k,.35));gr.addColorStop(1,sh(k,-.3));c.fillStyle=gr;c.beginPath();c.roundRect(-h+2,-h+2,TS-4,TS-6,9);c.fill();
 c.strokeStyle='#ffffff55';c.lineWidth=1.5;c.beginPath();c.roundRect(-h+3,-h+3,TS-6,TS-8,8);c.stroke();
 const t=o.t,model=MD[t];
 const storage=t==='sto',used=storage?(o.q?.length||0):0;
 const limit=storage?cap(o):0;
 withCanvasState(()=>{
  equipment(o,w,reducedMotion?0:tm,storage?Math.min(6,Math.ceil(used/limit*6)):0);
  if((model.inspect||model.sortStation)&&o.it>=0)drawPassingItem(o);
  if(storage){
   if(o.incoming!=null&&G.tk-o.activity<6)ico(o.incoming,11-(G.tk-o.activity)*2,-5,.65);
   tx(used+'/'+limit,0,17,8,'#fff','center',700);
  }
  if(t==='prj'){
   const phase=projectPhase(t);
   const next=phase?.q.find(([item])=>prjNeed(item,t));
   if(next)ico(next[0],0,2,.72);
   else if(!phase)tx('✓',0,7,13,'#86efac','center',800);
  }
 });
 c.fillStyle=o.t=='shp'||isProjectRamp(o.t)?'#4ade80':['','#4ade80','#facc15','#ef4444'][o.st]||'#888';if(w){c.shadowColor=c.fillStyle;c.shadowBlur=8}c.beginPath();c.arc(h-8,-h+8,3.2,0,PI*2);c.fill();c.shadowBlur=0;
 if(!terminal(o.t)){saveCanvas();c.rotate(o.r*PI/2);c.fillStyle='#ffd23f';c.beginPath();c.moveTo(h-1,0);c.lineTo(h-9,-6);c.lineTo(h-9,6);c.fill();restoreCanvas()}
 if(o.mg){c.fillStyle='#fde68a';c.strokeStyle='#7c5a00';c.lineWidth=1;c.beginPath();c.arc(-h+9,-h+9,5.5,0,PI*2);c.fill();c.stroke();tx('M',-h+9,-h+12.5,8,'#5b3d00','center',800)}
  if(o.teamDepot&&inG(o.x,o.y)){rr(h-18,-h+4,13,12,3,'#246554');tx('T',h-11.5,-h+13,8,'#d7f9e7','center',800)}
 if(o.lv>1&&o.t!='shp'&&!isProjectRamp(o.t))tx('L'+o.lv,-h+5,h-6,9,'#fff','left',800)}
function drawPassingItem(o){
 const ratio=MD[o.t].inspect?Math.min(1,(o.ag||0)/.5):transportProgress(o.t);
 saveCanvas();c.translate(-8+16*ratio,5);c.scale(.66,.66);di(o.it);restoreCanvas();
}
function db(o){const e=feed(o),b=(o.r+2)%4;saveCanvas();c.translate((o.x+.5)*TS,(o.y+.5)*TS);c.rotate(o.r*PI/2);
 if(e!=b){const s=e==(o.r+1)%4?1:-1,R=TS/2,W=19,a0=s>0?PI:PI/2,a1=s>0?1.5*PI:PI,ar=(x,y,r,p,q,cc)=>c.arc(x,y,r,p,q,cc);
  c.fillStyle='#0003';c.beginPath();ar(R+3,R*s+5,R+W,a0,a1);ar(R+3,R*s+5,R-W,a1,a0,true);c.fill();
  c.beginPath();ar(R,R*s,R+W,a0,a1);ar(R,R*s,R-W,a1,a0,true);c.closePath();c.fillStyle='#2b2f36';c.fill();
  c.strokeStyle='#8b94a1';c.lineWidth=3;[R+W,R-W].forEach(r=>{c.beginPath();ar(R,R*s,r,a0,a1);c.stroke()});
  c.strokeStyle='#59616e';c.lineWidth=2;for(let i=0;i<4;i++){const u=(i/4+tm*1.5)%1,a=s>0?PI+u*PI/2:PI-u*PI/2,k=Math.cos(a),n=Math.sin(a);c.beginPath();c.moveTo(R+k*(R-W+4),R*s+n*(R-W+4));c.lineTo(R+k*(R+W-4),R*s+n*(R+W-4));c.stroke()}}
 else{c.fillStyle='#0003';c.fillRect(-TS/2,-TS/2+10,TS,TS-14);c.fillStyle='#2b2f36';c.fillRect(-TS/2,-TS/2+5,TS,TS-10);c.fillStyle='#8b94a1';c.fillRect(-TS/2,-TS/2+3,TS,3);c.fillRect(-TS/2,TS/2-6,TS,3);
  c.strokeStyle='#59616e';c.lineWidth=2;const of=(tm*72)%12;for(let i=-2;i<5;i++){const x=-TS/2+i*12+of;if(x<-TS/2||x>TS/2+3)continue;c.beginPath();c.moveTo(x-3,-6);c.lineTo(x+1,0);c.lineTo(x-3,6);c.stroke()}}
 restoreCanvas()}
function hitbox(x,y,w,h,fn,drag,id){
 const {x:ox,y:oy,scale,clip}=uiTransform;
 const left=ox+x*scale,top=oy+y*scale,right=left+w*scale,bottom=top+h*scale;
 const x0=clip?Math.max(left,clip.x):left,y0=clip?Math.max(top,clip.y):top;
 const x1=clip?Math.min(right,clip.x+clip.w):right,y1=clip?Math.min(bottom,clip.y+clip.h):bottom;
 if(x1>x0&&y1>y0)HB.push({x:x0,y:y0,w:x1-x0,h:y1-y0,fn,drag:drag?pos=>drag((pos-ox)/scale):null,id});
}
function btn(x,y,w,h,fn,col,drag,id){
 rr(x,y,w,h,9,col);
 hitbox(x,y,w,h,fn,drag,id);
}
function uiButton(box,fn,col,id){
 btn(box.x,box.y,box.w,box.h,fn,col,null,id);
}
const hitAt=(x,y)=>HB.findLast(b=>FactoryLayout.contains(b,x,y));


/* ===== Grafik: Verteiler, Maschinen-Familien, Produkt-Icons, Bunker-Baustelle ===== */
function dj(o){
 const h=TS/2,crossing=MD[o.t].j===2,merge=o.t==='fus';
 const ports=crossing?[1,1,1,1]:o.jm||jpre(o.t,o.r||0);
 const paint=merge?'#5d9d89':crossing?'#7795aa':'#c49253';
 rr(-h+4,-h+5,TS-7,TS-7,8,'#0005');
 rr(-h+2,-h+2,TS-4,TS-5,6,'#485863');
 rr(-h+4,-h+4,TS-8,TS-9,5,'#34434e');
 for(const [x,y] of [[-15,-15],[15,-15],[-15,15],[15,15]])rr(x-1.3,y-1.3,2.6,2.6,1,'#93a5af');
 ports.forEach((port,dir)=>{
  if(!port)return;
  withCanvasState(()=>{
   c.rotate(dir*PI/2);
   rr(3,-6,h-4,12,2,'#23323b');
   rr(5,-6,h-7,1.4,.6,paint);
   rr(5,4.6,h-7,1.4,.6,paint);
   for(const x of [8,12,16])rr(x,-3,1.2,6,.5,'#536b76');
   if(!crossing){
    const head=port===1?11:17,tail=port===1?17:11;
    c.fillStyle=port===1?'#97e3af':'#ffd099';
    c.beginPath();c.moveTo(head,0);c.lineTo(tail,-3.3);c.lineTo(tail,3.3);c.fill();
   }
  });
 });
 if(crossing){
  rr(-10,-8,20,16,3,'#647a88');rr(-8,-4,16,8,1,'#253843');
  rr(-9,-8,18,2,1,'#a8bac3');rr(-9,6,18,2,1,'#a8bac3');
  for(const x of [-5,0,5])rr(x,-3,1.5,6,.6,'#738995');
  if(o.xs)for(let dir=0;dir<4;dir++)if(o.xs[dir]>=0){
   const f=transportProgress(o.t);
   ico(o.xs[dir],DX[dir]*8*(1-2*f),DY[dir]*8*(1-2*f),.7);
  }
 }else{
  rr(-8,-8,16,16,merge?2:5,paint);
  withCanvasState(()=>{
   c.rotate((o.r||0)*PI/2);
   c.strokeStyle='#203641';c.lineWidth=1.8;c.beginPath();
   const x=merge?-4:4;
   c.moveTo(-x,0);c.lineTo(x,-4);c.moveTo(-x,0);c.lineTo(x,4);c.stroke();
  });
  if(o.it>=0)ico(o.it,0,0,.78);
 }
 if(o.st===3)rr(h-10,-h+5,5,5,2.5,'#f87171');
}
function ghost(t,r,x,y,ok,base=defaultSize(t)){
 const [w,h]=dimensions({r,base}),belt=isBelt(t)&&!MD[t]?.sortStation;
 withCanvasState(()=>{
  c.globalAlpha=.62;
  if(ok&&isLogistics(t)&&!logisticsHall(x,y,x+w-1,y+h-1))worldArt.platform(x,y,w,h,r,belt,true);
  c.translate((x+w/2)*TS,(y+h/2)*TS);c.scale(w,h);
  if(belt){
   c.rotate(r*PI/2);c.fillStyle='#2b2f36';c.fillRect(-TS/2,-TS/2+5,TS,TS-10);
   c.fillStyle='#ffd23f';c.beginPath();c.moveTo(10,0);c.lineTo(-4,-9);c.lineTo(-4,9);c.fill();
  }else dm({t,r,lv:1,st:0});
 });
 c.fillStyle=ok?'#22c55e55':'#ef444466';c.fillRect(x*TS,y*TS,w*TS,h*TS);
}
const traffic=new Map();
const teamTrips=[],teamPaths=new Map();
const floorRoute=(start,finish,hall)=>FactoryGrid.floorRoute(start,finish,GW,(x,y)=>inR(hrect(hall),x,y)&&!cell(x,y));
function freeSides(o,hall){
 return [3,1,2,0].map(d=>port(o,d)).filter(([x,y])=>inR(hrect(hall),x,y)&&!cell(x,y));
}
function teamRoute(from,to,hall){
 const key=[from.x,from.y,from.r,to.x,to.y,to.r].join(',');
 if(!teamPaths.has(key)){
  if(teamPaths.size>=384)teamPaths.clear();
  const starts=freeSides(from,hall),ends=freeSides(to,hall);
  let path=[];
  for(const start of starts){
   if(ends.some(end=>(path=floorRoute(start,end,hall)).length>0))break;
  }
  teamPaths.set(key,path);
 }
 return teamPaths.get(key);
}
function completeHallJob(hall,from,to,item,quality,color,remove){
 const path=teamRoute(from,to,hall);
 if(!path.length)return false;
 const delivered=isStorage(to.t)?receiveStorage(to,item,quality):isProjectRamp(to.t)?prjIn(item,to):typeShip(to.t)?sellProduct(to,item):receiveRecipe(to,item,quality);
 if(!delivered)return false;
 remove();
 if(!fs){
  if(teamTrips.length===48)teamTrips.shift();
  teamTrips.push({path,started:tm,item,color});
 }
 return true;
}
function hallJobs(hall,objects){
 const depots=objects.filter(o=>isStorage(o.t)&&o.teamDepot),machines=objects.filter(prod);
 const misrouted=o=>isBelt(o.t)&&o.it>=0&&o.bad;
 const goesToProject=o=>isProjectRamp(neighbor(o,beltDirections(o)[0])?.t);
 function fromDepot(depot,i,to,color){
  return completeHallJob(hall,depot,to,depot.q[i],depot.qq[i],color,()=>{
   depot.q.splice(i,1);depot.qq.splice(i,1);record(depot,'moves');
  });
 }
 function needed(machine,item){
  return MD[machine.t].r?.some(([id,count],i)=>id===item&&machine.iv[i]<count);
 }
 function store(from,item,value,color,remove){
  return depots.some(depot=>depot.q.length<cap(depot)&&completeHallJob(hall,from,depot,item,value,color,remove));
 }
 return {
  p:color=>machines.some(machine=>depots.some(depot=>{
   const index=depot.q.findIndex(item=>needed(machine,item));
   return index>=0&&fromDepot(depot,index,machine,color);
  })),
  q:color=>objects.some(o=>misrouted(o)&&!goesToProject(o)&&store(o,o.it,o.iq,color,()=>{
   record(o,'moves');clearBelt(o);
  })),
  l:color=>objects.filter(o=>isProjectRamp(o.t)||typeShip(o.t)).sort((a,b)=>Number(isProjectRamp(b.t))-Number(isProjectRamp(a.t))).some(sink=>depots.some(depot=>{
   const index=depot.q.findIndex(item=>isProjectRamp(sink.t)?prjNeed(item,sink.t):!prjNeed(item)&&orderFor(item));
   return index>=0&&fromDepot(depot,index,sink,color);
  })),
  prod:color=>machines.some(o=>o.out>=0&&o.st===3&&store(o,o.out,o.oq,color,()=>{o.out=-1})),
  qual:color=>objects.some(o=>misrouted(o)&&goesToProject(o)&&store(o,o.it,o.iq,color,()=>{record(o,'moves');clearBelt(o)})),
  eng:color=>machines.some(source=>source.out>=0&&source.st===3&&machines.some(target=>target!==source&&needed(target,source.out)&&completeHallJob(hall,source,target,source.out,source.oq,color,()=>{source.out=-1}))),
  log:color=>depots.some(source=>source.q.length>=cap(source)&&depots.some(target=>{
   return source!==target&&target.q.length+1<cap(target)&&fromDepot(source,0,target,color);
  }))
 };
}
function workCrews(){
 const due=new Map(),second=G.tk/8;
 function schedule(hall,id,color,count){
  if(!due.has(hall))due.set(hall,[]);
  due.get(hall).push({id,color,count});
 }
 for(const manager of G.mg){
  const hall=managerHall(manager),kind=MG.find(d=>d.id===manager.id);
  const interval=Math.max(2,7-Math.ceil(manager.lv/2)-(RH('ldr')?1:0));
  if(hall&&hlv(hall.id)&&second%interval===0)schedule(hall,kind.id,kind.color,1);
 }
 for(const hall of HL)for(const role of crewRoles){
  const assigned=crewCount(hall.id,role.id),interval=role.id==='p'&&RH('sch')?2:3;
  const count=Math.floor(second*assigned/interval)-Math.floor((second-1)*assigned/interval);
  if(count>0)schedule(hall,role.id,role.color,count);
 }
 if(!due.size)return;
 const rooms=new Map();
 for(const o of L){
  if(o.needsRelocation)continue;
  const hall=areaAt(o.x,o.y);
  if(!due.has(hall))continue;
  if(!rooms.has(hall))rooms.set(hall,[]);
  rooms.get(hall).push(o);
 }
 for(const [hall,objects] of rooms){
  const jobs=hallJobs(hall,objects);
  for(const {id,count,color} of due.get(hall))for(let i=0;i<count;i++){
   if(!jobs[id](color))break;
  }
 }
}
function drawTeamTrips(intersects){
 for(let i=teamTrips.length-1;i>=0;i--){
  const {path,started,item,color}=teamTrips[i];
  const step=Math.max(0,(tm-started)*3.2),last=path.length-1;
  if(step>=last+1.6){teamTrips.splice(i,1);continue}
  const n=Math.min(Math.floor(step),last),t=Math.min(1,step-n);
  const [a,b]=path[n],[x,y]=path[Math.min(n+1,last)];
  if(cell(a,b)||cell(x,y)){teamTrips.splice(i,1);continue}
  const px=(a+.5+(x-a)*t)*TS,py=(b+.5+(y-b)*t)*TS;
  if(!intersects(px-16,py-19,32,38))continue;
  withCanvasState(()=>{
   c.translate(px,py);
   const stride=step<last?Math.sin(step*4)*3:0;
   rr(-7,6,14,5,2,'#0004');rr(-3+stride,3,3,7,1,'#303943');rr(1-stride,3,3,7,1,'#303943');
   rr(-5,-5,10,10,3,color);rr(-4,-12,8,7,3,'#e9c092');rr(-4,-14,8,4,2,'#e9bc49');
   rr(3,0,9,7,1.5,'#c89b5e');rr(6,0,2,7,1,'#f1d899');
   if(cameraZoom()>=.62)ico(item,8,-11,.5);
  });
 }
}
function factoryTraffic(visible,canPlan){
 const site=REGIONS.find(r=>r.id===currentSite);
 let trip=traffic.get(site.id);
 if(!trip||tm>=trip.until){
  if(!canPlan)return;
  const objects=visible.filter(o=>siteAt(o.x,o.y)===site);
  const recent=objects.filter(o=>(isStorage(o.t)||typeShip(o.t))&&G.tk-(o.activity||-1000)<240);
  const origin=recent[Math.floor(tm/12)%recent.length],hall=origin&&areaAt(origin.x,origin.y);
  const start=hall&&hlv(hall.id)>0&&freeSides(origin,hall)[0];
  const destinations=start?objects.filter(o=>o!==origin&&areaAt(o.x,o.y)===hall&&(prod(o)||isStorage(o.t)||typeShip(o.t))):[];
  let path=[];
  const attempts=Math.min(6,destinations.length),first=Math.floor(tm/3)%Math.max(1,destinations.length);
  for(let i=0;i<attempts;i++){
   const target=freeSides(destinations[(first+i)%destinations.length],hall)[0];
   if(!target)continue;
   path=floorRoute(start,target,hall);
   if(path.length>2)break;
  }
  trip={path,start:tm,until:tm+Math.max(3,path.length*.58+2)};
  traffic.set(site.id,trip);
 }
 const path=trip.path,travel=(path.length-1)*.29,elapsed=tm-trip.start;
 if(path.length<3||elapsed>=2*travel)return;
 const reverse=elapsed>travel,step=(reverse?2*travel-elapsed:elapsed)/.29;
 const index=Math.min(path.length-2,Math.floor(step)),t=Math.max(0,step-index);
 const [ax,ay]=path[index],[bx,by]=path[index+1];
 if(cell(ax,ay)||cell(bx,by)){trip.until=tm;return}
 const x=(ax+.5+(bx-ax)*t)*TS,y=(ay+.5+(by-ay)*t)*TS;
 withCanvasState(()=>{
  c.translate(x,y);
  const facing=DX.findIndex((dx,d)=>dx===bx-ax&&DY[d]===by-ay);
  c.rotate((facing+(reverse?2:0))*PI/2);
  forklift(!reverse);
 });
}
function applyCamera(){
 const [x,y]=worldToView(0,0),zoom=cameraZoom();
 c.translate(x,y);
 c.scale(zoom,zoom);
}
function drawFleet(){
 withCanvasState(()=>{
  c.translate(FLEET[0]*TS,FLEET[1]*TS);c.scale(TS,TS);
  const {stage,delivery}=G.campaign,phase=projectPhase('orbitRamp');
  const ratio=phase?phaseProgress(phase.q.map(([,goal],i)=>(delivery[i]||0)/goal)):1;
  const w=FLEET[2]-FLEET[0]+1,h=FLEET[3]-FLEET[1]+1,mid=w/2;
  rr(-.16,-.05,w+.36,h+.32,.42,'#26383c77');rr(0,0,w,h,.35,'#364759');
  rr(.36,.34,w-.72,h-.7,.28,'#506777');rr(1.11,1.18,w-2.22,h-2.3,.21,'#2d4051');
  for(let y=1.8;y<h-1;y+=1.36){
   rr(.72,y,.16,.68,.03,'#e1ba76');rr(w-.88,y,.16,.68,.03,'#8bd3e1');
   rr(1.32,y,w-2.64,.055,.01,'#8a9cac70');
  }
  const panels=Math.floor(stage>=1?9:ratio*9);
  for(let i=0;i<9;i++){
   const y=2.2+i*1.61,span=1.9+Math.sin(i/8*Math.PI)*1.15;
   rr(mid-span/2,y,span,1.48,.21,i<panels?'#9ebcd0':'#657a8544');
   if(i<panels)rr(mid-span/2+.18,y+.15,span-.36,.15,.035,'#c7e0ef');
  }
  if(stage>=1){
   const power=stage>1?1:ratio;
   for(const side of [-1,1]){
    rr(mid+side*1.33-.3,12.9,.83,4.2,.26,'#617c9b');
    rr(mid+side*1.33-.12,15.2,.46,1.76,.18,power>.55?'#82d2e7':'#41556b');
   }
  }
  if(stage>=2){
   for(let i=0;i<6;i++)if(i<1+(stage>2?1:ratio)*5)rr(2.62+(i%2)*1.78,5+Math.floor(i/2)*1.1,.72,.56,.14,'#abe3ca');
  }
  for(let i=0;i<4;i++){
   const progress=Math.min(1,Math.max(0,stage-3-i+ratio));
   rr(w-2.02,3.6+i*3.3,.68,2.35,.16,'#607787');
   if(progress)rr(w-1.9,3.75+i*3.3,.44,Math.max(.12,2.05*progress),.11,'#91ddca');
  }
  rr(.8,.3,w-1.6,.65,.13,'#192c3c');tx('WERFT HORIZONT',mid,.74,.34,'#c4e7ef','center',800);
  rr(1.1,h-1.12,w-2.2,.55,.13,'#192c3c');
  tx(phase?.n||'STARTBEREIT',mid,h-.74,.26,'#e9d8a4','center',700);
 });
}
function drawYardLinks(intersects){
 for(const {from,to,d,blocked} of yardLinks){
  if(blocked)continue;
  const [ax,ay]=port(from,d),[bx,by]=port(to,(d+2)%4);
  const x=(ax+.5-DX[d]*.66)*TS,y=(ay+.5-DY[d]*.66)*TS;
  const u=(bx+.5+DX[d]*.66)*TS,v=(by+.5+DY[d]*.66)*TS;
  if(!intersects(Math.min(x,u)-8,Math.min(y,v)-8,Math.abs(x-u)+16,Math.abs(y-v)+16))continue;
  if(sel===from||sel===to){
   c.beginPath();c.moveTo(x,y);c.lineTo(u,v);
   c.setLineDash([8,6]);c.lineWidth=3;c.strokeStyle='#9fe9e0';c.stroke();c.setLineDash([]);
  }
  rr(x-5,y-5,10,10,3,'#3b847d');rr(u-5,v-5,10,10,3,'#3b847d');
 }
}
function drawTunnelPairs(intersects){
 for(const [from,to] of tunnelPairs){
  const x=(from.x+.5)*TS,y=(from.y+.5)*TS,u=(to.x+.5)*TS,v=(to.y+.5)*TS;
  if(!intersects(Math.min(x,u),Math.min(y,v),Math.abs(x-u)+1,Math.abs(y-v)+1,TS))continue;
  const colors=['#7dd3fc','#f7c879','#a7f3c2','#dab1ff','#f6a4a8'];
  const color=colors[(from.x+from.y*7)%colors.length];
  if(sel===from||sel===to){
   c.beginPath();c.moveTo(x,y);c.lineTo(u,v);
   c.setLineDash([8,6]);c.lineWidth=3;c.strokeStyle=color;c.stroke();c.setLineDash([]);
  }
  rr(x-5,y-16,10,4,2,color);rr(u-5,v-16,10,4,2,color);
 }
 if(buildMode==='tunnel'&&routeSource){
  c.strokeStyle='#a7f3c2';c.lineWidth=3;
  c.strokeRect(routeSource.x*TS+2,routeSource.y*TS+2,TS-4,TS-4);
 }
}
function world(){
 const [left,top]=viewToWorld(0,0),[right,bottom]=viewToWorld(FW,FH);
 const intersects=(x,y,w,h,margin=0)=>x+w+margin>left&&x-margin<right&&y+h+margin>top&&y-margin<bottom;
 const visible=L.filter(o=>{
  const [w,h]=dimensions(o);
  return intersects(o.x*TS,o.y*TS,w*TS,h*TS,TS);
 });
 const isVisible=([x,y,lastX,lastY],margin=TS)=>intersects(x*TS,y*TS,(lastX-x+1)*TS,(lastY-y+1)*TS,margin);
 const plots=legacyYards.map(plot=>({
  id:'alt-'+plot.id,name:plot.name,rect:plot.rect,floor:['#bec4ac','#9ea996']
 }));
 for(const hall of HL){
  const level=hlv(hall.id);
  if(!level)continue;
  const rect=hrect(hall);
  plots.push({id:hall.id,name:hall.n,rect,floor:hall.f,drive:worldArt.driveway(hall.id,rect),
   level,previous:level>1?layoutRect(extendedHallRects.get(hall.id)[level-2]):undefined,flash:afl[hall.id]});
 }
 const editing=(!!MD[tool]||tool==='belt')&&!G.bt.includes(tool)||tool==='mov'&&!!mvO||['place','move','route'].includes(buildMode);
 const gridIn=rect=>editing&&(hv&&inR(rect,...hv)||buildPreview?.rows.some(row=>inR(rect,row.x,row.y)));
 const time=reducedMotion?0:tm,detail=cameraZoom()>=.38,moving=tm-lastCameraMotion<.12;
 saveCanvas();applyCamera();
 drawLayer('Landschaft',()=>worldArt.terrain({left,top,right,bottom,intersects,detail,time,plots,occupied:cell,industrial,worldWidth:mapWidth()}));
 for(const plot of plots){
  if(isVisible(plot.rect))drawLayer('Halle '+plot.id,()=>worldArt.hall({...plot,grid:gridIn(plot.rect),detail,intersects}));
 }
 if(isVisible(SITE,2*TS))drawLayer('Bunker ARCHE',()=>{
  const materials=bunkerMaterials(),progress=phaseProgress(materials);
  drawBunker({rect:SITE,phase:G.sp,finished:G.sp>=PH.length,phaseName:PH[G.sp]?.n,materials,progress,time,
   hover:tool==='hand'&&!buildMode&&hv&&inR(SITE,...hv),detail});
 });
 drawLayer('Wolkenschatten',()=>worldArt.clouds(time,intersects));
 drawLayer('Werksverkehr',()=>{factoryTraffic(visible,!moving);drawTeamTrips(intersects)});
 for(const o of visible){
  const [w,h]=dimensions(o);
  if(isLogistics(o.t)&&!logisticsHall(o.x,o.y,o.x+w-1,o.y+h-1)){
   worldArt.platform(o.x,o.y,w,h,o.r,isBelt(o.t)&&!MD[o.t]?.sortStation,detail);
  }
 }
 for(const o of visible){
  const belt=isBelt(o.t)&&!MD[o.t]?.sortStation;
  drawLayer(belt?'Förderband':'Gebäude '+o.t,()=>{
   if(belt){
    db(o);
    if(buildType(o.t)!=='belt'){c.fillStyle=MD[o.t].k;c.fillRect(o.x*TS+4,o.y*TS+4,TS-8,3)}
    return;
   }
   const [w,h]=dimensions(o),s=Math.min(1,o.bt),sp=s<1?1+Math.sin(s*PI)*.18:1;
   saveCanvas();
   c.translate((o.x+w/2)*TS,(o.y+h/2)*TS);
   c.scale(w*s*sp,h*s*sp);dm(o,1);
   restoreCanvas();
   if(o.fl>0){
    c.strokeStyle='rgba(255,210,63,'+o.fl+')';c.lineWidth=3;c.beginPath();
    c.arc((o.x+.5)*TS,(o.y+.5)*TS,(1-o.fl)*34+14,0,PI*2);c.stroke();
   }
   if(o==bn){
    c.strokeStyle='rgba(239,68,68,'+(.5+.4*Math.sin(tm*6))+')';c.lineWidth=3;
    c.beginPath();c.roundRect(o.x*TS-1,o.y*TS-1,w*TS+2,h*TS+2,10);c.stroke();
   }
   if(MD[o.t].rc==null&&!terminal(o.t)&&o.st==3)tx('⏸',(o.x+.5)*TS,o.y*TS-2,12,'#fff','center');
  });
 }
 if(yardLinks.length)drawLayer('Unterführungen',()=>drawYardLinks(intersects));
 if(tunnelPairs.size||buildMode==='tunnel')drawLayer('Tunnelpaare',()=>drawTunnelPairs(intersects));
 if(campaignChapter()>=2&&isVisible(FLEET,2*TS))drawLayer('Flottenbau',drawFleet);
 if(bn&&isBelt(bn.t)&&visible.includes(bn)){
  c.strokeStyle='#ef4444';c.lineWidth=3;c.strokeRect(bn.x*TS+1,bn.y*TS+1,TS-2,TS-2);
 }
 for(const o of visible)if(o.needsRelocation){
  const [w,h]=dimensions(o),x=o.x*TS,y=o.y*TS;
  c.strokeStyle='#fb7185';c.lineWidth=3;c.setLineDash([6,4]);
  c.strokeRect(x+2,y+2,w*TS-4,h*TS-4);c.setLineDash([]);
  tx('!',x+9,y+15,13,'#fff','center',900);
 }
 for(const o of visible)if(isBelt(o.t)&&!MD[o.t]?.sortStation&&o.it>=0)drawLayer('Waren',()=>{const[x,y]=itemPos(o);c.translate(x,y);di(o.it)});
 if(sel&&L.includes(sel)){c.strokeStyle='#ffd23f';c.lineWidth=2.5;c.beginPath();c.roundRect(sel.x*TS-2,sel.y*TS-2,TS*dimensions(sel)[0]+4,TS*dimensions(sel)[1]+4,10);c.stroke()}
 for(const o of buildSelection)if(L.includes(o)){
  const [w,h]=dimensions(o);c.strokeStyle='#5ad1ff';c.lineWidth=2.5;c.strokeRect(o.x*TS,o.y*TS,TS*w,TS*h);
 }
 if(routeSource&&L.includes(routeSource)){
  const [w,h]=dimensions(routeSource);c.strokeStyle='#5ad1ff';c.lineWidth=3;c.strokeRect(routeSource.x*TS,routeSource.y*TS,TS*w,TS*h);
 }
 if(buildPreview)for(const row of buildPreview.rows){
  const o=row.o||row,[w,h]=dimensions(o,row.r);
  if(!intersects(row.x*TS,row.y*TS,w*TS,h*TS))continue;
  ghost(o.t,row.r,row.x,row.y,!buildPreview.error,o.base)
 }
 if(hv&&(isBelt(tool)||MD[tool])){const [x,y]=hv;ghost(tool,rot,x,y,!placement({x,y,t:tool,r:rot,base:defaultSize(tool)})&&G.m>=cst(tool))}
 if(tool=='del'&&hv){const q=cell(hv[0],hv[1]);c.fillStyle=q?'#ef444455':'#ffffff10';c.fillRect(hv[0]*TS,hv[1]*TS,TS,TS);if(q){c.strokeStyle='#ef4444';c.lineWidth=2.5;c.strokeRect(hv[0]*TS+1,hv[1]*TS+1,TS-2,TS-2)}}
 if(tool=='mov'){if(mvO&&L.includes(mvO)){c.strokeStyle='#5ad1ff';c.lineWidth=2.5;c.setLineDash([6,5]);c.strokeRect(mvO.x*TS-1,mvO.y*TS-1,TS+2,TS+2);c.setLineDash([]);if(hv){const ok=!placement(mvO,hv[0],hv[1],mvO.r,new Set([mvO]));ghost(mvO.t,mvO.r,hv[0],hv[1],ok,mvO.base)}}else if(hv&&cell(hv[0],hv[1])){c.strokeStyle='#5ad1ff';c.lineWidth=2;c.strokeRect(hv[0]*TS+1,hv[1]*TS+1,TS-2,TS-2)}}
 if(rejectedBuild?.until>tm){
  const {x,y,r}=rejectedBuild,[w,h]=dimensions(rejectedBuild,r);
  c.fillStyle='#ef444455';c.fillRect(x*TS,y*TS,w*TS,h*TS);
  c.strokeStyle='#fb7185';c.lineWidth=3;c.strokeRect(x*TS+2,y*TS+2,w*TS-4,h*TS-4);
 }
 for(const p of PO){c.globalAlpha=Math.max(0,1-p.t/1.2);tx(p.v,p.x,p.y-p.t*28,13,p.n?'#fca5a5':'#86efac','center',800)}c.globalAlpha=1;
 if(projectTrucks.length)drawLayer('ARCHE-Lieferverkehr',()=>worldArt.deliveryVehicles(projectTrucks,tm,detail,intersects,ITEMS,truckSpeed));
 restoreCanvas()}


/* ===== Story: Projekt ARCHE – ein Bunker für die gesamte Menschheit ===== */
const STX=[
 ['Die Baugrube ist ausgehoben. Kommandantin Reyes meldet sich: „Wir brauchen Schalungsbalken, Regale für die Vorratsräume – und etwas, das den Kindern Mut macht.“','Die Fundamente stehen, und aus deiner Garage ist ein richtiger Betrieb geworden. Das Projekt braucht jetzt Stahl.'],
 ['„Beton allein hält keine Druckwelle“, sagt Reyes. „Träger, Bleche, Werkzeuge für die Bautrupps – und Panzerplatten für die Außenhülle.“','Die Stahlhülle ist geschlossen. Jetzt müssen Menschen darin leben können: Versorgung und Elektronik werden frei.'],
 ['Ein Bunker ohne Nahrung, Wasser und Medizin wäre ein Sarg. Dazu braucht die Überwachung Sensoren für Strahlung, Luft und Druck.','Vorräte für Jahre lagern jetzt unter der Erde. Doch ohne Strom bleibt alles dunkel – die Energiehalle wartet.'],
 ['Akkus, Solarmodule, Generatoren und Steuerungen: Der Bunker muss jahrelang vollkommen autark laufen können.','Das Licht geht an. Der Bunker lebt! Jetzt müssen die Menschen nur noch hinkommen – die Fahrzeughalle öffnet.'],
 ['Millionen Menschen müssen rechtzeitig zum Bunker gelangen. Lastwagen, Autos, E-Bikes und Karosserien für Rettungsfahrzeuge werden gebraucht.','Die Evakuierungsrouten sind einsatzbereit. Für den Kern des Bunkers braucht es das Beste, was Technik kann.'],
 ['Roboter für die Wartung, KI-Chips für die Kontrolle, Drohnen für die Erkundung – und Reaktorkerne, die den Bunker über Jahrzehnte versorgen.','Der Kern des Bunkers arbeitet selbstständig. Das Modulwerk kann jetzt die Endmodule bauen.'],
 ['Die letzte Etappe: Wohnmodule, Versorgungsmodule, gewaltige Bunkertore und die Kommandozentrale. Danach ist der Bunker fertig.','Die letzte Schraube sitzt. Die Tore schließen sich hinter den Letzten. Ihr habt es geschafft.']];
function storyCard(kick,title,paras,btn){return`<div class=kick>${kick}</div><h2>${title}</h2>${paras.map(t=>'<p style="max-width:520px;margin-left:auto;margin-right:auto">'+t+'</p>').join('')}<div><button class=btn id=stok>${btn||'Weiter'}</button></div>`}
const nf=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const qLine=q=>q.q.map(([it,n])=>nf(n)+'× '+ITEMS[it].n).join(' · ');
function phaseCard(i){const q=PH[i];return storyCard('Kapitel '+(i+1)+' von '+PH.length,'Phase '+(i+1)+': '+q.n,[STX[i][0],'<b>Aufgaben:</b> '+qLine(q),'<span style="opacity:.8;font-size:14px">Baue eine Bunker-Rampe neben der Linie (Reiter Logistik) und führe die Waren per Förderband dorthin.'+(i?' Benötigt: '+hallOf(q.hall).n+'.':'')+'</span>'],'Los geht’s')}
let storyReplay=null,storyFocus=false,storyLastCue='';
const storyArt=createFactoryStoryArt(c,{rr,tx,withState:withCanvasState});
function storyUnlocked(id){
 if(id==='arche-intro')return true;
 if(id==='arche-finale')return G.sp===PH.length;
 if(id==='horizont-intro')return campaignChapter()>=2;
 if(id==='horizont-finale')return campaignChapter()>=2&&G.campaign.stage===chapters[2].phases.length;
 const step=Number(id.split('-').at(-1));
 return id.startsWith('arche-')?G.sp>=step:campaignChapter()>=2&&G.campaign.stage>=step;
}
function queueStory(id){
 const state=G.story;
 if(!state||!storyUnlocked(id)||state.done[id]||state.queue.includes(id))return;
 state.queue.push(id);saveAfterTick=true;
}
const currentStory=()=>storyReplay||G?.story;
const currentStoryId=()=>storyReplay?.id??G?.story?.queue[0];
const storyOnScreen=()=>!!currentStoryId()&&(!window.NOFIN||!!storyReplay);
function finishStory(){
 const id=currentStoryId();
 if(!id)return false;
 storyFocus=false;storyLastCue='';
 if(storyReplay){storyReplay=null;return true}
 const state=G.story;
 state.done[id]=true;state.queue.shift();state.time=0;state.paused=false;
 sv(1);
 return true;
}
function replayStory(id){
 if(!G.story.done[id]||currentStoryId())return false;
 storyReplay={id,time:0,paused:false};
 storyFocus=false;storyLastCue='';
 return true;
}
function updateStory(dt){
 const id=currentStoryId(),state=currentStory();
 if(!id||state.paused)return;
 if(!G.story.muted)musTick();
 const before=state.time;
 state.time+=Math.max(0,Math.min(.25,dt));
 if(state.time>=FactoryStory.duration(id)){finishStory();return}
 const {beat,index}=FactoryStory.cue(id,state.time),key=id+':'+index;
 if(key!==storyLastCue){
  storyLastCue=key;storyFocus=false;
  if(beat.sound&&!G.story.muted&&state.time-before>=state.time-FactoryStory.cue(id,state.time).start-.1)sfx(beat.sound);
  if(!storyReplay)sv(0);
 }
}
function drawStory(){
 const id=currentStoryId(),state=currentStory(),scene=FactoryStory.scenes[id],cue=FactoryStory.cue(id,state.time);
 const barH=52,shadeH=Math.min(146,FH*.34),pictureH=FH-barH;
 const scale=Math.max(FW/960,pictureH/540);
 c.fillStyle='#101926';c.fillRect(0,0,FW,FH);
 withCanvasState(()=>{
  c.beginPath();c.rect(0,0,FW,pictureH);c.clip();
  c.translate((FW-960*scale)/2,(pictureH-540*scale)/2);
  c.scale(scale,scale);storyArt(scene,cue,state.time,storyFocus);
 });
 const left=view.inset+8,content=FW-2*left;
 const fade=c.createLinearGradient(0,pictureH-shadeH,0,pictureH);
 fade.addColorStop(0,'#10192600');fade.addColorStop(.37,'#101926e9');fade.addColorStop(1,'#101926');
 c.fillStyle=fade;c.fillRect(0,pictureH-shadeH,FW,shadeH);
 rr(left+44,left-4,Math.min(392,content-44),34,7,'#102134db');
 fitText(scene.title,left+55,left+18,Math.min(369,content-66),15,'#d7e8ef','left',800);
 if(G.story.subtitles){
  const detail=storyFocus&&cue.beat.detail;
  const text=detail||cue.beat.line;
  const font=FW<600?12:15,w=Math.min(710,content);
  const lines=tuWrap(text,w,'600 '+font+'px system-ui').slice(0,4);
  const y=pictureH-13-lines.length*(font+4);
  tx(detail?'Detail':cue.beat.speaker,left,y-5,font,'#f1cb85','left',800);
  lines.forEach((line,i)=>tx(line,left,y+(i+1)*(font+4),font,'#e5edf5','left',600));
 }
 const options=[
  ['story_pause',state.paused?'Weiter':'Pause',()=>{state.paused=!state.paused;if(!storyReplay)sv(0)}],
  ['story_subtitles','Text '+(G.story.subtitles?'an':'aus'),()=>{G.story.subtitles=!G.story.subtitles;sv(0)}],
  ['story_audio','Ton '+(G.story.muted?'aus':'an'),()=>{G.story.muted=!G.story.muted;sv(0)}]
 ];
 if(cue.beat.detail)options.push(['story_focus',storyFocus?'Übersicht':'Detail',()=>{storyFocus=!storyFocus}]);
 options.push(['story_skip',storyReplay?'Schließen':'Überspringen',finishStory]);
 const width=Math.min(126,(content-(options.length-1)*4)/options.length);
 for(const [i,[key,label,action]] of options.entries()){
  const x=left+i*(width+4),y=FH-40;
  btn(x,y,width,32,action,key==='story_skip'?'#415471':'#233c52',0,key);
  fitText(label,x+width/2,y+20,width-7,11.5,'#fff','center',700);
 }
 rr(left,pictureH,content,3,1.5,'#415468');
 if(state.time)rr(left,pictureH,content*Math.min(1,state.time/FactoryStory.duration(id)),3,1.5,'#e8c987');
}
function storyIntro(){queueStory('arche-intro')}
function endStory(){G.end=1;queueStory('arche-finale')}
function lateStory(){G.late=1;stQ.push(storyCard('Tag '+nf(DAYS),'Die Frist ist abgelaufen',['Nichts ist passiert – noch nicht. Die Wissenschaftler melden, dass sich das Waffensystem selbst verzögert hat. Niemand weiß, wie lange.','Es gibt keine Strafe und keinen Zeitdruck. Baue weiter, so gut du kannst: Jeder Bunkerplatz zählt.']))}
const dLeft=()=>Math.max(0,DAYS-Math.floor(G.st/DAYSEC));
const bunkerMaterials=()=>PH[G.sp]?.q.map(([,target],i)=>Math.min(1,(G.sq[i]||0)/target))||[];
const phaseProgress=materials=>materials.length?materials.reduce((sum,n)=>sum+n,0)/materials.length:1;
const bProg=()=>Math.min(1,(G.sp+phaseProgress(bunkerMaterials()))/PH.length);
let projectView=1;
function beginNextChapter(){
 const next=chapters[campaignChapter()+1];
 if(G.sp!==PH.length||!next)return false;
 if(!G.story.done['arche-finale']){queueStory('arche-finale');return false}
 const region=REGIONS.find(site=>site.id===next.site);
 G.campaign=readCampaign({campaign:{level:campaignChapter()+1,stage:0}},true);
 G.end=1;G.hl[region.hall]=1;G.m+=next.grant;
 G.guide=newGuide('fleet',yardLayout.point(155,12));G.tu=0;G.tutorialPaused=false;
 closeP2();resetPlanning();tool='hand';sel=null;asg=null;
 refreshIndustrialArea();switchSite(region);focusWorld(hrect(hallOf(region.hall)));
 rfx();recalc();analyze();queueStory('horizont-intro');sv(1);
 return true;
}
function finishProjectPhase(type){
 const q=projectPhase(type),stock=projectStock(type);
 if(!q||!q.q.every(([,target],i)=>(stock[i]||0)>=target))return;
 if(type==='prj'){phaseDone();return}
 const state=G.campaign;
 G.m+=q.rw[0];G.te+=q.rw[0];G.rp+=q.rw[1];xp(300+80*state.stage);
 state.stage++;state.delivery=[];
 queueStory('horizont-'+state.stage);
 if(state.stage===chapters[state.level].phases.length)queueStory('horizont-finale');
 sfx('unlock');saveAfterTick=true;
 if(!fs)toast(q.n+' abgeschlossen');
}
function phaseDone(){const q=PH[G.sp],i=G.sp;G.m+=q.rw[0];G.te+=q.rw[0];G.rp+=q.rw[1];xp(150+60*i);G.sp++;G.sq=[];if(!fs)sfx('unlock');
 queueStory('arche-'+G.sp);
 if(G.sp===PH.length){rfx();endStory();if(!fs)toast('ARCHE-Boni dauerhaft freigeschaltet');}chkAc();saveAfterTick=true;analyze()}
function stShow(){if(storyOnScreen()||!stQ.length||stOpen||ff||window.NOFIN)return;const o=$('#ov');if(!o||o.style.display=='flex')return;stOpen=1;showOv(stQ.shift());bd('stok',()=>{$('#ov').style.display='none';stOpen=0;sfx('click')})}
const ico=(i,x,y,s)=>{saveCanvas();c.translate(x,y);c.scale(s,s);di(i);restoreCanvas()};
function rcpRow(t,x,y,full){const m=MD[t],r=m.r||[];let px=x;
 if(!r.length){tx('Rohstoff →',px,y+4,10.5,'#94a3b8','left',700);px+=64}
 else r.forEach(([it,n],k)=>{if(k){tx('+',px+3,y+4,12,'#94a3b8','center',800);px+=12}tx(n+'×',px,y+4,11,'#fff','left',800);px+=n>9?19:13;ico(it,px+8,y,.78);px+=22;if(full){const nm=ITEMS[it].n.length>10?ITEMS[it].n.slice(0,9)+'.':ITEMS[it].n;tx(nm,px,y+4,9.5,'#94a3b8','left',600);px+=nm.length*4.6+4}else px+=2});
 tx('→',px+6,y+4,14,'#ffd23f','center',800);px+=18;ico(m.o,px+9,y,.9);px+=22;if(full){tx(ITEMS[m.o].n,px,y+4,10.5,'#fff','left',700);px+=ITEMS[m.o].n.length*5.4}return px-x}
function panelClose(X,Y,W,close){
 if(panelSurface?.bar.h)return;
 btn(X+W-42,Y+6,32,30,close,'#334155',0,'panel_close');
 tx('✕',X+W-26,Y+27,14,'#fff','center',700);
}
function pnlBox(X,Y,W,H,title,close){btn(X,Y,W,H,()=>{},'#0f141bf8');c.strokeStyle='#ffffff22';c.lineWidth=1;c.beginPath();c.roundRect(X,Y,W,H,12);c.stroke();tx(title,X+16,Y+26,16,'#fff','left',800);panelClose(X,Y,W,close)}
function fleetPanel(){
 const [X,Y,W,H]=MENUS.bk.box,state=G.campaign,chapter=chapters[state.level],phase=chapter.phases[state.stage];
 pnlBox(X,Y,W,H,'Horizont · Evakuierungsflotte',()=>{bkO=false});
 const taskX=X+224,taskW=W-242;
 for(const [i,row] of chapter.phases.entries()){
  const y=Y+47+i*29;
  rr(X+13,y,195,25,6,state.stage===i?'#295478':'#223241');
  fitText((state.stage>i?'✓ ':'')+(i+1)+'. '+row.n,X+22,y+16,177,11.5,'#e1eff8','left',700);
 }
 tx(nf(state.total)+' Teile geliefert',X+18,Y+265,11,'#a4bac8');
 const action=(x,w,label,id,fn)=>{btn(x,Y+H-43,w,30,fn,'#334e66',0,id);fitText(label,x+w/2,Y+H-23,w-12,11.5,'#fff','center',700)};
 action(X+13,195,'Projekt ARCHE · abgeschlossen','campaign_bunker',()=>{projectView=1});
 action(taskX,160,'Zur Raumwerft','fleet_location',()=>{switchSite(REGIONS.find(site=>site.id===chapter.site));focusWorld(FLEET);bkO=false});
 if(!phase){tx('Die Flotte ist startbereit',taskX,Y+72,19,'#9fe0c6','left',800);tx('Kapitel 2 abgeschlossen',taskX,Y+95,13,'#cbd5e1');return}
 tx(phase.n,taskX,Y+66,17,'#e2eef7','left',800);
 tuWrap(phase.brief,taskW,'600 11px system-ui').slice(0,3).forEach((line,i)=>tx(line,taskX,Y+86+i*14,11,'#cbd5e1'));
 for(const [i,[item,target]] of phase.q.entries()){
  const y=Y+120+i*33,have=state.delivery[i]||0;
  rr(taskX,y,taskW,29,6,'#223241');ico(item,taskX+18,y+17,.9);
  fitText(ITEMS[item].n,taskX+36,y+20,taskW-148,12,'#e2eef7','left',700);
  tx(nf(have)+' / '+nf(target),taskX+taskW-14,y+20,12,'#c3dda6','right',700);
  rr(taskX+9,y+24,(taskW-18)*Math.max(.003,have/target),3,1.5,'#64bfa2');
 }
 tx('Lieferziel Werftrampe · Prämie '+fm(phase.rw[0])+' € und '+phase.rw[1]+' FP',taskX,Y+260,11,'#f1cb85');
}
function bkPanel(){if(projectView===2&&campaignChapter()>=2){fleetPanel();return}
 const [X,Y,W,H]=MENUS.bk.box;pnlBox(X,Y,W,H,'📖 Projekt ARCHE – Bunker für die Menschheit',()=>{bkO=false});
 const dl=dLeft(),late=G.late;tx(late?'⏳ Frist überschritten – kein Zeitdruck':'⏳ '+nf(dl)+' Tage bis zur Frist',X+W-54,Y+26,12.5,late?'#fde68a':dl<DAYS*.15?'#fca5a5':'#a7f3d0','right',700);
 PH.forEach((q,i)=>{const y=Y+50+i*34,done=G.sp>i,cur=G.sp==i;if(cur)rr(X+10,y-4,196,32,8,'#3a7bd533');c.fillStyle=done?'#4ade80':cur?'#ffd23f':'#475569';c.beginPath();c.arc(X+24,y+12,6,0,PI*2);c.fill();if(done)tx('✓',X+24,y+16,10,'#052e16','center',800);if(i<PH.length-1){c.fillStyle=done?'#4ade8088':'#47556955';c.fillRect(X+23,y+19,2,15)}
  tx((i+1)+'. '+q.n,X+38,y+10,12,done||cur?'#fff':'#94a3b8','left',cur?800:600);tx(hallOf(q.hall).n,X+38,y+23,9.5,'#94a3b8','left',600)});
 rr(X+14,Y+H-30,188,8,4,'#ffffff18');rr(X+14,Y+H-30,188*bProg(),8,4,'#4ade80');tx('Gesamtfortschritt '+Math.round(bProg()*100)+' %',X+14,Y+H-36,10.5,'#cbd5e1','left',700);
 const x0=X+222,w0=W-236;rr(x0-8,Y+44,w0+16,H-54,10,'#ffffff08');
 btn(x0,Y+H-34,150,26,()=>{if(currentSite!=='main')switchSite(REGIONS[0]);focusWorld(SITE);bkO=false;sfx('select')},'#334155',0,'bunker_location');
 tx('📍 Zu ARCHE',x0+75,Y+H-16,11.5,'#fff','center',700);
 if(G.sp>=PH.length){
  tx('✔ Der Bunker ist fertig!',x0,Y+80,20,'#86efac','left',800);
  tx(nf(G.sd)+' Waren geliefert.',x0,Y+106,12,'#cbd5e1');
  tx('Dauerhafte Boni · +10 % Bandtempo · +20 Lagerplätze · −5 % Baukosten',x0,Y+194,11,'#9fe0c6');
  const next=campaignChapter()===1;
  btn(x0,Y+135,205,36,next?beginNextChapter:()=>{projectView=2},'#2f6d54',0,'campaign_continue');
  tx(next?'Kampagne fortsetzen':'Zum laufenden Kapitel',x0+102.5,Y+159,12,'#fff','center',800);
  return;
 }
 const q=PH[G.sp];tx('Phase '+(G.sp+1)+': '+q.n,x0,Y+66,17,'#fff','left',800);tuWrap(STX[G.sp][0],w0,'600 11px system-ui,sans-serif').slice(0,3).forEach((l,i)=>tx(l,x0,Y+82+i*12.5,11,'#cbd5e1','left',600));
 q.q.forEach(([it,n],i)=>{const y=Y+120+i*35,d=Math.min(n,G.sq[i]||0),done=d>=n,mt=MD[PR[it]];rr(x0,y,w0,32,8,'#ffffff0a');ico(it,x0+20,y+16,1.15);tx(nf(n)+'× '+ITEMS[it].n,x0+40,y+14,12.5,done?'#86efac':'#fff','left',800);
  tx((done?'✓ ':'')+'Gebaut in: '+mt.n+' ('+hallOf(mt.a).n+')'+(hlv(mt.a)<1?' 🔒':''),x0+40,y+27,9.5,'#94a3b8','left',600);rr(x0+250,y+9,w0-330,10,5,'#ffffff18');rr(x0+250,y+9,Math.max(0,(w0-330)*d/n),10,5,done?'#4ade80':'#3a7bd5');tx(nf(d)+' / '+nf(n),x0+w0-8,y+19,12,done?'#86efac':'#e2e8f0','right',800)});
 const yb=Y+120+q.q.length*35+4;tx('Belohnung: +'+fm(q.rw[0])+' € · +'+q.rw[1]+' Forschungspunkte',x0,yb+10,11.5,'#fde68a','left',700);
 const hasR=hasProjectRamp();tx(hasR?'Liefere per Förderband an die Bunker-Rampe – nur benötigte Waren werden angenommen.':'⚠ Baue zuerst die Bunker-Rampe auf dem Werkshof oder in einer Halle (Reiter Logistik).',x0,yb+25,10.5,hasR?'#94a3b8':'#fca5a5','left',700);
 btn(x0+158,Y+H-34,150,26,()=>{const h=hallOf(q.hall);hsel=h.id;bkO=false;hlO=true;sfx('click')},'#334155');tx('🏭 Zu den Hallen',x0+233,Y+H-16,11.5,'#fff','center',700);
 btn(x0+316,Y+H-34,110,26,()=>{stQ.push(phaseCard(G.sp));bkO=false;sfx('click')},'#334155');tx('📜 Briefing',x0+371,Y+H-16,11.5,'#fff','center',700)}
function hlPanel(){const [X,Y,W,H]=MENUS.hl.box;pnlBox(X,Y,W,H,'🏭 Hallen – jede Halle ist eine Produktionslinie',()=>{hlO=false});
 [['Halle',16],['Größe',232],['Voraussetzung',320],['Kosten',474]].forEach(([n,x])=>tx(n,X+x,Y+50,10.5,'#94a3b8','left',700));
 HL.filter(h=>!h.site).forEach((h,i)=>{const y=Y+56+i*31,l=hlv(h.id),mx=h.rc.length,nx=hNext(h),req=hReq(h),sel=hsel==h.id;rr(X+8,y,W-16,29,7,sel?'#3a7bd533':i%2?'#ffffff05':'#ffffff0b');if(sel){c.strokeStyle='#ffd23f';c.lineWidth=1.5;c.beginPath();c.roundRect(X+8,y,W-16,29,7);c.stroke()}
  c.fillStyle=h.f[0];c.fillRect(X+14,y+6,6,17);tx(h.n,X+28,y+13,12.5,l?'#fff':'#cbd5e1','left',800);tx(h.ln,X+28,y+24,9.5,'#94a3b8','left',600);
  tx(l?'Stufe '+l+'/'+mx+' · '+hSize(h):'gesperrt · '+(h.rc[0][2]-h.rc[0][0]+1)+'×'+(h.rc[0][3]-h.rc[0][1]+1),X+232,y+18,11,l?'#e2e8f0':'#94a3b8','left',700);
  tx(l?'✓ freigeschaltet':req?'✓ Phase '+(h.ph+1)+' erreicht':'🔒 Phase '+h.ph+' abschließen',X+320,y+18,10.5,l||req?'#86efac':'#fca5a5','left',700);
  if(nx){tx((l?'Erweitern: ':'')+fm(nx)+' €',X+474,y+18,11.5,G.m>=nx?'#fde68a':'#fca5a5','left',800);const ok=req&&G.m>=nx;btn(X+578,y+2,82,25,()=>{hsel=h.id;buyHall(h)},ok?'#2f9e6b':'#475569');tx(l?'Erweitern':'Kaufen',X+619,y+19,11.5,'#fff','center',800)}else tx('Maximalgröße',X+474,y+18,11,'#86efac','left',700);
  if(l){
   btn(X+666,y+2,40,25,()=>{focusWorld(hrect(h));hlO=false;sfx('select')},'#334155',0,'hall_location_'+h.id);
   tx('📍',X+686,y+19,13,'#fff','center',700);
  }
 });
 tx('Jede Halle erweitert den Werksboden. Maschinen stehen in ihrer Halle, Logistik auch auf dem Beton davor.',X+16,Y+H-6,10,'#94a3b8')}
function mkPanel(){const [X,Y,W,H]=MENUS.mk.box;pnlBox(X,Y,W,H,'📊 Verkauf',()=>{mkO=false});
 ['Übersicht','Rezepte','Aufträge'].forEach((label,index)=>{
  btn(X+120+index*90,Y+9,84,24,()=>{mkTab=index;mkPg=0;sfx('click')},mkTab===index?'#3a7bd5':'#1f2630',0,'market_tab_'+index);
  tx(label,X+162+index*90,Y+26,11,'#fff','center',700);
 });
 if(mkTab==2){ordersPanel(X,Y,W);return}
 const rows=ITEMS.map((_,i)=>i).filter(i=>visibleItem(i)&&(!mkTab||PR[i]!=null));
 const pageSize=9,np=Math.max(1,Math.ceil(rows.length/pageSize));
 mkPg=Math.min(mkPg,np-1);
 const pr=rows.slice(mkPg*pageSize,(mkPg+1)*pageSize);
 if(!mkTab)salesOverview(X,Y,W,H,pr);
 else{[['Produkt',16],['Rezept',200],['Gebaut in',520]].forEach(([n,x])=>tx(n,X+x,Y+54,10.5,'#94a3b8','left',700));
  pr.forEach((i,k)=>{const y=Y+62+k*24,t=PR[i],m=MD[t],lk=hlv(m.a)<1;if(k%2==0)rr(X+8,y,W-16,23,6,'#ffffff08');c.globalAlpha=lk?.55:1;ico(i,X+24,y+12,.8);tx(ITEMS[i].n,X+38,y+16,11.5,'#fff','left',700);rcpRow(t,X+200,y+12,false);tx(m.n,X+520,y+11,10.5,'#e2e8f0','left',700);tx((lk?'🔒 ':'')+hallOf(m.a).n+' · '+m.w+' s',X+520,y+21,9,'#94a3b8','left',600);c.globalAlpha=1});
  tx('Alle Produkte und was sie brauchen. Gesperrte Hallen (🔒) zeigen dir schon, was dort entsteht.',X+16,Y+H-8,10,'#94a3b8')}
 if(np>1){
  btn(X+W-130,Y+H-30,28,22,()=>{mkPg=(mkPg+np-1)%np;sfx('click')},'#334155',0,'market_prev');
  tx('◀',X+W-116,Y+H-14,11,'#fff','center',700);
  tx((mkPg+1)+' / '+np,X+W-72,Y+H-14,11,'#cbd5e1','center',700);
  btn(X+W-44,Y+H-30,28,22,()=>{mkPg=(mkPg+1)%np;sfx('click')},'#334155',0,'market_next');
  tx('▶',X+W-30,Y+H-14,11,'#fff','center',700);
 }
}

function salesOverview(X,Y,W,H,items){
 let minBonus=Infinity,maxBonus=0;
 for(const o of L)if(typeShip(o.t)&&!o.needsRelocation){
  const bonus=o.pb||1;
  minBonus=Math.min(minBonus,bonus);
  maxBonus=Math.max(maxBonus,bonus);
 }
 if(!maxBonus)minBonus=maxBonus=1;
 tx('Produkt',X+16,Y+54,10.5,'#94a3b8','left',700);
 [['Grundwert',265],['Preis/Stück',415],['Verkauft',515],['Erlös erfasst',W-16]].forEach(([label,x])=>{
  tx(label,X+x,Y+54,10.5,'#94a3b8','right',700);
 });
 items.forEach((item,index)=>{
  const y=Y+62+index*24;
  if(index%2===0)rr(X+8,y,W-16,23,6,'#ffffff08');
  ico(item,X+24,y+12,.8);
  fitText(ITEMS[item].n,X+38,y+16,174,12,'#fff','left',700);
  tx(nf(ITEMS[item].v)+' €',X+265,y+16,12,'#cbd5e1','right',700);
  const low=salePrice(item,minBonus),high=salePrice(item,maxBonus);
  const amount=low===high?nf(low):nf(low)+'–'+nf(high);
  fitText(amount+' €',X+415,y+16,132,12,'#fde68a','right',800);
  fitText(nf(G.sl[item]),X+515,y+16,89,12,'#e2e8f0','right',700);
  const revenue=G.saleIncome[item];
  fitText(revenue!=null?nf(revenue)+' €':G.sl[item]?'–':'0 €',X+W-16,y+16,120,12,'#86efac','right',700);
 });
 const prices=minBonus===maxBonus?'Stückpreise inklusive aktiver Boni.':'Stückpreise können sich je nach zugewiesenem Manager unterscheiden.';
 tx(prices,X+16,Y+H-37,10,'#cbd5e1');
 tx('Stückzahl gesamt. Erlöse seit der Umstellung, ohne Auftragsprämien.',X+16,Y+H-8,10,'#94a3b8');
}

function ordersPanel(X,Y,W){
 tx(G.ord+' Aufträge erfüllt',X+18,Y+60,12,'#cbd5e1','left',700);
 if(!G.od.length)tx('Baue eine Produktionslinie, um Aufträge für ihre Waren zu erhalten.',X+18,Y+103,12,'#cbd5e1');
 G.od.forEach((q,i)=>{
  const y=Y+72+i*51,progress=Math.max(0,Math.min(1,q.d/q.n));
  rr(X+12,y,W-24,46,8,'#ffffff0d');
  ico(q.s,X+30,y+22,1);
  tx(ITEMS[q.s].n,X+47,y+17,12,'#fff','left',700);
  tx(q.d+' / '+q.n+' Stück',X+47,y+35,11,'#cbd5e1');
  rr(X+258,y+18,125,8,4,'#ffffff18');
  rr(X+258,y+18,125*progress,8,4,'#4ade80');
  tx('+'+nf(orderReward(q))+' €',X+480,y+28,12,'#fde68a','right',700);
  if(!q.d){
   const ready=rrLeft()===0;
   btn(X+W-121,y+10,100,26,()=>rerollOrd(q),ready?'#334155':'#1f2937');
   tx(ready?'Tauschen':rrFmt()+' Min.',X+W-71,y+28,11,ready?'#fff':'#94a3b8','center',700);
  }
 });
 tx('Die Prämie kommt zum normalen Stückpreis hinzu. Offene Aufträge lassen sich alle vier Minuten tauschen.',X+18,Y+308,11,'#94a3b8');
}
function openChapterPreview(){
 const options=[
  [1,'Projekt ARCHE'],
  ...Object.entries(chapters).map(([level,chapter])=>[Number(level),chapter.title])
 ];
 showOv(`<div class="fe-offline-report">
  <div class="kick">Factory Empire</div><h2>Testmodus</h2>
  <p>Wähle ein Kapitel. Jedes Kapitel startet mit einer neuen, temporären Testfabrik.</p>
  <div class="row">${options.map(([level,title])=>`<button class="btn" id="fe-preview-${level}">Kapitel ${level} · ${title}</button>`).join('')}</div>
 </div>`);
 for(const [level] of options)bd('fe-preview-'+level,()=>{
  const chapter=chapters[level],site=chapter?.site||'main',region=REGIONS.find(entry=>entry.id===site);
  const done=Object.fromEntries(Object.keys(FactoryStory.scenes).map(id=>[id,true]));
  applySave({v:latestLayout,yardRows:[2,2],ts:Date.now(),m:500000,site,
   sp:chapter?PH.length:0,campaign:{level,stage:0},tu:-1,tutorialAward:true,
   hl:{gar:1,...(region?.hall?{[region.hall]:1}:{})},story:{version:1,done}});
  $('#ov').style.display='none';
  if(region?.hall)focusWorld(hrect(hallOf(region.hall)));
 });
}
function campaignTab(X,Y,W){
 tx('Kampagne',X+18,Y+67,17,'#e2edf6','left',800);
 const current=campaignChapter(),project=chapters[current];
 rr(X+16,Y+82,W-32,68,8,'#243545');
 tx('Kapitel 1 · Projekt ARCHE',X+28,Y+106,13,'#fff','left',800);
 tx(G.sp===PH.length?'Abgeschlossen · +10 % Bandtempo · +20 Lagerplätze · −5 % Baukosten':G.sp+' / '+PH.length+' Bauphasen fertig',X+28,Y+130,12,'#bcd3de');
 if(project){
  rr(X+16,Y+162,W-32,77,8,'#243545');
  tx('Kapitel '+current+' · '+project.title,X+28,Y+186,13,'#fff','left',800);
  tx(G.campaign.stage===project.phases.length?'Abgeschlossen':G.campaign.stage+' / '+project.phases.length+' Bauphasen fertig',X+28,Y+207,12,'#bcd3de');
  tx('Werft eröffnet · +6 % Maschinentempo · '+fm(project.grant)+' € Aufbauhilfe',X+28,Y+225,11,'#bcd3de');
 }
 btn(X+16,Y+257,180,33,()=>{closeP2();projectView=current;bkO=true},'#334e66',0,'campaign_open');
 tx('Zum Projekt',X+106,Y+279,12,'#fff','center',700);
 if(preview){
  btn(X+210,Y+257,180,33,openChapterPreview,'#75603a',0,'chapter_preview');
  tx('Testmodus · Kapitel wählen',X+300,Y+279,12,'#fff','center',700);
 }
}
function storyArchive(X,Y,W){
 tx('Story-Archiv',X+18,Y+65,17,'#e2edf6','left',800);
 const list=Object.keys(FactoryStory.scenes).filter(id=>G.story.done[id]);
 if(!list.length){tx('Angesehene Szenen erscheinen hier.',X+18,Y+103,12,'#bcd3de');return}
 const count=5,page=Math.min(storyArchivePage,Math.floor((list.length-1)/count));
 for(const [i,id] of list.slice(page*count,(page+1)*count).entries()){
  const y=Y+81+i*39;
  rr(X+13,y,W-26,33,6,'#223241');fitText(FactoryStory.scenes[id].title,X+23,y+21,W-134,12,'#e2edf6','left',700);
  btn(X+W-100,y+3,80,27,()=>{if(replayStory(id))closeP2()},'#34526c',0,'story_replay_'+id);
  tx('Ansehen',X+W-60,y+21,11,'#fff','center',700);
 }
 if(list.length>count){
  btn(X+16,Y+286,141,27,()=>{storyArchivePage=(page+1)%Math.ceil(list.length/count)},'#34526c',0,'story_next_page');
  tx('Seite '+(page+1)+' / '+Math.ceil(list.length/count)+' ›',X+86,Y+304,11,'#fff','center',700);
 }
}
let storyArchivePage=0;
function companyBox(){
 return [40,64,fTab===0||fTab===5?Math.min(720,FW-18):720,330];
}
function acPanel([X,Y,W,H]){
 if(fTab===0)pnlBox(X,Y,W,H,'Firma',()=>{acO=false});
 else{
  btn(X,Y,W,H,()=>{},'#0f141bf8');
  panelClose(X,Y,W,()=>{acO=false});
 }
 const tabWidth=Math.min(106,(W-(fTab===0?22:fTab===5?48:64))/6);
 ['Übersicht','Kampagne','Audio','Hilfe','Werkzeuge','Story'].forEach((label,i)=>{
  const x=X+11+i*tabWidth,y=Y+(fTab===0?38:8);
  btn(x,y,tabWidth-4,29,()=>{fTab=i;pcf=false;sfx('click')},fTab===i?'#336ca5':'#253344',0,'ft'+i);
  fitText(label,x+(tabWidth-4)/2,y+19,tabWidth-10,12,'#fff','center',700);
 });
 if(fTab===1){campaignTab(X,Y,W);return}
 if(fTab===2){auTab(X,Y,W,H);return}
 if(fTab===3){heTab(X,Y,W,H);return}
 if(fTab===4){toolsTab(X,Y);return}
 if(fTab===5){storyArchive(X,Y,W);return}
 const completions=G.ac.length,phase=Math.min(G.sp,PH.length),cardWidth=(W-38)/2;
 const bar=(x,y,w,ratio,color)=>{
  rr(x,y,w,6,3,'#334155');
  if(ratio>0)rr(x,y,w*Math.min(1,ratio),6,3,color);
 };
 const cards=[
  ['Unternehmenslevel',String(LV),(G.xp-XB)+' / '+(XN-XB)+' XP',(G.xp-XB)/(XN-XB),'#7dd3fc'],
  ['Projekt ARCHE',phase+' / '+PH.length,phase===PH.length?'Bunker fertig':PH[phase].n,phase/PH.length,'#e7bb72'],
  ['Erfolge',completions+' / '+AC.length,'Freigeschaltet',completions/AC.length,'#86efac'],
  ['Unternehmenswert',fm(companyValue())+' €',nf(G.sold)+' Produkte verkauft',0,null]
 ];
 for(const [i,[label,value,description,ratio,color]] of cards.entries()){
  const x=X+14+i%2*(cardWidth+10),y=Y+81+Math.floor(i/2)*93;
  rr(x,y,cardWidth,84,8,'#1c2935');
  fitText(label,x+10,y+18,cardWidth-20,12,'#aec1d0','left',700);
  fitText(value,x+10,y+43,cardWidth-20,21,color||'#fff','left',800);
  fitText(description,x+10,y+62,cardWidth-20,11,'#e2e8f0');
  if(color)bar(x+10,y+70,cardWidth-20,ratio,color);
 }
 const open=(x,label,id,action)=>{
  btn(x,Y+275,cardWidth,35,action,'#334b62',0,id);
  fitText(label,x+cardWidth/2,Y+297,cardWidth-14,12,'#fff','center',700);
 };
 open(X+14,'Zu den Erfolgen','company_achievements',()=>{
  closeP2();achievementsOpen=true;sfx('click');
 });
 open(X+24+cardWidth,'Zum Bunkerprojekt','company_bunker',()=>{closeP2();projectView=campaignChapter();bkO=true;sfx('click')});
}
let achievementsOpen=false,achievementGroup=0;
function achievementBox(){
 const width=Math.min(760,FW-18),columns=width>=580?2:1,tabRows=columns===2?1:2;
 const entries=AC.filter(a=>a.group===achievementGroups[achievementGroup]);
 const height=91+tabRows*34+Math.ceil(entries.length/columns)*75;
 return [40,64,width,height];
}
function achievementPanel([X,Y,W,H]){
 pnlBox(X,Y,W,H,'Erfolge',()=>{achievementsOpen=false});
 const back={x:X+14,y:Y+36,w:80,h:26};
 btn(back.x,back.y,back.w,back.h,()=>{closeP2();acO=true;fTab=0;sfx('click')},'#334155',0,'achievement_back');
 tx('‹ Firma',back.x+40,back.y+17,12,'#fff','center',700);
 fitText(G.ac.length+' / '+AC.length+' abgeschlossen',X+W-14,Y+53,W-118,12,'#b7d7ca','right',700);
 const columns=W>=580?2:1,tabCount=columns===2?6:3,tabWidth=(W-28)/tabCount;
 for(const [i,name] of achievementGroups.entries()){
  const x=X+14+i%tabCount*tabWidth,y=Y+73+Math.floor(i/tabCount)*34;
  btn(x,y,tabWidth-4,28,()=>{achievementGroup=i;sfx('click')},i===achievementGroup?'#336ca5':'#253344',0,'achievement_group_'+i);
  fitText(name,x+(tabWidth-4)/2,y+18,tabWidth-12,11.5,'#fff','center',700);
 }
 const start=Y+77+Math.ceil(achievementGroups.length/tabCount)*34;
 const cardWidth=(W-28-10*(columns-1))/columns;
 const entries=AC.filter(a=>a.group===achievementGroups[achievementGroup]);
 for(const [i,{id,title,condition,progress,goal,reward}] of entries.entries()){
  const x=X+14+i%columns*(cardWidth+10),y=start+Math.floor(i/columns)*75;
  const earned=G.ac.includes(id),amount=earned?goal:Math.min(goal,Math.max(0,Number(progress())||0));
  rr(x,y,cardWidth,67,7,earned?'#244438':'#1c2935');
  fitText((earned?'✓ ':'')+title,x+9,y+16,cardWidth-76,12,'#fff','left',800);
  tx('+'+nf(reward)+' XP',x+cardWidth-9,y+16,10.5,'#f4cc82','right',700);
  tuWrap(condition,cardWidth-20,'600 10.5px system-ui').slice(0,2).forEach((row,n)=>{
   tx(row,x+9,y+30+n*10,10.5,'#c7d7e4','left',600);
  });
  const count=earned?'Erreicht':nf(amount)+' / '+nf(goal);
  const barW=cardWidth-100;
  rr(x+9,y+52,barW,5,2.5,'#3b4b55');
  if(amount)rr(x+9,y+52,barW*amount/goal,5,2.5,earned?'#8adaae':'#7cb7e1');
  tx(count,x+cardWidth-9,y+58,10,earned?'#aaf4c6':'#b8c5d2','right',700);
 }
}
function toolsTab(X,Y){
 const tools=[
  ['planning','Fabrikplanung',()=>{planningOpen=true}],
  ['stats','Unternehmensstatistik',()=>{statsOpen=true}],
  ['growth','Standorte und Rekorde',()=>{growthTab=0;growthOpen=true}],
  ['save','Spielstand',()=>{confirmLocal=false;saveOpen=true}]
 ];
 tools.forEach(([id,label,open],i)=>{
  const x=X+18+(i%2)*346,y=Y+61+Math.floor(i/2)*61;
  btn(x,y,328,44,()=>{closeP2();open();sfx('click')},'#334155',0,id);
  tx(label,x+16,y+27,13,'#fff','left',700);
 });
}
let statsPage=0,statsOpen=false;
function statsPanel(){
 const [X,Y,W,H]=MENUS.stats.box;
 pnlBox(X,Y,W,H,'Unternehmensstatistik',()=>{statsOpen=false});
 ['Übersicht','Produktionsketten','Linien'].forEach((label,i)=>{
  btn(X+211+i*130,Y+8,124,25,()=>{statsTab=i;statsPage=0;selectedRecipe=null},statsTab==i?'#3a7bd5':'#334155');
  tx(label,X+273+i*130,Y+25,11,'#fff','center',700);
 });
 if(statsTab==1){chainPanel(X,Y,W,H);return}
 if(statsTab==2){linesPanel(X,Y,W,H);return}
 const history=G.history;
 const objects=L.filter(o=>siteAt(o.x,o.y)?.id==currentSite),machines=objects.filter(prod);
 const totalOutput=L.reduce((sum,o)=>sum+perMinute(o,'output'),0);
 const stocks=objects.filter(o=>isStorage(o.t)).reduce((memo,o)=>[memo[0]+o.q.length,memo[1]+cap(o)],[0,0]);
 const rows=[
  ['Gewinn/Min',rate().toFixed(1)+' €'],
  ['Produktion/Min',totalOutput.toFixed(1)+' Stück'],
  ['Verkaufte Waren',nf(G.sold)+' Stück'],
  ['Material und Löhne',fm(G.cost+G.wc)+' €'],
  ['Gebäude am Standort',nf(objects.length)],
  ['Maschinenauslastung',machines.length?Math.round(machines.reduce((n,o)=>n+o.ew,0)*100/machines.length)+' %':'–'],
  ['Lager am Standort',stocks[0]+' / '+stocks[1]+' Stück'],
  ['Unternehmenswert',fm(companyValue())+' €']
 ];
 rows.forEach(([label,value],i)=>{
  const x=X+18+(i%4)*169,y=Y+56+Math.floor(i/4)*51;
  tx(label,x,y,10.5,'#94a3b8');tx(value,x,y+19,13.7,'#e2e8f0','left',800);
 });
 chartLine(history.map(row=>row.value),X+20,Y+145,316,110,'Unternehmenswert','#7dd3fc');
 chartLine(history.slice(1).map((row,i)=>row.sales-history[i].sales-(row.cost-history[i].cost)-(row.wages-history[i].wages)),X+356,Y+145,316,110,'Betriebsergebnis/Min','#86efac');
 tuWrap(msg,W-40,'600 11px system-ui').slice(0,2).forEach((text,i)=>tx(text,X+20,Y+292+i*15,11,bn?'#fca5a5':'#cbd5e1'));
}
let statsTab=0;
function chartLine(values,x,y,w,h,label,color){
 rr(x,y,w,h,7,'#ffffff0d');
 tx(label,x+10,y+17,10.5,'#cbd5e1','left',800);
 if(values.length<2){tx('Verfügbar nach zwei Simulationsminuten',x+10,y+54,10,'#94a3b8');return}
 const low=Math.min(...values),high=Math.max(...values),width=w-24,height=h-46;
 tx(fm(Math.round(high))+' €',x+w-10,y+17,10,color,'right',700);
 c.strokeStyle='#ffffff25';c.strokeRect(x+12,y+25,width,height);
 c.strokeStyle=color;c.lineWidth=2;c.beginPath();
 values.forEach((value,i)=>{
  const px=x+12+width*i/(values.length-1),py=y+25+height*(high===low?.5:(high-value)/(high-low));
  if(i)c.lineTo(px,py);else c.moveTo(px,py);
 });
 c.stroke();
 tx('Letzte '+values.length+' Simulationsminuten',x+10,y+h-7,9,'#94a3b8');
}
let selectedRecipe=null,recipePage=0;
function recipeTree(item){
 const amounts=new Map(),depths=new Map();
 function walk(id,quantity,depth){
  amounts.set(id,(amounts.get(id)||0)+quantity);
  depths.set(id,Math.max(depths.get(id)||0,depth));
  for(const [input,n] of MD[PR[id]].r||[])walk(input,quantity*n,depth+1);
 }
 walk(item,1,0);
 return [...amounts].sort(([a],[b])=>depths.get(b)-depths.get(a)).map(([id,count])=>({id,count}));
}
function linesPanel(X,Y,W,H){
 const wages=companyRates().wages,machines=L.filter(prod).length;
 const rows=allProductionLines().map(line=>({line,m:lineMetrics(line,wages,machines)})).sort((a,b)=>b.m.profit-a.m.profit);
 const page=Math.min(statsPage,Math.max(0,Math.ceil(rows.length/7)-1));
 if(!rows.length)tx('Noch keine Produktionslinie gebaut.',X+23,Y+74,13,'#cbd5e1');
 rows.slice(page*7,page*7+7).forEach(({line,m},i)=>{
  const y=Y+48+i*33,first=m.machines[0],name=MD[first.t].n+' · '+(areaAt(first.x,first.y)?.n||'Werkshof');
  tx(name,X+18,y+13,11.5,'#fff','left',800);
  tx(m.output.toFixed(1)+' Stück/Min · '+Math.round(m.load*100)+' % Last · '+m.profit.toFixed(1)+' €/Min',X+18,y+27,10,'#cbd5e1');
  tx(m.capacity?(100*m.output/m.capacity).toFixed(0)+' % der Nennleistung':'Pausiert',X+W-118,y+17,10,'#fde68a','right',700);
  btn(X+W-103,y+1,85,24,()=>{sel=first;tool='hand';closeP2();lineOpen=true},'#334155');
  tx('Analyse',X+W-60,y+17,10,'#fff','center',700);
 });
 if(rows.length>7){
  btn(X+W-143,Y+287,126,25,()=>{statsPage=(page+1)%Math.ceil(rows.length/7)},'#334155');
  tx('Weitere Linien ›',X+W-80,Y+304,10.5,'#fff','center',700);
 }
}
function chainPanel(X,Y,W,H){
 if(selectedRecipe!=null){
  btn(X+18,Y+43,95,24,()=>{selectedRecipe=null;recipePage=0},'#334155');
  tx('‹ Produktliste',X+65,Y+59,10.5,'#fff','center',700);
  tx(ITEMS[selectedRecipe].n+' · pro Endprodukt',X+126,Y+59,12,'#fff','left',800);
  const tree=recipeTree(selectedRecipe),size=7;
  tree.slice(recipePage*size,recipePage*size+size).forEach(({id,count},i)=>{
   const y=Y+78+i*28,m=MD[PR[id]],own=L.filter(o=>o.t==PR[id]).reduce((sum,o)=>sum+perMinute(o,'output'),0);
   ico(id,X+22,y+10,.65);tx(count+'× '+ITEMS[id].n,X+39,y+15,11,'#e2e8f0');
   tx(m.n,X+265,y+15,10.5,'#94a3b8');tx(own.toFixed(1)+' Stück/Min im Betrieb',X+W-22,y+15,10.5,'#fde68a','right',700);
  });
  if(tree.length>size){
   btn(X+W-143,Y+287,126,25,()=>{recipePage=(recipePage+1)%Math.ceil(tree.length/size)},'#334155');
   tx('Weitere Schritte ›',X+W-80,Y+304,10.5,'#fff','center',700);
  }
  return;
 }
 const perPage=8,pages=Math.ceil(ITEMS.length/perPage),page=statsPage%pages;
 ITEMS.slice(page*perPage,(page+1)*perPage).forEach((item,i)=>{
  const id=page*perPage+i,m=MD[PR[id]],y=Y+45+i*29;
  const installed=L.filter(o=>o.t==PR[id]),actual=installed.reduce((n,o)=>n+perMinute(o,'output'),0);
  btn(X+12,y,W-24,28,()=>{selectedRecipe=id;recipePage=0},i%2?'#ffffff06':'#ffffff0d');
  ico(id,X+27,y+13,.7);tx(item.n,X+42,y+17,11,'#fff','left',700);
  const input=(m.r||[]).map(([id,count])=>count+'× '+ITEMS[id].n).join(' + ')||'Rohstoffbezug';
  tuWrap(input,331,'600 10px system-ui').slice(0,2).forEach((line,j)=>tx(line,X+198,y+11+j*11,10,'#cbd5e1'));
  tx(actual.toFixed(1)+' Stück/Min',X+W-26,y+17,11,'#fde68a','right',700);
 });
 btn(X+W-143,Y+287,126,25,()=>{statsPage++},'#334155');
 tx('Seite '+(page+1)+' / '+pages+' ›',X+W-80,Y+304,10.5,'#fff','center',700);
}
let teamHall='gar',teamTab=0,teamSpecialty=null;
function teamBox(){
 return [40,64,Math.min(720,FW-18),teamTab===0?521:690];
}
function pnPanel([X,Y,W,H]){
 const halls=HL.filter(hall=>hlv(hall.id)>0);
 const index=Math.max(0,halls.findIndex(hall=>hall.id===teamHall)),hall=halls[index];
 const workers=crewRoles.reduce((sum,role)=>sum+crewCount(hall.id,role.id),0);
 const depots=L.filter(o=>o.teamDepot&&!o.needsRelocation&&areaAt(o.x,o.y)===hall).length;
 pnlBox(X,Y,W,H,'Hallenteam',()=>{pnO=false});
 const action=(id,label,x,y,w,fn,enabled=true,color='#334e66')=>{
  btn(x,y,w,28,enabled?fn:()=>{},enabled?color:'#273340',0,enabled?id:null);
  fitText(label,x+w/2,y+18,w-10,11.5,enabled?'#fff':'#9baabb','center',700);
 };
 const choose=direction=>{teamHall=halls[(index+direction+halls.length)%halls.length].id;sfx('select')};
 action('team_hall_prev','‹',X+13,Y+41,35,()=>choose(-1),halls.length>1);
 action('team_hall_next','›',X+W-48,Y+41,35,()=>choose(1),halls.length>1);
 fitText(hall.n+' · '+(index+1)+' / '+halls.length,X+W/2,Y+60,W-110,15,'#e2edf6','center',800);
 const half=(W-35)/2;
 action('team_crew','Mitarbeiter',X+13,Y+81,half,()=>{teamTab=0;teamSpecialty=null},true,teamTab===0?'#336ca5':'#253344');
 action('team_managers','Manager',X+22+half,Y+81,half,()=>{teamTab=1},true,teamTab===1?'#336ca5':'#253344');
 fitText(depots+' Team-Lager · '+workers+' Mitarbeitende · '+fm(WG)+' €/Min gesamt',X+14,Y+127,W-28,11,'#b3c9d6','left',700);
 fitText('Team-Lager im Menü eines Zwischenlagers in der Halle aktivieren.',X+14,Y+143,W-28,10.5,'#c7d7e4');
 const cardX=X+13,cardW=W-26,part=(cardW-32)/3;
 function row(label,y,color){
  rr(cardX,y,cardW,teamTab===0?108:124,8,'#1c2935');
  rr(cardX+9,y+8,4,13,2,color);
  fitText(label,cardX+20,y+19,cardW-78,13,'#fff','left',800);
 }
 function description(description,y){
  tuWrap(description,cardW-20,'600 10.5px system-ui').slice(0,2).forEach((line,i)=>tx(line,cardX+10,y+i*13,10.5,'#cbd5e1','left',600));
 }
 if(teamTab===0){
  for(const [i,role] of crewRoles.entries()){
   const k=role.id,y=Y+155+i*115,assigned=crewCount(hall.id,k),reserve=G.emp[k]-assignedCrew(k),cost=hcost(k);
   row(role.label,y,role.color);
   description(role.description,y+37);
   const detail=!role.unlock()&&G.emp[k]===0?role.require:assigned+' in dieser Halle · '+reserve+' verfügbar · '+G.emp[k]+' / 12 angestellt';
   fitText(detail,cardX+10,y+65,cardW-20,10.5,'#f1cb85');
   const start=cardX+10,buttonY=y+73;
   action('crew_hire_'+k,'Einstellen '+fm(cost)+' €',start,buttonY,part,()=>hireE(k,hall.id),role.unlock()&&G.emp[k]<12&&G.m>=cost,'#2c694f');
   action('crew_assign_'+k,'Einsetzen',start+part+6,buttonY,part,()=>setCrew(k,hall.id,1),reserve>0);
   action('crew_remove_'+k,'Abziehen',start+2*(part+6),buttonY,part,()=>setCrew(k,hall.id,-1),assigned>0);
  }
  return;
 }
 if(teamSpecialty){
  const manager=G.mg.find(m=>m.id===teamSpecialty);
  const y=Y+166;
  tx('Spezialisierung',X+16,y+12,14,'#fff','left',800);
  description('Spezialist: stärkerer Bonus am Ziel. Generalist: kleinerer Bonus entlang der verbundenen Linie in der Halle.',y+36);
  action('manager_specialist','Spezialist',X+14,y+78,half,()=>{specM(manager,1);teamSpecialty=null});
  action('manager_generalist','Generalist',X+23+half,y+78,half,()=>{specM(manager,2);teamSpecialty=null});
  action('manager_cancel','Zurück',X+14,y+112,W-28,()=>{teamSpecialty=null});
  return;
 }
 for(const [i,d] of MG.entries()){
  const m=G.mg.find(manager=>manager.id===d.id),room=m&&managerHall(m),y=Y+155+i*131;
  row(d.r,y,d.color);
  description(d.task,y+51);
  fitText(d.n+(m?' · Level '+m.lv+' / 10':''),cardX+10,y+34,cardW-20,10.5,'#b3c9d6','left',700);
  const start=cardX+10,buttonY=y+87;
  if(!m){
   fitText(d.cond[1]()?'Verfügbar':d.cond[0],start,y+78,cardW-20,10.5,d.cond[1]()?'#97e4bb':'#f1cb85');
   action('manager_hire_'+d.id,'Einstellen · '+fm(d.cost)+' €',start,buttonY,cardW-20,()=>hireM(d),d.cond[1]()&&G.m>=d.cost,'#2c694f');
   continue;
  }
  const target=managerTarget(m,d),useHere=room===hall;
  fitText((room?.n||'Nicht eingesetzt')+(target?' · '+d.lab+' '+(d.id==='eng'?'−':'+')+Math.min(d.id==='eng'?60:Infinity,Math.round(meff(m,d)*100))+' %':'')+(m.sp?' · '+(m.sp===1?'Spezialist':'Generalist'):''),start,y+78,cardW-20,10.5,room?'#97e4bb':'#f1cb85');
  action('manager_assign_'+d.id,useHere?'In dieser Halle':'Hier einsetzen',start,buttonY,part,()=>assignManager(m,hall),!useHere);
  action('manager_level_'+d.id,m.lv===10?'Max. Level':'Level ↑ '+fm(lcost(m,d))+' €',start+part+6,buttonY,part,()=>lvlM(m,d),m.lv<10&&G.m>=lcost(m,d),'#2c694f');
  if(m.lv>=5&&!m.sp){
   action('manager_spec_'+d.id,'Spezialisieren',start+2*(part+6),buttonY,part,()=>{teamSpecialty=m.id;panelScroll.y=0},true,'#58477e');
  }else action('manager_target_'+d.id,'Ziel wählen',start+2*(part+6),buttonY,part,()=>{asg=d.id;pnO=false;sfx('click')});
 }

}
let researchTab='basic';
function rsPanel(){const [X,Y,W,H]=MENUS.rs.box;
 const logistics=researchTab==='logistics',advanced=researchTab==='advanced';
 const NW=logistics?106:138,NH=logistics?26:32;
 const pos=n=>logistics?[X+148+n.x*111,Y+44+n.y*30]:[X+104+n.x*150,Y+44+n.y*38];
 btn(X,Y,W,H,()=>{},'#0f141bf8');c.strokeStyle='#ffffff22';c.lineWidth=1;c.beginPath();c.roundRect(X,Y,W,H,12);c.stroke();
 tx('🔬 Forschung',X+16,Y+26,16,'#fff','left',800);
 tx(nf(G.rp)+' FP',X+W-60,Y+26,13,'#fde68a','right',800);
 for(const [i,[label,key]] of [['Grundlagen','basic'],['Vertiefung','advanced'],['Logistik','logistics']].entries()){
  const x=X+160+i*110;
  btn(x,Y+8,104,24,()=>{researchTab=key;rsel=null;sfx('select')},researchTab===key?'#1d4f82':'#263340',0,'research_'+key);
  tx(label,x+52,Y+24,11,'#fff','center',700);
 }
 const page=RN.filter(n=>logistics?!!n.logistics:!n.logistics&&!!n.advanced===advanced);
 panelClose(X,Y,W,()=>{rsO=false});
 if(logistics){
  Object.entries(logisticsPaths).forEach(([key,path],i)=>{
   const y=Y+44+i*30;
   tx(path.name,X+16,y+11,10.5,'#e0edf5','left',750);
   const rate=decimal(logisticsRates[key]/100)+' Waren/s';
   const extra=key==='tunnel'?' · '+tunnelRange()+' Felder':key==='storage'?' · '+STC+' Plätze':'';
   tx(rate+extra,X+16,y+23,9,'#9ebdd1');
  });
 }else{
  const categories=advanced?['Leistung','Lager','Einkauf','Wartung']:['Produktion','Leistung','Logistik','Verkauf','Vertrieb','Unternehmen'];
  categories.forEach((n,i)=>tx(n,X+16,Y+65+i*38,11,'#94a3b8','left',700));
 }
 for(const n of page)for(const p of n.p){const a=page.find(q=>q.id==p);if(!a||logistics&&n.y!==a.y)continue;const [x1,y1]=pos(a),[x2,y2]=pos(n);c.strokeStyle=RH(p)?'#4ade80':'#ffffff33';c.lineWidth=2.5;c.beginPath();if(n.x>a.x){c.moveTo(x1+NW,y1+NH/2);c.bezierCurveTo(x1+NW+20,y1+NH/2,x2-20,y2+NH/2,x2,y2+NH/2)}else{c.moveTo(x1+NW/2,y1+NH);c.lineTo(x2+NW/2,y2)}c.stroke()}
 for(const n of page){const[x,y]=pos(n),done=RH(n.id),av=rOK(n),can=av&&G.rp>=researchCost(n),sl=rsel==n.id,fl=rflash[n.id]||0;
  btn(x,y,NW,NH,()=>{rsel=n.id;sfx('select')},done?'#14532d':av?'#1d3b66':'#1b222c',0,'research_'+n.id);
  c.strokeStyle=sl?'#ffd23f':can?`rgba(250,204,21,${.55+.4*Math.sin(tm*5)})`:done?'#4ade80':'#ffffff22';c.lineWidth=sl||can?2.5:1.5;c.beginPath();c.roundRect(x,y,NW,NH,9);c.stroke();
  c.globalAlpha=done||av?1:.5;
  if(logistics){
   tx(logisticsLevels[n.x],x+10,y+17,11,'#fff','left',800);
   tx(done?'✓':nf(researchCost(n))+' FP',x+NW-9,y+17,10,done?'#86efac':can?'#fde68a':'#94a3b8','right',700);
  }else{
   tx(n.n,x+9,y+14,11,'#fff','left',700);
   tx(done?'✓ erforscht':n.ex&&RH(n.ex)?'gesperrt (andere Strategie)':researchCost(n)+' FP',x+9,y+26,10,done?'#86efac':can?'#fde68a':'#94a3b8','left',700);
  }
  c.globalAlpha=1;
  if(fl>0){c.fillStyle=`rgba(255,255,255,${fl*.5})`;c.beginPath();c.roundRect(x,y,NW,NH,9);c.fill()}}
 const n=page.find(q=>q.id==rsel),dy=Y+H-62;rr(X+12,dy,W-24,52,10,'#ffffff0d');
 if(!n)tx(logistics?'Jede Reihe verbessert ihre Geräte. Verteiler umfasst Splitter, Fusionator und Kreuzung.':
  'Wähle eine Technologie. Transport-Upgrades findest du im Reiter Logistik.',X+24,dy+31,11.5,'#94a3b8');
 else{tx(n.n,X+24,dy+17,13,'#fff','left',800);fitText(n.e,X+24,dy+32,W-227,11,'#cbd5e1','left',600);
  const rq=[...n.p.map(p=>[RN.find(q=>q.id==p).n,RH(p)]),...(n.rq?[[n.rq[0],n.rq[1]()]]:[])];
  tx('Voraussetzung: '+(rq.length?rq.map(r=>(r[1]?'✓ ':'✗ ')+r[0]).join(' · '):'keine'),X+24,dy+46,10.5,'#94a3b8');
  const done=RH(n.id),ok=rOK(n)&&G.rp>=researchCost(n);if(done)tx('✓ erforscht',X+W-40,dy+31,13,'#86efac','right',800);else{btn(X+W-190,dy+10,166,32,()=>buyR(n),ok?'#2f9e6b':'#475569',0,'research_buy');tx('Erforschen · '+nf(researchCost(n))+' FP',X+W-107,dy+31,12.5,'#fff','center',800)}}}
function rotObj(o,r=(o.r+1)%4){
 const error=placement(o,o.x,o.y,r,new Set([o]));
 if(error){constructionError(error,{x:o.x,y:o.y,t:o.t,r,base:o.base});return false}
 if(r!==o.r){unpairTunnel(o);forgetYardLinks(new Set([o]));}
 mapObject(o,null);
 if(o.j==1)o.jm=[o.jm[3],o.jm[0],o.jm[1],o.jm[2]];
 o.r=r;o.needsRelocation=false;mapObject(o,o);sfx('rotate');analyze();sv(0);return true;
}
function togP(k){const w=MENUS[k].show(),fromAchievements=achievementsOpen;closeP2();if(!w){if(k=='mk')mkO=true;else if(k=='rs')rsO=true;else if(k=='pn')pnO=true;else if(k=='hl')hlO=true;else if(k=='bk'){projectView=campaignChapter();bkO=true}else{acO=true;if(fromAchievements)fTab=0}}sfx('click')}
const TIPS={hand:['Hand','Tippe ein Gerät an, um Rezept, Upgrades und Einstellungen zu sehen.'],belt:['Förderband','Die Pfeile zeigen die Laufrichtung. Ziehe über mehrere Felder, um eine Strecke zu legen. Unter Forschung → Logistik verbesserst du alle normalen Bänder automatisch.'],rot:['Richtung','Dreht, was du als Nächstes baust oder gerade bewegst.'],mov:['Bewegen','Tippe auf ein Gebäude und anschließend auf das Zielfeld oder ziehe es direkt dorthin. Inhalt und Level bleiben erhalten. Prüfe danach die Anschlüsse.'],del:['Löschen','Tippe ein Gebäude an oder ziehe über mehrere Gebäude. Du erhältst die Hälfte der Baukosten zurück.']};
function fitText(text,x,y,width,size,color,align='left',weight=700){
 c.font=weight+' '+size+'px system-ui,sans-serif';
 c.fillStyle=color;c.textAlign=align;
 c.fillText(text,x,y,width);
}
let deviceInfo=null;
function deviceDescription(id,object){
 const model=MD[id], size=(object?.base||defaultSize(id)).join(' × ');
 const rows=[['Aufstellung',size+' Felder · '+(model?.a?hallOf(model.a).n:'Halle oder Werksboden')+' · '+fm(cst(id))+' €']];
 if(model?.o!=null){
  const process=factoryMachineDetails[id];
  if(process)rows.push(['Arbeitsweise',process]);
  const seconds=object?tme(object):model.w;
  const source=model.r?'Die Zutaten über Förderbänder zuführen.':'Kein Eingangsband nötig. Einkauf pro Stück: '+(model.rc*RCm).toLocaleString('de-DE',{maximumFractionDigits:2})+' €.';
  const duration=seconds.toLocaleString('de-DE',{maximumFractionDigits:1});
  rows.push(['Betrieb',duration+' s pro Stück. '+source+' Der Pfeil zeigt zum Ausgang. Bei vollem Ausgang hält die Maschine an.']);
 }else if(isBelt(id)){
  rows.push(['Transport',formatTransportRate(id)+' · '+beltSize(id)+' Pufferplätze. Forschung → Logistik verbessert diesen Bandtyp.']);
  const routing={
   tunnel:'Platziere zwei gleich ausgerichtete Enden auf einer geraden Linie. Tippe im Gerätefenster auf „Tunnel verbinden“ und wähle das zweite Ende. Die aktuelle Reichweite beträgt '+tunnelRange()+' Felder.',
   sort:'Wähle im Gerätefenster eine Ware. Das Band sortiert passende und übrige Waren in getrennte Richtungen.',
   smart:'Im Gerätefenster stellst du ein, welcher benachbarte Anschluss bevorzugt beliefert wird.'
  };
  rows.push(['Anschluss',routing[id]||TIPS[id]?.[1]||model?.d||'Waren entgegen der Pfeilrichtung zuführen. Der Pfeil markiert die Ausgabe. Im Gerätefenster kannst du das Band drehen.']);
 }else if(isStorage(id)){
  rows.push(['Lagerung',(object?cap(object)+' Lagerplätze. ':'Puffert Waren. ')+'Ausgabe bis zu '+formatTransportRate(id)+'. Lagerforschung erhöht die Kapazität.']);
  rows.push(['Anschluss','Waren über Förderbänder zuführen. Die Ausgabe erfolgt am Pfeil. Automatische Lagerung und Team-Lager lassen sich am Gerät einstellen.']);
 }else if(model?.j){
  rows.push(['Transport',formatTransportRate(id)+(model.j===2?' je unabhängiger Spur.':' für alle Ausgänge zusammen.')+' Der Forschungspfad „Verteiler“ erhöht den Durchsatz.']);
  rows.push(['Materialfluss',model.d||(model.j===2?'Zwei Bänder kreuzen sich. Ware fährt auf ihrer Spur geradeaus.':'Leitet Waren zwischen den eingestellten Eingängen und Ausgängen weiter. Konfiguriere die vier Seiten im Gerätefenster.')]);
 }else if(typeShip(id)){
  rows.push(['Versand','Nimmt fertige Produkte vom Band an, verkauft sie und schreibt den Erlös deinem Konto gut.']);
 }else if(isProjectRamp(id)){
  const required=projectPhase(id)?.q.map(([item,count])=>count+' × '+ITEMS[item].n).join(' · ');
  rows.push(['Aufgabe',required||'Nimmt Waren für das aktive Bauprojekt entgegen.']);
  rows.push(['Anschluss','Förderband zur Rampe legen. Waren werden automatisch dem laufenden Bauabschnitt angerechnet.']);
 }else rows.push(['Arbeitsweise',factoryMachineDetails[id]||model?.d||(model?.inspect?'Prüft und transportiert Ware in Pfeilrichtung.':'Historisches Gerät aus einem bestehenden Werk. Die Anschlüsse und Einstellungen stehen im Gerätefenster.')]);
 if(model?.need)rows.push(['Freischaltung',model.need]);
 return rows;
}
function deviceInfoLayout(){
 const {id,object}=deviceInfo,width=Math.min(640,Math.max(248,Math.floor((FW-2*view.inset)/.94)));
 const inner=width-32;
 const y=74+(MD[id]?.o!=null?recipeHeight(MD[id],inner,false):0);
 const height=deviceDescription(id,object).reduce((height,[,value])=>
  height+23+tuWrap(value,inner,'600 13px system-ui,sans-serif').length*18,y);
 return [64,62,width,Math.max(310,height)];
}
function deviceInfoPanel([X,Y,W,H]){
 const {id,object}=deviceInfo;
 pnlBox(X,Y,W,H,MD[id]?.n||'Förderband',()=>{deviceInfo=null});
 let y=Y+44;
 if(MD[id]?.o!=null)y+=recipePreview(id,X+16,y,W-32)+23;
 else y+=11;
 for(const [label,text] of deviceDescription(id,object)){
  tx(label,X+16,y,12,'#a8d4ea','left',800);
  for(const line of tuWrap(text,W-32,'600 13px system-ui,sans-serif')){y+=18;tx(line,X+16,y,13,'#edf4f7','left',600)}
  y+=23;
 }
}
function recipeColumns(width){
 return width>520?3:width>=238?2:1;
}
function recipeHeight(model,width,compact){
 const columns=recipeColumns(width),height=compact?34:45;
 return (model.r?14+Math.ceil(model.r.length/columns)*height+4:0)+14+height;
}
function recipePreview(id,x,y,width,{compact=false,object=null}={}){
 const model=MD[id],columns=recipeColumns(width),height=compact?34:45,step=(width+4)/columns;
 const textSize=compact?9.5:11,iconScale=compact ? .74 : .92;
 function tile(item,detail,left,top,span,output){
  rr(left,top,span,height-3,5,output?'#234035':'#1b2934');
  ico(item,left+13,top+height*.47,iconScale);
  const producer=PR[item],sourceWidth=producer&&span>=118?(compact?19:23):0;
  if(sourceWidth)withCanvasState(()=>{
   c.translate(left+span-sourceWidth/2-2,top+height*.47);
   c.scale(compact?.32:.41,compact?.32:.41);
   dm({t:producer,r:0,lv:1,st:0,base:[1,1]});
  });
  const labelX=left+28,labelW=span-32-sourceWidth;
  const name=ITEMS[item].n;
  const font='700 '+textSize+'px system-ui,sans-serif';
  const words=tuWrap(name,labelW,font);
  for(let i=0;i<words.length;i++){
   if(c.measureText(words[i]).width<=labelW||words.length>=3)continue;
   const word=words[i];
   let end=word.length-1;
   while(end>1&&c.measureText(word.slice(0,end)+'-').width>labelW)end--;
   words.splice(i,1,word.slice(0,end)+'-',word.slice(end));
   i++;
  }
  const line=compact||words.length===3?9.5:12,baseline=top+(height-10-words.length*line)/2+line;
  for(const [i,word] of words.entries())fitText(word,labelX,baseline+i*line,labelW,textSize,'#eef5f8');
  fitText(detail,labelX,top+height-6,labelW,compact?9:10,output?'#a9e8bb':'#b7cedd');
 }
 let top=y;
 if(model.r){
  tx('Eingang',x,top+10,10,'#a8d4ea','left',800);top+=14;
  model.r.forEach(([item,count],i)=>{
   const detail=count+'×'+(object?' · Puffer '+object.iv[i]+'/'+inputCap(object,i):'');
   tile(item,detail,x+i%columns*step,top+Math.floor(i/columns)*height,step-4,false);
  });
  top+=Math.ceil(model.r.length/columns)*height+4;
 }
 tx('Ausgang',x,top+10,10,'#a7e4b1','left',800);top+=14;
 tile(model.o,'1× · '+nf(salePrice(model.o))+' € / Stück',x,top,width,true);
 return recipeHeight(model,width,compact);
}
function infoCard(id,box){
 let {x,y,w,h}=box;
 const tip=TIPS[id],m=MD[id];
 if(!tip&&!m)return;
 if(m?.o!=null){
  const need=recipeHeight(m,w-16,true)+29;
  if(need+view.headerBottom<=y+h){
   y+=h-need;h=need;
   rr(x,y,w,h,8,'#0f141bf5');
   fitText(m.n+' · '+nf(cst(id))+' €',x+8,y+17,w-16,12,'#fff');
   recipePreview(id,x+8,y+24,w-16,{compact:true});
   hitbox(x,y,w,h,()=>{},null);
   return;
  }
 }
 rr(x,y,w,h,8,'#0f141bf2');
 const actionW=id==='del'?Math.min(148,w*.45):0,textW=w-20-actionW;
 fitText(tip?.[0]||m.n,x+10,y+17,textW,13,'#fff');
 if(id==='del'){
  const ask=delAsk>tm;
  const button={x:x+w-actionW-4,y:y+4,w:actionW,h:h-8};
  uiButton(button,()=>{
   if(!L.length){deny('Es gibt nichts zu verkaufen.');return}
   if(delAsk>tm)sellAll();else{delAsk=tm+5;sfx('warn')}
  },ask?'#b91c1c':'#7f1d1d','sellall');
  fitText(ask?'Verkauf bestätigen':'Alles verkaufen',button.x+button.w/2,y+h/2+4,button.w-8,11,'#fff','center');
 }
 const size=m?.size?m.size.join('×')+' Felder':'';
 const details=tip?.[1]||[fm(cst(id))+' €',size,m.o!=null?ITEMS[m.o].n+' · '+nf(salePrice(m.o))+' € / Stück · Rezept über ⓘ':m.d].filter(Boolean).join(' · ');
 const lines=tuWrap(details,textW,'600 10.5px system-ui,sans-serif').slice(0,2);
 lines.forEach((line,i)=>fitText(line,x+10,y+31+i*12,textW,10.5,'#cbd5e1','left',600));
 hitbox(x,y,w-actionW-4,h,()=>{},null);
}
const MENUS={
 device:{box:deviceInfoLayout,show:()=>!!deviceInfo,draw:deviceInfoPanel},
 mk:{box:[70,62,660,330],show:()=>mkO,draw:mkPanel},
 rs:{box:[40,64,720,330],show:()=>rsO,draw:rsPanel},
 pn:{box:teamBox,show:()=>pnO,draw:pnPanel},
 hl:{box:[40,64,720,330],show:()=>hlO,draw:hlPanel},
 bk:{box:[40,64,720,330],show:()=>bkO,draw:bkPanel},
 ac:{box:companyBox,show:()=>acO,draw:acPanel},
 achievements:{box:achievementBox,show:()=>achievementsOpen,draw:achievementPanel},
 planning:{box:[55,60,690,322],show:()=>planningOpen,draw:planningPanel},
 line:{box:[57,62,686,321],show:()=>lineOpen&&sel&&L.includes(sel),draw:()=>linePanel(sel)},
 growth:{box:[55,60,690,323],show:()=>growthOpen,draw:growthPanel},
 save:{box:[71,69,658,273],show:()=>saveOpen,draw:savePanel},
 stats:{box:[54,60,692,327],show:()=>statsOpen,draw:statsPanel}
};
const openMenu=()=>Object.entries(MENUS).find(([,menu])=>menu.show());
function scrollPanel(dx,dy){
 const surface=panelSurface;
 if(!surface)return;
 panelScroll.x=FactoryLayout.clamp(panelScroll.x+dx,surface.maxX);
 panelScroll.y=FactoryLayout.clamp(panelScroll.y+dy,surface.maxY);
}
function drawPanel(id,box,draw,close,side=false){
 const [x,y,w,h]=box;
 const surface=FactoryLayout.panel(view,{w,h},side),{bar,clip,scale,maxX,maxY}=surface;
 if(panelScroll.id!==id)panelScroll={id,x:0,y:0};
 panelSurface=surface;
 scrollPanel(0,0);
 withCanvasState(()=>{
  c.beginPath();c.rect(clip.x,clip.y,clip.w,clip.h);c.clip();
  const dx=clip.x-x*scale-panelScroll.x,dy=clip.y-y*scale-panelScroll.y;
  c.translate(dx,dy);c.scale(scale,scale);
  uiTransform={x:dx,y:dy,scale,clip};
  try{draw()}finally{uiTransform={x:0,y:0,scale:1,clip:null}}
 });
 if(!bar.h)return;
 uiButton(bar,()=>{},'#141b25');
 const controlWidth=bar.h;
 const closeBox={x:bar.x+bar.w-controlWidth-2,y:bar.y+2,w:controlWidth,h:bar.h-4};
 uiButton(closeBox,close,'#334155','panel_close');
 const baseline=bar.y+bar.h/2+5;
 tx('✕',closeBox.x+closeBox.w/2,baseline,15*view.labelScale,'#fff','center',800);
 const arrows=[];
 if(maxX>0)arrows.push(['←',-.65*clip.w,0],['→',.65*clip.w,0]);
 if(maxY>0)arrows.push(['↑',0,-.7*clip.h],['↓',0,.7*clip.h]);
 const buttonW=Math.min(controlWidth,(bar.w-controlWidth-5)/Math.max(1,arrows.length)-3);
 arrows.forEach(([label,dx,dy],i)=>{
  const left=bar.x+2+i*(buttonW+3),button={x:left,y:bar.y+2,w:buttonW,h:bar.h-4};
  uiButton(button,()=>scrollPanel(dx,dy),'#334155','panel_scroll_'+label);
  tx(label,left+buttonW/2,baseline,17*view.labelScale,'#fff','center',800);
 });
 const labelOffset=7+arrows.length*(buttonW+3);
 if(arrows.length&&bar.w-labelOffset>116){
  tx('Verschieben',bar.x+labelOffset,baseline,11,'#cbd5e1');
 }
}
const NAV=[['mk','📊','Verkauf'],['rs','🔬','Forschung'],['pn','👥','Team'],['hl','🏭','Hallen'],['bk','📖','Bunker'],['ac','🏢','Firma'],['planning','▤','Baupläne']];
const GROUPS=[['h','Holz','gar'],['m','Metall','met'],['v','Versorg.','vrs'],['e','Elektro','elk'],
 ['n','Energie','ene'],['f','Fahrzeug','fzg'],['t','Hightech','hit'],['b','Module','bnk'],['l','Logistik']];
const dockGroups=()=>campaignChapter()>=2?[...GROUPS,['o','Werft','orb']]:GROUPS;
const dockModels=()=>Object.keys(MD).filter(t=>buildType(t)===t&&MD[t].g===pg&&!MD[t].legacyOnly&&visibleModel(MD[t]));
const TOOLS=[['hand','✋','Hand'],['belt','','Band'],['rot','↻','Richtung'],['mov','✥','Bewegen'],['del','🗑','Löschen']];
const dockOffsets={group:0,shop:0};
let dockTracks={};
function drawHeader(){
 const status=view.status;
 rr(status.x,status.y,status.w,status.h,8,'#0b0f14dd');
 const statusValues=[
  ['💰 '+fm(G.m)+' €','#fde68a',.31],['📈 '+fm(rate())+' €/Min','#a7f3d0',.32],
  [campaignChapter()>=2?'▱ '+G.campaign.stage+' / '+chapters[campaignChapter()].phases.length:G.sp===PH.length?'ARCHE ✓':'⏳ '+(G.late?'∞':nf(dLeft())+' T'),G.late?'#fde68a':dLeft()<DAYS*.15?'#fca5a5':'#cbd5e1',.23],
  ['⭐ '+LV,'#7dd3fc',.14]
 ];
 let offset=status.x+5;
 for(const [text,color,share] of statusValues){
  const width=(status.w-10)*share;
  fitText(text,offset+width/2,status.y+status.h/2+4,width-4,12.5*view.labelScale,color,'center',800);
  offset+=width;
 }
 const barY=status.y+status.h-6,barWidth=status.w-10;
 rr(status.x+5,barY,barWidth,3,1.5,'#ffffff18');
 rr(status.x+5,barY,barWidth*Math.min(1,(G.xp-XB)/(XN-XB)),3,1.5,'#7dd3fc');
 NAV.forEach(([id,icon,label],i)=>{
  const box=view.navigation[i],active=MENUS[id].show()||id==='ac'&&achievementsOpen,mid=box.x+box.w/2;
  uiButton(box,()=>{
   if(id==='planning'){
    closeP2();planningOpen=!active;sfx('click');
   }else togP(id);
  },active?'#3a7bd5':'#0b0f14dd',id==='planning'?'blueprints':id);
  const caption=id==='rs'?fm(G.rp)+' FP':id==='bk'&&campaignChapter()>=2?'Kampagne':label;
  fitText((box.w>=62?icon+' ':'')+caption,mid,box.y+box.h/2+4,box.w-8,12*view.labelScale,'#fff','center');
  const attention=!active&&(id==='rs'&&RN.some(n=>rOK(n)&&G.rp>=researchCost(n))||
   id==='hl'&&HL.some(h=>hlv(h.id)<1&&hReq(h)&&G.m>=h.c[0]));
  if(attention){c.fillStyle='#facc15';c.beginPath();c.arc(box.x+box.w-5,box.y+6,3,0,PI*2);c.fill()}
 });
}
function chooseTool(id){
 if(id==='rot'){
  if(tool==='mov'&&mvO)rotObj(mvO);else{rot=(rot+1)%4;sfx('rotate')}
  return;
 }
 tool=id;buildMode='';buildPreview=null;routeSource=null;
 if(id!=='hand')sel=null;
 if(id!=='mov')mvO=null;
 delAsk=0;sfx('click');
}
function toolButton(box,id,icon,label,priceLabel=''){
 const {x,y,w,h}=box,m=MD[id],on=tool===id;
 const locked=m&&(m.a&&hlv(m.a)<1||m.unlock&&!m.unlock());
 uiButton(box,()=>chooseTool(id),on?'#3a7bd5':'#1f2630ee','tl_'+id);
 const mid=x+w/2,showPrice=!!priceLabel&&(!!m||h>=46);
 const scale=view.dockLabelScale;
 const nameY=y+h-(showPrice?14:5)*scale,artHeight=nameY-y-9*scale;
 const iconY=y+artHeight/2+1;
 if(on){
  c.strokeStyle='#9cc4ff';c.lineWidth=1.5;c.beginPath();c.roundRect(x+1,y+1,w-2,h-2,8);c.stroke();
 }
 if(isBelt(id)&&!m?.sortStation){
  withCanvasState(()=>{
   c.globalAlpha=locked?.55:1;
   const iconScale=Math.min(scale,artHeight/21);
   c.translate(mid,iconY);c.scale(iconScale,iconScale);
   conveyor(id,m?.k);
  });
 }else if(m){
  saveCanvas();
  c.globalAlpha=locked?.42:1;
  const iconScale=Math.min(.83*scale,artHeight*.022);
  c.translate(mid,iconY);c.scale(iconScale,iconScale);
  dm({t:id,r:0,lv:1,st:0,base:[1,1]});
  restoreCanvas();
 }else if(id==='rot'){
  saveCanvas();c.translate(mid,iconY);c.rotate(rot*PI/2);c.fillStyle='#ffd23f';
  const arrow=Math.min(1.38*scale,artHeight/18);
  c.scale(arrow,arrow);
  c.beginPath();c.moveTo(9,0);c.lineTo(-5,-6);c.lineTo(-5,6);c.fill();restoreCanvas();
 }else{
  const iconSize=Math.min(28*scale,artHeight);
  tx(icon,mid,iconY+iconSize*.36,iconSize,'#fff','center');
 }
 fitText(label,mid,nameY,w-8,13*scale,'#fff','center');
 if(showPrice)fitText(locked?'🔒':priceLabel,mid,y+h-4,w-8,10*scale,'#fde68a','center',600);
}
function scrollDock(id,delta){
 const track=dockTracks[id];
 if(track)dockOffsets[id]=FactoryLayout.clamp(dockOffsets[id]+delta,track.max);
}
function dockAt(x,y){
 return Object.keys(dockTracks).find(id=>dockTracks[id].max>0&&FactoryLayout.contains(dockTracks[id].box,x,y));
}
function dockBackdrop(box){
 rr(box.x-3,box.y-3,box.w+6,box.h+6,9,'#14181eea');
 hitbox(box.x-3,box.y-3,box.w+6,box.h+6,()=>{},null);
}
function drawDockTrack(id,area,count,buttonWidth,draw){
 if(!count)return;
 const track=FactoryLayout.dockTrack(area,count,buttonWidth),{box,clip,arrows,stride,max}=track;
 dockTracks[id]=track;
 scrollDock(id,0);
 const offset=dockOffsets[id];
 dockBackdrop(box);
 const previousTransform=uiTransform;
 try{
  withCanvasState(()=>{
   c.beginPath();c.rect(clip.x,clip.y,clip.w,clip.h);c.clip();
   uiTransform={...previousTransform,clip};
   for(let i=Math.floor(offset/stride);i<count&&i*stride-offset<clip.w;i++){
    draw({...clip,x:clip.x+i*stride-offset,w:buttonWidth},i);
   }
  });
 }finally{uiTransform=previousTransform}
 if(!arrows)return;
 const hop=Math.max(stride,Math.floor(clip.w/stride)*stride);
 for(const [direction,label,suffix,enabled] of [[-1,'‹','prev',offset>.5],[1,'›','next',offset<max-.5]]){
  const arrow={x:box.x+box.w-arrows+(direction===1?0:-arrows-4),y:box.y,w:arrows,h:box.h};
  uiButton(arrow,()=>{if(enabled)scrollDock(id,direction*hop)},enabled?'#334155':'#1f2630',enabled?id+'_'+suffix:undefined);
  tx(label,arrow.x+arrow.w/2,arrow.y+arrow.h/2+5,18*view.dockLabelScale,enabled?'#fff':'#64748b','center');
 }
}
function drawDock(){
 const groups=dockGroups();
 drawDockTrack('group',view.categories,groups.length,view.categoryWidth,(box,i)=>{
  const [id,label,hall]=groups[i],locked=hall&&hlv(hall)<1;
  uiButton(box,()=>{pg=id;dockOffsets.shop=0;sfx('click')},pg===id?'#3a7bd5':'#1f2630ee','pg_'+id);
  fitText((locked?'🔒 ':'')+label,box.x+box.w/2,box.y+box.h/2+5,box.w-8,13*view.dockLabelScale,locked?'#94a3b8':'#fff','center');
 });
 const first=view.shortcuts[0],last=view.shortcuts.at(-1);
 dockBackdrop({...first,w:last.x+last.w-first.x});
 TOOLS.forEach(([id,icon,label],i)=>toolButton(view.shortcuts[i],id,icon,label,id==='belt'?fm(cst(id))+' €':''));
 const models=dockModels();
 drawDockTrack('shop',view.machines,models.length,view.machineWidth,(box,i)=>{
  const id=models[i];
  toolButton(box,id,'',MD[id].s,fm(cst(id))+' €');
 });
}
function drawDeviceButton(){
 const selected=tool==='hand'&&sel&&L.includes(sel)?sel:null;
 const device=selected?.t||(MD[tool]||tool==='belt'?tool:null);
 if(!device||view.info.x+view.info.w>FW-view.inset)return;
 let box=view.info;
 if(selected&&panelSurface?.bar.h&&FactoryLayout.contains(panelSurface.clip,box.x+box.w/2,box.y+box.h/2)){
  const bar=panelSurface.bar,size=bar.h-4;
  box={x:bar.x+bar.w-2*bar.h,y:bar.y+2,w:size,h:size};
 }
 uiButton(box,()=>{closeP2();deviceInfo={id:device,object:selected};sfx('select')},'#1f2630ee','device_info');
 tx('ⓘ',box.x+box.w/2,box.y+box.h/2+5,17*view.labelScale,'#b7e5f7','center',800);
}
function drawWorldControls(){
 drawDock();
 const zooms=[['＋',()=>zoomAt(1.25,CX,CY),'zoom_in'],['−',()=>zoomAt(.8,CX,CY),'zoom_out'],
  ['⌂',()=>{centerSite(REGIONS.find(site=>site.id===currentSite));guideAction('home')},'camera_home']];
 zooms.forEach(([label,fn,id],i)=>{
  const box=view.camera[i];
  uiButton(box,fn,'#1f2630ee',id);
  tx(label,box.x+box.w/2,box.y+box.h/2+6,18*view.labelScale,'#fff','center',800);
 });
 const lastCamera=view.camera.at(-1),cameraRight=lastCamera.x+lastCamera.w+8;
 const besideCamera=lastCamera.y>=view.headerBottom&&FW-view.inset-cameraRight>=290;
 const aboveCamera=lastCamera.y>=view.headerBottom&&!besideCamera;
 const left=besideCamera?cameraRight:view.dock.x;
 const y=(aboveCamera?lastCamera.y:view.dock.y)-54;
 const box={x:left,y:Math.max(view.headerBottom,y),w:Math.min(528,FW-view.inset-left),h:48};
 if(asg){
  const manager=MG.find(q=>q.id===asg);
  rr(box.x,box.y,box.w,box.h,8,'#92400ef2');
  fitText(manager.n+' zuweisen · '+manager.tgt+' antippen',box.x+8,box.y+16,box.w-16,11,'#fff');
  const back={x:box.x+6,y:box.y+22,w:94,h:23};
  uiButton(back,()=>{asg=null;pnO=true},'#7c2d12','assign_cancel');
  tx('Abbrechen',back.x+47,back.y+15,10.5,'#fff','center');
 }else if(buildMode)planningControls(box);
 else{
  const hover=mp&&hitAt(...mp);
  const id=hover?.id?.startsWith('tl_')?hover.id.slice(3):tool;
  if(!G.bt.includes(id)&&(id!=='hand'||hover?.id==='tl_hand'))infoCard(id,box);
 }
}
function warningBox(){
 const x=view.inset,y=view.headerBottom+3,h=view.warningHeight,camera=view.camera[0];
 const last=view.camera.at(-1),left=y+h>camera.y&&y<camera.y+camera.h?last.x+last.w+8:x;
 return {x:left,y,w:Math.min(FW-view.inset-left,740*view.labelScale),h};
}
function focusLogistics(o){
 resetPlanning();asg=null;sel=null;hv=null;tool='mov';mvO=o;
 const [w,h]=dimensions(o);
 cam.x=(o.x+w/2)*TS;cam.y=(o.y+h/2)*TS;
 toast('Wähle einen freien Bauplatz am Standort.');
}
function ui(){
 drawHeader();
 const opened=openMenu();
 if(opened){
  const [id,menu]=opened;
  const box=typeof menu.box==='function'?menu.box():menu.box;
  const page=id==='achievements'?id+achievementGroup:id==='ac'?id+fTab:id==='pn'?id+teamTab:id;
  btn(0,view.headerBottom,FW,FH-view.headerBottom,()=>{},'#14181eea');
  drawPanel(page,box,()=>menu.draw(box),closeP2);
  return;
 }
 drawWorldControls();
 const pendingLogistics=L.find(o=>o.needsRelocation);
 if(msg||pendingLogistics){
  const box=warningBox(),{x,y,w,h}=box;
  if(pendingLogistics)uiButton(box,()=>focusLogistics(pendingLogistics),'#7f1d1dee','move_saved_logistics');
  else rr(x,y,w,h,7,bn?'#7f1d1dee':'#0b0f14df');
  const warning=pendingLogistics?'Logistik pausiert · Antippen zum Versetzen':msg;
  fitText(warning,x+8,y+h/2+4,w-16,12*view.labelScale,bn||pendingLogistics?'#fecaca':'#cbd5e1','left',600);
 }
 if(tool==='hand'&&sel&&L.includes(sel))drawPanel(sel,objectPanelBox(sel),()=>panel(sel),()=>{sel=null},true);
 else panelScroll={id:null,x:0,y:0};
 drawDeviceButton();
}

const hasYardLinks=o=>!!(o.yardOutputs||o.yardTunnel||o.yardFeeders);
const hasYardBlocks=o=>!!(o.yardBlocked||o.yardBlockedTunnel);
function objectPanelBox(o){
 const d=MD[o.t],isB=isBelt(o.t);
 let h=104,width=240;
 if(isB)h=o.t==='sorter'?190:o.t==='smart'||o.t==='sort'?175:o.t==='tunnel'?193:163;
 else if(prod(o)){width=Math.min(326,Math.max(266,Math.floor((FW-2*view.inset)/.94)));h=229+recipeHeight(d,width-28,false)}
 else if(typeShip(o.t))h=120;
 else if(isStorage(o.t))h=areaAt(o.x,o.y)?256:219;
 else if(d.inspect)h=120;
 else if(d.supply||d.distribution)h=116;
 else if(d.j)h=o.j===1?251:182;
 else if(isProjectRamp(o.t))h=112+28*(projectPhase(o.t)?.q.length||0);
 return [788-width,96,width,h+(hasYardLinks(o)?33:0)+(hasYardBlocks(o)?33:0)];
}
function logisticsResearchButton(o,X,W,y){
 const key=logisticsPath(o.t),ids=logisticsPaths[key].ids;
 btn(X+14,y,W-28,25,()=>{
  closeP2();rsO=true;researchTab='logistics';
  rsel=ids[Math.min(logisticsStage(key),ids.length-1)];
 },'#334155',0,'belt_research');
 tx(logisticsPaths[key].name+' · Forschung öffnen',X+W/2,y+17,10.5,'#fff','center',700);
 return y+29;
}
function panel(o){
 const [X,Y,W,H]=objectPanelBox(o),isB=isBelt(o.t),d=isB?null:MD[o.t],prod=!!d&&d.o!=null,jn=!!d?.j;
 btn(X,Y,W,H,()=>{},'#0f141bf0');c.strokeStyle='#ffffff22';c.lineWidth=1;c.beginPath();c.roundRect(X,Y,W,H,12);c.stroke();
 tx(isB?MD[o.t]?.n||'Förderband':d.n,X+14,Y+24,isB&&o.t!='belt'||prod&&d.n.length>17?12:16,'#fff','left',800);if(prod)tx('Level '+o.lv,X+W-14,Y+24,13,'#fde68a','right',700);
 let y=Y+46;
 const yardAction=(label,id,keep)=>{
  const top=y-9;
  btn(X+14,top,W-28,26,()=>{
   attachYardLinks(yardLinks.filter(keep));analyze();sv(0);
  },'#29504f',0,id);
  tx(label,X+W/2,top+17,11,'#c5f4ec','center',700);
  y+=33;
 };
 if(hasYardLinks(o))yardAction('Unterführung trennen','disconnect_yard',link=>link.blocked||link.from!==o&&link.to!==o);
 if(hasYardBlocks(o))yardAction('Anschlüsse freigeben','unlock_yard_ports',link=>!link.blocked||link.from!==o);
 const delB=(bx,bw,lab)=>{btn(X+bx,y,bw,28,()=>{delAt(o.x,o.y);sel=null;sv(0);analyze()},'#7f1d1d',0,'del');tx(lab,X+bx+bw/2,y+19,12,'#fff','center',700)};
 if(prod){y+=recipePreview(o.t,X+14,y-7,W-28,{object:o})+1;
  const t0=tme(o),p=plan(o),t1=tme(o,o.lv+p.n);
  tx('Zeit pro Stück',X+14,y,12,'#94a3b8');tx(t0.toFixed(1)+' s → '+t1.toFixed(1)+' s',X+W-14,y,12,'#fff','right',700);y+=18;
  tx('Stück pro Minute',X+14,y,12,'#94a3b8');tx((60/t0).toFixed(1)+' → '+(60/t1).toFixed(1),X+W-14,y,12,'#fff','right',700);y+=22;
  [['Arbeit',o.ew,'#4ade80'],['Wartet',o.es,'#facc15'],['Gestaut',o.eb,'#ef4444']].forEach(([l,v,col],i)=>{tx(l,X+14,y+i*17+9,11,'#94a3b8');rr(X+70,y+i*17,W-120,10,5,'#ffffff18');rr(X+70,y+i*17,Math.max(0,(W-120)*Math.min(1,v)),10,5,col);tx(Math.round(v*100)+'%',X+W-14,y+i*17+9,11,'#cbd5e1','right')});y+=58;
  const ok=G.m>=p.tot&&p.n>0;btn(X+14,y,W-28,34,()=>buy(o),ok?'#2f9e6b':'#475569',0,'upg');tx(`Upgrade ×${p.n} · ${fm(p.tot)} €`,X+W/2,y+22,13,'#fff','center',800);y+=40;
  btn(X+14,y,50,28,()=>{qi=(qi+1)%4;sfx('select')},'#334155');tx(QT[qi]?'×'+QT[qi]:'MAX',X+39,y+19,12,'#fff','center',700);
  btn(X+70,y,76,28,()=>{rotObj(o)},'#334155',0,'turn_machine');tx('↻ Drehen',X+108,y+19,12,'#fff','center',700);delB(152,W-166,'Abbauen')}
 else if(jn){
  tx(formatTransportRate(o.t)+(o.j===2?' je Spur':' insgesamt'),X+14,y,11,'#cbd5e1');y+=16;
  if(o.j==1){tx('Tippe eine Seite: Eingang → Ausgang → Aus',X+14,y,10.5,'#94a3b8','left',700);y+=12;const cols=['#334155','#2f9e6b','#c2570c'],nm=['Aus','Eingang','Ausgang'],pos=[[W-82,32],[W/2-34,58],[14,32],[W/2-34,6]];
   for(let dd=0;dd<4;dd++){const[px,py]=pos[dd];btn(X+px,y+py,68,26,()=>{o.jm[dd]=(o.jm[dd]+1)%3;if(o.it>=0&&o.jm[dd]==0)o.wt=0;sfx('select');recalc()},cols[o.jm[dd]]);tx(['→ rechts','↓ unten','← links','↑ oben'][dd],X+px+34,y+py+11,9,'#ffffffcc','center',600);tx(nm[o.jm[dd]],X+px+34,y+py+22,10.5,'#fff','center',800)}
   c.fillStyle='#ffffff22';c.beginPath();c.arc(X+W/2,y+58+13,7,0,PI*2);c.fill();y+=92}
  else{tx('Waren fahren geradeaus durch – zwei Bänder',X+14,y,10.5,'#94a3b8');tx('können sich überqueren, ohne zu mischen.',X+14,y+14,10.5,'#94a3b8');y+=34}
  y=logisticsResearchButton(o,X,W,y);
  btn(X+14,y,80,28,()=>{rotObj(o)},'#334155');tx('↻ Drehen',X+54,y+19,12,'#fff','center',700);delB(100,W-114,'Abbauen (50 %)')}
 else if(isProjectRamp(o.t)){const q=projectPhase(o.t);tx(q?q.n:'Projekt abgeschlossen',X+14,y,12,'#fde68a','left',800);y+=16;
  if(q)q.q.forEach(([it,n],i)=>{const dn=Math.min(n,projectStock(o.t)[i]||0);ico(it,X+24,y+8,.8);tx(ITEMS[it].n,X+40,y+8,10.5,'#fff','left',700);rr(X+14,y+14,W-28,6,3,'#ffffff18');rr(X+14,y+14,(W-28)*dn/n,6,3,dn>=n?'#4ade80':'#3a7bd5');tx(nf(dn)+'/'+nf(n),X+W-14,y+8,10.5,'#cbd5e1','right',700);y+=28});else y+=8;
  btn(X+14,y,100,28,()=>{closeP2();projectView=campaignChapter();bkO=true;sfx('click')},'#334155');tx('📖 Quests',X+64,y+19,12,'#fff','center',700);delB(120,W-134,'Abbauen (50 %)')}
 else if(isB){
  tx(formatTransportRate(o.t)+' · '+beltCount(o)+'/'+beltSize(o.t)+' Puffer',X+14,y,12,'#cbd5e1');y+=17;
  tx(perMinute(o,'moves').toFixed(1)+' Transfers/Min · Bauwert '+cst(o.t)+' €',X+14,y,11,'#94a3b8');y+=18;
  if(o.t=='smart'||o.t=='sort'||o.t=='sorter'){
   btn(X+14,y,W-28,25,()=>{
    if(o.t=='smart')o.smartMode=o.smartMode===2?0:2;
    else if(o.t=='sorter')o.sortRule=(o.sortRule+2)%(sortingGroups.length+1)-1;
    else{
     const options=[-1,...ITEMS.flatMap((_,i)=>G.ds[i]||L.some(q=>MD[q.t]?.o==i)?[i]:[])];
     o.sortRule=options[(options.indexOf(o.sortRule)+1)%options.length];
    }
    analyze();sv(0)
   },'#334155');
   const label=o.t=='sorter'?(o.sortRule<0?'Warenfamilie auswählen':sortingGroups[o.sortRule][1]+' nach rechts'):o.t=='smart'?(o.smartMode===2?'Auftragsware nach rechts':'Ausgänge nach Verfügbarkeit'):o.sortRule<0?'Alles geradeaus':ITEMS[o.sortRule].n+' → rechts';
   tx(label,X+W/2,y+17,10,'#fff','center',700);y+=31;
  }
  if(o.t==='tunnel'){
   const linked=tunnelPairs.has(o)||o.tunnelIn?.size;
   const status=tunnelPairs.has(o)?'Einlass':o.tunnelIn?.size?'Auslass':'Kein Partner';
   const peer=tunnelPairs.get(o)||o.tunnelIn?.values().next().value;
   const distance=peer?Math.abs(tunnelDistance(o,peer))+' Felder zum Partner':'2–'+tunnelRange()+' Felder Reichweite';
   tx(status+' · '+distance,X+14,y,10,'#a7cce0');y+=12;
   btn(X+14,y,W-28,25,()=>{
    if(linked){unpairTunnel(o);analyze();sv(0);sfx('select');return}
    beginTunnelLink(o);
   },'#29504f',0,linked?'unlink_tunnel':'link_tunnel');
   tx(linked?'Tunnel trennen':'Tunnel verbinden',X+W/2,y+17,10.5,'#e3f6f4','center',700);y+=30;
  }
  y=logisticsResearchButton(o,X,W,y);
  btn(X+14,y,80,28,()=>rotObj(o),'#334155');tx('↻ Drehen',X+54,y+19,12,'#fff','center',700);delB(100,W-114,'Abbauen (50 %)')
 }
 else if(d?.inspect){
  tx('Leitet Waren geradeaus weiter.',X+14,y,11,'#cbd5e1');y+=20;
  btn(X+14,y,80,28,()=>rotObj(o),'#334155');tx('↻ Drehen',X+54,y+19,12,'#fff','center',700);delB(100,W-114,'Abbauen (50 %)')
 }
 else if(typeShip(o.t)){
  tx(o.needsRelocation?'Pausiert · freien Bauplatz wählen':'Verkauft automatisch zum festen Stückpreis.',X+14,y,10.5,'#cbd5e1');y+=22;
  btn(X+14,y,84,28,()=>{closeP2();mkTab=mkPg=0;mkO=true;sfx('click')},'#334155',0,'ship_prices');
  tx('Stückpreise',X+56,y+19,11,'#fff','center',700);delB(106,W-120,'Abbauen (50 %)')
 }
 else if(d?.supply||d?.distribution){
  tx('Bestandsgebäude aus einem früheren Spielstand',X+14,y,12,'#94a3b8');y+=18;delB(14,W-28,'Abbauen (50 %)')
 }
 else{tx('Bestand '+o.q.length+' / '+cap(o)+' Stück · FIFO',X+14,y,12,'#94a3b8');y+=24;
  if(isStorage(o.t)){
   tx('Ausgabe bis '+formatTransportRate(o.t),X+14,y-6,10.5,'#a7cce0');y+=16;
   const rates=currentStats(o);
   tx('Eingang '+rates.arrivals.toFixed(1)+' · Ausgang '+rates.moves.toFixed(1)+' Stück/Min',X+14,y,10.5,'#cbd5e1');y+=17;
   const stock=new Map();
   for(const item of o.q)stock.set(item,(stock.get(item)||0)+1);
   const stockText=[...stock].slice(0,3).map(([item,n])=>n+'× '+ITEMS[item].n).join(' · ');
   tx(stockText.length>38?stockText.slice(0,36)+'…':stockText||'Kein Bestand',X+14,y,10,'#94a3b8');y+=19;
   const automation=RH('lag2');
   btn(X+14,y,W-28,25,()=>{if(!automation){deny('Erforsche Automatisches Lager.');return}o.lv=o.lv==1?2:1;sv(0)},'#334155');
   tx(o.lv==2?'Ausgabe: freie Lieferung':automation?'Ausgabe: FIFO':'Automatik: Forschung erforderlich',X+W/2,y+17,10.5,'#fff','center',700);y+=29;
   const hall=areaAt(o.x,o.y);
   if(hall&&hlv(hall.id)&&!o.needsRelocation){
    btn(X+14,y,W-28,29,()=>{o.teamDepot=!o.teamDepot;sfx('select');sv(0)},o.teamDepot?'#2c694f':'#334155',0,'team_depot');
    tx('Team-Lager '+(o.teamDepot?'aktiv':'aktivieren'),X+W/2,y+19,11,'#fff','center',700);y+=34;
   }
  }
  if(isStorage(o.t))y=logisticsResearchButton(o,X,W,y);
  const two=!isB&&!terminal(o.t);if(two){btn(X+14,y,80,28,()=>{rotObj(o)},'#334155');tx('↻ Drehen',X+54,y+19,12,'#fff','center',700)}
  delB(two?100:14,two?W-114:W-28,'Abbauen (50 %)')}}
function resetPlanning(){
 buildSelection=new Set();planningOpen=false;buildMode='';routeSource=buildPreview=activePlan=null;
}
const planLimit=()=>3+legacyIndustry('storage')+(RH('bau')?3:0);
function readPlans(raw,legacy){
 const plans=Object.values(raw||{}).slice(0,20).map(value=>Object.values(value||{}).slice(0,100)
  .filter(e=>e&&Number.isInteger(e[0])&&Number.isInteger(e[1])&&e[0]>=0&&e[0]<FactoryYard.width+2*FactoryYard.sideDepth&&e[1]>=0&&e[1]<FactoryYard.height+2*FactoryYard.oldDepth&&knownType(e[2]))
  .map(e=>[e[0],e[1],buildType(e[2]),e[3]&3,e[4]===true,e[5]||null])).filter(plan=>plan.length);
 if(legacy)for(const plan of plans){
  const tiles=new Map(plan.map(([x,y,t,r])=>[x+','+y,{x,y,t,r}]));
  for(const row of plan){
   const [x,y,t,r]=row;
   if(t!=='tunnel')continue;
   const target=physicalTunnelExit({x,y,t,r},(a,b)=>tiles.get(a+','+b));
   row[5]={...row[5],legacyTunnelPass:!target,...(target?{tunnel:[target.x-x,target.y-y]}:{})};
  }
 }
 return plans;
}
function makePlan(objects){
 const all=[...objects];
 if(!all.length)return [];
 const x=Math.min(...all.map(o=>o.x)),y=Math.min(...all.map(o=>o.y));
 const selected=new Set(all);
 return all.map(o=>{
  const target=tunnelExit(o);
  const settings={ports:o.j==1?o.jm.slice():null,sort:o.sortRule,smart:o.smartMode,threshold:o.threshold};
  if(o.legacyTunnelPass)settings.legacyTunnelPass=true;
  if(selected.has(target))settings.tunnel=[target.x-o.x,target.y-o.y];
  return [o.x-x,o.y-y,buildType(o.t),o.r,o.base.some(n=>n>1),settings];
 });
}
function previewPlan(plan,x,y){
 const compacted=new Map();
 const rows=plan.map(([dx,dy,type,r,large,settings])=>{
  const t=buildType(type);
  const j=MD[t]?.j,row={x:x+dx,y:y+dy,t,r,base:large?defaultSize(t):[1,1],settings,j,
   jm:j===1?(settings?.ports?Object.values(settings.ports):jpre(t,r)):null};
  if(large&&MD[t]?.previousSize)compacted.set(row,MD[t].previousSize);
  return row;
 });
 return checkBuild(rows.concat(compactPortBridges(rows,compacted,(a,b,c,d)=>siteAt(a,b)===siteAt(c,d))));
}
function checkBuild(rows,moving=false){
 const ignore=moving?new Set(rows.map(row=>row.o)):new Set(),reserved=new Set();
 const cost=moving?0:rows.reduce((total,row)=>total+(row.existing?0:cst(row.t)),0);
 let error='';
 for(const row of rows){
  if(row.existing){
   if(cell(row.x,row.y)!==row.existing||row.r!==row.existing.r)error='Die vorhandene Bandroute wurde geändert.';
   else error ||= placement(row.existing,row.x,row.y,row.r,new Set([row.existing]));
   continue;
  }
  const o=row.o||row;
  if(!moving&&MD[o.t]?.legacyOnly){error ||= 'Der Bauplan enthält ein Gebäude aus einer früheren Version.';continue}
  if(moving&&row.r!==o.r)error ||= 'Die Ausrichtung wurde geändert. Prüfe das Zielfeld erneut.';
  error ||= placement(o,row.x,row.y,row.r,ignore);
  for(const [x,y] of footprint(o,row.x,row.y,row.r)){
   const key=y*GW+x;
   if(reserved.has(key))error ||= 'Bauplan enthält überlappende Felder.';
   reserved.add(key);
  }
 }
 if(!moving&&!error){
  const tunnels=new Map(rows.filter(row=>row.t==='tunnel'&&!row.existing).map(row=>[row.x+','+row.y,row]));
  for(const row of tunnels.values()){
   const offset=row.settings?.tunnel;
   if(!offset)continue;
   if(!Number.isInteger(offset[0])||!Number.isInteger(offset[1])){error='Ungültige Tunnelposition im Bauplan.';break}
   const target=tunnels.get((row.x+offset[0])+','+(row.y+offset[1]));
   if(!alignedTunnel(row,target)||tunnelDistance(row,target)<2||siteAt(row.x,row.y)!==siteAt(target.x,target.y)){
    error='Ein Tunnelpaar im Bauplan braucht zwei gleich ausgerichtete Enden am selben Standort.';break;
   }
   if(tunnelDistance(row,target)>tunnelRange()){error='Die Tunnelreichweite reicht für diesen Bauplan noch nicht.';break}
  }
 }
 if(!error&&cost>G.m)error='Nicht genug Geld.';
 return {rows,moving,cost,error};
}
function commitBuild(preview){
 if(!preview?.rows.length)return false;
 const result=checkBuild(preview.rows,preview.moving);
 if(result.error){constructionError(result.error);return false}
 if(result.moving){
  if(preview.disconnected!==undefined&&lostConnections(result.rows)>preview.disconnected){
   deny('Anschlüsse haben sich geändert. Prüfe das Zielfeld erneut.');return false;
  }
  relocate(result.rows);
 }
 else{
  G.m-=result.cost;
  for(const {x,y,t,r,base,settings,existing} of result.rows){
   if(existing)continue;
   const o=addBuild(x,y,t,r,base);
   if(o.j==1&&settings?.ports){
    const ports=Object.values(settings.ports).map(n=>Math.max(0,Math.min(2,n|0)));
    if(ports.length==4)o.jm=ports;
   }
   if(t=='sorter'?!!sortingGroups[settings?.sort]:!!ITEMS[settings?.sort])o.sortRule=settings.sort;
   if(settings?.smart>=0&&settings.smart<=2)o.smartMode=settings.smart;
   if([90,105,120].includes(settings?.threshold))o.threshold=settings.threshold;
   if(t==='tunnel'&&settings?.legacyTunnelPass===true)o.legacyTunnelPass=true;
  }
  for(const {x,y,t,settings,existing} of result.rows){
   if(t!=='tunnel'||existing||!settings?.tunnel)continue;
   const [dx,dy]=settings.tunnel;
   rememberTunnel(cell(x,y),cell(x+dx,y+dy));
  }
  analyze();sv(0);sfx('place');
 }
 resetPlanning();return true;
}
function planRoute(from,to){
 if(!from||!to||!L.includes(from)||!L.includes(to)||from===to||terminal(from.t))return null;
 if(from.needsRelocation||to.needsRelocation||from.yardOutputs?.[from.r]||tunnelExit(from))return null;
 const site=siteAt(from.x,from.y);
 if(site!==siteAt(to.x,to.y))return null;
 return FactoryGrid.planRoute(from,to,{
  width:GW,cell,canUse:(x,y)=>siteAt(x,y)===site&&!bchk(x,y,'belt',false,!!cell(x,y)),
  canLeave:(belt,direction)=>!belt.yardOutputs?.[direction]&&(!belt.yardBlocked?.[direction]||belt.yardBlocked[direction]!==physicalNeighbor(belt,direction)),
  canEnter:(target,direction)=>!target.yardInputs?.[direction]&&(target.j==1?target.jm[direction]==1:!isBelt(target.t)||target.r!=direction),
  validate:checkBuild
 });
}
function startBuildMode(mode){
 tool='hand';sel=null;planningOpen=false;buildMode=mode;buildPreview=null;routeSource=null;sfx('select');
}
function beginTunnelLink(o){
 startBuildMode('tunnel');routeSource=o;
}
function buildTap(x,y){
 const o=cell(x,y);
 if(buildMode==='tunnel'){
  if(!routeSource)return;
  const error=pairTunnels(routeSource,o);
  if(error){deny(error);return}
  const entry=tunnelPairs.has(o)?o:routeSource;
  resetPlanning();sel=entry;analyze();sv(0);sfx('place');toast('Tunnelpaar verbunden');
 }else if(buildMode=='group'){
  if(o){if(buildSelection.has(o))buildSelection.delete(o);else if(buildSelection.size<100)buildSelection.add(o);sfx('select')}
 }else if(buildMode=='copy'){
  if(o){activePlan=makePlan([o]);buildMode='place';buildPreview=null}
 }else if(buildMode=='move'){
  const group=[...buildSelection].filter(entry=>L.includes(entry));
  if(!group.length)return;
  const dx=x-Math.min(...group.map(q=>q.x)),dy=y-Math.min(...group.map(q=>q.y));
  buildPreview=checkBuild(group.map(o=>({o,x:o.x+dx,y:o.y+dy,r:o.r})),true);
  if(!buildPreview.error)buildPreview.disconnected=lostConnections(buildPreview.rows);
 }else if(buildMode=='place'&&activePlan)buildPreview=previewPlan(activePlan,x,y);
 else if(buildMode=='route'&&o){
  if(!routeSource){
   if(terminal(o.t)){deny('Wähle ein Gebäude mit Ausgang.');return}
   routeSource=o;sfx('select');return;
  }
  buildPreview=planRoute(routeSource,o);
  if(!buildPreview)deny('Keine freie Förderbandroute am selben Standort gefunden.');
 }
}
const displayPlanningError=error=>error.startsWith('LOCK:')?hallOf(error.slice(5)).n+' ist gesperrt.':error;
function planningControls(box){
 const preview=buildPreview,{x,y,w,h}=box;
 let label={group:'Gebäude antippen · '+buildSelection.size+' ausgewählt',copy:'Gebäude zum Kopieren antippen',move:'Neue Position für die Gruppe antippen',place:'Bauplatz antippen, um den Bauplan zu prüfen',route:routeSource?'Ziel antippen':'Ausgangsgebäude antippen',
  tunnel:'Zweites gleich ausgerichtetes Tunnelende antippen · 2–'+tunnelRange()+' Felder'}[buildMode];
 if(preview)label=preview.error?displayPlanningError(preview.error):preview.moving?(preview.disconnected?preview.disconnected+' externe Anschlüsse beim Verschieben prüfen':'Gruppe kann verschoben werden'):'Baukosten '+fm(preview.cost)+' € · '+preview.rows.length+' Felder';
 rr(x,y,w,h,8,'#0f141bf2');fitText(label,x+8,y+16,w-16,11,'#fff');
 if(preview&&!preview.error){
  const box={x:x+6,y:y+22,w:84,h:23};
  uiButton(box,()=>commitBuild(preview),'#2f6d54','confirm_build');
  tx(preview.moving?'Verschieben':'Bauen',box.x+42,box.y+16,10.5,'#fff','center',800);
 }
 const back={x:x+w-81,y:y+22,w:75,h:23};
 const pairing=buildMode==='tunnel';
 uiButton(back,()=>{sel=pairing?routeSource:null;buildMode='';buildPreview=null;routeSource=null;planningOpen=!pairing},'#334155',pairing?'cancel_tunnel':'open_plan');
 tx(pairing?'Abbrechen':'Planung',back.x+37.5,back.y+16,10.5,'#fff','center',800);
}
function planningPanel(){
 const [X,Y,W,H]=MENUS.planning.box;
 pnlBox(X,Y,W,H,'Fabrikplanung',()=>{planningOpen=false});
 const action=(x,y,w,label,fn,enabled=true)=>{
  btn(x,y,w,31,enabled?fn:()=>{},enabled?'#334155':'#1f2937');
  tx(label,x+w/2,y+20,11,enabled?'#fff':'#94a3b8','center',700);
 };
 const count=buildSelection.size;
 action(X+16,Y+48,152,'Auswahl · '+count,()=>startBuildMode('group'));
 action(X+181,Y+48,152,'Einzelnes Gebäude kopieren',()=>startBuildMode('copy'));
 action(X+346,Y+48,152,'Gruppe verschieben',()=>startBuildMode('move'),count>0);
 action(X+511,Y+48,161,'Förderbandroute planen',()=>startBuildMode('route'));
 action(X+16,Y+88,152,'Bauplan speichern',()=>{
  G.plans.push(makePlan(buildSelection));sv(0);buildSelection.clear();sfx('select')
 },count>0&&G.plans.length<planLimit());
 action(X+181,Y+88,152,'Auswahl aufheben',()=>buildSelection.clear(),count>0);
 tx('Baupläne '+G.plans.length+' / '+planLimit(),X+346,Y+108,12,'#cbd5e1');
 const perPage=4,page=Math.min(planPage,Math.max(0,Math.ceil(G.plans.length/perPage)-1));
 G.plans.slice(page*perPage,(page+1)*perPage).forEach((plan,i)=>{
  const index=page*perPage+i,y=Y+135+i*36;
  tx((index+1)+'. '+(MD[plan[0][2]]?.n||'Förderband')+' · '+plan.length+' Objekte',X+18,y+20,12,'#cbd5e1');
  action(X+405,y,119,'Platzieren',()=>{activePlan=plan;startBuildMode('place')});
  action(X+540,y,132,'Plan entfernen',()=>{G.plans.splice(index,1);sv(0)});
 });
 if(G.plans.length>perPage){
  action(X+16,Y+284,80,'◀',()=>{planPage=page-1},page>0);
  action(X+102,Y+284,80,'▶',()=>{planPage=page+1},(page+1)*perPage<G.plans.length);
 }
}
let planPage=0,lineOpen=false,growthOpen=false,growthTab=0,growthPage=0,milestoneMode=false;
const LINE_LEVELS=[1000,10000,100000];
const lineKey=(hall,item)=>hall+'-'+item;
function readProductTracks(raw){
 const tracks={};
 for(const value of Object.values(raw||{})){
  if(!hallOf(value?.hall)||!Number.isInteger(value.item)||!ITEMS[value.item])continue;
  const nonnegative=value=>Number.isFinite(value)?Math.max(0,value):0;
  tracks[lineKey(value.hall,value.item)]={
   hall:value.hall,item:value.item,units:nonnegative(value.units),speed:nonnegative(value.speed),
   level:Math.min(100,nonnegative(value.level)),awards:Math.max(0,Math.min(7,value.awards|0))
  };
 }
 return tracks;
}
function recordProduct(o,hall,item){
 const key=lineKey(hall,item);
 const track=G.productTracks[key]||={hall,item,units:0,speed:0,level:0,awards:0};
 track.units++;track.level=Math.max(track.level,o.lv);
 if((G.tk-o.stats.since)*TICK>=20&&track.units%8===0)track.speed=Math.max(track.speed,perMinute(o,'output'));
 if(!track.awards||track.awards<7)checkProductTrack(track);
}
function checkProductTrack(track){
 const target=(60/MD[PR[track.item]].w)*1.5;
 const completed=(track.units>=1000?1:0)|(track.speed>=target?2:0)|(track.level>=20?4:0);
 const newAwards=completed&~track.awards;
 if(!newAwards)return;
 track.awards|=newAwards;
 for(const [bit,fp] of [[1,2],[2,1],[4,1]])if(newAwards&bit)G.rp+=fp;
 if(!fs)toast('Produktionsrekord: '+ITEMS[track.item].n+' · '+hallOf(track.hall).n);
}
const completedMilestones=hall=>G.milestones[hall]||0;
const researchCost=n=>n.c;
function companyValue(){
 return Math.max(0,G.m)+L.reduce((n,o)=>n+(o.t=='belt'?2:MD[o.t].c)*.5,0)+HL.reduce((total,h)=>total+h.c.slice(0,hlv(h.id)).reduce((n,cost)=>n+cost*.5,0),0);
}
function progressChecks(){
 for(const hall of HL){
  let level=completedMilestones(hall.id);
  while(level<LINE_LEVELS.length&&(G.lineCounts[hall.id]||0)>=LINE_LEVELS[level]){
   G.milestones[hall.id]=++level;G.rp+=2*level;
   if(!fs)toast(hall.n+': '+nf(LINE_LEVELS[level-1])+' Stück produziert');
  }
 }
}
function centerSite(site){
 const [x,y]=yardLayout.point(...site.center);
 cam={x:x*TS,y:y*TS,z:site.hall?.92:1.3};
}
function switchSite(site){
 if(!site||site.hall&&!hlv(site.hall))return false;
 currentSite=site.id;resetPlanning();sel=null;mvO=null;buildMode='';tool='hand';hv=null;
 centerSite(site);
 if(site.hall){pg=hallOf(site.hall).tab;dockOffsets.shop=0}
 return true;
}
function growthPanel(){
 const [X,Y,W,H]=MENUS.growth.box;
 pnlBox(X,Y,W,H,'Standorte & Rekorde',()=>{growthOpen=false});
 const action=(x,y,w,label,fn,enabled=true)=>{
  btn(x,y,w,25,enabled?fn:()=>{},enabled?'#334155':'#1f2937');
  tx(label,x+w/2,y+17,10.5,enabled?'#fff':'#94a3b8','center',700);
 };
 ['Standorte','Meilensteine'].forEach((label,i)=>{
  btn(X+159+i*101,Y+8,95,25,()=>{growthTab=i;growthPage=0},growthTab==i?'#3a7bd5':'#334155');
  tx(label,X+206+i*101,Y+25,10.5,'#fff','center',800);
 });
 if(growthTab==0){
  for(const [i,site] of REGIONS.filter(siteAvailable).entries()){
   const y=Y+46+i*67,open=!site.hall||hlv(site.hall),objects=L.filter(o=>siteAt(o.x,o.y)===site);
   const produced=objects.reduce((n,o)=>n+perMinute(o,'output'),0);
   const sales=objects.reduce((n,o)=>n+perMinute(o,'value'),0);
   rr(X+14,y,W-28,63,8,'#ffffff0d');
   tx(site.name,X+27,y+19,14,'#fff','left',800);
   tx(open?objects.length+' Gebäude · '+produced.toFixed(1)+' Stück/Min · '+sales.toFixed(1)+' €/Min Erlös':site.need,X+27,y+40,11,'#cbd5e1');
   const label=open?(site.id==currentSite?'Aktiver Standort':'Besuchen'):'Kaufen · '+fm(site.cost)+' €';
   action(X+W-192,y+22,164,label,()=>{
    if(!open){buyHall(hallOf(site.hall));if(!hlv(site.hall))return}
    switchSite(site);growthOpen=false;sv(0);
   },open?site.id!=currentSite:site.open()&&G.m>=site.cost);
  }
  return;
 }
 const option=milestoneMode?'Hallenrekorde':'Produktrekorde';
 action(X+W-174,Y+36,152,option,()=>{milestoneMode=!milestoneMode;growthPage=0});
 if(milestoneMode){
  const tracks=Object.values(G.productTracks).sort((a,b)=>b.units-a.units);
  const pages=Math.max(1,Math.ceil(tracks.length/5)),page=growthPage%pages;
  if(!tracks.length)tx('Herstellen eines Produkts startet seinen Rekord am Standort.',X+22,Y+100,12,'#cbd5e1');
  tracks.slice(page*5,page*5+5).forEach((track,i)=>{
   const y=Y+81+i*41,target=(60/MD[PR[track.item]].w)*1.5;
   tx(ITEMS[track.item].n+' · '+hallOf(track.hall).n,X+22,y,12,'#fff','left',800);
   tx('Menge '+nf(track.units)+'/1.000 · Tempo '+track.speed.toFixed(1)+'/'+target.toFixed(1)+'/Min · Maschinenlevel '+track.level+'/20',X+22,y+17,10.5,'#cbd5e1');
  });
  if(pages>1)action(X+W-145,Y+282,124,'Seite '+(page+1)+' / '+pages+' ›',()=>{growthPage++});
  return;
 }
 const list=HL.filter(h=>hlv(h.id)||G.lineCounts[h.id]);
 const pages=Math.max(1,Math.ceil(list.length/5)),page=growthPage%pages;
 list.slice(page*5,page*5+5).forEach((hall,i)=>{
  const y=Y+81+i*40,level=completedMilestones(hall.id),next=LINE_LEVELS[level],count=G.lineCounts[hall.id]||0;
  tx(hall.n,X+22,y,13,'#fff','left',800);
  tx(nf(count)+' Stück',X+W-22,y,11,'#86efac','right',700);
  tx(next?'Nächster Meilenstein bei '+nf(next)+' Stück':'Alle Mengenmeilensteine erreicht',X+22,y+17,11,'#94a3b8');
 });
 if(pages>1)action(X+W-145,Y+282,124,'Seite '+(page+1)+' / '+pages+' ›',()=>{growthPage++});
}
function compatiblePort(from,target,direction){
 if(!target||target===from||target.needsRelocation||MD[target.t]?.supply||MD[target.t]?.distribution)return false;
 const entry=(direction+2)%4;
 if(isBelt(target.t))return target.r!==entry;
 if(target.j==1)return target.jm[entry]==1;
 if(prod(target)&&prod(from))return uses(target,MD[from.t].o);
 return true;
}
function outgoing(o,lookup=cell,keepLink=()=>true,exit=tunnelExit(o)){
 const outputs=[0,1,2,3].filter(d=>fdn(o,(d+2)%4));
 const targets=new Set();
 if(o.t!=='tunnel'||o.legacyTunnelPass&&!exit||o.tunnelIn?.size){
  for(const d of outputs){
   const q=yardNeighbor(o,d,lookup(...port(o,d)),keepLink);
   if(compatiblePort(o,q,d)&&(q.t!=='tunnel'||tunnelSurfaceInput(q)))targets.add(q);
  }
 }
 if(exit)targets.add(exit);
 return targets;
}
function lineGraph(){
 const graph=new Map(L.map(o=>[o,new Set()]));
 for(const o of L)for(const peer of outgoing(o)){
  graph.get(o).add(peer);graph.get(peer).add(o);
 }
 return graph;
}
function component(start,graph){
 const found=new Set([start]),pending=[start];
 while(pending.length){
  for(const q of graph.get(pending.pop())||[])if(!found.has(q)){found.add(q);pending.push(q)}
 }
 return [...found];
}
function connectedLine(start){return component(start,lineGraph())}
function allProductionLines(){
 const graph=lineGraph(),seen=new Set(),lines=[];
 for(const o of L){
  if(seen.has(o)||!prod(o))continue;
  const line=component(o,graph);
  for(const q of line)seen.add(q);
  lines.push(line);
 }
 return lines;
}
function lineMetrics(line,wages=companyRates().wages,totalMachines=L.filter(prod).length){
 const machines=line.filter(prod),belts=line.filter(o=>isBelt(o.t));
 const result={output:0,moves:0,materials:0,profit:0,sold:0,capacity:0,load:0,storage:0};
 for(const o of line){
  const stats=currentStats(o);
  result.output+=stats.output;result.moves+=stats.moves;
  result.materials+=stats.materials;result.profit+=stats.value-stats.cost;
  result.sold+=stats.sold;
  if(isStorage(o.t))result.storage+=o.q.length;
 }
 result.profit-=wages*machines.length/Math.max(1,totalMachines);
 result.capacity=machines.reduce((sum,o)=>sum+60/tme(o),0);
 result.load=machines.length?machines.reduce((sum,o)=>sum+o.ew,0)/machines.length:0;
 const transport=line.filter(o=>logisticsPath(o.t));
 result.transport=transport.length?Math.min(...transport.map(beltCapacity)):0;
 result.machines=machines;result.belts=belts;
 return result;
}
function lostConnections(positions){
 const replacements=new Map(),futureAt=new Map(),moved=new Set(positions.map(row=>row.o));
 for(const {o,x,y,r} of positions){
  const placed={...o,x,y,r,needsRelocation:false};
  replacements.set(o,placed);
  for(const [a,b] of footprint(placed))futureAt.set(b*GW+a,placed);
 }
 const lookup=(x,y)=>{
  if(x<0||y<0||x>=GW||y>=GH)return null;
  const old=cell(x,y);
  return futureAt.get(y*GW+x)||(moved.has(old)?null:old);
 };
 let count=0;
 for(const o of L){
  const to=tunnelExit(o);
  const futureExit=to&&keepsTunnel(o,to,replacements)?replacements.get(to)||to:null;
  const next=outgoing(replacements.get(o)||o,lookup,target=>!moved.has(o)&&!moved.has(target),futureExit);
  for(const target of outgoing(o)){
   if(!moved.has(o)&&!moved.has(target))continue;
   if(!next.has(replacements.get(target)||target))count++;
  }
 }
 return count;
}
const perMinute=(o,key)=>currentStats(o)[key];
function linePanel(o){
 const [X,Y,W,H]=MENUS.line.box,line=connectedLine(o);
 pnlBox(X,Y,W,H,'Produktionslinie · '+(MD[o.t]?.n||'Förderband'),()=>{lineOpen=false});
 const data=lineMetrics(line),m=data.machines;
 const metrics=[
  ['Maschinen / Bänder',m.length+' / '+data.belts.length],
  ['Bearbeitungsschritte/Min',data.output.toFixed(1)+' / '+data.capacity.toFixed(1)+' theoretisch'],
  ['Bandtransfers/Min',data.moves.toFixed(1)+(data.transport?' · langsamstes Band '+data.transport.toFixed(0):'')],
  ['Auslastung',m.length?Math.round(data.load*100)+' %':'–'],
  ['Materialverbrauch/Min',data.materials.toFixed(1)+' Stück'],
  ['Betriebsergebnis/Min',data.profit.toFixed(1)+' € inkl. anteiliger Löhne'],
  ['Lagerbestand',data.storage+' Stück'],
  ['Stück verkauft/Min',data.sold.toFixed(1)]
 ];
 metrics.forEach(([label,value],i)=>{
  const x=X+18+(i%2)*332,y=Y+51+Math.floor(i/2)*45;
  tx(label,x,y,11,'#94a3b8');tx(value,x,y+18,14,'#e2e8f0','left',800);
 });
 const counts=new Map();
 for(const q of m)counts.set(MD[q.t].n,(counts.get(MD[q.t].n)||0)+1);
 tuWrap([...counts].map(([name,n])=>n+'× '+name).join(' · ')||'Keine Produktion in dieser Linie',W-36,'600 11px system-ui').slice(0,2).forEach((text,i)=>tx(text,X+18,Y+234+i*15,11,'#cbd5e1'));
 const loss=lossPoint(line);
 const note=loss?'Größter Margenverlust: '+MD[loss.object.t].n+' · bis zu '+loss.margin.toFixed(1)+' €/Min. Abnahme prüfen.':line.includes(bn)?msg:'Kein aktueller Engpass in dieser Linie.';
 btn(X+W-202,Y+7,157,25,()=>{
  buildSelection=new Set(line.slice(0,100));closeP2();planningOpen=true;
 },'#334155',0,'selectline');
 tx('Linie für Bauplan auswählen',X+W-123,Y+24,10,'#fff','center',700);
 tuWrap(note,W-36,'600 11px system-ui').slice(0,2).forEach((text,i)=>tx(text,X+18,Y+276+i*15,11,loss||line.includes(bn)?'#fca5a5':'#86efac'));
}
function lossPoint(objects){
 let best=null;
 for(const o of objects){
  if(!prod(o))continue;
  const missed=perMinute(o,'blockedWork');
  if(missed<=.2)continue;
  const item=MD[o.t].o;
  const margin=missed*Math.max(0,salePrice(item)-rawCost(item)*RCm);
  if(!best||margin>best.margin)best={object:o,margin,missed};
 }
 return best;
}
function closeP2(){teamSpecialty=null;deviceInfo=null;mkO=rsO=pnO=hlO=bkO=acO=planningOpen=lineOpen=growthOpen=saveOpen=statsOpen=achievementsOpen=false}

/* ===== Tutorial & Hilfe: interaktive Einführung direkt in der Fabrik, Kurztour (Hilfe), einmalige Kontext-Tipps ===== */
let tuTour=0,tuTI=0,tuHn=null,tuHT=-99,tuG=null,tuA=0,tuKey='',tuC=0;
const tuNeed=()=>cst('frm')+cst('belt')+cst('shp')-Math.floor(cst('shp')/2)+14,hasT=t=>L.some(o=>o.t==t),prodM=o=>!!o&&!!MD[o.t]&&MD[o.t].o!=null,TUH=[['r','status']];
/* hl: Liste aus ['t',x,y,b,h] (Kacheln), ['u',id] (Knopf der Oberfläche), ['r',name] (Layoutbereich) */
const newGuide=(kind,anchor)=>({kind,anchor,actions:{},sales:G?.sl?.[1]||0});
function readGuide(value){
 if(!value||!['build','fleet'].includes(value.kind)||value.kind==='fleet'&&campaignChapter()<2)return null;
 const [x,y]=value.anchor||[],hall=hallOf(value.kind==='fleet'?'orb':'gar');
 const anchor=Number.isInteger(x)&&Number.isInteger(y)&&inR(hrect(hall),x,y)?[x,y]:value.kind==='fleet'?yardLayout.point(155,12):[7,6];
 const actions={};
 for(const id of ['pan','zoom','home'])if(value.actions?.[id])actions[id]=true;
 return {kind:value.kind,anchor,actions,sales:Math.max(0,Number(value.sales)||0)};
}
const lessonTile=(dx=0,dy=0)=>[G.guide.anchor[0]+dx,G.guide.anchor[1]+dy];
const lessonMark=(dx=0,dy=0)=>[['t',...lessonTile(dx,dy),1,1]];
const lessonObject=(dx=0,dy=0)=>cell(...lessonTile(dx,dy));
const guideAction=id=>{if(G?.guide&&G.tu>=0&&!G.tutorialPaused&&guideSteps()[G.tu]?.id===id)G.guide.actions[id]=true};
const menuLesson=(id,title,text,target,done)=>({id,ti:title,tx:text,hl:()=>[['u',target]],dn:done});
function buildLesson(id,label,type,offset,description,group,needsDirection=true){
 return {id,ti:label,tx:()=>{
  if(group&&pg!==group)return 'Öffne unten den Reiter '+(group==='h'?'Holz':group==='l'?'Logistik':'Werft')+'. '+description;
  if(tool!==type)return 'Wähle „'+(MD[type]?.s||'Band')+'“. '+description;
  if(needsDirection&&rot!==0)return 'Tippe „Richtung“, bis der Pfeil nach rechts zeigt.';
  return 'Tippe auf das markierte Feld. '+description;
 },hl:()=>{
  if(group&&pg!==group)return [['u','pg_'+group]];
  if(tool!==type)return [['u','tl_'+type]];
  return needsDirection&&rot!==0?[['u','tl_rot']]:lessonMark(offset);
 },dn:()=>lessonObject(offset)?.t===type&&(!needsDirection||lessonObject(offset).r===0)};
}
const buildGuide=[
 {id:'pan',ti:'Kamera bewegen',tx:'Ziehe auf einer freien Fläche, um die Karte zu verschieben. Ein Tipp auf ein Gebäude wählt es aus. Zwischen Standorten wechselst du über „Firma → Werkzeuge → Standorte und Rekorde“.',hl:()=>[],dn:()=>G.guide.actions.pan},
 {id:'zoom',ti:'Bauplatz vergrößern',tx:'Tippe auf + oder ziehe zwei Finger auseinander. Aus der Nähe siehst du die einzelnen Bauplätze.',hl:()=>[['u','zoom_in']],dn:()=>G.guide.actions.zoom},
 {id:'home',ti:'Zur Garage zurück',tx:'Tippe auf das Haussymbol, um zur Standardansicht zurückzukehren.',hl:()=>[['u','camera_home']],dn:()=>G.guide.actions.home},
 menuLesson('pick-wood','Holzlager auswählen','Wähle im Reiter Holz das Holzlager. Es kauft Rohholz, sobald die Linie Platz dafür hat.','tl_src',()=>tool==='src'),
 buildLesson('wood','Holzlager aufstellen','src',0,'Das ist der Anfang deiner Produktionslinie.','h',false),
 {id:'source-turn',ti:'Ausgang ausrichten',tx:'Wähle Hand, tippe das Holzlager an und drehe es, bis der Pfeil nach rechts zeigt.',hl:()=>tool!=='hand'?[['u','tl_hand']]:sel===lessonObject()?[['u','turn_machine']]:lessonMark(),dn:()=>lessonObject()?.t==='src'&&lessonObject().r===0},
 buildLesson('input-belt','Rohholz zuführen','belt',1,'Dieses Band führt zur Säge.'),
 buildLesson('saw','Säge anschließen','saw',2,'Die Säge macht aus Rohholz Holzteile.','h'),
 {id:'inspect-line',ti:'Materialfluss prüfen',tx:'Wähle Hand und tippe die Säge an. Du siehst das Rezept, die Mengen und den Stückpreis. Das Info-Symbol erklärt die Anschlüsse. „Wartet“ heißt, Material fehlt, „Gestaut“ heißt, der Ausgang ist voll.',hl:()=>tool!=='hand'?[['u','tl_hand']]:lessonMark(2),dn:()=>sel===lessonObject(2)},
 buildLesson('output-belt','Abtransport anschließen','belt',3,'Der Ausgang der Säge verbindet sich mit diesem Band.'),
 buildLesson('shipment','Versand anschließen','shp',4,'Der Versand verkauft ankommende Waren automatisch.','l',false),
 {id:'first-sale',ti:'Ersten Verkauf beobachten',tx:'Verfolge ein Holzteil bis zum Versand. Der erste Verkauf erhöht oben dein Guthaben.',hl:()=>lessonMark(4),dn:()=>G.sl[1]>G.guide.sales&&(lessonObject(4)?.stats.sold||0)>0},
 {id:'machine-upgrade',ti:'Säge verbessern',tx:'Tippe die Säge mit Hand an und kaufe ein Upgrade. Die Zeit pro Stück sinkt.',hl:()=>sel===lessonObject(2)?[['u','upg']]:tool==='hand'?lessonMark(2):[['u','tl_hand']],dn:()=>(lessonObject(2)?.lv||0)>1},
 buildLesson('spare','Bewegen üben','belt',5,'Setze ein einzelnes Übungsband neben den Versand.'),
 {id:'move-belt',ti:'Übungsband versetzen',tx:'Wähle „Bewegen“. Tippe erst das Übungsband und dann das freie Feld direkt darunter an.',hl:()=>tool!=='mov'?[['u','tl_mov']]:mvO?lessonMark(5,1):lessonMark(5),dn:()=>buildType(lessonObject(5,1)?.t)==='belt'&&!lessonObject(5)},
 {id:'remove-belt',ti:'Übungsband abbauen',tx:'Wähle „Löschen“ und tippe das versetzte Band an. Der Rest deiner Linie läuft weiter.',hl:()=>tool==='del'?lessonMark(5,1):[['u','tl_del']],dn:()=>!lessonObject(5,1)},
 menuLesson('selling','Verkauf öffnen','Öffne „Verkauf“. Dort stehen Stückpreise, verkaufte Mengen und die erzielten Erlöse.','mk',()=>mkO),
 menuLesson('orders','Aufträge ansehen','Wähle unter „Verkauf“ den Reiter „Aufträge“. Er zeigt Liefermengen und zusätzliche Prämien.','market_tab_2',()=>mkO&&mkTab===2),
 menuLesson('research','Forschung öffnen','Öffne „Forschung“. Grundlagen schalten Geräte frei. Unter „Vertiefung“ findest du mehrstufige Boni. Tippe eine Technologie an, um Kosten, Wirkung und Voraussetzungen zu sehen.','rs',()=>rsO),
 menuLesson('halls','Hallen ansehen','Öffne „Hallen“. Du siehst hier Ausbaupreise und Voraussetzungen für weitere Produktionslinien.','hl',()=>hlO),
 menuLesson('arche','Deinen Auftrag öffnen','Öffne „Bunker“. Liefere die angezeigten Waren an eine Bunker-Rampe aus dem Reiter Logistik. Nach sieben Abschnitten gelten die ARCHE-Boni dauerhaft, dann kannst du zur Werft wechseln.','bk',()=>bkO),
 menuLesson('plans','Baupläne öffnen','Öffne „Baupläne“. Dort kannst du eine Produktionsgruppe speichern und nochmals platzieren.','blueprints',()=>planningOpen),
 menuLesson('company','Firma und Spielstand','Öffne „Firma“, dann „Werkzeuge“ und „Spielstand“. Dort siehst du Sicherungsstatus und Offline-Bericht.','ac',()=>saveOpen),
 {id:'summary',ti:'Deine erste Fabrik läuft',tx:'Deine erste Linie läuft. Unter „Firma → Hilfe“ kannst du die Kurztour öffnen. Dort findest du auch Team-Lager, Unterführungen, Baupläne und den Wechsel zur Raumwerft.',hl:()=>[],nx:'Tutorial abschließen'}
];
const fleetGuide=[
 menuLesson('fleet-plan','Flottenbau ansehen','Öffne „Kampagne“. Horizont hat sieben Bauphasen. Rechts steht die Stückzahl für die aktuelle Phase. ARCHE-Boni, Geld und deine Fabriken bleiben erhalten.','bk',()=>bkO&&projectView===2),
 buildLesson('fleet-machine','Verbundwerk aufstellen','laminate',0,'Es verarbeitet zwei Stahlbleche und ein Gehäuse zu einer Verbundplatte. Du kannst Stahlwerk und Spritzguss in der Werft bauen und die Zutaten von dort zuführen.','o',false),
 buildLesson('fleet-ramp','Werftrampe aufstellen','orbitRamp',1,'Richte den Pfeil des Verbundwerks zur Rampe aus. Sie zählt nur Waren der aktuellen Phase. Nutze dafür bei Bedarf ein Zwischenlager oder ein eigenes Zuführband.','l',false),
 {id:'fleet-check',ti:'Die Lieferung prüfen',tx:'Wähle Hand und tippe die Werftrampe an. Hier stehen Stückzahlen und gelieferte Teile. Volle Warenziele nehmen keine weiteren Stücke an.',hl:()=>tool==='hand'?lessonMark(1):[['u','tl_hand']],dn:()=>sel===lessonObject(1)},
 {id:'fleet-summary',ti:'Werft eingerichtet',tx:'Verbinde beide Zutaten mit dem Verbundwerk. Für Schilde und Hüllen brauchst du auch Verbundplatten als Zwischenprodukt. Plane getrennte Bänder für Lieferung und Weiterverarbeitung. Unter „Firma → Hilfe“ findest du die Kurztour.',hl:()=>[],nx:'Zur Werft'}
];
const guideSteps=()=>G.guide?.kind==='build'?buildGuide:G.guide?.kind==='fleet'?fleetGuide:TU;
function startTutorial(){
 const kind=campaignChapter()===1?'build':'fleet';
 const hall=hallOf(kind==='build'?'gar':'orb'),rect=hrect(hall),width=kind==='build'?6:2;
 for(let y=rect[1]+1;y<rect[3];y++)for(let x=rect[0]+1;x<=rect[2]-width+1;x++){
  if(Array.from({length:width},(_,i)=>cell(x+i,y)).some(Boolean)||cell(x+width-1,y+1))continue;
  G.guide=newGuide(kind,[x,y]);G.tu=0;G.tutorialPaused=false;
  closeP2();sel=null;tool='hand';rot=3;tuTour=0;tuHn=null;
  switchSite(REGIONS.find(site=>site.id===(kind==='build'?'main':'orbit')));
  if(kind==='build')pg='h';
  focusWorld([x,y-1,x+width-1,y+1]);sv(1);return;
 }
 closeP2();tuTour=1;tuTI=0;tuA=0;
 toast('Die Halle ist voll. Die interaktive Hilfe bleibt verfügbar.');
}
function toggleTutorial(){
 G.tutorialPaused=!G.tutorialPaused;
 if(!G.tutorialPaused)tuA=1;
 sv(0);
}
const TU=[
 {ti:'Deine erste Produktionslinie',tx:'Das Holzlager kauft Rohholz. Das erste Band liefert es zur Säge. Die Säge macht Holzteile, die das zweite Band zum Versand bringt.',hl:()=>[['t',tuG.sx-2,tuG.sy,5,1]],dn:()=>G.sold>=1,sf:'achieve'},
 {ti:'Dein erster Verkauf',tx:'Der Versand verkauft ankommende Ware automatisch. Dein Guthaben steht oben. Unter „Verkauf“ findest du den Stückpreis jedes Produkts.',hl:()=>TUH,nx:'Weiter'},
 {ti:'Die Linie erweitern',tx:()=>`Die Formmaschine macht aus Holzteilen Rohlinge – doppelt so viel wert. Spare ${fm(tuNeed())} € (du hast ${fm(G.m)} €), die Garage verdient derweil weiter.`,hl:()=>TUH,dn:()=>G.m>=tuNeed()||hasT('frm'),bar:()=>Math.min(1,G.m/tuNeed())},
 {ti:'Platz schaffen',tx:()=>tool!='hand'?'Wähle unten das Hand-Werkzeug.':'Tippe den Versand an und wähle „Abbauen“. Du erhältst die Hälfte der Baukosten zurück. Du setzt den Versand später am Ende der Linie wieder auf.',hl:()=>tool!='hand'?[['u','tl_hand']]:sel&&sel.t=='shp'?[['u','del']]:[['t',tuG.fx,tuG.fy,1,1]],dn:()=>{const q=cell(tuG.fx,tuG.fy);return!q||q.t!='shp'}},
 {ti:'Maschine wählen',tx:()=>pg!='h'?'Öffne unten den Reiter „Holz“.':'Wähle unten die Maschine „Form“. Sie macht aus Holzteilen Rohlinge.',hl:()=>pg!='h'?[['u','pg_h']]:[['u','tl_frm']],dn:()=>tool=='frm'||hasT('frm')},
 {ti:'Maschine platzieren',tx:()=>cell(tuG.fx,tuG.fy)?.t=='frm'?'Die Formmaschine steht schon. Wähle die Hand, tippe die Maschine an und drehe ihren Ausgang nach rechts.':tool!='frm'?'Wähle unten erneut die Maschine „Form“.':rot?'Der Pfeil zeigt, wohin die Maschine liefert. Drücke „Richtung“, bis er nach rechts → zeigt.':'Tippe auf das leuchtende Feld. Der Pfeil zeigt, wohin die Maschine liefert – hier nach rechts →.',hl:()=>cell(tuG.fx,tuG.fy)?.t=='frm'?(tool!='hand'?[['u','tl_hand']]:[['t',tuG.fx,tuG.fy,1,1]]):tool!='frm'?[['u','tl_frm']]:rot?[['u','tl_rot']]:[['t',tuG.fx,tuG.fy,1,1]],dn:()=>{const q=cell(tuG.fx,tuG.fy);return q?.t=='frm'&&q.r==0}},
 {ti:'Förderband wählen',tx:'Jetzt verbindest du Formmaschine und Versand mit einem Förderband. Wähle unten „Band“.',hl:()=>[['u','tl_belt']],dn:()=>tool=='belt'||!!(cell(tuG.bx,tuG.fy)&&buildType(cell(tuG.bx,tuG.fy).t)==='belt')},
 {ti:'Band verlegen',tx:()=>tool!='belt'?'Wähle unten wieder „Band“.':rot?'Drücke „Richtung“, bis der Pfeil nach rechts → zeigt.':'Tippe auf das leuchtende Feld rechts der Formmaschine. Tipp: Ziehen verlegt gleich mehrere Stücke.',hl:()=>tool!='belt'?[['u','tl_belt']]:rot?[['u','tl_rot']]:[['t',tuG.bx,tuG.fy,1,1]],dn:()=>{const q=cell(tuG.bx,tuG.fy);return buildType(q?.t)==='belt'&&q.r===0}},
 {ti:'Versand wählen',tx:()=>pg!='l'?'Der Versand liegt im Reiter „Logistik“.':'Wähle unten „Versand“.',hl:()=>pg!='l'?[['u','pg_l']]:[['u','tl_shp']],dn:()=>tool=='shp'||!!(cell(tuG.vx,tuG.fy)&&cell(tuG.vx,tuG.fy).t=='shp')},
 {ti:'Versand aufbauen',tx:()=>tool!='shp'?'Wähle unten „Versand“ im Reiter „Logistik“.':'Setze den Versand ans Ende des Bandes – dort werden die Rohlinge verkauft.',hl:()=>tool!='shp'?[['u','tl_shp']]:[['t',tuG.vx,tuG.fy,1,1]],dn:()=>{const q=cell(tuG.vx,tuG.fy);return!!q&&q.t=='shp'}},
 {ti:'Alles verbunden! ✅',tx:()=>G.sl[2]>=1?'Dein erster Rohling ist verkauft. Grundwert: '+ITEMS[2].v+' € statt '+ITEMS[1].v+' € für ein Holzteil.':'Schau zu: Holz wird zu Teilen und dann zu Rohlingen. Der Versand verkauft sie automatisch. Ein ⏸ zeigt, dass eine Maschine wartet.',hl:()=>[['t',tuG.sx,tuG.sy,5,1]],nx:()=>G.sl[2]>=1?'Weiter':tuA>=20?'Weiter ohne Verkauf':'',sf:'achieve'},
 {ti:'Dein erstes Upgrade',tx:()=>{if(!prodM(sel))return(tool!='hand'?'Wähle das Hand-Werkzeug ✋ und tippe':'Tippe')+' eine Maschine an, zum Beispiel die Säge.';const p=plan(sel);return G.m<p.tot?`Das Upgrade kostet ${fm(p.tot)} € – dir fehlen noch ${fm(p.tot-G.m)} €. Spare kurz.`:'Das Fenster zeigt vorher → nachher, z. B. „Zeit pro Stück 4,0 s → 3,4 s“. Kaufe ein Upgrade!'},hl:()=>tool!='hand'?[['u','tl_hand']]:prodM(sel)?[['u','upg']]:[['t',tuG.sx,tuG.sy,1,1]],dn:()=>L.some(o=>o.lv>1&&prodM(o)),sf:'unlock'},
 {ti:'Aufträge',tx:'Kunden bestellen feste Stückzahlen – ganz ohne Zeitdruck. Öffne oben „Verkauf“ und dann „Aufträge“.',hl:()=>[['u','mk']],dn:()=>mkO&&mkTab===2},
 {ti:'Aufträge erfüllen',tx:'Der Versand verkauft jede Lieferung. Bei erfüllter Stückzahl erhältst du eine Prämie, bei ausgewählten Aufträgen auch Forschungspunkte. Offene Aufträge lassen sich unter „Verkauf → Aufträge“ tauschen.',hl:()=>[['u','mk']],nx:'Weiter'},
 {ti:'Dein Auftrag · ARCHE',tx:'Unter „Bunker“ findest du Liefermengen und Frist. Verbinde deine Linien mit einer Bunker-Rampe. Nach sieben Phasen bekommst du dauerhafte Boni und kannst zu Horizont wechseln.',hl:()=>[['u','bk']],nx:'Weiter'},
 {id:'own-line',ti:'Rohstoffversorgung selbst aufbauen',tx:()=>practiceText(0),hl:()=>practiceHighlight(0),nx:'Weiter ohne Bau',dn:()=>practiceDone(0)},
 {ti:'Eine zweite Linie verbinden',tx:()=>practiceText(1),hl:()=>practiceHighlight(1),nx:'Weiter ohne Bau',dn:()=>practiceDone(1)},
 {ti:'Zwischenlager und Rückstau',tx:'Ein Zwischenlager puffert Ware, wenn die nächste Maschine oder der Versand langsamer ist. Ein volles Lager blockiert das Band davor. Fehlt einer Maschine ein Material, wartet sie auch bei freiem Ausgang.',hl:()=>[['u','pg_l']],nx:'Weiter'},
 {ti:'Deine Fabrik ausbauen',tx:'Neue Produktlinien schaltest du unter „Hallen“ frei. Eine Engpassmeldung markiert die betroffene Stelle. Unter „Firma → Hilfe“ findest du alle weiteren Themen.',hl:()=>[['u','ac']],nx:'Los geht’s · +2 FP'}];
function practicePlace(){
 const found=L.find(o=>o.t=='src'&&o.y!=tuG.sy&&o.r==0&&o.x+2<=17);
 if(found)return [found.x,found.y];
 for(const y of [8,7,9,10,5,4])for(let x=7;x<16;x++){
  if([0,1,2].every(dx=>!cell(x+dx,y)))return [x,y];
 }
 return null;
}
function practiceDone(stage){
 const spot=practicePlace();
 if(!spot)return false;
 const [x,y]=spot,source=cell(x,y),band=cell(x+1,y),ship=cell(x+2,y);
 return source?.t=='src'&&source.r==0&&(stage==0||buildType(band?.t)==='belt'&&band.r===0&&ship?.t=='shp');
}
function practiceText(stage){
 if(!practicePlace())return 'In einer freien Hallenzeile kannst du Holzlager, Band und Versand hintereinander bauen. Das Lager kauft selbstständig Rohholz.';
 if(stage==0)return 'Wähle im Holz-Reiter „Holz“ und setze das Lager auf das markierte Feld. Stelle die Lieferrichtung auf rechts. Das Lager kostet 40 € und kauft Rohholz aus deinem Guthaben.';
 return 'Verlege rechts vom neuen Holzlager ein Förderband mit Richtung →. Setze danach rechts daneben einen Versand aus dem Reiter Logistik. So kannst du Rohholz direkt verkaufen oder es an weitere Maschinen liefern.';
}
function practiceHighlight(stage){
 const spot=practicePlace();
 if(!spot)return [['u','pg_h']];
 const [x,y]=spot;
 if(!stage)return pg!='h'?[['u','pg_h']]:tool!='src'?[['u','tl_src']]:rot?[['u','tl_rot']]:[['t',x,y,1,1]];
 if(buildType(cell(x+1,y)?.t)!=='belt')return tool!='belt'?[['u','tl_belt']]:rot?[['u','tl_rot']]:[['t',x+1,y,1,1]];
 return pg!='l'?[['u','pg_l']]:tool!='shp'?[['u','tl_shp']]:[['t',x+2,y,1,1]];
}
const TOUR=[
 {ti:'Karte und Standorte',tx:'Ziehe zum Verschieben. Zoome mit +/−, Mausrad oder zwei Fingern. Das Haussymbol zentriert den Standort. Andere Standorte findest du unter Firma → Werkzeuge.',hl:()=>[['u','camera_home']]},
 {ti:'Bauen und Ausrichten',tx:'Wähle unten eine Gerätegruppe und dann die Maschine. Die Pfeile neben den Reihen zeigen weitere Einträge. „Richtung“ dreht den Ausgang. Tippe zum Bauen auf ein freies Feld.',hl:()=>[['r','dock']]},
 {ti:'Förderbänder',tx:'Wähle „Band“ und ziehe über mehrere Felder, um eine Strecke zu legen. Die Pfeile zeigen die Warenrichtung. Forschung → Logistik hat für jeden Bandtyp eine eigene Reihe.',hl:()=>[['u','tl_belt']]},
 {ti:'Verteilen und Unterführen',tx:'Splitter teilen, Fusionatoren bündeln. Eine Kreuzung hält zwei Ströme getrennt. Sortierbänder lenken gewählte Ware um. Tunnelenden werden im Gerätefenster fest verbunden. Tunnel-Forschung erhöht Tempo und Reichweite. Verteiler und Lager haben eigene Forschungspfade.',hl:()=>[['u','pg_l']]},
 {ti:'Maschinen und Rezepte',tx:'Mit Hand öffnest du eine Maschine. Das Fenster zeigt Rezept, Puffer, Stückpreis und das nächste Upgrade. Das Info-Symbol erklärt jedes Gerät mit Bildern und Anschlüssen.',hl:()=>[['u','tl_hand']]},
 {ti:'Bewegen und Abbauen',tx:'Tippe mit „Bewegen“ ein Gebäude und dann sein Zielfeld an. Der Inhalt bleibt im Gerät. Prüfe danach die Anschlüsse. Beim Abbauen erhältst du die Hälfte der Baukosten zurück.',hl:()=>[['u','tl_mov']]},
 {ti:'Engpässe und Lager',tx:'„Wartet“ heißt: Material fehlt. „Gestaut“ heißt: Ware kommt am Ausgang nicht weg. Zwischenlager puffern Ware. Prüfe Richtungen und Zutaten, bevor du mehr Tempo kaufst.',hl:()=>[['r','warning']]},
 {ti:'Verkauf und Aufträge',tx:'Ein Versand verkauft jede Ware automatisch. Verkauf → Aufträge zeigt Liefermengen und Prämien. Die ersten zwei und danach jeder zehnte Auftrag bringen Forschungspunkte.',hl:()=>[['u','mk']]},
 {ti:'Forschung',tx:'Entdeckungen, ausgewählte Aufträge und Meilensteine bringen FP. Wähle eine Technologie, prüfe ihre Voraussetzungen und bezahle mit FP. Unter „Vertiefung“ gibt es mehrstufige Boni.',hl:()=>[['u','rs']]},
 {ti:'Hallen und Höfe',tx:'Unter „Hallen“ siehst du Preise und Bauvoraussetzungen. Produktionsmaschinen brauchen die passende Halle. Auf den verbundenen Betonflächen ist Platz für Bänder, Lager und Rampen.',hl:()=>[['u','hl']]},
 {ti:'Teams und Manager',tx:'Weise unter „Team“ Personal einer Halle zu und markiere ein Zwischenlager als Team-Lager. Lass Wege zwischen Geräten frei. Manager können Geräte oder verbundene Linien unterstützen.',hl:()=>[['u','pn']]},
 {ti:'Baupläne und Linien',tx:'Markiere eine Gruppe unter „Baupläne“, speichere sie und setze Kopien auf freie Felder. Die Routensuche verbindet passende Anschlüsse. Die Firmenstatistik zeigt Engpässe in Produktionslinien.',hl:()=>[['u','blueprints']]},
 {ti:'Kapitel 1 · ARCHE',tx:'Die Bunker-Rampe nimmt nur Waren der aktuellen Phase an. Nach sieben Phasen erhältst du +10 % Bandtempo, +20 Lagerplätze und −5 % Baukosten. Danach steht die Raumwerft offen.',hl:()=>[['u','bk']]},
 {ti:'Kapitel 2 · Horizont',tx:'Baue in der Raumwerft und liefere an die Werftrampe. Horizont hat sieben Phasen. Manche Teile werden zugleich als Zutaten gebraucht. Teile die Waren deshalb auf mehrere Linien auf.',hl:()=>[['u','bk']]},
 {ti:'Offline und Spielstand',tx:'Offline zählen bis zu 20 Minuten mit 15 % Tempo. Nachtschicht erhöht das auf 30 Minuten mit 20 %. Unter Firma → Werkzeuge → Spielstand prüfst du den Speicherstatus.',hl:()=>[['u','ac']]},
 {ti:'Hilfe wieder öffnen',tx:'Unter Firma → Hilfe findest du alle Themen und das Tutorial deines Kapitels. Die Story-Szenen kannst du im Story-Archiv erneut ansehen.',hl:()=>[['u','ac']],nx:'Fertig'}
];
TOUR.forEach(t=>{t.nx=t.nx||'Weiter'});
const HNT=[
 {id:'res',ti:'Forschung verfügbar',tx:'Öffne „Forschung“ und wähle eine Technologie aus. Prüfe ihre Voraussetzungen und Kosten. Unter „Vertiefung“ kannst du mehrere Stufen derselben Verbesserung kaufen.',hl:()=>[['u','rs']],cd:()=>G.rp>=4},
 {id:'mk',ti:'Verkaufsübersicht',tx:'Unter „Verkauf“ findest du Grundwert, aktuellen Stückpreis und bisherige Erlöse. Im Reiter „Aufträge“ findest du Liefermengen für zusätzliche Prämien.',hl:()=>[['u','mk']],cd:()=>G.sold>=60},
 {id:'bn',ti:'Engpass erkannt',tx:'Die Meldung zeigt, wo die Linie stockt. Bei Materialmangel prüfe Eingänge und Zutaten. Bei Stau prüfe den Ausgang, das Band und das nächste Gerät.',hl:()=>bn?[['t',bn.x,bn.y,1,1]]:[],cd:()=>!!bn&&/^Engpass/.test(msg)},
 {id:'hal',ti:'Neue Halle möglich',tx:'Unter „Hallen“ findest du Preise und Voraussetzungen. Neue Hallen schalten Geräte frei. Verbinde die Hallen mit Bändern über den Hof.',hl:()=>[['u','hl']],cd:()=>HL.some(h=>hlv(h.id)<1&&hReq(h)&&G.m>=h.c[0])},
 {id:'shelf',ti:'Waren zwischenlagern',tx:'Setze ein Zwischenlager hinter eine Produktionsmaschine. Es sammelt Ware, wenn die nächste Maschine langsamer arbeitet.',hl:()=>pg==='l'?[['u','tl_sto']]:[['u','pg_l']],cd:()=>G.m>=cst('sto')&&!L.some(o=>isStorage(o.t)),dn:()=>L.some(o=>isStorage(o.t))},
 {id:'rmp',ti:'Bunker-Rampe bauen',tx:'Baue im Reiter Logistik eine Bunker-Rampe. Sie nimmt die Waren für die laufende ARCHE-Phase an.',hl:()=>pg==='l'?[['u','tl_prj']]:[['u','pg_l']],cd:()=>campaignChapter()===1&&G.sp<PH.length&&G.sold>=30&&!hasProjectRamp(),dn:hasProjectRamp},
 {id:'mg',ti:'Ein Hallenteam einsetzen',tx:'Setze im Team-Menü Personal in der gewünschten Halle ein. Markiere ein Zwischenlager als Team-Lager, damit der Materialdienst Waren holen kann.',hl:()=>[['u','pn']],cd:()=>!G.crew.gar?.p&&G.sold>=50&&G.m>=800,dn:()=>assignedCrew('p')>0&&L.some(o=>o.teamDepot&&!o.needsRelocation)}];
HNT.forEach(h=>{h.h=1});
const alteredStart={
 ti:'Deine Startlinie wurde umgebaut',
 tx:'Die markierten Plätze passen nicht mehr zu deiner Fabrik. Du kannst direkt mit dem Aufbau einer eigenen Rohstofflinie und den Lagerübungen weitermachen.',
 nx:'Eigene Linie üben'
};
const tuCur=()=>tuTour>0?TOUR[tuTI]:G.tu>=0&&G.tu<guideSteps().length?(G.guide?guideSteps()[G.tu]:tuG?TU[G.tu]:alteredStart):tuHn;
function tuGeo(){
 const saw=L.find(o=>o.t=='saw'&&o.r==0&&inG(o.x+4,o.y)&&buildType(cell(o.x+1,o.y)?.t)==='belt');
 if(!saw&&G.tu<11)return null;
 const x=saw?.x??9,y=saw?.y??6;
 if(G.tu<=3&&(!inG(x+4,y)||cell(x+3,y)||cell(x+4,y)))return null;
 if(G.tu==0&&!G.sold&&cell(x+2,y)?.t!='shp')return null;
 return {sx:x,sy:y,fx:x+2,fy:y,bx:x+3,vx:x+4};
}
function tuFin(){
 G.tu=-1;G.tutorialPaused=false;
 const reward=!G.tutorialAward&&G.guide?.kind!=='fleet';
 if(reward){G.tutorialAward=true;G.rp+=2;xp(40)}
 tuHT=tm;sfx('level');toast(reward?'Tutorial abgeschlossen · +2 Forschungspunkte':'Tutorial abgeschlossen');sv(1);
}
function tuAdv(){const it=tuCur();if(!it)return;tuA=0;
 if(tuTour){if(tuTI>=TOUR.length-1){tuTour=0;sfx('unlock')}else{tuTI++;sfx('select')}return}
 if(it===alteredStart){G.tu=TU.findIndex(step=>step.id=='own-line');tuG=tuGeo();sv(0);return}
 if(it.h){G.th.push(it.id);tuHn=null;tuHT=tm;sfx('click');sv(0);return}
 sfx(it.sf||'select');G.tu++;if(G.tu>=guideSteps().length)tuFin();else sv(0)}
function tuSkip(){G.tu=-1;G.tutorialPaused=false;tuA=0;tuHT=tm;sfx('click');toast('Tutorial übersprungen. Du kannst es unter Firma → Hilfe erneut starten.');sv(1)}
function tuUpd(dt){if(!ready||!G||ff||storyOnScreen()||G.tutorialPaused)return;tuA+=dt;
 const count=guideSteps().length;
 try{const key=tuTour?'T'+tuTI:G.tu>=0&&G.tu<count?'U'+G.tu:tuHn?'H'+tuHn.id:'';if(key!=tuKey){if(tuKey&&key)sfx('select');tuKey=key;tuA=0}
  if(tuTour)return;
  if(G.tu>=0&&G.tu<count){
   if(!G.guide)tuG=tuGeo();
   const step=tuCur();
   if(step.dn&&step.dn())tuAdv();
   return;
  }
  if(tuHn?.dn?.()){tuAdv();return}
  tuC+=dt;if(!tuHn&&tuC>.5){tuC=0;if(tm-tuHT>25){const h=HNT.find(x=>!G.th.includes(x.id)&&x.cd());if(h){tuHn=h;tuA=0}}}}
 catch(e){console.error('Tutorial:',e);G.tu=-1;tuTour=0}}
function tuWrap(t,w,f){c.font=f;const o=[];let l='';for(const wd of String(t).split(' ')){const q=l?l+' '+wd:wd;if(l&&c.measureText(q).width>w){o.push(l);l=wd}else l=q}if(l)o.push(l);return o}
function tuHi(h){let x,y,w,hh;
 if(h[0]=='t'){[x,y]=worldToView(h[1]*TS,h[2]*TS);w=h[3]*TS*cameraZoom();hh=h[4]*TS*cameraZoom()}
 else if(h[0]=='r'){
  const box=h[1]==='warning'?warningBox():view[h[1]];
  ({x,y,w,h:hh}=box);
 }
 else{
  const hits=[...HB].reverse();
  let box=hits.find(q=>q.id===h[1]);
  if(!box&&(h[1].startsWith('pg_')||h[1].startsWith('tl_'))){
   const group=h[1].startsWith('pg_'),key=group?'group':'shop',id=h[1].slice(3),track=dockTracks[key];
   const index=group?dockGroups().findIndex(entry=>entry[0]===id):dockModels().indexOf(id);
   if(track?.max&&index>=0)box=hits.find(q=>q.id===key+(index*track.stride<dockOffsets[key]?'_prev':'_next'));
  }
  if(!box)return;
  ({x,y,w,h:hh}=box);
 }
 const cx=x+w/2,cy=y+hh/2;
 if(h[0]==='t'&&(cx<0||cx>FW||cy<view.headerBottom||cy>view.dock.y)){const a=Math.atan2(cy-CY,cx-CX),px=Math.max(24,Math.min(FW-24,CX+Math.cos(a)*(FW/2-70))),py=Math.max(view.headerBottom+16,Math.min(view.dock.y-30,CY+Math.sin(a)*(FH/2-70)));
  saveCanvas();c.translate(px,py);c.rotate(a);c.fillStyle='#ffd23f';c.beginPath();c.moveTo(14,0);c.lineTo(-8,-10);c.lineTo(-8,10);c.fill();restoreCanvas();tx('⌂ Ansicht zurücksetzen',px,py+28,10.5,'#fde68a','center',700);return}
 const p=.5+.5*Math.sin(tm*5),bob=Math.sin(tm*6)*3;saveCanvas();
 if(h[0]=='t'){c.fillStyle='rgba(255,210,63,.10)';c.fillRect(x,y,w,hh)}
 c.shadowColor='#ffd23f';c.shadowBlur=10+8*p;c.strokeStyle=`rgba(255,210,63,${.65+.35*p})`;c.lineWidth=3;c.beginPath();c.roundRect(x-4-p*2,y-4-p*2,w+8+p*4,hh+8+p*4,10);c.stroke();c.shadowBlur=0;
 if(!(h[0]=='u'&&(h[1]=='upg'||h[1]=='del'))){c.fillStyle='#ffd23f';c.beginPath();if(cy<CY){const ay=y+hh+12+bob;c.moveTo(cx,ay);c.lineTo(cx-8,ay+12);c.lineTo(cx+8,ay+12)}else{const ay=y-12-bob;c.moveTo(cx,ay);c.lineTo(cx-8,ay-12);c.lineTo(cx+8,ay-12)}c.closePath();c.fill()}restoreCanvas()}
function tuDraw(){
 if(window.NOFIN||!ready||ff||!G||storyOnScreen())return;
 if(G.tutorialPaused){
  if(!openMenu()){
   const y=view.headerBottom+view.warningHeight+9,x=view.inset;
   btn(x,y,148,30,toggleTutorial,'#334e66',0,'tresume');tx('Tutorial fortsetzen',x+74,y+20,11.5,'#fff','center',700);
  }
  return;
 }
 const it=tuCur();if(!it)return;
 if(openMenu()){
  if(G.guide?.kind==='build'&&it.id==='orders')tuHi(['u','market_tab_2']);
  if(G.guide?.kind==='build'&&it.id==='company'&&acO)tuHi(['u',fTab===4?'save':'ft4']);
  return;
 }
 try{const tour=tuTour>0,iv=!tour&&!it.h,N=tour?TOUR.length:guideSteps().length,ix=tour?tuTI:G.tu;
  let hs=[];try{hs=it.hl?it.hl():[]}catch(e){}for(const h of hs)tuHi(h);
  const txt=typeof it.tx=='function'?it.tx():it.tx,W=Math.min(348,FW-2*view.inset),X=(FW-W)/2,P=12;
  const ln=tuWrap(txt,W-2*P,'600 12px system-ui,sans-serif');
  const bar=it.bar?it.bar():-1,H=P+20+ln.length*15+(bar>=0?18:0)+8+34;
  const Y=Math.max(view.headerBottom,Math.min(view.headerBottom+(msg?30:5),view.dock.y-H-8));
  const by=Y+H-36;
  saveCanvas();c.globalAlpha=Math.max(.15,1-Math.pow(1-Math.min(1,tuA*4),3));
  btn(X,Y,W,H,()=>{},'#0f141bf6');c.strokeStyle='#ffd23f88';c.lineWidth=1.5;c.beginPath();c.roundRect(X,Y,W,H,9);c.stroke();
  fitText(it.ti,X+P,Y+P+10,W-2*P-48,13.5,'#fff','left',800);tx(iv?(ix+1)+'/'+N:tour?'Tour '+(ix+1)+'/'+N:'💡 Tipp',X+W-P,Y+P+9,10,'#94a3b8','right',700);
  ln.forEach((l,i)=>fitText(l,X+P,Y+P+32+i*15,W-2*P,12,'#cbd5e1','left',600));
  if(bar>=0){const yb=Y+P+26+ln.length*15;rr(X+P,yb,W-2*P,8,4,'#ffffff18');rr(X+P,yb,Math.max(3,(W-2*P)*bar),8,4,'#4ade80')}
  if(iv){
   btn(X+P,by,90,24,tuSkip,'#334155',0,'tskip');tx('Überspringen',X+P+45,by+16,11,'#fff','center',700);
   btn(X+P+94,by,51,24,toggleTutorial,'#334155',0,'tpause');tx('Pause',X+P+119.5,by+16,11,'#fff','center',700);
   rr(X+10,Y+H-5,W-20,3,1.5,'#ffffff18');rr(X+10,Y+H-5,(W-20)*ix/N,3,1.5,'#ffd23f');
  }
  else if(tour){btn(X+P,by,92,24,()=>{tuTour=0;sfx('click')},'#334155',0,'tend');tx('✕ Beenden',X+P+46,by+16,11,'#fff','center',700)}
  const nx=it.h?'Verstanden':typeof it.nx=='function'?it.nx():it.nx;if(nx){const bw=Math.min(W-2*P-(iv?150:96),181,Math.max(108,nx.length*6.4+22));btn(X+W-P-bw,by,bw,24,tuAdv,'#2f9e6b',0,'tnext');fitText(nx,X+W-P-bw/2,by+16,bw-8,11.5,'#fff','center',800)}
  restoreCanvas()}catch(e){restoreCanvas();console.error('Tutorial:',e)}}
function heTab(X,Y,W,H){
 tx('Hilfe & Steuerung',X+26,Y+65,15,'#fff','left',800);
 const topicWidth=(W-62)/2;
 TOUR.forEach(({ti},i)=>{
  const x=X+22+(i%2)*(topicWidth+18),y=Y+76+Math.floor(i/2)*23;
  btn(x,y,topicWidth,20,()=>{
   closeP2();tuTour=1;tuTI=i;tuA=0;sfx('select');
  },'#273b4d',0,'help_topic_'+i);
  fitText(ti,x+8,y+14,topicWidth-16,10.5,'#e3edf5');
 });
 btn(X+26,Y+H-42,180,30,startTutorial,'#2f9e6b',0,'tutorial_start');
 tx('Kapitel-Tutorial starten',X+116,Y+H-22,11.5,'#fff','center',800);
 btn(X+216,Y+H-42,162,30,()=>{G.th=[];tuHn=null;tuHT=-99;sfx('click');toast('Tipps werden wieder angezeigt, sobald sie passen.');sv(0)},'#334155');
 tx('Tipps erneut zeigen',X+297,Y+H-22,11,'#fff','center',700);
 tx(G.tu>=0&&G.tu<guideSteps().length?'Tutorial · Schritt '+(G.tu+1)+' von '+guideSteps().length:'Kapitel '+campaignChapter(),X+W-26,Y+H-22,10.5,'#94a3b8','right',600);
}
/* ---- Demo-Fabrik für das Vorschaubild (thumbs() ruft mk()/update()/draw() beim Seitenstart auf; kein Speicher, keine Cloud) ---- */
function demo(){init(null);stQ=[];G.tu=-1;G.th=[];G.hl={gar:1,met:1};L=[];g=[];pg='m';G.rs=['met','wrk','spd1','lag'];G.rp=11;G.xp=1400;G.ac=['first','s100','o1','line','tool','r1','mg1','hall1','lv5'];G.sold=312;setLv();G.emp={...G.emp,p:3,q:2,l:1};G.crew={gar:{p:3,q:2,l:1}};G.mg=[{id:'prod',lv:6,sp:1,x:9,y:4},{id:'qual',lv:3,sp:0,x:12,y:6}];rfx();
 [[7,4,'src',0,3],[8,4,'belt',0],[9,4,'saw',0,4],[10,4,'belt',0],[11,4,'frm',0,3],[12,4,'belt',0],[13,4,'asm',0,3],[14,4,'belt',0],[15,4,'belt',0],[16,4,'belt',1],[16,5,'belt',1],[16,6,'belt',2],[15,6,'pnt',2,3],[14,6,'sto',2],[13,6,'pck',2,2],[12,6,'shp',2],
  [7,8,'src',0,2],[8,8,'belt',0],[9,8,'saw',0,2],[10,8,'belt',0],[11,8,'wrk',3,2],[11,7,'belt',3],[11,6,'shp',3],
  [12,8,'belt',2],[13,8,'belt',2],[14,8,'belt',2],[15,8,'mil',2,2],[16,8,'sme',2,2],[17,8,'ers',2,2]].forEach(([x,y,t,r,l])=>put(x,y,t,r,l,[1,1]));
 G.m=4820;G.sold=312;G.pk=64;G.ord=2;Object.assign(G.sl,[0,60,40,30,22,64,0,18,30,48]);G.tk=2900;refreshIndustrialArea();recalc();fs=1;for(let i=0;i<640;i++)tick();fs=0;sb.fill(2.3);rw=60;ready=1;cam={x:12*TS,y:6.2*TS,z:1};analyze();lr=Date.now()}
const {loadParcel,clearBelt,beltDirections,moveBelt,jtick,sortingGroups}=createFactoryTransport({
 MD,PR,currentCycle:()=>transportCycle,neighbor,tunnelExit,tunnelSurfaceOutput,
 give,record,prod,uses,prjNeed,isProjectRamp,orderFor
});
const audio=createFactoryAudio({
 time:()=>tm,
 frame:()=>({cam:{...cam,z:cameraZoom()},CX,CY,FW,FH,L,TS}),
 mood:()=>{const count=HL.filter(h=>hlv(h.id)>0).length;return legacyIndustry('foundings')>0||count>=5?3:count>=3?2:count>=2?1:0},
 cloudRef:()=>!preview&&stillSignedIn()&&cloud.base!=null?OL.db.ref('users/'+cloud.uid+'/factoryAudio'):null,
 writeLocal:preview?()=>false:writeLocal,toast,isBelt,tme
});
const {audG,audLoad,audSave,audApply,audStop,audioStart,sfx,MS,SFX,MOODS,audMach,musFill,musTick,mshot,aud,audCloudSync}=audio;
const AS=audio.settings;

/* The page shares a canvas with other games. Keep frame and layer state local. */
const failedCanvasLayers=new Set();
function drawLayer(name,draw){
 try{
  withCanvasState(draw);
  failedCanvasLayers.delete(name);
  return true;
 }catch(error){
  if(!failedCanvasLayers.has(name)){
   failedCanvasLayers.add(name);
   console.error('Factory Empire · '+name,error);
  }
  return false;
 }finally{uiTransform={x:0,y:0,scale:1,clip:null}}
}
function drawOfflineProgress(){
 if(!ff)return;
 const w=Math.min(420,FW-16),x=(FW-w)/2,y=CY-36;
 const progress=Math.max(0,Math.min(1,1-(ff.left??ff.n)/ff.n));
 rr(x,y,w,70,12,'#0f141bf4');
 tx('Offline-Fortschritt wird berechnet …',CX,y+26,14,'#fff','center',700);
 rr(x+25,y+40,w-50,10,5,'#ffffff22');rr(x+25,y+40,(w-50)*progress,10,5,'#4ade80');
 tx(Math.round(100*progress)+' %',CX,y+62,11,'#94a3b8','center',600);
}
function drawFrame(){
 refreshLayout();HB=[];panelSurface=null;dockTracks={};
 withCanvasState(()=>{
  if(cv.width>0&&cv.height>0)c.setTransform(cv.width/FW,0,0,cv.height/FH,0,0);
  c.fillStyle='#14181e';c.fillRect(0,0,FW,FH);
  if(!ready){tx(preview?'Testmodus':'Lade deine Fabrik …',FW/2,FH/2,22,'#cbd5e1','center',700);return}

  if(ff){drawLayer('Offline-Fortschritt',drawOfflineProgress);return}
  if(storyOnScreen()){drawLayer('Filmszene',drawStory);return}
  if(!acO&&!achievementsOpen)drawLayer('Kartenansicht',world);
  if(!drawLayer('Bedienelemente',ui)){
   HB=[];closeP2();
  }
  drawLayer('Tutorial',tuDraw);
  if(pfl>0){c.fillStyle='rgba(255,255,255,'+(pfl*.85)+')';c.fillRect(0,0,FW,FH)}
 });
}

/* ---- Schnittstelle zum Spiel-Rahmen ---- */
return{
boot(){tuTour=0;tuHn=null;tuG=null;tuKey='';if(!preview)audLoad();audioStart();document.addEventListener('pointerdown',audG);document.addEventListener('keydown',audG);document.addEventListener('visibilitychange',onHide);addEventListener('pagehide',onHide);addEventListener('blur',resetCameraInput);cv.addEventListener('wheel',wh,{passive:false});cv.addEventListener('mousemove',mm);cv.addEventListener('mouseleave',ml)},
leave(){sv(1);audStop();document.removeEventListener('pointerdown',audG);document.removeEventListener('keydown',audG);document.removeEventListener('visibilitychange',onHide);removeEventListener('pagehide',onHide);removeEventListener('blur',resetCameraInput);cv.removeEventListener('wheel',wh);cv.removeEventListener('mousemove',mm);cv.removeEventListener('mouseleave',ml);resetCameraInput()},
click(x,y,_player,id,pointerType){
 if(!ready||ff||!Number.isFinite(x)||!Number.isFinite(y))return;
 const h=hitAt(x,y),blocked=!!openMenu()||storyOnScreen();
 const touch=pointerType==='touch';
 if(touch&&(touchPointers.size||!h&&!blocked)&&(trackTouch(x,y,id)||multiTouch))return;
 if(pdn&&pdn.id!==id)return;
 const scroll=panelSurface&&FactoryLayout.contains(panelSurface.clip,x,y);
 const dockScroll=dockAt(x,y);
 pdn={h,x,y,lastX:x,lastY:y,id,touch,blocked,scroll,dockScroll};
 mv=0;lt=null;
 if(h?.drag&&!touch)h.drag(x);
 if(!touch)startWorldEdit(pdn);
},
dragMove(x,y,_player,id,ending=false){
 if(!Number.isFinite(x)||!Number.isFinite(y))return;
 if(touchPointers.has(id)){
  if(trackTouch(x,y,id,ending)||multiTouch)return;
 }
 if(!pdn||multiTouch||pdn.id!==id)return;
 if(Math.abs(x-pdn.x)+Math.abs(y-pdn.y)>8)mv=1;
 if(pdn.h?.drag){if(!pdn.touch||mv)pdn.h.drag(x);return}
 if(pdn.dockScroll&&mv){
  if(!ending)scrollDock(pdn.dockScroll,pdn.lastX-x);
  pdn.lastX=x;
  return;
 }
 if(pdn.scroll&&mv){
  if(!ending)scrollPanel(pdn.lastX-x,pdn.lastY-y);
  pdn.lastX=x;pdn.lastY=y;
  return;
 }
 if(pdn.h||pdn.blocked||!mv)return;
 startWorldEdit(pdn);
 if(tool=='del'){const[a,b]=tileAt(x,y);hv=[a,b];if(!lt||a!=lt[0]||b!=lt[1]){if(delAt(a,b))pdn.dl=1;lt=[a,b]}}
 else if(tool=='mov'&&pdn.pick&&mvO){hv=tileAt(x,y)}
 else if(isBelt(tool)&&!MD[tool]?.sortStation){
  const [a,b]=tileAt(x,y);hv=[a,b];
  if(lt&&(a!==lt[0]||b!==lt[1])){
   const dx=a-lt[0],dy=b-lt[1];
   if(Math.abs(dx)+Math.abs(dy)===1){
    const direction=DX.findIndex((value,i)=>value===dx&&DY[i]===dy),previous=cell(...lt);
    if(place(a,b,tool,direction)){
     if(previous?.t===tool&&!previous.needsRelocation&&previous.r!==direction)rotObj(previous,direction);
     rot=direction;lt=[a,b];
    }
   }else lt=[a,b];
  }
 }
 else{
  const dx=x-pdn.lastX,dy=y-pdn.lastY;
  pdn.lastX=x;pdn.lastY=y;
  if(!dx&&!dy)return;
  cam.x-=dx/cameraZoom();cam.y-=dy/cameraZoom();clampCam();lastCameraMotion=tm;guideAction('pan');
 }},
dragCancel(_player,id){
 const wasPinching=releaseTouch(id);
 if(!wasPinching&&pdn?.id===id)cancelAction();
},
dragEnd(x,y,_player,id){
 if(releaseTouch(id)||multiTouch)return;
 const p=pdn;
 if(!p||p.id!==id)return;
 if(p.touch&&!mv)startWorldEdit(p);
 pdn=null;lt=null;
 if(p.h){
  if(!mv){if(p.touch&&p.h.drag)p.h.drag(p.x);p.h.fn()}
  return;
 }
 if(p.blocked)return;
 if(tool=='del'&&p.dl){analyze();sv(0);return}
 if(tool=='mov'&&ready&&!asg){movEnd(p);return}if(mv||!ready)return;
 const [a,b]=tileAt(p.x,p.y);
 if(buildMode){buildTap(a,b);return}
 if(asg){assignTap(a,b);return}
 if(tool==='hand'){
  sel=cell(a,b)||null;
  if(!sel&&(inR(SITE,a,b)||campaignChapter()>=2&&inR(FLEET,a,b))){closeP2();projectView=inR(SITE,a,b)?1:2;bkO=true;sfx('click')}
 }else if(MD[tool]&&(!isBelt(tool)||MD[tool].sortStation))place(a,b,tool,rot);
},
update(dt){
 if(!ready){
  if(preview){
   if(!ld){ld=1;openChapterPreview();}
   return;
  }
  if(window.NOFIN){KEY='2pg_fe_demo';demo();return}
  wt+=dt;
  if(!ld){
   const user=typeof OL!='undefined'&&OL.me&&OL.db?OL.me:null;
   if(user){
    ld=1;KEY='2pg_fe_'+user;cloud.uid=user;cloud.ref=OL.db.ref('users/'+user+'/factory');loadFactory();
   }else if(wt>(readLocal('2pg_ol')?6:.4)){
    ld=1;KEY='2pg_fe_guest';loadFactory();
   }
  }
  return;
 }
 const n=Date.now(),r0=Math.max(0,(n-lr)/1000);
 lr=n;tm+=dt;
 if(!ff){
  const away=r0>offlineThreshold;
  acc=away?Math.min(KOF*OFFE,acc+Math.min(r0,KOF)*OFFE):acc+r0;
  if(away||acc>20)ff=offlineStart(r0);
 }
 const steps=Math.floor((acc+1e-9)/TICK);
 fs=steps>40?1:0;
 const ran=FactoryRuntime.step(steps,tick,ff?28:14);
 fs=0;
 acc=Math.max(0,acc-ran*TICK);
 if(saveAfterTick){saveAfterTick=false;sv(true)}
 if(ff){
  ff.left=Math.floor((acc+1e-9)/TICK);
  if(!ff.left){
   const report=ff;ff=null;analyze();offlineReport(report);sv(false);
  }
 }
 if(ff)return;
 if(projectCargo.size||projectTrucks.length)launchProjectTrucks();
 for(const o of L){if(o.bt<1)o.bt=Math.min(1,o.bt+dt*3);if(o.fl>0)o.fl=Math.max(0,o.fl-dt*1.6);o.dv+=(o.ew-o.dv)*.1}
 for(const k in afl)afl[k]=Math.max(0,afl[k]-dt*1.2);for(const k in rflash)rflash[k]=Math.max(0,rflash[k]-dt*1.5);pfl=Math.max(0,pfl-dt*1.2);PO=PO.filter(p=>(p.t+=dt)<1.2);tl+=dt;if(tl>1){tl=0;analyze();warnChk()}at+=dt;if(at>20){at=0;sv(0)}if(storyOnScreen()&&!ff)updateStory(dt);tuUpd(dt);stShow();if(!storyOnScreen())audMach(dt);audCloudSync();},
draw:drawFrame,pointerPosition,
dbg:()=>({AUD:audio.getContext,ASg:()=>AS,audStart:audioStart,audTick:musTick,musFill,audMach,sfxAt:sfx,mshot,SFX,MS,MOODS,audSetK:(k,v)=>{AS[k]=v;audApply();audSave()},aud,audCloudSync,audFlush:audio.clearPending,pcfSet:v=>{pcf=v},fTabSet:v=>{fTab=v},del,xp,setLv,lv:()=>LV,AC,chkAc,acOpen:v=>{acO=v},pnOpen:v=>{pnO=v},RN,rOK,buyR,rfx,RH,rsOpen:v=>{rsO=v},rsel:id=>{rsel=id},fx:()=>({STC,BTv,SPm,RM,PM,OS,WG,OFFE,KOF,RCm,KUC}),MG,hireE,setCrew,hireM,lvlM,specM,recalc,cap,assignTo:(id,x,y)=>assignManager(G.mg.find(q=>q.id===id),areaAt(x,y),cell(x,y)),salePrice,rawCost,mkOpen:v=>{mkO=v},ITEMS,MD,acc2,view:(x,y,z)=>{cam={x:x*TS,y:y*TS,z}},fm,cst,nf,uc,tme,rrLeft,fillOrders,get ff(){return ff},get lr(){return lr},HL,PH,STX,hlv,hReq,hNext,buyHall,bchk,delAt,sellAll,moveObj,prjIn,phaseDone,get stQ(){return stQ},bProg,dLeft,hallOf,hrect,areaAt,inG,jtick,put,setTool:t=>{tool=t},mvSet:o=>{mvO=o},hselGet:()=>hsel,togP,rotObj,storyIntro,beginNextChapter,currentStoryId,finishStory,replayStory,updateStory,feed,itemPos,rate,G,L,g,tick,analyze,place,plan,buy,sb,give,sv,init,inputCap,currentStats,pairTunnels,unpairTunnel,tunnelExit,tunnelRange,lineMetrics,allProductionLines,lostConnections,recipeTree,beltCapacity,cell,footprint,placement,makePlan,previewPlan,commitBuild,planRoute,checkBuild,connectedLine,REGIONS,SITE,FLEET,projectTrucks,get industrial(){return industrial},switchSite,companyValue,cloud,flushCloud,chooseSave,applySave,get msg(){return msg},get bn(){return bn},sel:o=>{sel=o},tuD:()=>({HB,view,panelSurface,panelScroll,dockTracks,dockOffsets,cur:tuCur(),TU,TOUR,HNT,tuHn,tuTour,tuTI,tuG,rot,tool,pg,sel,cam,fTab,acO,hlO,bkO,mkO,mvO,delAsk})})}};
