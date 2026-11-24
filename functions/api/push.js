import { buildPushPayload } from '@block65/webcrypto-web-push';

const project = 'play2gether-c4e05';
const firebaseWebKey = 'AIzaSyAxc-cOxcn5cz18KVpnmby3znZgkTGQ8oc';
const database = 'https://play2gether-c4e05-default-rtdb.europe-west1.firebasedatabase.app';
const origin = 'https://medicomarco.github.io';
const pages = 'https://2-player-games.pages.dev';
const id = /^[A-Za-z0-9_-]{1,128}$/;
const encoder = new TextEncoder();
const b64 = value => btoa(String.fromCharCode(...value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const json64 = value => b64(encoder.encode(JSON.stringify(value)));
const tokenURL = 'https://oauth2.googleapis.com/token';
let access;

async function databaseToken(env) {
  if (access?.expires > Date.now()) return access.token;
  const account = JSON.parse(env.PLAY2GETHER_FIREBASE_SERVICE_ACCOUNT);
  if (account.project_id !== project) throw Error('Invalid Firebase project');
  const der = Uint8Array.from(atob(account.private_key.replace(/-----[^-]+-----|\s/g, '')), ch => ch.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, {name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'}, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const claims = json64({alg:'RS256',typ:'JWT'}) + '.' + json64({
    iss:account.client_email, aud:tokenURL, iat:now, exp:now+3600,
    scope:'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email'
  });
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(claims));
  const response = await fetch(tokenURL, {method:'POST',body:new URLSearchParams({
    grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:claims+'.'+b64(new Uint8Array(signature))
  })});
  if (!response.ok) throw Error('Firebase credentials rejected');
  const value = await response.json();
  access = {token:value.access_token, expires:Date.now()+(value.expires_in-60)*1000};
  return access.token;
}

function databaseClient(token) {
  return async (path, method='GET', value, headers={}) => {
    let response;
    for (let attempt=0;attempt<2;attempt++) try {
      response = await fetch(database+'/'+path+'.json', {
        method, headers:{Authorization:'Bearer '+token, ...headers,
          ...(value===undefined?{}:{'Content-Type':'application/json'})},
        body:value===undefined?undefined:JSON.stringify(value),redirect:'manual'
      });
      break;
    } catch (error) {
      if (attempt===0 && (method==='GET' || headers['If-Match'])) continue;
      console.error('Firebase transport',method,error.name);
      throw Object.assign(Error('Database network unavailable'), {code:'Database network '+method});
    }
    if (!response.ok && response.status!==412) {
      throw Object.assign(Error('Database request failed'), {
        code:['GET','PUT','DELETE'].includes(method)?'Database '+method:'Database access',
        upstream:response.status
      });
    }
    try {
      const body = await response.text();
      return {ok:response.ok,etag:response.headers.get('etag'),value:body?JSON.parse(body):null};
    } catch {
      throw Object.assign(Error('Database response unreadable'), {code:'Database response '+method});
    }
  };
}

async function authenticate(request) {
  const token = request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_.-]{1,5000})$/)?.[1];
  if (!token) return null;
  const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+firebaseWebKey,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token})
  });
  if (!response.ok) return null;
  const user = (await response.json()).users?.[0];
  return !user?.disabled && id.test(user?.localId || '') ? user.localId : null;
}

function subscriptionFrom(value) {
  try {
    const endpoint = new URL(value.endpoint);
    const {p256dh,auth} = value.keys;
    const hosts = /^(?:fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|(?:[a-z0-9-]+\.)*push\.apple\.com|(?:[a-z0-9-]+\.)+notify\.windows\.com)$/i;
    if (endpoint.protocol!=='https:' || endpoint.username || endpoint.password || endpoint.port || endpoint.hash ||
        !hosts.test(endpoint.hostname) || endpoint.href.length>2048 ||
        typeof p256dh!=='string' || !/^[A-Za-z0-9_-]{87}$/.test(p256dh) || !p256dh.startsWith('B') ||
        typeof auth!=='string' || !/^[A-Za-z0-9_-]{22}$/.test(auth)) return null;
    return {endpoint:endpoint.href, keys:{p256dh,auth},expirationTime:null};
  } catch { return null; }
}

const digest = async value => b64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));

async function notification(db, from, {kind,to,source,message,seat}) {
  if (!id.test(to||'') || to===from || !['invite','direct','group','room'].includes(kind)) return null;
  if (kind==='invite') {
    const invite = (await db('invites/'+to+'/'+from)).value;
    if (!invite || invite.mid!==message) return null;
    const room = invite.mid.startsWith('room:');
    const path = room?'rooms/'+invite.code:'matches/'+invite.mid;
    const match = (await db(path)).value;
    if (match?.host!==from || (room ? match.status!=='lobby' : match.state!=='invited'||match.guest!==to)) return null;
    const ttl = Math.floor((invite.ts-Date.now())/1000)+(room?300:60);
    return {ts:invite.ts,ttl,data:{kind,sender:from,id:invite.mid,ts:invite.ts}};
  }
  if (!id.test(message||'')) return null;
  if (kind==='direct') {
    const path = [from,to].sort().join('/');
    const [entry,friend,reverse] = await Promise.all([
      db('directMessages/'+path+'/'+message),db('friends/'+from+'/'+to),db('friends/'+to+'/'+from)
    ]);
    if (entry.value?.author!==from || friend.value!==true || reverse.value!==true) return null;
    return {ts:entry.value.created,ttl:3600,key:'dm_'+from,data:{kind,id:from}};
  }
  if (!id.test(source||'')) return null;
  if (kind==='group') {
    const [entry,group] = await Promise.all([db('groupMessages/'+source+'/'+message),db('groups/'+source)]);
    const members = Object.values(group.value?.members || {});
    if (entry.value?.author!==from || !group.value?.info || group.value.info.closed ||
        !members.some(m=>m.uid===from && m.since<entry.value.created) ||
        !members.some(m=>m.uid===to && m.since<entry.value.created)) return null;
    return {ts:entry.value.created,ttl:3600,key:'group_'+source,data:{kind,id:source}};
  }
  if (!/^[0-9]$/.test(seat||'')) return null;
  const {value:room} = await db('rooms/'+source);
  const entry = room?.chat?.[seat];
  if (room?.status!=='play' || room.seats?.[seat]?.uid!==from || entry?.uid!==from || entry.id!==message ||
      !Object.values(room.seats).some(p=>p.k==='p' && p.uid===to)) return null;
  return {ts:entry.ts,ttl:60,data:{kind,id:source}};
}

async function send(db, vapid, from, body) {
  const {to,kind} = body;
  const note = await notification(db,from,body);
  if (!note || note.ttl<=0 || !Number.isFinite(note.ts) || Date.now()-note.ts>120000) return;
  const [subscriptions,profile,lock,blocked,reverse,pref] = await Promise.all([
    db('pushSubscriptions/'+to), db('users/'+to+'/name'), db('deletionLocks/'+to),
    db('blocked/'+to+'/'+from), db('blocked/'+from+'/'+to),
    note.key?db('chatPreferences/'+to+'/'+note.key):null
  ]);
  if (!subscriptions.value || !profile.value || lock.value!==null || blocked.value!==null || reverse.value!==null ||
      pref?.value?.muted || pref?.value?.seen>=note.ts) return;
  const topic = (await digest(kind+':'+from+':'+(kind==='invite'?'':note.data.id))).slice(0,32);
  const marker = 'pushDispatch/'+to+'/'+topic;
  const previous = await db(marker,'GET',undefined,{'X-Firebase-ETag':'true'});
  if (previous.value?.ts>=note.ts || (kind==='invite' && Date.now()-previous.value?.sent<15000)) return;
  if (!(await db(marker,'PUT',{ts:note.ts,sent:Date.now()},{'If-Match':previous.etag})).ok) return;
  const devices = Object.entries(subscriptions.value).sort(([,a],[,b])=>b.updated-a.updated).slice(0,8);
  await Promise.allSettled(devices.map(async ([key, device])=>{
    const subscription = subscriptionFrom(device);
    if (!subscription) return;
    const payload = await buildPushPayload({data:JSON.stringify({...note.data,account:to}),options:{
      ttl:note.ttl,topic,urgency:kind==='invite'?'high':'normal'
    }},subscription,vapid);
    const response = await fetch(subscription.endpoint,{...payload,redirect:'error'});
    if (response.status===404 || response.status===410) await db('pushSubscriptions/'+to+'/'+key,'DELETE');
  }));
}

export async function onRequest({request,env,waitUntil}) {
  const fromOrigin = request.headers.get('Origin');
  const allowed = !fromOrigin || fromOrigin===origin || fromOrigin===pages || fromOrigin===new URL(request.url).origin;
  const headers = {'Cache-Control':'no-store','Content-Type':'application/json','Vary':'Origin',
    'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'};
  if (allowed && fromOrigin) headers['Access-Control-Allow-Origin']=fromOrigin;
  const reply = (value,status=200) => new Response(JSON.stringify(value),{headers,status});
  if (!allowed) return reply({error:'Origin'},403);
  if (request.method==='OPTIONS') return new Response(null,{headers,status:204});
  if (request.method!=='POST') return reply({error:'Method'},405);
  let stage = 'Request';
  try {
    const raw = await request.text();
    if (raw.length>4096) return reply({error:'Payload'},413);
    const body = JSON.parse(raw);
    stage = 'Authentication service';
    const uid = await authenticate(request);
    if (!uid) return reply({error:'Authentication'},401);
    const [publicKey,privateKey,subject] = String(env.PLAY2GETHER_PUSH_VAPID||'').split(',');
    if (!publicKey || !privateKey || !subject || !env.PLAY2GETHER_FIREBASE_SERVICE_ACCOUNT) return reply({error:'Push setup'},503);
    if (body.action==='key') return reply({key:publicKey});
    let token;
    try { token = await databaseToken(env); }
    catch { return reply({error:'Firebase setup'},503); }
    const db = databaseClient(token);
    if (body.action==='send') {
      waitUntil(send(db,{publicKey,privateKey,subject},uid,body).catch(()=>console.error('Push dispatch failed')));
      return reply({},202);
    }
    const sub = subscriptionFrom(body.subscription);
    if (!sub || !['add','remove'].includes(body.action)) return reply({error:'Subscription'},400);
    stage = 'Subscription storage';
    const key = await digest(sub.endpoint);
    const path = 'pushSubscriptions/'+uid;
    if (body.action==='remove') {
      await db(path+'/'+key,'DELETE');
    } else {
      const [user,lock] = await Promise.all([db('users/'+uid+'/name'),db('deletionLocks/'+uid)]);
      if (!user.value || lock.value!==null) return reply({error:'Account'},403);
      for(let attempt=0;attempt<3;attempt++){
        const current = await db(path,'GET',undefined,{'X-Firebase-ETag':'true'});
        const values = {...current.value,[key]:{...sub,updated:Date.now()}};
        const newest = Object.entries(values).sort(([,a],[,b])=>b.updated-a.updated).slice(0,8);
        if ((await db(path,'PUT',Object.fromEntries(newest),{'If-Match':current.etag ?? 'null_etag'})).ok) return reply({});
      }
      return reply({error:'Retry'},409);
    }
    return reply({});
  } catch (error) {
    const databaseError = error.code?.startsWith('Database ');
    const code = databaseError?error.code:stage;
    console.error('Push setup failed',code,error.upstream||'');
    return reply({error:code,...(databaseError&&error.upstream?{upstream:error.upstream}:{})},503);
  }
}
