import { useEffect, useState } from 'react';
import { requestPermission, onMessageListener } from '../lib/fcm';

export const useFCM = () => {
  const [token, setToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [status, setStatus] = useState('Initializing notifications...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initFCM = async () => {
      if (!('serviceWorker' in navigator)) {
        setStatus('Service Worker not supported in this browser');
        return;
      }

      try {
        setStatus('Registering service worker...');
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        setStatus('Service Worker registered');

        const fcmToken = await requestPermission(registration);
        if (fcmToken) {
          setToken(fcmToken);
          setPermissionGranted(true);
          setStatus('Notification permission granted and token acquired');
        } else {
          setStatus('Token not acquired or permission denied');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus('FCM initialization failed');
        console.error('FCM init error', err);
      }
    };

    initFCM();

    const unsubscribe = onMessageListener((payload) => {
      console.log('Foreground message:', payload);
    });

    return unsubscribe;
  }, []);

  return { token, permissionGranted, status, error };
};