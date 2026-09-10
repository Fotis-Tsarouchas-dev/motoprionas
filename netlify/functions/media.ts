import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';
export default async function handler(req:Request,_context:Context){
  const pathname=decodeURIComponent(new URL(req.url).pathname);
  const key=pathname.replace(/^\/media\//,'');
  if(!key || key.includes('..') || !/(\/display\.|\/thumb\.)/.test(key)) return new Response('Not found',{status:404});
  const store=getStore('listing-media');
  const blob=await store.get(key,{type:'blob'});
  if(!blob)return new Response('Not found',{status:404});
  return new Response(blob.stream(),{headers:{'content-type':blob.type||'image/webp','cache-control':'public,max-age=31536000,immutable'}});
}
