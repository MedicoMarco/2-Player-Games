'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getDatabase}=require('firebase-admin/database');
const {cleanup}=require('./cleanup.cjs');
initializeApp({databaseURL:'https://play2gether-c4e05-default-rtdb.europe-west1.firebasedatabase.app'});
const options={region:'europe-west1',timeoutSeconds:120,memory:'256MiB'};
exports.deleteOwnAccount=onCall(options,async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Bitte anmelden.');
  const uid=request.auth.uid;
  if(Date.now()/1000-Number(request.auth.token.auth_time||0)>300)throw new HttpsError('failed-precondition','Bitte das aktuelle Passwort erneut bestätigen.');
  const db=getDatabase(),auth=getAuth();
  // The UID comes exclusively from the verified token, never from request.data.
  // Temporary lock prevents other sessions and other players recreating deleted data.
  await db.ref('deletionLocks/'+uid).set(Date.now()+2*60*60*1000);
  try{
    await db.ref().transaction(data=>cleanup(data||{},uid));
    try{await auth.deleteUser(uid)}catch(e){if(e.code!=='auth/user-not-found')throw e}
    return {deleted:true};
  }catch(e){
    // Keep lock so a retry cannot resurrect data. Scheduled job completes cleanup.
    console.error('Account cleanup failed:',e.code||'unknown');
    throw new HttpsError('internal','Löschung noch nicht abgeschlossen. Bitte erneut versuchen.');
  }
});
exports.finishAccountDeletion=onSchedule({...options,schedule:'every 60 minutes'},async()=>{
  const db=getDatabase(),auth=getAuth();
  const locks=(await db.ref('deletionLocks').get()).val()||{};
  for(const [uid,expiry] of Object.entries(locks)){
    if(expiry>Date.now())continue;
    // Retry failed auth deletion before removing the temporary lock.
    let existed=false;
    try{await auth.getUser(uid);existed=true}catch(e){if(e.code!=='auth/user-not-found')throw e}
    if(existed){
      await auth.deleteUser(uid);
      // Tokens issued during a failed deletion must expire before lifting the lock.
      await db.ref('deletionLocks/'+uid).set(Date.now()+2*60*60*1000);
      continue;
    }
    await db.ref().transaction(data=>{
      if(!data)return data;
      cleanup(data,uid);
      if(data.deletionLocks)delete data.deletionLocks[uid];
      return data;
    });
  }
});
