const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const webpush = require("web-push");
const fs = require("fs");
const UUID = require("uuid-v4");
var os = require("os");
var Busboy = require("busboy");
var path = require('path');

const serviceAccount = require("./credential-firebase.json");
const gconfig = {
  projectId: 'PROJECT_ID',
  keyFilename: 'credential-firebase.json'
};
const gcs = require("@google-cloud/storage")(gconfig);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: ''
})

exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    functions.logger.log(request)
    var uuid = UUID();
    const busboy = new Busboy({ headers: request.headers });
    let upload;
    const fields = {};

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      console.log(
        `File [${fieldname}] filename: ${filename}, encoding: ${encoding}, mimetype: ${mimetype}`
      );
      const filepath = path.join(os.tmpdir(), filename);
      upload = { file: filepath, type: mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });

     busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
      fields[fieldname] = val;
    });

    busboy.on('finish', () => {
      var bucket = gcs.bucket('BUCKET_NAME');
      bucket.upload(
        upload.file,
        {
          uploadType: 'media',
          metadata: {
            metadata : {
              contentType: upload.type,
              firebaseStorageDownloadTokens: uuid
            }
          }
        },
        function(err, uploadedFile){
          if(!err){
            admin.database().ref('posts').push({
              id: fields.id,
              username: fields.username,
              caption: fields.caption,
              location: fields.location,
              rawLocation: {
                lat: fields.rawLocationLat,
                lng: fields.rawLocationLng
              },
              image:
                "https://firebasestorage.googleapis.com/v0/b/" +
                bucket.name +
                "/o/" +
                encodeURIComponent(uploadedFile.name) +
                "?alt=media&token=" +
                uuid
            }).then(function(){
              webpush.setVapidDetails('mailto:YOUR_MAIL',
                'PUBLIC_KEY',
                'PRIVATE_KEY');
                return admin.database().ref('subscription').once('value');
              })
              .then(function (subscriptions) {
                functions.logger.log('subscriptions log', subscriptions)
                console.log('subscriptions :>> ', subscriptions);
                subscriptions.forEach(function (sub) {
                  var pushConfig = {
                    endpoint: sub.val().endpoint,
                    keys: {
                      auth: sub.val().keys.auth,
                      p256dh: sub.val().keys.p256dh
                    }
                  };

                  webpush.sendNotification(pushConfig, JSON.stringify({
                    title: 'New Post from ' + fields.username,
                    content: fields.caption,
                    openUrl: '/'
                  }))
                    .then(function(sendResult){
                      functions.logger.log('notification sent', sendResult)
                    })
                    .catch(function(err) {
                      functions.logger.log('notification err', err)
                    })
                });
                response.status(201).json({message: 'Data stored', id: fields.id});
              })
              .catch(function (err) {
                response.status(500).json({error: err});
              });
          } else {
            functions.logger.warn('error', err)
          }
        }
      )
    })

    busboy.end(request.rawBody);
  });
});