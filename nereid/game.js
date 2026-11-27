/* Abyss Protocol — original 2D social deduction, host-authoritative game rules. */
const Nereid=(()=>{
 'use strict';
 const T=40,C=38,R=21,MW=C*T,MH=R*T;
 const colors=['#68e4db','#ffac73','#aeb5ff','#e6df83','#ec8eb7','#79c4ff','#9fe393','#f08379','#d6b4ff','#d2dce5'];
 const rooms=[
  ['PUMPWERK',1,1,7,5,'#244b58'],['BIO-LABOR',21,1,7,5,'#325650'],
  ['LAGER',1,8,7,5,'#4d4754'],['ATRIUM',10,6,9,8,'#304c60'],
  ['FUNKZENTRALE',21,8,7,5,'#41465e'],['WERKSTATT',1,15,7,5,'#514b42'],
  ['TAUCHDOCK',10,16,9,4,'#34545a'],['ENERGIEKERN',21,15,7,5,'#4c485f'],
  ['OBSERVATORIUM',30,1,7,6,'#264d65'],['ALGENZUCHT',30,9,7,6,'#3a6258']
 ];
 const halls=[[5,5,2,4],[7,3,15,2],[7,9,4,3],[18,9,4,3],[23,5,2,4],[5,12,2,4],[23,12,2,4],[7,17,4,2],[18,17,4,2],[13,13,3,4],[13,4,3,3],[27,3,4,2],[27,10,4,2],[32,6,3,4],[26,13,3,3],[28,14,5,2],[8,4,2,4],[9,6,2,2],[19,4,2,4],[18,6,2,2],[8,12,2,5],[9,12,2,2],[19,12,2,5],[18,12,2,2]];
 const floor=Array.from({length:R},()=>Array(C).fill(false));
 for(const [,x,y,w,h] of rooms)for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)floor[j][i]=true;
 for(const [x,y,w,h] of halls)for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)floor[j][i]=true;
 const at=(x,y)=>({x:(x+.5)*T,y:(y+.5)*T});
 const stations=[
  {name:'Pumpwerk',...at(3,3),kind:'pulse'},
  {name:'Bio-Labor',...at(25,3),kind:'sort'},
  {name:'Lager',...at(3,10),kind:'align'},
  {name:'Funkzentrale',...at(25,10),kind:'route'},
  {name:'Werkstatt',...at(3,17),kind:'sort'},
  {name:'Tauchdock',...at(15,18),kind:'route'},
  {name:'Energiekern',...at(25,17),kind:'pulse'},
  {name:'Observatorium',...at(34,3),kind:'spectral'},
  {name:'Algenzucht',...at(34,11),kind:'balance'},
  {name:'Atrium · Archiv',...at(11,7),kind:'matrix'},
  {name:'Tauchdock · Fracht',...at(11,18),kind:'cargo'}
 ];
 const diagnostic=at(16,11);
 const meeting=at(14,9),ports=[at(6,2),at(26,11),at(6,18),at(26,18)];
 const sectors=['West / Nord','Ost / Nord','West / Mitte','Zentrale','Ost / Mitte','West / Süd','Zentrale / Süd','Ost / Süd','Außenring / Nord','Außenring / Süd'];
 function location(p){const i=rooms.findIndex(([,x,y,w,h])=>p.x>=x*T&&p.y>=y*T&&p.x<(x+w)*T&&p.y<(y+h)*T);return i<0?'Verbindungsgang':rooms[i][0]}
 function guidance(p,ids,done){const choices=ids.filter(i=>stations[i]&&!done.includes(i));if(!choices.length)return null;const next=choices.sort((a,b)=>distance(p,stations[a])-distance(p,stations[b]))[0];return {id:next,point:route(p,stations[next]),distance:Math.round(distance(p,stations[next])/T)}}
 const phrases=['Ich war bei einer Aufgabe.','Ich habe eine Störung entdeckt.','Ich war im Atrium.','Ich war im Westen.','Ich war im Osten.','Hat jemand etwas gesehen?','Ich bin mir nicht sicher.','Lasst uns die Runde überspringen.'];
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const walk=(x,y)=>!!floor[Math.floor(y/T)]?.[Math.floor(x/T)];
 const fits=(x,y)=>walk(x-12,y-12)&&walk(x+12,y-12)&&walk(x-12,y+12)&&walk(x+12,y+12);
 function sight(a,b,range=Infinity){const d=distance(a,b);if(d>range)return false;for(let i=0;i<=Math.ceil(d/14);i++){const f=i/Math.max(1,Math.ceil(d/14));if(!walk(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f))return false}return true}
 const near=(a,b,r=65)=>distance(a,b)<=r&&sight(a,b);
 function shuffle(a,rand=Math.random){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 function spawn(p){const a=p.id*2.399; p.x=meeting.x+Math.cos(a)*82;p.y=meeting.y+Math.sin(a)*82;p.dx=p.dy=0;p.inputUntil=0;p.waypoint=null;p.workUntil=0}
 const specialName=p=>p?.special==='analyst'?'Analyst':p?.special==='support'?'Systemwart':p?.role==='glitch'?'Störeinheit':'Techniker';
 function normalizeLobby(v={},id=0){return {x:Number.isFinite(v.x)?Math.max(70,Math.min(930,Math.round(v.x))):170+(id%5)*165,y:Number.isFinite(v.y)?Math.max(130,Math.min(510,Math.round(v.y))):220+Math.floor(id/5)*155,style:[0,1,2,3].includes(v.style)?v.style:0,ready:v.ready===true}}
 function newRound(seats,opts={},rand=Math.random){
  const players=seats.map((q,i)=>q&&['p','cpu'].includes(q.k)?{id:i,name:q.name||'Drohne '+(i+1),bot:q.k==='cpu',alive:true,role:'tech',style:normalizeLobby(q,i).style,special:'',specialUsed:false,scanCool:0,scan:null,tasks:shuffle(stations.map((_,j)=>j),rand).slice(0,[2,3,4,5].includes(opts.tasks)?opts.tasks:3),done:[],cool:18,meeting:1,dx:0,dy:0,inputUntil:0,botWait:0}:null).filter(Boolean);
  if(players.length<4||players.length>10)throw Error('4–10 Teilnehmer erforderlich');
  const glitches=shuffle(players,rand).slice(0,players.length>=7&&opts.two?2:1);
  glitches.forEach(p=>p.role='glitch');
  if(opts.special!==false&&players.length>=5){const crew=shuffle(players.filter(p=>p.role==='tech'),rand);crew[0].special='analyst';if(players.length>=7&&crew[1])crew[1].special='support'}
  players.forEach(spawn);
  return {ph:'run',rn:Date.now(),players,t:0,seq:0,markers:[],alert:null,sabCool:25,meetingCool:12,meetingEnd:0,meetingStarted:0,votes:{},notes:[],cause:'',result:'',verdict:null,total:players.filter(p=>p.role==='tech').reduce((n,p)=>n+p.tasks.length,0),opts:{discussion:opts.discussion===45?45:30},rand};
 }
 const player=(s,id)=>s.players.find(p=>p.id===id);
 function progress(s){return s.players.filter(p=>p.role==='tech').reduce((n,p)=>n+p.done.length,0)}
 function checkWin(s){
  if(s.ph==='end')return;
  const tech=s.players.filter(p=>p.alive&&p.role==='tech').length,glitch=s.players.filter(p=>p.alive&&p.role==='glitch').length;
  if(!glitch||progress(s)>=s.total){s.ph='end';s.result='tech'}
  else if(glitch>=tech||s.alert?.kind==='pressure'&&s.alert.until<=s.t){s.ph='end';s.result='glitch'}
 }
 function beginMeeting(s,by,cause){
  s.ph='meeting';s.meetingStarted=s.t;s.meetingEnd=s.t+s.opts.discussion;s.votes={};s.notes=[];s.verdict=null;s.cause=by.name+' · '+cause;
  s.players.forEach(p=>{p.dx=p.dy=0;p.inputUntil=0});
  // Interrupt the fictional alert during a meeting so the timer stays fair.
  s.alert=null;s.markers=[];
 }
 function finishMeeting(s){
  const tally={};for(const v of Object.values(s.votes))tally[v]=(tally[v]||0)+1;
  const ranked=Object.entries(tally).sort((a,b)=>b[1]-a[1]);let out=null;
  if(ranked.length&&ranked[0][0]!=='-1'&&(!ranked[1]||ranked[0][1]>ranked[1][1]))out=player(s,+ranked[0][0]);
  s.verdict={out:out?.id??-1,tally:Object.entries(tally).map(([id,n])=>[Number(id),n]),eligible:s.players.filter(p=>p.alive).length,cast:Object.keys(s.votes).length};
  if(out)out.alive=false;
  s.players.forEach(p=>{p.evidence=null;p.lastSeen=null;p.workUntil=0;p.scan=null});
  s.cause=out?out.name+' wurde isoliert.':'Keine eindeutige Mehrheit.';
  s.ph='result';s.meetingEnd=s.t+5;s.meetingCool=s.t+20;checkWin(s);
 }
 function challenge(s,p,id){
  const seed=(s.rn%997)+(p.id+3)*37+(id+11)*71;
  const values=Array.from({length:4},(_,i)=>(Math.imul(seed+i*97,2654435761)>>>((i+1)*3))%4);
  if(['sort','spectral','cargo'].includes(stations[id]?.kind))return [0,1,2,3].sort((a,b)=>(Math.imul(seed+a*13,1597334677)>>>0)-(Math.imul(seed+b*13,1597334677)>>>0));
  return values;
 }
 function sortValues(pattern){const values=[];pattern.forEach((slot,i)=>values[slot]=[12,29,47,81][i]);return values}
 function routePath(pattern){const delta=[[0,-1],[1,0],[0,1],[-1,0]],points=[[4,4]];for(const dir of pattern){const p=points.at(-1),d=delta[dir];points.push([p[0]+d[0],p[1]+d[1]])}return points}
 function vision(p,range,rays=112){
  return Array.from({length:rays},(_,i)=>{const a=i*Math.PI*2/rays,dx=Math.cos(a),dy=Math.sin(a);let length=0;for(let d=5;d<=range;d+=5){if(!walk(p.x+dx*d,p.y+dy*d))break;length=d}return [p.x+dx*length,p.y+dy*length]});
 }
 function apply(s,id,a){
  const p=player(s,id);if(!p||!a||typeof a!=='object'||s.ph==='end')return false;
  if(a.k==='move'&&s.ph==='run'){
   if(!Number.isFinite(a.x)||!Number.isFinite(a.y))return false;
   const n=Math.max(1,Math.hypot(a.x,a.y));p.dx=a.x/n;p.dy=a.y/n;p.inputUntil=s.t+.45;return true;
  }
  if(s.ph==='meeting'){
   if(!p.alive)return false;
   if(a.k==='vote'&&!Object.hasOwn(s.votes,id)&&(a.v===-1||player(s,a.v)?.alive)){s.votes[id]=a.v;return true}
   if(a.k==='say'&&Number.isInteger(a.v)&&phrases[a.v]&&s.t-(p.lastSay??-10)>2){
    p.lastSay=s.t;s.notes.push([id,a.v]);s.notes=s.notes.slice(-10);return true
   }
   return false;
  }
  if(s.ph!=='run')return false;
  if(a.k==='task'&&p.tasks.includes(a.v)&&!p.done.includes(a.v)&&stations[a.v]&&near(p,stations[a.v])&&Array.isArray(a.answer)&&a.answer.length===4&&a.answer.every(Number.isInteger)&&a.answer.join(',')===challenge(s,p,a.v).join(',')){
   // Glitches can mimic an assignment, but contribute no station progress.
   p.done.push(a.v);checkWin(s);return true;
  }
  if(!p.alive)return false;
  if(a.k==='report'&&s.markers.some(m=>near(p,m,76))){beginMeeting(s,p,'Ausfall gemeldet');return true}
  if(a.k==='meeting'&&p.meeting>0&&s.t>=s.meetingCool&&!s.alert&&near(p,meeting,80)){p.meeting--;beginMeeting(s,p,'Notbesprechung');return true}
  if(a.k==='repair'&&s.alert&&near(p,stations[s.alert.station],76)){s.alert=null;s.sabCool=s.t+26;return true}
  if(a.k==='scan'&&s.t>=p.scanCool&&!s.alert&&(near(p,diagnostic,70)||p.special==='analyst')){
   p.scan={until:s.t+9,counts:rooms.map(([name])=>s.players.filter(q=>q.alive&&location(q)===name).length)};p.scanCool=s.t+30;return true
  }
  if(a.k==='stabilize'&&p.special==='support'&&!p.specialUsed&&s.alert?.kind==='pressure'){
   p.specialUsed=true;s.alert.until+=12;return true
  }
  if(p.role!=='glitch')return false;
  if(a.k==='disable'&&s.t>=p.cool){
   const q=player(s,a.v);if(!q||!q.alive||q.role==='glitch'||!near(p,q,60))return false;
   for(const witness of s.players)if(witness.alive&&witness.id!==p.id&&witness.id!==q.id&&sight(witness,p,s.alert?.kind==='signal'?130:300)&&sight(witness,q,300))witness.evidence={id:p.id,t:s.t};
   q.alive=false;q.dx=q.dy=0;s.markers.push({id:q.id,x:q.x,y:q.y});p.cool=s.t+24;checkWin(s);return true;
  }
  if(a.k==='alert'&&!s.alert&&s.t>=s.sabCool&&['signal','pressure'].includes(a.v)){
   s.alert={kind:a.v,station:a.v==='signal'?3:6,until:s.t+48};s.sabCool=s.t+45;return true
  }
  if(a.k==='port'&&Number.isInteger(a.v)&&ports[a.v]&&ports.some(q=>near(p,q,55))&&s.t>=(p.portCool||0)){
   p.x=ports[a.v].x;p.y=ports[a.v].y;p.portCool=s.t+12;return true
  }
  return false;
 }
 function route(a,b){
  const sx=Math.floor(a.x/T),sy=Math.floor(a.y/T),tx=Math.floor(b.x/T),ty=Math.floor(b.y/T);
  const start=sy*C+sx,goal=ty*C+tx;if(start===goal)return b;
  
  const queue=[start],prev=new Map([[start,-1]]);
  for(let i=0;i<queue.length;i++){const k=queue[i];if(k===goal)break;const x=k%C,y=Math.floor(k/C);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*C+nx;if(floor[ny]?.[nx]&&!prev.has(n)){prev.set(n,k);queue.push(n)}}
  }
  if(!prev.has(goal))return b;let n=goal;while(prev.get(n)!==start)n=prev.get(n);return at(n%C,Math.floor(n/C))
 }
 function bot(s,p,dt){
  if(s.ph==='meeting'){
   if(p.alive&&!Object.hasOwn(s.votes,p.id)&&s.t>s.meetingEnd-12-p.id*.5){
    const others=s.players.filter(q=>q.alive&&q.id!==p.id&&(p.role!=='glitch'||q.role!=='glitch'));
    apply(s,p.id,{k:'vote',v:p.role==='tech'&&p.evidence&&player(s,p.evidence.id)?.alive?p.evidence.id:others.length&&p.role==='glitch'&&s.rand()>.35?others[Math.floor(s.rand()*others.length)].id:-1})
   }return;
  }
  if(s.ph!=='run')return;
  if(s.t<p.botWait){p.dx=p.dy=0;return}
  let target;
  const marker=s.markers.find(m=>near(p,m,76));
  if(marker&&p.alive&&p.role==='tech'&&s.rand()<.12){apply(s,p.id,{k:'report'});return}
  if(s.alert?.kind==='pressure'&&p.alive&&p.special==='support'&&!p.specialUsed&&s.alert.until-s.t<12)apply(s,p.id,{k:'stabilize'});
  if(s.alert&&p.alive&&p.role==='tech'&&(s.alert.kind==='pressure'||p.id%2===0)){
   target=stations[s.alert.station];if(near(p,target,65)){apply(s,p.id,{k:'repair'});p.botWait=s.t+1;return}
  }else if(p.role==='glitch'&&p.alive&&s.t>=p.cool){
   const candidates=s.players.filter(q=>q.alive&&q.role==='tech'&&sight(p,q,s.alert?.kind==='signal'?125:280)).sort((a,b)=>distance(p,a)-distance(p,b));
   target=candidates[0];
   if(target)p.lastSeen={x:target.x,y:target.y,t:s.t};
   else if(p.lastSeen&&s.t-p.lastSeen.t<4&&distance(p,p.lastSeen)>25)target=p.lastSeen;
   if(target&&Number.isInteger(target.id)&&near(p,target,52)){
    const crowded=s.players.some(q=>q.alive&&q.id!==p.id&&q.id!==target.id&&q.role==='tech'&&sight(q,p,200));
    if(!crowded||s.rand()<dt*.15){apply(s,p.id,{k:'disable',v:target.id});p.botWait=s.t+2;return}
    target=null;
   }
   if(!s.alert&&s.t>=s.sabCool&&s.rand()<dt*.1)apply(s,p.id,{k:'alert',v:'signal'})
  }
  if(!target){const i=p.tasks.find(j=>!p.done.includes(j));target=stations[i];
   if(target&&near(p,target,42)){if(!p.workUntil)p.workUntil=s.t+3+s.rand()*4;if(s.t>=p.workUntil){apply(s,p.id,{k:'task',v:i,answer:challenge(s,p,i)});p.workUntil=0;p.botWait=s.t+1}p.dx=p.dy=0;p.waypoint=null;return}
   if(!target){if(!p.wander||near(p,p.wander,28))p.wander=stations[Math.floor(s.rand()*stations.length)];target=p.wander}
  }
  // Keep the waypoint until its center is reached, rather than reversing mid-tile.
  if(!p.waypoint||distance(p,p.waypoint)<7)p.waypoint=route(p,target);
  const step=p.waypoint,dx=step.x-p.x,dy=step.y-p.y,n=Math.hypot(dx,dy)||1;
  const speed=Math.min(1,n/Math.max(1,102*dt));p.dx=dx/n*speed;p.dy=dy/n*speed;p.inputUntil=s.t+.5;
  if(!fits(p.x+p.dx*102*dt,p.y)&&!fits(p.x,p.y+p.dy*102*dt)){
   const center=at(Math.floor(p.x/T),Math.floor(p.y/T));p.waypoint=center;
  }
 }
 function step(s,dt){
  if(!Number.isFinite(dt))return;
  dt=Math.max(0,Math.min(.1,dt));if(!dt||s.ph==='end')return;s.t+=dt;
  if(s.ph==='result'){if(s.t>=s.meetingEnd){s.ph='run';s.players.forEach(spawn)}return}
  for(const p of s.players)if(p.bot)bot(s,p,dt);
  if(s.ph==='meeting'){
   if(s.t>=s.meetingEnd||s.players.filter(p=>p.alive).every(p=>Object.hasOwn(s.votes,p.id)))finishMeeting(s);return
  }
  if(s.ph!=='run')return;
  for(const p of s.players){if(p.inputUntil<s.t)p.dx=p.dy=0;
   const speed=p.bot?102:147,dx=p.dx*speed*dt,dy=p.dy*speed*dt;
   if(fits(p.x+dx,p.y))p.x+=dx;
   if(fits(p.x,p.y+dy))p.y+=dy;
  }
  if(s.alert?.kind==='signal'&&s.alert.until<=s.t)s.alert=null;
  checkWin(s);
 }
 function gone(s,id){const p=player(s,id);if(p){p.bot=true;p.dx=p.dy=0}}
 function publicState(s){
  return {ph:s.ph,rn:s.rn,seq:++s.seq,t:Math.round(s.t*10)/10,players:s.players.map(p=>({id:p.id,name:p.name,bot:p.bot,style:p.style,alive:p.alive,x:Math.round(p.x),y:Math.round(p.y),dx:Math.round(p.dx*10)/10,dy:Math.round(p.dy*10)/10,...(s.ph==='end'?{role:p.role,special:p.special}:{})})),markers:s.markers,alert:s.alert,meetingEnd:s.meetingEnd,meetingStarted:s.meetingStarted,meetingCool:s.meetingCool,...(s.ph==='result'||s.ph==='end'?{verdict:s.verdict}:{}),meetingVotes:Object.keys(s.votes).map(Number),notes:s.notes,cause:s.cause,result:s.result,done:progress(s),total:s.total};
 }
 function privateState(s,id){const p=player(s,id);return p?{rn:s.rn,role:p.role,tasks:p.tasks,done:p.done,cool:p.cool,meeting:p.meeting,sabCool:s.sabCool,portCool:p.portCool||0,special:p.special,specialUsed:p.specialUsed,scanCool:p.scanCool,...(p.scan&&p.scan.until>s.t?{scan:p.scan}:{}),...(p.role==='glitch'?{allies:s.players.filter(q=>q.role==='glitch').map(q=>q.id)}:{})}:null}
 return {T,C,R,MW,MH,rooms,halls,floor,stations,meeting,ports,colors,phrases,at,near,sight,fits,newRound,apply,step,gone,publicState,privateState,challenge,sortValues,routePath,vision,route,player,location,guidance,sectors,diagnostic,normalizeLobby,specialName};
})();
function nereidGame(){
 const E=Nereid,esc=s=>String(s??'').replace(/[&<>"']/g,a=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[a]));
 let mode='setup',state=null,snap=null,secret=null,room=null,ref=null,roleRef=null,code='',my=0,host=false,alive=true,busy=false,opts={bots:6,two:true,tasks:3,discussion:30,special:true},clock=0,publishAt=0,sendAt=0,seq=0,seen={},privateCache={},panel='',task=null,touch=null,buttons=[],smooth={},camera={x:0,y:0},camReady=false,phase='',overlayKey='',lastText='',lobbyStamp='',lastMotion=-10,pending=0,moveKey='',roleUntil=0,visionCache=null,fx=[],seenMarkers=new Set(),taskFlash=0,guideCache=null,guideOn=true,lastStepSound=-10,lastAlertSound=-10,lastAmbience=-10,previousAlert='',audio=null,lobbyUnit=null,lobbyGoal=null,lobbySmooth={},lobbyLast='',lobbySendAt=0,lobbyWriting=false,lobbyWarning=false,localStyle=0,finalPublished=false,taskPending=null,meetingCache={},lobbyTab='crew',hangarArt=null;
 const C=E.colors,cl=(n,a,b)=>Math.max(a,Math.min(b,n)), me=()=>snap?.players?.find(p=>p.id===my), width=()=>V.pw||800,height=()=>V.ph||480;
 const box=(x,y,w,h,r,col)=>{c.fillStyle=col;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()};
 const line=(x,y,a,b,col,w=1)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.stroke()};
 const circle=(x,y,r,col)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=col;c.fill()};
 const text=(s,x,y,sz=12,col='#d6e9f0',align='left',weight=600)=>{c.font=weight+' '+sz+'px system-ui';c.fillStyle=col;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y)};
 const b=(label,x,y,w,h,fn,active=true,col='#173546')=>{box(x,y,w,h,9,active?col:'#14232c');text(label,x+w/2,y+h/2,Math.min(13,w/7),active?'#f0fcff':'#70828c','center',750);if(active)buttons.push({x,y,w,h,fn})};
 const sound=(f=440)=>{try{snd(f,.07,'sine')}catch(_){}};
 // Original synthesized ambience. No downloaded or copied audio assets.
 function startAmbience(){
  if(audio||!S.snd)return;
  try{
   ac=ac||new AudioContext();ac.resume?.().catch(()=>{});
   const gain=ac.createGain(),low=ac.createOscillator(),high=ac.createOscillator(),lfo=ac.createOscillator(),mod=ac.createGain();
   gain.gain.value=.0001;low.type='sine';low.frequency.value=52;high.type='sine';high.frequency.value=78;lfo.frequency.value=.16;mod.gain.value=.008;
   low.connect(gain);high.connect(gain);lfo.connect(mod);mod.connect(gain.gain);gain.connect(ac.destination);low.start();high.start();lfo.start();
   gain.gain.setTargetAtTime(.016,ac.currentTime,.4);audio={gain,low,high,lfo,mod};
  }catch(_){}
 }
 function stopAmbience(){if(!audio)return;const a=audio;audio=null;try{a.gain.disconnect();a.low.stop();a.high.stop();a.lfo.stop();a.mod.disconnect()}catch(_){}}
 function soundscape(){
  if(!S.snd||snap?.ph==='end'){stopAmbience();return}
  if(!audio)startAmbience();
  const p=me();if(!p||!snap)return;
  if(snap.ph==='run'&&p.alive&&Math.abs(p.dx)+Math.abs(p.dy)>.15&&clock-lastStepSound>.32){lastStepSound=clock;try{snd(112+Math.sin(clock*13)*12,.045,'sine')}catch(_){}}
  const alert=snap.alert?.kind||'';
  if(alert!==previousAlert){previousAlert=alert;if(alert){sound(370);lastAlertSound=clock}else sound(650)}
  if(alert&&snap.ph==='run'&&clock-lastAlertSound>2.4){lastAlertSound=clock;try{snd(alert==='pressure'?245:385,.12,'triangle')}catch(_){}}
  if(clock-lastAmbience>9&&snap.ph==='run'&&!alert){lastAmbience=clock;try{snd(174,.16,'sine')}catch(_){}}
 }
 const hide=()=>{$('#ov').style.display='none';overlayKey='';meetingCache={}};
 function overlay(key,html,bind){
  if(overlayKey===key)return;const prior=$('#ov')?.querySelector('.nr-panel'),scroll=prior?.scrollTop||0;overlayKey=key;showOv('<div class="nr-panel">'+html+'</div>');const root=$('#ov');bind?.(root);const next=root.querySelector('.nr-panel');if(next&&scroll)next.scrollTop=scroll;
 }
 const button=(action,label,disabled=false)=>'<button class="nr-btn" data-nr="'+action+'" '+(disabled?'disabled':'')+'>'+esc(label)+'</button>';
 const header=(eyebrow,title,copy)=>'<div class="nr-eyebrow">'+esc(eyebrow)+'</div><h2>'+esc(title)+'</h2><p>'+esc(copy)+'</p>';
 function bind(root){root.querySelectorAll('[data-nr]').forEach(el=>el.onclick=()=>action(el.dataset.nr));const canvas=root.querySelector('#nr-hangar');if(canvas){canvas.onpointerdown=e=>{const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const scale=Math.min(r.width/1000,r.height/600);lobbyGoal=E.normalizeLobby({x:(e.clientX-r.left-(r.width-1000*scale)/2)/scale,y:(e.clientY-r.top-(r.height-600*scale)/2)/scale},my);canvas.focus();e.preventDefault()};canvas.onkeydown=e=>{const dirs={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],KeyW:[0,-1],KeyS:[0,1],KeyA:[-1,0],KeyD:[1,0]};const d=dirs[e.code];if(d&&lobbyUnit){e.preventDefault();e.stopPropagation();const p=lobbyGoal||lobbyUnit;lobbyGoal=E.normalizeLobby({x:p.x+d[0]*90,y:p.y+d[1]*90},my)}};drawHangar()}}
 function setup(){
  stopAmbience();host=false;mode='setup';lobbyUnit=null;lobbyGoal=null;lobbySmooth={};state=snap=secret=null;camReady=false;phase='';overlayKey='';
  overlay('setup'+opts.bots+':'+localStyle+':'+opts.special,header('ABYSS PROTOCOL / 2049','Stille unter der Oberfläche','Eine Forschungsstation. Autonome Wartungseinheiten. Ein verborgenes Störsignal.')+
   '<div class="nr-feature"><span>01 / AUFTRÄGE</span><span>02 / VERDACHT</span><span>03 / ABSTIMMUNG</span></div><p>Techniker stabilisieren die Station. Störeinheiten täuschen, lösen Systemalarme aus und setzen andere Roboter außer Betrieb. Keine Seite kennt alle Rollen.</p>'+
   '<div class="nr-row">'+button('local','Training mit Bots')+button('create','Online-Raum erstellen')+button('localopts','Training: '+opts.bots+' Einheiten')+button('localstyle','Gehäuse: '+['Standard','Explorer','Aqua','Industrie'][localStyle])+button('localspecial','Spezialrollen: '+(opts.special?'An':'Aus'))+'</div><div class="nr-row"><input id="nr-code" maxlength="20" placeholder="20-stelliger Raumcode" autocomplete="off" autocapitalize="characters">'+button('join','Beitreten')+'</div><p class="nr-small">4–10 Teilnehmer · WASD / Pfeile · Touch-Joystick · E: Aufgabe · R: Meldung · M: Karte</p>',bind);
 }
 function lobby(){
  if(!room)return;
  const humans=Object.entries(room.seats||{}).filter(([,q])=>q.k==='p'),isHost=host;
  const target=Math.max(humans.length,opts.bots),friends=Object.keys(OL.F||{}).filter(u=>!humans.some(([,q])=>q.uid===u)&&olAllowed(u));
  const key='hangar:'+code+':'+my;
  const root=$('#ov');
  if(overlayKey!==key||!root.querySelector('.nr-lobby')){
   lobbyTab='crew';lobbyStamp='';
   overlay(key,'<div class="nr-lobby"><header class="nr-lobbyhead"><div><div class="nr-eyebrow">ABYSS PROTOCOL / STATION N-17</div><h2>Expeditionsdeck</h2></div><div class="nr-connection"><i></i><span id="nr-lobbystatus">Verbunden</span></div></header><div class="nr-lobbygrid"><section class="nr-deck"><div class="nr-decktitle"><b>LIVE · VORBEREITUNGSDECK</b><small id="nr-deckcount"></small></div><div class="nr-hangarwrap"><canvas id="nr-hangar" width="1000" height="600" tabindex="0" aria-label="Begehbare Lobby, klicken oder Pfeiltasten zum Bewegen"></canvas></div><div class="nr-hangarhint">Klicke ins Deck oder benutze WASD / Pfeiltasten.</div><div class="nr-personal"><div><small>DEINE EINHEIT</small><b id="nr-shellname"></b></div>'+button('style','Gehäuse wechseln')+button('ready','Bereit melden')+'</div></section><aside class="nr-side"><div class="nr-codetitle">EINLADUNGSCODE</div><div class="nr-code"><code>'+esc(code)+'</code>'+button('copy','Kopieren')+'</div><div class="nr-tabs">'+button('tab:crew','Crew')+(isHost?button('tab:settings','Optionen')+button('tab:friends','Freunde'):'')+'</div><div id="nr-lobbybody"></div></aside></div><footer class="nr-lobbyfoot"><span id="nr-lobbyfootnote"></span><div>'+button('leave','Verlassen')+(isHost?button('start','Einsatz starten'):'')+'</div></footer></div>',bind);
  }
  const el=root.querySelector('.nr-lobby');if(!el)return;
  const unitFor=(i,q)=>i===my?lobbyUnit:room.lobbyUnits?.[q?.uid];
  const ready=humans.filter(([i,q])=>unitFor(+i,q)?.ready).length;
  const sig=JSON.stringify([humans.map(([i,q])=>[i,q.uid,q.name,unitFor(+i,q)?.style,unitFor(+i,q)?.ready]),opts,busy,friends.map(u=>[u,olNameOf(u),!!OL.P[u],!!OL.P[u]?.g,LUN.inv[u]]),lobbyTab,lobbyUnit?.style,lobbyUnit?.ready]);
  if(lobbyStamp===sig)return;lobbyStamp=sig;
  el.querySelector('#nr-lobbystatus').textContent=humans.length+' / 10 verbunden';
  el.querySelector('#nr-deckcount').textContent=ready+' / '+humans.length+' bereit';
  el.querySelector('#nr-shellname').textContent=['Standard','Explorer','Aqua','Industrie'][lobbyUnit?.style||0];
  const readyButton=el.querySelector('[data-nr="ready"]');readyButton.textContent=lobbyUnit?.ready?'Bereit ✓':'Bereit melden';readyButton.classList.toggle('nr-ready',!!lobbyUnit?.ready);
  el.querySelector('#nr-lobbyfootnote').textContent=isHost?(busy?'Einsatz wird vorbereitet …':target+' Einheiten · '+Math.max(0,target-humans.length)+' Bots · '+ready+' bereit'):'Warte auf den Host.';
  const start=el.querySelector('[data-nr="start"]');if(start)start.disabled=busy;
  for(const tab of el.querySelectorAll('.nr-tabs button'))tab.classList.toggle('nr-active',tab.dataset.nr==='tab:'+lobbyTab);
  const body=el.querySelector('#nr-lobbybody'),scroll=body.scrollTop;
  const plannedIds=Array.from({length:10},(_,i)=>i).filter(i=>room.seats?.[i]?.k!=='p').slice(0,Math.max(0,target-humans.length));
  if(lobbyTab==='settings'&&isHost){
   body.innerHTML='<div class="nr-settings">'+[['bots','Teilnehmer',target+' / 10'],['tasks','Aufträge pro Einheit',opts.tasks],['two','Störeinheiten ab 7',opts.two?'2':'1'],['discussion','Besprechung',opts.discussion+' s'],['special','Spezialrollen',opts.special?'An':'Aus']].map(([a,n,v])=>'<button class="nr-setting" data-nr="'+a+'"><small>'+n+'</small><b>'+v+'</b><em>Ändern</em></button>').join('')+'</div><p class="nr-small">Freie Plätze bis zur Zielgröße werden beim Start mit Bots besetzt.</p>';
  }else if(lobbyTab==='friends'&&isHost){
   body.innerHTML='<div class="nr-friends"><b>BESTÄTIGTE FREUNDE</b>'+(friends.length?friends.slice(0,30).map(u=>'<div><i class="'+(OL.P[u]?'nr-online':'')+'"></i><span>'+esc(olNameOf(u))+'<small>'+(OL.P[u]?.g?'Im Spiel':OL.P[u]?'Online':'Offline')+'</small></span>'+button('invite:'+u,LUN.inv[u]?'Gesendet':'Einladen',!!LUN.inv[u])+'</div>').join(''):'<p>Keine weiteren bestätigten Freunde.</p>')+'</div>';
  }else{
   body.innerHTML='<div class="nr-slotgrid">'+Array.from({length:10},(_,i)=>{const q=room.seats?.[i],person=q?.k==='p',planned=isHost&&plannedIds.includes(i),unit=unitFor(i,q),tag=person?(i===0?'HOST':i===my?'DU':'VERBUNDEN')+(unit?.ready?' · BEREIT':''):planned?'BOT GEPLANT':'OFFEN';return '<div class="nr-slot '+(person?'nr-occupied':'')+'" style="--unit:'+C[i]+'"><div class="nr-unit nr-style-'+(unit?.style||0)+'"><i></i><em></em></div><span><b>'+esc(person?q.name:planned?'Drohne '+(i+1):'Freier Platz')+'</b><small>'+tag+'</small></span></div>'}).join('')+'</div>';
  }
  body.scrollTop=scroll;body.querySelectorAll('[data-nr]').forEach(el=>el.onclick=()=>action(el.dataset.nr));
 }
 function local(){startAmbience();host=true;mode='local';my=0;state=E.newRound(Array.from({length:opts.bots},(_,i)=>i===0?{k:'p',name:'Du',style:localStyle}:{k:'cpu',name:['','Mira','Kelp','Orion','Lumen','Vela','Nix','Echo','Delta','Nova'][i]}),opts);beginRound()}
 function beginRound(){finalPublished=false;taskPending=null;snap=E.publicState(state);secret=E.privateState(state,my);camReady=false;smooth={};phase='';task=null;touch=null;moveKey='';seenMarkers.clear();fx=[];roleUntil=clock+4;guideCache=null;previousAlert='';hide();startAmbience();sound(660)}
 async function openOnline(joinCode){
  if(busy||mode!=='setup')return false;busy=true;
  try{
   if(!await luLogin()||!alive)return false;
   startAmbience();
   if(joinCode){
    code=String(joinCode).trim().toUpperCase();
    if(!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{20}$/.test(code)){toast('Bitte den vollständigen 20-stelligen Raumcode eingeben.');return false}
    const claim=await luReserve(code,'nereid',10);if(!claim)return false;
    if(!alive){claim.ref.child('seats/'+claim.seat).set({k:'gone',uid:OL.me,name:OL.name}).catch(()=>{});return false}
    ref=claim.ref;my=claim.seat;host=false;
   }else{
    code=luCode();ref=OL.db.ref('rooms/'+code);my=0;host=true;
    const seats={};for(let i=0;i<10;i++)seats[i]=i===0?{k:'p',uid:OL.me,name:OL.name}:{k:'open'};
    await luCreate(code,{host:OL.me,hn:OL.name,ts:olTS(),status:'lobby',game:'nereid',cfg:{d:1},seats});
    if(!alive){ref.remove().catch(()=>{});return false}
   }
   Object.assign(LUN,{code,role:host?'host':'guest',seat:my,ref,left:0,g:api,lastAct:{},actN:0,lastSeq:0,inv:{},endedAt:0});
   mode='lobby';lobbyUnit=E.normalizeLobby({style:localStyle},my);lobbyGoal=null;lobbySmooth={};lobbyLast='';lobbyWarning=false;roleRef=OL.db.ref('hands/'+code+'/'+OL.me);
   if(!host)roleRef.on('value',s=>{try{const q=JSON.parse(s.val()||'null');if(q)secret=q}catch(_){}},()=>{});
   ref.on('value',onRoom,e=>{if(alive){toast(luErr(e));toMenu()}});
   return true;
  }catch(e){toast(luErr(e));ref=null;return false}finally{busy=false}
 }
 function onRoom(value){
  if(!alive||!ref)return;const v=value.val();
  if(!v){toast('Der Raum wurde geschlossen.');toMenu();return}
  room=v;LUN.room=v;
  if(v.seats?.[my]?.k!=='p'||v.seats?.[my]?.uid!==OL.me){toast('Du bist nicht mehr in diesem Raum.');toMenu();return}
  if(v.status==='lobby'){
   if(Object.values(v.seats||{}).some(q=>q.uid&&q.uid!==OL.me&&OL.BL?.[q.uid])){toast('Der Raum enthält einen blockierten Spieler.');toMenu();return}
   if(host&&!busy){const fix={};Object.entries(v.seats||{}).forEach(([i,q])=>{if(q.k==='gone')fix['seats/'+i]={k:'open'}});if(Object.keys(fix).length){ref.update(fix).catch(()=>{});return}}
   if(mode!=='lobby'){state=null;snap=null;secret=null;overlayKey='';task=null;panel='';lobbyUnit=E.normalizeLobby({style:localStyle},my);lobbyGoal=null;lobbySmooth={};lobbyLast='';lobbyWarning=false}
   mode='lobby';if(!lobbyUnit)lobbyUnit=E.normalizeLobby({style:localStyle},my);lobby();return
  }
  if(host&&state){
   Object.entries(v.seats||{}).forEach(([i,q])=>{if(q.k==='gone')E.gone(state,+i)});
   for(const [u,raw] of Object.entries(v.act||{})){let a;try{a=JSON.parse(raw)}catch(_){continue}
    const i=Object.keys(v.seats||{}).find(i=>v.seats[i].k==='p'&&v.seats[i].uid===u);
    if(i===undefined||a.rn!==state.rn||!Number.isSafeInteger(a.n)||a.n<=(seen[u]||0))continue;seen[u]=a.n;E.apply(state,+i,a)
   }
  }else if(!host&&v.snap){try{
   const q=JSON.parse(v.snap).snap;if(!q||!Array.isArray(q.players))return;
   if(!snap||q.rn!==snap.rn){taskPending=null;seq=0;camReady=false;smooth={};phase='';task=null;moveKey='';seenMarkers.clear();fx=[];roleUntil=clock+4;hide()}
   if(!snap||q.rn!==snap.rn||q.seq>snap.seq)snap=q;
   mode='guest';
  }catch(_){}}
  // Use the existing moderated room chat only during a live meeting.
  if(snap?.ph==='meeting'&&me()?.alive)window.gameChat?.room(v,snap);else window.gameChat?.stop();
 }
 async function startOnline(){
  if(!host||!room||busy||mode!=='lobby')return;busy=true;lobby();
  try{
   const fresh=(await ref.once('value')).val(),seats={...fresh.seats};
   let count=Object.values(seats).filter(q=>q.k==='p').length;
   const target=Math.max(4,count,opts.bots);
   const updates={status:'play',lobbyUnits:null};
   for(let i=1;i<10;i++){if(seats[i]?.k==='p')continue;seats[i]={k:count<target?'cpu':'off'};if(seats[i].k==='cpu')count++;updates['seats/'+i]=seats[i]}
   state=E.newRound(Array.from({length:10},(_,i)=>({...seats[i],style:i===my?lobbyUnit?.style:E.normalizeLobby(fresh.lobbyUnits?.[seats[i]?.uid],i).style})),opts);seen={};privateCache={};seq=0;
   await ref.update(updates);
   if(!alive)return;
   const changes={};for(const p of state.players){const q=seats[p.id];if(q.k==='p'&&p.id!==my){const raw=JSON.stringify(E.privateState(state,p.id));changes['hands/'+code+'/'+q.uid]=raw;privateCache[q.uid]=raw}}
   if(Object.keys(changes).length)await OL.db.ref().update(changes);
   if(!alive)return;
   mode='host';beginRound();await ref.child('snap').set(JSON.stringify({snap}));
   for(const u of Object.keys(LUN.inv||{}))OL.db.ref('invites/'+u+'/'+OL.me).remove().catch(()=>{});LUN.inv={};
  }catch(e){toast(luErr(e));state=null;if(ref)ref.update({status:'lobby',snap:null,act:null,chat:null}).catch(()=>{});mode='lobby';}
  finally{busy=false;if(mode==='lobby')lobby()}
 }
 function publish(){
  if(!state||mode!=='host'||!ref||pending||busy||finalPublished)return;
  const changes={['rooms/'+code+'/snap']:JSON.stringify({snap})};
  for(const p of state.players){const q=room?.seats?.[p.id];if(q?.k==='p'&&p.id!==my){const raw=JSON.stringify(E.privateState(state,p.id));if(privateCache[q.uid]!==raw){changes['hands/'+code+'/'+q.uid]=raw;privateCache[q.uid]=raw}}}
  const round=state,ended=snap.ph==='end';pending=1;OL.db.ref().update(changes).then(()=>{if(state===round&&ended)finalPublished=true}).catch(e=>{privateCache={};if(alive&&clock-lastMotion>3){lastMotion=clock;toast(luErr(e))}}).finally(()=>pending=0)
 }
 function send(a){
  if(!snap||!secret||secret.rn!==snap.rn)return;
  if(host&&state){const ok=E.apply(state,my,a);if(ok&&a.k!=='move')sound(540);return ok}
  if(mode==='guest'&&ref){if(a.k!=='move')sendAt=clock+.3;
   return ref.child('act/'+OL.me).set(JSON.stringify({...a,n:++seq,rn:snap.rn})).catch(e=>toast(luErr(e)))}
 }
 function taskOpen(id){
  if(task||taskPending||panel||!secret||!E.stations[id]||!secret.tasks.includes(id)||secret.done.includes(id)||!E.near(me(),E.stations[id]))return;
  send({k:'move',x:0,y:0});task={id,answer:[],pattern:E.challenge(snap,{id:my},id),start:clock,dials:[0,0,0,0],err:false};overlayKey='';renderTask();
 }
 function finishTask(answer){const id=task.id;taskPending={id,until:clock+4};send({k:'task',v:id,answer:answer.slice()});task=null;hide()}
 function renderTask(){
  if(!task)return;
  const st=E.stations[task.id],kind=st.kind,symbols=['◆','●','▲','■'],arrows=['↑','→','↓','←'],preview=clock-task.start<2.6;
  let title,copy,body;
  if(kind==='pulse'){
   title='Impulsspeicher';copy=preview?'Merke dir die vier Signale.':'Gib das gespeicherte Muster ein.';
   body='<div class="nr-pattern nr-memory">'+task.pattern.map((n,i)=>'<span class="'+(i<task.answer.length?'done':'')+'">'+(preview?symbols[n]:i<task.answer.length?symbols[task.answer[i]]:'·')+'</span>').join('')+'</div><div class="nr-taskgrid">'+symbols.map((n,i)=>button('answer:'+i,n,preview)).join('')+'</div>'+button('replay','Muster erneut anzeigen',preview);
  }else if(kind==='sort'){
   title='Probenanalyse';copy='Wähle die vier Proben von der niedrigsten zur höchsten Messzahl.';
   body='<div class="nr-taskgrid nr-samples">'+E.sortValues(task.pattern).map((n,i)=>button('answer:'+i,'Probe '+String.fromCharCode(65+i)+' · '+n,task.answer.includes(i))).join('')+'</div><p>'+task.answer.length+' / 4 Proben einsortiert</p>';
  }else if(kind==='align'){
   title='Sensor-Kalibrierung';copy='Drehe jeden Regler, bis er mit der Zielrichtung übereinstimmt.';
   body='<div class="nr-dials">'+task.dials.map((n,i)=>'<div><small>ZIEL '+arrows[task.pattern[i]]+'</small><button class="nr-dial '+(n===task.pattern[i]?'nr-match':'')+'" data-nr="dial:'+i+'">'+arrows[n]+'</button><small>KANAL '+(i+1)+'</small></div>').join('')+'</div>'+button('calibrate','Kalibrierung bestätigen');
  }else if(kind==='spectral'){
   title='Spektralanalyse';copy='Ordne die vier Signale nach Wellenlänge: kurz bis lang. Vergleiche die sichtbaren Wellen.';
   const vals=E.sortValues(task.pattern);
   body='<div class="nr-taskgrid nr-samples">'+vals.map((n,i)=>'<button class="nr-wave" data-nr="answer:'+i+'" '+(task.answer.includes(i)?'disabled':'')+'><svg viewBox="0 0 100 28" aria-hidden="true"><polyline points="'+Array.from({length:91},(_,j)=>(j+4)+','+(14+Math.sin(j/(n/7))*9).toFixed(1)).join(' ')+'" fill="none" stroke="currentColor" stroke-width="2"/></svg>Signal '+String.fromCharCode(65+i)+'</button>').join('')+'</div><p>'+task.answer.length+' / 4 Signale</p>';
  }else if(kind==='matrix'){
   title='Datenarchiv';copy='Wähle pro Zeile das Feld mit dem passenden Symbol. Beginne oben.';
   body='<div class="nr-matrix">'+task.pattern.map((n,i)=>'<div><b>'+symbols[n]+'</b>'+symbols.map((s,j)=>button('answer:'+j,s,i!==task.answer.length)).join('')+'</div>').join('')+'</div><p>'+task.answer.length+' / 4 Datensätze</p>';
  }else if(kind==='cargo'){
   title='Frachtprüfung';copy='Prüfe die vier Frachtbehälter vom leichtesten zum schwersten. Die Balken zeigen das relative Gewicht.';
   body='<div class="nr-taskgrid nr-samples">'+E.sortValues(task.pattern).map((n,i)=>'<button class="nr-cargo" data-nr="answer:'+i+'" '+(task.answer.includes(i)?'disabled':'')+'><span>FRACHT '+(i+1)+'</span><i><em style="width:'+n+'%"></em></i></button>').join('')+'</div><p>'+task.answer.length+' / 4 Behälter</p>';
  }else if(kind==='balance'){
   title='Nährstoff-Regelung';copy='Verteile die vier Dosierwerte entsprechend der Messanzeige. Jeder Kanal besitzt vier Stufen.';
   body='<div class="nr-balance">'+task.dials.map((n,i)=>'<div><small>KANAL '+(i+1)+' · Ziel '+(task.pattern[i]+1)+'</small><div class="nr-gauge"><i style="height:'+((n+1)*25)+'%"></i><b>'+(n+1)+'</b></div><div class="nr-row">'+button('minus:'+i,'−')+button('dial:'+i,'+')+'</div></div>').join('')+'</div>'+button('calibrate','Dosierung bestätigen');
  }else{
   title='Signalroute';copy='Folge dem nummerierten Pfad von START bis zum vierten Signal. Wähle die Richtung jedes Schritts.';
   const points=E.routePath(task.pattern);
   body='<div class="nr-route">'+Array.from({length:81},(_,i)=>{const x=i%9,y=Math.floor(i/9),vis=points.map((p,j)=>p[0]===x&&p[1]===y?j:-1).filter(j=>j>=0);return '<span class="'+(vis.length?'nr-path':'')+'">'+(vis.length?vis.map(j=>j===0?'S':j).join('·'):'')+'</span>'}).join('')+'</div><div class="nr-taskgrid">'+arrows.map((n,i)=>button('answer:'+i,n)).join('')+'</div><p>'+task.answer.length+' / 4 Schritte</p>';
  }
  overlay('task'+task.id+':'+task.answer.length+':'+task.dials.join('')+':'+preview+':'+task.err,header('WARTUNG / '+st.name,title,copy)+body+(task.err?'<p class="nr-error">Noch nicht korrekt – versuche es erneut.</p>':'')+button('cancel','Schließen'),bind)
 }
 function action(a){
  if(a.startsWith('tab:')&&mode==='lobby'){lobbyTab=a.slice(4);lobbyStamp='';lobby();return}
  if(a==='local')return local();
  if(a==='localopts'){opts.bots=opts.bots>=10?4:opts.bots+1;setup();return}
  if(a==='localstyle'){localStyle=(localStyle+1)%4;setup();return}
  if(a==='localspecial'){opts.special=!opts.special;setup();return}
  if(a==='special'&&host&&mode==='lobby'){opts.special=!opts.special;lobby();return}
  if(a==='style'&&mode==='lobby'&&lobbyUnit){lobbyUnit.style=(lobbyUnit.style+1)%4;localStyle=lobbyUnit.style;lobby();return}
  if(a==='ready'&&mode==='lobby'&&lobbyUnit){lobbyUnit.ready=!lobbyUnit.ready;lobby();return}
  if(a==='create')return openOnline('');
  if(a==='join'){const v=$('#nr-code')?.value||'';if(!v.trim()){toast('Bitte einen Raumcode eingeben.');return}return openOnline(v)}
  if(a==='leave')return toMenu();
  if(a==='copy'){navigator.clipboard?.writeText(code).then(()=>toast('Raumcode kopiert.')).catch(()=>toast(code));return}
  if(a==='bots'){opts.bots=opts.bots>=10?4:opts.bots+1;lobby();return}
  if(a==='tasks'){opts.tasks=opts.tasks>=5?2:opts.tasks+1;lobby();return}
  if(a==='two'){opts.two=!opts.two;lobby();return}
  if(a==='discussion'){opts.discussion=opts.discussion===30?45:30;lobby();return}
  if(a==='start')return startOnline();
  if(a.startsWith('invite:')&&host&&mode==='lobby'){
   const u=a.slice(7);if(!OL.F?.[u]||!olCanContact(u))return;
   olWriteInvite(u,{mid:'room:'+code,code,name:OL.name,game:'nereid',t:0,ts:olTS()}).then(()=>{LUN.inv[u]=olNow();lobby();toast('Einladung gesendet.')}).catch(e=>toast(luErr(e)));return
  }
  if(a==='cancel'){task=null;panel='';hide();return}
  if(task&&a==='replay'){task.start=clock;task.answer=[];task.err=false;overlayKey='';renderTask();return}
  if(task&&a.startsWith('minus:')){const i=+a.slice(6);if(i>=0&&i<4){task.dials[i]=(task.dials[i]+3)%4;task.err=false;renderTask();sound(360)}return}
  if(task&&a.startsWith('dial:')){const i=+a.slice(5);if(i>=0&&i<4){task.dials[i]=(task.dials[i]+1)%4;task.err=false;renderTask();sound(360)}return}
  if(task&&a==='calibrate'){if(task.dials.join(',')===task.pattern.join(','))finishTask(task.dials);else{task.err=true;renderTask();sound(200)}return}
  if(a.startsWith('answer:')&&task){
   if(E.stations[task.id].kind==='pulse'&&clock-task.start<2.6)return;
   const n=+a.slice(7);if(n!==task.pattern[task.answer.length]){task.answer=[];task.err=true;overlayKey='';sound(200);renderTask();return}
   task.err=false;task.answer.push(n);sound(380+task.answer.length*100);
   if(task.answer.length===4){finishTask(task.answer);return}
   renderTask();return
  }
  if(a.startsWith('vote:'))return send({k:'vote',v:+a.slice(5)});
  if(a.startsWith('say:'))return send({k:'say',v:+a.slice(4)});
  if(a==='retry'){setup();return}
  if(a==='rematch'&&host&&mode==='host'&&snap?.ph==='end')return rematch();
 }
 async function rematch(){
  if(busy||!ref||!room||pending)return;busy=true;
  try{
   const changes={['rooms/'+code+'/status']:'lobby',['rooms/'+code+'/snap']:null,['rooms/'+code+'/act']:null,['rooms/'+code+'/chat']:null,['rooms/'+code+'/lobbyUnits']:null,['hands/'+code]:null};
   Object.entries(room.seats||{}).forEach(([i,q])=>{if(i!=='0'&&q.k!=='p')changes['rooms/'+code+'/seats/'+i]={k:'open'}});
   await OL.db.ref().update(changes);state=snap=secret=null;mode='lobby';lobbyUnit=E.normalizeLobby({style:localStyle},my);lobbyLast='';lobbyGoal=null;overlayKey='';lobby();
  }catch(e){toast(luErr(e))}finally{busy=false;if(mode==='lobby')lobby()}
 }
 function meetingUI(){
  const s=snap,p=me(),voted=s.meetingVotes.includes(my);
  const root=$('#ov');
  const stableKey='meeting:'+s.rn+':'+s.meetingStarted;
  if(s.ph==='meeting'){
   if(overlayKey!==stableKey||!root.querySelector('.nr-meeting')){
    meetingCache={};
    overlay(stableKey,'<div class="nr-meeting"><div class="nr-eyebrow">ABYSS PROTOCOL / NOTFUNK</div><div class="nr-meethead"><h2>Wer sendet das Störsignal?</h2><strong id="nr-countdown">–</strong></div><p id="nr-cause"></p><div class="nr-meetbar"><i></i></div><p id="nr-voteprogress" class="nr-small"></p><div class="nr-votes">'+s.players.map(q=>'<div class="nr-vote" data-player="'+q.id+'"><i style="background:'+C[q.id]+'"></i><span>'+esc(q.name)+'</span><small class="nr-votestatus"></small>'+button('vote:'+q.id,'Wählen')+'</div>').join('')+'</div><div class="nr-row">'+button('vote:-1','Überspringen')+'</div><div class="nr-notes" aria-live="polite"></div><div class="nr-phrases">'+E.phrases.map((x,i)=>button('say:'+i,x)).join('')+'</div><p class="nr-spectator" hidden>Du beobachtest die Abstimmung.</p></div>',bind);
   }
   const m=root.querySelector('.nr-meeting');if(!m)return;
   const secs=Math.max(0,Math.ceil(s.meetingEnd-s.t)),bar=Math.round(cl((s.meetingEnd-s.t)/Math.max(1,s.meetingEnd-s.meetingStarted),0,1)*100);
   if(meetingCache.secs!==secs){m.querySelector('#nr-countdown').textContent=secs+' s';meetingCache.secs=secs}
   if(meetingCache.bar!==bar){m.querySelector('.nr-meetbar i').style.width=bar+'%';meetingCache.bar=bar}
   const status=JSON.stringify([s.cause,s.meetingVotes,s.players.map(q=>[q.id,q.alive]),p?.alive]);
   if(meetingCache.status!==status){
    m.querySelector('#nr-cause').textContent=s.cause;
    m.querySelector('#nr-voteprogress').textContent=s.meetingVotes.length+' / '+s.players.filter(q=>q.alive).length+' haben abgestimmt · Stimmen bleiben geheim.';
    for(const q of s.players){const el=m.querySelector('[data-player="'+q.id+'"]');if(!el)continue;el.classList.toggle('nr-inactive',!q.alive);el.querySelector('.nr-votestatus').textContent=!q.alive?'INAKTIV':s.meetingVotes.includes(q.id)?'ABGESTIMMT':'';el.querySelector('button').disabled=!p?.alive||voted||!q.alive}
    m.querySelector('[data-nr="vote:-1"]').disabled=!p?.alive||voted;m.querySelector('.nr-phrases').hidden=!p?.alive;m.querySelector('.nr-spectator').hidden=!!p?.alive;meetingCache.status=status;
   }
   const notes=JSON.stringify(s.notes);
   if(meetingCache.notes!==notes){const el=m.querySelector('.nr-notes'),atBottom=el.scrollHeight-el.scrollTop-el.clientHeight<25;el.innerHTML=s.notes.map(([i,j])=>'<div><b style="color:'+C[i]+'">'+esc(s.players.find(q=>q.id===i)?.name)+':</b> '+esc(E.phrases[j])+'</div>').join('');if(atBottom)el.scrollTop=el.scrollHeight;meetingCache.notes=notes}
   return;
  }
  const sig=JSON.stringify([s.ph,s.rn,s.meetingStarted,s.cause,s.result,s.verdict,secret?.role]);
  const results=s.verdict?'<div class="nr-verdict"><b>ABSTIMMUNGSERGEBNIS</b>'+s.verdict.tally.slice().sort((a,b)=>b[1]-a[1]).map(([id,n])=>'<div><span>'+esc(id===-1?'Überspringen':s.players.find(p=>p.id===id)?.name||'Einheit')+'</span><i><em style="width:'+Math.round(n/Math.max(1,s.verdict.eligible)*100)+'%"></em></i><strong>'+n+'</strong></div>').join('')+'<small>'+s.verdict.cast+' von '+s.verdict.eligible+' Stimmen abgegeben</small></div>':'';
  if(s.ph==='result')overlay(sig,header('ABSTIMMUNG / AUSWERTUNG',s.cause,'Der Einsatz wird in wenigen Sekunden fortgesetzt.')+results,bind);
  else if(s.ph==='end')overlay(sig,header('EINSATZ BEENDET',s.result==='tech'?'Station stabilisiert':'Störsignal erfolgreich',s.result===secret?.role?'Dein Team gewinnt.':'Die Rollen werden aufgedeckt.')+results+'<div class="nr-roster">'+s.players.map(q=>'<div><i style="background:'+C[q.id]+'"></i>'+esc(q.name)+' · '+E.specialName(q)+'</div>').join('')+'</div><div class="nr-row">'+(mode==='local'?button('retry','Neuer Einsatz'):host?button('rematch','Neue Runde in der Lobby'):'')+button('leave','Zurück zum Menü')+'</div>',bind);
 }
 function drawHangar(){
  const canvas=$('#nr-hangar');if(!canvas||!room)return;const d=canvas.getContext('2d');if(!d)return;
  const W=1000,H=600,rect=(x,y,w,h,r,fill)=>{d.fillStyle=fill;d.beginPath();d.roundRect(x,y,w,h,r);d.fill()},dot=(x,y,r,fill)=>{d.fillStyle=fill;d.beginPath();d.arc(x,y,r,0,Math.PI*2);d.fill()},label=(s,x,y,size,color='#a8d0d3')=>{d.fillStyle=color;d.font='700 '+size+'px system-ui';d.textAlign='center';d.textBaseline='middle';d.fillText(s,x,y)},stroke=(x,y,a,b,col,width=1)=>{d.strokeStyle=col;d.lineWidth=width;d.beginPath();d.moveTo(x,y);d.lineTo(a,b);d.stroke()};
  if(!hangarArt){
   hangarArt=document.createElement('canvas');hangarArt.width=W;hangarArt.height=H;
   const a=hangarArt.getContext('2d'),r=(x,y,w,h,rad,col)=>{a.fillStyle=col;a.beginPath();a.roundRect(x,y,w,h,rad);a.fill()},ln=(x,y,b,c,col,w=1)=>{a.strokeStyle=col;a.lineWidth=w;a.beginPath();a.moveTo(x,y);a.lineTo(b,c);a.stroke()};
   const ocean=a.createLinearGradient(0,0,0,H);ocean.addColorStop(0,'#0c4057');ocean.addColorStop(.4,'#0a2638');ocean.addColorStop(1,'#050e1b');a.fillStyle=ocean;a.fillRect(0,0,W,H);
   for(let i=0;i<45;i++){a.fillStyle='#548ba324';a.beginPath();a.ellipse((i*167)%W,(i*79)%H,3+i%8,1+i%4,0,0,Math.PI*2);a.fill()}
   r(12,13,976,574,34,'#06121e');r(20,20,960,560,30,'#536a79');r(27,27,946,546,25,'#132b3c');
   const glass=a.createLinearGradient(0,34,0,125);glass.addColorStop(0,'#15455d');glass.addColorStop(1,'#102d42');r(38,34,924,91,19,glass);
   for(let i=0;i<8;i++){const x=44+i*130;r(x,34,10,91,3,'#8195a0');ln(x+2,40,x+2,120,'#b5d3db',1)}
   for(let i=0;i<5;i++){const x=65+i*190;ln(x,45,x+85,110,'#94dce51c',7)}
   r(37,132,926,420,22,'#0c1f2d');
   for(let y=139;y<548;y+=42)for(let x=44;x<956;x+=46){const grad=a.createLinearGradient(x,y,x+45,y+41);grad.addColorStop(0,(x+y)%3?'#314b58':'#385462');grad.addColorStop(1,'#223c4a');r(x,y,44,40,4,grad);r(x+4,y+4,2,2,1,'#8199a0');r(x+38,y+34,2,2,1,'#8199a0')}
   for(const x of [46,934]){r(x,147,19,385,5,'#0f2634');r(x+6,156,6,365,3,'#64b9bc');}
   for(const y of [151,516]){r(111,y,778,19,5,'#172f3d');for(let x=120;x<880;x+=24){ln(x,y+4,x+10,y+14,'#b8b18a88',3)}}
   for(let i=0;i<10;i++){const x=170+(i%5)*165,y=220+Math.floor(i/5)*155;r(x-54,y-40,108,92,17,'#172f3d');r(x-48,y-34,96,80,13,'#385866');r(x-42,y-28,84,68,10,'#203b49');ln(x-33,y+35,x+33,y+35,'#81b8b3',3);a.fillStyle='#9cb8bd';a.font='800 10px system-ui';a.textAlign='center';a.fillText('POD '+String(i+1).padStart(2,'0'),x,y+52)}
   for(const x of [78,922]){r(x-22,205,44,235,10,'#071d2b');for(let j=0;j<5;j++){r(x-17,216+j*42,34,30,5,'#506b75');r(x-12,220+j*42,24,14,3,'#193745')}}
   r(349,132,302,54,10,'#102a3c');r(361,143,278,30,7,'#386975');a.fillStyle='#d3f3f1';a.font='800 17px system-ui';a.textAlign='center';a.fillText('N-17  /  LAUNCH CONTROL',500,164);
   r(368,543,264,31,9,'#1b3444');r(382,549,236,17,4,'#486574');
  }
  d.drawImage(hangarArt,0,0);
  d.save();d.beginPath();d.roundRect(38,34,924,91,19);d.clip();for(let i=0;i<35;i++){const x=40+(i*117+clock*(5+i%4))%920,y=43+(i*31)%68;dot(x,y,1+i%3,'#a3e8e440')}
  for(let i=0;i<3;i++){const x=45+(clock*13+i*370)%920,y=62+Math.sin(clock*.45+i)*18;d.fillStyle='#092d3caa';d.beginPath();d.ellipse(x,y,20+i*5,6+i*2,0,0,Math.PI*2);d.fill();d.beginPath();d.moveTo(x-15,y);d.lineTo(x-30,y-10);d.lineTo(x-30,y+10);d.closePath();d.fill()}d.restore();
  for(const x of [78,922])for(let j=0;j<5;j++)dot(x,238+j*42,3,j===Math.floor(clock*.8)%5?'#b2ffe3':'#376a72');
  for(let i=0;i<10;i++){const x=170+(i%5)*165,y=220+Math.floor(i/5)*155,q=room.seats?.[i];dot(x+35,y-24,3,q?.k==='p'?'#a1f3ce':'#66868d')}
  const people=Object.entries(room.seats||{}).filter(([,q])=>q.k==='p').map(([id,q])=>({id:+id,q,p:+id===my?lobbyUnit:E.normalizeLobby(room.lobbyUnits?.[q.uid],+id)})).filter(o=>o.p).sort((a,b)=>a.p.y-b.p.y);
  for(const {id:i,q,p} of people){
   const v=lobbySmooth[q.uid]||{x:p.x,y:p.y};const dx=p.x-v.x,dy=p.y-v.y;v.x+=dx*.23;v.y+=dy*.23;lobbySmooth[q.uid]=v;const moving=Math.hypot(dx,dy)>4,bob=moving?Math.sin(clock*14+i)*3:Math.sin(clock*2+i);const x=v.x,y=v.y+bob,col=C[i];
   d.save();d.translate(x,y);d.fillStyle='#071824aa';d.beginPath();d.ellipse(0,22,24,9,0,0,Math.PI*2);d.fill();
   for(const s of [-1,1]){const step=moving?Math.sin(clock*14+s*Math.PI/2)*4:0;rect(s*9-5,12+step,10,15,4,'#163242');rect(s*9-5,21+step,10,6,2,col);rect(s*19-4,-6-step,8,21,4,'#344f5b')}
   const shell=d.createLinearGradient(-17,-20,17,19);shell.addColorStop(0,'#d4e4e5');shell.addColorStop(.28,col);shell.addColorStop(1,'#345365');rect(-18,-20,36,40,9,'#0e2436');rect(-16,-18,32,35,8,shell);rect(-12,-13,24,15,5,'#102d3b');rect(-8,-9,16,4,2,'#d8ffff');rect(-8,6,16,5,2,'#254650');
   if(p.style===1){rect(-5,-28,10,12,3,'#d4e6ed');dot(0,-29,3,col)}if(p.style===2){rect(-25,-9,7,23,3,'#d2e1e3');rect(18,-9,7,23,3,'#d2e1e3')}if(p.style===3){rect(-18,6,36,8,3,'#dac393')}
   if(p.ready){dot(23,-21,7,'#0e423d');dot(23,-21,4,'#aff5bb')}if(i===my){d.strokeStyle='#e7ffff';d.lineWidth=2;d.beginPath();d.ellipse(0,25,29,10,0,0,Math.PI*2);d.stroke()}rect(-62,-51,124,22,6,'#081b28d9');label(q.name.slice(0,16),0,-40,13,'#e1f4f4');d.restore()
  }
  if(lobbyGoal){d.strokeStyle='#c4ffdf80';d.lineWidth=2;d.beginPath();d.arc(lobbyGoal.x,lobbyGoal.y,12+Math.sin(clock*5)*3,0,Math.PI*2);d.stroke()}
 }
 function tickLobby(dt){
  if(!room||!lobbyUnit)return;
  const active=document.activeElement;if(active?.id==='nr-hangar'){
   const dx=(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0),dy=(K.KeyS||K.ArrowDown?1:0)-(K.KeyW||K.ArrowUp?1:0);if(dx||dy){const n=Math.hypot(dx,dy);lobbyGoal=E.normalizeLobby({x:lobbyUnit.x+dx/n*70,y:lobbyUnit.y+dy/n*70},my)}
  }
  if(lobbyGoal){const dx=lobbyGoal.x-lobbyUnit.x,dy=lobbyGoal.y-lobbyUnit.y,n=Math.hypot(dx,dy),step=250*dt;if(n<=step){lobbyUnit.x=lobbyGoal.x;lobbyUnit.y=lobbyGoal.y;lobbyGoal=null}else{lobbyUnit.x+=dx/n*step;lobbyUnit.y+=dy/n*step}}
  const unit=E.normalizeLobby(lobbyUnit,my),key=JSON.stringify(unit);
  if(ref&&!busy&&!lobbyWriting&&clock>=lobbySendAt&&key!==lobbyLast){lobbySendAt=clock+.22;lobbyWriting=true;const activeRef=ref;activeRef.child('lobbyUnits/'+OL.me).set(unit).then(()=>{if(ref===activeRef){lobbyLast=key;lobbyWarning=false}}).catch(()=>{if(mode==='lobby'&&!lobbyWarning){lobbyWarning=true;toast('Lobby-Bewegung konnte nicht synchronisiert werden. Firebase-Regeln prüfen.')}lobbySendAt=clock+3}).finally(()=>lobbyWriting=false)}
  drawHangar();
 }
 function update(dt){
  clock+=dt;
  if(mode==='setup')return;
  soundscape();
  if(mode==='lobby'){if(room&&Math.floor(clock*2)!==Math.floor((clock-dt)*2))lobby();tickLobby(dt);return}
  if(!snap)return;
  fx=fx.filter(f=>clock-f.t<1.4);
  for(const marker of snap.markers||[])if(!seenMarkers.has(marker.id)){seenMarkers.add(marker.id);if(me()&&E.sight(me(),marker,330))fx.push({...marker,t:clock})}
  if(snap.ph==='run'){
   if(phase!=='run'){phase='run';task=null;panel='';hide();camReady=false;moveKey='';seenMarkers.clear()}
   const p=me();
   if(p&&secret?.rn===snap.rn&&!task&&!panel){
    const dx=(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0),dy=(K.KeyS||K.ArrowDown?1:0)-(K.KeyW||K.ArrowUp?1:0);
    let x=dx,y=dy;if(touch){x=cl((touch.x-touch.sx)/42,-1,1);y=cl((touch.y-touch.sy)/42,-1,1)}
    const input=[Math.round(x*10)/10,Math.round(y*10)/10],key=input.join(',');
    if(host){send({k:'move',x:input[0],y:input[1]})}
    else if(clock>=sendAt&&(key!==moveKey||key!=='0,0')){send({k:'move',x:input[0],y:input[1]});moveKey=key;sendAt=clock+.22}
   }else if(host&&state)E.apply(state,my,{k:'move',x:0,y:0});
  }else if(phase!==snap.ph){phase=snap.ph;task=null;panel='';touch=null;overlayKey='';sound(260)}
  if(host&&state){E.step(state,dt);snap=E.publicState(state);secret=E.privateState(state,my);if(mode==='host'&&clock>=publishAt){publishAt=clock+.20;publish()}}
  if(taskPending&&secret?.rn===snap.rn){if(secret.done.includes(taskPending.id)){taskPending=null;taskFlash=clock+1.8;sound(820)}else if(clock>=taskPending.until||snap.ph!=='run'){taskPending=null;if(snap.ph==='run')toast('Auftrag nicht bestätigt. Bitte erneut versuchen.')}}
  if(snap.ph!=='run')meetingUI();
  if(panel==='scan'&&(!secret?.scan||secret.scan.until<=snap.t))panel='';
  if(snap.ph==='end')stopAmbience();
  if(task&&(!me()||!E.near(me(),E.stations[task.id]))){task=null;hide()}
  if(task&&E.stations[task.id].kind==='pulse'&&clock-task.start>=2.6&&clock-task.start-dt<2.6)renderTask();
 }
 function roomDecor(name,x,y,w,h,col){
  x*=E.T;y*=E.T;w*=E.T;h*=E.T;
  const grad=c.createLinearGradient(x,y,x+w,y+h);grad.addColorStop(0,col);grad.addColorStop(.44,'#263e4e');grad.addColorStop(1,'#162a3a');box(x+3,y+3,w-6,h-6,12,grad);box(x+11,y+11,w-22,h-22,10,'#0d1d2830');
  for(let yy=y+34;yy<y+h-18;yy+=40)for(let xx=x+14;xx<x+w-16;xx+=40){box(xx,yy,36,36,3,'#86adbc0d');line(xx+2,yy+2,xx+34,yy+2,'#93bbca26');line(xx+2,yy+34,xx+34,yy+34,'#071d3040');circle(xx+4,yy+4,1,'#a3bdc24d')}
  box(x+w/2-62,y+7,124,24,6,'#102738d9');
  c.strokeStyle='#6c9aa35e';c.lineWidth=2;c.beginPath();c.roundRect(x+5,y+5,w-10,h-10,11);c.stroke();
  for(let i=0;i<5;i++)line(x+15+i*12,y+6,x+21+i*12,y+12,'#87aeb16b',2);
  for(let j=0;j<h-20;j+=40)line(x+10,y+10+j,x+w-10,y+10+j,'#b7f4ff0b');
  for(let i=0;i<w-20;i+=40)line(x+10+i,y+10,x+10+i,y+h-10,'#b7f4ff0b');
  text(name,x+w/2,y+20,11,'#c6e3e9','center',850);
  const edge=c.createLinearGradient(x,y,x,y+28);edge.addColorStop(0,'#8ab9c23b');edge.addColorStop(1,'#8ab9c200');box(x+8,y+4,w-16,24,5,edge);
  for(let i=0;i<3;i++){box(x+16+i*15,y+h-11,10,3,1,'#74b8bf88');box(x+w-28-i*15,y+h-11,10,3,1,'#74b8bf88')}
  if(name==='ATRIUM'){const q=E.meeting;circle(q.x,q.y,61,'#12232f');circle(q.x,q.y,53,'#45737c');circle(q.x,q.y,43,'#112d3c');circle(q.x,q.y,31,'#38616e');c.save();c.translate(q.x,q.y);c.rotate(clock*.35);for(let i=0;i<8;i++){c.rotate(Math.PI/4);box(-3,-49,6,14,2,'#a1cfc9');line(0,-28,0,-20,'#7dd4d9',3)}c.restore();circle(q.x,q.y,13+2*Math.sin(clock*2),'#93e7da');text('N-17',q.x,q.y,9,'#12394a','center',900);return}
  for(let i=0;i<3;i++){
   const px=x+30+i*(w-60)/2,py=y+h-26;
   box(px-23,py-17,46,35,6,'#08182788');box(px-19,py-21,38,31,5,'#111f2a');box(px-17,py-19,34,4,2,'#7598a7');box(px-15,py-14,30,15,3,col);line(px-9,py-7,px+9,py-7,'#95f4e6',2);for(let k=0;k<3;k++)circle(px-8+k*8,py+6,1.6,k===Math.floor(clock+i)%3?'#c2ffcb':'#5b7680');
  }
  // Recessed windows, instrument banks and painted floor lanes are original vector artwork.
  for(let i=0;i<4;i++){const px=x+22+i*22;box(px,y+32,16,9,3,'#182f40');box(px+2,y+34,12,3,1,'#62adbf')}
  if(name==='BIO-LABOR'){for(let i=0;i<3;i++){const px=x+w-48-i*38,py=y+75;box(px-15,py-28,30,56,8,'#1a353d');box(px-11,py-22,22,43,7,'#316a5c');circle(px,py,8,'#90d0a6');for(let k=0;k<3;k++)circle(px-6+k*6,py+15-((clock*15+k*13+i*7)%38),2,'#d1f6cfa0')}}
  if(name==='PUMPWERK'){for(let i=0;i<2;i++){const px=x+w-58-i*70,py=y+80;circle(px,py,29,'#122b39');circle(px,py,22,'#527b8c');c.save();c.translate(px,py);c.rotate(clock*(i?-.8:1));for(let k=0;k<5;k++){c.rotate(Math.PI*2/5);box(-4,-20,8,17,3,'#9bb5b6')}c.restore();circle(px,py,7,'#1d3544');line(px,py+29,px,py+49,'#638b95',7)}}
  if(name==='LAGER'){for(let i=0;i<3;i++){const px=x+w-42-i*37,py=y+66;box(px-15,py-17,30,34,4,'#2a3540');box(px-12,py-14,24,28,3,'#7c7e79');line(px-10,py-12,px+10,py+12,'#4d565d',3);line(px+10,py-12,px-10,py+12,'#4d565d',3)}}
  if(name==='FUNKZENTRALE'){const px=x+w-76,py=y+74;box(px-48,py-25,96,50,8,'#0b2736');for(let i=0;i<4;i++)line(px-40,py-15+i*10,px+40,py-15+i*10,'#487080',1);c.beginPath();for(let i=0;i<72;i++){const xx=px-35+i,yy=py+Math.sin(i*.19+clock*4)*10+Math.sin(i*.5)*4;i?c.lineTo(xx,yy):c.moveTo(xx,yy)}c.strokeStyle='#91e7d2';c.lineWidth=2;c.stroke()}
  if(name==='WERKSTATT'){const px=x+w-65,py=y+70;box(px-48,py-24,96,48,6,'#172b36');box(px-42,py-19,84,37,5,'#637171');for(let i=0;i<4;i++){box(px-33+i*20,py-8,12,15,3,'#263b47');line(px-27+i*20,py-10,px-27+i*20,py+11,'#b1bab4',2)}}
  if(name==='ENERGIEKERN'){const px=x+w-58,py=y+79;const glow=c.createRadialGradient(px,py,5,px,py,62);glow.addColorStop(0,'#b8adff70');glow.addColorStop(1,'#b8adff00');circle(px,py,62,glow);circle(px,py,42,'#121d32');circle(px,py,36,'#7e85a3');circle(px,py,29,'#2a3555');c.save();c.translate(px,py);c.rotate(clock*.7);for(let i=0;i<8;i++){c.rotate(Math.PI/4);box(-3,-33,6,13,2,'#b2b9dd');line(0,-16,0,-8,'#9fe2ff',2)}c.restore();circle(px,py,13+Math.sin(clock*3)*2,'#c8c7ff');circle(px,py,7,'#efffff')}
  if(name==='TAUCHDOCK'){const px=x+w*.5,py=y+68;box(px-100,py-30,200,64,15,'#101f30');box(px-92,py-23,184,50,12,'#345563');box(px-70,py-19,140,42,19,'#182e42');box(px-43,py-15,86,34,15,'#7398a3');box(px-31,py-11,62,26,12,'#1a4658');for(let i=0;i<8;i++){line(px-87+i*24,py+30,px-79+i*24,py+36,'#c0bb8a',2)}circle(px-61,py+4,4,'#9bead4');circle(px+61,py+4,4,'#9bead4')}
  if(name==='OBSERVATORIUM'){
   const px=x+w*.5,py=y+83;box(px-103,py-35,206,70,21,'#111f31');
   const sea=c.createLinearGradient(px,py-30,px,py+30);sea.addColorStop(0,'#124858');sea.addColorStop(1,'#081c31');box(px-96,py-29,192,58,17,sea);
   for(let i=0;i<4;i++){const xx=px-77+(clock*(6+i)+i*49)%153,yy=py+Math.sin(clock*.5+i)*18;circle(xx,yy,2+i%2,'#88bcbf70');line(xx-9,yy,xx,yy,'#8fc4ce50',1)}
   c.save();c.translate(px,py);c.rotate(clock*.23);line(-35,0,35,0,'#9ef2db30',1);line(0,-27,0,27,'#9ef2db30',1);c.restore();for(const dx of [-60,0,60])line(px+dx,py-29,px+dx,py+29,'#4c748599',3);
   for(let i=0;i<3;i++){const xx=px-68+i*68;box(xx-18,py+45,36,23,5,'#132c3e');box(xx-14,py+49,28,12,3,'#507d91');circle(xx+10,py+63,2,'#a0ffe7')}
  }
  if(name==='ALGENZUCHT'){
   for(let i=0;i<4;i++){const px=x+40+i*64,py=y+77;box(px-25,py-38,50,76,13,'#163c40');box(px-20,py-31,40,62,10,'#337263');for(let k=0;k<4;k++){const a=px-12+k*8;c.beginPath();c.moveTo(a,py+22);c.quadraticCurveTo(a+Math.sin(clock+k)*9,py-6,a+Math.sin(clock*.8+k)*5,py-22);c.strokeStyle='#9bd7a49c';c.lineWidth=3;c.stroke();circle(a,py+21-((clock*12+k*14)%42),2,'#dbfbdca0')}box(px-15,py+33,30,8,2,'#91b59c')}
  }
 }
 let art=null;
 function mapArt(){
  if(art)return art;art=document.createElement('canvas');art.width=E.MW;art.height=E.MH;
  const d=art.getContext('2d'),rect=(x,y,w,h,r,col)=>{d.fillStyle=col;d.beginPath();d.roundRect(x,y,w,h,r);d.fill()};
  const sea=d.createLinearGradient(0,0,E.MW,E.MH);sea.addColorStop(0,'#10374d');sea.addColorStop(.55,'#0a273a');sea.addColorStop(1,'#06131f');d.fillStyle=sea;d.fillRect(0,0,E.MW,E.MH);
  for(let i=0;i<260;i++){const x=(i*149)%E.MW,y=(i*97)%E.MH;d.fillStyle='#72afc318';d.beginPath();d.ellipse(x,y,2+i%6,1+i%3,0,0,Math.PI*2);d.fill()}
  // Layered hull outside the walkable grid, then a continuous deck.
  for(let y=0;y<E.R;y++)for(let x=0;x<E.C;x++)if(E.floor[y][x]){
   const px=x*E.T,py=y*E.T;rect(px-11,py-11,62,62,8,'#050f1d');rect(px-7,py-7,54,54,6,'#263e50');rect(px-3,py-3,46,46,4,'#688493');
  }
  for(let y=0;y<E.R;y++)for(let x=0;x<E.C;x++)if(E.floor[y][x]){
   const px=x*E.T,py=y*E.T,room=E.rooms.some(([,rx,ry,rw,rh])=>x>=rx&&x<rx+rw&&y>=ry&&y<ry+rh);
   const grad=d.createLinearGradient(px,py,px+E.T,py+E.T);grad.addColorStop(0,(x+y)%2?'#304b5a':'#375261');grad.addColorStop(1,'#203645');d.fillStyle=grad;d.fillRect(px,py,E.T,E.T);
   d.strokeStyle='#8fb1bd25';d.strokeRect(px+.5,py+.5,E.T-1,E.T-1);d.fillStyle='#87a5af66';for(const [a,b] of [[4,4],[36,4],[4,36],[36,36]])d.fillRect(px+a,py+b,1.5,1.5);
   if(!room){const horizontal=!!E.floor[y]?.[x-1]&&!!E.floor[y]?.[x+1];d.fillStyle='#8ab4bc52';d.fillRect(px+(horizontal?14:18),py+(horizontal?18:14),horizontal?12:4,horizontal?4:12);d.fillStyle='#c0b98b44';d.fillRect(px+(horizontal?0:7),py+(horizontal?7:0),horizontal?40:2,horizontal?2:40)}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(!E.floor[y+dy]?.[x+dx]){
    const xx=px+(dx===1?32:0),yy=py+(dy===1?32:0);d.fillStyle='#102233';d.fillRect(xx,yy,dx?8:40,dy?8:40);d.fillStyle='#627c8c';d.fillRect(xx+(dx===1?2:dx===-1?5:4),yy+(dy===1?2:dy===-1?5:4),dx?2:32,dy?2:32);
    d.fillStyle='#8cdad955';d.fillRect(xx+(dx?3:14),yy+(dy?3:14),dx?2:12,dy?2:12);
   }
  }
  return art;
 }
 function robot(p,x,y,time,ghost=false){
  const col=C[p.id],moving=Math.abs(p.dx)+Math.abs(p.dy)>.1,bob=moving?Math.sin(time*13+p.id)*2:Math.sin(time*3+p.id)*1.3,side=p.dx<-.1?-1:1,back=p.dy<-.15&&Math.abs(p.dy)>Math.abs(p.dx);
  c.save();c.translate(x,y+bob);c.globalAlpha=ghost?.38:1;c.rotate(moving?Math.sin(time*13+p.id)*.035:0);
  c.fillStyle='#04131eaa';c.beginPath();c.ellipse(0,13,17,7,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#8eb0be';c.lineWidth=2;
  for(const s of [-1,1]){const f=moving?Math.sin(time*13+s*Math.PI/2)*5:0;box(s*8-4,7+f,8,12,3,'#243b48');box(s*8-5,13+f,10,5,2,col)}
  for(const s of [-1,1]){const swing=moving?Math.sin(time*13+p.id+s*Math.PI/2)*4:0;box(s*17-4,-7+swing,8,20,4,'#162b39');box(s*17-3,-5+swing,6,8,3,col);circle(s*17,9+swing,3,'#678b9a')}
  box(-14,-18,28,30,8,'#132c3c');const shell=c.createLinearGradient(-12,-16,12,8);shell.addColorStop(0,'#f2ffff');shell.addColorStop(.26,col);shell.addColorStop(1,'#294858');box(-12,-16,24,23,7,shell);box(-9,-13,18,14,5,'#102d3e');line(-7,-11,7,-11,'#80c1c9',1);
  if(p.style===1){box(-5,-27,10,11,3,'#d2e8ef');circle(0,-28,2.5,col)}else if(p.style===2){box(-22,-8,6,19,3,'#d2e1e3');box(16,-8,6,19,3,'#d2e1e3')}else if(p.style===3){box(-15,6,30,6,2,'#d9c08b')}
  if(back){box(-9,-13,18,14,5,'#294653');for(let i=0;i<3;i++)line(-6,-10+i*4,6,-10+i*4,'#8bb3bd',1.5)}else{box(-6+side*2,-10,10,4,2,'#d7ffff');if(Math.floor(time*2+p.id)%13===0)box(-6+side*2,-10,10,3,1,'#173e50')}box(-7,5,14,4,2,'#122e3e');circle(0,7,1.8,'#c8fffa');
  line(-4,-18,-9,-25,'#879fa9',2);circle(-9,-25,2.4,col);
  if(p.id===my){c.strokeStyle='#e5ffff';c.lineWidth=1.7;c.beginPath();c.ellipse(0,16,21,9,0,0,Math.PI*2);c.stroke()}
  c.globalAlpha=1;text(p.name.slice(0,18),0,-32,11,'#edfaff','center',750);c.restore()
 }
 function draw(){
  const w=width(),h=height();buttons=[];c.save();c.fillStyle='#071923';c.fillRect(0,0,w,h);
  if(!snap){
   for(let i=0;i<38;i++){const x=(i*97+clock*5)%w,y=(i*61-clock*9%h+h)%h;circle(x,y,1+i%3,'#73d8df36')}
   text('ABYSS PROTOCOL',w/2,h*.22,Math.min(30,w/21),'#9af6ed','center',900);c.restore();return
  }
  const p=me();if(!p){c.restore();return}
  const scale=cl(Math.min(w/690,h/420),.64,1.2);
  for(const q of snap.players){const a=smooth[q.id]||{x:q.x,y:q.y};const f=host?1:.28;if(Math.hypot(a.x-q.x,a.y-q.y)>160){a.x=q.x;a.y=q.y}else{a.x+=(q.x-a.x)*f;a.y+=(q.y-a.y)*f}smooth[q.id]=a}
  const pos=smooth[my]||p,targetX=pos.x-w/(2*scale),targetY=pos.y-h/(2*scale);
  if(!camReady){camera={x:targetX,y:targetY};camReady=true}else{camera.x+=(targetX-camera.x)*.17;camera.y+=(targetY-camera.y)*.17}
  c.save();c.scale(scale,scale);c.translate(-camera.x,-camera.y);
  c.drawImage(mapArt(),0,0);
  for(const q of E.rooms)if((q[1]+q[3])*E.T>camera.x&&q[1]*E.T<camera.x+w/scale&&(q[2]+q[4])*E.T>camera.y&&q[2]*E.T<camera.y+h/scale)roomDecor(...q);
  // Animated ocean, viewport lights and station activity.
  for(let i=0;i<28;i++){const x=(i*137+clock*8)%E.MW,y=(i*83-clock*13%E.MH+E.MH)%E.MH;if(!E.floor[Math.floor(y/E.T)]?.[Math.floor(x/E.T)])circle(x,y,2+i%3,'#7dd3fc26')}
  for(const [i,q] of E.stations.entries()){
   const active=secret?.tasks?.includes(i)&&!secret?.done?.includes(i);
   box(q.x-20,q.y-15,40,30,6,'#0e2738');box(q.x-16,q.y-11,32,20,4,active?'#3b9f9f':'#365367');
   line(q.x-9,q.y-4,q.x+9,q.y-4,'#cafafa',2);circle(q.x+12,q.y+5,2,active?'#d8f779':'#7bb4c0');
   if(active){c.strokeStyle='rgba(173,244,179,'+(.5+.3*Math.sin(clock*4))+')';c.lineWidth=2;c.beginPath();c.arc(q.x,q.y,25+Math.sin(clock*3)*3,0,Math.PI*2);c.stroke()}
  }
  const dg=E.diagnostic;box(dg.x-23,dg.y-15,46,30,6,'#122c40');box(dg.x-18,dg.y-10,36,19,3,'#367b83');for(let j=0;j<5;j++)line(dg.x-13+j*6,dg.y+5,dg.x-13+j*6,dg.y+4-(3+(j*7)%12), '#b4eee0',2);text('DIAGNOSE',dg.x,dg.y-23,10,'#b8e3e6','center',800);
  for(const [i,q] of E.ports.entries()){box(q.x-17,q.y-13,34,26,5,'#183641');text('T'+(i+1),q.x,q.y-20,10,'#9bcbd2','center',800);for(let i=-10;i<=10;i+=5)line(q.x-12,q.y+i,q.x+12,q.y+i,'#66818c',2)}
  const range=snap.alert?.kind==='signal'?130:320,visible=q=>!p.alive||E.sight(p,q,range);
  for(const f of fx){const age=clock-f.t;c.save();c.globalAlpha=Math.max(0,1-age/1.4);c.strokeStyle='#a9f6e9';c.lineWidth=2;c.beginPath();c.arc(f.x,f.y,12+age*39,0,Math.PI*2);c.stroke();for(let i=0;i<9;i++){const a=i*Math.PI*2/9;circle(f.x+Math.cos(a)*age*36,f.y+Math.sin(a)*age*36,2,'#b7fff0')}c.restore()}
  for(const m of snap.markers)if(visible(m)){box(m.x-15,m.y-9,30,18,6,'#38434b');box(m.x-10,m.y-5,20,10,4,C[m.id]);circle(m.x+8,m.y,3,'#ffb66e');text('AUSFALL',m.x,m.y-20,10,'#ffd2a0','center',800)}
  for(const q of snap.players.slice().sort((a,b)=>a.y-b.y))if(q.id===my||q.alive&&visible(q)||!p.alive&&!q.alive){const a=smooth[q.id]||q;robot(q,a.x,a.y,clock,!q.alive)}
  c.restore();
  if(p.alive){const px=(pos.x-camera.x)*scale,py=(pos.y-camera.y)*scale,rad=range*scale;
   if(!visionCache||Math.hypot(visionCache.x-p.x,visionCache.y-p.y)>3||visionCache.range!==range)visionCache={x:p.x,y:p.y,range,points:E.vision(p,range)};
   c.beginPath();c.rect(0,0,w,h);visionCache.points.forEach(([x,y],i)=>{const sx=(x-camera.x)*scale,sy=(y-camera.y)*scale;i?c.lineTo(sx,sy):c.moveTo(sx,sy)});c.closePath();c.fillStyle='#040f1cc9';c.fill('evenodd');
   const g=c.createRadialGradient(px,py,rad*.64,px,py,rad*1.35);g.addColorStop(0,'#06131c00');g.addColorStop(1,'#04111dc9');c.fillStyle=g;c.fillRect(0,0,w,h)}
  // Fixed HUD, designed independently from the scene.
  box(10,10,w-20,49,11,'#102633ec');
  const role=secret?.rn===snap.rn?E.specialName(secret).toUpperCase():'ROLLE WIRD GELADEN';
  text(role,22,23,12,secret?.role==='glitch'?'#ffc69b':'#a3f1de','left',850);
  text(p.alive?E.location(p)+' · '+snap.players.filter(q=>q.alive).length+' aktiv':'BEOBACHTERMODUS',22,43,11,'#a1b7c6');
  const barW=Math.min(220,w*.29),bx=w-barW-24;box(bx,22,barW,10,5,'#243a47');box(bx,22,barW*cl(snap.done/Math.max(1,snap.total),0,1),10,5,'#79ddc4');text('STABILISIERUNG '+snap.done+'/'+snap.total,bx+barW/2,44,10,'#bce4dd','center',750);
  if(snap.alert){box(w*.22,65,w*.56,35,7,'#7b3f31ed');text((snap.alert.kind==='pressure'?'SYSTEMDRUCK':'SIGNALSTÖRUNG')+' · '+E.stations[snap.alert.station].name+' · '+Math.max(0,Math.ceil(snap.alert.until-snap.t))+' s',w/2,82,12,'#ffe1be','center',800)}
  if(secret?.tasks){const tw=Math.min(165,w*.34),th=26+secret.tasks.length*18;box(10,105,tw,th,9,'#0c2531e6');text('DEINE AUFTRÄGE',20,117,10,'#98d9df','left',800);secret.tasks.forEach((i,j)=>text((secret.done.includes(i)?'✓  ':'○  ')+E.stations[i].name,20,136+j*18,10,secret.done.includes(i)?'#83bba3':'#e0edf1'))}
  if(guideOn&&secret?.tasks&&secret.rn===snap.rn&&!panel){
   const key=[Math.floor(p.x/E.T),Math.floor(p.y/E.T),secret.done.join(','),secret.tasks.join(',')].join(':');if(!guideCache||guideCache.key!==key)guideCache={key,data:E.guidance(p,secret.tasks,secret.done)};
   const guide=guideCache.data;if(guide){const angle=Math.atan2(guide.point.y-p.y,guide.point.x-p.x),gx=w/2,gy=h-29;box(gx-79,gy-17,158,34,9,'#0d2b37ed');c.save();c.translate(gx-61,gy);c.rotate(angle);c.beginPath();c.moveTo(10,0);c.lineTo(-5,-6);c.lineTo(-2,0);c.lineTo(-5,6);c.closePath();c.fillStyle='#d0f9a1';c.fill();c.restore();text(E.stations[guide.id].name,gx-44,gy-4,10,'#d9f6ef','left',750);text('Nächster Auftrag',gx-44,gy+8,8,'#9cb6bf')}
  }
  if(w<640&&guideOn&&guideCache?.data&&!panel){const guide=guideCache.data;const gx=w*.5,gy=77;const angle=Math.atan2(guide.point.y-p.y,guide.point.x-p.x);c.save();c.translate(gx,gy);c.rotate(angle);c.beginPath();c.moveTo(9,0);c.lineTo(-5,-5);c.lineTo(-2,0);c.lineTo(-5,5);c.closePath();c.fillStyle='#d0f9a1';c.fill();c.restore()}
  if(roleUntil>clock&&secret?.rn===snap.rn){box(w*.20,h*.39,w*.60,65,13,'#102a38f5');text(E.specialName(secret).toUpperCase(),w/2,h*.39+20,20,secret.role==='glitch'?'#ffc69b':'#a3f1de','center',900);text(secret.role==='glitch'?'Täusche die anderen Einheiten.':secret.special==='analyst'?'Diagnose auch außerhalb der Konsole.':secret.special==='support'?'Einmal einen Druckalarm verlängern.':'Erfülle Aufträge und beobachte die Station.',w/2,h*.39+45,12,'#e3f5f4','center',600)}
  if(taskFlash>clock){box(w*.33,h*.26,w*.34,31,9,'#205347ed');text('Auftrag abgeschlossen',w/2,h*.26+15,12,'#d4ffec','center',800)}
  const bw=Math.min(112,w*.22),y=h-47;
  const available=secret?.tasks?.find(i=>!secret.done.includes(i)&&E.near(p,E.stations[i]));
  b('Aufgabe',w-bw-10,y,bw,37,()=>taskOpen(available),available!==undefined&&!taskPending);
  const report=p.alive&&snap.markers.some(q=>E.near(p,q,76));
  b('Melden',w-bw*2-17,y,bw,37,()=>send({k:'report'}),report);
  b('Karte',w-bw-10,65,bw,31,()=>{panel=panel==='map'?'':'map';send({k:'move',x:0,y:0})});
  b(guideOn?'Nav: an':'Nav: aus',w-bw-10,102,bw,27,()=>{guideOn=!guideOn;guideCache=null});
  if(p.alive&&secret?.rn===snap.rn&&(secret.special==='analyst'||E.near(p,E.diagnostic,70)||secret.scan)){
   const active=secret.scan?.until>snap.t;b(active?'Diagnose öffnen':snap.t<secret.scanCool?'Scan '+Math.ceil(secret.scanCool-snap.t)+'s':'Diagnose',w-bw-10,135,bw,32,()=>{if(active){panel='scan';send({k:'move',x:0,y:0})}else send({k:'scan'})},active||!snap.alert&&snap.t>=secret.scanCool&&(secret.special==='analyst'||E.near(p,E.diagnostic,70)));
  }
  if(p.alive&&secret?.special==='support'&&!secret.specialUsed&&snap.alert?.kind==='pressure')b('Puffer +12s',w-bw-10,y-88,bw,37,()=>send({k:'stabilize'}),true,'#286b66');
  const canMeet=p.alive&&secret?.meeting>0&&!snap.alert&&snap.t>=snap.meetingCool&&E.near(p,E.meeting,80);
  if(canMeet)b('Besprechung',w-bw*2-17,y-44,bw,37,()=>send({k:'meeting'}),true,'#725334');
  if(snap.alert&&p.alive&&E.near(p,E.stations[snap.alert.station],76))b('Reparieren',w-bw-10,y-44,bw,37,()=>send({k:'repair'}),true,'#23796e');
  if(secret?.role==='glitch'&&p.alive){
   const q=snap.players.find(q=>q.alive&&q.id!==my&&!secret.allies?.includes(q.id)&&E.near(p,q,60));
   b(snap.t<secret.cool?'Stören '+Math.ceil(secret.cool-snap.t)+'s':'Stören',w-bw-10,y-88,bw,37,()=>send({k:'disable',v:q.id}),!!q&&snap.t>=secret.cool,'#864740');
   b('Systemalarm',w-bw*2-17,y-88,bw,37,()=>{panel=panel==='alarm'?'':'alarm';send({k:'move',x:0,y:0})},!snap.alert&&snap.t>=secret.sabCool,'#744551');
   if(E.ports.some(q=>E.near(p,q,55))&&snap.t>=secret.portCool)b('Wartungstunnel',w-bw*2-17,y-132,bw,36,()=>{panel='port';send({k:'move',x:0,y:0})},true);
  }
  const jx=touch?.sx??62,jy=touch?.sy??(h-64);circle(jx,jy,37,'#193c4d90');circle(jx+(touch?cl(touch.x-jx,-29,29):0),jy+(touch?cl(touch.y-jy,-29,29):0),14,'#7ac7cf86');
  if(panel){
   buttons=[];box(w*.1,h*.13,w*.8,h*.72,16,'#0a1e2af7');
   if(panel==='map'){
    text('STATION N-17 / ÜBERSICHT',w/2,h*.19,15,'#b8f5ee','center',800);
    const z=Math.min(w*.65/E.MW,h*.49/E.MH),ox=(w-E.MW*z)/2,oy=h*.23;
    c.save();c.translate(ox,oy);c.scale(z,z);c.drawImage(mapArt(),0,0);
    for(const q of E.rooms){box(q[1]*E.T+4,q[2]*E.T+4,q[3]*E.T-8,q[4]*E.T-8,7,q[5]);text(q[0],(q[1]+q[3]/2)*E.T,(q[2]+q[4]/2)*E.T,14,'#e6f1f4','center')}
    for(const i of secret?.tasks||[])if(!secret.done.includes(i))circle(E.stations[i].x,E.stations[i].y,15,'#d4f98a');
    if(snap.alert){const q=E.stations[snap.alert.station];circle(q.x,q.y,20,'#f4a180');text('!',q.x,q.y,23,'#3e1c20','center',900)}
    circle(E.meeting.x,E.meeting.y,12,'#8dd5ea');
    circle(p.x,p.y,16,'#fff');c.restore();
   }else if(panel==='scan'){
    text('STATIONSDIAGNOSE / Momentaufnahme',w/2,h*.20,15,'#c3efe9','center',800);text('Nur Anzahl aktiver Einheiten je Raum',w/2,h*.25,11,'#a3bfc8','center');
    const counts=secret?.scan?.counts||[];E.rooms.forEach((q,i)=>{const x=w*.16+(i%2)*w*.35,y=h*.31+Math.floor(i/2)*h*.075;box(x,y,w*.33,h*.064,6,'#173b4a');text(q[0],x+8,y+h*.032,10,'#d0e5e9');text(String(counts[i]??'–'),x+w*.30,y+h*.032,13,'#bcf6d9','right',850)});
   }else if(panel==='alarm'){
    text('SYSTEMSTÖRUNGEN',w/2,h*.23,18,'#ffc0a1','center',850);
    b('Signal stören',w*.22,h*.37,w*.56,42,()=>{send({k:'alert',v:'signal'});panel=''},true,'#704553');
    b('Druckalarm',w*.22,h*.49,w*.56,42,()=>{send({k:'alert',v:'pressure'});panel=''},true,'#704553');
   }else if(panel==='port'){text('WARTUNGSTUNNEL / ZIEL',w/2,h*.23,16,'#c3efe9','center',800);E.ports.forEach((q,i)=>b('Ausgang '+(i+1),w*.22+(i%2)*w*.29,h*.35+Math.floor(i/2)*55,w*.27,40,()=>{send({k:'port',v:i});panel=''}))}
   b('Schließen',w*.36,h*.75,w*.28,35,()=>panel='')
  }
  c.restore()
 }
 function click(x,y,_p,id){
  if(snap?.ph!=='run'||task)return;
  const q=buttons.findLast(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h);if(q){q.fn();return}
  if(!panel&&x<width()*.43&&y>height()*.43)touch={id,sx:x,sy:y,x,y}
 }
 function key(k){
  if(snap?.ph!=='run'||task)return;const p=me();if(!p)return;
  if(k==='KeyM'){panel=panel?'':'map';send({k:'move',x:0,y:0});return}
  if(k==='Escape'){panel='';return}
  if(panel)return;
  if(k==='KeyE'){const i=secret?.tasks?.find(i=>!secret.done.includes(i)&&E.near(p,E.stations[i]));if(i!==undefined)taskOpen(i);else if(snap.alert&&E.near(p,E.stations[snap.alert.station],76))send({k:'repair'})}
  if(k==='KeyR')send({k:'report'});
  if(k==='KeyQ'&&p.alive&&secret){if(secret.scan?.until>snap.t)panel='scan';else if(secret.special==='support'&&snap.alert?.kind==='pressure'&&!secret.specialUsed)send({k:'stabilize'});else send({k:'scan'})}
  if(k==='KeyF'){if(secret?.role==='glitch'){const q=snap.players.find(q=>q.alive&&q.id!==my&&!secret.allies.includes(q.id)&&E.near(p,q,60));if(q)send({k:'disable',v:q.id})}else send({k:'meeting'})}
 }
 const api={showSetup:setup,canJoin:()=>mode==='setup'&&!busy,joinCode:v=>openOnline(v),draw,update,click,key,dragMove(x,y,_p,id){if(touch?.id===id){touch.x=x;touch.y=y}},dragEnd(_x,_y,_p,id){if(touch?.id===id)touch=null},dragCancel(_p,id){if(touch?.id===id)touch=null},leave(){stopAmbience();alive=false;lobbyUnit=null;lobbyGoal=null;lobbySmooth={};roleRef?.off();if(ref){LUN.left=1;luCleanup()}window.gameChat?.stop();task=null;touch=null;state=null;snap=null;secret=null}};
 return api;
}
