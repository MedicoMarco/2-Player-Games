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
function industrialArea(plots,{width,height,usable,protectedTile,apron=4,corridor=1,previous,yards=[]}){
 const tiles=previous?previous.slice():new Uint8Array(width*height);
 const inside=(x,y)=>x>=0&&y>=0&&x<width&&y<height;
 const get=(x,y)=>inside(x,y)?tiles[y*width+x]:0;
 function stamp(x,y,site,connector=false){
  if(!inside(x,y)||!usable(x,y,site))return;
  const protectedGround=protectedTile(x,y);
  if((!protectedGround||connector)&&tiles[y*width+x]!==1)tiles[y*width+x]=protectedGround?2:1;
 }
 for(const {rect:[left,top,right,bottom],site} of plots){
  for(let y=top-apron;y<=bottom+apron;y++)for(let x=left-apron;x<=right+apron;x++){
   if(x>=left&&x<=right&&y>=top&&y<=bottom&&inside(x,y))tiles[y*width+x]=1;
   else stamp(x,y,site);
  }
 }
 for(const {rect:[left,top,right,bottom],site} of yards){
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)stamp(x,y,site,true);
 }
 // Join plots at their closest sides and pave the surrounding transport lanes.
 function facing(a,b){
  if(a[1]<b[0])return [a[1],b[0]];
  if(b[1]<a[0])return [a[0],b[1]];
  const overlap=Math.floor((Math.max(a[0],b[0])+Math.min(a[1],b[1]))/2);
  return [overlap,overlap];
 }
 const links=[];
 for(let i=0;i<plots.length;i++)for(let j=i+1;j<plots.length;j++){
  const a=plots[i],b=plots[j];
  if(a.site!==b.site)continue;
  const [x0,x1]=facing([a.rect[0],a.rect[2]],[b.rect[0],b.rect[2]]);
  const [y0,y1]=facing([a.rect[1],a.rect[3]],[b.rect[1],b.rect[3]]);
  links.push({i,j,from:[x0,y0],to:[x1,y1],length:Math.abs(x0-x1)+Math.abs(y0-y1),site:a.site});
 }
 const joined=plots.map((_,index)=>index);
 function root(index){while(joined[index]!==index)index=joined[index];return index}
 for(const {i,j,from,to,site} of links.sort((a,b)=>a.length-b.length)){
  const a=root(i),b=root(j);
  if(a===b)continue;
  const route=floorRoute(from,to,width,(x,y)=>inside(x,y)&&usable(x,y,site));
  if(!route.length)continue;
  joined[b]=a;
  for(const [x,y] of route)for(let dy=-corridor;dy<=corridor;dy++)for(let dx=-corridor;dx<=corridor;dx++){
   if(get(x+dx,y+dy)!==1)stamp(x+dx,y+dy,site,true);
  }
 }
 const slabs=[],curbs=[],crossings=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const kind=get(x,y);
  if(kind===2){crossings.push([x,y]);continue}
  if(kind!==1)continue;
  if(get(x-1,y)!==1){
   let stop=x+1;
   while(get(stop,y)===1)stop++;
   slabs.push([x,y,stop-x]);
   curbs.push([x,y,x,y+1]);
  }
  if(get(x+1,y)!==1)curbs.push([x+1,y,x+1,y+1]);
  if(get(x,y-1)!==1)curbs.push([x,y,x+1,y]);
  if(get(x,y+1)!==1)curbs.push([x,y+1,x+1,y+1]);
 }
 return {get,slabs,curbs,crossings,tiles};
}
function planRoute(from,to,{width,cell,canUse,canEnter,canLeave,validate}){
 const direction=from.r,[x,y]=port(from,direction);
 const queue=[{x,y,entry:(direction+2)%4,previous:null}],seen=new Set();
 for(let i=0;i<queue.length;i++){
  const step=queue[i],key=(step.y*width+step.x)*4+step.entry;
  if(seen.has(key)||!canUse(step.x,step.y))continue;
  seen.add(key);
  const existing=cell(step.x,step.y);
  if(existing&&(!['belt','fast','express'].includes(existing.t)||existing.r==step.entry))continue;
  for(const d of existing?[existing.r]:[0,1,2,3]){
   if(d==step.entry||existing&&!canLeave(existing,d))continue;
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

 return {dimensions,footprint,port,floorRoute,industrialArea,planRoute};
})();
