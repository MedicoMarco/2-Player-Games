(() => {
  const dialog = document.createElement('dialog');
  dialog.id = 'dm-panel';
  dialog.setAttribute('aria-labelledby', 'dm-title');
  dialog.innerHTML = '<header><button class="btn g" data-back aria-label="Zur Chatübersicht">‹</button><h2 id="dm-title">Chats</h2><button class="btn g" data-close aria-label="Schließen">×</button></header><nav data-tabs aria-label="Chattyp"><button type="button" class="btn" data-private>Privat</button><button type="button" class="btn g" data-groups>Gruppen</button></nav><section data-index><label class="dm-search">Chats suchen<input type="search" data-search placeholder="Name eingeben"></label><section data-list aria-label="Private Unterhaltungen"></section></section><section data-group-list hidden></section><section data-thread hidden><button type="button" class="btn g" data-block>Spieler blockieren</button><button type="button" class="btn g" data-mute></button><button type="button" class="btn g" data-pin></button><button type="button" class="btn g" data-manage hidden>Mitglieder</button><p class="dm-reply" data-reply hidden></p><button class="btn g" data-older hidden>Ältere Nachrichten laden</button><div data-feed tabindex="0" aria-label="Nachrichten"></div><button type="button" class="btn g" data-latest hidden>Zu den neuesten Nachrichten ↓</button><form><label for="dm-text">Nachricht</label><textarea id="dm-text" rows="2" maxlength="1000" placeholder="Nachricht schreiben"></textarea><div><small data-length hidden></small><button type="button" class="btn g" data-cancel hidden>Bearbeitung abbrechen</button><button class="btn" data-send>Senden</button></div></form></section><p data-status role="status"></p>';
  document.body.append(dialog);
  const el = selector => dialog.querySelector(selector);
  const list = el('[data-list]'), thread = el('[data-thread]'), feed = el('[data-feed]');
  const composer = thread.querySelector('form');
  const input = el('textarea'), status = el('[data-status]'), older = el('[data-older]');
  let session = null, identity = null, preferences = {}, indexTab = 'private', alertKey = null, alertTimer, returnFocus;
  const watched = new Map(), alert = document.createElement('aside');
  alert.id = 'dm-alert'; alert.hidden = true;
  alert.innerHTML = '<header><strong></strong><button type="button" class="btn g" data-dismiss aria-label="Schließen">×</button></header><p></p><form><input aria-label="Direktantwort" maxlength="1000" placeholder="Direkt antworten"><button class="btn">Senden</button></form><small role="status"></small>';
  document.body.append(alert);
  alert.querySelector('[data-dismiss]').onclick = hideAlert;
  const keyOf = peer => 'dm_'+peer;
  const groupKey = id => 'group_'+id;
  function hideAlert(key){
    if(typeof key==='string' && alertKey!==key)return;
    clearTimeout(alertTimer);alert.generation=null;alertKey=null;alert.sender=null;alert.hidden=true;
    alert.querySelector('input').value='';alert.querySelector('p').textContent='';
  }
  function pref(key){return preferences[key] || {};}
  function setPref(key,field,value){
    return OL.db.ref(['chatPreferences',OL.me,key,field].join('/')).set(value);
  }
  function markSeen(key,ts){if(ts > (pref(key).seen || 0))setPref(key,'seen',ts).catch(()=>{});}
  function visibleIncoming(m){return m && m.author!==OL.me && !OL.BL[m.author];}
  function watchSummary(base,key,onUpdate,onMessage,onDenied,since=0){
    const preview=(since?base.startAt(since+0.5):base).limitToLast(1);
    let ready=false, stopped=false, recent=null, countQuery=null, countListener=null, lower=null;
    const summary={latest:null, ready:()=>ready, refresh, unread, stop};
    function detachCount(){
      countQuery?.off('value',countListener);countQuery=null;countListener=null;lower=null;recent=null;
    }
    function refresh(){
      if(stopped)return;
      const boundary=Math.max(since,pref(key).seen || 0);
      if(!identity?.ready || !summary.latest || summary.latest.created<=boundary){detachCount();return;}
      if(lower===boundary)return;
      detachCount();lower=boundary;
      const q=base.startAt(boundary+0.5).limitToLast(50);
      countQuery=q;countListener=snap=>{
        if(countQuery!==q)return;
        recent=[];snap.forEach(m=>{recent.push(m.val());});onUpdate();
      };
      q.on('value',countListener,()=>{if(countQuery===q){detachCount();onUpdate();}});
    }
    function unread(){
      const seen=pref(key).seen || 0;
      const rows=recent || [summary.latest];
      const count=rows.filter(m=>visibleIncoming(m)&&m.created>seen).length;
      return {count,more:recent?.length===50 && recent[0].created>seen};
    }
    function receive(snap){
      if(stopped)return;
      const previous=summary.latest;
      summary.latest=null;snap.forEach(m=>{summary.latest={id:m.key,...m.val()};});
      const m=summary.latest;
      if(ready && visibleIncoming(m) && m.created>(pref(key).seen||0) && m.id!==previous?.id && (!previous||m.created>=previous.created))onMessage(m);
      if(alertKey===key && m?.id!==previous?.id && (!m || m.created<(previous?.created||0)))hideAlert();
      ready=true;refresh();onUpdate();
    }
    function stop(){stopped=true;preview.off('value',receive);detachCount();}
    preview.on('value',receive,()=>{if(!stopped){summary.latest=null;ready=true;detachCount();hideAlert(key);onDenied?.();onUpdate();}});
    return summary;
  }
  function stopIdentity(){
    watched.forEach(w=>w.stop());watched.clear();
    identity?.ref.off('value',identity.fn);
    window.groupChat?.stop();
    identity=null;preferences={};hideAlert();badge();
  }
  function attach(){
    if(!OL.me || OL.deleting){if(identity)stopIdentity();return;}
    if(identity?.uid!==OL.me){
      stopIdentity();
      const ref=OL.db.ref('chatPreferences/'+OL.me), uid=OL.me;
      const fn=s=>{
        if(identity?.uid!==uid)return;
        preferences=s.val()||{};identity.ready=true;
        if(alertKey && pref(alertKey).muted)hideAlert();
        watched.forEach(w=>w.refresh());window.groupChat?.refreshCounts?.();
        sync();badge();
      };
      identity={uid,ref,fn,ready:false};ref.on('value',fn);
      window.groupChat?.attach();
    }
    const peers=Object.keys(OL.F).filter(olAllowed);
    for(const [peer,w] of watched)if(!peers.includes(peer)){
      w.stop();watched.delete(peer);hideAlert(keyOf(peer));
    }
    for(const peer of peers){
      if(watched.has(peer))continue;
      const [a,b]=[OL.me,peer].sort(),q=OL.db.ref('directMessages/'+a+'/'+b).orderByChild('created');
      watched.set(peer,watchSummary(q,keyOf(peer),()=>{drawIndex();badge();},m=>notify(peer,m)));
    }
    badge();
  }
  function showAlert(key,label,m,reply){
    if(pref(key).muted || session?.key===key || document.visibilityState !== 'visible')return;
    if(!alert.hidden && (alert.querySelector('input').value || alert.querySelector('form button').disabled))return;
    (dialog.open?dialog:document.body).append(alert);
    if(alertKey!==key)hideAlert();
    alertKey=key;alert.sender=m.author;alert.hidden=false;
    const generation={};alert.generation=generation;
    clearTimeout(alertTimer);
    alertTimer=setTimeout(()=>{if(!alert.contains(document.activeElement) && !alert.querySelector('input').value)hideAlert();},12000);
    alert.querySelector('strong').textContent=label;
    alert.querySelector('p').textContent=m.text.slice(0,160);
    alert.querySelector('small').textContent='';
    const field=alert.querySelector('input'),send=alert.querySelector('form button');
    send.disabled=false;
    alert.querySelector('form').onsubmit=async e=>{
      e.preventDefault();const text=field.value.trim();
      if(send.disabled || !text || text.length>1000)return;
      send.disabled=true;
      try{await reply(text); if(alert.generation===generation){markSeen(key,m.created);hideAlert();}}
      catch{if(alert.generation===generation)alert.querySelector('small').textContent='Antwort konnte nicht gesendet werden. Bitte kurz warten.';}
      finally{if(alert.generation===generation)send.disabled=false;}
    };
  }
  function notify(peer,m){
    const [a,b]=[OL.me,peer].sort(), ref=OL.db.ref('directMessages/'+a+'/'+b);
    showAlert(keyOf(peer),olNameOf(peer),m,text=>save({a,b,uid:OL.me,ref},text));
  }
  const launcher=document.querySelector('#dm-launch');
  const unread=peer=>watched.get(peer)?.unread() || {count:0,more:false};
  const hasUnread=u=>u.count>0 || u.more;
  function badge(){
    const n=[...watched.keys()].filter(peer=>hasUnread(unread(peer))).length, g=window.groupChat?.unread()||0;
    const count=n+g;
    for(const [control,value] of [[launcher,count],[el('[data-private]'),n],[el('[data-groups]'),g]])control.dataset.count=value>99?'99+':value||'';
    launcher.setAttribute('aria-label',count?'Chats, '+count+' ungelesene Unterhaltungen':'Chats');
  }
  function row(name,preview,m,key,unread,open){
    const b=button('',open), avatar=document.createElement('span'), body=document.createElement('span'), title=document.createElement('strong'), sub=document.createElement('small'), side=document.createElement('span');
    b.className='dm-row';b.dataset.chatKey=key;avatar.className='dm-avatar';avatar.textContent=name.slice(0,2).toUpperCase();
    title.textContent=name;sub.textContent=preview;body.append(title,sub);
    side.className='dm-row-side';side.textContent=(pref(key).pinned?'📌 ':'')+(pref(key).muted?'🔕 ':'')+(m?formattedTime(m.created):'');
    if(hasUnread(unread)){
      const count=document.createElement('span');count.className='dm-count';
      count.textContent=unread.count?(unread.count+(unread.more?'+':'')):'+';
      count.setAttribute('aria-label',(unread.more?'Mindestens ':'')+unread.count+' ungelesene Nachrichten');side.append(count);
    }
    b.append(avatar,body,side);return b;
  }
  function formattedTime(ts){
    const date=new Date(ts);
    return date.toDateString()===new Date().toDateString()?date.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):date.toLocaleDateString('de-DE',{day:'numeric',month:'short'});
  }
  function drawIndex(){
    if(!dialog.open || session || indexTab!=='private')return;
    const term=el('[data-search]').value.toLocaleLowerCase().trim();
    const latest=p=>watched.get(p)?.latest;
    const peers=[...watched.keys()].filter(p=>olNameOf(p).toLocaleLowerCase().includes(term));
    peers.sort((a,b)=>Number(!!pref(keyOf(b)).pinned)-Number(!!pref(keyOf(a)).pinned)||(latest(b)?.created||0)-(latest(a)?.created||0)||olNameOf(a).localeCompare(olNameOf(b)));
    const focused=list.contains(document.activeElement)?document.activeElement.dataset.chatKey:null;
    list.replaceChildren(...peers.map(p=>row(olNameOf(p),latest(p)?.text || (watched.get(p)?.ready()?'Unterhaltung starten':'Lädt …'),latest(p),keyOf(p),unread(p),()=>open(p))));
    if(!peers.length){const empty=document.createElement('p');empty.className='dm-empty';empty.textContent=term?'Keine passenden Chats.':OL.blocksReady?'Hier erscheinen deine bestätigten Freunde.':'Kontakte werden geladen …';list.append(empty);}
    if(focused)Array.from(list.children).find(row=>row.dataset.chatKey===focused)?.focus({preventScroll:true});
  }
  function button(label, act) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn g'; b.textContent = label; b.onclick = act;
    return b;
  }
  function stop() {
    if (session) {
      session.pages.forEach(p => p.query.off('value', p.listen));
      session.connection.off('value', session.connected);
    }
    session = null; input.readOnly=false;
    el('[data-reply]').hidden=true;el('[data-latest]').hidden=true;el('[data-length]').hidden=true; feed.replaceChildren(); input.value = ''; status.textContent = '';
    el('[data-cancel]').hidden = true; el('[data-send]').textContent = 'Senden';
  }
  function close(){
    stop();hideAlert();if(dialog.open)dialog.close();document.body.append(alert);
    if(returnFocus)(returnFocus.getClientRects().length?returnFocus:launcher).focus({preventScroll:true});
    returnFocus=null;
  }
  function logout(){close();stopIdentity();}
  function sync() {
    attach();
    if(alert.sender && OL.BL[alert.sender])hideAlert();
    if (!dialog.open) return;
    if (!OL.me || OL.deleting) { close(); return; }
    if (session?.peer && (!OL.F[session.peer] || !olAllowed(session.peer))) {
      open(); status.textContent = 'Diese Unterhaltung ist gesperrt.'; return;
    }
    if(session){el('h2').textContent=session.peer?olNameOf(session.peer):session.name;drawActions(session);if(session.group)render(session);return;}
    if(indexTab==='groups')window.groupChat?.render();
    else drawIndex();
  }
  function drawActions(s){
    el('[data-mute]').textContent=pref(s.key).muted?'Vorschau einschalten':'Stummschalten';
    el('[data-pin]').textContent=pref(s.key).pinned?'Von oben lösen':'Oben anheften';
  }
  function open(peer) {
    if (!OL.me) { olOpen(); return; }
    const [a,b] = [OL.me,peer].sort();
    const active=peer && OL.F[peer] && olAllowed(peer);
    show(active?{peer,a,b,key:keyOf(peer),uid:OL.me,ref:OL.db.ref('directMessages/'+a+'/'+b)}:null, 'private');
  }
  function show(target,tab=indexTab){
    stop();hideAlert();indexTab=tab;
    if(!dialog.open){returnFocus=document.activeElement===document.body?launcher:document.activeElement;dialog.showModal();}
    const active=!!target;
    el('[data-index]').hidden=active||tab!=='private';
    el('[data-group-list]').hidden=active||tab!=='groups';
    el('[data-tabs]').hidden=active;
    el('[data-private]').setAttribute('aria-pressed',String(tab==='private'));
    el('[data-groups]').setAttribute('aria-pressed',String(tab==='groups'));
    thread.hidden=!active;el('[data-back]').hidden=!active;
    el('h2').textContent=target?(target.peer?olNameOf(target.peer):target.name):'Chats';
    if(!target){sync();(tab==='groups'?el('[data-groups]'):el('[data-search]')).focus();return;}
    const s=session={...target,pages:[],bubbles:new Map(),connection:OL.db.ref('.info/connected')};
    el('[data-block]').hidden=!s.peer;el('[data-manage]').hidden=!s.group;
    drawActions(s);
    s.connected = snap => {
      if (session !== s) return;
      s.online = snap.val() === true; el('[data-send]').disabled = !s.online || !!s.sending;
      status.textContent = s.online ? '' : 'Verbindung wird hergestellt. Dein Entwurf bleibt hier.';
    };
    s.connection.on('value',s.connected);
    const loading=document.createElement('p');loading.className='dm-empty';loading.textContent='Verlauf wird geladen …';feed.append(loading);
    feed.setAttribute('aria-busy','true');older.hidden=true;el('[data-back]').focus();
    page(s, null);
  }
  function page(s, before) {
    let query = s.ref.orderByChild('created');
    // Message timestamps are whole milliseconds. Use a fractional bound so the emulator compares it as a numeric timestamp.
    if(s.since)query=query.startAt(s.since+0.5);
    if (before) query = query.endBefore(before.value.created, before.id);
    const p = {query:query.limitToLast(50), rows:[], before};
    s.pages.push(p);
    p.listen = snap => {
      if (session !== s || !s.pages.includes(p)) return;
      const previous = new Set(p.rows.map(row=>row.id)), loaded = p.loaded;
      p.loaded = true;
      p.rows = []; snap.forEach(child => {p.rows.push({id:child.key,value:child.val()});});
      if (loaded && p === s.pages[0]) {
        for (const row of p.rows) if (!previous.has(row.id) && row.value.author !== s.uid) row.fresh = true;
      }
      const i = s.pages.indexOf(p), next = s.pages[i+1];
      if (next && next.before.id !== p.rows[0]?.id) {
        const depth = s.pages.length;
        s.pages.splice(i+1).forEach(x => x.query.off('value',x.listen));
        s.depth = Math.max(s.depth || 0, depth);
      }
      if (s.depth > s.pages.length && p === s.pages.at(-1) && p.rows.length === 50) page(s,p.rows[0]);
      render(s);
    };
    p.query.on('value',p.listen,() => {
      if (session === s) {show(null); status.textContent = 'Der Zugriff auf diesen Verlauf wurde verweigert.';}
    });
  }
  function resetEdit(s) {
    s.edit = null; s.reply = null; el('[data-reply]').hidden=true; input.value = ''; updateLength(); el('[data-cancel]').hidden = true; el('[data-send]').textContent = 'Senden';
  }
  const nearBottom=()=>feed.scrollHeight-feed.scrollTop-feed.clientHeight<70;
  function markCurrentSeen(){
    if(!session || !nearBottom() || document.visibilityState!=='visible')return;
    const m=session.pages[0]?.rows.at(-1)?.value;
    if(m)markSeen(session.key,m.created);
    el('[data-latest]').hidden=true;
  }
  function render(s) {
    if(!s.pages[0]?.loaded)return;
    feed.setAttribute('aria-busy','false');
    const nearEnd = nearBottom();
    const anchor = [...feed.children].find(n=>n.offsetTop+n.offsetHeight >= feed.scrollTop);
    const offset = anchor ? anchor.offsetTop-feed.scrollTop : 0;
    const rows = s.pages.slice().reverse().flatMap(p=>p.rows).filter(row=>!s.group||!OL.BL[row.value.author]);
    const next=new Map();let cursor=feed.firstChild;
    for (const {id,value:m,fresh} of rows) {
      const existing=s.bubbles.get(id);
      if(existing && existing.value.text===m.text && existing.value.changed===m.changed){
        if(existing.node!==cursor)feed.insertBefore(existing.node,cursor);
        cursor=existing.node.nextSibling;next.set(id,existing);continue;
      }
      const bubble = document.createElement('article'), mine = m.author === s.uid;
      bubble.dataset.id = id; bubble.className = (mine ? 'dm-own' : 'dm-peer')+(fresh?' dm-new':'');
      const meta = document.createElement('small'), body = document.createElement('p');
      const time=document.createElement('time');time.dateTime=new Date(m.created).toISOString();time.textContent=formattedTime(m.created);
      meta.append(mine?'Du':m.name,' · ',time,m.changed!==m.created?' · bearbeitet':'');
      body.textContent = m.text; bubble.append(meta,body);
      const menu = document.createElement('details'), summary = document.createElement('summary');
      summary.textContent = 'Optionen'; menu.append(summary);
      menu.append(button('Antworten',()=>{
        resetEdit(s);s.reply=m;
        const reply=el('[data-reply]');
        reply.textContent='Antwort an '+m.name+' · '+m.text.slice(0,90);
        reply.append(button('×',()=>{s.reply=null;reply.hidden=true;}));reply.hidden=false;input.focus();
      }));
      if (mine) {
        menu.append(button('Bearbeiten',()=>{s.edit={id,m}; input.value=m.text; updateLength(); s.reply=null; el('[data-reply]').hidden=true; input.focus(); el('[data-cancel]').hidden=false; el('[data-send]').textContent='Speichern';}));
        menu.append(button('Löschen',async()=>{if(!confirm('Diese Nachricht löschen?'))return;
          try {await s.ref.child(id).remove(); if(session===s && s.edit?.id===id)resetEdit(s);}
          catch {if(session===s)status.textContent='Löschen fehlgeschlagen.';}
        }));
      } else {
        const path=s.group?['groupReports',s.group,id,s.uid]:['dmReports',s.a,s.b,id,s.uid];
        menu.append(button('Melden',()=>window.chatModeration.report({path:path.join('/'),text:m.text,author:m.author,name:m.name})));
        if(s.group)menu.append(button('Blockieren',()=>olBlock(m.author,m.name)));
      }
      bubble.append(menu);feed.insertBefore(bubble,cursor);next.set(id,{node:bubble,value:m});
    }
    for(const node of [...feed.children])if(next.get(node.dataset.id)?.node!==node)node.remove();
    s.bubbles=next;
    older.hidden = s.pages.at(-1)?.rows.length !== 50;
    if(!rows.length){const empty=document.createElement('p');empty.className='dm-empty';empty.textContent='Hier beginnt eure Unterhaltung.';feed.append(empty);}
    const found=anchor && [...feed.children].find(n=>n.dataset.id===anchor.dataset.id);
    if (found && (!nearEnd || s.loadingOlder)) feed.scrollTop = found.offsetTop-offset;
    else if(nearEnd) feed.scrollTop=feed.scrollHeight;
    s.loadingOlder=false;
    if(nearEnd)markCurrentSeen();
    else if(rows.at(-1)?.value.created>(pref(s.key).seen||0))el('[data-latest]').hidden=false;
  }
  function updateLength(){const count=el('[data-length]');count.hidden=input.value.length<800;count.textContent=input.value.length+' / 1.000';}
  input.addEventListener('input',updateLength);
  feed.addEventListener('scroll',markCurrentSeen);
  el('[data-latest]').onclick=()=>{feed.scrollTop=feed.scrollHeight;markCurrentSeen();};
  older.onclick = ()=>{if(!session)return; const last=session.pages.at(-1); if(last.rows.length===50){older.hidden=true;session.loadingOlder=true;page(session,last.rows[0]);}};
  composer.onsubmit = async e => {
    e.preventDefault();
    const s=session, text=input.value.trim();
    if(!s || s.sending || !s.online || !text || text.length>1000)return;
    const outgoing=s.reply && text.length<995?'› '+s.reply.text.slice(0,Math.min(90,997-text.length))+'\n'+text:text;

    s.sending=true; el('[data-send]').disabled=true; input.readOnly=true; status.textContent='Wird gespeichert …';
    try {
      await save(s,outgoing.length<=1000?outgoing:text);
      if(session===s){resetEdit(s);status.textContent='Gespeichert.';}
    }catch {if(session===s)status.textContent='Speichern fehlgeschlagen. Prüfe die Verbindung und warte zwischen Nachrichten zwei Sekunden.';}
    finally {s.sending=false;if(session===s){input.readOnly=false;el('[data-send]').disabled=!s.online;}}
  };
  input.onkeydown=e=>{if(e.key==='Enter' && !e.shiftKey && !e.isComposing){e.preventDefault();composer.requestSubmit();}};
  async function save(s,text){
    const id=s.edit?.id || s.ref.push().key, ts=olTS();
    const message={author:s.uid,name:OL.name,text,created:s.edit?.m.created ?? ts,changed:ts};
    const db=OL.db;
    if(s.uid!==OL.me || (await db.ref('.info/connected').once('value')).val()!==true || OL.me!==s.uid)throw Error('Offline');
    await db.ref().update({[s.group?'groupMessages/'+s.group+'/'+id:'directMessages/'+s.a+'/'+s.b+'/'+id]:message,['dmThrottle/'+s.uid]:{a:s.group?'group':s.a,b:s.group||s.b,id,ts}});
  }
  el('[data-search]').oninput=drawIndex;
  alert.addEventListener('keydown',e=>e.stopPropagation());
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='visible'){hideAlert();return;}
    markCurrentSeen();
  });
  el('[data-private]').onclick=()=>open();el('[data-groups]').onclick=()=>show(null,'groups');
  for(const [attr,field] of [['data-mute','muted'],['data-pin','pinned']]){
    el('['+attr+']').onclick=()=>{const s=session;if(s)setPref(s.key,field,pref(s.key)[field]?null:true).catch(()=>{status.textContent='Einstellung konnte nicht gespeichert werden.';});};
  }
  el('[data-manage]').onclick=()=>{if(session?.group)window.groupChat.manage(session.group);};
  el('[data-block]').onclick=()=>{if(session)olBlock(session.peer);};
  dialog.addEventListener('keydown',e=>e.stopPropagation());
  el('[data-close]').onclick=close; el('[data-back]').onclick=()=>show(null);
  el('[data-cancel]').onclick=()=>{if(session)resetEdit(session);};
  dialog.oncancel=e=>{e.preventDefault();close();};
  document.querySelector('#dm-launch').onclick=()=>open();
  window.directChat={open,close,sync,logout,show,row,groupKey,pref,markSeen,badge,notify:showAlert,hideAlert,save,dialog,watchSummary,hasUnread,
    current:()=>session,
    isGroupIndex:()=>dialog.open && !session && indexTab==='groups',
    status:text=>{status.textContent=text;},
    groupList:el('[data-group-list]')
  };
})();