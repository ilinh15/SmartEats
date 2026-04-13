import { useEffect, useState } from 'react';
import { requestPermission, onMessageListener } from '../lib/fcm';

export const useFCM = () => {
  const [token, setToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    const initFCM = async () => {
      const fcmToken = await requestPermission();
      if (fcmToken) {
        setToken(fcmToken);
        setPermissionGranted(true);
      }
    };

    initFCM();

    // Listen for foreground messages
    const unsubscribe = onMessageListener((payload) => {
      // Handle foreground message, e.g., show a toast or custom notification
      console.log('Foreground message:', payload);
      // You can use your toast system here
    });

    return unsubscribe;
  }, []);

  return { token, permissionGranted };
};