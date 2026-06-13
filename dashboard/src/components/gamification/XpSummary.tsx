import { BookOpen, Compass, MapPin, Route } from 'lucide-react';
import type { GamificationProfile } from '../../utils/gamification';
import { cn } from '../../utils/cn';

interface XpSummaryProps {
  profile: GamificationProfile;
  isDarkMode: boolean;
}

const items = [
  { key: 'distinctFallasVisited', label: 'Fallas', icon: MapPin },
  { key: 'routesCompleted', label: 'Rutas', icon: Route },
  { key: 'neighborhoodsExplored', label: 'Barrios', icon: Compass },
  { key: 'contentReadsCount', label: 'Lecturas', icon: BookOpen },
] as const;

export function XpSummary({ profile, isDarkMode }: XpSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.key}
          className={cn(
            'rounded-[1.6rem] border p-4',
            isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-100 bg-white'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-[1rem]', isDarkMode ? 'bg-brand/14 text-brand' : 'bg-brand/10 text-brand')}>
              <item.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">{item.label}</p>
              <p className="mt-1 text-[1.4rem] font-black leading-none">
                {profile.totals[item.key]}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
