/* Parcel queues, splitters, crossings, sorters and tunnel transfers. */
function createFactoryTransport({
 TICK,MD,PR,isBelt,beltSize,beltTime,currentTick,junctionTime,neighbor,tunnelExit,
 give,record,prod,uses,prjNeed,orderFor
}){
function loadParcel(o,[item,quality,entry,tick,jumped]){
 o.it=item;o.iq=quality;
 o.ag=tick>=o.carryTick&&tick<=o.carryTick+1?o.beltCarry:0;
 o.beltCarry=0;o.mt=tick;o.ein=entry;o.jumped=jumped;
}
function clearBelt(o){
 o.it=-1;o.wt=0;o.bad=0;
 if(o.queue.length)loadParcel(o,o.queue.shift());
}
const sortingGroups=[['h','Holz'],['m','Metall'],['v','Versorgung'],['e','Elektronik'],['n','Energie'],['f','Fahrzeuge'],['t','Hightech'],['b','Bunkermodule'],['u','Haushaltswaren']];
function beltDirections(o){
 if(MD[o.t]?.sortStation){
  const producer=MD[PR[o.it]];
  return [o.sortRule>=0&&(producer?.goodsGroup??producer?.g)===sortingGroups[o.sortRule]?.[0]?(o.r+1)%4:o.r];
 }
 if(o.t=='sort')return [o.it==o.sortRule?(o.r+1)%4:o.r];
 if(o.t!='smart')return [o.r];
 if(o.smartMode==2)return [orderFor(o.it)?(o.r+1)%4:o.r];
 return [o.r,(o.r+1)%4,(o.r+3)%4];
}
function moveBelt(o){
 const duration=beltTime(o.t);
 let budget=TICK;
 // Carry unused simulation time between closely spaced parcels, capped to one tick.
 for(let pass=0;pass<beltSize(o.t)&&o.it>=0&&o.mt!==currentTick();pass++){
  const remaining=Math.max(0,duration-o.ag);
  if(budget+1e-9<remaining){o.ag+=budget;return}
  budget=Math.max(0,budget-remaining);
  o.ag=duration;
  const jump=o.jumped?null:tunnelExit(o),dirs=jump?[o.r]:beltDirections(o);
  if(dirs.some(d=>give(o,d,o.it,o.iq,jump))){
   record(o,'moves');
   const hasQueue=o.queue.length>0;
   clearBelt(o);
   if(!hasQueue){o.beltCarry=budget;o.carryTick=currentTick();return}
   if(!budget)return;
   continue;
  }
  o.wt=1;record(o,'blocked');
  const target=jump||neighbor(o,dirs[0]);
  o.bad=!!target&&(target.t=='prj'?!prjNeed(o.it):prod(target)&&!uses(target,o.it));
  return;
 }
}
/* Verteiler behalten Produkt und Qualität gemeinsam und ziehen abwechselnd von ihren Eingängen. */
function jtick(o){
 const pull=d=>{
  const n=neighbor(o,d);
  if(!n||!isBelt(n.t)||!beltDirections(n).includes((d+2)%4)||n.it<0||n.ag<beltTime(n.t)||n.t=='tunnel'&&!n.jumped&&tunnelExit(n))return null;
  const parcel=[n.it,n.iq];
  record(n,'moves');n.beltCarry=0;clearBelt(n);
  return parcel;
 };
 if(o.j==1){
  if(o.it>=0){
   o.ag+=TICK;
   if(o.ag>=junctionTime()){
    o.wt=1;
    for(let i=0;i<4;i++){
     const d=(o.rr+i)%4;
     if(o.jm[d]!=2||!give(o,d,o.it,o.iq))continue;
     o.rr=(d+1)%4;clearBelt(o);break;
    }
   }
  }
  if(o.it<0)for(let i=0;i<4;i++){
   const d=(o.pr+i)%4;
   if(o.jm[d]!=1)continue;
   const parcel=pull(d);
   if(!parcel)continue;
   [o.it,o.iq]=parcel;o.ag=0;o.ein=d;o.pr=(d+1)%4;break;
  }
  o.st=o.it<0?2:o.wt?3:1;
  return;
 }
 let active=false,blocked=false;
 for(let d=0;d<4;d++){
  if(o.xs[d]>=0){
   o.xa[d]+=TICK;
   if(o.xa[d]>=junctionTime()){
    if(give(o,(d+2)%4,o.xs[d],o.xq[d]))o.xs[d]=-1;
    else blocked=true;
   }
  }
  if(o.xs[d]<0){
   const parcel=pull(d);
   if(parcel){[o.xs[d],o.xq[d]]=parcel;o.xa[d]=0}
  }
  active ||= o.xs[d]>=0;
 }
 o.st=blocked?3:active?1:2;
}

 return {loadParcel,clearBelt,beltDirections,moveBelt,jtick,sortingGroups};
}
