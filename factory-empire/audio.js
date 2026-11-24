function createFactoryAudio({time,frame,mood,cloudRef,writeLocal,toast,isBelt,tme}){
const PI=Math.PI;
const AKEY='2pg_fe_audio',AS0={master:.8,music:.5,mach:.55,sfx:.75,mm:0,mc:0,ms:0,ma:0,ts:0};
let AS=Object.assign({},AS0),AU=null,audCloud=0,audDirty=0,audT=0,audRetry=0,audBusy=false;
const lvl=v=>v*v,mf=n=>440*Math.pow(2,(n-69)/12),audG=()=>audioStart();
const MOODS=[
 {bpm:72,bright:300,bass:0,dr:0,ch:[[48,52,55,59],[45,52,55,60],[41,48,52,57],[43,50,55,59]],arp:[0,-1,-1,2,-1,-1,1,-1,3,-1,-1,2,-1,-1,1,-1]},
 {bpm:84,bright:450,bass:1,dr:1,ch:[[45,52,55,59],[41,48,52,57],[48,52,55,59],[43,50,55,62]],arp:[0,-1,2,-1,1,-1,3,-1,0,-1,2,-1,1,-1,3,2]},
 {bpm:92,bright:650,bass:2,dr:2,ch:[[50,53,57,60],[46,50,53,57],[41,48,53,57],[48,52,55,60]],arp:[0,2,1,3,0,2,1,3,0,2,1,3,0,2,3,1]},
 {bpm:100,bright:900,bass:2,dr:3,ch:[[52,55,59,62],[48,52,55,59],[43,50,55,59],[50,54,57,62]],arp:[0,2,1,3,2,1,3,2,0,2,1,3,2,1,3,2]}];
const aud=b=>!!AU&&!AS.ma&&AS.master>.01&&(b=='m'?!AS.mm&&AS.music>.01:b=='c'?!AS.mc&&AS.mach>.01:!AS.ms&&AS.sfx>.01);
function audSan(j){const o={};for(const k of['master','music','mach','sfx'])o[k]=Math.max(0,Math.min(1,+j[k]>=0?+j[k]:AS0[k]));for(const k of['mm','mc','ms','ma'])o[k]=j[k]?1:0;o.ts=+j.ts||0;return o}
function audLoad(){try{const j=JSON.parse(localStorage.getItem(AKEY));if(j)AS=Object.assign(AS,audSan(j))}catch(e){}}
function audSave(){AS.ts=Date.now();try{localStorage.setItem(AKEY,JSON.stringify(AS))}catch(e){}audDirty=1;audT=time()}
function audApply(){if(!AU)return;const t=AU.x.currentTime,g=(n,v)=>n.gain.setTargetAtTime(v,t,.04);g(AU.mg,AS.ma?0:lvl(AS.master));g(AU.bus.m,AS.mm?0:lvl(AS.music)*.9);g(AU.bus.c,AS.mc?0:lvl(AS.mach)*.9);g(AU.bus.s,AS.ms?0:lvl(AS.sfx))}
function audCloudSync(force=false){
 const ref=cloudRef();
 if(!ref||audBusy||!force&&time()<audRetry)return;
 if(!audCloud){
  audBusy=true;
  const read=typeof ref.get=='function'?ref.get():ref.once('value');
  read.then(snapshot=>{
   if(!cloudRef())return;
   const saved=snapshot.val();
   if(saved&&(+saved.ts||0)>AS.ts){
    AS=Object.assign(AS,audSan(saved));writeLocal(AKEY,AS);audApply();audDirty=0;
   }else if(AS.ts)audDirty=1;
   audCloud=1;
  }).catch(()=>{audRetry=time()+15}).finally(()=>{audBusy=false});
  return;
 }
 if(!audDirty||!force&&time()-audT<=.9)return;
 const candidate={...AS};
 audBusy=true;
 ref.transaction(current=>(!current||(+current.ts||0)<=candidate.ts)?candidate:undefined,undefined,false)
  .then(result=>{
   if(!cloudRef()||AS.ts!==candidate.ts)return;
   const remote=result.snapshot.val();
   if(!result.committed&&remote){AS=Object.assign(AS,audSan(remote));writeLocal(AKEY,AS);audApply()}
   audDirty=0;
  }).catch(()=>{audRetry=time()+15}).finally(()=>{audBusy=false});
}
function audStop(){
 audCloudSync(true);
 if(AU){clearInterval(AU.timer);try{AU.x.close()}catch(e){}AU=null}
}
function audioStart(){
 if(AU){if(AU.x.state=='suspended'){try{AU.x.resume()}catch(e){}}return}
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;let x;try{x=new AC()}catch(e){return}
 const mg=x.createGain(),cp=x.createDynamicsCompressor();cp.threshold.value=-14;cp.knee.value=20;cp.ratio.value=3;cp.attack.value=.01;cp.release.value=.25;const lm=x.createDynamicsCompressor();lm.threshold.value=-9;lm.knee.value=0;lm.ratio.value=20;lm.attack.value=.001;lm.release.value=.12;const og=x.createGain();og.gain.value=.9;mg.connect(cp);cp.connect(lm);lm.connect(og);og.connect(x.destination);
 const bus={};for(const k of['m','c','s']){bus[k]=x.createGain();bus[k].connect(mg)}
 const rv=x.createConvolver(),len=Math.floor(x.sampleRate*1.8),ib=x.createBuffer(2,len,x.sampleRate);for(let ch=0;ch<2;ch++){const d=ib.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}rv.buffer=ib;
 const rg=x.createGain();rg.gain.value=.5;rv.connect(rg);rg.connect(mg);const rs=x.createGain();rs.connect(rv);
 const ei=x.createGain(),dl=x.createDelay(1),fb=x.createGain(),ef=x.createBiquadFilter(),eo=x.createGain();dl.delayTime.value=.34;fb.gain.value=.36;ef.type='lowpass';ef.frequency.value=2200;eo.gain.value=.5;ei.connect(dl);dl.connect(ef);ef.connect(fb);fb.connect(dl);ef.connect(eo);eo.connect(bus.m);
 const nb=x.createBuffer(1,x.sampleRate*2,x.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
 const bb=x.createBuffer(1,x.sampleRate*4,x.sampleRate),bd=bb.getChannelData(0);let l=0;for(let i=0;i<bd.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;bd[i]=l*3.5}
 const loop=(buf,ft,f,q)=>{const sn=x.createBufferSource();sn.buffer=buf;sn.loop=true;const fl=x.createBiquadFilter();fl.type=ft;fl.frequency.value=f;fl.Q.value=q;const gn=x.createGain();gn.gain.value=0;sn.connect(fl);fl.connect(gn);gn.connect(bus.c);sn.start();return gn};
 AU={x,mg,bus,rs,ei,nb,belt:loop(nb,'bandpass',700,.8),amb:loop(bb,'lowpass',260,.5),rum:loop(bb,'lowpass',110,1.2),M:{next:0,step:0,cur:mood()},ms:0,ls:{},last:null};
 audApply();if(typeof setInterval!='undefined')AU.timer=setInterval(musTick,100);
 try{if(x.state=='suspended')x.resume()}catch(e){}
 if(!AS.ts)toast('🔊 Ton an – Einstellungen unter Firma → Audio')}
function aEnv(g,t,a,d,pk){g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d)}
function aOsc(ty,f0,f1,t,d,pk,out,send,a){const x=AU.x,o=x.createOscillator(),g=x.createGain();o.type=ty;o.frequency.setValueAtTime(f0,t);if(f1!=f0)o.frequency.exponentialRampToValueAtTime(f1,t+d);aEnv(g,t,a||.004,d,pk);o.connect(g);g.connect(out);if(send){const s=x.createGain();s.gain.value=send;g.connect(s);s.connect(AU.rs)}o.start(t);o.stop(t+d+(a||.004)+.05);return g}
function aNz(t,d,pk,ft,f,q,out,f1){const x=AU.x,sn=x.createBufferSource(),fl=x.createBiquadFilter(),g=x.createGain();sn.buffer=AU.nb;fl.type=ft;fl.frequency.setValueAtTime(f,t);if(f1)fl.frequency.exponentialRampToValueAtTime(f1,t+d);fl.Q.value=q;aEnv(g,t,.003,d,pk);sn.connect(fl);fl.connect(g);g.connect(out);sn.start(t,Math.random()*Math.max(0,1.9-d));sn.stop(t+d+.05)}
const bell=(f,t,pk,o)=>{aOsc('sine',f,f,t,1.1,pk,o,.5);aOsc('sine',f*2.76,f*2.76,t,.5,pk*.25,o,.4);aOsc('sine',f*5.4,f*5.4,t,.25,pk*.1,o,.3)};
const SFX={
 click:(t,o)=>{aOsc('sine',1500,900,t,.035,.22,o);aNz(t,.02,.09,'highpass',3200,.7,o)},
 select:(t,o)=>{aOsc('sine',660,700,t,.08,.21,o,.12)},
 rotate:(t,o)=>{aOsc('triangle',520,430,t,.06,.2,o);aOsc('triangle',640,520,t+.055,.06,.16,o)},
 place:(t,o)=>{aOsc('sine',170,78,t,.17,.5,o);aNz(t,.05,.18,'lowpass',900,.7,o)},
 belt:(t,o)=>{aOsc('sine',900,600,t,.04,.24,o);aNz(t,.03,.12,'bandpass',2200,2,o)},
 remove:(t,o)=>{aOsc('sine',430,150,t,.15,.24,o);aNz(t,.08,.09,'lowpass',1200,.7,o)},
 hire:(t,o)=>{[523,659].forEach((f,i)=>aOsc('triangle',f,f,t+i*.08,.24,.24,o,.3))},
 upgrade:(t,o)=>{[523,659,784].forEach((f,i)=>aOsc('triangle',f,f*1.003,t+i*.065,.3,.24,o,.35));aOsc('sine',1568,1568,t+.2,.4,.06,o,.5)},
 unlock:(t,o)=>{[523,659,784,1046].forEach((f,i)=>bell(f,t+i*.07,.12,o))},
 order:(t,o)=>{bell(784,t,.17,o);bell(1175,t+.1,.15,o)},
 achieve:(t,o)=>{bell(988,t,.18,o);bell(1319,t+.13,.16,o)},
 discover:(t,o)=>{bell(880,t,.15,o)},
 level:(t,o)=>{[523,659,784,1046].forEach((f,i)=>aOsc('triangle',f,f,t+i*.09,.35,.16,o,.4));[523,659,784].forEach(f=>aOsc('sine',f*2,f*2,t+.4,.7,.06,o,.5))},
 prestige:(t,o)=>{[261,329,392,523].forEach(f=>aOsc('sawtooth',f,f*1.01,t,1.6,.05,o,.5,.5));aNz(t,1.2,.1,'bandpass',500,1,o,5000);[784,988,1319,1568].forEach((f,i)=>bell(f,t+.5+i*.16,.14,o))},
 warn:(t,o)=>{aOsc('triangle',330,262,t,.18,.21,o,.2);aOsc('triangle',262,220,t+.16,.24,.18,o,.2)},
 deny:(t,o)=>{aOsc('triangle',210,165,t,.13,.2,o)}};
function sfx(n,at){if(!aud('s')||!SFX[n])return;const x=AU.x,t=(at==null?x.currentTime:at)+.005;if(at==null){if(AU.ls[n]&&t-AU.ls[n]<.04)return;AU.ls[n]=t}try{SFX[n](t,AU.bus.s)}catch(e){}}
const MS={
 src:(t,o)=>{aOsc('sine',230,140,t,.09,.45,o);aNz(t,.06,.12,'bandpass',900,1.5,o)},
 saw:(t,o)=>{aNz(t,.28,.65,'bandpass',3200,3,o,1500);aOsc('sawtooth',190,120,t,.26,.14,o)},
 frm:(t,o)=>{aOsc('sine',95,38,t,.2,.5,o);aNz(t,.04,.16,'lowpass',700,.8,o)},
 asm:(t,o)=>{aOsc('triangle',280,540,t,.22,.26,o);aOsc('triangle',540,300,t+.22,.2,.2,o);aNz(t+.4,.02,.16,'highpass',3000,.7,o)},
 pnt:(t,o)=>{aNz(t,.38,.3,'highpass',4200,.6,o)},
 pck:(t,o)=>{aNz(t,.03,.8,'bandpass',1800,3,o);aNz(t+.14,.03,.8,'bandpass',2400,3,o);aNz(t+.05,.2,.16,'highpass',5000,.5,o)},
 ers:(t,o)=>{aNz(t,.12,.2,'bandpass',1100,1.2,o);aOsc('sine',140,90,t,.08,.3,o)},
 sme:(t,o)=>{aNz(t,.35,.18,'lowpass',500,.7,o);aOsc('sine',70,60,t,.35,.3,o)},
 mil:(t,o)=>{aOsc('sawtooth',880,720,t,.28,.2,o);aNz(t,.25,.3,'bandpass',4000,4,o)},
 gra:(t,o)=>{aNz(t,.14,.22,'bandpass',2600,1.4,o,1800);aNz(t+.09,.1,.14,'bandpass',3400,2,o)},
 inj:(t,o)=>{aOsc('sine',120,48,t,.22,.5,o);aNz(t+.06,.2,.14,'lowpass',1100,.8,o,400)},
 pcb:(t,o)=>{aOsc('sine',2600,1900,t,.14,.09,o);aNz(t,.12,.14,'highpass',6500,.6,o)},
 ele:(t,o)=>{aNz(t,.02,.45,'bandpass',3600,4,o);aNz(t+.1,.02,.4,'bandpass',2900,4,o);aOsc('triangle',640,780,t+.18,.12,.1,o)},
 wrk:(t,o)=>{aOsc('sine',1250,1100,t,.25,.2,o);aOsc('sine',1900,1700,t,.15,.08,o);aNz(t,.02,.25,'highpass',2500,.7,o);aOsc('sine',1250,1100,t+.16,.25,.15,o)}};
function mshot(ty,gv,pan,at){const x=AU.x,t=(at==null?x.currentTime:at)+.01,gn=x.createGain();gn.gain.value=Math.min(1,gv*1.1);if(x.createStereoPanner){const pn=x.createStereoPanner();pn.pan.value=pan;gn.connect(pn);pn.connect(AU.bus.c)}else gn.connect(AU.bus.c);AU.last={type:ty,g:gn.gain.value,pan};try{MS[ty](t,gn)}catch(e){}}
Object.assign(MS,{bal:MS.frm,reg:MS.asm,wal:MS.frm,sch:MS.wrk||MS.frm,pan:MS.frm,sen:MS.pcb,ste:MS.pcb,fld:MS.ers,kon:MS.gra,rat:MS.pck,pmp:MS.gra,fil:MS.gra,pha:MS.inj,mds:MS.pck,akk:MS.pcb,mot:MS.mil,sol:MS.pcb,gen:MS.mil,rea:MS.sme,rad:MS.inj,fah:MS.asm,ebk:MS.asm,kar:MS.frm,aut:MS.asm,lkw:MS.asm,rob:MS.asm,kip:MS.pcb,dro:MS.asm,woh:MS.frm,ver:MS.pck,tor:MS.frm,kom:MS.ele});
Object.assign(MS,{
 bal:(t,o)=>{aOsc('triangle',98,36,t,.22,.21,o);aNz(t+.17,.085,.19,'bandpass',820,1.4,o)},
 wal:(t,o)=>{aNz(t,.31,.16,'bandpass',660,.6,o);aOsc('sine',126,123,t,.28,.14,o)},
 sch:(t,o)=>{for(let i=0;i<4;i++)aNz(t+.045*i,.08,.15,'highpass',3000,1.5,o);aOsc('square',320,160,t,.19,.04,o)},
 drill:(t,o)=>{aOsc('triangle',420,800,t,.27,.12,o);aNz(t+.05,.19,.12,'bandpass',1450,.9,o)},
 furniture:(t,o)=>{aOsc('triangle',244,116,t,.18,.17,o);aNz(t+.09,.16,.17,'bandpass',1180,1.4,o)},
 mobile:(t,o)=>{aOsc('sine',112,82,t,.35,.19,o);aNz(t+.21,.16,.17,'bandpass',850,.9,o)},
 fitting:(t,o)=>{aOsc('triangle',210,72,t,.16,.17,o);aNz(t+.1,.085,.21,'bandpass',1050,1.3,o)},
 label:(t,o)=>{aNz(t,.12,.16,'highpass',3200,.9,o);aOsc('sine',820,550,t+.08,.09,.11,o)},
 servo:(t,o)=>{aOsc('triangle',730,230,t,.24,.13,o);aOsc('sine',105,91,t+.07,.21,.18,o)},
 cellFab:(t,o)=>{aOsc('square',180,410,t,.28,.04,o);aNz(t+.11,.18,.21,'bandpass',1200,1.3,o)},
 rob:(t,o)=>{aOsc('sine',740,388,t,.23,.22,o);aNz(t+.16,.11,.15,'bandpass',930,.9,o)},
 kon:(t,o)=>{aOsc('triangle',210,167,t,.18,.13,o);aNz(t+.05,.13,.16,'bandpass',2100,.8,o)},
 rad:(t,o)=>{aNz(t,.22,.19,'lowpass',850,.7,o);aOsc('triangle',134,85,t+.05,.15,.13,o)}
});
function audMach(dt){if(!AU)return;const x=AU.x,t=x.currentTime;
 const {cam,CX,CY,FW,FH,L,TS}=frame();
 if(!aud('c')){for(const n of[AU.belt,AU.amb,AU.rum])n.gain.setTargetAtTime(0,t,.2);return}
 const zf=Math.min(1,.2+.4*cam.z);let nb=0,nm=0,rum=0;AU.ms=Math.max(0,AU.ms-dt*12);
 for(const o of L){const sx=CX+((o.x+.5)*TS-cam.x)*cam.z,sy=CY+((o.y+.5)*TS-cam.y)*cam.z;if(sx<-60||sx>FW+60||sy<-60||sy>FH+60)continue;const d=Math.hypot(sx-CX,sy-CY)/520,gv=zf/(1+d*d*2.4);
  if(isBelt(o.t)){if(o.it>=0)nb+=gv;continue}
  if(!MS[o.t]||o.st!=1)continue;nm+=gv;if(o.t=='sme'||o.t=='rea')rum=Math.max(rum,gv);
  o.sn=(o.sn==null?Math.random()*1.2:o.sn)-dt;if(o.sn<=0){o.sn=Math.max(.45,tme(o))*(.9+Math.random()*.2);if(gv>.06&&AU.ms<3){AU.ms++;mshot(o.t,gv,Math.max(-.8,Math.min(.8,(sx-400)/520)))}}}
 AU.belt.gain.setTargetAtTime(Math.min(.3,.05*Math.sqrt(nb)),t,.25);AU.amb.gain.setTargetAtTime(nm>0?(.04+.12*Math.min(1,nm/4))*(.35+.65*zf):0,t,.4);AU.rum.gain.setTargetAtTime(Math.min(.45,rum*.9),t,.3)}
function mstep(st,t){const M=AU.M;if(st%64==0)M.cur=mood();const mo=MOODS[M.cur],spb=60/mo.bpm/4,s=st%16,ch=mo.ch[Math.floor(st/16)%4],o=AU.bus.m,x=AU.x;
 if(s==0){const bl=spb*16,g=x.createGain(),fl=x.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(500,t);fl.frequency.linearRampToValueAtTime(700+mo.bright,t+bl*.6);fl.frequency.linearRampToValueAtTime(600,t+bl);fl.Q.value=.6;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.05,t+bl*.25);g.gain.setValueAtTime(.05,t+bl*.7);g.gain.linearRampToValueAtTime(.0001,t+bl+.4);fl.connect(g);g.connect(o);const sd=x.createGain();sd.gain.value=.5;g.connect(sd);sd.connect(AU.rs);
  for(const n of ch)for(const c1 of[-6,6]){const os=x.createOscillator();os.type='sawtooth';os.frequency.value=mf(n);os.detune.value=c1;os.connect(fl);os.start(t);os.stop(t+bl+.5)}}
 if(st<8)return;
 if(mo.bass&&(s==0||s==8||(mo.bass>1&&s==6))){const f=mf(ch[0]-12);aOsc('sine',f,f,t,spb*3.2,.17,o);aOsc('triangle',f,f,t,spb*3.2,.06,o)}
 const ai=mo.arp[s];if(ai>=0){const f=mf(ch[ai]+12),g=aOsc('triangle',f,f,t,.35,.15,o,.25),e=x.createGain();e.gain.value=.45;g.connect(e);e.connect(AU.ei)}
 if(mo.dr>=2&&s%8==0)aOsc('sine',120,42,t,.22,.26,o);
 if(mo.dr>=1&&s%4==2)aNz(t,.04,.07,'highpass',7000,.7,o);
 if(mo.dr>=2&&s%2==1&&s%4!=3)aNz(t,.03,.045,'highpass',8000,.7,o);
 if(mo.dr>=3&&(s==4||s==12))aNz(t,.12,.1,'bandpass',1800,.8,o);
 if(mo.dr>=3&&s==10&&Math.floor(st/16)%2==1)bell(mf(ch[3]+24),t,.05,o)}
function musFill(until){const M=AU.M,x=AU.x;if(M.next<x.currentTime)M.next=x.currentTime+.06;while(M.next<until){mstep(M.step,M.next);M.next+=60/MOODS[M.cur].bpm/4;M.step++}}
function musTick(){if(!AU||!aud('m')||AU.x.state!='running')return;musFill(AU.x.currentTime+.4)}

 return {
  settings:AS,audG,audLoad,audSave,audApply,audStop,audioStart,sfx,MS,SFX,MOODS,audMach,musFill,musTick,mshot,aud,audCloudSync,
  getContext:()=>AU,
  clearPending:()=>{audDirty=0},
  pause(hidden){
   if(!AU)return;
   try{hidden?AU.x.suspend():AU.x.resume()}catch{}
  }
 };
}
