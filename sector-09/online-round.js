(function(){
'use strict';
const E=window.Sector09Engine,V=()=>window.Sector09View;
let active=null,hostModel=null;
function parse(raw){try{return typeof raw==='string'?JSON.parse(raw):null;}catch{return null;}}
function action(kind,target=-1,meeting=0){if(!active||!active.role||active.queue.length>=4)return false;active.queue.push({n:(active.actionId=Math.max(active.actionId+1,Date.now()*1000)),kind,target,meeting});return true;}
function stop(){const a=active;active=null;if(a){clearInterval(a.timer);a.ref.child('state').off('value',a.stateListener);if(a.inputListener)a.ref.child('inputs').off('value',a.inputListener);if(a.connListener)a.db.ref('.info/connected').off('value',a.connListener);V().exit();}hostModel=null;}
function fail(a,e){if(active!==a)return;a.status(e?.message||'Online-Runde unterbrochen.');stop();}
async function close(session,db){const ref=db.ref('sector09Rounds/'+session.code);if(session.host){await session.ref.child('roundActive').remove();await ref.remove();await ref.onDisconnect().cancel().catch(()=>{});}stop();}
async function launch(session,db,uid,room,status){
 if(!session.host||room.roundActive||active)return;
 const seats=Object.entries(room.seats||{}).sort((a,b)=>+a[0]-+b[0]);if(seats.length<2||seats.some(([,p])=>!p.ready))throw Error('Mindestens 2 bereite Spieler sind erforderlich.');
 const map=V().maps.find(m=>m.id===room.settings.map);if(!map)throw Error('Karte unbekannt.');
 const rand=new Uint32Array(1);crypto.getRandomValues(rand);
 const roster=seats.map(([,p])=>p);while(roster.length<room.settings.capacity){const i=roster.length;roster.push({uid:'bot:'+i,name:'BOT '+String(i+1).padStart(2,'0'),bot:true});}const g=E.create(map,room.settings,roster,rand[0]%roster.length),ref=db.ref('sector09Rounds/'+session.code);
 const members=Object.fromEntries(seats.map(([seat,p])=>[p.uid,seat])),roles=Object.fromEntries(seats.map(([,p])=>[p.uid,E.role(g,p.uid)]));
 hostModel=g;
 try{await ref.set({host:uid,members,roles,state:JSON.stringify(E.snapshot(g))});await ref.onDisconnect().remove();await session.ref.child('roundActive').set(true);}
 catch(e){await ref.remove().catch(()=>{});hostModel=null;throw e;}
}
async function watch(session,db,uid,status){
 if(active)return;
 const ref=db.ref('sector09Rounds/'+session.code),a={session,db,uid,status,ref,queue:[],actionId:0,role:null,seq:-1,inputs:{},inputRaw:{},inputAt:{},last:performance.now(),publishAt:0,pending:false,connected:false,lastSent:null,final:false};
 active=a;
 try{const role=(await ref.child('roles/'+uid).once('value')).val();if(active!==a)return;if(!role||typeof role.agent!=='boolean'||!Number.isInteger(role.id))throw Error('Rolle konnte nicht geladen werden.');
 a.role=role;if(!session.host)await session.seatRef.onDisconnect().cancel();if(active!==a)return;
 if(session.host&&!hostModel)throw Error('Host-Runde ist nicht mehr verfügbar.');
 V().enter(role,action,session.exit);
 a.connListener=s=>{a.connected=s.val()===true;if(!a.connected)V().connection(false);else V().connection(true);};db.ref('.info/connected').on('value',a.connListener);
 a.stateListener=s=>{if(active!==a)return;const data=parse(s.val());if(!data||!Number.isInteger(data.seq)||data.seq<=a.seq)return;a.seq=data.seq;if(data.phase==='end'&&!session.host)a.final=true;V().snapshot(data,role);};ref.child('state').on('value',a.stateListener,e=>fail(a,e));
 if(session.host){a.inputListener=s=>{const now=performance.now(),all=s.val()||{};for(const [id,raw] of Object.entries(all)){if(a.inputRaw[id]!==raw){a.inputRaw[id]=raw;a.inputAt[id]=now;a.inputs[id]=parse(raw)||{};}}};ref.child('inputs').on('value',a.inputListener,e=>fail(a,e));}
 a.timer=setInterval(()=>{if(active!==a||!a.connected)return;const now=performance.now(),own=V().input(),packet={dx:own.dx,dy:own.dy,action:a.queue[0]||null};
 if(session.host){const g=hostModel;if(!g)return;const inputs={};for(const [id,i] of Object.entries(a.inputs)){if(now-(a.inputAt[id]||0)<1000)inputs[id]=i;}for(const p of g.units){if(!p.bot&&p.uid!==uid){p.temporaryBot=g.time>10&&(!a.inputAt[p.uid]||now-a.inputAt[p.uid]>8000);}}inputs[uid]=packet;if(a.queue.length)a.queue.shift();const dt=Math.min(.1,(now-a.last)/1000);a.last=now;E.step(g,dt,inputs);
 if(!a.pending&&!a.final&&now-a.publishAt>=150){a.publishAt=now;a.pending=true;const snap=E.snapshot(g);V().snapshot(snap,role);ref.child('state').set(JSON.stringify(snap)).then(()=>{if(snap.phase==='end')a.final=true;}).catch(e=>fail(a,e)).finally(()=>{a.pending=false;});}}
 else if(!a.pending&&now-a.publishAt>=160&&!a.final){a.publishAt=now;a.pending=true;packet.heartbeat=Math.floor(now/160);const raw=JSON.stringify(packet);ref.child('inputs/'+uid).set(raw).then(()=>{if(packet.action&&a.queue[0]?.n===packet.action.n)a.queue.shift();}).catch(e=>fail(a,e)).finally(()=>{a.pending=false;});}
 },50);
 }catch(e){fail(a,e);}
}
function lobbyChanged(room){if(!active)return;if(!room?.roundActive){stop();return;}if(active.session.host&&hostModel){const current=new Set(Object.values(room.seats||{}).map(s=>s.uid));for(const p of hostModel.units){if(!p.bot&&!current.has(p.uid)){p.bot=true;delete active.inputs[p.uid];}}}}
window.Sector09Net={launch,watch,stop,close,lobbyChanged,action,isActive:()=>!!active};
})();