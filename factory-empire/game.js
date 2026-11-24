/* ===== Factory Empire ===== */
const fabrik=()=>{
const canvasScope=createFactoryCanvasScope(c);
const {save:saveCanvas,restore:restoreCanvas,withState:withCanvasState}=canvasScope;
const TS=48,GW=144,GH=62,TICK=.125,DAYSEC=300,DAYS=1500,BELT=.25,OFF=28800,RRC=1920,DX=[1,0,-1,0],DY=[0,1,0,-1],PI=Math.PI;
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
const { ITEMS, MD, PR, DS, jpre, MP }=createFactoryCatalog(RH);
/* ---- Markt: feste Nachfragezyklen (vorhersagbar), Sättigung durch eigene Verkäufe ---- */
const TAU=120,TH=[0,.9,1,1.1];
const dem=(i,t=G.tk*TICK)=>1+MP[i][0]*Math.sin(2*PI*t/MP[i][1]+MP[i][2]);
const sx=i=>1/(1+(G.sa[i]||0)/(MP[i][3]*KM)),price=i=>ITEMS[i].v*dem(i)*sx(i)*PM;
const rawCost=i=>{const m=MD[PR[i]];return!m?0:m.r?m.r.reduce((a,x)=>a+x[1]*rawCost(x[0]),0):m.rc};
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
 {id:'bel',n:'Schnellband-Antrieb',c:12,p:['lag','spd1'],x:1,y:2,e:'Förderbänder transportieren doppelt so schnell.'},
 {id:'lag2',n:'Automatisches Lager',c:18,p:['bel'],x:2,y:2,e:'Zwischenlager fassen 80 statt 40 Stück.'},
 {id:'bel2',n:'Magnetbänder',c:26,p:['lag2'],x:3,y:2,e:'Förderbänder transportieren dreimal so schnell wie zu Beginn.'},
 {id:'mkt',n:'Marktanalyse',c:6,p:[],x:0,y:3,e:'Märkte sättigen langsamer (+25 % Marktgröße).'},
 {id:'hnd',n:'Handelsbeziehungen',c:10,p:['mkt'],x:1,y:3,e:'Auftragsprämien +25 %.'},
 {id:'brd',n:'Markenaufbau',c:18,p:['hnd'],x:2,y:3,e:'Alle Verkaufspreise +8 %.'},
 {id:'vtr',n:'Vertriebsnetz',c:22,p:['brd'],x:3,y:3,e:'Gesättigte Märkte erholen sich 25 % schneller.'},
 {id:'exp',n:'Exportmärkte',c:16,p:['mkt'],x:0,y:4,e:'Alle Märkte werden um weitere 30 % größer.'},
 {id:'off',n:'Auftragsbüro',c:8,p:['hnd'],x:1,y:4,e:'Ein vierter Auftrag gleichzeitig.'},
 {id:'mas',n:'Massenfertigung',c:28,p:['brd'],x:2,y:4,ex:'prm',e:'+20 % Tempo und +15 % Marktgröße, aber 5 % niedrigere Verkaufspreise. Schließt Premiumfertigung aus.',rq:['Premiumfertigung nicht gewählt',()=>!RH('prm')]},
 {id:'prm',n:'Premiumfertigung',c:28,p:['brd'],x:3,y:4,ex:'mas',e:'+12 % Verkaufspreise, aber 5 % weniger Tempo. Schließt Massenfertigung aus.',rq:['Massenfertigung nicht gewählt',()=>!RH('mas')]},
 {id:'sch',n:'Schulungen',c:10,p:[],x:0,y:5,e:'Produktions-Mitarbeiter bringen +3 % statt +2 % Tempo.'},
 {id:'ldr',n:'Führungstraining',c:20,p:['sch'],x:1,y:5,e:'Alle Manager wirken 15 % stärker.'},
 {id:'nst',n:'Nachtschicht',c:30,p:['ldr'],x:2,y:5,e:'Offline-Fortschritt: bis zu 12 statt 8 Std., Effizienz 40 % statt 25 %.'}];
/* ---- Personal: Mitarbeiter (Lohn) und Manager (Meilenstein-Freischaltung, Zuweisung, Spezialisierung) ---- */
const WAGE=6,MG=[
 {id:'prod',n:'Hanna Berger',r:'Produktionsleiterin',kind:'prod',base:.08,cost:800,tgt:'eine Maschine',lab:'Tempo',cond:['50 Produkte verkauft',()=>G.sold>=50]},
 {id:'qual',n:'Jonas Weber',r:'Qualitätsmanager',kind:'qual',base:.02,cost:2500,tgt:'einen Versand',lab:'Verkaufspreis',cond:['3 Aufträge erfüllt',()=>G.ord>=3]},
 {id:'eng',n:'Dr. Mira Voss',r:'Ingenieurin',kind:'eng',base:.05,cost:6000,tgt:'eine Maschine',lab:'Upgrade-Kosten −',cond:['„Präzisionswerkzeuge“ erforscht',()=>RH('spd1')]},
 {id:'log',n:'Tobias Kern',r:'Logistikmanager',kind:'log',base:.15,cost:4000,tgt:'ein Zwischenlager',lab:'Lagerplätze',cond:['„Hochregal-Lagerung“ erforscht',()=>RH('lag')]}];
const comp=(d,o)=>d.kind=='qual'?o.t=='shp':d.kind=='log'?o.t=='sto':!!(MD[o.t]&&MD[o.t].o!=null);
const meff=(m,d)=>d.base*m.lv*(m.sp==1?1.5:m.sp==2?.6:1)*(1+.1*pul('mgt1'))*(RH('ldr')?1.15:1),hcost=k=>Math.round(150*Math.pow(1.3,G.emp[k])),lcost=(m,d)=>Math.round(d.cost*.5*Math.pow(1.7,m.lv-1));
function recalc(){for(const o of L){o.sb=1;o.ub=1;o.pb=1;o.cb=0;o.mg=0}
 const par=new Map(),f=o=>{while(par.get(o)!==o)o=par.get(o);return o};for(const o of L)par.set(o,o);
 for(const o of L){
  const outputs=o.j?(o.j==1?o.jm.flatMap((mode,d)=>mode==2?[d]:[]):[0,1,2,3]):
   [o.r,(o.r+1)%4,(o.r+3)%4].filter(d=>fdn(o,(d+2)%4));
  for(const d of outputs){const q=neighbor(o,d);if(q)par.set(f(o),f(q))}
  const exit=tunnelExit(o);if(exit)par.set(f(o),f(exit));
 }
 for(const m of G.mg){const d=MG.find(q=>q.id==m.id),t=m.x>=0?cell(m.x,m.y):null;if(!t||!comp(d,t))continue;t.mg=1;const e=meff(m,d);
  for(const o of m.sp==2?L.filter(o=>f(o)==f(t)&&comp(d,o)):[t]){if(d.kind=='prod')o.sb*=1+e;else if(d.kind=='eng')o.ub*=Math.max(.4,1-e);else if(d.kind=='qual')o.pb*=1+e;else o.cb+=e}}}
function hireE(k){if(G.emp[k]>=12){deny('Mehr als 12 Mitarbeiter pro Abteilung gehen nicht.');return}const c1=hcost(k);if(G.m<c1){deny('Nicht genug Geld.');return}G.m-=c1;G.emp[k]++;rfx();xp(2);sfx('hire');sv(0)}
function fireE(k){if(G.emp[k]>0){G.emp[k]--;rfx();sfx('remove');sv(0)}}
function hireM(d){if(G.mg.some(m=>m.id==d.id))return;if(!d.cond[1]()){deny('Gesperrt: '+d.cond[0]);return}if(G.m<d.cost){deny('Nicht genug Geld.');return}G.m-=d.cost;G.mg.push({id:d.id,lv:1,sp:0,x:-1,y:-1});xp(20);sfx('hire');toast(d.n+' arbeitet jetzt für dich – weise sie einer Maschine zu.');sv(1)}
function lvlM(m,d){if(m.lv>=10)return;const c1=lcost(m,d);if(G.m<c1){deny('Nicht genug Geld.');return}G.m-=c1;m.lv++;recalc();xp(10);sfx('upgrade');sv(0)}
function specM(m,sp){if(m.lv<5||m.sp)return;m.sp=sp;recalc();sfx('unlock');sv(0)}
function assignTap(a,b){const d=MG.find(q=>q.id==asg),m=G.mg.find(q=>q.id==asg),o=cell(a,b);if(!o||!comp(d,o)){deny('Das passt nicht – tippe '+d.tgt+' an.');return}m.x=o.x;m.y=o.y;asg=null;pnO=true;recalc();analyze();sfx('select');sv(0)}
/* ---- Spielerlevel & Erfolge ---- */
const need=l=>Math.round(60*Math.pow(l,1.5));
function setLv(){let l=1,x=G.xp,n=need(1);while(x>=n){x-=n;l++;n=need(l)}LV=l;XB=G.xp-x;XN=XB+n}
function xp(n){G.xp+=n;if(G.xp>=XN){const b=LV;setLv();for(let l=b+1;l<=LV;l++){G.rp+=3;if(!fs)toast('⭐ Spielerlevel '+l+' erreicht! +3 Forschungspunkte')}rfx();if(!fs)sfx('level')}}
const AC=[['first','Erster Verkauf','Verkaufe dein erstes Produkt.',()=>G.sold>=1,10],['s100','Kleiner Händler','100 Produkte verkauft.',()=>G.sold>=100,20],['s1k','Marktführer in spe','1.000 Produkte verkauft.',()=>G.sold>=1e3,50],['s10k','Massenproduzent','10.000 Produkte verkauft.',()=>G.sold>=1e4,150],['s100k','Industriegigant','100.000 Produkte verkauft.',()=>G.sold>=1e5,500],
 ['o1','Erster Auftrag','Erfülle deinen ersten Auftrag.',()=>G.ord>=1,15],['o10','Zuverlässiger Lieferant','10 Aufträge erfüllt.',()=>G.ord>=10,60],['o50','Stammlieferant','50 Aufträge erfüllt.',()=>G.ord>=50,200],
 ['m10k','Erste Zehntausend','10 K € Gesamtumsatz.',()=>G.te>=1e4,25],['m1m','Millionär','1 Mio. € Gesamtumsatz.',()=>G.te>=1e6,200],['m100m','Konzernbilanz','100 Mio. € Gesamtumsatz.',()=>G.te>=1e8,600],
 ['line','Erste vollständige Linie','Erstes verpacktes Spielzeug.',()=>G.ds[5]>0,40],['tool','Werkzeugbauer','Erstes Werkzeug hergestellt.',()=>G.ds[9]>0,60],['pho','Elektronik-Pionier','Das erste Smartphone hergestellt.',()=>G.ds[13]>0,150],['pho2','Digitaler Industriekonzern','100 Smartphones in einem Durchlauf hergestellt.',()=>(G.pc[13]||0)>=100,300],['disc','Produktvielfalt','Alle 8 Produkte entdeckt.',()=>[1,2,3,4,5,7,8,9].every(i=>G.ds[i]),120],
 ['hall1','Erste Erweiterung','Zweite Halle freigeschaltet.',()=>HL.filter(h=>hlv(h.id)>0).length>=2,40],['hall4','Fabrikkomplex','Alle Hallen freigeschaltet.',()=>HL.filter(h=>!h.site).every(h=>hlv(h.id)>0),250],['pl25','Bauherr','25 Gebäude platziert.',()=>G.pl>=25,25],['pl100','Fabrikplaner','100 Gebäude platziert.',()=>G.pl>=100,100],
 ['r1','Forscher','Erste Technologie erforscht.',()=>G.rs.length>=1,30],['r10','Technologieführer','Zehn Technologien erforscht.',()=>G.rs.length>=10,250],['r21','Forschungsleiter','Alle 22 wählbaren Technologien erforscht.',()=>G.rs.length>=22,400],
 ['mg1','Chef','Ersten Manager eingestellt.',()=>G.mg.length>=1,30],['mg4','Führungsriege','Alle 4 Manager eingestellt.',()=>G.mg.length>=4,120],['mg10','Meisterhaft','Einen Manager auf Level 10.',()=>G.mg.some(m=>m.lv>=10),150],
 ['e10','Belegschaft','10 Mitarbeiter angestellt.',()=>G.emp.p+G.emp.q+G.emp.l>=10,50],['pr1','Neuanfang','Erste Neugründung abgeschlossen.',()=>G.pr>=1,150],['pr5','Serienunternehmer','5 Neugründungen.',()=>G.pr>=5,400],['lv5','Aufsteiger','Spielerlevel 5 erreicht.',()=>LV>=5,40],['lv10','Profi','Spielerlevel 10 erreicht.',()=>LV>=10,120],
 ['b1','Fundament gelegt','Bunker-Phase 1 abgeschlossen.',()=>G.sp>=1,100],['b4','Strom für den Bunker','Bunker-Phase 4 abgeschlossen.',()=>G.sp>=4,300],['b7','Rettung der Menschheit','Den Bunker fertiggestellt.',()=>G.sp>=7,2000],['hup','Platz da!','Eine Halle auf Stufe 3 ausgebaut.',()=>HL.some(h=>hlv(h.id)>=3),150],['car','Autobauer','Das erste Auto hergestellt.',()=>G.ds[37]>0,200],['jn1','Verteilerchef','Ersten Splitter oder Fusionator gebaut.',()=>G.bt.includes('spl')||G.bt.includes('fus'),40]];
function chkAc(){for(const a of AC)if(!G.ac.includes(a[0])&&a[3]()){G.ac.push(a[0]);xp(a[4]);if(!fs)toast('🏆 Erfolg: '+a[1]);sfx('achieve')}}
/* ---- Prestige: freiwillige Neugründung gegen Industrie-Blaupausen, permanente Upgrades ---- */
const pul=id=>(G&&G.pu&&G.pu[id])|0;
const PU=[{id:'cap1',n:'Startkapital',max:10,base:2,fx:l=>'+'+600*l+' € Start'},{id:'cap2',n:'Maschinenrabatt',max:10,base:3,fx:l=>'−'+3*l+' % Baukosten'},
 {id:'prd1',n:'Grundtempo',max:10,base:3,fx:l=>'+'+5*l+' % Tempo'},{id:'prd2',n:'Frühe Freischaltung',max:2,base:6,fx:l=>['–','Metallhalle gratis','+ Versorgungswerk'][l]},
 {id:'log1',n:'Größere Lager',max:5,base:2,fx:l=>'+'+10*l+' Lagerpl.'},{id:'log2',n:'Marktzugang',max:5,base:2,fx:l=>'+'+10*l+' % Markt'},
 {id:'mgt1',n:'Starke Manager',max:5,base:3,fx:l=>'+'+10*l+' % Manager'},{id:'mgt2',n:'Lohnverhandlung',max:5,base:2,fx:l=>'−'+10*l+' % Löhne'},
 {id:'res1',n:'Forschungs-Start',max:5,base:2,fx:l=>'+'+4*l+' Start-FP'},
 {id:'res2',n:'Forschungsarchiv',max:4,base:4,fx:l=>l?'+'+3*l+' Start-Techs':'–'}];
const ARCH=['spd1','lag','mkt','hnd','bel','off','spd2','brd','exp','sch','vtr','lag2'];
function startTech(){G.rs=[];for(let i=0;i<3*pul('res2');i++)if(!G.rs.includes(ARCH[i]))G.rs.push(ARCH[i]);G.rp=4*pul('res1')}
const startMoney=()=>120+600*pul('cap1');
const PMIN=12,bpCalc=()=>{const a=Math.floor(Math.sqrt(G.tr/60000)),b=Math.max(0,HL.reduce((s,h)=>s+(hlv(h.id)>0?hlv(h.id):0),0)-1),c=Math.floor(G.ordRun/8);return{a,b,c,t:a+b+c}};
function starter(){put(7,6,'src',0);put(8,6,'belt',0);put(9,6,'saw',0);put(10,6,'belt',0);put(11,6,'shp',0)}
function buyP(id){const p=PU.find(q=>q.id==id);if(!p)return false;const l=pul(id),c1=Math.ceil(p.base*Math.pow(1.7,l));if(l>=p.max||p.need&&!p.need())return false;if(G.bp<c1){deny('Nicht genug Blaupausen.');return}G.bp-=c1;G.pu[id]=l+1;rfx();recalc();sfx('upgrade');sv(1);return true}
function doPrestige(){const b=bpCalc();if(b.t<PMIN){deny('Noch zu früh: Mindestens '+PMIN+' Blaupausen nötig.');return}
 G.bp+=b.t;G.bpt+=b.t;G.pr++;resetPlanning();currentSite='main';cam={x:11.5*TS,y:6.5*TS,z:1.3};L=[];g=[];starter();
 G.m=startMoney();G.tr=0;G.ordRun=0;G.legacyPlots=[];G.hl={gar:1};['met','vrs'].forEach((id,i)=>{if(pul('prd2')>i&&G.sp>=hallOf(id).ph)G.hl[id]=1});startTech();mvO=null;G.emp={...G.emp,p:0,q:0,l:0};G.mg=[];G.od=[];G.sa.fill(0);G.pc={};G.recent=FactoryTelemetry.create(G.tk,TICK);sb.fill(0);rw=0;sel=null;selA=null;PO=[];asg=null;tool='hand';
 rfx();recalc();analyze();xp(100);pfl=1;sfx('prestige');toast('Neues Unternehmen gegründet! +'+b.t+' Blaupausen');sv(1)}
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
function rfx(){const E=G.emp;SPm=(1+(RH('spd1')?.1:0)+(RH('spd2')?.15:0)+(RH('spd3')?.2:0)+(RH('mas')?.2:0)-(RH('prm')?.05:0))*(1+(RH('sch')?.03:.02)*E.p)*(1+.01*Math.min(24,LV-1))*(1+.05*pul('prd1'));STC=(RH('lag2')?80:RH('lag')?40:20)+2*E.l+10*pul('log1');BTv=RH('bel2')?BELT/3:RH('bel')?BELT/2:BELT;KM=(RH('mkt')?1.25:1)*(RH('exp')?1.3:1)*(RH('mas')?1.15:1)*(1+.1*pul('log2'));RM=RH('hnd')?1.25:1;PM=(RH('brd')?1.08:1)*(RH('prm')?1.12:1)*(RH('mas')?.95:1)*(1+.01*E.q)*(1+.02*G.bpt);OS=RH('off')?4:3;WG=(E.p+E.q+E.l)*WAGE*(1-.1*pul('mgt2'));KUC=RH('lean')?.88:1;KBC=RH('bau')?.85:1;KTA=RH('vtr')?.75:1;KOF=RH('nst')?43200:OFF;OFFE=RH('nst')?.4:.25;RCm=RH('wrk')?.85:1}
function buyR(n){if(!rOK(n)){deny('Voraussetzungen noch nicht erfüllt.');return}const cost=researchCost(n);if(G.rp<cost){deny('Nicht genug Forschungspunkte.');return}G.rp-=cost;G.rs.push(n.id);rfx();xp(30);sfx('unlock');toast('Erforscht: '+n.n);rflash[n.id]=1;sv(1);analyze()}
const LVQ=n=>({t:'Spielerlevel '+n,ok:()=>LV>=n,p:()=>Math.min(LV,n)+'/'+n});
const REQ=(t,n,k)=>({t,ok:()=>G[k]>=n,p:()=>Math.min(G[k],n)+'/'+n});
const HL=[{"id":"gar","n":"Garage","ln":"Holzwerkstatt","tab":"h","rc":[[6,3,17,10],[6,3,21,10],[6,3,21,15]],"c":[0,6000,45000],"ph":0,"f":["#d3d6da","#b9bec5"]},{"id":"met","n":"Metallhalle","ln":"Stahlwerk","tab":"m","rc":[[26,3,39,12],[26,3,43,14],[26,3,47,16]],"c":[30000,22000,75000],"ph":1,"f":["#cdd6e0","#b3bfcc"]},{"id":"vrs","n":"Versorgungswerk","ln":"Lebensmittel & Wasser","tab":"v","rc":[[6,22,19,31],[6,22,23,33],[6,22,25,37]],"c":[120000,80000,280000],"ph":2,"f":["#d3e0d0","#b9cdb4"]},{"id":"elk","n":"Elektronikhalle","ln":"Elektronik","tab":"e","rc":[[52,3,67,12],[52,3,71,14],[52,3,75,16]],"c":[300000,210000,700000],"ph":2,"f":["#cfdbe4","#b2c4d2"]},{"id":"ene","n":"Energiehalle","ln":"Antriebe & Energie","tab":"n","rc":[[30,22,43,31],[30,22,47,33],[30,22,51,37]],"c":[900000,600000,2000000],"ph":3,"f":["#e4dec4","#cfc7a6"]},{"id":"fzg","n":"Fahrzeughalle","ln":"Mobilität","tab":"f","rc":[[56,22,71,31],[56,22,75,33],[56,22,79,37]],"c":[2500000,1700000,5600000],"ph":4,"f":["#dcd5d2","#c4bab6"]},{"id":"hit","n":"Hightech-Halle","ln":"Robotik & KI","tab":"t","rc":[[18,44,31,53],[18,44,35,55],[18,44,39,57]],"c":[8000000,5500000,19000000],"ph":5,"f":["#d2d4e8","#b6b9d6"]},{"id":"bnk","n":"Bunkerwerk","ln":"Bunkermodule","tab":"b","rc":[[44,44,57,53],[44,44,61,55],[44,44,65,57]],"c":[20000000,14000000,60000000],"ph":6,"f":["#dbd2c2","#c3b79f"]}];
const PH=[{"n":"Fundament","hall":"gar","q":[[14,420],[15,160],[5,150]],"rw":[40000,10]},{"n":"Stahlhülle","hall":"met","q":[[16,1000],[17,450],[9,300],[18,180]],"rw":[150000,20]},{"n":"Lebenserhaltung","hall":"vrs","q":[[23,1200],[25,1500],[27,450],[19,800]],"rw":[500000,30]},{"n":"Energie","hall":"ene","q":[[28,1300],[30,700],[31,240],[20,600]],"rw":[1400000,40]},{"n":"Evakuierung","hall":"fzg","q":[[35,350],[37,220],[38,90],[36,450]],"rw":[4000000,60]},{"n":"Hightech-Kern","hall":"hit","q":[[39,200],[40,600],[41,240],[32,70]],"rw":[15000000,80]},{"n":"Fertigstellung","hall":"bnk","q":[[42,180],[43,130],[44,48],[45,24]],"rw":[0,100]}];

const REGIONS=[
 {id:'main',name:'Stammwerk',rect:[0,0,79,61],center:[11.5,6.5]},
 {id:'north',name:'Nordwerk',rect:[82,1,111,30],center:[95,14],hall:'nor',cost:85000,
  need:'Bunker-Phase 2 erreicht · 10 Aufträge erfüllt',open:()=>G.sp>=1&&G.ord>=10},
 {id:'lab',name:'Versuchsfabrik',rect:[82,33,111,61],center:[95,47],hall:'lab',cost:45000,
  need:'Vollautomatisierung · Spielerlevel 10',open:()=>RH('spd3')&&LV>=10},
 {id:'port',name:'Verbundwerk',rect:[114,2,143,59],center:[128,26],hall:'prt',cost:12e6,
  need:'Bunker-Phase 7 erreicht · 3 Neugründungen',open:()=>G.sp>=6&&G.pr>=3}
];
HL.push(
 {id:'nor',n:'Nordwerk',ln:'Holz, Metall & Versorgung',tab:'m',site:'north',allow:['gar','met','vrs'],rc:[[87,7,103,20]],c:[85000],ph:0,f:['#c9d6d7','#9fb6b5']},
 {id:'lab',n:'Versuchsfabrik',ln:'Holz, Metall & Elektronik',tab:'e',site:'lab',allow:['gar','met','elk','ene'],rc:[[87,41,103,54]],c:[45000],ph:0,f:['#d4d0e7','#aea9cc']},
 {id:'prt',n:'Verbundwerk',ln:'Robotik · Versorgung · Bunkermodule',tab:'t',site:'port',allow:['gar','met','vrs','elk','ene','fzg','hit','bnk'],rc:[[119,14,137,37]],c:[12e6],ph:0,f:['#c0d6df','#8baebf']}
);
const siteAt=(x,y)=>REGIONS.find(site=>inR(site.rect,x,y));
let currentSite='main';
const hlv=id=>(G&&G.hl&&G.hl[id])|0,hallOf=id=>HL.find(h=>h.id==id),inR=(r,x,y)=>x>=r[0]&&x<=r[2]&&y>=r[1]&&y<=r[3],hrect=h=>h.rc[Math.max(1,hlv(h.id))-1],SITE=[68,44,78,58];
const hSize=h=>{const r=hrect(h);return(r[2]-r[0]+1)+'×'+(r[3]-r[1]+1)},hArea=r=>(r[2]-r[0]+1)*(r[3]-r[1]+1);
const ORD=['saw','frm','asm','pnt','pck'],QT=[1,10,25,0];
const fm=n=>{n=Math.floor(n);for(const[v,s]of[[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']])if(n>=v)return(n/v).toFixed(n>=v*100?0:n>=v*10?1:2).replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'').replace('.',',')+' '+s;return n.toLocaleString('de-DE')};
let STC=20,BTv=BELT,SPm=1,KM=1,RM=1,PM=1,OS=3,KUC=1,KBC=1,KTA=1,KOF=OFF,OFFE=.25,RCm=1,stQ=[],stOpen=0,hlO=false,bkO=false,hsel=null,mvO=null,mvT=null,delAsk=0,mp=null,mkTab=0,mkPg=0,WG=0,LV=1,XB=0,XN=60,acO=false,pfl=0,fTab=0,pcf=false,rsel=null,rsO=false,rflash={},pnO=false,asg=null;
let G,L=[],g=[],ready=0,cam={x:11.5*TS,y:6.5*TS,z:1.3},tool='hand',rot=0,sel=null,hv=null,HB=[],PO=[],tm=0,acc=0,lr=Date.now(),KEY,ld=0,wt=0,at=0,pdn=null,mv=0,lt=null,msg='',tl=0,bn=null,qi=0,fs=0,sc=0,rw=0,selA=null,afl={},pg='h',ff=null,mkO=false;
const sb=new Array(60).fill(0),cell=(x,y)=>x<0||y<0||x>=GW||y>=GH?null:g[y*GW+x],areaAt=(x,y)=>HL.find(h=>inR(hrect(h),x,y)),inG=(x,y)=>{const h=areaAt(x,y);return!!h&&hlv(h.id)>0};
/* Maschinenparameter. Waren behalten ihre Qualitätswerte entlang der Transportkette. */
const qvalue=value=>Number.isFinite(value)?Math.max(60,Math.min(160,value)):100;
const isStorage=t=>t=='sto'||!!MD[t]?.storage;
const typeShip=t=>t=='shp'||!!MD[t]?.ship;
const knownType=t=>t=='belt'||Object.hasOwn(MD,t);
const isBelt=t=>t=='belt'||!!MD[t]?.belt;
const beltSize=t=>MD[t]?.belt?.[1]||1;
const beltTime=t=>BTv*(MD[t]?.belt?.[0]||1);
const beltCount=o=>o.it<0?0:1+o.queue.length;
const beltCapacity=o=>Math.min(60/beltTime(o.t),60*beltSize(o.t)/TICK);
const terminal=t=>typeShip(t)||t=='prj'||!!(MD[t]?.supply||MD[t]?.distribution);
const prod=o=>MD[o.t]?.o!=null;
const cap=o=>Math.floor(STC*(1+(o.cb||0)));
const inputCap=(o,i)=>MD[o.t].r[i][1]*2;
const spd=(o,level=o.lv)=>Math.pow(1.18,Math.min(60,level)-1)*SPm*(o.sb||1)*xsp(o);
const tme=(o,level=o.lv)=>MD[o.t].w/spd(o,level);
const defaultSize=t=>MD[t]?.size||[1,1];
const {dimensions,footprint,port}=FactoryGrid;
function mapObject(o,value){
 for(const [x,y] of footprint(o))g[y*GW+x]=value;
}
const neighbor=(o,d)=>cell(...port(o,d));
function tunnelExit(o,lookup=cell){
 if(o.t!='tunnel')return null;
 for(let distance=1;distance<=6;distance++){
  const q=lookup(o.x+distance*DX[o.r],o.y+distance*DY[o.r]);
  if(q?.t=='tunnel'&&q.r==o.r)return distance>=2?q:null;
 }
 return null;
}
const newStats=s=>FactoryTelemetry.totals(s,G.tk);
function record(o,key,value=1){
 o.stats[key]+=value;
 FactoryTelemetry.record(o.recent,G.tk,TICK,key,value);
}
const currentStats=o=>FactoryTelemetry.rates(o.recent,G.tk,TICK,o.stats.since);
const companyRates=()=>FactoryTelemetry.rates(G.recent,G.tk,TICK);
const uc=(o,l)=>Math.ceil(MD[o.t].c*.55*(Math.pow(1.5,l-1))*(o.ub||1)*KUC),cst=t=>Math.max(1,Math.round((t=='belt'?2:MD[t].c)*(1-.03*pul('cap2'))*KBC));
const xsp=o=>{const m=MD[o.t];return(RH('met')&&m.rc!=null?1.2:1)*(RH('elk')&&(m.a=='elk'||m.a=='ene'||m.a=='hit')?1.12:1)};
function put(x,y,t,r,lv,base=defaultSize(t)){const m=MD[t],o={t,x,y,r,lv:lv||1,it:-1,ein:(r+2)%4,wt:0,q:[],iv:(m&&m.r||[]).map(()=>0),wk:0,out:-1,p:0,ag:0,st:2,ew:0,es:0,eb:0,dv:0,fl:0,bt:1,bad:0};
 if(m&&m.j){o.j=m.j;o.rr=0;o.pr=0;o.xs=[-1,-1,-1,-1];o.xa=[0,0,0,0];o.jm=m.j==1?jpre(t,r):[0,0,0,0]}
 Object.assign(o,{up:{},spec:'',paused:false,priority:false,control:0,supplyItem:-1,supplyStock:0,credits:o.iv.map(()=>0),ivq:o.iv.map(()=>0),oq:100,pq:100,iq:100,qq:[],xq:[100,100,100,100],threshold:105,base,queue:[],beltCarry:0,carryTick:-2,jumped:false,sortRule:-1,smartMode:0,stats:newStats(),recent:FactoryTelemetry.create(G.tk,TICK)});
 L.push(o);mapObject(o,o);return o}
function del(o){L=L.filter(q=>q!=o);mapObject(o,null);buildSelection.delete(o);if(routeSource===o){routeSource=null;buildPreview=null}if(sel==o)sel=null}
const legacyPlots=[
 {id:'w',name:'Lagerhalle',rect:[1,3,5,10]},
 {id:'o',name:'Produktionshalle',rect:[18,3,22,10]},
 {id:'s',name:'Montagehalle',rect:[6,11,17,13]},
 {id:'n',name:'Verpackungszentrum',rect:[6,0,17,2]},
 {id:'e',name:'Elektronikhalle',rect:[23,3,33,10]}
];
function migrateLegacy(save){
 const plots=Object.values(save.ar||{}).filter(id=>legacyPlots.some(plot=>plot.id===id));
 const research=Object.values(save.rs||{});
 const types=Object.values(save.o||{}).flatMap(row=>row&&typeof row==='object'?[row[2]]:[]);
 const hl={gar:1};
 if(research.includes('met')||types.some(type=>MD[type]?.a==='met'))hl.met=1;
 if(plots.includes('e')||research.includes('elk')||types.some(type=>MD[type]?.a==='elk'))hl.elk=1;
 return {...save,v:2,hl,legacyPlots:plots};
}
function init(value){
 const legacy=value&&value.v!==2;
 const d=legacy?migrateLegacy(value):value;
 resetPlanning();
 currentSite='main';traffic.clear();
 G={plans:[],contracts:[],contractWins:{},supplyOrders:{},epoch:0,stock:{},activeBoosts:{},milestones:{},lineCounts:{},wins:{},history:[],units:0,productTracks:{},recent:FactoryTelemetry.create(0,TICK),goals:{mass:0,quality:0,efficiency:0,logistics:0,lab:0},legacyPlots:[],m:120,te:0,sold:0,made:0,pk:0,cost:0,tk:0,ord:0,od:[],hl:{gar:1},pc:{},sa:new Array(ITEMS.length).fill(0),sl:new Array(ITEMS.length).fill(0),rp:0,rs:[],ds:new Array(ITEMS.length).fill(0),emp:{p:0,q:0,l:0,w:0,d:0,a:0},mg:[],wc:0,xp:0,pl:0,bt:[],ac:[],bp:0,bpt:0,pr:0,pu:{},tr:0,ordRun:0,tu:-1,th:[],sp:0,sq:[],st:0,sd:0,sf:{},late:0,end:0};L=[];g=[];
 const lst=(k)=>{if(d[k])Object.values(d[k]).slice(0,ITEMS.length).forEach((v,i)=>{if(typeof v=='number')G[k][i]=v})};
 if(d){for(const k of['m','te','sold','made','pk','cost','tk','ord','rp','wc','xp','pl','bp','bpt','pr','tr','ordRun','sp','st','sd','late','end'])if(typeof d[k]=='number')G[k]=d[k];
  ['sa','sl','ds'].forEach(lst);
  for(const row of Object.values(d.o||{})){if(!row||typeof row!='object')continue;const e=row;const t=e[2];if(!knownType(t))continue;
   const base=e[10]?.large===true?defaultSize(t):[1,1],shape={x:e[0],y:e[1],r:(e[3]|0)&3,base};
   if(!Number.isInteger(shape.x)||!Number.isInteger(shape.y)||footprint(shape).some(([x,y])=>x<0||y<0||x>=GW||y>=GH||cell(x,y)))continue;
   const o=put(shape.x,shape.y,t,shape.r,Math.max(1,Math.min(100,e[4]|0)),base);o.it=Number.isInteger(e[5])&&ITEMS[e[5]]?e[5]:-1;{const v=e[6],r=MD[t]&&MD[t].r;if(r){if(typeof v=='number'){const i=r.findIndex(a=>a[0]==v);if(v>=0&&i>=0)o.iv[i]=1}else if(v)Object.values(v).forEach((n,i)=>{if(i<o.iv.length)o.iv[i]=Math.max(0,Math.min(500,n|0))})}}o.out=Number.isInteger(e[7])&&ITEMS[e[7]]?e[7]:-1;if(isStorage(t)&&e[8]&&typeof e[8]=='object')o.q=Object.values(e[8]).filter(v=>Number.isInteger(v)&&ITEMS[v]).slice(0,500);
   if(o.j&&typeof e[9]=='string'){const a=e[9].split(o.j==1?'':',').map(Number);if(a.length==4&&a.every(v=>!isNaN(v))){if(o.j==1)o.jm=a.map(v=>Math.max(0,Math.min(2,v)));else o.xs=a.map(v=>ITEMS[v]?v:-1)}}
   const extra=e[10];
   if(extra&&typeof extra=='object'){
    for(const key of ['up','spec','paused','priority','control','threshold','supplyItem','supplyStock']){
     if(Object.hasOwn(extra,key))o[key]=extra[key];
    }
    o.wk=prod(o)&&!!MD[t].r&&extra.wk===true?1:0;
    o.p=prod(o)&&Number.isFinite(extra.p)?Math.max(0,Math.min(MD[t].w,extra.p)):0;
    o.iq=qvalue(extra.iq);o.oq=qvalue(extra.oq);o.pq=qvalue(extra.pq);
    o.jumped=extra.jumped===true;
    o.beltCarry=Math.max(0,Math.min(TICK,Number(extra.beltCarry)||0));
    o.carryTick=Number.isInteger(extra.carryTick)?extra.carryTick:-2;
    o.sortRule=Number.isInteger(extra.sortRule)&&(t=='sorter'?!!sortingGroups[extra.sortRule]:!!ITEMS[extra.sortRule])?extra.sortRule:-1;
    o.smartMode=Math.max(0,Math.min(2,extra.smartMode|0));o.stats=newStats(extra.stats);
    o.recent=FactoryTelemetry.create(G.tk,TICK,extra.recent);
    if(isBelt(t))o.queue=Object.values(extra.queue||{}).filter(row=>ITEMS[row[0]]).slice(0,beltSize(t)-1).map(row=>[row[0],qvalue(row[1]),row[2]&3,0,row[4]===true]);
    o.ivq=o.iv.map((n,i)=>n*qvalue(extra.ivq?.[i]));
    o.credits=o.iv.map((_,i)=>Math.max(0,Math.min(9,extra.credits?.[i]|0)));
    o.qq=o.q.map((_,i)=>qvalue(extra.qq?.[i]));o.xq=o.xq.map((_,i)=>qvalue(extra.xq?.[i]));
    o.ag=Number.isFinite(extra.ag)?Math.max(0,Math.min(1,extra.ag)):0;
    o.ein=Number.isInteger(extra.ein)&&extra.ein>=0&&extra.ein<4?extra.ein:o.ein;
    o.xa=o.xa?.map((_,i)=>Math.max(0,Math.min(1,Number(extra.xa?.[i])||0)));
   }else{
    o.ivq=o.iv.map(n=>n*100);o.qq=o.q.map(()=>100);
   }
  }
  G.legacyPlots=legacyPlots.filter(plot=>Object.values(d.legacyPlots||{}).includes(plot.id)).map(plot=>plot.id);
  G.hl={gar:1};if(d.hl)for(const h of HL){const l=d.hl[h.id]|0;if(l>0)G.hl[h.id]=Math.min(h.rc.length,l)}
  G.rs=Object.values(d.rs||{}).filter(id=>id==='grd'||RN.some(n=>n.id==id));
  if(d.emp)for(const k of Object.keys(G.emp))G.emp[k]=Math.max(0,Math.min(12,d.emp[k]|0));
  G.mg=Object.values(d.mg||{}).map(e=>({id:e.id,lv:Math.max(1,Math.min(10,e.lv|0||1)),sp:Math.max(0,Math.min(2,e.sp|0)),x:e.x==null?-1:e.x|0,y:e.y==null?-1:e.y|0})).filter(m=>MG.some(g=>g.id==m.id));
  G.bt=Object.values(d.bt||{}).filter(t=>t=='belt'||MD[t]);G.ac=Object.values(d.ac||{}).filter(id=>AC.some(a=>a[0]==id));
  G.pu={...d.pu};for(const p of PU)G.pu[p.id]=Math.max(0,Math.min(p.max,d.pu?.[p.id]|0));
  G.tu=typeof d.tu=='number'?d.tu:-1;if(G.tu>=TU.length)G.tu=-1;G.th=d.th?Object.values(d.th).filter(x=>typeof x=='string'):[];
  G.sp=Math.max(0,Math.min(PH.length,G.sp|0));G.sq=Object.values(d.sq||{}).map(v=>Math.max(0,v|0));G.sf=d.sf&&typeof d.sf=='object'&&!Array.isArray(d.sf)?d.sf:{};
  G.plans=readPlans(d.plans);
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
  const savedSite=REGIONS.find(site=>site.id==d.site&&(!site.hall||hlv(site.hall)));
  if(savedSite&&savedSite.id!='main')switchSite(savedSite);
  G.contracts=Object.values(d.contracts||{});
  G.contractWins={...d.contractWins};
  G.supplyOrders={...d.supplyOrders};
  G.rr=d.rr==null?null:d.rr|0;G.pc={};if(d.pc&&typeof d.pc=='object')for(const k in d.pc)if(typeof d.pc[k]=='number'&&d.pc[k]>0)G.pc[k]=d.pc[k];G.od=Object.values(d.od||{}).map(e=>{e=Object.values(e);return{s:e[0],n:e[1],d:e[2],r:e[3]}}).filter(q=>ITEMS[q.s]&&ITEMS[q.s].oq&&q.n>0)}
 else{starter();G.tu=0;storyIntro()}
 if(legacy){
  G.sf={...G.sf,mig:1};
  stQ.push(storyCard('Spielstand übernommen','Deine Fabrik ist wieder da',[
   'Gebäude, Lagerbestände, Guthaben und Freischaltungen wurden aus deinem früheren Spielstand übernommen.'
  ]));
 }
 sb.fill(d&&d.rt?d.rt/60:0);rw=d&&d.rt?60:0;sc=Math.floor(G.tk*TICK);setLv();rfx();recalc()
}
function acc2(o,item){
 const recipe=MD[o.t]?.r;
 if(!recipe)return -1;
 return recipe.findIndex(([id],i)=>id==item&&o.iv[i]<inputCap(o,i));
}
const uses=(o,item)=>!!MD[o.t]?.r?.some(([id])=>id==item);
const can=(o,r)=>r.every(([,count],i)=>o.iv[i]>=count);
const fdn=(n,d)=>{
 if(!n||terminal(n.t))return false;
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
 if(o.t=='tunnel')for(let distance=2;distance<=6;distance++){
  const n=cell(o.x-distance*DX[o.r],o.y-distance*DY[o.r]);
  if(n?.t=='tunnel'&&tunnelExit(n)==o)found.add(n);
 }
 return [...found];
}
const ups=q=>{const seen=new Set([q]),st=[q],res=new Set();while(st.length){for(const n of feeders(st.pop()))if(!seen.has(n)){seen.add(n);st.push(n);if(MD[n.t]&&MD[n.t].o!=null)res.add(n)}}return res};
const mixed=(b,id)=>{const seen=new Set([b]),st=[b];while(st.length&&seen.size<60){for(const n of feeders(st.pop())){if(seen.has(n))continue;seen.add(n);if(isBelt(n.t)){if(n.it==id||n.queue.some(row=>row[0]==id))return true;st.push(n)}else if(n.j){if(n.it==id||(n.xs&&n.xs.includes(id)))return true;st.push(n)}else if(isStorage(n.t)){if(n.q.includes(id))return true;st.push(n)}else if(n.out==id)return true}}return false};
const prjNeed=s=>{const q=PH[G.sp];return!!q&&q.q.some(([it,n],i)=>it==s&&(G.sq[i]||0)<n)};
function prjIn(s){const q=PH[G.sp];if(!q)return false;const i=q.q.findIndex(([it,n],i)=>it==s&&(G.sq[i]||0)<n);if(i<0)return false;G.sq[i]=(G.sq[i]||0)+1;G.sd++;xp(.3);if(q.q.every(([it,n],j)=>(G.sq[j]||0)>=n))phaseDone();return true}
function sellProduct(q,item){
 const demand=dem(item);
 if(q.t=='shp'&&q.lv>1&&demand<TH[q.lv-1])return false;

 const value=Math.max(1,Math.round(price(item)*(q.pb||1)));
 G.sa[item]++;G.sl[item]=(G.sl[item]||0)+1;
 G.m+=value;G.te+=value;G.tr+=value;G.sold++;record(q,'sold');record(q,'value',value);q.activity=G.tk;
 xp(.2);
 if(G.sold%200==0){
  G.rp+=2;
  if(!fs)toast('Meilenstein: '+G.sold+' Produkte verkauft (+2 Forschungspunkte)');
 }
 sb[sc%60]+=value;
 if(item==5)G.pk++;
 ordD(item,q);
 if(!fs)PO.push({x:(q.x+.5)*TS,y:q.y*TS,t:0,v:'+'+value});
 return true;
}
function give(o,d,s,quality=100,jump=null){
 const q=jump||neighbor(o,d);
 if(!q||!ITEMS[s]||siteAt(o.x,o.y)!==siteAt(q.x,q.y))return false;

 const entry=(d+2)%4;
 if(isBelt(q.t)){
  if(beltCount(q)>=beltSize(q.t)||q.r==entry)return false;
  const parcel=[s,quality,entry,G.tk,!!jump];
  if(q.it<0)loadParcel(q,parcel);
  else q.queue.push(parcel);
  return true;
 }
 if(q.j==1){
  if(isBelt(o.t)||q.jm[entry]!=1||q.it>=0)return false;
  q.it=s;q.iq=quality;q.ag=0;q.ein=entry;return true;
 }
 if(q.j==2){
  if(isBelt(o.t)||q.xs[entry]>=0)return false;
  q.xs[entry]=s;q.xq[entry]=quality;q.xa[entry]=0;return true;
 }
 if(q.t=='prj')return prjIn(s);
 if(isStorage(q.t)){
  if(q.q.length>=cap(q))return false;
  q.q.push(s);q.qq.push(quality);record(q,'arrivals');q.activity=G.tk;q.incoming=s;return true;
 }
 if(MD[q.t]?.inspect){
  if(q.it>=0)return false;
  q.it=s;q.iq=quality;q.ag=0;q.mt=G.tk;return true;
 }
 if(typeShip(q.t))return sellProduct(q,s);
 const i=acc2(q,s);
 if(i<0)return false;
 q.iv[i]++;q.ivq[i]+=quality;return true;
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
function tick(){
 G.tk++;
 G.st+=TICK;
 if(!G.late&&G.st>=DAYS*DAYSEC)lateStory();
 const decay=1-TICK/(TAU*KTA);
 for(let i=0;i<ITEMS.length;i++)G.sa[i]=(G.sa[i]||0)*decay;
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
if(isBelt(o.t)){moveBelt(o);continue}
  if(o.j){jtick(o);continue}
  if(terminal(o.t))continue;
  if(isStorage(o.t)){
   const release=o.lv>1?o.q.findIndex((item,i)=>give(o,o.r,item,o.qq[i])):o.q.length&&give(o,o.r,o.q[0],o.qq[0])?0:-1;
   if(release>=0){o.q.splice(release,1);o.qq.splice(release,1);record(o,'moves')}
   o.st=o.q.length>=cap(o)?3:o.q.length?1:2;
   continue;
  }
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
}
function analyze(){
 const phase=PH[G.sp];
 if(phase&&phase.q.every(([,target],i)=>(G.sq[i]||0)>=target))phaseDone();
 fillOrders();recalc();chkAc();progressChecks();bn=null;const ms=L.filter(o=>MD[o.t]&&MD[o.t].o!=null),bad=L.find(o=>o.bad);
 if(bad&&neighbor(bad,beltDirections(bad)[0])){const q=neighbor(bad,beltDirections(bad)[0]),nd=q.t=='prj'?(PH[G.sp]?PH[G.sp].q.filter(a=>(G.sq[PH[G.sp].q.indexOf(a)]||0)<a[1]).map(a=>ITEMS[a[0]].n).join(' / '):''):(MD[q.t].r||[]).map(a=>ITEMS[a[0]].n).join(' + ');bn=q;msg=`Falsches Material: ${MD[q.t].n} bekommt ${ITEMS[bad.it].n}, braucht aber ${nd||'keine Lieferung'}.`;return}
 for(const b of L)if(isBelt(b.t)&&b.wt&&b.it>=0){const q=cell(b.x+DX[b.r],b.y+DY[b.r]),r=q&&MD[q.t]&&MD[q.t].r;if(r&&r.length>1&&acc2(q,b.it)<0){const mi=r.findIndex((a,i)=>q.iv[i]<a[1]);if(mi>=0&&mixed(b,r[mi][0])){bn=q;msg=`${MD[q.t].n} ist verstopft: Das Band liefert nur ${ITEMS[b.it].n}, ${ITEMS[r[mi][0]].n} fehlt. Führe die Materialien über getrennte Bänder zu.`;return}}}
 for(const b of L)if(isBelt(b.t)&&b.wt&&b.it>=0){const q=cell(b.x+DX[b.r],b.y+DY[b.r]);if(q&&q.t=='shp'&&q.lv>1&&dem(b.it)<TH[q.lv-1]){bn=q;msg=`Versand wartet auf bessere Nachfrage: ${ITEMS[b.it].n} aktuell ${Math.round(dem(b.it)*100)} %, Mindestwert ${Math.round(TH[q.lv-1]*100)} %.`;return}}
 const sat=ms.filter(o=>o.ew>.8),stv=ms.filter(o=>MD[o.t].r&&o.es>.2);let c1=null,q1=null;
 for(const q of stv){const U=ups(q);for(const x of sat)if(U.has(x)&&(!c1||MD[x.t].dp>=MD[c1.t].dp)){c1=x;q1=q}}
 if(c1){bn=c1;msg=`Engpass: ${MD[c1.t].n} (Lv ${c1.lv}) ist zu ${Math.round(c1.ew*100)} % ausgelastet, ${MD[q1.t].n} wartet ${Math.round(q1.es*100)} % der Zeit. Upgrade: ${tme(c1).toFixed(1)} s → ${tme(c1,c1.lv+1).toFixed(1)} s`;return}
 const w2=ms.find(o=>MD[o.t].r&&MD[o.t].r.length>1&&o.es>.5&&o.iv.some(v=>v>0));
 if(w2){const r=MD[w2.t].r,mi=r.findIndex((a,i)=>w2.iv[i]<a[1]);if(mi>=0){bn=w2;msg=`${MD[w2.t].n} wartet auf ${ITEMS[r[mi][0]].n} – die Zulieferung ist zu langsam oder unterbrochen.`;return}}
 if(ms.some(o=>!MD[o.t].r&&o.es>.5)&&G.m<3){msg='Kein Geld für Rohstoffe – verkaufe Produkte, um die Produktion fortzusetzen.';return}
 const full=L.find(o=>isStorage(o.t)&&o.q.length>=cap(o));
 if(full){bn=full;msg='Zwischenlager voll: Lager ausbauen oder die Abnahme dahinter beschleunigen.';return}
 const blockedBelt=L.find(o=>isBelt(o.t)&&o.wt&&beltCount(o)==beltSize(o.t));
 if(blockedBelt){bn=blockedBelt;msg='Förderband ausgelastet: Prüfe die Abnahme oder entlaste den Abschnitt mit einem zweiten Band.';return}
 const bl=lossPoint(ms);if(bl){bn=bl.object;msg=`Rückstau bei ${MD[bn.t].n}: bis zu ${bl.margin.toFixed(1)} €/Min. Marge. Abnahme hinter der Maschine prüfen.`;return}
 const mi=ORD.findIndex(t=>!L.some(o=>o.t==t));
 msg=mi>=0?`Tipp: ${MD[ORD[mi]].n} in die Linie bauen – Wert pro Stück bis zu ${ITEMS[mi+1].v} €.`:tipStory()}
function tipStory(){const q=PH[G.sp];if(!q)return'Der Bunker steht! Kaufe Upgrades, erweitere Hallen oder gründe neu.';
 if(!L.some(o=>o.t=='prj'))return`Bunker-Phase ${G.sp+1} „${q.n}“: Baue die Bunker-Rampe (Reiter Logistik) und liefere die Quest-Waren an.`;
 const h=hallOf(q.hall);if(hlv(h.id)<1)return`Bunker-Phase ${G.sp+1} braucht die ${h.n}: Im Menü 🏭 Hallen freischalten (${fm(h.c[0])} €).`;
 const i=q.q.findIndex(([it,n],k)=>(G.sq[k]||0)<n);return i<0?'Phase abgeschlossen!':`Quest: ${ITEMS[q.q[i][0]].n} ${fm(G.sq[i]||0)} / ${fm(q.q[i][1])} – per Band zur Bunker-Rampe.`}
const rate=()=>{const total=sb.reduce((sum,value)=>sum+value,0);return total*60/Math.max(20,rw)};
/* ---- Aufträge (ohne Zeitdruck): Stücke einer Stufe liefern, Bonus bei Abschluss ---- */
const mk=(i,d)=>{const t=PR[i];if(!t||(d||0)>9||!L.some(o=>o.t==t))return false;return(MD[t].r||[]).every(a=>mk(a[0],(d||0)+1))};
function fillOrders(ban){const ok=ITEMS.map((x,i)=>x.oq&&mk(i)?i:-1).filter(i=>i>=0);
 G.od=(G.od||[]).filter(q=>q.d>0||ok.includes(q.s));
 while(G.od.length<OS){let f=ok.filter(i=>!G.od.some(q=>q.s==i)&&i!=ban);if(!f.length)f=ok.filter(i=>!G.od.some(q=>q.s==i));if(!f.length)break;const s=f[(G.ord+G.od.length+Math.floor(G.tk/2400)+(ban||0))%f.length],n=ITEMS[s].oq;G.od.push({s,n,d:0,r:Math.ceil(n*ITEMS[s].v*.8)})}}
const rrLeft=()=>G.rr==null?0:Math.max(0,Math.min(RRC,G.rr+RRC-G.tk)),rrFmt=()=>{const t=Math.ceil(rrLeft()*TICK);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
function rerollOrd(q){if(!q||q.d>0||!G.od.includes(q))return;if(rrLeft()>0){deny('Auftrag tauschen: wieder in '+rrFmt()+' Min.');return}const s=q.s;G.rr=G.tk;G.od=G.od.filter(x=>x!==q);fillOrders(s);sfx('select');sv(0)}
const orderFor=item=>G.od.find(q=>q.s==item&&q.d<q.n);
function ordD(s,ship){
 const result=orderFor(s);
 if(!result)return;
 const q=result;q.d++;if(q.d>=q.n){const rw=Math.round(q.r*RM);G.m+=rw;G.te+=rw;G.tr+=rw;G.ord++;G.ordRun++;G.rp+=3;xp(25);record(ship,'value',rw);sb[sc%60]+=rw;if(!fs){toast('Auftrag erfüllt: +'+fm(rw)+' € und 3 Forschungspunkte');sfx('order')}G.od=G.od.filter(x=>x!=q);fillOrders()}}
/* ---- Kurven: Eingangsseite eines Bands bestimmen, Position eines Stücks auf Gerade/Bogen ---- */
function feed(o){const b=(o.r+2)%4;let sd=-1;for(const d of[b,(o.r+1)%4,(o.r+3)%4]){const q=cell(o.x+DX[d],o.y+DY[d]);if(fdn(q,d)){if(d==b)return b;sd=sd<0?d:-2}}return sd>=0?sd:b}
function itemPos(o){const b=(o.r+2)%4,e=o.ein==null||o.ein==o.r?b:o.ein,R=TS/2,cx=(o.x+.5)*TS,cy=(o.y+.5)*TS;let t=Math.min(1,(o.ag+acc)/beltTime(o.t));if(o.wt)t=Math.min(t,.78);
 if(e==b){const f=-R+t*TS;return[cx+DX[o.r]*f,cy+DY[o.r]*f]}
 const a=t*PI/2,u=R*(1-Math.sin(a)),v=R*(1-Math.cos(a));return[cx+DX[e]*u+DX[o.r]*v,cy+DY[e]*u+DY[o.r]*v]}
/* ---- Speichern ---- */
const cloud={ref:null,uid:null,base:null,status:'guest',pending:null,busy:false,localSaved:true,localKey:null,migrationBlocked:false,localMigrationBlocked:false,last:0,backoff:0,remote:null};
let saveOpen=false, saveAfterTick=false;
const {validSave,revision}=FactoryRuntime;
function readLocal(key){
 try{return JSON.parse(localStorage.getItem(key))}catch{return null}
}
function writeLocal(key,value){
 try{localStorage.setItem(key,JSON.stringify(value));return true}
 catch{return false}
}
function stillSignedIn(){
 return cloud.ref&&typeof OL!='undefined'&&OL.me===cloud.uid;
}
function readCloud(){
 const request=typeof cloud.ref.get=='function'?cloud.ref.get():cloud.ref.once('value');
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Cloud timeout')),4500);
  request.then(value=>{clearTimeout(timer);resolve(value.val())},error=>{clearTimeout(timer);reject(error)});
 });
}
function backupOriginal(save){
 if(!KEY)return true;
 const key=KEY+'.before-v2',previous=readLocal(key);
 if(previous===null)return writeLocal(key,save);
 if(revision(previous)===revision(save))return true;
 const separate=key+'.'+revision(save).replace(/[^a-z0-9-]/gi,'-');
 return readLocal(separate)!==null||writeLocal(separate,save);
}
function applySave(value){
 stQ=[];ff=null;saveAfterTick=false;closeP2();
 const known=validSave(value);
 cloud.migrationBlocked=cloud.localMigrationBlocked||(known&&value.v!==2&&!backupOriginal(value));
 init(known?value:null);
 ready=1;acc=Number.isFinite(value?.carry)?Math.max(0,Math.min(KOF,value.carry)):0;
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
  writeLocal(KEY+'.recovery',local);
  cloud.status='recovered';
 }else cloud.status='synced';
 return remote;
}
function readAccountSave(){
 let raw=null;
 try{raw=localStorage.getItem(KEY)}catch{}
 const current=readLocal(KEY);
 const supported=validSave(current);
 cloud.localMigrationBlocked=supported&&current.v!==2&&!backupOriginal(current);
 if(raw!==null&&(!supported||cloud.localMigrationBlocked)){
  cloud.localKey=KEY+'.compatible';
  const fallback=readLocal(cloud.localKey);
  return validSave(fallback)?fallback:supported?current:null;
 }
 return current;
}
async function loadFactory(){
 const local=readAccountSave();
 if(!stillSignedIn()){applySave(local);return}
 cloud.status='loading';
 try{
  const remote=await readCloud();
  if(!stillSignedIn())return;
  applySave(chooseSave(remote,local,readLocal('2pg_fe_guest')));
 }catch{
  cloud.base=validSave(local)?local.base??(local.rev?revision(local):null):null;
  cloud.status='offline';applySave(local);
 }
}
function snapshot(){
 const ts=Date.now();
 return {
  v:2,ts,rev:ts.toString(36)+'-'+Math.random().toString(36).slice(2,12),base:cloud.base,
  carry:Math.max(0,acc),m:G.m,te:G.te,sold:G.sold,made:G.made,units:G.units,productTracks:G.productTracks,pk:G.pk,cost:G.cost,
  tk:G.tk,ord:G.ord,tr:G.tr,ordRun:G.ordRun,history:G.history,rt:Math.round(rate()*10)/10,
  hl:G.hl,legacyPlots:G.legacyPlots,site:currentSite,sp:G.sp,sq:G.sq.map(v=>v|0),st:G.st,sd:G.sd,sf:G.sf,late:G.late,end:G.end,
  emp:G.emp,mg:G.mg,wc:G.wc,xp:G.xp,pl:G.pl,bt:G.bt,ac:G.ac,bp:G.bp,bpt:G.bpt,pr:G.pr,pu:G.pu,
  tu:G.tu,th:G.th,rp:G.rp,rs:G.rs,ds:G.ds,sa:G.sa,sl:G.sl,pc:G.pc,
  plans:G.plans,epoch:G.epoch,stock:G.stock,activeBoosts:G.activeBoosts,milestones:G.milestones,
  lineCounts:G.lineCounts,recent:G.recent,wins:G.wins,goals:G.goals,contracts:G.contracts,contractWins:G.contractWins,
  supplyOrders:G.supplyOrders,od:G.od.map(q=>[q.s,q.n,q.d,q.r]),rr:G.rr??null,
  o:L.map(o=>[
   o.x,o.y,o.t,o.r,o.lv,o.it,o.iv.length?o.iv:0,o.out,isStorage(o.t)&&o.q.length?o.q:0,
   o.j?(o.j==1?o.jm.join(''):o.xs.join(',')):0,
   {
    up:o.up,spec:o.spec,paused:o.paused,priority:o.priority,control:o.control,credits:o.credits,threshold:o.threshold,
    wk:!!o.wk,p:o.p,supplyItem:o.supplyItem,supplyStock:o.supplyStock,iq:o.iq,oq:o.oq,pq:o.pq,ivq:o.iv.map((n,i)=>n?o.ivq[i]/n:100),
    qq:o.qq,xq:o.xq,ag:o.ag,ein:o.ein,xa:o.xa||[],large:o.base.some(n=>n>1),
    queue:o.queue,beltCarry:o.beltCarry,carryTick:o.carryTick,jumped:o.jumped,sortRule:o.sortRule,smartMode:o.smartMode,stats:o.stats,recent:o.recent
   }
  ])
 };
}
function sv(force){
 if(!ready)return;
 const data=JSON.parse(JSON.stringify(snapshot()));
 cloud.localSaved=writeLocal(cloud.localKey||(cloud.migrationBlocked?KEY+'.compatible':KEY),data);
 if(!cloud.localSaved){
  if(!sv.warned){sv.warned=true;toast('Lokaler Speicher ist voll oder gesperrt.')}
 }
 if(!stillSignedIn()||cloud.migrationBlocked)return;
 cloud.pending=data;
 if(cloud.status!='conflict'&&cloud.status!='invalid'){
  if(cloud.status!='offline'&&cloud.status!='recovered')cloud.status='pending';
  if(force||Date.now()-cloud.last>=20000)flushCloud(force);
 }
}
async function flushCloud(force=false){
 const data=cloud.pending;
 if(!data||cloud.busy||!stillSignedIn()||cloud.status=='conflict'||cloud.status=='invalid'||!force&&Date.now()<cloud.backoff)return;
 cloud.last=Date.now();cloud.busy=true;
 try{
  if(cloud.base==null){
   const remote=await readCloud();
   if(revision(remote)!==''){
    cloud.remote=remote;cloud.status=validSave(remote)?'conflict':'invalid';return;
   }
   cloud.base='';
  }
  if(!stillSignedIn())return;
  const expected=cloud.base;
  const saved=await cloud.ref.transaction(current=>{
   if(revision(current)===expected||revision(current)===data.rev)return {...data,base:expected};
   if(current==null&&expected!=='')return null;
   return undefined;
  },undefined,false);
  const remote=saved.snapshot.val();
  if(!saved.committed||revision(remote)!==data.rev){
   cloud.remote=remote;cloud.status='conflict';return;
  }
  cloud.base=data.rev;cloud.backoff=0;
  if(cloud.pending===data){
   cloud.pending=null;cloud.status='synced';writeLocal(cloud.localKey||KEY,{...data,base:data.rev});
  }else cloud.status='pending';
 }catch{
  cloud.status='offline';cloud.backoff=Date.now()+15000;
 }finally{cloud.busy=false}
}
function takeCloudSave(){
 if(cloud.status!='conflict'||!validSave(cloud.remote)||!stillSignedIn())return;
 const remote=cloud.remote;
 if(!writeLocal(KEY+'.recovery',cloud.pending||snapshot())){
  toast('Lokale Sicherung fehlgeschlagen. Beide Spielstände bleiben verfügbar.');return;
 }
 writeLocal(cloud.localKey||KEY,remote);
 cloud.base=revision(remote);cloud.remote=null;cloud.pending=null;cloud.status='recovered';saveOpen=false;
 applySave(remote);
}
function keepLocalSave(){
 if(cloud.status!='conflict'||!validSave(cloud.remote)||!stillSignedIn())return;
 if(!writeLocal(KEY+'.cloud-backup',cloud.remote)){
  toast('Sicherung des bisherigen Cloud-Stands fehlgeschlagen.');return;
 }
 cloud.base=revision(cloud.remote);cloud.remote=null;cloud.status='pending';saveOpen=false;sv(true);
}
let confirmLocal=false;
async function restoreLocalBackup(){
 const local=readLocal(KEY+'.recovery');
 if(!validSave(local)||cloud.busy)return;
 if(!stillSignedIn()){
  writeLocal(KEY+'.recovery',snapshot());
  applySave(local);sv(false);saveOpen=false;return;
 }
 cloud.busy=true;
 try{
  const remote=await readCloud();
  if(!stillSignedIn())return;
  if(!validSave(remote)){toast('Kein gültiger Cloud-Stand zum Vergleich verfügbar.');return}
  cloud.remote=remote;cloud.status='conflict';cloud.pending=local;confirmLocal=false;
  applySave(local);saveOpen=true;
 }catch{toast('Cloud nicht erreichbar. Die lokale Sicherung bleibt gespeichert.')}
 finally{cloud.busy=false}
}
function savePanel(){
 const [X,Y,W,H]=MENUS.save.box;
 pnlBox(X,Y,W,H,'Spielstand',()=>{saveOpen=false;confirmLocal=false});
 const labels={
  guest:'Lokaler Gast-Spielstand',pending:'Lokal gesichert · wartet auf Cloud-Bestätigung',synced:'Letzter Spielstand in der Cloud bestätigt',
  offline:'Cloud nicht erreichbar · lokale Sicherung und automatische Wiederholung',recovered:'Cloud geladen · abweichender lokaler Stand wurde separat gesichert',
  conflict:'Cloud-Konflikt · ein anderes Gerät hat seit deinem letzten Abgleich gespeichert',invalid:'Cloud-Spielstand hat ein unbekanntes Format · lokaler Stand ist aktiv',loading:'Cloud wird geladen',local:'Lokaler Spielstand ist aktiv'
 };
 tx(labels[cloud.status],X+20,Y+61,13,'#cbd5e1');
 if(!cloud.localSaved)tx('Lokale Speicherung ist derzeit nicht verfügbar.',X+20,Y+78,10.5,'#fca5a5');
 else if(cloud.migrationBlocked||cloud.localKey)tx('Der ursprüngliche Spielstand bleibt separat erhalten.',X+20,Y+78,10.5,'#fde68a');
 if(cloud.status=='conflict'&&validSave(cloud.remote)){
  const remote=cloud.remote;
  tx('Cloud · '+fmtSaveDate(remote.ts)+' · '+fm(remote.m)+' €',X+20,Y+95,12,'#fde68a');
  tx('Dieses Gerät · '+fm(G.m)+' €',X+20,Y+121,12,'#fde68a');
  btn(X+20,Y+144,250,35,takeCloudSave,'#2f6d54');
  tx('Cloud laden · lokale Sicherung behalten',X+145,Y+166,11,'#fff','center',700);
  btn(X+283,Y+144,350,35,()=>{if(confirmLocal){confirmLocal=false;keepLocalSave()}else confirmLocal=true},confirmLocal?'#92400e':'#334155');
  tx(confirmLocal?'Lokalen Stand in der Cloud speichern? Bestätigen':'Lokalen Stand auswählen',X+458,Y+166,11,'#fff','center',700);
 }else if(cloud.status=='offline'||cloud.status=='pending'||cloud.status=='local'){
  btn(X+20,Y+86,178,34,()=>sv(true),'#334155');tx('Jetzt synchronisieren',X+109,Y+108,11,'#fff','center',700);
 }
 const backup=readLocal(KEY+'.recovery');
 if(validSave(backup)){
  tx('Wiederherstellungspunkt · '+fmtSaveDate(backup.ts)+' · '+fm(backup.m)+' €',X+20,Y+211,11,'#cbd5e1');
  btn(X+399,Y+190,234,30,restoreLocalBackup,'#334155');
  tx('Lokale Sicherung öffnen',X+516,Y+210,11,'#fff','center',700);
 }
}
function offlineStart(seconds){
 return {money:G.m,revenue:G.te,cost:G.cost+G.wc,sales:G.sold,units:G.units,orders:G.ord,
  milestones:Object.values(G.milestones).reduce((sum,n)=>sum+n,0),made:{...G.pc},sold:G.sl.slice(),
  seconds,simulated:acc,n:Math.max(1,Math.floor(acc/TICK))};
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
 const title=report.seconds>120?'Du warst '+duration(report.seconds)+' offline.':'Ausstehende Fortschritte wurden nachgeholt.';
 showOv(`<div class="fe-offline-report"><div class="kick">Offline-Produktion</div><h2>Willkommen zurück in deiner Fabrik</h2>
  <p>${title} Simuliert: ${duration(report.simulated)}.</p>
  <p style="font-size:27px;font-weight:800">${delta>=0?'+':'−'}${fm(Math.abs(delta))} € Kontostand</p>
  <p>+ ${fm(G.te-report.revenue)} € Einnahmen · − ${fm(G.cost+G.wc-report.cost)} € Material und Löhne</p>
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
function bchk(x,y,t){if(MD[t]?.unlock&&!MD[t].unlock())return MD[t].need+'.';if(x<0||y<0||x>=GW||y>=GH)return'Außerhalb der Karte.';const h=areaAt(x,y),m=MD[t],site=siteAt(x,y);
 if(!site)return 'Zwischen den Standorten kann nicht gebaut werden.';
 const previousPlot=legacyPlots.find(plot=>G.legacyPlots.includes(plot.id)&&inR(plot.rect,x,y));
 if(previousPlot&&(!m?.a||m.a==='gar'||m.a==='met'&&RH('met')||m.a==='elk'&&previousPlot.id==='e'))return '';
 if(site.hall&&!hlv(site.hall))return 'LOCK:'+site.hall;
 if(h){if(hlv(h.id)<1)return'LOCK:'+h.id;if(m&&m.a&&m.a!=h.id&&!h.allow?.includes(m.a))return'Nur in der '+hallOf(m.a).n+' baubar.';return''}
 if(inR(SITE,x,y))return'Das ist die Bunker-Baustelle – liefere mit der Bunker-Rampe an.';
 if(isBelt(t)||(m&&(m.g=='l'||m.g=='u'&&!m.a)))return'';return'Maschinen brauchen eine Halle – auf dem Werkshof gehen nur Bänder, Verteiler, Lager, Versand und Bunker-Rampe.'}
function lockHit(e){hsel=e.slice(5);if(hallOf(hsel)?.site){closeP2();growthOpen=true;growthTab=0;return}hlO=true;mkO=rsO=pnO=acO=bkO=false;deny('Diese Halle ist noch gesperrt – hier kannst du sie freischalten.')}
function placement(o,x=o.x,y=o.y,r=o.r,ignore=new Set()){
 const occupied=footprint(o,x,y,r);
 const startingHall=areaAt(x,y);
 for(const [u,v] of occupied){
  const error=bchk(u,v,o.t);
  if(error)return error;
  if(occupied.length>1&&areaAt(u,v)!==startingHall)return 'Gebäude brauchen eine zusammenhängende Fläche.';
  const existing=cell(u,v);
  if(existing&&!ignore.has(existing))return 'Dieses Feld ist belegt.';
 }
 return '';
}
function constructionError(message){
 if(message.startsWith('LOCK:'))lockHit(message);
 else deny(message);
}
function addBuild(x,y,t,r,base=defaultSize(t)){
 const o=put(x,y,t,r,1,base);
 o.bt=0;G.pl++;
 if(!G.bt.includes(t)){G.bt.push(t);xp(15)}
 return o;
}
function place(x,y,t,r){
 if(MD[t]?.legacyOnly)return false;
 const existing=cell(x,y),shape={t,x,y,r,base:defaultSize(t)};
 if(isBelt(t)&&existing?.t==t)return rotObj(existing,r);
 const error=placement(shape);
 if(error){constructionError(error);return false}
 const cost=cst(t);
 if(G.m<cost){deny('Nicht genug Geld.');return false}
 G.m-=cost;addBuild(x,y,t,r);
 PO.push({x:(x+.5)*TS,y:y*TS,t:0,v:'-'+cost,n:1});
 sfx(isBelt(t)?'belt':'place');analyze();sv(0);return true;
}
const hReq=h=>h.site?REGIONS.find(site=>site.id==h.site).open():G.sp>=h.ph,hNext=h=>hlv(h.id)<h.rc.length?h.c[hlv(h.id)]:0;
function buyHall(h){const l=hlv(h.id);if(l>=h.rc.length){deny('Diese Halle hat ihre maximale Größe.');return}
 if(!hReq(h)&&h.site){deny(REGIONS.find(site=>site.id==h.site).need);return}
 if(!hReq(h)){deny('Gesperrt: Erst Bunker-Phase '+h.ph+' ('+PH[h.ph-1].n+') abschließen.');return}
 if(G.m<h.c[l]){deny('Nicht genug Geld.');return}G.m-=h.c[l];G.hl[h.id]=l+1;afl[h.id]=1;xp(l?40:90);sfx('unlock');
 toast(l?h.n+' erweitert: jetzt '+hSize(h)+' Felder!':h.n+' freigeschaltet!');sv(1);analyze()}
function delAt(a,b){const o=cell(a,b);if(!o)return false;const v=Math.floor(cst(o.t)/2);G.m+=v;PO.push({x:(a+.5)*TS,y:b*TS,t:0,v:'+'+v});if(mvO==o)mvO=null;for(const m of G.mg)if(m.x==o.x&&m.y==o.y){m.x=-1;m.y=-1}del(o);sfx('remove');return true}
function sellAll(){let v=0;for(const o of L)v+=Math.floor(cst(o.t)/2);for(const m of G.mg){m.x=-1;m.y=-1}G.m+=v;L=[];g=[];resetPlanning();sel=null;mvO=null;delAsk=0;PO.push({x:cam.x,y:cam.y,t:0,v:'+'+fm(v)});sfx('remove');toast('Alles verkauft: +'+fm(v)+' €');recalc();analyze();sv(1)}
function moveObj(o,x,y){
 const error=placement(o,x,y,o.r,new Set([o]));
 if(error){constructionError(error);return false}
 relocate([{o,x,y}]);return true;
}
function relocate(positions){
 const positionsByObject=new Map(positions.map(row=>[row.o,row]));
 for(const manager of G.mg){
  const move=positionsByObject.get(cell(manager.x,manager.y));
  if(move){manager.x=move.x;manager.y=move.y}
 }
 for(const {o} of positions)mapObject(o,null);
 for(const {o,x,y} of positions){o.x=x;o.y=y;o.bt=0;mapObject(o,o)}
 sfx('place');analyze();sv(0);
}
function plan(o){let n=0,tot=0,l=o.lv;const w=QT[qi];while(l<60&&(w?n<w:tot+uc(o,l)<=G.m||n<1)){tot+=uc(o,l);l++;n++}return{n,tot}}
function buy(o){const p=plan(o);if(!p.n||G.m<p.tot){deny('Nicht genug Geld.');return}G.m-=p.tot;o.lv+=p.n;o.fl=1;sfx('upgrade');sv(0);analyze()}
const tileAt=(x,y)=>viewToWorld(x,y).map(n=>Math.floor(n/TS));
let lastCameraMotion=-Infinity;
function clampCam(){
 cam.x=Math.max(0,Math.min(GW*TS,cam.x));
 cam.y=Math.max(0,Math.min(GH*TS,cam.y));
}
function zoomAt(factor,x,y,previousX=x,previousY=y){
 if(![factor,x,y,previousX,previousY].every(Number.isFinite)||factor<=0)return false;
 const [worldX,worldY]=viewToWorld(previousX,previousY);
 const nextZ=Math.max(.22,Math.min(2.6,cam.z*factor));
 const zoom=nextZ*view.worldScale,nextX=worldX-(x-CX)/zoom,nextY=worldY-(y-CY)/zoom;
 if(!Number.isFinite(nextX)||!Number.isFinite(nextY))return false;
 if(cam.x!==nextX||cam.y!==nextY||cam.z!==nextZ)lastCameraMotion=tm;
 cam={x:nextX,y:nextY,z:nextZ};
 clampCam();
 hv=null;
 return true;
}
function wh(event){
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
const {rr,tx,sh,di,dart,industrialFloor}=createFactoryDrawing(c,ITEMS,MD,()=>tm,canvasScope);
function dm(o,wk){
 const k=MD[o.t].k,h=TS/2,w=wk&&o.st==1;
 if(MD[o.t].j){dj(o);return}
 c.fillStyle='#0004';c.beginPath();c.roundRect(-h+4,-h+6,TS-6,TS-6,9);c.fill();
 const gr=c.createLinearGradient(0,-h,0,h);gr.addColorStop(0,sh(k,.35));gr.addColorStop(1,sh(k,-.3));c.fillStyle=gr;c.beginPath();c.roundRect(-h+2,-h+2,TS-4,TS-6,9);c.fill();
 c.strokeStyle='#ffffff55';c.lineWidth=1.5;c.beginPath();c.roundRect(-h+3,-h+3,TS-6,TS-8,8);c.stroke();
 saveCanvas();const t=o.t;
 if(t=='src'){c.fillStyle='#c9985a';c.strokeStyle='#6b4220';c.lineWidth=1.5;[[-8,5],[8,5],[0,-7]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,7.5,0,PI*2);c.fill();c.stroke();c.beginPath();c.arc(x,y,3.5,0,PI*2);c.stroke()})}
 else if(t=='saw'){c.translate(0,0);c.rotate(tm*(w?14:1));c.fillStyle='#e3e8ee';c.beginPath();for(let i=0;i<24;i++){const a=i*PI/12,r=i%2?11:15;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath();c.fill();c.fillStyle='#4a525d';c.beginPath();c.arc(0,0,3.5,0,PI*2);c.fill()}
 else if(t=='frm'){const e=w?(Math.sin(tm*8)*.5+.5)*9:0;c.fillStyle='#2f3640';c.fillRect(-14,9,28,6);c.fillStyle='#cfd6de';c.fillRect(-4,-17+e,8,14);c.fillStyle='#8d97a4';c.fillRect(-11,-4+e,22,7)}
 else if(t=='asm'){const a=w?Math.sin(tm*3)*.9-.4:-.5;c.fillStyle='#2f3640';c.beginPath();c.arc(0,10,6,0,PI*2);c.fill();c.strokeStyle='#eef1f5';c.lineWidth=4;c.lineCap='round';const x1=Math.sin(a)*13,y1=10-Math.cos(a)*13,b=a+1+(w?Math.sin(tm*5)*.4:0);c.beginPath();c.moveTo(0,10);c.lineTo(x1,y1);c.lineTo(x1+Math.sin(b)*9,y1-Math.cos(b)*9);c.stroke();c.lineCap='butt'}
 else if(t=='pnt'){c.fillStyle='#f4f6f8';c.beginPath();c.roundRect(-14,-13,15,22,4);c.fill();c.fillStyle='#d5503c';c.fillRect(-14,-3,15,5);c.strokeStyle='#cfd6de';c.lineWidth=3;c.beginPath();c.moveTo(1,-4);c.lineTo(12,-2);c.stroke();if(w){c.fillStyle='#e0533d';for(let i=0;i<5;i++){c.globalAlpha=.8-i*.15;c.beginPath();c.arc(14+i*2.4,-2+Math.sin(tm*20+i)*2,1.6+i*.5,0,PI*2);c.fill()}c.globalAlpha=1}}
 else if(t=='pck'){const f=w?Math.min(1,(o.p||0)/MD[t].w):1;c.fillStyle='#c79a63';c.fillRect(-11,-8,22,17);c.fillStyle='#e8d7a8';if(f>.8)c.fillRect(-2,-8,4,17);if(w&&f<.67){saveCanvas();c.translate(-8+Math.min(1,f*3)*8,0);c.scale(.7,.7);di(4);restoreCanvas()}c.fillStyle='#dcb177';[[-11,-2],[11,2]].forEach(([x,d])=>{c.beginPath();c.moveTo(x,-8);c.lineTo(x+d*4.5,-8);c.lineTo(x+d*2.2,-8-9*(1-f));c.fill()})}
 else if(t=='ers'){c.fillStyle='#8c9aa8';c.strokeStyle='#3b4652';c.lineWidth=1.5;[[-9,5],[8,6],[0,-6]].forEach(([x,y])=>{c.beginPath();c.moveTo(x-8,y+5);c.lineTo(x-5,y-6);c.lineTo(x+3,y-8);c.lineTo(x+9,y-1);c.lineTo(x+7,y+6);c.closePath();c.fill();c.stroke()});c.fillStyle='#d9c27a';c.fillRect(-3,-8,3,2);c.fillRect(6,3,3,2)}
 else if(t=='sme'){const f=w?Math.sin(tm*9)*.5+.5:.2;c.fillStyle='#2f3640';c.fillRect(-9,-17,8,8);c.fillStyle='#4a525d';c.beginPath();c.roundRect(-14,-9,28,22,6);c.fill();c.fillStyle='#ff8a2b';c.beginPath();c.ellipse(0,3,8,6+f*2,0,0,PI*2);c.fill();c.fillStyle='#ffd23f';c.beginPath();c.ellipse(0,4,4,3+f*2,0,0,PI*2);c.fill();if(w){c.fillStyle='#ffffff55';c.beginPath();c.arc(-5+Math.sin(tm*3)*2,-20-((tm*14)%8),2.2,0,PI*2);c.fill()}}
 else if(t=='mil'){const x=w?Math.sin(tm*3)*6:0;c.fillStyle='#2f3640';c.fillRect(-14,9,28,6);c.fillStyle='#cfd6de';c.fillRect(x-2,-16,4,12);saveCanvas();c.translate(x,-3);c.rotate(tm*(w?20:0));c.fillStyle='#e3e8ee';for(let i=0;i<4;i++){c.rotate(PI/2);c.fillRect(-1,-8,2,8)}restoreCanvas();c.fillStyle='#8d97a4';c.fillRect(-8,5,16,4)}
 else if(t=='wrk'){const a=w?Math.sin(tm*8)*.7:-.4;c.fillStyle='#2f3640';c.beginPath();c.moveTo(-12,12);c.lineTo(-8,3);c.lineTo(8,3);c.lineTo(12,12);c.closePath();c.fill();c.fillStyle='#6b7480';c.fillRect(-10,-1,20,4);saveCanvas();c.translate(10,-12);c.rotate(a);c.fillStyle='#b57b43';c.fillRect(-2,0,4,16);c.fillStyle='#8d97a4';c.fillRect(-7,-4,14,6);restoreCanvas();if(w&&a>.5){c.fillStyle='#ffd23f';[[-6,-3],[2,-5],[-1,-8]].forEach(([x,y])=>c.fillRect(x,y,2,2))}}
 else if(t=='gra'){c.fillStyle='#e8eef5';c.beginPath();c.moveTo(-14,-14);c.lineTo(14,-14);c.lineTo(5,2);c.lineTo(-5,2);c.closePath();c.fill();c.fillStyle='#9fb3c8';c.fillRect(-3,2,6,8);c.fillStyle='#6fd0d8';[[-9,-10],[-3,-10],[4,-10],[10,-10],[-6,-5],[0,-5],[6,-5],[-2,-1]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,2.1,0,PI*2);c.fill()});if(w){const d=(tm*18)%9;c.beginPath();c.arc(0,9+d,1.8,0,PI*2);c.fill()}}
 else if(t=='inj'){const m=w?(Math.sin(tm*6)*.5+.5)*5:0;c.fillStyle='#2f3640';c.fillRect(-15,10,30,5);c.fillStyle='#cfd6de';c.fillRect(-14+m,-11,10,20);c.fillRect(4-m,-11,10,20);c.fillStyle='#8d97a4';c.fillRect(-6+m,-11,2,20);c.fillRect(4-m,-11,2,20);c.fillStyle='#f08a2b';c.fillRect(-2,-17,4,7);if(w){c.fillStyle='#ffb347';c.fillRect(-3.5+m*.6,-2,7-m*1.2,6)}}
 else if(t=='pcb'){c.fillStyle='#1f7a4d';c.beginPath();c.roundRect(-14,-11,28,22,3);c.fill();c.strokeStyle='#d9b24a';c.lineWidth=1.2;c.beginPath();c.moveTo(-11,-6);c.lineTo(-2,-6);c.lineTo(2,-2);c.lineTo(11,-2);c.moveTo(-11,4);c.lineTo(0,4);c.lineTo(4,8);c.lineTo(11,8);c.stroke();c.fillStyle='#22262d';c.fillRect(-7,-2,8,6);c.fillStyle='#d9b24a';for(let i=0;i<3;i++){c.fillRect(-8.5,-1+i*2.5,1.3,1.3);c.fillRect(1.3,-1+i*2.5,1.3,1.3)}if(w){const lx=-12+((tm*30)%24);c.fillStyle='#ff4d4d';c.shadowColor='#ff4d4d';c.shadowBlur=6;c.fillRect(lx,-11,1.6,22);c.shadowBlur=0}}
 else if(t=='ele'){const a=w?Math.sin(tm*4)*.8-.2:-.3;c.fillStyle='#2f3640';c.fillRect(-14,9,28,5);c.fillStyle='#10151c';c.beginPath();c.roundRect(-14,-15,11,19,2);c.fill();c.fillStyle=w?'#5ad1ff':'#2a5a70';c.fillRect(-12.5,-13.5,8,13);c.strokeStyle='#eef1f5';c.lineWidth=3.2;c.lineCap='round';const ex=8+Math.sin(a)*10,ey=9-Math.cos(a)*10,tx2=ex-8*Math.cos(a)-2,ty2=ey-8*Math.sin(a)*.4-5;c.beginPath();c.moveTo(8,9);c.lineTo(ex,ey);c.lineTo(tx2,ty2);c.stroke();c.lineCap='butt';c.fillStyle='#d9b24a';c.fillRect(tx2-2.5,ty2-2.5,5,5)}
 else if(isStorage(t)){const qq=o.q||[],n=Math.ceil(qq.length/cap(o)*6);for(let i=0;i<6;i++){const x=-13+(i%3)*9.5,y=-12+Math.floor(i/3)*12;c.fillStyle=i<n?'#c79a63':'#0004';c.fillRect(x,y,8.5,10);if(i<n){c.fillStyle='#e8d7a8';c.fillRect(x+3.2,y,2,10)}}if(o.incoming!=null&&G.tk-o.activity<6){saveCanvas();c.translate(11-(G.tk-o.activity)*2,-5);c.scale(.65,.65);di(o.incoming);restoreCanvas()}
 tx(qq.length+'/'+cap(o),0,17,8,'#fff','center',700)}
 else if(t=='prj'){dprj(o,w)}else if(MD[t].art){
  dart(o,w);
  if((MD[t].inspect||MD[t].sortStation)&&o.it>=0){
   const ratio=Math.min(1,(o.ag||0)/(MD[t].inspect?.5:beltTime(t)));
   saveCanvas();c.translate(-8+16*ratio,5);c.scale(.66,.66);di(o.it);restoreCanvas();
  }
 }else{c.fillStyle='#24774a';c.fillRect(-13,-9,26,18);c.strokeStyle='#ffffff55';c.lineWidth=1;for(let i=-6;i<9;i+=4){c.beginPath();c.moveTo(-13,i);c.lineTo(13,i);c.stroke()}c.fillStyle='#fff';c.beginPath();c.moveTo(11,0);c.lineTo(3,-6);c.lineTo(3,6);c.fill()}
 restoreCanvas();
 c.fillStyle=o.t=='shp'||o.t=='prj'?'#4ade80':['','#4ade80','#facc15','#ef4444'][o.st]||'#888';if(w){c.shadowColor=c.fillStyle;c.shadowBlur=8}c.beginPath();c.arc(h-8,-h+8,3.2,0,PI*2);c.fill();c.shadowBlur=0;
 if(!terminal(o.t)){saveCanvas();c.rotate(o.r*PI/2);c.fillStyle='#ffd23f';c.beginPath();c.moveTo(h-1,0);c.lineTo(h-9,-6);c.lineTo(h-9,6);c.fill();restoreCanvas()}
 if(o.mg){c.fillStyle='#fde68a';c.strokeStyle='#7c5a00';c.lineWidth=1;c.beginPath();c.arc(-h+9,-h+9,5.5,0,PI*2);c.fill();c.stroke();tx('M',-h+9,-h+12.5,8,'#5b3d00','center',800)}
 if(o.lv>1&&o.t!='shp'&&o.t!='prj')tx('L'+o.lv,-h+5,h-6,9,'#fff','left',800)}
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
function dj(o){const h=TS/2,jm=o.jm||jpre(o.t,o.r||0);c.fillStyle='#0004';c.beginPath();c.roundRect(-h+4,-h+6,TS-6,TS-6,8);c.fill();
 const gr=c.createLinearGradient(0,-h,0,h);gr.addColorStop(0,'#5f6773');gr.addColorStop(1,'#3a414c');c.fillStyle=gr;c.beginPath();c.roundRect(-h+2,-h+2,TS-4,TS-6,8);c.fill();c.strokeStyle='#8b94a1';c.lineWidth=1.5;c.beginPath();c.roundRect(-h+3,-h+3,TS-6,TS-8,7);c.stroke();
 if(o.j==2){c.fillStyle='#262b33';c.fillRect(-h+2,-6,TS-4,12);c.fillRect(-6,-h+2,12,TS-6);c.fillStyle='#8b94a1';c.beginPath();c.roundRect(-9,-9,18,18,4);c.fill();c.strokeStyle='#ffd23f';c.lineWidth=1.8;c.beginPath();c.moveTo(-15,0);c.lineTo(15,0);c.moveTo(0,-15);c.lineTo(0,15);c.stroke();c.fillStyle='#ffd23f';for(let d=0;d<4;d++){saveCanvas();c.rotate(d*PI/2);c.beginPath();c.moveTo(h-3,0);c.lineTo(h-9,-4);c.lineTo(h-9,4);c.fill();restoreCanvas()}
  if(o.xs)for(let sd=0;sd<4;sd++)if(o.xs[sd]>=0){const f=Math.min(1,o.xa[sd]/BTv);ico(o.xs[sd],DX[sd]*8*(1-2*f),DY[sd]*8*(1-2*f),.7)}}
 else{for(let d=0;d<4;d++){if(!jm[d])continue;saveCanvas();c.rotate(d*PI/2);c.fillStyle='#262b33';c.fillRect(4,-6,h-5,12);c.fillStyle=jm[d]==1?'#4ade80':'#fb923c';c.beginPath();if(jm[d]==1){c.moveTo(11,0);c.lineTo(h-4,-6);c.lineTo(h-4,6)}else{c.moveTo(h-3,0);c.lineTo(11,-6);c.lineTo(11,6)}c.fill();restoreCanvas()}
  c.fillStyle='#8b94a1';c.beginPath();c.arc(0,0,7,0,PI*2);c.fill();c.fillStyle=o.t=='fus'?'#4ade80':'#fb923c';c.beginPath();c.arc(0,0,3,0,PI*2);c.fill();if(o.it>=0)ico(o.it,0,0,.78)}
 if(o.st==3){c.fillStyle='#ef4444';c.beginPath();c.arc(h-8,-h+8,3.2,0,PI*2);c.fill()}}
function dprj(o,w){c.fillStyle='#1b1e23';c.beginPath();c.roundRect(-14,-13,28,25,3);c.fill();c.fillStyle='#b89b2e';c.fillRect(-14,-13,28,5);c.fillStyle='#10151c';for(let i=-14;i<14;i+=8){c.beginPath();c.moveTo(i,-13);c.lineTo(i+4,-13);c.lineTo(i+8,-8);c.lineTo(i+4,-8);c.closePath();c.fill()}
 c.fillStyle='#5a6270';c.fillRect(-10,-5,20,15);c.strokeStyle='#ffd23f';c.lineWidth=1.2;c.strokeRect(-10,-5,20,15);c.beginPath();c.moveTo(0,-5);c.lineTo(0,10);c.stroke();
 const q=PH[G.sp];if(q){const i=q.q.findIndex(([it,n],k)=>(G.sq[k]||0)<n);if(i>=0)ico(q.q[i][0],0,3,.62)}else tx('✓',0,8,14,'#86efac','center',800)}
function dSite(){const[a,b,e,f]=SITE,x0=a*TS,y0=b*TS,w=(e-a+1)*TS,h=(f-b+1)*TS,pg=bProg(),st=G.sp>=PH.length?8:G.sp,fr=G.sp<PH.length?PH[G.sp].q.reduce((s,[it,n],i)=>s+Math.min(1,(G.sq[i]||0)/n),0)/PH[G.sp].q.length:1;
 c.fillStyle='#0005';c.fillRect(x0+6,y0+8,w,h);c.fillStyle='#6b5a46';c.fillRect(x0,y0,w,h);c.fillStyle='#5a4a38';for(let i=0;i<46;i++){c.fillRect(x0+((i*97)%w),y0+((i*61)%h),5+i%4*3,3)}
 const px=x0+TS,py=y0+TS*2.6,pw=w-TS*2,ph=h-TS*4.2;
 if(st>=0){c.fillStyle='#3d3225';c.fillRect(px,py,pw,ph);c.strokeStyle='#00000055';c.lineWidth=2;c.strokeRect(px,py,pw,ph)}
 if(st>=1||st==0&&fr>.3){c.fillStyle='#9aa0a8';c.fillRect(px+6,py+ph-34,pw-12,28);c.strokeStyle='#6b7380';c.lineWidth=1;for(let i=0;i<8;i++){c.beginPath();c.moveTo(px+6+i*(pw-12)/8,py+ph-34);c.lineTo(px+6+i*(pw-12)/8,py+ph-6);c.stroke()}}
 if(st>=2||st==1&&fr>.3){const k=st>=2?1:fr;c.fillStyle='#8a909a';c.fillRect(px+6,py+ph-34-(ph-60)*k,14,(ph-60)*k+28);c.fillRect(px+pw-20,py+ph-34-(ph-60)*k,14,(ph-60)*k+28);c.fillStyle='#b8bec6';c.fillRect(px+6,py+ph-34-(ph-60)*k,pw-12,10)}
 if(st>=3){c.fillStyle='#707782';c.fillRect(px+20,py+30,pw-40,ph-64);c.strokeStyle='#4a525d';c.lineWidth=2;for(let i=0;i<5;i++)for(let j=0;j<3;j++)c.strokeRect(px+28+i*((pw-56)/5),py+40+j*((ph-84)/3),(pw-56)/5-8,(ph-84)/3-8)}
 if(st>=4){c.fillStyle='#2f3640';c.fillRect(px+pw/2-26,py+ph-62,52,56);c.strokeStyle=st>=7?'#4ade80':'#ffd23f';c.lineWidth=3;c.strokeRect(px+pw/2-26,py+ph-62,52,56);c.fillStyle=st>=7?'#4ade80':'#ffd23f';c.beginPath();c.arc(px+pw/2,py+ph-34,8,0,PI*2);c.fill()}
 if(st>=5){c.fillStyle='#2f5f9a';for(let i=0;i<3;i++)c.fillRect(px+30+i*34,py+8,28,16);c.fillStyle='#8d97a4';c.fillRect(px+pw-44,py-10,10,34);c.fillRect(px+pw-26,py-4,10,28)}
 if(st>=6){c.fillStyle='#454b55';c.fillRect(x0,y0+h-TS*1.1,w,TS*.8);c.fillStyle='#ffd23f88';for(let i=0;i<w/34;i++)c.fillRect(x0+6+i*34,y0+h-TS*.75,18,3)}
 if(st>=8){c.fillStyle='#4ade8033';c.fillRect(px,py,pw,ph);c.fillStyle='#fff';c.fillRect(px+pw/2+30,py-34,2,34);c.fillStyle='#4ade80';c.beginPath();c.moveTo(px+pw/2+32,py-34);c.lineTo(px+pw/2+54,py-27);c.lineTo(px+pw/2+32,py-20);c.fill()}
 else{const cx=x0+w-TS*1.4,sw=Math.sin(tm*.7)*.12;saveCanvas();c.translate(cx,y0+TS*2.2);c.strokeStyle='#e8b923';c.lineWidth=4;c.beginPath();c.moveTo(0,0);c.lineTo(0,-90);c.stroke();c.rotate(sw);c.beginPath();c.moveTo(-70,-90);c.lineTo(34,-90);c.stroke();c.lineWidth=1.5;c.beginPath();c.moveTo(-60,-90);c.lineTo(-60,-60+Math.sin(tm)*6);c.stroke();c.fillStyle='#e8b923';c.fillRect(-66,-60+Math.sin(tm)*6,12,8);restoreCanvas()}
 c.strokeStyle='#e8b923';c.lineWidth=3;c.setLineDash([12,8]);c.strokeRect(x0+8,y0+8,w-16,h-16);c.setLineDash([]);
 tx('BUNKER „ARCHE“',x0+w/2,y0+30,15,'#f1e3b0','center',800);tx(st>=8?'FERTIGGESTELLT':'Bauabschnitt '+(st+1)+' von '+PH.length+' · '+Math.round(pg*100)+' %',x0+w/2,y0+h-12,12,'#f1e3b0','center',700)}
function ghost(t,r,x,y,ok,base=defaultSize(t)){const [w,h]=dimensions({r,base});c.globalAlpha=.62;saveCanvas();c.translate((x+w/2)*TS,(y+h/2)*TS);c.scale(w,h);if(isBelt(t)&&!MD[t]?.sortStation){c.rotate(r*PI/2);c.fillStyle='#2b2f36';c.fillRect(-TS/2,-TS/2+5,TS,TS-10);c.fillStyle='#ffd23f';c.beginPath();c.moveTo(10,0);c.lineTo(-4,-9);c.lineTo(-4,9);c.fill()}else dm({t,r,lv:1,st:0});restoreCanvas();c.fillStyle=ok?'#22c55e55':'#ef444466';c.fillRect(x*TS,y*TS,w*TS,h*TS);c.globalAlpha=1}
const traffic=new Map();
const floorRoute=(start,finish,hall)=>FactoryGrid.floorRoute(start,finish,GW,(x,y)=>inR(hrect(hall),x,y)&&!cell(x,y));
function freeSide(o,hall){
 return [3,1,2,0].map(d=>port(o,d)).find(([x,y])=>inR(hrect(hall),x,y)&&!cell(x,y));
}
function factoryTraffic(visible,canPlan){
 const {p,q,l}=G.emp,workers=Math.min(5,p+q+l);
 const site=REGIONS.find(r=>r.id==currentSite);
 const objects=visible.filter(o=>siteAt(o.x,o.y)===site);
 for(let type=0;type<2;type++){
  const slots=type==0?workers:1;
  for(let i=0;i<slots;i++){
   const key=site.id+'-'+type+'-'+i;
   let trip=traffic.get(key);
   if(!trip||tm>=trip.until){
    if(!canPlan)continue;
    const from=type==1?objects.filter(o=>(isStorage(o.t)||typeShip(o.t))&&G.tk-(o.activity||-1000)<240):objects.filter(o=>prod(o)&&o.st==1);
    const origin=from.length?from[(i+Math.floor(tm/12))%from.length]:null;
    const hall=origin&&areaAt(origin.x,origin.y);
    const start=hall&&freeSide(origin,hall);
    const destinations=start?objects.filter(o=>o!==origin&&areaAt(o.x,o.y)===hall&&(prod(o)||isStorage(o.t)||typeShip(o.t))):[];
    let path=[];
    const attempts=Math.min(6,destinations.length),first=(i+Math.floor(tm/3))%Math.max(1,destinations.length);
    for(let offset=0;offset<attempts;offset++){
     const target=freeSide(destinations[(first+offset)%destinations.length],hall);
     if(!target)continue;
     path=floorRoute(start,target,hall);
     if(path.length>2)break;
    }
    const speed=type==1?.29:.46,travel=path.length*speed;
    trip={path,start:tm,until:tm+Math.max(3,travel*2+2),speed};
    traffic.set(key,trip);
   }
   const path=trip.path,travel=(path.length-1)*trip.speed;
   if(path.length<3||tm-trip.start>=2*travel)continue;
   const elapsed=tm-trip.start,reverse=elapsed>travel,step=(reverse?2*travel-elapsed:elapsed)/trip.speed;
   const index=Math.min(path.length-2,Math.floor(step)),t=Math.max(0,step-index);
   const [ax,ay]=path[index],[bx,by]=path[index+1];
   if(cell(ax,ay)||cell(bx,by)){trip.until=tm;continue}
   const x=(ax+.5+(bx-ax)*t)*TS,y=(ay+.5+(by-ay)*t)*TS;
   saveCanvas();c.translate(x,y);
   if(type==1){
    const facing=DX.findIndex((dx,d)=>dx==bx-ax&&DY[d]==by-ay);
    c.rotate((facing+(reverse?2:0))*PI/2);
    rr(-17,-8,32,20,5,'#0004');rr(-15,-9,24,18,4,'#e6aa30');rr(-10,-6,9,12,2,'#303a43');
    c.fillStyle='#414954';c.fillRect(6,-6,12,3);c.fillRect(6,3,12,3);
    if(!reverse){rr(10,-6,12,12,2,'#9b6838');c.fillStyle='#e2bc7c';c.fillRect(14,-6,3,12)}
   }else{
    const stride=Math.sin(tm*11+i)*3;
    c.fillStyle='#0004';c.beginPath();c.ellipse(0,8,7,3,0,PI*2);c.fill();
    c.fillStyle='#303943';c.fillRect(-3+stride,3,2.4,6);c.fillRect(1-stride,3,2.4,6);
    rr(-5,-5,10,9,3,['#dd8740','#4a9cd1','#80a95a'][i%3]);rr(-4,-12,8,7,3,'#e9c092');rr(-4,-13,8,4,2,'#e9bc49');
   }
   restoreCanvas();
  }
 }
}
function applyCamera(){
 const [x,y]=worldToView(0,0),zoom=cameraZoom();
 c.translate(x,y);
 c.scale(zoom,zoom);
}
function world(){
 const [left,top]=viewToWorld(0,0),[right,bottom]=viewToWorld(FW,FH);
 const intersects=(x,y,w,h,margin=0)=>x+w+margin>left&&x-margin<right&&y+h+margin>top&&y-margin<bottom;
 const visible=L.filter(o=>{
  const [w,h]=dimensions(o);
  return intersects(o.x*TS,o.y*TS,w*TS,h*TS,TS);
 });
 const hallVisible=hall=>{
  const [x,y,lastX,lastY]=hall.rc[Math.min(hlv(hall.id),hall.rc.length-1)];
  return intersects(x*TS,y*TS,(lastX-x+1)*TS,(lastY-y+1)*TS,TS*2);
 };
 const halls=HL.filter(hallVisible);
 const moving=tm-lastCameraMotion<.12;
 saveCanvas();applyCamera();
 c.fillStyle='#2a2e35';c.fillRect(0,0,GW*TS,GH*TS);
 const x0=Math.max(0,Math.floor(left/TS)),x1=Math.min(GW,Math.ceil(right/TS));
 const y0=Math.max(0,Math.floor(top/TS)),y1=Math.min(GH,Math.ceil(bottom/TS));
 if(x0<=x1&&y0<=y1){
  c.strokeStyle='#ffffff0d';c.lineWidth=1;c.beginPath();
  for(let i=x0;i<=x1;i++){c.moveTo(i*TS,y0*TS);c.lineTo(i*TS,y1*TS)}
  for(let i=y0;i<=y1;i++){c.moveTo(x0*TS,i*TS);c.lineTo(x1*TS,i*TS)}
  c.stroke();
 }
 for(const h of halls)drawLayer('Halle ' + h.id,()=>{const l=hlv(h.id),[a,b,e,f]=hrect(h),x0=a*TS,y0=b*TS,w=(e-a+1)*TS,hh=(f-b+1)*TS;
  if(l>0){c.fillStyle='#0006';c.fillRect(x0+8,y0+12,w,hh);c.fillStyle='#67717e';c.fillRect(x0,y0+3,w,hh+3);const fg=c.createLinearGradient(0,y0,0,y0+hh);fg.addColorStop(0,h.f[0]);fg.addColorStop(1,h.f[1]);c.fillStyle=fg;c.fillRect(x0,y0,w,hh);
   c.strokeStyle='#0000001c';c.lineWidth=1;c.beginPath();for(let i=a;i<=e+1;i++){c.moveTo(i*TS,y0);c.lineTo(i*TS,y0+hh)}for(let i=b;i<=f+1;i++){c.moveTo(x0,i*TS);c.lineTo(x0+w,i*TS)}c.stroke();
   {
    industrialFloor(x0,y0,w,TS);
    for(let lamp=1;lamp<e-a;lamp+=4){
     const x=x0+(lamp+.5)*TS,y=y0+TS*.5;
     if(!intersects(x,y,0,0,2*TS))continue;
     if(!moving){
      const light=c.createRadialGradient(x,y,0,x,y,TS*2);
      light.addColorStop(0,'#fff6d733');light.addColorStop(1,'#fff6d700');
      c.fillStyle=light;c.fillRect(x-TS*2,y,TS*4,TS*2);
     }
     rr(x-10,y-4,20,5,2,'#fcf3ca');
    }
   }
   c.strokeStyle='#e8b923';c.lineWidth=3;c.setLineDash([12,8]);c.strokeRect(x0+8,y0+8,w-16,hh-16);c.setLineDash([]);tx(h.n.toUpperCase()+(l>1?' · STUFE '+l:''),x0+14,y0+25,13,'#7e8794','left',800);
   if(afl[h.id]>0){c.fillStyle=`rgba(255,255,255,${afl[h.id]*.6})`;c.fillRect(x0,y0,w,hh)}
   const nx=h.rc[l];if(nx){const ok=hReq(h)&&G.m>=h.c[l];c.strokeStyle=ok?'#ffd23fcc':'#ffffff2e';c.lineWidth=2;c.setLineDash([6,9]);c.strokeRect(nx[0]*TS+3,nx[1]*TS+3,(nx[2]-nx[0]+1)*TS-6,(nx[3]-nx[1]+1)*TS-6);c.setLineDash([]);tx('＋ Erweiterung: '+fm(h.c[l])+' €',(nx[2]+1)*TS-12,(nx[3]+1)*TS-12,11,ok?'#ffd23f':'#8d96a3','right',700)}}
  else{c.fillStyle=hsel==h.id?'#1b2f4acc':'#0b0f14b0';c.fillRect(x0,y0,w,hh);c.strokeStyle=hsel==h.id?'#ffd23f':'#e8b92388';c.lineWidth=3;c.setLineDash([10,8]);c.strokeRect(x0+4,y0+4,w-8,hh-8);c.setLineDash([]);
   tx('🔒 '+h.n,x0+w/2,y0+hh/2-14,17,'#e2e8f0','center',800);tx(h.ln,x0+w/2,y0+hh/2+4,12,'#94a3b8','center',600);tx(hReq(h)?fm(h.c[0])+' €':h.site?REGIONS.find(site=>site.id==h.site).need:'ab Bunker-Phase '+(h.ph+1),x0+w/2,y0+hh/2+24,14,hReq(h)?'#fde68a':'#fca5a5','center',700)}
 });
 for(const plot of legacyPlots)if(G.legacyPlots.includes(plot.id)){
  const [a,b,x,y]=plot.rect;
  if(!intersects(a*TS,b*TS,(x-a+1)*TS,(y-b+1)*TS))continue;
  c.strokeStyle='#7faa95';c.lineWidth=2;c.strokeRect(a*TS,b*TS,(x-a+1)*TS,(y-b+1)*TS);
  tx(plot.name,a*TS+8,b*TS+16,10,'#7faa95','left',800);
 }
 const [sx,sy,ex,ey]=SITE;
 if(intersects(sx*TS,sy*TS,(ex-sx+1)*TS,(ey-sy+1)*TS,TS*3))drawLayer('Bunker-Baustelle',dSite);
 c.lineCap='square';
 for(const h of halls)if(hlv(h.id)>0){
  const [a,b,e,f]=hrect(h);
  c.beginPath();c.rect(a*TS,b*TS,(e-a+1)*TS,(f-b+1)*TS);
  c.strokeStyle='#4b515c';c.lineWidth=10;c.stroke();
  c.strokeStyle='#7b8391';c.lineWidth=2;c.stroke();
 }
 c.lineCap='butt';
 drawLayer('Werksverkehr',()=>factoryTraffic(visible,!moving));
 for(const o of visible){
  const belt=isBelt(o.t)&&!MD[o.t]?.sortStation;
  drawLayer(belt?'Förderband':'Gebäude '+o.t,()=>{
   if(belt){
    db(o);
    if(o.t!='belt'){c.fillStyle=MD[o.t].k;c.fillRect(o.x*TS+4,o.y*TS+4,TS-8,3)}
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
 if(bn&&isBelt(bn.t)&&visible.includes(bn)){
  c.strokeStyle='#ef4444';c.lineWidth=3;c.strokeRect(bn.x*TS+1,bn.y*TS+1,TS-2,TS-2);
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
 for(const p of PO){c.globalAlpha=Math.max(0,1-p.t/1.2);tx(p.v,p.x,p.y-p.t*28,13,p.n?'#fca5a5':'#86efac','center',800)}c.globalAlpha=1;
 restoreCanvas()}


/* ===== Story: Projekt ARCHE – ein Bunker für die gesamte Menschheit ===== */
const STX=[
 ['Die Baugrube ist ausgehoben. Kommandantin Reyes meldet sich: „Wir brauchen Schalungsbalken, Regale für die Vorratsräume – und etwas, das den Kindern Mut macht.“','Die Fundamente stehen, und aus deiner Garage ist ein richtiger Betrieb geworden. Das Projekt braucht jetzt Stahl.'],
 ['„Beton allein hält keine Druckwelle“, sagt Reyes. „Träger, Bleche, Werkzeuge für die Bautrupps – und Panzerplatten für die Außenhülle.“','Die Stahlhülle ist geschlossen. Jetzt müssen Menschen darin leben können: Versorgung und Elektronik werden frei.'],
 ['Ein Bunker ohne Nahrung, Wasser und Medizin wäre ein Sarg. Dazu braucht die Überwachung Sensoren für Strahlung, Luft und Druck.','Vorräte für Jahre lagern jetzt unter der Erde. Doch ohne Strom bleibt alles dunkel – die Energiehalle wartet.'],
 ['Akkus, Solarmodule, Generatoren und Steuerungen: Der Bunker muss jahrelang vollkommen autark laufen können.','Das Licht geht an. Der Bunker lebt! Jetzt müssen die Menschen nur noch hinkommen – die Fahrzeughalle öffnet.'],
 ['Millionen Menschen müssen rechtzeitig zum Bunker gelangen. Lastwagen, Autos, E-Bikes und Karosserien für Rettungsfahrzeuge werden gebraucht.','Die Evakuierungsrouten sind einsatzbereit. Für den Kern des Bunkers braucht es das Beste, was Technik kann.'],
 ['Roboter für die Wartung, KI-Chips für die Kontrolle, Drohnen für die Erkundung – und Reaktorkerne, die den Bunker über Jahrzehnte versorgen.','Der Kern des Bunkers arbeitet selbstständig. Das Bunkerwerk kann jetzt die Endmodule bauen.'],
 ['Die letzte Etappe: Wohnmodule, Versorgungsmodule, gewaltige Bunkertore und die Kommandozentrale. Danach ist der Bunker fertig.','Die letzte Schraube sitzt. Die Tore schließen sich hinter den Letzten. Ihr habt es geschafft.']];
function storyCard(kick,title,paras,btn){return`<div class=kick>${kick}</div><h2>${title}</h2>${paras.map(t=>'<p style="max-width:520px;margin-left:auto;margin-right:auto">'+t+'</p>').join('')}<div><button class=btn id=stok>${btn||'Weiter'}</button></div>`}
const nf=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const qLine=q=>q.q.map(([it,n])=>nf(n)+'× '+ITEMS[it].n).join(' · ');
function phaseCard(i){const q=PH[i];return storyCard('Kapitel '+(i+1)+' von '+PH.length,'Phase '+(i+1)+': '+q.n,[STX[i][0],'<b>Aufgaben:</b> '+qLine(q),'<span style="opacity:.8;font-size:14px">Baue die Bunker-Rampe (Reiter Logistik) und führe die Waren per Förderband dorthin.'+(i?' Benötigt: '+hallOf(q.hall).n+'.':'')+'</span>'],'Los geht’s')}
function storyIntro(){stQ.push(
 storyCard('Eilmeldung · Tag 0','Der Countdown läuft',['Die Abrüstungsgespräche sind endgültig gescheitert. Ein automatisiertes Waffensystem, das niemand mehr abschalten kann, wird die Zivilisation auslöschen – die Experten rechnen mit '+nf(DAYS)+' Tagen.','Die Vereinten Nationen haben nur noch eine Hoffnung: ein Bunker, groß genug für die gesamte Menschheit, gebaut von allen, die etwas herstellen können.']),
 storyCard('Projekt ARCHE','Du wirst gebraucht',['Deine kleine Garage hat sich einen Namen gemacht. Kommandantin Reyes vom Notfallstab schickt dir den ersten Bauauftrag.','Du hast viel Zeit – '+nf(DAYS)+' Tage. Es gibt keinen Stress und keine Strafen. Aber jeder Tag zählt, und sieben Bauabschnitte liegen vor dir. Baue Fabriken, liefere an die Bunker-Rampe und rette alle.']),
 phaseCard(0))}
function endStory(){G.end=1;stQ.push(storyCard(G.late?'Spät, aber nicht zu spät':'Finale','Der Bunker ist fertig',[G.late?'Die Frist war längst verstrichen, doch das Waffensystem hat gezögert – und du hast jede Minute genutzt. Die Tore schließen sich, die Menschheit ist in Sicherheit.':'Mit '+nf(dLeft())+' Tagen Reserve schließen sich die Tore hinter den Letzten. Draußen verglüht die alte Welt – drinnen beginnt eine neue.','Aus einer kleinen Garage ist das größte Industrieimperium der Welt geworden. Das Projekt ARCHE ist abgeschlossen.','Du kannst weiterspielen: Baue aus, optimiere und gründe neu – dein Bunker bleibt bestehen.'],'Weiterspielen'))}
function lateStory(){G.late=1;stQ.push(storyCard('Tag '+nf(DAYS),'Die Frist ist abgelaufen',['Nichts ist passiert – noch nicht. Die Wissenschaftler melden, dass sich das Waffensystem selbst verzögert hat. Niemand weiß, wie lange.','Es gibt keine Strafe und keinen Zeitdruck. Baue weiter, so gut du kannst: Jeder Bunkerplatz zählt.']))}
const dLeft=()=>Math.max(0,DAYS-Math.floor(G.st/DAYSEC));
const bProg=()=>{if(G.sp>=PH.length)return 1;const q=PH[G.sp];return(G.sp+q.q.reduce((a,[it,n],i)=>a+Math.min(1,(G.sq[i]||0)/n),0)/q.q.length)/PH.length};
function phaseDone(){const q=PH[G.sp],i=G.sp;G.m+=q.rw[0];G.te+=q.rw[0];G.rp+=q.rw[1];xp(150+60*i);G.sp++;G.sq=[];if(!fs)sfx('prestige');
 const nx=PH[G.sp],nh=HL.filter(h=>h.ph==G.sp).map(h=>h.n).join(' & ');
 stQ.push(storyCard('Kapitel '+(i+1)+' abgeschlossen','✔ '+q.n,[STX[i][1],'Belohnung: <b>+'+fm(q.rw[0])+' €</b> und <b>+'+q.rw[1]+' Forschungspunkte</b>.'+(nx&&nh?' Jetzt bestellbar: <b>'+nh+'</b>.':'')],nx?'Weiter':'Weiter'));
 if(nx)stQ.push(phaseCard(G.sp));else endStory();chkAc();saveAfterTick=true;analyze()}
function stShow(){if(!stQ.length||stOpen||ff||window.NOFIN)return;const o=$('#ov');if(!o||o.style.display=='flex')return;stOpen=1;showOv(stQ.shift());bd('stok',()=>{$('#ov').style.display='none';stOpen=0;sfx('click')})}
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
function bkPanel(){const [X,Y,W,H]=MENUS.bk.box;pnlBox(X,Y,W,H,'📖 Projekt ARCHE – Bunker für die Menschheit',()=>{bkO=false});
 const dl=dLeft(),late=G.late;tx(late?'⏳ Frist überschritten – kein Zeitdruck':'⏳ '+nf(dl)+' Tage bis zur Frist',X+W-54,Y+26,12.5,late?'#fde68a':dl<DAYS*.15?'#fca5a5':'#a7f3d0','right',700);
 PH.forEach((q,i)=>{const y=Y+50+i*34,done=G.sp>i,cur=G.sp==i;if(cur)rr(X+10,y-4,196,32,8,'#3a7bd533');c.fillStyle=done?'#4ade80':cur?'#ffd23f':'#475569';c.beginPath();c.arc(X+24,y+12,6,0,PI*2);c.fill();if(done)tx('✓',X+24,y+16,10,'#052e16','center',800);if(i<PH.length-1){c.fillStyle=done?'#4ade8088':'#47556955';c.fillRect(X+23,y+19,2,15)}
  tx((i+1)+'. '+q.n,X+38,y+10,12,done||cur?'#fff':'#94a3b8','left',cur?800:600);tx(hallOf(q.hall).n,X+38,y+23,9.5,'#94a3b8','left',600)});
 rr(X+14,Y+H-30,188,8,4,'#ffffff18');rr(X+14,Y+H-30,188*bProg(),8,4,'#4ade80');tx('Gesamtfortschritt '+Math.round(bProg()*100)+' %',X+14,Y+H-36,10.5,'#cbd5e1','left',700);
 const x0=X+222,w0=W-236;rr(x0-8,Y+44,w0+16,H-54,10,'#ffffff08');
 if(G.sp>=PH.length){tx('✔ Der Bunker ist fertig!',x0,Y+80,20,'#86efac','left',800);tuWrap('Die Menschheit ist in Sicherheit. Du hast '+nf(G.sd)+' Waren geliefert. Spiele weiter, baue aus oder gründe neu – dein Bunker bleibt bestehen.',w0,'600 12px system-ui,sans-serif').forEach((l,i)=>tx(l,x0,Y+108+i*17,12,'#cbd5e1'));return}
 const q=PH[G.sp];tx('Phase '+(G.sp+1)+': '+q.n,x0,Y+66,17,'#fff','left',800);tuWrap(STX[G.sp][0],w0,'600 11px system-ui,sans-serif').slice(0,3).forEach((l,i)=>tx(l,x0,Y+82+i*12.5,11,'#cbd5e1','left',600));
 q.q.forEach(([it,n],i)=>{const y=Y+120+i*35,d=Math.min(n,G.sq[i]||0),done=d>=n,mt=MD[PR[it]];rr(x0,y,w0,32,8,'#ffffff0a');ico(it,x0+20,y+16,1.15);tx(nf(n)+'× '+ITEMS[it].n,x0+40,y+14,12.5,done?'#86efac':'#fff','left',800);
  tx((done?'✓ ':'')+'Gebaut in: '+mt.n+' ('+hallOf(mt.a).n+')'+(hlv(mt.a)<1?' 🔒':''),x0+40,y+27,9.5,'#94a3b8','left',600);rr(x0+250,y+9,w0-330,10,5,'#ffffff18');rr(x0+250,y+9,Math.max(0,(w0-330)*d/n),10,5,done?'#4ade80':'#3a7bd5');tx(nf(d)+' / '+nf(n),x0+w0-8,y+19,12,done?'#86efac':'#e2e8f0','right',800)});
 const yb=Y+120+q.q.length*35+4;tx('Belohnung: +'+fm(q.rw[0])+' € · +'+q.rw[1]+' Forschungspunkte',x0,yb+10,11.5,'#fde68a','left',700);
 const hasR=L.some(o=>o.t=='prj');tx(hasR?'Liefere per Förderband an die Bunker-Rampe – nur benötigte Waren werden angenommen.':'⚠ Baue zuerst die Bunker-Rampe (Reiter Logistik, auch auf dem Werkshof möglich).',x0,yb+25,10.5,hasR?'#94a3b8':'#fca5a5','left',700);
 btn(x0,Y+H-34,150,26,()=>{cam={x:((SITE[0]+SITE[2])/2+.5)*TS,y:((SITE[1]+SITE[3])/2+.5)*TS,z:.9};bkO=false;sfx('select')},'#334155');tx('📍 Zur Baustelle',x0+75,Y+H-16,11.5,'#fff','center',700);
 btn(x0+158,Y+H-34,150,26,()=>{const h=hallOf(q.hall);hsel=h.id;bkO=false;hlO=true;sfx('click')},'#334155');tx('🏭 Zu den Hallen',x0+233,Y+H-16,11.5,'#fff','center',700);
 btn(x0+316,Y+H-34,110,26,()=>{stQ.push(phaseCard(G.sp));bkO=false;sfx('click')},'#334155');tx('📜 Briefing',x0+371,Y+H-16,11.5,'#fff','center',700)}
function hlPanel(){const [X,Y,W,H]=MENUS.hl.box;pnlBox(X,Y,W,H,'🏭 Hallen – jede Halle ist eine Produktionslinie',()=>{hlO=false});
 [['Halle',16],['Größe',232],['Voraussetzung',320],['Kosten',474]].forEach(([n,x])=>tx(n,X+x,Y+50,10.5,'#94a3b8','left',700));
 HL.filter(h=>!h.site).forEach((h,i)=>{const y=Y+56+i*31,l=hlv(h.id),mx=h.rc.length,nx=hNext(h),req=hReq(h),sel=hsel==h.id;rr(X+8,y,W-16,29,7,sel?'#3a7bd533':i%2?'#ffffff05':'#ffffff0b');if(sel){c.strokeStyle='#ffd23f';c.lineWidth=1.5;c.beginPath();c.roundRect(X+8,y,W-16,29,7);c.stroke()}
  c.fillStyle=h.f[0];c.fillRect(X+14,y+6,6,17);tx(h.n,X+28,y+13,12.5,l?'#fff':'#cbd5e1','left',800);tx(h.ln,X+28,y+24,9.5,'#94a3b8','left',600);
  tx(l?'Stufe '+l+'/'+mx+' · '+hSize(h):'gesperrt · '+(h.rc[0][2]-h.rc[0][0]+1)+'×'+(h.rc[0][3]-h.rc[0][1]+1),X+232,y+18,11,l?'#e2e8f0':'#94a3b8','left',700);
  tx(l?'✓ freigeschaltet':req?'✓ Phase '+(h.ph+1)+' erreicht':'🔒 Phase '+h.ph+' abschließen',X+320,y+18,10.5,l||req?'#86efac':'#fca5a5','left',700);
  if(nx){tx((l?'Erweitern: ':'')+fm(nx)+' €',X+474,y+18,11.5,G.m>=nx?'#fde68a':'#fca5a5','left',800);const ok=req&&G.m>=nx;btn(X+578,y+2,82,25,()=>{hsel=h.id;buyHall(h)},ok?'#2f9e6b':'#475569');tx(l?'Erweitern':'Kaufen',X+619,y+19,11.5,'#fff','center',800)}else tx('Maximalgröße',X+474,y+18,11,'#86efac','left',700);
  btn(X+666,y+2,40,25,()=>{const r=hrect(h);cam={x:((r[0]+r[2]+1)/2)*TS,y:((r[1]+r[3]+1)/2)*TS,z:Math.min(1.3,Math.max(.5,700/((r[2]-r[0]+3)*TS)))};hlO=false;sfx('select')},'#334155');tx('📍',X+686,y+19,13,'#fff','center',700)});
 tx('Maschinen einer Linie lassen sich nur in ihrer Halle bauen. Bänder, Verteiler, Lager und Versand gehen auch auf dem Werkshof dazwischen.',X+16,Y+H-6,10,'#94a3b8')}
function mkPanel(){const [X,Y,W,H]=MENUS.mk.box,t0=G.tk*TICK;pnlBox(X,Y,W,H,'📊 Markt',()=>{mkO=false});
 [['Preise',0],['Rezepte',1],['Aufträge',2]].forEach(([n,k])=>{
  btn(X+104+k*90,Y+9,84,24,()=>{mkTab=k;mkPg=0;sfx('click')},mkTab==k?'#3a7bd5':'#1f2630',0,'market_tab_'+k);
  tx(n,X+146+k*90,Y+26,11,'#fff','center',700)
 });
 if(mkTab==2){ordersPanel(X,Y,W);return}
 const rows=mkTab?ITEMS.map((x,i)=>i).filter(i=>PR[i]!=null):ITEMS.map((x,i)=>i).filter(i=>(G.sl[i]||0)>0||(ITEMS[i].oq&&mk(i))),PS=mkTab?9:9,np=Math.max(1,Math.ceil(rows.length/PS));if(mkPg>=np)mkPg=np-1;const pr=rows.slice(mkPg*PS,mkPg*PS+PS);
 if(!mkTab){const hot=rows.slice().sort((a,b)=>dem(b)-dem(a))[0];if(hot!=null&&dem(hot)>1.08)tx(`Jetzt gefragt: ${ITEMS[hot].n} (+${Math.round((dem(hot)-1)*100)} %)`,X+W-16,Y+H-34,10,'#86efac','right',700);
  [['Produkt',16],['Preis',190],['Nachfrage',262],['Prognose 12 Min.',350],['Sättigung',470]].forEach(([n,x])=>tx(n,X+x,Y+54,10.5,'#94a3b8','left',700));tx('Marge',X+W-16,Y+54,10.5,'#94a3b8','right',700);
  if(!rows.length)tx('Noch keine Produkte – baue eine Produktionslinie.',X+W/2,Y+150,13,'#cbd5e1','center',600);
  pr.forEach((i,k)=>{const y=Y+62+k*24,d=dem(i),p0=price(i),cs=rawCost(i),up=dem(i,t0+60)>d,lo=Math.round((1-sx(i))*100);if(k%2==0)rr(X+8,y,W-16,23,6,'#ffffff08');
   ico(i,X+24,y+12,.8);tx(ITEMS[i].n,X+38,y+16,12,'#fff','left',700);tx(fm(Math.round(p0))+' €',X+190,y+16,13,'#fde68a','left',800);
   tx((up?'▲ ':'▼ ')+(d>=1?'+':'')+Math.round((d-1)*100)+' %',X+262,y+16,12,d>=1.1?'#86efac':d<=.9?'#fca5a5':'#e2e8f0','left',700);
   c.strokeStyle='#ffffff25';c.lineWidth=1;c.beginPath();c.moveTo(X+350,y+12);c.lineTo(X+446,y+12);c.stroke();c.strokeStyle='#7aa7d9';c.lineWidth=1.6;c.beginPath();for(let j=0;j<=24;j++){const yy=y+12-(dem(i,t0+j*30)-1)*30;j?c.lineTo(X+350+j*4,yy):c.moveTo(X+350,yy)}c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(X+350,y+12-(d-1)*30,2.6,0,PI*2);c.fill();
   rr(X+470,y+8,70,8,4,'#ffffff18');rr(X+470,y+8,Math.max(0,70*lo/100),8,4,lo>35?'#ef4444':lo>15?'#facc15':'#4ade80');tx('−'+lo+' %',X+548,y+16,11,'#cbd5e1','left',600);
   tx((p0-cs>=0?'+':'')+fm(Math.round(p0-cs))+' €',X+W-16,y+16,12,p0-cs>=0?'#86efac':'#fca5a5','right',700)});
  tx('Die Nachfrage folgt festen Zyklen. Viel Verkauf senkt den Preis (Sättigung): Verteile die Produktion auf mehrere Produkte.',X+16,Y+H-8,10,'#94a3b8')}
 else{[['Produkt',16],['Rezept',200],['Gebaut in',520]].forEach(([n,x])=>tx(n,X+x,Y+54,10.5,'#94a3b8','left',700));
  pr.forEach((i,k)=>{const y=Y+62+k*24,t=PR[i],m=MD[t],lk=hlv(m.a)<1;if(k%2==0)rr(X+8,y,W-16,23,6,'#ffffff08');c.globalAlpha=lk?.55:1;ico(i,X+24,y+12,.8);tx(ITEMS[i].n,X+38,y+16,11.5,'#fff','left',700);rcpRow(t,X+200,y+12,false);tx(m.n,X+520,y+11,10.5,'#e2e8f0','left',700);tx((lk?'🔒 ':'')+hallOf(m.a).n+' · '+m.w+' s',X+520,y+21,9,'#94a3b8','left',600);c.globalAlpha=1});
  tx('Alle Produkte und was sie brauchen. Gesperrte Hallen (🔒) zeigen dir schon, was dort entsteht.',X+16,Y+H-8,10,'#94a3b8')}
 if(np>1){btn(X+W-130,Y+H-30,28,22,()=>{mkPg=(mkPg+np-1)%np;sfx('click')},'#334155');tx('◀',X+W-116,Y+H-14,11,'#fff','center',700);tx((mkPg+1)+' / '+np,X+W-72,Y+H-14,11,'#cbd5e1','center',700);btn(X+W-44,Y+H-30,28,22,()=>{mkPg=(mkPg+1)%np;sfx('click')},'#334155');tx('▶',X+W-30,Y+H-14,11,'#fff','center',700)}}

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
  tx('+'+fm(Math.round(q.r*RM))+' €',X+480,y+28,12,'#fde68a','right',700);
  if(!q.d){
   const ready=rrLeft()===0;
   btn(X+W-121,y+10,100,26,()=>rerollOrd(q),ready?'#334155':'#1f2937');
   tx(ready?'Tauschen':rrFmt()+' Min.',X+W-71,y+28,11,ready?'#fff':'#94a3b8','center',700);
  }
 });
 tx('Lieferung über den Versand. Ein offener Auftrag kann alle vier Minuten getauscht werden.',X+18,Y+308,11,'#94a3b8');
}
let prestigePage=0;
function prTab(X,Y,W,H){const b=bpCalc(),ok=b.t>=PMIN;
 rr(X+12,Y+46,330,H-58,10,'#ffffff08');tx('Unternehmen neu gründen',X+26,Y+66,14,'#fff','left',800);
 tx('+'+b.t+' Blaupausen',X+26,Y+94,24,ok?'#7dd3fc':'#64748b','left',800);if(!ok)tx('Möglich ab '+PMIN+' Blaupausen',X+26,Y+110,10.5,'#fca5a5','left',700);else{const rec=Math.max(18,Math.ceil(.6*G.bpt));tx(b.t>=rec?'Empfohlen: Das Einkommen stagniert meist ab hier.':'Empfehlung: ab '+rec+' – dein Einkommen wächst noch.',X+26,Y+110,10.5,b.t>=rec?'#86efac':'#fde68a','left',700)}
 tx('Umsatz dieses Durchlaufs '+fm(G.tr)+' € → '+b.a,X+26,Y+127,11,'#cbd5e1');tx('Hallen & Ausbaustufen → '+b.b,X+26,Y+141,11,'#cbd5e1');tx('Erfüllte Aufträge (Durchlauf) '+G.ordRun+' → '+b.c,X+26,Y+155,11,'#cbd5e1');
 tx('Nächste Umsatz-Blaupause ab '+fm(60000*(b.a+1)*(b.a+1))+' €',X+26,Y+171,10.5,'#94a3b8');
 tx('Zurückgesetzt: Geld, Maschinen, Hallen,',X+26,Y+190,10.5,'#fca5a5');tx('Forschung, Personal und Aufträge.',X+26,Y+203,10.5,'#fca5a5');
 tx('Bleibt: Story & Bunker-Fortschritt, Erfolge,',X+26,Y+221,10.5,'#86efac');tx('Level, Baupläne, Produkte, Rekorde.',X+26,Y+234,10.5,'#86efac');
 tx('Nächster Start: '+fm(startMoney())+' €'+(pul('prd1')?' · Tempo ×'+(1+.05*pul('prd1')).toFixed(2):'')+(pul('cap2')?' · Bau −'+3*pul('cap2')+' %':'')+(pul('res2')?' · '+3*pul('res2')+' Techs':''),X+26,Y+252,10,'#cbd5e1');
 tx('Preisbonus nach Neustart: +'+Math.round((prestigeFactor(G.bpt+b.t)-1)*100)+' %',X+26,Y+266,10.5,'#7dd3fc','left',700);
 if(!pcf){btn(X+26,Y+H-48,302,32,()=>{if(ok)pcf=true;else deny('Erst ab '+PMIN+' Blaupausen möglich.')},ok?'#2f9e6b':'#475569');tx('Neu gründen · +'+b.t+' Blaupausen',X+177,Y+H-27,12.5,'#fff','center',800)}
 else{tx('Wirklich? Dein Fortschritt wird zurückgesetzt.',X+26,Y+H-58,11,'#fde68a','left',700);btn(X+26,Y+H-48,190,32,()=>{pcf=false;doPrestige()},'#b91c1c');tx('Ja, neu gründen',X+121,Y+H-27,12.5,'#fff','center',800);btn(X+224,Y+H-48,104,32,()=>{pcf=false},'#334155');tx('Abbrechen',X+276,Y+H-27,12,'#fff','center',700)}
 const x0=X+352;tx('Prestige-Upgrades',x0+4,Y+66,14,'#fff','left',800);tx('Blaupausen: '+G.bp,X+W-14,Y+66,14,'#7dd3fc','right',800);
 const perPage=9,maxPage=Math.ceil(PU.length/perPage);
 btn(x0+4,Y+H-29,128,22,()=>{prestigePage=(prestigePage+1)%maxPage},'#334155');
 tx('Upgrades '+(prestigePage+1)+' / '+maxPage,x0+68,Y+H-14,10.5,'#fff','center',700);
 PU.slice(prestigePage*perPage,(prestigePage+1)*perPage).forEach((p,i)=>{const y=Y+74+i*24,l=pul(p.id),c1=Math.ceil(p.base*Math.pow(1.7,l));rr(x0,y,356,22,6,'#ffffff0a');tx(p.n,x0+8,y+15,11,'#fff','left',700);tx(p.need&&!p.need()?p.require||'Weitere Neugründungen nötig':p.fx(l),x0+136,y+15,9.5,'#cbd5e1','left',600);tx(l+'/'+p.max,x0+272,y+15,10,'#94a3b8','right',600);
  if(l<p.max){btn(x0+280,y+1,72,20,()=>buyP(p.id),G.bp>=c1?'#2f9e6b':'#475569');tx(c1+' BP',x0+316,y+15,10.5,'#fff','center',700)}else tx('Max.',x0+316,y+15,10.5,'#86efac','center',800)});
 tx('Start-Upgrades wirken ab dem nächsten Durchlauf.',x0+4,Y+H-6,9.5,'#94a3b8')}
function acPanel(){const [X,Y,W,H]=MENUS.ac.box,n=AC.filter(a=>G.ac.includes(a[0])).length;
 btn(X,Y,W,H,()=>{},'#0f141bf8');c.strokeStyle='#ffffff22';c.lineWidth=1;c.beginPath();c.roundRect(X,Y,W,H,12);c.stroke();
 ['🏆 '+n+'/'+AC.length,'♻ Prestige','🔊 Audio','❓ Hilfe','Werkzeuge'].forEach((t,i)=>{btn(X+10+i*86,Y+8,82,28,()=>{fTab=i;pcf=false;sfx('click')},fTab==i?'#3a7bd5':'#1f2630',0,'ft'+i);tx(t,X+51+i*86,Y+27,12,'#fff','center',700)});
 tx('⭐ '+LV,X+W-262,Y+25,13,'#fde68a','right',800);rr(X+W-252,Y+15,180,10,5,'#ffffff18');rr(X+W-252,Y+15,180*Math.min(1,(G.xp-XB)/(XN-XB)),10,5,'#7dd3fc');tx(Math.floor(G.xp-XB)+' / '+(XN-XB)+' XP',X+W-162,Y+37,10,'#94a3b8','center',600);
 panelClose(X,Y,W,()=>{acO=false});
 if(fTab==1){prTab(X,Y,W,H);return}if(fTab==2){auTab(X,Y,W,H);return}if(fTab==3){heTab(X,Y,W,H);return}if(fTab==4){toolsTab(X,Y);return}
 AC.forEach((a,i)=>{const x=X+12+(i%4)*176,y=Y+46+Math.floor(i/4)*38,on=G.ac.includes(a[0]);rr(x,y,170,34,8,on?'#14532d':'#ffffff0a');c.strokeStyle=on?'#4ade80':'#ffffff18';c.lineWidth=1;c.beginPath();c.roundRect(x,y,170,34,8);c.stroke();tx((on?'✓ ':'')+a[1],x+8,y+14,11,on?'#fff':'#94a3b8','left',700);tx(a[2],x+8,y+27,9,on?'#bbf7d0':'#64748b')});
 tx('Jedes Level: +3 Forschungspunkte und +1 % Tempo (bis Level 25). Erfolge geben Erfahrung.',X+16,Y+H-6,10,'#94a3b8')}
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
function pnPanel(){const [X,Y,W,H]=MENUS.pn.box,E=G.emp;
 btn(X,Y,W,H,()=>{},'#0f141bf8');c.strokeStyle='#ffffff22';c.lineWidth=1;c.beginPath();c.roundRect(X,Y,W,H,12);c.stroke();
 tx('👥 Personal',X+16,Y+26,16,'#fff','left',800);tx('Löhne: '+fm(WG)+' €/Min',X+W-60,Y+26,12.5,WG?'#fca5a5':'#94a3b8','right',700);
 panelClose(X,Y,W,()=>{pnO=false});
 tx('Mitarbeiter',X+16,Y+52,12,'#94a3b8','left',800);tx('Manager',X+338,Y+52,12,'#94a3b8','left',800);
 const departments=[
  ['p','Produktion','+'+(RH('sch')?3:2)+' % Tempo'],
  ['q','Qualitätskontrolle','+1 % Verkaufspreis'],
  ['l','Lager','+2 Lagerplätze']
 ];
 departments.forEach(([k,n,e],i)=>{const y=Y+60+i*84,cs=hcost(k);
  rr(X+12,y,304,76,10,'#ffffff0a');tx(n,X+24,y+20,13,'#fff','left',800);tx(E[k]+' / 12',X+304,y+20,12,'#fde68a','right',700);tx(e+' je Person · Lohn '+WAGE+' €/Min',X+24,y+38,10.5,'#94a3b8');
  btn(X+24,y+48,154,22,()=>hireE(k),G.m>=cs&&E[k]<12?'#2f9e6b':'#475569');tx('Einstellen · '+fm(cs)+' €',X+101,y+63,11,'#fff','center',700);
  btn(X+186,y+48,118,22,()=>fireE(k),E[k]>0?'#7f1d1d':'#334155');tx('Entlassen',X+245,y+63,11,'#fff','center',700)});
 MG.forEach((d,i)=>{const y=Y+60+i*66,m=G.mg.find(q=>q.id==d.id);rr(X+328,y,384,60,10,'#ffffff0a');tx(d.n,X+340,y+17,12.5,'#fff','left',800);tx(d.r,X+340,y+31,10.5,'#94a3b8');
  if(!m){if(!d.cond[1]())tx('🔒 '+d.cond[0],X+340,y+51,10.5,'#fca5a5','left',700);else{btn(X+340,y+38,160,20,()=>hireM(d),G.m>=d.cost?'#2f9e6b':'#475569');tx('Einstellen · '+fm(d.cost)+' €',X+420,y+52,10.5,'#fff','center',700)}}
  else{const t=m.x>=0?cell(m.x,m.y):null,ok=t&&comp(d,t);tx('Lv '+m.lv+'/10',X+702,y+17,12,'#fde68a','right',800);
   tx(m.lv>=5&&!m.sp?'Ab Lv 5: Spezialist (×1,5 am Ziel) oder Generalist (×0,6 an der ganzen Linie)':d.lab+' '+(d.kind=='eng'?'−':'+')+Math.round(meff(m,d)*100)+' % · '+(ok?'Ziel: '+MD[t.t].n:'nicht zugewiesen'),X+702,y+31,10,ok||m.lv>=5&&!m.sp?'#cbd5e1':'#fca5a5','right',600);
   btn(X+340,y+38,112,20,()=>lvlM(m,d),m.lv<10&&G.m>=lcost(m,d)?'#2f9e6b':'#475569');tx(m.lv<10?'Level ↑ '+fm(lcost(m,d))+' €':'Max.',X+396,y+52,10.5,'#fff','center',700);
   btn(X+458,y+38,96,20,()=>{asg=d.id;pnO=false;sfx('click')},'#334155');tx('⌖ Zuweisen',X+506,y+52,10.5,'#fff','center',700);
   if(m.lv>=5&&!m.sp){btn(X+560,y+38,72,20,()=>specM(m,1),'#7c3aed');tx('Spezialist',X+596,y+52,10.5,'#fff','center',700);btn(X+638,y+38,72,20,()=>specM(m,2),'#7c3aed');tx('Generalist',X+674,y+52,10.5,'#fff','center',700)}
   else if(m.sp)tx(m.sp==1?'Spezialist':'Generalist',X+702,y+52,10.5,'#c4b5fd','right',800)}});
}
function rsPanel(){const [X,Y,W,H]=MENUS.rs.box,NW=138,NH=32,pos=n=>[X+104+n.x*150,Y+44+n.y*38];
 btn(X,Y,W,H,()=>{},'#0f141bf8');c.strokeStyle='#ffffff22';c.lineWidth=1;c.beginPath();c.roundRect(X,Y,W,H,12);c.stroke();
 tx('🔬 Forschung',X+16,Y+26,16,'#fff','left',800);tx(G.rp+' Forschungspunkte (FP)',X+W-60,Y+26,13,'#fde68a','right',800);
 panelClose(X,Y,W,()=>{rsO=false});
 ['Produktion','Leistung','Logistik','Markt','Vertrieb','Unternehmen'].forEach((n,i)=>tx(n,X+16,Y+65+i*38,11,'#94a3b8','left',700));
 for(const n of RN)for(const p of n.p){const a=RN.find(q=>q.id==p),[x1,y1]=pos(a),[x2,y2]=pos(n);c.strokeStyle=RH(p)?'#4ade80':'#ffffff33';c.lineWidth=2.5;c.beginPath();if(n.x>a.x){c.moveTo(x1+NW,y1+NH/2);c.bezierCurveTo(x1+NW+20,y1+NH/2,x2-20,y2+NH/2,x2,y2+NH/2)}else{c.moveTo(x1+NW/2,y1+NH);c.lineTo(x2+NW/2,y2)}c.stroke()}
 for(const n of RN){const[x,y]=pos(n),done=RH(n.id),av=rOK(n),can=av&&G.rp>=researchCost(n),sl=rsel==n.id,fl=rflash[n.id]||0;
  btn(x,y,NW,NH,()=>{rsel=n.id;sfx('select')},done?'#14532d':av?'#1d3b66':'#1b222c');
  c.strokeStyle=sl?'#ffd23f':can?`rgba(250,204,21,${.55+.4*Math.sin(tm*5)})`:done?'#4ade80':'#ffffff22';c.lineWidth=sl||can?2.5:1.5;c.beginPath();c.roundRect(x,y,NW,NH,9);c.stroke();
  c.globalAlpha=done||av?1:.5;tx(n.n,x+9,y+14,11,'#fff','left',700);tx(done?'✓ erforscht':n.ex&&RH(n.ex)?'gesperrt (andere Strategie)':researchCost(n)+' FP',x+9,y+26,10,done?'#86efac':can?'#fde68a':'#94a3b8','left',700);c.globalAlpha=1;
  if(fl>0){c.fillStyle=`rgba(255,255,255,${fl*.5})`;c.beginPath();c.roundRect(x,y,NW,NH,9);c.fill()}}
 const n=RN.find(q=>q.id==rsel),dy=Y+H-62;rr(X+12,dy,W-24,52,10,'#ffffff0d');
 if(!n)tx('Wähle eine Technologie. FP gibt es für Aufträge, neue Produkte und Verkaufsmeilensteine.',X+24,dy+31,11.5,'#94a3b8');
 else{tx(n.n,X+24,dy+17,13,'#fff','left',800);tx(n.e,X+24,dy+32,11,'#cbd5e1');
  const rq=[...n.p.map(p=>[RN.find(q=>q.id==p).n,RH(p)]),...(n.rq?[[n.rq[0],n.rq[1]()]]:[])];
  tx('Voraussetzung: '+(rq.length?rq.map(r=>(r[1]?'✓ ':'✗ ')+r[0]).join(' · '):'keine'),X+24,dy+46,10.5,'#94a3b8');
  const done=RH(n.id),ok=rOK(n)&&G.rp>=researchCost(n);if(done)tx('✓ erforscht',X+W-40,dy+31,13,'#86efac','right',800);else{btn(X+W-190,dy+10,166,32,()=>buyR(n),ok?'#2f9e6b':'#475569');tx('Erforschen · '+researchCost(n)+' FP',X+W-107,dy+31,12.5,'#fff','center',800)}}}
function rotObj(o,r=(o.r+1)%4){
 const error=placement(o,o.x,o.y,r,new Set([o]));
 if(error){constructionError(error);return false}
 mapObject(o,null);
 if(o.j==1)o.jm=[o.jm[3],o.jm[0],o.jm[1],o.jm[2]];
 o.r=r;mapObject(o,o);sfx('rotate');analyze();sv(0);return true;
}
function togP(k){planningOpen=lineOpen=growthOpen=saveOpen=statsOpen=false;const w={mk:mkO,rs:rsO,pn:pnO,hl:hlO,bk:bkO,ac:acO}[k];mkO=rsO=pnO=hlO=bkO=acO=false;if(!w){if(k=='mk')mkO=true;else if(k=='rs')rsO=true;else if(k=='pn')pnO=true;else if(k=='hl')hlO=true;else if(k=='bk')bkO=true;else acO=true}sfx('click')}
const TIPS={hand:['Hand','Antippen: Upgrade, Drehen und Einstellungen eines Gebäudes. Leere Hallenfläche: Infos zur Halle.'],belt:['Förderband','Transportiert 4 Felder pro Sekunde. Ziehen verlegt viele Stücke in einem Zug; ein Band antippen dreht es.'],rot:['Richtung','Dreht, was du als Nächstes baust (oder gerade trägst).'],mov:['Bewegen','Gebäude antippen und Zielfeld antippen – oder direkt ziehen. Inhalt, Level und Manager bleiben erhalten.'],del:['Löschen','Antippen oder über Gebäude ziehen: 50 % Erstattung. Mit „Alles verkaufen“ räumst du die ganze Fabrik.']};
function fitText(text,x,y,width,size,color,align='left',weight=700){
 c.font=weight+' '+size+'px system-ui,sans-serif';
 c.fillStyle=color;c.textAlign=align;
 c.fillText(text,x,y,width);
}
function infoCard(id,box){
 const {x,y,w,h}=box,tip=TIPS[id],m=MD[id];
 if(!tip&&!m)return;
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
 const recipe=m?.r?.map(([item,count])=>count+'× '+ITEMS[item].n).join(' + ');
 const details=tip?.[1]||[fm(cst(id))+' €',m.o!=null?(recipe?recipe+' → ':'')+ITEMS[m.o].n+' · '+m.w+' s':m.d].filter(Boolean).join(' · ');
 const lines=tuWrap(details,textW,'600 10.5px system-ui,sans-serif').slice(0,2);
 lines.forEach((line,i)=>fitText(line,x+10,y+31+i*12,textW,10.5,'#cbd5e1','left',600));
 hitbox(x,y,w-actionW-4,h,()=>{},null);
}
const MENUS={
 mk:{box:[70,62,660,330],show:()=>mkO,draw:mkPanel},
 rs:{box:[40,64,720,330],show:()=>rsO,draw:rsPanel},
 pn:{box:[40,64,720,330],show:()=>pnO,draw:pnPanel},
 hl:{box:[40,64,720,330],show:()=>hlO,draw:hlPanel},
 bk:{box:[40,64,720,330],show:()=>bkO,draw:bkPanel},
 ac:{box:[40,64,720,330],show:()=>acO,draw:acPanel},
 planning:{box:[55,60,690,322],show:()=>planningOpen,draw:planningPanel},
 line:{box:[57,62,686,321],show:()=>lineOpen&&sel&&L.includes(sel),draw:()=>linePanel(sel)},
 growth:{box:[55,60,690,323],show:()=>growthOpen,draw:growthPanel},
 save:{box:[71,69,658,252],show:()=>saveOpen,draw:savePanel},
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
 const closeBox={x:bar.x+bar.w-44,y:bar.y+2,w:42,h:bar.h-4};
 uiButton(closeBox,close,'#334155','panel_close');
 const baseline=bar.y+bar.h/2+5;
 tx('✕',closeBox.x+closeBox.w/2,baseline,15,'#fff','center',800);
 const arrows=[];
 if(maxX>0)arrows.push(['←',-.65*clip.w,0],['→',.65*clip.w,0]);
 if(maxY>0)arrows.push(['↑',0,-.7*clip.h],['↓',0,.7*clip.h]);
 const buttonW=Math.min(41,(bar.w-47)/Math.max(1,arrows.length)-3);
 arrows.forEach(([label,dx,dy],i)=>{
  const left=bar.x+2+i*(buttonW+3),button={x:left,y:bar.y+2,w:buttonW,h:bar.h-4};
  uiButton(button,()=>scrollPanel(dx,dy),'#334155','panel_scroll_'+label);
  tx(label,left+buttonW/2,baseline,17,'#fff','center',800);
 });
 const labelOffset=7+arrows.length*(buttonW+3);
 if(arrows.length&&bar.w-labelOffset>116){
  tx('Verschieben',bar.x+labelOffset,baseline,11,'#cbd5e1');
 }
}
const NAV=[['mk','Markt'],['rs','Forschung'],['pn','Team'],['hl','Hallen'],['bk','Bunker'],['ac','Firma']];
const GROUPS=[['h','Holz','gar'],['m','Metall','met'],['v','Versorg.','vrs'],['e','Elektro','elk'],
 ['n','Energie','ene'],['f','Fahrzeug','fzg'],['t','Hightech','hit'],['b','Bunker','bnk'],['l','Logistik'],['u','Betrieb']];
const TOOLS=[['hand','✋','Hand'],['belt','➜','Band'],['rot','↻','Richtung'],['mov','✥','Bewegen'],['del','🗑','Löschen']];
let shopPage=0;
function drawHeader(){
 const status=view.status;
 rr(status.x,status.y,status.w,status.h,8,'#0b0f14ee');
 const time=G.late?'∞':nf(dLeft())+' T';
 const statusValues=[
  ['Geld',fm(G.m)+' €','#fde68a'],['Pro Min.',fm(rate())+' €','#a7f3d0'],
  ['Frist',time,G.late?'#fde68a':dLeft()<DAYS*.15?'#fca5a5':'#e2e8f0'],['Level',String(LV),'#7dd3fc']
 ];
 const cellW=status.w/4;
 statusValues.forEach(([label,value,color],i)=>{
  const x=status.x+cellW*(i+.5);
  fitText(label,x,status.y+14,cellW-6,10.5,'#94a3b8','center');
  fitText(value,x,status.y+32,cellW-6,14,color,'center',800);
 });
 rr(status.x+5,status.y+39,status.w-10,3,1.5,'#ffffff18');
 rr(status.x+5,status.y+39,(status.w-10)*Math.min(1,(G.xp-XB)/(XN-XB)),3,1.5,'#7dd3fc');
 NAV.forEach(([id,label],i)=>{
  const box=view.navigation[i],active=MENUS[id].show(),mid=box.x+box.w/2;
  uiButton(box,()=>togP(id),active?'#3a7bd5':'#0b0f14ee',id);
  if(id==='rs'){
   fitText(label,mid,box.y+16,box.w-6,12.5,'#e2e8f0','center');
   fitText(fm(G.rp)+' FP',mid,box.y+33,box.w-6,11,'#7dd3fc','center');
  }else fitText(label,mid,box.y+box.h/2+5,box.w-6,14.5,'#fff','center');
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
 uiButton(box,()=>chooseTool(id),on?'#3a7bd5':'#1f2630f5','tl_'+id);
 const mid=x+w/2,showPrice=!!priceLabel&&h>=44;
 const iconY=y+h*(showPrice?.29:.36);
 if(on){
  c.strokeStyle='#9cc4ff';c.lineWidth=1.5;c.beginPath();c.roundRect(x+1,y+1,w-2,h-2,8);c.stroke();
 }
 if(m){
  saveCanvas();
  c.globalAlpha=locked?.42:1;
  const iconScale=h*(showPrice?.0095:.0105);
  c.translate(mid,iconY);c.scale(iconScale,iconScale);
  dm({t:id,r:0,lv:1,st:0,base:[1,1]});
  restoreCanvas();
 }else if(id==='rot'){
  saveCanvas();c.translate(mid,iconY);c.rotate(rot*PI/2);c.fillStyle='#ffd23f';
  c.beginPath();c.moveTo(9,0);c.lineTo(-5,-6);c.lineTo(-5,6);c.fill();restoreCanvas();
 }else{
  const iconSize=Math.min(20,h*.46);
  tx(icon,mid,iconY+iconSize*.36,iconSize,'#fff','center');
 }
 fitText(label,mid,y+h-(showPrice?15:6),w-6,12.5,'#fff','center');
 if(showPrice)fitText(locked?'🔒':priceLabel,mid,y+h-4,w-6,9,'#fde68a','center',600);
}
function drawDock(){
 const dock=view.dock;
 rr(dock.x-3,dock.y-3,dock.w+6,dock.h+6,10,'#14181eea');
 GROUPS.forEach(([id,label,hall],i)=>{
  const box=view.categories[i],locked=hall&&hlv(hall)<1;
  uiButton(box,()=>{pg=id;shopPage=0;sfx('click')},pg===id?'#3a7bd5':'#1f2630f5','pg_'+id);
  fitText((locked?'🔒 ':'')+label,box.x+box.w/2,box.y+box.h/2+4,box.w-5,13,locked?'#94a3b8':'#fff','center');
 });
 TOOLS.forEach(([id,icon,label],i)=>toolButton(view.shortcuts[i],id,icon,label,id==='belt'?'2 €':''));
 const models=Object.keys(MD).filter(t=>MD[t].g===pg&&!MD[t].legacyOnly);
 const track=view.machines,natural=Math.max(1,Math.floor(track.w/64));
 if(!models.length)return;
 const paged=models.length>natural,arrowW=40;
 const area=paged?{...track,x:track.x+arrowW+4,w:track.w-2*arrowW-8}:track;
 const size=Math.max(1,Math.floor(area.w/58)),pages=paged?Math.ceil(models.length/size):1;
 shopPage=Math.min(shopPage,pages-1);
 const modelsToShow=paged?models.slice(shopPage*size,(shopPage+1)*size):models;
 const slots=FactoryLayout.row(area,paged?size:modelsToShow.length);
 modelsToShow.forEach((id,i)=>toolButton(slots[i],id,'',MD[id].s,fm(cst(id))+' €'));
 if(paged){
  for(const [delta,x,label] of [[-1,track.x,'‹'],[1,track.x+track.w-arrowW,'›']]){
   const box={...track,x,w:arrowW};
   uiButton(box,()=>{shopPage=(shopPage+delta+pages)%pages;sfx('select')},'#334155',delta<0?'shop_prev':'shop_next');
   tx(label,x+arrowW/2,track.y+track.h/2+5,18,'#fff','center');
  }
 }
}
function drawWorldControls(){
 drawDock();
 const zooms=[['＋',()=>zoomAt(1.25,CX,CY),'zoom_in'],['−',()=>zoomAt(.8,CX,CY),'zoom_out'],
  ['⌂',()=>centerSite(REGIONS.find(site=>site.id===currentSite)),'camera_home']];
 zooms.forEach(([label,fn,id],i)=>{
  const box=view.camera[i];
  uiButton(box,fn,'#1f2630f5',id);
  tx(label,box.x+box.w/2,box.y+box.h/2+7,20,'#fff','center',800);
 });
 const entryY=view.camera[0].y;
 const room=view.camera[0].x-view.inset-4;
 const y=room>=370?view.dock.y-52:entryY-52;
 const box={x:view.inset,y:Math.max(view.headerBottom,y),w:Math.min(528,room>=370?room:FW-2*view.inset),h:48};
 if(room<370&&box.y+box.h>entryY)box.w=Math.max(1,room);
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
  if(id!=='hand'||hover?.id==='tl_hand')infoCard(id,box);
 }
}
const warningBox=()=>({x:view.inset,y:view.headerBottom+3,w:Math.min(FW-2*view.inset,740),h:24});
function ui(){
 drawHeader();
 const opened=openMenu();
 if(opened){
  const [id,menu]=opened;
  btn(0,view.headerBottom,FW,FH-view.headerBottom,()=>{},'#14181eea');
  drawPanel(id,menu.box,menu.draw,closeP2);
  return;
 }
 drawWorldControls();
 if(msg){
  const {x,y,w}=warningBox();
  rr(x,y,w,24,7,bn?'#7f1d1dee':'#0b0f14df');
  fitText(msg,x+8,y+16,w-16,12,bn?'#fecaca':'#cbd5e1','left',600);
 }
 if(tool==='hand'&&sel&&L.includes(sel))drawPanel(sel,objectPanelBox(sel),()=>panel(sel),()=>{sel=null},true);
 else panelScroll={id:null,x:0,y:0};
}

function objectPanelBox(o){
 const d=MD[o.t],isB=isBelt(o.t);
 let h=104;
 if(isB)h=o.t==='sorter'?190:o.t==='smart'||o.t==='sort'?175:o.t==='tunnel'?149:163;
 else if(prod(o))h=258+(d.r?.length>1?20:0);
 else if(o.t==='shp')h=146;
 else if(isStorage(o.t))h=174;
 else if(d.inspect)h=120;
 else if(d.supply||d.ship||d.distribution)h=116;
 else if(d.j)h=o.j===1?208:150;
 else if(o.t==='prj')h=112+28*(PH[G.sp]?.q.length||0);
 return [548,96,240,h];
}
function panel(o){
 const [X,Y,W,H]=objectPanelBox(o),isB=isBelt(o.t),d=isB?null:MD[o.t],prod=!!d&&d.o!=null,jn=!!d?.j;
 btn(X,Y,W,H,()=>{},'#0f141bf0');c.strokeStyle='#ffffff22';c.lineWidth=1;c.beginPath();c.roundRect(X,Y,W,H,12);c.stroke();
 tx(isB?MD[o.t]?.n||'Förderband':d.n,X+14,Y+24,isB&&o.t!='belt'||prod&&d.n.length>17?12:16,'#fff','left',800);if(prod)tx('Level '+o.lv,X+W-14,Y+24,13,'#fde68a','right',700);
 let y=Y+46;const delB=(bx,bw,lab)=>{btn(X+bx,y,bw,28,()=>{delAt(o.x,o.y);sel=null;sv(0);analyze()},'#7f1d1d',0,'del');tx(lab,X+bx+bw/2,y+19,12,'#fff','center',700)};
 if(prod){rcpRow(o.t,X+14,y+4,false);y+=22;
  const t0=tme(o),p=plan(o),t1=tme(o,o.lv+p.n);
  tx('Zeit pro Stück',X+14,y,12,'#94a3b8');tx(t0.toFixed(1)+' s → '+t1.toFixed(1)+' s',X+W-14,y,12,'#fff','right',700);y+=18;
  tx('Stück pro Minute',X+14,y,12,'#94a3b8');tx((60/t0).toFixed(1)+' → '+(60/t1).toFixed(1),X+W-14,y,12,'#fff','right',700);y+=22;
  [['Arbeit',o.ew,'#4ade80'],['Wartet',o.es,'#facc15'],['Gestaut',o.eb,'#ef4444']].forEach(([l,v,col],i)=>{tx(l,X+14,y+i*17+9,11,'#94a3b8');rr(X+70,y+i*17,W-120,10,5,'#ffffff18');rr(X+70,y+i*17,Math.max(0,(W-120)*Math.min(1,v)),10,5,col);tx(Math.round(v*100)+'%',X+W-14,y+i*17+9,11,'#cbd5e1','right')});y+=58;
  if(d.r&&d.r.length>1){tx('Puffer: '+d.r.map((a,i)=>ITEMS[a[0]].n+' '+o.iv[i]+'/'+inputCap(o,i)).join(' · '),X+14,y-4,10.5,'#94a3b8');y+=18}
  const ok=G.m>=p.tot&&p.n>0;btn(X+14,y,W-28,34,()=>buy(o),ok?'#2f9e6b':'#475569',0,'upg');tx(`Upgrade ×${p.n} · ${fm(p.tot)} €`,X+W/2,y+22,13,'#fff','center',800);y+=40;
  btn(X+14,y,50,28,()=>{qi=(qi+1)%4;sfx('select')},'#334155');tx(QT[qi]?'×'+QT[qi]:'MAX',X+39,y+19,12,'#fff','center',700);
  btn(X+70,y,76,28,()=>{rotObj(o)},'#334155');tx('↻ Drehen',X+108,y+19,12,'#fff','center',700);delB(152,W-166,'Abbauen')}
 else if(jn){
  if(o.j==1){tx('Tippe eine Seite: Eingang → Ausgang → Aus',X+14,y,10.5,'#94a3b8','left',700);y+=12;const cols=['#334155','#2f9e6b','#c2570c'],nm=['Aus','Eingang','Ausgang'],pos=[[W-82,32],[W/2-34,58],[14,32],[W/2-34,6]];
   for(let dd=0;dd<4;dd++){const[px,py]=pos[dd];btn(X+px,y+py,68,26,()=>{o.jm[dd]=(o.jm[dd]+1)%3;if(o.it>=0&&o.jm[dd]==0)o.wt=0;sfx('select');recalc()},cols[o.jm[dd]]);tx(['→ rechts','↓ unten','← links','↑ oben'][dd],X+px+34,y+py+11,9,'#ffffffcc','center',600);tx(nm[o.jm[dd]],X+px+34,y+py+22,10.5,'#fff','center',800)}
   c.fillStyle='#ffffff22';c.beginPath();c.arc(X+W/2,y+58+13,7,0,PI*2);c.fill();y+=92}
  else{tx('Waren fahren geradeaus durch – zwei Bänder',X+14,y,10.5,'#94a3b8');tx('können sich überqueren, ohne zu mischen.',X+14,y+14,10.5,'#94a3b8');y+=34}
  btn(X+14,y,80,28,()=>{rotObj(o)},'#334155');tx('↻ Drehen',X+54,y+19,12,'#fff','center',700);delB(100,W-114,'Abbauen (50 %)')}
 else if(o.t=='prj'){const q=PH[G.sp];tx(q?'Phase '+(G.sp+1)+': '+q.n:'Bunker fertig – Danke!',X+14,y,12,'#fde68a','left',800);y+=16;
  if(q)q.q.forEach(([it,n],i)=>{const dn=Math.min(n,G.sq[i]||0);ico(it,X+24,y+8,.8);tx(ITEMS[it].n,X+40,y+8,10.5,'#fff','left',700);rr(X+14,y+14,W-28,6,3,'#ffffff18');rr(X+14,y+14,(W-28)*dn/n,6,3,dn>=n?'#4ade80':'#3a7bd5');tx(nf(dn)+'/'+nf(n),X+W-14,y+8,10.5,'#cbd5e1','right',700);y+=28});else y+=8;
  btn(X+14,y,100,28,()=>{closeP2();bkO=true;sfx('click')},'#334155');tx('📖 Quests',X+64,y+19,12,'#fff','center',700);delB(120,W-134,'Abbauen (50 %)')}
 else if(isB){
  tx((1/beltTime(o.t)).toFixed(1)+' Felder/s · '+beltCount(o)+'/'+beltSize(o.t)+' Stück',X+14,y,12,'#cbd5e1');y+=17;
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
  if(o.t=='tunnel'){tx(tunnelExit(o)?'Weiterleitung durch Tunnel':'Gleichgerichtetes Tunnelende 2–6 Felder voraus',X+14,y-4,9,'#94a3b8');y+=10}
  const next=nextBelt(o);
  if(next){
   const cost=beltUpgradeCost(o,next),ready=MD[next].unlock();
   btn(X+14,y,W-28,25,()=>upgradeBelt(o),ready&&G.m>=cost?'#2f6d54':'#334155');
   tx(ready?MD[next].n+' · '+cost+' €':MD[next].need,X+W/2,y+17,10,'#fff','center',700);y+=29;
  }
  btn(X+14,y,80,28,()=>rotObj(o),'#334155');tx('↻ Drehen',X+54,y+19,12,'#fff','center',700);delB(100,W-114,'Abbauen (50 %)')
 }
 else if(d?.inspect){
  tx('Leitet Waren geradeaus weiter.',X+14,y,11,'#cbd5e1');y+=20;
  btn(X+14,y,80,28,()=>rotObj(o),'#334155');tx('↻ Drehen',X+54,y+19,12,'#fff','center',700);delB(100,W-114,'Abbauen (50 %)')
 }
 else if(d?.supply||d?.ship||d?.distribution){
  tx(d.ship?'Verkauft zum aktuellen Marktpreis':'Bestandsgebäude aus einem früheren Spielstand',X+14,y,12,'#94a3b8');y+=18;delB(14,W-28,'Abbauen (50 %)')
 }
 else{tx(isStorage(o.t)?'Bestand '+o.q.length+' / '+cap(o)+' Stück · FIFO':!isB?'Verkauft zum aktuellen Marktpreis':'Transport: 4 Felder/s · Kapazität 1',X+14,y,12,'#94a3b8');y+=24;
  if(o.t=='shp'){btn(X+14,y,W-28,28,()=>{o.lv=o.lv%4+1;sfx('select');analyze()},'#334155');tx(['Verkauf: immer','Nur bei Nachfrage ≥ 90 %','Nur bei Nachfrage ≥ 100 %','Nur bei Nachfrage ≥ 110 %'][o.lv-1],X+W/2,y+19,12,'#fff','center',700);y+=34}
  if(isStorage(o.t)){
   const rates=currentStats(o);
   tx('Eingang '+rates.arrivals.toFixed(1)+' · Ausgang '+rates.moves.toFixed(1)+' Stück/Min',X+14,y,10.5,'#cbd5e1');y+=17;
   const stock=new Map();
   for(const item of o.q)stock.set(item,(stock.get(item)||0)+1);
   const stockText=[...stock].slice(0,3).map(([item,n])=>n+'× '+ITEMS[item].n).join(' · ');
   tx(stockText.length>38?stockText.slice(0,36)+'…':stockText||'Kein Bestand',X+14,y,10,'#94a3b8');y+=19;
   const automation=RH('lag2');
   btn(X+14,y,W-28,25,()=>{if(!automation){deny('Erforsche Automatisches Lager.');return}o.lv=o.lv==1?2:1;sv(0)},'#334155');
   tx(o.lv==2?'Ausgabe: freie Lieferung':automation?'Ausgabe: FIFO':'Automatik: Forschung erforderlich',X+W/2,y+17,10.5,'#fff','center',700);y+=29;
  }
  const two=!isB&&!terminal(o.t);if(two){btn(X+14,y,80,28,()=>{rotObj(o)},'#334155');tx('↻ Drehen',X+54,y+19,12,'#fff','center',700)}
  delB(two?100:14,two?W-114:W-28,'Abbauen (50 %)')}}
const nextBelt=o=>o.t=='belt'?'fast':o.t=='fast'?'express':null;
const beltUpgradeCost=(o,next)=>Math.max(1,cst(next)-Math.floor(cst(o.t)/2));
function upgradeBelt(o){
 const next=nextBelt(o);
 if(!next||!L.includes(o)||!MD[next].unlock())return false;
 const cost=beltUpgradeCost(o,next);
 if(G.m<cost){deny('Nicht genug Geld für den Bandumbau.');return false}
 G.m-=cost;o.t=next;o.fl=1;
 if(!G.bt.includes(next))G.bt.push(next);
 analyze();sv(0);sfx('upgrade');return true;
}
function resetPlanning(){
 buildSelection=new Set();planningOpen=false;buildMode='';routeSource=buildPreview=activePlan=null;
}
const planLimit=()=>3+pul('log1')+(RH('bau')?3:0);
function readPlans(raw){
 return Object.values(raw||{}).slice(0,20).map(value=>Object.values(value||{}).slice(0,100)
  .filter(e=>e&&Number.isInteger(e[0])&&Number.isInteger(e[1])&&e[0]>=0&&e[0]<GW&&e[1]>=0&&e[1]<GH&&knownType(e[2]))
  .map(e=>[e[0],e[1],e[2],e[3]&3,e[4]===true,e[5]||null])).filter(plan=>plan.length);
}
function makePlan(objects){
 const all=[...objects];
 if(!all.length)return [];
 const x=Math.min(...all.map(o=>o.x)),y=Math.min(...all.map(o=>o.y));
 return all.map(o=>[o.x-x,o.y-y,o.t,o.r,o.base.some(n=>n>1),{
  ports:o.j==1?o.jm.slice():null,sort:o.sortRule,smart:o.smartMode,threshold:o.threshold
 }]);
}
function previewPlan(plan,x,y){
 const rows=plan.map(([dx,dy,t,r,large,settings])=>({x:x+dx,y:y+dy,t,r,base:large?defaultSize(t):[1,1],settings}));
 return checkBuild(rows);
}
function checkBuild(rows,moving=false){
 const ignore=moving?new Set(rows.map(row=>row.o)):new Set(),reserved=new Set();
 const cost=moving?0:rows.reduce((total,row)=>total+(row.existing?0:cst(row.t)),0);
 let error='';
 for(const row of rows){
  if(row.existing){
   if(cell(row.x,row.y)!==row.existing||row.r!==row.existing.r)error='Die vorhandene Bandroute wurde geändert.';
   continue;
  }
  const o=row.o||row;
  if(!moving&&MD[o.t]?.legacyOnly){error ||= 'Der Bauplan enthält ein Gebäude aus einer früheren Version.';continue}
  error ||= placement(o,row.x,row.y,row.r,ignore);
  for(const [x,y] of footprint(o,row.x,row.y,row.r)){
   const key=y*GW+x;
   if(reserved.has(key))error ||= 'Bauplan enthält überlappende Felder.';
   reserved.add(key);
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
  }
  analyze();sv(0);sfx('place');
 }
 resetPlanning();return true;
}
function planRoute(from,to){
 if(!from||!to||!L.includes(from)||!L.includes(to)||from===to||terminal(from.t))return null;
 const site=siteAt(from.x,from.y);
 if(site!==siteAt(to.x,to.y))return null;
 return FactoryGrid.planRoute(from,to,{
  width:GW,cell,canUse:(x,y)=>siteAt(x,y)===site&&!bchk(x,y,'belt'),
  canEnter:(target,direction)=>target.j==1?target.jm[direction]==1:!isBelt(target.t)||target.r!=direction,
  validate:checkBuild
 });
}
function startBuildMode(mode){
 tool='hand';sel=null;planningOpen=false;buildMode=mode;buildPreview=null;routeSource=null;sfx('select');
}
function buildTap(x,y){
 const o=cell(x,y);
 if(buildMode=='group'){
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
  if(!buildPreview)deny('Keine freie Förderbandroute gefunden.');
 }
}
const displayPlanningError=error=>error.startsWith('LOCK:')?hallOf(error.slice(5)).n+' ist gesperrt.':error;
function planningControls(box){
 const preview=buildPreview,{x,y,w,h}=box;
 let label={group:'Gebäude antippen · '+buildSelection.size+' ausgewählt',copy:'Gebäude zum Kopieren antippen',move:'Neue Position für die Gruppe antippen',place:'Bauplatz antippen, um den Bauplan zu prüfen',route:routeSource?'Ziel antippen':'Ausgangsgebäude antippen'}[buildMode];
 if(preview)label=preview.error?displayPlanningError(preview.error):preview.moving?(preview.disconnected?preview.disconnected+' externe Anschlüsse beim Verschieben prüfen':'Gruppe kann verschoben werden'):'Baukosten '+fm(preview.cost)+' € · '+preview.rows.length+' Felder';
 rr(x,y,w,h,8,'#0f141bf2');fitText(label,x+8,y+16,w-16,11,'#fff');
 if(preview&&!preview.error){
  const box={x:x+6,y:y+22,w:84,h:23};
  uiButton(box,()=>commitBuild(preview),'#2f6d54','confirm_build');
  tx(preview.moving?'Verschieben':'Bauen',box.x+42,box.y+16,10.5,'#fff','center',800);
 }
 const back={x:x+w-81,y:y+22,w:75,h:23};
 uiButton(back,()=>{buildMode='';buildPreview=null;routeSource=null;planningOpen=true},'#334155','open_plan');
 tx('Planung',back.x+37.5,back.y+16,10.5,'#fff','center',800);
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
 for(const [bit,fp] of [[1,5],[2,3],[4,4]])if(newAwards&bit)G.rp+=fp;
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
 cam={x:site.center[0]*TS,y:site.center[1]*TS,z:site.hall?.92:1.3};
}
function switchSite(site){
 if(!site||site.hall&&!hlv(site.hall))return false;
 currentSite=site.id;resetPlanning();sel=null;mvO=null;buildMode='';tool='hand';hv=null;
 centerSite(site);
 if(site.hall)pg=hallOf(site.hall).tab;
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
  for(const [i,site] of REGIONS.entries()){
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
 if(!target||target===from||MD[target.t]?.supply||MD[target.t]?.distribution)return false;
 const entry=(direction+2)%4;
 if(isBelt(target.t))return target.r!==entry;
 if(target.j==1)return target.jm[entry]==1;
 if(prod(target)&&prod(from))return uses(target,MD[from.t].o);
 return true;
}
function outgoing(o,lookup=cell){
 const outputs=[0,1,2,3].filter(d=>fdn(o,(d+2)%4));
 const targets=new Set();
 for(const d of outputs){
  const q=lookup(...port(o,d));
  if(compatiblePort(o,q,d))targets.add(q);
 }
 const exit=tunnelExit(o,lookup);
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
 result.transport=belts.length?Math.min(...belts.map(beltCapacity)):0;
 result.machines=machines;result.belts=belts;
 return result;
}
function lostConnections(positions){
 const replacements=new Map(),futureAt=new Map(),moved=new Set(positions.map(row=>row.o));
 for(const {o,x,y,r} of positions){
  const placed={...o,x,y,r};
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
  const next=outgoing(replacements.get(o)||o,lookup);
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
  const margin=missed*Math.max(0,price(item)*(o.oq||100)/100-rawCost(item)*RCm);
  if(!best||margin>best.margin)best={object:o,margin,missed};
 }
 return best;
}
function closeP2(){mkO=rsO=pnO=hlO=bkO=acO=planningOpen=lineOpen=growthOpen=saveOpen=statsOpen=false}

/* ===== Tutorial & Hilfe: interaktive Einführung direkt in der Fabrik, Kurztour (Hilfe), einmalige Kontext-Tipps ===== */
let tuTour=0,tuTI=0,tuHn=null,tuHT=-99,tuG=null,tuA=0,tuKey='',tuC=0;
const tuNeed=()=>cst('frm')+cst('belt')+cst('shp')-Math.floor(cst('shp')/2)+14,hasT=t=>L.some(o=>o.t==t),prodM=o=>!!o&&!!MD[o.t]&&MD[o.t].o!=null,TUH=[['r','status']];
/* hl: Liste aus ['t',x,y,b,h] (Kacheln), ['u',id] (Knopf der Oberfläche), ['r',name] (Layoutbereich) */
const TU=[
 {ti:'Willkommen in deiner Garage! 🏭',tx:'Das Holzlager kauft Rohholz für 2 € je Stück. Das erste Band liefert es zur Säge. Sie macht Holzteile, die das zweite Band zum Verkauf bringt.',hl:()=>[['t',tuG.sx-2,tuG.sy,5,1]],dn:()=>G.sold>=1,sf:'achieve'},
 {ti:'Dein erster Verkauf! 🎉',tx:'Jedes Stück bringt Geld – und je weiter es verarbeitet ist, desto mehr: Holzteile 6 €, Rohlinge 12 €, fertige Spielzeuge bis 60 €. Dein Geld siehst du oben links.',hl:()=>TUH,nx:'Weiter'},
 {ti:'Die Linie erweitern',tx:()=>`Die Formmaschine macht aus Holzteilen Rohlinge – doppelt so viel wert. Spare ${fm(tuNeed())} € (du hast ${fm(G.m)} €), die Garage verdient derweil weiter.`,hl:()=>TUH,dn:()=>G.m>=tuNeed()||hasT('frm'),bar:()=>Math.min(1,G.m/tuNeed())},
 {ti:'Platz schaffen',tx:()=>tool!='hand'?'Wähle zuerst das Hand-Werkzeug ✋ unten links.':'Der Versand wandert ans Ende der Linie. Tippe ihn an und wähle „Abbauen“ – 50 % der Kosten bekommst du zurück.',hl:()=>tool!='hand'?[['u','tl_hand']]:sel&&sel.t=='shp'?[['u','del']]:[['t',tuG.fx,tuG.fy,1,1]],dn:()=>{const q=cell(tuG.fx,tuG.fy);return!q||q.t!='shp'}},
 {ti:'Maschine wählen',tx:()=>pg!='h'?'Öffne unten den Reiter „Holz“.':'Wähle unten die Maschine „Form“. Sie macht aus Holzteilen Rohlinge.',hl:()=>pg!='h'?[['u','pg_h']]:[['u','tl_frm']],dn:()=>tool=='frm'||hasT('frm')},
 {ti:'Maschine platzieren',tx:()=>cell(tuG.fx,tuG.fy)?.t=='frm'?'Die Formmaschine steht schon. Wähle die Hand, tippe die Maschine an und drehe ihren Ausgang nach rechts.':tool!='frm'?'Wähle unten erneut die Maschine „Form“.':rot?'Der Pfeil zeigt, wohin die Maschine liefert. Drücke „Richtung“, bis er nach rechts → zeigt.':'Tippe auf das leuchtende Feld. Der Pfeil zeigt, wohin die Maschine liefert – hier nach rechts →.',hl:()=>cell(tuG.fx,tuG.fy)?.t=='frm'?(tool!='hand'?[['u','tl_hand']]:[['t',tuG.fx,tuG.fy,1,1]]):tool!='frm'?[['u','tl_frm']]:rot?[['u','tl_rot']]:[['t',tuG.fx,tuG.fy,1,1]],dn:()=>{const q=cell(tuG.fx,tuG.fy);return q?.t=='frm'&&q.r==0}},
 {ti:'Förderband wählen',tx:'Jetzt verbindest du Formmaschine und Versand mit einem Förderband. Wähle unten „Band“.',hl:()=>[['u','tl_belt']],dn:()=>tool=='belt'||!!(cell(tuG.bx,tuG.fy)&&cell(tuG.bx,tuG.fy).t=='belt')},
 {ti:'Band verlegen',tx:()=>tool!='belt'?'Wähle unten wieder „Band“.':rot?'Drücke „Richtung“, bis der Pfeil nach rechts → zeigt.':'Tippe auf das leuchtende Feld rechts der Formmaschine. Tipp: Ziehen verlegt gleich mehrere Stücke.',hl:()=>tool!='belt'?[['u','tl_belt']]:rot?[['u','tl_rot']]:[['t',tuG.bx,tuG.fy,1,1]],dn:()=>{const q=cell(tuG.bx,tuG.fy);return q?.t=='belt'&&q.r==0}},
 {ti:'Versand wählen',tx:()=>pg!='l'?'Der Versand liegt im Reiter „Logistik“.':'Wähle unten „Versand“.',hl:()=>pg!='l'?[['u','pg_l']]:[['u','tl_shp']],dn:()=>tool=='shp'||!!(cell(tuG.vx,tuG.fy)&&cell(tuG.vx,tuG.fy).t=='shp')},
 {ti:'Versand aufbauen',tx:()=>tool!='shp'?'Wähle unten „Versand“ im Reiter „Logistik“.':'Setze den Versand ans Ende des Bandes – dort werden die Rohlinge verkauft.',hl:()=>tool!='shp'?[['u','tl_shp']]:[['t',tuG.vx,tuG.fy,1,1]],dn:()=>{const q=cell(tuG.vx,tuG.fy);return!!q&&q.t=='shp'}},
 {ti:'Alles verbunden! ✅',tx:()=>G.sl[2]>=1?'Dein erster Rohling ist verkauft: 12 € statt 6 € pro Stück. Mehr Verarbeitung, mehr Wert!':'Schau zu: Holz wird zu Teilen, dann zu Rohlingen – jeder bringt 12 €. Ein ⏸ zeigt, dass eine Maschine wartet.',hl:()=>[['t',tuG.sx,tuG.sy,5,1]],nx:()=>G.sl[2]>=1?'Weiter':tuA>=20?'Weiter ohne Verkauf':'',sf:'achieve'},
 {ti:'Dein erstes Upgrade',tx:()=>{if(!prodM(sel))return(tool!='hand'?'Wähle das Hand-Werkzeug ✋ und tippe':'Tippe')+' eine Maschine an, zum Beispiel die Säge.';const p=plan(sel);return G.m<p.tot?`Das Upgrade kostet ${fm(p.tot)} € – dir fehlen noch ${fm(p.tot-G.m)} €. Spare kurz.`:'Das Fenster zeigt vorher → nachher, z. B. „Zeit pro Stück 4,0 s → 3,4 s“. Kaufe ein Upgrade!'},hl:()=>tool!='hand'?[['u','tl_hand']]:prodM(sel)?[['u','upg']]:[['t',tuG.sx,tuG.sy,1,1]],dn:()=>L.some(o=>o.lv>1&&prodM(o)),sf:'unlock'},
 {ti:'Aufträge',tx:'Kunden bestellen feste Stückzahlen – ganz ohne Zeitdruck. Öffne oben „Markt“ und dann „Aufträge“.',hl:()=>[['u','mk']],dn:()=>mkO&&mkTab===2},
 {ti:'Aufträge erfüllen',tx:'Liefere die Stückzahl über den Versand und kassiere Prämie plus Forschungspunkte. Unter „Markt → Aufträge“ kannst du offene Aufträge tauschen.',hl:()=>[['u','mk']],nx:'Weiter'},
 {ti:'Dein großes Ziel 📖',tx:'Eine Katastrophe naht: Dein Auftrag ist ein Bunker für die ganze Menschheit. Unter „Bunker“ findest du Phasen, Quests und die Frist – sie ist sehr großzügig.',hl:()=>[['u','bk']],nx:'Weiter'},
 {id:'own-line',ti:'Rohstoffversorgung selbst aufbauen',tx:()=>practiceText(0),hl:()=>practiceHighlight(0),nx:'Weiter ohne Bau',dn:()=>practiceDone(0)},
 {ti:'Eine zweite Linie verbinden',tx:()=>practiceText(1),hl:()=>practiceHighlight(1),nx:'Weiter ohne Bau',dn:()=>practiceDone(1)},
 {ti:'Zwischenlager und Rückstau',tx:'Ein Zwischenlager puffert Ware, wenn die nächste Maschine oder der Versand langsamer ist. Ein volles Lager blockiert das Band davor. Fehlt einer Maschine ein Material, wartet sie auch bei freiem Ausgang.',hl:()=>[['u','pg_l']],nx:'Weiter'},
 {ti:'Du bist startklar! 🎓',tx:'Neue Produktlinien schaltest du über 🏭 Hallen frei. Die Engpass-Meldung oben zeigt die betroffene Stelle. Hilfe: 🏢 Firma → ❓ Hilfe.',hl:()=>[['u','ac']],nx:'Los geht’s · +2 FP'}];
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
 return source?.t=='src'&&source.r==0&&(stage==0||band?.t=='belt'&&band.r==0&&ship?.t=='shp');
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
 if(cell(x+1,y)?.t!='belt')return tool!='belt'?[['u','tl_belt']]:rot?[['u','tl_rot']]:[['t',x+1,y,1,1]];
 return pg!='l'?[['u','pg_l']]:tool!='shp'?[['u','tl_shp']]:[['t',x+2,y,1,1]];
}
const TOUR=[
 {ti:'Kamera',tx:'Ziehen verschiebt die Ansicht, Mausrad oder Pinch zoomt. Mit ⌂ stellst du die Standardansicht wieder her.',hl:()=>[['u','camera_home']]},
 {ti:'Bauen',tx:'Unten wählst du Reiter und Maschine, dann tippst du ein freies Feld an. „Richtung“ dreht die Lieferrichtung. Gesperrte Maschinen zeigen, was dir noch fehlt.',hl:()=>[['r','dock']]},
 {ti:'Förderbänder',tx:'Mit „Band“ ziehst du ganze Strecken in einem Zug. Ein Band auf einem Band zu setzen dreht es. Das falsche Material am falschen Ziel wird dir gemeldet.',hl:()=>[['u','tl_belt']]},
 {ti:'Maschinen verbessern',tx:'Hand-Werkzeug: Maschine antippen, dann Upgrade (×1, ×10, ×25, MAX), Drehen oder Abbauen. Das Fenster zeigt immer vorher → nachher.',hl:()=>[['u','tl_hand']]},
 {ti:'Bewegen & Löschen',tx:'„Bewegen“ trägt ein Gebäude an einen neuen Platz (antippen, dann Zielfeld antippen – oder ziehen). „Löschen“ verkauft per Tippen oder Ziehen, dort gibt es auch „Alles verkaufen“.',hl:()=>[['u','tl_mov']]},
 {ti:'Splitter, Fusionator, Kreuzung',tx:'Im Reiter Logistik: Splitter teilen ein Band auf, Fusionatoren führen Bänder zusammen, Kreuzungen lassen Bänder sich überqueren. Jede Seite stellst du im Fenster auf Eingang, Ausgang oder Aus.',hl:()=>[['u','pg_l']]},
 {ti:'Engpass-Anzeige',tx:'Die Meldung oben nennt den größten Engpass und was ein Upgrade bringt. Rote Rahmen markieren die bremsende Maschine, ⏸ heißt: Sie wartet oder staut.',hl:()=>[['r','warning']]},
 {ti:'Aufträge',tx:'Feste Stückzahlen gegen Prämie und Forschungspunkte. Unter „Markt → Aufträge“ kannst du offene Aufträge tauschen.',hl:()=>[['u','mk']]},
 {ti:'Markt',tx:'Preise folgen festen Zyklen und sinken, wenn du viel von einem Produkt verkaufst. Die Prognose hilft beim Planen.',hl:()=>[['u','mk']]},
 {ti:'Forschung',tx:'Forschungspunkte bekommst du für Aufträge, neue Produkte und Verkaufsmeilensteine. Der Baum zeigt alle Voraussetzungen.',hl:()=>[['u','rs']]},
 {ti:'Personal',tx:'Mitarbeiter und Manager machen Maschinen schneller oder günstiger. Manager weist du einer Maschine zu und spezialisierst sie ab Level 5.',hl:()=>[['u','pn']]},
 {ti:'Hallen',tx:'Jede Halle ist eine Produktionslinie: Maschinen lassen sich nur in ihrer Halle bauen. Hier kaufst du neue Hallen und erweiterst sie. Bänder gehen auch auf dem Werkshof.',hl:()=>[['u','hl']]},
 {ti:'Bunker-Projekt',tx:'Sieben Bauabschnitte, jeder mit schweren Quests. Liefere die Waren per Band an die Bunker-Rampe. Die Frist ist sehr großzügig – ohne Strafen.',hl:()=>[['u','bk']]},
 {ti:'Firma',tx:'Erfolge, Prestige (immer freiwillig), Audio-Einstellungen und diese Hilfe. Die Kurztour startest du hier jederzeit neu.',hl:()=>[['u','ac']],nx:'Fertig'}];
TOUR.forEach(t=>{t.nx=t.nx||'Weiter'});
const HNT=[
 {id:'res',ti:'Forschung verfügbar 🔬',tx:'Du hast Forschungspunkte gesammelt! Mit 🔬 öffnest du den Technologiebaum: schnellere Maschinen und Bänder, neue Märkte und mehr. Für jede Technologie siehst du die Voraussetzungen.',hl:()=>[['u','rs']],cd:()=>G.rp>=4},
 {id:'mk',ti:'Märkte & Nachfrage 📊',tx:'Preise schwanken in festen Zyklen und sinken, wenn du viel von einem Produkt verkaufst. Unter 📊 Markt siehst du die Prognose – verteile deine Produktion klug.',hl:()=>[['u','mk']],cd:()=>G.sold>=60},
 {id:'bn',ti:'Engpass erkannt ⚠️',tx:'Die rot umrandete Maschine bremst deine Linie. Die Meldung oben nennt den Grund – oft hilft ein Upgrade genau dort, manchmal ein zweites Band oder mehr Material.',hl:()=>bn?[['t',bn.x,bn.y,1,1]]:[],cd:()=>!!bn&&/^Engpass/.test(msg)},
 {id:'hal',ti:'Neue Halle möglich 🏗️',tx:'Du kannst dir eine neue Halle leisten! Im Menü 🏭 Hallen siehst du Preise, Voraussetzungen und Erweiterungen. Jede Halle ist eine eigene Produktionslinie.',hl:()=>[['u','hl']],cd:()=>HL.some(h=>hlv(h.id)<1&&hReq(h)&&G.m>=h.c[0])},
 {id:'rmp',ti:'Bunker-Rampe bauen 📖',tx:'Die Quests des Bunker-Projekts lieferst du an der Bunker-Rampe ab (Reiter Logistik). Sie nimmt nur an, was gerade gebraucht wird.',hl:()=>[['u','pg_l']],cd:()=>G.sold>=30&&!L.some(o=>o.t=='prj')},
 {id:'mg',ti:'Personal einstellen 👥',tx:'Mitarbeiter und Manager sind jetzt bezahlbar. Ein Manager macht eine Maschine schneller – nach dem Einstellen tippst du „Zuweisen“ und dann die Maschine an.',hl:()=>[['u','pn']],cd:()=>!G.mg.length&&G.sold>=50&&G.m>=800},
 {id:'pr',ti:'Prestige: Neugründung ♻',tx:'Du kannst dein Unternehmen freiwillig neu gründen und bekommst dauerhafte Blaupausen-Boni. Nichts passiert automatisch – alle Details stehen unter 🏢 Firma → Prestige.',hl:()=>[['u','ac']],cd:()=>bpCalc().t>=PMIN}];
HNT.forEach(h=>{h.h=1});
const alteredStart={
 ti:'Deine Startlinie wurde umgebaut',
 tx:'Die markierten Plätze passen nicht mehr zu deiner Fabrik. Du kannst direkt mit dem Aufbau einer eigenen Rohstofflinie und den Lagerübungen weitermachen.',
 nx:'Eigene Linie üben'
};
const tuCur=()=>tuTour>0?TOUR[tuTI]:G.tu>=0&&G.tu<TU.length?(tuG?TU[G.tu]:alteredStart):tuHn;
function tuGeo(){
 const saw=L.find(o=>o.t=='saw'&&o.r==0&&inG(o.x+4,o.y)&&cell(o.x+1,o.y)?.t=='belt');
 if(!saw&&G.tu<11)return null;
 const x=saw?.x??9,y=saw?.y??6;
 if(G.tu<=3&&(!inG(x+4,y)||cell(x+3,y)||cell(x+4,y)))return null;
 if(G.tu==0&&!G.sold&&cell(x+2,y)?.t!='shp')return null;
 return {sx:x,sy:y,fx:x+2,fy:y,bx:x+3,vx:x+4};
}
function tuFin(){G.tu=-1;G.rp+=2;xp(40);tuHT=tm;sfx('level');toast('🎓 Tutorial abgeschlossen: +2 Forschungspunkte');sv(1)}
function tuAdv(){const it=tuCur();if(!it)return;tuA=0;
 if(tuTour){if(tuTI>=TOUR.length-1){tuTour=0;sfx('unlock')}else{tuTI++;sfx('select')}return}
 if(it===alteredStart){G.tu=TU.findIndex(step=>step.id=='own-line');tuG=tuGeo();sv(0);return}
 if(it.h){G.th.push(it.id);tuHn=null;tuHT=tm;sfx('click');sv(0);return}
 sfx(it.sf||'select');G.tu++;if(G.tu>=TU.length)tuFin();else sv(0)}
function tuSkip(){G.tu=-1;tuA=0;tuHT=tm;sfx('click');toast('Tutorial übersprungen – die Hilfe findest du unter 🏢 Firma → ❓ Hilfe.');sv(1)}
function tuUpd(dt){if(!ready||!G||ff)return;tuA+=dt;
 try{const key=tuTour?'T'+tuTI:G.tu>=0&&G.tu<TU.length?'U'+G.tu:tuHn?'H'+tuHn.id:'';if(key!=tuKey){if(tuKey&&key)sfx('select');tuKey=key;tuA=0}
  if(tuTour)return;
  if(G.tu>=0&&G.tu<TU.length){
   tuG=tuGeo();
   const step=tuCur();
   if(step.dn&&step.dn())tuAdv();
   return;
  }
  tuC+=dt;if(!tuHn&&tuC>.5){tuC=0;if(tm-tuHT>25){const h=HNT.find(x=>!G.th.includes(x.id)&&x.cd());if(h){tuHn=h;tuA=0}}}}
 catch(e){console.error('Tutorial:',e);G.tu=-1;tuTour=0}}
function tuWrap(t,w,f){c.font=f;const o=[];let l='';for(const wd of String(t).split(' ')){const q=l?l+' '+wd:wd;if(l&&c.measureText(q).width>w){o.push(l);l=wd}else l=q}if(l)o.push(l);return o}
function tuHi(h){let x,y,w,hh;
 if(h[0]=='t'){[x,y]=worldToView(h[1]*TS,h[2]*TS);w=h[3]*TS*cameraZoom();hh=h[4]*TS*cameraZoom()}
 else if(h[0]=='r'){
  const box=h[1]==='warning'?warningBox():view[h[1]];
  ({x,y,w,h:hh}=box);
 }
 else{const b=[...HB].reverse().find(q=>q.id==h[1]);if(!b)return;x=b.x;y=b.y;w=b.w;hh=b.h}
 const cx=x+w/2,cy=y+hh/2;
 if(h[0]==='t'&&(cx<0||cx>FW||cy<view.headerBottom||cy>view.dock.y)){const a=Math.atan2(cy-CY,cx-CX),px=Math.max(24,Math.min(FW-24,CX+Math.cos(a)*(FW/2-70))),py=Math.max(view.headerBottom+16,Math.min(view.dock.y-30,CY+Math.sin(a)*(FH/2-70)));
  saveCanvas();c.translate(px,py);c.rotate(a);c.fillStyle='#ffd23f';c.beginPath();c.moveTo(14,0);c.lineTo(-8,-10);c.lineTo(-8,10);c.fill();restoreCanvas();tx('⌂ Ansicht zurücksetzen',px,py+28,10.5,'#fde68a','center',700);return}
 const p=.5+.5*Math.sin(tm*5),bob=Math.sin(tm*6)*3;saveCanvas();
 if(h[0]=='t'){c.fillStyle='rgba(255,210,63,.10)';c.fillRect(x,y,w,hh)}
 c.shadowColor='#ffd23f';c.shadowBlur=10+8*p;c.strokeStyle=`rgba(255,210,63,${.65+.35*p})`;c.lineWidth=3;c.beginPath();c.roundRect(x-4-p*2,y-4-p*2,w+8+p*4,hh+8+p*4,10);c.stroke();c.shadowBlur=0;
 if(!(h[0]=='u'&&(h[1]=='upg'||h[1]=='del'))){c.fillStyle='#ffd23f';c.beginPath();if(cy<CY){const ay=y+hh+12+bob;c.moveTo(cx,ay);c.lineTo(cx-8,ay+12);c.lineTo(cx+8,ay+12)}else{const ay=y-12-bob;c.moveTo(cx,ay);c.lineTo(cx-8,ay-12);c.lineTo(cx+8,ay-12)}c.closePath();c.fill()}restoreCanvas()}
function tuDraw(){
 if(window.NOFIN||!ready||ff||!G)return;
 if(mkO||rsO||pnO||acO||hlO||bkO||planningOpen||lineOpen||growthOpen||saveOpen||statsOpen)return;
 const it=tuCur();if(!it)return;
 try{const tour=tuTour>0,iv=!tour&&!it.h,N=tour?TOUR.length:TU.length,ix=tour?tuTI:G.tu;
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
  if(iv){if(ix<N-1){btn(X+P,by,92,24,tuSkip,'#334155',0,'tskip');tx('Überspringen',X+P+46,by+16,11,'#fff','center',700)}rr(X+10,Y+H-5,W-20,3,1.5,'#ffffff18');rr(X+10,Y+H-5,(W-20)*ix/N,3,1.5,'#ffd23f')}
  else if(tour){btn(X+P,by,92,24,()=>{tuTour=0;sfx('click')},'#334155',0,'tend');tx('✕ Beenden',X+P+46,by+16,11,'#fff','center',700)}
  const nx=it.h?'Verstanden':typeof it.nx=='function'?it.nx():it.nx;if(nx){const bw=Math.min(W-2*P-96,181,Math.max(108,nx.length*6.4+22));btn(X+W-P-bw,by,bw,24,tuAdv,'#2f9e6b',0,'tnext');fitText(nx,X+W-P-bw/2,by+16,bw-8,11.5,'#fff','center',800)}
  restoreCanvas()}catch(e){restoreCanvas();console.error('Tutorial:',e)}}
function heTab(X,Y,W,H){tx('Hilfe & Steuerung',X+26,Y+68,15,'#fff','left',800);
 const R=[['Kamera','Ziehen verschiebt die Ansicht, Mausrad oder Pinch zoomt, ⌂ stellt die Standardansicht wieder her.'],['Bauen','Unten Reiter und Maschine wählen, dann ein freies Feld antippen. Maschinen gehören in ihre Halle (🏭 Hallen), Bänder gehen überall.'],['Verteiler','Splitter teilen, Fusionatoren vereinen, Kreuzungen kreuzen. Seiten im Fenster auf Eingang, Ausgang oder Aus stellen.'],['Maschine','Antippen: Upgrade, Drehen, Abbauen. „Bewegen“ versetzt Gebäude, „Löschen“ verkauft (50 %) – auch alles auf einmal.'],['Engpass','Roter Rahmen und Meldung oben zeigen, welche Maschine die Linie bremst – und was ein Upgrade bringt.'],['Offline','Bis zu 8 Std. läuft die Fabrik weiter – mit 25 % Effizienz (Forschung: 40 %). Die Bunker-Frist ist sehr großzügig.']];
 R.forEach(([a,b],i)=>{const y=Y+86+i*33;tx(a,X+26,y,11.5,'#7dd3fc','left',800);tuWrap(b,W-140,'600 11px system-ui,sans-serif').forEach((l,j)=>tx(l,X+112,y+j*13,11,'#cbd5e1','left',600))});
 btn(X+26,Y+H-42,168,30,()=>{tuTour=1;tuTI=0;tuA=0;acO=false;mkO=rsO=pnO=false;sfx('click')},'#2f9e6b');tx('▶ Kurztour starten',X+110,Y+H-22,12.5,'#fff','center',800);
 btn(X+202,Y+H-42,190,30,()=>{G.th=[];tuHn=null;tuHT=-99;sfx('click');toast('Tipps werden wieder angezeigt, sobald sie passen.');sv(0)},'#334155');tx('💡 Tipps erneut zeigen',X+297,Y+H-22,12,'#fff','center',700);
 tx(G.tu>=0&&G.tu<TU.length?'Einsteiger-Tutorial: Schritt '+(G.tu+1)+' von '+TU.length:'Einsteiger-Tutorial: abgeschlossen',X+W-26,Y+H-22,10.5,'#94a3b8','right',600)}
/* ---- Demo-Fabrik für das Vorschaubild (thumbs() ruft mk()/update()/draw() beim Seitenstart auf; kein Speicher, keine Cloud) ---- */
function demo(){init(null);stQ=[];G.tu=-1;G.th=[];G.hl={gar:1,met:1};L=[];g=[];pg='m';G.rs=['met','wrk','spd1','lag'];G.rp=11;G.xp=1400;G.ac=['first','s100','o1','line','tool','r1','mg1','hall1','lv5'];G.sold=312;setLv();G.emp={...G.emp,p:3,q:2,l:1};G.mg=[{id:'prod',lv:6,sp:1,x:9,y:4},{id:'qual',lv:3,sp:0,x:12,y:6}];rfx();
 [[7,4,'src',0,3],[8,4,'belt',0],[9,4,'saw',0,4],[10,4,'belt',0],[11,4,'frm',0,3],[12,4,'belt',0],[13,4,'asm',0,3],[14,4,'belt',0],[15,4,'belt',0],[16,4,'belt',1],[16,5,'belt',1],[16,6,'belt',2],[15,6,'pnt',2,3],[14,6,'sto',2],[13,6,'pck',2,2],[12,6,'shp',2],
  [7,8,'src',0,2],[8,8,'belt',0],[9,8,'saw',0,2],[10,8,'belt',0],[11,8,'wrk',3,2],[11,7,'belt',3],[11,6,'shp',3],
  [12,8,'belt',2],[13,8,'belt',2],[14,8,'belt',2],[15,8,'mil',2,2],[16,8,'sme',2,2],[17,8,'ers',2,2]].forEach(([x,y,t,r,l])=>put(x,y,t,r,l,[1,1]));
 G.m=4820;G.sold=312;G.pk=64;G.ord=2;G.sa=[0,35,30,25,20,55,0,20,28,40];G.sl=[0,60,40,30,22,64,0,18,30,48];G.tk=2900;recalc();fs=1;for(let i=0;i<640;i++)tick();fs=0;sb.fill(2.3);rw=60;ready=1;cam={x:12*TS,y:6.2*TS,z:1};analyze();lr=Date.now()}
const {loadParcel,clearBelt,beltDirections,moveBelt,jtick,sortingGroups}=createFactoryTransport({
 TICK,MD,PR,isBelt,beltSize,beltTime,currentTick:()=>G.tk,junctionTime:()=>BTv,neighbor,tunnelExit,
 give,record,prod,uses,prjNeed,orderFor
});
const audio=createFactoryAudio({
 time:()=>tm,
 frame:()=>({cam:{...cam,z:cameraZoom()},CX,CY,FW,FH,L,TS}),
 mood:()=>{const count=HL.filter(h=>hlv(h.id)>0).length;return G?.pr>0||count>=5?3:count>=3?2:count>=2?1:0},
 cloudRef:()=>stillSignedIn()&&cloud.base!=null?OL.db.ref('users/'+cloud.uid+'/factoryAudio'):null,
 writeLocal,toast,isBelt,tme
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
 refreshLayout();HB=[];panelSurface=null;
 withCanvasState(()=>{
  if(cv.width>0&&cv.height>0)c.setTransform(cv.width/FW,0,0,cv.height/FH,0,0);
  c.fillStyle='#14181e';c.fillRect(0,0,FW,FH);
  if(!ready){tx('Lade deine Fabrik …',FW/2,FH/2,22,'#cbd5e1','center',700);return}

  drawLayer('Kartenansicht',world);
  if(!drawLayer('Bedienelemente',ui)){
   HB=[];closeP2();
  }
  drawLayer('Tutorial',tuDraw);
  if(pfl>0){c.fillStyle='rgba(255,255,255,'+(pfl*.85)+')';c.fillRect(0,0,FW,FH)}
  if(ff)drawLayer('Offline-Fortschritt',drawOfflineProgress);
 });
}

/* ---- Schnittstelle zum Spiel-Rahmen ---- */
return{
boot(){tuTour=0;tuHn=null;tuG=null;tuKey='';audLoad();audioStart();document.addEventListener('pointerdown',audG);document.addEventListener('keydown',audG);document.addEventListener('visibilitychange',onHide);addEventListener('pagehide',onHide);addEventListener('blur',resetCameraInput);cv.addEventListener('wheel',wh,{passive:false});cv.addEventListener('mousemove',mm);cv.addEventListener('mouseleave',ml)},
leave(){sv(1);audStop();document.removeEventListener('pointerdown',audG);document.removeEventListener('keydown',audG);document.removeEventListener('visibilitychange',onHide);removeEventListener('pagehide',onHide);removeEventListener('blur',resetCameraInput);cv.removeEventListener('wheel',wh);cv.removeEventListener('mousemove',mm);cv.removeEventListener('mouseleave',ml);resetCameraInput()},
click(x,y,_player,id,pointerType){
 if(!ready||ff||!Number.isFinite(x)||!Number.isFinite(y))return;
 const h=hitAt(x,y),blocked=!!openMenu();
 const touch=pointerType==='touch';
 if(touch&&(touchPointers.size||!h&&!blocked)&&(trackTouch(x,y,id)||multiTouch))return;
 if(pdn&&pdn.id!==id)return;
 const scroll=panelSurface&&FactoryLayout.contains(panelSurface.clip,x,y);
 pdn={h,x,y,lastX:x,lastY:y,id,touch,blocked,scroll};
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
 if(pdn.scroll&&mv){
  if(!ending)scrollPanel(pdn.lastX-x,pdn.lastY-y);
  pdn.lastX=x;pdn.lastY=y;
  return;
 }
 if(pdn.h||pdn.blocked||!mv)return;
 startWorldEdit(pdn);
 if(tool=='del'){const[a,b]=tileAt(x,y);hv=[a,b];if(!lt||a!=lt[0]||b!=lt[1]){if(delAt(a,b))pdn.dl=1;lt=[a,b]}}
 else if(tool=='mov'&&pdn.pick&&mvO){hv=tileAt(x,y)}
 else if(isBelt(tool)&&!MD[tool]?.sortStation){const[a,b]=tileAt(x,y);if(lt&&(a!=lt[0]||b!=lt[1])){const dx=a-lt[0],dy=b-lt[1];if(Math.abs(dx)+Math.abs(dy)==1){const d=DX.findIndex((v,i)=>v==dx&&DY[i]==dy),p=cell(lt[0],lt[1]);if(p?.t==tool)rotObj(p,d);rot=d;if(place(a,b,tool,d))lt=[a,b]}else lt=[a,b]}}
 else{
  const dx=x-pdn.lastX,dy=y-pdn.lastY;
  pdn.lastX=x;pdn.lastY=y;
  if(!dx&&!dy)return;
  cam.x-=dx/cameraZoom();cam.y-=dy/cameraZoom();clampCam();lastCameraMotion=tm;
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
 const[a,b]=tileAt(p.x,p.y);if(buildMode){buildTap(a,b);return}if(asg){assignTap(a,b);return}if(tool=='hand'){sel=cell(a,b)||null;if(!sel){const r=areaAt(a,b);if(r&&hlv(r.id)<1){hsel=r.id;closeP2();if(r.site){growthOpen=true;growthTab=0}else hlO=true;sfx('click')}else if(inR(SITE,a,b)){closeP2();bkO=true;sfx('click')}}}else if(MD[tool])place(a,b,tool,rot)},
update(dt){
 if(!ready){
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
 const n=Date.now(),r0=Math.max(0,(n-lr)/1000),raw=r0>60?Math.min(r0,KOF)*OFFE:r0;lr=n;tm+=dt;acc+=raw;
 if(!ff&&(r0>120||acc>20))ff=offlineStart(r0);
 const steps=Math.floor((acc+1e-9)/TICK);
 fs=steps>40?1:0;
 const ran=FactoryRuntime.step(steps,tick);
 fs=0;
 acc=Math.max(0,acc-ran*TICK);
 if(saveAfterTick){saveAfterTick=false;sv(true)}
 if(ff){
  ff.left=Math.floor((acc+1e-9)/TICK);
  if(!ff.left){
   const report=ff;ff=null;analyze();offlineReport(report);sv(false);
  }
 }
 for(const o of L){if(o.bt<1)o.bt=Math.min(1,o.bt+dt*3);if(o.fl>0)o.fl=Math.max(0,o.fl-dt*1.6);o.dv+=(o.ew-o.dv)*.1}
 for(const k in afl)afl[k]=Math.max(0,afl[k]-dt*1.2);for(const k in rflash)rflash[k]=Math.max(0,rflash[k]-dt*1.5);pfl=Math.max(0,pfl-dt*1.2);PO=PO.filter(p=>(p.t+=dt)<1.2);tl+=dt;if(tl>1){tl=0;analyze();warnChk()}at+=dt;if(at>20){at=0;sv(0)}tuUpd(dt);stShow();audMach(dt);audCloudSync();},
draw:drawFrame,pointerPosition,
dbg:()=>({AUD:audio.getContext,ASg:()=>AS,audStart:audioStart,audTick:musTick,musFill,audMach,sfxAt:sfx,mshot,SFX,MS,MOODS,audSetK:(k,v)=>{AS[k]=v;audApply();audSave()},aud,audCloudSync,audFlush:audio.clearPending,bpCalc,doPrestige,buyP,PU,pul,pcfSet:v=>{pcf=v},fTabSet:v=>{fTab=v},del,xp,setLv,lv:()=>LV,AC,chkAc,acOpen:v=>{acO=v},pnOpen:v=>{pnO=v},RN,rOK,buyR,rfx,RH,rsOpen:v=>{rsO=v},rsel:id=>{rsel=id},fx:()=>({STC,BTv,SPm,KM,RM,PM,OS,WG,OFFE,KOF,RCm}),MG,hireE,fireE,hireM,lvlM,specM,recalc,cap,assignTo:(id,x,y)=>{const m=G.mg.find(q=>q.id==id);m.x=x;m.y=y;recalc()},dem,sx,price,rawCost,mkOpen:v=>{mkO=v},ITEMS,MD,acc2,view:(x,y,z)=>{cam={x:x*TS,y:y*TS,z}},fm,cst,nf,uc,tme,doPrestige,bpCalc,rrLeft,fillOrders,get ff(){return ff},get lr(){return lr},HL,PH,STX,hlv,hReq,hNext,buyHall,bchk,delAt,sellAll,moveObj,prjIn,phaseDone,get stQ(){return stQ},bProg,dLeft,hallOf,hrect,areaAt,inG,jtick,put,setTool:t=>{tool=t},mvSet:o=>{mvO=o},hselGet:()=>hsel,togP,rotObj,storyIntro,feed,itemPos,rate,G,L,g,tick,analyze,place,plan,buy,sb,give,sv,init,inputCap,currentStats,upgradeBelt,lineMetrics,allProductionLines,lostConnections,recipeTree,beltCapacity,cell,footprint,placement,makePlan,previewPlan,commitBuild,planRoute,checkBuild,connectedLine,REGIONS,switchSite,companyValue,cloud,flushCloud,chooseSave,applySave,get msg(){return msg},get bn(){return bn},sel:o=>{sel=o},tuD:()=>({HB,view,panelSurface,panelScroll,cur:tuCur(),TU,TOUR,HNT,tuHn,tuTour,tuTI,tuG,rot,tool,pg,sel,cam,fTab,acO,hlO,bkO,mkO,mvO,delAsk})})}};
