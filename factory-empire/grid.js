/* Footprints, ports and paths use the same integer world coordinates. */
const FactoryGrid=(()=>{
const DX=[1,0,-1,0],DY=[0,1,0,-1];
const dimensions=(o,r=o.r)=>r%2?[o.base[1],o.base[0]]:o.base;
function footprint(o,x=o.x,y=o.y,r=o.r){
 const [w,h]=dimensions(o,r),result=[];
 for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)result.push([x+dx,y+dy]);
 return result;
}
function port(o,d){
 const [w,h]=dimensions(o);
 return [o.x+(d==0?w:d==2?-1:Math.floor((w-1)/2)),o.y+(d==1?h:d==3?-1:Math.floor((h-1)/2))];
}
function floorRoute(start,finish,width,walkable){
 const key=(x,y)=>y*width+x,first=key(...start),last=key(...finish);
 const previous=new Map([[first,-1]]),queue=[first];
 for(let i=0;i<queue.length;i++){
  const at=queue[i];
  if(at==last){
   const path=[];
   for(let p=at;p!=-1;p=previous.get(p))path.push([p%width,Math.floor(p/width)]);
   return path.reverse();
  }
  const x=at%width,y=Math.floor(at/width);
  for(let d=0;d<4;d++){
   const nx=x+DX[d],ny=y+DY[d],next=key(nx,ny);
   if(previous.has(next)||!walkable(nx,ny))continue;
   previous.set(next,at);queue.push(next);
  }
 }
 return [];
}
function planRoute(from,to,{width,cell,canUse,canEnter,validate}){
 const direction=from.r,[x,y]=port(from,direction);
 const queue=[{x,y,entry:(direction+2)%4,previous:null}],seen=new Set();
 for(let i=0;i<queue.length;i++){
  const step=queue[i],key=(step.y*width+step.x)*4+step.entry;
  if(seen.has(key)||!canUse(step.x,step.y))continue;
  seen.add(key);
  const existing=cell(step.x,step.y);
  if(existing&&(!['belt','fast','express'].includes(existing.t)||existing.r==step.entry))continue;
  for(const d of existing?[existing.r]:[0,1,2,3]){
   if(d==step.entry)continue;
   const nx=step.x+DX[d],ny=step.y+DY[d],next=cell(nx,ny);
   const completed={x:step.x,y:step.y,r:d,t:existing?.t||'belt',base:[1,1],existing,previous:step.previous};
   if(next===to){
    const entry=(d+2)%4;
    if(!canEnter(to,entry))continue;
    const rows=[];
    for(let row=completed;row;row=row.previous)rows.push(row);
    const preview=validate(rows.reverse());
    if(!preview.error||preview.error=='Nicht genug Geld.')return preview;
   }
   if(!next||['belt','fast','express'].includes(next.t))queue.push({x:nx,y:ny,entry:(d+2)%4,previous:completed});
  }
 }
 return null;
}

 return {dimensions,footprint,port,floorRoute,planRoute};
})();
