/* Distances, road lanes and the map use tiles. Canvas scaling happens at the paint boundary. */
function createFactoryTerrain(c,tile,columns,rows,bunker,{rr,withState,polygon,line,oval},{depths:[north,south],east}){
 const total=north+south;
 const landscapeX=x=>x+east*Math.max(0,Math.min(1,(x-21)/59));
 const landscapePoint=([x,y])=>[landscapeX(x),y];
 const junction={
  motorWest:[-4.1,-2.36],motorEast:[145.8,5.73],westMerge:[1.4,-2.05],eastMerge:[152.3,5.42],
  westService:[-4.35,7.8],eastService:[146.9,13.3],westSouth:[-4.3,64.7+total],eastSouth:[146.2,65.1],
  plantNorth:[80.88,18.16+.5*north],plantSouth:[80.88,40.5+north+.5*south],southGate:[82.05,64.4+total],labJunction:[108.6,32.2],portJunction:[109.2,43.25],
  portSouth:[110.6,65.1]
 };
 const j=junction,gateX=(bunker[0]+bunker[2]+1)/2+.06,gateY=bunker[1]+(bunker[3]-bunker[1]+1)*.719;
 const roads=[
  {id:'motor',w:2.66,path:[[-40,-5],[-14,-3],j.motorWest,j.westMerge,[14.8,-1.75],[27.5,-2.3],[45.7,-1.85],[58,-1.75],[71.7,-2.25],[80.6,-1.88],[96,.46],[109.9,.25],[125.8,4.35],j.motorEast,j.eastMerge,[159.6,1.4],[175.4,-1.44],[201,-2.5]]},
  {id:'west',w:1.28,path:[[-9,-21],[-5.7,-11],[-4.8,-5.7],j.motorWest,j.westService,[-3.4,17.2],[-1.63,26],[-1.51,34.2],[-2.21,41.1],[-5.2,48.1],[-3.75,54+north],j.westSouth,[-6.3,73.4+total],[-1.2,83.5+total]]},
  {id:'east',w:1.27,path:[j.motorEast,j.eastService,[146.55,23.4],[145.4,32.8],[147.3,40.6],[145.6,53],j.eastSouth,[149.2,76.4]]},
  {id:'ring',w:1.57,path:[[-28,59.3+total],[-16,62.1+total],j.westSouth,[8.6,65.3+total],[24.6,63.85+total],[47.2,64.4+total],[63.2,63.65+total],j.southGate,[98.2,64.2+0.4*total],j.portSouth,[129.5,66.1],j.eastSouth,[157.9,67.1],[169.2,63.4]]},
  {id:'westRamp',w:.76,path:[j.westService,[-3.15,5.6],[-1.95,2.6],[-.95,-.14],j.westMerge]},
  {id:'eastRamp',w:.76,path:[j.eastService,[148.52,10.9],[150.4,8.1],j.eastMerge]},
  {id:'north',w:.77,freight:true,path:[[11.7,18.1+.5*north],[25.3,17.9+.5*north],[39.6,18.1+.5*north],[57.5,18.4+.5*north],[68.3,18.3+.5*north],j.plantNorth]},
  {id:'south',w:.81,freight:true,path:[[12.7,40.4+north+.5*south],[26,40.2+north+.5*south],[42.4,40.6+north+.5*south],[56.7,40.4+north+.5*south],[70.7,40.35+north+.5*south],j.plantSouth]},
  {id:'trunk',w:1.03,freight:true,path:[j.plantNorth,[80.92,27.7+north],[80.91,32.45+north],j.plantSouth,[82.02,42.5+north+.6*south],[82.27,48.2+north+.7*south],[82.22,55.8+north+.8*south],j.southGate]},
  {id:'annex',w:.84,freight:true,path:[j.labJunction,[105.1,32],[99.7,32.3],[92,32.65],[87,34.4],j.plantSouth]},
  {id:'port',w:.85,freight:true,path:[j.labJunction,[109,37.9],j.portJunction,[115.4,43.36],[123.9,44],[132.8,44.18]]},
  {id:'eastLink',w:.85,freight:true,path:[j.portJunction,[109.4,51.2],[109.9,57.7],j.portSouth]},
  {id:'bunker',w:1.39,freight:true,path:[j.southGate,[79.6,63.4+total],[76.2,63.15+total]]}
 ];
 const outlets={
  gar:['north',1],met:['north',1],elk:['north',1],nor:['annex',1],prt:['port',1],
  vrs:['south',1],ene:['south',1],fzg:['south',1],hit:['south',-1],bnk:['south',-1],lab:['annex',-1]
 };
 const waterways=[
  {w:1.12,path:[[-12,-20],[-11.7,-10.7],[-13.2,-4],[-8.75,2.45],[-7.35,7.55],[-3.7,12.2],[-2.35,16.9],[-4.35,21],[-8.25,24.45],[-10,29.3]]},
  {w:2.65,path:[[122,-18],[115.7,-8],[111.4,1.45],[113.05,9.3],[111.3,17.6],[113.15,24.8],[112.2,32],[113.01,40.25],[115.8,48.9],[118.7,56.1],[120.7,64.4],[127.9,78]]},
  {w:1.04,path:[[-11.5,34.3],[-9.5,40.55],[-6.55,45.6],[-4.57,50.95],[-6.6,56.6+north],[-3.72,61.4+total],[1.8,66.2+total],[6.8,68.1+total],[12.6,68.4+total]]}
 ];
 const lakes=[
  {x:-11.1,y:32.4,shore:[[-19,25],[-14,22],[-8,22.6],[-3.61,25.5],[-3.6,29.3],[-2.75,33.2],[-4.7,37.9],[-10,41.4],[-15.3,40.1],[-21,37.8],[-23.2,31.9],[-21.9,27.3]]},
  {x:122.3,y:56.2,fish:true,shore:[[113.4,48.6],[117.6,48.2],[124.9,49.05],[131.3,52.95],[132.8,57.5],[130.9,62.2],[126.8,65],[120.7,66],[114.3,62.8],[112.1,56.7]]},
  {x:12.9,y:69.9+total,shore:[[9.5,68.1],[12,66.5],[15,67.12],[16.4,69.9],[14.5,72.4],[10.8,71.8]].map(([x,y])=>[x,y+total])},
  {x:8.5,y:-7.1,shore:[[3.9,-8.25],[6.26,-11.6],[9.4,-12],[14.5,-9.6],[14.2,-6.8],[11.3,-4.4],[8.65,-4.7],[5.7,-4.75]]}
 ];
 const woods=[
  [5.1,9.4,3.7,8.2,.8],[24,4.8,4.65,11,.75],[44,10,16,9,.57],[67,7,9,13,.83],
  [23,31,9,12,.91],[50,32,12.4,11,.63],[73,27,15,12,.82],[93,45,11,7,.76],
  [117,12,16,14,.91],[134,28,12,13,.65],[89,10,15,10,.88],[18,57,15,9,.76],[59,59,12,8,.89]
 ];
 const fields=[
  {shape:[[6.5,12.1],[12,11.9],[14.3,14.7],[11.6,16.3],[6.2,15.8],[5.75,14.3]],color:'#a7a26e',stripes:'#d5ca9460',angle:.19},
  {shape:[[15.4,13.2],[22.1,13.6],[24.6,15.9],[23.25,17.1],[15.4,16.2]],color:'#8d9761',stripes:'#b8bf856d',angle:.12},
  {shape:[[36.3,43.3],[43.9,42.8],[46.9,47.1],[45.5,50.2],[37.5,48.9],[33.9,46.6]],color:'#978764',stripes:'#dfba886b',angle:.29},
  {shape:[[88.2,25.12],[95.4,25.9],[104.1,24.62],[105.2,28.28],[101.7,31.15],[89.2,30.42]],color:'#b0a374',stripes:'#ddd09c67',angle:-.15}
 ];
 for(const road of roads)road.path=road.path.map(landscapePoint);
 roads.at(-1).path.push([gateX,61.25+total],[gateX,gateY]);
 for(const stream of waterways)stream.path=stream.path.map(landscapePoint);
 for(const lake of lakes){lake.x=landscapeX(lake.x);lake.shore=lake.shore.map(landscapePoint)}
 for(const wood of woods)wood[0]=landscapeX(wood[0]);
 for(const field of fields)field.shape=field.shape.map(landscapePoint);
 const palettes=[
  ['#30483b','#4a694a','#658252','#8c9f61'],['#253e39','#3c5b4f','#587961','#7d9a73'],
  ['#43553c','#5d7546','#839256','#9f9e63'],['#554c38','#75613d','#917547','#bca167']
 ];
 const hash=(x,y,n=0)=>{
  const seed=Math.imul(x+53,374761393)+Math.imul(y+71,668265263)+Math.imul(n,1274126177);
  const bits=Math.imul(seed^seed>>>15,2246822519);
  return ((bits^bits>>>13)>>>0)/4294967296;
 };
 const between=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
 const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const key=p=>p.join(',');
 function pathBounds(points){
  return points.reduce(([minX,minY,maxX,maxY],[x,y])=>[
   Math.min(minX,x),Math.min(minY,y),Math.max(maxX,x),Math.max(maxY,y)
  ],[Infinity,Infinity,-Infinity,-Infinity]);
 }
 function pathVisible({bounds:[x,y,lastX,lastY],w},visible){
  return visible(x-w,y-w,lastX-x+2*w,lastY-y+2*w);
 }
 function rounded(path,r=.64){
  const result=[path[0]];
  for(let i=1;i<path.length-1;i++){
   const a=path[i-1],b=path[i],d=path[i+1];
   const first=between(b,a,Math.min(.36,r/(length(a,b)||1))),last=between(b,d,Math.min(.36,r/(length(b,d)||1)));
   result.push(first,between(between(first,b,.5),between(b,last,.5),.5),last);
  }
  result.push(path.at(-1));
  return result;
 }
 function shape(points,color){
  c.beginPath();
  for(let i=0;i<points.length;i++){
   const previous=points[(i+points.length-1)%points.length],vertex=points[i],next=points[(i+1)%points.length];
   const start=between(previous,vertex,.5),end=between(vertex,next,.5);
   if(!i)c.moveTo(...start);
   c.quadraticCurveTo(...vertex,...end);
  }
  c.closePath();c.fillStyle=color;c.fill();
 }
 function projection(path,x,y){
  let best=null;
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1];
   const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));
   const point=between(a,b,t),dist=(x-point[0])**2+(y-point[1])**2;
   if(!best||dist<best.dist)best={a,b,point,dist,segment:i};
  }
  return best;
 }
 function nearPath({paint,bounds:[left,top,right,bottom]},x,y,radius){
  if(x<left-radius||x>right+radius||y<top-radius||y>bottom+radius)return false;
  for(let i=1;i<paint.length;i++){
   const [a,b]=paint[i-1],[u,v]=paint[i],dx=u-a,dy=v-b;
   const t=Math.max(0,Math.min(1,((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy||1)));
   if((x-a-t*dx)**2+(y-b-t*dy)**2<radius*radius)return true;
  }
  return false;
 }
 function crossing(a,b,p,q){
  const rx=b[0]-a[0],ry=b[1]-a[1],sx=q[0]-p[0],sy=q[1]-p[1],x=p[0]-a[0],y=p[1]-a[1];
  const divisor=rx*sy-ry*sx;
  if(Math.abs(divisor)<.00001)return null;
  const t=(x*sy-y*sx)/divisor,u=(x*ry-y*rx)/divisor;
  return t>=0&&t<=1&&u>=0&&u<=1?between(a,b,t):null;
 }
 function measured(path){
  const points=path.filter((p,i)=>!i||length(path[i-1],p)>.0001),at=[0];
  for(let i=1;i<points.length;i++)at.push(at[i-1]+length(points[i-1],points[i]));
  return {points,at,distance:at.at(-1)};
 }
 function sample(route,distance){
  const i=route.at.findIndex((value,i)=>i>0&&value>=distance);
  const position=i>0?i:route.at.length-1;
  const a=route.points[position-1],b=route.points[position],segment=route.at[position]-route.at[position-1];
  const t=Math.max(0,Math.min(1,(distance-route.at[position-1])/segment));
  const [x,y]=between(a,b,t),angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
  return {x,y,angle};
 }
 function offsetPath(points,side){
  return points.map(([x,y],i)=>{
   const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],span=length(a,b)||1;
   return [x-(b[1]-a[1])*side/span,y+(b[0]-a[0])*side/span];
  });
 }
 const riverArt=waterways.map(stream=>{
  const paint=rounded(stream.path,2.4),w=stream.w;
  return {w,paint,bounds:pathBounds(paint),bright:offsetPath(paint,-w*.12),ripples:[offsetPath(paint,w*.24),offsetPath(paint,-w*.32)]};
 });
 for(const road of roads){
  road.paint=rounded(road.path,.82);road.bounds=pathBounds(road.paint);
 }
 function protectedTile(x,y){
  const u=x+.5,v=y+.5;
  if(riverArt.some(river=>nearPath(river,u,v,river.w/2+.38)))return true;
  return lakes.some(({shore})=>{
   let hit=false;
   for(let i=0,j=shore.length-1;i<shore.length;j=i++){
    const [a,b]=shore[i],[p,q]=shore[j];
    if((b>v)!==(q>v)&&u<(p-a)*(v-b)/(q-b)+a)hit=!hit;
   }
   return hit;
  });
 }
 const motorway=roads[0],roadById=new Map(roads.map(road=>[road.id,road]));
 const freightRoads=roads.filter(road=>road.freight);
 const roadLayers=[[.33,'#877f68'],[.16,'#a6a18a'],[0,'#565e59'],[-.17,'#41494b']];
 const doubleLane=[-.83,-.44,.44,.83].map(offset=>measured(offsetPath(motorway.paint,offset)));
 const motorMarkings=[-1.17,-.18,.18,1.17,-.67,.67].map(offset=>offsetPath(motorway.paint,offset));
 const streetTraffic=roads.filter(road=>['west','east','ring','westRamp','eastRamp'].includes(road.id)).map(road=>measured(road.paint));
 const bridges=[];
 for(const road of roads)for(const river of riverArt)for(let i=1;i<road.paint.length;i++)for(let k=1;k<river.paint.length;k++){
  const a=road.paint[i-1],b=road.paint[i],center=crossing(a,b,river.paint[k-1],river.paint[k]);
  if(!center||bridges.some(bridge=>length(bridge.center,center)<2))continue;
  const m=length(a,b),ux=(b[0]-a[0])/m,uy=(b[1]-a[1])/m,span=river.w*.68+.51;
  const [x,y]=center;
  const ends=[[x-ux*span,y-uy*span],[x+ux*span,y+uy*span]];
  bridges.push({center,edges:[offsetPath(ends,-road.w*.55),offsetPath(ends,road.w*.55)]});
 }

 // Shortest roads to the construction entrance. Shared junction coordinates connect the lanes.
 const nodes=new Map();
 function link(a,b){
  const name=key(a);
  if(!nodes.has(name))nodes.set(name,{point:a,links:[]});
  nodes.get(name).links.push({to:key(b),distance:length(a,b)});
 }
 for(const {path} of roads)for(let i=1;i<path.length;i++){
  link(path[i-1],path[i]);link(path[i],path[i-1]);
 }
 const finish=key([gateX,gateY]),costs=new Map([[finish,0]]),toward=new Map(),settled=new Set();
 while(settled.size<nodes.size){
  let best=Infinity,current=null;
  for(const [name,distance] of costs)if(distance<best&&!settled.has(name)){best=distance;current=name}
  if(!current)break;
  settled.add(current);
  for(const {to,distance} of nodes.get(current).links){
   if(best+distance>=(costs.get(to)??Infinity))continue;
   costs.set(to,best+distance);toward.set(to,current);
  }
 }
 function driveway(id,rect){
  const access=outlets[id];
  if(!access)return null;
  const [roadId,side]=access,[left,top,right,bottom]=rect,road=roadById.get(roadId);
  const x=(left+right+1)/2,y=side===1?bottom+1:top;
  const approach=[x,y+side*.6],merge=projection(road.path,x,y);
  const route=rounded([[x,y],approach,merge.point],.52);
  const gate=sample(measured(route),1.25);
  return {x,y,side,merge,route,gate};
 }
 function deliveryRoute(start,drive,passage=[],yardDrives=[]){
  let add=drive?.merge,path=drive?[...(passage.length?passage:[start]),...drive.route]:[start];
  if(!drive){
   add=freightRoads.map(road=>projection(road.path,...start)).sort((a,b)=>a.dist-b.dist)[0];
   const gate=yardDrives.map(exit=>({...projection(exit.route,...start),exit})).sort((a,b)=>a.dist-b.dist)[0];
   if(gate&&gate.dist<add.dist){
    add=gate.exit.merge;
    path.push(gate.point,...gate.exit.route.slice(gate.segment));
   }else path.push(add.point);
  }
  let current=key(length(add.point,add.a)+costs.get(key(add.a))<=length(add.point,add.b)+costs.get(key(add.b))?add.a:add.b);
  while(current){
   path.push(nodes.get(current).point);
   current=toward.get(current);
  }
  return measured(rounded(path,.46));
 }
 const spots=[];
 for(let row=-13;row<(rows+24)/1.92;row++)for(let col=-13;col<(columns+24)/1.92;col++){
  const x=(col+hash(col,row,1))*1.92,y=(row+hash(col,row,2))*1.92,weight=hash(col,row,3);
  if(weight<.13||roads.some(road=>nearPath(road,x,y,road.w/2+.63)))continue;
  if(riverArt.some(stream=>nearPath(stream,x,y,stream.w*.51+.22)))continue;
  if(lakes.some(lake=>Math.hypot((x-lake.x)/1.35,y-lake.y)<8.6))continue;
  const forest=woods.some(([a,b,w,h])=>((x-a)/w)**2+((y-b)/h)**2<1);
  spots.push({x,y,kind:weight>(forest?.35:.81)?'tree':weight>.69?'rock':'grass',
   size:.19+hash(col,row,4)*.43,style:Math.floor(hash(col,row,5)*4),wave:hash(col,row,6)*6});
 }
 const relief=woods.map(([x,y,w,h,reveal],i)=>{
  const outline=Array.from({length:14},(_,k)=>{
   const a=k*Math.PI/7,jitter=.82+hash(i,k,9)*.31;
   return [x+Math.cos(a)*w*jitter,y+Math.sin(a)*h*jitter];
  });
  return {x,y,w,h,reveal,outline};
 });
 function tree({x,y,size:r,style,wave},time,detail){
  const [dark,base,light,highlight]=palettes[style],wind=detail?Math.sin(time*.83+wave)*.035:0;
  oval(x+r*.51,y+r*.48,r*1.27,r*.73,'#193d304d',.54);
  if(!detail){polygon([[x-r,y+r*.22],[x-r*.61,y-r*.56],[x+r*.23,y-r*.84],[x+r,y+r*.04],[x+r*.57,y+r*.68],[x-r*.3,y+r*.73]],base);return}
  rr(x-r*.11,y-.09,r*.21,r*.74,r*.06,'#574d36');
  if(style===1||style===2){
   for(let i=0;i<3;i++){
    const tip=y-r*(1.68-i*.36),w=r*(.43+i*.2),mid=x+wind*(3-i);
    polygon([[mid,tip],[x+w,tip+r*1.44],[x+w*.37,tip+r*1.49],[x-w,tip+r*1.26]],i===2?dark:base);
    polygon([[mid,tip],[x-w*.68,tip+r*1.16],[x+w*.13,tip+r*.97]],i===2?base:light);
   }
  }else{
   const canopy=[[x-r,y+r*.16],[x-r*.91,y-r*.44],[x-r*.28,y-r*.71],[x+wind,y-r*1.06],[x+r*.63,y-r*.81],
    [x+r,y-r*.32],[x+r*.96,y+r*.19],[x+r*.53,y+r*.55],[x-r*.14,y+r*.63],[x-r*.72,y+r*.42]];
   shape(canopy,dark);
   shape(canopy.map(([a,b])=>[x+(a-x)*.91-r*.08+wind,y+(b-y)*.68-r*.31]),base);
   shape(canopy.slice(1,7).map(([a,b])=>[x+(a-x)*.64-r*.12+wind,y+(b-y)*.57-r*.25]),light);
   polygon([[x-r*.62,y-r*.59],[x-r*.21,y-r*.85],[x+r*.04,y-r*.69],[x-r*.37,y-r*.51]],highlight);
  }
 }
 function paintFields(visible){
  for(const {shape:vertices,color,stripes,angle} of fields){
   const [x,y]=vertices[0];
   if(!visible(x-4,y-4,18,14))continue;
   withState(()=>{
    polygon(vertices,color);c.clip();c.translate(x,y);c.rotate(angle);
    c.beginPath();
    for(let i=-13;i<30;i++){const y=i*.21;c.moveTo(-7,y);c.lineTo(17,y)}
    c.strokeStyle=stripes;c.lineWidth=.067;c.stroke();
   });
  }
 }
 let drawnFish=null;
 const fishLake=()=>{const lake=lakes.find(l=>l.fish);return [lake.x*tile,lake.y*tile]};
 const fishPosition=()=>drawnFish;
 function paintWater(visible,time,detail){
  drawnFish=null;
  for(const stream of riverArt){
   if(!pathVisible(stream,visible))continue;
   const {w,paint,bright,ripples}=stream;
   line(paint,w+.64,'#8f9066');line(paint,w+.29,'#c7be91');
   line(paint,w,'#315e65');line(bright,w*.66,'#4d8990');
   if(detail){
    c.setLineDash([.86,1.35]);c.lineDashOffset=-time*.23;
    line(ripples[0],.03,'#c4e0cf82');line(ripples[1],.041,'#c5dfca86');
    c.setLineDash([]);c.lineDashOffset=0;
   }
  }
  for(const {x,y,shore,fish} of lakes){
   if(!visible(x-14,y-13,28,26))continue;
   shape(shore,'#b8ab7d');
   shape(shore.map(([a,b])=>[x+(a-x)*.951,y+(b-y)*.95]),'#5e9999');
   const water=c.createLinearGradient(x-7,y-8,x+4,y+9);
   water.addColorStop(0,'#326c78');water.addColorStop(.55,'#397b85');water.addColorStop(1,'#589197');
   shape(shore.map(([a,b])=>[x+(a-x)*.87,y+(b-y)*.88]),water);
   if(fish)paintLakeFish(x,y,time);
   if(detail)for(let i=0;i<15;i++){
    const u=x+(hash(i,x|0,8)-.5)*7,v=y+(hash(i,y|0,9)-.5)*6,d=1+Math.sin(time*.45+i)*.3;
    if(!visible(u,v,1.5,.1))continue;
    line([[u,v],[u+d,v-.07],[u+d*1.37,v]],.027,'#c7e4dc6b');
   }
  }
 }
 function paintDreimacsHead(){
  const skin=c.createLinearGradient(-.25,.17,.14,-.25);
  skin.addColorStop(0,'#9e6359');skin.addColorStop(.38,'#d4957e');
  skin.addColorStop(.67,'#e9b39a');skin.addColorStop(1,'#be8371');
  c.beginPath();
  c.moveTo(-.014,-.374);
  c.quadraticCurveTo(.044,-.285,.133,-.167);
  c.bezierCurveTo(.219,-.06,.291,.069,.268,.156);
  c.quadraticCurveTo(.208,.247,-.029,.237);
  c.quadraticCurveTo(-.249,.237,-.285,.14);
  c.bezierCurveTo(-.293,.046,-.186,-.114,-.014,-.374);
  c.closePath();c.fillStyle=skin;c.fill();
  c.strokeStyle='#734d42';c.lineWidth=.014;c.stroke();

  // Soft cheek shadows and the highlights along the narrow forehead and long nose.
  oval(-.202,.096,.059,.095,'#9c595557',.37);
  oval(.189,.102,.052,.084,'#a25d5570',-.48);
  oval(-.123,.087,.074,.046,'#edaa9880',-.62);
  oval(.122,.071,.061,.044,'#f2b59a68',.54);
  line([[-.025,-.302],[-.041,-.224],[-.057,-.177]],.016,'#eac1a47a');
  line([[-.032,-.112],[-.041,-.014],[-.039,.056],[-.056,.087]],.02,'#9d5f55a1');
  line([[-.013,-.115],[.001,-.025],[.008,.046],[.021,.068]],.022,'#f4bd9db8');

  for(const side of [-1,1]){
   const eye=side*.09,tilt=side*.13;
   oval(eye,-.025,.057,.068,'#8b514966',tilt);
   line([[eye-side*.049,-.07],[eye-side*.02,-.092],[eye+side*.02,-.097],[eye+side*.052,-.08]],.017,'#6b433b');
   oval(eye,-.016,.033,.046,'#f2dbce',tilt);
   line([[eye-.03,-.024],[eye-.014,-.052],[eye+.013,-.052],[eye+.03,-.026]],.011,'#633e38');
   oval(eye+.002,-.011,.021,.032,'#78584e',tilt);
   oval(eye+.002,-.011,.012,.023,'#241c20',tilt);
   oval(eye-.004,-.024,.007,.008,'#fff2dd',0);
   line([[side*.035,.069],[side*.085,.093],[side*.145,.121]],.015,'#7947478c');
  }
  oval(-.022,.072,.015,.009,'#7c4841',-.25);
  oval(.030,.074,.014,.009,'#8b5147',.23);
  oval(.003,.143,.118,.032,'#884b53',.03);
  polygon([[-.109,.135],[-.039,.117],[.006,.123],[.045,.115],[.117,.145],[.026,.151],[-.047,.148]],'#653a46');
  line([[-.047,.139],[-.006,.143],[.037,.141]],.009,'#ebc9b6');
  oval(.012,.164,.066,.012,'#d8928f',.05);
  oval(-.005,.196,.079,.017,'#edb09866',-.025);
 }
 function paintLakeFish(x,y,time){
  const phase=time*.52,px=x+Math.cos(phase)*1.15,py=y+Math.sin(phase)*.62;
  drawnFish=[px*tile,py*tile];
  withState(()=>{
   c.translate(px,py);
   // Head, body and tail share a heading. Only the name tag faces the screen.
   withState(()=>{
    c.rotate(Math.atan2(Math.cos(phase)*.62,-Math.sin(phase)*1.15));
    const wag=Math.sin(time*6)*.055;
    polygon([[-.23,0],[-.54,-.17+wag],[-.49,.004+wag],[-.51,.16+wag]],'#b3764e');
    line([[-.48,-.116+wag],[-.32,-.032]],.014,'#e6b577');
    line([[-.47,.096+wag],[-.32,.028]],.012,'#d8a266');
    oval(-.137,.025,.282,.153,'#28546172',0);
    const scales=c.createLinearGradient(0,-.15,0,.14);
    scales.addColorStop(0,'#9f6448');scales.addColorStop(.48,'#db9d62');scales.addColorStop(1,'#e8c698');
    oval(-.135,0,.279,.14,scales,0);
    polygon([[-.276,-.078],[-.212,-.193],[-.093,-.112]],'#b87a56');
    oval(-.236,.069,.093,.033,'#a76c4d',-.35);
    for(const fin of [-.3,-.24,-.18,-.12]){
     line([[fin-.023,-.025],[fin+.012,0],[fin-.008,.026]],.009,'#965f435f');
    }
    c.translate(.24,0);
    c.rotate(Math.PI/2);
    paintDreimacsHead();
   });
   rr(-.58,-.96,1.16,.26,.025,'#101014bc');
   c.font='700 .18px monospace';c.textAlign='center';c.textBaseline='middle';
   c.fillStyle='#131319';c.fillText('Dreimacs',.018,-.812);
   c.fillStyle='#fff';c.fillText('Dreimacs',0,-.83);
  });
 }
 function paintRoads(drives,visible,detail){
  const active=roads.filter(road=>pathVisible(road,visible));
  const paving=[...active.map(road=>({path:road.paint,w:road.w})),...drives.map(drive=>({path:drive.route,w:.67}))];
  for(const [extra,color] of roadLayers){
   for(const {path,w} of paving)line(path,w+extra,color);
  }
  if(active.includes(motorway)){
   line(motorway.paint,.17,'#9b9f72');
   for(const trace of motorMarkings.slice(0,4))line(trace,.021,'#e1ddc2af');
  }
  c.setLineDash([.36,.43]);
  if(active.includes(motorway))for(const trace of motorMarkings.slice(4))line(trace,.023,'#e4e6d0bc');
  for(const road of active)if(road.freight||road.id==='ring')line(road.paint,.032,'#ddc98a');
  for(const drive of drives)line(drive.route,.03,'#e1c47bba');
  c.setLineDash([]);
  for(const [x,y] of [j.motorWest,j.motorEast]){
   if(!visible(x-2,y-2,4,4))continue;
   for(const side of [-1,1]){
    const edge=[[x-1.19,y+side*1.41],[x+1.25,y+side*1.41]];
    line(edge,.15,'#73796d');line(edge,.052,'#c7c9ae');
    if(detail)for(const pos of [.04,.3,.7,.96]){
     const [a,b]=between(...edge,pos);rr(a-.067,b-.07,.134,.14,.026,'#e1d0ab');
    }
   }
  }
  for(const {center:[x,y],edges} of bridges){
   if(!visible(x-4,y-4,8,8))continue;
   for(const edge of edges){
    line(edge,.09,'#444f4d');line(edge,.037,'#d4c8a9');
    if(detail)for(const t of [0,.24,.49,.73,1]){
     const [a,b]=between(...edge,t);rr(a-.063,b-.065,.126,.13,.021,'#bdb39b');
    }
   }
  }
  for(const {gate} of drives)paintFreightGate(gate,detail);
  if(visible(gateX-1,bunker[3]+1,2,1.3))paintFreightGate({x:gateX,y:bunker[3]+1.7,angle:-Math.PI/2},detail);
 }
 function paintFreightGate({x,y,angle},detail){
  withState(()=>{
   c.translate(x,y);c.rotate(angle+Math.PI/2);
   for(const side of [-.61,.61]){
    rr(side-.18,-.21,.36,.51,.07,'#303a3e');
    rr(side-.12,-.22,.24,.31,.05,'#c7a86c');
    rr(side-.076,-.086,.152,.076,.022,'#e3cf93');
   }
   line([[-.48,.21],[.48,.21]],.085,'#dbbd7b');
   if(!detail)return;
   if(Math.cos(angle+Math.PI/2)<0)c.rotate(Math.PI);
   rr(-.51,-.27,1.02,.28,.05,'#334e56');
   c.font='800 .19px system-ui';c.fillStyle='#ffe2a4';c.textAlign='center';
   c.fillText('ARCHE',0,-.065,.89);
  });
 }
 function vehicle(x,y,angle,color,kind,detail){
  withState(()=>{
   c.translate(x,y);c.rotate(angle);
   const truck=kind==='truck'||kind==='freight',van=kind==='van';
   const length=truck?1.36:van ? .95 : .8,width=truck ? .40 : .34,end=length/2;
   rr(-end+.065,-width/2+.055,length,width,.085,'#14252786');
   if(detail){
    const axles=truck?[-.51,-.34,.49]:[-end+.15,end-.16];
    for(const axle of axles)for(const side of [-1,1]){
     rr(axle-.075,side*width/2-.038,.15,.076,.021,'#202729');
    }
   }
   if(truck){
    rr(-end,-.18,length,.36,.065,'#283537');
    const cargo=kind==='freight'?'#e4cc94':color;
    rr(-.675,-.194,.91,.388,.035,cargo);
    rr(.28,-.181,.397,.362,.061,color);
    if(detail){
     for(const y of [-.156,.132])rr(-.62,y,.79,.023,.008,'#fff7');
     for(const x of [-.48,-.27,-.06,.14])rr(x,-.14,.014,.28,.005,'#35414637');
     rr(.514,-.152,.075,.304,.027,'#3d5d66');
     rr(.334,-.122,.132,.244,.034,'#d7dcd482');
     if(kind==='freight')line([[-.596,-.10],[-.596,.10]],.028,'#675a3e');
    }
   }else if(van){
    rr(-end,-.175,length,.35,.073,color);
    if(detail){
     rr(-.426,-.133,.509,.266,.035,'#dedfd6ac');
     rr(.239,-.147,.067,.294,.021,'#2b5667');
     rr(-.29,-.13,.018,.26,.008,'#53626791');
    }
   }else{
    polygon([[-.38,-.103],[-.29,-.162],[.232,-.164],[.395,-.084],[.395,.084],[.232,.164],[-.29,.162],[-.38,.103]],color);
    if(detail){
     polygon([[-.233,-.117],[-.11,-.129],[.163,-.126],[.231,-.096],[.231,.096],[.163,.126],[-.11,.129],[-.233,.117]],'#365d6d');
     rr(-.128,-.099,.269,.198,.047,color);
     rr(-.119,-.082,.23,.032,.013,'#d5e9ec70');
     for(const y of [-.177,.153])rr(.125,y,.093,.023,.007,color);
    }
   }
   if(!detail)return;
   for(const side of [-1,1]){
    const yy=side*(width/2-.052);
    rr(end-.058,yy-.025,.054,.05,.012,'#fff0b5');
    rr(-end+.014,yy-.023,.037,.046,.009,'#ed7770');
   }
  });
 }
 function climate(l,t,r,b,time,visible,worldWidth){
  const cloud='#a9b5b3';
  const bands=[];
  if(l<0)bands.push([[0,0,-20,0],[l-1,t-1,1-l,b-t+2]]);
  if(r>worldWidth)bands.push([[worldWidth,0,worldWidth+20,0],[worldWidth,t-1,r-worldWidth+1,b-t+2]]);
  if(t<0)bands.push([[0,0,0,-19],[l-1,t-1,r-l+2,1-t]]);
  if(b>rows)bands.push([[0,rows,0,rows+20],[l-1,rows,r-l+2,b-rows+1]]);
  for(const [axis,rect] of bands){
   const fog=c.createLinearGradient(...axis);
   fog.addColorStop(0,'#aebfba00');fog.addColorStop(.38,'#aebfba75');fog.addColorStop(1,cloud);
   c.fillStyle=fog;c.fillRect(...rect);
  }
  for(let i=0;i<26;i++){
   const side=i%4,pos=hash(i,8,2),spread=3+hash(i,7,9)*7;
   const x=(side===0?-8:side===1?worldWidth+8:pos*worldWidth)+Math.sin(time*.031+i)*1.6;
   const y=(side===2?-6:side===3?rows+7:pos*rows)+Math.cos(time*.026+i)*1.2;
   if(!visible(x-spread,y-spread,spread*2,spread*2))continue;
   const haze=c.createRadialGradient(x,y,.23,x,y,spread);
   haze.addColorStop(0,'#dce4df47');haze.addColorStop(.49,'#ccd8ce38');haze.addColorStop(1,'#dce4df00');
   oval(x,y,spread,spread*.68,haze,.28);
  }
 }
 function paintIndustrial(area,spans,visible,detail){
  if(!spans.length)return;
  const curbs=area.curbs.filter(([x,y,a,b])=>visible(x-.4,y-.4,a-x+.8,b-y+.8));
  function curbTrace(){
   c.beginPath();
   for(const [x,y,a,b] of curbs){
    c.moveTo(x,y);c.lineTo(a,b);
   }
  }
  curbTrace();c.strokeStyle='#827e68';c.lineWidth=.34;c.stroke();
  c.strokeStyle='#aaa58e';c.lineWidth=.2;c.stroke();
  const concrete=c.createLinearGradient(0,0,columns*.49,rows);
  concrete.addColorStop(0,'#8a8e8d');concrete.addColorStop(.59,'#727d80');concrete.addColorStop(1,'#67737a');
  c.fillStyle=concrete;
  for(const [x,y,w] of spans)c.fillRect(x,y,w,1.015);
  if(detail){
   c.beginPath();
   for(const [x,y,w] of spans){
    if(y%4===0){c.moveTo(x,y+.028);c.lineTo(x+w,y+.028)}
    for(let panel=Math.floor(x/4);panel*4<x+w;panel++){
     const start=Math.max(x,panel*4),end=Math.min(x+w,panel*4+4);
     if(!visible(start,y,end-start,1))continue;
     const tone=hash(panel,Math.floor(y/4),11);
     c.fillStyle=tone<.32?'#333e4816':tone>.68?'#e7e5d821':'#eee9d609';
     c.fillRect(start,y,end-start,1.012);
     if(start===panel*4){c.moveTo(start+.025,y);c.lineTo(start+.025,y+1)}
     for(let i=start;i<end;i++){
      const value=hash(i,y,12),u=i+.13+hash(i,y,13)*.57,v=y+.17+hash(i,y,14)*.62;
      c.fillStyle=value>.45?'#dadfd924':'#444e5524';
      c.fillRect(u,v,.02+value*.046,.022);
      c.fillRect(i+.15+(1-value)*.55,y+.77-value*.54,.035,.02);
     }
     if(y%8!==2||panel%2!==0||panel*4+2<start||panel*4+2>=end)continue;
     const u=panel*4+2.35,v=y+.56;
     oval(u,v,.27,.25,'#4e5c6680',0);
     oval(u-.02,v-.025,.197,.18,'#778488',0);
     for(const offset of [-.085,0,.085]){
      c.fillStyle='#414e57b0';c.fillRect(u-.12,v+offset-.03,.21,.023);
     }
    }
   }
   c.strokeStyle='#39454e6b';c.lineWidth=.039;c.stroke();
   for(const [x,y,a,b] of curbs){
    if(hash(x,y,15)>.34)continue;
    const horizontal=y===b;
    const dx=horizontal?0:(area.get(x,y)===1?.18:-.18);
    const dy=horizontal?(area.get(x,y)===1?.18:-.18):0;
    withState(()=>{
     c.translate((x+a)/2+dx,(y+b)/2+dy);
     if(!horizontal)c.rotate(Math.PI/2);
     rr(-.31,-.073,.62,.146,.028,'#47535b');
     for(let n=-.24;n<=.25;n+=.08){c.fillStyle='#9ca5a3';c.fillRect(n,-.052,.021,.104)}
    });
   }
  }
  curbTrace();c.strokeStyle='#bec0b4';c.lineWidth=.067;c.stroke();
  if(detail){
   c.setLineDash([.38,1.38]);
   c.strokeStyle='#dfb86e';c.lineWidth=.046;c.stroke();
   c.setLineDash([]);
  }
 }
 function paintIndustrialCrossings(area,visible,detail){
  const visibleCrossings=area.crossings.filter(([x,y])=>visible(x,y,1,1));
  if(!visibleCrossings.length)return;
  c.fillStyle='#40515a51';
  for(const [x,y] of visibleCrossings)c.fillRect(x,y,1.01,1.01);
  c.beginPath();
  for(const [x,y] of visibleCrossings){
   if(area.get(x-1,y)===0){c.moveTo(x+.08,y);c.lineTo(x+.08,y+1)}
   if(area.get(x+1,y)===0){c.moveTo(x+.92,y);c.lineTo(x+.92,y+1)}
   if(area.get(x,y-1)===0){c.moveTo(x,y+.08);c.lineTo(x+1,y+.08)}
   if(area.get(x,y+1)===0){c.moveTo(x,y+.92);c.lineTo(x+1,y+.92)}
  }
  c.strokeStyle='#3d4c50';c.lineWidth=.105;c.stroke();
  if(detail){c.strokeStyle='#c6b483';c.lineWidth=.037;c.stroke()}
 }
 function terrain({left,top,right,bottom,intersects,detail,time,plots,occupied,industrial,worldWidth=columns}){
  withState(()=>{
   c.scale(tile,tile);
   const l=left/tile,t=top/tile,r=right/tile,b=bottom/tile;
   const ground=c.createLinearGradient(0,-12,columns*.39,rows+13);
   ground.addColorStop(0,'#848b7c');ground.addColorStop(.45,'#737d70');ground.addColorStop(1,'#536858');
   c.fillStyle=ground;c.fillRect(l-1,t-1,r-l+2,b-t+2);
   const visible=(x,y,w,h)=>intersects(x*tile,y*tile,w*tile,h*tile);
   const slabs=industrial.slabs.filter(([x,y,w])=>visible(x-.3,y-.3,w+.6,1.6));
   c.lineJoin=c.lineCap='round';
   for(const {x,y,w,h,reveal,outline} of relief){
    if(!visible(x-w-2,y-h-2,w*2+4,h*2+4))continue;
    shape(outline,'#496344'+Math.round(reveal*62).toString(16).padStart(2,'0'));
    shape(outline.map(([a,b])=>[x+(a-x)*.78-1.1,y+(b-y)*.72-1.1]),'#a8b3803b');
    shape(outline.map(([a,b])=>[x+(a-x)*.52-1.8,y+(b-y)*.53-2]),'#bac38b36');
   }
   if(detail)withState(()=>{c.globalAlpha=.34;paintFields(visible)});
   paintWater(visible,time,detail);
   paintIndustrial(industrial,slabs,visible,detail);
   const drives=plots.flatMap(plot=>plot.drive?[plot.drive]:[]);
   for(const prop of spots){
    const {x,y,kind,size,style}=prop;
    if(x<l-1||x>r+1||y<t-1||y>b+1)continue;
    if(x>=bunker[0]-1&&x<=bunker[2]+2&&y>=bunker[1]-1&&y<=bunker[3]+2)continue;
    if(industrial.get(Math.floor(x),Math.floor(y)))continue;
    if(occupied(Math.floor(x),Math.floor(y)))continue;
    if(kind==='tree'){
     // A trunk just outside the pavement can still put its canopy over the lot.
     const reach=size*1.8+.12;
     let overlaps=false;
     for(let row=Math.floor(y-reach);row<=Math.floor(y+reach)&&!overlaps;row++){
      for(let col=Math.floor(x-reach);col<=Math.floor(x+reach);col++){
       if(industrial.get(col,row)||occupied(col,row)){overlaps=true;break}
      }
     }
     if(overlaps)continue;
    }
    if(drives.some(d=>Math.abs(x-d.x)<1.17&&y>=Math.min(d.y,d.route.at(-1)[1])-.35&&y<=Math.max(d.y,d.route.at(-1)[1])+.35))continue;
    if(kind==='tree')tree(prop,time,detail);
    else if(detail&&kind==='rock'){
     polygon([[x-size,y+.06],[x-size*.61,y-size*.31],[x+size*.43,y-size*.49],[x+size,y],[x+size*.46,y+size*.25]],'#93977d');
     polygon([[x-size,y+.06],[x+size*.46,y+size*.25],[x+size,y],[x+size*.59,y+size*.39],[x-size*.5,y+size*.32]],'#566657');
    }else if(detail){
     const stem=style%2?'#b4b98790':'#cbd09a63';
     line([[x-.07,y+.1],[x-.15,y-.12],[x+.05,y+.07],[x+.11,y-.19],[x+.19,y+.08]],.025,stem);
    }
   }
   const nearbyDrives=drives.filter(({route,x,y})=>visible(x-2,Math.min(y,route.at(-1)[1])-1,6,Math.abs(y-route.at(-1)[1])+2));
   paintRoads(nearbyDrives,visible,detail);
   paintIndustrialCrossings(industrial,visible,detail);
   const colors=['#c5ae82','#b7785e','#889c9c','#c7c9a9','#87916c','#6591a0'];
   for(let i=0;i<45;i++){
    const main=i<29,lane=main?doubleLane[i%4]:streetTraffic[i%streetTraffic.length],reverse=main?i%4<2:i%2===0;
    const speed=main?4.7+i%4*.46:1.78+i%streetTraffic.length*.12;
    const offset=(i*8.83+time*speed)%lane.distance;
    const {x,y,angle}=sample(lane,reverse?lane.distance-offset:offset);
    if(!main&&[j.motorWest,j.motorEast].some(([a,b])=>Math.abs(x-a)<1&&Math.abs(y-b)<1.32))continue;
    const yaw=angle+(reverse?Math.PI:0),shift=main?0:.24;
    if(visible(x-.7,y-.7,1.4,1.4))vehicle(x-Math.sin(yaw)*shift,y+Math.cos(yaw)*shift,yaw,colors[i%colors.length],i%7===0?'truck':i%5===0?'van':'car',detail);
   }
   climate(l,t,r,b,time,visible,worldWidth);
  });
 }
 function deliveryVehicles(trips,time,detail,intersects,items,speed){
  withState(()=>{
   c.scale(tile,tile);
   for(const trip of trips){
    const distance=(time-trip.started)*speed;
    const point=sample(trip.route,Math.min(trip.route.distance,distance)),angle=point.angle;
    const lane=Math.max(0,Math.min(.055,distance*.25,(trip.route.distance-distance)*.25));
    const x=point.x-Math.sin(angle)*lane,y=point.y+Math.cos(angle)*lane;
    if(!intersects((x-1)*tile,(y-1)*tile,2*tile,2*tile))continue;
    vehicle(x,y,angle,'#d4a557','freight',detail);
    if(detail){
     const unloading=distance>=trip.route.distance;
     const label=unloading?'Entladung · '+trip.count+'× '+items[trip.item].n:trip.count+'× '+items[trip.item].n;
     const w=Math.min(4.5,label.length*.114+.26);
     rr(x-w/2,y-.75,w,.37,.09,'#304343eb');
     c.font='700 .219px system-ui';c.fillStyle='#ffdea4';c.textAlign='center';
     c.fillText(label,x,y-.48,w-.18);
    }
   }
  });
 }
 return {terrain,protectedTile,driveway,deliveryRoute,deliveryVehicles,fishLake,fishPosition};
}
