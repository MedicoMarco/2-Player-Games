const FactoryLogistics=(()=>{
 const speeds=[2,4,8,16,32,64];
 const ranges=[6,8,11,15,20,28];
 const storage=[0,20,60,120,220,360];
 const paths={
  belt:{name:'Förderband',ids:['bel','bel2','logistics1','logistics2','logistics3'],cost:[12,26,160,550,1700]},
  sort:{name:'Sortierband',requires:'lag',cost:[12,28,150,500,1450]},
  smart:{name:'Intelligentes Band',requires:'spd3',cost:[16,36,170,540,1600]},
  sorter:{name:'Sortieranlage',requires:'spd3',cost:[16,38,190,590,1750]},
  tunnel:{name:'Tunnel',requires:'bel2',cost:[18,42,210,650,1850],factor:.9},
  junction:{name:'Verteiler',cost:[10,25,140,460,1350]},
  storage:{name:'Lager',requires:'lag',cost:[14,32,180,620,1800]}
 };
 for(const [key,path] of Object.entries(paths))path.ids??=path.cost.map((_,i)=>key+'Tempo'+(i+1));
 const typePaths={belt:'belt',fast:'belt',express:'belt',sort:'sort',smart:'smart',sorter:'sorter',tunnel:'tunnel',
  spl:'junction',fus:'junction',kre:'junction',sto:'storage',depot:'storage'};
 const pathFor=type=>typePaths[type];
 const stage=(ids,has)=>ids.reduce((value,id,i)=>has(id)?i+1:value,0);
 function upgradeSavedResearch(research){
  const oldStage=stage(paths.belt.ids,id=>research.includes(id));
  return [...new Set([...research,...Object.values(paths).flatMap(path=>path.ids.slice(0,oldStage))])];
 }
 const baseSpeed=(key,stage)=>speeds[stage]*(paths[key].factor||1);
 return {paths,pathFor,stage,upgradeSavedResearch,baseSpeed,ranges,storage};
})();

/* Parcel queues, splitters, crossings, sorters and tunnel transfers. */
function createFactoryTransport({
 MD,PR,currentCycle,neighbor,tunnelExit,tunnelSurfaceOutput,
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
 if(o.t==='tunnel'&&!jump&&!tunnelSurfaceOutput(o)){o.wt=1;return}
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
const ready=o=>o.it>=0&&o.mt!==currentCycle();
/* Each input can wait independently. A busy input cannot starve the others. */
function jtick(o){
 const cycle=currentCycle();
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
   const parcel=o.inQueue[d];
   if(!parcel)continue;
   o.inQueue[d]=null;
   loadParcel(o,parcel);o.pr=(d+1)%4;break;
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
  active ||= o.xs[d]>=0;
 }
 o.st=blocked?3:active?1:2;
}

 return {loadParcel,clearBelt,beltDirections,moveBelt,jtick,sortingGroups};
}
