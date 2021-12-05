var deferredPrompt;
var enableNotificationButtons = document.querySelectorAll('.enable-notification-buttons');


if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(function () {
      console.log('Service worker registered!');
    })
    .catch(function(err) {
      console.log(err);
    });
}

window.addEventListener('beforeinstallprompt', function(event){
  console.log('berforeinstallpromprt fired');
  event.preventDefault();
  deferredPrompt = event;
  return false;
});

function askForNotificationPermission(){
  Notification.requestPermission(function(result){
    console.log('User choice', result);
    if(result !== 'granted'){
      console.log('No notification permission granted');
    } else {
      displayingButtonNotifications(false);
      configurePushSub();
    }
  });
}

function displayConfirmNotification(){
  var title = 'Sucessfully subscribed';
  var options = {
    body: 'You successfully subscribed to our Notification service',
    icon: '/src/images/icons/icon-96x96.png',
    image: '/src/images/woman.jpeg',
    dir: 'ltr',
    lang: 'en-US',
    vibrate: [100, 50, 200],
    badge: '/src/images/icons/icon-96x96.png',
    tag: 'confirm-notification',
    renotify: true,
    actions: [
      { action: 'confirm', title: 'Okay', icon: '/src/images/icons/icon-96x96.png' },
      { action: 'cancel', title: 'Cancel', icon: '/src/images/icons/icon-96x96.png' }
    ]
  }
  if('serviceWorker' in navigator){
    navigator.serviceWorker.ready
      .then(function(sw){
        sw.showNotification(title, options);
      })
  }
  // new Notification(title, options);
}

if('Notification' in window && 'serviceWorker' in navigator){
  displayingButtonNotifications(true);
}

function displayingButtonNotifications(isDisplay){
  if(isDisplay){
    for(var i = 0 ; i < enableNotificationButtons.length ; i++ ) {
      enableNotificationButtons[i].classList.remove('hidden');
      enableNotificationButtons[i].addEventListener('click', askForNotificationPermission);
    }
  } else {
    for(var i = 0 ; i < enableNotificationButtons.length ; i++ ) {
      enableNotificationButtons[i].classList.add('hidden');
    }
  }
}

function configurePushSub() {
  if(!('serviceWorker' in navigator)) {
    return;
  }
  var reg;
  navigator.serviceWorker.ready
        .then(function(sw) {
          reg = sw;
          return sw.pushManager.getSubscription()
        })
        .then(function(sub) {
          if(sub === null){
            var vapidPublicKey = 'PUBLIC_KEY_VAPID';
            var convertedVpk = urlBase64ToUint8Array(vapidPublicKey);
            return reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVpk
            });
          }
        })
        .then(function(newSub) {
          return fetch(FIREBASE_URL_SUBSCRIPTIONS + '.json', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(newSub)
          })
        })
        .then(function(res) {
          if(res.ok){
            displayConfirmNotification();
          }
        })
        .catch(function(err) {
          console.log('err :>> ', err);
        })
}