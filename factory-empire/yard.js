/* The original hall coordinates are the reference for all three saved maps. */
const FactoryYard=(()=>{
 const width=188,height=62,mainRight=79,annexStart=82;
 const rowCuts=[19,41],oldDepth=10,trim=2,sideDepth=10;
 const columnCuts=[[25,51],[29,54],[43,66]];
 const hallPairs=[['gar','met'],['met','elk'],['vrs','ene'],['ene','fzg'],['hit','bnk']];
 const section=y=>y<rowCuts[0]?0:y<rowCuts[1]?1:2;
 function sideOffset(x,row){
  if(x>=annexStart)return 2*sideDepth;
  return columnCuts[row].filter(cut=>x>=cut).length*sideDepth;
 }
 function create(version,removed=[trim,trim]){
  const compact=version===4,expanded=version>=3;
  const depths=rowCuts.map((_,i)=>expanded?oldDepth-(compact?removed[i]:0):0);
  const east=compact?2*sideDepth:0;
  const point=(x,y)=>{
   if(x>=annexStart)return [x+east,y];
   const row=section(y);
   return [x+(compact?sideOffset(x,row):0),y+(row>=1?depths[0]:0)+(row===2?depths[1]:0)];
  };
  function rect([x,y,right,bottom]){
   const [a,b]=point(x,y),[c,d]=point(right,bottom);
   return [a,b,c,d];
  }
  function plotRects([x,y,right,bottom]){
   const boundaries=compact?columnCuts[section(y)].filter(cut=>x<cut&&cut<=right):[];
   const edges=[x,...boundaries,right+1];
   return edges.slice(0,-1).map((left,i)=>rect([left,y,edges[i+1]-1,bottom]));
  }
  return {version,removed,depths,east,point,rect,plotRects,mainRight:mainRight+east,
   width:width+east,height:height+depths[0]+depths[1]};
 }
 function previousRows(occupied){
  // Only reclaim empty rows in the space added by the previous layout.
  const cuts=rowCuts.map((cut,i)=>cut+i*oldDepth);
  return cuts.map((cut,i)=>{
   const rows=[];
   for(let y=cut+1;y<cut+oldDepth-1&&rows.length<trim;y++){
    if(!occupied.has(y))rows.push(y);
   }
   return rows;
  });
 }
 function widen(x,y,removed){
  if(x>=annexStart)return [x+2*sideDepth,y];
  // The bands start after the space added by the previous hall expansion.
  const row=y<rowCuts[0]+oldDepth?0:y<rowCuts[1]+2*oldDepth?1:2;
  const deleted=removed[0].filter(at=>at<y).length+removed[1].filter(at=>at<y).length;
  return [x+sideOffset(x,row),y-deleted];
 }
 return {create,previousRows,widen,hallPairs,annexStart,width,height,oldDepth,trim,sideDepth};
})();
