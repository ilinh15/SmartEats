importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyB7T5DVELRlllDsPVDQITjrUMy3faFr_x0",
  authDomain: "smarteats-d9697.firebaseapp.com",
  projectId: "smarteats-d9697",
  storageBucket: "smarteats-d9697.firebasestorage.app",
  messagingSenderId: "470269386658",
  appId: "1:470269386658:web:d58ff495848ac090b71cfb"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://cdn.creativefabrica.com/2020/02/11/Food-Logo-Graphics-1-71-580x386.jpg',
    badge: 'https://cdn.creativefabrica.com/2020/02/11/Food-Logo-Graphics-1-71-580x386.jpg',
    tag: 'smarteats-notification',
    requireInteraction: false
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});