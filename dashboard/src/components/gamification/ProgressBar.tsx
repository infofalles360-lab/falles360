import { cn } from '../../utils/cn';

interface ProgressBarProps {
  value: number;
  isDarkMode: boolean;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, isDarkMode, label, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] opacity-55">{label}</span>
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">{clamped.toFixed(0)}%</span>
        </div>
      ) : null}
      <div className={cn('h-3 overflow-hidden rounded-full', isDarkMode ? 'bg-white/8' : 'bg-slate-100')}>
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#ff8a4c_0%,#ff6321_100%)] transition-[width] duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
