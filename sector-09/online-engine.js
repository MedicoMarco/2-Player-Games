/* Host-authoritative, ephemeral, fictional robot social-deduction rounds.
   The host is trusted; this is not a competitive anti-cheat server. */
(function(root){
'use strict';
const T=64, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const effects=[{name:'Lichtfeld',station:0,duration:24,critical:false},{name:'Datenstau',station:4,duration:28,critical:false},{name:'Impulsausfall',station:3,duration:32,critical:true}];
function tile(x,y){return {x:(x+.5)*T,y:(y+.5)*T};}
function open(m,x,y){return m.layout[y]?.[x]==='.';}
function walkable(m,x,y){return [-11,11].every(dx=>[-11,11].every(dy=>open(m,Math.floor((x+dx)/T),Math.floor((y+dy)/T))));}
function near(m,a,b,r){if(!b||distance(a,b)>r)return false;const n=Math.max(1,Math.ceil(distance(a,b)/12));for(let i=0;i<=n;i++)if(!open(m,Math.floor((a.x+(b.x-a.x)*i/n)/T),Math.floor((a.y+(b.y-a.y)*i/n)/T)))return false;return true;}
function move(m,p,dx,dy){if(walkable(m,p.x+dx,p.y))p.x+=dx;if(walkable(m,p.x,p.y+dy))p.y+=dy;}
function create(map,settings,roster,agentIndex){
 if(roster.length<4||roster.length>12||new Set(roster.map(r=>r.uid)).size!==roster.length)throw Error('Mindestens vier unterschiedliche Teilnehmer erforderlich.');
 if(!Number.isInteger(agentIndex)||agentIndex<0||agentIndex>=roster.length)throw Error('Ungültige Rolle.');
 const base=tile(...map.spawn),offsets=[[0,0],[-18,-18],[18,-18],[-18,18],[18,18],[-18,0],[18,0],[0,-18],[0,18],[-8,-8],[8,-8],[0,8]];
 return {map,settings,phase:'play',time:0,round:1,seq:0,winner:null,reason:'',alarm:0,alarmIndex:-1,signalCool:0,meetingId:0,meetingLeft:0,meetingReason:'',lastVote:null,votes:{},disabled:[],units:roster.map((r,i)=>({id:i,uid:r.uid,name:r.name,bot:!!r.bot,brain:{goal:null,path:[],work:0,kind:'',scores:{},voteAt:0},agent:i===agentIndex,active:true,x:base.x+offsets[i][0],y:base.y+offsets[i][1],cool:10,meeting:1,lastAction:0})),tasks:map.rooms.map(([name,x,y],i)=>({...tile(x,y),name,type:i,enabled:settings.density===6||[0,1,3,5].includes(i),done:false}))};
}
function end(g,side,reason){g.phase='end';g.winner=side;g.reason=reason;}
function check(g){if(g.phase==='end')return;const a=g.units.filter(u=>u.active&&u.agent).length,c=g.units.filter(u=>u.active&&!u.agent).length;if(!a)end(g,'crew','Die Station wurde gesichert.');else if(a>=c)end(g,'agent','Die Gegenmission war erfolgreich.');else if(g.tasks.every(t=>!t.enabled||t.done))end(g,'crew','Alle Stationsaufgaben sind abgeschlossen.');}
function meet(g,p,reason){if(g.phase!=='play'||!p.active)return;g.phase='vote';g.meetingId++;g.meetingLeft=25;g.meetingReason=reason;g.votes={};}
function voteEnd(g){const active=g.units.filter(u=>u.active),counts=new Map();for(const p of active){const v=g.votes[p.id]??-1;counts.set(v,(counts.get(v)||0)+1);}const rank=[...counts].sort((a,b)=>b[1]-a[1]);const out=rank[0]?.[0]>=0&&(!rank[1]||rank[0][1]>rank[1][1])?g.units.find(u=>u.id===rank[0][0]):null;if(out)out.active=false;g.lastVote={id:g.meetingId,text:out?out.name+' scheidet aus. Rolle: '+(out.agent?'Störsignal':'Technik'):'Keine eindeutige Mehrheit.'};g.disabled.forEach(d=>d.reported=true);g.phase='play';g.votes={};check(g);}
function action(g,p,a){
 if(!p.active||!a||!Number.isSafeInteger(a.n)||a.n<=p.lastAction)return;
 p.lastAction=a.n;
 if(g.phase==='vote'){if(a.kind==='vote'&&a.meeting===g.meetingId&&!(p.id in g.votes)&&(a.target===-1||g.units.some(u=>u.id===a.target&&u.active&&u.id!==p.id)))g.votes[p.id]=a.target;return;}
 if(g.phase!=='play')return;
 if(a.kind==='task'&&!p.agent){const t=g.tasks[a.target];if(t?.enabled&&!t.done&&near(g.map,p,t,75))t.done=true;}
 else if(a.kind==='repair'&&!p.agent&&g.alarmIndex>=0&&near(g.map,p,g.tasks[effects[g.alarmIndex].station],75)){g.alarm=0;g.alarmIndex=-1;}
 else if(a.kind==='report'){const d=g.disabled.find(d=>!d.reported&&near(g.map,p,d,75));if(d){d.reported=true;meet(g,p,p.name+' meldet einen Stationsvorfall.');}}
 else if(a.kind==='meeting'&&p.meeting>0){p.meeting--;meet(g,p,p.name+' ruft den Stationsrat ein.');}
 else if(a.kind==='signal'&&p.agent&&g.alarmIndex<0&&g.signalCool<=0&&Number.isInteger(a.target)&&a.target>=0&&a.target<effects.length){g.alarmIndex=a.target;g.alarm=effects[a.target].duration;g.signalCool=45;}
 else if(a.kind==='tag'&&p.agent&&p.cool<=0){const t=g.units.filter(u=>u.active&&!u.agent&&near(g.map,p,u,58)).sort((a,b)=>distance(p,a)-distance(p,b))[0];if(t){t.active=false;p.cool=17;g.disabled.push({id:t.id,x:t.x,y:t.y,reported:false});}}
 check(g);
}
function step(g,dt,inputs){if(g.phase==='end')return;dt=clamp(dt,0,.1);g.time+=dt;for(const p of g.units){p.cool=Math.max(0,p.cool-dt);const i=p.bot||p.temporaryBot?botInput(g,p,dt):(inputs[p.uid]||{});if(i.action)action(g,p,i.action);if(g.phase==='end')return;if(g.phase==='play'){const dx=clamp(Number.isFinite(i.dx)?i.dx:0,-1,1),dy=clamp(Number.isFinite(i.dy)?i.dy:0,-1,1),n=Math.max(1,Math.hypot(dx,dy));move(g.map,p,dx/n*165*dt,dy/n*165*dt);}}
 if(g.phase==='vote'){g.meetingLeft-=dt;if(g.meetingLeft<=0||g.units.filter(u=>u.active).every(u=>u.id in g.votes))voteEnd(g);return;}
 g.signalCool=Math.max(0,g.signalCool-dt);if(g.alarmIndex>=0){g.alarm-=dt;if(g.alarm<=0){const effect=effects[g.alarmIndex];g.alarm=0;g.alarmIndex=-1;if(effect.critical)end(g,'agent','Der fiktive Stationsfehler blieb ungelöst.');}}check(g);
}
function route(m,p,t){const sx=Math.floor(p.x/T),sy=Math.floor(p.y/T),tx=Math.floor(t.x/T),ty=Math.floor(t.y/T),k=(x,y)=>x+','+y,q=[[sx,sy]],prev=new Map([[k(sx,sy),null]]);for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty){const path=[];let at=[x,y];while(prev.get(k(...at))){path.unshift(tile(...at));at=prev.get(k(...at));}return path;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[x+dx,y+dy];if(open(m,...n)&&!prev.has(k(...n))){prev.set(k(...n),[x,y]);q.push(n);}}}return [];}
function botInput(g,p,dt){const b=p.brain;if(!p.active)return {};const act=(kind,target=-1)=>({action:{n:p.lastAction+1,kind,target,meeting:g.meetingId}});
if(g.phase==='vote'){if(p.id in g.votes)return {};if(b.voteAt!==g.meetingId){b.voteAt=g.meetingId;b.work=0;}b.work+=dt;if(b.work<2+p.id%4*.5)return {};const r=g.units.filter(u=>u.active&&u.id!==p.id).map(u=>({id:u.id,v:b.scores[u.id]||0})).sort((a,c)=>c.v-a.v);return act('vote',r[0]?.v>=2&&(!r[1]||r[0].v>r[1].v)?r[0].id:-1);}
if(g.phase!=='play')return {};if(p.agent&&g.signalCool<=0&&g.alarmIndex<0&&g.time>12&&Math.random()<dt*.04)return act('signal',0);if(b.voteAt){b.voteAt=0;b.goal=null;b.path=[];b.work=0;}
if(!p.agent){const report=g.disabled.find(d=>!d.reported&&near(g.map,p,d,55));if(report)return act('report');}
if(!p.agent&&g.alarmIndex>=0&&b.kind!=='repair'){b.goal=null;b.path=[];b.work=0;}if(b.kind==='repair'&&g.alarmIndex<0||b.kind==='task'&&b.goal?.done){b.goal=null;b.path=[];b.work=0;}
if(!b.goal){const tasks=g.tasks.filter(t=>t.enabled&&!t.done).sort((a,c)=>distance(p,a)-distance(p,c));if(!p.agent&&g.alarmIndex>=0){b.kind='repair';b.goal=g.tasks[effects[g.alarmIndex].station];}else if(tasks.length&&!p.agent){b.kind='task';b.goal=tasks[p.id%Math.min(3,tasks.length)];}else{b.kind='patrol';const r=g.map.rooms[Math.floor(Math.random()*g.map.rooms.length)];b.goal=tile(r[1],r[2]);}b.path=route(g.map,p,b.goal);b.work=0;}
if(distance(p,b.goal)<22){b.work+=dt;if(b.work>2.5){const kind=b.kind,t=b.goal;b.goal=null;b.path=[];b.work=0;if(kind==='task')return act('task',t.type);if(kind==='repair')return act('repair');}return {};}
if(!b.path.length)b.path=route(g.map,p,b.goal);const t=b.path[0]||b.goal,d=distance(p,t);if(d<7&&b.path.length){b.path.shift();return {};}if(d<1)return {};return {dx:(t.x-p.x)/d*.68,dy:(t.y-p.y)/d*.68};}
function snapshot(g){const round=n=>Math.round(n*10)/10;return {seq:++g.seq,phase:g.phase,map:g.map.id,time:round(g.time),alarm:round(g.alarm),alarmIndex:g.alarmIndex,signalCool:round(g.signalCool),meetingId:g.meetingId,meetingLeft:round(Math.max(0,g.meetingLeft)),meetingReason:g.meetingReason,lastVote:g.lastVote,winner:g.winner,reason:g.reason,voted:Object.keys(g.votes).map(Number),tasks:g.tasks.map(t=>({enabled:t.enabled,done:t.done})),disabled:g.disabled.map(d=>({...d,x:round(d.x),y:round(d.y)})),units:g.units.map(p=>({id:p.id,name:p.name,bot:!!(p.bot||p.temporaryBot),x:round(p.x),y:round(p.y),active:p.active,meeting:p.meeting}))};}
function role(g,uid){const p=g.units.find(u=>u.uid===uid);return p?{id:p.id,agent:p.agent}:null;}
root.Sector09Engine={create,step,snapshot,role,effects,walkable,near};
})(typeof module==='object'&&module.exports?module.exports:window);
