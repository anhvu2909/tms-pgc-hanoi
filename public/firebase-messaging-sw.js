/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

const config = {
  apiKey: 'AIzaSyBYXi1mu0DM_U5xIAABmeFKf-QrIj5BDgI',
  authDomain: 'petro-notif.firebaseapp.com',
  projectId: 'petro-notif',
  storageBucket: 'petro-notif.firebasestorage.app',
  messagingSenderId: '869274208587',
  appId: '1:869274208587:web:a693a1de298fae037980ce',
  measurementId: 'G-XLCFS0YQET',
};

firebase.initializeApp(config);
const messaging = firebase.messaging();
const channel = new BroadcastChannel('f0f33934-1272-4d31-928f-71226e35ccd8');
messaging.onBackgroundMessage((payload) => {
  channel.postMessage(JSON.parse(payload.data.data || '{}'));
});
