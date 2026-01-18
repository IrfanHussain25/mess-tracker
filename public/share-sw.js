// public/share-sw.js

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const file = formData.get('file');

          if (file) {
            console.log("SW: File received in Share Target");
            const db = await openDB();
            const tx = db.transaction('shares', 'readwrite');
            await tx.objectStore('shares').put(file, 'shared-file');
            console.log("SW: File saved to DB");
            
            return Response.redirect('/?share=true', 303);
          }
        } catch (err) {
          console.error('SW: Share failed', err);
        }
        return Response.redirect('/', 303);
      })()
    );
  }
});

function openDB() {
  return new Promise((resolve, reject) => {
    // CHANGE THIS FROM 1 TO 2
    const request = indexedDB.open('MessWiseDB', 2); 

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      // Create the store if it doesn't exist
      if (!db.objectStoreNames.contains('shares')) {
        db.createObjectStore('shares');
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}