const UPSTREAMS = [
  'https://api-enhanced-ochre-kappa.vercel.app'
];

const REAL_IP = '116.25.146.177';

const ACTION_REWRITE = {
  'search': '/cloudsearch',
  'song/url': '/song/url/v1',
  'song/detail': '/song/detail',
  'lyric': '/lyric',
  'login/status': '/login/status',
  'login/qr/key': '/login/qr/key',
  'login/qr/create': '/login/qr/create',
  'login/qr/check': '/login/qr/check',
  'logout': '/logout',
  'user/playlist': '/user/playlist',
  'playlist/track/all': '/playlist/track/all',
  'likelist': '/likelist',
  'like': '/like',
  'recommend/songs': '/recommend/songs',
  'personal_fm': '/personal_fm',
  'daily_signin': '/daily_signin'
};

const ALLOWED_ACTIONS = new Set(Object.keys(ACTION_REWRITE));

function corsHeaders(request){
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Netease-Cookie',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(request, body, init){
  return new Response(JSON.stringify(body || {}), {
    status: init && init.status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request)
    }
  });
}

function actionFromRequest(request){
  const url = new URL(request.url);
  return decodeURIComponent(url.pathname.replace(/^\/netease\/?/, '')).replace(/^\/+|\/+$/g, '');
}

function appendBodyParams(params, body){
  Object.entries(body || {}).forEach(([key, value]) => {
    if(value === undefined || value === null) return;
    if(Array.isArray(value)) params.set(key, value.join(','));
    else params.set(key, String(value));
  });
}

function buildUpstreamPath(action, body, cookie){
  if(!ALLOWED_ACTIONS.has(action)) return '';
  const params = new URLSearchParams();
  const cleanCookie = String(cookie || '').trim();
  if(cleanCookie) params.set('cookie', cleanCookie);
  params.set('realIP', REAL_IP);
  params.set('timestamp', String(Date.now()));

  if(action === 'search'){
    params.set('keywords', String(body.keyword || body.keywords || '').trim());
    params.set('type', String(body.type || 1));
    params.set('limit', String(body.limit || 30));
    params.set('offset', String(body.offset || 0));
  }else if(action === 'song/url'){
    const ids = Array.isArray(body.ids) ? body.ids : (body.id != null ? [body.id] : []);
    if(ids.length) params.set('id', ids.join(','));
    params.set('level', String(body.level || 'exhigh'));
  }else if(action === 'song/detail'){
    const ids = Array.isArray(body.ids) ? body.ids : (body.id != null ? [body.id] : []);
    if(ids.length) params.set('ids', ids.join(','));
  }else if(action === 'user/playlist'){
    if(body.uid != null) params.set('uid', String(body.uid));
    params.set('limit', String(body.limit || 60));
    params.set('offset', String(body.offset || 0));
  }else if(action === 'playlist/track/all'){
    if(body.id != null) params.set('id', String(body.id));
    params.set('limit', String(body.limit || 100));
    params.set('offset', String(body.offset || 0));
  }else{
    appendBodyParams(params, body);
  }

  return ACTION_REWRITE[action] + '?' + params.toString();
}

function shuffled(list){
  const arr = list.slice();
  for(let i = arr.length - 1; i > 0; i -= 1){
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

async function fetchFirstOk(path){
  const errors = [];
  for(const base of shuffled(UPSTREAMS)){
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try{
      const res = await fetch(base.replace(/\/+$/, '') + path, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);
      const text = await res.text();
      if(!res.ok){
        errors.push(`${new URL(base).host} ${res.status}`);
        continue;
      }
      try{
        const parsed = JSON.parse(text);
        if(parsed && (parsed.code === -460 || parsed.code === -7)){
          errors.push(`${new URL(base).host} limited`);
          continue;
        }
      }catch(err){}
      return { text, status: res.status, host: new URL(base).host };
    }catch(err){
      clearTimeout(timer);
      errors.push(`${new URL(base).host} ${err && err.name === 'AbortError' ? 'timeout' : err.message}`);
    }
  }
  return { text: JSON.stringify({ error: 'music upstream failed', detail: errors.join(' | ') }), status: 502, host: '' };
}

export async function onRequest(context){
  const { request } = context;
  if(request.method === 'OPTIONS'){
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if(request.method !== 'POST' && request.method !== 'GET'){
    return jsonResponse(request, { error: 'method not allowed' }, { status: 405 });
  }
  const action = actionFromRequest(request);
  let body = {};
  if(request.method === 'POST'){
    body = await request.json().catch(() => ({}));
  }else{
    body = Object.fromEntries(new URL(request.url).searchParams.entries());
  }
  const upstreamPath = buildUpstreamPath(action, body, request.headers.get('X-Netease-Cookie') || '');
  if(!upstreamPath){
    return jsonResponse(request, { error: 'unknown music action' }, { status: 404 });
  }
  const result = await fetchFirstOk(upstreamPath);
  return new Response(result.text, {
    status: result.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Music-Upstream': result.host,
      ...corsHeaders(request)
    }
  });
}
