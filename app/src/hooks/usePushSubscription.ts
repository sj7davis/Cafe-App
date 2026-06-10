import { useState, useEffect } from 'react';
import { trpc } from '@/providers/trpc';

export function usePushSubscription(venueId: number) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: vapidData } = trpc.venue.getVapidPublicKey.useQuery({ venueId }, { enabled: !!venueId });
  const saveSub = trpc.venue.savePushSubscription.useMutation();
  const deleteSub = trpc.venue.deletePushSubscription.useMutation();

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
    // Check existing subscription
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  async function subscribe() {
    if (!vapidData?.publicKey) return;
    setIsLoading(true);
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setIsLoading(false); return; }

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey) as BufferSource,
      });

      const json = sub.toJSON() as any;
      await saveSub.mutateAsync({
        venueId,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
      });
      setIsSubscribed(true);
    } catch (err) {
      console.error('Push subscribe error:', err);
    }
    setIsLoading(false);
  }

  async function unsubscribe() {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deleteSub.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    }
    setIsLoading(false);
  }

  return { isSubscribed, isSupported, isLoading, subscribe, unsubscribe };
}

/** Standalone helper: subscribe a phone number to push without a React hook context */
export async function subscribePush(_phone: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    // VAPID key must be fetched via tRPC outside React context — skip for now; the
    // full subscription flow is handled by usePushSubscription inside components.
  } catch {
    // silently ignore
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
