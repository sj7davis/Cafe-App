import { useState } from 'react';
import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';
import { ArrowLeft, ArrowRight, Check, Coffee, Loader2 } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ email: '', password: '', name: '', venueName: '', venueSlug: '' });
  const [error, setError] = useState('');

  const registerMutation = trpc.venue.register.useMutation({
    onSuccess: () => {
      setStep(3);
    },
    onError: (err) => setError(err.message),
  });

  const handleRegister = () => {
    setError('');
    if (!form.email || !form.password || !form.name || !form.venueName || !form.venueSlug) return;
    registerMutation.mutate(form);
  };

  const steps = ['Create Account', 'Cafe Details', 'Ready to Go'];

  return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F3F2EE', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      <div className="w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <button onClick={() => navigate('/')} className="mb-6 inline-flex items-center gap-1 font-data hover:opacity-60 transition-opacity" style={{ color: '#5E5E5E', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: 'none' }}>
            <ArrowLeft size={14} /> Back to Home
          </button>
          <div className="w-10 h-10 flex items-center justify-center mx-auto mb-4" style={{ background: '#181818' }}>
            <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.75rem', fontWeight: 500, color: '#F3F2EE' }}>B1</span>
          </div>
          <h1 style={{ fontWeight: 400, fontSize: '1.25rem', letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#181818' }}>
            Start Your Free Trial
          </h1>
          <p className="font-data mt-2" style={{ color: '#5E5E5E', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            14 days free. No credit card required.
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className="w-6 h-6 flex items-center justify-center font-data" style={{
                background: i <= step ? '#181818' : 'transparent',
                color: i <= step ? '#F3F2EE' : '#5E5E5E',
                border: i <= step ? 'none' : '1px solid rgba(24,24,24,0.15)',
                fontSize: '0.625rem',
              }}>{i + 1}</div>
              <span className="font-data hidden sm:inline" style={{ fontSize: '0.5625rem', color: i <= step ? '#181818' : '#5E5E5E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s}</span>
            </div>
          ))}
        </div>

        {/* Step 0: Account */}
        {step === 0 && (
          <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.15)' }}>
            <div className="space-y-4">
              <div>
                <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Your Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full bg-transparent border px-4 py-3 focus:outline-none" style={{ borderColor: 'rgba(24,24,24,0.15)', fontSize: '0.875rem', color: '#181818' }} />
              </div>
              <div>
                <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@yourcafe.com" className="w-full bg-transparent border px-4 py-3 focus:outline-none" style={{ borderColor: 'rgba(24,24,24,0.15)', fontSize: '0.875rem', color: '#181818' }} />
              </div>
              <div>
                <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" className="w-full bg-transparent border px-4 py-3 focus:outline-none" style={{ borderColor: 'rgba(24,24,24,0.15)', fontSize: '0.875rem', color: '#181818' }} />
              </div>
            </div>
            <button onClick={() => setStep(1)} disabled={!form.name || !form.email || !form.password} className="w-full mt-6 py-3 font-button flex items-center justify-center gap-2 transition-opacity disabled:opacity-30 hover:opacity-85" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.875rem' }}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 1: Cafe Details */}
        {step === 1 && (
          <div className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.15)' }}>
            <div className="space-y-4">
              <div>
                <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Cafe Name</label>
                <input type="text" value={form.venueName} onChange={(e) => {
                  const name = e.target.value;
                  setForm({ ...form, venueName: name, venueSlug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') });
                }} placeholder="e.g. B1 by Backhaus" className="w-full bg-transparent border px-4 py-3 focus:outline-none" style={{ borderColor: 'rgba(24,24,24,0.15)', fontSize: '0.875rem', color: '#181818' }} />
              </div>
              <div>
                <label className="font-data block mb-1.5" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Site URL</label>
                <div className="flex items-center border" style={{ borderColor: 'rgba(24,24,24,0.15)' }}>
                  <span className="px-3 py-3 font-data" style={{ fontSize: '0.75rem', color: '#5E5E5E', background: '#E8E4DD' }}>b1platform.com.au/v/</span>
                  <input type="text" value={form.venueSlug} onChange={(e) => setForm({ ...form, venueSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} className="flex-1 bg-transparent px-3 py-3 focus:outline-none" style={{ fontSize: '0.875rem', color: '#181818' }} />
                </div>
              </div>
            </div>
            {error && <p className="mt-3 font-data" style={{ fontSize: '0.625rem', color: '#B85450' }}>{error}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(0)} className="flex-1 py-3 font-button border hover:bg-[#181818] hover:text-[#F3F2EE] transition-all" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', fontSize: '0.75rem' }}>
                Back
              </button>
              <button onClick={handleRegister} disabled={!form.venueName || !form.venueSlug || registerMutation.isPending} className="flex-1 py-3 font-button flex items-center justify-center gap-2 transition-opacity disabled:opacity-30 hover:opacity-85" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
                {registerMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : <>Create Cafe <ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Success */}
        {step === 2 && (
          <div className="border p-6 text-center" style={{ borderColor: 'rgba(24,24,24,0.15)' }}>
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4" style={{ background: '#5E8B5E20' }}>
              <Check size={24} style={{ color: '#5E8B5E' }} />
            </div>
            <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.5rem' }}>Your Cafe is Live!</h2>
            <p className="font-data mb-6" style={{ fontSize: '0.75rem', color: '#5E5E5E', lineHeight: 1.6 }}>
              Your trial has started. Your cafe site is live at:<br />
              <strong style={{ color: '#181818' }}>b1platform.com.au/v/{form.venueSlug}</strong>
            </p>
            <button onClick={() => navigate('/dashboard')} className="w-full py-3 font-button flex items-center justify-center gap-2 transition-opacity hover:opacity-85" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.875rem' }}>
              <Coffee size={16} /> Go to Dashboard
            </button>
          </div>
        )}

        {/* Step 3: Loading after registration */}
        {step === 3 && (
          <div className="border p-6 text-center" style={{ borderColor: 'rgba(24,24,24,0.15)' }}>
            <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#181818' }} />
            <h2 style={{ fontWeight: 400, fontSize: '1rem', textTransform: 'uppercase', color: '#181818' }}>Setting Up Your Cafe...</h2>
            <p className="font-data mt-2" style={{ fontSize: '0.625rem', color: '#5E5E5E' }}>This takes just a moment.</p>
            {setTimeout(() => setStep(2), 500) && null}
          </div>
        )}
      </div>
    </div>
  );
}
