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
  const watched = new Map(), summaries = new Map(), alert = document.createElement('aside');
  let summaryFrame = 0;
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
  function markSeen(key,ts){
    const account=identity;
    if(!account?.online || ts<=Math.max(pref(key).seen||0,account.seen.get(key)||0))return;
    account.seen.set(key,ts);
    setPref(key,'seen',ts).catch(()=>{}).finally(()=>{
      if(account.seen.get(key)===ts)account.seen.delete(key);
    });
  }
  function visibleIncoming(m){return m && m.author!==OL.me && !OL.BL[m.author];}
  function updateSummaries(){
    if(summaryFrame)return;
    summaryFrame=requestAnimationFrame(()=>{
      summaryFrame=0;
      drawIndex();
      window.groupChat?.render();
      badge();
    });
  }
  function watchSummary(base,key,onMessage,onDenied,since=0){
    const preview=(since?base.startAt(since+0.5):base).limitToLast(1);
    let ready=false, previewListener=null, recent=null, countQuery=null, countListener=null, lower=null, newestSeen=null;
    const summary={latest:null, ready:()=>ready, refresh, unread, pause, resume, read, stop};
    function detachCount(){
      countQuery?.off('value',countListener);countQuery=null;countListener=null;lower=null;recent=null;
    }
    function refresh(){
      if(!previewListener)return;
      const boundary=Math.max(since,pref(key).seen || 0);
      if(!identity?.ready || !summary.latest || summary.latest.created<=boundary){detachCount();return;}
      if(lower===boundary)return;
      detachCount();lower=boundary;
      const q=base.startAt(boundary+0.5).limitToLast(50);
      countQuery=q;countListener=snap=>{
        if(countQuery!==q)return;
        recent=[];snap.forEach(m=>{recent.push(m.val());});updateSummaries();
      };
      q.on('value',countListener,()=>{if(countQuery===q){detachCount();updateSummaries();}});
    }
    function unread(){
      const seen=pref(key).seen || 0;
      const rows=recent || [summary.latest];
      const count=rows.filter(m=>visibleIncoming(m)&&m.created>seen).length;
      return {count,more:recent?.length===50 && recent[0].created>seen};
    }
    function read(rows,notify){
      const previous=summary.latest;
      const last=rows.at(-1);
      summary.latest=last?{id:last.id,...last.value}:null;
      if(!notify)recent=rows.map(row=>row.value);
      const m=summary.latest;
      const after=(a,b)=>a && (!b || a.created>b.created || a.created===b.created && a.id>b.id);
      if(visibleIncoming(m) && m.id!==newestSeen?.id && after(m,newestSeen)){
        newestSeen=m;
        if(notify && ready && after(m,previous) && m.created>(pref(key).seen||0))onMessage(m);
      }
      if(alertKey===key && m?.id!==previous?.id && (!m || after(previous,m)))hideAlert();
      ready=true;refresh();updateSummaries();
    }
    function pause(){
      if(previewListener)preview.off('value',previewListener);
      previewListener=null;
      detachCount();
    }
    function resume(){
      if(previewListener)return;
      const receive=snap=>{
        if(previewListener!==receive)return;
        const rows=[];
        snap.forEach(m=>{rows.push({id:m.key,value:m.val()});});
        read(rows,true);
      };
      previewListener=receive;
      preview.on('value',receive,()=>{
        if(previewListener!==receive)return;
        pause();summary.latest=null;ready=true;hideAlert(key);onDenied?.();updateSummaries();
      });
    }
    function stop(){pause();if(summaries.get(key)===summary)summaries.delete(key);}
    summaries.set(key,summary);
    if(session?.key===key)summary.read(session.pages[0]?.rows||[],false);
    else resume();
    return summary;
  }
  function stopIdentity(){
    watched.forEach(w=>w.stop());watched.clear();
    window.groupChat?.stop();
    if(identity){
      identity.ref.off('value',identity.fn);
      identity.connection.off('value',identity.connected);
    }
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
      const connection=OL.db.ref('.info/connected');
      const account={uid,ref,fn,connection,ready:false,online:false,seen:new Map(),pending:null};
      account.connected=snap=>{
        if(identity!==account)return;
        account.online=snap.val()===true;
        updateComposer();
        if(account.online)markCurrentSeen();
      };
      identity=account;
      connection.on('value',account.connected);
      ref.on('value',fn);
      window.groupChat?.attach();
    }
    const peers=new Set(Object.keys(OL.F).filter(olAllowed));
    for(const [peer,w] of watched)if(!peers.has(peer)){
      w.stop();watched.delete(peer);hideAlert(keyOf(peer));
    }
    for(const peer of peers){
      if(watched.has(peer))continue;
      const [a,b]=[OL.me,peer].sort(),q=OL.db.ref('directMessages/'+a+'/'+b).orderByChild('created');
      watched.set(peer,watchSummary(q,keyOf(peer),m=>notify(peer,m)));
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
      const feedback=alert.querySelector('small');
      feedback.textContent='Warte auf Bestätigung von Firebase …';
      try{await reply(text); if(alert.generation===generation){markSeen(key,m.created);hideAlert();}}
      catch(error){if(alert.generation===generation)feedback.textContent=sendError(error);}
      finally{if(alert.generation===generation)send.disabled=false;}
    };
  }
  function notify(peer,m){
    const uid=OL.me, [a,b]=[uid,peer].sort(), ref=OL.db.ref('directMessages/'+a+'/'+b);
    showAlert(keyOf(peer),olNameOf(peer),m,text=>save({a,b,uid,ref},text));
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
    const previous=session;
    session=null;
    if(previous){
      cancelAnimationFrame(previous.frame);
      previous.pages.forEach(p => p.query.off('value',p.listen));
      summaries.get(previous.key)?.resume();
    }
    input.readOnly=false;
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
    if(session){el('h2').textContent=session.peer?olNameOf(session.peer):session.name;drawActions(session);if(session.group)queueRender(session);return;}
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
    if(target && session?.key===target.key && session.since===target.since)return;
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
    const s=session={...target,pages:[],bubbles:new Map(),frame:0,depth:1};
    summaries.get(s.key)?.pause();
    el('[data-block]').hidden=!s.peer;el('[data-manage]').hidden=!s.group;
    drawActions(s);
    updateComposer();
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
      if(p===s.pages[0])summaries.get(s.key)?.read(p.rows,false);
      queueRender(s);
    };
    p.query.on('value',p.listen,() => {
      if (session === s && s.pages.includes(p)) {show(null); status.textContent = 'Der Zugriff auf diesen Verlauf wurde verweigert.';}
    });
  }
  function queueRender(s){
    if(s.frame)return;
    s.frame=requestAnimationFrame(()=>{
      s.frame=0;
      if(session!==s)return;
      for(let i=1;i<s.pages.length;i++){
        const boundary=s.pages[i-1].rows[0];
        const before=s.pages[i].before;
        if(before.id===boundary?.id && before.value.created===boundary.value.created)continue;
        s.pages.splice(i).forEach(p=>p.query.off('value',p.listen));
        break;
      }
      const last=s.pages.at(-1);
      if(s.depth>s.pages.length && last.rows.length===50)page(s,last.rows[0]);
      render(s);
    });
  }
  function resetEdit(s) {
    s.edit = null; s.reply = null; el('[data-reply]').hidden=true; input.value = ''; updateLength(); el('[data-cancel]').hidden = true; el('[data-send]').textContent = 'Senden';
  }
  const nearBottom=()=>feed.scrollHeight-feed.scrollTop-feed.clientHeight<70;
  function markCurrentSeen(){
    if(!session || !nearBottom() || document.visibilityState!=='visible')return;
    const row=session.pages[0]?.rows.findLast(({id,value})=>
      id!==identity?.pending?.id && (!session.group || !OL.BL[value.author]));
    if(row)markSeen(session.key,row.value.created);
    el('[data-latest]').hidden=true;
  }
  function render(s) {
    if(!s.pages[0]?.loaded)return;
    feed.setAttribute('aria-busy','false');
    const nearEnd = nearBottom();
    const anchor = [...feed.children].find(n=>n.offsetTop+n.offsetHeight >= feed.scrollTop);
    const offset = anchor ? anchor.offsetTop-feed.scrollTop : 0;
    const seen=new Set(), rows=[];
    for(const page of s.pages){
      for(let i=page.rows.length-1;i>=0;i--){
        const row=page.rows[i];
        if(seen.has(row.id) || s.group && OL.BL[row.value.author])continue;
        seen.add(row.id);rows.push(row);
      }
    }
    rows.reverse();
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
    if(s.pages.at(-1)?.loaded)s.loadingOlder=false;
    if(nearEnd)markCurrentSeen();
    else if(rows.at(-1)?.value.created>(pref(s.key).seen||0))el('[data-latest]').hidden=false;
  }
  function updateLength(){const count=el('[data-length]');count.hidden=input.value.length<800;count.textContent=input.value.length+' / 1.000';}
  input.addEventListener('input',updateLength);
  feed.addEventListener('scroll',markCurrentSeen);
  el('[data-latest]').onclick=()=>{feed.scrollTop=feed.scrollHeight;markCurrentSeen();};
  older.onclick = ()=>{
    if(!session)return;
    const last=session.pages.at(-1);
    if(last.rows.length!==50)return;
    older.hidden=true;
    session.loadingOlder=true;
    session.depth=session.pages.length+1;
    page(session,last.rows[0]);
  };
  function updateComposer(){
    const s=session;
    if(!s)return;
    const online=identity?.online===true, pending=identity?.pending;
    el('[data-send]').disabled=!online||!!pending||!!s.sending;
    input.readOnly=!!s.sending;
    const notice=pending
      ? online?'Warte auf Bestätigung von Firebase …':'Versand ausstehend. Er wird bei Wiederverbindung fortgesetzt.'
      : online?'':'Keine Verbindung. Dein Entwurf bleibt in diesem Chat.';
    if(notice || status.textContent===s.connectionNotice)status.textContent=notice;
    s.connectionNotice=notice;
  }
  function sendError(error){
    if(error.message==='offline')return 'Keine Verbindung. Sobald du wieder online bist, kannst du erneut senden.';
    if(error.message==='pending')return 'Eine Nachricht wartet noch auf Bestätigung. Bitte warte kurz.';
    if(/permission.denied/i.test(error.code||''))return 'Versand abgelehnt. Prüfe deinen Chat-Zugriff und warte mindestens zwei Sekunden zwischen Nachrichten.';
    return 'Nachricht konnte nicht gesendet werden. Dein Text ist noch im Eingabefeld.';
  }
  composer.onsubmit = async e => {
    e.preventDefault();
    const s=session, text=input.value.trim();
    if(!s || s.sending || identity?.pending || !identity?.online || !text || text.length>1000)return;
    const outgoing=s.reply && text.length<995?'› '+s.reply.text.slice(0,Math.min(90,997-text.length))+'\n'+text:text;

    s.sending=true;
    try {
      await save(s,outgoing.length<=1000?outgoing:text);
      if(session===s){resetEdit(s);status.textContent='Gespeichert.';markCurrentSeen();}
    }catch(error){if(session===s)status.textContent=sendError(error);}
    finally {s.sending=false;updateComposer();}
  };
  input.onkeydown=e=>{if(e.key==='Enter' && !e.shiftKey && !e.isComposing){e.preventDefault();composer.requestSubmit();}};
  async function save(s,text){
    const account=identity;
    if(!account?.online || account.uid!==s.uid || s.uid!==OL.me || OL.deleting)throw Error('offline');
    if(account.pending)throw Error('pending');
    const id=s.edit?.id || s.ref.push().key, ts=olTS();
    const message={author:s.uid,name:OL.name,text,created:s.edit?.m.created ?? ts,changed:ts};
    const path=s.group?'groupMessages/'+s.group+'/'+id:'directMessages/'+s.a+'/'+s.b+'/'+id;
    account.pending={id};
    updateComposer();
    try{
      await OL.db.ref().update({[path]:message,['dmThrottle/'+s.uid]:{a:s.group?'group':s.a,b:s.group||s.b,id,ts}});
      if(!s.edit && OL.me===s.uid && window.gameNotifications){
        if(s.group){
          OL.db.ref('groups/'+s.group+'/members').once('value').then(snapshot=>{
            if(OL.me!==s.uid)return;
            const recipients=Object.values(snapshot.val()||{}).map(member=>member.uid);
            window.gameNotifications.dispatch({kind:'group',source:s.group,message:id},recipients);
          }).catch(()=>{});
        }else window.gameNotifications.dispatch({kind:'direct',message:id},[s.peer]);
      }
    }finally{
      account.pending=null;
      if(identity===account)updateComposer();
    }
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
    isOnline:()=>identity?.online===true,
    current:()=>session,
    isGroupIndex:()=>dialog.open && !session && indexTab==='groups',
    status:text=>{status.textContent=text;},
    groupList:el('[data-group-list]')
  };
})();
