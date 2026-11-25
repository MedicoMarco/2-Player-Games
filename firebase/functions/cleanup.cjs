'use strict';
// Operates only on the data paths used by index.html. No other profiles are removed.
function cleanup(data,uid){
  for(const [id,row] of Object.entries(data.onlineDirectory||{}))if(row?.uid===uid)delete data.onlineDirectory[id];
  for(const path of ['users','presence','friends','requests','invites','blocked','pushSubscriptions','pushDispatch']){
    if(data[path])delete data[path][uid];
  }
  for(const path of ['friends','requests','invites','blocked']){
    for(const entries of Object.values(data[path]||{}))if(entries&&typeof entries==='object')delete entries[uid];
  }
  const direct=data.chatReceipts?.direct||{};
  delete direct[uid];
  for(const receipts of Object.values(direct))delete receipts[uid];
  for(const receipts of Object.values(data.chatReceipts?.group||{}))delete receipts[uid];
  for(const [name,id] of Object.entries(data.names||{}))if(id===uid)delete data.names[name];
  for(const [id,m] of Object.entries(data.matches||{}))if(m.host===uid||m.guest===uid)delete data.matches[id];
  const removedRooms=new Set();
  for(const [id,r] of Object.entries(data.rooms||{})){
    if(r.host===uid||Object.values(r.seats||{}).some(s=>s&&s.uid===uid)||(r.act&&Object.hasOwn(r.act,uid))){delete data.rooms[id];removedRooms.add(id)}
  }
  // Whole rooms are closed because serialized game snapshots also contain names.
  for(const entries of Object.values(data.invites||{})){
    for(const [sender,v] of Object.entries(entries||{}))if(v&&removedRooms.has(String(v.mid).replace(/^room:/,'')))delete entries[sender];
  }
  return data;
}
module.exports={cleanup};
