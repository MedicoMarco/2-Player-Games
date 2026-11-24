/* Factory Empire's stage uses CSS pixels. Only the backing canvas uses device pixels. */
const FactoryLayout=(()=>{
 const inset=8,gap=4;
 const contains=(box,x,y)=>x>=box.x&&x<box.x+box.w&&y>=box.y&&y<box.y+box.h;
 const clamp=(n,max)=>Math.min(max,Math.max(0,n));

 function row(box,count){
  const width=(box.w-gap*(count-1))/count;
  return Array.from({length:count},(_,i)=>({...box,x:box.x+i*(width+gap),w:width}));
 }

 function create(width,height){
  const available=width-inset*2;
  const touchRoom=clamp((height-270)/200,1);
  const tablet=clamp((Math.min(width,height)-420)/220,1);
  const desktop=clamp(Math.min((width-1050)/230,(height-470)/210),1);
  const largeDesktop=desktop*clamp((width-1440)/900,1);
  const labelScale=1+.1*tablet+.18*desktop+.12*largeDesktop;
  const navHeight=34+5*touchRoom+7*tablet+8*desktop+6*largeDesktop;
  const homeEnd=navHeight+8,navPreferred=450*labelScale,statusMin=286*labelScale;
  const together=available>=homeEnd+statusMin+gap+416*labelScale;
  const navW=Math.min(navPreferred,together?available-homeEnd-statusMin-gap:available);
  const statusW=Math.min(344*labelScale+46*desktop,together?available-homeEnd-navW-gap:available-homeEnd);
  const status={x:inset+homeEnd,y:inset,w:statusW,h:navHeight};
  const navY=together?inset:status.y+status.h+gap;
  const navigation=row({x:together?width-inset-navW:inset,y:navY,w:navW,h:navHeight},6);
  const headerBottom=Math.max(status.y+status.h,navigation[0].y+navigation[0].h)+gap;
  const dockWidth=Math.min(available,850+260*desktop+150*largeDesktop),dockX=(width-dockWidth)/2;
  const categoryColumns=Math.min(10,Math.max(1,Math.floor((dockWidth+gap)/54)));
  const categoryRows=Math.ceil(10/categoryColumns);
  const combineTools=dockWidth>=500;
  const categoryHeight=Math.min(26,Math.max(20,height*.05))-(categoryRows>1?4:0)+5*tablet+5*desktop+4*largeDesktop;
  const toolHeight=Math.min(combineTools?54:46,Math.max(39,height*.105))+6*tablet+8*desktop+10*largeDesktop+(combineTools?0:4*touchRoom);
  const shortcutHeight=combineTools?toolHeight:29+10*touchRoom;
  const dockY=height-inset-categoryRows*(categoryHeight+gap)-toolHeight-(combineTools?0:shortcutHeight+gap);
  const dock={x:dockX,y:dockY,w:dockWidth,h:height-inset-dockY};
  const categories=Array.from({length:categoryRows},(_,i)=>row(
   {x:dockX,y:dockY+i*(categoryHeight+gap),w:dockWidth,h:categoryHeight},
   Math.min(categoryColumns,10-i*categoryColumns)
  )).flat();
  const toolY=dockY+categoryRows*(categoryHeight+gap);
  const shortcutW=combineTools?Math.min(323*labelScale,dockWidth*.43):dockWidth;
  const shortcuts=row({x:dockX,y:toolY,w:shortcutW,h:shortcutHeight},5);
  const machines=combineTools
   ?{x:dockX+shortcutW+gap,y:toolY,w:dockWidth-shortcutW-gap,h:toolHeight}
   :{x:dockX,y:toolY+shortcutHeight+gap,w:dockWidth,h:toolHeight};
  const cameraSize=34+6*touchRoom+4*tablet+5*desktop+5*largeDesktop;
  const camera=row({x:width-inset-3*cameraSize-2*gap,y:dockY-cameraSize-gap,w:3*cameraSize+2*gap,h:cameraSize},3);
  const worldScale=Math.min(1,width/640,height/480);
  const panelScale=1.07+.10*tablet+.30*desktop+.20*largeDesktop;
  const warningHeight=24*labelScale;
  return {width,height,cx:width/2,cy:height/2+10,worldScale,labelScale,panelScale,warningHeight,status,navigation,headerBottom,
   dock,categories,shortcuts,machines,camera,wide:combineTools,inset};
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
  return {bar:{x,y,w,h:controls},clip,scale,maxX,maxY};
 }

 return {create,point,panel,row,contains,clamp};
})();
