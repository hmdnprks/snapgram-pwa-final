importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

var CACHE_STATIC_NAME = 'static-v2';
var CACHE_DYNAMIC_NAME = 'dynamic-v2';
var STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/js/app.js',
  '/src/js/utility.js',
  '/src/js/feed.js',
  '/src/js/idb.js',
  '/src/images/image-placeholder.png',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://cdn.jsdelivr.net/npm/daisyui@1.16.2/dist/full.css',
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2/dist/tailwind.min.css',
  'https://cdn.jsdelivr.net/npm/daisyui@1.16.2/dist/themes.css'
];

self.addEventListener('install', function (event) {
  console.log('[Service Worker] Installing Service Worker ...', event);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(function (cache) {
        console.log('[Service Worker] Precaching App Shell');
        cache.addAll(STATIC_FILES);
      })
  )
});

self.addEventListener('activate', function (event) {
  console.log('[Service Worker] Activating Service Worker ....', event);
  event.waitUntil(
    caches.keys()
      .then(function (keyList) {
        return Promise.all(keyList.map(function (key) {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log('[Service Worker] Removing old cache.', key);
            return caches.delete(key);
          }
        }));
      })
  );
  return self.clients.claim();
});

function isInArray(string, array) {
  var cachePath;
  if (string.indexOf(self.origin) === 0) {
    cachePath = string.substring(self.origin.length);
  } else {
    cachePath = string;
  }
  return array.indexOf(cachePath) > -1;
}

self.addEventListener('fetch', function (event) {

  var url = FIREBASE_URL_POSTS;
  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(fetch(event.request)
      .then(function (res) {
        var clonedRes = res.clone();
        clearAllData('posts')
          .then(function () {
            return clonedRes.json();
          })
          .then(function (data) {
            for (var key in data) {
              writeData('posts', data[key])
            }
          });
        return res;
      })
    );
  } else if (isInArray(event.request.url, STATIC_FILES)) {
    event.respondWith(
      caches.match(event.request)
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(function (response) {
          if (response) {
            return response;
          } else {
            return fetch(event.request)
              .then(function (res) {
                return caches.open(CACHE_DYNAMIC_NAME)
                  .then(function (cache) {
                    cache.put(event.request.url, res.clone());
                    return res;
                  })
              })
              .catch(function (err) {
                return caches.open(CACHE_STATIC_NAME)
                  .then(function (cache) {
                    if (event.request.headers.get('accept').includes('text/html')) {
                      return cache.match('/offline.html');
                    }
                  });
              });
          }
        })
    );
  }
});

self.addEventListener('sync', function(event){
  var url = 'FIREBASE_FUNCTION_URL';
  console.log('[Serice worker] Background syncing...', event);
  if(event.tag === 'snapgram-sync-posts') {
    console.log('[Service worker] Syncing new posts...');
    event.waitUntil(
      readAllData('sync-posts')
        .then(function(data){
          for(var dt of data){
            var postData = new FormData();
            postData.append('id', dt.id);
            postData.append('caption', dt.caption);
            postData.append('username', dt.username);
            postData.append('location', dt.location);
            postData.append('rawLocationLat', dt.rawLocation.lat);
            postData.append('rawLocationLng', dt.rawLocation.lng);
            postData.append('file', dt.picture, dt.id + '.png');
            console.log('postData :>> ', postData);
            fetch(url, {
              method: 'POST',
              body: postData
            }).then(function(res){
              console.log('Send data...', res);
              if(res.ok){
                res.json().then(function(resData){
                  console.log('resData :>> ', resData);
                  deleteItemFromData('sync-posts', resData.id)
                })
              }
            }).catch(function(err){
              console.log('Error ', err);
            })
          }

        })
    );
  }
})

self.addEventListener('notificationclick', function(event){
  var notification = event.notification;
  var action = event.action;

  console.log(notification);
  if(action === 'confirm'){
    console.log('confirm was chosen');
  } else {
    console.log(action);
    event.waitUntil(
      clients.matchAll().
        then(function(clis) {
          var client = clis.find(function(c) {
            return c.visibilityState === 'visible';
          });

          if(client) {
            client.navigate(notification.data.url);
            client.focus();
          } else {
            clients.openWindow(notification.data.url);
          }
        })
    )
  }
  notification.close();
})

self.addEventListener('notificationclose', function(event){
  console.log('Notification was closed', event);
})

self.addEventListener('push', function(event){
  console.log('Push notification received', event);

  var data = {title: 'New!', content: 'Something new happened', openUrl: '/'};
  if(event.data){
    data = JSON.parse(event.data.text());
  }

  var options = {
    body: data.content,
    icon: '/src/images/icons/icon-96x96.png',
    badge: '/src/images/icons/icon-96x96.png',
    data: {
      url: data.openUrl
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})