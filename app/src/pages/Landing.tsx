import { Link } from 'react-router';
import {
  ShoppingCart, Monitor, Users, BarChart3, Gift, Star,
  ArrowRight, Coffee,
} from 'lucide-react';

const FEATURES = [
  {
    icon: ShoppingCart,
    title: 'Online Ordering',
    desc: 'Your own branded ordering site. Customers order in under 60 seconds from any device.',
  },
  {
    icon: Monitor,
    title: 'Kitchen Display',
    desc: 'Real-time KDS built in. Orders flow from customer to kitchen the moment they are placed.',
  },
  {
    icon: Users,
    title: 'Staff Management',
    desc: 'Role-based access for baristas, managers, and owners. Track who did what, when.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Live revenue, popular items, peak hours, and daily order counts — all in one dashboard.',
  },
  {
    icon: Gift,
    title: 'Gift Cards',
    desc: 'Digital gift cards your customers can buy, share, and redeem online or in-store.',
  },
  {
    icon: Star,
    title: 'Loyalty',
    desc: 'Digital stamp cards and loyalty points that keep regulars coming back every week.',
  },
];

const TESTIMONIALS = [
  {
    quote: "B1 replaced three different tools we were paying for. Setup took one afternoon and our online orders doubled in the first month.",
    name: 'Sarah M.',
    role: 'Owner, Blackwood Espresso — Melbourne',
  },
  {
    quote: "The kitchen display is a game-changer. No more printed dockets, no more missed orders. My team actually loves it.",
    name: 'James T.',
    role: 'Head Barista, Harbour Roast — Sydney',
  },
  {
    quote: "We went from zero online presence to fully booked weekends in six weeks. The loyalty program alone paid for the subscription.",
    name: 'Priya K.',
    role: 'Co-founder, Common Thread Cafe — Brisbane',
  },
];

export default function Landing() {
  return (
    <div style={{ background: '#F8F6F2', fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif', color: '#09090B' }}>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 60,
        display: 'flex', alignItems: 'center',
        background: 'rgba(248,246,242,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #E4E4E7',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#18181B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Coffee size={16} color="#F8F6F2" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#09090B', letterSpacing: '-0.02em' }}>B1 Platform</span>
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/login"
              style={{ fontSize: 14, color: '#71717A', textDecoration: 'none', padding: '8px 12px' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#09090B'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#71717A'; }}
            >
              Sign in
            </Link>
            <Link
              to="/onboarding"
              style={{
                fontSize: 14, fontWeight: 600, color: '#FFFFFF',
                background: '#5E8B8B', borderRadius: 8, padding: '8px 18px',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4a7070'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#5E8B8B'; }}
            >
              Start free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 120, paddingBottom: 80, textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
          <span style={{
            display: 'inline-block', marginBottom: 20,
            fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#5E8B8B', background: 'rgba(94,139,139,0.1)', padding: '4px 14px', borderRadius: 99,
          }}>
            The Operating System for Australian Cafes
          </span>
          <h1 style={{
            fontSize: 'clamp(32px, 6vw, 56px)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: '#09090B',
            margin: '0 0 24px',
          }}>
            Run your cafe<br />
            <span style={{ color: '#5E8B8B' }}>smarter.</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: '#71717A', maxWidth: 540, margin: '0 auto 40px' }}>
            B1 Platform gives every cafe a branded online ordering site, real-time kitchen display, staff tools, analytics, gift cards, and loyalty — all in one place.
          </p>
          {/* CTA row */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/onboarding"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#5E8B8B', color: '#FFFFFF',
                padding: '14px 28px', borderRadius: 10,
                fontSize: 15, fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(94,139,139,0.35)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4a7070'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#5E8B8B'; }}
            >
              Get started free <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#FFFFFF', color: '#09090B',
                padding: '14px 28px', borderRadius: 10,
                fontSize: 15, fontWeight: 600, textDecoration: 'none',
                border: '1px solid #E4E4E7',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#A1A1AA'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4E4E7'; }}
            >
              View Demo
            </Link>
          </div>

          {/* Product screenshot placeholder */}
          <div style={{
            marginTop: 56, borderRadius: 16, overflow: 'hidden',
            border: '1px solid #E4E4E7',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
            background: '#FFFFFF',
            height: 340,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {/* Mock browser chrome */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 40, background: '#F4F4F5',
              borderBottom: '1px solid #E4E4E7',
              display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px',
            }}>
              {['#EF4444', '#F59E0B', '#10B981'].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              ))}
              <div style={{
                flex: 1, marginLeft: 12, height: 22, borderRadius: 6,
                background: '#E4E4E7', maxWidth: 300,
                display: 'flex', alignItems: 'center', paddingLeft: 10,
              }}>
                <span style={{ fontSize: 11, color: '#71717A' }}>b1platform.com.au/dashboard</span>
              </div>
            </div>
            {/* Dashboard preview content */}
            <div style={{ marginTop: 24, textAlign: 'center', color: '#A1A1AA' }}>
              <BarChart3 size={40} style={{ marginBottom: 12, color: '#5E8B8B', opacity: 0.5 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Live dashboard preview</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 0', borderTop: '1px solid #E4E4E7' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#09090B', margin: '0 0 12px' }}>
              Everything your cafe needs
            </h2>
            <p style={{ fontSize: 16, color: '#71717A', margin: 0 }}>
              Six core tools. One subscription. No piecing together different apps.
            </p>
          </div>

          {/* 3-col responsive grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {FEATURES.map((f) => (
              <div
                key={f.title}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: 12,
                  padding: '28px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(94,139,139,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <f.icon size={20} color="#5E8B8B" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#09090B', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#71717A', margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ──────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 0', background: '#FFFFFF', borderTop: '1px solid #E4E4E7' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#09090B', margin: '0 0 12px' }}>
              Trusted by cafes across Australia
            </h2>
            <p style={{ fontSize: 16, color: '#71717A', margin: 0 }}>
              Hear from the owners running their business on B1.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                style={{
                  background: '#F8F6F2',
                  border: '1px solid #E4E4E7',
                  borderRadius: 12,
                  padding: '28px 24px',
                }}
              >
                {/* Stars */}
                <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} fill="#5E8B8B" color="#5E8B8B" />
                  ))}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#09090B', margin: '0 0 20px', fontStyle: 'italic' }}>
                  "{t.quote}"
                </p>
                <div style={{ borderTop: '1px solid #E4E4E7', paddingTop: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#09090B', display: 'block' }}>{t.name}</span>
                  <span style={{ fontSize: 12, color: '#71717A' }}>{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', textAlign: 'center', background: '#09090B' }}>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#FAFAFA', margin: '0 0 16px' }}>
          Ready to get started?
        </h2>
        <p style={{ fontSize: 16, color: '#A1A1AA', margin: '0 0 36px' }}>
          14-day free trial. No credit card required. Cancel anytime.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/onboarding"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#5E8B8B', color: '#FFFFFF',
              padding: '14px 28px', borderRadius: 10,
              fontSize: 15, fontWeight: 700, textDecoration: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#4a7070'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#5E8B8B'; }}
          >
            Start free trial <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'transparent', color: '#FAFAFA',
              padding: '14px 28px', borderRadius: 10,
              fontSize: 15, fontWeight: 600, textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #E4E4E7', padding: '32px 24px', background: '#F8F6F2' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: '#18181B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Coffee size={13} color="#F8F6F2" />
            </div>
            <span style={{ fontSize: 13, color: '#71717A' }}>B1 Platform &copy; 2026 — Built for Australian cafes</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: 'Features', href: '#features' },
              { label: 'Sign in', href: '/login' },
              { label: 'Get started', href: '/onboarding' },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                style={{ fontSize: 13, color: '#71717A', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#09090B'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#71717A'; }}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
