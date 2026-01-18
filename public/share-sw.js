// This Service Worker handles the "Share" action from Android
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // If the browser sends a POST request to /share-target
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const file = formData.get('file');

          if (file) {
            // Save file to IndexedDB so the main page can read it
            const db = await openDB();
            const tx = db.transaction('shares', 'readwrite');
            await tx.objectStore('shares').put(file, 'shared-file');
            
            // Redirect to home with a flag
            return Response.redirect('/?share=true', 303);
          }
        } catch (err) {
          console.error('Share handling failed:', err);
        }
        return Response.redirect('/', 303);
      })()
    );
  }
});

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MessWiseDB', 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('shares');
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}