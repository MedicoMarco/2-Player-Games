(() => {
  const icons={team:'👥',star:'⭐',bolt:'⚡',moon:'🌙'};
  let identity=null,groups=new Map(),invitations={};
  const chat=()=>window.directChat;
  const root=()=>OL.db.ref();
  const locationOf=id=>'groups/'+id;
  const ref=id=>root().child(locationOf(id));
  const index=(uid,id)=>'groupIndex/'+uid+'/'+id;
  const invite=(uid,id)=>'groupInvitations/'+uid+'/'+id;
  const tick=()=>firebase.database.ServerValue.TIMESTAMP;
  function listen(ref,fn,errors){
    const cb=s=>fn(s.val()||{});ref.on('value',cb,errors);return ()=>ref.off('value',cb);
  }
  function stop(){
    identity?.offs.forEach(fn=>fn());
    groups.forEach(g=>{g.offGroup?.();g.summary?.stop();});groups.clear();invitations={};identity=null;
  }
  function view(g){
    if(!g.data)return null;
    const me=g.data.members?.[g.slot];
    if(!me || me.uid!==OL.me || g.data.info?.closed)return null;
    return {group:g.id,name:g.data.info.name+' · '+Object.keys(g.data.members).length+' Mitglieder',key:chat().groupKey(g.id),since:me.since,uid:OL.me,ref:root().child('groupMessages/'+g.id),me};
  }
  function attach(){
    if(!OL.me || identity?.uid===OL.me)return;
    stop();
    const account=identity={uid:OL.me,offs:[],ready:false};
    account.offs.push(listen(root().child('groupIndex/'+account.uid),entries=>{
      if(identity!==account)return;
      account.ready=true;
      for(const [id,g] of groups)if(entries[id]!==g.slot){g.offGroup?.();g.summary?.stop();groups.delete(id);revoked(id);}
      for(const [id,slot] of Object.entries(entries)){
        if(groups.has(id))continue;
        const g={id,slot};groups.set(id,g);
        g.offGroup=listen(ref(id),data=>{
          if(groups.get(id)!==g)return;
          g.data=data;
          const target=view(g);
          if(!target){g.summary?.stop();g.summary=null;revoked(id);render();return;}
          const current=chat().current();
          if(current?.group===id && current.since!==target.since)revoked(id);
          if(g.summary && g.since!==target.since){g.summary.stop();g.summary=null;}
          if(chat().current()?.group===id){chat().current().name=target.name;chat().sync();}
          if(!g.summary){
            g.since=target.since;
            g.summary=chat().watchSummary(target.ref.orderByChild('created'),target.key,
              m=>chat().notify(target.key,g.data?.info?.name+' · '+m.name,m,text=>chat().save(target,text)),
              ()=>chat().hideAlert(target.key),target.since);
          }
          render();
        },()=>{g.data=null;g.summary?.stop();g.summary=null;revoked(id);render();chat().badge();});
      }
      render();chat().badge();
    }));
    account.offs.push(listen(root().child('groupInvitations/'+account.uid),data=>{if(identity===account){invitations=data;render();}}));
  }
  function revoked(id){
    if(chat().current()?.group===id){chat().show(null,'groups');chat().status('Der Zugriff auf die Gruppe ist beendet.');}
    chat().hideAlert('group_'+id);
  }
  const unreadGroup=g=>g.summary?.unread() || {count:0,more:false};
  const unread=()=>[...groups.values()].filter(g=>view(g)&&chat().hasUnread(unreadGroup(g))).length;
  const refreshCounts=()=>groups.forEach(g=>g.summary?.refresh());
  function button(label,fn){
    const b=document.createElement('button');b.type='button';b.className='btn g';b.textContent=label;b.onclick=fn;return b;
  }
  function item(tag,text){const n=document.createElement(tag);n.textContent=text;return n;}
  function run(action,after,button){
    if(button)button.disabled=true;
    chat().status('');
    return Promise.resolve().then(async()=>{
      if(!chat().isOnline())throw Error('Keine Verbindung. Bitte erneut versuchen.');
      await action();
    }).then(after).catch(e=>{chat().status(e.code?'Die Änderung wurde abgelehnt. Prüfe deine Berechtigung und versuche es erneut.':e.message);}).finally(()=>{if(button)button.disabled=false;});
  }
  function render(){
    if(!chat().isGroupIndex())return;
    if(managing){const g=groups.get(managing);if(g&&view(g)){renderManage(g);return;}managing=null;}
    const section=chat().groupList;
    const existing=section.querySelector('[data-group-create]');
    if(!existing){
      section.replaceChildren();
      const form=document.createElement('form');form.dataset.groupCreate='';
      const input=document.createElement('input'); input.required=true; input.maxLength=50;input.placeholder='Gruppenname';input.setAttribute('aria-label','Gruppenname');
      const select=document.createElement('select');select.setAttribute('aria-label','Gruppensymbol');for(const [id,label] of Object.entries(icons))select.add(new Option(label,id));
      const submit=button('Gruppe erstellen',null);submit.type='submit';form.append(input,select,submit);
      form.onsubmit=e=>{e.preventDefault();const name=input.value.trim();if(name)run(()=>create(name,select.value),()=>{input.value='';},submit);};
      const search=document.createElement('input');search.type='search';search.placeholder='Gruppen suchen';search.setAttribute('aria-label','Gruppen suchen');search.dataset.groupSearch='';search.oninput=render;
      const rows=document.createElement('div');rows.dataset.groupRows='';section.append(form,search,rows);
    }
    const rows=section.querySelector('[data-group-rows]');rows.replaceChildren();
    for(const [id,v] of Object.entries(invitations)){
      if(v.until<=olNow())continue;
      const card=item('section','');card.className='dm-invite';
      card.append(item('strong',v.name),item('small','Einladung von '+v.by));
      const accept=button('Annehmen',()=>run(()=>join(id,v),null,accept));
      const decline=button('Ablehnen',()=>run(()=>root().child(invite(OL.me,id)).remove(),null,decline));
      card.append(accept,decline);rows.append(card);
    }
    const term=section.querySelector('[data-group-search]').value.toLocaleLowerCase().trim();
    const entries=[...groups.values()].filter(g=>view(g)&&g.data.info.name.toLocaleLowerCase().includes(term));
    entries.sort((a,b)=>Number(!!chat().pref(chat().groupKey(b.id)).pinned)-Number(!!chat().pref(chat().groupKey(a.id)).pinned)||(b.summary?.latest?.created||b.data.info.created)-(a.summary?.latest?.created||a.data.info.created));
    for(const g of entries){
      const target=view(g),m=g.summary?.latest,latest=m&&!OL.BL[m.author]?m:null;
      const b=chat().row(g.data.info.name,latest?latest.name+' · '+latest.text:Object.keys(g.data.members).length+' Mitglieder',latest,target.key,unreadGroup(g),()=>chat().show(target,'groups'));
      b.querySelector('.dm-avatar').textContent=icons[g.data.info.icon]||icons.team; rows.append(b);
    }
    if(!rows.children.length){const empty=item('p',!identity?.ready?'Gruppen werden geladen …':term?'Keine passenden Gruppen.':'Hier erscheinen deine Gruppen und Einladungen.');empty.className='dm-empty';rows.append(empty);}
  }
  function create(name,icon){
    const uid=OL.me,id=root().child('groups').push().key,p=locationOf(id);
    return root().update({[p+'/info']:{name,icon,owner:uid,created:tick()},[p+'/members/00']:{uid,name:OL.name,role:'admin',since:tick()},[index(uid,id)]:'00'});
  }
  async function join(id,invitation){
    const uid=OL.me,name=OL.name;
    if(!OL.F[invitation.from] || !olAllowed(invitation.from))throw Error('Für den Beitritt muss die Freundschaft mit dem Einladenden noch bestehen.');
    const hint=invitation.slot;
    const slots=Array.from({length:30},(_,i)=>String(i).padStart(2,'0'));
    if(hint && slots.includes(hint)){slots.splice(slots.indexOf(hint),1);slots.unshift(hint);}
    for(const slot of slots){
      if(OL.me!==uid)throw Error('Bitte melde dich erneut an.');
      try{await root().update({[locationOf(id)+'/members/'+slot]:{uid,name,role:'member',since:tick()},[index(uid,id)]:slot,[invite(uid,id)]:null});return;}
      catch(e){if(!/permission.denied/i.test(e.code+' '+e.message))throw e;}
    }
    throw Error('Beitritt nicht möglich. Die Gruppe ist voll oder die Einladung ist abgelaufen.');
  }
  let managing=null;
  function manage(id){managing=id;chat().show(null,'groups');}
  function renderManage(g){
    const target=view(g), section=chat().groupList;
    const back=button('‹ Zum Gruppenchat',()=>{managing=null;chat().show(target,'groups');});
    const info=g.data.info, owner=info.owner===OL.me, admin=target.me.role==='admin';
    section.replaceChildren(back,item('h3',info.name+' · '+Object.keys(g.data.members).length+'/30'));
    const roster=document.createElement('ul');roster.className='dm-members';
    for(const [slot,m] of Object.entries(g.data.members)){
      const row=item('li','');row.append(item('strong',m.name),item('small',m.uid===info.owner?'Inhaber':m.role==='admin'?'Admin':'Mitglied'));
      if(admin&&m.uid!==OL.me&&m.uid!==info.owner){
        const memberRef=ref(g.id).child('members/'+slot);
        if(m.role==='member')row.append(button('Zum Admin machen',()=>run(()=>memberRef.child('role').set('admin'))));
        if(owner&&m.role==='admin'){
          row.append(button('Adminrechte entziehen',()=>run(()=>memberRef.child('role').set('member'))));
          row.append(button('Inhaberschaft übertragen',()=>{if(confirm('Inhaberschaft an '+m.name+' übertragen?'))run(()=>ref(g.id).child('info/owner').set(m.uid));}));
        }
        if(owner||m.role==='member')row.append(button('Entfernen',()=>{if(confirm(m.name+' entfernen?'))run(()=>remove(g.id,slot,m.uid));}));
      }
      roster.append(row);
    }
    section.append(roster);
    if(admin){
      const select=document.createElement('select');select.setAttribute('aria-label','Freund einladen');
      const joined=new Set(Object.values(g.data.members).map(m=>m.uid));
      for(const p of Object.keys(OL.F).filter(p=>olAllowed(p)&&!joined.has(p)))select.add(new Option(olNameOf(p),p));
      const firstFree=Array.from({length:30},(_,i)=>String(i).padStart(2,'0')).find(slot=>!g.data.members[slot]);
      if(select.options.length&&firstFree){
        const b=button('Einladen',()=>run(()=>root().child(invite(select.value,g.id)).set({from:OL.me,by:OL.name,name:info.name,slot:firstFree,until:olNow()+6*86400000}),()=>chat().status('Einladung gesendet.'),b));
        section.append(select,b);
      }
    }
    section.append(button(owner?'Gruppe schließen':'Gruppe verlassen',()=>{
      if(!confirm(owner?'Gruppe für alle schließen? Du kannst vorher die Inhaberschaft übertragen.':'Gruppe verlassen?'))return;
      managing=null;run(()=>owner?ref(g.id).child('info/closed').set(true):remove(g.id,g.slot,OL.me),render);
    }));
  }
  function remove(id,slot,uid){return root().update({[locationOf(id)+'/members/'+slot]:null,[index(uid,id)]:null});}
  window.groupChat={attach,stop:()=>{managing=null;stop();},render,manage,unread,refreshCounts};
})();
