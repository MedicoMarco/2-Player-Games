'use strict';

const TIMEOUTS = Object.freeze({presence: 600_000, invites: 300_000, matches: 900_000, rooms: 900_000});
const key = /^[\w-]{1,128}$/;

function collect(index, now) {
  const result = [];
  function add(type, ids, ts) {
    if (!ids.every(id => key.test(id)) || !Number.isSafeInteger(ts)) return;
    if (ts <= 0 || ts > now - TIMEOUTS[type]) return;
    const suffix = ids.join('/');
    const marker = 'expiry/' + type + '/' + suffix;
    const row = type === 'presence' ? 'presence/' + ids[0] + '/tabs/' + ids[1] : type + '/' + suffix;
    const deletions = {[marker]: null, [row]: null};
    if (type === 'rooms') deletions['hands/' + suffix] = null;
    result.push({type, marker, deletions, ts});
  }
  for (const type of ['rooms', 'matches']) {
    for (const [id, ts] of Object.entries(index?.[type] || {})) add(type, [id], ts);
  }
  for (const type of ['presence', 'invites']) {
    for (const [uid, entries] of Object.entries(index?.[type] || {})) {
      for (const [id, ts] of Object.entries(entries || {})) add(type, [uid, id], ts);
    }
  }
  return result.sort((a, b) => a.ts - b.ts);
}

async function sweep(request, now = Date.now()) {
  const index = await request('expiry');
  const results = {removed: 0, refreshed: 0, refused: 0};
  for (const {marker, deletions, ts} of collect(index, now).slice(0, 500)) {
    const write = await request('', deletions);
    if (write) {
      results.removed++;
      continue;
    }
    const current = await request(marker);
    // Security Rules recheck the age in the same commit that removes the data.
    // A concurrent heartbeat or a previous worker may have changed the row.
    if (current == null || current > ts) results.refreshed++;
    else results.refused++;
  }
  return results;
}

async function responseJson(response) {
  try {return await response.json()}
  catch {throw new Error('Ungültige Firebase-Antwort.')}
}

function requestFactory(base, token) {
  return async (where, changes) => {
    const url = new URL('/' + where + '.json', base);
    url.searchParams.set('auth', token);
    const response = await fetch(url, {
      method: changes ? 'PATCH' : 'GET',
      headers: changes ? {'Content-Type': 'application/json'} : {},
      body: changes ? JSON.stringify(changes) : undefined,
      signal: AbortSignal.timeout(8000)
    });
    if (changes && (response.status === 401 || response.status === 403)) return false;
    if (!response.ok) throw new Error('Datenbank-Anfrage fehlgeschlagen (HTTP ' + response.status + ').');
    return changes ? true : responseJson(response);
  };
}

async function main(env) {
  const {FIREBASE_DATABASE_URL, FIREBASE_WEB_API_KEY, CLEANUP_EMAIL, CLEANUP_PASSWORD} = env;
  if (!FIREBASE_DATABASE_URL || !FIREBASE_WEB_API_KEY || !CLEANUP_EMAIL || !CLEANUP_PASSWORD) {
    throw new Error('Firebase-Variablen oder Zugangsdaten des Bereinigungskontos fehlen.');
  }
  const base = new URL(FIREBASE_DATABASE_URL);
  if (base.protocol !== 'https:' || base.username || base.password || base.port || base.pathname !== '/' ||
      base.search || base.hash || !/\.(firebasedatabase\.app|firebaseio\.com)$/.test(base.hostname)) {
    throw new Error('Ungültige Firebase-Realtime-Database-URL.');
  }
  const endpoint = new URL('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword');
  endpoint.searchParams.set('key', FIREBASE_WEB_API_KEY);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: CLEANUP_EMAIL, password: CLEANUP_PASSWORD, returnSecureToken: true}),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('Anmeldung des Bereinigungskontos fehlgeschlagen (HTTP ' + response.status + ').');
  const {idToken} = await responseJson(response);
  if (!idToken) throw new Error('Firebase hat kein Zugriffstoken ausgestellt.');
  const result = await sweep(requestFactory(base, idToken));
  console.log('Bereinigt ' + result.removed + ', inzwischen geändert ' + result.refreshed + ', verweigert ' + result.refused + '.');
  if (result.refused) throw new Error('Firebase hat Bereinigungen abgelehnt. Bitte Regeln und Zeitstempel prüfen.');
}

if (require.main === module) main(process.env).catch(error => {
  // URLs, Zugangsdaten, Nutzer- und Raumschlüssel bleiben aus den Logs.
  console.error(error instanceof TypeError ? 'Netzwerk- oder Konfigurationsfehler.' : error.message);
  process.exitCode = 1;
});

module.exports = {sweep};
