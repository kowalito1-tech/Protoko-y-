const C='hv-v16';
const CORE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const CDN=[
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];
self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(C).then(c=>c.addAll(CORE).then(()=>
      // biblioteki PDF wstępnie do cache (bez zerwania instalacji, gdy brak sieci)
      Promise.allSettled(CDN.map(u=>fetch(u,{mode:'no-cors'}).then(r=>c.put(u,r))))
    )).then(()=>self.skipWaiting())
  );
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin===location.origin){
    // sieć najpierw; do cache trafiają tylko poprawne odpowiedzi 200
    e.respondWith(
      fetch(e.request,{cache:'no-cache'}).then(r=>{
        if(r.ok&&r.status===200){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}
        return r;
      }).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('./index.html')))
    );
  }else if(u.hostname==='cdnjs.cloudflare.com'){
    // biblioteki z CDN: cache najpierw
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      if(res.ok||res.type==='opaque'){const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp))}
      return res;
    })));
  }
  // pozostałe żądania zewnętrzne (np. Nominatim) idą bezpośrednio do sieci, bez cache
});
