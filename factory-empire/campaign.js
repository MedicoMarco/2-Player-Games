const FactoryCampaign=(()=>{
 const chapters={2:{title:'Horizont',project:'Evakuierungsflotte',speed:1.06,grant:75000,site:'orbit',
  phases:[
   {n:'Gerüst und Außenhaut',hall:'orb',brief:'Die erste Hülle wird aus abgeschirmten Segmenten gebaut. Stahl und Kunststoffe kommen aus den bestehenden Werken.',q:[[53,40],[54,20],[55,12]],rw:[38000,20]},
   {n:'Antrieb und Versorgung',hall:'orb',brief:'Die Flotte benötigt einsatzbereite Triebwerke, Navigation und unabhängige Versorgung für den langen Flug.',q:[[56,16],[57,16],[58,12]],rw:[56000,30]},
   {n:'Besatzung und Kolonie',hall:'orb',brief:'Kryokammern und Koloniemodule bringen die Besatzung und die Ausrüstung für den Aufbau einer neuen Heimat an Bord.',q:[[59,14],[60,8],[56,8]],rw:[100000,40]}
  ]}};
 const limit=(value,max=1e8)=>Math.min(max,Math.max(0,Number.isFinite(value)?Math.floor(value):0));
 function read(save,bunkerDone){
  const data=save?.campaign;
  const level=bunkerDone&&chapters[data?.level]?Number(data.level):1;
  const phases=chapters[level]?.phases||[];
  const stage=phases.length?limit(data.stage,phases.length):0;
  const delivery=phases[stage]?.q.map(([,goal],i)=>limit(data.delivery?.[i],goal))||[];
  return {level,stage,delivery,total:level>1?limit(data.total):0};
 }
 function legacy(save){
  const active=save?.legacyIndustry,upgrades=save?.pu;
  if(active)return {construction:limit(active.construction,10),speed:limit(active.speed,10),storage:limit(active.storage,5),
   sales:limit(active.sales,5),experience:limit(active.experience),management:limit(active.management,5),wages:limit(active.wages,5),foundings:limit(active.foundings)};
  return {construction:limit(upgrades?.cap2,10),speed:limit(upgrades?.prd1,10),storage:limit(upgrades?.log1,5),
   sales:limit(upgrades?.log2,5),experience:limit(save?.bpt),management:limit(upgrades?.mgt1,5),wages:limit(upgrades?.mgt2,5),foundings:limit(save?.pr)};
 }
 function compensation(save){
  if(save?.legacyIndustry)return {money:0,research:0};
  return {money:limit(save?.bp)*500+limit(save?.pu?.cap1,10)*600,research:limit(save?.pu?.res1,5)*4};
 }
 return {chapters,read,legacy,compensation};
})();
