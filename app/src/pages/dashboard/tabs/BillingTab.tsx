import { useState } from 'react';
import { trpc } from '@/providers/trpc';
import { Check,
} from 'lucide-react';






export function BillingTab() {
  const token = localStorage.getItem('b1-owner-token') || '';
  const { data: status } = trpc.billing.status.useQuery({ token }, { enabled: !!token });
  const { data: tiers } = trpc.billing.tiers.useQuery();
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const portalQuery = trpc.billing.getBillingPortalUrl.useQuery(
    { token },
    { enabled: false },
  );

  const changeTier = trpc.billing.changeTier.useMutation({
    onSuccess: async (data) => {
      if ('clientSecret' in data && data.clientSecret) {
        // Payment required for new subscription — redirect to billing portal
        setPaymentMessage('Payment required — redirecting to billing portal...');
        const result = await portalQuery.refetch();
        if (result.data?.url) {
          window.location.href = result.data.url;
        } else {
          setPaymentMessage('Payment required. Please manage your subscription in the billing portal.');
        }
      } else {
        window.location.reload();
      }
    },
  });

  const handleManageBilling = async () => {
    const result = await portalQuery.refetch();
    if (result.data?.url) {
      window.location.href = result.data.url;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--op-text)', margin: 0, letterSpacing: '-0.04em', fontFamily: 'Inter, sans-serif' }}>
          Billing &amp; Plans
        </h1>
        <p style={{ fontSize: 13, color: 'var(--op-text-secondary)', margin: '5px 0 0', lineHeight: 1.5 }}>
          Manage your subscription and payment method.
        </p>
      </div>
      <div className="border p-6 mb-6" style={{ borderColor: 'var(--op-border-soft)', background: 'var(--op-stat-bg)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-data block mb-1" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>Current Plan</span>
            <h2 style={{ fontWeight: 500, fontSize: '1.5rem', color: 'var(--op-text)' }}>{status?.tierDetails?.name || 'Trial'}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'Geist Mono', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', background: status?.status === 'trial' ? 'rgba(196,149,58,0.12)' : 'rgba(94,139,94,0.12)', color: status?.status === 'trial' ? '#C4953A' : '#5E8B5E' }}>
              {status?.status?.toUpperCase() || 'TRIAL'}
            </span>
            {status?.hasStripeCustomer && (
              <button
                onClick={handleManageBilling}
                disabled={portalQuery.isFetching}
                className="font-button"
                style={{ fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', background: 'transparent', border: '1px solid rgba(24,24,24,0.3)', color: 'var(--op-text)', cursor: 'pointer' }}
              >
                {portalQuery.isFetching ? 'Loading...' : 'Manage Billing'}
              </button>
            )}
          </div>
        </div>
        {status?.isTrial && status.trialEndsAt && (
          <p className="font-data" style={{ fontSize: '0.625rem', color: 'var(--op-text-secondary)' }}>
            Trial ends: {new Date(status.trialEndsAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
        {paymentMessage && (
          <p className="font-data mt-3" style={{ fontSize: '0.75rem', color: '#C4953A' }}>{paymentMessage}</p>
        )}
        {changeTier.error && (
          <p className="font-data mt-3" style={{ fontSize: '0.75rem', color: '#C44444' }}>{(changeTier.error as any).message}</p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers && Object.entries(tiers).map(([key, tier]: [string, any]) => (
          <div key={key} className="border p-5 flex flex-col" style={{ borderColor: status?.tier === key ? '#181818' : 'var(--op-border-strong)' }}>
            <h3 className="font-data mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--op-text-secondary)' }}>{tier.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span style={{ fontWeight: 500, fontSize: '1.5rem', color: 'var(--op-text)' }}>${tier.monthlyPrice}</span>
              <span className="font-data" style={{ color: 'var(--op-text-secondary)', fontSize: '0.625rem' }}>/mo AUD</span>
            </div>
            <ul className="space-y-1.5 mb-6 flex-1">
              {tier.features.map((f: string) => (
                <li key={f} className="flex items-start gap-2" style={{ fontSize: '0.8125rem', color: 'var(--op-text)' }}>
                  <Check size={12} style={{ color: '#5E8B5E', flexShrink: 0, marginTop: 3 }} /> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => changeTier.mutate({ token, tier: key as any })} disabled={status?.tier === key || changeTier.isPending} className="w-full py-3 font-button" style={{ background: status?.tier === key ? '#5E8B5E' : '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
              {changeTier.isPending ? 'Updating...' : status?.tier === key ? 'Current Plan' : `Switch to ${tier.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
