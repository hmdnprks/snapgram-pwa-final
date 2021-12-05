


// posting
var buttonAdd = document.querySelector('#btn-add-post');
var buttonClosePost = document.querySelector('#btn-close-post');
var buttonLocation = document.querySelector('#btn-location');
var postContainer = document.querySelector('#form-post-container');
var postFeedArea = document.querySelector('#feed-post-wrapper');
var loadingWrapper = document.querySelector('#loading-wrapper');
var fetchedLocation = { lat: 0, lng: 0};

// form
var form = document.querySelector('form');
var captionInput = document.querySelector('#caption');
var usernameInput = document.querySelector('#username');
var locationInput = document.querySelector('#location');


// canvas and pictures
var canvas = document.querySelector('#canvas');
var buttonCapture = document.querySelector('#btn-capture');
var buttonFlipCamera = document.querySelector('#btn-flip');
var buttonRetake = document.querySelector('#btn-retake');
var videoPlayer = document.querySelector('#player');
var imagePicker = document.querySelector('#image-picker');
var imagePickerArea = document.querySelector('#pick-image');
var picture;
var networkDataReceived = false;
var frontCamera = true;

// initialize location API
function initializeLocation(){
  if(!('geolocation' in navigator)) {
    buttonLocation.style.display = 'none';
  }
}

// initialize video stream
function initializeMedia(){
  buttonRetake.classList.add('hidden');
  if(!('mediaDevices' in navigator)){
    navigator.mediaDevices = {};
  }

  if(!('getUserMedia' in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      if(!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented'))
      }

      return new Promise(function(res, rej){
        getUserMedia.call(navigator. constraints, resolve,  reject)
      })
    }
  }
  console.log('frontCamera :>> ', frontCamera);
  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: (frontCamera ? "user" : "environment")
    }
  }).then(function(stream){
    videoPlayer.srcObject = stream;
    videoPlayer.classList.remove('hidden');
    videoPlayer.classList.add('block');
  }).catch(function(err){
    console.log('err :>> ', err);
    imagePickerArea.classList.remove('hidden');
    imagePickerArea.classList.add('block');
  })
}

// Load post data with skeleton on loading
window.addEventListener('load', function(event){
  loadInitialData();
})

// ====================
// | CUSTOM FUNCTIONS |
// ====================

function loadInitialData(){
  for(var i = 0; i < 2; i++){
    var cloneLoadingWrapper = loadingWrapper.cloneNode(true);
    postFeedArea.appendChild(cloneLoadingWrapper);
  }
  var loadingWrapperGroup = document.querySelectorAll('.loading-wrapper-group');
  loadingWrapperGroup.forEach(function(node){
    node.classList.remove('hidden');
  })

  var url = FIREBASE_URL_POSTS + '.json';
  // fetch external data
  fetch(url)
  .then(function(res){
    return res.json()
  }).then(function(data){
    networkDataReceived = true;
    loadingWrapperGroup.forEach(function(node){
      node.classList.add('hidden');
    })
    var emptyPost = document.querySelector('#empty-post-wrapper');
    emptyPost.classList.add('hidden');
    console.log('from web :>> ', data);
    // After successfully get data from firebase
    var dataArray = convertObjectArray(data);
    updateUIFeed(dataArray);
  })

  // load from indexed DB also
  if ('indexedDB' in window) {
    readAllData('posts')
      .then(function(data) {
        if (!networkDataReceived) {
          console.log('From cache', data);
          updateUIFeed(data);
        }
      });
  }
}

function createSvg() {
  const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const iconPath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  );

  iconSvg.setAttribute('fill', 'currentColor');
  iconSvg.setAttribute('viewBox', '0 0 20 20');
  iconSvg.setAttribute('class', 'fill-current text-red-400 w-5 mr-2');

  iconPath.setAttribute(
    'd',
    'M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z'
  );
  iconPath.setAttribute('fill-rule', 'evenodd');
  iconPath.setAttribute('clip-rule', 'evenodd');

  iconSvg.appendChild(iconPath);

  return iconSvg;
}

function createCard(data) {
  var cardWrapper = document.createElement('div');
  cardWrapper.className = 'card text-left shadow-2xl mb-5 post-card-group';
  var cardImageWrapper = document.createElement('figure');
  var cardImage = document.createElement('img');
  cardImage.src = data.image;
  cardImage.className = 'rounded-xl rounded-b-none h-60 object-cover';
  cardImageWrapper.appendChild(cardImage);
  var cardBody = document.createElement('div');
  cardBody.className = 'card-body p-5';
  var locationWrapper = document.createElement('div');
  locationWrapper.className = 'flex mb-2';
  var locationText = document.createElement('p');
  locationText.textContent = data.location;
  locationText.className = 'font-medium';
  locationWrapper.appendChild(createSvg());
  locationWrapper.appendChild(locationText);
  var captionTextWrapper = document.createElement('p');
  captionTextWrapper.className = 'font-normal';
  var caption = data.caption;
  var usernameText = document.createElement('span');
  usernameText.className = 'text-black font-bold';
  usernameText.textContent = data.username;
  captionTextWrapper.append(usernameText);
  captionTextWrapper.append(' ' + caption);
  cardBody.appendChild(locationWrapper)
  cardBody.appendChild(captionTextWrapper);
  cardWrapper.appendChild(cardImageWrapper);
  cardWrapper.appendChild(cardBody);
  postFeedArea.appendChild(cardWrapper);
}

function clearCards() {
  var posts = document.querySelectorAll('.post-card-group');
  posts.forEach(function(node){
    node.remove();
  })
}

function updateUIFeed(data){
  clearCards();
  for(var i=0 ; i < data.length; i++){
    createCard(data[i]);
  }
}

function openPostContainer(){
  initializeLocation();
  initializeMedia();
  postContainer.classList.remove('hidden');
  postContainer.classList.add('block');
  if(deferredPrompt){
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then(function(choiceResult) {
      console.log(choiceResult.outcome);

      if(choiceResult.outcome === 'dismiss'){
        console.log('User cancelled installation');
      } else {
        console.log('User added to homescreen');
      }
    });

    deferredPrompt = null;
  }
}

function closePostContainer(){
  postContainer.classList.remove('block');
  postContainer.classList.add('hidden');
  stopVideoPlayer();
}

function stopVideoPlayer(){
  imagePickerArea.classList.add('hidden');
  videoPlayer.classList.add('hidden');
  canvas.classList.add('hidden');
  buttonLocation.classList.remove('hidden');
  buttonCapture.classList.remove('hidden');
  if(videoPlayer.srcObject){
    videoPlayer.srcObject.getVideoTracks().forEach(function(track){
      track.stop();
    })
  }
}

function sendData() {
  var id = new Date().toISOString();
  var postData = new FormData();
  postData.append('id', id);
  postData.append('caption', captionInput.value);
  postData.append('username', usernameInput.value);
  postData.append('location', locationInput.value);
  postData.append('rawLocationLat', fetchedLocation.lat);
  postData.append('rawLocationLng', fetchedLocation.lng);
  postData.append('file', picture, id + '.png');
  console.log('postData :>> ', postData);
  fetch(url, {
    method: 'POST',
    body: postData
  }).then(function(res){
    console.log('Send data...', res);
    updateUIFeed();
  })
}

// EVENT LISTENERS
buttonAdd.addEventListener('click', function(event){
  openPostContainer();
});

buttonClosePost.addEventListener('click', function(event){
  closePostContainer();
});

buttonLocation.addEventListener('click', function(event){
  if(!('geolocation' in navigator)) {
    return;
  }

  buttonLocation.classList.add('loading');

  navigator.geolocation.getCurrentPosition(function(position) {
    console.log('position :>> ', position);
    buttonLocation.classList.remove('loading');
    fetchedLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
    locationInput.value = 'Jakarta';
    locationInput.classList.add('focus:border-blue-300');
  }, function(err){
    console.log('err location :>> ', err);
    buttonLocation.classList.remove('loading');
    alert('Couldnt find location, input manually please');
    fetchedLocation = { lat: 0, lng: 0 };
  }, { timeout: 10000 })
});

// video capture
buttonCapture.addEventListener('click', function(event){
  canvas.classList.remove('hidden');
  videoPlayer.classList.add('hidden');
  buttonCapture.classList.add('hidden');
  buttonRetake.classList.remove('hidden');
  var context = canvas.getContext('2d');
  canvas.width = videoPlayer.videoWidth;
  canvas.height = videoPlayer.videoHeight;
  context.drawImage(videoPlayer, 0 , 0);
  videoPlayer.srcObject.getVideoTracks().forEach(function(track){
    track.stop();
  });
  console.log('canvas :>> ', context);
  picture = dataURItoBlob(canvas.toDataURL());
});

// button flip camera
buttonFlipCamera.addEventListener('click', function(event){
  frontCamera = !frontCamera;
  stopVideoPlayer();
  initializeMedia();
})

buttonRetake.addEventListener('click', function(event){
  videoPlayer.classList.remove('hidden');
  buttonCapture.classList.remove('hidden');
  canvas.classList.add('hidden');
  initializeMedia();
  // clear canvas
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
})

form.addEventListener('submit', function(event){
  event.preventDefault();
  if(captionInput.value.trim() === '' || locationInput.value.trim() === '' || usernameInput.value.trim() === ''){
    alert('Please input valid data');
    return;
  }

  closePostContainer();

  if('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then(function(sw){
        var post = {
          id: new Date().toISOString(),
          username: usernameInput.value,
          caption: captionInput.value,
          location: locationInput.value,
          picture: picture,
          rawLocation: fetchedLocation
        };
        console.log('post updated :>> ', post);
        writeData('sync-posts', post)
          .then(function(){
            console.log('syncing');
            sw.sync.register('snapgram-sync-posts');
          })
          .then(function(){
            var toastContainer = document.querySelector('#toast-wrapper');
            toastContainer.classList.remove('hidden');
            var toastMessage = document.querySelector('#toast-message');
            var message = 'Your Post was saved for syncing';
            toastMessage.textContent = message;
            setTimeout(function(){
              toastContainer.classList.add('hidden');
            }, 3000);
          })
          .catch(function(err){
            console.log(err);
          })
      })
  } else {
    sendData();
  }

})

