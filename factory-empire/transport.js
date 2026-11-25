/* Parcel queues, splitters, crossings, sorters and tunnel transfers. */
function createFactoryTransport({
 MD,PR,isBelt,currentCycle,neighbor,inputNeighbor,tunnelExit,
 give,record,prod,uses,prjNeed,isProjectRamp=t=>t==='prj',orderFor
}){
function loadParcel(o,[item,quality,entry,tick,jumped]){
 o.it=item;o.iq=quality;
 o.ag=0;o.mt=tick;o.ein=entry;o.jumped=jumped;
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
 if(!ready(o))return;
 const jump=o.jumped?null:tunnelExit(o),dirs=jump?[o.r]:beltDirections(o);
 if(dirs.some(d=>give(o,d,o.it,o.iq,jump))){
  record(o,'moves');
  clearBelt(o);
  return;
 }
 o.wt=1;
 record(o,'blocked');
 const target=jump||neighbor(o,dirs[0]);
 o.bad=!!target&&(isProjectRamp(target.t)?!prjNeed(o.it,target.t):prod(target)&&!uses(target,o.it));
}
const ready=o=>o.it>=0&&o.mt!==currentCycle()&&o.movedAt!==currentCycle();
/* Verteiler behalten Produkt und Qualität gemeinsam und ziehen abwechselnd von ihren Eingängen. */
function jtick(o){
 const cycle=currentCycle();
 const pull=d=>{
  const n=inputNeighbor(o,d);
  const output=(d+2)%4;
  if(!n||n.needsRelocation||!isBelt(n.t)||!ready(n)||!beltDirections(n).includes(output))return null;
  if(n.yardBlocked?.[output]===o)return null;
  if(n.yardOutputs?.[output]&&n.yardOutputs[output]!==o||n.t=='tunnel'&&!n.jumped&&tunnelExit(n))return null;
  const parcel=[n.it,n.iq];
  record(n,'moves');n.movedAt=cycle;clearBelt(n);
  return parcel;
 };
 if(o.j==1){
  if(o.it>=0&&o.mt!==cycle){
   o.wt=1;
   for(let i=0;i<4;i++){
    const d=(o.rr+i)%4;
    if(o.jm[d]!=2||!give(o,d,o.it,o.iq))continue;
    o.rr=(d+1)%4;record(o,'moves');clearBelt(o);break;
   }
  }
  if(o.it<0)for(let i=0;i<4;i++){
   const d=(o.pr+i)%4;
   if(o.jm[d]!=1)continue;
   const parcel=pull(d);
   if(!parcel)continue;
   [o.it,o.iq]=parcel;o.mt=cycle;o.ein=d;o.pr=(d+1)%4;break;
  }
  o.st=o.it<0?2:o.wt?3:1;
  return;
 }
 let active=false,blocked=false;
 for(let d=0;d<4;d++){
  if(o.xs[d]>=0&&o.xm[d]!==cycle){
   if(give(o,(d+2)%4,o.xs[d],o.xq[d])){
    if(o.xQueue[d]){[o.xs[d],o.xq[d],o.xm[d]]=o.xQueue[d];o.xQueue[d]=null}
    else o.xs[d]=-1;
    record(o,'moves');
   }
   else blocked=true;
  }
  if(o.xs[d]<0){
   const parcel=pull(d);
   if(parcel){[o.xs[d],o.xq[d]]=parcel;o.xm[d]=cycle}
  }
  active ||= o.xs[d]>=0;
 }
 o.st=blocked?3:active?1:2;
}

 return {loadParcel,clearBelt,beltDirections,moveBelt,jtick,sortingGroups};
}
