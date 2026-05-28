import { type ElementType, type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 32px',
        gap: 12,
      }}
    >
      {Icon && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--op-card-border, #E4E4E7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
            flexShrink: 0,
          }}
        >
          <Icon size={22} color="var(--op-text-secondary, #71717A)" />
        </div>
      )}

      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--op-text, #09090B)',
        }}
      >
        {title}
      </div>

      {description && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--op-text-secondary, #71717A)',
            maxWidth: 360,
            lineHeight: 1.55,
          }}
        >
          {description}
        </div>
      )}

      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
