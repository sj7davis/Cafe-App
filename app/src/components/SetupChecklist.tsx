import { useState } from 'react';
import { CheckCircle, Circle, ChevronDown, ChevronUp, X } from 'lucide-react';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  done: boolean;
  action: { label: string; onClick: () => void };
}

interface Props {
  steps: SetupStep[];
  onDismiss: () => void;
}

/**
 * SetupChecklist — guided onboarding panel shown in the OverviewTab.
 * Dismissed permanently once all steps are complete or user clicks dismiss.
 */
export function SetupChecklist({ steps, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(true);
  const done = steps.filter(s => s.done).length;
  const total = steps.length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  if (allDone) return null; // hide when everything is set up

  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      border: '1px solid var(--op-card-border)',
      marginBottom: 24,
      overflow: 'hidden',
      boxShadow: 'var(--op-shadow)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 20px',
        borderBottom: expanded ? '1px solid var(--op-card-border)' : 'none',
        cursor: 'pointer',
      }} onClick={() => setExpanded(v => !v)}>
        {/* Progress ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={44} height={44}>
            <circle cx={22} cy={22} r={18} fill="none" stroke="var(--op-card-border)" strokeWidth={3} />
            <circle
              cx={22} cy={22} r={18}
              fill="none"
              stroke="#5E8B8B"
              strokeWidth={3}
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - pct / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 22 22)"
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
          </svg>
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#5E8B8B',
          }}>{pct}%</span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--op-text)', letterSpacing: '-0.02em' }}>
            Set up your venue — {done}/{total} complete
          </div>
          <div style={{ fontSize: 12, color: 'var(--op-text-secondary)', marginTop: 2 }}>
            Complete these steps to get your first orders rolling in.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {expanded ? <ChevronUp size={16} color="var(--op-text-muted)" /> : <ChevronDown size={16} color="var(--op-text-muted)" />}
          <button
            onClick={e => { e.stopPropagation(); onDismiss(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--op-text-muted)', display: 'flex', padding: 2 }}
            title="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Steps */}
      {expanded && (
        <div style={{ padding: '8px 0' }}>
          {steps.map((step, i) => (
            <div key={step.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '12px 20px',
              borderBottom: i < steps.length - 1 ? '1px solid var(--op-card-border)' : 'none',
              opacity: step.done ? 0.55 : 1,
            }}>
              {/* Check icon */}
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                {step.done
                  ? <CheckCircle size={20} color="#5E8B8B" />
                  : <Circle size={20} color="var(--op-card-border)" />
                }
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--op-text)', textDecoration: step.done ? 'line-through' : 'none' }}>
                  {step.title}
                </div>
                {!step.done && (
                  <div style={{ fontSize: 12, color: 'var(--op-text-secondary)', marginTop: 2, lineHeight: 1.5 }}>
                    {step.description}
                  </div>
                )}
              </div>

              {/* CTA */}
              {!step.done && (
                <button
                  onClick={step.action.onClick}
                  style={{
                    flexShrink: 0,
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#5E8B8B',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {step.action.label}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
