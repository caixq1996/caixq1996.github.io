/* Controls only the Hongo calculator. The academic site remains outside this worker's scope. */
'use strict';
const CACHE='hongo-nutrition-pwa-v4-20261009';
const IMAGES='hongo-nutrition-images-v4';
const FILES=['./','./index.html','./app.js','./data.json','./upgrade.js','./photos.json','./manifest.webmanifest','./icon-192.png','./icon-512.png','/css/site-font.css'];
const URLS=FILES.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'})));await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('hongo-nutrition-pwa-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();for(const client of await self.clients.matchAll())client.postMessage({type:'HONGO_APP_UPDATED',version:'4.0'})})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const u=new URL(event.request.url),clean=new URL(u);clean.hash='';clean.search='';
 if(URLS.includes(clean.href)){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(clean.href);if(cached)return cached;const response=await fetch(event.request);if(response.ok)await cache.put(clean.href,response.clone());return response})());return;
 }
 const image=u.origin==='https://comenu.jp'&&u.pathname==='/_next/image'&&/^https:\/\/chuboz\.jp\/(items|coop_items)\/images\//.test(u.searchParams.get('url')||'');
 if(image&&event.request.destination==='image')event.respondWith((async()=>{const cache=await caches.open(IMAGES),cached=await cache.match(event.request);if(cached)return cached;try{const response=await fetch(event.request);if(response.ok||response.type==='opaque'){await cache.put(event.request,response.clone());const keys=await cache.keys();if(keys.length>96)await cache.delete(keys[0])}return response}catch(e){return Response.error()}})());
});
