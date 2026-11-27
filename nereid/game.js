/* Nereidenprotokoll — original 2D social deduction, host-authoritative game rules. */
const Nereid=(()=>{
 'use strict';
 const T=40,C=29,R=21,MW=C*T,MH=R*T;
 const colors=['#68e4db','#ffac73','#aeb5ff','#e6df83','#ec8eb7','#79c4ff','#9fe393','#f08379','#d6b4ff','#d2dce5'];
 const rooms=[
  ['PUMPWERK',1,1,7,5,'#244b58'],['BIO-LABOR',21,1,7,5,'#325650'],
  ['LAGER',1,8,7,5,'#4d4754'],['ATRIUM',10,6,9,8,'#304c60'],
  ['FUNKZENTRALE',21,8,7,5,'#41465e'],['WERKSTATT',1,15,7,5,'#514b42'],
  ['TAUCHDOCK',10,16,9,4,'#34545a'],['ENERGIEKERN',21,15,7,5,'#4c485f']
 ];
 const halls=[[5,5,2,4],[7,3,15,2],[7,9,4,3],[18,9,4,3],[23,5,2,4],[5,12,2,4],[23,12,2,4],[7,17,4,2],[18,17,4,2],[13,13,3,4],[13,4,3,3]];
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
  {name:'Energiekern',...at(25,17),kind:'pulse'}
 ];
 const meeting=at(14,9),ports=[at(6,2),at(26,11),at(6,18),at(26,18)];
 const phrases=['Ich war bei einer Aufgabe.','Ich habe eine Störung entdeckt.','Ich war im Atrium.','Ich war im Westen.','Ich war im Osten.','Hat jemand etwas gesehen?','Ich bin mir nicht sicher.','Lasst uns die Runde überspringen.'];
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const walk=(x,y)=>!!floor[Math.floor(y/T)]?.[Math.floor(x/T)];
 const fits=(x,y)=>walk(x-12,y-12)&&walk(x+12,y-12)&&walk(x-12,y+12)&&walk(x+12,y+12);
 function sight(a,b,range=Infinity){const d=distance(a,b);if(d>range)return false;for(let i=0;i<=Math.ceil(d/14);i++){const f=i/Math.max(1,Math.ceil(d/14));if(!walk(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f))return false}return true}
 const near=(a,b,r=65)=>distance(a,b)<=r&&sight(a,b);
 function shuffle(a,rand=Math.random){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 function spawn(p){const a=p.id*2.399; p.x=meeting.x+Math.cos(a)*82;p.y=meeting.y+Math.sin(a)*82;p.dx=p.dy=0;p.inputUntil=0;p.waypoint=null;p.workUntil=0}
 function newRound(seats,opts={},rand=Math.random){
  const players=seats.map((q,i)=>q&&['p','cpu'].includes(q.k)?{id:i,name:q.name||'Drohne '+(i+1),bot:q.k==='cpu',alive:true,role:'tech',tasks:shuffle(stations.map((_,j)=>j),rand).slice(0,opts.tasks===4?4:3),done:[],cool:18,meeting:1,dx:0,dy:0,inputUntil:0,botWait:0}:null).filter(Boolean);
  if(players.length<4||players.length>10)throw Error('4–10 Teilnehmer erforderlich');
  const glitches=shuffle(players,rand).slice(0,players.length>=7&&opts.two?2:1);
  glitches.forEach(p=>p.role='glitch');players.forEach(spawn);
  return {ph:'run',rn:Date.now(),players,t:0,seq:0,markers:[],alert:null,sabCool:25,meetingCool:12,meetingEnd:0,votes:{},notes:[],cause:'',result:'',total:players.filter(p=>p.role==='tech').reduce((n,p)=>n+p.tasks.length,0),opts:{discussion:opts.discussion===45?45:30},rand};
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
  s.ph='meeting';s.meetingEnd=s.t+s.opts.discussion;s.votes={};s.notes=[];s.cause=by.name+' · '+cause;
  s.players.forEach(p=>{p.dx=p.dy=0;p.inputUntil=0});
  // Interrupt the fictional alert during a meeting so the timer stays fair.
  s.alert=null;s.markers=[];
 }
 function finishMeeting(s){
  const tally={};for(const v of Object.values(s.votes))tally[v]=(tally[v]||0)+1;
  const ranked=Object.entries(tally).sort((a,b)=>b[1]-a[1]);let out=null;
  if(ranked.length&&ranked[0][0]!=='-1'&&(!ranked[1]||ranked[0][1]>ranked[1][1]))out=player(s,+ranked[0][0]);
  if(out)out.alive=false;
  s.players.forEach(p=>{p.evidence=null;p.lastSeen=null;p.workUntil=0});
  s.cause=out?out.name+' wurde isoliert.':'Keine eindeutige Mehrheit.';
  s.ph='result';s.meetingEnd=s.t+5;s.meetingCool=s.t+20;checkWin(s);
 }
 function challenge(s,p,id){
  const seed=(s.rn%997)+(p.id+3)*37+(id+11)*71;
  const values=Array.from({length:4},(_,i)=>(Math.imul(seed+i*97,2654435761)>>>((i+1)*3))%4);
  if(stations[id]?.kind==='sort')return [0,1,2,3].sort((a,b)=>(Math.imul(seed+a*13,1597334677)>>>0)-(Math.imul(seed+b*13,1597334677)>>>0));
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
  if(s.alert&&p.alive&&p.role==='tech'&&p.id%2===0){
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
  return {ph:s.ph,rn:s.rn,seq:++s.seq,t:Math.round(s.t*10)/10,players:s.players.map(p=>({id:p.id,name:p.name,bot:p.bot,alive:p.alive,x:Math.round(p.x),y:Math.round(p.y),dx:Math.round(p.dx*10)/10,dy:Math.round(p.dy*10)/10,...(s.ph==='end'?{role:p.role}:{})})),markers:s.markers,alert:s.alert,meetingEnd:s.meetingEnd,meetingCool:s.meetingCool,meetingVotes:Object.keys(s.votes).map(Number),notes:s.notes,cause:s.cause,result:s.result,done:progress(s),total:s.total};
 }
 function privateState(s,id){const p=player(s,id);return p?{rn:s.rn,role:p.role,tasks:p.tasks,done:p.done,cool:p.cool,meeting:p.meeting,sabCool:s.sabCool,portCool:p.portCool||0,...(p.role==='glitch'?{allies:s.players.filter(q=>q.role==='glitch').map(q=>q.id)}:{})}:null}
 return {T,C,R,MW,MH,rooms,halls,floor,stations,meeting,ports,colors,phrases,at,near,sight,fits,newRound,apply,step,gone,publicState,privateState,challenge,sortValues,routePath,vision,route,player};
})();
function nereidGame(){
 const E=Nereid,esc=s=>String(s??'').replace(/[&<>"']/g,a=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[a]));
 let mode='setup',state=null,snap=null,secret=null,room=null,ref=null,roleRef=null,code='',my=0,host=false,alive=true,busy=false,opts={bots:6,two:true,tasks:3,discussion:30},clock=0,publishAt=0,sendAt=0,seq=0,seen={},privateCache={},panel='',task=null,touch=null,buttons=[],smooth={},camera={x:0,y:0},camReady=false,phase='',overlayKey='',lastText='',lobbyStamp='',lastMotion=-10,pending=0,moveKey='',roleUntil=0,visionCache=null,fx=[],seenMarkers=new Set(),taskFlash=0;
 const C=E.colors,cl=(n,a,b)=>Math.max(a,Math.min(b,n)), me=()=>snap?.players?.find(p=>p.id===my), width=()=>V.pw||800,height=()=>V.ph||480;
 const box=(x,y,w,h,r,col)=>{c.fillStyle=col;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()};
 const line=(x,y,a,b,col,w=1)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.stroke()};
 const circle=(x,y,r,col)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=col;c.fill()};
 const text=(s,x,y,sz=12,col='#d6e9f0',align='left',weight=600)=>{c.font=weight+' '+sz+'px system-ui';c.fillStyle=col;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y)};
 const b=(label,x,y,w,h,fn,active=true,col='#173546')=>{box(x,y,w,h,9,active?col:'#14232c');text(label,x+w/2,y+h/2,Math.min(13,w/7),active?'#f0fcff':'#70828c','center',750);if(active)buttons.push({x,y,w,h,fn})};
 const sound=(f=440)=>{try{snd(f,.07,'sine')}catch(_){}};
 const hide=()=>{$('#ov').style.display='none';overlayKey=''};
 function overlay(key,html,bind){
  if(overlayKey===key)return;const prior=$('#ov')?.querySelector('.nr-panel'),scroll=prior?.scrollTop||0;overlayKey=key;showOv('<div class="nr-panel">'+html+'</div>');const root=$('#ov');bind?.(root);const next=root.querySelector('.nr-panel');if(next&&scroll)next.scrollTop=scroll;
 }
 const button=(action,label,disabled=false)=>'<button class="nr-btn" data-nr="'+action+'" '+(disabled?'disabled':'')+'>'+esc(label)+'</button>';
 const header=(eyebrow,title,copy)=>'<div class="nr-eyebrow">'+esc(eyebrow)+'</div><h2>'+esc(title)+'</h2><p>'+esc(copy)+'</p>';
 function bind(root){root.querySelectorAll('[data-nr]').forEach(el=>el.onclick=()=>action(el.dataset.nr));}
 function setup(){
  host=false;mode='setup';state=snap=secret=null;camReady=false;phase='';overlayKey='';
  overlay('setup'+opts.bots,header('NEREIDENPROTOKOLL / 2049','Stille unter der Oberfläche','Eine Forschungsstation. Autonome Wartungseinheiten. Ein verborgenes Störsignal.')+
   '<div class="nr-feature"><span>01 / AUFTRÄGE</span><span>02 / VERDACHT</span><span>03 / ABSTIMMUNG</span></div><p>Techniker stabilisieren die Station. Störeinheiten täuschen, lösen Systemalarme aus und setzen andere Roboter außer Betrieb. Keine Seite kennt alle Rollen.</p>'+
   '<div class="nr-row">'+button('local','Training mit Bots')+button('create','Online-Raum erstellen')+button('localopts','Training: '+opts.bots+' Einheiten')+'</div><div class="nr-row"><input id="nr-code" maxlength="20" placeholder="20-stelliger Raumcode" autocomplete="off" autocapitalize="characters">'+button('join','Beitreten')+'</div><p class="nr-small">4–10 Teilnehmer · WASD / Pfeile · Touch-Joystick · E: Aufgabe · R: Meldung · M: Karte</p>',bind);
 }
 function lobby(){
  if(!room)return;
  const seats=Object.entries(room.seats||{}), humans=seats.filter(([,q])=>q.k==='p'),isHost=host;
  const sig=JSON.stringify([humans,opts,host,code,busy,Object.keys(OL.F||{}),Object.keys(OL.P||{}),LUN.inv]);
  overlay('lobby'+sig,header('BASIS N-17 / VERBINDUNG','Einsatzlobby','Teile den Raumcode oder lade bestätigte Freunde ein.')+
   '<div class="nr-code"><code>'+esc(code)+'</code>'+button('copy','Kopieren')+'</div><div class="nr-roster">'+humans.map(([i,p])=>'<div><i style="background:'+C[i]+'"></i>'+esc(p.name)+(i==='0'?' <small>HOST</small>':'')+'</div>').join('')+'</div><p>'+humans.length+' / 10 verbunden</p>'+
   (isHost?'<div class="nr-row">'+button('bots','Zielgröße: '+opts.bots)+button('tasks','Aufgaben: '+opts.tasks)+button('two','2 Störer ab 7: '+(opts.two?'An':'Aus'))+button('discussion','Besprechung: '+opts.discussion+' s')+'</div><p class="nr-small">Freie Plätze bis zur Zielgröße werden beim Start mit Bots besetzt.</p><div class="nr-roster">'+Object.keys(OL.F||{}).filter(u=>!humans.some(([,q])=>q.uid===u)&&olAllowed(u)).slice(0,18).map(u=>'<div>'+esc(olNameOf(u))+' '+button('invite:'+u,LUN.inv[u]?'Gesendet':'Einladen',!!LUN.inv[u])+'</div>').join('')+'</div>'+button('start','Einsatz starten',busy):'<p>Warte auf den Host …</p>')+
   '<div class="nr-row">'+button('leave','Lobby verlassen')+'</div>',bind);
 }
 function local(){host=true;mode='local';my=0;state=E.newRound(Array.from({length:opts.bots},(_,i)=>i===0?{k:'p',name:'Du'}:{k:'cpu',name:['','Mira','Kelp','Orion','Lumen','Vela','Nix','Echo','Delta','Nova'][i]}),opts);beginRound()}
 function beginRound(){snap=E.publicState(state);secret=E.privateState(state,my);camReady=false;smooth={};phase='';task=null;touch=null;moveKey='';seenMarkers.clear();fx=[];roleUntil=clock+4;hide();sound(660)}
 async function openOnline(joinCode){
  if(busy||mode!=='setup')return false;busy=true;
  try{
   if(!await luLogin()||!alive)return false;
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
   mode='lobby';roleRef=OL.db.ref('hands/'+code+'/'+OL.me);
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
   if(mode!=='lobby'){state=null;snap=null;secret=null;overlayKey='';task=null;panel=''}
   mode='lobby';lobby();return
  }
  if(host&&state){
   Object.entries(v.seats||{}).forEach(([i,q])=>{if(q.k==='gone')E.gone(state,+i)});
   for(const [u,raw] of Object.entries(v.act||{})){let a;try{a=JSON.parse(raw)}catch(_){continue}
    const i=Object.keys(v.seats||{}).find(i=>v.seats[i].k==='p'&&v.seats[i].uid===u);
    if(i===undefined||!Number.isSafeInteger(a.n)||a.n<=(seen[u]||0))continue;seen[u]=a.n;E.apply(state,+i,a)
   }
  }else if(!host&&v.snap){try{
   const q=JSON.parse(v.snap).snap;if(!q||!Array.isArray(q.players))return;
   if(!snap||q.rn!==snap.rn){camReady=false;smooth={};phase='';task=null;moveKey='';seenMarkers.clear();fx=[];roleUntil=clock+4;hide()}
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
   const updates={status:'play'};
   for(let i=1;i<10;i++){if(seats[i]?.k==='p')continue;seats[i]={k:count<target?'cpu':'off'};if(seats[i].k==='cpu')count++;updates['seats/'+i]=seats[i]}
   state=E.newRound(Array.from({length:10},(_,i)=>seats[i]),opts);seen={};privateCache={};seq=0;
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
  if(!state||mode!=='host'||!ref||pending)return;
  const changes={['rooms/'+code+'/snap']:JSON.stringify({snap})};
  for(const p of state.players){const q=room?.seats?.[p.id];if(q?.k==='p'&&p.id!==my){const raw=JSON.stringify(E.privateState(state,p.id));if(privateCache[q.uid]!==raw){changes['hands/'+code+'/'+q.uid]=raw;privateCache[q.uid]=raw}}}
  pending=1;OL.db.ref().update(changes).catch(e=>{privateCache={};if(alive&&clock-lastMotion>3){lastMotion=clock;toast(luErr(e))}}).finally(()=>pending=0)
 }
 function send(a){
  if(!snap||!secret||secret.rn!==snap.rn)return;
  if(host&&state){const ok=E.apply(state,my,a);if(ok&&a.k!=='move')sound(540);return ok}
  if(mode==='guest'&&ref){if(a.k!=='move')sendAt=clock+.3;
   return ref.child('act/'+OL.me).set(JSON.stringify({...a,n:++seq})).catch(e=>toast(luErr(e)))}
 }
 function taskOpen(id){
  if(task||panel||!secret||!E.stations[id]||!secret.tasks.includes(id)||secret.done.includes(id)||!E.near(me(),E.stations[id]))return;
  send({k:'move',x:0,y:0});task={id,answer:[],pattern:E.challenge(snap,{id:my},id),start:clock,dials:[0,0,0,0],err:false};overlayKey='';renderTask();
 }
 function finishTask(answer){const id=task.id;send({k:'task',v:id,answer:answer.slice()});task=null;taskFlash=clock+1.8;hide();sound(820)}
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
  }else{
   title='Signalroute';copy='Folge dem nummerierten Pfad von START bis zum vierten Signal. Wähle die Richtung jedes Schritts.';
   const points=E.routePath(task.pattern);
   body='<div class="nr-route">'+Array.from({length:81},(_,i)=>{const x=i%9,y=Math.floor(i/9),vis=points.map((p,j)=>p[0]===x&&p[1]===y?j:-1).filter(j=>j>=0);return '<span class="'+(vis.length?'nr-path':'')+'">'+(vis.length?vis.map(j=>j===0?'S':j).join('·'):'')+'</span>'}).join('')+'</div><div class="nr-taskgrid">'+arrows.map((n,i)=>button('answer:'+i,n)).join('')+'</div><p>'+task.answer.length+' / 4 Schritte</p>';
  }
  overlay('task'+task.id+':'+task.answer.length+':'+task.dials.join('')+':'+preview+':'+task.err,header('WARTUNG / '+st.name,title,copy)+body+(task.err?'<p class="nr-error">Noch nicht korrekt – versuche es erneut.</p>':'')+button('cancel','Schließen'),bind)
 }
 function action(a){
  if(a==='local')return local();
  if(a==='localopts'){opts.bots=opts.bots>=10?4:opts.bots+1;setup();return}
  if(a==='create')return openOnline('');
  if(a==='join'){const v=$('#nr-code')?.value||'';if(!v.trim()){toast('Bitte einen Raumcode eingeben.');return}return openOnline(v)}
  if(a==='leave')return toMenu();
  if(a==='copy'){navigator.clipboard?.writeText(code).then(()=>toast('Raumcode kopiert.')).catch(()=>toast(code));return}
  if(a==='bots'){opts.bots=opts.bots>=10?4:opts.bots+1;lobby();return}
  if(a==='tasks'){opts.tasks=opts.tasks===3?4:3;lobby();return}
  if(a==='two'){opts.two=!opts.two;lobby();return}
  if(a==='discussion'){opts.discussion=opts.discussion===30?45:30;lobby();return}
  if(a==='start')return startOnline();
  if(a.startsWith('invite:')&&host&&mode==='lobby'){
   const u=a.slice(7);if(!OL.F?.[u]||!olCanContact(u))return;
   olWriteInvite(u,{mid:'room:'+code,code,name:OL.name,game:'nereid',t:0,ts:olTS()}).then(()=>{LUN.inv[u]=olNow();lobby();toast('Einladung gesendet.')}).catch(e=>toast(luErr(e)));return
  }
  if(a==='cancel'){task=null;panel='';hide();return}
  if(task&&a==='replay'){task.start=clock;task.answer=[];task.err=false;overlayKey='';renderTask();return}
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
  if(busy||!ref||!room)return;busy=true;
  try{
   const changes={['rooms/'+code+'/status']:'lobby',['rooms/'+code+'/snap']:null,['rooms/'+code+'/act']:null,['rooms/'+code+'/chat']:null,['hands/'+code]:null};
   Object.entries(room.seats||{}).forEach(([i,q])=>{if(i!=='0'&&q.k!=='p')changes['rooms/'+code+'/seats/'+i]={k:'open'}});
   await OL.db.ref().update(changes);state=snap=secret=null;mode='lobby';overlayKey='';lobby();
  }catch(e){toast(luErr(e))}finally{busy=false;if(mode==='lobby')lobby()}
 }
 function meetingUI(){
  const s=snap,p=me(),voted=s.meetingVotes.includes(my);
  const sig=JSON.stringify([s.ph,s.cause,s.meetingVotes,s.notes,Math.ceil(s.meetingEnd-s.t),s.players.map(p=>[p.id,p.alive]),s.result,secret?.role]);
  if(s.ph==='meeting'){
   const list=s.players.map(q=>'<div class="nr-vote"><i style="background:'+C[q.id]+'"></i><span>'+esc(q.name)+(q.alive?'':' · offline')+'</span>'+(s.meetingVotes.includes(q.id)?'<small>ABGESTIMMT</small>':'')+button('vote:'+q.id,'Wählen',!p?.alive||voted||!q.alive)+'</div>').join('');
   overlay(sig,header('BESPRECHUNG / '+Math.max(0,Math.ceil(s.meetingEnd-s.t))+' s','Wer sendet das Störsignal?',s.cause)+'<div class="nr-votes">'+list+'</div><div class="nr-row">'+button('vote:-1','Überspringen',voted||!p?.alive)+'</div><div class="nr-notes">'+s.notes.map(([i,j])=>'<div><b style="color:'+C[i]+'">'+esc(s.players.find(q=>q.id===i)?.name)+':</b> '+esc(E.phrases[j])+'</div>').join('')+'</div>'+(p?.alive?'<div class="nr-row">'+E.phrases.map((x,i)=>button('say:'+i,x)).join('')+'</div>':'<p>Du beobachtest die Abstimmung.</p>'),bind)
  }else if(s.ph==='result')overlay(sig,header('ABSTIMMUNG / AUSWERTUNG',s.cause,'Der Einsatz wird in wenigen Sekunden fortgesetzt.'),bind)
  else if(s.ph==='end')overlay(sig,header('EINSATZ BEENDET',s.result==='tech'?'Station stabilisiert':'Störsignal erfolgreich',s.result===secret?.role?'Dein Team gewinnt.':'Die Rollen werden aufgedeckt.')+
   '<div class="nr-roster">'+s.players.map(q=>'<div><i style="background:'+C[q.id]+'"></i>'+esc(q.name)+' · '+(q.role==='glitch'?'Störeinheit':'Techniker')+'</div>').join('')+'</div><div class="nr-row">'+(mode==='local'?button('retry','Neuer Einsatz'):host?button('rematch','Neue Runde in der Lobby'):'')+button('leave','Zurück zum Menü')+'</div>',bind)
 }
 function update(dt){
  clock+=dt;
  if(mode==='setup')return;
  if(mode==='lobby'){if(room&&Math.floor(clock*2)!==Math.floor((clock-dt)*2))lobby();return}
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
  if(snap.ph!=='run')meetingUI();
  if(task&&(!me()||!E.near(me(),E.stations[task.id]))){task=null;hide()}
  if(task&&E.stations[task.id].kind==='pulse'&&clock-task.start>=2.6&&clock-task.start-dt<2.6)renderTask();
 }
 function roomDecor(name,x,y,w,h,col){
  x*=E.T;y*=E.T;w*=E.T;h*=E.T;
  const grad=c.createLinearGradient(x,y,x+w,y+h);grad.addColorStop(0,col);grad.addColorStop(1,'#142a37');box(x+3,y+3,w-6,h-6,12,grad);box(x+11,y+11,w-22,h-22,10,'#0d1d284d');
  c.strokeStyle='#6c9aa35e';c.lineWidth=2;c.beginPath();c.roundRect(x+5,y+5,w-10,h-10,11);c.stroke();
  for(let i=0;i<5;i++)line(x+15+i*12,y+6,x+21+i*12,y+12,'#87aeb16b',2);
  for(let j=0;j<h-20;j+=40)line(x+10,y+10+j,x+w-10,y+10+j,'#b7f4ff0b');
  for(let i=0;i<w-20;i+=40)line(x+10+i,y+10,x+10+i,y+h-10,'#b7f4ff0b');
  text(name,x+w/2,y+20,12,'#a3c5d1','center',800);
  if(name==='ATRIUM'){const q=E.meeting;circle(q.x,q.y,61,'#12232f');circle(q.x,q.y,53,'#45737c');circle(q.x,q.y,43,'#112d3c');circle(q.x,q.y,31,'#38616e');c.save();c.translate(q.x,q.y);c.rotate(clock*.35);for(let i=0;i<8;i++){c.rotate(Math.PI/4);box(-3,-49,6,14,2,'#a1cfc9');line(0,-28,0,-20,'#7dd4d9',3)}c.restore();circle(q.x,q.y,13+2*Math.sin(clock*2),'#93e7da');text('N-17',q.x,q.y,9,'#12394a','center',900);return}
  for(let i=0;i<3;i++){
   const px=x+30+i*(w-60)/2,py=y+h-26;
   box(px-19,py-18,38,31,5,'#111f2a');box(px-15,py-14,30,15,3,col);line(px-9,py-7,px+9,py-7,'#95f4e6',2);
  }
  // Recessed windows, instrument banks and painted floor lanes are original vector artwork.
  for(let i=0;i<4;i++){const px=x+22+i*22;box(px,y+32,16,9,3,'#182f40');box(px+2,y+34,12,3,1,'#62adbf')}
  if(name==='BIO-LABOR'){for(let i=0;i<3;i++){const px=x+w-48-i*38,py=y+75;box(px-15,py-28,30,56,8,'#1a353d');box(px-11,py-22,22,43,7,'#316a5c');circle(px,py,8,'#90d0a6');for(let k=0;k<3;k++)circle(px-6+k*6,py+15-((clock*15+k*13+i*7)%38),2,'#d1f6cfa0')}}
  if(name==='PUMPWERK'){for(let i=0;i<2;i++){const px=x+w-58-i*70,py=y+80;circle(px,py,29,'#122b39');circle(px,py,22,'#527b8c');c.save();c.translate(px,py);c.rotate(clock*(i?-.8:1));for(let k=0;k<5;k++){c.rotate(Math.PI*2/5);box(-4,-20,8,17,3,'#9bb5b6')}c.restore();circle(px,py,7,'#1d3544');line(px,py+29,px,py+49,'#638b95',7)}}
  if(name==='LAGER'){for(let i=0;i<3;i++){const px=x+w-42-i*37,py=y+66;box(px-15,py-17,30,34,4,'#2a3540');box(px-12,py-14,24,28,3,'#7c7e79');line(px-10,py-12,px+10,py+12,'#4d565d',3);line(px+10,py-12,px-10,py+12,'#4d565d',3)}}
  if(name==='FUNKZENTRALE'){const px=x+w-76,py=y+74;box(px-48,py-25,96,50,8,'#0b2736');for(let i=0;i<4;i++)line(px-40,py-15+i*10,px+40,py-15+i*10,'#487080',1);c.beginPath();for(let i=0;i<72;i++){const xx=px-35+i,yy=py+Math.sin(i*.19+clock*4)*10+Math.sin(i*.5)*4;i?c.lineTo(xx,yy):c.moveTo(xx,yy)}c.strokeStyle='#91e7d2';c.lineWidth=2;c.stroke()}
  if(name==='WERKSTATT'){const px=x+w-65,py=y+70;box(px-48,py-24,96,48,6,'#172b36');box(px-42,py-19,84,37,5,'#637171');for(let i=0;i<4;i++){box(px-33+i*20,py-8,12,15,3,'#263b47');line(px-27+i*20,py-10,px-27+i*20,py+11,'#b1bab4',2)}}
  if(name==='ENERGIEKERN'){circle(x+w-50,y+70,30,'#141e3c');circle(x+w-50,y+70,21,'#645eaa');circle(x+w-50,y+70,11,'#c6c0ff')}
  if(name==='TAUCHDOCK'){box(x+26,y+45,w-52,31,13,'#183e4b');for(let i=0;i<6;i++)line(x+40+i*30,y+49,x+52+i*30,y+70,'#64c9ce',2)}
 }
 let art=null;
 function mapArt(){
  if(art)return art;art=document.createElement('canvas');art.width=E.MW;art.height=E.MH;
  const old=c; // Use the game's canvas for reusable drawing helpers, then capture it with a dedicated renderer below.
  const d=art.getContext('2d');
  d.fillStyle='#061923';d.fillRect(0,0,E.MW,E.MH);
  for(let y=0;y<E.R;y++)for(let x=0;x<E.C;x++)if(E.floor[y][x]){
   const px=x*E.T,py=y*E.T;
   const grad=d.createLinearGradient(px,py,px+E.T,py+E.T);grad.addColorStop(0,(x+y)%2?'#263e4c':'#293f4e');grad.addColorStop(1,'#1f3543');d.fillStyle=grad;d.fillRect(px,py,E.T,E.T);d.strokeStyle='#759aaa22';d.strokeRect(px+.5,py+.5,E.T-1,E.T-1);d.fillStyle='#7ba0ac40';for(const [a,b] of [[4,4],[36,4],[4,36],[36,36]])d.fillRect(px+a,py+b,1.4,1.4);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(!E.floor[y+dy]?.[x+dx]){
    d.fillStyle='#101e29';d.fillRect(px+(dx===1?E.T-5:0),py+(dy===1?E.T-5:0),dx?5:E.T,dy?5:E.T);
    d.fillStyle='#4f7583';d.fillRect(px+(dx===1?E.T-7:5),py+(dy===1?E.T-7:5),dx?2:E.T-10,dy?2:E.T-10);
   }
  }
  return art;
 }
 function robot(p,x,y,time,ghost=false){
  const col=C[p.id],moving=Math.abs(p.dx)+Math.abs(p.dy)>.1,bob=moving?Math.sin(time*13+p.id)*2:Math.sin(time*3+p.id)*1.3,side=p.dx<-.1?-1:1;
  c.save();c.translate(x,y+bob);c.globalAlpha=ghost?.38:1;
  c.fillStyle='#04131eaa';c.beginPath();c.ellipse(0,13,17,7,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#8eb0be';c.lineWidth=2;
  for(const s of [-1,1]){const f=moving?Math.sin(time*13+s*Math.PI/2)*5:0;box(s*8-4,7+f,8,12,3,'#243b48');box(s*8-5,13+f,10,5,2,col)}
  box(-20,-7,8,20,4,'#162b39');box(12,-7,8,20,4,'#162b39');
  box(-14,-18,28,30,8,'#132c3c');const shell=c.createLinearGradient(-12,-16,12,8);shell.addColorStop(0,'#f2ffff');shell.addColorStop(.26,col);shell.addColorStop(1,'#294858');box(-12,-16,24,23,7,shell);box(-9,-13,18,14,5,'#102d3e');line(-7,-11,7,-11,'#80c1c9',1);
  box(-6+side*2,-10,10,4,2,'#d7ffff');box(-7,5,14,4,2,'#122e3e');circle(0,7,1.8,'#c8fffa');
  line(-4,-18,-9,-25,'#879fa9',2);circle(-9,-25,2.4,col);
  if(p.id===my){c.strokeStyle='#e5ffff';c.lineWidth=1.7;c.beginPath();c.ellipse(0,16,21,9,0,0,Math.PI*2);c.stroke()}
  c.globalAlpha=1;text(p.name.slice(0,18),0,-32,11,'#edfaff','center',750);c.restore()
 }
 function draw(){
  const w=width(),h=height();buttons=[];c.save();c.fillStyle='#071923';c.fillRect(0,0,w,h);
  if(!snap){
   for(let i=0;i<38;i++){const x=(i*97+clock*5)%w,y=(i*61-clock*9%h+h)%h;circle(x,y,1+i%3,'#73d8df36')}
   text('NEREIDENPROTOKOLL',w/2,h*.22,Math.min(30,w/21),'#9af6ed','center',900);c.restore();return
  }
  const p=me();if(!p){c.restore();return}
  const scale=cl(Math.min(w/690,h/420),.64,1.2);
  for(const q of snap.players){const a=smooth[q.id]||{x:q.x,y:q.y};const f=host?1:.28;if(Math.hypot(a.x-q.x,a.y-q.y)>160){a.x=q.x;a.y=q.y}else{a.x+=(q.x-a.x)*f;a.y+=(q.y-a.y)*f}smooth[q.id]=a}
  const pos=smooth[my]||p,targetX=pos.x-w/(2*scale),targetY=pos.y-h/(2*scale);
  if(!camReady){camera={x:targetX,y:targetY};camReady=true}else{camera.x+=(targetX-camera.x)*.17;camera.y+=(targetY-camera.y)*.17}
  c.save();c.scale(scale,scale);c.translate(-camera.x,-camera.y);
  c.drawImage(mapArt(),0,0);
  for(const q of E.rooms)roomDecor(...q);
  // Animated ocean, viewport lights and station activity.
  for(let i=0;i<28;i++){const x=(i*137+clock*8)%E.MW,y=(i*83-clock*13%E.MH+E.MH)%E.MH;if(!E.floor[Math.floor(y/E.T)]?.[Math.floor(x/E.T)])circle(x,y,2+i%3,'#7dd3fc26')}
  for(const [i,q] of E.stations.entries()){
   const active=secret?.tasks?.includes(i)&&!secret?.done?.includes(i);
   box(q.x-20,q.y-15,40,30,6,'#0e2738');box(q.x-16,q.y-11,32,20,4,active?'#3b9f9f':'#365367');
   line(q.x-9,q.y-4,q.x+9,q.y-4,'#cafafa',2);circle(q.x+12,q.y+5,2,active?'#d8f779':'#7bb4c0');
   if(active){c.strokeStyle='rgba(173,244,179,'+(.5+.3*Math.sin(clock*4))+')';c.lineWidth=2;c.beginPath();c.arc(q.x,q.y,25+Math.sin(clock*3)*3,0,Math.PI*2);c.stroke()}
  }
  for(const q of E.ports){box(q.x-17,q.y-13,34,26,5,'#183641');for(let i=-10;i<=10;i+=5)line(q.x-12,q.y+i,q.x+12,q.y+i,'#66818c',2)}
  const range=snap.alert?.kind==='signal'?130:320,visible=q=>!p.alive||E.sight(p,q,range);
  for(const f of fx){const age=clock-f.t;c.save();c.globalAlpha=Math.max(0,1-age/1.4);c.strokeStyle='#a9f6e9';c.lineWidth=2;c.beginPath();c.arc(f.x,f.y,12+age*39,0,Math.PI*2);c.stroke();for(let i=0;i<9;i++){const a=i*Math.PI*2/9;circle(f.x+Math.cos(a)*age*36,f.y+Math.sin(a)*age*36,2,'#b7fff0')}c.restore()}
  for(const m of snap.markers)if(visible(m)){box(m.x-15,m.y-9,30,18,6,'#38434b');box(m.x-10,m.y-5,20,10,4,C[m.id]);circle(m.x+8,m.y,3,'#ffb66e');text('AUSFALL',m.x,m.y-20,10,'#ffd2a0','center',800)}
  for(const q of snap.players.slice().sort((a,b)=>a.y-b.y))if(q.id===my||q.alive&&visible(q)||!p.alive&&!q.alive){const a=smooth[q.id]||q;robot(q,a.x,a.y,clock,!q.alive)}
  c.restore();
  if(p.alive){const px=(pos.x-camera.x)*scale,py=(pos.y-camera.y)*scale,rad=range*scale;
   if(!visionCache||Math.hypot(visionCache.x-p.x,visionCache.y-p.y)>3||visionCache.range!==range)visionCache={x:p.x,y:p.y,range,points:E.vision(p,range)};
   c.beginPath();c.rect(0,0,w,h);visionCache.points.forEach(([x,y],i)=>{const sx=(x-camera.x)*scale,sy=(y-camera.y)*scale;i?c.lineTo(sx,sy):c.moveTo(sx,sy)});c.closePath();c.fillStyle='#040f1cdb';c.fill('evenodd');
   const g=c.createRadialGradient(px,py,rad*.48,px,py,rad*1.25);g.addColorStop(0,'#06131c00');g.addColorStop(1,'#04111de8');c.fillStyle=g;c.fillRect(0,0,w,h)}
  // Fixed HUD, designed independently from the scene.
  box(10,10,w-20,49,11,'#102633ec');
  const role=secret?.rn===snap.rn?(secret.role==='glitch'?'STÖREINHEIT':'TECHNIKER'):'ROLLE WIRD GELADEN';
  text(role,22,23,12,secret?.role==='glitch'?'#ffc69b':'#a3f1de','left',850);
  text(p.alive?'N-17 / '+snap.players.filter(q=>q.alive).length+' aktiv':'BEOBACHTERMODUS',22,43,11,'#a1b7c6');
  const barW=Math.min(220,w*.29),bx=w-barW-24;box(bx,22,barW,10,5,'#243a47');box(bx,22,barW*cl(snap.done/Math.max(1,snap.total),0,1),10,5,'#79ddc4');text('STABILISIERUNG '+snap.done+'/'+snap.total,bx+barW/2,44,10,'#bce4dd','center',750);
  if(snap.alert){box(w*.22,65,w*.56,35,7,'#7b3f31ed');text((snap.alert.kind==='pressure'?'SYSTEMDRUCK':'SIGNALSTÖRUNG')+' · '+E.stations[snap.alert.station].name+' · '+Math.max(0,Math.ceil(snap.alert.until-snap.t))+' s',w/2,82,12,'#ffe1be','center',800)}
  if(secret?.tasks){const tw=Math.min(165,w*.34),th=26+secret.tasks.length*18;box(10,105,tw,th,9,'#0c2531e6');text('DEINE AUFTRÄGE',20,117,10,'#98d9df','left',800);secret.tasks.forEach((i,j)=>text((secret.done.includes(i)?'✓  ':'○  ')+E.stations[i].name,20,136+j*18,10,secret.done.includes(i)?'#83bba3':'#e0edf1'))}
  if(roleUntil>clock&&secret?.rn===snap.rn){box(w*.20,h*.39,w*.60,65,13,'#102a38f5');text(secret.role==='glitch'?'STÖREINHEIT':'TECHNIKER',w/2,h*.39+20,20,secret.role==='glitch'?'#ffc69b':'#a3f1de','center',900);text(secret.role==='glitch'?'Täusche die anderen Einheiten.':'Erfülle Aufträge und beobachte die Station.',w/2,h*.39+45,12,'#e3f5f4','center',600)}
  if(taskFlash>clock){box(w*.33,h*.26,w*.34,31,9,'#205347ed');text('Auftrag übermittelt',w/2,h*.26+15,12,'#d4ffec','center',800)}
  const bw=Math.min(112,w*.22),y=h-47;
  const available=secret?.tasks?.find(i=>!secret.done.includes(i)&&E.near(p,E.stations[i]));
  b('Aufgabe',w-bw-10,y,bw,37,()=>taskOpen(available),available!==undefined);
  const report=p.alive&&snap.markers.some(q=>E.near(p,q,76));
  b('Melden',w-bw*2-17,y,bw,37,()=>send({k:'report'}),report);
  b('Karte',w-bw-10,65,bw,31,()=>{panel=panel==='map'?'':'map';send({k:'move',x:0,y:0})});
  const canMeet=p.alive&&secret?.meeting>0&&!snap.alert&&snap.t>=snap.meetingCool&&E.near(p,E.meeting,80);
  if(canMeet)b('Besprechung',w-bw*2-17,y-44,bw,37,()=>send({k:'meeting'}),true,'#725334');
  if(snap.alert&&p.alive&&E.near(p,E.stations[snap.alert.station],76))b('Reparieren',w-bw-10,y-44,bw,37,()=>send({k:'repair'}),true,'#23796e');
  if(secret?.role==='glitch'&&p.alive){
   const q=snap.players.find(q=>q.alive&&q.id!==my&&!secret.allies?.includes(q.id)&&E.near(p,q,60));
   b(snap.t<secret.cool?'Stören '+Math.ceil(secret.cool-snap.t)+'s':'Stören',w-bw-10,y-88,bw,37,()=>send({k:'disable',v:q.id}),!!q&&snap.t>=secret.cool,'#864740');
   b('Systemalarm',w-bw*2-17,y-88,bw,37,()=>{panel=panel==='alarm'?'':'alarm';send({k:'move',x:0,y:0})},!snap.alert&&snap.t>=secret.sabCool,'#744551');
   if(E.ports.some(q=>E.near(p,q,55))&&snap.t>=secret.portCool)b('Wartungstunnel',w-bw*2-17,y-132,bw,36,()=>{panel='port';send({k:'move',x:0,y:0})},true);
  }
  const jx=touch?.sx||62,jy=touch?.sy||h-64;circle(jx,jy,37,'#193c4d90');circle(jx+(touch?cl(touch.x-jx,-29,29):0),jy+(touch?cl(touch.y-jy,-29,29):0),14,'#7ac7cf86');
  if(panel){
   buttons=[];box(w*.1,h*.13,w*.8,h*.72,16,'#0a1e2af7');
   if(panel==='map'){
    text('STATION N-17 / ÜBERSICHT',w/2,h*.19,15,'#b8f5ee','center',800);
    const z=Math.min(w*.65/E.MW,h*.49/E.MH),ox=(w-E.MW*z)/2,oy=h*.23;
    c.save();c.translate(ox,oy);c.scale(z,z);c.drawImage(mapArt(),0,0);
    for(const q of E.rooms){box(q[1]*E.T+4,q[2]*E.T+4,q[3]*E.T-8,q[4]*E.T-8,7,q[5]);text(q[0],(q[1]+q[3]/2)*E.T,(q[2]+q[4]/2)*E.T,14,'#e6f1f4','center')}
    for(const i of secret?.tasks||[])if(!secret.done.includes(i))circle(E.stations[i].x,E.stations[i].y,15,'#d4f98a');
    circle(p.x,p.y,16,'#fff');c.restore();
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
  if(k==='KeyF'){if(secret?.role==='glitch'){const q=snap.players.find(q=>q.alive&&q.id!==my&&!secret.allies.includes(q.id)&&E.near(p,q,60));if(q)send({k:'disable',v:q.id})}else send({k:'meeting'})}
 }
 const api={showSetup:setup,canJoin:()=>mode==='setup'&&!busy,joinCode:v=>openOnline(v),draw,update,click,key,dragMove(x,y,_p,id){if(touch?.id===id){touch.x=x;touch.y=y}},dragEnd(_x,_y,_p,id){if(touch?.id===id)touch=null},dragCancel(_p,id){if(touch?.id===id)touch=null},leave(){alive=false;roleRef?.off();if(ref){LUN.left=1;luCleanup()}window.gameChat?.stop();task=null;touch=null;state=null;snap=null;secret=null}};
 return api;
}
