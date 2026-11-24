/* Each shot has a fixed length, location, dialogue and optional inspection point. */
const FactoryStory=(()=>{
 const shot=(length,place,speaker,line,detail='',sound='')=>({length,place,speaker,line,detail,sound});
 const scenes={
  'arche-intro':{title:'Die letzte Zusage',shots:[
   shot(9,'city','Nachrichtensprecherin','Guten Abend. Die Delegationen haben den Verhandlungssaal verlassen. Eine gemeinsame Erklärung wird es heute nicht geben.','Die Fenster des Konferenzgebäudes gehen nacheinander aus.','warn'),
   shot(8,'city','Notfallfunk','Alle öffentlichen Sammelpunkte bleiben geöffnet. Bitte halten Sie die Zufahrten frei.','Versorgungsfahrzeuge übernehmen die nördliche Zufahrt.'),
   shot(9,'bunker','Reyes','Wir haben einen Standort. Er kann viele Menschen schützen. Aber was hier steht, reicht noch lange nicht.','Unter der Hügelkette liegt ein vorbereiteter Versorgungsschacht.'),
   shot(9,'garage','Reyes','In Ihrer Garage steht der Anfang. Bauen Sie eine Fabrik daraus. Wir brauchen alles, was Sie liefern können.','Die ARCHE-Lieferungen beginnen mit einfachen Holzteilen.'),
   shot(8,'garage','Funkzentrale','Ihr Auftrag ist bestätigt. Projekt ARCHE wartet auf die erste Lieferung.','','unlock')
  ]},
  'arche-finale':{title:'Unter dem letzten Himmel',shots:[
   shot(9,'bunker','Bauleitung','Das letzte Modul sitzt. Schickt die Busse durch das Osttor.','Die letzten Fahrzeuge erreichen die Absenkrampe.','unlock'),
   shot(9,'gate','Reyes','Letzte Gruppe ist durch. Bringt das Tor in die Verriegelung.'),
   shot(8,'flare','Notfallfunk','Alle Sektionen eingeschlossen. Die Außenstation meldet Licht über dem Horizont.','','warn'),
   shot(10,'habitat','Reyes','Alle Zonen antworten. Wir sind unter Tage. Die ARCHE hält.','Die Bewohner bauen aus den Technikräumen eine bewohnbare Station.'),
   shot(10,'habitat','Stationsbericht · mehrere Jahre später','Die Ernte reicht inzwischen für alle. Die Messwerte draußen bleiben zu hoch, um dauerhaft zurückzukehren.'),
   shot(9,'command','Dr. Imani','Wir können hier überleben. Eine Zukunft auf der Oberfläche können wir unseren Kindern nicht versprechen.')
  ]},
  'horizont-intro':{title:'Eine Heimat jenseits der Erde',shots:[
   shot(9,'command','Dr. Imani','Wir bauen eine Flotte. Kein einzelnes Schiff kann Menschen, Vorräte und Ausrüstung für eine Kolonie tragen.','Die neue Produktionsfläche liegt östlich der alten Werke.'),
   shot(9,'shipyard','Reyes','Die Raumwerft ist vorbereitet. Ihre Hallen und Technologien bleiben unser Rückgrat.','Die Werft kann auch die bisherigen Grundstoffe vor Ort herstellen.','select'),
   shot(9,'shipyard','Werftleitung','Zuerst die abgeschirmte Außenhaut. Danach kommen Antrieb, Versorgung und die Systeme für die Besatzung.','Die Werftrampe quittiert die Fracht für das laufende Bauziel.'),
   shot(7,'shipyard','Reyes','Projekt Horizont ist freigegeben. Ihre Aufbauhilfe steht bereit.','','unlock')
  ]},
  'horizont-finale':{title:'Aufbruch',shots:[
   shot(9,'shipyard','Werftleitung','Besatzung und Koloniemodule an Bord. Die letzte Rampe ist frei.','Die Flotte startet erst nach vollständiger Fertigstellung.'),
   shot(9,'launch','Reyes','Die ARCHE hat uns Zeit verschafft. Jetzt tragen wir diese Zeit weiter.','','achieve'),
   shot(8,'launch','Bordfunk','Alle Schiffe auf Kurs. Horizont meldet Abflug vollständig.')
  ]}
 };
 const construction=[
  ['Fundament','Die Fundamente sind ausgehärtet. Auf dieser Platte können wir die unteren Ebenen aufbauen.','Die vermessenen Fundamente tragen anschließend Stahl und Versorgungsschächte.'],
  ['Stahlhülle','Die letzten Träger schließen die Außenhülle. Die Montagekolonne räumt den Schacht.', 'Ein Kran setzt die letzte Stahleinheit auf den Rahmen.'],
  ['Lebenserhaltung','Wasser läuft durch beide Filterkreise. Die Vorräte werden jetzt unter Tage eingelagert.','Wasser und Luft laufen in getrennten Kreisläufen.'],
  ['Energie','Generatoren und Solarträger sind gekoppelt. Die Beleuchtung kann auf Dauerbetrieb umschalten.','Generatoren versorgen Versorgung und Beleuchtung.'],
  ['Evakuierung','Die erste Kolonne ist durchgekommen. Ab jetzt halten die Teams die Ausfahrt und den Osttunnel frei.','Die Fahrzeugkolonne folgt der markierten Evakuierungsstraße.'],
  ['Hightech-Kern','Der Kern übernimmt die Steuerung von Schleusen, Strom und Fracht. Das Netzwerk antwortet aus allen Ebenen.','Roboter verbinden die Arbeitsplätze zwischen den Ebenen.'],
  ['Fertigstellung','Wohnmodule und Zentrale sind betriebsbereit. Die letzte Außenverbindung geht jetzt in den Notbetrieb.','Die ARCHE kann eigenständig betrieben werden.']
 ];
 for(const [i,[title,line,detail]] of construction.entries())scenes['arche-'+(i+1)]={title,stage:i,shots:[
  shot(8,i===4?'gate':'bunker','Bauleitung',line,detail,'unlock'),
  shot(7,i<2?'bunker':i===4?'gate':i===5?'command':'habitat','Reyes','Bauabschnitt '+(i+1)+' bestätigt. Die Mannschaft übernimmt die nächste Schicht.')
 ]};
 for(const [i,title] of ['Außenhaut geschlossen','Flugbereit','Kolonieausrüstung an Bord'].entries())scenes['horizont-'+(i+1)]={title,stage:i,shots:[
  shot(8,'shipyard','Werftleitung',title+'. Der Abschnitt ist abgenommen.','Auf dem Montagefeld sind die zuletzt eingebauten Systeme zu sehen.','unlock'),
  shot(6,'command','Stationsfunk','Werftfortschritt bestätigt. Die nächste Schicht übernimmt.')
 ]};
 const duration=scene=>scenes[scene]?.shots.reduce((t,s)=>t+s.length,0)||0;
 function cue(scene,time){
  const shots=scenes[scene].shots;
  let start=0;
  for(const [index,beat] of shots.entries()){
   if(time<=start+beat.length||index===shots.length-1)return {beat,index,elapsed:Math.max(0,time-start),start};
   start+=beat.length;
  }
 }
 function read(save,unlocked){
  const stored=save?.story;
  const known=id=>Object.hasOwn(scenes,id)&&unlocked(id);
  const done={};
  for(const id of Object.keys(stored?.done||{}))if(stored.done[id]&&known(id))done[id]=true;
  const queue=[...new Set(Object.values(stored?.queue||{}).filter(id=>known(id)&&!done[id]))];
  if(!save)queue.push('arche-intro');
  else if(stored?.version!==1){
   done['arche-intro']=true;
   for(let i=1;i<=7;i++)if(known('arche-'+i))done['arche-'+i]=true;
   if(known('arche-finale')){
    if(known('horizont-intro')){done['arche-finale']=true;queue.push('horizont-intro')}
    else queue.push('arche-finale');
   }
  }
  const max=duration(queue[0]);
  return {version:1,done,queue,time:Math.min(Math.max(0,Number(stored?.time)||0),max),paused:stored?.paused===true,subtitles:stored?.subtitles!==false,muted:stored?.muted===true};
 }
 return {scenes,duration,cue,read};
})();
