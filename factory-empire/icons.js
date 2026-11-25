/* UI artwork in a 24-unit coordinate space so it stays sharp at every zoom. */
function createFactoryIcons(c,rr,withState){
 const ink='#e5f1fa',blue='#73bbeb',gold='#f2c479',dark='#182737';
 const stroke=(color,points,width=1.7)=>{
  c.beginPath();
  c.moveTo(...points[0]);
  for(const point of points.slice(1))c.lineTo(...point);
  c.strokeStyle=color;c.lineWidth=width;c.stroke();
 };
 const dot=(x,y,r,color)=>{
  c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();
 };
 const arrow=(x,y,r,color=ink)=>withState(()=>{
  c.translate(x,y);c.rotate(r);
  stroke(color,[[-6,0],[6,0]]);
  stroke(color,[[2,-4],[6,0],[2,4]]);
 });
 const bars=(values,color)=>{
  for(const [x,y,w,h] of values)rr(x,y,w,h,.5,color);
 };
 const art={
  mk(){bars([[-9,1,4,8],[-2,-3,4,12],[5,-8,4,17]],blue);stroke(gold,[[-9,-4],[-4,-6],[0,-5],[8,-11]]);},
  rs(){stroke(ink,[[-4,-9],[4,-9],[2,-9],[2,-2],[8,7],[7,9],[-7,9],[-8,7],[-2,-2],[-2,-9]]);stroke(blue,[[-5,4],[5,4]]);dot(1,1,1.3,gold);},
  pn(){dot(-4,-4,3,blue);dot(5,-3,2.6,gold);rr(-9,1,10,7,3,blue);rr(2,2,7,6,2,gold);},
  hl(){stroke(ink,[[-10,8],[-10,-2],[-3,-6],[-3,-2],[4,-6],[4,-2],[10,-2],[10,8],[-10,8]]);bars([[-6,2,3,2],[0,2,3,2],[6,2,2,6]],blue);},
  bk(){rr(-8,-10,16,20,2,blue);stroke(dark,[[-4,-5],[4,-5]]);stroke(dark,[[-4,0],[4,0]]);stroke(gold,[[-3,5],[-1,7],[4,3]]);},
  ac(){rr(-7,-10,14,20,1,blue);bars([[-4,-7,2,2],[2,-7,2,2],[-4,-3,2,2],[2,-3,2,2],[-4,1,2,2],[2,1,2,2],[-1,6,2,4]],dark);},
  planning(){rr(-9,-8,18,16,2,'#315e83');stroke(ink,[[-5,4],[-5,-4],[4,-4],[4,4],[8,4]]);bars([[-7,-9,2,4],[5,-9,2,4]],gold);},
  cash(){rr(-10,-6,20,12,2,gold);dot(0,0,3.5,dark);dot(-6,0,1,dark);dot(6,0,1,dark);},
  income(){stroke(blue,[[-9,-8],[-9,8],[9,8]]);stroke(gold,[[-6,3],[-1,-2],[2,0],[8,-6],[4,-6]]);stroke(gold,[[8,-6],[8,-2]]);},
  clock(){dot(0,0,8,blue);stroke(dark,[[0,-5],[0,0],[4,2]],2);},
  progress(){stroke(blue,[[-9,5],[-9,-5],[9,-5],[9,5],[-9,5]]);bars([[-6,-2,3,4],[-1,-2,3,4]],gold);},
  check(){dot(0,0,8,blue);stroke(dark,[[-4,0],[-1,3],[4,-3]],2.2);},
  level(){stroke(blue,[[-8,3],[0,-5],[8,3]],3);stroke(gold,[[-5,7],[0,2],[5,7]],2.5);},
  h(){rr(-9,-5,18,10,3,'#956e42');dot(5,0,4,gold);dot(5,0,1.8,'#956e42');stroke(gold,[[-7,-1],[0,-1]]);},
  m(){stroke(blue,[[-9,-7],[9,-7],[9,-3],[3,-3],[3,3],[9,3],[9,7],[-9,7],[-9,3],[-3,3],[-3,-3],[-9,-3],[-9,-7]],2);},
  v(){rr(-8,-8,16,16,3,blue);stroke(dark,[[0,-5],[0,5]],3);stroke(dark,[[-5,0],[5,0]],3);},
  e(){rr(-6,-6,12,12,1,blue);rr(-3,-3,6,6,1,dark);for(const x of [-4,0,4])stroke(ink,[[x,-9],[x,-6]]);for(const x of [-4,0,4])stroke(ink,[[x,6],[x,9]]);},
  n(){stroke(gold,[[2,-9],[-6,1],[0,1],[-2,9],[6,-2],[0,-2],[2,-9]],2);},
  f(){rr(-10,-3,20,8,2,blue);stroke(ink,[[-7,-3],[-4,-7],[4,-7],[7,-3]]);dot(-6,5,2.6,dark);dot(6,5,2.6,dark);},
  t(){dot(0,0,2.5,gold);for(let i=0;i<3;i++)withState(()=>{c.rotate(i*Math.PI/3);c.beginPath();c.ellipse(0,0,9,3,0,0,Math.PI*2);c.strokeStyle=blue;c.lineWidth=1.4;c.stroke();});},
  b(){rr(-8,-7,16,14,2,blue);stroke(dark,[[-8,-3],[8,-3]]);stroke(dark,[[0,-7],[0,0]]);stroke(gold,[[-4,3],[4,3]]);},
  l(){belt('belt');},
  o(){stroke(ink,[[0,-10],[5,-3],[5,4],[0,7],[-5,4],[-5,-3],[0,-10]]);dot(0,-2,2,blue);stroke(gold,[[0,8],[0,11]]);},
  lock(){stroke(ink,[[-4,-1],[-4,-5],[-2,-7],[2,-7],[4,-5],[4,-1]]);rr(-7,-1,14,10,2,blue);dot(0,3,1.4,dark);},
  hand(){stroke(ink,[[-1,8],[-6,4],[-10,-1],[-8,-3],[-5,-1],[-4,0],[-4,-8],[-1,-9],[0,-7],[0,-2],[1,-6],[4,-6],[4,-1],[5,-4],[8,-4],[8,3],[5,8],[-1,8]],1.5);},
  rot(r){withState(()=>{c.rotate(r*Math.PI/2);c.beginPath();c.arc(0,0,7,.7,5.5);c.lineWidth=1.9;c.strokeStyle=blue;c.stroke();stroke(gold,[[3,-4],[7,-4],[7,-8]]);});},
  mov(){for(let i=0;i<4;i++)withState(()=>{c.rotate(i*Math.PI/2);stroke(ink,[[0,0],[8,0],[5,-3]]);stroke(ink,[[8,0],[5,3]]);});dot(0,0,2,blue);},
  del(){stroke(ink,[[-8,-5],[8,-5]]);stroke(gold,[[-3,-8],[3,-8]]);stroke(ink,[[-6,-3],[-5,8],[5,8],[6,-3]]);stroke(blue,[[-2,-2],[-2,5]]);stroke(blue,[[2,-2],[2,5]]);},
  home(){stroke(ink,[[-9,-1],[0,-9],[9,-1]]);stroke(blue,[[-6,-2],[-6,8],[6,8],[6,-2]]);stroke(gold,[[-1,8],[-1,3],[2,3],[2,8]]);},
  plus(){stroke(ink,[[-7,0],[7,0]],2);stroke(ink,[[0,-7],[0,7]],2);},
  minus(){stroke(ink,[[-7,0],[7,0]],2);},
  info(){c.beginPath();c.arc(0,0,8,0,Math.PI*2);c.strokeStyle=blue;c.lineWidth=1.5;c.stroke();dot(0,-3.7,1.2,ink);stroke(ink,[[0,-.3],[0,4]],1.8);}
 };
 function belt(id){
  const tint={belt:'#9baeba',fast:'#55bded',express:'#e3b466',sort:'#69d2ac',smart:'#bca5ef',tunnel:'#e0a861'}[id]||blue;
  rr(-11,-6,22,12,2,dark);
  for(const y of [-6,5])rr(-11,y,22,1.5,.6,tint);
  for(const x of [-8,-4,0,4,8])stroke('#597187',[[x,-3.5],[x,3.5]],.9);
  if(id==='tunnel'){
   stroke(tint,[[-9,4],[-9,-3],[-6,-6],[6,-6],[9,-3],[9,4]],1.8);
   stroke(ink,[[-3,-1],[0,2],[3,-1]]);
  }else{
   arrow(id==='fast'||id==='express'?2:0,0,0,ink);
   if(id==='fast'||id==='express')stroke(tint,[[-9,-2],[-6,0],[-9,2]],1.3);
   if(id==='sort'||id==='smart')stroke(tint,[[0,0],[3,3],[7,3]],1.6);
  }
 }
 return (id,x,y,size,rotation=0,isBelt=false)=>withState(()=>{
  c.translate(x,y);c.scale(size/24,size/24);c.lineCap='round';c.lineJoin='round';
  if(isBelt)belt(id);
  else art[id]?.(rotation);
 });
}
