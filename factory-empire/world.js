/* The factory uses one terrain projection for landscaping, traffic, and outdoor logistics. */
function createFactoryWorldArt(c,tile,columns,rows,bunker,{rr,tx,withState},layout){
 function polygon(points,fill){
  c.beginPath();c.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)c.lineTo(...points[i]);
  c.closePath();c.fillStyle=fill;c.fill();
 }
 function line(points,width,color){
  c.beginPath();c.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)c.lineTo(...points[i]);
  c.strokeStyle=color;c.lineWidth=width;c.stroke();
 }
 function oval(x,y,radiusX,radiusY,color,angle=0){
  c.beginPath();c.ellipse(x,y,radiusX,radiusY,angle,0,Math.PI*2);c.fillStyle=color;c.fill();
 }
 function platform(x,y,width,height,rotation,belt,detail){
  const w=width*tile,h=height*tile;
  withState(()=>{
   c.translate(x*tile+w/2,y*tile+h/2);
   if(belt){
    c.rotate(rotation*Math.PI/2);
    rr(-tile*.48,-14,tile*.97,42,4,'#203d374f');
    rr(-tile/2,-24,tile,44,4,'#4e645d');
    for(const edge of [-13,12]){
     rr(edge-5,18,11,10,2,'#bfb9a2');
     rr(edge-2,13,5,13,1,'#5b635b');
     rr(edge-5,-24,10,7,1,'#a79c79');
    }
    rr(-tile/2,-21,tile,42,3,'#566e68');
    if(detail){
     line([[-tile/2,-22],[tile/2,-22]],1.4,'#dbc191');
     line([[-tile/2,20],[tile/2,20]],1.7,'#dbc191');
     line([[-13,24],[-4,20]],1.3,'#d8a85e');
     line([[12,24],[21,20]],1.3,'#d8a85e');
    }
    return;
   }
   rr(-w/2+2,-h/2+8,w+1,h-2,6,'#253b3463');
   rr(-w/2+1,-h/2+5,w-2,h,5,'#485657');
   rr(-w/2+1,-h/2+1,w-2,h-4,5,'#9b9d91');
   polygon([[-w/2+6,h/2-9],[w/2-6,h/2-9],[w/2-4,h/2-3],[-w/2+4,h/2-3]],'#646f68');
   if(detail)for(const edge of [-w/2+9,w/2-13]){
    rr(edge,h/2-9,4,8,1,'#d2aa68');rr(edge,-h/2+3,4,6,1,'#c7c6ab');
   }
  });
 }
 function hall({rect,name,drive,level=1,previous,flash=0,grid=false,detail,intersects}){
  const [left,top,right,bottom]=rect,x=left*tile,y=top*tile,w=(right-left+1)*tile,h=(bottom-top+1)*tile;
  rr(x-13,y-12,w+35,h+36,12,'#2236304a');
  rr(x-8,y-10,w+16,h+21,7,'#4b5149');
  const base=c.createLinearGradient(x,y,x+w*.25,y+h);
  base.addColorStop(0,'#a0a6aa');base.addColorStop(.76,'#929a9f');base.addColorStop(1,'#879197');
  c.fillStyle=base;c.fillRect(x,y,w,h);
  c.fillStyle='#37474121';c.fillRect(x,y,w,13);c.fillRect(x,y,14,h);
  c.fillStyle='#f9f1ca21';c.fillRect(x+w-16,y,16,h);
  if(detail){
   for(let i=0;i<15;i++){
    const fx=x+24+w*.87*((i*47)%97)/97,fy=y+32+h*.8*((i*67)%89)/89;
    if(intersects(fx,fy,0,0,tile))oval(fx,fy,6+i%4*4,2+i%3,'#554e3e12',-.18);
   }
   for(let p=x+tile*.75;p<x+w-15;p+=tile*2.7){
    if(!intersects(p,y,0,tile,1.6*tile))continue;
    rr(p-9,y-7,18,10,2,'#394741');rr(p-6,y+1,12,3,1,'#f2dfa0');
    oval(p+1,y+11,16,11,'#fff2bb35');
   }
   for(let p=y+tile*.98;p<y+h-12;p+=tile*2.1){
    if(!intersects(x,p,w,0,tile))continue;
    for(const edge of [x-7,x+w+1]){
     rr(edge,p,6,16,1,'#33423c');c.fillStyle='#a5afa2';c.fillRect(edge+1,p+4,4,3);
    }
   }
   for(const edge of [x+tile*.68,x+w-tile*.96]){
    rr(edge,y+h-15,17,5,1,'#62695980');
    for(let i=0;i<4;i++)rr(edge+3+i*3.4,y+h-14,1.3,3,0,'#cfccb5');
   }
   if(previous){
    const jointX=(previous[2]+1)*tile,jointY=(previous[3]+1)*tile;
    if(right>previous[2])line([[jointX,y],[jointX,y+h]],2,'#4f5c5360');
    if(bottom>previous[3])line([[x,jointY],[x+w,jointY]],2,'#4f5c5360');
   }
  }
  c.lineWidth=3;c.strokeStyle='#c2b9a1';c.strokeRect(x-4,y-4,w+8,h+8);
  if(drive){
   const doorX=drive.x*tile,doorY=drive.y*tile;
   rr(doorX-30,doorY-6,60,12,3,'#363f3c');rr(doorX-26,doorY-3,52,6,2,'#9ca796');
   for(const side of [-1,1])rr(doorX+side*27-3,doorY-9,6,18,2,'#e1ab50');
  }
  c.strokeStyle=grid?'#293d495a':'#35434b33';c.lineWidth=1;c.beginPath();
  const spacing=grid?tile:tile*4;
  for(let i=spacing;i<w;i+=spacing){c.moveTo(x+i,y);c.lineTo(x+i,y+h)}
  for(let i=spacing;i<h;i+=spacing){c.moveTo(x,y+i);c.lineTo(x+w,y+i)}
  c.stroke();
  if(flash>0){
   c.fillStyle='rgba(255,228,154,'+(flash*.29)+')';
   if(previous){
    const oldW=(previous[2]-left+1)*tile,oldH=(previous[3]-top+1)*tile;
    c.fillRect(x+oldW,y,w-oldW,oldH);c.fillRect(x,y+oldH,w,h-oldH);
   }else c.fillRect(x,y,w,h);
  }
  const label=name.toUpperCase()+(level>1?' · STUFE '+level:'');
  rr(x+10,y+9,Math.min(w-20,label.length*8.15+24),24,4,'#31443be8');
  tx(label,x+20,y+26,13,'#f9e6ae','left',800);
 }
 function clouds(time,intersects){
  const formations=[[8,4,4.2,2.3],[31,22,6,3],[65,51,5,3],[93,8,5,2.7],[135,48,7,3]];
  for(const [x,y,w,h] of formations){
   const cx=(x+Math.sin(time*.036+x)*5)*tile,cy=(y+Math.sin(time*.025+y)*1.8)*tile;
   if(!intersects(cx-w*tile,cy-h*tile,w*tile*2,h*tile*2))continue;
   withState(()=>{
    c.translate(cx,cy);c.scale(1,h/w);
    const shade=c.createRadialGradient(0,0,tile*.4,0,0,w*tile);
    shade.addColorStop(0,'#233c4520');shade.addColorStop(.65,'#30434c13');shade.addColorStop(1,'#30434c00');
    oval(0,0,w*tile,w*tile,shade);
   });
  }
 }
 const terrain=createFactoryTerrain(c,tile,columns,rows,bunker,{rr,withState,polygon,line,oval},layout);
 return {...terrain,hall,clouds,polygon,line,oval,platform};
}

/* A cutaway lets the completed rooms stay visible under the hillside. */
function createFactoryBunkerArt(c,tile,{rr,tx,withState},{polygon,line,oval}){
 const rim=[[116,157],[398,157],[459,213],[459,465],[395,535],[139,535],[69,465],[69,213]];
 const lip=[[126,176],[390,176],[436,218],[436,458],[379,511],[150,511],[93,458],[93,218]];
 const bed=[[133,194],[386,194],[423,228],[423,449],[374,499],[155,499],[106,449],[106,229]];
 const steel=[[133,201],[253,201],[386,201],[422,233],[422,359],[422,446],[375,494],[286,494],
  [246,494],[154,494],[106,449],[106,354],[106,230],[133,201]];
 function slab(x,y,w,h,top,face){
  polygon([[x,y],[x+w,y],[x+w,y+h],[x+w-7,y+h+7],[x+5,y+h+7],[x,y+h]],face);
  c.fillStyle=top;c.fillRect(x,y,w,h);
  line([[x,y+h],[x,y],[x+w,y]],1,'#e1ddc36e');
 }
 function construction(count,progress,draw){
  const total=Math.ceil(count*progress);
  for(let i=0;i<total;i++)draw(i);
 }
 function crane(time){
  withState(()=>{
   c.translate(432,368);
   polygon([[-28,18],[-13,3],[35,-106],[53,-101],[15,11]],'#22282238');
   rr(-19,3,33,23,4,'#423f31');rr(-15,7,25,15,3,'#b58c49');
   line([[-7,6],[-7,-116],[3,-116],[3,6]],3,'#efc169');
   for(let y=-106;y<6;y+=12)line([[-7,y],[3,y+10]],1.3,'#7b5832');
   const sway=Math.sin(time*.49)*.075;
   c.translate(-2,-113);c.rotate(sway);
   line([[-116,0],[32,0]],4,'#efd183');
   line([[-111,0],[-13,-11],[13,-11],[31,0]],2,'#b58a44');
   rr(20,-3,15,12,2,'#554934');
   const cable=31+4*Math.sin(time*.7);
   line([[-100,0],[-100,cable]],1.6,'#494c43');
   rr(-109,cable,18,8,2,'#aa8b57');
  });
 }
 function pallets(x,y,color){
  slab(x,y,18,13,color,'#594f3c');
  line([[x+5,y+2],[x+5,y+11]],1.3,'#e5d6a777');
  line([[x+13,y+2],[x+13,y+11]],1.3,'#e5d6a777');
 }
 function room(x,y,w,h,label,wall,floor){
  slab(x,y,w,h,floor,'#28342f');
  rr(x+8,y+7,w-14,17,3,'#263b3b85');
  line([[x,y+h],[x,y],[x+w,y]],7,wall);
  line([[x+4,y+h],[x+4,y+4],[x+w,y+4]],1.4,'#d7ddc67d');
  line([[x+10,y+h-6],[x+w-7,y+h-6]],1,'#c7ccb753');
  for(const light of [x+12,x+w-15]){
   rr(light,y+h-13,5,4,1,'#d9d4a9');oval(light+2,y+h-10,7,5,'#ffecb423');
  }
  tx(label,x+10,y+17,10,'#e9edd6','left',800);
 }
 function wagon(x,y,color){
  rr(x+3,y+4,39,19,4,'#18252965');
  rr(x+4,y-2,7,23,2,'#282e2a');rr(x+27,y-2,7,23,2,'#282e2a');
  rr(x,y,39,18,4,color);rr(x+28,y+2,7,14,2,'#9bada8');
  rr(x+5,y+3,19,12,2,'#e5e3c330');
  rr(x+36,y+1,3,4,1,'#f3d9a1');rr(x+36,y+13,3,4,1,'#f3d9a1');
 }
 function draw({rect,phase,finished,phaseName,materials,progress,time,hover,detail}){
  const [left,top,right,bottom]=rect;
  withState(()=>{
   c.translate(left*tile,top*tile);
   c.scale((right-left+1)*tile/528,(bottom-top+1)*tile/720);
   const section=(index,item)=>phase>index?1:phase<index?0:item===undefined?progress:materials[item]||0;
   c.lineJoin=c.lineCap='round';
   oval(276,365,254,286,'#253b354d',.13);
   polygon([[31,193],[98,119],[159,110],[230,83],[344,98],[437,127],[499,206],[519,403],[483,547],
    [394,613],[189,616],[100,570],[41,509],[9,412],[17,274]],'#637653');
   polygon([[31,193],[98,119],[159,110],[230,83],[344,98],[437,127],[499,206],[475,261],[432,258],
    [381,148],[109,178],[51,293]],'#92967a');
   polygon([[41,214],[111,141],[205,118],[286,114],[376,133],[469,194],[490,277],[477,444],[420,557],
    [359,587],[166,587],[83,542],[35,454],[24,352]],'#a59a7a');
   polygon([[30,320],[83,215],[147,166],[127,234],[71,437],[119,523],[96,549],[48,464]],'#827e60');
   polygon([[378,136],[469,194],[490,277],[472,460],[419,552],[388,561],[435,463],[456,262]],'#726d57');
   polygon([[112,158],[152,132],[216,143],[270,129],[334,146],[417,151],[448,185],[110,197]],'#b9ab84');
   polygon([[6,532],[54,481],[103,526],[155,538],[203,572],[195,648],[133,668],[61,666],[18,630]],'#817d62');
   polygon([[359,554],[408,516],[465,494],[517,519],[523,589],[483,654],[418,660],[373,630]],'#786f55');
   line([[19,619],[58,651],[129,652],[181,634],[190,576]],5,'#b3a67a');
   line([[366,596],[373,624],[418,651],[475,645],[503,597]],5,'#aa9d73');
   if(detail)for(let i=0;i<74;i++){
    const x=35+(i*137)%460,y=149+(i*79)%428;
    if(x>65&&x<459&&y<537)continue;
    oval(x,y,1.8+i%4,.9+i%3*.55,i%3?'#5e604b70':'#d6c6a284',i*.43);
   }
   polygon(rim,'#514f40');
   polygon(lip,'#847558');
   polygon(bed,'#3f4035');
   line([[70,216],[116,159],[398,159],[459,213]],4,hover?'#ffe0a2':'#dfc99a');
   line([[72,474],[138,535],[399,535],[460,468]],3,'#c8af7b');
   if(detail){
    line([[91,225],[98,457],[153,519],[373,519],[437,464]],2,'#ad9570');
    line([[79,229],[84,468],[144,528]],1.4,'#c4a982');
    for(let i=0;i<34;i++){
     const x=126+(i*83)%274,y=223+(i*39)%242;
     oval(x,y,1.7+i%4,.8+i%3*.45,i%3?'#5c5b48':'#858471',i*.36);
    }
   }

   // The approach remains above ground while the concrete galleries are exposed in section.
   polygon([[245,492],[286,492],[313,535],[315,709],[216,718],[215,537]],'#4f5248');
   polygon([[251,493],[280,493],[301,545],[298,716],[231,718],[231,545]],'#777b69');
   line([[253,506],[239,552],[239,714]],2,'#cac4a0');
   line([[279,506],[292,552],[292,714]],2,'#cac4a0');
   c.setLineDash([9,8]);line([[266,521],[266,678]],1.65,'#d8be76');c.setLineDash([]);
   for(const x of [214,308]){
    rr(x,585,7,22,2,'#55594d');rr(x,588,7,5,1,'#e6b968');
   }
   polygon([[32,565],[72,543],[118,556],[163,555],[187,580],[185,624],[148,638],[52,640],[31,614]],'#73796b');
   polygon([[381,572],[408,548],[467,537],[495,550],[504,588],[477,626],[418,634],[385,613]],'#7b7f6d');
   line([[185,600],[217,600]],8,'#6f776b');
   line([[313,599],[382,599]],8,'#6f776b');
   for(const x of [65,110,155]){
    line([[x-12,574],[x-12,611],[x+17,611]],1.5,'#d0c293');
    rr(x-10,575,17,4,1,'#bcac7f');
   }
   if(detail){
    for(let i=0;i<6;i++)rr(196+i*3,587,1,7,0,'#e0c782');
    for(let i=0;i<8;i++)rr(329+i*5,594,1,9,0,'#e0c782');
    for(const [x,y] of [[43,619],[161,628],[397,614],[475,618]]){
     rr(x-1,y-11,3,13,1,'#677067');oval(x,y-11,2.1,2.1,'#ebd89c');
    }
   }

   const foundation=section(0);
   construction(8,foundation,i=>{
    const x=i%2?277:115,y=424-Math.floor(i/2)*61;
    slab(x,y,136,51,'#8e9282','#6e7569');
    if(detail)line([[x+7,y+44],[x+127,y+44]],1,'#cad1b782');
   });
   construction(6,section(0,0),i=>{
    const y=467-i*42;
    slab(248,y,29,39,'#9fa28f','#69705f');
   });
   if(!foundation){
    for(let i=0;i<4;i++){
     const y=425-i*61;
     line([[116,y+35],[116,y],[207,y]],3,'#b8824d');
     for(const x of [124,151,178,205])line([[x,y+3],[x,y+24]],1,'#a39471');
    }
   }
   construction(5,section(0,1),i=>pallets(i<3?35:467,446-(i%3)*26,'#b69158'));
   construction(4,section(0,2),i=>rr(124+i*20,546,14,10,2,'#a98c5d'));
   construction(steel.length-1,section(1),i=>{
    if(i===7)return;
    const [x,y]=steel[i],[a,b]=steel[i+1];
    line([[x+3,y+4],[a+3,b+4]],14,'#252f2e');
    line([[x,y],[a,b]],11,'#67756d');
    line([[x-1,y-2],[a-1,b-2]],2.5,'#c6c6ac');
    if(detail)for(let point=1;point<=3;point++){
     const t=point/4;
     oval(x+(a-x)*t,y+(b-y)*t,1.7,1.7,'#3f4a45');
    }
   });

   if(section(2)){
    room(118,306,126,77,'VORRÄTE','#688079','#506661');
    construction(8,section(2,0),i=>pallets(131+i%4*24,334+Math.floor(i/4)*24,'#c0af7d'));
    construction(3,section(2,1),i=>{
     const y=329+i*16;
     rr(214,y,18,12,4,'#447c85');rr(217,y+2,12,3,1,'#a0d4c8');rr(232,y+4,9,3,1,'#82a2a3');
    });
    construction(3,section(2,2),i=>rr(124+i*21,372,16,6,2,'#dbddbb'));
    if(section(2,3))line([[235,364],[252,364],[252,321],[289,321]],2,'#abcbc3');
    construction(3,section(2,1),i=>{
     const x=405+i*26,y=568+i*3;
     rr(x,y,21,29,6,'#354f52');rr(x+2,y-2,17,25,5,'#719a91');
     rr(x+4,y-1,12,4,2,'#b8c5a6');
     line([[x+10,y+23],[x+10,606],[390,606]],1.7,'#adbd9f');
    });
   }
   if(section(3)){
    room(282,306,126,77,'ENERGIE','#7a765d','#5f6351');
    construction(5,section(3,0),i=>{
     rr(292+i*21,332,13,19,2,'#697c66');rr(295+i*21,335,7,3,1,'#d6d89e');
    });
    if(section(3,1)){
     rr(293,361,47,14,3,'#384b46');
     for(let i=0;i<5;i++)rr(297+i*8,363,4,8,1,'#bbb587');
    }
    if(section(3,2)){
     rr(362,357,37,18,3,'#a18d59');oval(373,366,7,7,'#475648');
     oval(373,366,2,2,'#f6d78e');line([[393,366],[405,366],[405,360]],3,'#bcbd91');
    }
    if(section(3,3)){
     line([[286,367],[265,367],[265,280]],2.5,'#dabc65');
     oval(265,340,9,9,'rgba(249,202,96,'+(.18+.05*Math.sin(time*1.6))+')');
     line([[413,369],[450,379],[450,478],[438,492],[438,562]],2.25,'#e2cb83');
     for(const [x,y] of [[450,449],[438,507],[438,547]])oval(x,y,2.3,2.3,'#f1d89a');
    }
   }
   if(section(4)){
    room(282,395,126,78,'EVAKUIERUNG','#7c8470','#596759');
    construction(3,Math.max(section(4,0),section(4,1),section(4,2)),i=>{
     wagon(i===2?350:298,420+i%2*23,['#b6ad78','#81968b','#cbb889'][i]);
    });
    if(section(4,3))wagon(239,610,'#a7a892');
    construction(3,Math.max(section(4,0),section(4,1),section(4,2)),i=>{
     const x=56+i*40;
     rr(x-5,596,33,12,3,'#435249');rr(x-4,595,31,9,3,'#a8a78c');
     rr(x+14,596,6,6,2,'#425d5b');
    });
   }
   if(section(5)){
    room(282,220,126,74,'KERNTECHNIK','#6d8390','#4a626c');
    construction(3,section(5,0),i=>pallets(289+i*18,267,'#8ca4a5'));
    construction(4,section(5,1),i=>rr(294+i*23,246,15,8,2,'#87b6af'));
    if(section(5,2)){
     line([[374,289],[396,289],[396,248]],2,'#abd4c7');rr(389,246,13,6,1,'#ced4b0');
    }
    if(section(5,3)){
     oval(363,268,22,20,'#253c44');oval(363,266,16,14,'#709591');oval(363,265,9,9,'#354f58');
     oval(363,265,5+.6*Math.sin(time*2.7),5,'#b0ded3');
    }
   }
   if(section(6)){
    if(section(6,0)){
     room(118,395,126,78,'WOHNTRAKT','#958578','#6b685d');
     construction(7,section(6,0),i=>{
      const x=129+i%4*27,y=421+Math.floor(i/4)*24;
      rr(x,y,17,17,2,'#9aab96');rr(x+2,y+2,13,5,2,'#dfd5ad');
     });
    }
    if(section(6,1)){
     rr(215,421,22,34,2,'#abbaa3');rr(222,429,8,17,2,'#ebdfb5');rr(217,434,18,6,2,'#ebdfb5');
    }
    if(section(6,2)){
     const shutter=25*section(6,2);
     polygon([[231,494],[246,488],[246,518],[234,551],[221,553],[221,538]],'#88927e');
     polygon([[285,488],[299,495],[311,536],[311,553],[299,553],[286,519]],'#727e6f');
     line([[230,544],[242,516],[242,496],[288,496],[290,517],[301,545]],3,'#d2c3a0');
     rr(234,497,62,20,4,'#313e3c');rr(238,500,54,13,2,'#98a28f');
     rr(242,503,shutter,7,1,'#6d795e');rr(288-shutter,503,shutter,7,1,'#6d795e');
     for(const x of [238,288])oval(x,501,2.4,2.4,finished?'#b9eb88':'#ebbf61');
    }
    if(section(6,3)){
     room(118,220,126,74,'LEITSTELLE','#79948c','#4f6764');
     rr(141,250,59,20,3,'#2d4542');
     construction(4,section(6,3),i=>rr(146+i*13,253,10,7,1,'#a8ceab'));
     for(const x of [150,188])oval(x,276,6,6,'#c9b986');
    }
   }
   if(!finished){
    crane(time);
    for(const x of [81,447])rr(x,556,21,6,2,'#e9bf6e');
   }else{
    for(const y of [327,412,483,559])for(const x of [230,300])oval(x,y,3,3,'#d2e8a4');
    line([[401,170],[421,147],[421,127]],2.5,'#4e6252');
    polygon([[421,127],[447,134],[421,142]],'#b8cf9b');
   }
   rr(139,85,250,51,7,'#263b35ed');
   tx('BUNKER ARCHE',264,108,19,'#f5e1ab','center',900);
   tx(finished?'Fertiggestellt':phaseName+' · '+Math.floor(progress*100)+' %',264,127,11,finished?'#c5e4ad':'#e5d8b2','center',700);
  });
 }
 return draw;
}
