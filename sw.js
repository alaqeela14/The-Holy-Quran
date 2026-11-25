"use strict";
const CACHE_NAME="quran-reader-v1";
const CORE_ASSETS=["./","./index.html","./style.css","./data.js","./app.js","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 if(/^data-\d{2}\.js$/.test(url.pathname.split("/").pop()||"")){
  event.respondWith(caches.open(CACHE_NAME).then(async cache=>{
   const cached=await cache.match(request);
   if(cached)return cached;
   const response=await fetch(request);
   if(response.ok)await cache.put(request,response.clone());
   return response;
  }));
  return;
 }
 event.respondWith(fetch(request).then(response=>{
  if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));
  return response;
 }).catch(async()=> (await caches.match(request))|| (await caches.match("./index.html"))));
});