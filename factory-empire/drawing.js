/* Keep each drawing layer from leaking Canvas transforms or clips into another frame. */
function createFactoryCanvasScope(context){
 let depth=0,floor=0;
 function save(){
  context.save();depth++;
 }
 function restore(){
  if(depth<=floor)return;
  context.restore();depth--;
 }
 function withState(draw){
  const before=depth,previousFloor=floor;
  save();floor=depth;
  try{return draw()}
  finally{
   floor=previousFloor;
   while(depth>before)restore();
  }
 }
 return {save,restore,withState};
}

/* Canvas primitives and time-based artwork. None of these functions update game state. */
function createFactoryDrawing(c,ITEMS,MD,time,{save:saveCanvas,restore:restoreCanvas}){
const PI=Math.PI;
const rr=(x,y,w,h,r,f)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=f;c.fill()};
const tx=(t,x,y,sz,col,al,wt)=>{c.font=(wt||600)+' '+sz+'px system-ui,sans-serif';c.fillStyle=col;c.textAlign=al||'left';c.fillText(t,x,y)};
const sh=(h,a)=>{const n=parseInt(h.slice(1),16),m=a>0?255:0,p=Math.abs(a),f=v=>Math.round(v+(m-v)*p);return`rgb(${f(n>>16)},${f(n>>8&255)},${f(n&255)})`};
function di(s){if(s>13){dg(s);return}c.lineWidth=1;c.strokeStyle='#0006';const C=['#b07a3e','#d9b26f','#e6c88a','#7aa7d9','#e0533d','#c79a63'];c.fillStyle=C[s]||'#999';
 if(s<2){c.beginPath();c.roundRect(-7,-3.5,14,7,2);c.fill();c.stroke();if(s==1){c.beginPath();c.moveTo(-3,-3.5);c.lineTo(-3,3.5);c.stroke()}}
 else if(s<5){c.beginPath();c.ellipse(0,1,7,4.5,0,0,PI*2);c.fill();c.stroke();c.beginPath();c.arc(6,-3,3,0,PI*2);c.fill();c.stroke();if(s>2){c.fillStyle='#2c2f35';[-4,4].forEach(x=>{c.beginPath();c.arc(x,5.5,2.2,0,PI*2);c.fill()})}}
 else if(s==5){c.beginPath();c.roundRect(-7,-6,14,12,2);c.fill();c.stroke();c.fillStyle='#f0e0b0';c.fillRect(-1.5,-6,3,12)}
 else if(s==6){c.fillStyle='#8c9aa8';c.beginPath();c.moveTo(-7,3);c.lineTo(-5,-4);c.lineTo(1,-6);c.lineTo(7,-1);c.lineTo(5,5);c.closePath();c.fill();c.stroke();c.fillStyle='#c8d2dc';c.fillRect(-2,-3,3,2)}
 else if(s==7){c.fillStyle='#cfd6de';c.beginPath();c.moveTo(-8,4);c.lineTo(-5,-4);c.lineTo(5,-4);c.lineTo(8,4);c.closePath();c.fill();c.stroke();c.fillStyle='#ffffff99';c.fillRect(-4,-3,8,2)}
 else if(s==8){c.fillStyle='#aab4c0';c.beginPath();for(let i=0;i<16;i++){const a=i*PI/8,r=i%2?5:7.5;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath();c.fill();c.stroke();c.fillStyle='#4a525d';c.beginPath();c.arc(0,0,2,0,PI*2);c.fill()}
 else if(s==9){c.fillStyle='#b57b43';c.fillRect(-7,-1.5,13,3);c.strokeRect(-7,-1.5,13,3);c.fillStyle='#8d97a4';c.fillRect(2,-6,7,7);c.strokeRect(2,-6,7,7)}
 else if(s==10){c.fillStyle='#6fd0d8';[[-4,2],[0,0],[4,2],[-2,-3],[2,-3],[0,4]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,2.4,0,PI*2);c.fill();c.stroke()})}
 else if(s==11){c.fillStyle='#cfe1f5';c.beginPath();c.roundRect(-6,-8,12,16,3);c.fill();c.stroke();c.fillStyle='#8fb0d4';c.fillRect(-3.5,-5.5,7,11);c.fillStyle='#3d78c4';c.fillRect(-1.5,-7,3,1.5)}
 else if(s==12){c.fillStyle='#2f9a62';c.beginPath();c.roundRect(-8,-6,16,12,2);c.fill();c.stroke();c.strokeStyle='#d9b24a';c.lineWidth=1;c.beginPath();c.moveTo(-6,-3);c.lineTo(-1,-3);c.lineTo(1,0);c.lineTo(6,0);c.stroke();c.fillStyle='#22262d';c.fillRect(-2,1,6,4);c.fillStyle='#d9b24a';c.fillRect(-5,2,1.5,1.5)}
 else{c.fillStyle='#1c2128';c.beginPath();c.roundRect(-5.5,-8.5,11,17,2.2);c.fill();c.stroke();c.fillStyle='#5ad1ff';c.fillRect(-4,-6.5,8,11.5);c.fillStyle='#ffffff55';c.fillRect(-4,-6.5,3,11.5);c.fillStyle='#8d97a4';c.beginPath();c.arc(0,7,1,0,PI*2);c.fill()}}
function dart(o,w){const tm=time(),m=MD[o.t],a=m.art,ac=m.ac||'#fff',sl=Math.sin(tm*3);c.lineCap='butt';
 if(a=='prs'){const e=w?(Math.sin(tm*6)*.5+.5)*9:0;c.fillStyle='#2f3640';c.fillRect(-14,9,28,6);c.fillStyle=ac;c.fillRect(-4,-17+e,8,13);c.fillStyle='#9aa4b0';c.fillRect(-12,-4+e,24,7);c.fillStyle='#ffffff55';c.fillRect(-12,-4+e,24,2)}
 else if(a=='rol'){for(const dy of[-6,6]){saveCanvas();c.translate(0,dy);c.rotate(tm*(w?6:.5)*(dy<0?1:-1));c.fillStyle=ac;c.beginPath();c.arc(0,0,7,0,PI*2);c.fill();c.strokeStyle='#4a525d';c.lineWidth=1.5;for(let i=0;i<4;i++){c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(i*PI/2)*7,Math.sin(i*PI/2)*7);c.stroke()}restoreCanvas()}c.fillStyle='#e8eef5';c.globalAlpha=.8;c.fillRect(-14+(w?(tm*24)%12:0),-1.5,10,3);c.globalAlpha=1}
 else if(a=='wld'){c.fillStyle='#2f3640';c.fillRect(-14,8,28,6);c.fillStyle='#8d97a4';c.fillRect(-12,2,24,6);const x=w?Math.sin(tm*2.5)*9:0;c.strokeStyle='#e8eef5';c.lineWidth=3;c.beginPath();c.moveTo(x,-16);c.lineTo(x,-4);c.stroke();c.fillStyle=ac;c.fillRect(x-2.5,-5,5,4);if(w){c.fillStyle='#fff';for(let i=0;i<4;i++){const q=tm*20+i*1.7;c.fillRect(x+Math.cos(q)*5,1+Math.sin(q)*3,1.6,1.6)}c.fillStyle=ac;c.globalAlpha=.45;c.beginPath();c.arc(x,1,6,0,PI*2);c.fill();c.globalAlpha=1}}
 else if(a=='chp'){c.fillStyle='#10151c';c.beginPath();c.roundRect(-13,-13,26,22,3);c.fill();c.strokeStyle=ac;c.lineWidth=1;c.beginPath();c.moveTo(-9,-9);c.lineTo(-9,2);c.lineTo(0,2);c.lineTo(0,-6);c.lineTo(9,-6);c.moveTo(-9,6);c.lineTo(9,6);c.stroke();c.fillStyle=ac;for(const[x,y]of[[-9,-9],[9,-6],[9,6],[0,2]]){c.beginPath();c.arc(x,y,1.6,0,PI*2);c.fill()}if(w){c.globalAlpha=.35;c.fillRect(-12+((tm*18)%24),-13,3,22);c.globalAlpha=1}c.fillStyle='#2f3640';c.fillRect(-14,11,28,4)}
 else if(a=='fld'){c.fillStyle='#5c7a2f';c.fillRect(-14,-13,28,26);for(let r=0;r<4;r++)for(let q=0;q<4;q++){const x=-10+q*7,y=-8+r*6,s2=Math.sin(tm*2+q+r)*(w?2:.6);c.strokeStyle=ac;c.lineWidth=1.6;c.beginPath();c.moveTo(x,y+4);c.lineTo(x+s2,y-2);c.stroke();c.fillStyle=ac;c.fillRect(x+s2-1,y-4,2,3)}}
 else if(a=='mix'){c.fillStyle='#2f3640';c.fillRect(-14,10,28,5);saveCanvas();c.rotate(w?tm*3:0);c.fillStyle='#cfd6de';c.beginPath();c.roundRect(-12,-9,24,18,8);c.fill();c.strokeStyle=ac;c.lineWidth=2;for(let i=-8;i<10;i+=6){c.beginPath();c.moveTo(i,-9);c.lineTo(i,9);c.stroke()}restoreCanvas();c.fillStyle=ac;c.fillRect(-4,-15,8,5)}
 else if(a=='pmp'){c.fillStyle='#2f3640';c.fillRect(-14,9,28,5);c.fillStyle='#6b7a8f';c.fillRect(-4,-14,8,22);const e=w?(Math.sin(tm*5)*.5+.5)*8:0;c.fillStyle=ac;c.fillRect(-7,-6+e,14,5);c.fillStyle='#4a525d';c.fillRect(-2,-16,4,10);if(w){c.fillStyle=ac;for(let i=0;i<3;i++){c.beginPath();c.arc(9,-6+((tm*30+i*9)%22),1.8,0,PI*2);c.fill()}}}
 else if(a=='cel'){c.fillStyle='#2f3640';c.fillRect(-14,11,28,4);for(let i=0;i<3;i++){const x=-12+i*8.5,f=w?((tm*.8+i*.33)%1):.6;c.fillStyle='#10151c';c.fillRect(x,-12,7,22);c.fillStyle=ac;c.fillRect(x+1,10-20*f,5,20*f);c.fillStyle='#cfd6de';c.fillRect(x+2,-14,3,2)}}
 else if(a=='mot'){c.fillStyle='#2f3640';c.fillRect(-14,10,28,5);c.fillStyle='#4a525d';c.beginPath();c.roundRect(-13,-8,12,17,3);c.fill();saveCanvas();c.translate(7,0);c.rotate(tm*(w?9:.6));c.fillStyle=ac;c.beginPath();for(let i=0;i<16;i++){const q=i*PI/8,r=i%2?8:11;c.lineTo(Math.cos(q)*r,Math.sin(q)*r)}c.closePath();c.fill();c.fillStyle='#2f3640';c.beginPath();c.arc(0,0,3,0,PI*2);c.fill();restoreCanvas();if(w){c.fillStyle=ac;c.globalAlpha=.35;c.beginPath();c.arc(-7,0,9,0,PI*2);c.fill();c.globalAlpha=1}}
 else if(a=='sol'){saveCanvas();c.beginPath();c.roundRect(-13,-13,26,24,3);c.clip();c.fillStyle='#10151c';c.fillRect(-13,-13,26,24);c.strokeStyle=ac;c.lineWidth=1;for(let i=-13;i<=13;i+=6.5){c.beginPath();c.moveTo(i,-13);c.lineTo(i,11);c.stroke()}for(let i=-13;i<=11;i+=8){c.beginPath();c.moveTo(-13,i);c.lineTo(13,i);c.stroke()}if(w){const g=((tm*1.2)%1)*40-14;c.fillStyle='#ffffff77';c.beginPath();c.moveTo(g,-13);c.lineTo(g+6,-13);c.lineTo(g-2,11);c.lineTo(g-8,11);c.fill()}restoreCanvas()}
 else if(a=='rea'){c.fillStyle='#2f3640';c.beginPath();c.arc(0,0,15,0,PI*2);c.fill();c.fillStyle=ac;c.globalAlpha=w?.6+.4*Math.sin(tm*6):.35;c.beginPath();c.arc(0,0,10,0,PI*2);c.fill();c.globalAlpha=1;c.strokeStyle='#e8eef5';c.lineWidth=2;c.beginPath();c.arc(0,0,12.5,0,PI*2);c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(0,0,3.5,0,PI*2);c.fill();saveCanvas();c.rotate(tm*(w?2:.3));c.fillStyle='#ffd23f';for(let i=0;i<3;i++){c.rotate(PI*2/3);c.fillRect(-1.5,-15,3,5)}restoreCanvas()}
 else if(a=='wh'){c.fillStyle='#2f3640';c.fillRect(-14,11,28,4);saveCanvas();c.translate(0,-1);c.rotate(tm*(w?5:.5));c.fillStyle='#1b1e23';c.beginPath();c.arc(0,0,12,0,PI*2);c.fill();c.fillStyle=ac;c.beginPath();c.arc(0,0,7,0,PI*2);c.fill();c.strokeStyle='#4a525d';c.lineWidth=1.5;for(let i=0;i<5;i++){c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(i*PI*.4)*7,Math.sin(i*PI*.4)*7);c.stroke()}restoreCanvas()}
}
function dg(s){const it=ITEMS[s],k=it.cl||'#999',a=it.sh;c.lineWidth=1;c.strokeStyle='#0006';c.fillStyle=k;
 if(a=='beam'){c.fillRect(-9,-3,18,6);c.strokeRect(-9,-3,18,6);c.fillStyle='#ffffff55';c.fillRect(-9,-3,18,2)}
 else if(a=='shelf'){c.fillRect(-8,-8,16,16);c.strokeRect(-8,-8,16,16);c.fillStyle='#0004';c.fillRect(-8,-1,16,2);c.fillRect(-8,5,16,2)}
 else if(a=='plate'){c.beginPath();c.roundRect(-9,-6,18,12,2);c.fill();c.stroke();c.fillStyle='#ffffff66';c.fillRect(-9,-6,18,2);c.fillStyle='#0006';for(const x of[-6,6])for(const y of[-2,3]){c.beginPath();c.arc(x,y,1,0,PI*2);c.fill()}}
 else if(a=='ibeam'){c.fillRect(-9,-7,18,3);c.fillRect(-9,4,18,3);c.fillRect(-2,-4,4,8);c.fillStyle='#ffffff55';c.fillRect(-9,-7,18,1)}
 else if(a=='chip'){c.fillRect(-7,-7,14,14);c.strokeRect(-7,-7,14,14);c.fillStyle='#e8eef5';for(let i=-5;i<=5;i+=5){c.fillRect(i-1,-10,2,3);c.fillRect(i-1,7,2,3);c.fillRect(-10,i-1,3,2);c.fillRect(7,i-1,3,2)}c.fillStyle='#ffffff66';c.fillRect(-4,-4,8,8)}
 else if(a=='wheat'){c.strokeStyle=k;c.lineWidth=1.6;for(const x of[-5,0,5]){c.beginPath();c.moveTo(x,8);c.lineTo(x,-4);c.stroke();c.fillRect(x-1.5,-8,3,6)}}
 else if(a=='can'){c.beginPath();c.roundRect(-6,-8,12,16,2);c.fill();c.stroke();c.fillStyle='#e8eef5';c.fillRect(-6,-3,12,5);c.fillStyle='#0004';c.fillRect(-6,-8,12,2)}
 else if(a=='box'){c.fillRect(-8,-7,16,14);c.strokeRect(-8,-7,16,14);c.fillStyle='#ffffff66';c.fillRect(-8,-7,16,3);c.fillStyle='#e8d7a8';c.fillRect(-1.5,-7,3,14)}
 else if(a=='drop'){c.beginPath();c.moveTo(0,-9);c.bezierCurveTo(8,0,7,8,0,8);c.bezierCurveTo(-7,8,-8,0,0,-9);c.fill();c.stroke();c.fillStyle='#ffffff77';c.beginPath();c.arc(-2.5,2,2,0,PI*2);c.fill()}
 else if(a=='pill'){saveCanvas();c.rotate(-.6);c.beginPath();c.roundRect(-8,-4,16,8,4);c.fill();c.stroke();c.fillStyle='#f2f4f7';c.beginPath();c.roundRect(0,-4,8,8,4);c.fill();restoreCanvas()}
 else if(a=='cross'){c.fillRect(-8,-7,16,14);c.strokeRect(-8,-7,16,14);c.fillStyle='#e0533d';c.fillRect(-2,-5,4,10);c.fillRect(-5,-2,10,4)}
 else if(a=='cell'){c.fillRect(-5,-8,10,16);c.strokeRect(-5,-8,10,16);c.fillStyle='#cfd6de';c.fillRect(-2,-10,4,2);c.fillStyle='#ffffff77';c.fillRect(-3,-5,2,8);c.fillStyle='#fde68a';c.fillRect(-1,-2,2,5)}
 else if(a=='cog'){c.beginPath();for(let i=0;i<16;i++){const q=i*PI/8,r=i%2?5.5:8.5;c.lineTo(Math.cos(q)*r,Math.sin(q)*r)}c.closePath();c.fill();c.stroke();c.fillStyle='#2f3640';c.beginPath();c.arc(0,0,2.8,0,PI*2);c.fill()}
 else if(a=='solar'){c.fillRect(-9,-7,18,14);c.strokeRect(-9,-7,18,14);c.strokeStyle='#9cc4ff';for(let i=-3;i<=3;i+=6){c.beginPath();c.moveTo(i,-7);c.lineTo(i,7);c.stroke()}c.beginPath();c.moveTo(-9,0);c.lineTo(9,0);c.stroke()}
 else if(a=='core'){c.fillStyle='#2f3640';c.beginPath();c.arc(0,0,9,0,PI*2);c.fill();c.fillStyle=k;c.shadowColor=k;c.shadowBlur=8;c.beginPath();c.arc(0,0,6,0,PI*2);c.fill();c.shadowBlur=0;c.fillStyle='#fff';c.beginPath();c.arc(0,0,2.2,0,PI*2);c.fill()}
 else if(a=='wheel'){c.beginPath();c.arc(0,0,8.5,0,PI*2);c.fill();c.stroke();c.fillStyle='#9aa4b0';c.beginPath();c.arc(0,0,4,0,PI*2);c.fill()}
 else if(a=='bike'){
  const rear=-7,front=7;
  c.strokeStyle='#202a32';c.lineWidth=1.45;
  for(const x of [rear,front]){c.beginPath();c.arc(x,3.5,4,0,2*PI);c.stroke()}
  c.strokeStyle=k;c.lineWidth=1.6;c.beginPath();
  c.moveTo(rear,3.5);c.lineTo(-3,-3.5);c.lineTo(1,3.5);c.closePath();
  c.moveTo(1,3.5);c.lineTo(4,-4);c.lineTo(-3,-3.5);c.moveTo(front,3.5);c.lineTo(3.5,-5.5);c.lineTo(6,-6);c.stroke();
  c.strokeStyle='#cad2d6';c.beginPath();c.moveTo(-5,-5);c.lineTo(-1,-5);c.stroke();
  if(s===35)rr(-.8,-2,4.6,2.6,.8,'#ced9d9');
 }
 else if(s===36||a==='car'){
  if(s===36){
   c.beginPath();c.moveTo(-11,3);c.lineTo(-10,-1);c.lineTo(-6,-2);c.lineTo(-3,-6);c.lineTo(4,-6);
   c.lineTo(7,-2);c.lineTo(10,-1);c.lineTo(11,3);c.lineTo(8,3);c.arc(5.5,3,2.5,0,PI,true);
   c.lineTo(-3,3);c.arc(-5.5,3,2.5,0,PI,true);c.closePath();c.fill();c.stroke();
  }else{
   rr(-11,-1,22,6,2.1,k);
   c.fillStyle=k;c.beginPath();c.moveTo(-7,-1);c.lineTo(-3,-6);c.lineTo(4,-6);c.lineTo(8,-1);c.fill();
   c.fillStyle='#6a9bae';c.beginPath();c.moveTo(-5,-1.7);c.lineTo(-2.5,-5);c.lineTo(3.7,-5);c.lineTo(6,-1.7);c.fill();
   c.fillStyle='#25383f';c.fillRect(.5,-5,.9,3.5);
   c.fillStyle='#fff0b3';c.fillRect(9,-.1,2,1.5);
   c.fillStyle='#ef8c82';c.fillRect(-11,0,1.5,1.5);
   for(const x of [-6,6]){rr(x-2.9,2.2,5.8,5.8,2.9,'#151c24');rr(x-1.25,3.85,2.5,2.5,1.25,'#abb6bc')}
  }
 }
 else if(a==='truck'){
  rr(-12,3.5,24,2.1,.8,'#3a4248');
  rr(-12,-6,15,9.5,1,k);
  if(s===51){rr(-10,-7.5,11,2.4,1,'#365b89');rr(-9,-3,6,3.5,.8,'#9ebec3')}
  else{c.fillStyle='#fff5';c.fillRect(-11,-5,12,1.2);}
  rr(4,-3.6,8,8,1.3,'#d5e1e5');rr(7,-2.8,4.2,3,1,'#507b92');
  for(const x of [-8,-3,8]){rr(x-2,3.8,4,4,2,'#151c24');rr(x-.8,5,1.6,1.6,.8,'#b5c2c7')}
 }
 else if(a=='robot'){c.fillRect(-5,-1,10,8);c.strokeRect(-5,-1,10,8);c.fillStyle='#e8eef5';c.fillRect(-4,-8,8,6);c.fillStyle='#5ad1ff';c.fillRect(-3,-6,2,2);c.fillRect(1,-6,2,2);c.strokeStyle=k;c.lineWidth=2;c.beginPath();c.moveTo(-5,1);c.lineTo(-9,6);c.moveTo(5,1);c.lineTo(9,6);c.stroke()}
 else if(a=='drone'){c.fillRect(-4,-2,8,5);c.strokeRect(-4,-2,8,5);c.strokeStyle='#cfd6de';c.lineWidth=1.6;c.beginPath();c.moveTo(-4,-1);c.lineTo(-10,-4);c.moveTo(4,-1);c.lineTo(10,-4);c.moveTo(-12,-5);c.lineTo(-8,-5);c.moveTo(8,-5);c.lineTo(12,-5);c.stroke()}
 else if(a=='door'){c.fillRect(-8,-8,16,16);c.strokeRect(-8,-8,16,16);c.fillStyle='#ffd23f';c.fillRect(-8,-2,16,4);c.fillStyle='#10151c';c.beginPath();c.arc(0,0,2.4,0,PI*2);c.fill()}
 else if(a=='mod'){c.fillRect(-9,-7,18,14);c.strokeRect(-9,-7,18,14);c.fillStyle='#ffffff55';c.fillRect(-7,-5,6,10);c.fillRect(1,-5,6,4)}
 else{c.fillRect(-7,-7,14,14);c.strokeRect(-7,-7,14,14)}}
 return {rr,tx,sh,di,dart};
}
