import { useEffect, useRef, useState } from 'react';
import Newsletter from '@/components/Newsletter';

const hours = [
  { day: 'MON \u2013 FRI', time: '06:00 \u2013 15:00' },
  { day: 'SATURDAY', time: '07:00 \u2013 14:00' },
  { day: 'SUNDAY', time: '07:00 \u2013 13:00' },
];

export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  const splitText = (text: string, r: boolean) => {
    return text.split('').map((char, i) => (
      <span
        key={i}
        className="char"
        style={{ transitionDelay: r ? `${i * 30}ms` : '0ms' }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  const inputClasses = "w-full bg-transparent border px-4 py-3.5 text-[var(--color-base)] font-form-input placeholder:text-[rgba(243,242,238,0.3)] placeholder:font-[Geist_Mono,'SF_Mono','Courier_New',monospace] placeholder:uppercase placeholder:text-[0.75rem] placeholder:tracking-[0.08em] focus:border-[rgba(243,242,238,0.4)] focus:outline-none transition-colors duration-200";
  const inputBorderStyle = { borderColor: 'rgba(243, 242, 238, 0.15)' };

  return (
    <footer
      ref={sectionRef}
      id="contact"
      className="py-[var(--space-section)] pb-16"
      style={{ background: 'var(--color-ink)', color: 'var(--color-base)' }}
    >
      <div className="content-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-grid)]">
          {/* Column 1 — Visit Us */}
          <div>
            <span
              className="font-data block"
              style={{ color: 'rgba(243, 242, 238, 0.5)', opacity: revealed ? 1 : 0, transition: 'opacity 0.3s ease' }}
            >
              LOCATION
            </span>
            <div className={`mt-4 ${revealed ? 'is-revealed' : ''}`}>
              <span className="text-reveal font-footer block text-[var(--color-base)] leading-relaxed">
                {splitText('42 East Keilor Road', revealed)}
              </span>
              <span className="text-reveal font-footer block text-[var(--color-base)] leading-relaxed" style={{ transitionDelay: revealed ? '30ms' : '0ms' }}>
                {splitText('East Keilor, VIC 3033', revealed)}
              </span>
            </div>
            <div
              className="mt-6 overflow-hidden"
              style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.4s ease' }}
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3155.0!2d144.85!3d-37.73!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zLTM3LjcyODIsMTQ0Ljg1MDA!5e0!3m2!1sen!2sau!4v1700000000000!5m2!1sen!2sau"
                width="100%"
                height="200"
                style={{ border: 0, filter: 'grayscale(100%) contrast(1.1)' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="B1 by Backhaus location"
              />
            </div>
          </div>

          {/* Column 2 — Hours */}
          <div>
            <span
              className="font-data block"
              style={{ color: 'rgba(243, 242, 238, 0.5)', opacity: revealed ? 1 : 0, transition: 'opacity 0.3s ease' }}
            >
              OPENING HOURS
            </span>
            <div className="mt-4">
              {hours.map((row, i) => (
                <div
                  key={row.day}
                  className="flex justify-between py-2"
                  style={{
                    borderBottom: '1px solid rgba(243, 242, 238, 0.08)',
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'translateX(0)' : 'translateX(-10px)',
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                    transitionDelay: revealed ? `${i * 100}ms` : '0ms',
                  }}
                >
                  <span className="font-body text-[rgba(243,242,238,0.6)]">{row.day}</span>
                  <span className="font-price text-[var(--color-base)]">{row.time}</span>
                </div>
              ))}
            </div>
            {/* Newsletter in hours column (fills space nicely) */}
            <div className="mt-8">
              <Newsletter />
            </div>
          </div>

          {/* Column 3 — Connect */}
          <div>
            <span
              className="font-data block"
              style={{ color: 'rgba(243, 242, 238, 0.5)', opacity: revealed ? 1 : 0, transition: 'opacity 0.3s ease' }}
            >
              CONNECT
            </span>
            <div className="mt-4 flex gap-6">
              {['INSTAGRAM', 'FACEBOOK'].map((social, i) => (
                <a
                  key={social}
                  href="#"
                  className="font-nav text-[var(--color-base)] hover:opacity-40 transition-opacity duration-200"
                  style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.3s ease', transitionDelay: revealed ? `${i * 100}ms` : '0ms' }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {social}
                </a>
              ))}
            </div>

            {/* Contact Form */}
            <div className="mt-10">
              <span className="font-data block" style={{ color: 'rgba(243, 242, 238, 0.5)' }}>
                SEND A NOTE
              </span>
              {formSubmitted ? (
                <p className="font-data mt-6" style={{ color: 'rgba(243, 242, 238, 0.5)' }}>
                  THANK YOU — WE'LL BE IN TOUCH
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="mt-4">
                  <input type="text" placeholder="YOUR NAME" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClasses} style={inputBorderStyle} />
                  <input type="email" placeholder="YOUR EMAIL" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`${inputClasses} mt-3`} style={inputBorderStyle} />
                  <textarea placeholder="YOUR MESSAGE" rows={4} required value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className={`${inputClasses} mt-3 resize-vertical`} style={inputBorderStyle} />
                  <button type="submit" className="font-button w-full mt-3 py-4 bg-[var(--color-base)] text-[var(--color-ink)] border-none hover:opacity-85 active:opacity-70 transition-opacity duration-200">
                    SEND
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Staff Portal CTA */}
        <div className="mt-12 text-center">
          <button
            onClick={() => { window.location.href = '/#/staff-login'; }}
            className="font-button px-8 py-4 border hover:bg-[var(--color-base)] hover:text-[var(--color-ink)] transition-all duration-200"
            style={{ borderColor: 'rgba(243, 242, 238, 0.25)', color: 'var(--color-base)' }}
          >
            STAFF PORTAL →
          </button>
          <p className="font-data mt-3" style={{ color: 'rgba(243, 242, 238, 0.3)', fontSize: '0.5625rem' }}>
            TEAM LOGIN & DASHBOARD
          </p>
        </div>

        {/* Footer Bar */}
        <div
          className="mt-[var(--space-section)] pt-8 flex flex-col md:flex-row items-center justify-between gap-2"
          style={{ borderTop: '1px solid rgba(243, 242, 238, 0.08)' }}
        >
          <span className="font-data" style={{ color: 'rgba(243, 242, 238, 0.3)' }}>&copy; 2024 B1 BY BACKHAUS</span>
          <span className="font-data" style={{ color: 'rgba(243, 242, 238, 0.3)' }}>EAST KEILOR, MELBOURNE</span>
        </div>
      </div>
    </footer>
  );
}
