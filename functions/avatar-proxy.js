function corsHeaders(request){
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function errorResponse(request, message, status){
  return new Response(message || 'avatar proxy error', {
    status: status || 400,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...corsHeaders(request)
    }
  });
}

function safeAvatarUrl(raw){
  try{
    const url = new URL(String(raw || '').trim());
    if(url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url;
  }catch(err){
    return null;
  }
}

export async function onRequest(context){
  const { request } = context;
  if(request.method === 'OPTIONS'){
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if(request.method !== 'GET' && request.method !== 'HEAD'){
    return errorResponse(request, 'method not allowed', 405);
  }
  const url = new URL(request.url);
  const target = safeAvatarUrl(url.searchParams.get('u') || url.searchParams.get('url') || '');
  if(!target) return errorResponse(request, 'bad avatar url', 400);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try{
    const upstream = await fetch(target.toString(), {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: {
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      signal: controller.signal,
      cf: { cacheTtl: 86400, cacheEverything: true }
    });
    clearTimeout(timer);
    if(!upstream.ok) return errorResponse(request, 'avatar upstream failed', upstream.status || 502);
    const contentType = upstream.headers.get('Content-Type') || 'image/jpeg';
    if(!/^image\//i.test(contentType)) return errorResponse(request, 'avatar is not image', 415);
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders(request)
    };
    const length = upstream.headers.get('Content-Length');
    if(length) headers['Content-Length'] = length;
    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: 200,
      headers
    });
  }catch(err){
    clearTimeout(timer);
    return errorResponse(request, err && err.name === 'AbortError' ? 'avatar proxy timeout' : 'avatar proxy failed', 502);
  }
}
