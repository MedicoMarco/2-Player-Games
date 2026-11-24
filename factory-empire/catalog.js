/* The item indices are stable save-game identifiers. Append new products. */
function createFactoryCatalog(RH,chapter=()=>1){
const ITEMS=[{n:"Rohholz",v:2},{n:"Holzteile",v:6,oq:24},{n:"Rohlinge",v:12,oq:18},{n:"Montierte Spielzeuge",v:22,oq:14},{n:"Lackierte Spielzeuge",v:38,oq:10},{n:"Verpackte Spielzeuge",v:60,oq:8},{n:"Erz",v:3},{n:"Barren",v:15,oq:20},{n:"Metallteile",v:23,oq:16},{n:"Werkzeuge",v:43,oq:8},{n:"Granulat",v:4},{n:"Gehäuse",v:14,oq:18},{n:"Platinen",v:38,oq:12},{n:"Smartphones",v:140,oq:6},{n:"Holzbalken",v:21,oq:20,sh:'beam',cl:'#c99a5b'},{n:"Holzregale",v:48,oq:13,sh:'shelf',cl:'#b57b43'},{n:"Stahlblech",v:42,oq:14,sh:'plate',cl:'#aab4c0'},{n:"Stahlträger",v:125,oq:8,sh:'ibeam',cl:'#8d97a4'},{n:"Panzerplatten",v:240,oq:6,sh:'plate',cl:'#4a525d'},{n:"Sensormodule",v:71,oq:11,sh:'chip',cl:'#2f8f9a'},{n:"Steuerungseinheiten",v:175,oq:7,sh:'chip',cl:'#7a4fb0'},{n:"Getreide",v:3,sh:'wheat',cl:'#d9b24a'},{n:"Konserven",v:15,oq:23,sh:'can',cl:'#c0562c'},{n:"Notrationen",v:60,oq:12,sh:'box',cl:'#7aa75a'},{n:"Rohwasser",v:2,sh:'drop',cl:'#5aa9e6'},{n:"Trinkwasser",v:18,oq:21,sh:'drop',cl:'#8fd3ff'},{n:"Medikamente",v:40,oq:14,sh:'pill',cl:'#e0533d'},{n:"Erste-Hilfe-Sets",v:115,oq:8,sh:'cross',cl:'#f2f4f7'},{n:"Akkus",v:51,oq:13,sh:'cell',cl:'#4f9a3f'},{n:"Elektromotoren",v:110,oq:9,sh:'cog',cl:'#d0902e'},{n:"Solarmodule",v:165,oq:7,sh:'solar',cl:'#2f5f9a'},{n:"Generatoren",v:565,oq:4,sh:'cog',cl:'#d0b02e'},{n:"Reaktorkerne",v:2030,oq:2,sh:'core',cl:'#9a3fb0'},{n:"Räder",v:49,oq:13,sh:'wheel',cl:'#2c2f35'},{n:"Fahrräder",v:200,oq:6,sh:'bike',cl:'#3f8f7a'},{n:"E-Bikes",v:405,oq:4,sh:'bike',cl:'#2f9a62'},{n:"Karosserien",v:165,oq:7,sh:'body',cl:'#8a9ab0'},{n:"Autos",v:715,oq:3,sh:'car',cl:'#c0463c'},{n:"Lastwagen",v:1370,oq:2,sh:'truck',cl:'#c07a2e'},{n:"Industrieroboter",v:1030,oq:3,sh:'robot',cl:'#aab4c0'},{n:"KI-Chips",v:405,oq:4,sh:'chip',cl:'#3d78c4'},{n:"Drohnen",v:825,oq:3,sh:'drone',cl:'#6a5acd'},{n:"Wohnmodule",v:1230,oq:3,sh:'mod',cl:'#8a7a5a'},{n:"Versorgungsmodule",v:1520,oq:2,sh:'mod',cl:'#5a8a6a'},{n:"Bunkertore",v:1690,oq:2,sh:'door',cl:'#6a6f7a'},{n:"Kommandozentralen",v:2500,oq:2,sh:'mod',cl:'#9a5a5a'}];
ITEMS.push(
 {n:'Gebohrte Leisten',v:18,oq:18,sh:'beam',cl:'#dcb47d'},
 {n:'Etikettierte Spielzeuge',v:82,oq:9,sh:'box',cl:'#648cca'},
 {n:'Möbelbeschläge',v:96,oq:12,sh:'cog',cl:'#899bb3'},
 {n:'Servoantriebe',v:369,oq:8,sh:'cog',cl:'#6e9a9c'},
 {n:'Fertigungszellen',v:3390,oq:3,sh:'robot',cl:'#95c7a6'},
 {n:'Mobile Versorgungssysteme',v:11400,oq:2,sh:'truck',cl:'#4aa6b8'},
 {n:'Möbelsets',v:185,oq:8,sh:'shelf',cl:'#ab8454'},
 {n:'Verbundplatten',v:520,oq:12,sh:'plate',cl:'#778fb0'},
 {n:'Strahlenschutzschilde',v:1730,oq:7,sh:'plate',cl:'#9da9c0'},
 {n:'Raumschiffhüllen',v:6830,oq:4,sh:'body',cl:'#a6c1de'},
 {n:'Ionentriebwerke',v:5220,oq:4,sh:'cog',cl:'#69acd4'},
 {n:'Navigationscomputer',v:3440,oq:6,sh:'chip',cl:'#a298ee'},
 {n:'Lebenserhaltungsmodule',v:8460,oq:4,sh:'mod',cl:'#85c9b8'},
 {n:'Kryokammern',v:12000,oq:3,sh:'cell',cl:'#9fe2ed'},
 {n:'Koloniemodule',v:27200,oq:2,sh:'mod',cl:'#c7b8ea'});
const MD={src:{n:"Holzlager",s:"Holz",c:40,w:4,k:'#8a5a2b',g:'h',a:'gar',o:0,rc:2,dp:0},
 saw:{n:"Säge",s:"Säge",c:60,w:4,k:'#5f87b4',g:'h',a:'gar',r:[[0,1]],o:1,dp:1},
 frm:{n:"Formmaschine",s:"Form",c:200,w:5,k:'#7a6bb0',g:'h',a:'gar',r:[[1,1]],o:2,dp:2},
 asm:{n:"Montagestation",s:"Montage",c:480,w:6,k:'#d08a2e',g:'h',a:'gar',r:[[2,1]],o:3,dp:3},
 pnt:{n:"Lackierstation",s:"Lack",c:1000,w:7,k:'#d5503c',g:'h',a:'gar',r:[[3,1]],o:4,dp:4},
 pck:{n:"Verpackung",s:"Pack",c:1800,w:8,k:'#3f9a8a',g:'h',a:'gar',r:[[4,1]],o:5,dp:5},
 bal:{n:"Balkenpresse",s:"Balken",c:510,w:6,k:'#a8742f',g:'h',a:'gar',r:[[1,2]],o:14,dp:2,art:'prs',ac:'#e0b060'},
 reg:{n:"Regalbauer",s:"Regal",c:850,w:8,k:'#c0884a',g:'h',a:'gar',r:[[14,1],[1,2]],o:15,dp:3,art:'arm',ac:'#e8d7a8'},
 ers:{n:"Erzlager",s:"Erz",c:150,w:4,k:'#5a6b7a',g:'m',a:'met',o:6,rc:3,dp:0},
 sme:{n:"Schmelzofen",s:"Ofen",c:470,w:5,k:'#c0562c',g:'m',a:'met',r:[[6,2]],o:7,dp:1},
 mil:{n:"Fräsmaschine",s:"Fräse",c:680,w:4,k:'#4f7d8f',g:'m',a:'met',r:[[7,1]],o:8,dp:2},
 wal:{n:"Walzwerk",s:"Walze",c:750,w:6,k:'#5d7894',g:'m',a:'met',r:[[7,2]],o:16,dp:2,art:'rol',ac:'#cfd6de'},
 wrk:{n:"Werkstatt",s:"Werkstatt",c:1200,w:6,k:'#a8672c',g:'m',a:'met',r:[[8,1],[1,1]],o:9,dp:3},
 sch:{n:"Schweißstation",s:"Schweißen",c:1200,w:8,k:'#c0562c',g:'m',a:'met',r:[[16,2],[8,1]],o:17,dp:3,art:'wld',ac:'#ffd23f'},
 pan:{n:"Panzerschmiede",s:"Panzer",c:1900,w:10,k:'#555f6e',g:'m',a:'met',r:[[17,1],[16,2]],o:18,dp:4,art:'prs',ac:'#8fa0b4'},
 gra:{n:"Granulatlager",s:"Granulat",c:500,w:4,k:'#3f8f9a',g:'e',a:'elk',o:10,rc:4,dp:0},
 inj:{n:"Spritzguss",s:"Spritzguss",c:720,w:4,k:'#3d78c4',g:'e',a:'elk',r:[[10,1]],o:11,dp:1},
 pcb:{n:"Platinenfertigung",s:"Platinen",c:910,w:5,k:'#2f9a62',g:'e',a:'elk',r:[[8,1]],o:12,dp:3},
 sen:{n:"Sensorbau",s:"Sensor",c:1200,w:6,k:'#2f8f9a',g:'e',a:'elk',r:[[12,1],[11,1]],o:19,dp:4,art:'chp',ac:'#5ad1ff'},
 ele:{n:"Elektronikmontage",s:"E-Montage",c:2650,w:8,k:'#b8407a',g:'e',a:'elk',r:[[11,1],[12,2]],o:13,dp:4},
 ste:{n:"Steuerungsbau",s:"Steuerung",c:2150,w:8,k:'#7a4fb0',g:'e',a:'elk',r:[[12,2],[19,1]],o:20,dp:5,art:'chp',ac:'#c7a0ff'},
 fld:{n:"Getreidefeld",s:"Feld",c:700,w:4,k:'#6f9a3f',g:'v',a:'vrs',o:21,rc:3,dp:0,art:'fld',ac:'#d9c24a'},
 kon:{n:"Konservenfabrik",s:"Konserven",c:500,w:5,k:'#b8683a',g:'v',a:'vrs',r:[[21,2]],o:22,dp:1,art:'mix',ac:'#e8d7a8'},
 rat:{n:"Rationspacker",s:"Ration",c:830,w:7,k:'#4f9a6a',g:'v',a:'vrs',r:[[22,3]],o:23,dp:2,art:'pk',ac:'undefined'},
 pmp:{n:"Pumpwerk",s:"Pumpe",c:600,w:4,k:'#3f7fb0',g:'v',a:'vrs',o:24,rc:2,dp:0,art:'pmp',ac:'#8fd3ff'},
 fil:{n:"Filteranlage",s:"Filter",c:610,w:5,k:'#3f9ab0',g:'v',a:'vrs',r:[[24,2],[10,1]],o:25,dp:1,art:'tnk',ac:'#8fd3ff'},
 pha:{n:"Pharmalabor",s:"Pharma",c:1050,w:7,k:'#b04f7a',g:'v',a:'vrs',r:[[25,1],[10,1]],o:26,dp:2,art:'tnk',ac:'#ffb3d1'},
 mds:{n:"Medikit-Packer",s:"Medikit",c:1550,w:8,k:'#c0463c',g:'v',a:'vrs',r:[[26,2],[11,1]],o:27,dp:3,art:'pk',ac:'undefined'},
 akk:{n:"Akkufabrik",s:"Akku",c:940,w:6,k:'#4f9a3f',g:'n',a:'ene',r:[[8,1],[10,2]],o:28,dp:3,art:'cel',ac:'#a6f07a'},
 mot:{n:"Motorenbau",s:"Motor",c:1250,w:7,k:'#d0902e',g:'n',a:'ene',r:[[8,2],[12,1]],o:29,dp:4,art:'mot',ac:'#ffd23f'},
 sol:{n:"Solarfabrik",s:"Solar",c:1300,w:8,k:'#2f5f9a',g:'n',a:'ene',r:[[12,2],[11,1],[16,1]],o:30,dp:4,art:'sol',ac:'#7ab6ff'},
 gen:{n:"Generatorwerk",s:"Generator",c:2100,w:10,k:'#d0b02e',g:'n',a:'ene',r:[[29,2],[17,1],[20,1]],o:31,dp:6,art:'mot',ac:'#ffe680'},
 rea:{n:"Reaktorbau",s:"Reaktor",c:3650,w:14,k:'#9a3fb0',g:'n',a:'ene',r:[[31,2],[18,2],[20,2]],o:32,dp:7,art:'rea',ac:'#e08aff'},
 rad:{n:"Räderwerk",s:"Räder",c:990,w:5,k:'#555a63',g:'f',a:'fzg',r:[[8,1],[10,2]],o:33,dp:3,art:'wh',ac:'#cfd6de'},
 fah:{n:"Fahrradmontage",s:"Fahrrad",c:1500,w:8,k:'#3f8f7a',g:'f',a:'fzg',r:[[33,2],[8,3]],o:34,dp:4,art:'asy',ac:'#a6f0d8'},
 ebk:{n:"E-Bike-Montage",s:"E-Bike",c:2400,w:10,k:'#2f9a62',g:'f',a:'fzg',r:[[34,1],[28,1],[29,1]],o:35,dp:5,art:'asy',ac:'#a6f07a'},
 kar:{n:"Karosseriebau",s:"Karosserie",c:1400,w:9,k:'#7a8aa0',g:'f',a:'fzg',r:[[16,3]],o:36,dp:3,art:'prs',ac:'#e8eef5'},
 aut:{n:"Automontage",s:"Auto",c:2900,w:14,k:'#c0463c',g:'f',a:'fzg',r:[[36,1],[29,1],[33,4],[20,1]],o:37,dp:6,art:'asy',ac:'#ffd2cf'},
 lkw:{n:"Lkw-Montage",s:"Lkw",c:3700,w:20,k:'#c07a2e',g:'f',a:'fzg',r:[[36,2],[29,2],[33,6],[18,1],[20,1]],o:38,dp:6,art:'asy',ac:'#ffe0b3'},
 rob:{n:"Roboterbau",s:"Roboter",c:2850,w:16,k:'#9aa4b0',g:'t',a:'hit',r:[[29,3],[20,2],[17,2]],o:39,dp:6,art:'rbt',ac:'#5ad1ff'},
 kip:{n:"Chipfabrik",s:"KI-Chip",c:2900,w:14,k:'#3d78c4',g:'t',a:'hit',r:[[12,3],[19,2],[28,1]],o:40,dp:5,art:'chp',ac:'#7ab6ff'},
 dro:{n:"Drohnenbau",s:"Drohne",c:4350,w:16,k:'#6a5acd',g:'t',a:'hit',r:[[29,2],[28,1],[40,1],[11,2]],o:41,dp:6,art:'rbt',ac:'#c7c0ff'},
 woh:{n:"Wohnmodul-Werk",s:"Wohnmodul",c:2650,w:20,k:'#8a7a5a',g:'b',a:'bnk',r:[[18,2],[15,6],[30,1],[20,1]],o:42,dp:6,art:'mod',ac:'#e8d7a8'},
 ver:{n:"Versorgungsmodul-Werk",s:"Versorg.",c:2650,w:24,k:'#5a8a6a',g:'b',a:'bnk',r:[[23,10],[25,10],[27,3],[17,2]],o:43,dp:4,art:'mod',ac:'#bff0cf'},
 tor:{n:"Tor-Werk",s:"Bunkertor",c:3050,w:24,k:'#6a6f7a',g:'b',a:'bnk',r:[[18,4],[29,2],[20,2]],o:44,dp:6,art:'mod',ac:'#ffd23f'},
 kom:{n:"Kommandozentrale",s:"Zentrale",c:3500,w:30,k:'#9a5a5a',g:'b',a:'bnk',r:[[40,2],[20,2],[39,1],[28,2]],o:45,dp:7,art:'mod',ac:'#ff9a9a'},
 shp:{n:'Versand',s:'Versand',c:30,w:1,k:'#3b9b63',g:'l'},sto:{n:'Zwischenlager',s:'Lager',c:250,w:0,k:'#6b7a8f',g:'l'}};

Object.assign(MD,{
 furniture:{n:'Möbelmontage',s:'Möbelbau',c:2150,w:8,k:'#9a7648',g:'h',goodsGroup:'u',a:'gar',r:[[15,1],[48,1]],o:52,dp:5,
  art:'arm',ac:'#ecd7aa'},
 sorter:{n:'Sortieranlage',s:'Sortieranl.',c:1750,w:0,k:'#307e83',g:'l',belt:[1.5,6],previousSize:[2,1],
  sortStation:true,art:'chp',ac:'#9af0df',unlock:()=>RH('spd3'),
  need:'Vollautomatisierung erforschen',d:'Leitet eine Warenfamilie nach rechts und die übrigen Waren geradeaus.'},
 mobile:{n:'Systemintegrator',s:'Mobilwerk',c:38000,w:28,k:'#3b8196',g:'t',a:'hit',
  r:[[50,1],[43,2],[38,1],[30,3]],o:51,dp:9,art:'mod',ac:'#b4f0e2',size:[3,2]},
 fitting:{n:'Beschlagpresse',s:'Beschläge',c:1550,w:8,k:'#5f7185',g:'m',a:'met',r:[[46,1],[16,1]],o:48,dp:3,art:'prs',ac:'#b2c8e1'},
 servo:{n:'Servoantrieb-Montage',s:'Servo',c:3700,w:10,k:'#327d68',g:'e',a:'elk',r:[[29,1],[19,2],[8,1]],o:49,dp:5,art:'mot',ac:'#73e5b7',unlock:()=>RH('spd3'),need:'Vollautomatisierung erforschen'},
 cellFab:{n:'Fertigungszellen-Montage',s:'F.-Zelle',c:12500,w:18,k:'#6f5c99',g:'t',a:'hit',r:[[39,1],[49,2],[40,1],[20,1]],o:50,dp:8,art:'rbt',ac:'#aceebe',size:[2,2]},
 fast:{n:'Schnellband',s:'Schnell',c:14,w:0,k:'#357a99',g:'l',belt:[.5,2],unlock:()=>RH('bel'),need:'Schnellband-Antrieb erforschen'},
 express:{n:'Hochgeschwindigkeitsband',s:'Express',c:48,w:0,k:'#545a9e',g:'l',belt:[.25,4],unlock:()=>RH('bel2'),need:'Magnetbänder erforschen'},
 sort:{n:'Sortierband',s:'Sortieren',c:120,w:0,k:'#2d8875',g:'l',belt:[1.5,2],unlock:()=>RH('lag'),need:'Hochregal-Lagerung erforschen'},
 smart:{n:'Intelligentes Förderband',s:'Intelligent',c:290,w:0,k:'#8d539c',g:'l',belt:[1,3],unlock:()=>RH('spd3'),need:'Vollautomatisierung erforschen'},
 tunnel:{n:'Unterirdisches Transportband',s:'Tunnel',c:98,w:0,k:'#665745',g:'l',belt:[2,5],unlock:()=>RH('bel2'),need:'Magnetbänder erforschen'},
 depot:{n:'Zwischenlager',s:'Lager',c:950,w:0,k:'#8d7141',g:'u',storage:true,legacyOnly:true},
 drill:{n:'Bohrmaschine',s:'Bohren',c:370,w:5,k:'#526f8b',g:'h',a:'gar',r:[[1,1]],o:46,dp:2,art:'prs',ac:'#a4dded'},
 label:{n:'Etikettiermaschine',s:'Etikett',c:1250,w:6,k:'#7766ad',g:'h',goodsGroup:'u',a:'gar',r:[[5,1]],o:47,dp:6,art:'pk',ac:'#d9ccfc'},
 grid:{n:'Kleines Kraftwerk',s:'Strom',c:720,w:0,k:'#736235',g:'u',supply:true,legacyOnly:true,art:'mot',ac:'#ffe088'},
 loadgrid:{n:'Lastverteiler',s:'Lastverteiler',c:4900,w:0,k:'#5f738d',g:'u',distribution:true,legacyOnly:true,art:'chp',ac:'#bce0ff'},
 hub:{n:'Energiezentrale',s:'Zentrale',c:7200,w:0,k:'#6f6093',g:'u',supply:true,legacyOnly:true,art:'mot',ac:'#e3c5ff'},
 qa:{n:'Durchlaufstation',s:'Durchlauf',c:520,w:0,k:'#247a76',g:'u',inspect:true,legacyOnly:true,art:'chp',ac:'#8ef4e2'},
 auto:{n:'Versandstation',s:'Versand',c:1300,w:0,k:'#5b74ac',g:'u',ship:true,legacyOnly:true},
 spl:{n:'Splitter',s:'Splitter',c:60,w:0,k:'#6b7a8f',g:'l',j:1,d:'Teilt ein Band auf: Waren gehen abwechselnd nach vorn, links und rechts. Jede Seite lässt sich im Fenster auf Eingang, Ausgang oder Aus stellen.'},
 fus:{n:'Fusionator',s:'Fusion',c:60,w:0,k:'#6b7a8f',g:'l',j:1,d:'Führt bis zu drei Bänder zu einem zusammen – fair abwechselnd. Jede Seite lässt sich auf Eingang, Ausgang oder Aus stellen.'},
 kre:{n:'Kreuzung',s:'Kreuzung',c:90,w:0,k:'#6b7a8f',g:'l',j:2,d:'Zwei Bänder kreuzen sich, ohne sich zu vermischen: Waren fahren immer geradeaus durch.'},
 prj:{n:'Bunker-Rampe',s:'Bunker',c:800,w:0,k:'#b89b2e',g:'l',d:'Liefert Waren für die aktuelle Bunker-Phase ab. Nimmt nur an, was die Quests gerade brauchen – bringt kein Geld, aber das Überleben.'}});
const fleet={
 laminate:{n:'Verbundwerk',s:'Verbund',c:3700,w:8,k:'#536e8a',r:[[16,2],[11,1]],o:53,dp:5,art:'prs',ac:'#b2cfe7'},
 shield:{n:'Schutzschild-Presse',s:'Schilde',c:5900,w:11,k:'#536b85',r:[[53,2],[18,1]],o:54,dp:6,art:'prs',ac:'#dec79c'},
 hull:{n:'Hüllenmontage',s:'Hülle',c:9400,w:14,k:'#526f92',r:[[54,2],[17,2],[53,1]],o:55,dp:7,art:'asy',ac:'#b3d3f4'},
 ion:{n:'Triebwerkbau',s:'Triebwerk',c:8900,w:14,k:'#325b86',r:[[32,1],[29,2],[30,1]],o:56,dp:8,art:'mot',ac:'#80ccfb'},
 navcore:{n:'Navigationslabor',s:'Navigation',c:9200,w:12,k:'#6f62a2',r:[[40,1],[20,2],[19,2]],o:57,dp:7,art:'chp',ac:'#c9b7ff'},
 lifebox:{n:'Lebenserhaltungswerk',s:'Lebenserh.',c:9450,w:14,k:'#398483',r:[[43,1],[25,3],[30,2]],o:58,dp:7,art:'tnk',ac:'#b0ebd4'},
 cryo:{n:'Kryomontage',s:'Kryokammer',c:11000,w:16,k:'#447392',r:[[58,1],[28,2],[54,1]],o:59,dp:8,art:'cel',ac:'#a5e5f5'},
 colony:{n:'Koloniemodul-Montage',s:'Kolonie',c:15800,w:22,k:'#735d94',r:[[55,1],[58,1],[57,1],[59,1]],o:60,dp:9,art:'mod',ac:'#e3c9f8'}
};
for(const [id,machine] of Object.entries(fleet))MD[id]={...machine,g:'o',a:'orb',chapter:2};
MD.orbitRamp={n:'Werftrampe',s:'Werftrampe',c:900,w:0,k:'#4b92b3',g:'l',chapter:2,unlock:()=>chapter()>=2,need:'Kampagne fortsetzen',d:'Nimmt für den aktuellen Flottenbau benötigte Fracht an.'};
const jpre=(t,r)=>{const m=[0,0,0,0];if(t=='spl'){m[(r+2)%4]=1;m[r]=2;m[(r+1)%4]=2;m[(r+3)%4]=2}else if(t=='fus'){m[r]=2;m[(r+1)%4]=1;m[(r+2)%4]=1;m[(r+3)%4]=1}return m};
MD.sme.previousSize=MD.wal.previousSize=[2,1];
MD.rea.previousSize=MD.hub.previousSize=[2,2];
MD.aut.size=MD.kom.size=[2,1];
for(const machine of Object.values(MD))if(machine.r?.length>3&&!machine.size)machine.size=[2,2];
const PR={},CT={},DS={};for(const t in MD){const m=MD[t];if(m.o!=null)PR[m.o]=t;for(const a of m.r||[])(CT[a[0]]=CT[a[0]]||[]).push(t)}
for(const t in MD){const st=new Set(),q=[t];while(q.length){const o=MD[q.pop()].o;if(o==null)continue;for(const y of CT[o]||[])if(!st.has(y)){st.add(y);q.push(y)}}DS[t]=st}
 return {ITEMS,MD,PR,DS,jpre};
}
