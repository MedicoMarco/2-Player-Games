/* Pulse Arena — stylised robot energy-tag sport. No realistic weapons. */
(() => {
'use strict';
const ID='pulsearena', N=4, STEP=1/60, R=.48, SIZE=16;
const maps=[
 {name:'Neon Dock',color:'#12b8cb',blocks:[[-7,-5,3,6,2],[7,5,3,6,2],[-6,8,6,2,2],[6,-8,6,2,2],[0,0,4,4,1.1]]},
 {name:'Solar Yard',color:'#ffb454',blocks:[[-8,0,2,10,2],[8,0,2,10,2],[0,-8,7,2,1.5],[0,8,7,2,1.5],[-3,0,2,2,1],[3,0,2,2,1]]},
 {name:'Crystal Circuit',color:'#bda1ff',blocks:[[-7,-7,4,4,2],[7,7,4,4,2],[-7,7,4,4,2],[7,-7,4,4,2],[0,0,2,8,1.4]]}
];
const kits=[{name:'Pulse',desc:'Ausgewogen',cool:.55,speed:11,color:'#58e5ff'},{name:'Spark',desc:'Schnelle, kleine Lichtkugeln',cool:.34,speed:9,color:'#ffe06b'},{name:'Nova',desc:'Große, langsame Lichtkugeln',cool:.95,speed:7,color:'#d3a0ff'}];
const colors=['#41d9ff','#ffad58','#a18aff','#74e8a5'];
const spawn=[[-12,0],[12,0],[0,-12],[0,12]];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), finite=(v,d=0)=>Number.isFinite(v)?v:d;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lerp=(a,b,t)=>a+(b-a)*t, angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const clean=i=>({x:clamp(finite(i?.x),-1,1),z:clamp(finite(i?.z),-1,1),a:clamp(finite(i?.a),-Math.PI,Math.PI),jump:!!i?.jump,fire:!!i?.fire,kit:clamp(Math.floor(finite(i?.kit)),0,2)});
function player(i,name,bot=false){return {i,name,bot,x:spawn[i][0],z:spawn[i][1],y:0,vx:0,vz:0,vy:0,a:i===0?Math.PI/2:i===1?-Math.PI/2:i===2?0:Math.PI,kit:0,score:0,cd:0,glow:0};}
function collide(p,blocks,axis){p[axis]=clamp(p[axis],-SIZE+R,SIZE-R);for(const [x,z,w,d,h] of blocks){if(p.y>=h-.04)continue;const minX=x-w/2-R,maxX=x+w/2+R,minZ=z-d/2-R,maxZ=z+d/2+R;if(p.x>minX&&p.x<maxX&&p.z>minZ&&p.z<maxZ){if(axis==='x'){p.x=p.vx>0?minX:maxX;p.vx=0;}else{p.z=p.vz>0?minZ:maxZ;p.vz=0;}}}}
function simulate(s,inputs,dt){
 const blocks=maps[s.map].blocks;s.time=Math.max(0,s.time-dt);
 for(const p of s.p){let i=clean(inputs[p.i]);if(p.bot){const target=s.p.filter(q=>q.i!==p.i).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];if(target){const a=Math.atan2(target.x-p.x,target.z-p.z),t=s.time+p.i*2;i=clean({a,x:Math.cos(t*1.7)*.45,z:.65,fire:true,jump:Math.sin(t*2)>.98,kit:p.i%3});}}
 const l=Math.max(1,Math.hypot(i.x,i.z)),dx=(Math.cos(i.a)*i.x+Math.sin(i.a)*i.z)/l,dz=(-Math.sin(i.a)*i.x+Math.cos(i.a)*i.z)/l;
 p.a=i.a;p.kit=i.kit;const accel=1-Math.exp(-dt*(p.y>.02?6:15));p.vx=lerp(p.vx,dx*5.8,accel);p.vz=lerp(p.vz,dz*5.8,accel);
 let ground=0;for(const [x,z,w,d,h] of blocks)if(Math.abs(p.x-x)<w/2+R*.4&&Math.abs(p.z-z)<d/2+R*.4&&p.y>=h-.08)ground=Math.max(ground,h);
 if(i.jump&&p.y<=ground+.03&&Math.abs(p.vy)<.05)p.vy=7.2;
 p.x+=p.vx*dt;collide(p,blocks,'x');p.z+=p.vz*dt;collide(p,blocks,'z');
 const before=p.y;p.vy-=18*dt;p.y+=p.vy*dt;ground=0;
 for(const [x,z,w,d,h] of blocks)if(Math.abs(p.x-x)<w/2+R*.4&&Math.abs(p.z-z)<d/2+R*.4&&before>=h-.04)ground=Math.max(ground,h);
 if(p.y<=ground){p.y=ground;p.vy=0;}
 p.cd=Math.max(0,p.cd-dt);p.glow=Math.max(0,p.glow-dt);
 if(i.fire&&p.cd===0&&s.orbs.length<48){const k=kits[p.kit];p.cd=k.cool;s.orbs.push({id:++s.serial,o:p.i,k:p.kit,x:p.x+Math.sin(p.a)*.8,z:p.z+Math.cos(p.a)*.8,y:p.y+.85,a:p.a,t:2.4});}
 }
 for(const o of s.orbs){const k=kits[o.k];o.t-=dt;o.x+=Math.sin(o.a)*k.speed*dt;o.z+=Math.cos(o.a)*k.speed*dt;if(Math.abs(o.x)>SIZE||Math.abs(o.z)>SIZE||blocks.some(([x,z,w,d,h])=>Math.abs(o.x-x)<w/2&&Math.abs(o.z-z)<d/2&&o.y<h)){o.t=0;continue;}
 const q=s.p.find(p=>p.i!==o.o&&p.glow<=0&&Math.hypot(p.x-o.x,p.z-o.z)<(o.k===2?.9:.65)&&Math.abs(p.y+.8-o.y)<.85);if(q){q.glow=.65;const a=s.p.find(p=>p.i===o.o);if(a)a.score++;o.t=0;}}
 s.orbs=s.orbs.filter(o=>o.t>0);if(s.time===0||s.p.some(p=>p.score>=s.goal))s.ph='end';
}
function makeState(map,players,goal=15,time=120){return {map,goal,time,ph:'play',seq:0,serial:0,p:players,orbs:[]};}
function renderer(canvas){
 const ctx=canvas.getContext('2d');let width=0,height=0,cam={x:0,y:4,z:-7,a:0},faces=[];
 function fit(){const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;}width=w;height=h;}
 function project(x,y,z){const dx=x-cam.x,dz=z-cam.z,dy=y-cam.y,co=Math.cos(cam.a),si=Math.sin(cam.a);const X=co*dx-si*dz,Z=si*dx+co*dz,p=.25,zz=Z*Math.cos(p)-dy*Math.sin(p),Y=dy*Math.cos(p)+Z*Math.sin(p),f=Math.min(width,height)*.91;return [width*.5+X*f/Math.max(.15,zz),height*.48-Y*f/Math.max(.15,zz),zz];}
 const shade=(hex,f)=>{const n=parseInt(hex.slice(1),16);return 'rgb('+[n>>16,(n>>8)&255,n&255].map(v=>Math.round(v*f)).join(',')+')';};
 function box(x,y,z,w,h,d,c,a=0){const co=Math.cos(a),si=Math.sin(a),v=[];for(const Y of [y,y+h])for(const [X,Z] of [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]])v.push(project(x+X*co+Z*si,Y,z-X*si+Z*co));
 [[0,1,5,4,.72],[1,2,6,5,.88],[2,3,7,6,.65],[3,0,4,7,.82],[4,5,6,7,1]].forEach(([...f])=>{const l=f.pop(),p=f.map(i=>v[i]);if(p.some(q=>q[2]<.18))return;faces.push({p,z:p.reduce((t,q)=>t+q[2],0)/4,c:shade(c,l)});});}
 function robot(p,t){const walk=Math.hypot(p.vx||0,p.vz||0),step=Math.sin(t*12+p.i)*Math.min(.21,walk*.05),co=Math.cos(p.a),si=Math.sin(p.a),c=colors[p.i];const part=(x,y,z,w,h,d,col)=>box(p.x+x*co+z*si,p.y+y,p.z-x*si+z*co,w,h,d,col,p.a);
 part(-.22,.04,step,.28,.57,.32,'#263c59');part(.22,.04,-step,.28,.57,.32,'#263c59');part(0,.57,0,.68,.58,.43,p.glow>0?'#ffffff':c);part(0,1.18,0,.48,.43,.43,'#c6d7e7');part(0,1.27,.24,.38,.13,.06,c);part(-.45,.64,-step,.19,.47,.23,'#8098b0');part(.45,.64,step,.19,.47,.23,'#8098b0');part(.45,.83,.29,.22,.22,.4,kits[p.kit].color);}
 function render(s,me,aim,lobby=false){fit();if(!width||!height)return;const p=s.p.find(q=>q.i===me)||s.p[0];if(!p)return;const t=performance.now()/1000;const a=lobby?Math.PI:aim;const target={a,x:lobby?0:p.x-Math.sin(a)*6.3,z:lobby?7:p.z-Math.cos(a)*6.3,y:lobby?3.5:p.y+3.2};cam={a:angle(cam.a,target.a,.24),x:lerp(cam.x,target.x,.22),z:lerp(cam.z,target.z,.22),y:lerp(cam.y,target.y,.22)};
 const bg=ctx.createLinearGradient(0,0,0,height);bg.addColorStop(0,'#101b36');bg.addColorStop(.6,'#314766');bg.addColorStop(1,'#101824');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);faces=[];
 if(!lobby){const m=maps[s.map];for(let x=-16;x<16;x+=4)for(let z=-16;z<16;z+=4)box(x+2,-.18,z+2,3.97,.18,3.97,(x+z)%8===0?'#28394c':'#32475b');for(const [x,z,w,d,h] of m.blocks){box(x,0,z,w,h,d,'#536c83');box(x,h,z,w+.03,.08,d+.03,m.color);}for(const v of [-16.2,16.2]){box(v,0,0,.25,.7,32.4,m.color);box(0,0,v,32.4,.7,.25,m.color);}}
 else box(0,-.18,0,8,.18,3,'#34445d');
 for(const q of s.p){robot(q,t);}
 for(const o of s.orbs){const r=o.k===2?.42:.22;box(o.x,o.y-r,o.z,r*2,r*2,r*2,kits[o.k].color,t*4);}
 faces.sort((a,b)=>b.z-a.z);for(const f of faces){ctx.beginPath();f.p.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=f.c;ctx.fill();ctx.strokeStyle='#15253755';ctx.lineWidth=.7;ctx.stroke();}
 for(const q of s.p){const [x,y,z]=project(q.x,q.y+1.94,q.z);if(z<.3)continue;ctx.font='bold '+Math.max(11,Math.min(22,height*.024))+'px system-ui';ctx.textAlign='center';ctx.fillStyle=colors[q.i];ctx.fillText(q.name,x,y);}
 }
 return {render};
}
window.createPulseArena=()=>{
 let root,canvas,view,screen='setup',alive=true,roomRef=null,room=null,role='',seat=0,model=null,shown=null,online=false,map=0,kit=0,goal=15,duration=120,capacity=2,keys=new Set(),a=0,fire=false,jump=false,move={x:0,z:0},inputs={},sent=0,seq=0,lastSeq=0,acc=0,last=0,net=0,busy=false,raf=0,lastPacket={},pending=false,notice='',listeners=[];
 const seats=()=>Array.from({length:N},(_,i)=>room?.seats?.[i]||{k:'off'});
 const on=(el,event,fn,opt)=>{el.addEventListener(event,fn,opt);listeners.push(()=>el.removeEventListener(event,fn,opt));};
 const own=()=>clean({x:clamp((keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+move.x,-1,1),z:clamp((keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+move.z,-1,1),a,jump:jump||keys.has('Space'),fire:fire||keys.has('KeyF'),kit});
 const err=e=>{notice=typeof e==='string'?e:luErr(e);renderUI();};
 function mount(){if(root)return;root=document.createElement('section');root.id='pulse-arena';root.innerHTML='<style>#pulse-arena{position:fixed;inset:0;z-index:900;background:#0c1424;color:#eef6ff;font:14px system-ui;display:flex;flex-direction:column;touch-action:none;overflow:hidden}#pulse-arena *{box-sizing:border-box}#pulse-arena canvas{width:100%;height:100%;display:block;touch-action:none}#pulse-arena .pa-top{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#111b2ce0;gap:8px}#pulse-arena .pa-panel{position:absolute;left:50%;bottom:3%;transform:translateX(-50%);width:min(94%,620px);max-height:65%;overflow:auto;background:#111d31ed;border:1px solid #536b89;border-radius:18px;padding:15px;touch-action:pan-y;box-shadow:0 15px 50px #0009}#pulse-arena .pa-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:8px 0}#pulse-arena button,#pulse-arena select,#pulse-arena input{font:inherit;color:#eaf6ff;border:1px solid #546c8d;background:#233953;border-radius:9px;padding:9px 12px;max-width:100%}#pulse-arena button:disabled{opacity:.4}#pulse-arena .pa-primary{background:#14758c;font-weight:bold}#pulse-arena .pa-chip{padding:5px 10px;border-radius:9px;background:#26374e}#pulse-arena .pa-hud{position:absolute;top:65px;left:12px;right:12px;display:flex;justify-content:space-between;pointer-events:none}#pulse-arena .pa-touch{position:absolute;bottom:18px;left:16px;right:16px;display:flex;justify-content:space-between;align-items:end;pointer-events:none}#pulse-arena .pa-touch button,#pulse-arena .pa-stick{pointer-events:auto;touch-action:none}#pulse-arena .pa-stick{border-radius:50%;width:112px;height:112px;background:#263e58aa;border:2px solid #a7d3e77a;display:grid;place-items:center;font-size:32px}#pulse-arena .pa-touch button{min-height:54px;background:#263e58dd}#pulse-arena .pa-notice{color:#ffce88}#pulse-arena .pa-cross{position:absolute;left:50%;top:48%;color:#ecffffa0;font-size:22px;pointer-events:none}#pulse-arena .pa-panel h2{margin:4px 0 8px;font-size:20px}#pulse-arena .pa-panel p{margin:7px 0;color:#aabbd1}</style><canvas></canvas><div class="pa-top"><strong>PULSE ARENA · 3D</strong><button data-pa="exit">Menü</button></div><div class="pa-ui"></div>';document.body.append(root);canvas=root.querySelector('canvas');view=renderer(canvas);
 on(root,'click',click);on(root,'change',change);
 on(window,'keydown',e=>{if(screen!=='play'||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','Space','KeyF'].includes(e.code)){e.preventDefault();keys.add(e.code);}},true);
 on(window,'keyup',e=>keys.delete(e.code),true);
 on(window,'blur',()=>{keys.clear();fire=jump=false;move={x:0,z:0};});
 let drag=null;
 on(canvas,'pointerdown',e=>{if(screen!=='play')return;drag={id:e.pointerId,x:e.clientX};canvas.setPointerCapture(e.pointerId);if(e.pointerType==='mouse'){try{canvas.requestPointerLock?.();}catch{}}});
 on(canvas,'pointermove',e=>{if(screen!=='play')return;if(document.pointerLockElement===canvas)a+=e.movementX*.003;else if(drag?.id===e.pointerId){a+=(e.clientX-drag.x)*.009;drag.x=e.clientX;}a=Math.atan2(Math.sin(a),Math.cos(a));});
 on(canvas,'pointerup',()=>{drag=null;});on(canvas,'pointercancel',()=>{drag=null;});
 on(root,'pointerdown',e=>{const b=e.target.closest('[data-hold]');if(!b)return;e.preventDefault();b.setPointerCapture(e.pointerId);if(b.dataset.hold==='fire')fire=true;else if(b.dataset.hold==='jump')jump=true;else stick(e,b);});
 on(root,'pointermove',e=>{const b=e.target.closest('[data-hold=move]');if(b?.hasPointerCapture(e.pointerId))stick(e,b);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])on(root,event,e=>{const b=e.target.closest('[data-hold]');if(!b)return;if(b.dataset.hold==='fire')fire=false;else if(b.dataset.hold==='jump')jump=false;else move={x:0,z:0};});
 function stick(e,b){const r=b.getBoundingClientRect();move={x:clamp((e.clientX-r.left-r.width/2)/(r.width*.36),-1,1),z:clamp(-(e.clientY-r.top-r.height/2)/(r.height*.36),-1,1)};}
 raf=requestAnimationFrame(frame);
 }
 const select=(id,items,val)=>'<select data-set="'+id+'">'+items.map(([v,l])=>'<option value="'+v+'" '+(v===val?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select>';
 function renderUI(){if(!root)return;const ui=root.querySelector('.pa-ui');if(screen==='play'){ui.innerHTML='<div class="pa-hud"><div id="pa-score" class="pa-chip"></div><div id="pa-time" class="pa-chip"></div></div><span class="pa-cross">+</span><div class="pa-touch"><div class="pa-stick" data-hold="move">⊕</div><div class="pa-row"><button data-hold="jump">Sprung</button><button class="pa-primary" data-hold="fire">Pulse</button></div></div>';return;}
 let h='<div class="pa-panel">';
 if(screen==='setup')h+='<h2>Deine Arena</h2><p>Roboter-Energy-Tag · Third Person · Punkte sammeln</p><div class="pa-row">Map '+select('map',maps.map((m,i)=>[i,m.name]),map)+' Plätze '+select('capacity',[[2,'2'],[3,'3'],[4,'4']],capacity)+'</div><div class="pa-row">Ausrüstung '+select('kit',kits.map((k,i)=>[i,k.name+' · '+k.desc]),kit)+'</div><div class="pa-row">Offline: '+select('goal',[[10,'10 Punkte'],[15,'15 Punkte'],[25,'25 Punkte']],goal)+' '+select('duration',[[60,'1 min'],[120,'2 min'],[180,'3 min']],duration)+'</div><div class="pa-row"><button class="pa-primary" data-pa="solo">Training mit Bots</button><button data-pa="create">Online-Raum erstellen</button></div><div class="pa-row"><input id="pa-code" maxlength="20" placeholder="Raumcode"><button data-pa="join">Beitreten</button></div><p>WASD · Maus oder Pfeile drehen · F / Pulse · Leertaste springen. Touch: links bewegen, rechts ziehen und Pulse halten.</p>';
 else if(screen==='lobby'){const ss=seats(),host=role==='host',taken=ss.filter(p=>p.k==='p').map(p=>p.uid);h+='<h2>'+esc(maps[map].name)+' · Online-Lobby</h2><div class="pa-row"><input readonly id="luroomcode" value="'+esc(LUN.code)+'"><button data-pa="copy">Kopieren</button></div><div class="pa-row">Ausrüstung '+select('kit',kits.map((k,i)=>[i,k.name]),kit)+'</div>';
 h+=ss.map((p,i)=>'<div class="pa-row"><span class="pa-chip" style="color:'+colors[i]+'">'+esc(p.k==='p'?p.name:p.k==='open'?'Freier Platz':'Geschlossen')+(i===0?' · Host':'')+'</span>'+(host&&i&&p.k!=='p'?'<button data-pa="slot" data-i="'+i+'">'+(p.k==='open'?'Schließen':'Öffnen')+'</button>':'')+'</div>').join('');
 if(host){h+='<p>Freunde einladen</p><div class="pa-row">'+Object.keys(OL.F).filter(u=>!taken.includes(u)&&olAllowed(u)&&ss.some(p=>p.k==='open')).map(u=>'<button data-pa="invite" data-u="'+esc(u)+'">'+esc(olNameOf(u))+' +</button>').join('')+'</div><button class="pa-primary" data-pa="start" '+(ss.filter(p=>p.k==='p').length>=2&&!ss.some(p=>p.k==='open')&&!busy?'':'disabled')+'>Match starten</button><p>15 Punkte · 2 Minuten · freie Plätze zuerst schließen.</p>';}else h+='<p>Warte auf den Host.</p>';
 }else if(screen==='end'){const rank=[...shown.p].sort((a,b)=>b.score-a.score);h+='<h2>Match beendet</h2>'+rank.map(p=>'<div class="pa-row"><span style="color:'+colors[p.i]+'">'+esc(p.name)+'</span><strong>'+p.score+' Punkte</strong></div>').join('')+'<button data-pa="exit">Zurück zur Spieleliste</button>';}
 ui.innerHTML=h+(notice?'<p class="pa-notice">'+esc(notice)+'</p>':'')+'</div>';
 }
 function change(e){const k=e.target.dataset.set,v=+e.target.value;if(k==='map')map=v;if(k==='kit')kit=v;if(k==='capacity')capacity=v;if(k==='goal')goal=v;if(k==='duration')duration=v;}
 async function click(e){const b=e.target.closest('[data-pa]');if(!b)return;const action=b.dataset.pa;if(action==='exit'){toMenu();return;}if(busy)return;try{if(action==='solo'){online=false;seat=0;model=makeState(map,[player(0,OL.name||'Du'),...Array.from({length:capacity-1},(_,i)=>player(i+1,'Bot '+(i+1),true))],goal,duration);begin();}
 if(action==='create')await connect();if(action==='join')await connect(root.querySelector('#pa-code').value);
 if(action==='copy')luCopyCode();
 if(action==='slot'&&role==='host'&&room.status==='lobby'){const i=+b.dataset.i;if(i>0&&i<N&&seats()[i].k!=='p')await roomRef.child('seats/'+i).set({k:seats()[i].k==='open'?'off':'open'});}
 if(action==='invite'&&role==='host'&&olCanContact(b.dataset.u)&&OL.F[b.dataset.u]){await olWriteInvite(b.dataset.u,{mid:'room:'+LUN.code,code:LUN.code,name:OL.name,game:ID,t:0,ts:olTS()});LUN.inv[b.dataset.u]=olNow();notice='Einladung gesendet.';renderUI();}
 if(action==='start'&&role==='host'&&room.status==='lobby'){const ss=seats();if(ss.filter(p=>p.k==='p').length<2||ss.some(p=>p.k==='open'))return;busy=true;model=makeState(map,ss.flatMap((p,i)=>p.k==='p'?[player(i,p.name)]:[]));await roomRef.child('status').set('play');if(!alive)return;begin();}
 }catch(e){err(e);}finally{busy=false;}}
 function begin(){if(screen==='play')return;screen='play';notice='';shown=model?JSON.parse(JSON.stringify(model)):shown;const p=shown?.p.find(q=>q.i===seat);a=p?.a||0;keys.clear();acc=0;renderUI();}
 async function connect(code){if(busy||roomRef)return false;code=code===undefined?null:String(code).trim().toUpperCase();if(code!==null&&!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{20}$/.test(code)){err('Bitte vollständigen Raumcode eingeben.');return false;}busy=true;try{root.style.visibility='hidden';const ok=await luLogin();if(!alive)return false;root.style.visibility='visible';if(!ok){err('Bitte zuerst im Hauptmenü anmelden.');return false;}let ref,id,as,i;if(code){const r=await luReserve(code,ID,N);if(!r)return false;ref=r.ref;i=r.seat;id=code;as='guest';}else{id=luCode();ref=OL.db.ref('rooms/'+id);i=0;as='host';const ss=Object.fromEntries(Array.from({length:10},(_,j)=>[j,j===0?{k:'p',uid:OL.me,name:OL.name}:{k:j<capacity?'open':'off'}]));await luCreate(id,{host:OL.me,hn:OL.name,ts:olTS(),status:'lobby',game:ID,cfg:{d:map},seats:ss});}if(!alive){if(as==='host')ref.remove().catch(()=>{});else ref.child('seats/'+i).set({k:'gone',uid:OL.me,name:OL.name}).catch(()=>{});return false;}roomRef=ref;role=as;seat=i;online=true;screen='lobby';Object.assign(LUN,{code:id,ref,seat,role,left:0,g:ID,actN:0,inv:{},room:null});window.luFr=()=>{if(screen==='lobby')renderUI();};
 ref.on('value',ss=>{if(!alive||roomRef!==ref)return;room=ss.val();if(!room||seats()[seat].uid!==OL.me||seats()[seat].k!=='p'){toast('Arena-Raum wurde geschlossen.');toMenu();return;}if(seats().some(p=>p.uid&&OL.BL[p.uid])){toMenu();return;}luObserveRoom(room);map=clamp(room.cfg.d,0,2);if(room.status==='lobby'){if(screen!=='lobby')screen='lobby';renderUI();return;}
 if(role==='guest'){try{const m=JSON.parse(room.snap).snap;if(m.seq>lastSeq&&m.p.length<=N){lastSeq=m.seq;model=m;if(screen==='lobby')begin();}}catch{}}
 else{for(const [uid,raw] of Object.entries(room.act||{})){try{const v=JSON.parse(raw),i=seats().findIndex(p=>p.uid===uid&&p.k==='p');if(i>0&&Number.isSafeInteger(v.n)&&v.n>(lastPacket[i]?.n||0)){inputs[i]=clean(v);lastPacket[i]={n:v.n,t:performance.now()};}}catch{}}}
 },e=>{if(alive)err(e);});renderUI();return true;
 }catch(e){if(alive)err(e);return false;}finally{busy=false;if(root)root.style.visibility='visible';}}
 function packet(){if(!roomRef||pending)return;const ref=roomRef;let promise;if(role==='host'){if(!model)return;model.seq=++seq;promise=ref.child('snap').set(JSON.stringify({snap:model}));}else if(screen==='play'){promise=ref.child('act/'+OL.me).set(JSON.stringify({...own(),n:++sent}));}if(promise){pending=true;promise.catch(e=>{if(alive&&roomRef===ref){notice=luErr(e);toast(notice);}}).finally(()=>pending=false);}}
 function frame(t){if(!alive)return;raf=requestAnimationFrame(frame);const dt=Math.min(.075,Math.max(0,(t-last)/1000||0));last=t;
 if(screen==='play'&&model){if(keys.has('ArrowLeft'))a-=dt*2.2;if(keys.has('ArrowRight'))a+=dt*2.2;a=Math.atan2(Math.sin(a),Math.cos(a));
 if(!online||role==='host'){inputs[seat]=own();for(const p of model.p){if(p.i!==seat&&!p.bot&&t-(lastPacket[p.i]?.t||0)>600)inputs[p.i]={a:p.a,kit:p.kit};}acc+=dt;while(acc>=STEP&&model.ph==='play'){simulate(model,inputs,STEP);acc-=STEP;}shown=model;}
 else{if(!shown)shown=JSON.parse(JSON.stringify(model));shown={...model,p:model.p.map(p=>{const old=shown.p.find(q=>q.i===p.i)||p;return {...p,x:lerp(old.x,p.x,.24),z:lerp(old.z,p.z,.24),y:lerp(old.y,p.y,.24),a:angle(old.a,p.a,.26)};})};}
 net+=dt;if(online&&net>=.16){net=0;packet();}view.render(shown,seat,a);const score=root.querySelector('#pa-score'),time=root.querySelector('#pa-time');if(score)score.textContent=shown.p.map(p=>p.name+': '+p.score).join('  ·  ');if(time)time.textContent=Math.ceil(shown.time)+' s';
 if(model.ph==='end'){if(online&&role==='host'){if(pending)return;packet();}screen='end';renderUI();if(document.pointerLockElement===canvas)document.exitPointerLock();}
 }else if(screen==='end'&&shown)view.render(shown,seat,a);else{const p=(screen==='lobby'?seats().flatMap((v,i)=>v.k==='p'?[player(i,v.name)]:[]):[player(0,OL.name||'Du')]);if(p.length){p.forEach((v,j)=>{v.x=(j-(p.length-1)/2)*1.6;v.z=0;v.a=Math.PI;v.kit=v.i===seat?kit:0;});view.render({map,p,orbs:[]},seat,0,true);}}
 }
 function leave(){alive=false;cancelAnimationFrame(raf);listeners.forEach(f=>f());if(document.pointerLockElement===canvas)document.exitPointerLock();root?.remove();root=null;if(LUN.g===ID){window.luFr=null;LUN.left=1;luCleanup();LUN.g=null;}roomRef=null;}
 return {update(){},draw(){},showSetup(){mount();renderUI();},canJoin:()=>!roomRef&&!busy,joinCode(code){mount();return connect(code);},leave};
};
})();