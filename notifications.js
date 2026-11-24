(() => {
  const supported = 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window;
  const storageKey = '2pg-push-account';
  let registration, config, enabled = false, busy = false, preparing = false, status = '', pending = null, opening = false;
  const endpoint = 'https://2-player-games.pages.dev/api/push';
  const service = () => async body => {
    const user = OL.auth?.currentUser;
    if (!user) throw Error('Sign-in required');
    const response = await fetch(endpoint,{
      method:'POST',
      headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},
      body:JSON.stringify(body),signal:AbortSignal.timeout(12000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(Error('Push service unavailable'), {
      code:data.error || 'Connection', http:response.status, upstream:data.upstream
    });
    return {data};
  };

  async function dispatch(event, recipients) {
    const uid = OL.me;
    const unique = [...new Set(recipients)].filter(to=>to && to!==uid);
    for (let index=0;index<unique.length && OL.me===uid;index+=4) {
      await Promise.allSettled(unique.slice(index,index+4).map(to=>service()({action:'send',...event,to})));
    }
  }
  const owner = () => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  const remember = uid => {
    try {
      if (uid) localStorage.setItem(storageKey, uid);
      else localStorage.removeItem(storageKey);
    } catch {}
  };
  const register = () => registration ||= navigator.serviceWorker.register('./service-worker.js')
    .then(() => navigator.serviceWorker.ready)
    .catch(error => { registration = null; throw error; });
  if ('serviceWorker' in navigator) register().catch(() => {});

  function render() {
    const button = document.querySelector('[data-o=push]');
    if (!button) return;
    button.hidden = !supported;
    button.disabled = busy || preparing;
    button.textContent = enabled ? 'Benachrichtigungen ausschalten' : 'Benachrichtigungen einschalten';
    document.querySelector('#push-status').textContent = status || (!supported
      ? 'Systembenachrichtigungen sind hier nicht verfügbar. Auf iPhone und iPad öffne die Seite als Home-Bildschirm-App.'
      : '');
  }

  async function prepare() {
    const uid = OL.me;
    if (!uid || !supported || preparing || config?.uid === uid) return;
    preparing = true;
    render();
    try {
      const manager = (await register()).pushManager;
      const sub = await manager.getSubscription();
      if (uid !== OL.me) return;
      enabled = !!sub && Notification.permission === 'granted' && owner() === uid;
      if (enabled || Notification.permission === 'denied') return;
      const {data:{key}} = await service()({action:'key'});
      const bytes = Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')), char => char.charCodeAt(0));
      if (bytes.length !== 65) throw Error('invalid key');
      if (uid === OL.me) config = {uid, manager, sub, bytes};
    } catch (error) {
      if (uid === OL.me) status = setupError(error,'server');
    } finally {
      preparing = false;
      render();
      if (OL.me && OL.me !== uid) prepare();
    }
  }

  async function revoke() {
    if (!supported) return;
    const uid = OL.me;
    const reg = await register();
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const removal = owner() === uid ? service()({action:'remove', subscription:serialize(sub)}).catch(() => {}) : null;
      await sub.unsubscribe();
      await removal;
    }
    if (OL.me !== uid) return;
    remember(null);
    config = null;
    enabled = false;
    render();
    for (const notification of await reg.getNotifications()) {
      if (notification.data?.account === uid) notification.close();
    }
  }

  function logout() {
    return Promise.race([
      revoke().catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 1800))
    ]);
  }

  function serialize(sub) {
    const encode = key => btoa(String.fromCharCode(...new Uint8Array(sub.getKey(key))))
      .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    return {endpoint:sub.endpoint,keys:{p256dh:encode('p256dh'),auth:encode('auth')}};
  }

  function setupError(error, stage) {
    if (Notification.permission === 'denied') return 'Erlaube Mitteilungen in den iPad-Einstellungen.';
    if (error.code === 'Authentication') return 'Die Online-Anmeldung wurde nicht bestätigt. Melde dich bei Play2Gether neu an.';
    if (error.code === 'Firebase setup') return 'Cloudflare konnte sich nicht bei Firebase anmelden. Prüfe das Firebase-Secret.';
    if (error.code?.startsWith('Database ')) {
      return 'Firebase-Datenbankfehler ('+error.code+(error.upstream?', HTTP '+error.upstream:'')+').';
    }
    if (error.code === 'Authentication service') return 'Cloudflare konnte die Firebase-Anmeldung nicht prüfen.';
    if (error.code === 'Subscription storage') return 'Cloudflare konnte das Geräte-Abo nicht speichern (Subscription storage).';
    if (error.code === 'Push setup') return 'Die Push-Secrets fehlen oder sind ungültig. Prüfe das Cloudflare-Produktionsdeployment.';
    if (error.code === 'Subscription') return 'Der Push-Dienst konnte das Geräte-Abo nicht lesen.';
    if (stage === 'device') return 'Das Gerät konnte kein Push-Abo erstellen ('+(error.name||'Fehler')+'). Öffne Play2Gether über das Home-Bildschirm-Symbol.';
    return 'Die Anmeldung des Geräts beim Push-Dienst ist fehlgeschlagen'+(error.http?' (HTTP '+error.http+')':'')+'.';
  }

  async function toggle() {
    const uid = OL.me;
    if (!supported || !uid || busy || preparing) return;
    busy = true;
    let stage = 'device';
    status = '';
    render();
    try {
      if (enabled) {
        await revoke();
        status = 'Systembenachrichtigungen auf diesem Gerät sind aus.';
        prepare();
        return;
      }
      if (Notification.permission === 'denied') {
        status = 'Erlaube Benachrichtigungen in den Website-Einstellungen.';
        return;
      }
      if (config?.uid !== uid) {
        await prepare();
        if (config?.uid === uid) status = 'Tippe erneut, um die Geräteberechtigung zu erteilen.';
        return;
      }
      const {manager, bytes} = config;
      let {sub} = config;
      const previousKey = sub?.options?.applicationServerKey;
      if (previousKey && new Uint8Array(previousKey).join() !== bytes.join()) {
        await sub.unsubscribe();
        config.sub = null;
        status = 'Tippe erneut, um Benachrichtigungen einzuschalten.';
        return;
      }
      // Invoke subscribe within the click. WebKit requires a user gesture.
      sub ||= await manager.subscribe({userVisibleOnly:true, applicationServerKey:bytes});
      if (OL.auth.currentUser?.uid !== uid) {
        await sub.unsubscribe();
        return;
      }
      config.sub = sub;
      const subscription = serialize(sub);
      stage = 'server';
      await service()({action:'add', subscription});
      if (OL.auth.currentUser?.uid !== uid) { await sub.unsubscribe(); return; }
      remember(uid);
      enabled = true;
      status = 'Systembenachrichtigungen auf diesem Gerät sind an.';
    } catch (error) {
      status = setupError(error,stage);
    } finally {
      busy = false;
      render();
    }
  }

  async function openPending() {
    if (!pending || !OL.me || !OL.blocksReady || opening) return;
    const target = pending;
    pending = null;
    if (target.account !== OL.me) {
      toast('Diese Benachrichtigung gehört zu einem anderen Konto.');
      return;
    }
    opening = true;
    try {
      if (target.kind === 'invite') {
        const invite = (await OL.db.ref('invites/'+OL.me+'/'+target.sender).once('value')).val();
        if (OL.me !== target.account) return;
        if (!olAllowed(target.sender) || invite?.mid !== target.id || invite.ts !== Number(target.ts) || !olInviteValid(invite)) {
          toast('Diese Einladung ist nicht mehr verfügbar.');
          return;
        }
        const room = olIsRoom(invite);
        if ((room && LUN.code === invite.code) || OL.sess?.mid === invite.mid) return;
        const available = await OL.db.ref(room ? 'rooms/'+invite.code+'/game' : 'matches/'+invite.mid+'/state').once('value');
        if (OL.me !== target.account) return;
        if (!olInviteValid(invite) || available.val() !== (room ? invite.game : 'invited')) {
          toast('Diese Einladung ist nicht mehr verfügbar.');
          return;
        }
        window.directChat?.close();
        olClose();
        if (OL.out) olCancelOut();
        if (OL.sess) olLeave();
        if (LUN.ref) toMenu();
        OL.INV[target.sender] = invite;
        await olAccept(target.sender);
      } else if (target.kind === 'direct') {
        const friend = await OL.db.ref('friends/'+OL.me+'/'+target.id).once('value');
        if (OL.me !== target.account) return;
        if (friend.val() === true && olAllowed(target.id)) {
          OL.F[target.id] = true;
          olClose();
          window.directChat.open(target.id, true);
        } else toast('Dieser Chat ist nicht mehr verfügbar.');
      } else if (target.kind === 'group') {
        olClose();
        await window.groupChat.open(target.id, true);
      } else if (!window.gameChat.openNotification(target)) {
        toast('Der Spielchat ist nur in der laufenden Partie verfügbar.');
      }
    } catch {
      toast('Die Benachrichtigung konnte nicht geöffnet werden.');
    } finally {
      opening = false;
      if (pending) openPending();
    }
  }

  async function open(target) {
    const key = /^[A-Za-z0-9_-]{1,128}$/;
    if (!target || !key.test(target.account || '') ||
      !['invite','direct','group','room','peer'].includes(target.kind) ||
      (target.kind === 'invite' ? !key.test(target.sender || '') : !key.test(target.id || ''))) return;
    pending = target;
    if (OL.me) {
      await openPending();
    } else {
      await olInit();
      if (!OL.auth?.currentUser && pending === target) olOpen();
    }
  }

  const params = new URLSearchParams(location.search);
  if (params.has('push')) {
    const target = {kind:params.get('push')};
    for (const key of ['account','id','sender','ts']) {
      target[key] = params.get(key);
      params.delete(key);
    }
    params.delete('push');
    history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);
    open(target);
  }
  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type !== 'open-notification') return;
    event.ports[0]?.postMessage(true);
    open(event.data.target);
  });

  async function peer(id, author, text) {
    const uid = OL.me;
    if (!enabled || !uid || Notification.permission !== 'granted' || !document.hidden) return;
    try {
      const reg = await register();
      if (uid !== OL.me || !enabled) return;
      const chars = Array.from(text.replace(/\s+/g,' ').trim());
      const preview = chars.length>140?chars.slice(0,139).join('')+'…':chars.join('');
      await reg.showNotification(author ? author+' · Spielchat' : 'Neue Nachricht im Spielchat', {
        body:preview,
        actions:Notification.maxActions > 0 ? [{action:'reply',title:'Antworten'}] : [],
        icon:'./icons/icon-192.png',
        tag:uid+':peer:'+id,
        data:{kind:'peer', account:uid, id}
      });
    } catch {}
  }

  window.gameNotifications = {
    render, toggle, logout, peer, dispatch,
    signedIn() { prepare(); openPending(); },
    signedOut() { config = null; enabled = false; status = ''; render(); }
  };
})();
