importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Replace with actual value
  authDomain: "YOUR_AUTH_DOMAIN", // Replace with actual value
  projectId: "YOUR_PROJECT_ID", // Replace with actual value
  storageBucket: "YOUR_STORAGE_BUCKET", // Replace with actual value
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Replace with actual value
  appId: "YOUR_APP_ID" // Replace with actual value
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});