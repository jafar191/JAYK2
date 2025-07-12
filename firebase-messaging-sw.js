
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCcs7O6gAU5-v0FL7KokL0CmVLdyWUBdYM",
  authDomain: "jayk-1.firebaseapp.com",
  projectId: "jayk-1",
  storageBucket: "jayk-1.firebasestorage.app",
  messagingSenderId: "1093537815530",
  appId: "1:1093537815530:web:11b7ea7b9b92182de23093",
  measurementId: "G-VH4YEF6ZL5"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// هذا الجزء يعالج استقبال الإشعار في الخلفية
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
