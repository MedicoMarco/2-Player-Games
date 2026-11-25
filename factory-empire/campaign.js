const FactoryCampaign=(()=>{
 const chapters={2:{title:'Horizont',project:'Evakuierungsflotte',speed:1.06,grant:75000,site:'orbit',
  phases:[
   {n:'Gerüst und Außenhaut',hall:'orb',brief:'Baue Linien für Verbundplatten und Schilde. Verwende sie auch als Zutaten für Raumschiffhüllen.',q:[[53,100],[54,48],[55,20]],rw:[38000,20]},
   {n:'Antrieb und Versorgung',hall:'orb',brief:'Versorge die Linien für Triebwerke, Navigation und Lebenserhaltung. Halte die drei Warenströme an der Werftrampe getrennt.',q:[[56,42],[57,36],[58,28]],rw:[56000,30]},
   {n:'Besatzung und Kolonie',hall:'orb',brief:'Baue Kryokammern und montiere die ersten Koloniemodule. Halte trotzdem Reserven an Ionentriebwerken bereit.',q:[[59,40],[60,17],[56,12]],rw:[100000,40]},
   {n:'Montage der Flotte',hall:'orb',brief:'Rüste weitere Schiffe mit Hüllen und Schilden aus. Die Werft braucht zusätzlich Roboter und mobile Versorgungssysteme.',q:[[55,80],[54,130],[39,80],[51,12]],rw:[160000,45]},
   {n:'Energie und Navigation',hall:'orb',brief:'Richte eigene Zulieferlinien für Akkus und Reaktorkerne ein. Der nächste Ausbau braucht auch Triebwerke und Navigationscomputer.',q:[[56,100],[57,95],[28,650],[32,52]],rw:[240000,55]},
   {n:'Vorräte für die Reise',hall:'orb',brief:'Halte die Produktion von Lebenserhaltung und Kryokammern aufrecht. Liefere auch Versorgungsmodule und Erste-Hilfe-Sets für die Reise.',q:[[58,90],[59,80],[43,45],[27,250]],rw:[340000,65]},
   {n:'Startbereitschaft',hall:'orb',brief:'Vervollständige die Koloniemodule und liefere die letzten Hüllen, Kryokammern und Navigationscomputer.',q:[[60,58],[55,75],[59,28],[57,15]],rw:[500000,80]}
  ]}};
 const archeUpgrade={beltSpeed:1.10,storage:20,construction:.95};
 const revision=2;
 function needsMigration(save){
  return save?.campaign?.level===2&&save.campaign.revision!==revision;
 }
 const limit=(value,max=1e8)=>Math.min(max,Math.max(0,Number.isFinite(value)?Math.floor(value):0));
 function read(save,bunkerDone){
  const data=save?.campaign;
  const level=bunkerDone&&chapters[data?.level]?Number(data.level):1;
  const phases=chapters[level]?.phases||[];
  const stage=phases.length
   ?needsMigration(save)&&data.stage>=3?phases.length:limit(data.stage,phases.length)
   :0;
  const delivery=phases[stage]?.q.map(([,goal],i)=>limit(data.delivery?.[i],goal))||[];
  return {level,stage,delivery,revision,total:level>1?limit(data.total):0};
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
 return {chapters,read,legacy,compensation,archeUpgrade,needsMigration};
})();
