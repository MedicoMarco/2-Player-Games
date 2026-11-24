'use strict';

const {createHash}=require('node:crypto');
const {defineSecret}=require('firebase-functions/params');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {onValueCreated,onValueDeleted,onValueWritten}=require('firebase-functions/v2/database');
const {getDatabase}=require('firebase-admin/database');
const webPush=require('web-push');

const vapid=defineSecret('PLAY2GETHER_PUSH_VAPID');
const region='europe-west1';
const trigger={region,instance:'play2gether-c4e05-default-rtdb',secrets:[vapid]};
const INVITE_TTL=300,CHAT_TTL=3600;
const slots=uid=>getDatabase().ref('pushSubscriptions/'+uid);
const digest=value=>createHash('sha256').update(value).digest('hex');
const allowedHosts=/^(?:fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|(?:[a-z0-9-]+\.)*push\.apple\.com|(?:[a-z0-9-]+\.)+notify\.windows\.com)$/i;

function validateSubscription(value){
  const endpoint=value?.endpoint,{p256dh,auth}=value?.keys||{};
  let url;
  if(typeof endpoint==='string'&&endpoint.length<=2048){
    try{url=new URL(endpoint)}catch{}
  }
  if(!url||url.protocol!=='https:'||url.port||url.username||url.password||url.hash||!allowedHosts.test(url.hostname)||
      typeof p256dh!=='string'||!/^[\w-]{87}$/.test(p256dh)||Buffer.from(p256dh,'base64url')[0]!==4||
      typeof auth!=='string'||!/^[\w-]{22}$/.test(auth)){
    throw new HttpsError('invalid-argument','Dieses Geräte-Abo ist ungültig oder der Push-Dienst wird nicht unterstützt.');
  }
  return {endpoint:url.href,keys:{p256dh,auth}};
}

exports.gamePushSubscription=onCall({region,secrets:[vapid]},async request=>{
  const uid=request.auth?.uid;
  if(!uid)throw new HttpsError('unauthenticated','Bitte anmelden.');
  const {action,subscription}=request.data||{};
  const ref=slots(uid);
  if(action==='remove'){
    const {endpoint}=validateSubscription(subscription);
    await ref.child(digest(endpoint)).remove();
    return {};
  }
  const root=getDatabase().ref();
  const [user,lock]=await Promise.all([root.child('users/'+uid).get(),root.child('deletionLocks/'+uid).get()]);
  if(!user.exists()||lock.exists())throw new HttpsError('failed-precondition','Das Konto ist nicht verfügbar.');
  if(action==='key')return {key:vapid.value().split(',')[0]};
  if(action!=='add')throw new HttpsError('invalid-argument','Unbekannte Einstellung.');
  const entry=validateSubscription(subscription),key=digest(entry.endpoint);
  await ref.transaction(values=>{
    values=values||{};
    values[key]={...entry,updated:Date.now()};
    const oldest=Object.entries(values).sort(([,a],[,b])=>a.updated-b.updated);
    for(const [id] of oldest.slice(0,Math.max(0,oldest.length-12)))delete values[id];
    return values;
  });
  return {};
});

exports.removeGamePushSubscriptions=onValueDeleted({region,instance:trigger.instance,ref:'/users/{uid}'},event=>slots(event.params.uid).remove());

async function notify(uid,author,data,ttl,preference){
  const ref=slots(uid);
  const subs=await ref.get();
  if(!subs.exists())return;
  const root=ref.root;
  const [profile,lock,blocked,reverse,pref]=await Promise.all([
    root.child('users/'+uid+'/name').get(),
    root.child('deletionLocks/'+uid).get(),
    root.child('blocked/'+uid+'/'+author).get(),
    root.child('blocked/'+author+'/'+uid).get(),
    preference?root.child('chatPreferences/'+uid+'/'+preference.key).get():null
  ]);
  if(!profile.exists()||lock.exists()||blocked.exists()||reverse.exists())return;
  if(pref&&(pref.child('muted').val()===true||Number(pref.child('seen').val())>=preference.ts))return;
  const [publicKey,privateKey,subject]=vapid.value().split(',');
  const payload=JSON.stringify({...data,account:uid});
  const topic=digest(data.kind+':'+(data.kind==='invite'?data.sender:data.id)).slice(0,32);
  await Promise.all(Object.entries(subs.val()).map(async ([id,sub])=>{
    try{
      await webPush.sendNotification({endpoint:sub.endpoint,keys:sub.keys},payload,{
        vapidDetails:{subject,publicKey,privateKey},TTL:ttl,topic,urgency:data.kind==='invite'?'high':'normal',timeout:10000
      });
    }catch(error){
      if(error.statusCode===404||error.statusCode===410){
        await ref.child(id).transaction(current=>current?.updated===sub.updated?null:undefined);
      }else console.warn('Web Push delivery failed',error.statusCode||error.code||'unknown');
    }
  }));
}

exports.pushGameInvitation=onValueWritten({...trigger,ref:'/invites/{to}/{from}'},async event=>{
  const {to,from}=event.params,invite=event.data.after.val();
  if(!invite?.mid||event.data.before.child('ts').val()===invite.ts)return;
  const current=await event.data.after.ref.get();
  if(current.child('ts').val()!==invite.ts)return;
  const room=invite.mid.startsWith('room:');
  const remaining=Math.floor(((room?INVITE_TTL:60)*1000+invite.ts-Date.now())/1000);
  if(remaining<=0)return;
  await notify(to,from,{kind:'invite',sender:from,id:invite.mid,ts:invite.ts},remaining);
});

exports.pushDirectMessage=onValueCreated({...trigger,ref:'/directMessages/{a}/{b}/{id}'},async event=>{
  const {a,b}=event.params,{author,created}=event.data.val();
  if(author!==a&&author!==b)return;
  const to=author===a?b:a,root=event.data.ref.root;
  const [friend,reverse,live]=await Promise.all([
    root.child('friends/'+to+'/'+author).get(),root.child('friends/'+author+'/'+to).get(),event.data.ref.get()
  ]);
  if(friend.val()!==true||reverse.val()!==true||!live.exists())return;
  await notify(to,author,{kind:'direct',id:author},CHAT_TTL,{key:'dm_'+author,ts:created});
});

exports.pushGroupMessage=onValueCreated({...trigger,ref:'/groupMessages/{id}/{message}'},async event=>{
  const {id}=event.params,{author,created}=event.data.val();
  const [group,live]=await Promise.all([event.data.ref.root.child('groups/'+id).get(),event.data.ref.get()]);
  const info=group.child('info').val();
  if(!info||info.closed||!live.exists())return;
  const members=Object.values(group.child('members').val()||{});
  await Promise.all(members.filter(member=>member.uid!==author&&member.since<created).map(member=>
    notify(member.uid,author,{kind:'group',id},CHAT_TTL,{key:'group_'+id,ts:created})
  ));
});

exports.pushRoomMessage=onValueWritten({...trigger,ref:'/rooms/{code}/chat/{seat}'},async event=>{
  const {code,seat}=event.params,message=event.data.after.val();
  if(!message||event.data.before.child('ts').val()===message.ts)return;
  const room=(await event.data.after.ref.root.child('rooms/'+code).get()).val();
  if(room?.status!=='play'||room.seats?.[seat]?.uid!==message.uid||room.chat?.[seat]?.ts!==message.ts)return;
  try{if(JSON.parse(room.snap)?.snap?.ph==='end')return}catch{}
  await Promise.all(Object.values(room.seats).filter(player=>player.k==='p'&&player.uid!==message.uid).map(player=>
    notify(player.uid,message.uid,{kind:'room',id:code},60)
  ));
});
