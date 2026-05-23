import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { useStaffAuth, isDemoMode } from '@/hooks/useStaffAuth';
import { ArrowLeft, TrendingUp, Coffee, Package, DollarSign, Loader2, Shield } from 'lucide-react';

const DEMO_ANALYTICS = {
  totalOrders: 156,
  totalRevenue: 2847.50,
  avgOrderValue: 18.25,
  uniqueCustomers: 89,
  hourlyBreakdown: [
    { hour: '06:00', orders: 8 }, { hour: '07:00', orders: 22 }, { hour: '08:00', orders: 35 },
    { hour: '09:00', orders: 28 }, { hour: '10:00', orders: 20 }, { hour: '11:00', orders: 18 },
    { hour: '12:00', orders: 15 }, { hour: '13:00', orders: 10 },
  ],
  topItems: [
    { name: 'Flat White', count: 89 }, { name: 'Cappuccino', count: 67 }, { name: 'Cold Brew', count: 45 },
    { name: 'Portuguese Tart', count: 38 }, { name: 'Seasonal Fruit Danish', count: 32 },
    { name: 'Olive & Rosemary Sourdough', count: 21 },
  ],
};

export default function Analytics() {
  const navigate = useNavigate();
  const { staff, loading: authLoading, error: authError, isManager } = useStaffAuth();
  const { data: apiData } = trpc.analytics.dashboard.useQuery(undefined, { enabled: !isDemoMode() });
  const [authChecked, setAuthChecked] = useState(false);
  const demo = isDemoMode();

  const data = demo ? DEMO_ANALYTICS : apiData;

  useEffect(() => {
    if (authLoading) return;
    if (!staff || !isManager) {
      navigate('/staff-login');
    } else {
      setAuthChecked(true);
    }
  }, [authLoading, staff, isManager, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#181818' }} />
          <p style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>AUTHENTICATING...</p>
        </div>
      </div>
    );
  }

  if (authError && !staff && !demo) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE' }}>
        <div className="text-center max-w-sm mx-4">
          <Shield size={40} className="mx-auto mb-4" style={{ color: '#B85450' }} />
          <h1 style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1.25rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.5rem' }}>AUTH FAILED</h1>
          <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', marginBottom: '1.5rem' }}>{authError}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}>RETRY</button>
        </div>
      </div>
    );
  }

  if (!authChecked || !staff || !isManager) return null;

  return (
    <div className="min-h-[100dvh]" style={{ background: '#F3F2EE' }}>
      {demo && (
        <div className="fixed top-0 left-0 right-0 z-[300] py-2 px-6 flex items-center justify-center gap-2" style={{ background: '#5E8B8B' }}>
          <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F3F2EE' }}>
            DEMO MODE — Sample data shown
          </span>
        </div>
      )}

      <header className="border-b" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#F3F2EE', marginTop: demo ? '28px' : 0 }}>
        <div className="content-container py-4 flex items-center gap-4">
          <button onClick={() => navigate('/staff')} className="p-2 border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1.25rem', lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#181818' }}>ANALYTICS</h1>
            <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 400, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>BUSINESS OVERVIEW</span>
          </div>
        </div>
      </header>

      <div className="content-container py-8">
        {!data ? (
          <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Loading analytics...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { label: 'TOTAL ORDERS', value: data.totalOrders, icon: Package },
                { label: 'TOTAL REVENUE', value: `$${data.totalRevenue.toFixed(0)}`, icon: DollarSign },
                { label: 'AVG ORDER', value: `$${data.avgOrderValue.toFixed(2)}`, icon: TrendingUp },
                { label: 'UNIQUE CUSTOMERS', value: data.uniqueCustomers, icon: Coffee },
              ].map((s) => (
                <div key={s.label} className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
                  <s.icon size={18} style={{ color: '#5E5E5E' }} className="mb-3" />
                  <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E', display: 'block', marginBottom: '0.5rem' }}>{s.label}</span>
                  <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '1.5rem', color: '#181818' }}>{s.value}</span>
                </div>
              ))}
            </div>

            {data.hourlyBreakdown && data.hourlyBreakdown.length > 0 && (
              <div className="border p-5 mb-8" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
                <h2 style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>HOURLY BREAKDOWN</h2>
                <div className="space-y-2">
                  {data.hourlyBreakdown.map((h: any) => (
                    <div key={h.hour} className="flex items-center gap-3">
                      <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E', width: '3rem' }}>{h.hour}</span>
                      <div className="flex-1 h-4" style={{ background: 'rgba(24,24,24,0.06)' }}>
                        <div className="h-full" style={{ width: `${Math.min(100, (h.orders / Math.max(...data.hourlyBreakdown.map((x: any) => x.orders))) * 100)}%`, background: '#181818' }} />
                      </div>
                      <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#181818', width: '2rem', textAlign: 'right' }}>{h.orders}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.topItems && data.topItems.length > 0 && (
              <div className="border p-5" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
                <h2 style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '1rem' }}>TOP ITEMS</h2>
                <div className="space-y-2">
                  {data.topItems.map((item: any, i: number) => (
                    <div key={item.name} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(24,24,24,0.06)' }}>
                      <div className="flex items-center gap-3">
                        <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, fontSize: '0.75rem', color: '#5E5E5E', width: '1.5rem' }}>#{i + 1}</span>
                        <span style={{ fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: '0.875rem', color: '#181818' }}>{item.name}</span>
                      </div>
                      <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', color: '#5E5E5E' }}>{item.count} sold</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
