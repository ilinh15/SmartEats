import { getToken, onMessage, type Messaging, type MessagePayload } from 'firebase/messaging';
import { messaging } from './firebase';

export const requestPermission = async (): Promise<string | null> => {
  if (!messaging) {
    console.error('Firebase messaging is not initialized');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    console.log('Service worker ready for FCM:', registration.scope);

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const onMessageListener = (callback: (payload: MessagePayload) => void) => {
  if (!messaging) {
    console.error('Firebase messaging is not initialized');
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);
    callback(payload);
  });
};