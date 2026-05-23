import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Coffee } from 'lucide-react';

export default function QROrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const table = searchParams.get('table') || '1';

  useEffect(() => {
    const timer = setTimeout(() => navigate('/'), 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--color-base)' }}>
      <div className="text-center">
        <Coffee size={48} className="text-[var(--color-ink)] mx-auto mb-6" />
        <h1 className="font-section text-[var(--color-ink)] mb-2">B1 BY BACKHAUS</h1>
        <p className="font-data text-[var(--color-mid)] mb-6">TABLE {table} — ORDERING</p>
        <p className="font-body text-[var(--color-mid)]">Redirecting to menu...</p>
        <button onClick={() => navigate('/')} className="font-button mt-6 px-8 py-3 bg-[var(--color-ink)] text-[var(--color-base)]">
          ORDER NOW
        </button>
      </div>
    </div>
  );
}
