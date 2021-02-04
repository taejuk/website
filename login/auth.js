const firebase = require('firebase');
const firebaseConfig = {
  apiKey: 'AIzaSyBSD7S3q4ZmWEuy2OMreb8UVqFRQJLWrUw',
  authDomain: 'login-35019.firebaseapp.com',
  databaseURL: 'https://login-35019-default-rtdb.firebaseio.com',
  projectId: 'login-35019',
  storageBucket: 'login-35019.appspot.com',
  messagingSenderId: '540389717739',
  appId: '1:540389717739:web:c238213846d166fed1f0ae',
  measurementId: 'G-LWDPWK44HF',
};

firebase.initializeApp(firebaseConfig);

exports.signInWithEmailPassword = function (email, password) {
  return firebase.auth().signInWithEmailAndPassword(email, password);
};

exports.signUpWithEmailPasswoerd = function (email, password) {
  firebase
    .auth()
    .createUserWithEmailAndPassword(email, password)
    .then((user) => {
      console.log('create new user!');
    })
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorMessage);
    });
};

exports.sendEmailVerification = function () {
  firebase
    .auth()
    .currentUser.sendEmailVerification()
    .then(() => {});
};

exports.sendPasswordReset = function (email) {
  firebase
    .auth()
    .sendPasswordResetEmail(email)
    .then(() => {})
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
    });
};
