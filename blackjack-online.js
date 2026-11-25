(() => {
  const seats=Array.from({length:10},(_,i)=>i);
  const getSeats=room=>seats.map(i=>room.seats?.[i]||{k:'off'});
  const timeout=30000;
  window.createBlackjackRoom=({game,onLobby,onState})=>{
    let ref=null,role=null,mySeat=0,room=null,busy=false,engine=null,view=null,serial=0,timer=null;
    let bets=[],roundKey=0,seen=new Map(),queued=Promise.resolve(),deadline=0;
    const joined=()=>ref!==null;
    const active=()=>cur===game;
    const exit=message=>{if(message)toast(message);toMenu();};
    const clearTimer=()=>{clearTimeout(timer);timer=null;};
    const participants=()=>getSeats(room);
    const connected=i=>participants()[i]?.k==='p';
    const readyToDeal=()=>view.seats.every((p,i)=>!connected(i)||!p.chips||bets[i]>0);

    function repaint(){
      if(role!=='host'||!room||room.status!=='lobby'||!$('#lufr'))return;
      const taken=participants().map(p=>p.uid);
      $('#lufr').innerHTML=Object.keys(OL.F).filter(uid=>!taken.includes(uid)&&olAllowed(uid)).map(uid=>
        `<div class=lurow><b>${olEsc(olNameOf(uid))}</b><button class=mini data-lu=bj-invite data-u="${olEsc(uid)}">Invite</button></div>`
      ).join('')||'<p class=luhint>No friends available to invite.</p>';
    }
    function lobby(){
      const host=role==='host',players=participants();
      const rows=players.map((p,i)=>{
        const name=p.k==='p'?olEsc(p.name):p.k==='open'?'Open':'Closed';
        const action=host&&i&&p.k!=='p'
          ?`<button class=mini data-lu=bj-seat data-s=${i} data-v=${p.k==='open'?'off':'open'}>${p.k==='open'?'Close':'Open seat'}</button>`:'';
        return `<div class=lurow><b>${i+1} · ${name}${i===0?' · Host':''}</b>${action}</div>`;
      }).join('');
      const canStart=players.filter(p=>p.k==='p').length>=2&&!players.some(p=>p.k==='open');
      showOv(`<div class="luwrap poker-setup"><div class=kick>Blackjack · Online</div>
        <div class=lucode><input id=luroomcode readonly aria-label="Room code" value="${LUN.code}" size=20><button class=mini data-lu=bj-copy>Copy</button></div>
        <div class="lusetup poker-seats">${rows}</div>
        ${host&&players.some(p=>p.k==='open')?'<div class=lufrw><b>Invite friends</b><div id=lufr></div></div>':''}
        ${host?`<button class=btn data-lu=bj-play ${canStart&&!busy?'':'disabled'}>Start table</button><p class=luhint>At least two players. Fill or close the open seats.</p>`:'<p class=luhint>Waiting for the host …</p>'}
        <button class="btn r" data-lu=bj-leave>Leave room</button></div>`);
      repaint();
    }

    function show(state){
      if(!state||!Number.isSafeInteger(state.seq)||state.seq<=(view?.seq||0))return;
      view=state;
      onState(state,mySeat);
    }
    function publish(){
      const current=ref;
      const state=engine.snapshot();
      if(view?.phase==='betting')state.phase='betting';
      Object.assign(state,{seq:++serial,roundKey,bets:bets.slice(),deadline,ph:'play'});
      const snap=JSON.stringify({snap:state});
      show(state);
      queued=queued.then(()=>{
        if(ref===current)return current.child('snap').set(snap);
      }).catch(error=>{if(ref===current)exit(luErr(error));});
    }
    function beginBets(){
      clearTimer();
      bets=seats.map(()=>0);
      deadline=0;roundKey++;
      view={...engine.snapshot(),phase:'betting',seq:view?.seq||0};
      publish();
    }
    function deal(){
      clearTimer();deadline=0;
      if(!bets.some(Boolean)||!engine.open(bets)){beginBets();return;}
      view=null;
      advance();
    }
    function advance(){
      clearTimer();
      const state=engine.snapshot();
      deadline=state.phase==='players'?Date.now()+timeout:0;
      publish();
      if(state.phase==='players')timer=setTimeout(()=>{
        engine.act('stand');advance();
      },connected(state.turn)?timeout:500);
      else if(state.phase==='dealer')timer=setTimeout(()=>{engine.dealerStep();advance();},650);
    }
    function apply(seat,action,amount,key){
      if(!engine||!connected(seat)||!view)return false;
      if(view.phase==='betting'&&action==='bet'){
        if(key!==roundKey||bets[seat]||!Number.isSafeInteger(amount)||amount<1||amount>view.seats[seat].chips)return false;
        bets[seat]=amount;
        if(readyToDeal()){deal();return true;}
        if(!deadline){deadline=Date.now()+timeout;timer=setTimeout(deal,timeout);}
        publish();return true;
      }
      if(view.phase==='players'&&key===view.seq&&view.turn===seat&&engine.act(action)){
        advance();return true;
      }
      return false;
    }

    function attach(code,roomRef,seat,as){
      ref=roomRef;role=as;mySeat=seat;
      Object.assign(LUN,{code,ref,seat,role,left:0,g:game,actN:0,inv:{},room:null});
      window.luFr=repaint;onLobby();
      roomRef.on('value',snapshot=>{
        if(ref!==roomRef||LUN.left)return;
        room=snapshot.val();
        if(!room){exit('The Blackjack room was closed.');return;}
        const players=participants();
        if(players.some(p=>p.uid&&OL.BL[p.uid])){exit('A blocked player is in this room.');return;}
        luObserveRoom(room);
        if(role==='guest'&&(players[mySeat].k!=='p'||players[mySeat].uid!==OL.me)){exit('Your seat is no longer available.');return;}
        if(room.status==='lobby'){lobby();return;}
        if(role==='guest'){
          try{show(JSON.parse(room.snap).snap);}catch{}
          return;
        }
        if(!engine)return;
        if(view.phase==='betting'&&bets.some(Boolean)&&readyToDeal())deal();
        for(const [uid,raw] of Object.entries(room.act||{})){
          let input;
          try{input=JSON.parse(raw);}catch{continue;}
          if(!input||!Number.isSafeInteger(input.n)||input.n<=(seen.get(uid)||0))continue;
          seen.set(uid,input.n);
          const seat=players.findIndex(p=>p.k==='p'&&p.uid===uid);
          if(seat>0)apply(seat,input.action,input.amount,input.key);
        }
      },error=>{if(ref===roomRef&&!LUN.left)exit(luErr(error));});
    }

    async function connect(code,capacity){
      if(busy||joined())return false;
      busy=true;
      try{
        if(!await luLogin()||!active())return false;
        const uid=OL.me;
        if(code){
          const result=await luReserve(code,'blackjack',seats.length);
          if(!result)return false;
          if(!active()||OL.me!==uid){result.ref.child('seats/'+result.seat).set({k:'gone',uid,name:OL.name}).catch(()=>{});return false;}
          attach(code,result.ref,result.seat,'guest');
        }else{
          const id=luCode(),roomRef=OL.db.ref('rooms/'+id);
          const players=Object.fromEntries(seats.map(i=>[i,i?{k:i<capacity?'open':'off'}:{k:'p',uid,name:OL.name}]));
          await luCreate(id,{host:uid,hn:OL.name,ts:olTS(),status:'lobby',game:'blackjack',cfg:{d:1},seats:players});
          if(!active()||OL.me!==uid){roomRef.remove().catch(()=>{});return false;}
          attach(id,roomRef,0,'host');
        }
        return true;
      }catch(error){if(active())toast(luErr(error));return false;}
      finally{busy=false;}
    }
    async function start(){
      if(busy||role!=='host'||room?.status!=='lobby')return;
      const current=ref,players=participants();
      if(players.filter(p=>p.k==='p').length<2||players.some(p=>p.k==='open'))return;
      busy=true;
      try{
        await current.child('status').set('play');
        if(!active()||ref!==current)return;
        // The room uses fixed seat numbers even with closed seats.
        engine=BlackjackRules.create(players.map(p=>p.name||''),()=>mmDeck(4));
        beginBets();
      }catch(error){if(active())toast(luErr(error));}
      finally{busy=false;if(ref===current&&room?.status==='lobby')lobby();}
    }
    function join(code){
      code=String(code||$('#lucode')?.value||'').trim().toUpperCase();
      if(!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{20}$/.test(code)){toast('Enter the full room code.');return false;}
      return connect(code);
    }
    async function send(action,amount){
      if(!view||!ref)return false;
      const key=action==='bet'?view.roundKey:view.seq;
      if(role==='host')return apply(mySeat,action,amount,key);
      const input={n:++LUN.actN,key,action};
      if(action==='bet')input.amount=amount;
      try{await ref.child('act/'+OL.me).set(JSON.stringify(input));return true;}
      catch(error){if(active())toast(luErr(error));return false;}
    }
    return {joined,join,send,isHost:()=>role==='host',
      next(){if(role==='host'&&view?.phase==='result')beginBets();},
      click(button,capacity){
        const {lu,s,v,u}=button.dataset;
        if(lu==='bj-create')connect(null,Math.max(2,capacity));
        else if(lu==='bj-join')join();
        else if(lu==='bj-play')start();
        else if(lu==='bj-copy')luCopyCode();
        else if(lu==='bj-leave')exit();
        else if(lu==='bj-seat'&&role==='host'&&room?.status==='lobby')ref.child('seats/'+s).set({k:v}).catch(error=>toast(luErr(error)));
        else if(lu==='bj-invite'&&OL.F[u]&&olCanContact(u)){
          olWriteInvite(u,{mid:'room:'+LUN.code,code:LUN.code,name:OL.name,game:'blackjack',t:0,ts:olTS()})
            .then(()=>{LUN.inv[u]=olNow();toast('Invitation sent.');}).catch(error=>toast(luErr(error)));
        }
      },
      leave(){
        clearTimer();ref=null;room=null;engine=null;view=null;
        if(LUN.g===game){window.luFr=null;LUN.left=1;luCleanup();LUN.g=null;}
      }
    };
  };
})();
