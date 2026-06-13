import type { FC } from 'react';
import { Route } from 'lucide-react';
import type { GamificationRoute } from '../../utils/gamification';
import { cn } from '../../utils/cn';
import { ProgressBar } from './ProgressBar';

interface RouteProgressCardProps {
  route: GamificationRoute;
  isDarkMode: boolean;
}

export const RouteProgressCard: FC<RouteProgressCardProps> = ({ route, isDarkMode }) => {
  return (
    <article className={cn('rounded-[1.6rem] border p-4', isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-100 bg-white')}>
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-[1rem]', route.isCompleted ? 'bg-brand text-white' : isDarkMode ? 'bg-white/10 text-brand' : 'bg-brand/10 text-brand')}>
          <Route className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">{route.category}</p>
          <h4 className="mt-1 text-[1rem] font-black leading-tight">{route.name}</h4>
          <p className="mt-2 text-sm font-bold leading-6 opacity-65">{route.description}</p>
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar value={route.progressPercent} isDarkMode={isDarkMode} />
      </div>
      <p className="mt-3 text-[11px] font-black uppercase tracking-[0.14em] opacity-45">
        {route.visitedFallas}/{route.totalFallas} fallas • {route.isCompleted ? 'Completa' : 'En progreso'}
      </p>
    </article>
  );
};
