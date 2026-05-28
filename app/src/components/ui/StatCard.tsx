import { type ElementType } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  icon?: ElementType;
}

export function StatCard({ label, value, delta, icon: Icon }: StatCardProps) {
  const isPositiveDelta = delta?.startsWith('+');
  const isNegativeDelta = delta?.startsWith('-');
  const deltaColor = isPositiveDelta ? '#16A34A' : isNegativeDelta ? '#DC2626' : 'var(--op-text-secondary, #71717A)';

  return (
    <div
      style={{
        background: 'var(--op-card-bg, #FFFFFF)',
        border: '1px solid var(--op-card-border, #E4E4E7)',
        borderRadius: 'var(--op-radius-card, 12px)',
        boxShadow: 'var(--op-shadow, 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04))',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && (
          <span style={{ color: 'var(--op-accent, #5E8B8B)', flexShrink: 0 }}>
            <Icon size={15} />
          </span>
        )}
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--op-text-secondary, #71717A)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--op-text, #09090B)',
          lineHeight: 1.15,
          fontFamily: 'var(--op-font-mono, monospace)',
        }}
      >
        {value}
      </div>

      {/* Delta */}
      {delta && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: deltaColor,
          }}
        >
          {delta}
        </div>
      )}
    </div>
  );
}
