/* Short simulation-time windows for actual factory, transport and sales statistics. */
const FactoryTelemetry=(()=>{
 const BUCKETS=6;
 const INTERVAL=10;
 const FIELDS=['output','moves','arrivals','sold','value','cost','materials','blocked','blockedWork','power','wages'];
 function totals(value,tick){
  const stats={since:tick};
  if(Number.isFinite(value?.since))stats.since=Math.max(0,Math.min(tick,value.since));
  for(const key of FIELDS)stats[key]=Number.isFinite(value?.[key])?Math.max(0,value[key]):0;
  return stats;
 }
 function create(tick,step,history){
  const slot=Math.floor(tick*step/INTERVAL);
  const buckets=Array(BUCKETS).fill(null);
  for(const b of Object.values(history||{})){
   if(!Number.isInteger(b?.slot)||b.slot<0||b.slot>slot||slot-b.slot>=BUCKETS)continue;
   const values={};
   for(const key of FIELDS)if(Number.isFinite(b.values?.[key])&&b.values[key]>=0)values[key]=b.values[key];
   buckets[b.slot%BUCKETS]={slot:b.slot,values};
  }
  return buckets;
 }
 function record(buckets,tick,step,key,amount=1){
  if(!amount)return;
  const slot=Math.floor(tick*step/INTERVAL),index=slot%BUCKETS;
  if(buckets[index]?.slot!==slot)buckets[index]={slot,values:{}};
  const values=buckets[index].values;
  values[key]=(values[key]||0)+amount;
 }
 function rates(buckets,tick,step,since=0){
  const elapsed=tick*step,slot=Math.floor(elapsed/INTERVAL);
  const sinceSeconds=Math.max(since*step,(slot-BUCKETS+1)*INTERVAL,0);
  const minutes=Math.max(1,elapsed-sinceSeconds)/60;
  const result={};
  for(const key of FIELDS)result[key]=0;
  for(const b of buckets){
   if(!b||b.slot>slot||slot-b.slot>=BUCKETS)continue;
   for(const [key,value] of Object.entries(b.values))result[key]+=value/minutes;
  }
  return result;
 }
 return {totals,create,record,rates};
})();
