/* Descriptions explain the process represented by each tile. */
const factoryMachineDetails={
 src:'Ein Holzplatz mit gestapelten Stämmen. Er kauft Rohholz automatisch und gibt es einzeln ans Band ab.',
 saw:'Das Kreissägeblatt schneidet Rohholz zu Holzteilen. Lege die Holz-Zufuhr an und führe die gesägten Teile zu einer Formmaschine oder zum Versand.',
 frm:'Ein Stempel formt zugeschnittenes Holz zu gleichmäßigen Rohlingen für die Spielzeugmontage.',
 asm:'Der Greifarm hält und verbindet Rohlinge zu einem montierten Spielzeug. Die fertigen Teile können in die Lackierstation.',
 pnt:'In der Spritzkabine bekommt das montierte Spielzeug seinen Anstrich. Danach ist es bereit zum Verpacken.',
 pck:'Die Kartonstation verpackt fertig lackierte Spielzeuge für den Versand oder die Etikettierung.',
 bal:'Die beheizte Balkenpresse drückt mehrere Holzteile in eine lange Form. Die Balken werden etwa für Regale oder das ARCHE-Fundament gebraucht.',
 reg:'Ein Montagegestell hält die Seiten senkrecht, während Böden und Balken zu einem Regal verbunden werden.',
 ers:'Das Erzlager kauft automatisch Erz und gibt es an den Schmelzofen oder den Versand ab.',
 sme:'Der Schmelzofen erhitzt Erz. Ein Ausguss befördert die Schmelze in eine Barrenform.',
 mil:'Ein rotierender Fräskopf trägt Material vom Barren ab. So entsteht ein präzises Metallteil.',
 wal:'Zwei gegenläufige Rollen ziehen die Barren ein und walzen sie zu flachem Stahlblech.',
 wrk:'An der Werkbank werden ein Metallteil und ein Holzteil zu einem Werkzeug verbunden.',
 sch:'Der Schweißkopf verbindet Bleche mit Metallteilen zu einem tragenden Stahlprofil.',
 pan:'Ein Schwerlastgesenk presst Stahlprofile und Bleche zu dicken Panzerplatten.',
 gra:'Der Trichter kauft Kunststoffgranulat und dosiert es einzeln auf das Ausgabeband.',
 inj:'Granulat schmilzt im Spritzguss und wird zwischen zwei Formhälften zu einem Gehäuse.',
 pcb:'Die Bestückungslinie legt feine Leiterbahnen und Bauteile auf eine Platine.',
 sen:'Eine optische Prüfbank richtet den Messkopf im Gehäuse aus und verbindet ihn mit der Platine.',
 ele:'Ein Montagearm setzt Platinen in Gehäuse ein. Anschließend entstehen einsatzbereite Smartphones.',
 ste:'Im Schaltschrank werden Platinen und Sensormodule zu einer kompletten Steuerung verdrahtet.',
 fld:'Das Feld liefert Getreide automatisch. Für jede Ernte zieht die Anlage die Rohstoffkosten vom Konto ab.',
 kon:'Ein Kochkessel verarbeitet das Getreide. Am Abfüllkopf wird das Ergebnis in Dosen gefüllt.',
 rat:'Die Versiegelungsmaschine fasst mehrere Konserven zu einer stapelbaren Notration zusammen.',
 pmp:'Das Pumpwerk fördert Rohwasser automatisch und gibt es an die Filteranlage ab.',
 fil:'Das Rohwasser läuft durch eine Reihe von Filterzylindern. Aus der Leitung kommt versandfertiges Trinkwasser.',
 pha:'Dosierpipetten mischen in einem abgeschirmten Labor Wasser und Ausgangsstoffe für Medikamente.',
 mds:'Die Packstation sortiert Medikamente in ein Gehäuse und verschließt es als Erste-Hilfe-Set.',
 akk:'Die Anlage setzt einzelne Zellen zusammen und prüft den Ladestand des fertigen Akkus.',
 mot:'Im Prüfstand wird der Rotor in das Motorgehäuse eingesetzt und auf freien Lauf geprüft.',
 sol:'Eine Laminierstation versiegelt Zellen und Rahmen, damit ein wetterfestes Solarmodul entsteht.',
 gen:'Auf einem gemeinsamen Maschinenbett werden Motoren und Steuerung zu einem Generator gekoppelt.',
 rea:'Ein abgeschirmter Ringprüfstand verbindet Generatoren, Panzerung und Steuerung zum Reaktorkern.',
 rad:'Auf der Reifenmontage werden Felge und Reifen zusammengefügt und zentriert.',
 fah:'Eine Rahmenlehre hält das Fahrrad fest, während Laufräder und der Metallrahmen montiert werden.',
 ebk:'Auf dem Prüfstand bekommt ein fertiges Fahrrad einen Motor und einen Akku im Rahmen.',
 kar:'Ein tiefes Pressgesenk zieht Stahlblech in die Form einer Fahrzeugkarosserie.',
 aut:'Ein Fahrzeuglift hebt die Karosserie an. Darunter montiert die Linie Antrieb, Steuerung und Räder.',
 lkw:'Auf zwei Schienen entsteht zuerst der lange Lkw-Rahmen. Anschließend setzt die Linie Fahrerhaus und Ladeaufbau auf.',
 rob:'Ein Montageplatz setzt Gelenke, Antrieb und Steuerung zu einem Industrieroboter zusammen.',
 kip:'Im Reinraum richtet ein Wafer-Scanner die Chipstrukturen aus. Der KI-Chip verlässt den Reinraum auf einem Träger.',
 dro:'Eine kreuzförmige Lehre richtet vier Rotorarme um die Steuereinheit der Drohne aus.',
 woh:'Das Werk setzt Wände, Fenster und ein Solardach zum bewohnbaren Modul zusammen.',
 ver:'Hinter den Türen des Versorgungsmoduls sitzen Rohrleitungen und Lager für Wasser, Nahrung und Medizin.',
 tor:'Ein großer Stahlrahmen nimmt die beiden beweglichen Torflügel und ihre Antriebe auf.',
 kom:'Ein Leitstand fasst die Anlagensteuerung in einer Zentrale mit mehreren Bedienplätzen zusammen.',
 furniture:'Bei der Möbelmontage verbinden Winkel und Beschläge die Regalteile zu einem fertigen Möbelset.',
 mobile:'Ein Kran hebt Versorgungsmodul und Fertigungszelle auf ein Lkw-Fahrgestell. Das Solardach versorgt das mobile System.',
 fitting:'Eine Stanzpresse formt Metall um die gebohrten Leisten zu passenden Möbelbeschlägen.',
 drill:'Eine Ständerbohrmaschine setzt senkrechte Bohrungen in zugeschnittene Holzleisten.',
 label:'Eine Etikettenrolle führt das Drucketikett an den Andrückkopf. Der Kopf klebt es auf die laufende Packung.',
 servo:'Eine Präzisionslehre richtet Motor und Positionssensor für den Servoantrieb aus.',
 cellFab:'Hinter einer Schutzumzäunung werden Roboter, Antriebe und Steuerung zu einer Fertigungszelle verbunden.',
 laminate:'Auf dem Vakuumbett verbindet die Presse mehrere Schichten zu einer steifen Verbundplatte.',
 shield:'Eine gewölbte Pressform fügt Verbundplatten und Panzerung zum Strahlenschutzschild zusammen.',
 hull:'Ein Portalrahmen hält Spanten und Platten, bis sie eine geschlossene Raumschiffhülle bilden.',
 ion:'In der Prüfkammer werden Energieversorgung, Kühlsystem und Triebwerksdüse zusammengebaut.',
 navcore:'Das Labor verbindet Rechnerplatine und Sensorik und prüft die Ausrichtung am Navigationsschirm.',
 lifebox:'Ein Rohrnetz verbindet Wasserfilter und Versorgungseinheit. Das Modul hält später die Besatzung am Leben.',
 cryo:'Die Anlage montiert Isolierung, Kühlung und Sichtfenster zur Kryokammer für den Kälteschlaf der Besatzung.',
 colony:'Ein Montageportal verbindet Hülle, Lebenserhaltung, Navigation und Kryokammer zum Koloniemodul.',
 grid:'An diesem erhaltenen Kraftwerksmodell sind Generator und Abgasrohr sichtbar. Es stammt aus einer früheren Werkversion.',
 loadgrid:'Ein historischer Verteiler mit Sammelschiene und separaten Abgängen.',
 hub:'Eine historische Energiezentrale mit zwei Transformatoren und Stromschienen.'
};

function createFactoryEquipment(c,{rr,di,withState}){
 const steel='#c7d6df',dark='#243240',glass='#477b8e',light='#a9dbe5',yellow='#edb95c';
 const box=(x,y,w,h,color,r=2)=>rr(x,y,w,h,r,color);
 const poly=(color,...points)=>{
  c.beginPath();c.moveTo(...points[0]);for(const point of points.slice(1))c.lineTo(...point);
  c.closePath();c.fillStyle=color;c.fill();
 };
 const line=(color,width,...points)=>{
  c.beginPath();c.moveTo(...points[0]);for(const point of points.slice(1))c.lineTo(...point);
  c.lineWidth=width;c.strokeStyle=color;c.stroke();
 };
 const disc=(x,y,r,color)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill()};
 const rail=(y)=>{box(-17,y,34,5,dark);for(let x=-13;x<16;x+=6)box(x,y+1,3,3,steel,.7)};
 const product=(id,x,y,scale)=>withState(()=>{c.translate(x,y);c.scale(scale,scale);di(id)});
 const post=(x,h=22)=>{box(x,-14,4,h,steel,1);box(x+1,-13,1,h-2,'#fff6',.5)};
 const glassPanel=(x,y,w,h)=>{box(x,y,w,h,dark,1);box(x+1,y+1,w-2,h-2,glass,1);line(light,1,[x+2,y+2],[x+w-2,y+2])};
 const controlPanel=(x,y)=>{box(x,y,10,8,dark);box(x+1,y+1,8,4,glass,1);disc(x+7,y+6,1,'#a6edaa')};
 const bars=(xs,y,h,color)=>{for(const x of xs)box(x,y,2,h,color,.5)};
 const sawTeeth=Array.from({length:24},(_,i)=>{
  const angle=i*Math.PI/12,r=i%2?7:9;
  return [Math.cos(angle)*r,Math.sin(angle)*r];
 });
 const machines={
  saw:({angle})=>{
   rail(11);box(-16,-11,32,19,'#9ca9b2');box(-14,-9,28,15,'#52636e');
   box(-15,-3,8,6,'#a7774b');box(7,-3,8,6,'#d4b17a');box(-10,5,22,3,steel);
   withState(()=>{
    c.rotate(angle);
    poly(steel,...sawTeeth);disc(0,0,2,dark);
   });
  },
  src:()=>{rail(12);post(-15,25);post(12,25);for(const y of [-8,-2,4]){box(-13,y,25,5,'#a27045',2);disc(10,y+2.5,2.5,'#e3bd80');disc(10,y+2.5,1,'#91663d')}box(-16,-13,32,3,dark)},
  ers:()=>{poly(steel,[-16,-9],[15,-9],[9,8],[-9,8]);poly(dark,[-14,-8],[13,-8],[9,1],[-10,1]);for(const [x,y] of [[-9,-4],[-1,-5],[6,-3]])poly('#9aa7b0',[x-2,y],[x,y-3],[x+4,y-1],[x+2,y+2]);box(-5,8,10,6,dark)},
  sol:({travel})=>{rail(12);box(-16,-13,32,9,steel);post(-15,28);post(10,28);product(30,0,3,1.18);line(light,1,[-9,-5+travel*.25],[8,-5+travel*.25]);box(-16,-10,6,3,yellow)},
  rad:()=>{box(-15,8,31,7,dark);post(-15);box(-15,-14,14,5,steel);product(33,1,1,1.2);line(yellow,2,[12,-9],[8,-5],[9,5]);disc(12,-9,2,steel)},
  bal:({lift})=>{rail(10);post(-15);post(12);box(-15,-16,31,5,steel);box(-5,-11,10,9+lift,yellow);box(-12,-3+lift,25,3,steel);product(14,0,7,.94)},
  reg:()=>{post(-14,27);post(10,27);for(const y of [-12,-2,9])box(-14,y,28,3,'#c69a6f',.8);box(-8,2,7,7,dark);box(3,-9,5,7,'#ac6741')},
  pan:({lift})=>{box(-16,-15,32,9,dark);box(-16,6,32,9,dark);poly(steel,[-14,-6],[14,-6],[9,3+lift*.4],[-9,3+lift*.4]);product(18,0,5,.7);bars([-12,-6,0,6,12],-13,4,yellow)},
  sen:({travel})=>{box(-15,1,30,12,dark);product(19,-6,5,.72);line(steel,3,[-10,1],[-10,-11],[7+travel,-11],[7+travel,-3]);disc(7+travel,-2,4,glass);disc(7+travel,-2,2,light)},
  ste:()=>{box(-13,-16,25,29,steel);box(-11,-14,16,25,dark);bars([-8,-4,0],-11,16,glass);for(const y of [-8,-2,4])disc(8,y,1.4,yellow);box(-13,10,25,4,dark)},
  rat:({lift})=>{rail(8);box(-14,-10,11,14,'#879d93');box(3,-11,11,15,'#879d93');box(-12,-13,24,4,steel);box(-7,-7+lift,14,3,yellow);product(23,0,5,.65)},
  mds:()=>{rail(10);box(-13,-12,25,20,'#dde4e3');glassPanel(-10,-9,19,12);product(27,0,-3,.6);box(-16,3,33,3,'#bd575b')},
  fil:({travel})=>{line(steel,3,[-16,-8],[13,-8]);line(glass,4,[-15,10],[16,10]);for(const x of [-13,-4,5]){box(x,-9,7,18,steel,3);box(x+1,-5,5,10,'#4a8f9f',2)}disc(14,10,2,travel>0?light:glass)},
  pha:({lift})=>{box(-16,-12,31,23,steel,3);glassPanel(-14,-10,26,15);bars([-8,-1,6],-6,4+lift*.5,light);for(const x of [-9,-2,5])box(x,1,4,7,'#e6a8bf',1);controlPanel(6,4)},
  gen:({travel})=>{box(-16,8,32,6,dark);box(-15,-6,16,15,steel,3);bars([-12,-8,-4],-4,9,dark);box(3,-8,12,18,yellow,3);disc(8,0,3,glass);box(0,-1,4+travel*.2,3,dark)},
  fah:()=>{rail(10);post(-5,15);product(34,2,-2,1.35);box(-15,-11,6,5,yellow)},
  ebk:({travel})=>{rail(11);product(35,0,-3,1.32);box(-6,5,12,5,glass);line(yellow,1,[9,-9],[14,-9],[14,7],[9+travel*.25,7]);disc(14,-9,2,steel)},
  kar:({lift})=>{post(-16);post(12);box(-16,-15,32,7,yellow);poly(steel,[-12,7],[-6,-2+lift],[6,-2+lift],[13,7]);product(36,0,7,1.42)},
  aut:()=>{rail(11);post(-17,27);post(13,27);box(-16,-15,32,4,steel);box(-13,5,26,3,yellow);product(37,0,-2,1.46)},
  lkw:()=>{rail(8);rail(15);post(-17,22);post(14,22);box(-17,-15,34,4,yellow);line(steel,1,[1,-11],[1,-7]);product(38,0,-1,1.46)},
  hull:()=>{rail(13);post(-15,28);post(12,28);poly(steel,[-13,4],[-6,-8],[6,-8],[14,0],[6,8],[-6,8]);line(glass,2,[-7,3],[-2,-5],[4,-5],[9,1])},
  rob:({travel})=>{rail(12);disc(-10,7,5,steel);line(dark,7,[-10,6],[-5,-7],[6+travel*.4,-6]);line(yellow,4,[-10,6],[-5,-7],[6+travel*.4,-6]);disc(-5,-7,2.5,steel);line(steel,2,[6+travel*.4,-6],[9+travel*.4,1],[13+travel*.4,1]);box(7,7,8,4,glass,1)},
  dro:({travel})=>{box(-14,-11,27,23,dark);for(const [x,y] of [[-10,-7],[10,-7],[-10,8],[10,8]]){line(steel,2,[0,0],[x,y]);disc(x,y,4,glass);line(light,1,[x-3,y+travel*.16],[x+3,y-travel*.16])}box(-4,-3,8,7,steel)},
  cellFab:({travel})=>{box(-16,-15,33,29,yellow);box(-13,-12,27,23,dark);line(steel,3,[-9,6],[-5,-4],[3+travel,-4]);line(steel,3,[9,7],[4,2],[0,3]);glassPanel(-3,4,9,6)},
  kip:({travel})=>{box(-15,-12,30,25,steel,4);disc(0,-1,10,dark);disc(0,-1,8,'#706abe');for(const y of [-5,0,5])line('#c2c9ff',.6,[-6,y],[6,y]);line(light,1,[travel,-10],[travel,8])},
  sorter:({travel})=>{rail(1);box(-11,-12,22,6,steel);line(glass,3,[3,-7],[3,10],[14,12]);disc(travel,3,2.2,yellow)},
  loadgrid:()=>{box(-16,-10,32,23,dark);line(yellow,2,[-12,-4],[12,-4]);for(const x of [-9,0,9]){line(steel,2,[x,-4],[x,9]);disc(x,2,2,glass)}},
  qa:({travel})=>{rail(5);post(-11,24);post(8,24);box(-11,-13,23,5,steel);line('#75eabf',1,[travel,-8],[travel,6]);controlPanel(7,-3)},
  woh:()=>{box(-15,-10,29,23,'#d9c9a7');poly('#7a8c99',[-17,-9],[0,-17],[16,-9]);glassPanel(-11,-4,8,8);glassPanel(4,-4,8,8);box(-2,4,5,9,'#72644c',.7)},
  ver:()=>{box(-16,-11,32,24,'#a4b6a9',3);line(glass,3,[-12,9],[-12,-6],[12,-6],[12,8]);for(const x of [-7,2])box(x,-3,6,12,steel,2);disc(12,9,3,dark)},
  tor:({lift})=>{post(-16,29);post(12,29);box(-16,-15,32,5,steel);box(-11,-9,22,21,dark,1);box(-10,-8,9-lift*.25,19,'#8ca0ac',1);box(1+lift*.25,-8,9-lift*.25,19,'#8ca0ac',1);line(yellow,2,[-10,9],[10,9])},
  kom:()=>{box(-16,-13,32,26,dark);glassPanel(-13,-10,8,9);glassPanel(-4,-10,8,9);glassPanel(5,-10,8,9);for(const x of [-12,-3,6])box(x,5,6,5,steel,1)},
  furniture:()=>{box(-15,5,31,8,dark);box(-14,1,15,8,'#b78962');box(-13,-10,4,16,'#c99e73');box(4,-9,10,17,'#9b704e');line(steel,2,[1,-12],[1,4])},
  mobile:()=>{rail(12);post(-16,26);post(13,26);box(-17,-15,34,4,steel);line(yellow,2,[-4,-12],[-4,-5]);product(51,0,4,1.54)},
  fitting:({lift})=>{box(-13,8,25,6,dark);box(-16,-16,9,23,steel);box(-13,-15,23,6,steel);box(5,-10,4,10+lift,yellow);product(48,5,5,.7)},
  drill:({lift})=>{box(-14,9,28,6,dark);post(-12,25);box(-12,-15,25,7,steel);line(yellow,2,[5,-8],[5,2+lift]);box(-5,6,18,3,'#be956b',.6);disc(5,7,1,dark)},
  label:({travel})=>{rail(7);disc(-9,-7,7,steel);disc(-9,-7,2,dark);line(light,2,[-5,-4],[3,-4],[5,3]);box(3+travel*.2,0,8,8,'#bd9066');box(5+travel*.2,1,4,3,'#e8e5c5',.5)},
  servo:({lift})=>{box(-15,7,30,7,dark);box(-12,-5,14,14,steel);disc(4,2,7,glass);line(yellow,2,[4,2],[13-lift*.3,2]);glassPanel(-9,-13,14,6)},
  grid:()=>{box(-16,0,31,13,steel);box(-14,-14,6,16,dark,1);box(-13,-14,4,4,yellow,1);bars([-5,0,5,10],3,7,'#566872')},
  hub:()=>{box(-15,-9,31,23,dark);for(const x of [-12,3]){box(x,-6,9,16,steel);bars([x+1,x+4,x+7],-4,12,glass);disc(x+5,-9,3,yellow)}line(yellow,2,[-8,-10],[8,-10])},
  laminate:({lift})=>{box(-16,3,32,11,dark);box(-14,-10+lift,28,12,steel,5);glassPanel(-10,-8+lift,20,7);line(yellow,2,[14,-2+lift],[17,-2+lift],[17,8])},
  shield:({lift})=>{box(-15,-15,30,9,steel);post(-15,27);post(11,27);poly(yellow,[-10,-5+lift],[0,-2+lift],[11,-5+lift],[9,2+lift],[0,5+lift],[-8,2+lift]);box(-12,9,25,5,dark)},
  ion:()=>{box(-14,9,28,5,dark);poly(steel,[-12,-7],[5,-4],[14,-9],[14,10],[5,5],[-12,6]);box(-9,-5,9,9,glass);line(light,2,[8,-4],[8,5])},
  navcore:()=>{box(-16,2,30,10,dark);glassPanel(-15,-11,16,14);line(light,1,[-12,-3],[-8,-6],[-5,-4],[-2,-9]);controlPanel(5,2)},
  lifebox:()=>{box(-15,-12,13,24,steel,4);box(4,-12,10,24,glass,3);line(steel,3,[-8,-8],[8,-8],[8,2],[-1,2]);controlPanel(5,5)},
  cryo:()=>{box(-9,-15,19,28,steel,7);glassPanel(-6,-11,13,20);disc(0,-5,2.5,'#a5cfd9');box(-2,-1,5,8,'#77acb9',2);box(-12,10,25,5,dark)},
  colony:()=>{post(-17,29);post(13,29);box(-17,-16,34,5,yellow);box(-8,-8,18,19,steel,5);line(glass,2,[-10,-4],[10,-4]);glassPanel(-5,-2,12,7);line(yellow,2,[-1,-11],[-1,-8])},
  auto:()=>{rail(9);post(-14,27);post(10,27);box(-14,-16,28,5,steel);line('#ff6a5a',1,[-10,-2],[11,-2]);product(5,0,4,.76)},
  shp:()=>{box(-16,-10,18,24,steel);bars([-14,-10,-6],-7,16,dark);product(38,8,4,.92);box(3,-10,12,3,yellow)},
  depot:()=>{post(-15,27);post(12,27);for(const y of [-10,1,12])box(-15,y,31,2,steel);for(const [x,y] of [[-12,-8],[-4,-8],[4,3]])box(x,y,7,8,'#b78962',1)},
  orbitRamp:()=>{box(-16,-11,32,23,dark);line(light,2,[-14,-8],[13,-8]);line(light,2,[-14,9],[13,9]);for(const x of [-12,10])disc(x,0,3,yellow);box(-6,-5,12,10,glass,1)}
 };
 function equipment(o,working,time){
  const paint=machines[o.t];
  if(!paint)return false;
  paint({lift:working?(Math.sin(time*6)+1)*3:0,travel:working?Math.sin(time*4)*5:0,angle:working?time*14:0});
  return true;
 }

 function forklift(loaded){
  box(-18,-9,38,21,'#1119',4);
  for(const x of [-12,3])for(const y of [-10,7])box(x,y,7,4,'#20272c',1.5);
  box(-16,-8,23,16,yellow,4);box(-15,-6,6,12,'#bb7c31',2);
  box(-8,-7,13,14,'#404c54',2);glassPanel(-7,-6,10,12);
  box(4,-10,4,20,dark,1);
  for(const y of [-5,3])box(7,y,14,2,steel,1);
  if(loaded){box(10,-7,12,14,'#b78351',1);box(14,-7,3,14,'#e6c08d',.5)}
 }
 return {equipment,forklift};
}
