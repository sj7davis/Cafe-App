import type { DietaryTag } from '@/data/menu';
import { dietaryLabels } from '@/data/menu';

interface DietaryBadgeProps {
  tag: DietaryTag;
  showLabel?: boolean;
}

const tagColors: Record<DietaryTag, string> = {
  V: 'rgba(94, 139, 94, 0.12)',
  GF: 'rgba(139, 94, 94, 0.12)',
  DF: 'rgba(94, 110, 139, 0.12)',
  VG: 'rgba(94, 139, 110, 0.12)',
};

const tagTextColors: Record<DietaryTag, string> = {
  V: '#5E8B5E',
  GF: '#8B5E5E',
  DF: '#5E6E8B',
  VG: '#5E8B6E',
};

export default function DietaryBadge({ tag, showLabel = false }: DietaryBadgeProps) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 font-data"
      style={{
        background: tagColors[tag],
        color: tagTextColors[tag],
        fontSize: '0.5rem',
        letterSpacing: '0.1em',
      }}
      title={dietaryLabels[tag]}
    >
      {tag}
      {showLabel && <span className="ml-1">{dietaryLabels[tag]}</span>}
    </span>
  );
}
