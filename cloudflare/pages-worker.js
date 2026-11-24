import {onRequest} from '../functions/api/push.js';

export default {
  fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/api/push') {
      return onRequest({request, env, waitUntil: promise => ctx.waitUntil(promise)});
    }
    return env.ASSETS.fetch(request);
  }
};
