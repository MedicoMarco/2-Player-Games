(() => {
  const maxLength = 180, cooldown = 2200;
  const game = document.querySelector('#game');
  const stage = game.querySelector('.stage');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'btn';
  trigger.id = 'gc-toggle';
  trigger.textContent = '💬';
  trigger.hidden = true;
  trigger.setAttribute('aria-label', 'Spielchat öffnen');
  trigger.setAttribute('aria-controls', 'gc-chat');
  game.querySelector('.bar').append(trigger);

  const layer = document.createElement('div');
  layer.className = 'gc-layer';
  const chat = document.createElement('section');
  chat.id = 'gc-chat';
  chat.hidden = true;
  chat.setAttribute('aria-label', 'Spielchat');
  chat.innerHTML = '<header><strong>Spielchat</strong><button type="button" class="btn g" aria-label="Spielchat schließen">×</button></header><div class="gc-feed" role="log" aria-label="Nachrichten im Spiel"></div><form><input type="text" enterkeyhint="send" autocomplete="off" maxlength="180" aria-label="Nachricht im Spiel" placeholder="Nachricht schreiben"><button class="btn">Senden</button></form><small role="status"></small>';
  game.append(layer, chat);

  const feed = chat.querySelector('.gc-feed');
  const form = chat.querySelector('form');
  const input = chat.querySelector('input');
  const send = form.querySelector('button');
  const status = chat.querySelector('[role=status]');
  const bubbles = new Map(), pendingRooms = new Set();
  let active = null, expanded = false, historyLimit = 40;

  function stop(){
    active = null;
    expanded = false;
    historyLimit=40;
    bubbles.forEach(({timer}) => clearTimeout(timer));
    bubbles.clear();
    layer.replaceChildren();
    feed.replaceChildren();
    input.value = '';
    input.readOnly = send.disabled = false;
    status.textContent = '';
    trigger.hidden = chat.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    delete trigger.dataset.unread;
  }

  function start(value){
    stop();
    active = {...value, entries:[], seen:new Map(), muted:new Set(), lastSent:-Infinity, lastReceived:-Infinity};
    trigger.hidden = false;
    trigger.setAttribute('aria-label','Spielchat öffnen');
  }

  function room(data, snapshot){
    const sameRoom = active?.kind === 'room' && active.code === LUN.code;
    const people = Object.entries(data?.seats || {}).filter(([,seat])=>seat.k === 'p');
    const me = people.find(([,seat])=>seat.uid === OL.me)?.[0];
    if(!LUN.ref || !me || data.status !== 'play' || !snapshot || snapshot.ph === 'end'){
      if(sameRoom)stop();
      return;
    }
    const names = Object.fromEntries(people);
    const tableSize=Object.values(data.seats).filter(seat=>seat.k==='p'||seat.k==='cpu').length;
    const round = snapshot.rn ?? 0;
    if(!sameRoom || active.round !== round) {
      start({kind:'room', code:LUN.code, ref:LUN.ref, seat:me, names, round, tableSize});
      for (const [seat,message] of Object.entries(data.chat || {})) active.seen.set(seat,message.id || message.ts);
      layout();
      return;
    }
    const changed = tableSize !== active.tableSize || people.length !== Object.keys(active.names).length;
    active.names = names;active.tableSize=tableSize;
    for(const [seat,message] of Object.entries(data.chat || {}).sort((a,b)=>a[1].ts-b[1].ts)){
      const id=message.id || message.ts;
      if(names[seat]?.uid !== message.uid || active.seen.get(seat)===id)continue;
      active.seen.set(seat,id);
      if(seat !== active.seat)receive(seat,message.text,message.id);
    }
    if(changed)layout();
  }

  function peer(ss){
    start({kind:'peer', ss, seat:String(ss.role), names:{
      0:{name:ss.names[0],uid:ss.role?ss.peer:OL.me},
      1:{name:ss.names[1],uid:ss.role?OL.me:ss.peer}
    }});
    layout();
  }

  function receivePeer(ss, text){
    if(active?.ss !== ss || ss.dead || !ss.live || !valid(text))return;
    if(performance.now()-active.lastReceived < 1800)return;
    active.lastReceived = performance.now();
    receive(String(1-ss.role),text.trim(),OL.db?.ref('peerChatReports').push().key);
  }

  function makeBlock(entry){
    const block=document.createElement('button');block.type='button';block.className='btn g';block.textContent='Blockieren';
    block.onclick=()=>olBlock(entry.uid,entry.name);return block;
  }
  function refreshBlocks(){
    if(!active)return;
    for(const [seat,bubble] of bubbles)if(seat!==active.seat && OL.BL[active.names[seat]?.uid]){
      clearTimeout(bubble.timer);bubble.node.remove();bubbles.delete(seat);
    }
    if(expanded||active.fallback)drawFeed();
  }
  function reportMessage(entry){
    const room=active,uid=OL.me;
    if(!room || !uid || entry.uid===uid)return;
    if(room.kind==='peer'){
      if(!room.ss.mid)return;
      window.chatModeration.report({path:['peerChatReports',room.ss.mid,entry.id,uid].join('/'),author:entry.uid,text:entry.text,name:entry.name,source:'claimed'});return;
    }
    const same=LUN.room?.chat?.[entry.seat]?.id===entry.id;
    window.chatModeration.report({path:['roomChatReports',room.code,entry.seat,entry.id,uid].join('/'),author:entry.uid,text:entry.text,name:entry.name,source:same?'verified':'claimed'});
  }
  function valid(text){
    return typeof text === 'string' && text.length <= maxLength && !!text.trim();
  }

  function item(entry, cls){
    const row = document.createElement('article');
    row.className = cls;
    row.dataset.seat = entry.seat;
    const author = document.createElement('strong');
    author.textContent = entry.name;
    const text = document.createElement('span');
    text.textContent = entry.text;
    row.append(author,text);
    return row;
  }

  function receive(seat, text, id){
    if(!active || !valid(text))return;
    const author = active.names[seat];
    if(!author || (seat!==active.seat && (OL.BL[author.uid] || active.muted.has(author.uid))))return;
    const life = Math.min(15500, 6400 + text.length*48);
    const entry = {seat, id, uid:author.uid, name:author.name, text, received:performance.now(), life};
    active.entries.push(entry);
    if(!expanded && seat!==active.seat)trigger.dataset.unread = '';
    if(active.kind==='peer' && seat!==active.seat)window.gameNotifications?.peer(active.ss.mid,author.name,text);
    const previous = bubbles.get(seat);
    if(previous){clearTimeout(previous.timer);previous.node.remove();}
    const node = item(entry,'gc-bubble');
    if(seat === active.seat)node.classList.add('gc-mine');
    node.style.setProperty('--gc-life', life+'ms');
    const timer=setTimeout(()=>{
      if(bubbles.get(seat)?.node!==node)return;
      node.remove();bubbles.delete(seat);
      if(active?.fallback&&!expanded)drawFeed();
    },life);
    bubbles.set(seat,{node,timer});
    layer.append(node);
    layout();
    if(expanded)drawFeed();
  }

  function drawFeed(keepPosition=false){
    if(!active)return;
    const nearBottom = feed.scrollHeight-feed.scrollTop-feed.clientHeight < 28;
    const previousHeight=feed.scrollHeight, previousTop=feed.scrollTop;
    const visible=active.entries.filter(m=>m.seat===active.seat || !OL.BL[m.uid]);
    const rows = expanded ? visible.slice(-historyLimit) : visible.filter(m=>!active.muted.has(m.uid) && performance.now()-m.received<m.life).slice(-3);
    feed.replaceChildren(...rows.map(entry=>{
      const row=item(entry,'gc-line');
      if(expanded && entry.seat!==active.seat && entry.id){
        const actions=document.createElement('div');actions.className='gc-actions';
        const report=document.createElement('button');report.type='button';report.className='btn g';report.textContent='Melden';
        report.onclick=()=>reportMessage(entry);
        const mute=document.createElement('button');mute.type='button';mute.className='btn g';
        const muted=active.muted.has(entry.uid);mute.textContent=muted?'Einblenden':'Ausblenden';
        mute.onclick=()=>{
          if(active.muted.delete(entry.uid))status.textContent=entry.name+' wird wieder angezeigt.';
          else{active.muted.add(entry.uid);status.textContent=entry.name+' ist in dieser Partie ausgeblendet.';}
          const pending=bubbles.get(entry.seat);if(pending){clearTimeout(pending.timer);pending.node.remove();bubbles.delete(entry.seat);}
          drawFeed();
        };
        if(muted)row.querySelector('span').textContent='Nachricht ausgeblendet';
        if(!muted)actions.append(report);actions.append(mute,makeBlock(entry));row.append(actions);
      }
      if(!expanded){
        row.style.setProperty('--gc-life',entry.life+'ms');
        row.style.setProperty('--gc-age',-Math.max(0,performance.now()-entry.received)+'ms');
      }
      return row;
    }));
    if(expanded && rows.length<visible.length){
      const older=document.createElement('button');
      older.type='button';older.className='btn g gc-older';older.textContent='Ältere Nachrichten';
      older.onclick=()=>{historyLimit+=40;drawFeed(true);};
      feed.prepend(older);
    }
    if(expanded && !rows.length){
      const empty = document.createElement('p');
      empty.className = 'gc-empty';empty.textContent = 'Noch keine Nachrichten.';
      feed.append(empty);
    }
    if(keepPosition)feed.scrollTop=previousTop+feed.scrollHeight-previousHeight;
    else if(nearBottom || !expanded)feed.scrollTop=feed.scrollHeight;
    chat.hidden = !expanded && (!active.fallback || !rows.length);
  }

  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

  function layout(){
    if(!active)return;
    const frame = game.getBoundingClientRect();
    const board = (active.kind==='room'?document.querySelector('#cv'):stage).getBoundingClientRect();
    const people = active.tableSize || Object.keys(active.names).length;
    const anchors = active.kind==='room'?LUN.g?.chatAnchors?.():null;
    const fallback = people > 4 || board.width < (people >= 4 ? 660 : 460) || board.height < 270 ||
      document.body.classList.contains('rotg') || active.kind==='room' && !anchors;
    const changed = active.fallback !== fallback;
    active.fallback = fallback;
    chat.classList.toggle('gc-passive',!expanded);
    layer.hidden = fallback;
    if(fallback){
      if(!expanded)drawFeed();
      return;
    }
    if(changed&&!expanded)chat.hidden=true;
    const sx = board.width/800, sy = board.height/480;
    for (const [seat,{node}] of bubbles){
      const anchor = anchors?.[seat];
      if(active.kind==='room' && !anchor){node.hidden=true;continue;}
      node.hidden=false;
      const availableWidth = anchor?.side==='left' ? 196 : people >= 4 && anchor ? Math.min(196,sx*(anchor.w+6)) : 234;
      node.style.maxWidth = Math.min(availableWidth,frame.width-16)+'px';
      const width = node.offsetWidth, height=node.offsetHeight;
      let x,y;
      if(anchor){
        x=board.left-frame.left+sx*(anchor.x+anchor.w/2)-width/2;
        y=board.top-frame.top+sy*(anchor.y+anchor.h)+5;
        if(anchor.side==='above')y=board.top-frame.top+sy*anchor.y-height-5;
        if(anchor.side==='left'){
          x=board.left-frame.left+sx*anchor.x-width-8;
          y=board.top-frame.top+sy*(anchor.y+anchor.h/2)-height/2;
        }
      } else {
        x = seat==='0' ? board.left-frame.left+10 : board.right-frame.left-width-10;
        y = Math.max(54,board.top-frame.top+8);
      }
      node.style.left=clamp(x,8,frame.width-width-8)+'px';
      node.style.top=clamp(y,4,frame.height-height-8)+'px';
    }
  }

  function toggle(value){
    if(!active)return;
    expanded=value;
    trigger.setAttribute('aria-expanded',String(expanded));
    trigger.setAttribute('aria-label',expanded?'Spielchat schließen':'Spielchat öffnen');
    chat.classList.toggle('gc-passive',!expanded);
    if(expanded){
      delete trigger.dataset.unread;
      drawFeed();
      input.focus();
    }else{
      input.blur();
      drawFeed();
      trigger.focus();
    }
  }

  form.onsubmit=async event=>{
    event.preventDefault();
    const room=active, text=input.value.trim();
    if(!room || !valid(text) || input.readOnly)return;
    if(performance.now()-room.lastSent < cooldown){status.textContent='Warte kurz, bevor du erneut sendest.';return;}
    const uid=OL.me;
    const pendingKey=room.kind==='room'?[room.code,room.seat,uid].join('/'):null;
    if(pendingRooms.has(pendingKey)){status.textContent='Eine Nachricht wartet noch auf Bestätigung.';return;}
    if(pendingKey)pendingRooms.add(pendingKey);
    input.readOnly=send.disabled=true;
    status.textContent='';
    let id;
    try{
      if(room.kind==='room'){
        const connected=await OL.db.ref('.info/connected').once('value');
        if(connected.val()!==true || room!==active || uid!==OL.me)throw Error('offline');
        id=room.ref.push().key;
        status.textContent='Warte auf Bestätigung von Firebase …';
        await room.ref.child('chat/'+room.seat).set({uid,text,ts:olTS(),id});
        if(OL.me===uid)window.gameNotifications?.dispatch(
          {kind:'room',source:room.code,seat:room.seat,message:id},
          Object.values(room.names).map(player=>player.uid)
        );
      }else{
        const channel=room.ss.ctl;
        if(channel?.readyState!=='open')throw Error('offline');
        channel.send(JSON.stringify({chat:text}));
      }
      if(room===active){
        room.lastSent=performance.now();
        receive(room.seat,text,id);
        input.value='';
        status.textContent='';
      }
    }catch(error){
      if(room===active)status.textContent=error.message==='offline'
        ?'Keine Verbindung. Versuche es erneut, sobald du wieder online bist.'
        :'Nachricht konnte nicht gesendet werden. Dein Text ist noch im Eingabefeld.';
    }finally{
      if(pendingKey)pendingRooms.delete(pendingKey);
      if(room===active)input.readOnly=send.disabled=false;
    }
  };
  trigger.onclick=()=>toggle(!expanded);
  chat.querySelector('header button').onclick=()=>toggle(false);
  for(const node of [chat,trigger]){
    node.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'&&expanded){e.preventDefault();toggle(false);}});
    node.addEventListener('keyup',e=>e.stopPropagation());
  }
  input.addEventListener('focus',()=>{if(typeof clearInput==='function')clearInput();});
  const reflow=new ResizeObserver(()=>layout());
  reflow.observe(stage);
  window.addEventListener('resize',layout);
  window.visualViewport?.addEventListener('resize',()=>{
    chat.style.setProperty('--gc-keyboard',Math.max(0,innerHeight-visualViewport.height-visualViewport.offsetTop)+'px');
    layout();
  });
  function openNotification(target){
    if(!active || (target.kind==='room'
      ? active.kind!=='room'||active.code!==target.id
      : active.kind!=='peer'||active.ss.mid!==target.id))return false;
    window.directChat?.close();
    olClose();
    toggle(true);
    return true;
  }

  window.gameChat={room,peer,receivePeer,stop,refreshBlocks,openNotification};
})();
