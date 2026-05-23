import { useNavigate } from 'react-router';
import { Coffee, Zap, Shield, BarChart3, CreditCard, Globe, ArrowRight, Check } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#F3F2EE', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif' }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center" style={{ background: 'rgba(243,242,238,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(24,24,24,0.08)' }}>
        <div className="content-container w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center" style={{ background: '#181818' }}>
              <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.625rem', fontWeight: 500, color: '#F3F2EE' }}>B1</span>
            </div>
            <span style={{ fontWeight: 500, fontSize: '0.875rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#181818' }}>Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#pricing" className="hidden md:block font-data hover:opacity-60 transition-opacity" style={{ color: '#181818', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>Pricing</a>
            <a href="#features" className="hidden md:block font-data hover:opacity-60 transition-opacity" style={{ color: '#181818', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>Features</a>
            <button onClick={() => navigate('/staff-login')} className="font-data hover:opacity-60 transition-opacity" style={{ color: '#181818', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: 'none' }}>Staff Login</button>
            <button onClick={() => navigate('/admin')} className="hidden md:block font-data hover:opacity-60 transition-opacity" style={{ color: '#181818', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: 'none' }}>Platform Admin</button>
            <button onClick={() => navigate('/onboarding')} className="px-4 py-2 font-button transition-opacity hover:opacity-85" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.75rem' }}>
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-32 pb-20 text-center">
        <div className="content-container">
          <p className="font-data mb-4" style={{ color: '#5E8B8B', fontSize: '0.625rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            The Operating System for Australian Cafes
          </p>
          <h1 style={{ fontWeight: 400, fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#181818', maxWidth: '800px', margin: '0 auto 1.5rem' }}>
            Your Menu Online.<br />Your Orders Synced.<br />Your Customers Back.
          </h1>
          <p style={{ fontSize: '1rem', lineHeight: 1.6, color: '#5E5E5E', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
            B1 Platform gives every cafe a branded online ordering site, real-time Square POS sync, staff management, loyalty programs — all in one.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button onClick={() => navigate('/onboarding')} className="px-8 py-4 font-button flex items-center gap-2 transition-opacity hover:opacity-85" style={{ background: '#181818', color: '#F3F2EE', fontSize: '0.875rem' }}>
              Start 14-Day Free Trial <ArrowRight size={16} />
            </button>
            <a href="/v/b1-backhaus" className="px-8 py-4 font-button border flex items-center gap-2 transition-all hover:bg-[#181818] hover:text-[#F3F2EE]" style={{ borderColor: 'rgba(24,24,24,0.15)', color: '#181818', fontSize: '0.875rem', textDecoration: 'none' }}>
              <Coffee size={16} /> See Demo Cafe
            </a>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="py-20 border-t" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="content-container">
          <p className="font-data text-center mb-12" style={{ color: '#5E5E5E', fontSize: '0.625rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Everything You Need to Run Your Cafe Online
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Globe, title: 'Branded Online Menu', desc: 'Your own website with your logo, colours, and menu. Customers order in under 60 seconds.' },
              { icon: Zap, title: 'Square POS Sync', desc: 'Menu, inventory, and orders flow both ways. What sells online updates in Square instantly.' },
              { icon: BarChart3, title: 'Real-Time Dashboard', desc: 'See orders, revenue, popular items, and peak hours. Make decisions with live data.' },
              { icon: CreditCard, title: 'Loyalty & Gift Cards', desc: 'Digital stamp cards, referral codes, gift cards, and subscription passes built in.' },
              { icon: Shield, title: 'Staff Management', desc: 'Role-based access for baristas, managers, and owners. Track who did what.' },
              { icon: Coffee, title: 'Multi-Location Ready', desc: 'One account, multiple locations. Enterprise plan scales to any number of venues.' },
            ].map((f) => (
              <div key={f.title} className="border p-6" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
                <f.icon size={20} style={{ color: '#5E8B8B', marginBottom: '1rem' }} />
                <h3 style={{ fontWeight: 500, fontSize: '0.875rem', textTransform: 'uppercase', color: '#181818', marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.5, color: '#5E5E5E' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-t" style={{ borderColor: 'rgba(24,24,24,0.08)', background: '#E8E4DD' }}>
        <div className="content-container">
          <p className="font-data text-center mb-4" style={{ color: '#5E5E5E', fontSize: '0.625rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Simple Pricing, No Hidden Fees
          </p>
          <h2 className="text-center mb-12" style={{ fontWeight: 400, fontSize: '1.5rem', textTransform: 'uppercase', color: '#181818' }}>
            Choose Your Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: 'Starter', price: '$49', period: '/mo', features: ['Branded online menu', 'Unlimited online orders', '2 staff members', 'Basic loyalty program', 'Email support'], cta: 'Start Trial', highlight: false },
              { name: 'Pro', price: '$99', period: '/mo', features: ['Everything in Starter', 'Square POS sync', 'Analytics dashboard', '10 staff members', 'Full loyalty + gift cards', 'Referral program', 'Priority support'], cta: 'Start Trial', highlight: true },
              { name: 'Enterprise', price: '$249', period: '/mo', features: ['Everything in Pro', 'Multi-location support', 'API access', 'White-label mobile app', 'Unlimited staff', 'Custom integrations', 'Dedicated account manager'], cta: 'Contact Sales', highlight: false },
            ].map((plan) => (
              <div key={plan.name} className="border p-6 flex flex-col" style={{ borderColor: plan.highlight ? '#181818' : 'rgba(24,24,24,0.15)', background: plan.highlight ? '#F3F2EE' : 'transparent' }}>
                <h3 className="font-data mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span style={{ fontWeight: 500, fontSize: '2rem', color: '#181818' }}>{plan.price}</span>
                  <span className="font-data" style={{ color: '#5E5E5E', fontSize: '0.625rem' }}>{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2" style={{ fontSize: '0.8125rem', color: '#181818' }}>
                      <Check size={14} style={{ color: '#5E8B8B', flexShrink: 0, marginTop: 2 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/onboarding')} className="w-full py-3 font-button transition-opacity hover:opacity-85" style={{ background: plan.highlight ? '#181818' : 'transparent', color: plan.highlight ? '#F3F2EE' : '#181818', border: plan.highlight ? 'none' : '1px solid rgba(24,24,24,0.15)', fontSize: '0.75rem' }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center mt-6 font-data" style={{ color: '#5E5E5E', fontSize: '0.5625rem' }}>
            All plans include a 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t" style={{ borderColor: 'rgba(24,24,24,0.08)' }}>
        <div className="content-container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center" style={{ background: '#181818' }}>
              <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.5rem', fontWeight: 500, color: '#F3F2EE' }}>B1</span>
            </div>
            <span className="font-data" style={{ color: '#5E5E5E', fontSize: '0.625rem' }}>B1 Platform &copy; 2025</span>
          </div>
          <div className="flex gap-6">
            <span className="font-data" style={{ color: '#5E5E5E', fontSize: '0.5625rem' }}>Built for Australian Cafes</span>
            <span className="font-data" style={{ color: '#5E5E5E', fontSize: '0.5625rem' }}>Square Integration</span>
            <span className="font-data" style={{ color: '#5E5E5E', fontSize: '0.5625rem' }}>Stripe Billing</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
