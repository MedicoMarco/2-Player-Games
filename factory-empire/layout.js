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
  const compactHeight=Math.max(.72,Math.min(1,height/400));
  const buttonScale=Math.min(2,Math.max(1,(height-240)/220));
  const categoryHeight=36*compactHeight*buttonScale,toolHeight=56*compactHeight*buttonScale;
  const navW=Math.min(980,available),homeEnd=54;
  const together=available-homeEnd>=310+gap+navW;
  const statusW=Math.min(420,together?available-homeEnd-navW-gap:available-homeEnd);
  const status={x:inset+homeEnd,y:inset,w:statusW,h:46};
  const navY=together?inset:status.y+status.h+gap;
  const navigation=row({x:together?width-inset-navW:inset,y:navY,w:navW,h:45*buttonScale},6);
  const headerBottom=Math.max(status.y+status.h,navigation[0].y+navigation[0].h)+gap;
  const dockWidth=Math.min(available,1800);
  const categoryColumns=Math.min(10,Math.max(1,Math.floor((dockWidth+gap)/61)));
  const categoryRows=Math.ceil(10/categoryColumns);
  const combineTools=dockWidth>=550;
  const dockY=height-inset-categoryRows*(categoryHeight+gap)-(toolHeight+gap)*(combineTools?1:2)+gap;
  const dock={x:inset,y:dockY,w:dockWidth,h:height-inset-dockY};
  const categories=Array.from({length:categoryRows},(_,i)=>row(
   {x:inset,y:dockY+i*(categoryHeight+gap),w:dockWidth,h:categoryHeight},categoryColumns
  )).flat().slice(0,10);
  const toolY=dockY+categoryRows*(categoryHeight+gap);
  const shortcutW=combineTools?Math.min(752,dockWidth*.46):dockWidth;
  const shortcuts=row({x:inset,y:toolY,w:shortcutW,h:toolHeight},5);
  const machines=combineTools
   ?{x:inset+shortcutW+gap,y:toolY,w:dockWidth-shortcutW-gap,h:toolHeight}
   :{x:inset,y:toolY+toolHeight+gap,w:dockWidth,h:toolHeight};
  const cameraSize=45*buttonScale;
  const camera=row({x:width-inset-3*cameraSize-2*gap,y:dockY-cameraSize-gap,w:3*cameraSize+2*gap,h:cameraSize},3);
  const worldScale=Math.min(1,width/640,height/480);
  return {width,height,cx:width/2,cy:height/2+10,worldScale,buttonScale,status,navigation,headerBottom,
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
  const area={x:margin,y:view.headerBottom+(side?31:gap),w:view.width-2*margin,h:0};
  const aboveCamera=view.camera[0].y-gap;
  const bottom=side&&aboveCamera-area.y>=44+bounds.h*.91?aboveCamera:view.height-margin;
  area.h=Math.max(1,bottom-area.y);
  const minScale=side?.91:.94;
  const fit=Math.min(area.w/bounds.w,area.h/bounds.h);
  const controls=side||fit<minScale?44:0;
  const scale=Math.min(2.22,Math.max(minScale,Math.min(area.w/bounds.w,(area.h-controls)/bounds.h)));
  const w=Math.min(area.w,bounds.w*scale),h=Math.max(1,Math.min(area.h-controls,bounds.h*scale));
  const x=side?area.x+area.w-w:area.x+(area.w-w)/2;
  const y=side?area.y:area.y+Math.max(0,(area.h-controls-h)/2);
  const clip={x,y:y+controls,w,h};
  const maxX=Math.max(0,bounds.w*scale-w),maxY=Math.max(0,bounds.h*scale-h);
  return {bar:{x,y,w,h:controls},clip,scale,maxX,maxY};
 }

 return {create,point,panel,row,contains,clamp};
})();
