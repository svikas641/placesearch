const admin = require('firebase-admin');
const functions = require('firebase-functions');
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');

const serviceAccount = require('./placesearch-6671d-firebase-adminsdk-171fn-173eed2b15.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const cors = require('cors')({origin: true});
app.use(cors);
app.use(bodyParser({extended: true}));

const db = admin.firestore();

app.post('/result', async (req, res) => {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${req.body.lat},${req.body.lng}&radius=5000&type=restaurant&key=AIzaSyBsfMtDfr-TprtQ9B6ovh5YmSZgObYO-YE`;

  const respHandler = async (err, response, body) => {
    console.log('error:', err);

    body.results.sort((first, second) => {
      return first.rating - second.rating;
    });

    const idToken = req.header('Authorization');
    const uid = (await admin.auth().verifyIdToken(idToken)).uid;

    let FieldValue = require('firebase-admin').firestore.FieldValue;
    let doc = {
      uid: uid,
      request: req.body,
      response: body.results,
      timestamp: FieldValue.serverTimestamp(),
    };
    const doc_ref = await db
      .collection('queries')
      .add(doc)
      .catch(err => {
        console.log(err);
      });
    console.log(doc_ref.id);
    res.setHeader('Doc_Id', `${doc_ref.id}`);
    res.send({data: body.results.reverse(), docID: doc_ref.id});
  };

  request(
    url,
    {
      json: true,
    },
    respHandler,
  );
});

app.post('/selection', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With,content-type, Authorization',
  );
  db.collection('queries')
    .doc(`${req.body.docID}`)
    .update({selection: req.body.selectedItem});

  res.status(200).send('Selection Saved');
});

exports.findrestaurant = functions.https.onRequest(app);
