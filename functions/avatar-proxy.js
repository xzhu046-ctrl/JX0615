const IMAGE_ACCEPT = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';

function corsHeaders(request){
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function textResponse(request, text, status){
  return new Response(text, {
    status: status || 400,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...corsHeaders(request)
    }
  });
}

function targetFromRequest(request){
  const url = new URL(request.url);
  const raw = String(url.searchParams.get('u') || url.searchParams.get('url') || '').trim();
  if(!raw) return null;
  let target;
  try{
    target = new URL(raw);
  }catch(err){
    return null;
  }
  if(target.protocol !== 'https:' && target.protocol !== 'http:') return null;
  return target;
}

export async function onRequestOptions(context){
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestGet(context){
  const request = context.request;
  const target = targetFromRequest(request);
  if(!target) return textResponse(request, 'Invalid avatar url', 400);

  const upstream = await fetch(target.toString(), {
    headers: {
      'Accept': IMAGE_ACCEPT
    },
    cf: {
      cacheEverything: true,
      cacheTtl: 86400
    }
  }).catch(() => null);

  if(!upstream || !upstream.ok) return textResponse(request, 'Avatar fetch failed', upstream ? upstream.status : 502);
  const type = String(upstream.headers.get('Content-Type') || '').toLowerCase();
  if(type && type.indexOf('image/') !== 0) return textResponse(request, 'Not an image', 415);

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'image/jpeg');
  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  headers.set('X-Content-Type-Options', 'nosniff');
  const etag = upstream.headers.get('ETag');
  if(etag) headers.set('ETag', etag);
  const lastModified = upstream.headers.get('Last-Modified');
  if(lastModified) headers.set('Last-Modified', lastModified);
  Object.entries(corsHeaders(request)).forEach(([key, value]) => headers.set(key, value));
  return new Response(upstream.body, {
    status: 200,
    headers
  });
}
