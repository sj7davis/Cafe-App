import { usePushSubscription } from '@/hooks/usePushSubscription';
import { trpc } from '@/providers/trpc';


import {
  CheckCircle,
  Bell,
} from 'lucide-react';

// ─── Role-based tab definitions ───
import { StatCard } from '../shared';

export function PushNotificationsTab({ venueId }: { venueId: number }) {
  const token = localStorage.getItem('b1-staff-token') || '';
  const { data: subsData } = trpc.venue.listPushSubscriptions.useQuery({ token });
  const { isSubscribed, isSupported, isLoading, subscribe, unsubscribe } = usePushSubscription(venueId);

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 24px' }}>Push Notifications</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={<Bell size={20} />} label="Total Subscribers" value={String(subsData?.count ?? 0)} color="#1c1917" />
        <StatCard icon={<CheckCircle size={20} />} label="This Device" value={isSubscribed ? 'Subscribed ✓' : 'Not subscribed'} color={isSubscribed ? '#16a34a' : '#78716c'} />
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e7e5e4', padding: '24px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>This Device</h3>
        <p style={{ color: '#78716c', fontSize: '14px', margin: '0 0 16px' }}>
          {isSubscribed
            ? 'This device will receive a push notification when any order is marked ready.'
            : 'Subscribe to receive browser push notifications when orders are marked ready.'}
        </p>
        {!isSupported ? (
          <p style={{ color: '#dc2626', fontSize: '13px' }}>Push notifications are not supported in this browser.</p>
        ) : isSubscribed ? (
          <button
            onClick={unsubscribe}
            disabled={isLoading}
            style={{ padding: '8px 16px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
          >
            {isLoading ? 'Unsubscribing...' : 'Unsubscribe This Device'}
          </button>
        ) : (
          <button
            onClick={subscribe}
            disabled={isLoading}
            style={{ padding: '8px 16px', background: '#1c1917', color: '#fafaf9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
          >
            {isLoading ? 'Subscribing...' : '🔔 Enable Push Notifications'}
          </button>
        )}
      </div>

      <div style={{ background: '#f5f5f4', borderRadius: '12px', padding: '16px' }}>
        <p style={{ fontSize: '13px', color: '#78716c', margin: 0 }}>
          Push notifications are sent when a <strong>new order arrives</strong> and when an order is marked <strong>Ready</strong>.
          Enable on each device where you want alerts — even when the tab is in the background.
        </p>
      </div>
    </div>
  );
}
