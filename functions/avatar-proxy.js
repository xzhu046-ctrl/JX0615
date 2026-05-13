const AVATAR_CACHE_SECONDS = 60 * 60 * 24 * 7;

function corsHeaders(request){
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function isPrivateHost(hostname){
  const host = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if(!host) return true;
  if(host === 'localhost' || host === '::1') return true;
  if(/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  if(match){
    const second = Number(match[1]);
    if(second >= 16 && second <= 31) return true;
  }
  return false;
}

function readTargetUrl(request){
  const url = new URL(request.url);
  const raw = String(url.searchParams.get('u') || url.searchParams.get('url') || '').trim();
  if(!raw) return null;
  let target = null;
  try{
    target = new URL(raw);
  }catch(err){
    return null;
  }
  if(target.protocol !== 'https:' && target.protocol !== 'http:') return null;
  if(isPrivateHost(target.hostname)) return null;
  return target;
}

function errorResponse(request, message, status){
  return new Response(message, {
    status: status || 400,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...corsHeaders(request)
    }
  });
}

export async function onRequest(context){
  const { request } = context;
  if(request.method === 'OPTIONS'){
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if(request.method !== 'GET' && request.method !== 'HEAD'){
    return errorResponse(request, 'method not allowed', 405);
  }

  const target = readTargetUrl(request);
  if(!target) return errorResponse(request, 'bad avatar url', 400);

  const cacheKey = new Request('https://avatar-proxy.local/' + encodeURIComponent(target.href), { method: 'GET' });
  const cache = caches.default;
  if(request.method === 'GET'){
    const cached = await cache.match(cacheKey);
    if(cached) return cached;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let upstream;
  try{
    upstream = await fetch(target.href, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
  }catch(err){
    clearTimeout(timer);
    return errorResponse(request, 'avatar upstream failed', 502);
  }
  clearTimeout(timer);

  if(!upstream || !upstream.ok){
    return errorResponse(request, 'avatar upstream ' + (upstream ? upstream.status : 'failed'), upstream ? upstream.status : 502);
  }

  const headers = new Headers();
  const type = upstream.headers.get('Content-Type') || 'image/jpeg';
  headers.set('Content-Type', type);
  headers.set('Cache-Control', 'public, max-age=' + AVATAR_CACHE_SECONDS + ', s-maxage=' + AVATAR_CACHE_SECONDS + ', immutable');
  headers.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('X-Avatar-Proxy', '1');
  const etag = upstream.headers.get('ETag');
  const lastModified = upstream.headers.get('Last-Modified');
  if(etag) headers.set('ETag', etag);
  if(lastModified) headers.set('Last-Modified', lastModified);

  const response = new Response(request.method === 'HEAD' ? null : upstream.body, {
    status: 200,
    headers
  });
  if(request.method === 'GET'){
    context.waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
  }
  return response;
}
