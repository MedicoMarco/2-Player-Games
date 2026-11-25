(() => {
  const seats = Array.from({length:PokerRules.maxPlayers},(_,i)=>i);
  const turnMs = 25000;
  const roomSeats = room=>seats.map(i=>room.seats?.[i] || {k:'off'});

  window.createPokerGame = function () {
    let playerCount=4, mode='setup', mySeat=0, engine=null, snapshot=null, privateHand=null;
    let controls=null, turnTimer=null, dealingSince=0, busy=false, pending=false, seen=new Map(), snapshotWrites=Promise.resolve();
    let publishedHand=-1;
    const alive = ()=>cur===api;

    function mountControls() {
      if(controls)return;
      controls=document.createElement('div');
      controls.className='card-table-controls';
      controls.innerHTML='<span class="card-table-announcement" role="status"></span><button class="btn" data-poker="fold">Fold</button><button class="btn" data-poker="call">Check</button><input class=poker-raise-amount data-poker-amount type=number inputmode=numeric step=1 aria-label="Raise to chips"><button class="btn" data-poker="raise">Raise</button><button class="btn" data-poker="all-in">All-in</button><button class="btn" data-poker="next">Nächste Hand</button>';
      controls.addEventListener('click', event=>{
        const action=event.target.closest('[data-poker]')?.dataset.poker;
        if(action==='next')nextHand();
        else if(action==='raise'){
          const input=controls.querySelector('[data-poker-amount]');
          if(input.reportValidity())act(action,input.valueAsNumber);
        }
        else if(action)act(action);
      });
      $('#game .stage').append(controls);
    }

    function refreshControls() {
      if(!controls||!snapshot)return;
      const {ph,turn,options,players,result}=snapshot;
      const localTurn=ph==='play'&&turn===mySeat&&!players[mySeat].bot;
      const ready=ph==='result'&&mode!=='guest';
      const next=controls.querySelector('[data-poker=next]');
      controls.hidden=!localTurn&&!ready;
      next.hidden=!ready;
      next.disabled=pending;
      for(const name of ['fold','call','raise','all-in']){
        const button=controls.querySelector('[data-poker='+name+']');
        button.hidden=!localTurn;
        button.disabled=pending||!localTurn||name==='raise'&&!options?.raise||name==='all-in'&&!options?.allIn;
      }
      const amount=controls.querySelector('[data-poker-amount]');
      amount.hidden=!localTurn||!options?.raise;amount.disabled=pending;amount.required=!amount.hidden;
      const min=String(options?.raise||0),max=String(options?.max||0);
      if(amount.min!==min||amount.max!==max){amount.min=min;amount.max=max;amount.value=min;}
      controls.querySelector('[data-poker=call]').textContent=options?.call?'Call '+options.call:'Check';
      controls.querySelector('[data-poker=raise]').textContent=snapshot.players[mySeat].bet+Number(options?.call||0)?'Raise':'Bet';
      controls.querySelector('[role=status]').textContent=localTurn?'Du bist dran.':result;
    }

    function setup() {
      mode='setup';snapshot=null;
      showOv(`<div class="luwrap poker-setup"><div class=kick>Mit Spielchips</div><h2>Poker · Texas Hold’em</h2>
        <div class=lusetup><b>Spieler am Tisch</b><div class=seg>${seats.slice(1).map(i=>`<button data-lu=count data-v=${i+1} class="${i+1===playerCount?'on':''}">${i+1}</button>`).join('')}</div></div>
        <button class=btn data-lu=local>Gegen Computer spielen</button>
        <div class=luon><b>Online</b><button class=btn data-lu=create>Raum erstellen</button><input id=lucode maxlength=20 placeholder="RAUMCODE" aria-label="Raumcode" autocomplete=off autocapitalize=characters><button class="btn r" data-lu=join>Beitreten</button></div>
        <p class=luhint>Je zwei eigene Karten, fünf Gemeinschaftskarten und 500 Spielchips pro Person. Blinds 5/10.</p></div>`);
    }

    function lobby(room) {
      const host=LUN.role==='host', available=roomSeats(room);
      const rows=available.map((p,i)=>{
        const label=p.k==='p'?olEsc(p.name)+(i===0?' · Host':''):p.k==='cpu'?'Computer':p.k==='open'?'Offen':'Aus';
        const buttons=!host||i===0?'':p.k==='p'
          ?`<button class=mini data-lu=seat data-s=${i} data-v=open>Entfernen</button>`
          :`<div class=seg>${[['open','Offen'],['cpu','Computer'],['off','Aus']].map(([v,n])=>`<button data-lu=seat data-s=${i} data-v=${v} class="${p.k===v?'on':''}">${n}</button>`).join('')}</div>`;
        return `<div class=lurow><b>${i+1} · ${label}</b>${buttons}</div>`;
      }).join('');
      const open=available.some(p=>p.k==='open');
      const ready=available.filter(p=>p.k==='p'||p.k==='cpu').length>=2&&!open;
      showOv(`<div class="luwrap poker-setup"><div class=kick>Poker · Online-Raum</div><div class=lucode><input id=luroomcode readonly aria-label="Raumcode" value="${LUN.code}" size=20><button class=mini data-lu=copycode>Kopieren</button></div>
        <div class="lusetup poker-seats">${rows}</div>
        ${host&&open?'<div class=lufrw><b>Freunde einladen</b><div id=lufr></div></div>':''}
        ${host?`<button class=btn data-lu=start ${ready&&!busy?'':'disabled'}>Spiel starten</button><p class=luhint>Besetze offene Plätze oder stelle sie auf „Aus“. Mindestens zwei Spieler sind nötig.</p>`:'<p class=luhint>Warte auf den Host …</p>'}
        <button class="btn r" data-lu=leave>Raum verlassen</button></div>`);
      refreshFriends();
    }

    function refreshFriends() {
      const list=$('#lufr');
      if(!list||LUN.g!==api||mode!=='lobby'||LUN.role!=='host')return;
      const inRoom=roomSeats(LUN.room).map(p=>p.uid);
      list.innerHTML=Object.keys(OL.F).filter(uid=>!inRoom.includes(uid)&&olAllowed(uid)).map(uid=>{
        const disabled=OL.P[uid]?.g||olNow()-(LUN.inv[uid]||0)<45000;
        return `<div class=lurow><b>${olEsc(olNameOf(uid))}</b><button class=mini data-lu=invite data-u="${olEsc(uid)}" ${disabled?'disabled':''}>${OL.P[uid]?.g?'Beschäftigt':disabled?'Eingeladen':'Einladen'}</button></div>`;
      }).join('')||'<span class=luhint>Keine weiteren Freunde verfügbar.</span>';
    }

    async function invite(uid) {
      if(LUN.g!==api||LUN.role!=='host'||LUN.room?.status!=='lobby'||!OL.F[uid]||OL.P[uid]?.g||!olCanContact(uid))return;
      try {
        await olWriteInvite(uid,{mid:'room:'+LUN.code,code:LUN.code,name:OL.name,game:'poker',t:0,ts:olTS()});
        LUN.inv[uid]=olNow();
        toast('Einladung an '+olNameOf(uid)+' gesendet');
        refreshFriends();
      } catch(error){toast(luErr(error));}
    }

    function acceptSnapshot(state) {
      if(snapshot&&state.seq<=snapshot.seq)return;
      if(snapshot?.rn!==state.rn)dealingSince=now();
      snapshot=state;pending=false;
      if(mode!=='lobby'){
        $('#ov').style.display='none';
        mountControls();refreshControls();
      }
      if(state.ph==='end'){
        showOv(`<div class="luwrap poker-setup"><div class=kick>Poker · Endstand</div>
          <h2>${olEsc(state.players.find(p=>p.chips>0)?.name||'Poker')} gewinnt</h2><p>${olEsc(state.result)}</p>
          ${mode==='local'?'<button class=btn data-lu=local>Neues Spiel</button>':''}<button class="btn r" data-lu=leave>Zum Menü</button></div>`);
      }
    }

    function launch(players) {
      engine=PokerRules.create(players,()=>mmDeck(1));
      seen=new Map();publishedHand=-1;snapshotWrites=Promise.resolve();snapshot=null;
      nextHand();
    }

    function publish() {
      const state=engine.snapshot();
      state.deadline=state.turn>=0?Date.now()+turnMs:0;
      acceptSnapshot(state);
      if(mode==='host'){
        const ref=LUN.ref, path='rooms/'+LUN.code+'/snap';
        const updates={[path]:JSON.stringify({snap:state})};
        if(publishedHand!==state.rn){
          publishedHand=state.rn;
          for(const [i,p] of roomSeats(LUN.room).entries()){
            if(i>0&&p.k==='p')updates['hands/'+LUN.code+'/'+p.uid]=JSON.stringify({rn:state.rn,h:engine.hand(i)});
          }
        }
        snapshotWrites=snapshotWrites.then(()=>{
          if(LUN.g===api&&LUN.ref===ref)return OL.db.ref().update(updates);
        }).catch(error=>{
          if(LUN.g===api&&LUN.ref===ref)exit('Der Poker-Spielstand konnte nicht gespeichert werden. '+luErr(error));
        });
      }
      clearTimeout(turnTimer);
      if(state.turn<0)return;
      const {turn,seq}=state, bot=state.players[turn].bot;
      turnTimer=setTimeout(()=>{
        if(!alive()||!engine||snapshot?.seq!==seq)return;
        const choice=bot?engine.botAction(turn):{action:state.options.call?'fold':'call'};
        play(turn,choice.action,choice.amount);
      },bot?650+Math.random()*420:turnMs);
    }

    function nextHand() {
      if(!engine||pending||!engine.start())return;
      publish();
    }

    function play(seat,action,amount) {
      if(engine?.act(seat,action,amount))publish();
    }

    function act(action,amount) {
      if(!snapshot||pending||snapshot.ph!=='play'||snapshot.turn!==mySeat||snapshot.players[mySeat].bot)return;
      if(action==='raise'&&(!snapshot.options.raise||!Number.isSafeInteger(amount)||amount<snapshot.options.raise||amount>snapshot.options.max))return;
      if(action==='all-in'&&!snapshot.options.allIn)return;
      if(mode==='guest'){
        const ref=LUN.ref,seq=snapshot.seq;
        pending=true;refreshControls();
        ref.child('act/'+OL.me).set(JSON.stringify({n:++LUN.actN,seq,a:action,amount})).catch(error=>{
          if(alive()&&snapshot?.seq===seq){pending=false;refreshControls();toast(luErr(error));}
        });
      }else play(mySeat,action,amount);
    }

    async function createRoom() {
      if(busy)return;
      busy=true;
      try {
        if(!await luLogin()||!alive())return;
        const code=luCode(),ref=OL.db.ref('rooms/'+code);
        const options=Object.fromEntries(seats.map(i=>[i,i===0?{k:'p',uid:OL.me,name:OL.name}:{k:i<playerCount?'open':'off'}]));
        await luCreate(code,{host:OL.me,hn:OL.name,ts:olTS(),status:'lobby',game:'poker',cfg:{d:1},seats:options});
        if(!alive()){ref.remove().catch(()=>{});return;}
        attachRoom(code,ref,0,'host');
      }catch(error){if(alive())toast('Poker-Raum konnte nicht erstellt werden. '+luErr(error));}
      finally{busy=false;}
    }

    async function joinRoom(code) {
      if(busy)return false;
      const roomCode=String(code||$('#lucode')?.value||'').trim().toUpperCase();
      if(!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{20}$/.test(roomCode)){toast('Bitte den vollständigen Raumcode eingeben.');return false;}
      busy=true;
      try{
        if(!await luLogin()||!alive())return false;
        const claim=await luReserve(roomCode,'poker',PokerRules.maxPlayers);
        if(!claim)return false;
        if(!alive()){claim.ref.child('seats/'+claim.seat).set({k:'gone',uid:OL.me,name:OL.name}).catch(()=>{});return false;}
        clearTimeout(turnTimer);engine=null;snapshot=null;
        if(controls)controls.hidden=true;
        attachRoom(roomCode,claim.ref,claim.seat,'guest');
        return true;
      }catch(error){if(alive())toast(luErr(error));return false;}
      finally{busy=false;}
    }

    function attachRoom(code,ref,seat,role) {
      Object.assign(LUN,{code,ref,seat,role,left:0,g:api,actN:0,inv:{},room:null});
      mode='lobby';mySeat=seat;privateHand=null;
      window.luFr=refreshFriends;
      ref.on('value', value=>{
        if(LUN.ref!==ref||LUN.left)return;
        const room=value.val();
        if(!room){exit('Der Poker-Raum wurde geschlossen.');return;}
        const players=roomSeats(room);
        if(room.status==='lobby'&&players.some(p=>p.uid&&OL.BL[p.uid])){
          exit('Der Raum enthält einen blockierten Spieler.');return;
        }
        luObserveRoom(room);
        if(role==='guest'&&(players[seat].k!=='p'||players[seat].uid!==OL.me)){
          exit('Du bist nicht mehr im Poker-Raum.');return;
        }
        if(room.status==='lobby'){
          if(role==='host'){
            const reopened=Object.fromEntries(players.flatMap((p,i)=>p.k==='gone'?[['seats/'+i,{k:'open'}]]:[]));
            if(Object.keys(reopened).length){ref.update(reopened).catch(error=>toast(luErr(error)));return;}
          }
          lobby(room);return;
        }
        if(role==='guest'&&room.snap){
          if(mode!=='guest'){
            mode='guest';
            LUN.hr=OL.db.ref('hands/'+code+'/'+OL.me);
            LUN.hr.on('value',entry=>{try{privateHand=JSON.parse(entry.val());}catch{}},error=>{if(alive())toast(luErr(error));});
          }
          try{acceptSnapshot(JSON.parse(room.snap).snap);}catch{}
        }else if(role==='host'&&engine){
          if(players.map((p,i)=>p.k==='gone'&&engine.substitute(i)).some(Boolean))publish();
          for(const [uid,serialized] of Object.entries(room.act||{})){
            let input;
            try{input=JSON.parse(serialized);}catch{continue;}
            if(!Number.isSafeInteger(input.n)||input.n<=(seen.get(uid)||0))continue;
            seen.set(uid,input.n);
            const i=players.findIndex(p=>p.k==='p'&&p.uid===uid);
            if(i>0&&input.seq===snapshot.seq)play(i,input.a,input.amount);
          }
        }
      },error=>{if(LUN.ref===ref&&!LUN.left)exit(luErr(error));});
    }

    async function startRoom() {
      if(busy||mode!=='lobby'||LUN.role!=='host')return;
      const ref=LUN.ref,players=roomSeats(LUN.room);
      if(players.some(p=>p.k==='open')||players.filter(p=>p.k==='p'||p.k==='cpu').length<2)return;
      busy=true;
      try{
        await ref.child('status').set('play');
        if(!alive()||LUN.ref!==ref)return;
        mode='host';
        launch(players.map((p,i)=>({name:p.name||'Computer '+i,active:p.k==='p'||p.k==='cpu',bot:p.k==='cpu'})));
        for(const uid of Object.keys(LUN.inv))OL.db.ref('invites/'+uid+'/'+OL.me).remove().catch(()=>{});
        LUN.inv={};
      }catch(error){if(alive())toast(luErr(error));}
      finally{busy=false;}
    }

    function startLocal() {
      clearTimeout(turnTimer);mode='local';mySeat=0;
      launch(seats.map(i=>({name:i?'Computer '+i:'Du',active:i<playerCount,bot:i!==0})));
    }

    const exit=message=>{if(message)toast(message);toMenu();};

    function setupClick(button) {
      const {lu,v,s,u}=button.dataset;
      if(busy&&lu!=='leave')return;
      if(lu==='count'){playerCount=Number(v);setup();}
      else if(lu==='local')startLocal();
      else if(lu==='create')createRoom();
      else if(lu==='join')joinRoom();
      else if(lu==='start')startRoom();
      else if(lu==='copycode')luCopyCode();
      else if(lu==='invite')invite(u);
      else if(lu==='seat'&&mode==='lobby'&&LUN.role==='host')LUN.ref.child('seats/'+s).set({k:v}).catch(error=>toast(luErr(error)));
      else if(lu==='leave')exit();
    }

    function positions(state) {
      const opponents=state.players.filter(p=>p.seat!==mySeat&&(p.chips||p.inHand));
      const boxes={};
      opponents.forEach((p,i)=>{
        const row=Math.floor(i/5),column=i%5,count=Math.min(5,opponents.length-row*5);
        boxes[p.seat]={x:400-count*77+column*154+5,y:12+row*62,w:144,h:54,side:'below'};
      });
      boxes[mySeat]={x:23,y:340,w:188,h:58,side:'above'};
      return boxes;
    }

    function label(text,x,y,size=17,color='#fff',width=740,weight=700) {
      c.fillStyle=color;c.textAlign='center';c.textBaseline='alphabetic';c.font=`${weight} ${size}px system-ui`;
      c.fillText(text,x,y,width);
    }

    function draw() {
      const felt=c.createRadialGradient(400,235,35,400,235,495);
      felt.addColorStop(0,'#236750');felt.addColorStop(1,'#0b2c28');
      c.fillStyle=felt;c.fillRect(0,0,800,480);
      c.strokeStyle='#ead5a344';c.lineWidth=2;c.beginPath();c.ellipse(400,241,365,178,0,0,Math.PI*2);c.stroke();

      const state=snapshot;
      if(!state){
        drawCard(294,154,104,12,{rot:-.16,sh:true});
        drawCard(405,154,104,25,{rot:.16,sh:true});
        label('Texas Hold’em',400,350,34,'#f4ddb3');
        return;
      }
      const boxes=positions(state);
      for(const p of state.players){
        const r=boxes[p.seat];
        if(!r)continue;
        const active=state.turn===p.seat;
        const revealed=p.seat===mySeat?null:state.shown?.[p.seat];
        const mid=r.x+r.w/2+(revealed?21:0),space=r.w-(revealed?52:12);
        const mark=p.seat===state.dealer?'D ':p.seat===state.smallBlind?'SB ':p.seat===state.bigBlind?'BB ':'';
        rr(r.x,r.y,r.w,r.h,11,active?'#f4d289':'#091e23a8');
        label(mark+p.name,mid,r.y+19,16,active?'#251b13':'#faf1de',space);
        label(p.chips+' Chips'+(p.folded?' · gepasst':p.inHand&&!p.chips?' · All-in':''),mid,r.y+38,13,active?'#422b11':'#bfd8cc',space);
        if(p.bet&&state.ph==='play')label('Einsatz '+p.bet,mid,r.y+r.h-3,10,active?'#422b11':'#f1d9ae',r.w-12);
        if(revealed)revealed.forEach((card,i)=>drawCard(r.x+4+i*20,r.y+12,22,card));
      }
      const [preflop,flop,turn,river]=PokerRules.streetNames;
      label(`Hand ${state.rn}  ·  ${[preflop,flop,turn,river][state.street]}  ·  Pot ${state.pot} Chips`,400,151,20,'#f4ddb3');
      for(let i=0;i<5;i++){
        const x=203+i*81;
        rr(x,173,70,98,7,'#ffffff0c');
        if(i<state.board.length)drawCard(x,173,70,state.board[i],{sh:true});
      }
      const hand=mode==='guest'?(privateHand?.rn===state.rn?privateHand.h:[]):engine?.hand(mySeat)||[];
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      hand.forEach((card,i)=>{
        const progress=S.anim&&!reduced?Math.max(0,Math.min(1,(now()-dealingSince-i*100)/360)):1;
        if(progress===0)return;
        drawCard(400+(318+i*87-400)*progress,185+129*progress,75,progress<.68?-1:card,{sh:true});
      });
      const current=state.players[state.turn];
      const left=state.deadline?Math.max(0,Math.min(25,Math.ceil((state.deadline-Date.now())/1000))):0;
      const status=current?(state.turn===mySeat?'Du bist dran':current.name+' ist dran')+' · '+left+' s'
        :state.result+(mode==='guest'&&state.ph==='result'?' · Warte auf den Host':'');
      label(status,400,299,18,'#fff2d1');
    }

    const api={
      draw,update(){},click(){},key(code){
        if(document.activeElement?.matches('input,select,textarea,button')||$('#ov').style.display!=='none')return;
        const actions={KeyF:'fold',KeyC:'call',KeyR:'raise'};
        if(actions[code])act(actions[code],snapshot?.options?.raise);
      },
      showSetup:setup,luClick:setupClick,joinCode:joinRoom,canJoin:()=>!LUN.ref&&(mode==='setup'||mode==='local'),
      chatAnchors:()=>snapshot?positions(snapshot):{},
      leave(){
        clearTimeout(turnTimer);engine=null;controls?.remove();controls=null;
        if(LUN.g===api){window.luFr=null;LUN.left=1;luCleanup();LUN.g=null;}
      }
    };
    return api;
  };
})();
