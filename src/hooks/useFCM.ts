import { useEffect, useState } from 'react';
import { requestPermission, onMessageListener } from '../lib/fcm';

export const useFCM = () => {
  const [token, setToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initFCM = async () => {
      if (!('serviceWorker' in navigator)) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const fcmToken = await requestPermission();
        if (fcmToken) {
          setToken(fcmToken);
          setPermissionGranted(true);
        }
        // Permission not granted or token not acquired
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        console.error('FCM init error', err);
      }
    };

    initFCM();

    const unsubscribe = onMessageListener((payload) => {
      console.log('Foreground message:', payload);
    });

    return unsubscribe;
  }, []);

  return { token, permissionGranted, error };
};