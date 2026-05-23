import { useEffect, useRef, useState } from 'react';
import { Instagram } from 'lucide-react';

const images = [
  { src: '/images/insta-1.jpg', alt: 'Flat white takeaway', caption: 'Morning flat white' },
  { src: '/images/insta-2.jpg', alt: 'Almond croissants', caption: 'Fresh from the oven' },
  { src: '/images/insta-3.jpg', alt: 'Latte art pour', caption: 'Precision in every pour' },
  { src: '/images/insta-4.jpg', alt: 'Sourdough loaves', caption: '48-hour ferment' },
  { src: '/images/insta-5.jpg', alt: 'Coffee beans flat lay', caption: 'Single origin daily' },
  { src: '/images/insta-6.jpg', alt: 'Portuguese tarts', caption: 'Portuguese tarts' },
];

export default function InstagramFeed() {
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
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-[var(--space-section)] border-t"
      style={{
        background: 'var(--color-base)',
        borderColor: 'rgba(24, 24, 24, 0.08)',
      }}
    >
      <div className="content-container">
        <div className="flex items-center justify-between mb-10">
          <div>
            <span
              className="font-data block"
              style={{
                color: 'var(--color-mid)',
                opacity: revealed ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              @B1BYBACKHAUS
            </span>
            <h2
              className="font-section text-[var(--color-ink)] mt-3"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease',
                transitionDelay: '100ms',
              }}
            >
              FOLLOW ALONG
            </h2>
          </div>
          <a
            href="#"
            className="hidden md:flex items-center gap-2 font-nav text-[var(--color-ink)] hover:opacity-40 transition-opacity duration-200"
            style={{
              opacity: revealed ? 1 : 0,
              transition: 'opacity 0.3s ease',
              transitionDelay: '200ms',
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram size={16} />
            VIEW ON INSTAGRAM
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
          {images.map((img, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden group cursor-pointer"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease',
                transitionDelay: revealed ? `${i * 80}ms` : '0ms',
              }}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-[rgba(24,24,24,0.6)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span className="font-data text-[var(--color-base)] text-center px-4">{img.caption}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
