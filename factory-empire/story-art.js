function createFactoryStoryArt(c,{rr,tx,withState}){
 const seed=(i,j=0)=>((Math.imul(i+31,2654435761)^Math.imul(j+77,2246822519))>>>0)/4294967296;
 const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>clamp(t)**2*(3-2*clamp(t));
 function rect(x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h)}
 function stroke(points,width,color){
  c.beginPath();c.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)c.lineTo(...points[i]);
  c.lineWidth=width;c.strokeStyle=color;c.stroke();
 }
 function plane(points,color){
  c.beginPath();c.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)c.lineTo(...points[i]);
  c.closePath();c.fillStyle=color;c.fill();
 }
 function light(x,y,r,center,edge='#00000000'){
  const glow=c.createRadialGradient(x,y,0,x,y,r);
  glow.addColorStop(0,center);glow.addColorStop(1,edge);
  rect(x-r,y-r,2*r,2*r,glow);
 }
 function sky(top,mid,bottom){
  const colors=c.createLinearGradient(0,0,0,540);
  colors.addColorStop(0,top);colors.addColorStop(.64,mid);colors.addColorStop(1,bottom);
  rect(-80,-80,1120,700,colors);
 }
 function person(x,y,s,color,t,gesture=0){withState(()=>{
  c.translate(x,y);c.scale(s,s);
  const step=Math.sin(t*7)*4;
  rr(-9,-1,22,6,3,'#050a147a');
  stroke([[-4,-13],[-5+step,-2],[-8+step,0]],4,'#1b2432');
  stroke([[4,-13],[5-step,-2],[7-step,0]],4,'#243544');
  rr(-7,-28,14,17,4,color);rr(-4,-38,8,11,3,'#c9ac94');rr(-6,-41,12,5,2,'#e2bf8c');
  stroke([[5,-24],[9,-19-gesture*4],[13,-16-gesture*9]],3,color);
 });}
 function truck(x,y,s,color){withState(()=>{
  c.translate(x,y);c.scale(s,s);
  rr(-42,-17,84,21,5,'#18212ce0');
  rr(-40,-31,56,28,5,color);rr(19,-26,20,20,4,'#758c9e');
  rr(25,-23,10,8,2,'#263f52');rr(-35,-29,44,3,1,'#faf1d663');
  rr(-28,-7,14,13,5,'#101722');rr(20,-7,14,13,5,'#101722');
  rr(37,-16,5,4,1,'#fff0c1');light(43,-13,28,'#ffe9ae3a');
 });}
 function ridge(y,color,offset){
  const skyline=[[-85,560],[-85,y]];
  for(let i=-1;i<20;i++)skyline.push([i*64+offset,y-22-seed(i,23)*80]);
  skyline.push([1190,560]);plane(skyline,color);
 }
 function city(t,progress){
  sky('#081321','#33465a','#de9583');light(685,282,360,'#f1ae7b5c');
  ridge(362,'#42758555',-t*1.6);ridge(386,'#263e54',-t*3);
  for(let layer=0;layer<3;layer++)for(let i=-2;i<34;i++){
   const w=17+seed(i,layer)*41,h=38+seed(layer,i)*115,x=i*36-t*(layer+1)*1.6,y=415+layer*31-h;
   rect(x,y,w,h+90,['#344963','#253649','#192b40'][layer]);
   rect(x+w-4,y,4,h+85,'#0c1e2d54');rect(x+3,y-3,w-7,3,'#53688078');
   for(let v=8;v<h-5;v+=11)for(let u=5;u<w-5;u+=9){
    if(seed(i+v,u+layer)<(progress>.52&&layer===2?.55:.38))continue;
    rect(x+u,y+v,3,5,seed(u,v)<.5?'#b4d7e675':'#eec78f9a');
   }
  }
  plane([[-80,441],[1020,423],[1020,570],[-80,570]],'#131e2d');
  for(let i=0;i<20;i++)rect(i*68-t*12%68,479,27,2,'#d7c8a05b');
  truck(118+64*t,452,.71,'#667b8b');truck(670-47*t,505,.84,'#88765c');
  for(let i=0;i<4;i++)person(253+i*36+t*17,426,.68,'#b09576',t+i);
 }
 function garage(t){
  sky('#142239','#537086','#e6a680');ridge(387,'#46636d',-t*1.8);ridge(415,'#304b54',-t*3);
  plane([[-50,404],[980,393],[1020,570],[-50,570]],'#35454b');
  plane([[128,420],[446,375],[876,434],[906,570],[158,570]],'#67777b');
  for(let i=0;i<9;i++)stroke([[148+i*80,420],[118+i*90,560]],1,'#bcc7b82a');
  rr(247,227,409,196,10,'#192938');plane([[223,237],[343,151],[692,216],[644,248]],'#657b89');
  plane([[641,244],[692,216],[692,384],[640,421]],'#273b4d');rr(277,245,342,153,5,'#394d61');
  rr(305,274,133,126,6,'#21313e');
  const door=36+ease(t/4)*24;
  rect(312,280,119,door,'#748897');for(let y=284;y<277+door;y+=6)rect(314,y,114,1.3,'#b8c5c483');
  rect(311,283+door,121,112-door,'#e2b87b71');light(365,384,100,'#eac58c58');
  for(let x=466;x<620;x+=32){rr(x,274,23,36,3,'#9cc9dd');rect(x+3,277,17,30,'#f0d7a07c')}
  rr(475,331,118,26,4,'#33404c');tx('WERKSTATT',534,350,13,'#dbe9e9','center',800);
  truck(650-ease(t/8)*134,448,1,'#a18c6c');
  person(282+ease(t/8)*70,410,.95,'#d9aa6a',t,.5);
  person(488,407,.9,'#739ab1',0,.75);
 }
 function bunkers(t,stage,shot,progress){
  sky('#0e1729','#42536a','#ad8f75');ridge(268,'#334856',-t*2);
  plane([[-20,196],[236,162],[403,189],[765,127],[990,169],[985,557],[-20,560]],'#354750');
  rect(-30,228,1020,332,'#25323e');
  for(let i=0;i<25;i++)stroke([[i*48,233],[i*50-21,549]],2,'#111a248f');
  const levels=3,completed=Math.min(6,stage??6);
  for(let row=0;row<levels;row++){
   const y=206+row*103;
   rr(165,y,657,93,7,'#667981');rr(175,y+6,637,73,3,'#243848');
   for(let i=0;i<7;i++){
    const x=184+i*88,enabled=i+row<=completed+1;
    rect(x,y+15,78,59,enabled?'#344d5c':'#263646');rect(x,y+74,78,3,'#839298');
    if(!enabled)continue;
    if(i===2||shot==='habitat'){
     for(let j=0;j<3;j++){
      rr(x+10+j*19,y+30,14,37,5,['#629c9d','#5f879d','#70a798'][j]);
      rect(x+11+j*19,y+36,11,3,'#b5efe0a0');
     }
    }else{
     rr(x+9,y+33,58,33,5,i===4?'#6a796c':'#59718a');rect(x+14,y+39,44,4,'#a6cdec');
     for(let j=0;j<4;j++)rect(x+16+11*j,y+55,4,3,j<(t*3)%5?'#8fdfb5':'#e4bb83');
    }
    const lit=completed>=3||shot==='habitat';
    rect(x+15,y+18,49,2,lit?'#c5f6ef':'#f3bf80');light(x+42,y+32,36,lit?'#a1f2e522':'#ffdba32d');
   }
   rect(177,y+80,636,7,'#9d9681');
   person(301+((t*44+row*91)%286),y+73,.71,row===1?'#e1be7e':'#799cb5',t+row);
  }
  stroke([[790,175],[784,67],[606,67],[386,106]],6,'#6e8187');
  const dropped=ease(progress)*57;
  stroke([[610,70],[610,115+dropped]],2,'#9aaba9');rr(575,114+dropped,70,19,4,'#a2b3b6');
  for(let i=0;i<8;i++)rect(580+i*8,118+dropped,4,1.5,'#dfdfcd');
 }
 function gate(t,progress){
  sky('#172133','#485a6f','#9a8f81');ridge(263,'#465b65',t*2);
  plane([[-20,434],[480,316],[1010,439],[1030,560],[-20,560]],'#5d6e73');
  rr(246,144,478,284,25,'#253544');rr(280,171,407,244,20,'#627480');
  rr(321,203,323,204,18,'#152438');
  const open=ease(progress)*132;
  rr(329,214,44+open,180,7,'#8a9da4');rr(592-open,214,44+open,180,7,'#7c909c');
  for(let i=0;i<13;i++){rect(334,225+i*12,32+open,1.5,'#c0d0ca74');rect(598-open,225+i*12,31+open,1.5,'#c0d0ca74')}
  rr(350,175,270,24,5,'#233447');tx('ARCHE · OSTTOR',485,192,13,'#e5dfae','center',800);
  light(327,219,66,'#f5c38258');light(640,214,70,'#e9b87557');
  for(let i=0;i<3;i++)person(428+i*32,426-ease(progress)*68,1,'#a1b4b1',t+i);
  truck(840-ease(progress)*292,488,1.14,'#bfac80');
 }
 function command(t,showOrbit){
  sky('#091625','#263b55','#0c1826');
  rr(122,54,718,312,30,'#3b586e');rr(141,72,680,276,24,'#0a1c30');
  for(let x=160;x<800;x+=28)rect(x,82,1,253,'#38577638');
  for(let y=86;y<332;y+=23)rect(155,y,650,1,'#38577638');
  light(495,209,155,'#66c7df3d');
  c.beginPath();c.arc(490,206,93,0,Math.PI*2);c.fillStyle='#2e596a';c.fill();
  for(let k=0;k<8;k++)stroke([[410,164+k*13],[478,154+k*14],[562,175+k*8]],1,'#89cdcc72');
  if(showOrbit){
   const orbit=[];
   for(let i=0;i<=70;i++){const a=i*Math.PI/35;orbit.push([493+Math.cos(a)*188,202+Math.sin(a)*82])}
   stroke(orbit,1.5,'#8dd0dfaa');
   rr(493+Math.cos(t*.17)*188-4,202+Math.sin(t*.17)*82-3,8,6,2,'#f4dfac');
  }
  tx(showOrbit?'PROJEKTIONSKARTE · ORBIT':'ARCHE · ZUSTANDSÜBERSICHT',480,101,12,'#b0d7e1','center',800);
  plane([[-30,446],[248,363],[721,364],[1010,447],[1010,580],[-30,580]],'#293749');
  for(let i=0;i<9;i++)rr(196+i*66,399,40,9,3,i%2?'#76c9d4':'#c4b789');
  person(369,443,2,'#678e9b',0,Math.sin(t*1.2));person(599,449,2.1,'#a98c65',0,.65);
 }
 function yard(t,stage,progress,launch){
  sky('#0d1e35','#496482','#c39992');ridge(340,'#3f596b',-t*2.7);
  for(let i=0;i<36;i++)light(seed(i,23)*960,seed(i,81)*245,4,'#f0eed09c');
  plane([[-40,353],[340,271],[893,345],[1020,465],[1020,560],[-40,570]],'#334a61');
  for(let i=0;i<18;i++)stroke([[120+43*i,335],[72+53*i,560]],1.2,'#a0afba3e');
  for(let i=0;i<8;i++)stroke([[-40,365+i*25],[1000,357+i*36]],1.3,'#9eacbd55');
  for(const x of [217,732]){
   stroke([[x,429],[x,145],[x+166,145]],9,'#728594');stroke([[x-12,407],[x+121,151]],4,'#495f77');
   for(let i=0;i<12;i++)stroke([[x,i*20+153],[x+27,i*20+165]],2,'#8599a5');
   const y=186+ease(progress)*96;
   stroke([[x+124,145],[x+124,y]],2,'#bed1d7');rr(x+101,y,46,16,5,'#b4c3ce');
  }
  const lift=launch?ease(progress)*400:0;
  for(const [i,x] of [332,505,664].entries()){
   const y=420+i*12-lift*(1-i*.12),size=i===1?1.12:.84;
   withState(()=>{
    c.translate(x,y);c.scale(size,size);
    const assembled=stage==null||i<stage+1;
    plane([[-66,-17],[-31,-58],[-16,-128],[0,-174],[25,-133],[41,-59],[72,-15],[29,5],[-31,5]],assembled?'#9aacbd':'#63778c');
    plane([[-42,-13],[-27,-69],[-13,-127],[0,-173],[5,-111],[0,-48],[1,1]],'#e3e3d6');
    rr(-17,-125,34,27,10,'#4e829d');rr(-10,-121,21,5,2,'#a6e2ee');
    for(let n=0;n<6;n++)stroke([[-25-n*3,-89+n*14],[28+n*3,-89+n*14]],1.5,'#35547473');
    rr(-42,-19,20,20,5,'#45697e');rr(24,-19,20,20,5,'#45697e');
    if(launch){light(0,14,80,'#8cd8ff7f');plane([[-20,-2],[20,-2],[5,65+Math.sin(t*17)*12]],'#b6eaffc4')}
   });
  }
  if(!launch){truck(146+t*29,480,.8,'#9aadba');person(607-t*22,475,1,'#cdad75',t)}
 }
 return function draw(scene,cue,t,focus){
  const {beat,elapsed,index}=cue,progress=clamp(elapsed/beat.length),kind=beat.place;
  withState(()=>{
   c.translate(480,270);c.scale(1.04+ease(progress)*.11+(focus?.23:0),1.04+ease(progress)*.11+(focus?.23:0));
   c.translate(-480+Math.sin(index*2)*22*progress,-270-7*progress);
   if(kind==='city'||kind==='flare')city(elapsed,progress);
   if(kind==='garage')garage(elapsed);
   if(kind==='bunker'||kind==='habitat')bunkers(elapsed,scene.stage,kind,progress);
   if(kind==='gate')gate(elapsed,progress);
   if(kind==='command')command(elapsed,beat.speaker==='Dr. Imani'||scene.title.includes('Heimat'));
   if(kind==='shipyard'||kind==='launch')yard(elapsed,scene.stage,progress,kind==='launch');
   if(kind==='flare'){
    const flash=Math.max(0,1-Math.abs(elapsed-3.1)/2.4);
    rect(-60,-60,1080,660,'#ffe1a3'+Math.round(220*flash*flash).toString(16).padStart(2,'0'));
    light(724,274,240,'#fff0cc'+Math.round(190*flash).toString(16).padStart(2,'0'));
   }
   const frame=c.createRadialGradient(480,265,215,480,265,590);
   frame.addColorStop(0,'#00000000');frame.addColorStop(1,'#090d18b0');rect(-40,-25,1040,590,frame);
  });
  const fade=Math.max(0,1-elapsed/.48,1-(beat.length-elapsed)/.39);
  rect(0,0,960,540,'#080e18'+Math.round(255*fade).toString(16).padStart(2,'0'));
 };
}
