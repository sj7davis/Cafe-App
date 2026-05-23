import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

type BusynessLevel = 'quiet' | 'moderate' | 'busy' | 'peak';

interface StatusConfig {
  level: BusynessLevel;
  label: string;
  waitTime: string;
  dotColor: string;
}

function getBusynessStatus(): StatusConfig {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;

  if (isWeekend) {
    if (hour >= 7 && hour <= 9) return { level: 'busy', label: 'BUSY', waitTime: '~8 min', dotColor: '#C4953A' };
    if (hour > 9 && hour <= 11) return { level: 'moderate', label: 'MODERATE', waitTime: '~4 min', dotColor: '#5E8B5E' };
    return { level: 'quiet', label: 'QUIET', waitTime: '~2 min', dotColor: '#5E8B5E' };
  }

  if (hour >= 6 && hour <= 8) return { level: 'peak', label: 'PEAK', waitTime: '~12 min', dotColor: '#B85450' };
  if (hour > 8 && hour <= 10) return { level: 'busy', label: 'BUSY', waitTime: '~8 min', dotColor: '#C4953A' };
  if (hour > 10 && hour <= 13) return { level: 'moderate', label: 'MODERATE', waitTime: '~4 min', dotColor: '#5E8B5E' };
  if (hour > 13 && hour <= 15) return { level: 'quiet', label: 'QUIET', waitTime: '~2 min', dotColor: '#5E8B5E' };
  return { level: 'quiet', label: 'CLOSED', waitTime: 'Opens 6AM', dotColor: '#5E5E5E' };
}

export default function QueueStatus() {
  const [status, setStatus] = useState<StatusConfig>(getBusynessStatus);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getBusynessStatus());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-2.5 h-2.5"
        style={{ background: status.dotColor }}
      />
      <div className="flex items-center gap-2">
        <Clock size={12} className="text-[var(--color-mid)]" />
        <span className="font-data text-[var(--color-mid)]">
          {status.label} — WAIT {status.waitTime}
        </span>
      </div>
    </div>
  );
}
