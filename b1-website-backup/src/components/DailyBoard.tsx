import { useEffect, useRef, useState } from 'react';
import { Coffee, Croissant, Wheat } from 'lucide-react';
import { todayRotation } from '@/data/menu';

export default function DailyBoard() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

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
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const items = [
    {
      icon: Coffee,
      label: 'TODAY\'S ORIGIN',
      value: todayRotation.coffeeOriginShort,
      detail: todayRotation.coffeeOrigin,
    },
    {
      icon: Croissant,
      label: 'PASTRY OF THE DAY',
      value: todayRotation.pastryOfTheDay.split(' — ')[0],
      detail: todayRotation.pastryOfTheDay.split(' — ')[1] || '',
    },
    {
      icon: Wheat,
      label: 'BREAD OF THE DAY',
      value: todayRotation.breadOfTheDay,
      detail: '',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="py-16 border-t"
      style={{
        background: 'var(--color-base)',
        borderColor: 'rgba(24, 24, 24, 0.08)',
      }}
    >
      <div className="content-container">
        <span
          className="font-data block mb-8"
          style={{
            color: 'var(--color-mid)',
            opacity: revealed ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          {todayRotation.date} — WHAT WE'RE SERVING TODAY
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="p-6 border border-[rgba(24,24,24,0.08)]"
                style={{
                  background: 'var(--color-base)',
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'opacity 0.4s ease, transform 0.4s ease',
                  transitionDelay: revealed ? `${i * 100}ms` : '0ms',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon size={16} className="text-[var(--color-mid)]" />
                  <span className="font-data text-[var(--color-mid)]">{item.label}</span>
                </div>
                <p className="font-item-name text-[var(--color-ink)]">{item.value}</p>
                {item.detail && (
                  <p className="font-item-desc text-[var(--color-mid)] mt-1">{item.detail}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
