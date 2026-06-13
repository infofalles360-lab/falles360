import type { FC } from 'react';
import { MapPinned } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ProgressBar } from './ProgressBar';

interface ZoneProgressCardProps {
  title: string;
  subtitle: string;
  progressPercent: number;
  visited: number;
  total: number;
  isDarkMode: boolean;
  isHighlighted?: boolean;
}

export const ZoneProgressCard: FC<ZoneProgressCardProps> = ({
  title,
  subtitle,
  progressPercent,
  visited,
  total,
  isDarkMode,
  isHighlighted = false,
}) => {
  return (
    <article
      className={cn(
        'rounded-[1.6rem] border p-4',
        isHighlighted
          ? isDarkMode
            ? 'border-brand/40 bg-brand/10'
            : 'border-[#ffd6c4] bg-[#fff7f1]'
          : isDarkMode
            ? 'border-white/10 bg-white/[0.045]'
            : 'border-slate-100 bg-white'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-[1rem]', isDarkMode ? 'bg-white/10 text-brand' : 'bg-brand/10 text-brand')}>
          <MapPinned className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[1rem] font-black leading-tight">{title}</h4>
          <p className="mt-1 text-sm font-bold leading-6 opacity-60">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar value={progressPercent} isDarkMode={isDarkMode} />
      </div>

      <p className="mt-3 text-[11px] font-black uppercase tracking-[0.14em] opacity-45">
        {visited}/{total} fallas registradas
      </p>
    </article>
  );
};
