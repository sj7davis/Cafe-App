import { useState } from 'react';
import { Check } from 'lucide-react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="mt-10">
      <span className="font-data block" style={{ color: 'rgba(243, 242, 238, 0.5)' }}>
        NEWSLETTER
      </span>

      {submitted ? (
        <div className="mt-4 flex items-center gap-2">
          <Check size={14} className="text-[#5E8B5E]" />
          <span className="font-data" style={{ color: 'rgba(243, 242, 238, 0.6)' }}>
            YOU'RE ON THE LIST — THANK YOU
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="YOUR EMAIL"
              className="flex-1 bg-transparent border px-4 py-3 text-[var(--color-base)] font-form-input placeholder:text-[rgba(243,242,238,0.3)] placeholder:font-[Geist_Mono,'SF_Mono','Courier_New',monospace] placeholder:uppercase placeholder:text-[0.75rem] placeholder:tracking-[0.08em] focus:border-[rgba(243,242,238,0.4)] focus:outline-none transition-colors duration-200"
              style={{ borderColor: 'rgba(243, 242, 238, 0.15)' }}
            />
            <button
              type="submit"
              className="font-button px-6 py-3 bg-[var(--color-base)] text-[var(--color-ink)] hover:opacity-85 transition-opacity duration-200"
            >
              JOIN
            </button>
          </div>
          <p className="font-data mt-3" style={{ color: 'rgba(243, 242, 238, 0.3)' }}>
            SEASONAL MENUS, LIMITED DROPS & EVENTS
          </p>
        </form>
      )}
    </div>
  );
}
