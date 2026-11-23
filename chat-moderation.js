(() => {
  const sources=[
    {path:'dmReports',label:'Privat',depth:4},
    {path:'groupReports',label:'Gruppe',depth:3},
    {path:'roomChatReports',label:'Spielraum',depth:4},
    {path:'peerChatReports',label:'Direkte Partie',depth:3}
  ];
  const reasons={insult:'Beleidigung',harassment:'Belästigung',hate:'Hass oder Diskriminierung',threat:'Drohung',sexual_safety:'Sexualisierte Inhalte oder Gefährdung',spam:'Spam',illegal:'Rechtswidriger Inhalt',other:'Sonstiges'};
  const states={open:'Offen',reviewed:'Geprüft',dismissed:'Verworfen'};
  const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
  function button(label,fn){
    const b=node('button',label);b.type='button';b.className='btn g';b.onclick=fn;return b;
  }
  const launcher=button('Moderation',openQueue);
  launcher.hidden=true;launcher.id='chat-mod-launch';
  document.querySelector('#dm-launch').after(launcher);
  const reportBox=document.createElement('dialog'), queue=document.createElement('dialog');
  for(const [dialog,id,title] of [[reportBox,'chat-report','Nachricht melden'],[queue,'chat-mod','Chatmeldungen']]){
    dialog.id=id;dialog.className='chat-mod-panel';
    const header=node('header',''), heading=node('h2',title);
    heading.id=id+'-heading';dialog.setAttribute('aria-labelledby',heading.id);
    header.append(heading,button('Schließen',()=>dialog.close()));dialog.append(header);
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.addEventListener('keyup',e=>e.stopPropagation());
    document.body.append(dialog);
  }
  const reportForm=document.createElement('form'), quote=node('blockquote',''), select=document.createElement('select');
  const label=node('label','Meldegrund');label.htmlFor='chat-report-reason';select.id=label.htmlFor;
  for(const [key,value] of Object.entries(reasons))select.add(new Option(value,key));
  const reportHelp=node('p',''), reportStatus=node('p',''), submit=node('button','Meldung senden');
  submit.className='btn';submit.type='submit';reportStatus.setAttribute('role','status');
  reportForm.append(quote,reportHelp,label,select,submit,reportStatus); reportBox.append(reportForm);
  const filter=document.createElement('select');filter.setAttribute('aria-label','Bearbeitungsstatus');
  for(const [key,value] of Object.entries({...states,all:'Alle Meldungen'}))filter.add(new Option(value,key));
  filter.onchange=render;
  const output=node('section',''), queueStatus=node('p','');
  queueStatus.setAttribute('role','status');queue.append(filter,queueStatus,output);
  let identity=null, pending=null, queueState=null;
  function showResult(text){reportStatus.textContent=text;}
  function report(message){
    if(!OL.me || OL.deleting)return;
    pending={...message,uid:OL.me};
    quote.textContent=message.name+' · '+message.text;
    select.value='harassment';submit.disabled=false;showResult('');
    reportHelp.textContent=message.source==='claimed'?'Der Wortlaut wird als unbestätigte Angabe an die Moderation gesendet.':'Die Moderation erhält die gemeldete Nachricht und deinen Meldegrund.';
    if(!reportBox.open)reportBox.showModal();
    select.focus();
  }
  reportBox.addEventListener('close',()=>{pending=null;quote.textContent='';});
  reportForm.onsubmit=async e=>{
    e.preventDefault();
    const m=pending;if(!m || submit.disabled || OL.me!==m.uid)return;
    submit.disabled=true;showResult('Wird gesendet …');
    const ts=olTS(), db=OL.db;
    const evidence={reason:select.value,author:m.author,text:m.text,ts};
    if(m.source)evidence.source=m.source;
    try{
      if(!(await db.ref('.info/connected').once('value')).val() || OL.me!==m.uid)throw Error('offline');
      await db.ref().update({[m.path]:evidence,['chatReportThrottle/'+m.uid]:{key:m.path,ts}});
      if(pending===m)showResult('Meldung wurde übermittelt.');
    }catch{
      if(pending!==m)return;
      submit.disabled=false;showResult('Meldung nicht möglich. Warte 30 Sekunden, prüfe die Verbindung oder wähle die Nachricht erneut.');
    }
  };

  function logout(){
    identity?.ref.off('value',identity.fn);
    identity=null;launcher.hidden=true;
    stopQueue();if(queue.open)queue.close();if(reportBox.open)reportBox.close();pending=null;quote.textContent='';
  }
  function sync(){
    if(!OL.me || OL.deleting){logout();return;}
    if(identity?.uid===OL.me)return;
    logout();
    const uid=OL.me, ref=OL.db.ref('chatV1/control/moderators/'+uid);
    const fresh={uid,ref,allowed:false};
    fresh.fn=s=>{
      if(identity!==fresh)return;
      fresh.allowed=s.val()===true;launcher.hidden=!fresh.allowed;
      if(!fresh.allowed){stopQueue();if(queue.open)queue.close();}
    };
    identity=fresh;
    ref.on('value',fresh.fn,()=>{if(identity===fresh)logout();});
  }

  function openQueue(){
    if(!identity?.allowed || identity.uid!==OL.me || queue.open)return;
    queue.showModal();
    const state=queueState={data:new Map(),offs:[],denied:new Set()};
    for(const source of sources){
      const ref=OL.db.ref(source.path);
      const receive=snap=>{
        if(queueState!==state)return;
        state.data.set(source.path,snap.val()||{});state.denied.delete(source.path);render();
      };
      const error=()=>{
        if(queueState!==state)return;
        state.data.delete(source.path);state.denied.add(source.path);render();
      };
      state.offs.push(()=>ref.off('value',receive));
      ref.on('value',receive,error);
    }
    render();
  }
  function stopQueue(){
    queueState?.offs.forEach(off=>off());queueState=null;
    output.replaceChildren();queueStatus.textContent='';
  }
  queue.addEventListener('close',stopQueue);
  function entries(value,depth,keys,result,source){
    if(depth===0){
      if(value && typeof value.text==='string')result.push({...value,keys,origin:source});
      return;
    }
    for(const [id,child] of Object.entries(value||{}))entries(child,depth-1,[...keys,id],result,source);
  }
  function render(){
    const state=queueState;if(!state)return;
    const reports=[];
    for(const source of sources)entries(state.data.get(source.path),source.depth,[],reports,source);
    reports.sort((a,b)=>b.ts-a.ts);
    output.replaceChildren();
    const waiting=sources.length-state.data.size-state.denied.size;
    queueStatus.textContent=waiting?'Meldungen werden geladen …':state.denied.size?'Einige Meldungen konnten nicht geladen werden.':'';
    const matching=reports.filter(r=>filter.value==='all'||filter.value===(r.review?.state||'open'));
    for(const report of matching.slice(0,100)){
      const card=node('article',''), heading=node('h3',report.origin.label+' · '+(reasons[report.reason]||report.reason));
      const badge=node('p',states[report.review?.state||'open']);
      const when=new Date(report.ts).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'});
      const meta=node('p',when+' · Absender '+report.author+' · Gemeldet von '+report.keys.at(-1));
      const context=node('p','Referenz '+report.keys.slice(0,-1).join(' / '));
      const evidence=node('p',report.source==='claimed'?'Wortlaut unbestätigt':'Wortlaut beim Melden aus Firebase bestätigt');
      evidence.className='chat-mod-evidence';
      const text=node('blockquote',report.text);
      const actions=node('div','');actions.className='chat-mod-actions';
      for(const [to,label] of [['reviewed','Als geprüft markieren'],['dismissed','Verwerfen'],['open','Wieder öffnen']]){
        if(to===(report.review?.state||'open'))continue;
        actions.append(button(label,()=>review(report,to)));
      }
      card.append(heading,badge,meta,context,evidence,text,actions);output.append(card);
    }
    if(!matching.length&&!waiting)output.append(node('p','Keine Meldungen in dieser Ansicht.'));
    if(matching.length>100)output.append(node('p','Die 100 neuesten Meldungen dieser Ansicht werden angezeigt.'));
  }
  async function review(report,state){
    if(!identity?.allowed || OL.me!==identity.uid)return;
    try{
      await OL.db.ref([report.origin.path,...report.keys,'review'].join('/')).set({state,by:OL.me,ts:olTS()});
    }catch{queueStatus.textContent='Der Bearbeitungsstatus konnte nicht gespeichert werden.';}
  }
  window.chatModeration={sync,logout,report};
})();