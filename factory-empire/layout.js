/* Factory Empire's stage uses CSS pixels. Only the backing canvas uses device pixels. */
const FactoryLayout=(()=>{
 const inset=8,gap=4;
 const contains=(box,x,y)=>x>=box.x&&x<box.x+box.w&&y>=box.y&&y<box.y+box.h;
 const clamp=(n,max)=>Math.min(max,Math.max(0,n));

 function row(box,count){
  const width=(box.w-gap*(count-1))/count;
  return Array.from({length:count},(_,i)=>({...box,x:box.x+i*(width+gap),w:width}));
 }
 function dockTrack(box,count,buttonWidth){
  const stride=buttonWidth+gap,total=Math.max(0,count*stride-gap);
  const arrows=total>box.w?Math.min(42,box.w*.16):0;
  const clip={...box,w:Math.min(total,box.w-(arrows?2*(arrows+gap):0))};
  return {box:{...box,w:arrows?box.w:clip.w},clip,arrows,buttonWidth,stride,max:total-clip.w};
 }

 function create(width,height){
  const available=width-inset*2;
  const touchRoom=clamp((height-270)/200,1);
  const phone=clamp((520-width)/130,1);
  const tablet=clamp((Math.min(width,height)-420)/220,1);
  const desktop=clamp(Math.min((width-1050)/230,(height-470)/210),1);
  const largeDesktop=desktop*clamp((width-1440)/900,1);
  const labelScale=1+.1*tablet+.18*desktop+.12*largeDesktop;
  const navHeight=34+5*touchRoom+7*tablet+8*desktop+6*largeDesktop-3*phone;
  const homeEnd=navHeight+8,navPreferred=450*labelScale,statusMin=286*labelScale;
  const together=available>=homeEnd+statusMin+gap+416*labelScale;
  const navW=Math.min(navPreferred,together?available-homeEnd-statusMin-gap:available);
  const statusW=Math.min(344*labelScale+46*desktop,together?available-homeEnd-navW-gap:available-homeEnd);
  const status={x:inset+homeEnd,y:inset,w:statusW,h:navHeight};
  const navY=together?inset:status.y+status.h+gap;
  const navigation=row({x:together?width-inset-navW:inset,y:navY,w:navW,h:navHeight},7);
  const headerBottom=Math.max(status.y+status.h,navigation[0].y+navigation[0].h)+gap;
  const dockRoom=clamp((height-295)/285,1),combineTools=available>=690;
  const categoryHeight=32+10*dockRoom-5*phone,toolHeight=60+22*dockRoom-14*phone;
  const shortcutHeight=combineTools?toolHeight:44+18*dockRoom-7*phone;
  const toolGap=10,rowGap=9;
  const dockY=height-inset-categoryHeight-rowGap-toolHeight-(combineTools?0:shortcutHeight+toolGap);
  const dock={x:inset,y:dockY,w:available,h:height-inset-dockY};
  const categories={x:inset,y:dockY,w:available,h:categoryHeight};
  const toolY=dockY+categoryHeight+rowGap,shortcutW=Math.min(87*5+4*gap,available);
  const shortcuts=row({x:inset,y:toolY,w:shortcutW,h:shortcutHeight},5);
  const machines=combineTools
   ?{x:inset+shortcutW+toolGap,y:toolY,w:available-shortcutW-toolGap,h:toolHeight}
   :{x:inset,y:toolY+shortcutHeight+toolGap,w:available,h:toolHeight};
  const dockLabelScale=1+.08*tablet+.16*desktop,machineWidth=96+12*desktop-13*phone,categoryWidth=86+12*desktop-9*phone;
  const cameraSize=34+6*touchRoom+4*tablet+5*desktop+5*largeDesktop-4*phone;
  const cameraW=3*cameraSize+2*gap,cameraY=dockY-cameraSize-rowGap;
  const cameraInHeader=!together&&cameraY<headerBottom;
  const cameraX=cameraInHeader?status.x:inset;
  if(cameraInHeader){status.x+=cameraW+gap;status.w=Math.min(status.w,width-inset-status.x)}
  const camera=row({x:cameraX,y:cameraInHeader?inset:cameraY,w:cameraW,h:cameraInHeader?navHeight:cameraSize},3);
  const info=camera[0].y-camera[0].h-gap>=headerBottom
   ?{...camera[0],y:camera[0].y-camera[0].h-gap}
   :{...camera[0],x:camera.at(-1).x+camera[0].w+gap};
  if(cameraInHeader){status.x+=info.w+gap;status.w=Math.max(0,Math.min(status.w,width-inset-status.x))}
  const worldScale=Math.min(1,width/640,height/480);
  const panelScale=1.07+.10*tablet+.30*desktop+.20*largeDesktop;
  const warningHeight=24*labelScale;
  return {width,height,cx:width/2,cy:height/2+10,worldScale,labelScale,panelScale,warningHeight,status,navigation,headerBottom,
   dock,categories,shortcuts,machines,camera,info,dockLabelScale,machineWidth,categoryWidth,wide:combineTools,inset};
 }

 function point(event,canvas,width,height,rotated=false){
  const rect=canvas.getBoundingClientRect();
  if(!(rect.width>0&&rect.height>0))return [NaN,NaN];
  const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
  return rotated?[y*width,(1-x)*height]:[x*width,y*height];
 }

 function panel(view,bounds,side=false){
  const margin=view.inset;
  const area={x:margin,y:view.headerBottom+(side?view.warningHeight+7:gap),w:view.width-2*margin,h:0};
  const minScale=side?.91:.94;
  const compactBar=34*view.labelScale,aboveCamera=view.camera[0].y-gap;
  const bottom=side&&aboveCamera-area.y>=compactBar+bounds.h*minScale?aboveCamera:view.height-margin;
  area.h=Math.max(1,bottom-area.y);
  const fit=Math.min(area.w/bounds.w,area.h/bounds.h);
  const controls=side||fit<minScale?compactBar:0;
  const scale=Math.min(view.panelScale,Math.max(minScale,Math.min(area.w/bounds.w,(area.h-controls)/bounds.h)));
  const w=Math.min(area.w,bounds.w*scale),h=Math.max(1,Math.min(area.h-controls,bounds.h*scale));
  const x=side?area.x+area.w-w:area.x+(area.w-w)/2;
  const y=side?area.y:area.y+Math.max(0,(area.h-controls-h)/2);
  const clip={x,y:y+controls,w,h};
  const maxX=Math.max(0,bounds.w*scale-w),maxY=Math.max(0,bounds.h*scale-h);
  return {bar:{x,y,w,h:controls},clip,scale,maxX:maxX<.001?0:maxX,maxY:maxY<.001?0:maxY};
 }

 return {create,point,panel,row,dockTrack,contains,clamp};
})();
