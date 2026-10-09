/* The worker controls only /hongo-nutrition/ clients. Shared typography is cached for this app, without changing the academic website. */
'use strict';
const CACHE='hongo-nutrition-pwa-v3b-20261009';
const FILES=['./','./index.html','./app.js','./data.json','./manifest.webmanifest','./icon-192.png','./icon-512.png','/css/site-font.css'];
const URLS=FILES.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'})));await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('hongo-nutrition-pwa-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);url.hash='';url.search='';
 if(!URLS.includes(url.href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(url.href);
  if(cached)return cached;
  const response=await fetch(event.request);
  if(response.ok)await cache.put(url.href,response.clone());
  return response;
 })());
});
