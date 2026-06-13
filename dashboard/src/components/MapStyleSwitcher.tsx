import { Map, MoonStar, Satellite } from 'lucide-react';
import { cn } from '../utils/cn';
import { MAP_THEMES, type MapStyleId } from '../utils/mapThemes';

const themeIcons = {
  city: Map,
  satellite: Satellite,
  night: MoonStar,
} as const;

interface MapStyleSwitcherProps {
  value: MapStyleId;
  onChange: (value: MapStyleId) => void;
  isDarkMode?: boolean;
  className?: string;
}

export function MapStyleSwitcher({
  value,
  onChange,
  isDarkMode = false,
  className,
}: MapStyleSwitcherProps) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border px-2 py-2 shadow-2xl backdrop-blur-2xl',
        isDarkMode ? 'border-white/10 bg-black/68 text-white' : 'border-white/70 bg-white/92 text-slate-900',
        className
      )}
    >
      <div className="mb-2 px-2 text-[9px] font-black uppercase tracking-[0.2em] opacity-55">
        Capas del mapa
      </div>
      <div className="flex gap-2">
        {MAP_THEMES.map((theme) => {
          const Icon = themeIcons[theme.id];
          const isActive = value === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              className={cn(
                'min-w-[84px] rounded-[1.15rem] px-3 py-2.5 text-left transition-all',
                isActive
                  ? isDarkMode
                    ? 'bg-white text-slate-950 shadow-lg'
                    : 'bg-slate-950 text-white shadow-lg'
                  : isDarkMode
                    ? 'bg-white/6 text-white/78 hover:bg-white/10'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-[0.12em]">{theme.shortLabel}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
