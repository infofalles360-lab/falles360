import { CarFront, Footprints } from 'lucide-react';
import { cn } from '../utils/cn';
import { type RouteProfile } from '../utils/navigation';

interface RouteProfileToggleProps {
  value: RouteProfile;
  onChange: (value: RouteProfile) => void;
  isDarkTheme: boolean;
  compact?: boolean;
}

const OPTIONS: Array<{
  value: RouteProfile;
  label: string;
  icon: typeof Footprints;
}> = [
  { value: 'walking', label: 'A pie', icon: Footprints },
  { value: 'driving', label: 'Coche', icon: CarFront },
];

export function RouteProfileToggle({
  value,
  onChange,
  isDarkTheme,
  compact = false,
}: RouteProfileToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full',
        compact ? 'p-[3px]' : 'p-1',
        isDarkTheme ? 'bg-white/10' : 'bg-slate-100'
      )}
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full font-black uppercase tracking-[0.16em] transition-colors',
              compact ? 'px-2 py-1.5 text-[8px]' : 'px-3 py-2 text-[10px]',
              isActive
                ? 'bg-[#ff6321] text-white shadow-[0_12px_24px_rgba(255,99,33,0.24)]'
                : isDarkTheme
                  ? 'text-white/76 hover:bg-white/10'
                  : 'text-slate-600 hover:bg-white'
            )}
          >
            <Icon className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
