// public/share-sw.js

const DB_NAME = 'MessWiseDB';
const DB_VERSION = 2; // <--- BUMPED VERSION

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force this SW to become active immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // Take control of all pages immediately
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const file = formData.get('file');

          if (file) {
            const db = await openDB();
            const tx = db.transaction('shares', 'readwrite');
            await tx.objectStore('shares').put(file, 'shared-file');
            return Response.redirect('/?share=true', 303);
          }
        } catch (err) {
          console.error('Share error:', err);
        }
        return Response.redirect('/', 303);
      })()
    );
  }
});

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      // Create store if it doesn't exist
      if (!db.objectStoreNames.contains('shares')) {
        db.createObjectStore('shares');
      }
    };
    
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}