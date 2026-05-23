import { useNavigate } from 'react-router';
import { Coffee, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      <div className="text-center">
        <Coffee size={40} style={{ color: '#5E5E5E' }} className="mx-auto mb-4" />
        <h1 style={{ fontWeight: 400, fontSize: '4rem', lineHeight: 1, color: '#181818', letterSpacing: '-0.04em' }}>404</h1>
        <p className="font-data mt-2 mb-6" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>
          Page Not Found
        </p>
        <button onClick={() => navigate('/')} className="px-6 py-3 font-button flex items-center gap-2 mx-auto transition-opacity hover:opacity-85" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
          <ArrowLeft size={14} /> Back to Home
        </button>
      </div>
    </div>
  );
}
