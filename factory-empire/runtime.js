/* Shared save identity and time-budgeted runs of the fixed simulation tick. */
const FactoryRuntime=(()=>{
function validSave(value){
 if(!value||typeof value!=='object'||!Number.isFinite(value.ts)||value.ts<=0||!Number.isFinite(value.m))return false;
 if(value.transportVersion!=null&&value.transportVersion!==1&&value.transportVersion!==2)return false;
 if(value.v===4)return [0,1].every(i=>Number.isInteger(value.yardRows?.[i])&&value.yardRows[i]>=0&&value.yardRows[i]<=FactoryYard.trim);
 return value.v===1||value.v===2||value.v===3||value.v==null&&('ar' in value||'o' in value);
}
function revision(value){
 if(value==null)return '';
 if(!validSave(value))return 'invalid';
 return typeof value.rev=='string'&&value.rev?value.rev:'legacy:'+value.ts;
}
function step(steps,tick,budget=14){
 const start=Date.now();
 let ran=0;
 while(ran<steps){
  const limit=Math.min(steps,ran+64);
  for(;ran<limit;ran++)tick();
  if(steps>40&&Date.now()-start>=budget)break;
 }
 return ran;
}
 return {validSave,revision,step};
})();
